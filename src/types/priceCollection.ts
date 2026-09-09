export type PriceCollectionTarget = "equipment" | "material";
export type PriceCollectionMode = "web" | "quote_upload" | "manual" | "api";
export type PriceCollectionTaskStatus =
  "queued" | "running" | "paused" | "completed" | "stopped" | "failed";
export type PriceCollectionLeadStatus =
  "pending_review" | "ready" | "transferred" | "rejected";
export type PriceCollectionRisk = "low" | "medium" | "high" | "critical";

export type PriceCollectionTaskRecord = {
  id: string;
  taskCode: string;
  targetType: PriceCollectionTarget;
  keyword: string;
  specification: string;
  region: string;
  currency: string;
  sourceType: string;
  frequency: string;
  provider: string;
  collectionMode: PriceCollectionMode;
  scheduleEnabled: boolean;
  scheduleCategory: string;
  scheduleExpression: string;
  nextRunAt: string;
  lastRunAt: string;
  retryCount: number;
  maxRetries: number;
  status: PriceCollectionTaskStatus;
  progress: number;
  currentSource: string;
  successCount: number;
  failedCount: number;
  outcomeStatus: "pending" | "qualified" | "partial" | "no_price" | "blocked";
  qualifiedLeadCount: number;
  catalogCandidateCount: number;
  evidenceCount: number;
  config: Record<string, unknown>;
  lastError: string;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
  archivedAt: string;
  archivedBy: string | null;
};

export type PriceCollectionLeadRecord = {
  id: string;
  taskId: string | null;
  runId: string | null;
  sourceId: string | null;
  quoteDocumentId: string | null;
  leadCode: string;
  targetType: PriceCollectionTarget;
  name: string;
  specification: string;
  originalName: string;
  translatedName: string;
  originalSpecification: string;
  translatedSpecification: string;
  translationStatus: "not_required" | "queued" | "running" | "completed" | "needs_review" | "failed";
  translationConfidence: number | null;
  translationRiskLevel: PriceCollectionRisk | null;
  translationReviewStatus: "pending_review" | "approved" | "rejected";
  translationReviewNote: string;
  sourceType: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  quoteDate: string;
  pricePeriodGranularity: "day" | "month" | "unknown";
  evidenceCode: string;
  region: string;
  price: number;
  currency: string;
  normalizedPrice: number;
  normalizedPriceCny: number | null;
  exchangeRate: number | null;
  originalUnit: string;
  priceValidityStatus: "valid" | "needs_review" | "invalid";
  priceValidationReasons: string[];
  priceOriginalText: string;
  priceContextExcerpt: string;
  isComparable: boolean;
  comparisonKey: string;
  fxStatus: "verified" | "missing_rate" | "pending";
  fxRateDate: string;
  fxSource: string;
  supplierName: string;
  matchTarget: string;
  aiMatchScore: number;
  confidence: number;
  riskLevel: PriceCollectionRisk;
  duplicateStatus: "unique" | "suspected_duplicate";
  duplicateScore: number;
  observationCount: number;
  status: PriceCollectionLeadStatus;
  reviewNotes: string;
  reviewedAt: string;
  transferredAt: string;
  assignedReviewerId: string | null;
  assignedAt: string;
  assignedBy: string | null;
  assignmentNote: string;
  reviewDueAt: string;
  createdAt: string;
};

export type PriceCollectionSourceRecord = {
  id: string;
  sourceCode: string;
  name: string;
  sourceKind: "web" | "api";
  baseUrl: string;
  isActive: boolean;
  defaultCurrency: string;
  defaultRegion: string;
  qualityScore: number;
  extractionStrategy: "structured_data" | "html_table" | "json_api";
  config: {
    targetType?: "equipment" | "material" | "all";
    catalogSourceType?: string;
    materialCategories?: string[];
    equipmentCategory?: string | null;
    trustLevel?: string | null;
    [key: string]: unknown;
  };
  lastCheckedAt: string;
  lastError: string;
};

export type EquipmentCollectionMethodRecord = {
  id: string;
  methodCode: string;
  name: string;
  applicableSourceTypes: string[];
  parseTarget: "webpage" | "pdf" | "excel" | "manual" | "mixed";
  aiEnabled: boolean;
  dedupeEnabled: boolean;
  standardizationEnabled: boolean;
  retryEnabled: boolean;
  maxRetry: number;
  reviewRequired: boolean;
  scheduled: boolean;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentSourceImportBatchRecord = {
  id: string;
  batchCode: string;
  fileName: string;
  status: "processing" | "completed" | "partial" | "failed";
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: Array<{ row: number; name: string; error: string }>;
  createdAt: string;
  finishedAt: string;
};

export type CollectionSourceValidationJobRecord = {
  id: string;
  sourceId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  attempt: number;
  errorMessage: string;
  result: Record<string, unknown>;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
};

export type PriceCollectionRunRecord = {
  id: string;
  taskId: string;
  runKind: "parent" | "source_attempt";
  parentRunId: string;
  sourceRunId: string;
  runCode: string;
  triggerType: "manual" | "schedule" | "retry" | "upload";
  attempt: number;
  status:
    "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";
  progress: number;
  fetchedCount: number;
  evidenceCount: number;
  createdLeadCount: number;
  updatedLeadCount: number;
  duplicateCount: number;
  failedSourceCount: number;
  metrics: Record<string, unknown>;
  currentSource: string;
  errorMessage: string;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
};

export type PriceCollectionSourceRunRecord = {
  id: string;
  taskId: string;
  parentRunId: string;
  sourceId: string;
  sourceName: string;
  sourceHost: string;
  status: "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";
  progress: number;
  pageBudget: number;
  pagesUsed: number;
  fetchedCount: number;
  evidenceCount: number;
  createdLeadCount: number;
  updatedLeadCount: number;
  duplicateCount: number;
  failedCount: number;
  attempt: number;
  maxRetries: number;
  currentResource: string;
  errorMessage: string;
  startedAt: string;
  finishedAt: string;
};

export type PriceCollectionSourceQualityRecord = {
  sourceId: string;
  sourceName: string;
  runCount: number;
  failedRunCount: number;
  newCount: number;
  updatedCount: number;
  duplicateCount: number;
  retainedLeadCount: number;
  validPriceCount: number;
  newRate: number;
  updateRate: number;
  duplicateRate: number;
  validPriceRate: number;
  lastRunAt: string;
};

export type PriceCollectionSchedulePolicyRecord = {
  id: string;
  categoryKey: string;
  categoryLabel: string;
  targetType: PriceCollectionTarget;
  frequency: "每小时" | "每天" | "每周" | "每月";
  scheduleExpression: string;
  timezone: string;
  isActive: boolean;
  lastAppliedAt: string;
};

export type PriceCollectionEvidenceRecord = {
  id: string;
  taskId: string;
  runId: string | null;
  leadId: string | null;
  sourceId: string | null;
  evidenceCode: string;
  sourceUrl: string;
  pageTitle: string;
  excerpt: string;
  httpStatus: number;
  mimeType: string;
  fetchedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  observationCount: number;
  snapshotKind: "collector" | "manual_review" | "quote_document";
  snapshotPayload: Record<string, unknown>;
  capturedBy: string | null;
  capturedAt: string;
};

export type EquipmentCollectionDiscoveryRecord = {
  id: string;
  taskId: string;
  runId: string | null;
  sourceId: string;
  resourceUrl: string;
  parentUrl: string;
  resourceType: "seed" | "page" | "product" | "catalog" | "pdf" | "api";
  depth: number;
  status:
    | "queued"
    | "fetching"
    | "fetched"
    | "tracked"
    | "blocked"
    | "failed"
    | "skipped";
  pageTitle: string;
  mimeType: string;
  httpStatus: number | null;
  errorMessage: string;
  metadata: Record<string, unknown>;
  discoveredAt: string;
  fetchedAt: string;
};

export type PriceCollectionReviewerRecord = {
  userId: string;
  displayName: string;
  role: string;
  isCurrentUser: boolean;
};

export type PriceCollectionHistoryMatchRecord = {
  recordId: string;
  recordCode: string;
  targetType: PriceCollectionTarget;
  recordName: string;
  recordSpecification: string;
  recordPrice: number;
  recordCurrency: string;
  sourceType: string;
  recordedAt: string;
  matchScore: number;
  priceDeltaPct: number | null;
};

export type PriceCollectionLeadPoolResponse = {
  mode: "supabase";
  role: string;
  permissions: {
    canWrite: boolean;
    canReview: boolean;
  };
  leads: PriceCollectionLeadRecord[];
  reviewers: PriceCollectionReviewerRecord[];
  availableSourceTypes: string[];
  availableRegions: string[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  summary: {
    total: number;
    pending: number;
    ready: number;
    transferred: number;
    rejected: number;
    highRisk: number;
    unassigned: number;
    overdue: number;
    averageConfidence: number;
    averageMatch: number;
    valid: number;
    needsReview: number;
    invalid: number;
  };
  issueSummary: {
    missingEvidence: number;
    missingFx: number;
    duplicate: number;
    staleSource: number;
    invalidFields: number;
    criticalRisk: number;
  };
  sourceDistribution: Array<{ label: string; count: number }>;
  statusDistribution: Array<{ label: string; count: number }>;
};

export type PriceCollectionLeadDetailResponse = {
  lead: PriceCollectionLeadRecord;
  evidence: PriceCollectionEvidenceRecord[];
  historyMatches: PriceCollectionHistoryMatchRecord[];
  monthlyTrend: Array<{
    month: string;
    averagePrice: number;
    minimumPrice: number;
    maximumPrice: number;
    sampleCount: number;
    monthOverMonthPct: number | null;
  }>;
};

export type PriceCollectionBootstrap = {
  mode: "supabase";
  role: string;
  permissions: {
    canWrite: boolean;
    canReview: boolean;
  };
  tasks: PriceCollectionTaskRecord[];
  leads: PriceCollectionLeadRecord[];
  sources: PriceCollectionSourceRecord[];
  runs: PriceCollectionRunRecord[];
  sourceRuns: PriceCollectionSourceRunRecord[];
};

export type PriceCollectionTaskAuditRecord = {
  id: string;
  action: string;
  actorId: string;
  createdAt: string;
  oldStatus: string;
  newStatus: string;
  progress: number | null;
};

export type PriceCollectionTaskDetail = {
  mode: "supabase";
  role: string;
  permissions: {
    canWrite: boolean;
    canReview: boolean;
  };
  task: PriceCollectionTaskRecord;
  leads: PriceCollectionLeadRecord[];
  runs: PriceCollectionRunRecord[];
  sourceRuns: PriceCollectionSourceRunRecord[];
  sourceQuality: PriceCollectionSourceQualityRecord[];
  evidence: PriceCollectionEvidenceRecord[];
  discoveries: EquipmentCollectionDiscoveryRecord[];
  catalogCandidates: Array<{
    id: string;
    catalogCode: string;
    equipmentName: string;
    equipmentCategory: string;
    equipmentType: string;
    brand: string;
    productSeries: string;
    model: string;
    specification: string;
    completeness: number;
    aiConfidence: number;
    reviewStatus: string;
    riskLevel: string;
    sourceUrl: string;
    extractedAt: string;
  }>;
  sources: PriceCollectionSourceRecord[];
  auditLogs: PriceCollectionTaskAuditRecord[];
  summary: {
    discoveries: number;
    products: number;
    fetched: number;
    queued: number;
    failed: number;
    candidates: number;
    pendingReview: number;
    evidence: number;
    runs: number;
    totalLeads: number;
    pendingLeads: number;
    highRiskLeads: number;
  };
  pagination: {
    view: "candidates" | "discoveries" | "evidence" | "runs";
    page: number;
    pageSize: 10 | 20 | 30;
    total: number;
    pageCount: number;
  };
  leadPagination: {
    page: number;
    pageSize: 10 | 20 | 30;
    total: number;
    pageCount: number;
  };
};
