"use client";

import { useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PriceCollectionEvidenceRecord,
  PriceCollectionHistoryMatchRecord,
  PriceCollectionReviewerRecord,
} from "@/types/priceCollection";

type Props = {
  assignedReviewerId: string | null;
  assignmentNote: string;
  reviewDueAt: string;
  reviewers: PriceCollectionReviewerRecord[];
  evidence: PriceCollectionEvidenceRecord[];
  historyMatches: PriceCollectionHistoryMatchRecord[];
  loading: boolean;
  canReview: boolean;
  disabled: boolean;
  onAssign: (reviewerId: string, note: string, reviewDueAt: string) => Promise<void>;
  onCaptureSnapshot: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export function PriceLeadReviewGovernance({
  assignedReviewerId,
  assignmentNote,
  reviewDueAt,
  reviewers,
  evidence,
  historyMatches,
  loading,
  canReview,
  disabled,
  onAssign,
  onCaptureSnapshot,
  onRefresh,
}: Props) {
  const [reviewerId, setReviewerId] = useState(assignedReviewerId ?? "");
  const [note, setNote] = useState(assignmentNote);
  const [dueAt, setDueAt] = useState(reviewDueAt ? reviewDueAt.slice(0, 16) : "");
  const [assigning, setAssigning] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const latestSnapshot = evidence[0];
  const strongestMatch = historyMatches[0];
  const hasStrongDuplicate = historyMatches.some((item) => item.matchScore >= 85);

  async function assign() {
    if (!reviewerId) return;
    setAssigning(true);
    try {
      await onAssign(reviewerId, note, dueAt ? new Date(dueAt).toISOString() : "");
    } finally {
      setAssigning(false);
    }
  }

  async function capture() {
    setCapturing(true);
    try {
      await onCaptureSnapshot();
    } finally {
      setCapturing(false);
    }
  }

  return (
    <section className="space-y-2.5 rounded-[12px] border border-borderSoft p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-1.5 text-[13px] font-bold">
            <UserRoundCheck className="size-4 text-primary" />审核治理
          </h3>
          <p className="mt-0.5 text-[10px] text-textMuted">责任到人、证据留痕、历史价格复核</p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="inline-flex size-7 items-center justify-center rounded-[7px] border border-borderSoft text-primary disabled:opacity-50"
          title="刷新审核治理数据"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="rounded-[9px] border border-primary/15 bg-primary-soft/50 p-2.5">
        <div className="flex items-center justify-between">
          <strong className="text-[11px] text-primary">审核责任人</strong>
          <span className="text-[10px] text-textMuted">同组织审核角色</span>
        </div>
        <div className="mt-2 grid grid-cols-[1fr_136px] gap-2">
          <select
            value={reviewerId}
            onChange={(event) => setReviewerId(event.target.value)}
            disabled={!canReview || disabled}
            className="h-8 min-w-0 rounded-[7px] border border-borderSoft bg-white px-2 text-[11px] outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">请选择责任人</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.userId} value={reviewer.userId}>
                {reviewer.displayName}{reviewer.isCurrentUser ? "（我）" : ""} · {reviewer.role}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={!canReview || disabled}
            className="h-8 rounded-[7px] border border-borderSoft bg-white px-2 text-[10px] outline-none focus:border-primary disabled:opacity-50"
            title="审核截止时间"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!canReview || disabled}
            placeholder="分派说明（可选）"
            className="h-8 min-w-0 flex-1 rounded-[7px] border border-borderSoft bg-white px-2 text-[11px] outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void assign()}
            disabled={!canReview || disabled || !reviewerId || assigning}
            className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-primary px-3 text-[11px] font-semibold text-white disabled:opacity-45"
          >
            {assigning ? <LoaderCircle className="size-3.5 animate-spin" /> : <UserRoundCheck className="size-3.5" />}
            分派
          </button>
        </div>
      </div>

      <div className="rounded-[9px] border border-ai/15 bg-ai-soft/45 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <strong className="inline-flex items-center gap-1.5 text-[11px] text-ai">
              <Camera className="size-3.5" />来源证据快照
            </strong>
            <p className="mt-1 truncate text-[10px] text-textSecondary" title={latestSnapshot?.evidenceCode}>
              {latestSnapshot
                ? `${evidence.length} 份 · 最新 ${latestSnapshot.evidenceCode}`
                : "尚未保存审核快照"}
            </p>
            {latestSnapshot ? (
              <p className="mt-0.5 text-[10px] text-textMuted">{formatDate(latestSnapshot.capturedAt || latestSnapshot.fetchedAt)}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void capture()}
            disabled={!canReview || disabled || capturing}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[7px] border border-ai/25 bg-white px-2.5 text-[10px] font-semibold text-ai disabled:opacity-45"
          >
            {capturing ? <LoaderCircle className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            保存当前快照
          </button>
        </div>
      </div>

      <div className={cn(
        "rounded-[9px] border p-2.5",
        hasStrongDuplicate ? "border-danger/20 bg-danger/5" : "border-success/15 bg-success/5",
      )}>
        <div className="flex items-center justify-between">
          <strong className="text-[11px]">历史价格重复比对</strong>
          <span className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold",
            hasStrongDuplicate ? "bg-danger/10 text-danger" : "bg-success/10 text-success",
          )}>
            {hasStrongDuplicate ? "需核对" : "未发现强重复"}
          </span>
        </div>
        {loading ? (
          <div className="mt-2 inline-flex items-center gap-2 text-[10px] text-textMuted">
            <LoaderCircle className="size-3.5 animate-spin" />正在比对正式价格库
          </div>
        ) : strongestMatch ? (
          <div className="mt-2 space-y-1.5">
            {historyMatches.slice(0, 3).map((match) => (
              <div key={match.recordId} className="grid grid-cols-[1fr_auto] gap-2 rounded-[7px] border border-white/80 bg-white/80 px-2 py-1.5 text-[10px]">
                <div className="min-w-0">
                  <div className="truncate font-semibold" title={`${match.recordCode} ${match.recordName}`}>{match.recordCode} · {match.recordName}</div>
                  <div className="mt-0.5 truncate text-textMuted" title={match.recordSpecification}>{match.recordSpecification || "规格未记录"}</div>
                </div>
                <div className="text-right tabular-nums">
                  <strong className={match.matchScore >= 85 ? "text-danger" : "text-primary"}>{match.matchScore.toFixed(0)}%</strong>
                  <div className="mt-0.5 text-textMuted">价差 {match.priceDeltaPct == null ? "-" : `${match.priceDeltaPct > 0 ? "+" : ""}${match.priceDeltaPct.toFixed(1)}%`}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-success">
            <CheckCircle2 className="size-3.5" />正式价格库中暂无相似记录
          </div>
        )}
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-textMuted">
          <Clock3 className="size-3" />匹配结果仅供审核参考，不替代人工结论
        </div>
      </div>
    </section>
  );
}
