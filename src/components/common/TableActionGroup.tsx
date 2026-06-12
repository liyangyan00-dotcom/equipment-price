import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TableAction = {
  label: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "ai" | "warning";
  href?: string;
};

type TableActionGroupProps = {
  actions: TableAction[];
  className?: string;
};

const toneClassName = {
  default: "border-borderSoft text-textSecondary hover:border-primary/30 hover:text-primary",
  primary: "border-primary/20 bg-primary-soft text-primary hover:border-primary/40",
  ai: "border-ai-border bg-ai-soft text-ai hover:border-ai/40",
  warning: "border-warning/20 bg-warning-soft text-[#B45309] hover:border-warning/40",
} as const;

const iconToneClassName = {
  default: "bg-gradient-to-br from-white to-slate-100 text-textSecondary ring-slate-200",
  primary: "bg-gradient-to-br from-[#EFF6FF] to-[#DCEBFF] text-primary ring-primary/15",
  ai: "bg-gradient-to-br from-[#F4F0FF] to-[#E8DEFF] text-ai ring-ai/15",
  warning: "bg-gradient-to-br from-[#FFF7ED] to-[#FFE7BA] text-[#B45309] ring-warning/20",
} as const;

export function TableActionGroup({ actions, className }: TableActionGroupProps) {
  return (
    <div className={cn("flex justify-end gap-1.5 whitespace-nowrap", className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        const className = cn(
          "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border bg-white px-2 text-[12px] font-medium transition",
          toneClassName[action.tone ?? "default"]
        );

        if (action.href) {
          return (
            <Link key={action.label} href={action.href} className={className}>
              {Icon ? (
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md ring-1", iconToneClassName[action.tone ?? "default"])}>
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
              ) : null}
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={action.label}
            className={className}
          type="button"
        >
            {Icon ? (
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md ring-1", iconToneClassName[action.tone ?? "default"])}>
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
            ) : null}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
