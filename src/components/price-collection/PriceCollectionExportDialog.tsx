"use client";

import { useId, useState } from "react";
import { Download, FileJson, FileSpreadsheet, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";

type ExportFormat = "csv" | "json";

type Props = {
  open: boolean;
  count: number;
  selectedCount: number;
  onClose: () => void;
  onExport: (format: ExportFormat, selectedOnly: boolean) => Promise<void>;
};

export function PriceCollectionExportDialog({ open, count, selectedCount, onClose, onExport }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [selectedOnly, setSelectedOnly] = useState(selectedCount > 0);
  const [exporting, setExporting] = useState(false);

  async function submit() {
    setExporting(true);
    try {
      await onExport(format, selectedOnly && selectedCount > 0);
      onClose();
    } finally {
      setExporting(false);
    }
  }

  return (
    <OverlayShell open={open} onClose={onClose} labelledBy={titleId} describedBy={descriptionId}>
      <header className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-card bg-success-soft text-success"><Download className="size-5" /></span>
          <div>
            <h2 id={titleId} className="text-[16px] font-semibold text-textMain">导出采集结果</h2>
            <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">由后端读取当前业务数据并生成可下载文件。</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100"><X className="size-4" /></button>
      </header>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          {([
            ["csv", "CSV / Excel", "适合继续筛选、核对和汇总", FileSpreadsheet],
            ["json", "JSON", "保留字段结构，适合系统交换", FileJson],
          ] as const).map(([value, label, description, Icon]) => (
            <button key={value} type="button" onClick={() => setFormat(value)} className={`rounded-card border p-4 text-left ${format === value ? "border-primary bg-primary-soft" : "border-borderSoft bg-white"}`}>
              <Icon className="size-5 text-primary" />
              <strong className="mt-3 block text-[13px] text-textMain">{label}</strong>
              <span className="mt-1 block text-[11px] leading-5 text-textMuted">{description}</span>
            </button>
          ))}
        </div>
        <div className="rounded-card border border-borderSoft bg-slate-50 p-3 text-[12px] text-textSecondary">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={selectedOnly && selectedCount > 0} disabled={!selectedCount} onChange={(event) => setSelectedOnly(event.target.checked)} />
            仅导出已选记录（{selectedCount} 条）
          </label>
          <p className="mt-2 text-textMuted">未勾选时导出当前筛选范围，共 {count} 条，最多 5,000 条。</p>
        </div>
      </div>
      <footer className="flex justify-end gap-2 border-t border-borderSoft px-5 py-4">
        <button type="button" onClick={onClose} className="h-9 rounded-[8px] border border-borderSoft px-4 text-[12px] font-bold">取消</button>
        <button type="button" disabled={exporting} onClick={() => void submit()} className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-60">
          <Download className="size-4" /> {exporting ? "正在生成" : "生成并下载"}
        </button>
      </footer>
    </OverlayShell>
  );
}
