"use client";

import { useEffect, useId, useState } from "react";
import { Bot, CheckCircle2, Loader2, ShieldAlert, Sparkles, X } from "lucide-react";
import { LoadingButton } from "./LoadingButton";
import { OverlayShell } from "./OverlayShell";

type AiActionDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onComplete: () => void;
};

export function AiActionDialog({ open, title, description, onClose, onComplete }: AiActionDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <AiActionDialogContent
      title={title}
      description={description}
      onClose={onClose}
      onComplete={onComplete}
    />
  );
}

function AiActionDialogContent({ title, description, onClose, onComplete }: Omit<AiActionDialogProps, "open">) {
  const [progress, setProgress] = useState(0);
  const completed = progress >= 100;
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(100, value + 20));
    }, 180);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <OverlayShell open onClose={onClose} labelledBy={titleId} describedBy={descriptionId} panelClassName="border-ai-border">
        <div className="relative border-b border-ai-border bg-gradient-to-br from-ai-soft via-white to-primary-soft px-5 py-4">
          <div className="absolute right-7 top-4 flex size-16 items-center justify-center rounded-full bg-ai text-white shadow-[0_0_40px_rgba(126,58,242,0.35)]">
            <Sparkles className="size-7" aria-hidden="true" />
          </div>
          <div className="flex items-start gap-3 pr-20">
            <span className="flex size-10 items-center justify-center rounded-card bg-ai text-white">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id={titleId} className="text-[16px] font-semibold text-textMain">{title}</h2>
              <p id={descriptionId} className="mt-1 text-[12px] leading-5 text-textMuted">
                {description ?? "正在模拟 AI 任务，结果不会调用真实 AI API。"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-white/70">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-card border border-borderSoft bg-[var(--color-bg-muted)] p-4">
            <div className="flex items-center justify-between text-[12px] font-semibold">
              <span className="text-textSecondary">{completed ? "AI 处理已完成" : "AI 正在处理"}</span>
              <span className="text-ai">{progress}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white">
              <div className="h-full rounded-full bg-ai transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-success/20 bg-success-soft p-3">
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
              <p className="mt-2 text-[12px] font-semibold text-textMain">已生成建议</p>
              <p className="mt-1 text-[11px] leading-5 text-textMuted">置信度、风险和待复核状态已模拟更新。</p>
            </div>
            <div className="rounded-card border border-warning/20 bg-warning-soft p-3">
              <ShieldAlert className="size-4 text-warning" aria-hidden="true" />
              <p className="mt-2 text-[12px] font-semibold text-textMain">保留人工确认</p>
              <p className="mt-1 text-[11px] leading-5 text-textMuted">AI 结果不会直接替代商务判断。</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-borderSoft px-5 py-4">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary">
            关闭
          </button>
          <LoadingButton
            tone="ai"
            loading={!completed}
            icon={completed ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Loader2 className="size-4" aria-hidden="true" />}
            onClick={onComplete}
          >
            {completed ? "应用模拟结果" : "处理中"}
          </LoadingButton>
        </div>
    </OverlayShell>
  );
}
