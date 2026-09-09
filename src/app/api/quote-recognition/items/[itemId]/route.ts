import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { recordQuoteEvent } from "@/lib/quote-recognition/audit";
import type { QuoteRecognitionItemInput } from "@/types/quoteRecognition";

const writeRoles = new Set(["admin", "manager", "editor"]);
const reviewRoles = new Set(["admin", "manager", "reviewer"]);
const riskLevels = new Set(["low", "medium", "high", "critical"]);

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { itemId } = await context.params;
  const body = await request.json().catch(() => null) as null | {
    action?: "save" | "needs_info" | "reject" | "void" | "import";
    fields?: QuoteRecognitionItemInput;
    note?: string;
  };
  if (!body?.action) return NextResponse.json({ error: "请选择有效操作" }, { status: 400 });

  const current = await access.supabase.from("wpi_quote_items").select("*")
    .eq("organization_id", access.organizationId).eq("id", itemId).maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: "报价明细不存在" }, { status: 404 });

  if (body.action === "import") {
    if (!reviewRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有确认入库权限" }, { status: 403 });
    const result = await access.supabase.rpc("wpi_import_quote_item", {
      target_item_id: itemId,
      corrections: body.fields ?? {},
      reviewer_note: clean(body.note, 4000) || null,
    });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
    const imported = result.data && typeof result.data === "object"
      ? result.data as Record<string, unknown>
      : {};
    await recordQuoteEvent(access.supabase, {
      documentId: String(current.data.document_id),
      itemId,
      action: "quote.imported",
      note: clean(body.note, 4000) || "人工审核确认入库",
      metadata: {
        itemType: imported.itemType ?? current.data.item_type,
        equipmentPriceId: imported.equipmentPriceId ?? null,
        materialPriceId: imported.materialPriceId ?? null,
        reused: imported.reused ?? false,
      },
    });
    const document = await access.supabase.from("wpi_quote_documents")
      .select("id,collection_task_id,file_name").eq("organization_id", access.organizationId)
      .eq("id", current.data.document_id).maybeSingle();
    if (document.data?.collection_task_id) {
      const items = await access.supabase.from("wpi_quote_items").select("review_status")
        .eq("organization_id", access.organizationId).eq("document_id", current.data.document_id);
      const rows = items.data ?? [];
      const importedCount = rows.filter((row) => row.review_status === "imported").length;
      const openCount = rows.filter((row) => ["pending_review", "needs_info"].includes(row.review_status)).length;
      await access.supabase.from("wpi_price_collection_tasks").update({
        status: openCount === 0 ? "completed" : "running",
        progress: openCount === 0 ? 100 : Math.min(95, 60 + Math.round((importedCount / Math.max(1, rows.length)) * 35)),
        success_count: importedCount,
        current_source: openCount === 0 ? `报价已完成审核 · ${document.data.file_name}` : `人工审核中 · 剩余 ${openCount} 条`,
        finished_at: openCount === 0 ? new Date().toISOString() : null,
        updated_by: access.userId,
      }).eq("organization_id", access.organizationId).eq("id", document.data.collection_task_id);
    }
    return NextResponse.json({ data: result.data, source: "supabase" });
  }

  if (body.action === "save" && !writeRoles.has(access.role) && !reviewRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有修正报价字段的权限" }, { status: 403 });
  }
  if (["needs_info", "reject", "void"].includes(body.action) && !reviewRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有报价审核权限" }, { status: 403 });
  }
  const note = clean(body.note, 4000);
  if (["needs_info", "reject", "void"].includes(body.action) && note.length < 5) {
    return NextResponse.json({ error: "请填写至少 5 个字符的审核说明" }, { status: 400 });
  }

  const fields = body.fields ?? {};
  const itemType = fields.itemType === "material" ? "material" : fields.itemType === "equipment" ? "equipment" : current.data.item_type;
  const itemName = clean(fields.itemName, 200) || current.data.item_name;
  const unitPrice = fields.unitPrice === undefined ? Number(current.data.unit_price) : Math.max(0, numberValue(fields.unitPrice));
  const unit = fields.unit === undefined ? current.data.unit : clean(fields.unit, 40) || null;
  const missingFields = [
    !itemName ? "itemName" : "",
    unitPrice <= 0 ? "unitPrice" : "",
    itemType === "material" && !unit ? "unit" : "",
  ].filter(Boolean);
  const reviewStatus = body.action === "needs_info"
    ? "needs_info"
    : body.action === "reject"
      ? "rejected"
      : body.action === "void"
        ? "voided"
        : missingFields.length
          ? "needs_info"
          : "pending_review";
  const quantity = fields.quantity === undefined ? Number(current.data.quantity) : Math.max(0.0001, numberValue(fields.quantity, 1));
  const confidence = fields.confidence === undefined
    ? Number(current.data.confidence)
    : Math.max(0, Math.min(100, numberValue(fields.confidence)));
  const riskLevel = fields.riskLevel && riskLevels.has(fields.riskLevel) ? fields.riskLevel : current.data.risk_level;
  const update = await access.supabase.from("wpi_quote_items").update({
    item_type: itemType,
    item_code: fields.itemCode === undefined ? current.data.item_code : clean(fields.itemCode, 80) || null,
    item_name: itemName,
    brand: fields.brand === undefined ? current.data.brand : clean(fields.brand, 120) || null,
    specification: fields.specification === undefined ? current.data.specification : clean(fields.specification, 200) || null,
    category: fields.category === undefined ? current.data.category : clean(fields.category, 100) || null,
    unit,
    quantity,
    unit_price: unitPrice,
    total_price: fields.totalPrice === undefined ? Math.round(unitPrice * quantity * 100) / 100 : Math.max(0, numberValue(fields.totalPrice)),
    currency: fields.currency === undefined ? current.data.currency : clean(fields.currency, 12).toUpperCase() || "CNY",
    region: fields.region === undefined ? current.data.region : clean(fields.region, 100) || null,
    price_condition: fields.priceCondition === undefined ? current.data.price_condition : clean(fields.priceCondition, 80) || null,
    supplier_name: fields.supplierName === undefined ? current.data.supplier_name : clean(fields.supplierName, 160) || null,
    confidence,
    risk_level: riskLevel,
    missing_fields: missingFields,
    review_status: reviewStatus,
    review_note: note || current.data.review_note,
    reviewed_by: body.action === "save" ? current.data.reviewed_by : access.userId,
    reviewed_at: body.action === "save" ? current.data.reviewed_at : new Date().toISOString(),
  }).eq("organization_id", access.organizationId).eq("id", itemId).select("*").single();
  if (update.error) return NextResponse.json({ error: update.error.message }, { status: 400 });
  const eventAction = body.action === "needs_info"
    ? "quote.needs_info"
    : body.action === "reject"
      ? "quote.rejected"
      : body.action === "void"
        ? "quote.voided"
        : "quote.fields_saved";
  await recordQuoteEvent(access.supabase, {
    documentId: String(current.data.document_id),
    itemId,
    action: eventAction,
    note: note || (body.action === "save" ? "保存人工字段修正" : null),
    metadata: {
      reviewStatus,
      riskLevel,
      missingFields,
      confidence,
    },
  });
  return NextResponse.json({ data: update.data, source: "supabase" });
}
