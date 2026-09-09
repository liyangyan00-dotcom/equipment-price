import Link from "next/link";
import { ArrowRight, Bot, FileText } from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { WorkflowCard } from "./WorkflowPanels";
import { AiTaskTimeline } from "./AiTaskTimeline";
import type { AiWorkbenchDetail } from "@/data/mock/aiWorkbench";

type AiTaskDetailPanelProps = {
  detail: AiWorkbenchDetail;
};

export function AiTaskDetailPanel({ detail }: AiTaskDetailPanelProps) {
  return (
    <WorkflowCard icon={Bot} title="AI任务详情" subtitle={detail.taskCode} tone="purple" action={<AiBadge label={detail.model} />}>
      <div className="rounded-[14px] border border-ai-border bg-gradient-to-br from-ai-soft/80 via-white to-white p-3">
        <div className="text-[15px] font-bold text-textMain">{detail.title}</div>
        <p className="mt-2 text-[12px] leading-5 text-textSecondary">{detail.output}</p>
        <div className="mt-3 rounded-[12px] bg-white px-3 py-2 text-[12px] text-textSecondary">
          当前步骤：<span className="font-semibold text-ai">{detail.currentStep}</span>
        </div>
      </div>
      <div className="mt-3">
        <AiTaskTimeline items={detail.progress} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[12px] border border-warning/15 bg-warning-soft/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-warning">
            <FileText className="size-4" />
            缺失字段
          </div>
          <ul className="space-y-1.5 text-[12px] text-textSecondary">
            {detail.missingFields.map((field) => <li key={field}>- {field}</li>)}
          </ul>
        </div>
        <div className="rounded-[12px] border border-danger/15 bg-danger-soft/40 p-3">
          <div className="mb-2 text-[13px] font-semibold text-danger">风险提示</div>
          <div className="space-y-2">
            {detail.risks.map((risk) => (
              <div key={risk.title} className="rounded-md bg-white/80 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-textMain">{risk.title}</span>
                  <RiskBadge level={risk.level} className="h-5 text-[11px]" />
                </div>
                <p className="mt-1 text-[11px] text-textMuted">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-[12px] border border-ai-border bg-ai-soft p-3 text-[12px] leading-5 text-textSecondary">
        <span className="font-semibold text-ai">推荐动作：</span>
        {detail.recommendedAction}
      </div>
      <Link href={detail.jumpHref} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-ai text-[13px] font-semibold text-white shadow-ai">
        {detail.jumpLabel}
        <ArrowRight className="size-4" />
      </Link>
    </WorkflowCard>
  );
}
