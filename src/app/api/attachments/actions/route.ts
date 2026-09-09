import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { attachmentReviewers, attachmentReviewRoles } from "@/lib/auth/attachmentReviewAccess";
import { findAttachment } from "@/lib/data/attachmentEvidenceRepository";
import { runAttachmentAiReview } from "@/lib/data/attachmentAiReview";

const aiRoles = new Set(["admin", "manager", "editor", "reviewer"]);

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return NextResponse.json({ error: "请求内容必须为 JSON 对象" }, { status: 400 });
  const body = raw as { action?: string; ids?: unknown; reviewerId?: unknown };
  const uuid = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 50 || !body.ids.every(uuid)) {
    return NextResponse.json({ error: "请选择 1–50 条有效附件记录" }, { status: 400 });
  }
  const ids = Array.from(new Set(body.ids as string[]));

  if (body.action === "assign") {
    if (!attachmentReviewRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有任务分配权限" }, { status: 403 });
    if (!uuid(body.reviewerId)) return NextResponse.json({ error: "请选择审核负责人" }, { status: 400 });
    try {
      const reviewers = await attachmentReviewers(access);
      if (!reviewers.some((member) => member.user_id === access.userId)) return NextResponse.json({ error: "当前账号没有任务分配权限" }, { status: 403 });
      if (!reviewers.some((member) => member.user_id === body.reviewerId)) return NextResponse.json({ error: "接收人没有有效附件审核权限", code: "ATTACHMENT_REVIEWER_NOT_ELIGIBLE" }, { status: 409 });
    } catch {
      return NextResponse.json({ error: "附件审核权限读取失败" }, { status: 503 });
    }
    // Resolve every id in the current organization; never silently assign a subset.
    const rows = await Promise.all(ids.map((id) => findAttachment(access, id)));
    if (rows.some((row) => row.error)) return NextResponse.json({ error: "附件读取失败" }, { status: 500 });
    if (rows.some((row) => !row.data)) return NextResponse.json({ error: "附件不存在或不属于当前组织" }, { status: 404 });
    const result = await access.supabase.rpc("wpi_assign_attachments", {
      target_attachment_ids: ids,
      target_reviewer_id: body.reviewerId,
    });
    if (result.error) return NextResponse.json({ error: result.error.message, code: result.error.message.split(":")[0] }, { status: /permission/i.test(result.error.message) ? 403 : 409 });
    return NextResponse.json({ data: { affected: result.data }, source: "supabase" });
  }

  if (body.action === "ai_review") {
    if (!aiRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有证据预审权限" }, { status: 403 });
    const rows = await Promise.all(ids.slice(0, 20).map((id) => findAttachment(access, id)));
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const item of rows) {
      if (!item.data) {
        results.push({ id: "unknown", ok: false, error: item.error?.message ?? "附件不存在" });
        continue;
      }
      try {
        await runAttachmentAiReview(access, item.data);
        results.push({ id: item.data.id, ok: true });
      } catch (error) {
        await access.supabase.from("wpi_attachments").update({ ai_status: "failed" })
          .eq("organization_id", access.organizationId).eq("id", item.data.id);
        results.push({ id: item.data.id, ok: false, error: error instanceof Error ? error.message : "AI预审失败" });
      }
    }
    return NextResponse.json({ data: {
      succeeded: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    }, source: "supabase" });
  }

  return NextResponse.json({ error: "不支持的批量操作" }, { status: 400 });
}
