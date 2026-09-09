"use client";

import { useId } from "react";
import { Download, FileSpreadsheet, FileText, FileType, X } from "lucide-react";
import { LoadingButton } from "./LoadingButton";
import { OverlayShell } from "./OverlayShell";

type MockExportDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (format: string) => void;
};

const formats = [
  { label: "Word", desc: "生成 .docx 导出任务", icon: FileText },
  { label: "PDF", desc: "生成 .pdf 导出任务", icon: FileType },
  { label: "Excel", desc: "生成 .xlsx 导出任务", icon: FileSpreadsheet },
];

export function MockExportDialog({ open, onClose, onConfirm }: MockExportDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <OverlayShell open={open} onClose={onClose} labelledBy={titleId} describedBy={descriptionId}>
        <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-card bg-success-soft text-success">
              <Download className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id={titleId} className="text-[16px] font-semibold text-textMain">模拟导出</h2>
              <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">选择格式后创建前端导出任务，不生成真实文件。</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {formats.map((format) => {
            const Icon = format.icon;
            return (
              <button
                key={format.label}
                type="button"
                data-overlay-autofocus={format.label === "Word" ? "true" : undefined}
                onClick={() => onConfirm(format.label)}
                className="rounded-card border border-borderSoft bg-white p-4 text-left transition hover:border-primary hover:bg-primary-soft"
              >
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <p className="mt-3 text-[14px] font-semibold text-textMain">{format.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-textMuted">{format.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-borderSoft px-5 py-4">
          <LoadingButton tone="ghost" onClick={onClose}>
            关闭
          </LoadingButton>
        </div>
    </OverlayShell>
  );
}
