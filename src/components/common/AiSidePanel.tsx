import type { LucideIcon } from "lucide-react";
import { ArrowRight, AlertTriangle, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleHeader } from "./ModuleHeader";

export type AiSidePanelItem = {
  title: string;
  description: string;
  meta?: string;
  icon?: LucideIcon;
  tone?: "ai" | "warning" | "success";
};

type AiSidePanelProps = {
  title: string;
  subtitle: string;
  items: AiSidePanelItem[];
  actionLabel: string;
  className?: string;
};

const itemToneClassName = {
  ai: "border-ai-border bg-ai-soft/60 text-ai",
  warning: "border-warning/20 bg-warning-soft text-[#B45309]",
  success: "border-success/20 bg-success-soft text-success",
} as const;

export function AiSidePanel({ title, subtitle, items, actionLabel, className }: AiSidePanelProps) {
  return (
    <aside
      className={cn(
        "rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft/60 p-3 shadow-ai",
        className
      )}
    >
      <ModuleHeader
        icon={Bot}
        title={title}
        subtitle={subtitle}
        tone="purple"
        density="compact"
        action={<span className="rounded-pill bg-white px-2 py-1 text-[11px] font-semibold text-ai">AI增强</span>}
      />
      <div className="mt-2 space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon ?? (item.tone === "warning" ? AlertTriangle : Sparkles);

          return (
            <div
              key={item.title}
              className="rounded-lg border border-borderSoft bg-white/80 p-2.5 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-lg border",
                    itemToneClassName[item.tone ?? "ai"]
                  )}
                >
                  <Icon className="size-3" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-textMain">{item.title}</div>
                  <p className="mt-0.5 text-[11px] leading-[18px] text-textMuted">{item.description}</p>
                  {item.meta ? <div className="mt-0.5 text-[11px] font-semibold text-ai">{item.meta}</div> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="mt-2 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-ai px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-ai/90"
      >
        {actionLabel}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
    </aside>
  );
}
