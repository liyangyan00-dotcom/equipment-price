import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor", "reviewer"]);

async function resolveInquiry(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  id: string,
) {
  const query = () => access.supabase.from("wpi_inquiries").select("id").eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await query().eq("id", id).maybeSingle();
  return result;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const inquiry = await resolveInquiry(access, (await context.params).id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });
  const inquiryId = inquiry.data.id;
  const supplierId = request.nextUrl.searchParams.get("supplierId");
  const items = await access.supabase.from("wpi_inquiry_items")
    .select("id,item_name,specification,quantity,unit,target_price")
    .eq("organization_id", access.organizationId).eq("inquiry_id", inquiryId).order("created_at");
  if (items.error) return NextResponse.json({ error: items.error.message }, { status: 500 });
  let quoteQuery = access.supabase.from("wpi_inquiry_item_quotes").select("*")
    .eq("organization_id", access.organizationId).eq("inquiry_id", inquiryId);
  if (supplierId) quoteQuery = quoteQuery.eq("supplier_id", supplierId);
  const quotes = await quoteQuery;
  if (quotes.error) return NextResponse.json({ error: quotes.error.message }, { status: 500 });
  return NextResponse.json({ data: { items: items.data ?? [], quotes: quotes.data ?? [] }, source: "supabase" });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有逐项报价维护权限" }, { status: 403 });
  const inquiry = await resolveInquiry(access, (await context.params).id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });
  const inquiryId = inquiry.data.id;
  const body = await request.json() as {
    supplierId?: string;
    currency?: string;
    respondedAt?: string;
    note?: string;
    items?: Array<{ inquiryItemId?: string; unitPrice?: number; deliveryDays?: number | null; validityDays?: number | null; technicalDeviation?: string; commercialDeviation?: string }>;
  };
  const currency = body.currency?.trim().toUpperCase();
  if (!body.supplierId || !currency || !body.items?.length) return NextResponse.json({ error: "供应商、币种和逐项报价为必填项" }, { status: 400 });
  const source = await access.supabase.from("wpi_inquiry_items").select("id,quantity,unit,metadata")
    .eq("organization_id", access.organizationId).eq("inquiry_id", inquiryId);
  if (source.error) return NextResponse.json({ error: source.error.message }, { status: 500 });
  const sourceMap = new Map((source.data ?? []).map((item) => [item.id, item]));
  if (body.items.length !== sourceMap.size) return NextResponse.json({ error: "必须完整填写所有询价项目" }, { status: 400 });
  const invalid = body.items.some((item) => !sourceMap.has(String(item.inquiryItemId ?? "")) || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0);
  if (invalid) return NextResponse.json({ error: "存在无效的逐项报价" }, { status: 400 });
  const supplier = await access.supabase.from("wpi_inquiry_suppliers").select("supplier_id,metadata")
    .eq("organization_id", access.organizationId).eq("inquiry_id", inquiryId).eq("supplier_id", body.supplierId).maybeSingle();
  if (supplier.error) return NextResponse.json({ error: supplier.error.message }, { status: 500 });
  if (!supplier.data) return NextResponse.json({ error: "该供应商不在当前询价任务中" }, { status: 404 });
  const rows = body.items.map((item) => {
    const sourceItem = sourceMap.get(String(item.inquiryItemId))!;
    return {
      organization_id: access.organizationId,
      inquiry_id: inquiryId,
      inquiry_item_id: sourceItem.id,
      supplier_id: body.supplierId!,
      quantity: sourceItem.quantity,
      unit: sourceItem.unit,
      unit_price: Number(item.unitPrice),
      currency,
      delivery_days: item.deliveryDays == null ? null : Number(item.deliveryDays),
      validity_days: item.validityDays == null ? null : Number(item.validityDays),
      technical_deviation: item.technicalDeviation?.trim() || null,
      commercial_deviation: item.commercialDeviation?.trim() || null,
      metadata: { source: "internal_quote_entry", recordedBy: access.userId },
    };
  });
  const upsert = await access.supabase.from("wpi_inquiry_item_quotes").upsert(rows, { onConflict: "inquiry_item_id,supplier_id" }).select("id,inquiry_item_id,supplier_id,unit_price,currency,total_amount");
  if (upsert.error) return NextResponse.json({ error: upsert.error.message }, { status: 500 });
  const total = (upsert.data ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  const respondedAt = body.respondedAt ? new Date(body.respondedAt) : new Date();
  const update = await access.supabase.from("wpi_inquiry_suppliers").update({
    quoted_amount: total,
    currency,
    responded_at: respondedAt.toISOString(),
    replied_at: respondedAt.toISOString(),
    response_status: "quoted",
    delivery_status: "replied",
    metadata: { ...((supplier.data.metadata as Record<string, unknown> | null) ?? {}), quoteNote: body.note?.trim() || null, quoteRecordedBy: access.userId, itemQuoteCount: rows.length },
  }).eq("organization_id", access.organizationId).eq("inquiry_id", inquiryId).eq("supplier_id", body.supplierId);
  if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
  const pricingLinks = (source.data ?? []).map((item) => ({
    inquiryItemId: item.id,
    projectItemId: String((item.metadata as Record<string, unknown> | null)?.sourceId ?? ""),
  })).filter((item) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item.projectItemId));
  if (pricingLinks.length) {
    const pricingItems = await access.supabase.from("wpi_project_pricing_items")
      .select("id,matched_unit_price,price_source_type,evidence_count,metadata")
      .eq("organization_id", access.organizationId)
      .in("id", pricingLinks.map((item) => item.projectItemId));
    if (pricingItems.error) return NextResponse.json({ error: `报价已保存，但项目套价回填失败：${pricingItems.error.message}` }, { status: 500 });
    for (const quote of upsert.data ?? []) {
      const link = pricingLinks.find((item) => item.inquiryItemId === quote.inquiry_item_id);
      const pricingItem = (pricingItems.data ?? []).find((item) => item.id === link?.projectItemId);
      if (!link || !pricingItem) continue;
      const shouldRecommendQuote = pricingItem.matched_unit_price == null || pricingItem.price_source_type === "unmatched";
      const quoteSnapshot = { quoteId: quote.id, inquiryId, inquiryItemId: quote.inquiry_item_id, supplierId: quote.supplier_id, unitPrice: Number(quote.unit_price), currency: quote.currency, receivedAt: respondedAt.toISOString() };
      const pricingUpdate = await access.supabase.from("wpi_project_pricing_items").update({
        ...(shouldRecommendQuote ? {
          matched_unit_price: Number(quote.unit_price),
          normalized_usd_price: quote.currency === "USD" ? Number(quote.unit_price) : null,
          currency: quote.currency,
          price_source_type: "inquiry_quote",
          source_record_id: quote.id,
          supplier_id: quote.supplier_id,
          confidence: 85,
          match_level: "exact",
          needs_inquiry: false,
          decision_status: "ai_recommended",
        } : {}),
        evidence_count: Number(pricingItem.evidence_count ?? 0) + 1,
        metadata: {
          ...((pricingItem.metadata as Record<string, unknown> | null) ?? {}),
          inquiryQuoteReceivedAt: respondedAt.toISOString(),
          latestInquiryQuote: quoteSnapshot,
          requiresManualPricingConfirmation: true,
        },
        updated_by: access.userId,
      }).eq("organization_id", access.organizationId).eq("id", link.projectItemId);
      if (pricingUpdate.error) return NextResponse.json({ error: `报价已保存，但项目套价回填失败：${pricingUpdate.error.message}` }, { status: 500 });
    }
  }
  await access.supabase.from("wpi_inquiry_events").insert({ organization_id: access.organizationId, inquiry_id: inquiryId, supplier_id: body.supplierId, event_type: "quote_recorded", event_status: "completed", actor_id: access.userId, payload: { mode: "item_level", itemCount: rows.length, total, currency } });
  return NextResponse.json({ data: { itemCount: rows.length, total, currency }, source: "supabase" }, { status: 201 });
}
