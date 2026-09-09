import type { RiskLevel } from "@/types/common";

export type AiExecutionWorkflowKey =
  | "equipment_price_pre_review"
  | "quote_recognition"
  | "price_collection"
  | "comparison_analysis"
  | "boq_parsing"
  | "inquiry_letter"
  | "report_generation";

export type AiExecutionTaskStatus =
  | "queued"
  | "running"
  | "needs_review"
  | "completed"
  | "failed"
  | "cancelled";

export type AiExecutionStage =
  | "accepted"
  | "loading_config"
  | "calling_provider"
  | "validating_output"
  | "persisting_result"
  | "awaiting_review"
  | "completed"
  | "failed"
  | "cancelled";

export type AiExecutionReviewDecision = "approved" | "request_changes" | "rejected";

export type AiExecutionTask = {
  id: string;
  task_code: string;
  organization_id: string;
  workflow_key: AiExecutionWorkflowKey;
  title: string;
  source_label: string;
  business_object_type: string;
  business_object_id: string | null;
  business_href: string | null;
  status: AiExecutionTaskStatus;
  stage: AiExecutionStage;
  progress: number;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  confidence: number | null;
  risk_level: RiskLevel | null;
  requires_human_review: boolean;
  review_decision: AiExecutionReviewDecision | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  attempt_count: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
  requested_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AiExecutionEvent = {
  id: number;
  task_id: string;
  event_type: string;
  status: AiExecutionTaskStatus;
  stage: AiExecutionStage;
  progress: number;
  message: string;
  payload: Record<string, unknown>;
  actor_type: "user" | "gateway" | "system";
  actor_user_id: string | null;
  created_at: string;
};

export type AiExecutionTaskDetail = AiExecutionTask & {
  events: AiExecutionEvent[];
};

export type AiAutomationWorkflowHealth = {
  workflowKey: AiExecutionWorkflowKey;
  label: string;
  businessHref: string;
  ready: boolean;
  provider: string;
  model: string;
  promptEnabled: boolean;
  integrationStatus: string;
  credentialState: string;
  lastSuccessAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  runs24h: number;
  failures24h: number;
  blocker: string | null;
  configuration: AiAutomationStage;
  latestRun: AiAutomationStage;
  humanReview: AiAutomationStage;
  formalWrite: AiAutomationStage;
  smoke: AiAutomationStage;
};

export type AiAutomationStageStatus =
  | "passed"
  | "pending"
  | "failed"
  | "blocked"
  | "not_run";

export type AiAutomationStage = {
  status: AiAutomationStageStatus;
  label: string;
  detail?: string | null;
  count?: number;
  at?: string | null;
  message?: string | null;
};

export type AiAutomationIntegrationHealth = {
  code: string;
  name: string;
  type: "ai_provider" | "email";
  provider: string;
  status: string;
  credentialState: string;
  lastValidatedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

export type AiAutomationCronHealth = {
  name: string;
  schedule: string;
  active: boolean;
  lastStatus: string | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  runs24h: number;
  failures24h: number;
};

export type AiAutomationFailure = {
  id: string;
  taskCode: string;
  workflowKey: AiExecutionWorkflowKey;
  title: string;
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  maxAttempts: number;
  businessHref: string | null;
  created_at: string;
};

export type AiAutomationIncident = {
  id: string;
  incidentKey: string;
  status: "open" | "resolved";
  severity: "warning" | "critical";
  title: string;
  message: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  occurrenceCount: number;
  resolvedAt: string | null;
  remediationHref: string | null;
};

export type AiAutomationComponentHealth = {
  componentKey: string;
  componentType: "workflow" | "integration" | "cron" | "runtime";
  label: string;
  healthStatus: "healthy" | "warning" | "critical";
  message: string | null;
  remediationHref: string | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  firstFailedAt: string | null;
  lastCheckedAt: string;
  lastChangedAt: string;
};

export type AiAutomationAssurance = {
  enabled: boolean;
  intervalMinutes: number;
  retentionDays: number;
  snapshots24h: number;
  latestSnapshotAt: string | null;
  activeIncidents: AiAutomationIncident[];
  components: AiAutomationComponentHealth[];
  recentTrend: Array<{
    capturedAt: string;
    status: "healthy" | "degraded" | "critical";
  }>;
};

export type AiAutomationHealth = {
  generatedAt: string;
  overallStatus: "healthy" | "degraded" | "critical";
  canManage: boolean;
  summary: {
    workflowTotal: number;
    workflowReady: number;
    workflowBlocked: number;
    staleTasks: number;
    failedTasks24h: number;
    integrationErrors: number;
    cronFailures24h: number;
  };
  workflows: AiAutomationWorkflowHealth[];
  integrations: AiAutomationIntegrationHealth[];
  cronJobs: AiAutomationCronHealth[];
  recentFailures: AiAutomationFailure[];
  collection: {
    activeParentRuns: number;
    failedParentRuns24h: number;
    failedSourceAttempts24h: number;
    latestFailureAt: string | null;
    latestFailureMessage: string | null;
  };
  assurance: AiAutomationAssurance;
};

export type AiQualityCostSummary = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  averageConfidence: number;
  highRiskRuns: number;
  highRiskRate: number;
  reviewRequiredRuns: number;
  reviewedRuns: number;
  reviewCoverage: number;
  approvedRuns: number;
  requestChangesRuns: number;
  rejectedRuns: number;
  humanApprovalRate: number;
  qualityScore: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  pricedRuns: number;
  unpricedRuns: number;
  estimatedCostUsd: number;
  costPerSuccessfulRunUsd: number | null;
  costPerApprovedRunUsd: number | null;
  averageLatencyMs: number;
};

export type AiQualityCostBreakdown = {
  key: string;
  label: string;
  runs: number;
  successfulRuns: number;
  successRate: number;
  averageConfidence: number;
  reviewedRuns: number;
  humanApprovalRate: number;
  totalTokens: number;
  estimatedCostUsd: number;
  unpricedRuns: number;
  averageLatencyMs: number;
};

export type AiQualityCostTrendPoint = {
  date: string;
  label: string;
  runs: number;
  successfulRuns: number;
  successRate: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type AiQualityCostAnalyticsResponse = {
  generatedAt: string;
  rangeDays: number;
  scope: "organization" | "self";
  truncated: boolean;
  summary: AiQualityCostSummary;
  providers: AiQualityCostBreakdown[];
  workflows: AiQualityCostBreakdown[];
  trend: AiQualityCostTrendPoint[];
  notes: string[];
};

export const aiWorkflowLabels: Record<AiExecutionWorkflowKey, string> = {
  equipment_price_pre_review: "设备价格预审",
  quote_recognition: "报价识别",
  price_collection: "价格采集",
  comparison_analysis: "比价分析",
  boq_parsing: "BOQ解析",
  inquiry_letter: "询价函生成",
  report_generation: "报告生成",
};

export const aiWorkflowBusinessRoutes: Record<AiExecutionWorkflowKey, string> = {
  equipment_price_pre_review: "/equipment-prices/reviews",
  quote_recognition: "/ai-quote-recognition",
  price_collection: "/ai-price-collection",
  comparison_analysis: "/inquiries",
  boq_parsing: "/project-pricing/boq-parse",
  inquiry_letter: "/ai-inquiry-letter",
  report_generation: "/ai-report-center",
};
