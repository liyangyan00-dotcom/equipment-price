import {
  Eye,
  FileCheck2,
  Files,
  ListRestart,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { IconBox } from "@/components/common/IconBox";
import { cn } from "@/lib/utils";
import type { PriceCollectionSourceRunRecord } from "@/types/priceCollection";

type RunStatus = "idle" | "running" | "paused" | "completed" | "stopped" | "failed";

type CollectionRunMonitorProps = {
  run: {
    id: string;
    status: RunStatus;
    progress: number;
    currentSource: string;
    successCount: number;
    failedCount: number;
    fetchedCount: number;
    evidenceCount: number;
    updatedCount: number;
    duplicateCount: number;
    startedAt: string;
    logs: string[];
    sourceRuns: PriceCollectionSourceRunRecord[];
  };
  showLogs: boolean;
  onDetails: () => void;
  onPauseResume: () => void;
  onStop: () => void;
  onRetry: () => void;
  onToggleLogs: () => void;
  taskCount: number;
  onHistory: () => void;
  taskOptions: Array<{ id: string; taskCode: string; keyword: string }>;
  selectedTaskId: string;
  switchingTask: boolean;
  onTaskSelect: (taskId: string) => void;
};

function formatRunTime(value: string) {
  if (!value) return "待开始";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

const statusMeta: Record<RunStatus, { label: string; className: string }> = {
  idle: { label: "等待执行", className: "bg-slate-100 text-textMuted" },
  running: { label: "采集中", className: "bg-ai-soft text-ai" },
  paused: { label: "已暂停", className: "bg-warning/10 text-warning" },
  completed: { label: "已完成", className: "bg-success/10 text-success" },
  stopped: { label: "已终止", className: "bg-slate-100 text-textMuted" },
  failed: { label: "执行失败", className: "bg-danger/10 text-danger" },
};

export function CollectionRunMonitor({
  run,
  showLogs,
  onDetails,
  onPauseResume,
  onStop,
  onRetry,
  onToggleLogs,
  taskCount,
  onHistory,
  taskOptions,
  selectedTaskId,
  switchingTask,
  onTaskSelect,
}: CollectionRunMonitorProps) {
  const status = statusMeta[run.status];
  const active = run.status === "running" || run.status === "paused";

  return (
    <section className="border-t border-borderSoft bg-[#FAFCFF] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBox icon={ListRestart} tone="purple" size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary-soft px-2 py-1 text-[10px] font-bold text-primary">最近一次执行任务</span>
              <h3 className="truncate text-[13px] font-black text-textMain">
                {run.id || "当前暂无执行任务"}
              </h3>
              <span className={cn("rounded-md px-2 py-1 text-[10px] font-bold", status.className)}>
                {status.label}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-textMuted">
              {run.id ? `当前仅展示此任务 · 来源：${run.currentSource} · 开始时间：${formatRunTime(run.startedAt)}` : "创建网上采集任务或上传报价后，将在这里显示真实执行进度。"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {taskOptions.length ? <label className="relative">
            <span className="sr-only">切换执行任务</span>
            <select value={selectedTaskId} disabled={switchingTask} onChange={(event) => onTaskSelect(event.target.value)} className="h-8 max-w-[210px] rounded-md border border-primary/20 bg-white px-2 text-[11px] font-bold text-primary outline-none focus:border-primary disabled:opacity-50">
              {taskOptions.map((task) => <option key={task.id} value={task.id}>{task.taskCode}{task.keyword ? ` · ${task.keyword}` : ""}</option>)}
            </select>
          </label> : null}
          <button type="button" onClick={onHistory} className="inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-bold text-textSecondary">
            <Files className="size-3.5" /> 管理任务（{taskCount}）
          </button>
          {run.id ? (
            <button type="button" onClick={onDetails} className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/20 bg-white px-3 text-[11px] font-bold text-primary">
              <Eye className="size-3.5" /> 任务详情
            </button>
          ) : null}
          {active ? (
            <button type="button" onClick={onPauseResume} className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/20 bg-white px-3 text-[11px] font-bold text-primary">
              {run.status === "running" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {run.status === "running" ? "暂停" : "继续"}
            </button>
          ) : null}
          {active ? (
            <button type="button" onClick={onStop} className="inline-flex h-8 items-center gap-1 rounded-md border border-danger/20 bg-white px-3 text-[11px] font-bold text-danger">
              <Square className="size-3.5" /> 终止
            </button>
          ) : null}
          {run.status === "failed" || run.status === "stopped" ? (
            <button type="button" onClick={onRetry} className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-bold text-white">
              <RotateCcw className="size-3.5" /> 重试失败来源
            </button>
          ) : null}
          {run.id ? (
            <button type="button" onClick={onToggleLogs} className="h-8 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-bold text-textSecondary">
              {showLogs ? "收起日志" : "运行日志"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["执行进度", `${run.progress}%`, ListRestart],
          ["已抓页面", String(run.fetchedCount), Files],
          ["证据快照", String(run.evidenceCount), Files],
          ["价格线索", String(run.successCount), FileCheck2],
          ["更新 / 重复", `${run.updatedCount} / ${run.duplicateCount}`, RotateCcw],
          ["失败来源", String(run.failedCount), Square],
        ].map(([label, value, MetricIcon]) => (
          <div key={String(label)} className="flex min-w-0 items-center gap-2 border-r border-borderSoft px-2 last:border-r-0">
            <MetricIcon className="size-3.5 shrink-0 text-primary" />
            <span className="min-w-0 text-[10px] text-textMuted">
              <span className="block truncate">{String(label)}</span>
              <strong className="text-[13px] text-textMain">{String(value)}</strong>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`任务进度 ${run.progress}%`}>
        <div className="h-full rounded-full bg-ai transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${run.progress}%` }} />
      </div>

      {run.sourceRuns.length ? (
        <div className="mt-3 border-t border-borderSoft pt-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px]">
            <strong className="text-textSecondary">来源级并发进度</strong>
            <span className="text-textMuted">
              运行 {run.sourceRuns.filter((item) => item.status === "running").length} ·
              完成 {run.sourceRuns.filter((item) => item.status === "completed").length} ·
              失败 {run.sourceRuns.filter((item) => item.status === "failed").length}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {run.sourceRuns.map((sourceRun) => (
              <div key={sourceRun.id} className="min-w-0 rounded-[8px] border border-borderSoft bg-white px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-bold text-textMain" title={sourceRun.sourceName}>{sourceRun.sourceName}</span>
                  <span className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold",
                    sourceRun.status === "completed" ? "bg-success/10 text-success" :
                      sourceRun.status === "failed" ? "bg-danger/10 text-danger" :
                        sourceRun.status === "running" ? "bg-ai-soft text-ai" : "bg-warning/10 text-warning",
                  )}>
                    {sourceRun.status === "completed" ? "已完成" : sourceRun.status === "failed" ? "失败" : sourceRun.status === "running" ? "采集中" : "排队中"}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-textMuted">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${sourceRun.progress}%` }} />
                  </div>
                  <span className="shrink-0">{sourceRun.pagesUsed}/{sourceRun.pageBudget} 页</span>
                  <span className="shrink-0">{sourceRun.createdLeadCount + sourceRun.updatedLeadCount} 条价格</span>
                </div>
                {sourceRun.errorMessage ? <p className="mt-1 truncate text-[9px] text-danger" title={sourceRun.errorMessage}>{sourceRun.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {run.status === "completed" && run.fetchedCount > 0 ? (
        <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border px-3 py-2 text-[11px]", run.successCount > 0 ? "border-success/25 bg-success/5 text-success" : "border-warning/30 bg-warning/5 text-warning")}>
          <span className="font-bold">
            {run.successCount > 0
              ? `已从 ${run.fetchedCount} 个页面生成 ${run.successCount} 条待审核价格线索。`
              : `已抓取 ${run.fetchedCount} 个页面并保存 ${run.evidenceCount} 条证据，但未识别到可用价格。`}
          </span>
          <button type="button" onClick={onDetails} className="inline-flex h-7 items-center gap-1 rounded-md border border-current/20 bg-white px-2 font-bold">
            <Eye className="size-3.5" /> {run.successCount > 0 ? "查看价格与证据" : "查看证据和原因"}
          </button>
        </div>
      ) : null}

      {showLogs ? (
        <div className="mt-3 max-h-28 overflow-y-auto rounded-[8px] border border-borderSoft bg-white p-2 text-[11px] text-textSecondary">
          {run.logs.length ? run.logs.map((log, index) => <div key={`${log}-${index}`} className="flex gap-2 py-0.5"><span className="font-black text-ai">{index + 1}</span><span>{log}</span></div>) : <span>当前暂无运行日志。</span>}
        </div>
      ) : null}
    </section>
  );
}
