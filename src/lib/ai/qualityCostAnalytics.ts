import type {
  AiQualityCostAnalyticsResponse,
  AiQualityCostBreakdown,
  AiQualityCostSummary,
  AiQualityCostTrendPoint,
} from "@/types/aiExecution";

export type GatewayAnalyticsRun = {
  id: string;
  execution_task_id: string | null;
  workflow_key: string | null;
  status: string;
  provider: string | null;
  model: string | null;
  confidence: number | string | null;
  risk_level: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | string | null;
  latency_ms: number | null;
  created_at: string;
};

export type GatewayReviewTask = {
  id: string;
  review_decision: string | null;
};

const successfulStatuses = new Set(["completed", "needs_review", "success"]);
const highRiskLevels = new Set(["high", "critical"]);

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function percent(part: number, total: number) {
  return total > 0 ? round((part / total) * 100) : 0;
}

function average(values: number[]) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function reviewDecision(run: GatewayAnalyticsRun, reviewByTask: Map<string, string | null>) {
  return run.execution_task_id ? reviewByTask.get(run.execution_task_id) ?? null : null;
}

function buildBreakdown(
  runs: GatewayAnalyticsRun[],
  reviewByTask: Map<string, string | null>,
  keyFor: (run: GatewayAnalyticsRun) => string,
): AiQualityCostBreakdown[] {
  const groups = new Map<string, GatewayAnalyticsRun[]>();
  for (const run of runs) {
    const key = keyFor(run);
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }

  return [...groups.entries()].map(([key, rows]) => {
    const successfulRuns = rows.filter((run) => successfulStatuses.has(run.status)).length;
    const confidences = rows.map((run) => numberValue(run.confidence)).filter((value) => value > 0);
    const decisions = rows.map((run) => reviewDecision(run, reviewByTask)).filter(Boolean) as string[];
    const approved = decisions.filter((decision) => decision === "approved").length;
    const priced = rows.filter((run) => run.estimated_cost_usd !== null);
    const latencies = rows.map((run) => numberValue(run.latency_ms)).filter((value) => value > 0);
    return {
      key,
      label: key,
      runs: rows.length,
      successfulRuns,
      successRate: percent(successfulRuns, rows.length),
      averageConfidence: average(confidences),
      reviewedRuns: decisions.length,
      humanApprovalRate: percent(approved, decisions.length),
      totalTokens: rows.reduce((sum, run) => sum + numberValue(run.total_tokens), 0),
      estimatedCostUsd: round(priced.reduce((sum, run) => sum + numberValue(run.estimated_cost_usd), 0), 6),
      unpricedRuns: rows.length - priced.length,
      averageLatencyMs: Math.round(average(latencies)),
    };
  }).sort((left, right) => right.runs - left.runs);
}

function buildTrend(runs: GatewayAnalyticsRun[], rangeDays: number): AiQualityCostTrendPoint[] {
  const rowsByDate = new Map<string, GatewayAnalyticsRun[]>();
  for (const run of runs) {
    const date = run.created_at.slice(0, 10);
    rowsByDate.set(date, [...(rowsByDate.get(date) ?? []), run]);
  }

  const today = new Date();
  const points: AiQualityCostTrendPoint[] = [];
  for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
    const dateValue = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const date = dateValue.toISOString().slice(0, 10);
    const rows = rowsByDate.get(date) ?? [];
    const successfulRuns = rows.filter((run) => successfulStatuses.has(run.status)).length;
    points.push({
      date,
      label: `${String(dateValue.getUTCMonth() + 1).padStart(2, "0")}-${String(dateValue.getUTCDate()).padStart(2, "0")}`,
      runs: rows.length,
      successfulRuns,
      successRate: percent(successfulRuns, rows.length),
      totalTokens: rows.reduce((sum, run) => sum + numberValue(run.total_tokens), 0),
      estimatedCostUsd: round(rows.reduce((sum, run) => sum + numberValue(run.estimated_cost_usd), 0), 6),
    });
  }
  return points;
}

export function buildAiQualityCostAnalytics({
  runs,
  reviewTasks,
  rangeDays,
  scope,
  truncated,
}: {
  runs: GatewayAnalyticsRun[];
  reviewTasks: GatewayReviewTask[];
  rangeDays: number;
  scope: "organization" | "self";
  truncated: boolean;
}): AiQualityCostAnalyticsResponse {
  const reviewByTask = new Map(reviewTasks.map((task) => [task.id, task.review_decision]));
  const totalRuns = runs.length;
  const successfulRuns = runs.filter((run) => successfulStatuses.has(run.status)).length;
  const failedRuns = runs.filter((run) => run.status === "failed").length;
  const confidences = runs.map((run) => numberValue(run.confidence)).filter((value) => value > 0);
  const highRiskRuns = runs.filter((run) => highRiskLevels.has(run.risk_level ?? "")).length;
  const reviewRequiredRuns = runs.filter((run) => Boolean(run.execution_task_id)).length;
  const decisions = runs.map((run) => reviewDecision(run, reviewByTask)).filter(Boolean) as string[];
  const approvedRuns = decisions.filter((decision) => decision === "approved").length;
  const requestChangesRuns = decisions.filter((decision) => decision === "request_changes").length;
  const rejectedRuns = decisions.filter((decision) => decision === "rejected").length;
  const pricedRuns = runs.filter((run) => run.estimated_cost_usd !== null);
  const estimatedCostUsd = round(pricedRuns.reduce((sum, run) => sum + numberValue(run.estimated_cost_usd), 0), 6);
  const latencies = runs.map((run) => numberValue(run.latency_ms)).filter((value) => value > 0);
  const successRate = percent(successfulRuns, totalRuns);
  const averageConfidence = average(confidences);
  const reviewCoverage = percent(decisions.length, reviewRequiredRuns);
  const humanApprovalRate = percent(approvedRuns, decisions.length);
  const qualityScore = round(
    successRate * 0.4
      + averageConfidence * 0.3
      + reviewCoverage * 0.2
      + humanApprovalRate * 0.1,
  );

  const summary: AiQualityCostSummary = {
    totalRuns,
    successfulRuns,
    failedRuns,
    successRate,
    averageConfidence,
    highRiskRuns,
    highRiskRate: percent(highRiskRuns, totalRuns),
    reviewRequiredRuns,
    reviewedRuns: decisions.length,
    reviewCoverage,
    approvedRuns,
    requestChangesRuns,
    rejectedRuns,
    humanApprovalRate,
    qualityScore,
    promptTokens: runs.reduce((sum, run) => sum + numberValue(run.prompt_tokens), 0),
    completionTokens: runs.reduce((sum, run) => sum + numberValue(run.completion_tokens), 0),
    totalTokens: runs.reduce((sum, run) => sum + numberValue(run.total_tokens), 0),
    pricedRuns: pricedRuns.length,
    unpricedRuns: totalRuns - pricedRuns.length,
    estimatedCostUsd,
    costPerSuccessfulRunUsd: successfulRuns ? round(estimatedCostUsd / successfulRuns, 6) : null,
    costPerApprovedRunUsd: approvedRuns ? round(estimatedCostUsd / approvedRuns, 6) : null,
    averageLatencyMs: Math.round(average(latencies)),
  };

  return {
    generatedAt: new Date().toISOString(),
    rangeDays,
    scope,
    truncated,
    summary,
    providers: buildBreakdown(runs, reviewByTask, (run) => `${run.provider || "未知 Provider"} / ${run.model || "未记录模型"}`),
    workflows: buildBreakdown(runs, reviewByTask, (run) => run.workflow_key || "未分类工作流"),
    trend: buildTrend(runs, rangeDays),
    notes: [
      "运行质量指数由成功率、平均置信度、人工复核覆盖率和人工通过率加权形成，不代表模型准确率。",
      "人工通过率只表示审核员接受 AI 输出，不代表价格、供应商或商务方案已最终审批。",
      "成本按 Provider 配置的每百万 Token 费率在运行时估算，不等同于供应商最终账单。",
    ],
  };
}
