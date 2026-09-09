import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor"]);
const allowedExtensions = new Set(["pdf", "xlsx", "xls", "docx", "doc", "jpg", "jpeg", "png"]);
const MAX_FILE_SIZE = 6 * 1024 * 1024;

async function resolveInquiry(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, id: string) {
  const query = () => access.supabase.from("wpi_inquiries").select("id").eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await query().eq("id", id).maybeSingle();
  return result;
}

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有附件上传权限" }, { status: 403 });

  const { id } = await context.params;
  const inquiry = await resolveInquiry(access, id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在，请先保存草稿" }, { status: 404 });

  const body = (await request.json()) as { fileName?: string; fileSize?: number; contentType?: string };
  const fileName = body.fileName?.trim() ?? "";
  const fileSize = Math.round(Number(body.fileSize) || 0);
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!fileName || !allowedExtensions.has(extension)) {
    return NextResponse.json({ error: "仅支持 PDF、Word、Excel、JPG、JPEG、PNG 文件" }, { status: 400 });
  }
  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "单个附件必须小于 6 MB；更大文件请使用分片上传" }, { status: 400 });
  }

  const path = buildBusinessObjectPath(access.organizationId, `inquiry-attachments/${inquiry.data.id}`, fileName);
  return NextResponse.json({
    upload: { bucket: "business-documents", path, contentType: body.contentType || "application/octet-stream" },
    inquiryId: inquiry.data.id,
  });
}
