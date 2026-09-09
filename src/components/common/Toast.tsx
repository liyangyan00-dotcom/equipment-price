"use client";

import { AlertTriangle, CheckCircle2, Info, Sparkles, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMockToastStore, type MockToastTone } from "@/hooks/useMockToast";

const toneClass: Record<MockToastTone, { wrap: string; icon: string; Icon: typeof Info }> = {
  success: {
    wrap: "border-success/20 bg-success-soft text-success",
    icon: "bg-success text-white",
    Icon: CheckCircle2,
  },
  info: {
    wrap: "border-primary/20 bg-primary-soft text-primary",
    icon: "bg-primary text-white",
    Icon: Info,
  },
  warning: {
    wrap: "border-warning/25 bg-warning-soft text-warning",
    icon: "bg-warning text-white",
    Icon: AlertTriangle,
  },
  danger: {
    wrap: "border-danger/25 bg-danger-soft text-danger",
    icon: "bg-danger text-white",
    Icon: XCircle,
  },
  ai: {
    wrap: "border-ai-border bg-ai-soft text-ai",
    icon: "bg-ai text-white",
    Icon: Sparkles,
  },
};

export function ToastViewport() {
  const { toasts, dismiss } = useMockToastStore();

  return (
    <div
      className="pointer-events-none fixed right-4 top-[68px] z-[110] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2 sm:right-5"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => {
        const tone = toneClass[toast.tone];
        const Icon = tone.Icon;

        return (
          <div
            key={toast.id}
            role={toast.tone === "danger" || toast.tone === "warning" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto rounded-card border bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl transition",
              tone.wrap
            )}
          >
            <div className="flex items-start gap-3">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px]", tone.icon)}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-5 text-textMain">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-[12px] leading-5 text-textMuted">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-textMuted transition hover:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="关闭提示"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
