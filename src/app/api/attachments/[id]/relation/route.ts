import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (found.error) return NextResponse.json({ error: found.error.message }, { status: 500 });
  if (!found.data) return NextResponse.json({ error: "附件证据不存在" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { relatedType?: string; relatedId?: string };
  if (!body.relatedType || !body.relatedId || !/^[0-9a-f-]{36}$/i.test(body.relatedId)) {
    return NextResponse.json({ error: "请选择有效的业务对象" }, { status: 400 });
  }

  const result = await access.supabase.rpc("wpi_set_attachment_relation", {
    target_attachment_id: found.data.id,
    target_related_type: body.relatedType,
    target_related_id: body.relatedId,
  });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: /PERMISSION/.test(result.error.message) ? 403 : 409 });

  const issueResult = await access.supabase.from("wpi_attachment_issues").update({
    status: "resolved",
    resolution_notes: "已完成真实业务对象关联",
    resolved_by: access.userId,
    resolved_at: new Date().toISOString(),
  }).eq("organization_id", access.organizationId).eq("attachment_id", found.data.id)
    .eq("status", "open").eq("label", "尚未关联业务对象");
  if (issueResult.error) return NextResponse.json({ error: issueResult.error.message }, { status: 500 });

  const refreshed = await findAttachment(access, found.data.id);
  return NextResponse.json({ data: await readAttachmentDetail(access, refreshed.data!), relation: result.data, source: "supabase" });
}
