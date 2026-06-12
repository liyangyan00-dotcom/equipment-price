import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBox, type IconBoxTone } from "./IconBox";

export type BottomInsightItem = {
  title: string;
  description: string;
  value?: string;
  action?: string;
  icon: LucideIcon;
  tone?: IconBoxTone;
};

type BottomInsightGridProps = {
  items: BottomInsightItem[];
  columns?: 3 | 4 | 5;
  className?: string;
};

export function BottomInsightGrid({ items, columns = 3, className }: BottomInsightGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 5 && "xl:grid-cols-5",
        columns === 4 && "xl:grid-cols-4",
        columns === 3 && "xl:grid-cols-3",
        "md:grid-cols-2",
        className
      )}
    >
      {items.map((item) => (
        <section
          key={item.title}
          className="rounded-card border border-borderSoft bg-card p-3 shadow-card"
        >
          <div className="flex items-start gap-3">
            <IconBox icon={item.icon} tone={item.tone ?? "blue"} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-[14px] font-semibold text-textMain">{item.title}</h3>
                {item.value ? <span className="text-[18px] font-bold text-textMain">{item.value}</span> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-[18px] text-textMuted">{item.description}</p>
              {item.action ? (
                <button
                  type="button"
                  className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
                >
                  {item.action}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
