import type { RiskLevel } from "@/types/common";

export type EquipmentAiReviewRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "needs_review"
  | "failed"
  | "cancelled";

export type EquipmentAiEvidenceState = "verified" | "problem" | "missing";

export type EquipmentAiReviewInput = {
  reviewId: string;
  equipmentPriceId: string | null;
  sourceKind: "price" | "import";
  equipment: {
    code: string;
    name: string;
    brand: string | null;
    model: string | null;
    category: string | null;
    supplierName: string | null;
    originalPrice: number;
    originalCurrency: string;
    usdPrice: number | null;
    priceTerm: string | null;
    sourceType: string | null;
    validUntil: string | null;
  };
  reviewContext: {
    confidence: number;
    completeness: number;
    riskLevel: RiskLevel;
    matchedRules: string[];
    missingFields: string[];
    evidenceStates: Record<string, EquipmentAiEvidenceState>;
    evidenceFileCount: number;
  };
};

export type EquipmentAiEvidenceFinding = {
  key: string;
  status: EquipmentAiEvidenceState;
  reason: string;
};

export type EquipmentAiReviewOutput = {
  schemaVersion: "1.0";
  judgment: string;
  recommendation: string;
  confidence: number;
  riskLevel: RiskLevel;
  requiresHumanReview: true;
  missingFields: string[];
  matchedRules: string[];
  evidenceFindings: EquipmentAiEvidenceFinding[];
  reasonCodes: string[];
  suggestedDecision: "review" | "request_info" | "reject_candidate";
  generatedAt: string;
};

export type EquipmentAiReviewRun = {
  id: string;
  review_id: string;
  equipment_price_id: string | null;
  status: EquipmentAiReviewRunStatus;
  provider: string;
  model: string;
  prompt_key: string;
  prompt_version: string;
  schema_version: string;
  output_payload: EquipmentAiReviewOutput | null;
  confidence: number | null;
  risk_level: RiskLevel | null;
  requires_human_review: boolean;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};
