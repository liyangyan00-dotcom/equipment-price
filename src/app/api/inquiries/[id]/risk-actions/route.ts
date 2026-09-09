import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };

async function findInquiry(access: Awaited<ReturnType<typeof getApiAccess>> & { ok: true }, id: string) {
  const query = () => access.supabase
    .from("wpi_inquiries")
    .select("id, metadata")
    .eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await query().eq("id", id).maybeSingle();
  return result;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!["admin", "manager", "editor", "reviewer"].includes(access.role)) {
    return NextResponse.json({ error: "Current role cannot handle inquiry risks" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json() as {
    riskType?: string;
    impactObject?: string;
    actionLabel?: string;
    note?: string;
  };
  if (!body.riskType?.trim() || !body.actionLabel?.trim()) {
    return NextResponse.json({ error: "riskType and actionLabel are required" }, { status: 400 });
  }

  const result = await findInquiry(access, id);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });

  const metadata = result.data.metadata && typeof result.data.metadata === "object"
    ? result.data.metadata as Record<string, unknown>
    : {};
  const current = Array.isArray(metadata.riskResolutions) ? metadata.riskResolutions : [];
  const resolution = {
    id: crypto.randomUUID(),
    riskType: body.riskType.trim(),
    impactObject: body.impactObject?.trim() || "当前询价任务",
    actionLabel: body.actionLabel.trim(),
    note: body.note?.trim() || "已由人工记录处理动作，风险等级不自动下调。",
    handledBy: access.userId,
    handledAt: new Date().toISOString(),
  };

  const { error: updateError } = await access.supabase
    .from("wpi_inquiries")
    .update({
      metadata: { ...metadata, riskResolutions: [resolution, ...current].slice(0, 50) },
      updated_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", access.organizationId)
    .eq("id", result.data.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: eventError } = await access.supabase.from("wpi_inquiry_events").insert({
    organization_id: access.organizationId,
    inquiry_id: result.data.id,
    event_type: "submitted",
    event_status: "completed",
    actor_id: access.userId,
    provider: "web_app",
    payload: {
      actionKind: "risk_resolution",
      actionLabel: resolution.actionLabel,
      riskType: resolution.riskType,
      impactObject: resolution.impactObject,
      note: resolution.note,
    },
  });
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });

  return NextResponse.json({ data: resolution, source: "supabase" });
}
