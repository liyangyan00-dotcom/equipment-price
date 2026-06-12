import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";
import { EmptyState } from "./EmptyState";

type DataTableProps<TData extends Record<string, unknown>> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  rowKey: keyof TData | ((row: TData, rowIndex: number) => string);
  emptyTitle?: string;
  emptyDescription?: string;
  actions?: ReactNode;
  className?: string;
  density?: "default" | "compact";
};

function getCellValue<TData extends Record<string, unknown>>(row: TData, key: keyof TData | string) {
  return row[key as keyof TData];
}

export function DataTable<TData extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  emptyTitle = "暂无数据",
  emptyDescription = "当前筛选条件下没有可展示的数据。",
  actions,
  className,
  density = "default",
}: DataTableProps<TData>) {
  const getRowKey =
    typeof rowKey === "function" ? rowKey : (row: TData) => String(row[rowKey] ?? "");

  return (
    <div className={cn("overflow-hidden rounded-card border border-borderSoft bg-card shadow-card", className)}>
      {actions ? <div className={cn("border-b border-borderSoft", density === "compact" ? "px-3 py-2.5" : "px-4 py-3")}>{actions}</div> : null}
      {data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} className="border-0 shadow-none" />
      ) : (
        <div className="overflow-x-auto">
          <table className={cn("w-full border-collapse text-[#334155]", density === "compact" ? "text-[12px]" : "text-table")}>
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "border-b border-borderSoft text-left text-table-header tracking-[0.01em] text-textSecondary",
                      density === "compact" ? "h-9 px-2.5" : "h-12 px-4",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.className
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={cn(
                    "border-b border-borderSoft transition last:border-0 hover:bg-[var(--color-muted-soft)]",
                    density === "compact" ? "h-10" : "h-[52px]"
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        "align-middle",
                        density === "compact" ? "px-2.5 py-1.5" : "px-4 py-3",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right tabular-nums",
                        column.className
                      )}
                    >
                      {column.render ? column.render(row, rowIndex) : String(getCellValue(row, column.key) ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
