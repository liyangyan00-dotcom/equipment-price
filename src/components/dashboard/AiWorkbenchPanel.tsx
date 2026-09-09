import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { AiConfidenceBar } from "@/components/ai";
import { AiBadge } from "@/components/badges";
import { BaseCard } from "@/components/common";
import type { AiWorkbenchOverview } from "@/data/mock/dashboard";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

type AiWorkbenchPanelProps = {
  data: AiWorkbenchOverview;
};

export function AiWorkbenchPanel({ data }: AiWorkbenchPanelProps) {
  return (
    <BaseCard className="border-ai-border bg-[linear-gradient(145deg,#FFFFFF_0%,#F8F7FF_48%,#F3EEFF_100%)] shadow-ai" contentClassName="space-y-2 p-3">
      <DashboardSectionHeader
        icon={Sparkles}
        title="AI工作台"
        subtitle="智能识别、风险归因与建议动作"
        tone="purple"
        action={
          <div className="flex items-center gap-1.5">
            <AiBadge label="智能中枢" icon="analysis" />
            <Link href="/ai-workbench" className="text-[12px] font-semibold text-ai">
              查看
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <Metric label="今日AI任务" value={data.todayTaskCount} icon={WandSparkles} tone="ai" />
        <Metric label="识别成功率" value={`${data.recognitionRate}%`} icon={CheckCircle2} tone="success" />
        <Metric label="风险结果" value={data.riskResultCount} icon={AlertTriangle} tone="warning" />
        <Metric label="建议动作" value={data.suggestedActionCount} icon={ClipboardCheck} tone="blue" />
      </div>

      <div className="rounded-[12px] border border-ai-border bg-white/82 p-2.5 shadow-sm">
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-textMain">
            <Loader2 className="size-3.5 text-ai" aria-hidden="true" />
            AI处理进度
          </span>
          <span className="font-semibold text-ai">待复核 {data.pendingReviewCount}</span>
        </div>
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
          <span className="truncate text-textSecondary">当前任务：{data.currentTaskName}</span>
          <span className="rounded-pill bg-ai-soft px-2 py-0.5 font-semibold text-ai">{data.recommendedAction}</span>
        </div>
        <AiConfidenceBar score={data.extractionRate} label="关键字段提取率" />
      </div>

      <div className="rounded-[14px] border border-ai-border bg-[linear-gradient(135deg,rgba(245,243,255,0.95),rgba(255,255,255,0.82))] p-2.5 shadow-sm">
        <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-ai">
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI最新建议
        </div>
        <p className="line-clamp-2 text-[12px] leading-5 text-textSecondary">{data.latestSuggestion}</p>
        <Link href="/ai-workbench" className="mt-2 inline-flex items-center gap-1 rounded-pill bg-ai px-2.5 py-1 text-[12px] font-semibold text-white">
          进入AI工作台
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </BaseCard>
  );
}

type MetricProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: "ai" | "success" | "warning" | "blue";
};

function Metric({ label, value, icon: Icon, tone }: MetricProps) {
  const toneClass = {
    ai: "border-ai-border bg-white/72 text-ai shadow-sm",
    success: "border-success/20 bg-white/72 text-success shadow-sm",
    warning: "border-warning/20 bg-white/72 text-warning shadow-sm",
    blue: "border-primary-soft bg-white/72 text-primary shadow-sm",
  }[tone];

  return (
    <div className={`rounded-[12px] border px-2.5 py-2 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold">{label}</span>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <p className="mt-1 text-[21px] font-semibold leading-none">{value}</p>
    </div>
  );
}
