"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  MailWarning,
  RefreshCw,
  Settings2,
  ShieldCheck,
  TimerReset,
  Workflow,
} from "lucide-react";
import { ModuleHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import type { AiAutomationHealth } from "@/types/aiExecution";
import type { AiAutomationStage } from "@/types/aiExecution";

function timeLabel(value: string | null) {
  if (!value) return "暂无记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

const runStatusLabels: Record<string, string> = {
  queued: "排队中",
  running: "执行中",
  completed: "已完成",
  needs_review: "待人工复核",
  approved: "已批准",
  partial: "部分完成",
  failed: "执行失败",
  cancelled: "已取消",
};

const cronLabels: Record<string, string> = {
  "wpi-price-collection-due": "价格采集调度",
  "wpi-inquiry-reminders-due": "询价提醒调度",
  "wpi-reconcile-stale-ai-gateway-runs": "异常任务回收",
  "wpi-capture-automation-health": "持续保障巡检",
  "wpi-daily-automation-smoke": "每日流程冒烟",
  "wpi-attachment-governance": "附件证据治理",
};

function StageCell({ stage, showCount = false }: { stage: AiAutomationStage; showCount?: boolean }) {
  const tone = {
    passed: "bg-success-soft text-success",
    pending: "bg-warning-soft text-warning",
    failed: "bg-danger-soft text-danger",
    blocked: "bg-danger-soft text-danger",
    not_run: "bg-slate-100 text-textMuted",
  }[stage.status];
  const title = [stage.label, stage.detail ?? stage.message, stage.at ? timeLabel(stage.at) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className={cn("inline-flex h-6 max-w-full items-center gap-1 rounded-md px-2 text-[10px] font-semibold", tone)} title={title}>
      {stage.status === "passed" ? <CheckCircle2 className="size-3 shrink-0" /> : stage.status === "failed" || stage.status === "blocked" ? <AlertTriangle className="size-3 shrink-0" /> : <Activity className="size-3 shrink-0" />}
      <span className="truncate">{stage.label}</span>
      {showCount && typeof stage.count === "number" ? <span className="shrink-0">{stage.count}</span> : null}
    </span>
  );
}

export function AiAutomationOperationsPanel({
  health,
  loading,
  error,
  onRefresh,
  onShowFailed,
}: {
  health: AiAutomationHealth | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onShowFailed: () => void;
}) {
  const overall = health?.overallStatus ?? "degraded";
  const overallMeta = {
    healthy: { label: "运行正常", className: "bg-success-soft text-success", icon: CheckCircle2 },
    degraded: { label: "部分降级", className: "bg-warning-soft text-warning", icon: AlertTriangle },
    critical: { label: "需要处理", className: "bg-danger-soft text-danger", icon: AlertTriangle },
  }[overall];
  const OverallIcon = overallMeta.icon;
  const assurance = health?.assurance;
  const activeIncident = assurance?.activeIncidents[0];
  const unhealthyComponents = (assurance?.components ?? []).filter((component) => component.healthStatus !== "healthy");
  const metrics: Array<{
    icon: LucideIcon;
    label: string;
    value: string | number;
    tone: "danger" | "warning" | "success" | "primary";
  }> = [
    { icon: Workflow, label: "工作流可用", value: health ? `${health.summary.workflowReady}/${health.summary.workflowTotal}` : "--", tone: health?.summary.workflowBlocked ? "warning" : "success" },
    { icon: Bot, label: "24小时失败", value: health?.summary.failedTasks24h ?? "--", tone: health?.summary.failedTasks24h ? "danger" : "success" },
    { icon: TimerReset, label: "陈旧任务", value: health?.summary.staleTasks ?? "--", tone: health?.summary.staleTasks ? "danger" : "success" },
    { icon: CalendarClock, label: "Cron失败", value: health?.summary.cronFailures24h ?? "--", tone: health?.summary.cronFailures24h ? "danger" : "success" },
    { icon: Settings2, label: "集成异常", value: health?.summary.integrationErrors ?? "--", tone: health?.summary.integrationErrors ? "warning" : "success" },
    { icon: Activity, label: "采集来源失败", value: health?.collection.failedSourceAttempts24h ?? "--", tone: health?.collection.failedSourceAttempts24h ? "danger" : "success" },
  ];

  return (
    <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-3">
        <ModuleHeader
          icon={Activity}
          title="自动化运行健康"
          subtitle="按配置、运行、审核、落库与每日冒烟检查核心工作流"
          density="compact"
          tone="purple"
        />
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-semibold", overallMeta.className)}>
            <OverallIcon className="size-3.5" />{overallMeta.label}
          </span>
          <button type="button" onClick={onRefresh} disabled={loading} title="刷新自动化健康状态" className="flex size-8 items-center justify-center rounded-md border border-borderSoft text-textSecondary hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 bg-danger-soft px-4 py-3 text-[11px] text-danger">
          <span className="min-w-0 truncate">{error}</span>
          <button type="button" onClick={onRefresh} className="shrink-0 font-semibold">重新读取</button>
        </div>
      ) : null}

      <div className="grid border-b border-borderSoft sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="flex min-h-[66px] items-center gap-2 border-b border-borderSoft px-3 py-2 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <span className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : tone === "success" ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
            )}><Icon className="size-4" /></span>
            <div className="min-w-0"><p className="truncate text-[10px] text-textMuted">{label}</p><p className="text-[16px] font-bold text-textMain">{value}</p></div>
          </div>
        ))}
      </div>

      <div className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-2.5",
        activeIncident?.severity === "critical" ? "bg-danger-soft" : activeIncident ? "bg-warning-soft" : "bg-success-soft",
      )}>
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className={cn("size-4 shrink-0", activeIncident?.severity === "critical" ? "text-danger" : activeIncident ? "text-warning" : "text-success")} />
          <p className="min-w-0 truncate text-[11px] text-textSecondary">
            <span className="font-semibold text-textMain">持续保障{assurance?.enabled ? "已启用" : "未启用"}</span>
            {assurance ? ` · 每 ${assurance.intervalMinutes} 分钟巡检 · ${assurance.retentionDays} 天留存 · 24小时快照 ${assurance.snapshots24h} 条` : " · 正在读取巡检状态"}
          </p>
        </div>
        <p className={cn("max-w-full truncate text-[11px] font-semibold", activeIncident?.severity === "critical" ? "text-danger" : activeIncident ? "text-warning" : "text-success")} title={activeIncident?.message}>
          {activeIncident ? `${activeIncident.title} · 连续 ${activeIncident.occurrenceCount} 次` : "当前无未关闭运行事件"}
        </p>
      </div>

      {unhealthyComponents.length ? (
        <div className="border-b border-borderSoft bg-warning-soft/50 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-warning"><AlertTriangle className="size-3.5" />待处理组件 {unhealthyComponents.length} 个</span>
            {unhealthyComponents.slice(0, 5).map((component) => (
              <Link
                key={component.componentKey}
                href={component.remediationHref || "/ai-workbench"}
                title={component.message ?? component.label}
                className={cn("inline-flex min-w-0 items-center gap-1 font-semibold hover:underline", component.healthStatus === "critical" ? "text-danger" : "text-warning")}
              >
                <span className="max-w-[180px] truncate">{component.label}</span>
                <span className="shrink-0 text-[10px] font-normal text-textMuted">连续 {component.consecutiveFailures} 次</span>
              </Link>
            ))}
          </div>
        </div>
      ) : assurance?.components.length ? (
        <div className="flex items-center gap-2 border-b border-borderSoft bg-success-soft/50 px-4 py-2.5 text-[11px] font-semibold text-success">
          <CheckCircle2 className="size-3.5" />{assurance.components.length} 个自动化组件全部正常
        </div>
      ) : null}

      <div className="grid xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <div className="min-w-0 overflow-x-auto border-b border-borderSoft xl:border-b-0 xl:border-r">
          <div className="grid min-w-[760px] grid-cols-[minmax(140px,1.2fr)_minmax(105px,0.8fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)] border-b border-borderSoft bg-slate-50 px-4 py-2 text-[10px] font-semibold text-textMuted">
            <span>AI 工作流</span><span>配置就绪</span><span>最近运行</span><span>人工审核</span><span>正式落库</span>
          </div>
          <div className="divide-y divide-borderSoft">
            {(health?.workflows ?? []).map((workflow) => (
              <div key={workflow.workflowKey} className="grid min-h-[58px] min-w-[760px] grid-cols-[minmax(140px,1.2fr)_minmax(105px,0.8fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)] items-center gap-2 px-4 py-2 text-[11px]">
                <div className="min-w-0">
                  <Link href={workflow.businessHref} className="block truncate font-semibold text-textMain hover:text-primary">{workflow.label}</Link>
                  <span className={cn("mt-0.5 block truncate text-[9px]", workflow.smoke.status === "passed" ? "text-success" : workflow.smoke.status === "failed" ? "text-danger" : "text-textMuted")} title={workflow.smoke.message ?? workflow.smoke.label}>
                    每日冒烟：{workflow.smoke.label}{workflow.smoke.at ? ` · ${timeLabel(workflow.smoke.at)}` : ""}
                  </span>
                </div>
                <StageCell stage={workflow.configuration} />
                <StageCell stage={{ ...workflow.latestRun, label: runStatusLabels[workflow.latestRun.label] ?? workflow.latestRun.label }} />
                <StageCell stage={workflow.humanReview} showCount />
                <StageCell stage={workflow.formalWrite} showCount />
              </div>
            ))}
            {!loading && !health?.workflows.length ? <div className="px-4 py-8 text-center text-[11px] text-textMuted">暂无工作流健康数据</div> : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="border-b border-borderSoft px-4 py-2 text-[10px] font-semibold text-textMuted">计划任务与外部集成</div>
          <div className="divide-y divide-borderSoft">
            {(health?.cronJobs ?? []).map((job) => (
              <div key={job.name} className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2 text-[11px]">
                <div className="min-w-0"><p className="truncate font-semibold text-textMain">{cronLabels[job.name] ?? job.name}</p><p className="truncate text-[10px] text-textMuted">最近 {timeLabel(job.lastStartedAt)} · 24小时 {job.runs24h} 次</p></div>
                <span className={cn("shrink-0 font-semibold", job.active && job.lastStatus === "succeeded" && job.failures24h === 0 ? "text-success" : "text-danger")}>
                  {job.active ? (job.failures24h ? `${job.failures24h} 次失败` : "正常") : "已停用"}
                </span>
              </div>
            ))}
            {(health?.integrations ?? []).map((integration) => (
              <div key={integration.code} className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2 text-[11px]">
                <div className="flex min-w-0 items-center gap-2">
                  {integration.type === "email" ? <MailWarning className="size-4 shrink-0 text-warning" /> : <Bot className="size-4 shrink-0 text-ai" />}
                  <div className="min-w-0"><p className="truncate font-semibold text-textMain">{integration.name}</p><p className="truncate text-[10px] text-textMuted" title={integration.lastError ?? undefined}>{integration.lastError ?? `最近成功 ${timeLabel(integration.lastSuccessAt)}`}</p></div>
                </div>
                <span className={cn("shrink-0 font-semibold", integration.status === "active" ? "text-success" : integration.status === "error" ? "text-danger" : "text-warning")}>
                  {integration.status === "active" ? "可用" : integration.status === "error" ? "异常" : "未配置"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borderSoft bg-slate-50 px-4 py-2.5">
        <p className="text-[10px] text-textMuted" title={health?.collection.latestFailureMessage ?? undefined}>实时状态：{timeLabel(health?.generatedAt ?? null)} · 最近巡检：{timeLabel(assurance?.latestSnapshotAt ?? null)} · 最近采集失败：{timeLabel(health?.collection.latestFailureAt ?? null)}。历史失败保留审计，不代表当前工作流仍不可用。</p>
        <div className="flex items-center gap-2">
          <Link href="/ai-price-collection" className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[11px] font-semibold text-textSecondary hover:text-primary">
            <Activity className="size-3.5" />采集运维
          </Link>
          <button type="button" onClick={onShowFailed} className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[11px] font-semibold text-textSecondary hover:text-primary">
            <AlertTriangle className="size-3.5" />查看失败任务
          </button>
          <Link href="/settings/integrations?type=email" className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-white">
            <Settings2 className="size-3.5" />集成设置<ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
