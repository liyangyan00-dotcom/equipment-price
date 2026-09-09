import Link from "next/link";
import { Clock3, DatabaseZap, RefreshCw, Sparkles } from "lucide-react";
import type { DashboardHeroData } from "@/data/mock/dashboard";

type DashboardHeroProps = {
  data: DashboardHeroData;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function DashboardHero({ data, refreshing = false, onRefresh }: DashboardHeroProps) {
  return (
    <section className="flex min-h-[66px] flex-col justify-between gap-1.5 rounded-card border border-ai-border bg-[linear-gradient(120deg,rgba(232,242,255,0.82),rgba(255,255,255,0.94)_48%,rgba(245,243,255,0.9))] px-4 py-1.5 shadow-card lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 inline-flex items-center gap-2 rounded-pill border border-ai-border bg-white/72 px-2.5 py-0.5 text-[11px] font-semibold text-ai">
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI 价格情报工作台
        </div>
        <h1 className="text-[19px] font-semibold leading-6 text-textMain">AI增强价格情报首页</h1>
        <p className="text-[11.5px] leading-4 text-textSecondary">
          汇总设备、地材、供应商、AI识别、风险预警与人工复核任务。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 lg:max-w-[535px] lg:flex-nowrap lg:justify-end">
        <div className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-pill border border-primary-soft bg-white/76 px-2.5 text-[11px] font-semibold text-textSecondary">
          <DatabaseZap className="size-4 text-primary" aria-hidden="true" />
          <span className="truncate">{data.aiTaskStatus}</span>
        </div>
        <div className="inline-flex h-6 items-center gap-1.5 rounded-pill border border-borderSoft bg-white/76 px-2.5 text-[11px] font-semibold text-textSecondary">
          <Clock3 className="size-4 text-textMuted" aria-hidden="true" />
          更新 {data.updatedAt}
        </div>
        {onRefresh ? (
          <button type="button" onClick={onRefresh} disabled={refreshing} title="刷新首页数据" aria-label="刷新首页数据" className="inline-flex size-6 items-center justify-center rounded-pill border border-borderSoft bg-white/76 text-primary transition hover:bg-primary-soft disabled:opacity-60">
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        ) : null}
        <Link
          href="/ai-workbench"
          className="inline-flex h-6 items-center gap-1.5 rounded-pill bg-ai px-3 text-[11px] font-semibold text-white shadow-ai transition hover:bg-[#6D28D9]"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          进入 AI 工作台
        </Link>
      </div>
    </section>
  );
}
