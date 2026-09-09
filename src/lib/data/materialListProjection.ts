// List and insight consumers use these keys; raw evidence stays in detail APIs.
export const materialListMetadataKeys = [
  "specification", "category", "usdPrice", "region", "source", "sourceNote",
  "supplierName", "validUntil", "quoteDate", "transportCondition", "trend",
  "trendValue", "aiSuggestion", "taxIncluded", "collectionLeadCode", "needsInformation",
] as const;

export const materialListProjection = [
  "id", "legacy_id", "price_code", "material_name", "specification", "category",
  "unit", "price", "currency", "region", "source_url", "source_type", "valid_until",
  "confidence", "risk_level", "review_status", "created_at", "updated_at",
  ...materialListMetadataKeys.map(key => `list_${key}:metadata->${key}`),
  "wpi_suppliers(id,legacy_id,name)",
].join(",");

export function restoreMaterialListMetadata(row: Record<string, unknown>) {
  const result = { ...row };
  const metadata: Record<string, unknown> = {};
  for (const key of materialListMetadataKeys) {
    metadata[key] = result[`list_${key}`];
    delete result[`list_${key}`];
  }
  return { ...result, metadata };
}
