import { Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CompactFilterBarProps = {
  searchPlaceholder: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function CompactFilterBar({
  searchPlaceholder,
  filters,
  actions,
  className,
}: CompactFilterBarProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-borderSoft bg-card p-2.5 shadow-card",
        className
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="flex h-8 w-full min-w-[220px] max-w-[340px] items-center gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-3 text-textMuted">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <input
              placeholder={searchPlaceholder}
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-textMain outline-none placeholder:text-[var(--color-text-placeholder)]"
            />
          </label>
          {filters}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions ?? (
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-medium text-textSecondary transition hover:border-primary/30 hover:text-primary">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              高级筛选
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
