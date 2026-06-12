import { CheckCircle2, Clock3, HelpCircle, RotateCcw, XCircle } from "lucide-react";
import { getStatusBadgeClass, getStatusLabel } from "@/lib/statusStyles";
import { cn } from "@/lib/utils";
import type { AiTaskStatus, ReviewStatus } from "@/types/common";

const statusIcons = {
  pending: Clock3,
  need_info: HelpCircle,
  confirmed: CheckCircle2,
  rejected: XCircle,
  voided: RotateCcw,
  created: Clock3,
  running: Clock3,
  completed: CheckCircle2,
  needs_review: Clock3,
  needs_info: HelpCircle,
} as const;

type StatusBadgeProps = {
  status: ReviewStatus | AiTaskStatus;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const Icon = statusIcons[status] ?? Clock3;

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-pill border px-2 text-[12px] font-medium",
        getStatusBadgeClass(status),
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? getStatusLabel(status)}
    </span>
  );
}
