import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";

const writeRoles = new Set(["admin", "manager", "editor"]);
const allowed = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "eml", "png", "jpg", "jpeg", "webp"]);
const bucket = "business-documents";

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有附件上传权限" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { fileName?: string; fileSize?: number; contentType?: string };
  const fileName = body.fileName?.trim() ?? "";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!fileName || !allowed.has(extension)) return NextResponse.json({ error: "不支持该附件格式" }, { status: 400 });
  if (!body.fileSize || body.fileSize > 50 * 1024 * 1024) return NextResponse.json({ error: "附件必须小于 50 MB" }, { status: 400 });
  const path = buildBusinessObjectPath(access.organizationId, "attachments", fileName);
  return NextResponse.json({ upload: { bucket, path, contentType: body.contentType || "application/octet-stream" } });
}
