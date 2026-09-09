"use client";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Info,
  Lightbulb,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UserRoundCheck,
  X,
} from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import {
  ConfirmDialog,
  EmptyState,
  ModuleHeader,
} from "@/components/common";
import { WorkflowKpiGrid } from "@/components/ai-workflow/WorkflowKpiGrid";
import { AiQualityCostPanel } from "@/components/ai-workflow/AiQualityCostPanel";
import { AiAutomationOperationsPanel } from "@/components/ai-workflow/AiAutomationOperationsPanel";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  aiWorkbenchActivities,
  aiWorkbenchReviewItems,
  aiWorkbenchRiskItems,
  aiWorkbenchSuggestions,
  type AiWorkbenchTask as MockAiWorkbenchTask,
} from "@/data/mock/aiWorkbench";
import type { WorkflowKpi } from "@/data/mock/aiQuoteRecognition";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/downloadCsv";
import type { AiTaskStatus } from "@/types/common";
import {
  aiWorkflowBusinessRoutes,
  aiWorkflowLabels,
  type AiAutomationHealth,
  type AiExecutionEvent,
  type AiExecutionTask,
  type AiExecutionTaskStatus,
  type AiExecutionWorkflowKey,
} from "@/types/aiExecution";

type WorkbenchTask = MockAiWorkbenchTask & {
  databaseId?: string;
  workflowKey?: AiExecutionWorkflowKey;
  executionStatus?: AiExecutionTaskStatus;
  stage?: string;
  businessHref?: string | null;
  output?: Record<string, unknown> | null;
  events?: AiExecutionEvent[];
  errorMessage?: string | null;
  attemptCount?: number;
  maxAttempts?: number;
};

function confidenceLevel(value: number | null) {
  if (value === null || value < 50) return "E" as const;
  if (value < 65) return "D" as const;
  if (value < 80) return "C" as const;
  if (value < 90) return "B" as const;
  return "A" as const;
}

function workbenchStatus(status: AiExecutionTaskStatus): AiTaskStatus {
  if (status === "queued") return "created";
  if (status === "failed") return "needs_info";
  if (status === "cancelled") return "rejected";
  return status;
}

function mapExecutionTask(task: AiExecutionTask & { events?: AiExecutionEvent[] }): WorkbenchTask {
  const output = task.output_payload ?? {};
  const recommendation = typeof output.recommendation === "string"
    ? output.recommendation
    : task.error_message || (task.status === "queued" ? "等待执行网关调度" : "查看任务执行详情");
  return {
    databaseId: task.id,
    taskCode: task.task_code,
    taskType: aiWorkflowLabels[task.workflow_key],
    taskName: task.title,
    source: task.source_label || "结构化业务数据",
    objectName: task.business_object_id || task.business_object_type || "AI业务任务",
    status: workbenchStatus(task.status),
    executionStatus: task.status,
    stage: task.stage,
    progress: task.progress,
    confidence: confidenceLevel(task.confidence),
    riskLevel: task.risk_level ?? "low",
    createdAt: task.created_at,
    completedAt: task.completed_at ?? undefined,
    recommendedAction: recommendation,
    workflowKey: task.workflow_key,
    businessHref: task.business_href,
    output,
    events: task.events,
    errorMessage: task.error_message,
    attemptCount: task.attempt_count,
    maxAttempts: task.max_attempts,
  };
}

const kpiIcons = [ClipboardList, CheckCircle2, UserRoundCheck, ShieldAlert, FileText, Bot];
const pageSize = 5;

const statusOptions: Array<{ value: "all" | AiTaskStatus; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "created", label: "已创建" },
  { value: "running", label: "运行中" },
  { value: "completed", label: "已完成" },
  { value: "needs_review", label: "待人工复核" },
  { value: "needs_info", label: "执行失败" },
  { value: "rejected", label: "已取消" },
];

function CardShell({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-card border border-borderSoft bg-card shadow-card", className)}>{children}</section>;
}

function SelectField({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <select
      data-no-global-interaction
      className={cn(
        "h-8 min-w-[138px] rounded-md border border-borderSoft bg-white px-3 text-[12px] font-medium text-textSecondary shadow-sm outline-none transition hover:border-primary/30 focus:border-primary",
        className,
      )}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function ToolbarButton({
  label,
  icon: Icon,
  tone = "default",
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "ai" | "default";
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneClass = {
    primary: "border-primary/20 bg-primary text-white shadow-[0_10px_22px_rgba(47,107,255,0.22)] hover:bg-primary/90",
    success: "border-success/20 bg-success text-white shadow-[0_10px_22px_rgba(34,197,94,0.18)] hover:bg-success/90",
    ai: "border-ai/20 bg-ai text-white shadow-[0_10px_22px_rgba(119,84,246,0.2)] hover:bg-ai/90",
    default: "border-borderSoft bg-white text-textSecondary hover:border-primary/30 hover:text-primary",
  } as const;

  return (
    <button
      data-no-global-interaction
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45", toneClass[tone])}
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function WorkbenchTitle() {
  return (
    <div className="flex min-h-[42px] items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h1 className="text-[22px] font-bold tracking-normal text-textMain">AI工作台（AI任务中心）</h1>
        <Info className="size-4 text-textMuted" />
      </div>
      <AiBadge label="AI任务统一调度" className="hidden h-7 sm:inline-flex" />
    </div>
  );
}

function getTaskHref(taskType: string, task?: WorkbenchTask) {
  if (task?.businessHref) return task.businessHref;
  if (task?.workflowKey) return aiWorkflowBusinessRoutes[task.workflowKey];
  if (taskType.includes("识别")) return "/ai-quote-recognition";
  if (taskType.includes("采集")) return "/ai-price-collection";
  if (taskType.includes("BOQ") || taskType.includes("清单智能套价")) return "/project-pricing/boq-parse";
  if (taskType.includes("套价")) return "/project-pricing";
  if (taskType.includes("比价")) return "/comparisons/CMP-202506-001";
  if (taskType.includes("询价函")) return "/ai-inquiry-letter";
  if (taskType.includes("报告")) return "/ai-report-center";
  if (taskType.includes("地材")) return "/material-prices";
  if (taskType.includes("趋势")) return "/analytics";
  if (taskType.includes("异常") || taskType.includes("风险")) return "/pending-quotes";
  return "/ai-workbench";
}

function ownerFor(task: WorkbenchTask) {
  if (task.objectName.includes("供应商")) return "赵工";
  if (task.objectName.includes("钢材") || task.objectName.includes("地材")) return "王工";
  if (task.objectName.includes("报告")) return "陈工";
  return "张工";
}

type TaskFlowProps = {
  tasks: WorkbenchTask[];
  total: number;
  taskType: string;
  status: string;
  date: string;
  keyword: string;
  taskTypeOptions: Array<{ value: string; label: string }>;
  selectedCodes: Set<string>;
  page: number;
  pageCount: number;
  onTaskTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onToggleAll: () => void;
  onToggleTask: (taskCode: string) => void;
  onPageChange: (page: number) => void;
  onView: (task: WorkbenchTask) => void;
  onReview: (task: WorkbenchTask) => void;
  onRerun: (task: WorkbenchTask) => void;
  onCreate: () => void;
  onBatchReview: () => void;
  onViewOutput: () => void;
  onGenerateReport: () => void;
  onExport: () => void;
  canCreate: boolean;
  loading: boolean;
  busy: boolean;
};

function TaskFlowTable(props: TaskFlowProps) {
  const [openMenuCode, setOpenMenuCode] = useState<string | null>(null);
  const allChecked = props.tasks.length > 0 && props.tasks.every((task) => props.selectedCodes.has(task.taskCode));

  return (
    <CardShell className="overflow-visible">
      <div className="flex flex-col gap-2 border-b border-borderSoft px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 text-[15px] font-bold text-textMain">AI任务流</div>
          <SelectField value={props.taskType} options={props.taskTypeOptions} onChange={props.onTaskTypeChange} />
          <SelectField value={props.status} options={statusOptions} onChange={props.onStatusChange} />
          <label className="inline-flex h-8 min-w-[150px] items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-medium text-textSecondary shadow-sm">
            <CalendarDays className="size-3.5" />
            <input data-no-global-interaction className="min-w-0 bg-transparent outline-none" type="date" value={props.date} onChange={(event) => props.onDateChange(event.target.value)} />
          </label>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-textMuted" />
            <input
              data-no-global-interaction
              className="h-8 w-full rounded-md border border-borderSoft bg-white pl-8 pr-3 text-[12px] outline-none transition placeholder:text-textMuted focus:border-primary"
              placeholder="请输入任务编号/文件名/负责人"
              value={props.keyword}
              onChange={(event) => props.onKeywordChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") props.onSearch(); }}
            />
          </div>
          <ToolbarButton label="查询" icon={Search} tone="primary" onClick={props.onSearch} />
          <ToolbarButton label="重置" icon={RefreshCw} onClick={props.onReset} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-textMuted">当前 {props.total} 条，已选 {props.selectedCodes.size} 条</span>
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton label="新建AI任务" icon={Plus} tone="primary" onClick={props.onCreate} disabled={!props.canCreate || props.busy} />
            <ToolbarButton label="批量复核" icon={CheckCircle2} tone="success" onClick={props.onBatchReview} disabled={props.busy} />
            <ToolbarButton label="查看AI输出" icon={FileText} tone="ai" onClick={props.onViewOutput} />
            <ToolbarButton label="生成报告" icon={Bot} tone="primary" onClick={props.onGenerateReport} />
            <ToolbarButton label="导出任务" icon={MoreHorizontal} onClick={props.onExport} />
          </div>
        </div>
      </div>
      {props.tasks.length === 0 ? (
        <EmptyState
          className="m-3 border-0 py-12 shadow-none"
          title={props.loading ? "正在读取 AI 任务" : "没有匹配的 AI 任务"}
          description={props.loading ? "正在从 Supabase 任务账本同步执行状态。" : "请调整任务类型、状态、日期或关键词后重新查询。"}
          primaryAction={<button data-no-global-interaction type="button" onClick={props.onReset} className="h-9 rounded-md bg-primary px-4 text-[13px] font-semibold text-white">重置筛选</button>}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-[12px]">
            <thead>
              <tr className="h-10 bg-[var(--color-bg-muted)] text-textSecondary">
                <th className="w-10 border-b border-borderSoft px-3 text-left">
                  <input data-no-global-interaction checked={allChecked} onChange={props.onToggleAll} className="size-3.5 rounded border-borderSoft" type="checkbox" aria-label="选择全部任务" />
                </th>
                {[
                  "任务编号", "任务类型", "来源文件", "当前状态", "AI置信度", "风险等级", "负责人", "操作",
                ].map((header) => (
                  <th key={header} className="border-b border-borderSoft px-3 text-left font-semibold last:text-center">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.tasks.map((task) => (
                <tr key={task.taskCode} className={cn("h-[44px] border-b border-borderSoft hover:bg-primary-soft/30", props.selectedCodes.has(task.taskCode) && "bg-primary-soft/35")}>
                  <td className="px-3">
                    <input data-no-global-interaction checked={props.selectedCodes.has(task.taskCode)} onChange={() => props.onToggleTask(task.taskCode)} className="size-3.5 rounded border-borderSoft" type="checkbox" aria-label={`选择 ${task.taskCode}`} />
                  </td>
                  <td className="px-3 font-semibold text-primary">{task.taskCode}</td>
                  <td className="px-3 font-semibold text-textMain">{task.taskType}</td>
                  <td className="max-w-[260px] truncate px-3 text-primary" title={task.source}>{task.source}</td>
                  <td className="px-3"><StatusBadge status={task.status} className="h-5 text-[11px]" /></td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-[12px] font-semibold text-textMain">{task.progress}%</span>
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${task.progress}%` }} /></div>
                    </div>
                  </td>
                  <td className="px-3"><RiskBadge level={task.riskLevel} className="h-5 text-[11px]" /></td>
                  <td className="px-3 text-textSecondary">{ownerFor(task)}</td>
                  <td className="relative px-3">
                    <div className="flex flex-nowrap justify-center gap-1.5 whitespace-nowrap">
                      <button data-no-global-interaction type="button" onClick={() => props.onView(task)} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-[12px] font-medium text-primary"><Eye className="size-3.5" />查看</button>
                      <button data-no-global-interaction type="button" disabled={task.executionStatus !== "needs_review" || props.busy} onClick={() => props.onReview(task)} className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-2 text-[12px] font-medium text-ai disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="size-3.5" />复核</button>
                      <button data-no-global-interaction type="button" onClick={() => setOpenMenuCode((value) => value === task.taskCode ? null : task.taskCode)} className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[12px] font-medium text-textSecondary"><MoreHorizontal className="size-3.5" />更多</button>
                    </div>
                    {openMenuCode === task.taskCode ? (
                      <div className="absolute right-3 top-9 z-30 w-40 rounded-md border border-borderSoft bg-white p-1.5 shadow-panel">
                        {task.executionStatus === "failed" ? <button data-no-global-interaction type="button" onClick={() => { setOpenMenuCode(null); props.onRerun(task); }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[12px] hover:bg-ai-soft"><RefreshCw className="size-3.5 text-ai" />重新执行</button> : null}
                        <Link data-no-global-interaction href={getTaskHref(task.taskType, task)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[12px] hover:bg-primary-soft"><Play className="size-3.5 text-primary" />继续处理</Link>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[12px] text-textSecondary">
        <span>共 {props.total} 条，当前第 {props.page} / {props.pageCount} 页</span>
        <div className="flex items-center gap-1">
          <button data-no-global-interaction type="button" disabled={props.page <= 1} onClick={() => props.onPageChange(props.page - 1)} className="h-7 rounded-md border border-borderSoft bg-white px-2 disabled:opacity-40">上一页</button>
          {Array.from({ length: props.pageCount }, (_, index) => index + 1).map((item) => <button data-no-global-interaction key={item} type="button" onClick={() => props.onPageChange(item)} className={cn("size-7 rounded-md border text-[12px] font-semibold", props.page === item ? "border-primary bg-primary text-white" : "border-borderSoft bg-white")}>{item}</button>)}
          <button data-no-global-interaction type="button" disabled={props.page >= props.pageCount} onClick={() => props.onPageChange(props.page + 1)} className="h-7 rounded-md border border-borderSoft bg-white px-2 disabled:opacity-40">下一页</button>
        </div>
      </div>
    </CardShell>
  );
}

function PanelHeader({ icon, title, count, href }: { icon: LucideIcon; title: string; count?: number; href: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <ModuleHeader icon={icon} title={count === undefined ? title : `${title}（${count}）`} tone="purple" density="compact" />
      <Link data-no-global-interaction className="shrink-0 text-[12px] font-semibold text-primary hover:text-ai" href={href}>查看全部 &gt;</Link>
    </div>
  );
}

function BottomPanels({ onSelectTask, onMessage }: { onSelectTask: (taskCode: string) => void; onMessage: (title: string, description: string) => void }) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      <CardShell className="p-3.5">
        <PanelHeader icon={UserRoundCheck} title="待人工复核" count={18} href="/pending-quotes" />
        <div className="mt-3 space-y-1.5">
          {aiWorkbenchReviewItems.map((item) => (
            <button data-no-global-interaction type="button" onClick={() => onSelectTask(item.code)} key={item.code} className="grid w-full grid-cols-[18px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md px-1 py-1 text-left text-[12px] transition hover:bg-primary-soft">
              <span className={cn("size-2 rounded-full", item.riskLevel === "high" ? "bg-danger" : item.riskLevel === "medium" ? "bg-warning" : "bg-success")} />
              <span className="min-w-0"><span className="block truncate font-semibold text-primary">{item.code}　{item.title}</span><span className="block truncate text-[11px] text-textMuted">{item.file}</span></span>
              <span className="text-textSecondary">{item.owner}</span><span className="text-textMuted">{item.time}</span>
            </button>
          ))}
        </div>
      </CardShell>
      <CardShell className="p-3.5">
        <PanelHeader icon={AlertCircle} title="AI风险清单" count={7} href="/pending-quotes" />
        <div className="mt-3 space-y-1.5">
          {aiWorkbenchRiskItems.map((item) => (
            <button data-no-global-interaction type="button" onClick={() => onMessage("已定位风险任务", `${item.title}：当前共 ${item.count} 条，已切换到待审核报价池。`)} key={item.title} className="grid w-full grid-cols-[18px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md px-1 py-1.5 text-left text-[12px] hover:bg-danger-soft/40">
              <span className={cn("size-2 rounded-full", item.level === "high" ? "bg-danger" : item.level === "medium" ? "bg-warning" : "bg-success")} />
              <span className="truncate font-medium text-textMain">{item.title}</span><RiskBadge level={item.level} className="h-5 text-[11px]" /><span className="font-semibold text-textMain">{item.count}</span>
            </button>
          ))}
        </div>
      </CardShell>
      <CardShell className="p-3.5">
        <PanelHeader icon={Lightbulb} title="AI建议事项" count={5} href="/ai-workbench?view=suggestions" />
        <div className="mt-3 space-y-1.5">
          {aiWorkbenchSuggestions.map((item) => (
            <button data-no-global-interaction type="button" onClick={() => onMessage("AI建议已加入处理队列", item.title)} key={item.title} className="grid w-full grid-cols-[18px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md px-1 py-1.5 text-left text-[12px] hover:bg-ai-soft">
              <Lightbulb className="size-4 text-warning" /><span className="truncate font-medium text-textMain">{item.title}</span><AiBadge label={item.tag} className="h-5 text-[11px]" /><span className="text-textMuted">{item.date}</span>
            </button>
          ))}
        </div>
      </CardShell>
      <CardShell className="p-3.5">
        <PanelHeader icon={Sparkles} title="最近AI活动" href="/ai-workbench?view=activities" />
        <div className="mt-3 space-y-1.5">
          {aiWorkbenchActivities.map((item) => (
            <button data-no-global-interaction type="button" onClick={() => { const code = item.text.match(/AI-\d{4}-\d{2}-\d{2}-\d{4}/)?.[0]; if (code) onSelectTask(code); else onMessage("活动详情", item.text); }} key={`${item.time}-${item.text}`} className="grid w-full grid-cols-[38px_54px_minmax(0,1fr)] items-center gap-2 rounded-md px-1 py-1.5 text-left text-[12px] hover:bg-primary-soft">
              <span className="font-semibold text-primary">{item.time}</span><ActivityTag status={item.status} label={item.label} /><span className="truncate text-textSecondary">{item.text}</span>
            </button>
          ))}
        </div>
      </CardShell>
    </div>
  );
}

function ActivityTag({ status, label }: { status: AiTaskStatus; label: string }) {
  const className = status === "completed" ? "bg-success-soft text-success" : status === "needs_review" ? "bg-danger-soft text-danger" : status === "running" ? "bg-primary-soft text-primary" : "bg-ai-soft text-ai";
  return <span className={cn("inline-flex h-5 items-center justify-center rounded-pill px-2 text-[11px] font-semibold", className)}>{label}</span>;
}

function TaskDetailDrawer({
  task,
  onClose,
  onRerun,
  onReview,
  onCancel,
}: {
  task: WorkbenchTask | null;
  onClose: () => void;
  onRerun: (task: WorkbenchTask) => void;
  onReview: (task: WorkbenchTask) => void;
  onCancel: (task: WorkbenchTask) => void;
}) {
  if (!task) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <button data-no-global-interaction type="button" className="flex-1 cursor-default" aria-label="关闭任务详情" onClick={onClose} />
      <aside className="h-full w-[460px] max-w-full overflow-y-auto border-l border-borderSoft bg-white shadow-panel">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-borderSoft bg-white px-5 py-4">
          <div><h2 className="text-[17px] font-bold text-textMain">AI任务详情</h2><p className="mt-1 text-[12px] text-textMuted">{task.taskCode}</p></div>
          <button data-no-global-interaction type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-card border border-ai-border bg-gradient-to-br from-ai-soft via-white to-primary-soft p-4">
            <div className="flex items-start justify-between gap-3"><div><AiBadge label={task.taskType} /><h3 className="mt-3 text-[18px] font-bold text-textMain">{task.taskName}</h3><p className="mt-1 text-[12px] text-textSecondary">来源：{task.source}</p></div><StatusBadge status={task.status} /></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-ai transition-all" style={{ width: `${task.progress}%` }} /></div>
            <div className="mt-2 flex justify-between text-[11px] text-textMuted"><span>AI处理进度</span><span>{task.progress}%</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card border border-borderSoft bg-slate-50 p-3"><p className="text-[11px] text-textMuted">业务对象</p><p className="mt-1 font-semibold text-textMain">{task.objectName}</p></div>
            <div className="rounded-card border border-borderSoft bg-slate-50 p-3"><p className="text-[11px] text-textMuted">负责人</p><p className="mt-1 font-semibold text-textMain">{ownerFor(task)}</p></div>
            <div className="rounded-card border border-borderSoft bg-slate-50 p-3"><p className="text-[11px] text-textMuted">AI置信度</p><p className="mt-1 font-semibold text-success">{task.progress}% / {task.confidence}级</p></div>
            <div className="rounded-card border border-borderSoft bg-slate-50 p-3"><p className="text-[11px] text-textMuted">风险等级</p><div className="mt-1"><RiskBadge level={task.riskLevel} /></div></div>
          </div>
          <div className="rounded-card border border-warning/20 bg-warning-soft/50 p-4"><p className="text-[13px] font-bold text-warning">推荐动作</p><p className="mt-2 text-[12px] leading-5 text-textSecondary">{task.recommendedAction}。AI结果仅作辅助判断，涉及高风险或低置信度时必须进入人工复核。</p></div>
          {task.errorMessage ? <div className="rounded-card border border-danger/20 bg-danger-soft p-3 text-[12px] leading-5 text-danger"><strong>执行失败：</strong>{task.errorMessage}</div> : null}
          {task.events?.length ? <div className="rounded-card border border-borderSoft bg-slate-50 p-3"><p className="text-[12px] font-bold text-textMain">执行时间线</p><div className="mt-3 space-y-3">{task.events.map((event) => <div key={event.id} className="grid grid-cols-[10px_minmax(0,1fr)_auto] gap-2 text-[11px]"><span className={cn("mt-1 size-2 rounded-full", event.status === "failed" ? "bg-danger" : event.status === "needs_review" ? "bg-warning" : event.status === "completed" ? "bg-success" : "bg-primary")} /><div><p className="font-semibold text-textSecondary">{event.message}</p><p className="mt-0.5 text-textMuted">{event.stage} · {event.progress}%</p></div><span className="text-textMuted">{new Date(event.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div></div> : null}
          {task.executionStatus === "failed" ? <button data-no-global-interaction type="button" onClick={() => onRerun(task)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-ai-border bg-ai-soft text-[13px] font-semibold text-ai"><RefreshCw className="size-4" />重新执行AI任务</button> : null}
          {task.executionStatus === "needs_review" ? <button data-no-global-interaction type="button" onClick={() => onReview(task)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-success text-[13px] font-semibold text-white"><UserRoundCheck className="size-4" />提交人工复核结论</button> : null}
          {task.executionStatus === "queued" || task.executionStatus === "running" ? <button data-no-global-interaction type="button" onClick={() => onCancel(task)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-danger/20 bg-danger-soft text-[13px] font-semibold text-danger"><X className="size-4" />取消执行任务</button> : null}
          <Link data-no-global-interaction href={getTaskHref(task.taskType, task)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-[13px] font-semibold text-white shadow-button">继续处理<ArrowRight className="size-4" /></Link>
        </div>
      </aside>
    </div>
  );
}

function CreateTaskDialog({
  open,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: { workflowKey: AiExecutionWorkflowKey; title: string; sourceLabel: string; context: string }) => void;
}) {
  const [workflowKey, setWorkflowKey] = useState<AiExecutionWorkflowKey>("quote_recognition");
  const [title, setTitle] = useState("新建报价识别任务");
  const [sourceLabel, setSourceLabel] = useState("AI工作台手工创建");
  const [context, setContext] = useState("请基于当前业务数据生成结构化判断、置信度、风险和建议动作。");
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"><section className="w-full max-w-[560px] overflow-hidden rounded-card border border-borderSoft bg-white shadow-panel"><div className="flex items-start justify-between border-b border-borderSoft px-5 py-4"><div><h2 className="text-[17px] font-bold text-textMain">创建真实 AI 执行任务</h2><p className="mt-1 text-[11px] text-textMuted">任务将写入 Supabase，由执行网关调用已配置 Provider。</p></div><button type="button" onClick={onClose} disabled={busy} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100"><X className="size-4" /></button></div><div className="space-y-4 p-5"><label className="block text-[12px] font-semibold text-textSecondary">工作流<select value={workflowKey} onChange={(event) => { const next = event.target.value as AiExecutionWorkflowKey; setWorkflowKey(next); setTitle(`新建${aiWorkflowLabels[next]}任务`); }} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 outline-none focus:border-primary">{Object.entries(aiWorkflowLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-[12px] font-semibold text-textSecondary">任务标题<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 outline-none focus:border-primary" /></label><label className="block text-[12px] font-semibold text-textSecondary">数据来源<input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} maxLength={300} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 outline-none focus:border-primary" /></label><label className="block text-[12px] font-semibold text-textSecondary">结构化任务说明<textarea value={context} onChange={(event) => setContext(event.target.value)} rows={4} className="mt-1.5 w-full resize-none rounded-md border border-borderSoft p-3 leading-5 outline-none focus:border-primary" /></label><div className="rounded-md border border-warning/20 bg-warning-soft p-3 text-[11px] leading-5 text-textSecondary">真实 Provider 尚未配置时，任务会明确记录为失败并保留错误原因，不会生成模拟结果。</div></div><div className="flex justify-end gap-2 border-t border-borderSoft px-5 py-4"><button type="button" disabled={busy} onClick={onClose} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[12px] font-semibold text-textSecondary">取消</button><button type="button" disabled={busy || !title.trim() || !context.trim()} onClick={() => onSubmit({ workflowKey, title: title.trim(), sourceLabel: sourceLabel.trim(), context: context.trim() })} className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-4 text-[12px] font-semibold text-white disabled:opacity-50">{busy ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{busy ? "正在入队" : "创建并执行"}</button></div></section></div>;
}

function ReviewTaskDialog({
  task,
  busy,
  onClose,
  onSubmit,
}: {
  task: WorkbenchTask | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (decision: "approved" | "request_changes" | "rejected", note: string) => void;
}) {
  const [note, setNote] = useState("");
  if (!task) return null;
  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"><section className="w-full max-w-[580px] overflow-hidden rounded-card border border-borderSoft bg-white shadow-panel"><div className="flex items-start justify-between border-b border-borderSoft px-5 py-4"><div><h2 className="text-[17px] font-bold text-textMain">人工复核 AI 输出</h2><p className="mt-1 text-[11px] text-textMuted">{task.taskCode} · {task.taskName}</p></div><button type="button" onClick={onClose} disabled={busy} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100"><X className="size-4" /></button></div><div className="space-y-4 p-5"><div className="rounded-card border border-ai-border bg-ai-soft p-4"><p className="text-[12px] font-bold text-ai">AI建议</p><p className="mt-2 text-[12px] leading-6 text-textSecondary">{task.recommendedAction}</p></div><label className="block text-[12px] font-semibold text-textSecondary">人工复核意见<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="确认时可选填；要求修改或驳回时至少填写 5 个字符。" className="mt-1.5 w-full resize-none rounded-md border border-borderSoft p-3 leading-5 outline-none focus:border-primary" /></label><p className="text-[11px] leading-5 text-warning">确认仅表示 AI 输出通过人工复核，不等于价格、供应商或商务方案已最终审批。</p></div><div className="grid gap-2 border-t border-borderSoft px-5 py-4 sm:grid-cols-3"><button type="button" disabled={busy} onClick={() => onSubmit("approved", note)} className="h-9 rounded-md bg-success text-[12px] font-semibold text-white">确认 AI 输出</button><button type="button" disabled={busy || note.trim().length < 5} onClick={() => onSubmit("request_changes", note)} className="h-9 rounded-md border border-warning/30 bg-warning-soft text-[12px] font-semibold text-warning">要求修改并重跑</button><button type="button" disabled={busy || note.trim().length < 5} onClick={() => onSubmit("rejected", note)} className="h-9 rounded-md border border-danger/30 bg-danger-soft text-[12px] font-semibold text-danger">驳回 AI 输出</button></div></section></div>;
}

export default function AiWorkbenchPage() {
  const router = useRouter();
  const toast = useMockToast();
  const [tasks, setTasks] = useState<WorkbenchTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [taskType, setTaskType] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<WorkbenchTask | null>(null);
  const [page, setPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState<WorkbenchTask | null>(null);
  const [automationHealth, setAutomationHealth] = useState<AiAutomationHealth | null>(null);
  const [automationLoading, setAutomationLoading] = useState(true);
  const [automationError, setAutomationError] = useState<string | null>(null);

  useEffect(() => {
    const requestedStatus = new URLSearchParams(window.location.search).get("status");
    if (!requestedStatus) return;
    const timer = window.setTimeout(() => {
      if (requestedStatus === "failed") setStatus("needs_info");
      else if (statusOptions.some((option) => option.value === requestedStatus)) setStatus(requestedStatus);
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadTasks = useCallback(async (silent = false, signal?: AbortSignal) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/ai/tasks?pageSize=50&view=summary", { cache: "no-store", signal });
      const payload = await response.json() as {
        data?: AiExecutionTask[];
        permissions?: { canCreate?: boolean; canReview?: boolean };
        error?: string;
      };
      if (!response.ok) throw Object.assign(new Error(payload.error || "无法读取 AI 任务"), { status: response.status });
      if (signal?.aborted) return false;
      setTasks((payload.data ?? []).map(mapExecutionTask));
      setCanCreate(Boolean(payload.permissions?.canCreate));
      setCanReview(Boolean(payload.permissions?.canReview));
      return (payload.data ?? []).some((task) => ["queued", "running"].includes(task.status));
    } catch (error) {
      if (signal?.aborted) throw error;
      toast.danger("AI任务加载失败", error instanceof Error ? error.message : "请稍后重试");
      if (signal) throw error;
      return false;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  const loadAutomationHealth = useCallback(async (silent = false, signal?: AbortSignal) => {
    if (!silent) setAutomationLoading(true);
    try {
      const response = await fetch("/api/ai/operations", { cache: "no-store", signal });
      const payload = await response.json() as { data?: AiAutomationHealth; error?: string };
      if (!response.ok || !payload.data) throw Object.assign(new Error(payload.error || "无法读取自动化健康状态"), { status: response.status });
      if (signal?.aborted) return;
      setAutomationHealth(payload.data);
      setAutomationError(null);
    } catch (error) {
      if (signal?.aborted) throw error;
      setAutomationError(error instanceof Error ? error.message : "自动化健康状态读取失败");
      if (signal) throw error;
    } finally {
      if (!signal?.aborted) setAutomationLoading(false);
    }
  }, []);

  const taskPoller = useVisiblePolling((signal) => loadTasks(true, signal), 30_000,
    tasks.filter((task) => ["queued", "running"].includes(task.executionStatus ?? "")).map((task) => task.databaseId).join(","));
  const operationsPoller = useVisiblePolling(async (signal) => { await loadAutomationHealth(true, signal); return true; }, 60_000);

  const taskTypeOptions = useMemo(() => [
    { value: "all", label: "全部任务类型" },
    ...Array.from(new Set(tasks.map((task) => task.taskType))).map((value) => ({ value, label: value })),
  ], [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesType = taskType === "all" || task.taskType === taskType;
      const matchesStatus = status === "all" || task.status === status;
      const matchesDate = !date || task.createdAt.startsWith(date);
      const matchesKeyword = !normalizedKeyword || [task.taskCode, task.taskType, task.taskName, task.source, task.objectName, ownerFor(task)].some((value) => value.toLowerCase().includes(normalizedKeyword));
      return matchesType && matchesStatus && matchesDate && matchesKeyword;
    });
  }, [date, keyword, status, taskType, tasks]);

  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const visibleTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);
  const workbenchKpis = useMemo<WorkflowKpi[]>(() => {
    const completed = tasks.filter((task) => task.executionStatus === "completed").length;
    const needsReview = tasks.filter((task) => task.executionStatus === "needs_review").length;
    const highRisk = tasks.filter((task) => task.riskLevel === "high").length;
    const running = tasks.filter((task) => task.executionStatus === "queued" || task.executionStatus === "running").length;
    const failed = tasks.filter((task) => task.executionStatus === "failed").length;
    const reports = tasks.filter((task) => task.workflowKey === "report_generation").length;
    return [
      { label: "AI任务总数", value: tasks.length, unit: "条", trend: `${running} 条执行中`, description: "持久化任务账本", tone: "blue" },
      { label: "AI已完成", value: completed, unit: "条", trend: tasks.length ? `完成率 ${Math.round((completed / tasks.length) * 100)}%` : "完成率 0%", description: "已通过人工复核", tone: "green" },
      { label: "待人工复核", value: needsReview, unit: "条", trend: needsReview ? "需人工确认" : "当前已清空", description: "AI 不自动审批", tone: "orange" },
      { label: "高风险AI结果", value: highRisk, unit: "条", trend: highRisk ? "优先复核" : "暂无高风险", description: "风险结果不直通业务", tone: "red" },
      { label: "执行失败", value: failed, unit: "条", trend: failed ? "可查看错误并重跑" : "网关运行正常", description: "错误原因完整留痕", tone: "cyan" },
      { label: "报告生成任务", value: reports, unit: "条", trend: "真实任务统计", description: "来自报告工作流", tone: "purple" },
    ];
  }, [tasks]);

  const updateFilters = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  const resetFilters = () => { setTaskType("all"); setStatus("all"); setDate(""); setKeywordDraft(""); setKeyword(""); setPage(1); toast.info("筛选已重置", "已恢复全部 AI 任务。" ); };
  const toggleTask = (taskCode: string) => setSelectedCodes((current) => { const next = new Set(current); if (next.has(taskCode)) next.delete(taskCode); else next.add(taskCode); return next; });
  const toggleAll = () => setSelectedCodes((current) => visibleTasks.every((task) => current.has(task.taskCode)) ? new Set() : new Set(visibleTasks.map((task) => task.taskCode)));

  const exportTasks = () => {
    downloadCsv(
      `AI任务清单-${new Date().toISOString().slice(0, 10)}`,
      ["任务编号", "工作流", "任务名称", "来源", "业务对象", "执行状态", "进度", "可信度", "风险等级", "创建时间", "完成人工复核时间", "建议动作"],
      filteredTasks.map((task) => [
        task.taskCode, task.taskType, task.taskName, task.source, task.objectName,
        task.executionStatus ?? task.status, task.progress, task.confidence, task.riskLevel,
        task.createdAt, task.completedAt, task.recommendedAction,
      ]),
    );
    toast.success("导出完成", `已导出 ${filteredTasks.length} 条当前筛选任务。`);
  };

  const openTask = async (task: WorkbenchTask) => {
    setSelectedTask(task);
    setSelectedCodes(new Set([task.taskCode]));
    if (!task.databaseId) return;
    const response = await fetch(`/api/ai/tasks?id=${encodeURIComponent(task.databaseId)}`, { cache: "no-store" });
    const payload = await response.json() as { data?: AiExecutionTask & { events?: AiExecutionEvent[] }; error?: string };
    if (response.ok && payload.data) setSelectedTask(mapExecutionTask(payload.data));
  };
  const selectTaskByCode = (taskCode: string) => { const task = tasks.find((item) => item.taskCode === taskCode); if (task) openTask(task); else { setStatus("needs_review"); setPage(1); toast.info("已定位任务队列", `${taskCode} 位于待人工复核任务集合。`); } };
  const requestReview = async (task: WorkbenchTask) => {
    if (!task.databaseId || task.executionStatus !== "needs_review") {
      toast.warning("当前任务不可复核", "仅真实且处于待人工复核状态的任务可以提交结论。");
      return;
    }
    if (!canReview) { toast.warning("没有复核权限", "请联系管理员授予对应业务审核权限。"); return; }
    setSelectedCodes(new Set([task.taskCode]));
    try {
      const response = await fetch(`/api/ai/tasks?id=${encodeURIComponent(task.databaseId)}`, { cache: "no-store" });
      const payload = await response.json() as { data?: AiExecutionTask; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "无法读取审核详情");
      setReviewTask(mapExecutionTask(payload.data));
    } catch (error) {
      toast.danger("审核详情加载失败", error instanceof Error ? error.message : "请稍后重试");
    }
  };
  const requestBatchReview = () => {
    if (!selectedCodes.size) { toast.warning("请先选择任务", "批量复核至少需要选择一条 AI 任务。"); return; }
    const eligible = tasks.filter((task) => selectedCodes.has(task.taskCode) && task.databaseId && task.executionStatus === "needs_review");
    if (!eligible.length) { toast.warning("没有可复核任务", "所选任务中没有真实的待人工复核记录。"); return; }
    setConfirmOpen(true);
  };
  const updateTask = async (task: WorkbenchTask, body: Record<string, unknown>) => {
    if (!task.databaseId) throw new Error("该任务不是持久化任务");
    const response = await fetch(`/api/ai/tasks/${task.databaseId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { data?: AiExecutionTask; error?: string };
    if (!response.ok) throw new Error(payload.error || "AI任务操作失败");
    return payload.data;
  };
  const confirmReview = async () => {
    const eligible = tasks.filter((task) => selectedCodes.has(task.taskCode) && task.databaseId && task.executionStatus === "needs_review");
    setActionBusy(true);
    try {
      await Promise.all(eligible.map((task) => updateTask(task, { action: "review", decision: "approved", reviewNote: "批量人工确认 AI 输出可进入后续业务判断" })));
      setConfirmOpen(false);
      setSelectedCodes(new Set());
      await loadTasks(true);
      toast.success("人工复核已完成", `${eligible.length} 条真实任务已写入人工结论。`);
    } catch (error) {
      toast.danger("批量复核失败", error instanceof Error ? error.message : "请稍后重试");
    } finally { setActionBusy(false); }
  };
  const rerunTask = async (task: WorkbenchTask) => {
    setActionBusy(true);
    try {
      await updateTask(task, { action: "retry" });
      setSelectedTask(null);
      await loadTasks(true);
      toast.success("任务已重新入队", `${task.taskCode} 正由 AI 执行网关重新处理。`);
    } catch (error) { toast.danger("重新执行失败", error instanceof Error ? error.message : "请稍后重试"); }
    finally { setActionBusy(false); }
  };
  const cancelTask = async (task: WorkbenchTask) => {
    setActionBusy(true);
    try {
      await updateTask(task, { action: "cancel" });
      setSelectedTask(null);
      await loadTasks(true);
      toast.success("任务已取消", `${task.taskCode} 已停止继续处理。`);
    } catch (error) { toast.danger("取消失败", error instanceof Error ? error.message : "请稍后重试"); }
    finally { setActionBusy(false); }
  };
  const submitReview = async (decision: "approved" | "request_changes" | "rejected", note: string) => {
    if (!reviewTask) return;
    setActionBusy(true);
    try {
      await updateTask(reviewTask, { action: "review", decision, reviewNote: note });
      setReviewTask(null);
      setSelectedTask(null);
      await loadTasks(true);
      toast.success("人工结论已保存", decision === "request_changes" ? "任务已重新进入执行队列。" : "结论已写入 Supabase 任务账本。" );
    } catch (error) { toast.danger("复核提交失败", error instanceof Error ? error.message : "请稍后重试"); }
    finally { setActionBusy(false); }
  };
  const createTask = async (input: { workflowKey: AiExecutionWorkflowKey; title: string; sourceLabel: string; context: string }) => {
    setActionBusy(true);
    try {
      const response = await fetch("/api/ai/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowKey: input.workflowKey, title: input.title, sourceLabel: input.sourceLabel, businessObjectType: "manual_workbench_task", businessHref: aiWorkflowBusinessRoutes[input.workflowKey], input: { instruction: input.context, source: input.sourceLabel, requestedFrom: "ai-workbench" } }) });
      const payload = await response.json() as { data?: AiExecutionTask; error?: string };
      if (!response.ok) throw new Error(payload.error || "创建 AI 任务失败");
      setCreateOpen(false);
      setPage(1);
      await loadTasks(true);
      toast.success("AI任务已入队", payload.data ? `${payload.data.task_code} 已开始执行。` : "任务已进入执行网关。" );
    } catch (error) { toast.danger("创建任务失败", error instanceof Error ? error.message : "请稍后重试"); }
    finally { setActionBusy(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-3">
        <WorkbenchTitle />
        <WorkflowKpiGrid items={workbenchKpis} icons={kpiIcons} />
        <AiAutomationOperationsPanel
          health={automationHealth}
          loading={automationLoading}
          error={automationError}
          onRefresh={() => { taskPoller.current?.refresh(); operationsPoller.current?.refresh(); }}
          onShowFailed={() => { setStatus("needs_info"); setPage(1); }}
        />
        <TaskFlowTable
          tasks={visibleTasks}
          total={filteredTasks.length}
          taskType={taskType}
          status={status}
          date={date}
          keyword={keywordDraft}
          taskTypeOptions={taskTypeOptions}
          selectedCodes={selectedCodes}
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          onTaskTypeChange={(value) => updateFilters(setTaskType, value)}
          onStatusChange={(value) => updateFilters(setStatus, value)}
          onDateChange={(value) => updateFilters(setDate, value)}
          onKeywordChange={setKeywordDraft}
          onSearch={() => { setKeyword(keywordDraft); setPage(1); toast.info("查询已执行", `当前匹配 ${filteredTasks.length} 条 AI 任务。`); }}
          onReset={resetFilters}
          onToggleAll={toggleAll}
          onToggleTask={toggleTask}
          onPageChange={setPage}
          onView={openTask}
          onReview={requestReview}
          onRerun={rerunTask}
          onCreate={() => {
            if (!canCreate) toast.warning("没有创建权限", "请联系管理员授予对应 AI 工作流执行权限。");
            else setCreateOpen(true);
          }}
          onBatchReview={requestBatchReview}
          onViewOutput={() => { const task = tasks.find((item) => selectedCodes.has(item.taskCode)); if (task) openTask(task); else toast.warning("请先选择任务", "选择任务后才能查看对应 AI 输出。" ); }}
          onGenerateReport={() => { toast.ai("正在进入报告生成中心", "已携带当前 AI 任务上下文。" ); router.push(`/ai-report-center?taskIds=${Array.from(selectedCodes).join(",")}`); }}
          onExport={exportTasks}
          canCreate={canCreate}
          loading={loading}
          busy={actionBusy}
        />
        <AiQualityCostPanel />
        <BottomPanels onSelectTask={selectTaskByCode} onMessage={(title, description) => toast.ai(title, description)} />
        <div className="flex items-center justify-center gap-2 text-[12px] text-textMuted"><Info className="size-4" /><span>提示：AI结果仅供参考，最终决策请结合人工复核与专业判断</span><Info className="size-4" /></div>
      </div>
      <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} onRerun={rerunTask} onReview={requestReview} onCancel={cancelTask} />
      <ConfirmDialog open={confirmOpen} title="确认批量复核 AI 输出？" description={`将 ${selectedCodes.size} 条待复核任务写入人工确认结论；这不代表价格或商务方案已最终审批。`} confirmLabel="确认 AI 输出" tone="warning" onConfirm={confirmReview} onCancel={() => setConfirmOpen(false)} />
      <CreateTaskDialog open={createOpen} busy={actionBusy} onClose={() => setCreateOpen(false)} onSubmit={createTask} />
      <ReviewTaskDialog key={reviewTask?.taskCode ?? "review"} task={reviewTask} busy={actionBusy} onClose={() => setReviewTask(null)} onSubmit={submitReview} />
    </AppLayout>
  );
}
