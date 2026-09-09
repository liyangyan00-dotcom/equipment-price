import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";

type RouteContext = { params: Promise<{ id: string; tagId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id, tagId } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (!found.data) return NextResponse.json({ error: found.error?.message ?? "附件证据不存在" }, { status: found.error ? 500 : 404 });
  const removed = await access.supabase.from("wpi_attachment_tags").delete()
    .eq("organization_id", access.organizationId).eq("attachment_id", found.data.id).eq("id", tagId).select("id").maybeSingle();
  if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 403 });
  if (!removed.data) return NextResponse.json({ error: "标签不存在" }, { status: 404 });
  const refreshed = await findAttachment(access, found.data.id);
  return NextResponse.json({ data: await readAttachmentDetail(access, refreshed.data!), source: "supabase" });
}
