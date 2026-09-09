export type EquipmentCatalogReviewStatus =
  "draft" | "pending_review" | "approved" | "rejected" | "archived";

export type EquipmentCatalogRiskLevel = "low" | "medium" | "high" | "critical";

export type EquipmentCatalogRecord = {
  id: string;
  catalog_code: string;
  equipment_name: string;
  normalized_name: string;
  equipment_category: string;
  equipment_type: string;
  brand: string;
  manufacturer: string;
  product_series: string;
  model: string;
  specification: string;
  application: string;
  technical_standard: string;
  country_code: string;
  language: string;
  datasheet_url: string | null;
  catalog_url: string | null;
  source_url: string | null;
  source_type: string;
  parameter_completeness: number;
  ai_extracted: boolean;
  ai_confidence: number;
  review_status: EquipmentCatalogReviewStatus;
  risk_level: EquipmentCatalogRiskLevel;
  metadata: Record<string, unknown>;
  collection_task_id?: string | null;
  assigned_reviewer_id?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  review_due_at?: string | null;
  duplicate_of_catalog_id?: string | null;
  duplicate_score?: number | null;
  collection_run_id?: string | null;
  source_discovery_id?: string | null;
  extracted_at?: string | null;
  updated_at: string;
  source_supplier?: { id: string; name: string } | null;
  parameter_count?: number;
  supplier_count?: number;
  price_count?: number;
  thumbnail_url?: string | null;
  thumbnail_name?: string | null;
};

export type EquipmentCatalogImage = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  verificationStatus: string;
  sourceUrl: string;
  createdAt: string;
  url: string;
};

export type EquipmentCatalogParameter = {
  id: string;
  parameter_code: string;
  parameter_name: string;
  raw_value: string;
  normalized_value: string;
  data_type: string;
  unit: string;
  minimum_value: number | null;
  maximum_value: number | null;
  is_key: boolean;
  source_page: number | null;
  source_evidence?: Record<string, unknown>;
  confidence: number;
  review_status: EquipmentCatalogReviewStatus;
};

export type EquipmentCatalogDocumentJob = {
  id: string;
  source_id: string | null;
  document_url: string;
  file_name: string;
  mime_type: string;
  status: "queued" | "running" | "needs_review" | "completed" | "failed" | "cancelled";
  progress: number;
  page_count: number | null;
  parameter_count: number;
  provider: string | null;
  model: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type EquipmentCatalogParameterCandidate = {
  id: string;
  job_id: string;
  parameter_code: string;
  parameter_name: string;
  parameter_group: string;
  current_value: string | null;
  current_unit: string | null;
  proposed_value: string;
  proposed_unit: string | null;
  difference_type: "new" | "changed" | "same" | "conflict";
  source_page: number;
  bounding_box: { x?: number; y?: number; width?: number; height?: number };
  source_text: string;
  source_url: string;
  confidence: number;
  risk_level: EquipmentCatalogRiskLevel;
  review_decision: "pending" | "accepted" | "rejected";
  review_note: string;
  reviewed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type EquipmentCatalogDetail = EquipmentCatalogRecord & {
  unmatched_pdf_discoveries: number;
  quality_evaluation?: import("@/lib/equipmentCatalog/quality").EquipmentQualityEvaluation;
  duplicate_candidates?: Array<{
    id: string;
    catalog_code: string;
    equipment_name: string;
    brand: string;
    model: string;
    review_status: EquipmentCatalogReviewStatus;
  }>;
  images: EquipmentCatalogImage[];
  parameters: EquipmentCatalogParameter[];
  document_jobs: EquipmentCatalogDocumentJob[];
  parameter_candidates: EquipmentCatalogParameterCandidate[];
  suppliers: Array<{
    id: string;
    supply_type: string;
    authorized_status: string;
    confidence: number;
    review_status: EquipmentCatalogReviewStatus;
    evidence_url: string | null;
    supplier: { id: string; supplier_code: string; name: string } | null;
  }>;
  sources: Array<{
    id: string;
    source_type: string;
    source_title: string;
    source_url: string | null;
    source_page: number | null;
    checked_at: string | null;
    confidence: number;
    review_status: EquipmentCatalogReviewStatus;
  }>;
  prices: Array<{
    id: string;
    price_code: string;
    original_price: number;
    original_currency: string;
    usd_price: number | null;
    price_term: string | null;
    confidence: number | null;
    risk_level: EquipmentCatalogRiskLevel;
    review_status: EquipmentCatalogReviewStatus;
    updated_at: string;
    supplier?: { id: string; name: string } | null;
  }>;
  reviews: Array<{
    id: string;
    reviewer_id: string;
    decision: EquipmentCatalogReviewStatus;
    notes: string;
    reviewed_at: string;
  }>;
};
