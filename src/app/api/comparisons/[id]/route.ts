import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveComparison(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, id: string) {
  const selection = "*, wpi_inquiries(inquiry_code,subject,deadline,status), wpi_comparison_quotes(*,wpi_suppliers(id,legacy_id,name,region))";
  const query = () => access.supabase.from("wpi_comparisons").select(selection).eq("organization_id", access.organizationId);
  let result = await query().eq("comparison_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await query().eq("id", id).maybeSingle();
  if (!result.data && id.startsWith("CMP-INQ-")) result = await query().eq("comparison_code", id.replace("CMP-INQ-", "CMP-")).maybeSingle();
  return result;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const result = await resolveComparison(access, (await context.params).id);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "比价结果不存在，请先从询价任务生成真实比价" }, { status: 404 });
  return NextResponse.json({ data: result.data, source: "supabase" });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!["admin", "manager", "reviewer"].includes(access.role)) return NextResponse.json({ error: "当前角色没有比价决策权限" }, { status: 403 });
  const result = await resolveComparison(access, (await context.params).id);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "比价结果不存在" }, { status: 404 });
  const body = await request.json() as { supplierId?: string; note?: string };
  if (!body.supplierId) return NextResponse.json({ error: "请选择采用供应商" }, { status: 400 });
  const quote = (result.data.wpi_comparison_quotes as Array<{ supplier_id: string }> | null)?.find((item) => item.supplier_id === body.supplierId);
  if (!quote) return NextResponse.json({ error: "所选供应商不在本次比价结果中" }, { status: 400 });
  await access.supabase.from("wpi_comparison_quotes").update({ is_selected: false }).eq("comparison_id", result.data.id);
  const selected = await access.supabase.from("wpi_comparison_quotes").update({ is_selected: true }).eq("comparison_id", result.data.id).eq("supplier_id", body.supplierId);
  if (selected.error) return NextResponse.json({ error: selected.error.message }, { status: 500 });
  const updated = await access.supabase.from("wpi_comparisons").update({
    selected_supplier_id: body.supplierId,
    status: "decided",
    updated_by: access.userId,
    metadata: { ...((result.data.metadata as Record<string, unknown> | null) ?? {}), decisionNote: body.note?.trim() || null, decidedAt: new Date().toISOString() },
  }).eq("id", result.data.id).select("*").single();
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
  await access.supabase.from("wpi_inquiry_events").insert({
    organization_id: access.organizationId,
    inquiry_id: result.data.inquiry_id,
    supplier_id: body.supplierId,
    event_type: "comparison_decided",
    event_status: "completed",
    actor_id: access.userId,
    payload: { comparisonId: result.data.id, note: body.note?.trim() || null },
  });
  return NextResponse.json({ data: updated.data, source: "supabase" });
}
