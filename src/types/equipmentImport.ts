export type EquipmentImportBatchStatus =
  | "draft"
  | "uploaded"
  | "parsing"
  | "mapping"
  | "validating"
  | "needs_review"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled";

export type EquipmentImportValidationStatus =
  | "valid"
  | "warning"
  | "error"
  | "duplicate"
  | "ignored"
  | "submitted"
  | "imported";

export type EquipmentImportMappingStatus = "mapped" | "warning" | "unmapped";

export type EquipmentImportMapping = {
  id: string;
  sourceField: string;
  systemField: string;
  sampleValue: string;
  confidence: number;
  status: EquipmentImportMappingStatus;
  required: boolean;
  userModified?: boolean;
};

export type EquipmentImportRow = {
  id: string;
  rowNumber: number;
  equipmentName: string;
  model: string;
  brand: string;
  category: string;
  originalPrice: number;
  currency: string;
  supplier: string;
  quoteDate: string;
  status: EquipmentImportValidationStatus;
  confidence: number;
  issues: string[];
  selected: boolean;
  reviewTaskId?: string | null;
  reviewStatus?: "pending" | "in_review" | "need_info" | "approved" | "rejected" | "archived" | null;
  equipmentPriceId?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
};

export type EquipmentImportBatchSummary = {
  id: string;
  batch_code: string;
  file_name: string;
  file_size: number;
  sheet_name: string;
  status: EquipmentImportBatchStatus;
  current_step: number;
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  duplicate_rows: number;
  needs_review_rows: number;
  selected_rows: number;
  submitted_rows?: number;
  imported_rows?: number;
  rejected_rows?: number;
  skipped_rows?: number;
  mapping_confidence: number | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  parse_engine?: string | null;
  file_hash?: string | null;
  workbook_sheets?: string[];
  parsed_at?: string | null;
  source_metadata?: Record<string, unknown> | null;
  created_by?: string;
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string;
  submitted_at: string | null;
  completed_at?: string | null;
};

export type EquipmentImportBatchDetail = {
  batch: EquipmentImportBatchSummary;
  mappings: EquipmentImportMapping[];
  rows: EquipmentImportRow[];
  downloadUrl: string | null;
  canWrite: boolean;
};

export type EquipmentImportParseResult = {
  batch: EquipmentImportBatchSummary;
  mappings: EquipmentImportMapping[];
  rows: EquipmentImportRow[];
  sheets: Array<{
    name: string;
    rowCount: number;
    selected: boolean;
  }>;
  selectedSheet: string;
  headerRow: number;
  mappingConfidence: number;
  truncated: boolean;
};
