export type QuoteItemType = "equipment" | "material";
export type QuoteDocumentStatus =
  | "uploaded"
  | "parsing"
  | "needs_review"
  | "partially_imported"
  | "imported"
  | "voided"
  | "failed";
export type QuoteItemReviewStatus =
  | "pending_review"
  | "needs_info"
  | "approved"
  | "imported"
  | "rejected"
  | "voided";
export type QuoteRiskLevel = "low" | "medium" | "high" | "critical";

export type QuoteRecognitionEvent = {
  id: number;
  document_id: string;
  item_id: string | null;
  action: string;
  note: string | null;
  metadata: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export type QuoteItemEvidence = {
  id: string;
  organization_id: string;
  document_id: string;
  item_id: string;
  page_number: number;
  source_kind: "spreadsheet_row" | "pdf_page" | "image";
  extraction_method: "spreadsheet" | "openai_responses" | "manual";
  source_text: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  confidence: number;
  provider: string | null;
  model: string | null;
  is_primary: boolean;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
};

export type QuoteRecognitionItem = {
  id: string;
  organization_id: string;
  document_id: string;
  line_number: number;
  item_type: QuoteItemType;
  item_code: string | null;
  item_name: string;
  brand: string | null;
  specification: string | null;
  category: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  region: string | null;
  price_condition: string | null;
  supplier_name: string | null;
  confidence: number;
  risk_level: QuoteRiskLevel;
  missing_fields: string[];
  review_status: QuoteItemReviewStatus;
  raw_data: Record<string, unknown>;
  normalized_data: Record<string, unknown>;
  ai_result: Record<string, unknown>;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  target_equipment_price_id: string | null;
  target_material_price_id: string | null;
  created_at: string;
  updated_at: string;
  evidence?: QuoteItemEvidence[];
};

export type QuoteRecognitionDocument = {
  id: string;
  document_code: string;
  organization_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  storage_path: string;
  status: QuoteDocumentStatus;
  supplier_id: string | null;
  supplier_name: string | null;
  quote_number: string | null;
  quote_date: string | null;
  valid_until: string | null;
  currency: string;
  total_amount: number;
  overall_confidence: number | null;
  risk_level: QuoteRiskLevel;
  missing_fields: string[];
  ai_task_id: string | null;
  recognition_summary: Record<string, unknown>;
  source_metadata: Record<string, unknown>;
  page_count: number | null;
  recognition_method: "spreadsheet" | "openai_responses_pdf" | "openai_responses_vision" | "manual" | null;
  recognition_provider: string | null;
  recognition_model: string | null;
  processed_at: string | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: QuoteRecognitionItem[];
  ai_task?: {
    id: string;
    task_code: string;
    status: string;
    stage: string;
    progress: number;
    confidence: number | null;
    risk_level: QuoteRiskLevel | null;
    output_payload: Record<string, unknown> | null;
    error_message: string | null;
  } | null;
  events?: QuoteRecognitionEvent[];
};

export type QuoteRecognitionItemInput = {
  itemType?: QuoteItemType;
  itemCode?: string;
  itemName?: string;
  brand?: string;
  specification?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  currency?: string;
  region?: string;
  priceCondition?: string;
  supplierName?: string;
  confidence?: number;
  riskLevel?: QuoteRiskLevel;
};

export type QuoteRecognitionListResponse = {
  data: QuoteRecognitionDocument[];
  counts: {
    documents: number;
    pendingItems: number;
    needsInfoItems: number;
    highRiskItems: number;
    importedItems: number;
  };
  permissions: {
    canWrite: boolean;
    canReview: boolean;
  };
  source: "supabase";
};
