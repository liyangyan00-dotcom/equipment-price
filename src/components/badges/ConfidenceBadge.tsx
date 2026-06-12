import { ShieldCheck } from "lucide-react";
import { confidenceStyles, getConfidenceBadgeClass } from "@/lib/statusStyles";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/types/common";

type ConfidenceBadgeProps = {
  level: ConfidenceLevel;
  showPrefix?: boolean;
  className?: string;
};

export function ConfidenceBadge({ level, showPrefix = true, className }: ConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill border px-2 text-[12px] font-medium",
        getConfidenceBadgeClass(level),
        className
      )}
    >
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      {showPrefix ? `可信度 ${level}` : level}
      <span className="text-current/75">{confidenceStyles[level].label}</span>
    </span>
  );
}
