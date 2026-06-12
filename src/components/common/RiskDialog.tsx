"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { RiskBadge } from "@/components/badges/RiskBadge";
import type { RiskLevel } from "@/types/common";
import { ConfirmDialog } from "./ConfirmDialog";

type RiskDialogProps = {
  open: boolean;
  title: string;
  riskLevel: RiskLevel;
  description?: string;
  riskNotes?: string[];
  children?: ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export function RiskDialog({
  open,
  title,
  riskLevel,
  description,
  riskNotes = [],
  children,
  onConfirm,
  onCancel,
}: RiskDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel="进入人工复核"
      cancelLabel="稍后处理"
      tone={riskLevel === "critical" || riskLevel === "high" ? "danger" : "warning"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
          <RiskBadge level={riskLevel} />
        </div>
        {riskNotes.length > 0 ? (
          <ul className="flex flex-col gap-2 rounded-card border border-warning/20 bg-warning-soft/60 p-3 text-caption text-[#92400E]">
            {riskNotes.map((note) => (
              <li key={note}>- {note}</li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </ConfirmDialog>
  );
}
