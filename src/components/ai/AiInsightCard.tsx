import type { ReactNode } from "react";
import { BrainCircuit } from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { BaseCard } from "@/components/common/BaseCard";
import { cn } from "@/lib/utils";
import { AiConfidenceBar } from "./AiConfidenceBar";

type AiInsightCardProps = {
  title: string;
  description?: string;
  confidence: number;
  riskNotes?: string[];
  suggestedActions?: string[];
  reviewAction?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function AiInsightCard({
  title,
  description,
  confidence,
  riskNotes = [],
  suggestedActions = [],
  reviewAction,
  children,
  className,
}: AiInsightCardProps) {
  return (
    <BaseCard
      variant="ai"
      className={cn("overflow-hidden", className)}
      contentClassName="flex flex-col gap-4"
      title={title}
      description={description}
      actions={<AiBadge label="AI 建议" icon={BrainCircuit} />}
    >
      {children ? <div className="text-body text-textSecondary">{children}</div> : null}
      <AiConfidenceBar score={confidence} />
      {riskNotes.length > 0 ? (
        <div className="rounded-card border border-warning/20 bg-warning-soft/70 p-3">
          <p className="text-caption font-semibold text-[#92400E]">风险提示</p>
          <ul className="mt-2 flex flex-col gap-1 text-caption text-[#92400E]">
            {riskNotes.map((note) => (
              <li key={note}>- {note}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {suggestedActions.length > 0 ? (
        <div className="rounded-card border border-ai-border bg-white/70 p-3">
          <p className="text-caption font-semibold text-ai">建议动作</p>
          <ul className="mt-2 flex flex-col gap-1 text-caption text-textSecondary">
            {suggestedActions.map((action) => (
              <li key={action}>- {action}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {reviewAction ? <div className="pt-1">{reviewAction}</div> : null}
    </BaseCard>
  );
}
