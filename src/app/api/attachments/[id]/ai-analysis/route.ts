import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";
import { runAttachmentAiReview } from "@/lib/data/attachmentAiReview";

type RouteContext = { params: Promise<{ id: string }> };
const allowedRoles = new Set(["admin", "manager", "editor", "reviewer"]);

export async function POST(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!allowedRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有证据预审权限" }, { status: 403 });
  const { id } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (!found.data) return NextResponse.json({ error: found.error?.message ?? "附件证据不存在" }, { status: found.error ? 500 : 404 });

  try {
    await runAttachmentAiReview(access, found.data);
  } catch (error) {
    await access.supabase.from("wpi_attachments").update({ ai_status: "failed" })
      .eq("organization_id", access.organizationId).eq("id", found.data.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI预审失败" }, { status: 500 });
  }
  const refreshed = await findAttachment(access, found.data.id);
  return NextResponse.json({ data: await readAttachmentDetail(access, refreshed.data!), source: "supabase", engine: "rules-engine" });
}
