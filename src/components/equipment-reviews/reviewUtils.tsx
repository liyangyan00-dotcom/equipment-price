import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import type { ConfidenceLevel, ReviewStatus } from "@/types/common";
import type {
  EquipmentReviewTask,
  EquipmentReviewTaskStatus,
} from "@/types/equipmentReview";

export const reviewStatusLabels: Record<EquipmentReviewTaskStatus, string> = {
  pending: "待审核",
  in_review: "审核中",
  need_info: "待补充",
  approved: "已通过",
  rejected: "已驳回",
  archived: "已归档",
};

const badgeStatusMap: Record<EquipmentReviewTaskStatus, ReviewStatus> = {
  pending: "pending",
  in_review: "pending",
  need_info: "need_info",
  approved: "confirmed",
  rejected: "rejected",
  archived: "voided",
};

export function confidenceLevel(value: number | null): ConfidenceLevel {
  if ((value ?? 0) >= 90) return "A";
  if ((value ?? 0) >= 80) return "B";
  if ((value ?? 0) >= 70) return "C";
  if ((value ?? 0) >= 60) return "D";
  return "E";
}

export function ReviewStatusBadge({
  status,
  className,
}: {
  status: EquipmentReviewTaskStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      status={badgeStatusMap[status]}
      label={reviewStatusLabels[status]}
      className={className}
    />
  );
}

export function ReviewConfidenceBadge({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  return (
    <ConfidenceBadge
      level={confidenceLevel(value)}
      label={`${Math.round(value ?? 0)}%`}
      className={className}
    />
  );
}

export function ReviewRiskBadge({
  task,
  className,
}: {
  task: EquipmentReviewTask;
  className?: string;
}) {
  return <RiskBadge level={task.risk_level} className={className} />;
}

export function formatReviewTime(value: string | null) {
  if (!value) return "未处理";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatReviewPrice(task: EquipmentReviewTask) {
  const price = task.wpi_equipment_prices;
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: price.original_currency || "CNY",
    maximumFractionDigits: 0,
  }).format(Number(price.original_price));
}
