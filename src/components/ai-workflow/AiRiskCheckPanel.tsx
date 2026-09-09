import { ArrowRight, ShieldAlert } from "lucide-react";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { WorkflowCard } from "./WorkflowPanels";
import type { RiskLevel } from "@/types/common";

type RiskItem = {
  title: string;
  description: string;
  level: RiskLevel;
};

type AiRiskCheckPanelProps = {
  title?: string;
  subtitle?: string;
  items: RiskItem[];
  compact?: boolean;
};

export function AiRiskCheckPanel({ title = "AI风险检测", subtitle = "AI输出必须进入人工确认流程", items, compact = false }: AiRiskCheckPanelProps) {
  return (
    <WorkflowCard icon={ShieldAlert} title={title} subtitle={subtitle} tone="red">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.title} className="flex items-start gap-2 rounded-[12px] border border-danger/10 bg-danger-soft/55 px-3 py-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-[12px] font-bold text-danger">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[13px] font-semibold text-textMain">{item.title}</div>
                <RiskBadge level={item.level} className="h-5 text-[11px]" />
              </div>
              {!compact ? <p className="mt-1 text-[12px] leading-5 text-textSecondary">{item.description}</p> : null}
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-danger/15 bg-white text-[12px] font-semibold text-danger" type="button">
        查看风险详情
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
    </WorkflowCard>
  );
}
