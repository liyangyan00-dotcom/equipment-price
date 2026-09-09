"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, LoaderCircle, RefreshCw, Send, Sparkles } from "lucide-react";
import type { GapInquiryPackage } from "@/lib/projectPricing/gapInquiryPlan";
import { cn } from "@/lib/utils";

type GapPlanPayload = {
  packages: GapInquiryPackage[];
  summary: {
    eligibleItemCount: number;
    packageCount: number;
    supplierCandidateCount: number;
    unassignedPackageCount: number;
  };
  generatedAt: string;
  requiresHumanReview: true;
};

function createPackageHref(projectId: string, group: GapInquiryPackage) {
  const params = new URLSearchParams({
    source: "project-pricing-gap-plan",
    pricingId: projectId,
    boqItemIds: group.itemIds.join(","),
    supplierIds: group.suppliers.map((supplier) => supplier.supplierId).join(","),
    packageName: group.packageName,
    responseDays: String(group.responseDays),
    returnTo: `/project-pricing?view=gaps&projectId=${encodeURIComponent(projectId)}`,
  });
  return `/inquiries/create?${params.toString()}`;
}

const riskStyle = {
  low: "bg-success-soft text-success",
  medium: "bg-warning-soft text-warning",
  high: "bg-danger-soft text-danger",
  critical: "bg-danger text-white",
};

export function ProjectPricingGapPlan({ projectId }: { projectId: string }) {
  const [data, setData] = useState<GapPlanPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/project-pricing/${encodeURIComponent(projectId)}/gap-inquiry-plan`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "询价编排读取失败");
      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "询价编排读取失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <section className="rounded-card border border-ai-border bg-white shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-borderSoft px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ai-soft text-ai"><Sparkles className="size-4" /></span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-textMain">AI 缺口询价编排</h2>
            <p className="mt-1 text-[11px] text-textMuted">按采购市场拆分询价包，并从已准入供应商中推荐候选；推荐结果须人工确认。</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-bold text-primary disabled:opacity-50">
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}刷新方案
        </button>
      </header>

      {loading ? <div className="flex min-h-28 items-center justify-center gap-2 text-[12px] text-textMuted"><LoaderCircle className="size-4 animate-spin" />正在读取真实供应商库</div> : null}
      {!loading && error ? <div className="m-3 flex items-center gap-2 rounded-md border border-danger/20 bg-danger-soft px-3 py-3 text-[12px] text-danger"><AlertTriangle className="size-4" />{error}</div> : null}
      {!loading && data ? (
        <div className="p-3">
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-textSecondary">
            <span><strong className="text-textMain">{data.summary.eligibleItemCount}</strong> 项待询价</span>
            <span><strong className="text-textMain">{data.summary.packageCount}</strong> 个询价包</span>
            <span><strong className="text-textMain">{data.summary.supplierCandidateCount}</strong> 家候选供应商</span>
            {data.summary.unassignedPackageCount ? <span className="font-bold text-warning">{data.summary.unassignedPackageCount} 个询价包缺少已准入供应商</span> : <span className="inline-flex items-center gap-1 font-bold text-success"><CheckCircle2 className="size-3.5" />候选覆盖完整</span>}
          </div>
          {data.packages.length ? <div className="grid gap-3 lg:grid-cols-3">{data.packages.map((group) => (
            <article key={group.id} className="min-w-0 rounded-md border border-borderSoft bg-slate-50/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="text-[13px] font-bold text-textMain">{group.label}询价包</h3><p className="mt-1 text-[10px] text-textMuted">{group.itemCount} 项 · 建议 {group.responseDays} 天内回复</p></div>
                {group.highRiskCount ? <span className="rounded-pill bg-danger-soft px-2 py-1 text-[10px] font-bold text-danger">高风险 {group.highRiskCount}</span> : null}
              </div>
              <div className="mt-3 space-y-2">
                {group.suppliers.length ? group.suppliers.map((supplier) => (
                  <div key={supplier.supplierId} className="rounded-md border border-borderSoft bg-white px-2.5 py-2">
                    <div className="flex min-w-0 items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] font-bold"><Building2 className="size-3.5 shrink-0 text-primary" />{supplier.supplierName}</span><span className="shrink-0 text-[11px] font-bold text-ai">{supplier.confidence}%</span></div>
                    <div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-textMuted" title={supplier.reason}>{supplier.reason}</span><span className={cn("shrink-0 rounded-pill px-1.5 py-0.5 text-[9px] font-bold", riskStyle[supplier.riskLevel])}>{supplier.riskLevel === "low" ? "低风险" : supplier.riskLevel === "medium" ? "中风险" : "高风险"}</span></div>
                  </div>
                )) : <div className="rounded-md border border-warning/20 bg-warning-soft p-2 text-[11px] leading-5 text-warning">没有匹配的已准入供应商，请先到供应商库补充或完成人工准入。</div>}
              </div>
              <Link href={createPackageHref(projectId, group)} className={cn("mt-3 flex min-h-10 items-center justify-center gap-2 rounded-md text-[11px] font-bold", group.suppliers.length ? "bg-primary text-white" : "pointer-events-none bg-slate-200 text-textMuted")}><Send className="size-3.5" />按此方案创建询价</Link>
            </article>
          ))}</div> : <div className="flex min-h-24 items-center justify-center text-[12px] text-success"><CheckCircle2 className="mr-2 size-4" />当前没有待创建询价的价格缺口</div>}
        </div>
      ) : null}
    </section>
  );
}
