import type { EquipmentCatalogRecord } from "@/types/equipmentCatalog";

export type BoqCatalogMatchDecision = "suggested" | "accepted" | "rejected";

export type BoqCatalogCandidate = {
  id: string;
  project_item_id: string;
  equipment_catalog_id: string;
  candidate_rank: number;
  name_score: number;
  model_score: number;
  parameter_score: number;
  overall_score: number;
  confidence: number;
  match_reason: {
    summary?: string;
    signals?: string[];
  };
  parameter_differences: Array<{
    field: string;
    requirement: string;
    candidate: string;
    status: "matched" | "missing" | "different";
  }>;
  decision: BoqCatalogMatchDecision;
  review_notes: string;
  catalog: EquipmentCatalogRecord | null;
};

export type BoqCatalogMatchItem = {
  id: string;
  boq_code: string;
  line_no: number;
  item_name: string;
  specification: string;
  category: "equipment" | "material" | "service";
  quantity: number;
  unit: string;
  normalized_item_name: string;
  normalized_specification: string;
  requirement_parameters: Record<string, unknown>;
  equipment_catalog_id: string | null;
  catalog_match_status: "unmatched" | "exact" | "compatible" | "partial" | "conflict" | "needs_review";
  candidates: BoqCatalogCandidate[];
};

export type BoqCatalogMatchingPayload = {
  project: { id: string; project_code: string; name: string; status: string };
  items: BoqCatalogMatchItem[];
  summary: {
    equipmentItems: number;
    candidatesReady: number;
    confirmed: number;
    needsReview: number;
    unmatched: number;
  };
  permissions: { canWrite: boolean };
};
