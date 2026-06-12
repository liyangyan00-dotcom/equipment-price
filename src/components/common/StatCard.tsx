import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendDirection } from "@/types/common";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trendLabel?: string;
  trendDirection?: TrendDirection;
  className?: string;
};

const trendIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
};

const trendClass = {
  up: "text-success",
  down: "text-danger",
  flat: "text-textMuted",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trendLabel,
  trendDirection = "flat",
  className,
}: StatCardProps) {
  const TrendIcon = trendIcon[trendDirection];

  return (
    <section
      className={cn(
        "min-h-[116px] rounded-card-lg border border-borderSoft bg-card p-5 shadow-card transition hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-caption text-textMuted">{title}</p>
          <p className="mt-3 text-metric-lg text-textMain">{value}</p>
        </div>
        {Icon ? (
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2 text-caption">
        {trendLabel ? (
          <span className={cn("inline-flex items-center gap-1 font-medium", trendClass[trendDirection])}>
            <TrendIcon className="size-3.5" aria-hidden="true" />
            {trendLabel}
          </span>
        ) : null}
        {description ? <span className="text-textMuted">{description}</span> : null}
      </div>
    </section>
  );
}
