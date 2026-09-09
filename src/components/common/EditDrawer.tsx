"use client";

import { useId } from "react";
import { Save, X } from "lucide-react";
import { LoadingButton } from "./LoadingButton";
import { OverlayShell } from "./OverlayShell";

type EditDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onSave: () => void;
};

export function EditDrawer({ open, title, description, onClose, onSave }: EditDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <OverlayShell open={open} onClose={onClose} variant="drawer" labelledBy={titleId} describedBy={descriptionId} panelClassName="w-[420px]">
      <div className="flex h-full flex-col">
        <div className="flex min-h-16 items-start justify-between border-b border-borderSoft px-5 py-4">
          <div className="min-w-0 pr-3">
            <h2 id={titleId} className="text-[16px] font-semibold text-textMain">{title}</h2>
            <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">{description ?? "前端模拟编辑，不会写入真实数据库。"}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-24">
          {["名称/主题", "状态", "风险等级", "备注"].map((label, index) => (
            <label key={label} className="block">
              <span className="text-[12px] font-semibold text-textSecondary">{label}</span>
              <input
                className="mt-1 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] text-textMain outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                defaultValue={index === 0 ? "Mock 记录" : ""}
                placeholder={`请输入${label}`}
                data-overlay-autofocus={index === 0 ? "true" : undefined}
              />
            </label>
          ))}
        </div>

        <div className="mt-auto flex justify-end gap-3 border-t border-borderSoft bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary">
            取消
          </button>
          <LoadingButton icon={<Save className="size-4" aria-hidden="true" />} onClick={onSave}>
            保存修改
          </LoadingButton>
        </div>
      </div>
    </OverlayShell>
  );
}
