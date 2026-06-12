import { Bot, Sparkles } from "lucide-react";
import { AiBadge } from "@/components/badges";

type AiAssessmentPanelProps = {
  title?: string;
  summary: string;
  confidence?: number;
  items: { label: string; value: string }[];
  actions?: string[];
};

export function AiAssessmentPanel({ title = "AI评估与建议", summary, confidence, items, actions = [] }: AiAssessmentPanelProps) {
  return (
    <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft/60 p-3 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-ai-soft text-ai">
            <Bot className="size-5" />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-textMain">{title}</h3>
            <p className="text-[11px] text-textMuted">AI 结果仅作建议，必须人工确认</p>
          </div>
        </div>
        {confidence ? <AiBadge label={`置信度 ${confidence}%`} icon="analysis" className="h-5 text-[11px]" /> : null}
      </div>
      <div className="rounded-[10px] border border-ai-border/70 bg-white/80 p-3 text-[13px] leading-6 text-textSecondary">{summary}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-[10px] border border-borderSoft bg-white px-3 py-2">
            <p className="text-[11px] font-semibold text-ai">{item.label}</p>
            <p className="mt-1 text-[12px] leading-5 text-textSecondary">{item.value}</p>
          </div>
        ))}
      </div>
      {actions.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button key={action} className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-2.5 text-[12px] font-semibold text-ai">
              <Sparkles className="size-3.5" />
              {action}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
