import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { parseQuoteFile } from "@/lib/imports/quoteRecognitionParser";
import { recordQuoteEvent } from "@/lib/quote-recognition/audit";
import { parseVisualRecognitionPayload } from "@/lib/quote-recognition/documentRecognition";

const writeRoles = new Set(["admin", "manager", "editor"]);

function aiErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : "AI任务未能加入队列";
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有报价识别权限" }, { status: 403 });
  }
  const { id } = await context.params;
  const documentResult = await access.supabase.from("wpi_quote_documents").select("*")
    .eq("organization_id", access.organizationId).eq("id", id).maybeSingle();
  if (documentResult.error) return NextResponse.json({ error: documentResult.error.message }, { status: 500 });
  if (!documentResult.data) return NextResponse.json({ error: "报价文件不存在" }, { status: 404 });
  if (["imported", "voided"].includes(documentResult.data.status)) {
    return NextResponse.json({ error: "已入库或已作废文件不能重新识别" }, { status: 409 });
  }

  await access.supabase.from("wpi_quote_documents").update({
    status: "parsing", error_message: null, updated_by: access.userId,
  }).eq("organization_id", access.organizationId).eq("id", id);
  if (documentResult.data.collection_task_id) {
    await access.supabase.from("wpi_price_collection_tasks").update({
      status: "running", progress: 20, current_source: `识别报价 · ${documentResult.data.file_name}`,
      last_error: null, updated_by: access.userId,
    }).eq("organization_id", access.organizationId).eq("id", documentResult.data.collection_task_id);
  }
  await recordQuoteEvent(access.supabase, {
    documentId: id,
    action: "quote.parse_started",
    note: "开始结构化解析报价文件",
    metadata: { fileName: documentResult.data.file_name },
  });

  try {
    const mimeType = String(documentResult.data.mime_type || "").toLowerCase();
    const extension = String(documentResult.data.file_name).split(".").pop()?.toLowerCase() ?? "";
    const isVisualDocument = mimeType === "application/pdf"
      || ["png", "jpg", "jpeg", "webp"].includes(extension)
      || mimeType.startsWith("image/");
    let recognitionProvider: string | null = null;
    let recognitionModel: string | null = null;
    let visualDocument: ReturnType<typeof parseVisualRecognitionPayload>["document"] | null = null;
    let parsed: Awaited<ReturnType<typeof parseQuoteFile>> | ReturnType<typeof parseVisualRecognitionPayload>;

    if (isVisualDocument) {
      const signed = await access.supabase.storage
        .from(documentResult.data.storage_bucket)
        .createSignedUrl(documentResult.data.storage_path, 600);
      if (signed.error || !signed.data?.signedUrl) {
        throw new Error(`无法创建文档识别临时访问链接：${signed.error?.message ?? "未知错误"}`);
      }
      const invoked = await access.supabase.functions.invoke("wpi-ai-gateway", {
        body: {
          action: "recognize_quote_document",
          organizationId: access.organizationId,
          businessObjectId: id,
          fileName: documentResult.data.file_name,
          mimeType,
          sourceUrl: signed.data.signedUrl,
        },
      });
      if (invoked.error) throw new Error(invoked.error.message);
      if (invoked.data?.error) throw new Error(String(invoked.data.error));
      const visual = parseVisualRecognitionPayload(invoked.data, mimeType);
      parsed = visual;
      visualDocument = visual.document;
      recognitionProvider = visual.summary.provider || null;
      recognitionModel = visual.summary.model || null;
    } else {
      const download = await access.supabase.storage
        .from(documentResult.data.storage_bucket)
        .download(documentResult.data.storage_path);
      if (download.error) throw download.error;
      parsed = await parseQuoteFile({
        fileName: documentResult.data.file_name,
        mimeType,
        bytes: await download.data.arrayBuffer(),
      });
    }
    const itemRows = parsed.items.map((item) => ({
      organization_id: access.organizationId,
      document_id: id,
      line_number: item.lineNumber,
      item_type: item.itemType,
      item_code: item.itemCode || null,
      item_name: item.itemName,
      brand: item.brand || null,
      specification: item.specification || null,
      category: item.category || null,
      unit: item.unit || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      currency: item.currency,
      region: item.region || null,
      price_condition: item.priceCondition || null,
      supplier_name: item.supplierName || null,
      confidence: item.confidence,
      risk_level: item.riskLevel,
      missing_fields: item.missingFields,
      review_status: item.missingFields.length ? "needs_info" : "pending_review",
      raw_data: item.rawData,
      normalized_data: item,
    }));
    const upsert = await access.supabase.from("wpi_quote_items").upsert(itemRows, {
      onConflict: "document_id,line_number",
    }).select("*");
    if (upsert.error) throw upsert.error;

    const itemByLine = new Map((upsert.data ?? []).map((item) => [Number(item.line_number), String(item.id)]));
    const deleteEvidence = await access.supabase.from("wpi_quote_item_evidence")
      .delete().eq("organization_id", access.organizationId).eq("document_id", id);
    if (deleteEvidence.error) throw deleteEvidence.error;
    const evidenceRows = parsed.items.flatMap((item) => {
      const itemId = itemByLine.get(item.lineNumber);
      if (!itemId) return [];
      return [{
        organization_id: access.organizationId,
        document_id: id,
        item_id: itemId,
        page_number: item.evidence.pageNumber,
        source_kind: item.evidence.sourceKind,
        extraction_method: item.evidence.extractionMethod,
        source_text: item.evidence.sourceText,
        bbox_x: item.evidence.bbox.x,
        bbox_y: item.evidence.bbox.y,
        bbox_width: item.evidence.bbox.width,
        bbox_height: item.evidence.bbox.height,
        confidence: item.evidence.confidence,
        provider: recognitionProvider,
        model: recognitionModel,
        is_primary: true,
        metadata: { sourceLine: item.lineNumber, requiresHumanReview: true },
        created_by: access.userId,
      }];
    });
    if (evidenceRows.length) {
      const evidenceInsert = await access.supabase.from("wpi_quote_item_evidence").insert(evidenceRows);
      if (evidenceInsert.error) throw evidenceInsert.error;
    }

    const primarySupplier = parsed.items.find((item) => item.supplierName)?.supplierName || null;
    const primaryCurrency = parsed.items.find((item) => item.currency)?.currency || "CNY";
    const baseSummary = {
      ...parsed.summary,
      parser: isVisualDocument ? "openai-responses-document-v2" : "deterministic-spreadsheet-v1",
      evidenceCount: evidenceRows.length,
      lineEvidenceStored: evidenceRows.length === parsed.items.length,
      parsedAt: new Date().toISOString(),
      requiresHumanReview: true,
    };
    const documentUpdate = await access.supabase.from("wpi_quote_documents").update({
      status: "needs_review",
      supplier_name: visualDocument?.supplierName || primarySupplier,
      quote_number: visualDocument?.quoteNumber || documentResult.data.quote_number,
      quote_date: visualDocument?.quoteDate || documentResult.data.quote_date,
      valid_until: visualDocument?.validUntil || documentResult.data.valid_until,
      currency: visualDocument?.currency || primaryCurrency,
      total_amount: visualDocument?.totalAmount || parsed.summary.totalAmount,
      overall_confidence: parsed.summary.overallConfidence,
      risk_level: parsed.summary.riskLevel,
      missing_fields: parsed.summary.missingFields,
      recognition_summary: baseSummary,
      page_count: visualDocument?.pageCount || 1,
      recognition_method: isVisualDocument
        ? mimeType === "application/pdf" ? "openai_responses_pdf" : "openai_responses_vision"
        : "spreadsheet",
      recognition_provider: recognitionProvider,
      recognition_model: recognitionModel,
      processed_at: new Date().toISOString(),
      error_message: null,
      updated_by: access.userId,
    }).eq("organization_id", access.organizationId).eq("id", id).select("*").single();
    if (documentUpdate.error) throw documentUpdate.error;
    if (documentResult.data.collection_task_id) {
      await access.supabase.from("wpi_price_collection_tasks").update({
        status: "running", progress: 60,
        success_count: parsed.items.length,
        current_source: `等待人工审核 · ${documentResult.data.file_name}`,
        updated_by: access.userId,
      }).eq("organization_id", access.organizationId).eq("id", documentResult.data.collection_task_id);
    }
    await recordQuoteEvent(access.supabase, {
      documentId: id,
      action: "quote.parse_completed",
      note: `结构化解析完成，共 ${parsed.items.length} 条明细`,
      metadata: {
        itemCount: parsed.items.length,
        evidenceCount: evidenceRows.length,
        recognitionMethod: isVisualDocument ? "openai_responses" : "spreadsheet",
        overallConfidence: parsed.summary.overallConfidence,
        riskLevel: parsed.summary.riskLevel,
      },
    });

    let aiTask = null;
    let aiQueueError: string | null = null;
    try {
      const invoked = await access.supabase.functions.invoke("wpi-ai-gateway", {
        body: {
          action: "enqueue_task",
          organizationId: access.organizationId,
          workflowKey: "quote_recognition",
          title: `报价识别复核：${documentResult.data.file_name}`,
          sourceLabel: documentResult.data.file_name,
          businessObjectType: "quote_document",
          businessObjectId: id,
          businessHref: `/pending-quotes?documentId=${id}`,
          idempotencyKey: `quote-recognition-${id}`,
          input: {
            document: {
              id,
              code: documentResult.data.document_code,
              fileName: documentResult.data.file_name,
              supplierName: primarySupplier,
              currency: primaryCurrency,
              totalAmount: parsed.summary.totalAmount,
            },
            parsedItems: parsed.items.slice(0, 80).map((item) => ({
              lineNumber: item.lineNumber,
              itemType: item.itemType,
              itemName: item.itemName,
              brand: item.brand,
              specification: item.specification,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              currency: item.currency,
              confidence: item.confidence,
              missingFields: item.missingFields,
            })),
            instruction: "检查字段一致性、异常价格、缺失字段和风险。不得直接批准或入库。",
          },
        },
      });
      if (invoked.error) throw invoked.error;
      aiTask = invoked.data?.data ?? null;
      if (aiTask?.id) {
        await access.supabase.from("wpi_quote_documents").update({
          ai_task_id: aiTask.id,
          recognition_summary: { ...baseSummary, aiTaskQueued: true },
          updated_by: access.userId,
        }).eq("organization_id", access.organizationId).eq("id", id);
        await recordQuoteEvent(access.supabase, {
          documentId: id,
          action: "quote.ai_review_queued",
          note: "AI辅助复核任务已进入执行队列",
          metadata: { taskId: aiTask.id, taskCode: aiTask.task_code ?? null },
        });
      }
    } catch (error) {
      aiQueueError = aiErrorDetail(error);
      await access.supabase.from("wpi_quote_documents").update({
        recognition_summary: { ...baseSummary, aiTaskQueued: false, aiQueueError },
        updated_by: access.userId,
      }).eq("organization_id", access.organizationId).eq("id", id);
      await recordQuoteEvent(access.supabase, {
        documentId: id,
        action: "quote.ai_review_unavailable",
        note: "AI辅助复核暂不可用，保留人工审核路径",
        metadata: { error: aiQueueError },
      });
    }

    return NextResponse.json({
      data: { ...documentUpdate.data, items: upsert.data ?? [], ai_task: aiTask },
      aiQueueError,
      source: "supabase",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "报价解析失败";
    await access.supabase.from("wpi_quote_documents").update({
      status: "failed", error_message: message.slice(0, 4000), updated_by: access.userId,
    }).eq("organization_id", access.organizationId).eq("id", id);
    if (documentResult.data.collection_task_id) {
      await access.supabase.from("wpi_price_collection_tasks").update({
        status: "failed", progress: 100, last_error: message.slice(0, 4000),
        finished_at: new Date().toISOString(), updated_by: access.userId,
      }).eq("organization_id", access.organizationId).eq("id", documentResult.data.collection_task_id);
    }
    await recordQuoteEvent(access.supabase, {
      documentId: id,
      action: "quote.parse_failed",
      note: "报价结构化解析失败",
      metadata: { error: message.slice(0, 1000) },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
