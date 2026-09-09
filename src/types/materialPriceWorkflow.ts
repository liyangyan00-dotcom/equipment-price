import type { RiskLevel } from "@/types/common";

export type MaterialPriceAction = "draft" | "submit_review";

export type MaterialPricePayload = {
  action: MaterialPriceAction;
  materialName: string;
  category: string;
  specification: string;
  unit: string;
  price: number;
  usdPrice: number | null;
  currency: string;
  region: string;
  supplierId?: string;
  supplierName: string;
  sourceType: string;
  sourceNote: string;
  sourceUrl: string;
  quoteDate: string;
  validUntil: string;
  transportCondition: string;
  confidence: number | null;
  riskLevel: RiskLevel;
  aiSuggestion: string;
  notes: string;
};

export type MaterialPriceApiRecord = {
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
  supplier_id: string | null;
  source_type: string | null;
  source_url: string | null;
  valid_until: string | null;
  confidence: number | null;
  risk_level: RiskLevel;
  review_status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  metadata: Record<string, unknown> | null;
  updated_at: string;
  wpi_suppliers?: { id: string; legacy_id: string | null; name: string } | null;
};

export type MaterialReviewDecision = "approve" | "need_info" | "reject";

export type MaterialReviewUpdate = {
  decision: MaterialReviewDecision;
  comment: string;
  expectedUpdatedAt: string;
};
