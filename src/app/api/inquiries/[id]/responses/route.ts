import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor", "reviewer"]);

async function resolveInquiry(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, id: string) {
  const query = () => access.supabase.from("wpi_inquiries").select("id,inquiry_code").eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await query().eq("id", id).maybeSingle();
  return result;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const inquiry = await resolveInquiry(access, (await context.params).id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });
  const result = await access.supabase
    .from("wpi_inquiry_suppliers")
    .select("*, wpi_suppliers(id,legacy_id,name,region,wpi_supplier_contacts(id,name,email,is_primary))")
    .eq("organization_id", access.organizationId)
    .eq("inquiry_id", inquiry.data.id)
    .order("responded_at", { ascending: false, nullsFirst: false });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ data: result.data ?? [], source: "supabase" });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有报价回填权限" }, { status: 403 });
  const inquiry = await resolveInquiry(access, (await context.params).id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });

  const body = await request.json() as {
    supplierId?: string;
    quotedAmount?: number;
    currency?: string;
    respondedAt?: string;
    attachmentIds?: string[];
    note?: string;
  };
  const amount = Number(body.quotedAmount);
  const currency = body.currency?.trim().toUpperCase();
  if (!body.supplierId || !Number.isFinite(amount) || amount <= 0 || !currency) {
    return NextResponse.json({ error: "供应商、报价金额和币种为必填项" }, { status: 400 });
  }
  const respondedAt = body.respondedAt ? new Date(body.respondedAt) : new Date();
  if (Number.isNaN(respondedAt.getTime())) return NextResponse.json({ error: "响应时间无效" }, { status: 400 });

  const current = await access.supabase
    .from("wpi_inquiry_suppliers")
    .select("metadata")
    .eq("organization_id", access.organizationId)
    .eq("inquiry_id", inquiry.data.id)
    .eq("supplier_id", body.supplierId)
    .maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: "该供应商不在当前询价任务中" }, { status: 404 });

  const attachmentIds = [...new Set((body.attachmentIds ?? []).filter(Boolean))];
  if (attachmentIds.length) {
    const attachments = await access.supabase
      .from("wpi_attachments")
      .select("id,metadata")
      .eq("organization_id", access.organizationId)
      .eq("related_type", "inquiry")
      .eq("related_id", inquiry.data.id)
      .in("id", attachmentIds);
    if (attachments.error) return NextResponse.json({ error: attachments.error.message }, { status: 500 });
    if ((attachments.data ?? []).length !== attachmentIds.length) return NextResponse.json({ error: "存在不属于当前询价的附件" }, { status: 400 });
    for (const attachment of attachments.data ?? []) {
      await access.supabase.from("wpi_attachments").update({
        metadata: { ...((attachment.metadata as Record<string, unknown> | null) ?? {}), supplierId: body.supplierId, quoteEvidence: true },
        updated_by: access.userId,
      }).eq("id", attachment.id).eq("organization_id", access.organizationId);
    }
  }

  const metadata = {
    ...((current.data.metadata as Record<string, unknown> | null) ?? {}),
    quoteAttachmentIds: attachmentIds,
    quoteNote: body.note?.trim() || null,
    quoteRecordedBy: access.userId,
  };
  const update = await access.supabase
    .from("wpi_inquiry_suppliers")
    .update({
      quoted_amount: amount,
      currency,
      responded_at: respondedAt.toISOString(),
      replied_at: respondedAt.toISOString(),
      response_status: "quoted",
      delivery_status: "replied",
      last_error: null,
      metadata,
    })
    .eq("organization_id", access.organizationId)
    .eq("inquiry_id", inquiry.data.id)
    .eq("supplier_id", body.supplierId)
    .select("*")
    .single();
  if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });

  await access.supabase.from("wpi_inquiry_events").insert({
    organization_id: access.organizationId,
    inquiry_id: inquiry.data.id,
    supplier_id: body.supplierId,
    event_type: "quote_recorded",
    event_status: "completed",
    actor_id: access.userId,
    payload: { amount, currency, respondedAt: respondedAt.toISOString(), attachmentIds, note: body.note?.trim() || null },
  });
  return NextResponse.json({ data: update.data, source: "supabase" }, { status: 201 });
}
