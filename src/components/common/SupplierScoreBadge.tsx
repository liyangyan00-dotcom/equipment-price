import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type SupplierScoreBadgeProps = {
  score: number;
  className?: string;
};

export function SupplierScoreBadge({ score, className }: SupplierScoreBadgeProps) {
  const tone =
    score >= 85
      ? "border-success/20 bg-success-soft text-success"
      : score >= 70
        ? "border-warning/20 bg-warning-soft text-[#B45309]"
        : "border-danger/20 bg-danger-soft text-danger";

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-pill border px-2 text-[12px] font-semibold",
        tone,
        className
      )}
    >
      <Star className="size-3.5" aria-hidden="true" />
      {score}
    </span>
  );
}
