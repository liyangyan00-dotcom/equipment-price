import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/common";

type RiskCardProps = {
  title: string;
  description?: string;
  riskLevel: RiskLevel;
  notes?: string[];
  action?: ReactNode;
  className?: string;
};

const riskAccent = {
  low: "border-l-success bg-success-soft/35",
  medium: "border-l-warning bg-warning-soft/45",
  high: "border-l-[#C2410C] bg-[#FFEDD5]/60",
  critical: "border-l-danger bg-danger-soft/70",
};

export function RiskCard({ title, description, riskLevel, notes = [], action, className }: RiskCardProps) {
  return (
    <section
      className={cn(
        "rounded-card border border-borderSoft border-l-4 bg-card p-5 shadow-card",
        riskAccent[riskLevel],
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
            <h3 className="text-card-title text-textMain">{title}</h3>
          </div>
          {description ? <p className="mt-2 text-caption text-textMuted">{description}</p> : null}
        </div>
        <RiskBadge level={riskLevel} />
      </div>
      {notes.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2 text-caption text-textSecondary">
          {notes.map((note) => (
            <li key={note}>- {note}</li>
          ))}
        </ul>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
