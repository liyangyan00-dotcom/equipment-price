import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import {
  loadProjectPricing,
  projectPricingReviewRoles,
  projectPricingWriteRoles,
} from "@/lib/projectPricing/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  const { id, itemId } = await context.params;
  const body = (await request.json()) as {
    sourceRecordId?: string;
    sourceType?: string;
    unitPrice?: number;
    currency?: string;
    normalizedUsdPrice?: number;
    supplierId?: string;
    sourceCode?: string;
    supplierName?: string;
    sourceQuoteDate?: string;
    sourceValidUntil?: string;
    sourcePriceTerm?: string;
    sourceRegion?: string;
    notes?: string;
    confirmationReason?: string;
    priceBasis?: string;
    confirm?: boolean;
  };
  const allowed = body.confirm
    ? projectPricingReviewRoles.has(access.role)
    : projectPricingWriteRoles.has(access.role);
  if (!allowed)
    return NextResponse.json(
      {
        error: body.confirm
          ? "当前角色没有价格确认权限"
          : "当前角色没有手动选价权限",
      },
      { status: 403 },
    );
  if (!Number.isFinite(Number(body.unitPrice)) || Number(body.unitPrice) <= 0)
    return NextResponse.json({ error: "请输入有效的单价" }, { status: 400 });
  const currency = String(body.currency || "USD")
    .trim()
    .toUpperCase();
  const confirmationReasons = new Set([
    "accept_ai_recommendation",
    "select_alternative",
    "commercial_adjustment",
    "latest_quote",
    "other",
  ]);
  const priceBases = new Set([
    "ai_recommendation",
    "price_library_candidate",
    "supplier_quote",
    "manual_adjustment",
  ]);
  const confirmationReason = confirmationReasons.has(
    String(body.confirmationReason),
  )
    ? String(body.confirmationReason)
    : "commercial_adjustment";
  const priceBasis = priceBases.has(String(body.priceBasis))
    ? String(body.priceBasis)
    : "manual_adjustment";
  if (
    body.confirmationReason &&
    !confirmationReasons.has(body.confirmationReason)
  )
    return NextResponse.json(
      { error: "不支持的价格确认原因" },
      { status: 400 },
    );
  if (body.priceBasis && !priceBases.has(body.priceBasis))
    return NextResponse.json(
      { error: "不支持的价格决策口径" },
      { status: 400 },
    );
  if (confirmationReason === "other" && !String(body.notes || "").trim())
    return NextResponse.json(
      { error: "选择其他原因时必须填写补充说明" },
      { status: 400 },
    );
  const normalizedUsdPrice =
    currency === "USD"
      ? Number(body.unitPrice)
      : body.normalizedUsdPrice !== undefined &&
          Number.isFinite(Number(body.normalizedUsdPrice)) &&
          Number(body.normalizedUsdPrice) > 0
        ? Number(body.normalizedUsdPrice)
        : null;
  if (body.confirm && (normalizedUsdPrice === null || normalizedUsdPrice <= 0))
    return NextResponse.json(
      { error: "确认非 USD 价格前必须填写 USD 折算单价" },
      { status: 400 },
    );
  const current = await access.supabase
    .from("wpi_project_pricing_items")
    .select(
      "matched_unit_price,normalized_usd_price,currency,price_source_type,source_record_id,supplier_id,metadata",
    )
    .eq("organization_id", access.organizationId)
    .eq("project_id", id)
    .eq("id", itemId)
    .maybeSingle();
  if (current.error)
    return NextResponse.json({ error: current.error.message }, { status: 400 });
  if (!current.data)
    return NextResponse.json({ error: "项目套价行不存在" }, { status: 404 });
  const reasonLabels: Record<string, string> = {
    accept_ai_recommendation: "AI 推荐价格及条件可接受",
    select_alternative: "其他候选价格更适用",
    commercial_adjustment: "根据商务条件人工调整",
    latest_quote: "采用最新供应商报价",
    other: "其他原因",
  };
  const structuredNotes = `${reasonLabels[confirmationReason]}${body.notes?.trim() ? `；${body.notes.trim()}` : ""}`;
  const sourceChanged = Boolean(
    body.sourceRecordId &&
    body.sourceRecordId !== current.data.source_record_id,
  );
  const resolvedSourceRecordId =
    body.sourceRecordId || current.data.source_record_id || null;
  const resolvedSupplierId =
    body.supplierId ||
    (sourceChanged ? null : current.data.supplier_id) ||
    null;
  const decisionContext = {
    sourceCode: String(body.sourceCode || "").trim() || null,
    supplierName: String(body.supplierName || "").trim() || null,
    quoteDate: String(body.sourceQuoteDate || "").trim() || null,
    validUntil: String(body.sourceValidUntil || "").trim() || null,
    priceTerm: String(body.sourcePriceTerm || "").trim() || null,
    region: String(body.sourceRegion || "").trim() || null,
  };
  if (body.confirm) {
    let confirmed = await access.supabase.rpc(
      "wpi_confirm_project_pricing_item",
      {
        p_item_id: itemId,
        p_project_id: id,
        p_unit_price: Number(body.unitPrice),
        p_currency: currency,
        p_normalized_usd_price: normalizedUsdPrice,
        p_notes: body.notes || "",
        p_source_type:
          body.sourceType || current.data.price_source_type || null,
        p_source_record_id: resolvedSourceRecordId,
        p_supplier_id: resolvedSupplierId,
        p_confirmation_reason: confirmationReason,
        p_price_basis: priceBasis,
        p_decision_context: decisionContext,
      },
    );
    if (
      confirmed.error &&
      (confirmed.error.code === "PGRST202" ||
        confirmed.error.message.includes("Could not find the function"))
    ) {
      confirmed = await access.supabase.rpc(
        "wpi_confirm_project_pricing_item",
        {
          p_item_id: itemId,
          p_project_id: id,
          p_unit_price: Number(body.unitPrice),
          p_currency: currency,
          p_normalized_usd_price: normalizedUsdPrice,
          p_notes: structuredNotes,
          p_source_type:
            body.sourceType || current.data.price_source_type || null,
          p_source_record_id: resolvedSourceRecordId,
          p_supplier_id: resolvedSupplierId,
        },
      );
    }
    if (confirmed.error)
      return NextResponse.json(
        { error: confirmed.error.message },
        { status: 400 },
      );
    const data = await loadProjectPricing(
      access.supabase,
      access.organizationId,
      id,
    );
    return NextResponse.json({
      data,
      source: "supabase",
      audit: "confirmation-context",
    });
  }
  const metadata =
    (current.data.metadata as Record<string, unknown> | null) ?? {};
  const updated = await access.supabase
    .from("wpi_project_pricing_items")
    .update({
      matched_unit_price: Number(body.unitPrice),
      currency,
      normalized_usd_price: normalizedUsdPrice,
      price_source_type:
        body.sourceType || current.data.price_source_type || "manual",
      source_record_id: resolvedSourceRecordId,
      supplier_id: resolvedSupplierId,
      confidence: 90,
      match_level: "similar",
      risk_level: normalizedUsdPrice === null ? "high" : "low",
      needs_inquiry: false,
      decision_status: "manual_selected",
      notes: structuredNotes,
      updated_by: access.userId,
      metadata: {
        ...metadata,
        candidateSavedBy: access.userId,
        candidateSavedAt: new Date().toISOString(),
        candidateConfirmationReason: confirmationReason,
        candidatePriceBasis: priceBasis,
        candidatePreviousUnitPrice: current.data.matched_unit_price,
        candidatePreviousNormalizedUsdPrice: current.data.normalized_usd_price,
        candidateSourceCode: decisionContext.sourceCode,
        candidateSupplierName: decisionContext.supplierName,
        candidateQuoteDate: decisionContext.quoteDate,
        candidateValidUntil: decisionContext.validUntil,
        candidatePriceTerm: decisionContext.priceTerm,
        candidateRegion: decisionContext.region,
      },
    })
    .eq("organization_id", access.organizationId)
    .eq("project_id", id)
    .eq("id", itemId)
    .select()
    .single();
  if (updated.error)
    return NextResponse.json({ error: updated.error.message }, { status: 400 });
  const data = await loadProjectPricing(
    access.supabase,
    access.organizationId,
    id,
  );
  return NextResponse.json({ data, source: "supabase" });
}
