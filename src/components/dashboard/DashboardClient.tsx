"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/common";
import type { DashboardPayload } from "@/data/mock/dashboard";
import { DashboardHero } from "./DashboardHero";
import { DashboardMainGrid } from "./DashboardMainGrid";
import { DashboardStatGrid } from "./DashboardStatGrid";
import { QuickActionBar } from "./QuickActionBar";

export function DashboardClient() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const rangeRef = useRef<7 | 30 | 90>(30);

  const load = useCallback(async (silent = false, requestedRange: 7 | 30 | 90 = rangeRef.current) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?range=${requestedRange}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.data) throw new Error(payload.error || "首页数据读取失败");
      setData(payload.data);
      rangeRef.current = payload.data.rangeDays;
      setRangeDays(payload.data.rangeDays);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "首页数据读取失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const refreshWhenVisible = () => {
      if (!document.hidden) void load(true);
    };
    const interval = window.setInterval(refreshWhenVisible, 120_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <EmptyState
        title="首页数据加载失败"
        description={error || "当前组织没有返回有效业务数据。"}
        primaryAction={<button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-white"><RefreshCw className="size-4" />重新加载</button>}
      />
    );
  }

  return (
    <div className="-mx-2 -my-1 flex flex-col gap-3" aria-busy={refreshing}>
      <DashboardHero data={data.hero} refreshing={refreshing} onRefresh={() => void load(true)} />
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-warning/20 bg-warning-soft px-3 py-2 text-[11px] font-semibold text-warning" role="status">
          <span className="min-w-0 truncate">自动刷新失败，当前仍显示上一次成功数据：{error}</span>
          <button type="button" onClick={() => void load(true)} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-warning/25 bg-white px-2 text-warning transition hover:bg-warning-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-warning/30">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            重试
          </button>
        </div>
      ) : null}
      <DashboardStatGrid data={data.stats} />
      <QuickActionBar data={data.quickActions} />
      <DashboardMainGrid
        aiWorkbenchOverview={data.aiWorkbenchOverview}
        priceTrendData={data.priceTrendData}
        trendSummaries={data.trendSummaries}
        latestPriceUpdates={data.latestPriceUpdates}
        pendingReviewTasks={data.pendingReviewTasks}
        aiInsightCards={data.aiInsightCards}
        distributionAnalyses={data.distributionAnalyses}
        riskAlerts={data.riskAlerts}
        businessFlow={data.businessFlow}
        rangeDays={rangeDays}
        trendRefreshing={refreshing}
        onRangeChange={(range) => void load(true, range)}
        onTrendRefresh={() => void load(true)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="-mx-2 -my-1 flex flex-col gap-3 motion-safe:animate-pulse" aria-busy="true" aria-label="正在汇总真实业务数据">
      <span className="sr-only">正在汇总真实业务数据</span>
      <div className="h-[66px] rounded-card border border-borderSoft bg-white shadow-card" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6 lg:gap-2.5">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[104px] rounded-card border border-borderSoft bg-white shadow-card" />)}
      </div>
      <div className="rounded-card border border-borderSoft bg-white p-2 shadow-card">
        <div className="mb-2 h-7 w-48 rounded-md bg-slate-100" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[58px] rounded-[11px] bg-slate-100" />)}
        </div>
      </div>
      <div className="h-[150px] rounded-card border border-borderSoft bg-white shadow-card" />
      <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="h-[250px] rounded-card border border-borderSoft bg-white shadow-card" />
        <div className="h-[250px] rounded-card border border-borderSoft bg-white shadow-card" />
      </div>
    </div>
  );
}
