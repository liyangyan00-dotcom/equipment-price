import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor"]);

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有标签维护权限" }, { status: 403 });
  const { id } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (!found.data) return NextResponse.json({ error: found.error?.message ?? "附件证据不存在" }, { status: found.error ? 500 : 404 });
  const body = await request.json().catch(() => ({})) as { name?: string };
  const name = body.name?.trim().slice(0, 48);
  if (!name) return NextResponse.json({ error: "标签不能为空" }, { status: 400 });
  const inserted = await access.supabase.from("wpi_attachment_tags").insert({
    organization_id: access.organizationId,
    attachment_id: found.data.id,
    name,
    created_by: access.userId,
  });
  if (inserted.error) return NextResponse.json({ error: inserted.error.code === "23505" ? "标签已存在" : inserted.error.message }, { status: inserted.error.code === "23505" ? 409 : 500 });
  const refreshed = await findAttachment(access, found.data.id);
  return NextResponse.json({ data: await readAttachmentDetail(access, refreshed.data!), source: "supabase" });
}
