"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileSearch,
  History,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { emitMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type {
  EquipmentCollectionDiscoveryRecord,
  PriceCollectionTaskDetail,
  PriceCollectionTaskStatus,
} from "@/types/priceCollection";

const baseButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-55";
const outlineButton = `${baseButton} border-borderSoft bg-white hover:border-primary/35 hover:bg-primary-soft`;
const primaryButton = `${baseButton} border-primary bg-primary text-white hover:bg-primary/90`;
const aiButton = `${baseButton} border-ai bg-ai text-white hover:bg-ai/90`;

const taskStatusLabel: Record<PriceCollectionTaskStatus, string> = {
  queued: "排队中",
  running: "运行中",
  paused: "已暂停",
  completed: "本轮完成",
  stopped: "已停止",
  failed: "失败",
};
const discoveryStatusLabel: Record<
  EquipmentCollectionDiscoveryRecord["status"],
  string
> = {
  queued: "待抓取",
  fetching: "抓取中",
  fetched: "已抓取",
  tracked: "已追踪",
  blocked: "已阻止",
  failed: "失败",
  skipped: "范围外",
};
const resourceTypeLabel: Record<
  EquipmentCollectionDiscoveryRecord["resourceType"],
  string
> = {
  seed: "入口页",
  page: "网页",
  product: "产品页",
  catalog: "产品目录",
  pdf: "PDF",
  api: "API",
};

function statusTone(status: string) {
  if (["fetched", "tracked", "completed"].includes(status))
    return "border-success/20 bg-success-soft text-success";
  if (["failed", "blocked"].includes(status))
    return "border-danger/20 bg-danger-soft text-danger";
  if (["queued", "fetching", "running"].includes(status))
    return "border-primary/20 bg-primary-soft text-primary";
  if (status === "skipped")
    return "border-warning/20 bg-warning-soft text-warning";
  return "border-borderSoft bg-slate-50 text-textMuted";
}

function formatTime(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function EquipmentCatalogCollectionTaskDetail({
  taskId,
}: {
  taskId: string;
}) {
  const [detail, setDetail] = useState<PriceCollectionTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<
    "candidates" | "discoveries" | "evidence" | "runs"
  >("candidates");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 30>(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");
  const [selectedDiscoveryIds, setSelectedDiscoveryIds] = useState<Set<string>>(
    new Set(),
  );

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        view: activeView,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (resourceTypeFilter) params.set("resourceType", resourceTypeFilter);
      if (reviewStatusFilter) params.set("reviewStatus", reviewStatusFilter);
      const response = await fetch(
        `/api/price-collection/tasks/${encodeURIComponent(taskId)}?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as PriceCollectionTaskDetail & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "采集任务加载失败");
      setDetail(payload);
      setPage(payload.pagination.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "采集任务加载失败",
      );
    } finally {
      setLoading(false);
    }
  }, [
    activeView,
    page,
    pageSize,
    resourceTypeFilter,
    reviewStatusFilter,
    statusFilter,
    taskId,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDetail(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadDetail();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadDetail]);

  const summary = detail?.summary ?? {
    discoveries: 0,
    products: 0,
    fetched: 0,
    queued: 0,
    failed: 0,
    candidates: 0,
    pendingReview: 0,
    evidence: 0,
    runs: 0,
  };

  const runAction = async (
    action:
      "pause" | "resume" | "continue_batch" | "incremental" | "retry_failed",
    ids: string[] = [],
  ) => {
    if (!detail) return;
    setRunningAction(action);
    try {
      const response = await fetch("/api/price-collection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "task",
          id: detail.task.id,
          action,
          ids,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "任务操作失败");
      emitMockToast({
        title:
          action === "pause"
            ? "任务已暂停"
            : action === "resume"
              ? "任务已恢复"
              : action === "incremental"
                ? "增量补抓已执行"
                : action === "retry_failed"
                  ? "失败资源已重新入队"
                  : "下一批采集已执行",
        description:
          action === "continue_batch"
            ? "系统已继续处理现有待抓取 URL。"
            : action === "incremental"
              ? "系统已重新扫描官网产品页和 PDF 变化。"
              : action === "retry_failed"
                ? "连接超时、解析失败等异常资源已单独重试。"
                : detail.task.taskCode,
        tone: "success",
      });
      setSelectedDiscoveryIds(new Set());
      await loadDetail();
    } catch (actionError) {
      emitMockToast({
        title: "任务操作失败",
        description:
          actionError instanceof Error ? actionError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setRunningAction(null);
    }
  };

  if (loading && !detail) {
    return (
      <AppLayout>
        <div className="flex min-h-[420px] items-center justify-center">
          <LoaderCircle className="size-7 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!detail) {
    return (
      <AppLayout>
        <div className="rounded-card border border-borderSoft bg-white p-8 shadow-card">
          <EmptyState
            title="未找到采集任务"
            description={error || `任务 ${taskId} 不存在或无权访问。`}
          />
          <div className="mt-4 flex justify-center">
            <Link
              href="/equipment-catalog/collection"
              className={primaryButton}
            >
              返回采集中心
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { task, discoveries, evidence, runs, catalogCandidates } = detail;
  const canContinue = summary.queued > 0;
  const activeTotal = detail.pagination.total;
  const currentPage = detail.pagination.page;

  return (
    <AppLayout>
      <div className="space-y-4 pb-8" data-no-global-interaction>
        <PageHeader
          title="采集任务详情"
          description={`${task.taskCode} · ${task.keyword} · 数据来自 Supabase 实时记录`}
          actions={
            <>
              <Link
                href="/equipment-catalog/collection"
                className={outlineButton}
              >
                <ArrowLeft className="size-4" />
                返回采集中心
              </Link>
              <span className="inline-flex h-9 items-center rounded-md border border-borderSoft bg-slate-50 px-3 text-[11px] font-medium text-textMuted">
                待继续{" "}
                <strong className="mx-1 text-primary">{summary.queued}</strong>/
                失败{" "}
                <strong className="ml-1 text-danger">{summary.failed}</strong>
              </span>
              <button
                type="button"
                className={outlineButton}
                onClick={() => void loadDetail()}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("size-4", loading && "animate-spin")}
                />
                刷新结果
              </button>
              <button
                type="button"
                className={aiButton}
                onClick={() => void runAction("incremental")}
                disabled={Boolean(runningAction) || task.status === "running"}
                title="重新扫描官网，发现上次运行后新增或变化的产品页与 PDF"
              >
                {runningAction === "incremental" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <SearchCheck className="size-4" />
                )}
                增量补抓
              </button>
              {task.status === "running" ? (
                <button
                  type="button"
                  className={outlineButton}
                  onClick={() => void runAction("pause")}
                  disabled={Boolean(runningAction)}
                >
                  <Pause className="size-4" />
                  暂停任务
                </button>
              ) : null}
              {task.status === "paused" ? (
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => void runAction("resume")}
                  disabled={Boolean(runningAction)}
                >
                  <Play className="size-4" />
                  继续任务
                </button>
              ) : null}
              {task.status !== "running" &&
              task.status !== "paused" &&
              canContinue ? (
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => void runAction("continue_batch")}
                  disabled={Boolean(runningAction)}
                  title="继续处理已经进入待抓取队列的 URL"
                >
                  {runningAction === "continue_batch" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  继续下一批
                </button>
              ) : null}
              {summary.failed > 0 && task.status !== "running" ? (
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-danger/25 bg-danger-soft px-3 text-[12px] font-medium text-danger transition hover:border-danger/40 disabled:cursor-not-allowed disabled:opacity-55"
                  onClick={() => void runAction("retry_failed")}
                  disabled={Boolean(runningAction)}
                  title="只重试连接超时、抓取失败或被阻止的异常资源"
                >
                  {runningAction === "retry_failed" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  重试失败项（{summary.failed}）
                </button>
              ) : null}
            </>
          }
        />

        <section className="grid gap-2 rounded-card border border-borderSoft bg-white p-2 shadow-card sm:grid-cols-3">
          <div className="rounded-md bg-primary-soft px-3 py-2 text-[11px] text-primary">
            <strong>继续下一批</strong>
            <span className="ml-2 text-textMuted">
              处理队列中的 {summary.queued} 条 URL
            </span>
          </div>
          <div className="rounded-md bg-ai-soft px-3 py-2 text-[11px] text-ai">
            <strong>增量补抓</strong>
            <span className="ml-2 text-textMuted">
              重新扫描官网新增产品页与 PDF
            </span>
          </div>
          <div className="rounded-md bg-danger-soft px-3 py-2 text-[11px] text-danger">
            <strong>重试失败项</strong>
            <span className="ml-2 text-textMuted">
              单独处理 {summary.failed} 条异常资源
            </span>
          </div>
        </section>

        {error ? (
          <section className="rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-[12px] text-danger">
            {error}
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            [
              Database,
              "发现资源",
              summary.discoveries,
              "text-primary",
              "已登记链接",
            ],
            [Boxes, "产品页面", summary.products, "text-ai", "厂家产品详情"],
            [
              CheckCircle2,
              "已抓取",
              summary.fetched,
              "text-success",
              "已保存内容证据",
            ],
            [History, "待继续", summary.queued, "text-primary", "等待后续批次"],
            [
              FileSearch,
              "待审核资料",
              summary.pendingReview,
              "text-warning",
              "结构化设备候选",
            ],
            [
              AlertTriangle,
              "失败 / 阻止",
              summary.failed,
              "text-danger",
              "需检查来源",
            ],
          ].map(([Icon, label, value, tone, note]) => {
            const IconComponent = Icon as typeof Database;
            return (
              <article
                key={String(label)}
                className="rounded-card border border-borderSoft bg-white p-3 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-textMuted">
                    {String(label)}
                  </span>
                  <IconComponent className={cn("size-5", String(tone))} />
                </div>
                <p className="mt-2 text-[24px] font-bold text-textMain">
                  {String(value)}
                </p>
                <p className="mt-1 text-[10px] text-textMuted">
                  {String(note)}
                </p>
              </article>
            );
          })}
        </section>

        <section className="rounded-card border border-primary/15 bg-primary-soft/45 p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-white">
                <SearchCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-[14px] font-bold text-textMain">
                  采集数据保存在哪里
                </h2>
                <p className="mt-1 text-[12px] leading-5 text-textMuted">
                  发现的网页与产品链接进入发现队列，抓取内容进入证据快照；完成结构化识别并经人工审核的设备，才会写入正式设备资料库。
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-pill border px-2.5 py-1 text-[11px] font-semibold",
                statusTone(task.status),
              )}
            >
              {taskStatusLabel[task.status]}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-4">
            <div className="rounded-lg bg-white p-3">
              <strong className="text-primary">1. 发现队列</strong>
              <p className="mt-1 text-textMuted">
                {summary.discoveries} 条 URL
              </p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <strong className="text-ai">2. 证据快照</strong>
              <p className="mt-1 text-textMuted">
                {summary.evidence} 条内容记录
              </p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <strong className="text-warning">3. 待审核候选</strong>
              <p className="mt-1 text-textMuted">
                {summary.pendingReview} 条待审核设备资料
              </p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <strong className="text-success">4. 正式资料库</strong>
              <p className="mt-1 text-textMuted">人工确认后入库</p>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft p-4">
              <ModuleHeader
                icon={FileSearch}
                title="采集结果明细"
                subtitle="真实发现记录、证据快照与运行批次"
                density="compact"
              />
              <div className="flex rounded-md border border-borderSoft bg-slate-50 p-0.5">
                {(
                  [
                    ["candidates", `待审核资料 ${summary.pendingReview}`],
                    ["discoveries", `发现记录 ${summary.discoveries}`],
                    ["evidence", `证据快照 ${summary.evidence}`],
                    ["runs", `运行批次 ${summary.runs}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setActiveView(value);
                      setPage(1);
                      setStatusFilter("");
                      setResourceTypeFilter("");
                      setReviewStatusFilter("");
                      setSelectedDiscoveryIds(new Set());
                    }}
                    className={cn(
                      "h-8 rounded px-3 text-[11px] font-medium",
                      activeView === value
                        ? "bg-white text-primary shadow-sm"
                        : "text-textMuted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-borderSoft bg-slate-50/60 px-3 py-2">
              {activeView === "discoveries" || activeView === "runs" ? (
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                    setSelectedDiscoveryIds(new Set());
                  }}
                  className="h-8 min-w-32 rounded-md border border-borderSoft bg-white px-2 text-[11px] outline-none focus:border-primary"
                  aria-label="状态筛选"
                >
                  <option value="">全部状态</option>
                  {activeView === "discoveries" ? (
                    <>
                      <option value="queued">待抓取</option>
                      <option value="fetching">抓取中</option>
                      <option value="fetched">已抓取</option>
                      <option value="tracked">已追踪</option>
                      <option value="failed">失败</option>
                      <option value="blocked">已阻止</option>
                      <option value="skipped">范围外</option>
                    </>
                  ) : (
                    <>
                      <option value="queued">排队中</option>
                      <option value="running">运行中</option>
                      <option value="completed">已完成</option>
                      <option value="partial">部分完成</option>
                      <option value="failed">失败</option>
                      <option value="cancelled">已取消</option>
                    </>
                  )}
                </select>
              ) : null}
              {activeView === "discoveries" ? (
                <select
                  value={resourceTypeFilter}
                  onChange={(event) => {
                    setResourceTypeFilter(event.target.value);
                    setPage(1);
                    setSelectedDiscoveryIds(new Set());
                  }}
                  className="h-8 min-w-32 rounded-md border border-borderSoft bg-white px-2 text-[11px] outline-none focus:border-primary"
                  aria-label="资源类型筛选"
                >
                  <option value="">全部资源类型</option>
                  {Object.entries(resourceTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : null}
              {activeView === "candidates" ? (
                <select
                  value={reviewStatusFilter}
                  onChange={(event) => {
                    setReviewStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-32 rounded-md border border-borderSoft bg-white px-2 text-[11px] outline-none focus:border-primary"
                  aria-label="审核状态筛选"
                >
                  <option value="">全部审核状态</option>
                  <option value="pending_review">待审核</option>
                  <option value="approved">已入库</option>
                  <option value="rejected">已驳回</option>
                </select>
              ) : null}
              {activeView === "evidence" ? (
                <span className="text-[11px] text-textMuted">
                  证据快照按最新抓取时间排序
                </span>
              ) : null}
              <button
                type="button"
                className={outlineButton}
                onClick={() => {
                  setStatusFilter("");
                  setResourceTypeFilter("");
                  setReviewStatusFilter("");
                  setSelectedDiscoveryIds(new Set());
                  setPage(1);
                }}
              >
                重置筛选
              </button>
              {activeView === "discoveries" ? (
                <button
                  type="button"
                  className="ml-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-danger/25 bg-danger-soft px-3 text-[11px] font-medium text-danger disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={
                    !selectedDiscoveryIds.size || Boolean(runningAction)
                  }
                  onClick={() =>
                    void runAction(
                      "retry_failed",
                      Array.from(selectedDiscoveryIds),
                    )
                  }
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      runningAction === "retry_failed" && "animate-spin",
                    )}
                  />
                  批量重试（{selectedDiscoveryIds.size}）
                </button>
              ) : null}
            </div>

            {activeView === "candidates" ? (
              <CatalogCandidateTable rows={catalogCandidates} />
            ) : null}
            {activeView === "discoveries" ? (
              <DiscoveryTable
                rows={discoveries}
                selectedIds={selectedDiscoveryIds}
                onSelectionChange={setSelectedDiscoveryIds}
              />
            ) : null}
            {activeView === "evidence" ? (
              <EvidenceTable rows={evidence} />
            ) : null}
            {activeView === "runs" ? <RunsTable rows={runs} /> : null}
            <PaginationBar
              total={activeTotal}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
            />
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <ModuleHeader
                icon={Database}
                title="任务与存储状态"
                subtitle={task.taskCode}
                density="compact"
              />
              <div className="mt-3 space-y-2 text-[11px]">
                {[
                  ["采集对象", task.keyword],
                  [
                    "数据来源",
                    detail.sources.map((source) => source.name).join("、") ||
                      task.sourceType,
                  ],
                  ["当前进度", `${task.progress}%`],
                  ["当前阶段", task.currentSource || "等待执行"],
                  ["创建时间", formatTime(task.createdAt)],
                  ["最后运行", formatTime(task.lastRunAt || task.finishedAt)],
                ].map(([label, value]) => (
                  <p
                    key={label}
                    className="flex justify-between gap-3 border-b border-borderSoft pb-2 last:border-0"
                  >
                    <span className="text-textMuted">{label}</span>
                    <strong className="max-w-[190px] text-right">
                      {value}
                    </strong>
                  </p>
                ))}
              </div>
              {task.lastError ? (
                <div className="mt-3 rounded-lg border border-danger/15 bg-danger-soft p-3 text-[10px] leading-4 text-danger">
                  {task.lastError}
                </div>
              ) : null}
            </section>
            <section className="rounded-card border border-ai-border bg-ai-soft p-4 shadow-card">
              <ModuleHeader
                icon={ShieldCheck}
                title="识别与入库边界"
                subtitle="AI 结果必须人工确认"
                tone="purple"
                density="compact"
              />
              <div className="mt-3 space-y-2 text-[11px] leading-5">
                <p className="rounded-lg bg-white/80 p-3">
                  当前已保存 <strong>{summary.evidence}</strong>{" "}
                  条来源证据，发现 <strong>{summary.products}</strong>{" "}
                  个产品页。
                </p>
                <p className="rounded-lg bg-white/80 p-3">
                  已形成 <strong>{summary.candidates}</strong>{" "}
                  条结构化设备候选，其中{" "}
                  <strong>{summary.pendingReview}</strong> 条等待人工审核。
                </p>
                {summary.queued > 0 ? (
                  <p className="rounded-lg bg-primary-soft p-3 text-primary">
                    仍有 {summary.queued} 条资源等待下一批采集。
                  </p>
                ) : null}
              </div>
            </section>
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <ModuleHeader
                icon={ClipboardCheck}
                title="后续动作"
                subtitle="从采集证据到人工审核"
                density="compact"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => setActiveView("candidates")}
                >
                  查看待审核资料
                </button>
                <button
                  type="button"
                  className={outlineButton}
                  onClick={() => setActiveView("evidence")}
                >
                  查看证据
                </button>
                <Link
                  href={`/equipment-catalog/reviews?taskId=${encodeURIComponent(task.id)}`}
                  className={aiButton}
                >
                  进入资料审核
                </Link>
                <Link
                  href={`/equipment-catalog?taskId=${encodeURIComponent(task.id)}`}
                  className={outlineButton}
                >
                  正式资料库
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppLayout>
  );
}

function PaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: 10 | 20 | 30;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: 10 | 20 | 30) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const numberedPages = Array.from(
    new Set([1, page - 1, page, page + 1, pageCount]),
  )
    .filter((item) => item >= 1 && item <= pageCount)
    .sort((left, right) => left - right);

  return (
    <div className="sticky bottom-0 z-20 flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-borderSoft bg-slate-50/95 px-3 py-2 text-[11px] backdrop-blur-sm">
      <p className="text-textMuted">
        共 <strong className="text-textMain">{total}</strong> 条，当前第{" "}
        <strong className="text-textMain">
          {page} / {pageCount}
        </strong>{" "}
        页
      </p>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <label className="mr-2 flex items-center gap-1.5 text-textMuted">
          每页
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value) as 10 | 20 | 30)
            }
            className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textMain outline-none focus:border-primary"
            aria-label="每页显示条数"
          >
            <option value={10}>10 条</option>
            <option value={20}>20 条</option>
            <option value={30}>30 条</option>
          </select>
        </label>
        <button
          type="button"
          className="h-8 rounded-md border border-borderSoft bg-white px-2.5 text-textMuted hover:border-primary/35 hover:text-primary disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </button>
        {numberedPages.map((item, index) => {
          const previous = numberedPages[index - 1];
          return (
            <span key={item} className="contents">
              {previous && item - previous > 1 ? (
                <span className="px-1 text-textMuted">...</span>
              ) : null}
              <button
                type="button"
                className={cn(
                  "size-8 rounded-md border text-[11px] font-medium",
                  item === page
                    ? "border-primary bg-primary text-white"
                    : "border-borderSoft bg-white text-textMuted hover:border-primary/35 hover:text-primary",
                )}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          className="h-8 rounded-md border border-borderSoft bg-white px-2.5 text-textMuted hover:border-primary/35 hover:text-primary disabled:opacity-40"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function CatalogCandidateTable({
  rows,
}: {
  rows: PriceCollectionTaskDetail["catalogCandidates"];
}) {
  if (!rows.length)
    return (
      <div className="p-8">
        <EmptyState
          title="暂无结构化设备候选"
          description="继续采集产品详情页后，系统会提取型号、系列、用途和技术参数，并送入人工审核。"
        />
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-[11px]">
        <thead className="h-9 bg-slate-50 text-left text-textMuted">
          <tr>
            <th className="px-3">设备资料</th>
            <th className="px-3">品牌 / 系列</th>
            <th className="px-3">型号</th>
            <th className="px-3">分类</th>
            <th className="px-3">参数完整度</th>
            <th className="px-3">AI置信度</th>
            <th className="px-3">审核状态</th>
            <th className="sticky right-0 z-10 bg-slate-50 px-3 text-right">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="h-12 border-t border-borderSoft">
              <td className="max-w-[260px] px-3">
                <p
                  className="truncate font-semibold"
                  title={item.equipmentName}
                >
                  {item.equipmentName}
                </p>
                <p className="mt-0.5 truncate text-[9px] text-textMuted">
                  {item.catalogCode}
                </p>
              </td>
              <td className="px-3">
                <p>{item.brand || "--"}</p>
                <p className="text-[9px] text-textMuted">
                  {item.productSeries || "未识别系列"}
                </p>
              </td>
              <td className="px-3 font-medium text-primary">
                {item.model || "--"}
              </td>
              <td className="px-3">
                {item.equipmentType || item.equipmentCategory || "未分类"}
              </td>
              <td className="px-3">
                <span className="font-semibold">{item.completeness}%</span>
              </td>
              <td className="px-3">
                <span className="rounded-pill border border-ai-border bg-ai-soft px-2 py-1 text-ai">
                  {item.aiConfidence}%
                </span>
              </td>
              <td className="px-3">
                <span
                  className={cn(
                    "rounded-pill border px-2 py-1",
                    statusTone(item.reviewStatus),
                  )}
                >
                  {item.reviewStatus === "approved"
                    ? "已入库"
                    : item.reviewStatus === "rejected"
                      ? "已驳回"
                      : "待审核"}
                </span>
              </td>
              <td className="sticky right-0 bg-white px-3 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">
                <div className="flex justify-end gap-1">
                  <Link
                    href={`/equipment-catalog/${encodeURIComponent(item.id)}`}
                    className={outlineButton}
                  >
                    查看详情
                  </Link>
                  {item.reviewStatus !== "approved" ? (
                    <Link
                      href={`/equipment-catalog/${encodeURIComponent(item.id)}#human-review`}
                      className={aiButton}
                    >
                      人工审核
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiscoveryTable({
  rows,
  selectedIds,
  onSelectionChange,
}: {
  rows: PriceCollectionTaskDetail["discoveries"];
  selectedIds: Set<string>;
  onSelectionChange: (nextIds: Set<string>) => void;
}) {
  if (!rows.length)
    return (
      <div className="p-8">
        <EmptyState
          title="暂无发现记录"
          description="任务运行后，发现的网页、产品页和 PDF 会显示在这里。"
        />
      </div>
    );
  const retryableRows = rows.filter(
    (item) => item.status === "failed" || item.status === "blocked",
  );
  const allRetryableSelected =
    retryableRows.length > 0 &&
    retryableRows.every((item) => selectedIds.has(item.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-[11px]">
        <thead className="h-9 bg-slate-50 text-left text-textMuted">
          <tr>
            <th className="w-10 px-3">
              <input
                type="checkbox"
                checked={allRetryableSelected}
                disabled={!retryableRows.length}
                onChange={(event) => {
                  const next = new Set(selectedIds);
                  retryableRows.forEach((item) => {
                    if (event.target.checked) next.add(item.id);
                    else next.delete(item.id);
                  });
                  onSelectionChange(next);
                }}
                aria-label="选择本页失败记录"
              />
            </th>
            <th className="px-3">资源类型</th>
            <th className="px-3">页面 / 资源</th>
            <th className="px-3">状态</th>
            <th className="px-3">层级</th>
            <th className="px-3">响应</th>
            <th className="px-3">时间</th>
            <th className="sticky right-0 z-10 bg-slate-50 px-3 text-right">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="h-11 border-t border-borderSoft">
              <td className="px-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  disabled={
                    item.status !== "failed" && item.status !== "blocked"
                  }
                  onChange={(event) => {
                    const next = new Set(selectedIds);
                    if (event.target.checked) next.add(item.id);
                    else next.delete(item.id);
                    onSelectionChange(next);
                  }}
                  aria-label={`选择 ${item.pageTitle || item.resourceUrl}`}
                />
              </td>
              <td className="px-3">
                <span className="rounded border border-borderSoft bg-slate-50 px-1.5 py-1">
                  {resourceTypeLabel[item.resourceType]}
                </span>
              </td>
              <td className="max-w-[380px] px-3">
                <p
                  className="truncate font-medium"
                  title={item.pageTitle || item.resourceUrl}
                >
                  {item.pageTitle || item.resourceUrl}
                </p>
                <p
                  className="mt-0.5 truncate text-[9px] text-textMuted"
                  title={item.resourceUrl}
                >
                  {item.resourceUrl}
                </p>
              </td>
              <td className="px-3">
                <span
                  className={cn(
                    "rounded-pill border px-2 py-1 text-[10px]",
                    statusTone(item.status),
                  )}
                >
                  {discoveryStatusLabel[item.status]}
                </span>
                {item.errorMessage ? (
                  <p
                    className="mt-1 max-w-[180px] truncate text-[9px] text-danger"
                    title={item.errorMessage}
                  >
                    {item.errorMessage}
                  </p>
                ) : null}
              </td>
              <td className="px-3">{item.depth}</td>
              <td className="px-3">{item.httpStatus ?? "--"}</td>
              <td className="px-3 text-textMuted">
                {formatTime(item.fetchedAt || item.discoveredAt)}
              </td>
              <td className="sticky right-0 bg-white px-3 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">
                <a
                  href={item.resourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-7 items-center justify-center rounded border border-borderSoft text-primary hover:bg-primary-soft"
                  title="打开原始来源"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceTable({
  rows,
}: {
  rows: PriceCollectionTaskDetail["evidence"];
}) {
  if (!rows.length)
    return (
      <div className="p-8">
        <EmptyState
          title="暂无证据快照"
          description="页面抓取成功后，内容摘要与来源地址会保存到这里。"
        />
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[11px]">
        <thead className="h-9 bg-slate-50 text-left text-textMuted">
          <tr>
            <th className="px-3">证据编号</th>
            <th className="px-3">标题与摘要</th>
            <th className="px-3">类型</th>
            <th className="px-3">抓取时间</th>
            <th className="sticky right-0 z-10 bg-slate-50 px-3 text-right">
              来源
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-t border-borderSoft align-top">
              <td className="px-3 py-3 font-medium text-primary">
                {item.evidenceCode}
              </td>
              <td className="max-w-[480px] px-3 py-3">
                <p className="truncate font-medium">
                  {item.pageTitle || "未命名证据"}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-textMuted">
                  {item.excerpt || "已保存来源地址与内容哈希。"}
                </p>
              </td>
              <td className="px-3 py-3">{item.mimeType || "--"}</td>
              <td className="px-3 py-3 text-textMuted">
                {formatTime(item.fetchedAt)}
              </td>
              <td className="sticky right-0 bg-white px-3 py-3 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  查看原文
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunsTable({ rows }: { rows: PriceCollectionTaskDetail["runs"] }) {
  if (!rows.length)
    return (
      <div className="p-8">
        <EmptyState
          title="暂无运行批次"
          description="开始采集后会生成逐次 Run 记录。"
        />
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[11px]">
        <thead className="h-9 bg-slate-50 text-left text-textMuted">
          <tr>
            <th className="px-3">运行编号</th>
            <th className="px-3">触发方式</th>
            <th className="px-3">状态</th>
            <th className="px-3">抓取量</th>
            <th className="px-3">候选线索</th>
            <th className="px-3">失败来源</th>
            <th className="px-3">完成时间</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((run) => (
            <tr key={run.id} className="h-11 border-t border-borderSoft">
              <td className="px-3 font-medium text-primary">{run.runCode}</td>
              <td className="px-3">{run.triggerType}</td>
              <td className="px-3">
                <span
                  className={cn(
                    "rounded-pill border px-2 py-1 text-[10px]",
                    statusTone(run.status),
                  )}
                >
                  {run.status}
                </span>
              </td>
              <td className="px-3">{run.fetchedCount}</td>
              <td className="px-3">
                {run.createdLeadCount + run.updatedLeadCount}
              </td>
              <td className="px-3 text-danger">{run.failedSourceCount}</td>
              <td className="px-3 text-textMuted">
                {formatTime(run.finishedAt || run.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
