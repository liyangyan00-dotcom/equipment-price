import type { AiTaskStatus, ConfidenceLevel, RiskLevel, ReviewStatus } from "@/types/common";

type StyleMeta<TValue extends string> = {
  label: string;
  value: TValue;
  className: string;
};

export const reviewStatusStyles: Record<ReviewStatus, StyleMeta<ReviewStatus>> = {
  pending: {
    label: "待审核",
    value: "pending",
    className: "bg-warning-soft text-[#B45309] border-warning/20",
  },
  need_info: {
    label: "需补充",
    value: "need_info",
    className: "bg-warning-soft text-[#92400E] border-warning/20",
  },
  confirmed: {
    label: "已确认",
    value: "confirmed",
    className: "bg-success-soft text-[#166534] border-success/20",
  },
  rejected: {
    label: "已退回",
    value: "rejected",
    className: "bg-danger-soft text-[#B91C1C] border-danger/20",
  },
  voided: {
    label: "已作废",
    value: "voided",
    className: "bg-[var(--color-muted-soft)] text-textMuted border-borderSoft",
  },
};

export const confidenceStyles: Record<ConfidenceLevel, StyleMeta<ConfidenceLevel>> = {
  A: { label: "高", value: "A", className: "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]" },
  B: { label: "较高", value: "B", className: "bg-success-soft text-[#166534] border-success/20" },
  C: { label: "一般", value: "C", className: "bg-warning-soft text-[#B45309] border-warning/20" },
  D: { label: "较低", value: "D", className: "bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]" },
  E: { label: "低", value: "E", className: "bg-danger-soft text-[#B91C1C] border-danger/20" },
};

export const riskStyles: Record<RiskLevel, StyleMeta<RiskLevel>> = {
  low: { label: "低", value: "low", className: "bg-success-soft text-[#166534] border-success/20" },
  medium: { label: "中", value: "medium", className: "bg-warning-soft text-[#B45309] border-warning/20" },
  high: { label: "高", value: "high", className: "bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]" },
  critical: { label: "严重", value: "critical", className: "bg-danger-soft text-[#B91C1C] border-danger/20" },
};

export const aiTaskStatusStyles: Record<AiTaskStatus, StyleMeta<AiTaskStatus>> = {
  created: { label: "已创建", value: "created", className: "bg-[var(--color-muted-soft)] text-textMuted border-borderSoft" },
  running: { label: "运行中", value: "running", className: "bg-ai-soft text-ai border-ai-border" },
  completed: { label: "已完成", value: "completed", className: "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]" },
  needs_review: { label: "待人工复核", value: "needs_review", className: "bg-warning-soft text-[#B45309] border-warning/20" },
  needs_info: { label: "需补充资料", value: "needs_info", className: "bg-warning-soft text-[#92400E] border-warning/20" },
  confirmed: { label: "已确认", value: "confirmed", className: "bg-success-soft text-[#166534] border-success/20" },
  rejected: { label: "已退回", value: "rejected", className: "bg-danger-soft text-[#B91C1C] border-danger/20" },
  voided: { label: "已作废", value: "voided", className: "bg-[var(--color-muted-soft)] text-textMuted border-borderSoft" },
};

export function getStatusBadgeClass(status: ReviewStatus | AiTaskStatus) {
  return status in reviewStatusStyles
    ? reviewStatusStyles[status as ReviewStatus].className
    : aiTaskStatusStyles[status as AiTaskStatus].className;
}

export function getStatusLabel(status: ReviewStatus | AiTaskStatus) {
  return status in reviewStatusStyles
    ? reviewStatusStyles[status as ReviewStatus].label
    : aiTaskStatusStyles[status as AiTaskStatus].label;
}

export function getConfidenceBadgeClass(level: ConfidenceLevel) {
  return confidenceStyles[level].className;
}

export function getRiskBadgeClass(riskLevel: RiskLevel) {
  return riskStyles[riskLevel].className;
}

export function getAiConfidenceColor(score: number) {
  if (score >= 90) {
    return "var(--color-success)";
  }

  if (score >= 75) {
    return "var(--color-warning)";
  }

  return "var(--color-danger)";
}
