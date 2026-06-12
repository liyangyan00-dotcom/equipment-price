import { Activity, BarChart3, RefreshCw, TrendingUp } from "lucide-react";
import { BaseCard } from "@/components/common";
import type { PriceTrendPoint, TrendSummary } from "@/data/mock/dashboard";
import { cn } from "@/lib/utils";
import { DashboardSectionHeader } from "./DashboardSectionHeader";
import { PriceTrendChart } from "./PriceTrendChart";

type PriceTrendIntelligenceProps = {
  data: PriceTrendPoint[];
  summaries: TrendSummary[];
  compact?: boolean;
};

const summaryClass = {
  blue: "border-primary-soft bg-primary-soft/45 text-primary",
  green: "border-success/20 bg-success-soft text-success",
  purple: "border-ai-border bg-ai-soft text-ai",
};

export function PriceTrendIntelligence({ data, summaries, compact = false }: PriceTrendIntelligenceProps) {
  const summaryIcons = [BarChart3, Activity, TrendingUp];

  return (
    <BaseCard contentClassName={cn("space-y-2.5", compact ? "p-3" : "p-3.5")}>
      <DashboardSectionHeader
        icon={TrendingUp}
        title="价格趋势分析"
        subtitle="设备、地材与 AI 线索近30天变化"
        tone="blue"
        action={
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-pill border border-primary-soft bg-primary-soft/60 p-0.5 text-[11px] font-semibold text-primary">
              <span className="rounded-pill bg-white px-2 py-0.5 shadow-sm">近30天</span>
              <span className="px-2 py-0.5 text-textMuted">近90天</span>
            </div>
            <span className="inline-flex size-7 items-center justify-center rounded-pill border border-borderSoft bg-white text-primary">
              <RefreshCw className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        }
      />

      <PriceTrendChart data={data} height={compact ? 148 : 196} />

      <div className={cn("grid gap-2", compact ? "grid-cols-1" : "md:grid-cols-3")}>
        {summaries.map((item, index) => {
          const Icon = summaryIcons[index] ?? TrendingUp;
          return (
          <div key={item.label} className={cn("rounded-[12px] border px-3 py-1.5", summaryClass[item.tone])}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <p className="truncate text-[12px] font-semibold">{item.label}</p>
              </span>
              <p className="text-[18px] font-semibold leading-none">{item.value}</p>
            </div>
            <p className="mt-1 truncate text-[11px] text-textSecondary">{item.description}</p>
          </div>
          );
        })}
      </div>
    </BaseCard>
  );
}
