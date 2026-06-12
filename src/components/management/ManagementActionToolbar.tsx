import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ManagementAction = {
  label: string;
  icon: LucideIcon;
  tone?: "primary" | "ai" | "warning" | "green" | "default";
};

type ManagementActionToolbarProps = {
  actions: ManagementAction[];
  className?: string;
};

const toneClassName = {
  primary: "border-primary bg-primary text-white",
  ai: "border-ai-border bg-ai-soft text-ai",
  warning: "border-warning/30 bg-warning-soft text-[#B45309]",
  green: "border-success/30 bg-success-soft text-success",
  default: "border-borderSoft bg-white text-textSecondary",
} as const;

export function ManagementActionToolbar({ actions, className }: ManagementActionToolbarProps) {
  return (
    <section className={cn("rounded-card border border-borderSoft bg-card p-3 shadow-card", className)}>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold shadow-sm", toneClassName[action.tone ?? "default"])}>
              <Icon className="size-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
