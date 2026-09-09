"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverlayShell } from "./OverlayShell";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  children?: ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  tone?: "default" | "warning" | "danger";
};

const toneClasses = {
  default: "text-primary bg-primary-soft",
  warning: "text-warning bg-warning-soft",
  danger: "text-danger bg-danger-soft",
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  children,
  onConfirm,
  onCancel,
  tone = "default",
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <OverlayShell
      open={open}
      onClose={() => onCancel?.()}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      panelClassName="max-w-[440px] bg-card p-5"
    >
        <div className="flex items-start gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-card", toneClasses[tone])}>
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-section-title text-textMain">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-body text-textMuted">{description}</p> : null}
          </div>
          <button type="button" onClick={onCancel} className="flex size-8 items-center justify-center rounded-sm text-textMuted hover:bg-[var(--color-muted-soft)]" aria-label="关闭">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {children ? <div className="mt-4 text-body text-textSecondary">{children}</div> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} data-overlay-autofocus className="h-9 rounded-md border border-borderSoft bg-white px-4 text-body-medium text-textSecondary hover:bg-[var(--color-bg-muted)]">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "h-9 rounded-md px-4 text-body-medium text-white",
              tone === "danger" ? "bg-danger hover:bg-danger/90" : tone === "warning" ? "bg-warning hover:bg-warning/90" : "bg-primary hover:bg-primary-hover"
            )}
          >
            {confirmLabel}
          </button>
        </div>
    </OverlayShell>
  );
}
