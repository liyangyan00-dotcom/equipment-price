import { AlertTriangle } from "lucide-react";
import { getRiskBadgeClass, riskStyles } from "@/lib/statusStyles";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/common";

type RiskBadgeProps = {
  level: RiskLevel;
  className?: string;
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill border px-2 text-[12px] font-medium",
        getRiskBadgeClass(level),
        className
      )}
    >
      <AlertTriangle className="size-3.5" aria-hidden="true" />
      {riskStyles[level].label}风险
    </span>
  );
}
