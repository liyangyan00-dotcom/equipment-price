import { FileText, Sparkles } from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { WorkflowCard } from "./WorkflowPanels";
import type { AiReportOutline } from "@/data/mock/aiReports";

type AiReportOutlinePanelProps = {
  outline: AiReportOutline;
};

export function AiReportOutlinePanel({ outline }: AiReportOutlinePanelProps) {
  return (
    <WorkflowCard
      icon={FileText}
      title="AI报告大纲"
      subtitle="生成报告前的结构草稿，不产生真实文件"
      tone="purple"
      action={
        <>
          <AiBadge label={outline.model} />
          <ConfidenceBadge level={outline.confidence} />
        </>
      }
    >
      <div className="rounded-[14px] border border-ai-border bg-gradient-to-br from-ai-soft/80 via-white to-white p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-ai text-white shadow-ai">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold text-textMain">{outline.title}</h3>
            <p className="mt-1 text-[12px] text-textMuted">AI已生成报告结构，需人工补充证据并确认结论。</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {outline.sections.map((section) => (
            <div key={section.title} className="rounded-[12px] border border-borderSoft bg-white/88 p-3">
              <div className="text-[13px] font-bold text-ai">{section.title}</div>
              <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-textSecondary">
                {section.points.map((point) => <li key={point}>- {point}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-[12px] border border-warning/15 bg-warning-soft/45 p-3">
          <div className="text-[13px] font-semibold text-warning">待补充数据</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {outline.missingData.map((item) => (
              <span key={item} className="rounded-pill border border-warning/20 bg-white px-2 py-1 text-[12px] font-semibold text-[#B45309]">{item}</span>
            ))}
          </div>
        </div>
        <p className="mt-3 rounded-[12px] border border-ai-border bg-white px-3 py-2 text-[12px] leading-5 text-textSecondary">
          <span className="font-semibold text-ai">AI初步结论：</span>
          {outline.conclusion}
        </p>
      </div>
    </WorkflowCard>
  );
}
