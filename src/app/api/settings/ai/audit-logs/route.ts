import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type AiAuditRun = {
  run_id: string;
  run_type: string;
  object_id: string | null;
  object_code: string | null;
  object_name: string | null;
  status: string;
  provider: string;
  model: string;
  prompt_key: string | null;
  prompt_version: string | null;
  schema_version: string | null;
  input_snapshot: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  confidence: number | string | null;
  risk_level: string | null;
  requires_human_review: boolean;
  human_decision: string | null;
  human_note: string | null;
  actor_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  duration_ms: number | string | null;
  error_code: string | null;
  error_message: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  estimated_cost_usd?: number | string | null;
};

async function canReadAudit(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
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

function clean(value: string | null, max = 80) {
  return (value ?? "").replace(/[,%()_'"\\]/g, " ").trim().slice(0, max);
}

function objectHref(run: AiAuditRun) {
  if (run.run_type === "equipment_review") return `/equipment-prices/${encodeURIComponent(run.object_code || run.object_id || "")}`;
  if (run.run_type === "attachment_evidence") return `/attachments/${encodeURIComponent(run.object_code || run.object_id || "")}`;
  if (run.run_type === "price_collection") return `/ai-price-collection/tasks/${encodeURIComponent(run.object_id || "")}`;
  if (run.run_type === "ai_gateway" && run.object_code === "provider_connection_test") return "/settings/integrations";
  if (run.run_type === "ai_gateway" && run.object_id) return `/equipment-prices/reviews#task=${encodeURIComponent(run.object_id)}`;
  return "/ai-workbench";
}

function terminalHumanDecision(run: AiAuditRun) {
  const decision = run.human_decision?.trim().toLowerCase() || null;
  if (!decision) return null;
  if (["pending", "in_review", "need_info", "pending_review", "reviewing", "completed"].includes(decision)) {
    return run.run_type === "price_collection" && run.status === "transferred" ? "transferred" : null;
  }
  return decision;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    if (!(await canReadAudit(access))) {
      return NextResponse.json({ error: "当前角色没有查看 AI 审计日志的权限" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(10, Number(params.get("pageSize")) || 15));
    const keyword = clean(params.get("q"));
    const runType = clean(params.get("type"), 40) || "all";
    const status = clean(params.get("status"), 40) || "all";
    const risk = clean(params.get("risk"), 24) || "all";
    const review = clean(params.get("review"), 24) || "all";
    const from = clean(params.get("from"), 10);
    const to = clean(params.get("to"), 10);

    const [runsResult, gatewayRunsResult, organizationResult] = await Promise.all([
      access.supabase.rpc("wpi_get_ai_audit_runs", { target_organization_id: access.organizationId }),
      access.supabase
        .from("wpi_ai_gateway_runs")
        .select("id, action, workflow_key, business_object_id, status, provider, model, prompt_key, prompt_version, schema_version, input_snapshot, output_payload, confidence, risk_level, requires_human_review, requested_by, started_at, completed_at, created_at, latency_ms, error_code, error_message, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd")
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false })
        .limit(1000),
      access.supabase.from("wpi_organizations").select("id, code, name").eq("id", access.organizationId).maybeSingle(),
    ]);
    const firstError = runsResult.error || gatewayRunsResult.error || organizationResult.error;
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

    const gatewayRuns = (gatewayRunsResult.data ?? []).map((run) => ({
      run_id: run.id,
      run_type: "ai_gateway",
      object_id: run.business_object_id,
      object_code: run.workflow_key,
      object_name: run.action === "validate" ? "AI 供应商真实连通测试" : "AI 执行网关调用",
      status: run.status,
      provider: run.provider,
      model: run.model,
      prompt_key: run.prompt_key,
      prompt_version: run.prompt_version,
      schema_version: run.schema_version,
      input_snapshot: run.input_snapshot,
      output_payload: run.output_payload,
      confidence: run.confidence,
      risk_level: run.risk_level,
      requires_human_review: run.requires_human_review,
      human_decision: null,
      human_note: null,
      actor_id: run.requested_by,
      started_at: run.started_at,
      completed_at: run.completed_at,
      created_at: run.created_at,
      duration_ms: run.latency_ms,
      error_code: run.error_code,
      error_message: run.error_message,
      prompt_tokens: run.prompt_tokens,
      completion_tokens: run.completion_tokens,
      total_tokens: run.total_tokens,
      estimated_cost_usd: run.estimated_cost_usd,
    })) as AiAuditRun[];

    const allRuns = ([...(runsResult.data ?? []) as AiAuditRun[], ...gatewayRuns] as AiAuditRun[]).map((run) => ({
      ...run,
      confidence: run.confidence == null ? null : Number(run.confidence),
      duration_ms: run.duration_ms == null ? null : Number(run.duration_ms),
      estimated_cost_usd: run.estimated_cost_usd == null ? null : Number(run.estimated_cost_usd),
      human_decision: terminalHumanDecision(run),
      object_href: objectHref(run),
    }));

    const filtered = allRuns.filter((run) => {
      const haystack = [run.run_id, run.object_code, run.object_name, run.provider, run.model, run.prompt_key, run.prompt_version]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (keyword && !haystack.includes(keyword.toLowerCase())) return false;
      if (runType !== "all" && run.run_type !== runType) return false;
      if (status !== "all" && run.status !== status) return false;
      if (risk !== "all" && (run.risk_level ?? "none") !== risk) return false;
      if (review === "required" && !run.requires_human_review) return false;
      if (review === "completed" && !run.human_decision) return false;
      if (review === "pending" && (!run.requires_human_review || Boolean(run.human_decision))) return false;
      if (from && run.created_at < `${from}T00:00:00.000Z`) return false;
      if (to && run.created_at > `${to}T23:59:59.999Z`) return false;
      return true;
    });

    const rangeStart = (page - 1) * pageSize;
    const successful = allRuns.filter((run) => ["completed", "success", "transferred"].includes(run.status)).length;
    const modelCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    for (const run of allRuns) {
      modelCounts.set(`${run.provider} / ${run.model}`, (modelCounts.get(`${run.provider} / ${run.model}`) ?? 0) + 1);
      typeCounts.set(run.run_type, (typeCounts.get(run.run_type) ?? 0) + 1);
    }

    return NextResponse.json({
      organization: organizationResult.data,
      currentRole: access.role,
      rows: filtered.slice(rangeStart, rangeStart + pageSize),
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
      summary: {
        total: allRuns.length,
        successRate: allRuns.length ? Math.round((successful / allRuns.length) * 1000) / 10 : 0,
        needsReview: allRuns.filter((run) => run.requires_human_review && !run.human_decision).length,
        highRisk: allRuns.filter((run) => ["high", "critical"].includes(run.risk_level ?? "none")).length,
        failed: allRuns.filter((run) => run.status === "failed").length,
        models: modelCounts.size,
      },
      types: [...typeCounts.entries()].map(([name, count]) => ({ name, count })),
      models: [...modelCounts.entries()].sort((left, right) => right[1] - left[1]).map(([name, count]) => ({ name, count })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI 审计日志读取失败" }, { status: 500 });
  }
}
