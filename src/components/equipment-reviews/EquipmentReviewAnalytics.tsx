"use client";

import { Activity, History, ShieldAlert } from "lucide-react";
import { ModuleHeader } from "@/components/common";
import type { EquipmentReviewTask } from "@/types/equipmentReview";
import {
  formatReviewTime,
  ReviewRiskBadge,
  ReviewStatusBadge,
} from "./reviewUtils";

export function EquipmentReviewAnalytics({
  tasks,
  onRuleClick,
}: {
  tasks: EquipmentReviewTask[];
  onRuleClick: (rule: string) => void;
}) {
  const ruleCounts = new Map<string, number>();
  tasks.forEach((task) => {
    task.matched_rules.forEach((rule) => {
      ruleCounts.set(rule, (ruleCounts.get(rule) ?? 0) + 1);
    });
  });
  const rules = [...ruleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const maxRule = Math.max(...rules.map(([, count]) => count), 1);

  const riskCounts = {
    critical: tasks.filter((task) => task.risk_level === "critical").length,
    high: tasks.filter((task) => task.risk_level === "high").length,
    medium: tasks.filter((task) => task.risk_level === "medium").length,
    low: tasks.filter((task) => task.risk_level === "low").length,
  };
  const total = Math.max(tasks.length, 1);
  const reviewed = tasks
    .filter((task) => task.reviewed_at)
    .sort((a, b) => Date.parse(b.reviewed_at ?? "") - Date.parse(a.reviewed_at ?? ""))
    .slice(0, 4);

  return (
    <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr_1.3fr]">
      <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
        <ModuleHeader
          icon={Activity}
          title="规则命中分析"
          subtitle="点击规则可快速筛选审核队列"
          tone="purple"
          density="compact"
        />
        <div className="mt-3 space-y-2.5">
          {rules.length ? (
            rules.map(([rule, count]) => (
              <button
                type="button"
                key={rule}
                onClick={() => onRuleClick(rule)}
                className="block w-full text-left"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-textSecondary">{rule}</span>
                  <span className="font-bold tabular-nums text-ai">{count} 条</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ai to-primary"
                    style={{ width: `${(count / maxRule) * 100}%` }}
                  />
                </div>
              </button>
            ))
          ) : (
            <p className="py-8 text-center text-[12px] text-textMuted">暂无规则命中</p>
          )}
        </div>
      </section>

      <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
        <ModuleHeader
          icon={ShieldAlert}
          title="审核风险构成"
          subtitle="按当前设备价格任务实时计算"
          tone="orange"
          density="compact"
        />
        <div className="mt-3 flex items-center justify-center gap-5">
          <div
            className="relative size-28 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(
                #EF4444 0 ${(riskCounts.critical / total) * 100}%,
                #F97316 ${(riskCounts.critical / total) * 100}% ${((riskCounts.critical + riskCounts.high) / total) * 100}%,
                #F59E0B ${((riskCounts.critical + riskCounts.high) / total) * 100}% ${((riskCounts.critical + riskCounts.high + riskCounts.medium) / total) * 100}%,
                #22C55E ${((riskCounts.critical + riskCounts.high + riskCounts.medium) / total) * 100}% 100%
              )`,
            }}
          >
            <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-white">
              <span className="text-[22px] font-extrabold tabular-nums text-textMain">{tasks.length}</span>
              <span className="text-[10px] text-textMuted">审核任务</span>
            </div>
          </div>
          <div className="space-y-2 text-[11px]">
            {[
              ["严重", riskCounts.critical, "bg-danger"],
              ["高风险", riskCounts.high, "bg-orange-500"],
              ["中风险", riskCounts.medium, "bg-warning"],
              ["低风险", riskCounts.low, "bg-success"],
            ].map(([label, count, color]) => (
              <div key={String(label)} className="flex min-w-24 items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-textSecondary">
                  <i className={`size-2 rounded-full ${color}`} />
                  {label}
                </span>
                <b className="tabular-nums text-textMain">{count}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
        <div className="border-b border-borderSoft px-3 py-2.5">
          <ModuleHeader
            icon={History}
            title="最近人工审核"
            subtitle="记录最终结论与审核时间"
            tone="green"
            density="compact"
          />
        </div>
        {reviewed.length ? (
          <div className="divide-y divide-borderSoft">
            {reviewed.map((task) => (
              <div key={task.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-textMain">
                    {task.wpi_equipment_prices.equipment_name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-textMuted">
                    {task.review_comment || "人工审核已完成"} · {formatReviewTime(task.reviewed_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <ReviewRiskBadge task={task} className="h-5 px-1.5 text-[10px]" />
                  <ReviewStatusBadge status={task.status} className="h-5 px-1.5 text-[10px]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-36 items-center justify-center text-[12px] text-textMuted">
            暂无已完成的人工审核
          </div>
        )}
      </section>
    </div>
  );
}
