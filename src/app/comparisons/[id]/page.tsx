"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  GitCompareArrows,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  IconBox,
  ModuleHeader,
  PriceCell,
} from "@/components/common";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { emitMockToast } from "@/hooks/useMockToast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Risk = "low" | "medium" | "high" | "critical";
type Quote = {
  id: string;
  supplier_id: string;
  quoted_amount: number;
  currency: string;
  rank: number;
  commercial_score: number;
  technical_score: number;
  delivery_score: number;
  total_score: number;
  ai_recommendation: string | null;
  risk_level: Risk;
  is_recommended: boolean;
  is_selected: boolean;
  wpi_suppliers?: { name?: string; region?: string | null } | null;
};
type Comparison = {
  id: string;
  inquiry_id: string;
  comparison_code: string;
  status: string;
  currency: string;
  lowest_amount: number;
  highest_amount: number;
  spread_rate: number;
  ai_confidence: number | null;
  risk_level: Risk;
  summary: string | null;
  selected_supplier_id: string | null;
  wpi_inquiries?: {
    inquiry_code?: string;
    subject?: string;
    deadline?: string | null;
    status?: string;
  } | null;
  wpi_comparison_quotes?: Quote[];
};

function apiError(payload: unknown, fallback: string) {
  return payload && typeof payload === "object" && "error" in payload
    ? String((payload as { error?: string }).error || fallback)
    : fallback;
}

export default function ComparisonDetailPage() {
  const params = useParams<{ id: string }>();
  const comparisonId = decodeURIComponent(params?.id ?? "");
  const [data, setData] = useState<Comparison | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/comparisons/${encodeURIComponent(comparisonId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        data?: Comparison;
        error?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "比价结果读取失败");
      setData(payload.data);
      setSelectedSupplierId(
        payload.data.selected_supplier_id ||
          payload.data.wpi_comparison_quotes?.find((item) => item.is_selected)
            ?.supplier_id ||
          "",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "比价结果读取失败");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [comparisonId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!data?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`comparison-${data.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wpi_comparisons",
          filter: `id=eq.${data.id}`,
        },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wpi_comparison_quotes",
          filter: `comparison_id=eq.${data.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [data?.id, load]);

  const quotes = useMemo(
    () =>
      [...(data?.wpi_comparison_quotes ?? [])].sort((a, b) => a.rank - b.rank),
    [data],
  );
  const selected =
    quotes.find((item) => item.supplier_id === selectedSupplierId) ?? null;
  const selectedRiskExplanation = selected
    ? selected.risk_level === "critical"
      ? "存在严重风险，必须暂停采用并核验报价真实性、履约能力和关键商务条款。"
      : selected.risk_level === "high"
        ? "风险较高，采用前必须补充来源证据，并复核交期、付款和价格有效期。"
        : selected.risk_level === "medium"
          ? "存在中等风险，建议确认交付边界、报价有效期和技术偏差后再决策。"
          : "当前规则未发现显著风险，仍需人工确认技术响应和最终商务条款。"
    : "选择供应商后显示对应风险说明。";
  const selectedRecommendationReason = selected
    ? selected.ai_recommendation ||
      `当前排名第 ${selected.rank}，综合得分 ${selected.total_score}；商务 ${selected.commercial_score} 分、技术 ${selected.technical_score} 分、交期 ${selected.delivery_score} 分。`
    : "选择一条报价后查看推荐依据。";

  async function saveDecision() {
    if (!selectedSupplierId)
      return emitMockToast({
        title: "请选择采用供应商",
        description: "人工决策必须明确选择一个真实报价方案。",
        tone: "warning",
      });
    setBusy("decision");
    try {
      const response = await fetch(
        `/api/comparisons/${encodeURIComponent(comparisonId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: selectedSupplierId,
            note: decisionNote,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(apiError(payload, "决策保存失败"));
      emitMockToast({
        title: "人工采用方案已保存",
        description: "比价状态已变更为已决策，并写入询价审计时间线。",
        tone: "success",
      });
      await load();
    } catch (cause) {
      emitMockToast({
        title: "决策未保存",
        description: cause instanceof Error ? cause.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setBusy("");
    }
  }

  async function runAi() {
    if (!data) return;
    setBusy("ai");
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "comparison_analysis",
          title: `${data.comparison_code} AI比价复核`,
          sourceLabel: "真实比价详情",
          businessObjectType: "comparison",
          businessObjectId: data.id,
          businessHref: `/comparisons/${data.comparison_code}`,
          idempotencyKey: `comparison-review:${data.id}:${quotes.map((item) => `${item.supplier_id}:${item.quoted_amount}`).join("|")}`,
          input: {
            comparisonCode: data.comparison_code,
            quotes,
            instruction:
              "复核价格、技术、交期与风险，仅输出辅助建议，最终由人工决策。",
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(apiError(payload, "AI任务创建失败"));
      emitMockToast({
        title: "AI比价复核已入队",
        description: "执行进度与人工复核状态可在 AI 工作台查看。",
        tone: "ai",
      });
    } catch (cause) {
      emitMockToast({
        title: "AI比价未执行",
        description:
          cause instanceof Error ? cause.message : "请检查 AI Provider",
        tone: "danger",
      });
    } finally {
      setBusy("");
    }
  }

  const summaryCards = data
    ? [
        {
          label: "参与报价",
          value: quotes.length,
          unit: "家",
          icon: UsersRound,
          tone: "blue" as const,
        },
        {
          label: "最低报价",
          value: Number(data.lowest_amount).toLocaleString(),
          unit: data.currency,
          icon: CircleDollarSign,
          tone: "green" as const,
        },
        {
          label: "最高报价",
          value: Number(data.highest_amount).toLocaleString(),
          unit: data.currency,
          icon: ShieldAlert,
          tone: "red" as const,
        },
        {
          label: "报价价差",
          value: Number(data.spread_rate).toFixed(1),
          unit: "%",
          icon: GitCompareArrows,
          tone: "orange" as const,
        },
      ]
    : [];

  return (
    <AppLayout>
      <div className="space-y-3 pb-6" data-no-global-interaction>
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/inquiries"
              className="inline-flex items-center gap-1 text-[12px] font-bold text-primary"
            >
              <ArrowLeft className="size-4" />
              返回询价管理
            </Link>
            <h1 className="mt-2 text-[24px] font-bold">真实报价比价详情</h1>
            <p className="mt-1 text-[13px] text-textMuted">
              供应商报价、评分、风险与人工采用结果均来自 Supabase。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              刷新
            </button>
            <button
              type="button"
              onClick={() => void runAi()}
              disabled={!data || busy !== ""}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-3 text-[12px] font-bold text-white disabled:opacity-45"
            >
              <Sparkles className="size-4" />
              AI复核
            </button>
          </div>
        </header>
        {loading ? (
          <section className="flex min-h-[420px] items-center justify-center gap-2 rounded-card border border-borderSoft bg-white">
            <LoaderCircle className="size-5 animate-spin text-primary" />
            正在读取真实比价结果
          </section>
        ) : error ? (
          <EmptyState
            title="比价结果尚未生成"
            description={`${error}。请返回询价管理，至少回填两家同币种真实报价后点击“生成真实比价”。`}
            primaryAction={
              <Link
                href="/inquiries"
                className="rounded-md bg-primary px-4 py-2 text-[12px] font-bold text-white"
              >
                返回询价管理
              </Link>
            }
          />
        ) : data ? (
          <>
            <section className="rounded-card border border-primary/15 bg-gradient-to-r from-primary-soft to-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <IconBox icon={GitCompareArrows} tone="blue" size="md" />
                  <div>
                    <b className="text-[16px]">{data.comparison_code}</b>
                    <p className="text-[12px] text-textMuted">
                      {data.wpi_inquiries?.subject || "询价任务"} ·{" "}
                      {data.wpi_inquiries?.inquiry_code}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge level={data.risk_level} />
                  <span className="rounded-pill border border-ai-border bg-ai-soft px-3 py-1 text-[11px] font-bold text-ai">
                    AI置信度 {data.ai_confidence ?? 0}%
                  </span>
                </div>
              </div>
            </section>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => (
                <section
                  key={item.label}
                  className="rounded-card border border-borderSoft bg-white p-3 shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-textMuted">
                        {item.label}
                      </p>
                      <p className="mt-1 text-[24px] font-black">
                        {item.value}{" "}
                        <span className="text-[11px]">{item.unit}</span>
                      </p>
                    </div>
                    <IconBox icon={item.icon} tone={item.tone} size="md" />
                  </div>
                </section>
              ))}
            </div>
            <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
              <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
                <div className="border-b border-borderSoft px-3 py-2.5">
                  <ModuleHeader
                    icon={Trophy}
                    title="供应商真实报价排名"
                    subtitle="评分基于价格、技术、交期与风险规则，最终选择必须人工确认"
                    density="compact"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[920px] w-full text-[12px]">
                    <thead className="bg-slate-50">
                      <tr className="h-10">
                        {[
                          "选择",
                          "排名",
                          "供应商",
                          "地区",
                          "报价金额",
                          "商务分",
                          "技术分",
                          "交期分",
                          "总分",
                          "风险",
                          "AI建议",
                        ].map((label) => (
                          <th key={label} className="px-3 text-left">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => (
                        <tr
                          key={quote.id}
                          onClick={() =>
                            setSelectedSupplierId(quote.supplier_id)
                          }
                          className={cn(
                            "h-12 cursor-pointer border-t border-borderSoft",
                            selectedSupplierId === quote.supplier_id &&
                              "bg-primary-soft/60",
                          )}
                        >
                          <td className="px-3">
                            <input
                              type="radio"
                              checked={selectedSupplierId === quote.supplier_id}
                              onChange={() =>
                                setSelectedSupplierId(quote.supplier_id)
                              }
                            />
                          </td>
                          <td className="px-3 font-black text-primary">
                            #{quote.rank}
                          </td>
                          <td className="px-3 font-bold">
                            {quote.wpi_suppliers?.name || quote.supplier_id}
                          </td>
                          <td className="px-3 text-textMuted">
                            {quote.wpi_suppliers?.region || "-"}
                          </td>
                          <td className="px-3">
                            <PriceCell
                              value={quote.quoted_amount}
                              currency={quote.currency}
                            />
                          </td>
                          <td className="px-3 font-bold">
                            {quote.commercial_score}
                          </td>
                          <td className="px-3 font-bold">
                            {quote.technical_score}
                          </td>
                          <td className="px-3 font-bold">
                            {quote.delivery_score}
                          </td>
                          <td className="px-3 text-[15px] font-black text-primary">
                            {quote.total_score}
                          </td>
                          <td className="px-3">
                            <RiskBadge
                              level={quote.risk_level}
                              className="h-5 text-[10px]"
                            />
                          </td>
                          <td className="max-w-[220px] px-3">
                            <p className="line-clamp-2 text-[11px] text-textSecondary">
                              {quote.ai_recommendation || "等待AI复核"}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <aside className="space-y-3">
                <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-4 shadow-card">
                  <ModuleHeader
                    icon={Bot}
                    title="AI比价结论"
                    tone="purple"
                    density="compact"
                  />
                  <p className="mt-3 rounded-md border-l-4 border-ai bg-white p-3 text-[12px] leading-6 text-textSecondary">
                    {data.summary ||
                      "真实报价已完成归一计算，等待 AI 复核与人工决策。"}
                  </p>
                  <div className="mt-3 rounded-md bg-warning-soft p-3 text-[11px] text-warning">
                    AI仅提供辅助评分，不直接确认中标或合格供应商。
                  </div>
                </section>
                <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
                  <ModuleHeader
                    icon={Trophy}
                    title="推荐依据与风险"
                    subtitle={selected?.wpi_suppliers?.name || "请选择供应商"}
                    density="compact"
                  />
                  <div className="mt-3 space-y-3">
                    <div className="rounded-md border border-primary/10 bg-primary-soft/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-primary">推荐理由</p>
                        {selected?.is_recommended ? (
                          <span className="rounded-pill bg-success-soft px-2 py-1 text-[10px] font-bold text-success">AI推荐</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[12px] leading-6 text-textSecondary">{selectedRecommendationReason}</p>
                    </div>
                    <div className="rounded-md border border-warning/20 bg-warning-soft/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-warning">风险说明</p>
                        {selected ? <RiskBadge level={selected.risk_level} className="h-5 text-[10px]" /> : null}
                      </div>
                      <p className="mt-1 text-[12px] leading-6 text-textSecondary">{selectedRiskExplanation}</p>
                    </div>
                  </div>
                </section>
                <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
                  <ModuleHeader
                    icon={CheckCircle2}
                    title="人工采用方案"
                    density="compact"
                  />
                  <p className="mt-3 text-[12px] font-bold">
                    当前选择：{selected?.wpi_suppliers?.name || "尚未选择"}
                  </p>
                  <textarea
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="填写价格、技术、交期和谈判条件等人工决策说明"
                    className="mt-3 min-h-24 w-full rounded-md border border-borderSoft p-3 text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => void saveDecision()}
                    disabled={busy !== "" || !selectedSupplierId}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-success text-[12px] font-bold text-white disabled:opacity-45"
                  >
                    {busy === "decision" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    确认采用方案
                  </button>
                  {data.status === "decided" ? (
                    <Link
                      href={`/project-pricing?source=comparison&comparisonId=${encodeURIComponent(data.comparison_code)}&inquiryId=${encodeURIComponent(data.wpi_inquiries?.inquiry_code || "")}&supplierId=${encodeURIComponent(data.selected_supplier_id || "")}`}
                      className="mt-2 flex h-9 items-center justify-center rounded-md border border-primary/20 bg-primary-soft text-[12px] font-bold text-primary"
                    >
                      进入项目套价
                    </Link>
                  ) : null}
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
