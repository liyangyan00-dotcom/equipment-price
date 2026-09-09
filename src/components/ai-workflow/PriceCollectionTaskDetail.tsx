"use client";

import Link from "next/link";
import { CollectionCoveragePanel } from "./CollectionCoveragePanel";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileSearch,
  History,
  ListChecks,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Square,
  TerminalSquare,
  Trash2,
  X,
} from "lucide-react";
import { RiskBadge, StatusBadge } from "@/components/badges";
import {
  ConfirmDialog,
  EmptyState,
  LoadingButton,
  ModuleHeader,
} from "@/components/common";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type {
  PriceCollectionLeadRecord,
  PriceCollectionTaskDetail as TaskDetailPayload,
  PriceCollectionTaskAuditRecord,
  PriceCollectionTaskRecord,
  PriceCollectionTaskStatus,
} from "@/types/priceCollection";

type Props = { taskId: string };
type DetailTab = "results" | "execution" | "config";
type ScopeDraft = {
  keyword: string;
  specification: string;
  region: string;
  currency: string;
  sourceType: string;
  pricePeriodFrom: string;
  pricePeriodToMode: "current_month" | "fixed_month";
  pricePeriodTo: string;
  excludeUnknownPriceDate: boolean;
  dedupThreshold: number;
  maxPriceAgeDays: number;
  maxResults: number;
};

const statusMeta: Record<PriceCollectionTaskStatus, { label: string; tone: "blue" | "green" | "orange" | "red" | "purple" }> = {
  queued: { label: "排队中", tone: "blue" },
  running: { label: "采集中", tone: "purple" },
  paused: { label: "已暂停", tone: "orange" },
  completed: { label: "已完成", tone: "green" },
  stopped: { label: "已终止", tone: "orange" },
  failed: { label: "执行失败", tone: "red" },
};

function badgeStatus(status: PriceCollectionTaskStatus) {
  if (status === "running") return "running" as const;
  if (status === "completed") return "completed" as const;
  if (status === "failed" || status === "stopped") return "rejected" as const;
  return "pending" as const;
}

function formatDate(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function formatBeijingDate(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" })}（北京时间）`;
}

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: currency || "CNY", maximumFractionDigits: 2 }).format(value);
}

function leadStatusLabel(status: PriceCollectionLeadRecord["status"]) {
  return status === "transferred" ? "已入正式价格库" : status === "ready" ? "待正式入库" : status === "rejected" ? "已驳回" : "待线索池审核";
}

function outcomeLabel(task: PriceCollectionTaskRecord) {
  if (task.catalogCandidateCount > 0) return `已形成 ${task.catalogCandidateCount} 条设备目录候选`;
  if (task.outcomeStatus === "qualified") return `已形成 ${task.qualifiedLeadCount} 条合格价格`;
  if (task.outcomeStatus === "partial") return `部分成功 · ${task.qualifiedLeadCount} 条合格价格`;
  if (task.outcomeStatus === "no_price") return "已完成抓取，但未形成合格价格";
  if (task.outcomeStatus === "blocked") return "采集受阻，需处理来源异常";
  return "等待形成业务结果";
}

function workflowStatusLabel(value: string) {
  const labels: Record<string, string> = {
    queued: "等待执行",
    running: "执行中",
    paused: "已暂停",
    completed: "已完成",
    partial: "部分完成",
    failed: "执行失败",
    stopped: "已终止",
    cancelled: "已取消",
  };
  return labels[value] || value || "任务";
}

function auditEventLabel(item: PriceCollectionTaskAuditRecord) {
  if (item.action === "insert") return "任务已创建";
  if (item.oldStatus || item.newStatus) {
    return `${workflowStatusLabel(item.oldStatus)} → ${workflowStatusLabel(item.newStatus)}`;
  }
  return item.action === "update" ? "任务信息已更新" : "任务状态已记录";
}

function metricNumber(metrics: Record<string, unknown> | undefined, key: string) {
  const value = Number(metrics?.[key]);
  return Number.isFinite(value) ? value : 0;
}

export function PriceCollectionTaskDetail({ taskId }: Props) {
  const router = useRouter();
  const toast = useMockToast();
  const [data, setData] = useState<TaskDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [stopOpen, setStopOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState("每天");
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [failurePanelOpen, setFailurePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("results");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [managementConfirm, setManagementConfirm] = useState<"archive" | "delete" | null>(null);
  const [leadPage, setLeadPage] = useState(1);
  const [leadPageSize, setLeadPageSize] = useState<10 | 20 | 30>(10);
  const [leadLoading, setLeadLoading] = useState(true);
  const [scopeEditorOpen, setScopeEditorOpen] = useState(false);
  const [scopeDraft, setScopeDraft] = useState<ScopeDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    const leadParameters = new URLSearchParams({ leadPage: String(leadPage), leadPageSize: String(leadPageSize) });
    fetch(`/api/price-collection/tasks/${encodeURIComponent(taskId)}?${leadParameters}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as TaskDetailPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "采集任务加载失败");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setScheduleFrequency(["每小时", "每天", "每周", "每月"].includes(payload.task.frequency) ? payload.task.frequency : "每天");
        setData(payload);
        setLeadPage(payload.leadPagination.page);
        setError("");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "采集任务加载失败");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLeadLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [leadPage, leadPageSize, reloadKey, taskId]);

  const task = data?.task;
  const riskCount = data?.summary.highRiskLeads ?? 0;
  const pendingCount = data?.summary.pendingLeads ?? 0;
  const sourceCount = data?.sources.length ?? 0;
  const currentSourceRuns = useMemo(() => {
    const seen = new Set<string>();
    return (data?.sourceRuns ?? []).filter((sourceRun) => {
      const key = sourceRun.sourceId || sourceRun.sourceHost || sourceRun.sourceName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);
  const failedSourceRuns = useMemo(
    () => currentSourceRuns.filter((sourceRun) => sourceRun.status === "failed" || sourceRun.status === "partial" || sourceRun.failedCount > 0),
    [currentSourceRuns],
  );
  const operationalRuns = useMemo(
    () => (data?.runs ?? []).filter((run) => run.metrics.sourceLevelScheduling === true || run.metrics.operation == null),
    [data],
  );
  const qualityRuns = useMemo(() => operationalRuns.slice(0, 8).reverse().map((run) => ({
    ...run,
    yieldRate: run.fetchedCount > 0 ? Math.round(run.createdLeadCount / run.fetchedCount * 1000) / 10 : 0,
  })), [operationalRuns]);
  const latestRun = operationalRuns[0];
  const selectedRun = operationalRuns.find((item) => item.id === selectedRunId) || latestRun;
  const previousRun = operationalRuns[1];
  const consecutiveFailures = useMemo(() => {
    let count = 0;
    for (const run of operationalRuns) {
      if (run.status === "failed" || run.status === "partial" || run.failedSourceCount > 0) count += 1;
      else break;
    }
    return count;
  }, [operationalRuns]);
  const evidenceDrop = Boolean(
    latestRun && previousRun && previousRun.evidenceCount > 0
      && latestRun.evidenceCount < previousRun.evidenceCount * 0.5,
  );
  const latestQuoteDate = useMemo(() => {
    const values = (data?.leads ?? [])
      .map((lead) => lead.quoteDate)
      .filter(Boolean)
      .sort((left, right) => right.localeCompare(left));
    return values[0] || "";
  }, [data?.leads]);
  const groupedAuditItems = useMemo(() => {
    const groups: Array<PriceCollectionTaskAuditRecord & { repeatCount: number }> = [];
    for (const item of data?.auditLogs ?? []) {
      const previous = groups.at(-1);
      const key = `${item.action}:${item.oldStatus}:${item.newStatus}:${item.progress ?? ""}`;
      const previousKey = previous
        ? `${previous.action}:${previous.oldStatus}:${previous.newStatus}:${previous.progress ?? ""}`
        : "";
      if (previous && key === previousKey) {
        previous.repeatCount += 1;
      } else {
        groups.push({ ...item, repeatCount: 1 });
      }
    }
    return groups;
  }, [data?.auditLogs]);

  const refresh = () => {
    setLoading(true);
    setLeadLoading(true);
    setReloadKey((value) => value + 1);
  };

  const runAction = async (nextAction: "start" | "retry_failed" | "pause" | "resume" | "stop") => {
    if (!task) return;
    setAction(nextAction);
    if (nextAction === "start" || nextAction === "retry_failed") {
      toast.info(
        nextAction === "start" ? "采集任务已提交" : "失败来源重试已提交",
        "正在连接来源并生成证据，完成后将自动刷新本页。",
      );
    }
    try {
      const response = await fetch("/api/price-collection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "task", id: task.id, action: nextAction }),
      });
      const payload = await response.json().catch(() => ({})) as { task?: PriceCollectionTaskRecord; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error || "任务状态更新失败");
      setData((current) => current ? { ...current, task: payload.task as PriceCollectionTaskRecord } : current);
      toast.success(
        nextAction === "pause" ? "采集任务已暂停" : nextAction === "resume" ? "采集任务已继续" : nextAction === "stop" ? "采集任务已终止" : nextAction === "retry_failed" ? "失败来源已进入重试队列" : "采集任务已重新启动",
        nextAction === "start" || nextAction === "retry_failed"
          ? `${task.taskCode} · 最新状态、时间线和结果已刷新`
          : task.taskCode,
      );
      if (nextAction === "start" || nextAction === "retry_failed") refresh();
      if (nextAction === "retry_failed") setFailurePanelOpen(false);
    } catch (reason) {
      toast.danger("任务操作失败", reason instanceof Error ? reason.message : "请稍后重试");
    } finally {
      setAction(null);
      setStopOpen(false);
    }
  };

  const updateSchedule = async (enabled: boolean) => {
    if (!task) return;
    setAction("schedule");
    try {
      const response = await fetch("/api/price-collection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "task",
          id: task.id,
          action: "update_schedule",
          scheduleEnabled: enabled,
          frequency: enabled ? scheduleFrequency : "仅本次",
        }),
      });
      const payload = await response.json().catch(() => ({})) as { task?: PriceCollectionTaskRecord; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error || "周期调度更新失败");
      setData((current) => current ? { ...current, task: payload.task as PriceCollectionTaskRecord } : current);
      toast.success(
        payload.task.scheduleEnabled ? "周期调度已启用" : "周期调度已关闭",
        payload.task.scheduleEnabled ? `下次运行：${formatDate(payload.task.nextRunAt)}` : "任务将不再被定时器自动领取。",
      );
    } catch (reason) {
      toast.danger("周期调度更新失败", reason instanceof Error ? reason.message : "请稍后重试");
    } finally {
      setAction(null);
    }
  };

  const updateArchiveStatus = async (nextAction: "archive" | "restore") => {
    if (!task) return;
    setAction(nextAction);
    try {
      const response = await fetch("/api/price-collection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "task", id: task.id, action: nextAction }),
      });
      const payload = await response.json().catch(() => ({})) as { task?: PriceCollectionTaskRecord; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error || "任务管理状态更新失败");
      setData((current) => current ? { ...current, task: payload.task as PriceCollectionTaskRecord } : current);
      toast.success(
        nextAction === "archive" ? "任务已归档" : "任务已恢复",
        nextAction === "archive" ? "周期调度已关闭，成果、证据和审计记录继续保留。" : "任务已恢复为可管理状态，周期调度仍保持关闭。",
      );
    } catch (reason) {
      toast.danger(nextAction === "archive" ? "任务归档失败" : "任务恢复失败", reason instanceof Error ? reason.message : "请稍后重试");
    } finally {
      setAction(null);
      setManagementConfirm(null);
    }
  };

  const deleteTask = async () => {
    if (!task) return;
    setAction("delete");
    try {
      const response = await fetch(`/api/price-collection?entity=task&id=${encodeURIComponent(task.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { deleted?: boolean; error?: string };
      if (!response.ok || !payload.deleted) throw new Error(payload.error || "任务删除失败");
      toast.success("任务已删除", `${task.taskCode} 的空任务配置和运行记录已清除。`);
      router.push("/ai-price-collection");
      router.refresh();
    } catch (reason) {
      toast.danger("任务删除失败", reason instanceof Error ? reason.message : "请稍后重试");
    } finally {
      setAction(null);
      setManagementConfirm(null);
    }
  };

  const exportTaskArchive = async () => {
    if (!data || !task) return;
    setAction("export");
    try {
      const leadPages = Math.max(1, Math.ceil(data.summary.totalLeads / 30));
      const leadPayloads = await Promise.all(Array.from({ length: leadPages }, async (_, index) => {
        const response = await fetch(`/api/price-collection/tasks/${encodeURIComponent(task.id)}?leadPage=${index + 1}&leadPageSize=30`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as TaskDetailPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "候选线索读取失败");
        return payload.leads;
      }));
      const archive = {
        exportedAt: new Date().toISOString(),
        exportVersion: "price-collection-task-v1",
        task: data.task,
        summary: data.summary,
        runs: data.runs,
        sourceRuns: data.sourceRuns,
        sourceQuality: data.sourceQuality,
        sources: data.sources,
        leads: leadPayloads.flat(),
        evidence: data.evidence,
        discoveries: data.discoveries,
        catalogCandidates: data.catalogCandidates,
        auditLogs: data.auditLogs,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(archive, null, 2)], { type: "application/json;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${task.taskCode || "price-collection-task"}-archive.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("任务档案已导出", `已导出 ${archive.leads.length} 条候选线索及当前任务配置、运行和证据索引。`);
    } catch (reason) {
      toast.danger("任务档案导出失败", reason instanceof Error ? reason.message : "请稍后重试");
    } finally {
      setAction(null);
    }
  };

  const openScopeEditor = () => {
    if (!task) return;
    setScopeDraft({
      keyword: task.keyword,
      specification: task.specification,
      region: task.region,
      currency: task.currency,
      sourceType: task.sourceType || "all",
      pricePeriodFrom: String(task.config.pricePeriodFrom || ""),
      pricePeriodToMode: task.config.pricePeriodToMode === "fixed_month" ? "fixed_month" : "current_month",
      pricePeriodTo: String(task.config.pricePeriodTo || ""),
      excludeUnknownPriceDate: task.config.excludeUnknownPriceDate !== false,
      dedupThreshold: Number(task.config.dedupThreshold) || 85,
      maxPriceAgeDays: Number(task.config.maxPriceAgeDays) || 90,
      maxResults: Number(task.config.maxResults) || 100,
    });
    setScopeEditorOpen(true);
  };

  const createTaskFromScope = async () => {
    if (!task || !scopeDraft || !data) return;
    if (!scopeDraft.keyword.trim()) {
      toast.warning("请输入采集关键词");
      return;
    }
    if (scopeDraft.pricePeriodToMode === "fixed_month" && scopeDraft.pricePeriodFrom && scopeDraft.pricePeriodTo && scopeDraft.pricePeriodFrom > scopeDraft.pricePeriodTo) {
      toast.warning("价格所属期设置有误", "结束月份不能早于开始月份。");
      return;
    }
    const configuredSourceIds = Array.isArray(task.config.sourceIds)
      ? task.config.sourceIds.filter((value): value is string => typeof value === "string")
      : data.sources.map((source) => source.id);
    setAction("create_scope_task");
    try {
      const response = await fetch("/api/price-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_task",
          collectionMode: task.collectionMode,
          sourceIds: configuredSourceIds,
          targetType: task.targetType,
          keyword: scopeDraft.keyword.trim(),
          specification: scopeDraft.specification.trim(),
          region: scopeDraft.region.trim(),
          currency: scopeDraft.currency,
          sourceType: scopeDraft.sourceType,
          frequency: "仅本次",
          config: {
            ...task.config,
            pricePeriodFrom: scopeDraft.pricePeriodFrom,
            pricePeriodToMode: scopeDraft.pricePeriodToMode,
            pricePeriodTo: scopeDraft.pricePeriodToMode === "fixed_month" ? scopeDraft.pricePeriodTo : "",
            excludeUnknownPriceDate: scopeDraft.excludeUnknownPriceDate,
            dedupThreshold: scopeDraft.dedupThreshold,
            dedupScope: "item_source_price_period",
            samePeriodPolicy: "update_observation",
            crossPeriodPolicy: "create_new",
            maxPriceAgeDays: scopeDraft.maxPriceAgeDays,
            maxResults: scopeDraft.maxResults,
            clonedFromTaskId: task.id,
            clonedFromTaskCode: task.taskCode,
          },
        }),
      });
      const payload = await response.json().catch(() => ({})) as { task?: PriceCollectionTaskRecord; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error || "新任务创建失败");
      setScopeEditorOpen(false);
      toast.success("新任务已创建并开始执行", `${payload.task.taskCode} 已继承 ${configuredSourceIds.length} 个来源，可在详情页查看进度。`);
      router.push(`/ai-price-collection/tasks/${payload.task.id}`);
      router.refresh();
    } catch (reason) {
      toast.danger("新任务创建失败", reason instanceof Error ? reason.message : "请稍后重试");
    } finally {
      setAction(null);
    }
  };

  if (loading && !data) {
    return <div className="space-y-3"><div className="h-20 animate-pulse rounded-card bg-white" /><div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="h-[520px] animate-pulse rounded-card bg-white" /><div className="h-[520px] animate-pulse rounded-card bg-white" /></div></div>;
  }

  if (!task || error) {
    return (
      <EmptyState
        title="未找到采集任务"
        description={error || `任务 ${taskId} 不存在或当前账号无权访问。`}
        primaryAction={<Link href="/ai-price-collection" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-semibold text-white"><ArrowLeft className="size-4" />返回采集中心</Link>}
        secondaryAction={<button type="button" onClick={refresh} className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary"><RefreshCw className="size-4" />重新加载</button>}
      />
    );
  }

  const currentStatus = statusMeta[task.status];
  const auditItems = groupedAuditItems.length
    ? groupedAuditItems
    : [{ id: "created", action: "insert", actorId: "", createdAt: task.createdAt, oldStatus: "", newStatus: "queued", progress: 0, repeatCount: 1 }];
  const visibleAuditItems = timelineExpanded ? auditItems : auditItems.slice(0, 8);
  const latestFilteredCount = metricNumber(latestRun?.metrics, "filteredByPricePeriodCount");
  const latestUnknownDateCount = metricNumber(latestRun?.metrics, "unknownPriceDateCount");
  const latestCreatedCount = latestRun?.createdLeadCount ?? task.qualifiedLeadCount;
  const totalLeadCount = data.summary.totalLeads;
  const isArchived = Boolean(task.archivedAt);
  const hasExecutionRun = data.summary.runs > 0;
  const awaitingFirstRun = task.status === "queued" && !hasExecutionRun;
  const hasBusinessResults = totalLeadCount > 0 || task.catalogCandidateCount > 0 || task.successCount > 0;
  const canArchive = data.permissions.canWrite && !isArchived && !["running", "queued"].includes(task.status);
  const canDelete = data.permissions.canWrite
    && !isArchived
    && ["queued", "paused", "failed", "stopped"].includes(task.status)
    && !hasBusinessResults;
  const deleteBlockReason = hasBusinessResults
    ? "已有业务成果，只能归档"
    : isArchived
      ? "归档任务无需删除，可先恢复后评估"
      : ["running", "completed"].includes(task.status)
        ? "当前状态不允许删除"
        : !data.permissions.canWrite
          ? "当前角色没有删除权限"
          : "可以删除未产生业务成果的任务";
  const periodFrom = String(task.config.pricePeriodFrom || "未限定");
  const periodTo = task.config.pricePeriodToMode === "current_month"
    ? "当前月"
    : String(task.config.pricePeriodTo || "未限定");
  const reviewHref = task.catalogCandidateCount > 0
    ? "/equipment-catalog/reviews"
    : `/price-leads?taskId=${encodeURIComponent(task.id)}`;
  const summaryItems: Array<{ label: string; value: string; detail: string; icon: LucideIcon; tone: "blue" | "green" | "orange" | "red" | "purple" }> = [
    { label: "任务状态", value: currentStatus.label, detail: `进度 ${task.progress}%`, icon: Clock3, tone: currentStatus.tone },
    { label: "本次新增", value: `${latestCreatedCount} 条`, detail: latestRun ? `运行 ${latestRun.runCode.slice(-8)}` : "等待首次运行", icon: CheckCircle2, tone: "green" },
    { label: "累计线索", value: `${totalLeadCount} 条`, detail: `当前展示 ${data.leads.length} 条`, icon: Database, tone: "blue" },
    { label: "待人工审核", value: `${pendingCount} 条`, detail: "AI 不直接入库", icon: ListChecks, tone: "orange" },
    { label: "当前异常来源", value: `${failedSourceRuns.length} 个`, detail: failedSourceRuns.length ? "需要人工处理" : "来源运行正常", icon: AlertTriangle, tone: failedSourceRuns.length ? "red" : "green" },
    { label: "价格所属期", value: `${periodFrom} 至 ${periodTo}`, detail: `排除 ${latestFilteredCount} · 日期异常 ${latestUnknownDateCount}`, icon: CalendarClock, tone: "purple" },
  ];

  return (
    <div className="space-y-3" data-no-global-interaction>
      <PageHeader
        title="价格采集任务详情"
        description={`${task.taskCode} · ${task.targetType === "material" ? "地材" : "设备"} · ${task.keyword}`}
        actions={
          <>
            <Link href="/ai-price-collection" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary"><ArrowLeft className="size-4" />返回采集中心</Link>
            <LoadingButton tone="ghost" icon={<RefreshCw className="size-4" />} loading={loading} onClick={refresh}>刷新状态</LoadingButton>
            {!isArchived && task.status === "running" ? <LoadingButton tone="warning" icon={<Pause className="size-4" />} loading={action === "pause"} disabled={!data.permissions.canWrite} onClick={() => void runAction("pause")}>暂停任务</LoadingButton> : null}
            {!isArchived && task.status === "paused" ? <LoadingButton icon={<Play className="size-4" />} loading={action === "resume"} disabled={!data.permissions.canWrite} onClick={() => void runAction("resume")}>继续任务</LoadingButton> : null}
            {!isArchived && awaitingFirstRun ? <LoadingButton icon={<Play className="size-4" />} loading={action === "start"} disabled={!data.permissions.canWrite} onClick={() => void runAction("start")}>立即执行</LoadingButton> : null}
            {!isArchived && (task.status === "failed" || task.status === "stopped") ? <LoadingButton icon={<RotateCcw className="size-4" />} loading={action === "start"} disabled={!data.permissions.canWrite} onClick={() => void runAction("start")}>重新执行</LoadingButton> : null}
            {!isArchived && (["queued", "running", "paused"] as PriceCollectionTaskStatus[]).includes(task.status) && (task.status !== "queued" || hasExecutionRun) ? <LoadingButton tone="danger" icon={<Square className="size-4" />} disabled={!data.permissions.canWrite} onClick={() => setStopOpen(true)}>终止任务</LoadingButton> : null}
          </>
        }
      />

      <section className="overflow-hidden rounded-card border border-ai/20 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[10px] bg-ai-soft text-ai"><TerminalSquare className="size-5" /></div>
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-[16px] font-black text-textMain">{task.taskCode}</h2><StatusBadge status={badgeStatus(task.status)} label={currentStatus.label} />{isArchived ? <span className="rounded-full border border-borderSoft bg-slate-100 px-2 py-1 text-[10px] font-bold text-textSecondary">已归档</span> : null}</div><p className="mt-1 text-[12px] text-textMuted">{outcomeLabel(task)} · {sourceCount} 个白名单来源</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {failedSourceRuns.length ? <button type="button" onClick={() => setFailurePanelOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 text-[12px] font-bold text-warning"><AlertTriangle className="size-4" />{isArchived ? "查看" : "处理"} {failedSourceRuns.length} 个异常来源</button> : null}
            {(pendingCount > 0 || task.catalogCandidateCount > 0) ? <Link href={reviewHref} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white">{task.catalogCandidateCount > 0 ? `审核 ${task.catalogCandidateCount} 条目录候选` : `查看 ${pendingCount} 条待审核线索`}<ArrowRight className="size-4" /></Link> : null}
          </div>
        </div>
        <div className="border-t border-borderSoft bg-slate-50/70 px-4 py-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-textMuted"><span>任务进度 · {task.currentSource || task.sourceType || "等待调度"}</span><strong className="text-ai">{task.progress}%</strong></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-ai/10"><div className="h-full rounded-full bg-ai transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${task.progress}%` }} /></div>
        </div>
      </section>

      {isArchived ? <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-borderSoft bg-slate-100 px-4 py-3 text-[12px]"><div className="flex items-start gap-2"><Archive className="mt-0.5 size-4 text-textSecondary" /><div><strong className="text-textMain">任务处于归档只读状态</strong><p className="mt-0.5 text-[11px] text-textMuted">归档于 {formatDate(task.archivedAt)}。运行、调度和异常重试均已关闭，历史成果与证据仍可查阅和导出。</p></div></div>{data.permissions.canWrite ? <LoadingButton tone="ghost" icon={<ArchiveRestore className="size-4" />} loading={action === "restore"} onClick={() => void updateArchiveStatus("restore")}>恢复任务</LoadingButton> : null}</section> : null}

      <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
        <div className="grid grid-cols-2 divide-x divide-y divide-borderSoft sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          {summaryItems.map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className="min-w-0 p-3"><div className="flex items-center gap-1.5 text-[11px] font-semibold text-textMuted"><Icon className={cn("size-3.5", tone === "red" ? "text-danger" : tone === "orange" ? "text-warning" : tone === "green" ? "text-success" : tone === "purple" ? "text-ai" : "text-primary")} />{label}</div><p className="mt-1 truncate text-[16px] font-black text-textMain" title={value}>{value}</p><p className="mt-0.5 truncate text-[10px] text-textMuted" title={detail}>{detail}</p></div>)}
        </div>
      </section>

      {failurePanelOpen ? (
        <section className="rounded-card border border-warning/30 bg-white shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-borderSoft px-4 py-3">
            <ModuleHeader icon={AlertTriangle} title="异常来源处理" subtitle={`仅显示每个来源最近一次运行状态，共 ${failedSourceRuns.length} 个需要处理`} tone="orange" />
            <button type="button" aria-label="关闭异常来源处理" onClick={() => setFailurePanelOpen(false)} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100 hover:text-textMain"><X className="size-4" /></button>
          </div>
          <div className="divide-y divide-borderSoft">
            {failedSourceRuns.map((sourceRun) => <div key={sourceRun.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(160px,220px)_100px_minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><strong className="block truncate text-[12px] text-textMain" title={sourceRun.sourceName}>{sourceRun.sourceName || sourceRun.sourceHost}</strong><span className="block truncate text-[10px] text-textMuted">{sourceRun.sourceHost}</span></div><StatusBadge status={sourceRun.status === "failed" ? "rejected" : "pending"} label={workflowStatusLabel(sourceRun.status)} className="h-5 w-fit text-[10px]" /><p className="min-w-0 text-[11px] leading-5 text-danger" title={sourceRun.errorMessage || sourceRun.currentResource}>{sourceRun.errorMessage || sourceRun.currentResource || "来源返回异常，未记录详细原因"}</p><span className="text-[10px] text-textMuted">重试 {sourceRun.attempt}/{sourceRun.maxRetries}</span></div>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borderSoft bg-warning/5 px-4 py-3"><p className="text-[11px] text-textSecondary">只会重新调度上述异常来源，已有候选价格和证据不会被删除。</p><LoadingButton tone="warning" icon={<RotateCcw className="size-4" />} loading={action === "retry_failed"} disabled={isArchived || !data.permissions.canWrite || task.status === "running"} onClick={() => void runAction("retry_failed")}>重试失败来源（{failedSourceRuns.length}）</LoadingButton></div>
        </section>
      ) : null}

      <nav aria-label="任务详情视图" className="flex overflow-x-auto rounded-card border border-borderSoft bg-white p-1 shadow-card">
        {([
          { key: "results", label: "结果与证据", meta: `${pendingCount} 条待审核`, icon: ListChecks },
          { key: "execution", label: "执行记录", meta: `${operationalRuns.length} 个批次`, icon: History },
          { key: "config", label: "任务配置", meta: `${sourceCount} 个来源`, icon: Settings2 },
        ] as const).map(({ key, label, meta, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-current={activeTab === key ? "page" : undefined}
            onClick={() => setActiveTab(key)}
            className={cn("flex h-10 min-w-[150px] flex-1 items-center justify-center gap-2 rounded-md px-3 text-[12px] font-bold transition-colors", activeTab === key ? "bg-primary text-white" : "text-textSecondary hover:bg-slate-50 hover:text-primary")}
          >
            <Icon className="size-4" />
            <span>{label}</span>
            <span className={cn("text-[10px] font-semibold", activeTab === key ? "text-white/75" : "text-textMuted")}>{meta}</span>
          </button>
        ))}
      </nav>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          {activeTab === "results" || activeTab === "config" ? <CollectionCoveragePanel key={task.id} taskId={task.id} /> : null}
          {activeTab === "results" ? (
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <ModuleHeader icon={CalendarClock} title="价格时间口径" subtitle="区分价格所属期、来源采集时间和任务执行时间" tone="blue" />
              <dl className="mt-3 grid divide-y divide-borderSoft border-y border-borderSoft sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="p-3"><dt className="text-[10px] font-semibold text-textMuted">价格所属期</dt><dd className="mt-1 text-[13px] font-black text-textMain">{periodFrom} 至 {periodTo}</dd><p className="mt-1 text-[10px] leading-4 text-textMuted">用于月度价格分析和范围过滤</p></div>
                <div className="p-3"><dt className="text-[10px] font-semibold text-textMuted">最新报价月份</dt><dd className="mt-1 text-[13px] font-black text-textMain">{latestQuoteDate ? latestQuoteDate.slice(0, 7) : "待识别"}</dd><p className="mt-1 text-[10px] leading-4 text-textMuted">来自价格原文，不使用采集时间代替</p></div>
                <div className="p-3"><dt className="text-[10px] font-semibold text-textMuted">最近执行时间</dt><dd className="mt-1 text-[13px] font-black text-textMain">{formatDate(selectedRun?.startedAt || task.lastRunAt)}</dd><p className="mt-1 text-[10px] leading-4 text-textMuted">仅表示系统何时访问来源</p></div>
              </dl>
            </section>
          ) : null}

          {activeTab === "execution" ? (
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <ModuleHeader icon={TerminalSquare} title="执行批次上下文" subtitle="切换批次查看该次执行的抓取和产出" tone="purple" />
                <label className="grid min-w-[260px] gap-1 text-[10px] font-semibold text-textMuted">查看批次
                  <select value={selectedRun?.id || ""} onChange={(event) => setSelectedRunId(event.target.value)} className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textMain outline-none focus:border-primary">
                    {operationalRuns.map((item) => <option key={item.id} value={item.id}>{item.runCode} · {workflowStatusLabel(item.status)} · {formatDate(item.startedAt)}</option>)}
                  </select>
                </label>
              </div>
              {selectedRun ? <dl className="mt-3 grid grid-cols-2 divide-x divide-y divide-borderSoft border border-borderSoft sm:grid-cols-5 sm:divide-y-0"><div className="p-2.5"><dt className="text-[10px] text-textMuted">抓取</dt><dd className="mt-1 font-black text-textMain">{selectedRun.fetchedCount}</dd></div><div className="p-2.5"><dt className="text-[10px] text-textMuted">新增</dt><dd className="mt-1 font-black text-success">{selectedRun.createdLeadCount}</dd></div><div className="p-2.5"><dt className="text-[10px] text-textMuted">更新</dt><dd className="mt-1 font-black text-primary">{selectedRun.updatedLeadCount}</dd></div><div className="p-2.5"><dt className="text-[10px] text-textMuted">重复</dt><dd className="mt-1 font-black text-warning">{selectedRun.duplicateCount}</dd></div><div className="p-2.5"><dt className="text-[10px] text-textMuted">失败来源</dt><dd className="mt-1 font-black text-danger">{selectedRun.failedSourceCount}</dd></div></dl> : <p className="mt-3 text-[11px] text-textMuted">当前任务尚无执行批次。</p>}
            </section>
          ) : null}

          {activeTab === "config" ? (
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <ModuleHeader icon={Settings2} title="采集范围与规则" subtitle="任务创建时保存的业务对象、来源范围和结果限制" tone="blue" action={<button type="button" disabled={!data.permissions.canWrite} onClick={openScopeEditor} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-white px-3 text-[11px] font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"><Settings2 className="size-3.5" />调整范围并创建新任务</button>} />
              <dl className="mt-3 grid border-t border-borderSoft sm:grid-cols-2">
                {[["采集方式", task.collectionMode === "quote_upload" ? "上传报价" : task.collectionMode === "api" ? "API 数据源" : task.collectionMode === "manual" ? "人工录入" : "网上采集"], ["采集对象", task.targetType === "material" ? "地材" : "设备"], ["关键词", task.keyword], ["规格型号", task.specification || "未限定"], ["目标地区", task.region || "全部地区"], ["币种", task.currency], ["价格所属期", `${periodFrom} 至 ${periodTo}`], ["未知价格日期", task.config.excludeUnknownPriceDate === false ? "允许进入人工复核" : "排除，不生成价格线索"], ["增量去重策略", "同月更新观察，跨月新增价格"], ["去重相似度阈值", `${String(task.config.dedupThreshold ?? 85)}%`], ["来源类型", task.sourceType || "全部来源"], ["最大价格账龄", `${String(task.config.maxPriceAgeDays ?? "默认")} 天`], ["结果上限", String(task.config.maxResults ?? "默认")], ["重试次数", `${task.retryCount} / ${task.maxRetries}`]].map(([label, value]) => <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-borderSoft px-3 py-3 sm:odd:border-r"><dt className="text-[11px] text-textMuted">{label}</dt><dd className="break-words text-[12px] font-bold text-textMain">{value}</dd></div>)}
              </dl>
              <p className="mt-3 rounded-md border border-primary/15 bg-primary-soft px-3 py-2 text-[10px] leading-5 text-primary">可在当前页修改范围并创建独立任务；当前任务的候选价格、证据和审计记录不会被改写。</p>
            </section>
          ) : null}

          <section className={cn("rounded-card border border-borderSoft bg-white p-4 shadow-card", activeTab !== "execution" && "hidden")}>
            <ModuleHeader icon={History} title="关键执行记录" subtitle={`原始 ${data.auditLogs.length} 条审计记录，已合并为 ${auditItems.length} 个关键事件`} tone="purple" />
            <div className="mt-3 space-y-2">{visibleAuditItems.map((item, index) => <div key={item.id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-2"><div className={cn("mt-1 flex size-5 items-center justify-center rounded-full", index === 0 ? "bg-ai text-white" : "bg-slate-100 text-textMuted")}>{index === 0 ? <CheckCircle2 className="size-3" /> : <Clock3 className="size-3" />}</div><div className="border-b border-borderSoft pb-2"><p className="text-[12px] font-bold text-textMain">{auditEventLabel(item)}{item.repeatCount > 1 ? <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-textMuted">重复 {item.repeatCount} 次</span> : null}</p><p className="mt-0.5 text-[11px] text-textMuted">{item.progress == null ? "状态变更已写入审计日志" : `执行进度 ${item.progress}%`}{item.actorId ? ` · 操作人 ${item.actorId.slice(0, 8)}` : ""}</p></div><span className="whitespace-nowrap text-[10px] text-textMuted">{formatDate(item.createdAt)}</span></div>)}</div>
            {auditItems.length > 8 ? <button type="button" onClick={() => setTimelineExpanded((value) => !value)} className="mt-3 inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft px-3 text-[11px] font-bold text-primary hover:bg-primary-soft">{timelineExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}{timelineExpanded ? "收起历史记录" : `展开其余 ${auditItems.length - 8} 个事件`}</button> : null}
          </section>

          <section className={cn("overflow-hidden rounded-card border border-borderSoft bg-white shadow-card", activeTab !== "execution" && "hidden")}>
            <div className="border-b border-borderSoft px-4 py-3">
              <ModuleHeader icon={ShieldCheck} title="来源质量指标" subtitle="近 30 天真实来源运行与有效价格留存" tone="green" />
            </div>
            {data.sourceQuality.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-[12px]"><thead className="bg-slate-50 text-textSecondary"><tr>{["来源", "运行 / 异常", "新增率", "更新率", "重复率", "有效价格率", "有效 / 保留", "最近运行"].map((label) => <th key={label} className="h-9 border-b border-borderSoft px-3 text-left font-semibold">{label}</th>)}</tr></thead><tbody>{data.sourceQuality.map((metric) => <tr key={metric.sourceId} className="h-11 border-b border-borderSoft"><td className="max-w-[220px] px-3 font-bold text-textMain"><span className="block truncate" title={metric.sourceName}>{metric.sourceName}</span></td><td className="px-3">{metric.runCount} / <span className={metric.failedRunCount ? "font-bold text-danger" : "text-success"}>{metric.failedRunCount}</span></td><td className="px-3 font-bold text-success">{metric.newRate.toFixed(1)}%</td><td className="px-3 font-bold text-primary">{metric.updateRate.toFixed(1)}%</td><td className="px-3 font-bold text-warning">{metric.duplicateRate.toFixed(1)}%</td><td className={cn("px-3 font-bold", metric.validPriceRate >= 80 ? "text-success" : metric.validPriceRate >= 60 ? "text-warning" : "text-danger")}>{metric.validPriceRate.toFixed(1)}%</td><td className="px-3">{metric.validPriceCount} / {metric.retainedLeadCount}</td><td className="px-3 text-textMuted">{formatDate(metric.lastRunAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="暂无来源质量数据" description="来源至少完成一次运行后，系统会按真实新增、更新、重复和有效价格自动统计。" className="m-4 shadow-none" />}
            <p className="px-4 py-2 text-[10px] leading-4 text-textMuted">新增率、更新率和重复率以来源处理结果为分母；有效价格率以近 30 天该来源保留线索为分母。</p>
          </section>

          <section className={cn("overflow-hidden rounded-card border border-borderSoft bg-white shadow-card", activeTab !== "execution" && "hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-3">
              <ModuleHeader icon={FileSearch} title="来源运行明细" subtitle={`来源执行 ${data.sourceRuns.length} 条 · 异常 ${failedSourceRuns.length} 条`} tone={failedSourceRuns.length ? "orange" : "blue"} />
              {failedSourceRuns.length ? <button type="button" onClick={() => setFailurePanelOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-warning/30 bg-warning/5 px-3 text-[11px] font-bold text-warning"><AlertTriangle className="size-3.5" />查看当前异常来源</button> : null}
            </div>
            {data.sourceRuns.length ? <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-[12px]"><thead className="bg-slate-50 text-textSecondary"><tr>{["来源", "状态", "页面预算", "已抓取", "证据", "新增候选", "重复", "失败", "重试", "最近资源 / 错误"].map((label) => <th key={label} className="h-9 border-b border-borderSoft px-3 text-left font-semibold">{label}</th>)}</tr></thead><tbody>{data.sourceRuns.map((sourceRun) => <tr key={sourceRun.id} className={cn("h-11 border-b border-borderSoft", (sourceRun.status === "failed" || sourceRun.failedCount > 0) && "bg-red-50/40")}><td className="max-w-[180px] px-3"><strong className="block truncate text-textMain" title={sourceRun.sourceName}>{sourceRun.sourceName || sourceRun.sourceHost}</strong><span className="block truncate text-[10px] text-textMuted">{sourceRun.sourceHost}</span></td><td className="px-3"><StatusBadge status={sourceRun.status === "completed" ? "completed" : sourceRun.status === "failed" ? "rejected" : sourceRun.status === "running" ? "running" : "pending"} label={workflowStatusLabel(sourceRun.status)} className="h-5 text-[10px]" /></td><td className="px-3">{sourceRun.pagesUsed} / {sourceRun.pageBudget}</td><td className="px-3">{sourceRun.fetchedCount}</td><td className="px-3">{sourceRun.evidenceCount}</td><td className="px-3 font-bold text-success">{sourceRun.createdLeadCount}</td><td className="px-3 text-warning">{sourceRun.duplicateCount}</td><td className="px-3 font-bold text-danger">{sourceRun.failedCount}</td><td className="px-3">{sourceRun.attempt} / {sourceRun.maxRetries}</td><td className="max-w-[260px] px-3"><span className={cn("block truncate", sourceRun.errorMessage ? "text-danger" : "text-textMuted")} title={sourceRun.errorMessage || sourceRun.currentResource}>{sourceRun.errorMessage || sourceRun.currentResource || "--"}</span></td></tr>)}</tbody></table></div> : <EmptyState title="暂无来源运行明细" description="任务启动后，每个白名单来源会形成独立运行记录。" className="m-4 shadow-none" />}
          </section>

          <section className={cn("rounded-card border border-borderSoft bg-white p-4 shadow-card", activeTab !== "execution" && "hidden")}>
            <ModuleHeader icon={History} title="任务质量趋势" subtitle="最近 8 次运行的抓取量、候选产出和候选转化率" tone="purple" />
            {qualityRuns.length ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">{qualityRuns.map((qualityRun) => <div key={qualityRun.id} className="min-w-0 rounded-md border border-borderSoft bg-slate-50 p-2.5"><div className="flex h-20 items-end justify-center gap-1"><span className="w-3 rounded-t bg-primary/25" style={{ height: `${Math.max(4, Math.min(100, qualityRun.fetchedCount))}%` }} title={`抓取 ${qualityRun.fetchedCount}`} /><span className="w-3 rounded-t bg-success" style={{ height: `${Math.max(4, Math.min(100, qualityRun.createdLeadCount * 12))}%` }} title={`候选 ${qualityRun.createdLeadCount}`} /></div><strong className="mt-2 block text-center text-[13px] text-ai">{qualityRun.yieldRate}%</strong><span className="mt-0.5 block truncate text-center text-[9px] text-textMuted" title={qualityRun.runCode}>{qualityRun.runCode.slice(-8)}</span></div>)}</div> : <EmptyState title="暂无质量趋势" description="至少执行一次采集任务后展示真实运行质量。" className="mt-3 shadow-none" />}
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-borderSoft pt-3 text-[10px] text-textMuted"><span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-sm bg-primary/25" />抓取量</span><span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-sm bg-success" />新增候选</span><span>转化率 = 新增候选 ÷ 抓取记录；候选仍需人工审核。</span></div>
          </section>

          <section className={cn("overflow-hidden rounded-card border border-borderSoft bg-white shadow-card", activeTab !== "execution" && "hidden")}>
            <div className="border-b border-borderSoft px-4 py-3">
              <ModuleHeader
                icon={TerminalSquare}
                title="采集运行记录"
                subtitle={`已持久化 ${operationalRuns.length} 次任务执行；来源子运行在上方单独统计`}
                tone="purple"
              />
            </div>
            {operationalRuns.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-[12px]">
                  <thead className="bg-slate-50 text-textSecondary">
                    <tr>{["运行编号", "触发方式", "状态", "抓取", "新增", "更新", "重复", "失败来源", "开始时间"].map((label) => <th key={label} className="h-9 border-b border-borderSoft px-3 text-left font-semibold">{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {operationalRuns.map((run) => (
                      <tr key={run.id} className="h-11 border-b border-borderSoft">
                        <td className="px-3 font-bold text-primary">{run.runCode}</td>
                        <td className="px-3">{run.triggerType === "schedule" ? "定时调度" : run.triggerType === "retry" ? "失败重试" : run.triggerType === "upload" ? "报价上传" : "人工启动"}</td>
                        <td className="px-3"><StatusBadge status={run.status === "completed" ? "completed" : run.status === "failed" ? "rejected" : run.status === "running" ? "running" : "pending"} label={workflowStatusLabel(run.status)} className="h-5 text-[10px]" /></td>
                        <td className="px-3">{run.fetchedCount}</td>
                        <td className="px-3 text-success">{run.createdLeadCount}</td>
                        <td className="px-3 text-primary">{run.updatedLeadCount}</td>
                        <td className="px-3 text-warning">{run.duplicateCount}</td>
                        <td className="px-3 text-danger">{run.failedSourceCount}</td>
                        <td className="px-3 text-textMuted">{formatDate(run.startedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="暂无采集运行记录" description="任务尚未被执行，或上传报价仍在等待识别。" className="m-4 shadow-none" />
            )}
          </section>

          <section className={cn("overflow-hidden rounded-card border border-borderSoft bg-white shadow-card", activeTab !== "results" && "hidden")}>
            <div className="border-b border-borderSoft px-4 py-3"><ModuleHeader icon={ListChecks} title="关联候选价格" subtitle={`累计 ${totalLeadCount} 条 · 第 ${data.leadPagination.page} / ${data.leadPagination.pageCount} 页`} action={<Link href={`/price-leads?taskId=${encodeURIComponent(task.id)}`} className="text-[12px] font-bold text-primary">进入线索池</Link>} /></div>
            {data.leads.length ? <>
              <div className={cn("overflow-x-auto", leadLoading && "opacity-55")} aria-busy={leadLoading}>
                <table className="w-full min-w-[1060px] table-fixed text-[12px]">
                  <colgroup><col className="w-[150px]" /><col className="w-[230px]" /><col className="w-[120px]" /><col className="w-[120px]" /><col className="w-[130px]" /><col className="w-[76px]" /><col className="w-[82px]" /><col className="w-[84px]" /><col className="w-[120px]" /><col className="w-[70px]" /></colgroup>
                  <thead className="bg-slate-50 text-textSecondary"><tr>{["线索编号", "名称 / 规格", "来源", "地区", "标准价格", "AI匹配", "可信度", "风险", "状态", "证据"].map((item) => <th key={item} className="h-9 whitespace-nowrap border-b border-borderSoft px-3 text-left font-semibold">{item}</th>)}</tr></thead>
                  <tbody>{data.leads.map((lead) => {
                    const nameAndSpec = `${lead.name} · ${lead.specification || "规格待补全"}`;
                    return <tr key={lead.id} className="h-11 border-b border-borderSoft hover:bg-blue-50/40"><td className="truncate whitespace-nowrap px-3 font-bold text-primary" title={lead.leadCode}>{lead.leadCode}</td><td className="truncate whitespace-nowrap px-3 font-bold text-textMain" title={nameAndSpec}>{nameAndSpec}</td><td className="truncate whitespace-nowrap px-3" title={lead.sourceType}>{lead.sourceType}</td><td className="truncate whitespace-nowrap px-3" title={lead.region || "--"}>{lead.region || "--"}</td><td className="truncate whitespace-nowrap px-3 font-bold" title={formatPrice(lead.normalizedPrice, lead.currency)}>{formatPrice(lead.normalizedPrice, lead.currency)}</td><td className="whitespace-nowrap px-3 text-ai">{lead.aiMatchScore}%</td><td className="whitespace-nowrap px-3"><span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{lead.confidence}%</span></td><td className="whitespace-nowrap px-3"><RiskBadge level={lead.riskLevel} className="h-5 text-[10px]" /></td><td className="whitespace-nowrap px-3"><StatusBadge status={lead.status === "transferred" ? "completed" : lead.status === "rejected" ? "rejected" : "needs_review"} label={leadStatusLabel(lead.status)} className="h-5 max-w-full text-[10px]" /></td><td className="whitespace-nowrap px-3">{lead.evidenceCode ? <Link href={`/attachments?relatedObject=${encodeURIComponent(lead.evidenceCode)}&returnTo=${encodeURIComponent(`/ai-price-collection/tasks/${task.id}`)}`} className="inline-flex items-center gap-1 font-bold text-primary">查看<ExternalLink className="size-3" /></Link> : "--"}</td></tr>;
                  })}</tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borderSoft bg-slate-50/70 px-4 py-3 text-[11px] text-textMuted">
                <span>共 {data.leadPagination.total} 条 · 当前显示 {data.leads.length} 条</span>
                <div className="flex items-center gap-2"><label className="inline-flex items-center gap-1.5">每页<select value={leadPageSize} onChange={(event) => { setLeadLoading(true); setLeadPageSize(Number(event.target.value) as 10 | 20 | 30); setLeadPage(1); }} className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textMain"><option value={10}>10 条</option><option value={20}>20 条</option><option value={30}>30 条</option></select></label><button type="button" aria-label="上一页" disabled={leadLoading || data.leadPagination.page <= 1} onClick={() => { setLeadLoading(true); setLeadPage((value) => Math.max(1, value - 1)); }} className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary disabled:opacity-35"><ChevronLeft className="size-4" /></button><strong className="min-w-16 text-center text-textMain">{data.leadPagination.page} / {data.leadPagination.pageCount}</strong><button type="button" aria-label="下一页" disabled={leadLoading || data.leadPagination.page >= data.leadPagination.pageCount} onClick={() => { setLeadLoading(true); setLeadPage((value) => Math.min(data.leadPagination.pageCount, value + 1)); }} className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary disabled:opacity-35"><ChevronRight className="size-4" /></button></div>
              </div>
            </> : <EmptyState
              title={awaitingFirstRun ? "任务尚未执行" : "暂未生成候选价格"}
              description={awaitingFirstRun
                ? task.scheduleEnabled
                  ? `周期任务已保存，下次自动执行时间为 ${formatBeijingDate(task.nextRunAt)}；也可以现在先执行一次。`
                  : "任务范围和来源已经保存，执行后才会生成候选价格与证据。"
                : "当前执行尚未形成候选价格，可刷新状态或在执行记录中查看来源处理结果。"}
              primaryAction={awaitingFirstRun && data.permissions.canWrite ? <LoadingButton icon={<Play className="size-4" />} loading={action === "start"} onClick={() => void runAction("start")}>立即执行一次</LoadingButton> : undefined}
              className="m-4 shadow-none"
            />}
          </section>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-3">
          {["web", "api"].includes(task.collectionMode) ? (
            <section className={cn("rounded-card border border-primary/20 bg-white p-4 shadow-card", activeTab !== "config" && "hidden")}>
              <div className="flex items-start justify-between gap-2"><ModuleHeader icon={CalendarClock} title="周期任务运营" subtitle={task.scheduleEnabled ? "调度已启用" : "当前已暂停"} tone={task.scheduleEnabled ? "green" : "orange"} /><button type="button" aria-label={scheduleOpen ? "收起周期任务运营" : "展开周期任务运营"} aria-expanded={scheduleOpen} onClick={() => setScheduleOpen((value) => !value)} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100">{scheduleOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button></div>
              {scheduleOpen ? <>
                <dl className="mt-3 divide-y divide-borderSoft border-y border-borderSoft text-[11px]"><div className="flex justify-between gap-3 py-2"><dt className="text-textMuted">下次运行</dt><dd className="text-right font-bold text-textMain">{task.scheduleEnabled ? formatBeijingDate(task.nextRunAt) : "已暂停"}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-textMuted">最近结果</dt><dd className="font-bold text-textMain">{latestRun ? `${workflowStatusLabel(latestRun.status)} · 证据 ${latestRun.evidenceCount}` : "尚未运行"}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-textMuted">连续异常</dt><dd className={cn("font-bold", consecutiveFailures ? "text-danger" : "text-success")}>{consecutiveFailures} 次</dd></div></dl>
                <label className="mt-3 grid gap-1.5 text-[11px] font-semibold text-textSecondary">执行周期<select value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value)} disabled={isArchived || !data.permissions.canWrite} className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary disabled:opacity-50"><option value="每小时">每小时</option><option value="每天">每天 10:00（北京时间）</option><option value="每周">每周一 10:00（北京时间）</option><option value="每月">每月 1 日 10:00（北京时间）</option></select></label>
                <div className="mt-3 grid grid-cols-2 gap-2"><LoadingButton icon={<Play className="size-4" />} loading={action === "start"} disabled={isArchived || !data.permissions.canWrite || task.status === "running"} onClick={() => void runAction("start")}>{action === "start" ? "执行中…" : "立即执行"}</LoadingButton><LoadingButton tone={task.scheduleEnabled ? "warning" : "ghost"} icon={task.scheduleEnabled ? <Pause className="size-4" /> : <CalendarClock className="size-4" />} loading={action === "schedule"} disabled={isArchived || !data.permissions.canWrite} onClick={() => void updateSchedule(!task.scheduleEnabled)}>{task.scheduleEnabled ? "暂停周期" : "保存并启用"}</LoadingButton></div>
                {action === "start" ? <p className="mt-2 rounded-md border border-primary/15 bg-primary-soft px-3 py-2 text-[11px] leading-5 text-primary">正在连接 {sourceCount} 个采集来源，完成后自动刷新。</p> : null}
                {task.scheduleExpression ? <p className="mt-2 text-[10px] text-textMuted">品类策略 {task.scheduleCategory || "未分类"} · {task.scheduleExpression} · 北京时间</p> : null}
              </> : null}
            </section>
          ) : null}

          <section className={cn("rounded-card border border-borderSoft bg-white p-4 shadow-card", activeTab !== "config" && "hidden")}>
            <ModuleHeader icon={Settings2} title="任务管理" subtitle="归档、恢复、导出与受控删除" tone="blue" />
            <dl className="mt-3 divide-y divide-borderSoft border-y border-borderSoft text-[11px]">
              <div className="flex justify-between gap-3 py-2"><dt className="text-textMuted">管理状态</dt><dd className="font-bold text-textMain">{isArchived ? "已归档 · 只读" : "使用中"}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-textMuted">当前角色</dt><dd className="font-bold text-textMain">{{ admin: "系统管理员", manager: "业务经理", editor: "业务编辑", reviewer: "审核员" }[data.role] || data.role}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-textMuted">管理权限</dt><dd className={cn("font-bold", data.permissions.canWrite ? "text-success" : "text-warning")}>{data.permissions.canWrite ? "可管理" : "只读"}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-textMuted">业务成果</dt><dd className="text-right font-bold text-textMain">线索 {totalLeadCount} · 目录 {task.catalogCandidateCount}</dd></div>
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <LoadingButton tone="ghost" icon={<Download className="size-4" />} loading={action === "export"} onClick={() => void exportTaskArchive()}>导出任务档案</LoadingButton>
              {isArchived
                ? <LoadingButton tone="ghost" icon={<ArchiveRestore className="size-4" />} loading={action === "restore"} disabled={!data.permissions.canWrite} onClick={() => void updateArchiveStatus("restore")}>恢复任务</LoadingButton>
                : <LoadingButton tone="warning" icon={<Archive className="size-4" />} loading={action === "archive"} disabled={!canArchive} title={canArchive ? "归档任务并关闭周期调度" : "运行中或排队中的任务需先终止"} onClick={() => setManagementConfirm("archive")}>归档任务</LoadingButton>}
              {!isArchived ? <LoadingButton tone="danger" icon={<Trash2 className="size-4" />} loading={action === "delete"} disabled={!canDelete} title={deleteBlockReason} onClick={() => setManagementConfirm("delete")}>删除空任务</LoadingButton> : null}
            </div>
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[10px] leading-5 text-textMuted">{isArchived ? "恢复后仍不会自动开启周期调度。" : deleteBlockReason}。任务档案导出不会改变业务数据。</p>
          </section>

          <section className={cn("rounded-card border border-borderSoft bg-white p-4 shadow-card", activeTab !== "results" && "hidden")}>
            <div className="flex items-start justify-between gap-2"><ModuleHeader icon={ExternalLink} title="来源与证据" subtitle={`来源 ${data.sources.length} · 证据 ${data.evidence.length}`} tone="blue" /><button type="button" aria-label={sourcesOpen ? "收起来源与证据" : "展开来源与证据"} aria-expanded={sourcesOpen} onClick={() => setSourcesOpen((value) => !value)} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100">{sourcesOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button></div>
            {sourcesOpen ? <div className="mt-3 divide-y divide-borderSoft border-y border-borderSoft">
              {data.sources.map((source) => (
                <a key={source.id} href={source.baseUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 py-2.5 hover:text-primary">
                  <span className="min-w-0"><strong className="block truncate text-[12px] text-textMain">{source.name}</strong><span className="block truncate text-[10px] text-textMuted">{source.baseUrl}</span></span>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2 py-1 text-[10px] font-black text-primary">{source.qualityScore}</span>
                </a>
              ))}
              {data.evidence.slice(0, 6).map((evidence) => (
                <a key={evidence.id} href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="block py-2.5 hover:text-ai">
                  <span className="flex items-center justify-between gap-2"><strong className="truncate text-[11px] text-ai">{evidence.evidenceCode}</strong><span className="shrink-0 text-[10px] text-textMuted">观察 {evidence.observationCount} 次</span></span>
                  <span className="mt-0.5 block text-[9px] text-textMuted">最近 {formatDate(evidence.lastSeenAt || evidence.fetchedAt)}</span>
                  <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-textSecondary">{evidence.pageTitle || evidence.excerpt || evidence.sourceUrl}</span>
                </a>
              ))}
              {!data.sources.length && !data.evidence.length ? <p className="rounded-md bg-slate-50 p-3 text-[11px] text-textMuted">当前任务尚未产生来源证据。上传报价任务请前往待审核报价池查看源文件。</p> : null}
            </div> : null}
          </section>

          <section className={cn("rounded-card border border-ai/20 bg-ai-soft/40 p-4 shadow-card", activeTab !== "results" && "hidden")}><ModuleHeader icon={ShieldCheck} title="AI执行判断" subtitle="AI 建议必须经过人工审核" tone="purple" /><div className="mt-3 border-y border-ai/15 py-3 text-[12px] leading-5 text-textSecondary">{task.status === "failed" ? `任务执行失败：${task.lastError || "未记录错误原因"}` : task.catalogCandidateCount > 0 ? `已形成 ${task.catalogCandidateCount} 条设备目录候选，本任务属于资料采集成果。` : riskCount ? `发现 ${riskCount} 条高风险候选，请核验证据后处理。` : task.outcomeStatus === "no_price" ? "来源抓取已完成，但没有形成满足准入门槛的价格。" : task.outcomeStatus === "qualified" || task.outcomeStatus === "partial" ? `已形成 ${task.qualifiedLeadCount} 条合格价格候选，请完成人工审核。` : "任务仍在执行或等待调度，暂不形成最终价格判断。"}</div><div className="mt-3 flex flex-wrap gap-2"><Link href={reviewHref} className="inline-flex h-8 items-center rounded-md bg-ai px-3 text-[12px] font-bold text-white">{task.catalogCandidateCount > 0 ? "进入目录审核" : "进入线索池审核"}</Link><Link href="/ai-workbench" className="inline-flex h-8 items-center rounded-md border border-ai/20 bg-white px-3 text-[12px] font-bold text-ai">查看AI任务</Link></div></section>

          <section className={cn("rounded-card border border-borderSoft bg-white p-4 shadow-card", activeTab === "config" && "hidden")}><ModuleHeader icon={AlertTriangle} title="异常与运行信息" subtitle="失败原因、质量变化和处理边界" tone={task.lastError || consecutiveFailures || evidenceDrop ? "red" : "orange"} /><div className="mt-3 space-y-2 text-[11px]"><div className="flex justify-between gap-3 border-b border-borderSoft pb-2"><span className="text-textMuted">开始时间</span><strong>{formatDate(task.startedAt)}</strong></div><div className="flex justify-between gap-3 border-b border-borderSoft pb-2"><span className="text-textMuted">结束时间</span><strong>{formatDate(task.finishedAt)}</strong></div><div className="flex justify-between gap-3 border-b border-borderSoft pb-2"><span className="text-textMuted">{task.catalogCandidateCount > 0 ? "目录候选" : "合格价格"} / 当前异常来源</span><strong>{task.catalogCandidateCount > 0 ? task.catalogCandidateCount : task.qualifiedLeadCount} / {failedSourceRuns.length}</strong></div>{consecutiveFailures ? <div className="rounded-md bg-red-50 p-2.5 font-semibold text-red-700">已连续 {consecutiveFailures} 次出现失败或部分失败，请优先处理异常来源。</div> : null}{evidenceDrop ? <div className="rounded-md bg-amber-50 p-2.5 font-semibold text-amber-700">本次证据量较上次下降超过 50%，建议检查来源页面结构或访问限制。</div> : null}<div className={cn("rounded-md p-2.5 leading-5", task.lastError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>{task.lastError || "当前未记录执行错误；候选价格仍需在线索池人工审核。"}</div></div></section>
        </aside>
      </div>

      {scopeEditorOpen && scopeDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="scope-editor-title" onMouseDown={(event) => { if (event.currentTarget === event.target && action !== "create_scope_task") setScopeEditorOpen(false); }}>
          <section className="max-h-[calc(100vh-32px)] w-full max-w-[720px] overflow-y-auto rounded-card border border-borderSoft bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-borderSoft bg-white px-5 py-4">
              <div><h2 id="scope-editor-title" className="text-[16px] font-black text-textMain">调整采集范围并创建新任务</h2><p className="mt-1 text-[11px] text-textMuted">基于 {task.taskCode} 预填配置，保存后生成独立任务。</p></div>
              <button type="button" aria-label="关闭" disabled={action === "create_scope_task"} onClick={() => setScopeEditorOpen(false)} className="flex size-8 shrink-0 items-center justify-center rounded-md text-textMuted hover:bg-slate-100 disabled:opacity-40"><X className="size-4" /></button>
            </header>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">采集关键词<input value={scopeDraft.keyword} onChange={(event) => setScopeDraft({ ...scopeDraft, keyword: event.target.value })} className="h-9 rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" /></label>
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">规格型号<input value={scopeDraft.specification} onChange={(event) => setScopeDraft({ ...scopeDraft, specification: event.target.value })} placeholder="留空表示不限定" className="h-9 rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" /></label>
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">目标地区<input value={scopeDraft.region} onChange={(event) => setScopeDraft({ ...scopeDraft, region: event.target.value })} className="h-9 rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" /></label>
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">币种<select value={scopeDraft.currency} onChange={(event) => setScopeDraft({ ...scopeDraft, currency: event.target.value })} className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary"><option value="CDF">CDF</option><option value="USD">USD</option><option value="CNY">CNY</option><option value="EUR">EUR</option></select></label>
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">价格所属期开始<input type="month" value={scopeDraft.pricePeriodFrom} onChange={(event) => setScopeDraft({ ...scopeDraft, pricePeriodFrom: event.target.value })} className="h-9 rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" /></label>
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">价格所属期结束<select value={scopeDraft.pricePeriodToMode} onChange={(event) => setScopeDraft({ ...scopeDraft, pricePeriodToMode: event.target.value as ScopeDraft["pricePeriodToMode"] })} className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary"><option value="current_month">截至当前月</option><option value="fixed_month">指定月份</option></select></label>
                {scopeDraft.pricePeriodToMode === "fixed_month" ? <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">指定结束月份<input type="month" value={scopeDraft.pricePeriodTo} onChange={(event) => setScopeDraft({ ...scopeDraft, pricePeriodTo: event.target.value })} className="h-9 rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" /></label> : null}
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">最大价格账龄（天）<input type="number" min={1} max={3650} value={scopeDraft.maxPriceAgeDays} onChange={(event) => setScopeDraft({ ...scopeDraft, maxPriceAgeDays: Math.max(1, Number(event.target.value) || 1) })} className="h-9 rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" /></label>
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">结果上限<input type="number" min={1} max={1000} value={scopeDraft.maxResults} onChange={(event) => setScopeDraft({ ...scopeDraft, maxResults: Math.max(1, Number(event.target.value) || 1) })} className="h-9 rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" /></label>
                <label className="grid gap-1.5 text-[11px] font-semibold text-textSecondary">去重相似度阈值（%）<input type="number" min={50} max={100} value={scopeDraft.dedupThreshold} onChange={(event) => setScopeDraft({ ...scopeDraft, dedupThreshold: Math.min(100, Math.max(50, Number(event.target.value) || 85)) })} className="h-9 rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" /><span className="font-normal text-textMuted">规格明确时建议 85%；数值越低，合并范围越宽。</span></label>
              </div>
              <label className="flex items-center justify-between gap-4 border-y border-borderSoft py-3 text-[11px] font-semibold text-textSecondary"><span><strong className="block text-textMain">排除未知价格日期</strong><span className="mt-0.5 block font-normal text-textMuted">开启后，无法判断价格月份的记录不会生成价格线索。</span></span><input type="checkbox" checked={scopeDraft.excludeUnknownPriceDate} onChange={(event) => setScopeDraft({ ...scopeDraft, excludeUnknownPriceDate: event.target.checked })} className="size-4 accent-primary" /></label>
              <div className="grid gap-2 bg-slate-50 px-3 py-2.5 text-[10px] leading-5 text-textMuted sm:grid-cols-3"><span>采集方式：<strong className="text-textMain">{task.collectionMode === "api" ? "API" : task.collectionMode === "manual" ? "人工录入" : "网上采集"}</strong></span><span>采集对象：<strong className="text-textMain">{task.targetType === "material" ? "地材" : "设备"}</strong></span><span>继承来源：<strong className="text-textMain">{data.sources.length} 个</strong></span></div>
              <p className="border border-primary/15 bg-primary-soft px-3 py-2 text-[10px] leading-5 text-primary">增量规则：相同来源、地区、名称、规格、单位和价格所属期只更新原记录及观察次数；价格月份不同则创建新的月度价格。创建新任务后会立即执行一次，周期调度可在任务详情中单独启用。</p>
            </div>
            <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-borderSoft bg-white px-5 py-4"><button type="button" disabled={action === "create_scope_task"} onClick={() => setScopeEditorOpen(false)} className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-bold text-textSecondary disabled:opacity-40">取消</button><LoadingButton icon={<Play className="size-4" />} loading={action === "create_scope_task"} onClick={() => void createTaskFromScope()}>创建并立即执行</LoadingButton></footer>
          </section>
        </div>
      ) : null}

      <ConfirmDialog open={stopOpen} title="终止价格采集任务" description={`终止后任务 ${task.taskCode} 将停止继续写入候选结果。`} confirmLabel="确认终止" tone="danger" onCancel={() => setStopOpen(false)} onConfirm={() => void runAction("stop")}>已产生的候选价格和审计记录会保留，可在后续重新执行任务。</ConfirmDialog>
      <ConfirmDialog open={managementConfirm === "archive"} title="确认归档采集任务？" description={`归档 ${task.taskCode} 后将关闭周期调度和运行入口。`} confirmLabel="确认归档" tone="warning" onCancel={() => setManagementConfirm(null)} onConfirm={() => void updateArchiveStatus("archive")}>候选价格、来源证据、执行批次和审计记录都会保留；需要再次执行时可先恢复任务。</ConfirmDialog>
      <ConfirmDialog open={managementConfirm === "delete"} title="确认删除空任务？" description={`将永久删除 ${task.taskCode} 的任务配置与运行记录。`} confirmLabel="确认删除" tone="danger" onCancel={() => setManagementConfirm(null)} onConfirm={() => void deleteTask()}>只有未产生价格线索、目录候选或其他业务成果的非运行任务才能删除，此操作不可撤销。</ConfirmDialog>
    </div>
  );
}
