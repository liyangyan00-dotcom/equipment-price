import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function FilterBar({
  searchPlaceholder = "搜索关键词",
  searchValue,
  onSearchChange,
  filters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex min-h-16 flex-col gap-3 rounded-card border border-borderSoft bg-card p-3 shadow-card md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
        <label className="flex h-10 w-full max-w-[320px] items-center gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-3 text-textMuted">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-full min-w-0 flex-1 bg-transparent text-body text-textMain outline-none placeholder:text-[var(--color-text-placeholder)]"
          />
        </label>
        {filters ? <div className="flex flex-wrap items-center gap-toolbar-gap">{filters}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-toolbar-gap">{actions}</div> : null}
    </div>
  );
}
