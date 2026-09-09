import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { recordQuoteEvent } from "@/lib/quote-recognition/audit";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";

const writeRoles = new Set(["admin", "manager", "editor"]);
const allowedExtensions = new Set(["xlsx", "csv", "pdf", "png", "jpg", "jpeg", "webp"]);
const BUCKET = "business-documents";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const mimeTypes: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有报价采集上传权限" }, { status: 403 });

  const body = await request.json().catch(() => null) as null | {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    targetType?: "equipment" | "material";
    region?: string;
    currency?: string;
  };
  const fileName = body?.fileName?.trim() || "";
  const fileSize = Math.round(Number(body?.fileSize) || 0);
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  if (!fileName || !allowedExtensions.has(extension)) {
    return NextResponse.json({ error: "支持 Excel、CSV、PDF、PNG、JPEG 和 WEBP 报价文件" }, { status: 400 });
  }
  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "报价文件必须小于 50 MB" }, { status: 400 });
  }

  const taskCode = `COL-UP-${Date.now().toString().slice(-10)}`;
  const taskResult = await access.supabase.from("wpi_price_collection_tasks").insert({
    organization_id: access.organizationId,
    task_code: taskCode,
    target_type: body?.targetType === "material" ? "material" : "equipment",
    keyword: fileName.replace(/\.[^.]+$/, ""),
    region: body?.region?.trim() || null,
    currency: body?.currency?.trim().toUpperCase() || "CNY",
    source_type: "uploaded_quote",
    frequency: "manual",
    provider: extension === "xlsx" || extension === "csv" ? "deterministic-spreadsheet-v1" : "wpi-ai-gateway",
    collection_mode: "quote_upload",
    status: "running",
    progress: 5,
    current_source: `上传报价 · ${fileName}`,
    started_at: new Date().toISOString(),
    config: { fileName, fileSize, requiresHumanReview: true, aiFinalDecision: false },
    created_by: access.userId,
    updated_by: access.userId,
  }).select("*").single();
  if (taskResult.error || !taskResult.data) return NextResponse.json({ error: taskResult.error?.message || "无法创建报价采集任务" }, { status: 400 });

  const storagePath = buildBusinessObjectPath(access.organizationId, "price-collection-quotes", fileName);
  const documentResult = await access.supabase.from("wpi_quote_documents").insert({
    organization_id: access.organizationId,
    collection_task_id: taskResult.data.id,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeTypes[extension] || body?.mimeType || "application/octet-stream",
    storage_bucket: BUCKET,
    storage_path: storagePath,
    status: "uploaded",
    source_metadata: {
      uploadMode: "price-collection-quote",
      collectionTaskId: taskResult.data.id,
      parser: extension === "xlsx" || extension === "csv" ? extension : "document-vision",
      requiresHumanReview: true,
    },
    created_by: access.userId,
    updated_by: access.userId,
  }).select("*").single();
  if (documentResult.error || !documentResult.data) {
    await access.supabase.from("wpi_price_collection_tasks").delete().eq("id", taskResult.data.id);
    return NextResponse.json({ error: documentResult.error?.message || "无法创建报价识别文档" }, { status: 400 });
  }

  const audit = await recordQuoteEvent(access.supabase, {
    documentId: documentResult.data.id,
    action: "quote.uploaded",
    note: "从 AI 价格采集中心创建报价上传任务",
    metadata: {
      source: "price_collection",
      collectionTaskId: taskResult.data.id,
      taskCode,
      fileName,
      fileSize,
    },
  });
  if (audit.error) return NextResponse.json({ error: `上传审计失败：${audit.error.message}` }, { status: 500 });

  return NextResponse.json({
    task: taskResult.data,
    document: documentResult.data,
    upload: { bucket: BUCKET, path: storagePath, contentType: mimeTypes[extension] || body?.mimeType || "application/octet-stream" },
    next: { parseUrl: `/api/quote-recognition/${documentResult.data.id}/parse`, reviewUrl: `/pending-quotes?documentId=${documentResult.data.id}` },
  }, { status: 201 });
}
