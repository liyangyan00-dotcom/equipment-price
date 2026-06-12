import { Bot, BrainCircuit, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const aiIcons = {
  suggestion: Sparkles,
  generated: Bot,
  analysis: BrainCircuit,
} as const;

type AiBadgeProps = {
  label?: string;
  icon?: keyof typeof aiIcons | LucideIcon;
  className?: string;
};

export function AiBadge({ label = "AI建议", icon = "suggestion", className }: AiBadgeProps) {
  const Icon = typeof icon === "string" ? aiIcons[icon] : icon;

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill border border-ai-border bg-ai-soft px-2 text-[12px] font-medium text-ai",
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
