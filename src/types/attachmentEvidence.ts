import type { ReviewStatus, RiskLevel } from "@/types/common";

export type AttachmentEvidenceTag = {
  id: string;
  name: string;
};

export type AttachmentEvidenceField = {
  label: string;
  value: string;
  confidence: number;
};

export type AttachmentEvidenceIssue = {
  id: string;
  label: string;
  severity: string;
  status: "open" | "resolved";
  resolutionNotes: string | null;
};

export type AttachmentEvidenceAudit = {
  time: string;
  actor: string;
  action: string;
  detail: string;
};

export type AttachmentEvidenceDetail = {
  id: string;
  databaseId: string;
  name: string;
  size: string;
  type: string;
  object: string;
  priceId: string;
  supplier: string;
  source: string;
  uploader: string;
  uploadedAt: string;
  status: "linked" | "pending" | "unlinked";
  fileKind: "pdf" | "sheet" | "mail" | "image";
  mimeType: string;
  checksum: string;
  storageBucket: string;
  objectPath: string;
  documentDate: string;
  validUntil: string;
  confidence: "A" | "B" | "C" | "D" | "E";
  confidenceScore: number;
  risk: RiskLevel;
  reviewStatus: ReviewStatus;
  aiSummary: string;
  recommendedAction: string;
  archiveTags: AttachmentEvidenceTag[];
  extractedFields: AttachmentEvidenceField[];
  issues: AttachmentEvidenceIssue[];
  relations: Array<{ label: string; value: string; href?: string }>;
  auditTrail: AttachmentEvidenceAudit[];
  aiRuns: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  sourceSystem: "supabase";
};
