import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type { AiExecutionWorkflowKey } from "@/types/aiExecution";

const workflowKeys = new Set<AiExecutionWorkflowKey>([
  "equipment_price_pre_review",
  "quote_recognition",
  "price_collection",
  "comparison_analysis",
  "boq_parsing",
  "inquiry_letter",
  "report_generation",
]);

async function functionErrorDetail(error: unknown) {
  if (!error || typeof error !== "object") return "AI_GATEWAY_INVOCATION_FAILED";
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string; detail?: string };
      return payload.error || payload.detail || `AI_GATEWAY_HTTP_${context.status}`;
    } catch {
      return `AI_GATEWAY_HTTP_${context.status}`;
    }
  }
  return error instanceof Error ? error.message : "AI_GATEWAY_INVOCATION_FAILED";
}

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize")) || 10));
  const status = params.get("status")?.trim();
  const workflow = params.get("workflow")?.trim();
  const keyword = params.get("q")?.trim().slice(0, 100);
  const taskId = params.get("id")?.trim();

  if (taskId) {
    const [taskResult, eventResult] = await Promise.all([
      access.supabase.from("wpi_ai_execution_tasks").select("*")
        .eq("organization_id", access.organizationId).eq("id", taskId).maybeSingle(),
      access.supabase.from("wpi_ai_execution_events").select("*")
        .eq("organization_id", access.organizationId).eq("task_id", taskId)
        .order("created_at", { ascending: true }),
    ]);
    const error = taskResult.error || eventResult.error;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!taskResult.data) return NextResponse.json({ error: "AI任务不存在" }, { status: 404 });
    return NextResponse.json({ data: { ...taskResult.data, events: eventResult.data ?? [] }, source: "supabase" });
  }

  const summary = params.get("view") === "summary";
  const fields = summary
    ? "id,task_code,workflow_key,title,source_label,business_object_type,business_object_id,business_href,status,stage,progress,confidence,risk_level,requires_human_review,review_decision,attempt_count,max_attempts,error_code,error_message,started_at,completed_at,created_at,updated_at"
    : "*";
  let query = access.supabase.from("wpi_ai_execution_tasks").select(fields, { count: "exact" })
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  if (workflow && workflow !== "all") query = query.eq("workflow_key", workflow);
  if (keyword) {
    const safe = keyword.replace(/[,%()]/g, " ").trim();
    if (safe) query = query.or(`task_code.ilike.%${safe}%,title.ilike.%${safe}%,source_label.ilike.%${safe}%,business_object_id.ilike.%${safe}%`);
  }
  const from = (page - 1) * pageSize;
  const result = await query.range(from, from + pageSize - 1);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  return NextResponse.json({
    data: result.data ?? [],
    pagination: { page, pageSize, total: result.count ?? 0, pageCount: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)) },
    permissions: {
      canCreate: ["admin", "manager", "editor", "reviewer"].includes(access.role),
      canReview: ["admin", "manager", "reviewer"].includes(access.role),
    },
    source: "supabase",
  });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as null | {
    workflowKey?: unknown;
    title?: unknown;
    sourceLabel?: unknown;
    businessObjectType?: unknown;
    businessObjectId?: unknown;
    businessHref?: unknown;
    idempotencyKey?: unknown;
    input?: unknown;
  };
  if (!body || typeof body.workflowKey !== "string" || !workflowKeys.has(body.workflowKey as AiExecutionWorkflowKey)) {
    return NextResponse.json({ error: "请选择有效的 AI 工作流" }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "请输入任务标题" }, { status: 400 });
  }
  if (!body.input || typeof body.input !== "object" || Array.isArray(body.input)) {
    return NextResponse.json({ error: "请输入结构化任务数据" }, { status: 400 });
  }
  const invoked = await access.supabase.functions.invoke("wpi-ai-gateway", {
    body: {
      action: "enqueue_task",
      organizationId: access.organizationId,
      workflowKey: body.workflowKey,
      title: body.title,
      sourceLabel: typeof body.sourceLabel === "string" ? body.sourceLabel : "",
      businessObjectType: typeof body.businessObjectType === "string" ? body.businessObjectType : "",
      businessObjectId: typeof body.businessObjectId === "string" ? body.businessObjectId : "",
      businessHref: typeof body.businessHref === "string" ? body.businessHref : "",
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : "",
      input: body.input,
    },
  });
  if (invoked.error) {
    return NextResponse.json({ error: await functionErrorDetail(invoked.error) }, { status: 502 });
  }
  return NextResponse.json(invoked.data, { status: invoked.data?.queued ? 202 : 200 });
}
