import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { canReviewAttachments } from "@/lib/auth/attachmentReviewAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";

type RouteContext = { params: Promise<{ id: string }> };

const reviewErrors: Record<string, string> = {
  ATTACHMENT_RELATION_REQUIRED: "请先关联真实业务对象，再提交确认。",
  ATTACHMENT_AI_REVIEW_REQUIRED: "请先完成 AI 预审，再提交人工确认。",
  ATTACHMENT_SOURCE_EVIDENCE_REQUIRED: "请补齐原始文件及完整性指纹，再提交人工确认。",
  ATTACHMENT_REVIEW_STATE_CONFLICT: "附件已完成审核或已归档，请刷新记录。",
  ATTACHMENT_RELATION_TARGET_NOT_FOUND: "关联业务对象不存在或不属于当前组织。",
  ATTACHMENT_OPEN_ISSUES: "仍有未解决的准入问题，请处理后再确认。",
  ATTACHMENT_DUPLICATE_UNRESOLVED: "该文件与现有附件重复，不能再次确认。",
  ATTACHMENT_HIGH_RISK_JUSTIFICATION_REQUIRED: "高风险附件必须填写不少于 20 个字的复核说明。",
  ATTACHMENT_REVIEW_NOTES_REQUIRED: "请填写不少于 5 个字的审核说明。",
};

function humanizeReviewError(message: string) {
  const key = Object.keys(reviewErrors).find((candidate) => message.includes(candidate));
  return key ? reviewErrors[key] : message;
}

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    if (!await canReviewAttachments(access)) return NextResponse.json({ error: "当前账号没有附件审核权限", code: "ATTACHMENT_REVIEW_PERMISSION_DENIED" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "附件审核权限读取失败" }, { status: 503 });
  }
  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return NextResponse.json({ error: "请求内容必须为 JSON 对象" }, { status: 400 });
  const body = raw as { decision?: unknown; notes?: unknown };
  if (typeof body.decision !== "string" || !["confirmed", "need_info", "rejected"].includes(body.decision)
    || typeof body.notes !== "string" || body.notes.trim().length < 5 || body.notes.trim().length > 1000
    || Object.keys(raw).some((key) => !["decision", "notes"].includes(key))) {
    return NextResponse.json({ error: "请提交有效审核结论及 5–1000 字的审核说明" }, { status: 400 });
  }
  const { id } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (found.error) return NextResponse.json({ error: found.error.message }, { status: 500 });
  if (!found.data) return NextResponse.json({ error: "附件证据不存在" }, { status: 404 });

  const result = await access.supabase.rpc("wpi_submit_attachment_review", {
    target_attachment_id: found.data.id,
    review_decision: body.decision,
    review_notes: body.notes.trim(),
  });
  if (result.error) return NextResponse.json({ error: humanizeReviewError(result.error.message), code: result.error.message.split(":")[0] }, { status: /permission/i.test(result.error.message) ? 403 : 409 });
  const refreshed = await findAttachment(access, found.data.id);
  if (!refreshed.data) return NextResponse.json({ error: "审核后附件读取失败" }, { status: 500 });
  return NextResponse.json({ data: await readAttachmentDetail(access, refreshed.data), review: result.data, source: "supabase" });
}
