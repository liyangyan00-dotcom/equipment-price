import type { RiskLevel } from "@/types/common";

export type EquipmentReviewTaskStatus =
  | "pending"
  | "in_review"
  | "need_info"
  | "approved"
  | "rejected"
  | "archived";

export type EquipmentReviewDecision = "start" | "approve" | "reject" | "need_info";

export type EquipmentReviewEvidenceState = "verified" | "problem" | "missing";

export type EquipmentReviewProgress = {
  evidenceStates: Record<string, EquipmentReviewEvidenceState>;
  resolvedIssueIds: string[];
};

export type EquipmentReviewEvidenceFile = {
  id: string;
  name: string;
  evidence_type: string;
  content_type: string | null;
  size_bytes: number;
  verification_status: "pending" | "verified" | "rejected";
  document_date: string | null;
  valid_until: string | null;
};

export type EquipmentReviewAuditEvent = {
  id: number;
  eventType: string;
  action: string;
  tableName: string;
  recordId: string | null;
  actorId: string | null;
  actorName: string;
  actorRole: "admin" | "manager" | "reviewer" | "editor" | "viewer" | null;
  createdAt: string;
  oldStatus: string | null;
  newStatus: string | null;
  comment: string | null;
  context: Record<string, unknown>;
};

export type EquipmentReviewPermissions = {
  role: "admin" | "manager" | "reviewer" | "editor" | "viewer";
  canReview: boolean;
  canBatchReview: boolean;
  canReadTaskAudit: boolean;
  canReadFullAudit: boolean;
  canExportReviewList: boolean;
  canManageEvidence: boolean;
  canRunAiReview: boolean;
};

export type EquipmentReviewPrice = {
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
  source_url: string | null;
  valid_until: string | null;
  confidence: number | null;
  risk_level: RiskLevel;
  review_status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  technical_parameters: Record<string, unknown>;
  wpi_suppliers: {
    id: string;
    legacy_id: string | null;
    name: string;
  } | null;
};

export type EquipmentReviewTask = {
  id: string;
  organization_id: string;
  equipment_price_id: string | null;
  source_kind: "price" | "import";
  import_row_id: string | null;
  import_batch_id?: string | null;
  import_batch_code?: string | null;
  import_row_number?: number | null;
  status: EquipmentReviewTaskStatus;
  confidence: number | null;
  completeness: number | null;
  risk_level: RiskLevel;
  matched_rules: string[];
  missing_fields: string[];
  evidence_checks: Record<string, boolean>;
  evidence_states?: Record<string, EquipmentReviewEvidenceState>;
  evidence_files: EquipmentReviewEvidenceFile[];
  ai_judgment: string | null;
  ai_recommendation: string | null;
  assigned_to: string | null;
  submitted_by: string;
  reviewed_by: string | null;
  review_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  wpi_equipment_prices: EquipmentReviewPrice;
};
