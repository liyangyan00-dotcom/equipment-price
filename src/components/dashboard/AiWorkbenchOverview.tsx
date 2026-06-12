import { Activity, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { AiConfidenceBar } from "@/components/ai";
import { AiBadge } from "@/components/badges";
import { BaseCard } from "@/components/common";
import type { AiWorkbenchOverview as AiWorkbenchOverviewData } from "@/data/mock/dashboard";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

type AiWorkbenchOverviewProps = {
  data: AiWorkbenchOverviewData;
};

export function AiWorkbenchOverview({ data }: AiWorkbenchOverviewProps) {
  return (
    <BaseCard className="border-ai-border bg-gradient-to-br from-white to-ai-soft/70 shadow-ai" contentClassName="space-y-3 p-4">
      <DashboardSectionHeader
        icon={Sparkles}
        title="AI 工作台总览"
        subtitle="识别、采集、风险与建议动作"
        tone="purple"
        action={<AiBadge label="AI 运行中" icon="analysis" />}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <MetricTile icon={Activity} label="今日任务" value={data.todayTaskCount} tone="primary" />
        <MetricTile icon={CheckCircle2} label="成功率" value={`${data.recognitionRate}%`} tone="success" />
        <MetricTile icon={AlertTriangle} label="风险结果" value={data.riskResultCount} tone="danger" />
        <MetricTile icon={Sparkles} label="建议动作" value={data.suggestedActionCount} tone="ai" />
      </div>

      <AiConfidenceBar score={data.extractionRate} label="关键字段提取率" />

      <div className="rounded-card border border-ai-border bg-white/72 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-caption font-semibold text-ai">最近 AI 建议</p>
          <span className="rounded-pill bg-ai-soft px-2 py-1 text-[11px] font-medium text-ai">
            待复核 {data.pendingReviewCount}
          </span>
        </div>
        <p className="text-caption leading-5 text-textSecondary">{data.latestSuggestion}</p>
      </div>
    </BaseCard>
  );
}

type MetricTileProps = {
  icon: typeof Activity;
  label: string;
  value: string | number;
  tone: "primary" | "success" | "danger" | "ai";
};

function MetricTile({ icon: Icon, label, value, tone }: MetricTileProps) {
  const toneClass = {
    primary: "border-primary-soft bg-primary-soft text-primary",
    success: "border-success/20 bg-success-soft text-success",
    danger: "border-danger/20 bg-danger-soft text-danger",
    ai: "border-ai-border bg-ai-soft text-ai",
  }[tone];

  return (
    <div className={`rounded-[12px] border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium">{label}</p>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <p className="mt-2 text-[24px] font-semibold leading-none">{value}</p>
    </div>
  );
}
