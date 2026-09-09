import { NextRequest, NextResponse } from "next/server";
import { buildAiQualityCostAnalytics, type GatewayAnalyticsRun, type GatewayReviewTask } from "@/lib/ai/qualityCostAnalytics";
import { getApiAccess } from "@/lib/auth/apiAccess";

async function canReadOrganizationAudit(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  if (access.role === "admin") return true;
  const override = await access.supabase
    .from("wpi_organization_role_permissions")
    .select("is_enabled")
    .eq("organization_id", access.organizationId)
    .eq("role", access.role)
    .eq("permission", "audit.read")
    .maybeSingle();
  if (override.error) throw override.error;
  if (override.data) return Boolean(override.data.is_enabled);

  const fallback = await access.supabase
    .from("wpi_role_permissions")
    .select("permission")
    .eq("role", access.role)
    .eq("permission", "audit.read")
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return Boolean(fallback.data);
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const requestedDays = Number(request.nextUrl.searchParams.get("days"));
    const rangeDays = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    const since = new Date(Date.now() - (rangeDays - 1) * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);
    const organizationScope = await canReadOrganizationAudit(access);

    let runQuery = access.supabase
      .from("wpi_ai_gateway_runs")
      .select("id, execution_task_id, workflow_key, status, provider, model, confidence, risk_level, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, created_at")
      .eq("organization_id", access.organizationId)
      .eq("action", "execute")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(5000);
    if (!organizationScope) runQuery = runQuery.eq("requested_by", access.userId);

    const runsResult = await runQuery;
    if (runsResult.error) return NextResponse.json({ error: runsResult.error.message }, { status: 500 });
    const runs = (runsResult.data ?? []) as GatewayAnalyticsRun[];
    const taskIds = [...new Set(runs.map((run) => run.execution_task_id).filter(Boolean))] as string[];
    let reviewTasks: GatewayReviewTask[] = [];
    if (taskIds.length) {
      const reviewResult = await access.supabase
        .from("wpi_ai_execution_tasks")
        .select("id, review_decision")
        .eq("organization_id", access.organizationId)
        .in("id", taskIds);
      if (reviewResult.error) return NextResponse.json({ error: reviewResult.error.message }, { status: 500 });
      reviewTasks = (reviewResult.data ?? []) as GatewayReviewTask[];
    }

    return NextResponse.json(buildAiQualityCostAnalytics({
      runs,
      reviewTasks,
      rangeDays,
      scope: organizationScope ? "organization" : "self",
      truncated: runs.length >= 5000,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI质量与成本分析读取失败" }, { status: 500 });
  }
}
