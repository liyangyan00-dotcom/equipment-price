import type { SupplierRecord } from "@/data/mock/suppliers";

export type SupplierDatabaseContact = {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  is_primary: boolean;
};

export type SupplierDatabaseRow = {
  id: string;
  legacy_id: string | null;
  supplier_code: string;
  name: string;
  legal_name: string | null;
  country_code: string | null;
  region: string | null;
  category: string | null;
  business_scope: string | null;
  website: string | null;
  unified_social_credit_code: string | null;
  legal_representative: string | null;
  registered_capital: string | null;
  confidence: number | null;
  risk_level: "low" | "medium" | "high" | "critical";
  review_status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  metadata: Record<string, unknown> | null;
  wpi_supplier_contacts?: SupplierDatabaseContact[];
};

function confidenceLevel(value: number | null): SupplierRecord["confidence"] {
  if ((value ?? 0) >= 90) return "A";
  if ((value ?? 0) >= 80) return "B";
  if ((value ?? 0) >= 70) return "C";
  if ((value ?? 0) >= 60) return "D";
  return "E";
}

export function mapSupplierDatabaseRow(
  row: SupplierDatabaseRow,
  fallback?: SupplierRecord,
): SupplierRecord {
  const metadata = (row.metadata ?? {}) as Partial<SupplierRecord>;
  const primaryContact =
    row.wpi_supplier_contacts?.find((contact) => contact.is_primary) ??
    row.wpi_supplier_contacts?.[0];
  const score = Number(metadata.overallScore ?? row.confidence ?? 0);

  return {
    ...(fallback ?? ({} as SupplierRecord)),
    ...metadata,
    id: row.legacy_id ?? fallback?.id ?? row.id,
    supplierCode: row.supplier_code,
    supplierName: row.name,
    englishName: row.legal_name ?? metadata.englishName ?? "",
    countryCode: row.country_code ?? metadata.countryCode ?? "",
    countryRegion: row.region ?? metadata.countryRegion ?? "",
    category: row.category ?? metadata.category ?? "",
    mainScope: row.business_scope ?? metadata.mainScope ?? "",
    contact: primaryContact?.name ?? metadata.contact ?? "",
    phone: primaryContact?.phone ?? metadata.phone ?? "",
    whatsapp: primaryContact?.whatsapp ?? metadata.whatsapp ?? "",
    email: primaryContact?.email ?? metadata.email ?? "",
    website: row.website ?? metadata.website ?? "",
    overallScore: score,
    confidence: confidenceLevel(row.confidence),
    riskLevel: row.risk_level,
    deliveryRisk: row.risk_level,
    status:
      row.review_status === "approved"
        ? ("活跃" as SupplierRecord["status"])
        : ("待复核" as SupplierRecord["status"]),
    dueDiligence: fallback?.dueDiligence ?? metadata.dueDiligence,
    verification: fallback?.verification,
    webResearch: fallback?.webResearch,
    databaseId: row.id,
    databaseReviewStatus: row.review_status,
    unifiedSocialCreditCode: row.unified_social_credit_code,
    legalRepresentative: row.legal_representative,
    registeredCapital: row.registered_capital,
  };
}
