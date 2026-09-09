import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type { EquipmentSourceImportBatchRecord } from "@/types/priceCollection";

const manageableRoles = new Set(["admin", "manager"]);

function text(value: unknown, maxLength = 600) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function stringList(value: unknown, maxItems = 30) {
  if (Array.isArray(value)) {
    return value.map((item) => text(item, 120)).filter(Boolean).slice(0, maxItems);
  }
  return text(value, 1200)
    .split(/[,，;；|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const normalized = text(value, 16).toLowerCase();
  if (["true", "1", "yes", "是", "启用"].includes(normalized)) return true;
  if (["false", "0", "no", "否", "停用"].includes(normalized)) return false;
  return fallback;
}

function mapBatch(row: Record<string, unknown>): EquipmentSourceImportBatchRecord {
  return {
    id: String(row.id),
    batchCode: text(row.batch_code),
    fileName: text(row.file_name),
    status: (text(row.status) || "failed") as EquipmentSourceImportBatchRecord["status"],
    totalRows: Number(row.total_rows ?? 0),
    successRows: Number(row.success_rows ?? 0),
    failedRows: Number(row.failed_rows ?? 0),
    errors: Array.isArray(row.errors) ? row.errors as EquipmentSourceImportBatchRecord["errors"] : [],
    createdAt: text(row.created_at),
    finishedAt: text(row.finished_at),
  };
}

async function canManage(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  if (manageableRoles.has(access.role)) return true;
  const override = await access.supabase.from("wpi_organization_role_permissions").select("is_enabled")
    .eq("organization_id", access.organizationId).eq("role", access.role).eq("permission", "settings.manage").maybeSingle();
  if (override.error) throw override.error;
  return Boolean(override.data?.is_enabled);
}

function errorCsv(batch: EquipmentSourceImportBatchRecord) {
  const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    ["行号", "来源名称", "失败原因"],
    ...batch.errors.map((error) => [error.row, error.name, error.error]),
  ].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const downloadId = request.nextUrl.searchParams.get("download");
  if (downloadId) {
    const result = await access.supabase.from("wpi_equipment_source_import_batches").select("*")
      .eq("organization_id", access.organizationId).eq("id", downloadId).maybeSingle();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    if (!result.data) return NextResponse.json({ error: "导入批次不存在" }, { status: 404 });
    const batch = mapBatch(result.data);
    return new NextResponse(`\uFEFF${errorCsv(batch)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${batch.batchCode}-errors.csv"`,
      },
    });
  }
  const result = await access.supabase.from("wpi_equipment_source_import_batches").select("*")
    .eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(20);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ batches: (result.data ?? []).map((row) => mapBatch(row)), canManage: await canManage(access) });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!(await canManage(access))) return NextResponse.json({ error: "当前角色没有导入数据源的权限" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 100) as Array<Record<string, unknown>> : [];
  if (!rows.length) return NextResponse.json({ error: "导入文件中没有有效记录" }, { status: 400 });
  const batchCode = `ESI-${Date.now().toString().slice(-12)}`;
  const batchInsert = await access.supabase.from("wpi_equipment_source_import_batches").insert({
    organization_id: access.organizationId,
    batch_code: batchCode,
    file_name: text(body.fileName, 240) || "data-sources.csv",
    status: "processing",
    total_rows: rows.length,
    created_by: access.userId,
  }).select("*").single();
  if (batchInsert.error) return NextResponse.json({ error: batchInsert.error.message }, { status: 500 });

  const importedSources: Array<Record<string, unknown>> = [];
  const errors: EquipmentSourceImportBatchRecord["errors"] = [];
  for (const [index, row] of rows.entries()) {
    const name = text(row.name ?? row["来源名称"], 120);
    const baseUrl = text(row.baseUrl ?? row.base_url ?? row["采集地址"]);
    const sourceKind = text(row.sourceKind ?? row.source_kind ?? row["来源类型"], 12).toLowerCase() === "api" ? "api" : "web";
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(baseUrl);
      if (!name || parsedUrl.protocol !== "https:") throw new Error("来源名称和 HTTPS 地址不能为空");
    } catch (error) {
      errors.push({ row: index + 2, name: name || "未命名来源", error: error instanceof Error ? error.message : "采集地址无效" });
      continue;
    }
    const sourceCode = (text(row.sourceCode ?? row.source_code, 64) || `IMP_${Date.now().toString(36)}_${index}`).toUpperCase();
    const targetType = text(row.targetType ?? row.target_type ?? row["采集对象"], 20).toLowerCase() === "material" || text(row["采集对象"], 20) === "地材"
      ? "material"
      : "equipment";
    const defaultCurrency = text(row.defaultCurrency ?? row.default_currency ?? row.currency ?? row["币种"], 8).toUpperCase()
      || (targetType === "material" ? "USD" : "CNY");
    const defaultRegion = text(row.defaultRegion ?? row.default_region ?? row.city ?? row.country ?? row["地区"], 100) || null;
    const materialCategories = stringList(row.materialCategories ?? row.material_categories ?? row["地材分类"]);
    const trustLevel = text(row.trustLevel ?? row.trust_level ?? row["可信等级"], 8).toUpperCase() || null;
    const collectionMethod = text(row.collectionMethod ?? row.collection_method ?? row["采集方法"], 64) || null;
    const qualityScore = Number(row.qualityScore ?? row.quality_score ?? row["质量评分"]);
    const normalizedQualityScore = Number.isFinite(qualityScore)
      ? Math.min(100, Math.max(0, qualityScore))
      : trustLevel === "A" ? 85 : trustLevel === "B" ? 75 : trustLevel === "C" ? 60 : 60;
    const insert = await access.supabase.from("wpi_price_collection_sources").insert({
      organization_id: access.organizationId,
      source_code: sourceCode,
      name,
      source_kind: sourceKind,
      base_url: parsedUrl.toString(),
      allowed_hosts: [parsedUrl.hostname.toLowerCase()],
      allowed_path_prefixes: ["/"],
      is_active: false,
      robots_policy: "respect",
      rate_limit_per_minute: 6,
      default_currency: defaultCurrency,
      default_region: defaultRegion,
      quality_score: normalizedQualityScore,
      extraction_strategy: sourceKind === "api" ? "json_api" : "structured_data",
      discovery_enabled: sourceKind === "web" && booleanValue(row.discoveryEnabled ?? row.discovery_enabled, true),
      max_discovery_depth: Math.min(5, Math.max(0, Number(row.maxDiscoveryDepth ?? row.max_discovery_depth ?? 2) || 2)),
      config: {
        targetType,
        catalogSourceType: text(row.catalogSourceType ?? row.catalog_source_type ?? row["资料来源"], 40) || (sourceKind === "api" ? "api" : "manufacturer_site"),
        brand: text(row.brand ?? row["品牌"], 120) || null,
        supplierName: text(row.supplierName ?? row["供应商"], 160) || null,
        equipmentCategory: text(row.equipmentCategory ?? row["设备类别"], 120) || null,
        country: text(row.country ?? row["国家"], 20) || null,
        city: text(row.city ?? row["城市"], 80) || null,
        coverageArea: stringList(row.coverageArea ?? row.coverage_area ?? row["覆盖区域"]),
        materialCategories,
        collectionMethod,
        trustLevel,
        directPriceAllowed: booleanValue(row.directPriceAllowed ?? row.direct_price_allowed, false),
        requiresManualConfirmation: booleanValue(row.requiresManualConfirmation ?? row.requires_manual_confirmation, true),
        supportsWhatsApp: booleanValue(row.supportsWhatsApp ?? row.supports_whatsapp, false),
        supportsDeliveryInfo: booleanValue(row.supportsDeliveryInfo ?? row.supports_delivery_info, false),
        requiresHumanReview: booleanValue(row.reviewRequired ?? row.review_required, true),
        aiFinalDecision: false,
      },
      last_error: "等待来源验证",
      created_by: access.userId,
      updated_by: access.userId,
    }).select("*").single();
    if (insert.error || !insert.data) {
      errors.push({ row: index + 2, name, error: insert.error?.code === "23505" ? "来源编码或地址已存在" : insert.error?.message || "写入失败" });
    } else {
      importedSources.push(insert.data);
    }
  }
  const status = importedSources.length === rows.length ? "completed" : importedSources.length ? "partial" : "failed";
  const batchUpdate = await access.supabase.from("wpi_equipment_source_import_batches").update({
    status,
    success_rows: importedSources.length,
    failed_rows: errors.length,
    errors,
    finished_at: new Date().toISOString(),
  }).eq("organization_id", access.organizationId).eq("id", batchInsert.data.id).select("*").single();
  if (batchUpdate.error) return NextResponse.json({ error: batchUpdate.error.message }, { status: 500 });
  return NextResponse.json({ batch: mapBatch(batchUpdate.data), sources: importedSources }, { status: status === "failed" ? 422 : 201 });
}
