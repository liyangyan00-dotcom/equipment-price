import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";
import { recordQuoteEvent } from "@/lib/quote-recognition/audit";

const writeRoles = new Set(["admin", "manager", "editor"]);
const allowedExtensions = new Set(["xlsx", "csv", "pdf", "png", "jpg", "jpeg", "webp"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_FILE_SIZE = 20 * 1024 * 1024;
const BUCKET = "business-documents";

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有报价文件上传权限" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as null | {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
  const fileName = body?.fileName?.trim() ?? "";
  const fileSize = Math.round(Number(body?.fileSize) || 0);
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!fileName || !allowedExtensions.has(extension)) {
    return NextResponse.json({ error: "真实结构化识别支持 Excel、CSV、PDF、PNG、JPEG 和 WEBP 文件" }, { status: 400 });
  }
  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "文件大小必须在 50 MB 以内" }, { status: 400 });
  }
  if (["png", "jpg", "jpeg", "webp"].includes(extension) && fileSize > MAX_IMAGE_FILE_SIZE) {
    return NextResponse.json({ error: "报价图片大小必须在 20 MB 以内" }, { status: 400 });
  }
  const storagePath = buildBusinessObjectPath(access.organizationId, "quote-recognition", fileName);
  const mimeTypeByExtension: Record<string, string> = {
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const mimeType = mimeTypeByExtension[extension] || body?.mimeType || "application/octet-stream";
  const result = await access.supabase.from("wpi_quote_documents").insert({
    organization_id: access.organizationId,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    status: "uploaded",
    source_metadata: {
      uploadMode: "supabase-storage-direct",
      parser: ["xlsx", "csv"].includes(extension) ? extension : "document-vision",
      requiresHumanReview: true,
    },
    created_by: access.userId,
    updated_by: access.userId,
  }).select("*").single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });

  const audit = await recordQuoteEvent(access.supabase, {
    documentId: result.data.id,
    action: "quote.uploaded",
    note: "创建报价识别上传会话",
    metadata: { fileName, fileSize, mimeType, storagePath },
  });
  if (audit.error) {
    return NextResponse.json({ error: `上传会话审计失败：${audit.error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    data: result.data,
    upload: { bucket: BUCKET, path: storagePath, contentType: mimeType },
    source: "supabase",
  }, { status: 201 });
}
