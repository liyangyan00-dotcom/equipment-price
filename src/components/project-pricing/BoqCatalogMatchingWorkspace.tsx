"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  GitCompareArrows,
  LoaderCircle,
  PackagePlus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AiBadge, ConfidenceBadge } from "@/components/badges";
import { EmptyState, ModuleHeader } from "@/components/common";
import { emitMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type {
  BoqCatalogCandidate,
  BoqCatalogMatchItem,
  BoqCatalogMatchingPayload,
} from "@/types/boqCatalogMatching";

type ProjectPricingResponse = {
  data?: { project?: { id: string } } | null;
  error?: string;
};

function confidenceLevel(value: number) {
  if (value >= 90) return "A" as const;
  if (value >= 80) return "B" as const;
  if (value >= 70) return "C" as const;
  if (value >= 60) return "D" as const;
  return "E" as const;
}

function matchLabel(item: BoqCatalogMatchItem) {
  if (item.equipment_catalog_id && item.catalog_match_status === "needs_review") return "新档案待审核";
  if (item.equipment_catalog_id) return "已人工确认";
  if (item.candidates.some((candidate) => candidate.decision === "suggested")) return "候选待确认";
  return "尚未匹配";
}

export function BoqCatalogMatchingWorkspace() {
  const [payload, setPayload] = useState<BoqCatalogMatchingPayload | null>(null);
  const [projectId, setProjectId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const loadMatches = useCallback(async (id: string) => {
    const response = await fetch(`/api/project-pricing/${id}/catalog-matches`, { cache: "no-store" });
    const result = await response.json() as { data?: BoqCatalogMatchingPayload; error?: string };
    if (!response.ok || !result.data) throw new Error(result.error || "设备资料匹配加载失败");
    setPayload(result.data);
    setSelectedItemId((current) =>
      result.data?.items.some((item) => item.id === current) ? current : result.data?.items[0]?.id ?? "",
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const projectResponse = await fetch("/api/project-pricing", { cache: "no-store" });
        const projectResult = await projectResponse.json() as ProjectPricingResponse;
        const id = projectResult.data?.project?.id;
        if (!projectResponse.ok || !id) throw new Error(projectResult.error || "暂无可用于匹配的真实 BOQ 项目");
        setProjectId(id);
        await loadMatches(id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "设备资料匹配加载失败");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMatches]);

  const selectedItem = useMemo(
    () => payload?.items.find((item) => item.id === selectedItemId) ?? payload?.items[0] ?? null,
    [payload, selectedItemId],
  );
  const visibleCandidates = useMemo(
    () => selectedItem?.candidates.filter((candidate) => candidate.decision !== "rejected") ?? [],
    [selectedItem],
  );
  const selectedCandidate = useMemo(
    () => visibleCandidates.find((candidate) => candidate.id === selectedMatchId) ?? visibleCandidates[0] ?? null,
    [selectedMatchId, visibleCandidates],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setSelectedMatchId(visibleCandidates[0]?.id ?? ""), 0);
    return () => window.clearTimeout(timer);
  }, [selectedItemId, visibleCandidates]);

  async function generateCandidates(itemId?: string) {
    if (!projectId || running) return;
    setRunning(true);
    try {
      const response = await fetch(`/api/project-pricing/${projectId}/catalog-matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemId ? { itemId } : {}),
      });
      const result = await response.json() as { data?: BoqCatalogMatchingPayload; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "候选匹配生成失败");
      setPayload(result.data);
      emitMockToast({ title: "设备资料候选已更新", description: itemId ? "当前 BOQ 行已重新计算候选。" : "全部设备行已完成候选计算。", tone: "success" });
    } catch (actionError) {
      emitMockToast({ title: "候选匹配失败", description: actionError instanceof Error ? actionError.message : "请稍后重试", tone: "warning" });
    } finally {
      setRunning(false);
    }
  }

  async function performAction(action: "accept" | "reject" | "create_catalog", match?: BoqCatalogCandidate) {
    if (!projectId || !selectedItem || running) return;
    setRunning(true);
    try {
      const response = await fetch(`/api/project-pricing/${projectId}/items/${selectedItem.id}/catalog-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, matchId: match?.id, notes: action === "accept" ? "BOQ 解析工作台人工确认" : undefined }),
      });
      const result = await response.json() as { data?: BoqCatalogMatchingPayload; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "匹配操作失败");
      setPayload(result.data);
      emitMockToast({
        title: action === "accept" ? "设备资料匹配已确认" : action === "reject" ? "候选已排除" : "新设备档案已创建",
        description: action === "create_catalog" ? "新档案进入待人工审核，不会直接用于最终商务判断。" : "操作已写入真实审核链。",
        tone: "success",
      });
    } catch (actionError) {
      emitMockToast({ title: "操作失败", description: actionError instanceof Error ? actionError.message : "请稍后重试", tone: "warning" });
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-card border border-ai-border bg-white p-6 shadow-card">
        <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-ai"><LoaderCircle className="size-4 animate-spin" />正在读取真实 BOQ 与设备资料库…</div>
      </section>
    );
  }

  if (error || !payload) {
    return (
      <section className="rounded-card border border-danger/25 bg-white p-4 shadow-card">
        <EmptyState title="设备资料匹配暂不可用" description={error || "未找到项目套价数据"} />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-card border border-ai-border bg-white shadow-card">
      <ModuleHeader
        icon={GitCompareArrows}
        title="设备资料智能匹配"
        subtitle={`${payload.project.project_code} · BOQ 设备行标准化、候选比对与人工确认`}
        tone="purple"
        density="compact"
        action={(
          <>
            <AiBadge label="AI 推荐 · 人工定案" />
            <button data-no-global-interaction type="button" disabled={running || !payload.permissions.canWrite} onClick={() => void generateCandidates()} className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-ai px-3 text-[12px] font-bold text-white disabled:opacity-50">
              {running ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}重新匹配全部
            </button>
          </>
        )}
      />
      <div className="grid grid-cols-2 gap-px border-b border-borderSoft bg-borderSoft sm:grid-cols-5">
        {[
          { label: "设备行", value: payload.summary.equipmentItems, tone: "text-primary" },
          { label: "已有候选", value: payload.summary.candidatesReady, tone: "text-ai" },
          { label: "人工确认", value: payload.summary.confirmed, tone: "text-success" },
          { label: "待复核", value: payload.summary.needsReview, tone: "text-warning" },
          { label: "无匹配", value: payload.summary.unmatched, tone: "text-danger" },
        ].map((item) => (
          <div key={item.label} className="bg-white px-3 py-2 text-center">
            <div className={cn("text-[18px] font-extrabold", item.tone)}>{item.value}</div>
            <div className="text-[11px] text-textMuted">{item.label}</div>
          </div>
        ))}
      </div>

      {payload.items.length ? (
        <div className="grid min-h-[390px] lg:grid-cols-[300px_minmax(0,1fr)_310px]">
          <div className="border-r border-borderSoft bg-slate-50/60 p-3">
            <div className="mb-2 text-[12px] font-bold text-textSecondary">BOQ 设备行</div>
            <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
              {payload.items.map((item) => (
                <button key={item.id} data-no-global-interaction type="button" onClick={() => setSelectedItemId(item.id)} className={cn("w-full rounded-md border p-2.5 text-left transition", selectedItem?.id === item.id ? "border-primary bg-primary-soft" : "border-borderSoft bg-white hover:border-primary/30")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-bold text-textMain">{item.item_name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-textMuted">{item.boq_code} · {item.specification || "未提供规格"}</div>
                    </div>
                    <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-textMuted" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-textMuted">候选 {item.candidates.filter((candidate) => candidate.decision !== "rejected").length} 条</span>
                    <span className={cn("font-bold", item.equipment_catalog_id ? "text-success" : item.candidates.length ? "text-warning" : "text-danger")}>{matchLabel(item)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-borderSoft pb-3">
              <div>
                <div className="text-[15px] font-bold text-textMain">{selectedItem?.item_name}</div>
                <div className="mt-1 text-[11px] text-textMuted">需求规格：{selectedItem?.specification || "未提供"} · 数量 {selectedItem?.quantity} {selectedItem?.unit}</div>
              </div>
              <button data-no-global-interaction type="button" disabled={running} onClick={() => selectedItem && void generateCandidates(selectedItem.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-primary/25 bg-primary-soft px-3 text-[11px] font-bold text-primary disabled:opacity-50">
                <RefreshCw className="size-3.5" />重新计算当前行
              </button>
            </div>

            {visibleCandidates.length ? (
              <div className="mt-3 grid gap-2 xl:grid-cols-3">
                {visibleCandidates.map((candidate) => (
                  <button key={candidate.id} data-no-global-interaction type="button" onClick={() => setSelectedMatchId(candidate.id)} className={cn("min-w-0 rounded-md border p-3 text-left", selectedCandidate?.id === candidate.id ? "border-ai bg-ai-soft shadow-ai" : "border-borderSoft bg-white hover:border-ai/35")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-ai px-1.5 py-0.5 text-[10px] font-bold text-white">候选 {candidate.candidate_rank}</span>
                      <ConfidenceBadge
                        level={confidenceLevel(candidate.confidence)}
                        label={`${Math.round(candidate.confidence)}%`}
                        className="h-5 px-1.5 text-[10px]"
                      />
                    </div>
                    <div className="mt-2 truncate text-[13px] font-bold text-textMain">{candidate.catalog?.equipment_name || "设备资料"}</div>
                    <div className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-textMuted">{candidate.catalog?.brand} {candidate.catalog?.model} · {candidate.catalog?.specification || "暂无规格"}</div>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-[10px] text-textMuted">综合匹配</span>
                      <strong className="text-[20px] text-ai">{candidate.overall_score}%</strong>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-purple-100"><div className="h-full rounded-full bg-ai" style={{ width: `${candidate.overall_score}%` }} /></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3"><EmptyState title="当前行还没有候选设备" description="可重新计算候选，或由人工创建一条新的设备档案。" /></div>
            )}

            {selectedCandidate ? (
              <div className="mt-3 rounded-md border border-ai-border bg-ai-soft/50 p-3">
                <div className="flex items-center gap-2 text-[12px] font-bold text-ai"><Bot className="size-4" />AI 匹配理由</div>
                <p className="mt-1.5 text-[11px] leading-5 text-textSecondary">{selectedCandidate.match_reason.summary}</p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                  {selectedCandidate.match_reason.signals?.map((signal) => <div key={signal} className="rounded border border-ai-border bg-white px-2 py-1.5 text-[10px] font-semibold text-textSecondary">{signal}</div>)}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="border-l border-borderSoft bg-slate-50/50 p-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-textMain"><ShieldCheck className="size-4 text-success" />人工确认工作区</div>
            {selectedCandidate ? (
              <>
                <div className="mt-3 space-y-2">
                  {selectedCandidate.parameter_differences.map((entry) => (
                    <div key={entry.field} className={cn("rounded-md border p-2", entry.status === "matched" ? "border-success/25 bg-success-soft" : "border-warning/25 bg-warning-soft")}>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-textMain">{entry.status === "matched" ? <CheckCircle2 className="size-3.5 text-success" /> : <CircleAlert className="size-3.5 text-warning" />}{entry.field}</div>
                      <div className="mt-1 text-[10px] leading-4 text-textMuted">需求：{entry.requirement}</div>
                      <div className="text-[10px] leading-4 text-textSecondary">候选：{entry.candidate}</div>
                    </div>
                  ))}
                </div>
                <Link data-no-global-interaction href={`/equipment-catalog/${selectedCandidate.equipment_catalog_id}`} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary">查看完整设备档案 <ChevronRight className="size-3.5" /></Link>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button data-no-global-interaction type="button" disabled={running || !payload.permissions.canWrite} onClick={() => void performAction("accept", selectedCandidate)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-success text-[11px] font-bold text-white disabled:opacity-50"><Check className="size-3.5" />确认匹配</button>
                  <button data-no-global-interaction type="button" disabled={running || !payload.permissions.canWrite} onClick={() => void performAction("reject", selectedCandidate)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-danger/25 bg-danger-soft text-[11px] font-bold text-danger disabled:opacity-50"><X className="size-3.5" />排除候选</button>
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-md border border-dashed border-borderSoft bg-white p-4 text-center text-[11px] leading-5 text-textMuted">没有可确认的候选。人工创建的新档案仍会进入资料审核流程。</div>
            )}
            <button data-no-global-interaction type="button" disabled={running || !payload.permissions.canWrite || Boolean(selectedItem?.equipment_catalog_id)} onClick={() => void performAction("create_catalog")} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-primary/25 bg-white text-[11px] font-bold text-primary disabled:opacity-40"><PackagePlus className="size-3.5" />创建新设备档案</button>
            <div className="mt-3 rounded-md border border-warning/25 bg-warning-soft p-2.5 text-[10px] leading-4 text-textSecondary"><strong className="text-warning">商务边界：</strong>AI 分数只用于排序。参数缺失、冲突或新建档案必须由人工审核，确认资料关系也不会自动采用价格。</div>
          </aside>
        </div>
      ) : (
        <div className="p-5"><EmptyState title="当前项目没有设备类 BOQ 行" description="上传并解析 BOQ 后，设备类行项目会进入资料匹配。" /></div>
      )}
    </section>
  );
}
