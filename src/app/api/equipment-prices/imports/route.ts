import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type { EquipmentImportMapping, EquipmentImportRow } from "@/types/equipmentImport";

type SaveImportPayload = {
  id?: string;
  fileName?: string;
  fileSize?: number;
  sheetName?: string;
  headerRow?: number;
  status?: "draft" | "uploaded" | "mapping" | "validating" | "needs_review";
  currentStep?: number;
  totalRows?: number;
  mappingConfidence?: number;
  sourceMetadata?: Record<string, unknown>;
  mappings?: EquipmentImportMapping[];
  rows?: EquipmentImportRow[];
};

const writeRoles = new Set(["admin", "manager", "editor"]);
export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await access.supabase
    .from("wpi_equipment_import_batches")
    .select("*")
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    source: "supabase",
    canWrite: writeRoles.has(access.role),
  });
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

  const body = (await request.json()) as SaveImportPayload;
  if (!body.fileName?.trim()) {
    return NextResponse.json({ error: "请选择需要导入的 Excel 文件" }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  const mappings = Array.isArray(body.mappings) ? body.mappings : [];
  if (!body.id) {
    return NextResponse.json(
      { error: "请先上传文件并创建导入批次" },
      { status: 400 }
    );
  }

  const { data: batch, error } = await access.supabase.rpc(
    "wpi_save_equipment_import_draft",
    {
      target_batch_id: body.id,
      batch_payload: {
        fileName: body.fileName.trim(),
        fileSize: Math.max(0, Math.round(body.fileSize ?? 0)),
        sheetName: body.sheetName?.trim() || "Sheet1",
        headerRow: Math.max(1, Math.round(body.headerRow ?? 1)),
        status: body.status ?? "draft",
        currentStep: Math.min(4, Math.max(1, Math.round(body.currentStep ?? 1))),
        mappingConfidence: Math.min(100, Math.max(0, body.mappingConfidence ?? 0)),
        sourceMetadata: body.sourceMetadata ?? {},
      },
      mapping_payload: mappings,
      row_payload: rows,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: batch, source: "supabase" });
}
