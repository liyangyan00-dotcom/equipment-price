import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  AnalyticsPayload,
  AnalyticsPriceTrendPoint,
} from "@/types/analytics";
import {
  aiWorkflowLabels,
  type AiExecutionWorkflowKey,
} from "@/types/aiExecution";

type CountResult = { count: number | null; error: { message: string } | null };
type Metadata = Record<string, unknown>;
type DatedRow = { created_at: string; updated_at?: string | null };
type RiskConfidenceRow = DatedRow & {
  risk_level: string | null;
  confidence: number | null;
};
type FormalPriceRow = RiskConfidenceRow & { metadata: Metadata | null };
type EquipmentPriceRow = FormalPriceRow & {
  equipment_name: string | null;
  model: string | null;
  category: string | null;
  original_price: number | null;
  original_currency: string | null;
  usd_price: number | null;
};
type MaterialPriceRow = FormalPriceRow & {
  material_name: string | null;
  specification: string | null;
  category: string | null;
  unit: string | null;
  region: string | null;
  price: number | null;
  currency: string | null;
};
type LeadRow = RiskConfidenceRow & {
  quote_date: string | null;
  status: string | null;
  target_type: string | null;
};
type AttachmentRow = DatedRow & {
  document_date: string | null;
  verification_status: string | null;
  ai_risk_level: string | null;
  ai_confidence: number | null;
};
type InquiryRow = DatedRow & {
  id: string;
  wpi_inquiry_items: Array<{ item_type: string | null }> | null;
};
type AiTaskRow = {
  workflow_key: string;
  status: string;
  confidence: number | null;
  created_at: string;
  business_object_type: string | null;
  business_object_id: string | null;
  input_payload: Metadata | null;
};

const dayMs = 86_400_000;
const queryLimit = 5000;
const analyticsMetadataKeys = ["quoteDate", "usdPrice", "normalizedUsdPrice", "equipmentName", "materialName", "specification", "category", "unit", "region"] as const;
const analyticsMetadataProjection = analyticsMetadataKeys.map((key) => `meta_${key}:metadata->${key}`).join(",");
function restoreAnalyticsMetadata(rows: unknown[]) {
  return rows.map((value) => {
    const row = value as Record<string, unknown>;
    return { ...row, metadata: Object.fromEntries(analyticsMetadataKeys.map((key) => [key, row[`meta_${key}`]])) };
  });
}
const analyticsWorkflowKeys: AiExecutionWorkflowKey[] = [
  "equipment_price_pre_review",
  "quote_recognition",
  "price_collection",
  "comparison_analysis",
  "boq_parsing",
  "inquiry_letter",
  "report_generation",
];

function deadlineFrom(date: Date, days: number) {
  return new Date(date.getTime() + days * dayMs).toISOString().slice(0, 10);
}

function countOf(result: CountResult) {
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function changeLabel(current: number, previous: number) {
  if (previous === 0) return current > 0 ? `新增 ${current}` : "暂无新增";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function asDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function metadataDate(row: FormalPriceRow) {
  return asDate(row.metadata?.quoteDate);
}

function leadDate(row: LeadRow) {
  return asDate(row.quote_date) ?? asDate(row.created_at);
}

function attachmentDate(row: AttachmentRow) {
  return asDate(row.document_date) ?? asDate(row.created_at);
}

function rowDate(row: DatedRow) {
  return asDate(row.updated_at) ?? asDate(row.created_at);
}

function inPeriod(date: Date | null, start: Date, end: Date) {
  return Boolean(date && date >= start && date < end);
}

function inquiryObjectTypes(value: unknown) {
  const directItems = Array.isArray(value) && value.some((item) =>
    item && typeof item === "object" && "item_type" in item,
  ) ? value : null;
  const relation = directItems ? null : Array.isArray(value) ? value[0] : value;
  const items = directItems ?? (
    relation && typeof relation === "object"
      ? (relation as { wpi_inquiry_items?: unknown }).wpi_inquiry_items
      : null
  );
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map((item) =>
    item && typeof item === "object" ? String((item as { item_type?: unknown }).item_type ?? "") : "",
  ).filter((item) => item === "equipment" || item === "material"))];
}

function matchesObjectType(types: string[], objectType: AnalyticsPayload["objectType"]) {
  return objectType === "all" || types.includes(objectType);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 100) / 100;
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function equipmentUsdPrice(row: EquipmentPriceRow) {
  return (
    positiveNumber(row.usd_price) ??
    positiveNumber(row.metadata?.usdPrice) ??
    (String(row.original_currency).toUpperCase() === "USD"
      ? positiveNumber(row.original_price)
      : null)
  );
}

function materialUsdPrice(row: MaterialPriceRow) {
  return (
    positiveNumber(row.metadata?.normalizedUsdPrice) ??
    positiveNumber(row.metadata?.usdPrice) ??
    (String(row.currency).toUpperCase() === "USD"
      ? positiveNumber(row.price)
      : null)
  );
}

function normalizedKeyPart(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, " ");
}

function equipmentComparableKey(row: EquipmentPriceRow) {
  const name = normalizedKeyPart(row.equipment_name ?? row.metadata?.equipmentName);
  const model = normalizedKeyPart(row.model ?? row.metadata?.specification);
  const category = normalizedKeyPart(row.category ?? row.metadata?.category);
  if (!name || !model) return null;
  return [category, name, model].join("|");
}

function materialComparableKey(row: MaterialPriceRow) {
  const name = normalizedKeyPart(row.material_name ?? row.metadata?.materialName);
  const specification = normalizedKeyPart(row.specification ?? row.metadata?.specification);
  const unit = normalizedKeyPart(row.unit ?? row.metadata?.unit);
  const region = normalizedKeyPart(row.region ?? row.metadata?.region);
  if (!name || !specification || !unit || !region) return null;
  return [name, specification, unit, region].join("|");
}

function buildComparableIndex<T extends FormalPriceRow>(
  rows: T[],
  start: Date,
  rangeDays: number,
  keyOf: (row: T) => string | null,
  valueOf: (row: T) => number | null,
) {
  const baskets = new Map<string, Array<{ date: Date; value: number }>>();
  for (const row of rows) {
    const key = keyOf(row);
    const date = metadataDate(row);
    const value = valueOf(row);
    if (!key || !date || value === null) continue;
    const observations = baskets.get(key) ?? [];
    observations.push({ date, value });
    baskets.set(key, observations);
  }

  const comparable = [...baskets.values()].filter(
    (observations) => new Set(observations.map(({ date }) => date.toISOString().slice(0, 10))).size >= 2,
  );
  const points = Array.from({ length: 6 }, (_, index) => {
    const bucketStart = new Date(
      start.getTime() + Math.floor((rangeDays * index) / 6) * dayMs,
    );
    const bucketEnd = new Date(
      start.getTime() + Math.floor((rangeDays * (index + 1)) / 6) * dayMs,
    );
    const indexValues: number[] = [];
    let samples = 0;
    for (const observations of comparable) {
      const ordered = [...observations].sort((a, b) => a.date.getTime() - b.date.getTime());
      const baselineDate = ordered[0].date.toISOString().slice(0, 10);
      const baseline = median(ordered.filter(({ date }) => date.toISOString().slice(0, 10) === baselineDate).map(({ value }) => value));
      const bucketValues = ordered.filter(({ date }) => inPeriod(date, bucketStart, bucketEnd)).map(({ value }) => value);
      const bucketMedian = median(bucketValues);
      if (baseline && bucketMedian !== null) {
        indexValues.push((bucketMedian / baseline) * 100);
        samples += bucketValues.length;
      }
    }
    return {
      label: bucketStart.toISOString().slice(5, 10),
      value: median(indexValues),
      samples,
    };
  });
  return { points, basketCount: comparable.length };
}

function buildPriceTrend(
  equipment: EquipmentPriceRow[],
  material: MaterialPriceRow[],
  start: Date,
  rangeDays: number,
): { series: AnalyticsPriceTrendPoint[]; basketCount: number } {
  const equipmentIndex = buildComparableIndex(equipment, start, rangeDays, equipmentComparableKey, equipmentUsdPrice);
  const materialIndex = buildComparableIndex(material, start, rangeDays, materialComparableKey, materialUsdPrice);
  return {
    series: equipmentIndex.points.map((point, index) => ({
      label: point.label,
      equipment: point.value,
      material: materialIndex.points[index].value,
      equipmentSamples: point.samples,
      materialSamples: materialIndex.points[index].samples,
    })),
    basketCount: equipmentIndex.basketCount + materialIndex.basketCount,
  };
}

function priceChangeLabel(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null);
  if (valid.length < 2 || valid[0] === 0) return "样本不足";
  const change = ((valid[valid.length - 1] - valid[0]) / valid[0]) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );

  const requestedRange = Number(request.nextUrl.searchParams.get("range"));
  const rangeDays = (
    [7, 30, 90].includes(requestedRange) ? requestedRange : 30
  ) as 7 | 30 | 90;
  const requestedObjectType = request.nextUrl.searchParams.get("objectType");
  const objectType = (
    requestedObjectType === "equipment" || requestedObjectType === "material"
      ? requestedObjectType
      : "all"
  ) as "all" | "equipment" | "material";
  const now = new Date();
  const periodStart = new Date(now.getTime() - (rangeDays - 1) * dayMs);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart.getTime() + rangeDays * dayMs);
  const previousStart = new Date(periodStart.getTime() - rangeDays * dayMs);
  const { supabase, organizationId } = access;

  try {
    const [equipmentTotalResult, materialTotalResult] =
      await Promise.all([
        supabase
          .from("wpi_equipment_prices")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("review_status", "approved")
          .is("deleted_at", null),
        supabase
          .from("wpi_material_prices")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("review_status", "approved"),
      ]);
    const equipmentTotal = countOf(equipmentTotalResult as CountResult);
    const materialTotal = countOf(materialTotalResult as CountResult);

    const [
      equipmentRows,
      materialRows,
      leadRows,
      attachmentRows,
      inquiryRows,
      aiRows,
      responseRows,
    ] = await Promise.all([
      supabase
        .from("wpi_equipment_prices")
        .select(
          `created_at,updated_at,risk_level,confidence,equipment_name,model,category,original_price,original_currency,usd_price,${analyticsMetadataProjection}`,
        )
        .eq("organization_id", organizationId)
        .eq("review_status", "approved")
        .is("deleted_at", null)
        .limit(queryLimit),
      supabase
        .from("wpi_material_prices")
        .select(
          `created_at,updated_at,risk_level,confidence,material_name,specification,category,unit,region,price,currency,${analyticsMetadataProjection}`,
        )
        .eq("organization_id", organizationId)
        .eq("review_status", "approved")
        .limit(queryLimit),
      supabase
        .from("wpi_price_collection_leads")
        .select("created_at,updated_at,quote_date,risk_level,confidence,status,target_type")
        .eq("organization_id", organizationId)
        .limit(queryLimit),
      supabase
        .from("wpi_attachments")
        .select(
          "created_at,document_date,verification_status,ai_risk_level,ai_confidence",
        )
        .eq("organization_id", organizationId)
        .neq("status", "archived")
        .limit(queryLimit),
      supabase
        .from("wpi_inquiries")
        .select("id,created_at,wpi_inquiry_items(item_type)")
        .eq("organization_id", organizationId)
        .gte("created_at", previousStart.toISOString())
        .limit(queryLimit),
      supabase
        .from("wpi_ai_execution_tasks")
        .select("workflow_key,status,confidence,created_at,business_object_type,business_object_id,input_target_type:input_payload->targetType")
        .eq("organization_id", organizationId)
        .gte("created_at", periodStart.toISOString())
        .lt("created_at", periodEnd.toISOString())
        .limit(queryLimit),
      supabase
        .from("wpi_inquiry_suppliers")
        .select(
          "supplier_id,response_status,delivery_status,sent_at,replied_at,quoted_amount,wpi_suppliers(name),wpi_inquiries(wpi_inquiry_items(item_type))",
        )
        .eq("organization_id", organizationId)
        .gte("sent_at", periodStart.toISOString())
        .lt("sent_at", periodEnd.toISOString())
        .limit(queryLimit),
    ]);
    const queryResults = [
      equipmentRows,
      materialRows,
      leadRows,
      attachmentRows,
      inquiryRows,
      aiRows,
      responseRows,
    ];
    const queryError = queryResults.find((result) => result.error)?.error;
    if (queryError) throw new Error(queryError.message);

    const allEquipment = restoreAnalyticsMetadata(equipmentRows.data ?? []) as unknown as EquipmentPriceRow[];
    const allMaterial = restoreAnalyticsMetadata(materialRows.data ?? []) as unknown as MaterialPriceRow[];
    const allLeads = (leadRows.data ?? []) as LeadRow[];
    const allAttachments = (attachmentRows.data ?? []) as AttachmentRow[];
    const allInquiries = (inquiryRows.data ?? []) as InquiryRow[];
    const periodEquipment = allEquipment.filter((row) =>
      inPeriod(metadataDate(row), periodStart, periodEnd),
    );
    const periodMaterial = allMaterial.filter((row) =>
      inPeriod(metadataDate(row), periodStart, periodEnd),
    );
    const equipmentData = objectType === "material" ? [] : periodEquipment;
    const materialData = objectType === "equipment" ? [] : periodMaterial;
    const leadData = allLeads.filter((row) =>
      inPeriod(leadDate(row), periodStart, periodEnd) &&
      (objectType === "all" || row.target_type === objectType),
    );
    const attachmentData = allAttachments.filter((row) =>
      inPeriod(attachmentDate(row), periodStart, periodEnd),
    );
    const inquiryData = allInquiries.filter((row) =>
      inPeriod(rowDate(row), periodStart, periodEnd) &&
      matchesObjectType(inquiryObjectTypes(row.wpi_inquiry_items), objectType),
    );
    const previousEquipment = allEquipment.filter((row) =>
      inPeriod(metadataDate(row), previousStart, periodStart),
    ).length;
    const previousMaterial = allMaterial.filter((row) =>
      inPeriod(metadataDate(row), previousStart, periodStart),
    ).length;
    const previousPriceCount = objectType === "equipment"
      ? previousEquipment
      : objectType === "material"
        ? previousMaterial
        : previousEquipment + previousMaterial;
    const previousInquiry = allInquiries.filter((row) =>
      inPeriod(rowDate(row), previousStart, periodStart) &&
      matchesObjectType(inquiryObjectTypes(row.wpi_inquiry_items), objectType),
    ).length;

    const riskRows = [...equipmentData, ...materialData];
    const confidenceRows = riskRows
      .map((row) => Number(row.confidence))
      .filter(Number.isFinite);
    const highRiskCount = riskRows.filter((row) =>
      ["high", "critical"].includes(String(row.risk_level)),
    ).length;
    const equipmentGaps = equipmentData.filter(
      (row) => Number(row.confidence) < 70,
    ).length;
    const materialGaps = materialData.filter(
      (row) => Number(row.confidence) < 70,
    ).length;
    const leadGaps = leadData.filter((row) =>
      ["pending_review", "needs_info"].includes(String(row.status)),
    ).length;
    const evidenceGaps = objectType === "all" ? attachmentData.filter(
      (row) => row.verification_status !== "verified",
    ).length : 0;
    const priceGapCount =
      equipmentGaps + materialGaps + leadGaps + evidenceGaps;

    const riskDistribution = [
      {
        name: "低风险",
        value: riskRows.filter((row) => row.risk_level === "low").length,
        color: "#22A06B",
      },
      {
        name: "中风险",
        value: riskRows.filter((row) => row.risk_level === "medium").length,
        color: "#F59E0B",
      },
      { name: "高风险", value: highRiskCount, color: "#EF4444" },
    ];
    const formalRiskSummary = {
      equipment: {
        total: equipmentData.length,
        high: equipmentData.filter((row) => ["high", "critical"].includes(String(row.risk_level))).length,
      },
      material: {
        total: materialData.length,
        high: materialData.filter((row) => ["high", "critical"].includes(String(row.risk_level))).length,
      },
    };
    const leadRiskSummary = {
      total: leadData.length,
      low: leadData.filter((row) => row.risk_level === "low").length,
      medium: leadData.filter((row) => row.risk_level === "medium").length,
      high: leadData.filter((row) => ["high", "critical"].includes(String(row.risk_level))).length,
    };
    const confidenceDistribution = [
      {
        name: "A 高可信",
        value: confidenceRows.filter((value) => value >= 90).length,
        color: "#2F6BFF",
      },
      {
        name: "B 较高",
        value: confidenceRows.filter((value) => value >= 75 && value < 90)
          .length,
        color: "#22A06B",
      },
      {
        name: "C 待复核",
        value: confidenceRows.filter((value) => value < 75).length,
        color: "#F59E0B",
      },
    ];

    const supplierMap = new Map<
      string,
      { name: string; total: number; replied: number; quotes: number }
    >();
    const scopedResponseRows = (responseRows.data ?? []).filter((row) =>
      matchesObjectType(inquiryObjectTypes(row.wpi_inquiries), objectType),
    );
    for (const row of scopedResponseRows) {
      const relation = Array.isArray(row.wpi_suppliers)
        ? row.wpi_suppliers[0]
        : row.wpi_suppliers;
      const supplierId = String(row.supplier_id);
      const current = supplierMap.get(supplierId) ?? {
        name: String(relation?.name ?? "未命名供应商"),
        total: 0,
        replied: 0,
        quotes: 0,
      };
      current.total += 1;
      if (
        row.replied_at ||
        ["responded", "quoted", "completed"].includes(
          String(row.response_status),
        )
      )
        current.replied += 1;
      if (Number(row.quoted_amount ?? 0) > 0) current.quotes += 1;
      supplierMap.set(supplierId, current);
    }
    const allSupplierPerformance = [...supplierMap.values()]
      .map((item) => ({
        name: item.name,
        response: Math.round(percent(item.replied, item.total)),
        quotes: item.quotes,
        sent: item.total,
      }))
      .sort((a, b) => b.response - a.response || b.quotes - a.quotes);
    const supplierPerformance = allSupplierPerformance.slice(0, 4);
    const supplierSent = allSupplierPerformance.reduce((sum, item) => sum + item.sent, 0);
    const supplierReplied = [...supplierMap.values()].reduce((sum, item) => sum + item.replied, 0);
    const supplierValidQuotes = allSupplierPerformance.reduce((sum, item) => sum + item.quotes, 0);
    const supplierResponseSummary = {
      sent: supplierSent,
      replied: supplierReplied,
      validQuotes: supplierValidQuotes,
      responseRate: Math.round(percent(supplierReplied, supplierSent)),
      validQuoteRate: Math.round(percent(supplierValidQuotes, supplierSent)),
      supplierCount: allSupplierPerformance.length,
      noResponseSupplierCount: allSupplierPerformance.filter((item) => item.response === 0).length,
    };

    const inquiryTypesById = new Map(
      allInquiries.map((row) => [row.id, inquiryObjectTypes(row)]),
    );
    const aiData = ((aiRows.data ?? []).map((row) => ({ ...row, input_payload: { targetType: row.input_target_type } })) as AiTaskRow[]).filter((row) => {
      if (objectType === "all") return true;
      const inputTargetType = String(row.input_payload?.targetType ?? "");
      if (inputTargetType === "equipment" || inputTargetType === "material") {
        return inputTargetType === objectType;
      }
      const businessType = String(row.business_object_type ?? "").toLowerCase();
      if (businessType.includes("equipment")) return objectType === "equipment";
      if (businessType.includes("material")) return objectType === "material";
      if (businessType === "inquiry" && row.business_object_id) {
        return matchesObjectType(inquiryTypesById.get(row.business_object_id) ?? [], objectType);
      }
      return false;
    });
    const aiEfficiency = analyticsWorkflowKeys.map(
      (workflow) => {
        const matching = aiData.filter((row) => row.workflow_key === workflow);
        const completed = matching.filter((row) => row.status === "completed").length;
        return {
          key: workflow,
          label: aiWorkflowLabels[workflow],
          value: Math.round(percent(completed, matching.length)),
          total: matching.length,
          completed,
          failed: matching.filter((row) => row.status === "failed").length,
          needsReview: matching.filter((row) => row.status === "needs_review").length,
        };
      },
    );

    const gapValues = [
      ...(objectType !== "material" ? [{ label: "设备价格缺口", value: equipmentGaps }] : []),
      ...(objectType !== "equipment" ? [{ label: "地材价格缺口", value: materialGaps }] : []),
      { label: "待补充线索", value: leadGaps },
      ...(objectType === "all" ? [{ label: "待核验证据", value: evidenceGaps }] : []),
    ];
    const priceGapAnalysis = gapValues.map((item) => ({
      ...item,
      percent: `${percent(item.value, priceGapCount)}%`,
    }));
    const analysisConfidence = confidenceRows.length
      ? Math.round(
          confidenceRows.reduce((sum, value) => sum + value, 0) /
            confidenceRows.length,
        )
      : 0;
    const comparableTrend = buildPriceTrend(
      equipmentData,
      materialData,
      periodStart,
      rangeDays,
    );
    const priceTrendSeries = comparableTrend.series;
    const priceSampleCount = priceTrendSeries.reduce(
      (sum, point) => sum + point.equipmentSamples + point.materialSamples,
      0,
    );
    const selectedInventory = [
      ...(objectType === "material" ? [] : allEquipment),
      ...(objectType === "equipment" ? [] : allMaterial),
    ];
    const missingPriceDateCount = selectedInventory.filter(
      (row) => !asDate(row.metadata?.quoteDate),
    ).length;
    const failedAiCount = aiData.filter(
      (row) => row.status === "failed",
    ).length;
    const truncated = queryResults.some(
      (result) => (result.data?.length ?? 0) >= queryLimit,
    );
    const latestPriceDate = [...equipmentData, ...materialData]
      .map((row) => metadataDate(row)?.getTime() ?? 0)
      .reduce((latest, value) => Math.max(latest, value), 0);
    const selectedPriceCount = selectedInventory.length;
    const missingDateRatio = percent(missingPriceDateCount, selectedPriceCount);
    const scopeLabel = objectType === "equipment" ? "设备" : objectType === "material" ? "地材" : "全库";
    const periodPriceCount = equipmentData.length + materialData.length;
    const readinessReasons = [
      ...(periodPriceCount === 0 ? [`近 ${rangeDays} 天没有${scopeLabel}正式价格`] : []),
      ...(comparableTrend.basketCount === 0 ? ["没有至少两个价格日期的同口径价格篮子"] : []),
      ...(missingDateRatio > 20 ? [`${missingPriceDateCount}/${selectedPriceCount} 条正式价格缺少价格日期`] : []),
      ...(truncated ? [`统计查询达到 ${queryLimit} 条上限`] : []),
    ];
    const readinessBlocked = periodPriceCount === 0 || comparableTrend.basketCount === 0 || truncated;
    const decisionReadiness: AnalyticsPayload["decisionReadiness"] = {
      status: readinessBlocked ? "blocked" : readinessReasons.length ? "warning" : "ready",
      label: readinessBlocked ? "不可用于经营决策" : readinessReasons.length ? "需补充数据后使用" : "可用于经营决策",
      reasons: readinessReasons.length ? readinessReasons : ["价格日期、可比样本和查询完整性均通过校验"],
    };
    const liveChecks: AnalyticsPayload["operations"]["checks"] = [
      {
        key: "query-completeness",
        label: "查询完整性",
        status: truncated ? "failed" : "passed",
        detail: truncated ? `查询达到 ${queryLimit} 条上限，结论可能不完整` : "所有统计查询均未达到截断上限",
      },
      {
        key: "price-date-coverage",
        label: "价格日期覆盖",
        status: missingDateRatio > 20 ? "warning" : "passed",
        detail: selectedPriceCount ? `${scopeLabel} ${missingPriceDateCount}/${selectedPriceCount} 条缺少价格日期，已排除出趋势（${missingDateRatio}%）` : "当前对象没有正式价格",
      },
      {
        key: "trend-samples",
        label: "可比趋势样本",
        status: priceSampleCount > 0 ? "passed" : "warning",
        detail: priceSampleCount > 0 ? `${comparableTrend.basketCount} 组同规格价格篮子、${priceSampleCount} 条观测可用于趋势` : "至少需要同名称、规格、单位和地区的两个价格日期",
      },
      {
        key: "latest-price-date",
        label: "最新价格日期",
        status: latestPriceDate > 0 ? "passed" : "warning",
        detail: latestPriceDate > 0 ? new Date(latestPriceDate).toISOString().slice(0, 10) : "当前区间没有有效价格日期",
      },
    ];
    const [componentStateResult, incidentResult, actionItemsResult] = await Promise.all([
      supabase
        .from("wpi_automation_component_states")
        .select("health_status,message,consecutive_failures,consecutive_successes,last_checked_at")
        .eq("organization_id", organizationId)
        .eq("component_key", "runtime:analytics-aggregation")
        .maybeSingle(),
      supabase
        .from("wpi_automation_incidents")
        .select("title,message,occurrence_count,first_detected_at")
        .eq("organization_id", organizationId)
        .eq("incident_key", "component:runtime:analytics-aggregation")
        .eq("status", "open")
        .maybeSingle(),
      supabase
        .from("wpi_analytics_action_items")
        .select("id,action_code,action_key,status,assigned_to,due_date")
        .eq("organization_id", organizationId)
        .eq("object_type", objectType),
    ]);
    const componentState = componentStateResult.error ? null : componentStateResult.data;
    const activeIncident = incidentResult.error ? null : incidentResult.data;
    if (actionItemsResult.error) throw new Error(actionItemsResult.error.message);
    const actionItemByKey = new Map(
      (actionItemsResult.data ?? []).map((item) => [item.action_key, item]),
    );
    const actionItemFor = (key: string) => {
      const item = actionItemByKey.get(key);
      if (!item) return null;
      return {
        id: item.id,
        code: item.action_code,
        status: item.status as "open" | "in_progress" | "resolved",
        assignedToMe: item.assigned_to === access.userId,
        dueDate: item.due_date,
        overdue: item.status !== "resolved" && new Date(`${item.due_date}T23:59:59Z`).getTime() < now.getTime(),
      };
    };
    const lastCheckedAt = componentState?.last_checked_at ?? null;
    const monitoringEnabled = Boolean(lastCheckedAt && now.getTime() - new Date(lastCheckedAt).getTime() <= 30 * 60 * 1000);
    const liveStatus = liveChecks.some((check) => check.status === "failed")
      ? "critical"
      : liveChecks.some((check) => check.status === "warning")
        ? "warning"
        : "healthy";
    const equipmentUpdates = equipmentData.length;
    const materialUpdates = materialData.length;
    const inquiryCount = inquiryData.length;
    const scopedGapCount = objectType === "equipment"
      ? equipmentGaps
      : objectType === "material"
        ? materialGaps
        : equipmentGaps + materialGaps;
    const scopedPriceRoute = objectType === "equipment" ? "/equipment-prices" : "/material-prices";
    const insights: AnalyticsPayload["insights"] = [
      {
        id: "risk-review",
        priority: highRiskCount > 0 ? "P0" : "P2",
        status: highRiskCount > 0 ? "待处理" : "正常",
        text: `近${rangeDays}天共有 ${equipmentUpdates + materialUpdates} 条价格所属期记录，其中高风险记录 ${highRiskCount} 条。`,
        action: "复核风险",
        route: objectType === "all" ? "/analytics?risk=high" : `${scopedPriceRoute}?risk=high`,
        ownerRole: "价格审核负责人",
        deadline: deadlineFrom(now, highRiskCount > 0 ? 2 : 7),
        impact: highRiskCount > 0 ? `${highRiskCount} 条记录暂不建议进入商务决策` : "当前无高风险价格阻断",
        actionItem: actionItemFor("risk-review"),
      },
      {
        id: "data-completeness",
        priority: decisionReadiness.status === "blocked" ? "P0" : missingPriceDateCount > 0 || scopedGapCount > 0 ? "P1" : "P2",
        status: decisionReadiness.status === "blocked" ? "待处理" : missingPriceDateCount > 0 || scopedGapCount > 0 ? "需关注" : "正常",
        text: decisionReadiness.status === "ready" ? `${scopeLabel}价格日期与可比样本已通过决策校验。` : `${decisionReadiness.label}：${decisionReadiness.reasons.join("；")}。`,
        action: objectType === "equipment" ? "核查设备" : "核查地材",
        route: objectType === "all" ? "/price-leads" : scopedPriceRoute,
        ownerRole: "价格数据管理员",
        deadline: deadlineFrom(now, 3),
        impact: decisionReadiness.status === "blocked" ? "当前统计不得直接用于价格趋势和商务预算判断" : `影响 ${scopedGapCount + missingPriceDateCount} 条价格的趋势或可信度判断`,
        actionItem: actionItemFor("data-completeness"),
      },
      {
        id: "supplier-response",
        priority: supplierResponseSummary.noResponseSupplierCount > 0 ? "P1" : "P2",
        status: supplierSent === 0 ? "需关注" : supplierResponseSummary.noResponseSupplierCount > 0 ? "待处理" : "正常",
        text: supplierSent === 0
          ? `近${rangeDays}天${scopeLabel}没有已发送询价，暂时无法评价供应商响应。`
          : `近${rangeDays}天共发送 ${supplierSent} 次询价，全量加权响应率 ${supplierResponseSummary.responseRate}%，有效报价率 ${supplierResponseSummary.validQuoteRate}%。`,
        action: "跟进供应商",
        route: "/inquiries",
        ownerRole: "采购经理",
        deadline: deadlineFrom(now, 3),
        impact: supplierSent === 0 ? "当前区间没有询价样本，无法评价供应商响应" : `${supplierResponseSummary.noResponseSupplierCount} 家供应商尚无回复`,
        actionItem: actionItemFor("supplier-response"),
      },
      {
        id: "ai-failures",
        priority: failedAiCount > 0 ? "P1" : "P2",
        status: failedAiCount > 0 ? "待处理" : "正常",
        text: `近${rangeDays}天 7 个自动化流程共执行 ${aiData.length} 项，失败 ${failedAiCount} 项。`,
        action: "查看AI运行",
        route: "/ai-workbench?panel=operations",
        ownerRole: "AI 运维管理员",
        deadline: deadlineFrom(now, failedAiCount > 0 ? 1 : 7),
        impact: failedAiCount > 0 ? `${failedAiCount} 项自动化结果需人工接管或重试` : "自动化流程当前无失败任务",
        actionItem: actionItemFor("ai-failures"),
      },
    ];

    const data: AnalyticsPayload = {
      objectType,
      kpis: [
        {
          label: "价格数据总量",
          value: (objectType === "equipment" ? equipmentTotal : objectType === "material" ? materialTotal : equipmentTotal + materialTotal).toLocaleString("zh-CN"),
          unit: "条",
          trend: "全部库存",
          description: objectType === "equipment" ? "设备正式价格" : objectType === "material" ? "地材正式价格" : "设备与地材正式价格",
        },
        {
          label: "区间价格记录",
          value: (equipmentUpdates + materialUpdates).toLocaleString("zh-CN"),
          unit: "条",
          trend: changeLabel(
            equipmentUpdates + materialUpdates,
            previousPriceCount,
          ),
          description: `按价格所属期统计近${rangeDays}天`,
        },
        {
          label: "区间合作供应商",
          value: supplierResponseSummary.supplierCount.toLocaleString("zh-CN"),
          unit: "家",
          trend: `近${rangeDays}天`,
          description: `${scopeLabel}已发送询价涉及供应商`,
        },
        {
          label: "AI任务数量",
          value: aiData.length.toLocaleString("zh-CN"),
          unit: "项",
          trend: `近${rangeDays}天`,
          description: "按任务创建时间统计",
        },
        {
          label: "区间高风险",
          value: highRiskCount.toLocaleString("zh-CN"),
          unit: "条",
          trend: `近${rangeDays}天`,
          description: "同一统计范围内的业务风险",
        },
        {
          label: "区间数据缺口",
          value: priceGapCount.toLocaleString("zh-CN"),
          unit: "项",
          trend: `近${rangeDays}天`,
          description: "低可信、待补充与待核验",
        },
      ],
      priceTrendSeries,
      trendSummary: {
        equipment: priceChangeLabel(
          priceTrendSeries.map((item) => item.equipment),
        ),
        material: priceChangeLabel(
          priceTrendSeries.map((item) => item.material),
        ),
        inquiry: changeLabel(inquiryCount, previousInquiry),
      },
      supplierPerformance,
      supplierResponseSummary,
      aiEfficiency,
      riskDistribution,
      formalRiskSummary,
      leadRiskSummary,
      confidenceDistribution,
      priceGapAnalysis,
      insights,
      analysisConfidence,
      rangeDays,
      generatedAt: now.toISOString(),
      source: "supabase",
      truncated,
      permissions: {
        canManageActions: ["admin", "manager"].includes(access.role),
      },
      decisionReadiness,
      dataBasis: {
        periodStart: periodStart.toISOString(),
        periodEnd: new Date(periodEnd.getTime() - 1).toISOString(),
        inventoryAsOf: now.toISOString(),
        priceDateRule: "仅使用价格所属日期；缺失记录不进入区间与趋势统计",
        activityDateRule: "任务与询价按业务创建或发送时间",
        normalizedCurrency: "USD",
        periodFormalPriceCount: periodPriceCount,
        priceSampleCount,
        comparableBasketCount: comparableTrend.basketCount,
        missingPriceDateCount,
      },
      operations: {
        status: liveStatus,
        monitoringEnabled,
        intervalMinutes: 15,
        scopeLabel,
        lastCheckedAt,
        consecutiveFailures: Number(componentState?.consecutive_failures ?? 0),
        consecutiveSuccesses: Number(componentState?.consecutive_successes ?? 0),
        message: componentState?.message ?? "后台巡检等待首次运行，当前显示即时数据校验结果。",
        activeIncident: activeIncident
          ? {
              scopeLabel: "全库",
              title: activeIncident.title,
              message: activeIncident.message,
              occurrenceCount: activeIncident.occurrence_count,
              firstDetectedAt: activeIncident.first_detected_at,
            }
          : null,
        checks: liveChecks,
      },
    };
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "统计分析数据读取失败",
      },
      { status: 500 },
    );
  }
}
