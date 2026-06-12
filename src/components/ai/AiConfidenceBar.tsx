import { formatPercent } from "@/lib/formatters";
import { getAiConfidenceColor } from "@/lib/statusStyles";
import { cn } from "@/lib/utils";

type AiConfidenceBarProps = {
  score: number;
  label?: string;
  className?: string;
};

export function AiConfidenceBar({ score, label = "AI 置信度", className }: AiConfidenceBarProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = getAiConfidenceColor(clampedScore);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-caption">
        <span className="font-medium text-textMuted">{label}</span>
        <span className="font-semibold text-ai">{formatPercent(clampedScore)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-ai-soft">
        <div
          className="h-full rounded-pill transition-all"
          style={{ width: `${clampedScore}%`, backgroundColor: color }}
          aria-valuenow={clampedScore}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}
