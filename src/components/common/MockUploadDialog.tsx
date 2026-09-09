"use client";

import { useId, useState } from "react";
import { FileUp, UploadCloud, X } from "lucide-react";
import { LoadingButton } from "./LoadingButton";
import { OverlayShell } from "./OverlayShell";

type MockUploadDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function MockUploadDialog({ open, onClose, onConfirm }: MockUploadDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [fileName, setFileName] = useState("");

  return (
    <OverlayShell open={open} onClose={onClose} labelledBy={titleId} describedBy={descriptionId}>
        <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-card bg-primary-soft text-primary">
              <UploadCloud className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id={titleId} className="text-[16px] font-semibold text-textMain">模拟上传文件</h2>
              <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">不会上传到服务器，仅加入前端 mock 流程。</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-primary/35 bg-primary-soft/70 p-5 text-center">
            <FileUp className="size-10 text-primary" aria-hidden="true" />
            <span className="mt-3 text-[14px] font-semibold text-primary">{fileName || "选择文件或拖拽到这里"}</span>
            <span className="mt-1 text-[12px] text-textMuted">支持 PDF / Word / Excel / 图片，当前为 mock 选择。</span>
            <input
              type="file"
              className="sr-only"
              data-overlay-autofocus
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-borderSoft px-5 py-4">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary">
            取消
          </button>
          <LoadingButton icon={<UploadCloud className="size-4" aria-hidden="true" />} onClick={onConfirm}>
            确认模拟上传
          </LoadingButton>
        </div>
    </OverlayShell>
  );
}
