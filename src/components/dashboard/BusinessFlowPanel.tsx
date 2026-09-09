import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, CheckCircle2, ClipboardCheck, Database, Sparkles, Workflow } from "lucide-react";
import { BaseCard } from "@/components/common";
import type { BusinessFlowOverview, BusinessFlowStage } from "@/data/mock/dashboard";
import { cn } from "@/lib/utils";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

const stageMeta: Record<BusinessFlowStage["key"], { icon: LucideIcon; className: string }> = {
  collected: { icon: Workflow, className: "border-primary-soft bg-primary-soft/45 text-primary" },
  pending: { icon: ClipboardCheck, className: "border-warning/25 bg-warning-soft/55 text-warning" },
  ready: { icon: CheckCircle2, className: "border-success/20 bg-success-soft text-success" },
  transferred: { icon: Database, className: "border-ai-border bg-ai-soft/70 text-ai" },
  usable: { icon: BadgeCheck, className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
};

type BusinessFlowPanelProps = {
  data: BusinessFlowOverview;
};

export function BusinessFlowPanel({ data }: BusinessFlowPanelProps) {
  return (
    <BaseCard contentClassName="space-y-2.5 p-3">
      <DashboardSectionHeader
        icon={Workflow}
        title="价格业务闭环"
        subtitle="采集、审核、入库与正式价格可用情况"
        tone="blue"
        action={<span className="text-[11px] font-semibold text-textSecondary">线索入库率 <strong className="tabular-nums text-primary">{data.conversionRate}%</strong></span>}
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {data.stages.map((stage, index) => {
          const meta = stageMeta[stage.key];
          const Icon = meta.icon;
          return (
            <div key={stage.key} className="relative min-w-0">
              <Link href={stage.href} className={cn("group flex min-h-[76px] min-w-0 items-center gap-2.5 rounded-[11px] border px-2.5 py-2 transition hover:-translate-y-0.5 hover:shadow-card active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", meta.className)}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/75 shadow-sm">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold">{stage.title}</span>
                  <span className="mt-0.5 block text-[22px] font-semibold leading-none tabular-nums">{stage.value.toLocaleString("zh-CN")}</span>
                  <span className="mt-1 block truncate text-[10px] opacity-75" title={stage.description}>{stage.description}</span>
                </span>
              </Link>
              {index < data.stages.length - 1 ? <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden size-3.5 -translate-y-1/2 text-textMuted md:block" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>

      <div className={cn("flex flex-col gap-2 rounded-[10px] border px-3 py-2 sm:flex-row sm:items-center sm:justify-between", data.attention === "warning" ? "border-warning/20 bg-warning-soft/45" : "border-success/20 bg-success-soft")}>
        <div className="flex min-w-0 items-start gap-2">
          <Sparkles className={cn("mt-0.5 size-4 shrink-0", data.attention === "warning" ? "text-warning" : "text-success")} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-textMain">AI 流程判断 <span className="font-normal text-textMuted">· 需人工确认</span></p>
            <p className="mt-0.5 text-[11px] leading-4 text-textSecondary">{data.aiSummary}</p>
          </div>
        </div>
        <Link href={data.actionHref} className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-white transition hover:bg-primary-hover active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35">
          {data.recommendedAction}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </BaseCard>
  );
}
