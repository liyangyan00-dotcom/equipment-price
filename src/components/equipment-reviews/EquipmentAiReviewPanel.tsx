"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type {
  EquipmentAiReviewOutput,
  EquipmentAiReviewRun,
} from "@/types/equipmentAiReview";

type EquipmentAiReviewPanelProps = {
  reviewId: string;
  fallbackJudgment: string | null;
  fallbackRecommendation: string | null;
  canRun: boolean;
  canApplySuggestion: boolean;
  hasUnsavedChanges: boolean;
  onApplySuggestion: (output: EquipmentAiReviewOutput | null) => void;
  onCompleted: () => void;
};

const statusMeta = {
  queued: { label: "排队中", className: "text-primary bg-primary-soft" },
  running: { label: "运行中", className: "text-ai bg-ai-soft" },
  completed: { label: "已完成", className: "text-success bg-success-soft" },
  needs_review: { label: "待人工确认", className: "text-warning bg-warning-soft" },
  failed: { label: "运行失败", className: "text-danger bg-danger-soft" },
  cancelled: { label: "已取消", className: "text-textMuted bg-slate-100" },
} as const;

function formatRunTime(value: string | null | undefined) {
  if (!value) return "尚未运行";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function EquipmentAiReviewPanel({
  reviewId,
  fallbackJudgment,
  fallbackRecommendation,
  canRun,
  canApplySuggestion,
  hasUnsavedChanges,
  onApplySuggestion,
  onCompleted,
}: EquipmentAiReviewPanelProps) {
  const toast = useMockToast();
  const [runs, setRuns] = useState<EquipmentAiReviewRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/equipment-prices/reviews/${reviewId}/ai`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        data?: EquipmentAiReviewRun[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "读取 AI 预审记录失败");
      setRuns(payload.data ?? []);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "读取 AI 预审记录失败");
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/equipment-prices/reviews/${reviewId}/ai`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: EquipmentAiReviewRun[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "读取 AI 预审记录失败");
        if (!cancelled) setRuns(payload.data ?? []);
      })
      .catch((runError: unknown) => {
        if (!cancelled) {
          setError(runError instanceof Error ? runError.message : "读取 AI 预审记录失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  const latestRun = runs[0] ?? null;
  const output = latestRun?.output_payload ?? null;
  const judgment = output?.judgment || fallbackJudgment || "AI 尚未生成结构化预审判断。";
  const recommendation =
    output?.recommendation ||
    fallbackRecommendation ||
    "请结合证据链完成人工审核。";
  const meta = latestRun ? statusMeta[latestRun.status] : null;
  const reasonLabels = useMemo(
    () =>
      output?.reasonCodes.map((code) =>
        ({
          MISSING_REQUIRED_FIELDS: "缺少必填字段",
          EVIDENCE_REQUIRES_REVIEW: "证据待核验",
          BUSINESS_RULES_MATCHED: "命中业务规则",
          ELEVATED_PRICE_RISK: "价格风险偏高",
          LOW_AI_CONFIDENCE: "AI 置信度偏低",
        })[code] ?? code
      ) ?? [],
    [output]
  );

  const runPreReview = async () => {
    if (hasUnsavedChanges) {
      toast.warning("请先保存人工审核进度", "AI 预审完成后会刷新任务数据，避免覆盖未保存意见。 ");
      return;
    }
    if (!canRun) {
      toast.warning("当前任务不可运行 AI 预审", "任务可能已结束、已由其他审核员认领或当前角色无权限。 ");
      return;
    }

    setRunning(true);
    setError("");
    toast.ai("AI 预审已启动", "正在校验价格、参数、来源与证据完整度。 ");
    try {
      const response = await fetch(
        `/api/equipment-prices/reviews/${reviewId}/ai`,
        { method: "POST" }
      );
      const payload = (await response.json()) as {
        data?: EquipmentAiReviewRun;
        error?: string;
        detail?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(payload.error || payload.detail || "AI 预审失败");
      toast.success(
        "AI 预审已完成",
        payload.message || "结构化结果已保存，仍需审核员人工确认。"
      );
      await loadRuns();
      onCompleted();
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "AI 预审失败";
      setError(message);
      toast.danger("AI 预审运行失败", `${message}；原人工审核数据未被修改。`);
      await loadRuns();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="border-t border-borderSoft pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-ai-soft text-ai">
            <Bot className="size-4" />
          </span>
          <div>
            <h3 className="text-[12px] font-bold text-textMain">AI 预审判断</h3>
            <p className="text-[10px] text-textMuted">结构化输出 · 版本留痕 · 人工最终确认</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {meta ? (
            <span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", meta.className)}>
              {meta.label}
            </span>
          ) : null}
          <AiBadge label="需人工确认" className="h-5 text-[10px]" />
        </div>
      </div>

      <div className="rounded-md border border-ai/15 bg-gradient-to-br from-ai-soft/80 to-white px-3 py-2.5">
        {loading ? (
          <div className="flex h-16 items-center justify-center gap-2 text-[11px] text-ai">
            <Loader2 className="size-4 animate-spin" />
            读取 AI 运行记录
          </div>
        ) : (
          <>
            <p className="text-[12px] leading-5 text-textMain">{judgment}</p>
            <p className="mt-1 text-[11px] leading-5 text-ai">建议：{recommendation}</p>

            {latestRun ? (
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                <div className="rounded-md border border-white bg-white/80 px-2 py-1.5">
                  <p className="text-textMuted">置信度</p>
                  <p className="mt-0.5 font-bold text-ai">{Math.round(latestRun.confidence ?? 0)}%</p>
                </div>
                <div className="rounded-md border border-white bg-white/80 px-2 py-1.5">
                  <p className="text-textMuted">模型</p>
                  <p className="mt-0.5 truncate font-bold text-textMain" title={latestRun.model}>
                    {latestRun.model}
                  </p>
                </div>
                <div className="rounded-md border border-white bg-white/80 px-2 py-1.5">
                  <p className="text-textMuted">运行时间</p>
                  <p className="mt-0.5 font-bold text-textMain">
                    {formatRunTime(latestRun.completed_at || latestRun.created_at)}
                  </p>
                </div>
              </div>
            ) : null}

            {reasonLabels.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {reasonLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-ai/15 bg-white px-2 py-0.5 text-[9px] font-semibold text-ai"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            {error || latestRun?.status === "failed" ? (
              <div className="mt-2 flex items-start gap-1.5 rounded-md border border-danger/15 bg-danger-soft px-2 py-1.5 text-[10px] text-danger">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                {error || latestRun?.error_message || "AI 预审失败，可安全重试。"}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => void runPreReview()}
                disabled={running || !canRun}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-ai px-2.5 text-[10px] font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
                title={!canRun ? "当前任务或角色不允许运行 AI 预审" : undefined}
              >
                {running ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : latestRun ? (
                  <RefreshCw className="size-3" />
                ) : (
                  <Bot className="size-3" />
                )}
                {running ? "预审运行中" : latestRun ? "重新运行 AI 预审" : "运行 AI 预审"}
              </button>
              {canApplySuggestion ? (
                <button
                  type="button"
                  onClick={() => onApplySuggestion(output)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-ai/20 bg-white px-2 text-[10px] font-bold text-ai"
                >
                  <CheckCircle2 className="size-3" />
                  写入人工审核意见
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-textMuted">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="size-3 text-success" />
          AI 结果不会直接通过、驳回或覆盖人工结论
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="size-3" />
          {runs.length ? `保留最近 ${runs.length} 次运行` : "等待首次运行"}
        </span>
      </div>
    </div>
  );
}
