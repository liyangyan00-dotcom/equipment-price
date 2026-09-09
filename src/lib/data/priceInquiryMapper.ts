import type { EquipmentPriceRecord } from "@/data/mock/equipmentPrices";
import type { InquiryTaskRecord } from "@/data/mock/inquiries";
import type { MaterialPriceRecord } from "@/data/mock/materialPrices";

type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";

export type EquipmentPriceDatabaseRow = {
  id: string;
  legacy_id: string | null;
  price_code: string;
  equipment_name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  original_price: number;
  original_currency: string;
  usd_price: number | null;
  price_term: string | null;
  source_type: string | null;
  confidence: number | null;
  risk_level: EquipmentPriceRecord["riskLevel"];
  review_status: ReviewStatus;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  wpi_suppliers?: { id: string; legacy_id: string | null; name: string } | null;
};

export type MaterialPriceDatabaseRow = {
  id: string;
  legacy_id: string | null;
  price_code: string;
  material_name: string;
  specification: string | null;
  category: string | null;
  unit: string;
  price: number;
  currency: string;
  region: string | null;
  source_url: string | null;
  source_type: string | null;
  valid_until: string | null;
  confidence: number | null;
  risk_level: MaterialPriceRecord["riskLevel"];
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  wpi_suppliers?: { id: string; legacy_id: string | null; name: string } | null;
};

export type InquiryDatabaseRow = {
  id: string;
  legacy_id: string | null;
  inquiry_code: string;
  subject: string;
  status: ReviewStatus;
  deadline: string | null;
  risk_level: InquiryTaskRecord["riskLevel"];
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  wpi_inquiry_items?: Array<Record<string, unknown>>;
  wpi_inquiry_suppliers?: Array<{
    supplier_id?: string;
    response_status: string;
    quoted_amount: number | null;
    currency: string | null;
    responded_at?: string | null;
    risk_level?: InquiryTaskRecord["riskLevel"];
    ai_recommendation?: string | null;
    metadata?: Record<string, unknown> | null;
    delivery_status?: string;
    sent_at?: string | null;
    delivered_at?: string | null;
    opened_at?: string | null;
    replied_at?: string | null;
    last_reminded_at?: string | null;
    send_attempts?: number;
    last_error?: string | null;
    wpi_suppliers?: { id?: string; legacy_id: string | null; name: string } | null;
  }>;
};

function confidenceLevel(value: number | null) {
  if ((value ?? 0) >= 90) return "A" as const;
  if ((value ?? 0) >= 80) return "B" as const;
  if ((value ?? 0) >= 70) return "C" as const;
  if ((value ?? 0) >= 60) return "D" as const;
  return "E" as const;
}

function reviewStatus(value: ReviewStatus) {
  if (value === "approved") return "confirmed" as const;
  if (value === "rejected") return "rejected" as const;
  if (value === "archived") return "voided" as const;
  return "pending" as const;
}

export function mapEquipmentPriceRow(
  row: EquipmentPriceDatabaseRow,
  fallback?: EquipmentPriceRecord,
): EquipmentPriceRecord {
  const metadata = (row.metadata ?? {}) as Partial<EquipmentPriceRecord>;
  return {
    ...(fallback ?? ({} as EquipmentPriceRecord)),
    ...metadata,
    // Route and workflow identity is always the database UUID. Legacy IDs stay
    // available only as import metadata and must not drive page navigation.
    id: row.id,
    equipmentCode: row.price_code,
    equipmentName: row.equipment_name,
    brand: row.brand ?? metadata.brand ?? "",
    specification: row.model ?? metadata.specification ?? "",
    category: row.category ?? metadata.category ?? "",
    originalPrice: Number(row.original_price),
    usdPrice: Number(row.usd_price ?? metadata.usdPrice ?? 0),
    currency: row.original_currency,
    priceCondition:
      (row.price_term as EquipmentPriceRecord["priceCondition"]) ??
      metadata.priceCondition ??
      "SITE",
    supplier: row.wpi_suppliers?.name ?? metadata.supplier ?? "",
    sourceType:
      (row.source_type as EquipmentPriceRecord["sourceType"]) ??
      metadata.sourceType ??
      "报价单",
    confidence: confidenceLevel(row.confidence),
    riskLevel: row.risk_level,
    reviewStatus: reviewStatus(row.review_status),
    updatedAt: row.updated_at.slice(0, 10),
    databaseId: row.id,
    databaseReviewStatus: row.review_status,
  };
}

export function mapMaterialPriceRow(
  row: MaterialPriceDatabaseRow,
  fallback?: MaterialPriceRecord,
): MaterialPriceRecord {
  const metadata = (row.metadata ?? {}) as Partial<MaterialPriceRecord>;
  const originalPrice = Number(row.price);
  const confidenceScore = typeof row.confidence === "number" && Number.isFinite(row.confidence) && row.confidence >= 0 && row.confidence <= 100 ? row.confidence : null;
  const rawUsd: unknown = metadata.usdPrice;
  const parsedUsd = (typeof rawUsd === "number" || (typeof rawUsd === "string" && rawUsd.trim())) ? Number(rawUsd) : NaN;
  const usdPrice = row.currency === "USD" && Number.isFinite(originalPrice) ? originalPrice : Number.isFinite(parsedUsd) && parsedUsd >= 0 ? parsedUsd : null;
  const source = row.source_type === "ai_price_collection"
    ? "AI采集线索入库"
    : row.source_type ?? metadata.source ?? "未提供";
  return {
    ...(fallback ?? ({} as MaterialPriceRecord)),
    ...metadata,
    id: row.legacy_id ?? fallback?.id ?? row.id,
    materialCode: row.price_code,
    materialName: row.material_name,
    specification: row.specification ?? metadata.specification ?? "",
    category: row.category ?? metadata.category ?? "",
    unit: row.unit,
    originalPrice,
    usdPrice,
    currency: row.currency,
    region: row.region ?? metadata.region ?? "",
    source,
    sourceNote: metadata.sourceNote ?? (source === "AI采集线索入库" ? "价格线索池人工审核入库" : ""),
    supplierName: row.wpi_suppliers?.name ?? metadata.supplierName ?? "",
    validUntil: row.valid_until ?? metadata.validUntil ?? "",
    quoteDate: typeof metadata.quoteDate === "string" ? metadata.quoteDate : "",
    transportCondition: metadata.transportCondition ?? "待补充",
    confidence: confidenceScore === null ? null : confidenceLevel(confidenceScore),
    confidenceScore,
    reviewStatus: row.review_status === "pending_review" && metadata.needsInformation === true ? "need_info" : reviewStatus(row.review_status),
    riskLevel: row.risk_level,
    trend: metadata.trend ?? "未评估",
    trendValue: metadata.trendValue ?? "缺少趋势结论",
    aiSuggestion: metadata.aiSuggestion ?? "暂无 AI 预审结论，请核对原始证据。",
    updatedAt: row.updated_at,
    databaseId: row.id,
    databaseReviewStatus: row.review_status,
  };
}

function inquiryTaskStatus(value: ReviewStatus): InquiryTaskRecord["status"] {
  if (value === "approved") return "completed";
  if (value === "rejected") return "rejected";
  if (value === "draft") return "created";
  return "needs_review";
}

export function mapInquiryRow(
  row: InquiryDatabaseRow,
  fallback?: InquiryTaskRecord,
): InquiryTaskRecord {
  const metadata = (row.metadata ?? {}) as Partial<InquiryTaskRecord>;
  const responses = row.wpi_inquiry_suppliers ?? [];
  const quotes = responses
    .map((response) => ({
      amount: Number(response.quoted_amount ?? 0),
      supplier: response.wpi_suppliers?.name ?? "",
    }))
    .filter((value) => value.amount > 0);
  const lowestResponse = quotes.length
    ? quotes.reduce((current, item) => item.amount < current.amount ? item : current)
    : null;
  const highestResponse = quotes.length
    ? quotes.reduce((current, item) => item.amount > current.amount ? item : current)
    : null;
  const lowest = lowestResponse?.amount ?? 0;
  const highest = highestResponse?.amount ?? 0;

  return {
    ...(fallback ?? ({} as InquiryTaskRecord)),
    ...metadata,
    id: row.legacy_id ?? fallback?.id ?? row.id,
    inquiryCode: row.inquiry_code,
    subject: row.subject,
    relatedItem:
      metadata.relatedItem ??
      String(row.wpi_inquiry_items?.[0]?.item_name ?? "待补全询价对象"),
    supplierCount: responses.length,
    respondedCount: responses.filter((response) =>
      ["responded", "quoted", "completed"].includes(response.response_status),
    ).length,
    lowestQuote: lowest,
    highestQuote: highest,
    lowestSupplier: lowestResponse?.supplier || "待供应商响应",
    highestSupplier: highestResponse?.supplier || "待供应商响应",
    currency: responses.find((response) => response.currency)?.currency ?? metadata.currency ?? "USD",
    differenceRate:
      lowest > 0 ? Math.round(((highest - lowest) / lowest) * 1000) / 10 : 0,
    status: inquiryTaskStatus(row.status),
    riskLevel: row.risk_level,
    deadline: row.deadline?.slice(0, 10) ?? metadata.deadline ?? "",
    comparisonId: String(metadata.comparisonId ?? `CMP-${row.inquiry_code}`),
    aiPlan: metadata.aiPlan ?? "需人工评估",
    age: row.updated_at
      ? new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(row.updated_at))
      : "-",
    databaseId: row.id,
    databaseStatus: row.status,
    aiConfidence: row.ai_confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
