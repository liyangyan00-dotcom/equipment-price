import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  EquipmentEvidenceInput,
  EquipmentPriceEditData,
  EquipmentTechnicalParameter,
} from "@/types/equipmentPriceCreate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const voidableRoles = new Set(["admin", "manager"]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const baseQuery = () =>
    access.supabase
      .from("wpi_equipment_prices")
      .select("*, wpi_suppliers(id, legacy_id, name)")
      .eq("organization_id", access.organizationId)
      .is("deleted_at", null);

  let result = isUuid(id)
    ? await baseQuery().eq("id", id).maybeSingle()
    : await baseQuery().eq("legacy_id", id).maybeSingle();
  if (!result.data) {
    result = await baseQuery().eq("price_code", id).maybeSingle();
  }
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  if (!result.data) {
    return NextResponse.json({ error: "设备价格记录不存在" }, { status: 404 });
  }

  const row = result.data;
  const metadata = objectValue(row.metadata);
  const technical = objectValue(row.technical_parameters);
  const rawItems = Array.isArray(technical.items) ? technical.items : [];
  const technicalParameters: EquipmentTechnicalParameter[] = rawItems
    .map((item) => objectValue(item))
    .map((item, index) => ({
      id: textValue(item.id) || `parameter-${index + 1}`,
      name: textValue(item.name),
      value: textValue(item.value),
      unit: textValue(item.unit),
      required: Boolean(item.required),
    }))
    .filter((item) => item.name);

  const [attachmentsResult, reviewResult] = await Promise.all([
    access.supabase
      .from("wpi_attachments")
      .select(
        "id,bucket_id,object_path,original_name,content_type,size_bytes,evidence_type,status,verification_status,description,document_date,valid_until,created_at"
      )
      .eq("organization_id", access.organizationId)
      .eq("related_type", "equipment_price")
      .eq("related_id", row.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    access.supabase
      .from("wpi_equipment_price_reviews")
      .select("id,status,review_comment,ai_judgment,ai_recommendation")
      .eq("organization_id", access.organizationId)
      .eq("equipment_price_id", row.id)
      .maybeSingle(),
  ]);
  if (attachmentsResult.error || reviewResult.error) {
    return NextResponse.json(
      { error: attachmentsResult.error?.message || reviewResult.error?.message },
      { status: 500 }
    );
  }

  const evidence: EquipmentEvidenceInput[] = (attachmentsResult.data ?? []).map(
    (item) => ({
      id: item.id,
      bucket: item.bucket_id,
      path: item.object_path,
      name: item.original_name,
      contentType: item.content_type ?? "",
      size: Number(item.size_bytes ?? 0),
      evidenceType: item.evidence_type ?? "quote_evidence",
      status: item.status ?? "active",
      verificationStatus: item.verification_status ?? "pending",
      description: item.description ?? "",
      documentDate: item.document_date ?? "",
      validUntil: item.valid_until ?? "",
      createdAt: item.created_at ?? "",
    })
  );

  const data: EquipmentPriceEditData = {
    id: row.id,
    priceCode: row.price_code,
    reviewStatus: row.review_status,
    reviewId: reviewResult.data?.id,
    reviewTaskStatus: reviewResult.data?.status,
    reviewComment: reviewResult.data?.review_comment ?? "",
    equipmentName: row.equipment_name,
    brand: row.brand ?? "",
    model: row.model ?? "",
    category: row.category ?? "",
    unit: textValue(metadata.unit) || textValue(technical.unit) || "台",
    originalPrice: Number(row.original_price ?? 0),
    originalCurrency: row.original_currency ?? "CNY",
    exchangeRate: Number(metadata.exchangeRate ?? 7.18),
    usdPrice: Number(row.usd_price ?? 0),
    priceTerm: row.price_term ?? "",
    quoteDate: textValue(metadata.quoteDate),
    validUntil: row.valid_until ?? "",
    taxStatus: textValue(metadata.taxStatus),
    deliveryCycle: textValue(metadata.deliveryCycle),
    priceBoundary: textValue(metadata.priceBoundary),
    supplierId: row.supplier_id ?? "",
    supplierName: row.wpi_suppliers?.name ?? "",
    sourceType: row.source_type ?? "",
    sourceUrl: row.source_url ?? "",
    inquiryCode: textValue(metadata.inquiryCode),
    technicalParameters,
    confidence: Number(row.confidence ?? 60),
    riskLevel: row.risk_level,
    aiJudgment:
      reviewResult.data?.ai_judgment ?? textValue(metadata.aiJudgment),
    aiRecommendation:
      reviewResult.data?.ai_recommendation ??
      textValue(metadata.aiRecommendation),
    evidence,
    updatedAt: row.updated_at,
  };

  return NextResponse.json({ data, source: "supabase" });
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!voidableRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有设备价格作废权限" },
      { status: 403 }
    );
  }

  let reason = "";
  try {
    const body = (await request.json()) as { reason?: unknown };
    reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  } catch {
    return NextResponse.json({ error: "请求数据格式错误" }, { status: 400 });
  }
  if (reason.length < 4) {
    return NextResponse.json(
      { error: "请填写至少 4 个字的作废原因" },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const baseQuery = () =>
    access.supabase
      .from("wpi_equipment_prices")
      .select("id,price_code,equipment_name,metadata")
      .eq("organization_id", access.organizationId)
      .is("deleted_at", null);
  let result = isUuid(id)
    ? await baseQuery().eq("id", id).maybeSingle()
    : await baseQuery().eq("legacy_id", id).maybeSingle();
  if (!result.data) {
    result = await baseQuery().eq("price_code", id).maybeSingle();
  }
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  if (!result.data) {
    return NextResponse.json({ error: "设备价格记录不存在或已作废" }, { status: 404 });
  }

  const { data: activeReview, error: activeReviewError } = await access.supabase
    .from("wpi_equipment_price_reviews")
    .select("id,status")
    .eq("organization_id", access.organizationId)
    .eq("equipment_price_id", result.data.id)
    .in("status", ["pending", "in_review"])
    .maybeSingle();
  if (activeReviewError) {
    return NextResponse.json({ error: activeReviewError.message }, { status: 500 });
  }
  if (activeReview) {
    return NextResponse.json(
      { error: "该设备价格正在审核中，请先完成或终止审核后再作废" },
      { status: 409 }
    );
  }

  const metadata = objectValue(result.data.metadata);
  const deletedAt = new Date().toISOString();
  const { error } = await access.supabase
    .from("wpi_equipment_prices")
    .update({
      deleted_at: deletedAt,
      deleted_by: access.userId,
      deletion_reason: reason,
      review_status: "archived",
      updated_by: access.userId,
      metadata: {
        ...metadata,
        voidedAt: deletedAt,
        voidedBy: access.userId,
        voidReason: reason,
      },
    })
    .eq("organization_id", access.organizationId)
    .eq("id", result.data.id)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    data: {
      id: result.data.id,
      priceCode: result.data.price_code,
      equipmentName: result.data.equipment_name,
      deletedAt,
      reason,
    },
    source: "supabase",
  });
}
