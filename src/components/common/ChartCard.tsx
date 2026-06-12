import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseCard } from "./BaseCard";

type ChartCardProps = {
  title: string;
  description?: string;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
  tone?: "blue" | "cyan" | "purple" | "orange" | "red" | "green";
  compact?: boolean;
};

const toneClass = {
  blue: "bg-[#E8F2FF] text-primary",
  cyan: "bg-[#E6FAFC] text-[#00A6B8]",
  purple: "bg-ai-soft text-ai",
  orange: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  green: "bg-success-soft text-success",
};

export function ChartCard({
  title,
  description,
  legend,
  children,
  className,
  icon: Icon,
  tone = "blue",
  compact = false,
}: ChartCardProps) {
  if (Icon) {
    return (
      <section className={cn("rounded-card border border-borderSoft bg-card shadow-card", className)}>
        <div className={cn("flex items-center justify-between gap-3 border-b border-borderSoft", compact ? "px-4 py-3" : "px-5 py-4")}>
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[12px]", toneClass[tone])}>
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold leading-5 text-textMain">{title}</h3>
              {description ? <p className="mt-0.5 truncate text-caption leading-4 text-textMuted">{description}</p> : null}
            </div>
          </div>
          {legend ? <div className="flex shrink-0 items-center gap-2">{legend}</div> : null}
        </div>
        <div className={cn("text-table text-textMuted", compact ? "min-h-[220px] p-4" : "min-h-[260px] p-5")}>{children}</div>
      </section>
    );
  }

  return (
    <BaseCard title={title} description={description} actions={legend} className={className}>
      <div className="min-h-[260px] text-table text-textMuted">{children}</div>
    </BaseCard>
  );
}
