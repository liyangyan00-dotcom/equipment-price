import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";

const writeRoles = new Set(["admin", "manager", "editor"]);
const allowedExtensions = new Set(["xlsx", "csv"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const BUCKET = "business-documents";

function createBatchCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IMP-EQP-${date}-${suffix}`;
}

function mimeTypeFor(supplied?: string) {
  if (supplied && supplied !== "application/octet-stream") return supplied;
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!writeRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有设备价格导入权限" },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
  const fileName = body.fileName?.trim() ?? "";
  const fileSize = Math.round(body.fileSize ?? 0);
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (!fileName || !allowedExtensions.has(extension)) {
    return NextResponse.json(
      { error: "请选择 .xlsx 或 .csv 文件，旧版 .xls 请先另存为 .xlsx" },
      { status: 400 }
    );
  }
  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "文件大小必须在 50 MB 以内" },
      { status: 400 }
    );
  }

  const storagePath = buildBusinessObjectPath(
    access.organizationId,
    "equipment-price-imports",
    fileName
  );
  const mimeType = extension === "csv" ? "text/csv" : mimeTypeFor(body.mimeType);
  const { data, error } = await access.supabase
    .from("wpi_equipment_import_batches")
    .insert({
      organization_id: access.organizationId,
      batch_code: createBatchCode(),
      file_name: fileName,
      file_size: fileSize,
      status: "uploaded",
      current_step: 1,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      mime_type: mimeType,
      source_metadata: {
        uploadMode: "supabase-storage-direct",
        originalFileStored: true,
        storageBucket: BUCKET,
        storagePath,
        mimeType,
      },
      created_by: access.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    data,
    upload: {
      bucket: BUCKET,
      path: storagePath,
      contentType: mimeType,
    },
  });
}
