import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBox, type IconBoxTone } from "./IconBox";

export type StatsSummaryItem = {
  label: string;
  value: string | number;
  description?: string;
  trend?: string;
  icon: LucideIcon;
  tone?: IconBoxTone;
};

type StatsSummaryProps = {
  items: StatsSummaryItem[];
  columns?: 3 | 4;
  className?: string;
};

export function StatsSummary({ items, columns = 4, className }: StatsSummaryProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
        "sm:grid-cols-2",
        className
      )}
    >
      {items.map((item) => (
        <section
          key={item.label}
          className="rounded-card border border-borderSoft bg-card px-4 py-3 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption font-medium text-textMuted">{item.label}</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-metric-md text-textMain">{item.value}</span>
                {item.trend ? (
                  <span className="mb-1 rounded-pill bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                    {item.trend}
                  </span>
                ) : null}
              </div>
            </div>
            <IconBox icon={item.icon} tone={item.tone ?? "blue"} size="sm" />
          </div>
          {item.description ? (
            <p className="mt-2 truncate text-caption text-textMuted">{item.description}</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
