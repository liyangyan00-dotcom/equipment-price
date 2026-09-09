"use client";

import { Activity, BarChart3, RefreshCw, TrendingUp } from "lucide-react";
import { BaseCard } from "@/components/common";
import type { PriceTrendPoint, TrendSummary } from "@/data/mock/dashboard";
import { cn } from "@/lib/utils";
import { DashboardSectionHeader } from "./DashboardSectionHeader";
import { PriceTrendChart } from "./PriceTrendChart";

type PriceTrendIntelligenceProps = {
  data: PriceTrendPoint[];
  summaries: TrendSummary[];
  rangeDays: 7 | 30 | 90;
  refreshing?: boolean;
  onRangeChange: (range: 7 | 30 | 90) => void;
  onRefresh: () => void;
  compact?: boolean;
};

const summaryClass = {
  blue: "border-primary-soft bg-primary-soft/45 text-primary",
  green: "border-success/20 bg-success-soft text-success",
  purple: "border-ai-border bg-ai-soft text-ai",
};

export function PriceTrendIntelligence({ data, summaries, rangeDays, refreshing = false, onRangeChange, onRefresh, compact = false }: PriceTrendIntelligenceProps) {
  const summaryIcons = [BarChart3, Activity, TrendingUp];

  return (
    <BaseCard contentClassName={cn("space-y-2.5", compact ? "p-3" : "p-3.5")}>
      <DashboardSectionHeader
        icon={TrendingUp}
        title="价格趋势分析"
        subtitle={`设备、地材与 AI 线索近${rangeDays}天真实新增`}
        tone="blue"
        action={
          <div className="pointer-events-auto relative z-20 flex items-center gap-1.5">
            <div className="inline-flex h-7 items-center rounded-md border border-borderSoft bg-white p-0.5" aria-label="趋势统计周期">
              {([7, 30, 90] as const).map((range) => (
                <button key={range} type="button" onClick={() => onRangeChange(range)} disabled={refreshing} className={cn("h-6 rounded-[5px] px-2 text-[10.5px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", rangeDays === range ? "bg-primary-soft text-primary" : "text-textMuted hover:text-textMain")}>
                  {range}天
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRefresh();
              }}
              aria-label="刷新价格趋势"
              disabled={refreshing}
              className="pointer-events-auto relative z-20 inline-flex size-7 items-center justify-center rounded-pill border border-borderSoft bg-white text-primary transition hover:bg-primary-soft disabled:cursor-wait disabled:opacity-80"
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden="true" />
            </button>
          </div>
        }
      />

      <PriceTrendChart data={data} height={compact ? 148 : 196} />

      <div className={cn("grid gap-2", compact ? "grid-cols-1 sm:grid-cols-3" : "md:grid-cols-3")}>
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
