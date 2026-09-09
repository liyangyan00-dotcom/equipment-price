import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { validateReportCompleteness, validateReviewChecklist } from "@/lib/reports/reportValidation";

const writeRoles = new Set(["admin", "manager", "editor"]);
const reviewRoles = new Set(["admin", "manager", "reviewer"]);
const statuses = new Set(["draft", "pending_review", "approved", "rejected", "archived"]);
const reviewStatuses = new Set(["approved", "rejected", "archived"]);
const allowedTransitions: Record<string, Set<string>> = {
  draft: new Set(["draft", "pending_review"]),
  pending_review: new Set(["approved", "rejected"]),
  rejected: new Set(["draft", "pending_review"]),
  approved: new Set(["archived"]),
  archived: new Set(),
};
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  let query = access.supabase.from("wpi_reports").select("*").eq("organization_id", access.organizationId);
  query = isUuid(id) ? query.eq("id", id) : query.eq("report_code", id);
  const result = await query.maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  return NextResponse.json({ data: result.data, source: "supabase" });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const requestedStatus = clean(body.status, 40);
  if (requestedStatus && !statuses.has(requestedStatus)) {
    return NextResponse.json({ error: "无效的报告状态" }, { status: 400 });
  }
  const isReview = reviewStatuses.has(requestedStatus);
  if (isReview ? !reviewRoles.has(access.role) : !writeRoles.has(access.role)) {
    return NextResponse.json({ error: isReview ? "当前角色没有报告审核权限" : "当前角色没有报告编辑权限" }, { status: 403 });
  }
  let currentQuery = access.supabase.from("wpi_reports").select("id,status,outline,content").eq("organization_id", access.organizationId);
  currentQuery = isUuid(id) ? currentQuery.eq("id", id) : currentQuery.eq("report_code", id);
  const current = await currentQuery.maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: "报告不存在" }, { status: 404 });

  const hasContentChanges = Boolean(
    clean(body.title) || clean(body.reportType, 100) || Array.isArray(body.outline)
      || (body.content && typeof body.content === "object"),
  );
  if (isReview && hasContentChanges) {
    return NextResponse.json({ error: "审核操作不能同时修改报告内容" }, { status: 400 });
  }
  if (hasContentChanges && !["draft", "rejected"].includes(current.data.status)) {
    return NextResponse.json({ error: "已提交审核或已归档的报告不能直接修改，请先退回草稿" }, { status: 409 });
  }
  if (requestedStatus && !allowedTransitions[current.data.status]?.has(requestedStatus)) {
    return NextResponse.json({ error: `报告不能从 ${current.data.status} 直接变更为 ${requestedStatus}` }, { status: 409 });
  }
  if (!requestedStatus && !hasContentChanges) {
    return NextResponse.json({ error: "没有可更新的报告内容" }, { status: 400 });
  }
  const nextOutline = Array.isArray(body.outline) ? body.outline.slice(0, 50) : current.data.outline;
  const nextContent = body.content && typeof body.content === "object" ? body.content : current.data.content;
  if (requestedStatus === "pending_review" || requestedStatus === "approved") {
    const validation = validateReportCompleteness(nextOutline, nextContent);
    if (!validation.valid) {
      return NextResponse.json({ error: `报告章节不完整：${validation.errors.slice(0, 3).join("；")}`, details: validation.errors }, { status: 422 });
    }
  }
  const patch: Record<string, unknown> = { updated_by: access.userId };
  if (clean(body.title)) patch.title = clean(body.title);
  if (clean(body.reportType, 100)) patch.report_type = clean(body.reportType, 100);
  if (requestedStatus && statuses.has(requestedStatus)) patch.status = requestedStatus;
  if (Array.isArray(body.outline)) patch.outline = body.outline.slice(0, 50);
  if (body.content && typeof body.content === "object") patch.content = body.content;
  if (requestedStatus === "approved" || requestedStatus === "rejected") {
    const reviewNote = clean(body.reviewNote, 2000);
    if (reviewNote.length < (requestedStatus === "approved" ? 10 : 5)) {
      return NextResponse.json({ error: requestedStatus === "approved" ? "批准报告必须填写至少 10 个字符的审核意见" : "退回报告必须填写退回原因" }, { status: 422 });
    }
    if (requestedStatus === "approved") {
      const checklist = validateReviewChecklist(body.reviewChecklist);
      if (!checklist.valid) {
        return NextResponse.json({ error: "请完成全部人工审核检查项后再批准", details: checklist.missing }, { status: 422 });
      }
    }
    patch.content = {
      ...object(current.data.content),
      reviewNote,
      reviewChecklist: object(body.reviewChecklist),
      reviewedBy: access.userId,
      reviewedAt: new Date().toISOString(),
      reviewDecision: requestedStatus,
    };
  }
  let query = access.supabase.from("wpi_reports").update(patch).eq("organization_id", access.organizationId);
  query = isUuid(id) ? query.eq("id", id) : query.eq("report_code", id);
  const result = await query.select().single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ data: result.data, source: "supabase" });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有报告删除权限" }, { status: 403 });
  const { id } = await context.params;
  let currentQuery = access.supabase.from("wpi_reports").select("id,status").eq("organization_id", access.organizationId);
  currentQuery = isUuid(id) ? currentQuery.eq("id", id) : currentQuery.eq("report_code", id);
  const current = await currentQuery.maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  if (!["draft", "rejected"].includes(current.data.status)) {
    return NextResponse.json({ error: "仅草稿或已退回报告可以删除" }, { status: 409 });
  }
  let query = access.supabase.from("wpi_reports").delete().eq("organization_id", access.organizationId);
  query = isUuid(id) ? query.eq("id", id) : query.eq("report_code", id);
  const result = await query;
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ data: { id }, source: "supabase" });
}
