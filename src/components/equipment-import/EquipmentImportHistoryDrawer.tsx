"use client";

import Link from "next/link";
import { Clock3, Eye, FileSpreadsheet, RotateCcw, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";
import { cn } from "@/lib/utils";
import type { EquipmentImportBatchSummary } from "@/types/equipmentImport";

const statusConfig: Record<
  EquipmentImportBatchSummary["status"],
  { label: string; className: string }
> = {
  draft: { label: "草稿", className: "border-slate-200 bg-slate-100 text-slate-600" },
  uploaded: { label: "已上传", className: "border-primary/20 bg-primary-soft text-primary" },
  parsing: { label: "解析中", className: "border-ai/20 bg-ai-soft text-ai" },
  mapping: { label: "字段映射", className: "border-ai/20 bg-ai-soft text-ai" },
  validating: { label: "校验中", className: "border-warning/20 bg-warning-soft text-warning" },
  needs_review: { label: "待人工审核", className: "border-warning/20 bg-warning-soft text-warning" },
  importing: { label: "入库中", className: "border-primary/20 bg-primary-soft text-primary" },
  completed: { label: "已完成", className: "border-success/20 bg-success-soft text-success" },
  failed: { label: "失败", className: "border-danger/20 bg-danger-soft text-danger" },
  cancelled: { label: "已取消", className: "border-slate-200 bg-slate-100 text-slate-500" },
};

export function EquipmentImportHistoryDrawer({
  open,
  loading,
  batches,
  onClose,
  onReuse,
}: {
  open: boolean;
  loading: boolean;
  batches: EquipmentImportBatchSummary[];
  onClose: () => void;
  onReuse: (batch: EquipmentImportBatchSummary) => void;
}) {
  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="drawer"
      ariaLabel="设备价格导入记录"
      panelClassName="w-[560px]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-primary-soft text-primary">
              <Clock3 className="size-5" />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-textMain">设备价格导入记录</h2>
              <p className="mt-1 text-[12px] text-textMuted">查看草稿、待审核与已完成批次</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100"
            aria-label="关闭导入记录"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-36 items-center justify-center text-[12px] text-textMuted">
              正在读取导入批次...
            </div>
          ) : batches.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-[12px] border border-dashed border-borderSoft bg-slate-50 text-center">
              <FileSpreadsheet className="size-8 text-textMuted" />
              <p className="mt-2 text-[13px] font-semibold text-textMain">暂无导入记录</p>
              <p className="mt-1 text-[11px] text-textMuted">保存当前草稿后会显示在这里</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => {
                const status = statusConfig[batch.status];
                return (
                  <article key={batch.id} className="rounded-[12px] border border-borderSoft bg-white p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-textMain" title={batch.file_name}>
                          {batch.file_name}
                        </p>
                        <p className="mt-1 text-[10px] text-textMuted">{batch.batch_code}</p>
                      </div>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", status.className)}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[
                        ["识别", batch.total_rows],
                        ["有效", batch.valid_rows],
                        ["待处理", batch.needs_review_rows],
                        ["已选择", batch.selected_rows],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[8px] bg-slate-50 px-2 py-2 text-center">
                          <strong className="block text-[14px] text-textMain">{value}</strong>
                          <span className="text-[9px] text-textMuted">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-borderSoft pt-3">
                      <span className="text-[10px] text-textMuted">
                        {new Date(batch.created_at).toLocaleString("zh-CN", { hour12: false })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/equipment-prices/import/${encodeURIComponent(batch.id)}`}
                          onClick={onClose}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[10px] font-semibold text-textSecondary hover:border-primary/30 hover:text-primary"
                        >
                          <Eye className="size-3" />
                          查看详情
                        </Link>
                        {["draft", "uploaded", "mapping", "validating", "failed"].includes(batch.status) ? (
                          <button
                            type="button"
                            onClick={() => onReuse(batch)}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2.5 text-[10px] font-semibold text-primary"
                          >
                            <RotateCcw className="size-3" />
                            继续处理
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}
