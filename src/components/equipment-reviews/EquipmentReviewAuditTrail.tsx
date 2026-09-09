"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileUp,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EquipmentReviewAuditEvent } from "@/types/equipmentReview";

const eventMeta: Record<
  string,
  { label: string; tone: string; icon: typeof History }
> = {
  review_submitted: { label: "提交审核", tone: "text-primary bg-primary-soft", icon: FileUp },
  review_started: { label: "认领审核", tone: "text-ai bg-ai-soft", icon: UserRoundCheck },
  review_progress_saved: { label: "保存进度", tone: "text-primary bg-primary-soft", icon: Save },
  review_approved: { label: "审核通过", tone: "text-success bg-success-soft", icon: CheckCircle2 },
  review_returned: { label: "退回补资料", tone: "text-warning bg-warning-soft", icon: RotateCcw },
  review_rejected: { label: "审核驳回", tone: "text-danger bg-danger-soft", icon: XCircle },
  evidence_uploaded: { label: "上传证据", tone: "text-primary bg-primary-soft", icon: FileUp },
  evidence_updated: { label: "更新证据", tone: "text-primary bg-primary-soft", icon: FileCheck2 },
  evidence_archived: { label: "作废证据", tone: "text-danger bg-danger-soft", icon: XCircle },
  evidence_previewed: { label: "预览证据", tone: "text-textSecondary bg-slate-100", icon: Eye },
  evidence_downloaded: { label: "下载证据", tone: "text-textSecondary bg-slate-100", icon: Download },
  price_record_updated: { label: "同步价格状态", tone: "text-ai bg-ai-soft", icon: ShieldCheck },
};

const roleLabels = {
  admin: "管理员",
  manager: "审核经理",
  reviewer: "审核员",
  editor: "资料编辑",
  viewer: "只读用户",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function EquipmentReviewAuditTrail({
  reviewId,
  revision,
  canReadFullAudit,
}: {
  reviewId: string;
  revision: string;
  canReadFullAudit: boolean;
}) {
  const [events, setEvents] = useState<EquipmentReviewAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/equipment-prices/reviews/${reviewId}/audit`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: { events?: EquipmentReviewAuditEvent[] };
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "读取审计记录失败");
        setEvents(payload.data?.events ?? []);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "读取审计记录失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reviewId, revision, refreshKey]);

  const visibleEvents = useMemo(
    () => (expanded ? events : events.slice(0, 5)),
    [events, expanded]
  );

  return (
    <div className="border-t border-borderSoft pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h3 className="text-[12px] font-bold text-textMain">权限与审计轨迹</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold text-primary">
            {canReadFullAudit ? "完整审计权限" : "任务级脱敏视图"}
          </span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              setExpanded(false);
              setRefreshKey((current) => current + 1);
            }}
            disabled={loading}
            title="刷新审计轨迹"
            className="flex size-6 items-center justify-center rounded-md border border-borderSoft bg-white text-textMuted hover:text-primary disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-2 flex h-16 items-center justify-center rounded-md border border-borderSoft bg-slate-50 text-[11px] text-textMuted">
          <Loader2 className="mr-2 size-3.5 animate-spin" /> 正在读取审计记录
        </div>
      ) : error ? (
        <div className="mt-2 rounded-md border border-danger/15 bg-danger-soft px-2.5 py-2 text-[10px] text-danger">
          {error}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="mt-2 rounded-md border border-borderSoft bg-slate-50 px-2.5 py-3 text-center text-[10px] text-textMuted">
          暂无操作轨迹；首次认领、保存或提交结论后会自动留痕。
        </div>
      ) : (
        <div className="mt-2 space-y-1.5">
          {visibleEvents.map((event) => {
            const meta = eventMeta[event.eventType] ?? {
              label: "业务数据变更",
              tone: "text-textSecondary bg-slate-100",
              icon: Clock3,
            };
            const Icon = meta.icon;
            return (
              <div
                key={event.id}
                className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-2 rounded-md border border-borderSoft bg-white px-2 py-1.5"
              >
                <span className={cn("flex size-6 items-center justify-center rounded-md", meta.tone)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-[10px] font-bold text-textMain">{meta.label}</span>
                    <span className="truncate text-[9px] text-textMuted">
                      {event.actorName} · {event.actorRole ? roleLabels[event.actorRole] : "系统"}
                    </span>
                  </div>
                  {event.comment ? (
                    <p className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-textSecondary">
                      {event.comment}
                    </p>
                  ) : null}
                </div>
                <time className="whitespace-nowrap text-[9px] tabular-nums text-textMuted">
                  {formatTime(event.createdAt)}
                </time>
              </div>
            );
          })}
          {events.length > 5 ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="w-full rounded-md border border-primary/15 bg-primary-soft py-1.5 text-[10px] font-bold text-primary"
            >
              {expanded ? "收起审计记录" : `查看全部 ${events.length} 条记录`}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
