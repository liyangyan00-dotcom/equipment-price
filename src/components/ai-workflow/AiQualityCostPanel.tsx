"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/common/EmptyState";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { cn } from "@/lib/utils";
import type { AiQualityCostAnalyticsResponse } from "@/types/aiExecution";

const rangeOptions = [7, 30, 90] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function formatCost(value: number) {
  if (!value) return "$0.00";
  return `$${value < 0.01 ? value.toFixed(6) : value.toFixed(4)}`;
}

function formatLatency(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Activity;
  tone: IconBoxTone;
}) {
  const toneClass: Record<IconBoxTone, string> = {
    blue: "from-primary-soft/75 to-white text-primary",
    cyan: "from-cyan-50 to-white text-cyan-700",
    purple: "from-ai-soft/80 to-white text-ai",
    orange: "from-warning-soft/80 to-white text-warning",
    red: "from-danger-soft/80 to-white text-danger",
    green: "from-success-soft/80 to-white text-success",
    slate: "from-slate-100 to-white text-textSecondary",
  };
  return (
    <div className={cn("flex min-h-[82px] items-center gap-3 rounded-[10px] border border-borderSoft bg-gradient-to-br p-3", toneClass[tone])}>
      <IconBox icon={Icon} tone={tone} size="md" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold opacity-80">{label}</p>
        <p className="mt-1 text-[20px] font-bold leading-none">{value}</p>
        <p className="mt-1.5 truncate text-[9px] text-textMuted">{note}</p>
      </div>
    </div>
  );
}

export function AiQualityCostPanel() {
  const [days, setDays] = useState<(typeof rangeOptions)[number]>(30);
  const [data, setData] = useState<AiQualityCostAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/analytics?days=${days}`, { cache: "no-store", signal });
      const payload = await response.json() as AiQualityCostAnalyticsResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "AI质量与成本分析读取失败");
      setData(payload);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "AI质量与成本分析读取失败");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const summary = data?.summary;
  const providerRows = data?.providers.slice(0, 6) ?? [];

  return (
    <section className="overflow-hidden rounded-card border border-ai-border/70 bg-white shadow-card">
      <div className="border-b border-borderSoft bg-gradient-to-r from-ai-soft/70 via-white to-primary-soft/50 px-4 py-3">
        <ModuleHeader
          icon={BarChart3}
          tone="purple"
          title="AI质量与成本分析"
          subtitle="基于真实网关调用、人工复核、Token 与运行时费率快照"
          action={(
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 rounded-md border border-ai-border bg-white p-0.5">
                {rangeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDays(option)}
                    className={cn("rounded px-2.5 text-[10px] font-semibold transition", days === option ? "bg-ai text-white" : "text-textMuted hover:text-ai")}
                  >
                    {option}天
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => void load()} disabled={loading} title="刷新质量与成本数据" className="inline-flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:text-ai disabled:opacity-50">
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              </button>
            </div>
          )}
          density="compact"
        />
      </div>

      {error ? (
        <div className="p-4">
          <EmptyState
            title="暂时无法读取 AI 分析"
            description={error}
            primaryAction={<button type="button" onClick={() => void load()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[10px] font-semibold text-white"><RefreshCw className="size-3.5" />重新加载</button>}
          />
        </div>
      ) : loading && !data ? (
        <div className="flex min-h-[220px] items-center justify-center gap-2 text-[12px] text-textMuted"><RefreshCw className="size-4 animate-spin text-ai" />正在汇总真实 AI 运行记录...</div>
      ) : !summary || summary.totalRuns === 0 ? (
        <div className="p-4">
          <EmptyState title="当前周期暂无 AI 运行记录" description="完成首次真实 AI 执行后，这里将展示运行质量、人工复核与成本趋势。" />
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="运行质量指数" value={`${summary.qualityScore}`} note="非模型准确率" icon={Sparkles} tone="purple" />
            <MetricCard label="网关成功率" value={`${summary.successRate}%`} note={`${summary.successfulRuns}/${summary.totalRuns} 次成功返回`} icon={Activity} tone="blue" />
            <MetricCard label="人工通过率" value={`${summary.humanApprovalRate}%`} note={`${summary.approvedRuns}/${summary.reviewedRuns} 次复核通过`} icon={ShieldCheck} tone="green" />
            <MetricCard label="估算成本" value={formatCost(summary.estimatedCostUsd)} note={`${summary.pricedRuns} 次已配置费率`} icon={BadgeDollarSign} tone="cyan" />
            <MetricCard label="Token 用量" value={formatNumber(summary.totalTokens)} note={`输入 ${formatNumber(summary.promptTokens)} / 输出 ${formatNumber(summary.completionTokens)}`} icon={CheckCircle2} tone="orange" />
            <MetricCard label="平均耗时" value={formatLatency(summary.averageLatencyMs)} note={`${summary.failedRuns} 次失败 · ${summary.highRiskRuns} 次高风险`} icon={Clock3} tone={summary.failedRuns ? "red" : "slate"} />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)]">
            <div className="min-w-0 rounded-[10px] border border-borderSoft bg-slate-50/45 p-3">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="text-[12px] font-bold text-textMain">运行与成本趋势</h3><p className="mt-0.5 text-[9px] text-textMuted">柱形为执行次数，折线为估算成本（USD）</p></div>
                <span className="rounded-pill bg-ai-soft px-2 py-1 text-[9px] font-semibold text-ai">{data.scope === "organization" ? "组织口径" : "本人可见口径"}</span>
              </div>
              <div className="mt-2 h-[190px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <ComposedChart data={data.trend} margin={{ top: 10, right: 6, left: -20, bottom: 0 }} accessibilityLayer>
                    <CartesianGrid stroke="#E8EEF7" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#7B8BA3" }} tickLine={false} axisLine={false} interval={days === 90 ? 14 : days === 30 ? 4 : 0} />
                    <YAxis yAxisId="runs" allowDecimals={false} tick={{ fontSize: 9, fill: "#7B8BA3" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 9, fill: "#7B8BA3" }} tickLine={false} axisLine={false} width={38} />
                    <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#DCE5F2", fontSize: 10 }} />
                    <Bar yAxisId="runs" dataKey="runs" name="执行次数" fill="#5B8FF9" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Line yAxisId="cost" dataKey="estimatedCostUsd" name="估算成本 USD" type="monotone" stroke="#7754F6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[10px] border border-borderSoft">
              <div className="flex items-center justify-between border-b border-borderSoft bg-slate-50/70 px-3 py-2.5">
                <div><h3 className="text-[12px] font-bold text-textMain">Provider / 模型对比</h3><p className="mt-0.5 text-[9px] text-textMuted">质量、人工复核、耗时与成本使用同一运行口径</p></div>
                <Link href="/settings/integrations" className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[9px] font-semibold text-primary hover:border-primary/30"><Settings2 className="size-3" />配置费率</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-left text-[10px]">
                  <thead className="bg-white text-textMuted"><tr><th className="px-3 py-2 font-semibold">Provider / 模型</th><th className="px-2 py-2 text-right font-semibold">调用</th><th className="px-2 py-2 text-right font-semibold">成功率</th><th className="px-2 py-2 text-right font-semibold">置信度</th><th className="px-2 py-2 text-right font-semibold">人工通过</th><th className="px-2 py-2 text-right font-semibold">Token</th><th className="px-2 py-2 text-right font-semibold">成本</th><th className="px-3 py-2 text-right font-semibold">耗时</th></tr></thead>
                  <tbody>
                    {providerRows.map((row) => (
                      <tr key={row.key} className="border-t border-borderSoft text-textSecondary">
                        <td className="max-w-[230px] truncate px-3 py-2 font-semibold text-textMain" title={row.label}>{row.label}</td>
                        <td className="px-2 py-2 text-right">{row.runs}</td>
                        <td className="px-2 py-2 text-right font-semibold text-primary">{row.successRate}%</td>
                        <td className="px-2 py-2 text-right">{row.averageConfidence}%</td>
                        <td className="px-2 py-2 text-right text-success">{row.reviewedRuns ? `${row.humanApprovalRate}%` : "待复核"}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(row.totalTokens)}</td>
                        <td className="px-2 py-2 text-right font-semibold text-ai">{formatCost(row.estimatedCostUsd)}</td>
                        <td className="px-3 py-2 text-right">{formatLatency(row.averageLatencyMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-[9px] border px-3 py-2 text-[9px]", summary.unpricedRuns ? "border-warning/25 bg-warning-soft text-warning" : "border-success/20 bg-success-soft text-success") }>
            <p className="font-semibold">
              {summary.unpricedRuns
                ? `${summary.unpricedRuns} 次调用未配置费率，成本统计仅覆盖 ${summary.pricedRuns}/${summary.totalRuns} 次。`
                : `全部 ${summary.totalRuns} 次调用均已形成运行时成本快照。`}
            </p>
            <p className="text-textMuted">人工通过率不等于最终商务审批 · 成本为估算值，不等同供应商账单</p>
          </div>
        </div>
      )}
    </section>
  );
}
