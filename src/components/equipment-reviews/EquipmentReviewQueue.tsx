"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardSignature,
  Eye,
} from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { EmptyState, ModuleHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import type { EquipmentReviewTask } from "@/types/equipmentReview";
import {
  formatReviewPrice,
  formatReviewTime,
  ReviewConfidenceBadge,
  ReviewRiskBadge,
  ReviewStatusBadge,
} from "./reviewUtils";

function taskArchiveHref(task: EquipmentReviewTask) {
  if (task.source_kind === "import") {
    return task.equipment_price_id
      ? `/equipment-prices/${task.equipment_price_id}`
      : `/equipment-prices/import/${task.import_batch_id ?? ""}`;
  }
  return `/equipment-prices/${task.equipment_price_id ?? task.wpi_equipment_prices.id}`;
}

type EquipmentReviewQueueProps = {
  tasks: EquipmentReviewTask[];
  total: number;
  page: number;
  pageCount: number;
  activeId?: string;
  selectedIds: string[];
  onSelectTask: (id: string) => void;
  onToggleTask: (id: string) => void;
  onToggleVisible: () => void;
  onPageChange: (page: number) => void;
  onMore: (task: EquipmentReviewTask) => void;
};

export function EquipmentReviewQueue({
  tasks,
  total,
  page,
  pageCount,
  activeId,
  selectedIds,
  onSelectTask,
  onToggleTask,
  onToggleVisible,
  onPageChange,
  onMore,
}: EquipmentReviewQueueProps) {
  const allVisibleSelected =
    tasks.length > 0 && tasks.every((task) => selectedIds.includes(task.id));

  return (
    <section className="overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader
          icon={ClipboardCheck}
          title="设备价格审核队列"
          subtitle={`当前 ${total} 条记录，选择记录后在右侧完成人工判断`}
          density="compact"
          action={<AiBadge label="AI 预审已完成" className="h-6" />}
        />
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="没有匹配的审核任务"
          description="请调整筛选条件，或重置后查看全部审核记录。"
          className="border-0 shadow-none"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[12px] text-textSecondary">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                <th className="h-9 w-10 border-b border-borderSoft px-2 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={onToggleVisible}
                    aria-label="全选当前页"
                    className="size-4 rounded border-borderSoft text-primary"
                  />
                </th>
                {[
                  "设备与规格",
                  "供应商",
                  "申报价格",
                  "来源",
                  "完整度",
                  "AI置信度",
                  "风险",
                  "状态",
                  "提交时间",
                  "操作",
                ].map((header) => (
                  <th
                    key={header}
                    className={cn(
                      "h-9 whitespace-nowrap border-b border-borderSoft px-2 text-left font-bold",
                      header === "申报价格" && "text-right",
                      header === "操作" && "text-center"
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const price = task.wpi_equipment_prices;
                const active = activeId === task.id;
                const selected = selectedIds.includes(task.id);

                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    onKeyDown={(event) => {
                      if (event.currentTarget !== event.target) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectTask(task.id);
                      }
                    }}
                    tabIndex={0}
                    aria-current={active ? "true" : undefined}
                    aria-selected={selected}
                    className={cn(
                      "h-11 cursor-pointer border-b border-borderSoft outline-none transition last:border-0 hover:bg-primary-soft/40 focus-visible:bg-primary-soft/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30",
                      active && "bg-primary-soft/70"
                    )}
                  >
                    <td className="px-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => onToggleTask(task.id)}
                        aria-label={`选择 ${price.equipment_name}`}
                        className="size-4 rounded border-borderSoft text-primary"
                      />
                    </td>
                    <td className="max-w-[190px] px-2">
                      <p className="truncate font-bold text-textMain" title={price.equipment_name}>
                        {price.equipment_name}
                      </p>
                      <p className="truncate text-[11px] text-textMuted" title={price.model ?? ""}>
                        {price.price_code} · {price.model || "规格待补充"}
                      </p>
                    </td>
                    <td className="max-w-[142px] px-2">
                      <span className="block truncate" title={price.wpi_suppliers?.name ?? "待匹配"}>
                        {price.wpi_suppliers?.name ?? "待匹配供应商"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 text-right font-bold tabular-nums text-textMain">
                      {formatReviewPrice(task)}
                    </td>
                    <td className="whitespace-nowrap px-2">{price.source_type ?? "待核验"}</td>
                    <td className="whitespace-nowrap px-2">
                      <span className="font-bold tabular-nums text-primary">
                        {Math.round(task.completeness ?? 0)}%
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <ReviewConfidenceBadge value={task.confidence} className="h-5 px-1.5 text-[11px]" />
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <ReviewRiskBadge task={task} className="h-5 px-1.5 text-[11px]" />
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <ReviewStatusBadge status={task.status} className="h-5 px-1.5 text-[11px]" />
                    </td>
                    <td className="whitespace-nowrap px-2 text-textMuted">
                      {formatReviewTime(task.submitted_at)}
                    </td>
                    <td className="px-2">
                      <div
                        className="flex items-center justify-center gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Link
                          href={taskArchiveHref(task)}
                          aria-label={`查看 ${price.equipment_name} 价格档案`}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-white px-2 font-semibold text-primary hover:bg-primary-soft"
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                          {task.source_kind === "import" && !task.equipment_price_id ? "批次" : "档案"}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTask(task.id);
                            onMore(task);
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-2 font-semibold text-ai hover:border-ai/40"
                          aria-label={`审核 ${price.equipment_name}`}
                        >
                          <ClipboardSignature className="size-3.5" aria-hidden="true" />
                          审核
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-borderSoft px-3 py-2 text-[12px] text-textSecondary">
        <span>
          共 <b className="text-textMain">{total}</b> 条，当前第 {page} / {pageCount} 页
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="上一页"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span aria-current="page" className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-primary px-2 font-bold text-white">
            {page}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="下一页"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
