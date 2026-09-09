import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { mapInquiryDetail } from "@/lib/inquiries/inquiryDetailMapper";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateInquiryBody = {
  subject?: string;
  deadline?: string;
  letterContent?: string;
  status?: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  aiConfidence?: number | null;
  riskLevel?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
  supplierIds?: string[];
  baseCurrency?: string;
  comparisonDate?: string;
};

async function findInquiry(
  access: Awaited<ReturnType<typeof getApiAccess>> & { ok: true },
  id: string,
) {
  const query = () =>
    access.supabase
      .from("wpi_inquiries")
      .select("id, legacy_id, inquiry_code, status, deadline, letter_content, metadata, base_currency, comparison_date")
      .eq("organization_id", access.organizationId);

  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) {
    result = await query().eq("id", id).maybeSingle();
  }
  return result;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;

  const query = () =>
    access.supabase
      .from("wpi_inquiries")
      .select(
        "*, wpi_inquiry_items(*), wpi_inquiry_suppliers(*, wpi_suppliers(id, legacy_id, name, region, review_status, wpi_supplier_contacts(name, phone, whatsapp, email, is_primary)))",
      )
      .eq("organization_id", access.organizationId);

  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) {
    result = await query().eq("id", id).maybeSingle();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  if (!result.data) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  const [attachmentResult, eventResult, ownerResult] = await Promise.all([
    access.supabase
      .from("wpi_attachments")
      .select("id, original_name, content_type, size_bytes, evidence_type, verification_status, created_at")
      .eq("organization_id", access.organizationId)
      .eq("related_type", "inquiry")
      .eq("related_id", result.data.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    access.supabase
      .from("wpi_inquiry_events")
      .select("*, wpi_suppliers(name)")
      .eq("organization_id", access.organizationId)
      .eq("inquiry_id", result.data.id)
      .order("created_at", { ascending: true })
      .limit(200),
    result.data.created_by
      ? access.supabase
          .from("wpi_profiles")
          .select("display_name")
          .eq("id", result.data.created_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const relatedError = attachmentResult.error ?? eventResult.error;
  if (relatedError) {
    return NextResponse.json({ error: relatedError.message }, { status: 500 });
  }

  const detail = mapInquiryDetail(
    result.data,
    attachmentResult.data ?? [],
    eventResult.data ?? [],
    ownerResult.data?.display_name ?? null,
  );

  return NextResponse.json({ data: result.data, detail, source: "supabase" });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const body = (await request.json()) as UpdateInquiryBody;
  const inquiryResult = await findInquiry(access, id);

  if (inquiryResult.error) {
    return NextResponse.json({ error: inquiryResult.error.message }, { status: 500 });
  }
  if (!inquiryResult.data) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }
  const inquiry = inquiryResult.data;

  const currentMetadata =
    inquiry.metadata && typeof inquiry.metadata === "object"
      ? (inquiry.metadata as Record<string, unknown>)
      : {};
  const nextMetadata = body.metadata !== undefined
    ? { ...currentMetadata, ...body.metadata }
    : currentMetadata;
  const updates: Record<string, unknown> = {
    updated_by: access.userId,
    updated_at: new Date().toISOString(),
  };
  if (body.subject !== undefined) updates.subject = body.subject.trim();
  if (body.deadline !== undefined) updates.deadline = body.deadline || null;
  if (body.letterContent !== undefined) updates.letter_content = body.letterContent;
  if (body.status !== undefined) {
    if (!["draft", "pending_review", "approved", "rejected", "archived"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid inquiry status" }, { status: 400 });
    }
    if (["approved", "rejected", "archived"].includes(body.status) && !["admin", "manager", "reviewer"].includes(access.role)) {
      return NextResponse.json({ error: "Current role cannot finalize inquiry review" }, { status: 403 });
    }
    if (body.status === "pending_review") {
      const preflightIssues: string[] = [];
      const nextDeadline = body.deadline !== undefined ? body.deadline : inquiry.deadline;
      const nextLetterContent = body.letterContent !== undefined ? body.letterContent : inquiry.letter_content;
      const parsedDeadline = nextDeadline ? new Date(String(nextDeadline)) : null;
      if (!parsedDeadline || Number.isNaN(parsedDeadline.getTime()) || parsedDeadline.getTime() <= Date.now()) {
        preflightIssues.push("报价截止时间无效");
      }
      if (!String(nextLetterContent ?? "").trim()) preflightIssues.push("询价函正文为空");

      const supplierMapping = Array.isArray(nextMetadata.supplierMapping)
        ? (nextMetadata.supplierMapping as Array<Record<string, unknown>>)
        : [];
      if (!supplierMapping.length) {
        preflightIssues.push("缺少设备供应商映射");
      } else {
        if (supplierMapping.some((mapping) => !Array.isArray(mapping.supplierIds) || mapping.supplierIds.length === 0)) {
          preflightIssues.push("存在未映射供应商的设备");
        }
        if (supplierMapping.some((mapping) => mapping.status !== "complete")) {
          preflightIssues.push("存在参数未补全的设备");
        }
      }
      if (nextMetadata.aiApprovalStatus !== "approved" || nextMetadata.aiApprovalInvalidated === true) {
        preflightIssues.push("AI询价函草稿尚未完成人工批准");
      }

      const { data: inquirySuppliers, error: supplierCheckError } = await access.supabase
        .from("wpi_inquiry_suppliers")
        .select("supplier_id, wpi_suppliers(review_status)")
        .eq("organization_id", access.organizationId)
        .eq("inquiry_id", inquiry.id);
      if (supplierCheckError) {
        return NextResponse.json({ error: supplierCheckError.message }, { status: 500 });
      }
      if (!inquirySuppliers?.length) {
        preflightIssues.push("未关联询价供应商");
      } else if (inquirySuppliers.some((row) => {
        const supplier = Array.isArray(row.wpi_suppliers) ? row.wpi_suppliers[0] : row.wpi_suppliers;
        return supplier?.review_status !== "approved";
      })) {
        preflightIssues.push("存在未通过准入复核的供应商");
      }

      if (preflightIssues.length) {
        return NextResponse.json(
          {
            error: "Inquiry send preflight failed",
            code: "INQUIRY_PREFLIGHT_FAILED",
            issues: preflightIssues,
          },
          { status: 409 },
        );
      }
    }
    updates.status = body.status;
  }
  if (body.aiConfidence !== undefined) {
    if (body.aiConfidence !== null && (!Number.isFinite(body.aiConfidence) || body.aiConfidence < 0 || body.aiConfidence > 100)) {
      return NextResponse.json({ error: "AI confidence must be between 0 and 100" }, { status: 400 });
    }
    updates.ai_confidence = body.aiConfidence;
  }
  if (body.riskLevel !== undefined) updates.risk_level = body.riskLevel;
  if (body.baseCurrency !== undefined) {
    const baseCurrency = body.baseCurrency.trim().toUpperCase();
    if (!["CNY", "USD", "EUR", "CDF", "ZAR"].includes(baseCurrency)) {
      return NextResponse.json({ error: "Unsupported comparison currency" }, { status: 400 });
    }
    updates.base_currency = baseCurrency;
  }
  if (body.comparisonDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.comparisonDate)) {
      return NextResponse.json({ error: "Invalid comparison date" }, { status: 400 });
    }
    updates.comparison_date = body.comparisonDate;
  }
  if (body.metadata !== undefined) {
    updates.metadata = nextMetadata;
  }

  const { error: updateError } = await access.supabase
    .from("wpi_inquiries")
    .update(updates)
    .eq("id", inquiry.id)
    .eq("organization_id", access.organizationId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (body.status === "rejected" || body.status === "archived") {
    const linkedItems = await access.supabase
      .from("wpi_project_pricing_items")
      .select("id,matched_unit_price,price_source_type,decision_status,metadata")
      .eq("organization_id", access.organizationId)
      .contains("metadata", { inquiryId: inquiry.id });
    if (linkedItems.error) {
      return NextResponse.json({ error: `询价状态已更新，但套价缺口释放失败：${linkedItems.error.message}` }, { status: 500 });
    }
    for (const item of linkedItems.data ?? []) {
      const metadata = (item.metadata as Record<string, unknown> | null) ?? {};
      const { inquiryId: previousInquiryId, inquiryCode: previousInquiryCode, inquiryCreatedAt, ...retainedMetadata } = metadata;
      const hasAcceptedQuote = item.price_source_type === "inquiry_quote"
        || typeof metadata.inquiryQuoteReceivedAt === "string";
      const shouldReturnToGap = !hasAcceptedQuote
        && item.decision_status !== "confirmed"
        && item.matched_unit_price === null;
      const released = await access.supabase.from("wpi_project_pricing_items").update({
        ...(shouldReturnToGap ? {
          needs_inquiry: true,
          decision_status: "gap",
          match_level: "unmatched",
          risk_level: "high",
        } : {}),
        metadata: {
          ...retainedMetadata,
          previousInquiryId,
          previousInquiryCode,
          previousInquiryCreatedAt: inquiryCreatedAt,
          inquiryReleasedAt: new Date().toISOString(),
          inquiryReleasedReason: body.status,
        },
        updated_by: access.userId,
      }).eq("organization_id", access.organizationId).eq("id", item.id);
      if (released.error) {
        return NextResponse.json({ error: `询价状态已更新，但套价缺口释放失败：${released.error.message}` }, { status: 500 });
      }
    }
  }

  if (body.supplierIds !== undefined) {
    const normalizedIds = [...new Set(body.supplierIds.filter(Boolean))];
    const { data: suppliers, error: supplierError } = normalizedIds.length
      ? await access.supabase
          .from("wpi_suppliers")
          .select("id, legacy_id, review_status")
          .eq("organization_id", access.organizationId)
          .in("legacy_id", normalizedIds)
      : { data: [], error: null };

    if (supplierError) {
      return NextResponse.json({ error: supplierError.message }, { status: 500 });
    }
    if ((suppliers ?? []).length !== normalizedIds.length) {
      return NextResponse.json(
        { error: "One or more suppliers could not be resolved" },
        { status: 400 },
      );
    }

    const { error: deleteError } = await access.supabase
      .from("wpi_inquiry_suppliers")
      .delete()
      .eq("inquiry_id", inquiry.id)
      .eq("organization_id", access.organizationId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if ((suppliers ?? []).length > 0) {
      const { error: insertError } = await access.supabase
        .from("wpi_inquiry_suppliers")
        .insert(
          (suppliers ?? []).map((supplier) => ({
            organization_id: access.organizationId,
            inquiry_id: inquiry.id,
            supplier_id: supplier.id,
            response_status: "draft",
            risk_level: supplier.review_status === "approved" ? "low" : "medium",
            ai_recommendation:
              supplier.review_status === "approved"
                ? "供应商已通过准入，可由人工确认后发送。"
                : "供应商仍待人工复核，询价任务仅保存为草稿。",
            metadata: {
              sourceLegacyId: supplier.legacy_id,
              admissionStatus: supplier.review_status,
            },
          })),
        );
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  const changedFields = Object.keys(updates).filter((field) => !["updated_by", "updated_at"].includes(field));
  if (changedFields.length || body.supplierIds !== undefined) {
    const { error: eventError } = await access.supabase.from("wpi_inquiry_events").insert({
      organization_id: access.organizationId,
      inquiry_id: inquiry.id,
      event_type: "submitted",
      event_status: "completed",
      actor_id: access.userId,
      provider: "web_app",
      payload: {
        actionKind: "inquiry_updated",
        actionLabel: "更新询价任务",
        fields: body.supplierIds !== undefined ? [...changedFields, "suppliers"] : changedFields,
        note: "询价主档已由人工更新。",
      },
    });
    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }
  }

  const refreshed = await findInquiry(access, inquiry.id);
  return NextResponse.json({ data: refreshed.data, source: "supabase" });
}
