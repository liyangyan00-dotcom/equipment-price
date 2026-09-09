import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { IconBox } from "@/components/common/IconBox";
import { WorkflowCard } from "./WorkflowPanels";
import type { AiTaskStatus } from "@/types/common";

type MissingFieldItem = {
  field: string;
  description: string;
  action: string;
  status: AiTaskStatus;
};

type AiMissingFieldPanelProps = {
  title?: string;
  subtitle?: string;
  items: MissingFieldItem[];
};

export function AiMissingFieldPanel({ title = "AI缺失字段提醒", subtitle = "影响自动生成质量的字段", items }: AiMissingFieldPanelProps) {
  return (
    <WorkflowCard icon={AlertCircle} title={title} subtitle={subtitle} tone="orange">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.field} className="rounded-[12px] border border-warning/15 bg-warning-soft/45 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-textMain">{item.field}</div>
                <p className="mt-1 text-[12px] leading-5 text-textSecondary">{item.description}</p>
              </div>
              <StatusBadge status={item.status} className="h-5 text-[11px]" />
            </div>
            <button className="mt-2 inline-flex h-7 items-center gap-1 rounded-md border border-warning/20 bg-white px-2 text-[12px] font-semibold text-[#B45309]" type="button">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {item.action}
            </button>
          </div>
        ))}
      </div>
      <button className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-borderSoft bg-white text-[12px] font-semibold text-primary" type="button">
        查看全部补全项
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
    </WorkflowCard>
  );
}

export function MissingFieldMetric({ label, value, tone = "orange" }: { label: string; value: string | number; tone?: "orange" | "purple" | "blue" }) {
  const toneClass = {
    orange: "text-warning bg-warning-soft border-warning/20",
    purple: "text-ai bg-ai-soft border-ai-border",
    blue: "text-primary bg-primary-soft border-primary/20",
  }[tone];

  return (
    <div className={`rounded-[12px] border px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] font-semibold opacity-80">{label}</div>
      <div className="mt-1 text-[20px] font-bold leading-6">{value}</div>
    </div>
  );
}

export function MissingFieldIcon({ tone = "orange" }: { tone?: "orange" | "purple" | "blue" }) {
  return <IconBox icon={AlertCircle} tone={tone === "purple" ? "purple" : tone === "blue" ? "blue" : "orange"} size="sm" />;
}
