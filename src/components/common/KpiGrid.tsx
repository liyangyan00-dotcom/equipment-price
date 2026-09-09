import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBox, type IconBoxTone } from "./IconBox";

export type KpiGridItem = {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  description?: string;
  icon: LucideIcon;
  tone?: IconBoxTone;
  onClick?: () => void;
};

type KpiGridProps = {
  items: KpiGridItem[];
  className?: string;
};

export function KpiGrid({ items, className }: KpiGridProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-6", className)}>
      {items.map((item) => (
        <section
          key={item.label}
          onClick={item.onClick}
          onKeyDown={item.onClick ? (event) => { if (event.key === "Enter" || event.key === " ") item.onClick?.(); } : undefined}
          role={item.onClick ? "button" : undefined}
          tabIndex={item.onClick ? 0 : undefined}
          className={cn("min-h-[84px] rounded-card border border-borderSoft bg-card px-3 py-2.5 shadow-card", item.onClick && "cursor-pointer transition hover:border-primary/35 hover:shadow-cardHover focus:outline-none focus:ring-2 focus:ring-primary/20")}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-textSecondary">{item.label}</p>
              <div className="mt-1 flex items-end gap-1.5">
                <span className="text-[24px] font-bold leading-7 tracking-normal text-textMain">
                  {item.value}
                </span>
                {item.unit ? (
                  <span className="mb-0.5 text-[11px] font-semibold text-textMuted">{item.unit}</span>
                ) : null}
              </div>
            </div>
            <IconBox icon={item.icon} tone={item.tone ?? "blue"} size="sm" className="size-8" />
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {item.trend ? (
              <span
                className={cn(
                  "rounded-pill px-1.5 py-0.5 text-[10px] font-semibold",
                  item.tone === "orange" || item.tone === "red"
                    ? "bg-warning-soft text-[#B45309]"
                    : item.tone === "purple"
                      ? "bg-ai-soft text-ai"
                      : "bg-success-soft text-success"
                )}
              >
                {item.trend}
              </span>
            ) : null}
            {item.description ? (
              <span className="min-w-0 truncate text-[10px] text-textMuted">{item.description}</span>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
