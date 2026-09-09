import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as null | {
    action?: "retry" | "cancel" | "review";
    decision?: "approved" | "request_changes" | "rejected";
    reviewNote?: string;
  };
  if (!body || !["retry", "cancel", "review"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "不支持的 AI 任务操作" }, { status: 400 });
  }
  const action = body.action === "retry" ? "retry_task" : body.action === "cancel" ? "cancel_task" : "review_task";
  const invoked = await access.supabase.functions.invoke("wpi-ai-gateway", {
    body: {
      action,
      organizationId: access.organizationId,
      executionTaskId: id,
      decision: body.decision,
      reviewNote: body.reviewNote,
    },
  });
  if (invoked.error) {
    return NextResponse.json({ error: await functionErrorDetail(invoked.error) }, { status: 502 });
  }
  return NextResponse.json(invoked.data, { status: invoked.data?.queued ? 202 : 200 });
}
