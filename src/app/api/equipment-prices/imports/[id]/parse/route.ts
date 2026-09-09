import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { parseEquipmentWorkbook } from "@/lib/imports/parseEquipmentWorkbook";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

const writeRoles = new Set(["admin", "manager", "editor"]);
export async function POST(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    sheetName?: string;
    mappings?: Array<{ sourceField?: string; systemField?: string }>;
  };
  const { data: batch, error: batchError } = await access.supabase
    .from("wpi_equipment_import_batches")
    .select("*")
    .eq("id", id)
    .eq("organization_id", access.organizationId)
    .single();

  if (batchError || !batch) {
    return NextResponse.json(
      { error: batchError?.message || "导入批次不存在" },
      { status: 404 }
    );
  }

  if (
    ["parsing", "needs_review", "importing", "completed", "cancelled"].includes(
      String(batch.status)
    )
  ) {
    return NextResponse.json(
      {
        error:
          batch.status === "needs_review"
            ? "该批次已进入人工审核，需补资料时请在批次详情中修正后重新提交"
            : "当前批次状态不允许重新解析原文件",
      },
      { status: 409 }
    );
  }
  const sourceMetadata =
    batch.source_metadata &&
    typeof batch.source_metadata === "object" &&
    !Array.isArray(batch.source_metadata)
      ? (batch.source_metadata as Record<string, unknown>)
      : {};
  const storageBucket =
    (batch.storage_bucket as string | null | undefined) ??
    (typeof sourceMetadata.storageBucket === "string"
      ? sourceMetadata.storageBucket
      : null);
  const storagePath =
    (batch.storage_path as string | null | undefined) ??
    (typeof sourceMetadata.storagePath === "string"
      ? sourceMetadata.storagePath
      : null);

  if (!storageBucket || !storagePath) {
    return NextResponse.json(
      { error: "导入批次没有关联的 Storage 文件" },
      { status: 400 }
    );
  }

  await access.supabase
    .from("wpi_equipment_import_batches")
    .update({ status: "parsing", current_step: 1 })
    .eq("id", id)
    .eq("organization_id", access.organizationId);

  try {
    const { data: file, error: downloadError } = await access.supabase.storage
      .from(storageBucket)
      .download(storagePath);
    if (downloadError || !file) {
      throw downloadError ?? new Error("无法下载 Storage 文件");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseEquipmentWorkbook(
      buffer,
      batch.file_name,
      body.sheetName,
      Object.fromEntries(
        (body.mappings ?? [])
          .filter(
            (mapping): mapping is { sourceField: string; systemField: string } =>
              Boolean(mapping.sourceField && mapping.systemField)
          )
          .map((mapping) => [mapping.sourceField, mapping.systemField])
      )
    );
    const parsedAt = new Date().toISOString();
    const workbookSheets = parsed.sheets.map((sheet) => sheet.name);
    const { data: updatedBatch, error: updateError } = await access.supabase.rpc(
      "wpi_save_equipment_import_draft",
      {
        target_batch_id: id,
        batch_payload: {
          fileName: batch.file_name,
          fileSize: batch.file_size,
          sheetName: parsed.selectedSheet,
          headerRow: parsed.headerRow,
          status: "mapping",
          currentStep: 2,
          mappingConfidence: parsed.mappingConfidence,
          storageBucket,
          storagePath,
          mimeType:
            typeof sourceMetadata.mimeType === "string"
              ? sourceMetadata.mimeType
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          fileHash: parsed.fileHash,
          parseEngine: "read-excel-file@9.3.5",
          workbookSheets,
          parsedAt,
          sourceMetadata: {
          ...sourceMetadata,
          parserMode: "server-storage",
          originalFileStored: true,
          storageBucket,
          storagePath,
          mimeType:
            typeof sourceMetadata.mimeType === "string"
              ? sourceMetadata.mimeType
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          fileHash: parsed.fileHash,
          parseEngine: "read-excel-file@9.3.5",
          workbookSheets,
          parsedAt,
          truncated: parsed.truncated,
        },
        },
        mapping_payload: parsed.mappings,
        row_payload: parsed.rows,
      }
    );

    if (updateError || !updatedBatch) {
      throw updateError ?? new Error("无法更新解析结果");
    }

    return NextResponse.json({
      data: {
        batch: {
          ...updatedBatch,
          storage_bucket: storageBucket,
          storage_path: storagePath,
          mime_type: sourceMetadata.mimeType ?? null,
          parse_engine: "read-excel-file@9.3.5",
          workbook_sheets: workbookSheets,
          parsed_at: parsedAt,
        },
        mappings: parsed.mappings,
        rows: parsed.rows,
        sheets: parsed.sheets,
        selectedSheet: parsed.selectedSheet,
        headerRow: parsed.headerRow,
        mappingConfidence: parsed.mappingConfidence,
        truncated: parsed.truncated,
      },
    });
  } catch (error) {
    await access.supabase
      .from("wpi_equipment_import_batches")
      .update({
        status: "failed",
        source_metadata: {
          ...sourceMetadata,
          parseError:
            error instanceof Error ? error.message : "未知解析错误",
        },
      })
      .eq("id", id)
      .eq("organization_id", access.organizationId);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Excel 文件解析失败",
      },
      { status: 400 }
    );
  }
}
