import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";

type RouteContext = { params: Promise<{ id: string; issueId: string }> };
const allowedRoles = new Set(["admin", "manager", "editor", "reviewer"]);

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!allowedRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有问题处理权限" }, { status: 403 });
  const { id, issueId } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (!found.data) return NextResponse.json({ error: found.error?.message ?? "附件证据不存在" }, { status: found.error ? 500 : 404 });
  const body = await request.json().catch(() => ({})) as { resolutionNotes?: string };
  const result = await access.supabase.from("wpi_attachment_issues").update({
    status: "resolved",
    resolution_notes: body.resolutionNotes?.trim().slice(0, 500) || "已在附件详情页完成核验",
    resolved_by: access.userId,
    resolved_at: new Date().toISOString(),
  }).eq("organization_id", access.organizationId).eq("attachment_id", found.data.id).eq("id", issueId).select("id").maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "问题记录不存在" }, { status: 404 });
  const refreshed = await findAttachment(access, found.data.id);
  return NextResponse.json({ data: await readAttachmentDetail(access, refreshed.data!), source: "supabase" });
}
