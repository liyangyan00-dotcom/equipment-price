"use client";

import type { ReactNode } from "react";
import { CheckSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectionSummaryBarProps = {
  count: number;
  label?: string;
  children?: ReactNode;
  onClear?: () => void;
  className?: string;
};

export function SelectionSummaryBar({ count, label = "已选择", children, onClear, className }: SelectionSummaryBarProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary/20 bg-primary-soft px-4 py-2.5 text-[13px] shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-primary">
        <CheckSquare className="size-4" />
        <span>
          {label} <span className="text-[16px]">{count}</span> 项，可继续批量创建询价、AI推荐或导出。
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onClear ? (
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-white px-2 text-[12px] font-semibold text-primary"
            onClick={onClear}
          >
            <X className="size-3.5" />
            清空
          </button>
        ) : null}
      </div>
    </div>
  );
}
