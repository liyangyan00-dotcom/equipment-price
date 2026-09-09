"use client";

import { useId } from "react";
import { ArrowRight, Bot, CheckCircle2, FileText, ShieldAlert, X } from "lucide-react";
import { LoadingButton } from "./LoadingButton";
import { OverlayShell } from "./OverlayShell";

type DetailDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onPrimary?: () => void;
};

const details = [
  { label: "AI置信度", value: "92%", icon: Bot, tone: "text-ai bg-ai-soft" },
  { label: "风险等级", value: "中风险", icon: ShieldAlert, tone: "text-warning bg-warning-soft" },
  { label: "审核状态", value: "待人工确认", icon: CheckCircle2, tone: "text-success bg-success-soft" },
  { label: "关联证据", value: "6 份附件", icon: FileText, tone: "text-primary bg-primary-soft" },
];

export function DetailDrawer({ open, title, description, onClose, onPrimary }: DetailDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <OverlayShell open={open} onClose={onClose} variant="drawer" labelledBy={titleId} describedBy={descriptionId}>
      <div className="h-full overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-borderSoft bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 pr-3">
            <h2 id={titleId} className="text-[16px] font-semibold text-textMain">{title}</h2>
            <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">{description ?? "当前为 mock 详情预览。"}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            {details.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-card border border-borderSoft bg-[var(--color-bg-muted)] p-3">
                  <span className={`flex size-8 items-center justify-center rounded-[10px] ${item.tone}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[12px] text-textMuted">{item.label}</p>
                  <p className="mt-1 text-[16px] font-semibold text-textMain">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-card border border-ai-border bg-ai-soft p-4">
            <p className="text-[13px] font-semibold text-ai">AI处理建议</p>
            <p className="mt-2 text-[12px] leading-6 text-textSecondary">
              建议优先核对价格来源、供应商可信度和缺失字段。AI 结果仅作为辅助判断，最终需人工确认。
            </p>
          </div>

          <LoadingButton tone="ai" icon={<ArrowRight className="size-4" aria-hidden="true" />} onClick={onPrimary}>
            进入关联流程
          </LoadingButton>
        </div>
      </div>
    </OverlayShell>
  );
}
