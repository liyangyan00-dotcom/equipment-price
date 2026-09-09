import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const writableRoles = new Set(["admin", "manager", "editor"]);

function cleanText(value: unknown, maxLength = 300) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function catalogCode() {
  return `CAT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto
    .randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
}

export async function GET(request: Request) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Number(params.get("pageSize")) || 12),
  );
  const keyword = cleanText(params.get("keyword"), 120).replace(
    /[%_(),]/g,
    " ",
  );
  const category = cleanText(params.get("category"), 120);
  const equipmentType = cleanText(params.get("equipmentType"), 120);
  const brand = cleanText(params.get("brand"), 120);
  const supplier = cleanText(params.get("supplier"), 180);
  const reviewStatus = cleanText(params.get("reviewStatus"), 32);
  const completeness = cleanText(params.get("completeness"), 24);
  const sourceType = cleanText(params.get("sourceType"), 64);
  const riskLevel = cleanText(params.get("riskLevel"), 32);
  const taskId = cleanText(params.get("taskId"), 80);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supplierJoin =
    supplier && supplier !== "all"
      ? "*, source_supplier:wpi_suppliers!wpi_equipment_catalog_source_supplier_id_fkey!inner(id,name)"
      : "*, source_supplier:wpi_suppliers!wpi_equipment_catalog_source_supplier_id_fkey(id,name)";
  let query = access.supabase
    .from("wpi_equipment_catalog")
    .select(supplierJoin, {
      count: "exact",
    })
    .eq("organization_id", access.organizationId);

  if (keyword) {
    query = query.or(
      `catalog_code.ilike.%${keyword}%,equipment_name.ilike.%${keyword}%,brand.ilike.%${keyword}%,manufacturer.ilike.%${keyword}%,model.ilike.%${keyword}%`,
    );
  }
  if (category && category !== "all")
    query = query.eq("equipment_category", category);
  if (equipmentType && equipmentType !== "all")
    query = query.eq("equipment_type", equipmentType);
  if (brand && brand !== "all") query = query.eq("brand", brand);
  if (supplier && supplier !== "all")
    query = query.eq("source_supplier.name", supplier);
  if (reviewStatus && reviewStatus !== "all")
    query = query.eq("review_status", reviewStatus);
  if (sourceType && sourceType !== "all")
    query = query.eq("source_type", sourceType);
  if (riskLevel && riskLevel !== "all")
    query = query.eq("risk_level", riskLevel);
  if (taskId) query = query.eq("collection_task_id", taskId);
  if (completeness === "high") query = query.gte("parameter_completeness", 85);
  if (completeness === "medium")
    query = query
      .gte("parameter_completeness", 60)
      .lt("parameter_completeness", 85);
  if (completeness === "low") query = query.lt("parameter_completeness", 60);

  const [
    listResult,
    summaryResult,
    supplierRelationSummary,
    supplierFacetResult,
  ] = await Promise.all([
    query.order("updated_at", { ascending: false }).range(from, to),
    access.supabase
      .from("wpi_equipment_catalog")
      .select(
        "id,equipment_category,equipment_type,brand,manufacturer,source_type,review_status,risk_level,parameter_completeness",
      )
      .eq("organization_id", access.organizationId)
      .limit(5000),
    access.supabase
      .from("wpi_supplier_equipment_catalog")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId),
    access.supabase
      .from("wpi_suppliers")
      .select("id,name")
      .eq("organization_id", access.organizationId)
      .order("name", { ascending: true })
      .limit(500),
  ]);

  if (
    listResult.error ||
    summaryResult.error ||
    supplierRelationSummary.error ||
    supplierFacetResult.error
  ) {
    return NextResponse.json(
      {
        error:
          listResult.error?.message ||
          summaryResult.error?.message ||
          supplierRelationSummary.error?.message ||
          supplierFacetResult.error?.message,
      },
      { status: 500 },
    );
  }

  const rows = listResult.data ?? [];
  const ids = rows.map((row) => row.id);
  const [parameterResult, supplierResult, priceResult, imageResult] = ids.length
    ? await Promise.all([
        access.supabase
          .from("wpi_equipment_catalog_parameters")
          .select("equipment_catalog_id")
          .in("equipment_catalog_id", ids),
        access.supabase
          .from("wpi_supplier_equipment_catalog")
          .select("equipment_catalog_id")
          .in("equipment_catalog_id", ids),
        access.supabase
          .from("wpi_equipment_prices")
          .select("equipment_catalog_id")
          .in("equipment_catalog_id", ids)
          .is("deleted_at", null),
        access.supabase
          .from("wpi_attachments")
          .select("related_id,bucket_id,object_path,original_name,created_at")
          .eq("organization_id", access.organizationId)
          .eq("related_type", "equipment_catalog")
          .eq("status", "active")
          .like("content_type", "image/%")
          .in("related_id", ids)
          .order("created_at", { ascending: false }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  const relationError =
    parameterResult.error ||
    supplierResult.error ||
    priceResult.error ||
    imageResult.error;
  if (relationError)
    return NextResponse.json({ error: relationError.message }, { status: 500 });

  const countById = (items: Array<{ equipment_catalog_id: string | null }>) =>
    items.reduce<Record<string, number>>((result, item) => {
      if (item.equipment_catalog_id) {
        result[item.equipment_catalog_id] =
          (result[item.equipment_catalog_id] ?? 0) + 1;
      }
      return result;
    }, {});
  const parameterCounts = countById(parameterResult.data ?? []);
  const supplierCounts = countById(supplierResult.data ?? []);
  const priceCounts = countById(priceResult.data ?? []);
  const latestImageByCatalog = new Map<
    string,
    { bucket_id: string; object_path: string; original_name: string }
  >();
  for (const image of imageResult.data ?? []) {
    if (image.related_id && !latestImageByCatalog.has(image.related_id)) {
      latestImageByCatalog.set(image.related_id, {
        bucket_id: image.bucket_id,
        object_path: image.object_path,
        original_name: image.original_name,
      });
    }
  }
  const thumbnailByCatalog = new Map<string, { url: string; name: string }>();
  await Promise.all(
    Array.from(latestImageByCatalog.entries()).map(
      async ([catalogId, image]) => {
        const signed = await access.supabase.storage
          .from(image.bucket_id)
          .createSignedUrl(image.object_path, 600);
        if (signed.data?.signedUrl) {
          thumbnailByCatalog.set(catalogId, {
            url: signed.data.signedUrl,
            name: image.original_name,
          });
        }
      },
    ),
  );
  const summaryRows = summaryResult.data ?? [];
  const unique = (values: string[]) =>
    Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "zh-CN"),
    );
  const counts = (values: string[]) =>
    Object.entries(
      values.reduce<Record<string, number>>((result, value) => {
        const key = value || "未分类";
        result[key] = (result[key] ?? 0) + 1;
        return result;
      }, {}),
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  const completenessTotal = summaryRows.reduce(
    (total, row) => total + Number(row.parameter_completeness || 0),
    0,
  );
  const equipmentTypesByCategory = summaryRows.reduce<Record<string, string[]>>(
    (result, row) => {
      const categoryName = row.equipment_category?.trim();
      const typeName = row.equipment_type?.trim();
      if (!categoryName || !typeName) return result;
      result[categoryName] ??= [];
      result[categoryName].push(typeName);
      return result;
    },
    {},
  );
  Object.keys(equipmentTypesByCategory).forEach((categoryName) => {
    equipmentTypesByCategory[categoryName] = unique(
      equipmentTypesByCategory[categoryName],
    );
  });
  const manufacturerMap = new Map<
    string,
    { name: string; brand: string; catalogCount: number }
  >();
  for (const row of summaryRows) {
    const brand = row.brand?.trim() || row.manufacturer?.trim() || "";
    const name = row.manufacturer?.trim() || brand;
    if (!brand) continue;
    const key = brand.toLocaleLowerCase("zh-CN");
    const current = manufacturerMap.get(key);
    manufacturerMap.set(key, {
      name: current?.name || name,
      brand: current?.brand || brand,
      catalogCount: (current?.catalogCount ?? 0) + 1,
    });
  }

  return NextResponse.json({
    data: rows.map((row) => ({
      ...row,
      parameter_count: parameterCounts[row.id] ?? 0,
      supplier_count: supplierCounts[row.id] ?? 0,
      price_count: priceCounts[row.id] ?? 0,
      thumbnail_url: thumbnailByCatalog.get(row.id)?.url ?? null,
      thumbnail_name: thumbnailByCatalog.get(row.id)?.name ?? null,
    })),
    source: "supabase",
    pagination: {
      page,
      pageSize,
      total: listResult.count ?? 0,
      pageCount: Math.max(1, Math.ceil((listResult.count ?? 0) / pageSize)),
    },
    summary: {
      total: summaryRows.length,
      approved: summaryRows.filter((row) => row.review_status === "approved")
        .length,
      pending: summaryRows.filter((row) =>
        ["draft", "pending_review"].includes(row.review_status),
      ).length,
      suppliers: supplierRelationSummary.count ?? 0,
      brands: unique(summaryRows.map((row) => row.brand)).length,
      averageCompleteness: summaryRows.length
        ? Math.round(completenessTotal / summaryRows.length)
        : 0,
      highCompleteness: summaryRows.filter(
        (row) => Number(row.parameter_completeness) >= 85,
      ).length,
      highRisk: summaryRows.filter((row) =>
        ["high", "critical"].includes(row.risk_level),
      ).length,
    },
    facets: {
      categories: unique(summaryRows.map((row) => row.equipment_category)),
      equipmentTypes: unique(summaryRows.map((row) => row.equipment_type)),
      equipmentTypesByCategory,
      brands: unique(summaryRows.map((row) => row.brand)),
      manufacturers: Array.from(manufacturerMap.values()).sort((a, b) =>
        b.catalogCount - a.catalogCount || a.name.localeCompare(b.name, "zh-CN"),
      ),
      suppliers: (supplierFacetResult.data ?? [])
        .map((row) => ({ id: row.id, name: row.name }))
        .filter((row) => row.name),
      sourceTypes: unique(summaryRows.map((row) => row.source_type)),
    },
    analytics: {
      categories: counts(summaryRows.map((row) => row.equipment_category)),
      brands: counts(summaryRows.map((row) => row.brand)).slice(0, 10),
    },
  });
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  if (!writableRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有设备资料写入权限" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const equipmentName = cleanText(body.equipmentName, 240);
  if (!equipmentName)
    return NextResponse.json({ error: "设备名称不能为空" }, { status: 400 });

  const payload = {
    organization_id: access.organizationId,
    catalog_code: cleanText(body.catalogCode, 80) || catalogCode(),
    equipment_name: equipmentName,
    normalized_name: equipmentName.toLowerCase().replace(/\s+/g, " "),
    equipment_category: cleanText(body.equipmentCategory, 120),
    equipment_type: cleanText(body.equipmentType, 120),
    brand: cleanText(body.brand, 120),
    manufacturer: cleanText(body.manufacturer, 180),
    product_series: cleanText(body.productSeries, 120),
    model: cleanText(body.model, 160),
    specification: cleanText(body.specification, 500),
    source_type: "manual",
    parameter_completeness: Math.min(
      100,
      Math.max(0, numeric(body.parameterCompleteness, 40)),
    ),
    ai_extracted: false,
    ai_confidence: 0,
    review_status: "draft",
    risk_level: "medium",
    metadata: { createdFrom: "equipment-catalog" },
    created_by: access.userId,
    updated_by: access.userId,
  };
  const result = await access.supabase
    .from("wpi_equipment_catalog")
    .insert(payload)
    .select("*")
    .single();
  if (result.error)
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ data: result.data }, { status: 201 });
}
