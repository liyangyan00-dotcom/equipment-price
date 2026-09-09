import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };
async function resolveInquiry(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, id: string) {
  const query = () => access.supabase.from("wpi_inquiries").select("id,deadline").eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await query().eq("id", id).maybeSingle();
  return result;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const inquiry = await resolveInquiry(access, (await context.params).id);
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });
  const policy = await access.supabase.from("wpi_inquiry_reminder_policies").select("*")
    .eq("organization_id", access.organizationId).eq("inquiry_id", inquiry.data.id).maybeSingle();
  if (policy.error) return NextResponse.json({ error: policy.error.message }, { status: 500 });
  return NextResponse.json({ data: policy.data, source: "supabase" });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!["admin", "manager", "reviewer"].includes(access.role)) return NextResponse.json({ error: "当前角色没有催办策略维护权限" }, { status: 403 });
  const inquiry = await resolveInquiry(access, (await context.params).id);
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });
  const body = await request.json() as { enabled?: boolean; intervalHours?: number; maxReminders?: number; escalateAfterDeadlineHours?: number; escalationOwnerId?: string | null };
  const intervalHours = Math.min(720, Math.max(1, Number(body.intervalHours ?? 48)));
  const maxReminders = Math.min(20, Math.max(0, Number(body.maxReminders ?? 3)));
  const escalationHours = Math.min(720, Math.max(0, Number(body.escalateAfterDeadlineHours ?? 24)));
  const nextRunAt = new Date(Date.now() + intervalHours * 3600000).toISOString();
  const result = await access.supabase.from("wpi_inquiry_reminder_policies").upsert({
    organization_id: access.organizationId,
    inquiry_id: inquiry.data.id,
    enabled: body.enabled !== false,
    interval_hours: intervalHours,
    max_reminders: maxReminders,
    next_run_at: nextRunAt,
    escalate_after_deadline_hours: escalationHours,
    escalation_owner_id: body.escalationOwnerId || access.userId,
    created_by: access.userId,
    updated_by: access.userId,
  }, { onConflict: "inquiry_id" }).select("*").single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ data: result.data, source: "supabase" });
}

export async function POST() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!["admin", "manager", "reviewer"].includes(access.role)) return NextResponse.json({ error: "当前角色没有执行催办的权限" }, { status: 403 });
  const result = await access.supabase.functions.invoke("wpi-inquiry-reminder-runner", { body: {} });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 409 });
  return NextResponse.json({ data: result.data, source: "supabase-edge" });
}
