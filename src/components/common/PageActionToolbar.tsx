import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageActionToolbarAction = {
  label: string;
  icon?: LucideIcon;
  tone?: "primary" | "ai" | "warning" | "default";
};

type PageActionToolbarProps = {
  selectedText?: string;
  actions: PageActionToolbarAction[];
  className?: string;
};

const toneClassName = {
  primary: "border-primary/20 bg-primary text-white hover:bg-primary/90",
  ai: "border-ai-border bg-ai-soft text-ai hover:border-ai/40",
  warning: "border-warning/25 bg-warning-soft text-[#B45309] hover:border-warning/40",
  default: "border-borderSoft bg-white text-textSecondary hover:border-primary/30 hover:text-primary",
} as const;

export function PageActionToolbar({ selectedText = "当前未选择记录", actions, className }: PageActionToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-card border border-borderSoft bg-card px-3 py-2 shadow-card lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="text-[13px] text-textMuted">{selectedText}</div>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold shadow-sm transition",
                toneClassName[action.tone ?? "default"]
              )}
            >
              {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
