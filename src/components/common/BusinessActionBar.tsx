"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BusinessAction = {
  label: string;
  icon?: LucideIcon;
  tone?: "primary" | "ai" | "success" | "warning" | "danger" | "default";
  onClick?: () => void;
};

type BusinessActionBarProps = {
  actions: BusinessAction[];
  className?: string;
};

const toneClassName: Record<NonNullable<BusinessAction["tone"]>, string> = {
  primary: "border-primary bg-primary text-white hover:bg-primary/90",
  ai: "border-ai bg-ai text-white hover:bg-ai/90",
  success: "border-success bg-success text-white hover:bg-success/90",
  warning: "border-warning/40 bg-warning-soft text-warning hover:border-warning",
  danger: "border-danger/40 bg-danger-soft text-danger hover:border-danger",
  default: "border-borderSoft bg-white text-textSecondary hover:border-primary/30 hover:text-primary",
};

export function BusinessActionBar({ actions, className }: BusinessActionBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-card border border-borderSoft bg-white p-2 shadow-card", className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold shadow-sm transition",
              toneClassName[action.tone ?? "default"],
            )}
            onClick={action.onClick}
          >
            {Icon ? <Icon className="size-4" /> : null}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
