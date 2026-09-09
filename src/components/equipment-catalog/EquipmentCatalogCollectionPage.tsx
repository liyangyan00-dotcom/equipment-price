"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createCollectionPoller } from "@/lib/priceCollection/polling";
import { parse as parseCsv } from "csv-parse/browser/esm/sync";
import {
  Activity,
  Boxes,
  Braces,
  CheckCircle2,
  ChevronRight,
  CirclePause,
  CirclePlay,
  ClipboardCheck,
  Clock3,
  Columns3,
  Database,
  Download,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Gauge,
  Globe2,
  History,
  LoaderCircle,
  Logs,
  Network,
  Pause,
  Play,
  Power,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  SquareStack,
  Trash2,
  Upload,
  WandSparkles,
  X,
  XCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { IconBox } from "@/components/common/IconBox";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { OverlayShell } from "@/components/common/OverlayShell";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { emitMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import {
  collectionFailures,
  collectionMethods as initialMethods,
  equipmentCollectionTasks as initialTasks,
  equipmentDataSources as initialSources,
  pendingCatalogReviews,
  recentExtractedEquipment,
  sourceTypeLabels,
  statusLabels,
  type CollectionMethod,
  type CollectionTaskStatus,
  type EquipmentCatalogCollectionTask,
  type EquipmentDataSource,
} from "@/data/mock/equipmentCatalogCollection";
import type {
  CollectionSourceValidationJobRecord,
  EquipmentCollectionMethodRecord,
  EquipmentSourceImportBatchRecord,
  PriceCollectionBootstrap,
  PriceCollectionLeadRecord,
  PriceCollectionRunRecord,
  PriceCollectionTaskRecord,
} from "@/types/priceCollection";

type DrawerKind = "source" | "method" | "task" | "logs" | "frequency" | "manage" | null;
type ConfirmAction = "disable-sources" | "archive-task" | "delete-task" | null;
type OptionalTaskColumn = "brand" | "method" | "category" | "pages" | "parsed" | "pending" | "failed" | "lastRun";

const buttonBase =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[12px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-55";
const outlineButton = `${buttonBase} border-borderSoft bg-white text-textMain hover:border-primary/35 hover:bg-primary-soft`;
const primaryButton = `${buttonBase} border-primary bg-primary text-white shadow-sm hover:bg-primary/90`;
const aiButton = `${buttonBase} border-ai bg-ai text-white shadow-sm hover:bg-ai/90`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readLocalCreatedTasks() {
  if (typeof window === "undefined") return [] as EquipmentCatalogCollectionTask[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem("wpi:equipment-catalog-collection:created-tasks") || "[]") as EquipmentCatalogCollectionTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRealTask(
  task: PriceCollectionTaskRecord,
  leads: PriceCollectionLeadRecord[],
  runs: PriceCollectionRunRecord[] = [],
  registeredSources: EquipmentDataSource[] = [],
): EquipmentCatalogCollectionTask {
  const taskLeads = leads.filter((lead) => lead.taskId === task.id);
  const taskRuns = runs
    .filter((run) => run.taskId === task.id)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const status: CollectionTaskStatus = task.status === "stopped" ? "archived" : task.status;
  const config = task.config ?? {};
  const brand = typeof config.brand === "string" ? config.brand : task.keyword.split(/[\s,，]/)[0] || "待识别品牌";
  const sourceIds = Array.isArray(config.sourceIds)
    ? config.sourceIds.filter((id): id is string => typeof id === "string")
    : [];
  const registeredSourceTypes = sourceIds
    .map((id) => registeredSources.find((source) => source.id === id)?.type)
    .filter((type): type is string => Boolean(type));
  const explicitSourceType = task.sourceType && task.sourceType !== "all" && sourceTypeLabels[task.sourceType]
    ? task.sourceType
    : null;
  const sourceTypes = Array.from(new Set([
    ...registeredSourceTypes,
    ...(explicitSourceType ? [explicitSourceType] : []),
  ]));
  if (!sourceTypes.length) {
    sourceTypes.push(task.collectionMode === "api" ? "api" : task.collectionMode === "manual" ? "manual_import" : "manufacturer_site");
  }
  return {
    id: task.id,
    taskCode: task.taskCode,
    taskName: typeof config.taskName === "string" ? config.taskName : `${task.keyword} 设备资料采集`,
    supplierName: typeof config.supplierName === "string" ? config.supplierName : brand,
    brand,
    dataSourceId: sourceIds[0] ?? "",
    dataSourceName: task.currentSource || task.sourceType || "已登记来源",
    sourceType: sourceTypes[0],
    sourceTypes,
    collectionMethodId: task.collectionMode,
    collectionMethodName: task.collectionMode === "api" ? "授权 API 采集" : task.collectionMode === "manual" ? "人工录入" : "官网网页采集",
    equipmentCategory: typeof config.equipmentCategory === "string" ? config.equipmentCategory : "综合设备",
    collectionScope: [task.keyword, task.specification, task.region].filter(Boolean).join(" · "),
    status,
    progress: task.progress,
    collectedPages: task.successCount + task.failedCount,
    parsedEquipment: task.successCount,
    pendingReview: taskLeads.filter((lead) => lead.status === "pending_review").length,
    failedCount: task.failedCount,
    sourceHealth: task.failedCount ? Math.max(45, 100 - task.failedCount * 5) : 96,
    aiConfidence: taskLeads.length ? Math.round(taskLeads.reduce((sum, lead) => sum + lead.confidence, 0) / taskLeads.length) : 82,
    riskLevel: task.failedCount >= 5 ? "high" : task.failedCount > 0 ? "medium" : "low",
    currentStage: task.currentSource || statusLabels[status],
    lastRunAt: task.lastRunAt || task.createdAt,
    nextRunAt: task.nextRunAt || "仅手动运行",
    createdAt: task.createdAt,
    frequency: task.frequency || "手动",
    logs: taskRuns.length
      ? taskRuns.map((run) => ({
        id: run.id,
        time: run.finishedAt || run.startedAt || run.createdAt,
        level: run.status === "failed" ? "error" as const : run.status === "partial" ? "warning" as const : run.status === "completed" ? "success" as const : "info" as const,
        message: `${run.runCode} · ${run.status === "completed" ? "执行完成" : run.status === "partial" ? "部分完成" : run.status === "failed" ? "执行失败" : run.status === "running" ? "运行中" : "等待执行"} · 抓取 ${run.fetchedCount} · 新增 ${run.createdLeadCount} · 重复 ${run.duplicateCount}${run.errorMessage ? ` · ${run.errorMessage}` : ""}`,
      }))
      : [{ id: `LOG-${task.id}`, time: task.lastRunAt || task.createdAt, level: task.lastError ? "warning" : "success", message: task.lastError || "尚无逐次运行记录，当前显示任务状态摘要" }],
  };
}

function taskMatchesSourceType(task: EquipmentCatalogCollectionTask, type: string) {
  return task.sourceTypes?.includes(type) ?? task.sourceType === type;
}

function mapRealMethod(method: EquipmentCollectionMethodRecord): CollectionMethod {
  return {
    id: method.id,
    name: method.name,
    applicableSourceTypes: method.applicableSourceTypes,
    parseTarget: method.parseTarget,
    aiEnabled: method.aiEnabled,
    dedupeEnabled: method.dedupeEnabled,
    standardizationEnabled: method.standardizationEnabled,
    retryEnabled: method.retryEnabled,
    maxRetry: method.maxRetry,
    reviewRequired: method.reviewRequired,
    scheduled: method.scheduled,
    taskCount: 0,
  };
}

function mapRealSource(row: Record<string, unknown>): EquipmentDataSource {
  const config = row.config as Record<string, unknown> | undefined;
  const score = Number(row.quality_score ?? 60);
  const lastError = String(row.last_error ?? "").trim();
  const pendingValidation = !row.last_checked_at || lastError === "等待来源验证";
  const validationFailed = Boolean(lastError && !pendingValidation);
  return {
    id: String(row.id),
    name: String(row.name ?? "未命名来源"),
    type: typeof config?.catalogSourceType === "string" ? config.catalogSourceType : row.source_kind === "api" ? "api" : "manufacturer_site",
    supplierName: String(config?.supplierName ?? row.name ?? "待识别供应商"),
    brand: String(config?.brand ?? row.name ?? "待识别品牌"),
    url: String(row.base_url ?? ""),
    equipmentCategories: [String(config?.equipmentCategory ?? "综合")],
    healthStatus: pendingValidation ? "warning" : validationFailed ? "failed" : "healthy",
    lastCollectedAt: String(row.last_checked_at ?? "尚未检测"),
    failureCount: validationFailed ? 1 : 0,
    confidenceLevel: score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "D",
    normalCount: pendingValidation || validationFailed ? 0 : 1,
    abnormalCount: validationFailed ? 1 : 0,
  };
}

const statusTone: Record<CollectionTaskStatus, string> = {
  running: "border-success/25 bg-success-soft text-success",
  queued: "border-primary/20 bg-primary-soft text-primary",
  paused: "border-warning/25 bg-warning-soft text-warning",
  completed: "border-success/25 bg-success-soft text-success",
  failed: "border-danger/25 bg-danger-soft text-danger",
  needs_review: "border-ai-border bg-ai-soft text-ai",
  archived: "border-borderSoft bg-slate-100 text-textMuted",
};

const sourceIcon: Record<string, typeof Globe2> = {
  manufacturer_site: Globe2,
  supplier_site: Network,
  product_catalog: SquareStack,
  pdf_datasheet: FileText,
  excel_catalog: FileSpreadsheet,
  manual_input: Upload,
  api: Braces,
};

const sourceGroupPalette: Record<string, { idle: string; active: string; icon: string; count: string }> = {
  manufacturer_site: { idle: "hover:border-primary/25 hover:bg-primary-soft/35", active: "border-primary/30 bg-primary-soft/75 text-primary", icon: "bg-primary-soft text-primary", count: "bg-primary-soft text-primary" },
  supplier_site: { idle: "hover:border-cyan-300 hover:bg-cyan-50", active: "border-cyan-300 bg-cyan-50 text-cyan-700", icon: "bg-cyan-50 text-cyan-700", count: "bg-cyan-100 text-cyan-700" },
  product_catalog: { idle: "hover:border-ai-border hover:bg-ai-soft/45", active: "border-ai-border bg-ai-soft/75 text-ai", icon: "bg-ai-soft text-ai", count: "bg-ai-soft text-ai" },
  pdf_datasheet: { idle: "hover:border-warning/25 hover:bg-warning-soft/35", active: "border-warning/30 bg-warning-soft/70 text-warning", icon: "bg-warning-soft text-warning", count: "bg-warning-soft text-warning" },
  excel_catalog: { idle: "hover:border-success/25 hover:bg-success-soft/35", active: "border-success/30 bg-success-soft/70 text-success", icon: "bg-success-soft text-success", count: "bg-success-soft text-success" },
  manual_input: { idle: "hover:border-sky-300 hover:bg-sky-50", active: "border-sky-300 bg-sky-50 text-sky-700", icon: "bg-sky-50 text-sky-700", count: "bg-sky-100 text-sky-700" },
  api: { idle: "hover:border-slate-300 hover:bg-slate-100", active: "border-slate-300 bg-slate-100 text-slate-700", icon: "bg-slate-100 text-slate-600", count: "bg-slate-200 text-slate-700" },
};

function StatusPill({ status }: { status: CollectionTaskStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-pill border px-2 text-[12px] font-medium", statusTone[status])}>
      {statusLabels[status]}
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  note,
  tone,
  active,
  onClick,
}: {
  icon: typeof Database;
  label: string;
  value: number;
  suffix: string;
  note: string;
  tone: "blue" | "green" | "purple" | "orange" | "red";
  active?: boolean;
  onClick: () => void;
}) {
  const palette = {
    blue: { accent: "text-primary bg-white border-primary/15", surface: "border-primary/20 bg-primary-soft/40" },
    green: { accent: "text-success bg-white border-success/15", surface: "border-success/20 bg-success-soft/45" },
    purple: { accent: "text-ai bg-white border-ai-border", surface: "border-ai-border bg-ai-soft/50" },
    orange: { accent: "text-warning bg-white border-warning/20", surface: "border-warning/25 bg-warning-soft/50" },
    red: { accent: "text-danger bg-white border-danger/20", surface: "border-danger/20 bg-danger-soft/45" },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[102px] min-w-0 rounded-card border p-3.5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:brightness-[0.99] hover:shadow-panel",
        palette.surface,
        active && "ring-2 ring-primary/15"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium text-textMuted">{label}</span>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-sm", palette.accent)}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <strong className={cn("text-[26px] leading-none", palette.accent.split(" ")[0])}>{value.toLocaleString()}</strong>
        <span className="text-[12px] text-textMuted">{suffix}</span>
      </div>
      <p className="mt-2 truncate text-[11px] leading-4 text-textMuted">{note}</p>
    </button>
  );
}

function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "red" }) {
  return (
    <div className="flex min-w-[86px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", tone === "green" ? "bg-success" : tone === "red" ? "bg-danger" : "bg-primary")}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="w-8 text-right text-[11px] font-semibold text-textMain">{value}%</span>
    </div>
  );
}

function CollectionDrawer({
  kind,
  task,
  sources,
  methods,
  onClose,
  onSwitch,
  onAddSource,
  onAddMethod,
  onAddTask,
}: {
  kind: DrawerKind;
  task?: EquipmentCatalogCollectionTask;
  onClose: () => void;
  onSwitch: (kind: Exclude<DrawerKind, null>) => void;
  sources: EquipmentDataSource[];
  methods: CollectionMethod[];
  onAddSource: (source: EquipmentDataSource) => Promise<boolean> | boolean;
  onAddMethod: (method: CollectionMethod) => Promise<boolean> | boolean;
  onAddTask: (task: EquipmentCatalogCollectionTask) => Promise<boolean> | boolean;
}) {
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manageTab, setManageTab] = useState<"sources" | "methods">("sources");
  const [name, setName] = useState("");
  const [type, setType] = useState("manufacturer_site");
  const [brand, setBrand] = useState("");
  const [url, setUrl] = useState("");

  const testConnection = () => {
    setTesting(true);
    window.setTimeout(() => {
      setTesting(false);
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") throw new Error();
        emitMockToast({ title: "地址格式校验通过", description: "保存后可在快捷操作中执行真实连接测试。", tone: "success" });
      } catch {
        emitMockToast({ title: "采集地址无效", description: "请输入完整的 HTTPS 地址。", tone: "danger" });
      }
    }, 350);
  };

  const save = async () => {
    if (!name.trim()) {
      emitMockToast({ title: "请填写名称", description: "名称是创建记录的必填项。", tone: "warning" });
      return;
    }
    if (kind === "source" && (!url.trim() || !url.trim().startsWith("https://"))) {
      emitMockToast({ title: "请填写 HTTPS 采集地址", description: "真实来源必须使用可验证的 HTTPS 地址。", tone: "warning" });
      return;
    }
    setSaving(true);
    let saved = true;
    if (kind === "source") {
      saved = await onAddSource({
        id: `SRC-${Date.now()}`,
        name,
        type,
        supplierName: brand || "待补充供应商",
        brand: brand || "待识别品牌",
        url: url.trim(),
        equipmentCategories: ["综合"],
        healthStatus: "healthy",
        lastCollectedAt: "尚未采集",
        failureCount: 0,
        confidenceLevel: "B",
        normalCount: 0,
        abnormalCount: 0,
      });
    } else if (kind === "method") {
      saved = await onAddMethod({
        id: `MTH-${Date.now()}`,
        name,
        applicableSourceTypes: [type],
        parseTarget: type === "pdf_datasheet" ? "pdf" : "webpage",
        aiEnabled: true,
        dedupeEnabled: true,
        standardizationEnabled: true,
        retryEnabled: true,
        maxRetry: 3,
        reviewRequired: true,
        scheduled: true,
        taskCount: 0,
      });
    } else if (kind === "task") {
      const base = initialTasks[0];
      saved = await onAddTask({
        ...base,
        id: `TASK-${Date.now()}`,
        taskCode: `COLL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-4)}`,
        taskName: name,
        brand: brand || "待识别品牌",
        supplierName: brand || "待补充供应商",
        sourceType: type,
        dataSourceName: sourceTypeLabels[type] ?? "已登记来源",
        collectionMethodId: type === "api" ? "api" : "web",
        collectionMethodName: type === "api" ? "授权 API 采集" : "网页结构化采集",
        status: "queued",
        progress: 0,
        collectedPages: 0,
        parsedEquipment: 0,
        pendingReview: 0,
        failedCount: 0,
        currentStage: "等待调度",
        logs: [{ id: `LOG-${Date.now()}`, time: new Date().toLocaleTimeString("zh-CN"), level: "info", message: "采集任务已创建" }],
      });
    }
    setSaving(false);
    if (!saved) return;
    emitMockToast({ title: "创建成功", description: "记录已保存并加入当前工作台。", tone: "success" });
    onClose();
  };

  const titles: Record<Exclude<DrawerKind, null>, string> = {
    source: "新增数据源",
    method: "新增采集方式",
    task: "新建采集任务",
    logs: "任务运行日志",
    frequency: "采集频率配置",
    manage: "采集来源管理",
  };

  return (
    <OverlayShell open={Boolean(kind)} onClose={onClose} variant="drawer" panelClassName="w-[520px]">
      {kind ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold text-textMain">{titles[kind]}</h2>
              <p className="mt-1 text-[12px] text-textMuted">设备资料采集治理配置</p>
            </div>
            <button type="button" className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {kind === "logs" ? (
              <div className="space-y-3">
                {task?.logs.map((log) => (
                  <div key={log.id} className="flex gap-3 rounded-lg border border-borderSoft bg-slate-50 p-3">
                    <span className={cn("mt-1 size-2 shrink-0 rounded-full", log.level === "error" ? "bg-danger" : log.level === "warning" ? "bg-warning" : log.level === "success" ? "bg-success" : "bg-primary")} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-textMain">{log.message}</p>
                      <p className="mt-1 text-[11px] text-textMuted">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : kind === "frequency" ? (
              <div className="space-y-4">
                <label className="block text-[12px] font-medium text-textMain">运行频率</label>
                <select className="h-10 w-full rounded-md border border-borderSoft px-3 text-[12px]">
                  <option>每6小时</option><option>每日</option><option>每周</option><option>仅手动运行</option>
                </select>
                <label className="block text-[12px] font-medium text-textMain">失败重试策略</label>
                <select className="h-10 w-full rounded-md border border-borderSoft px-3 text-[12px]">
                  <option>间隔10分钟，最多3次</option><option>间隔30分钟，最多2次</option><option>不自动重试</option>
                </select>
                <button type="button" className={primaryButton} onClick={() => { emitMockToast({ title: "频率配置已保存", description: "下一次调度时间已重新计算。", tone: "success" }); onClose(); }}>保存配置</button>
              </div>
            ) : kind === "manage" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 rounded-lg border border-borderSoft bg-slate-50 p-1">
                  <button type="button" onClick={() => setManageTab("sources")} className={cn("h-9 rounded-md text-[12px] font-semibold transition", manageTab === "sources" ? "bg-white text-primary shadow-sm" : "text-textMuted hover:text-textMain")}>数据源配置</button>
                  <button type="button" onClick={() => setManageTab("methods")} className={cn("h-9 rounded-md text-[12px] font-semibold transition", manageTab === "methods" ? "bg-white text-ai shadow-sm" : "text-textMuted hover:text-textMain")}>采集方式配置</button>
                </div>
                <div className="rounded-lg border border-primary/15 bg-primary-soft/45 p-3 text-[11px] leading-5 text-textMuted">
                  <b className="text-textMain">数据源</b>定义从哪里采集；<b className="text-textMain">采集方式</b>定义网页、PDF、Excel 或 API 如何解析。创建任务时组合使用。
                </div>
                <button type="button" className={cn(manageTab === "sources" ? primaryButton : aiButton, "w-full")} onClick={() => onSwitch(manageTab === "sources" ? "source" : "method")}>
                  <Plus className="size-4" />新增{manageTab === "sources" ? "数据源" : "采集方式"}
                </button>
                <div className="space-y-2">
                  {manageTab === "sources" ? sources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between rounded-lg border border-borderSoft p-3">
                      <div className="min-w-0"><p className="truncate text-[12px] font-semibold">{source.name}</p><p className="mt-1 text-[11px] text-textMuted">{sourceTypeLabels[source.type]} · {source.brand}</p></div>
                      <button type="button" className={outlineButton} onClick={() => emitMockToast({ title: "数据源已选中", description: source.name, tone: "info" })}>配置</button>
                    </div>
                  )) : methods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between rounded-lg border border-borderSoft p-3">
                      <div className="min-w-0"><p className="truncate text-[12px] font-semibold">{method.name}</p><p className="mt-1 text-[11px] text-textMuted">{method.parseTarget} · {method.taskCount} 个任务 · {method.aiEnabled ? "AI解析" : "规则解析"}</p></div>
                      <button type="button" className={outlineButton} onClick={() => emitMockToast({ title: "采集方式已选中", description: method.name, tone: "info" })}>配置</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-[12px] font-medium text-textMain">{kind === "task" ? "任务名称" : kind === "method" ? "采集方式名称" : "数据源名称"}<span className="text-danger"> *</span></label>
                <input value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-md border border-borderSoft px-3 text-[12px]" placeholder="请输入清晰、可识别的名称" />
                <label className="block text-[12px] font-medium text-textMain">来源类型</label>
                <select value={type} onChange={(event) => setType(event.target.value)} className="h-10 w-full rounded-md border border-borderSoft px-3 text-[12px]">
                  {Object.entries(sourceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label className="block text-[12px] font-medium text-textMain">品牌 / 供应商</label>
                <input value={brand} onChange={(event) => setBrand(event.target.value)} className="h-10 w-full rounded-md border border-borderSoft px-3 text-[12px]" placeholder="例如 Grundfos" />
                {kind === "source" ? <><label className="block text-[12px] font-medium text-textMain">采集地址<span className="text-danger"> *</span></label><input value={url} onChange={(event) => setUrl(event.target.value)} className="h-10 w-full rounded-md border border-borderSoft px-3 text-[12px]" placeholder="https://www.example.com/catalog" /></> : null}
                <div className="rounded-lg border border-ai-border bg-ai-soft p-3 text-[12px] leading-5 text-ai">
                  AI 将用于字段识别、参数标准化、相似资料去重；采集结果仍需进入人工审核。
                </div>
                {kind === "source" ? <button type="button" onClick={testConnection} disabled={testing || !url.trim()} className={outlineButton}>{testing ? <LoaderCircle className="size-4 animate-spin" /> : <Activity className="size-4" />}校验地址格式</button> : null}
              </div>
            )}
          </div>

          {kind !== "logs" && kind !== "frequency" && kind !== "manage" ? (
            <div className="flex justify-end gap-2 border-t border-borderSoft p-4">
              <button type="button" className={outlineButton} onClick={onClose}>取消</button>
              <button type="button" disabled={saving} className={kind === "task" ? aiButton : primaryButton} onClick={save}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : kind === "task" ? <Sparkles className="size-4" /> : <Plus className="size-4" />}确认创建</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </OverlayShell>
  );
}

export function EquipmentCatalogCollectionPage() {
  const [sources, setSources] = useState(initialSources);
  const [methods, setMethods] = useState(initialMethods);
  const [tasks, setTasks] = useState(initialTasks);
  const [status, setStatus] = useState<CollectionTaskStatus | "all">("all");
  const [selectedSourceType, setSelectedSourceType] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [risk, setRisk] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState(initialTasks[0].id);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [loadingTask, setLoadingTask] = useState<string | null>(null);
  const [quickAction, setQuickAction] = useState<string | null>(null);
  const [disabledSourceIds, setDisabledSourceIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sourceImportFile, setSourceImportFile] = useState<File | null>(null);
  const [sourceImporting, setSourceImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<EquipmentSourceImportBatchRecord[]>([]);
  const [validationJobs, setValidationJobs] = useState<CollectionSourceValidationJobRecord[]>([]);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<OptionalTaskColumn[]>(["brand", "method", "category", "pages", "parsed", "pending", "failed", "lastRun"]);
  const [dataMode, setDataMode] = useState<"loading" | "supabase" | "mock">("loading");
  const [canWrite, setCanWrite] = useState(true);
  const [syncError, setSyncError] = useState("");
  const pollerRef = useRef<ReturnType<typeof createCollectionPoller> | null>(null);
  const pollState = useRef({ tasks, importHistory, validationJobs });
  useEffect(() => { pollState.current = { tasks, importHistory, validationJobs }; }, [tasks, importHistory, validationJobs]);
  const activePollKey = [
    ...tasks.filter((task) => uuidPattern.test(task.id) && ["queued", "running"].includes(task.status)).map((task) => task.id),
    ...importHistory.filter((batch) => batch.status === "processing").map((batch) => batch.id),
    ...validationJobs.filter((job) => ["queued", "running"].includes(job.status)).map((job) => job.id),
  ].join(",");
  useEffect(() => { if (activePollKey) pollerRef.current?.wake(); }, [activePollKey]);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(0);
  const [documentRetryRunning, setDocumentRetryRunning] = useState(false);

  const sourceGroups = useMemo(() => Object.entries(sourceTypeLabels).map(([type, label]) => {
    const items = sources.filter((source) => source.type === type);
    const checked = items.filter((item) => item.normalCount > 0 || item.abnormalCount > 0).length;
    const healthy = items.filter((item) => item.healthStatus === "healthy" && item.abnormalCount === 0).length;
    const abnormal = items.filter((item) => item.healthStatus === "failed" || item.abnormalCount > 0).length;
    const pending = Math.max(0, items.length - checked);
    const excellent = items.filter((item) => item.abnormalCount === 0 && item.confidenceLevel === "A").length;
    const good = items.filter((item) => item.abnormalCount === 0 && item.confidenceLevel === "B").length;
    const normal = items.filter((item) => item.abnormalCount === 0 && ["C", "D"].includes(item.confidenceLevel)).length;
    const poor = items.filter((item) => item.abnormalCount > 0 || item.confidenceLevel === "E").length;
    const taskCount = tasks.filter((task) => taskMatchesSourceType(task, type)).length;
    return { type, label, items, taskCount, healthy, abnormal, checked, pending, matrix: [excellent, good, normal, poor] };
  }), [sources, tasks]);
  const configuredSourceGroups = sourceGroups.filter((group) => group.items.length > 0);
  const unconfiguredSourceGroups = sourceGroups.filter((group) => group.items.length === 0);
  const selectedSourceGroup = selectedSourceType === "all"
    ? null
    : sourceGroups.find((group) => group.type === selectedSourceType) ?? null;

  const sourceScopedTasks = useMemo(() => tasks.filter((task) =>
    selectedSourceType === "all" || taskMatchesSourceType(task, selectedSourceType)
  ), [selectedSourceType, tasks]);

  const selectSourceType = (type: string) => {
    const firstTask = tasks.find((task) => type === "all" || taskMatchesSourceType(task, type));
    setSelectedSourceType(type);
    setSelectedTaskId(firstTask?.id ?? "");
    setSelectedRows([]);
    setPage(1);
  };

  const filteredTasks = useMemo(() => sourceScopedTasks.filter((task) => {
    const haystack = `${task.taskCode} ${task.taskName} ${task.brand} ${task.supplierName}`.toLowerCase();
    return (status === "all" || task.status === status)
      && (selectedMethod === "all" || task.collectionMethodId === selectedMethod)
      && (brand === "all" || task.brand === brand)
      && (category === "all" || task.equipmentCategory === category)
      && (risk === "all" || task.riskLevel === risk)
      && (!appliedKeyword || haystack.includes(appliedKeyword.toLowerCase()));
  }), [appliedKeyword, brand, category, risk, selectedMethod, sourceScopedTasks, status]);

  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const actionTask = tasks.find((task) => task.id === actionTaskId) ?? selectedTask;
  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const progressStages = ["等待调度", "采集网页", "解析资料", "生成资料", "审核入库"];
  const selectedStageIndex = selectedTask.status === "completed" || selectedTask.status === "archived"
    ? 4
    : selectedTask.status === "queued"
      ? 0
      : Math.min(3, Math.max(1, Math.ceil(selectedTask.progress / 30)));
  const brands = Array.from(new Set(tasks.map((task) => task.brand)));
  const categories = Array.from(new Set(tasks.map((task) => task.equipmentCategory)));
  const allSelected = visibleTasks.length > 0 && visibleTasks.every((task) => selectedRows.includes(task.id));
  const validationPending = validationJobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const validationCompleted = validationJobs.filter((job) => job.status === "completed").length;
  const validationFailed = validationJobs.filter((job) => job.status === "failed").length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("wpi:equipment-catalog-collection:disabled-sources");
      if (saved) {
        try {
          setDisabledSourceIds(JSON.parse(saved) as string[]);
        } catch {
          window.localStorage.removeItem("wpi:equipment-catalog-collection:disabled-sources");
        }
      }
      const savedColumns = window.localStorage.getItem("wpi:equipment-catalog-collection:visible-columns");
      if (savedColumns) {
        try {
          const parsed = JSON.parse(savedColumns) as OptionalTaskColumn[];
          if (Array.isArray(parsed)) setVisibleColumns(parsed);
        } catch {
          window.localStorage.removeItem("wpi:equipment-catalog-collection:visible-columns");
        }
      }
      const savedMethods = window.localStorage.getItem("wpi:equipment-catalog-collection:methods");
      if (savedMethods) {
        try {
          const parsed = JSON.parse(savedMethods) as CollectionMethod[];
          if (Array.isArray(parsed) && parsed.length) setMethods(parsed);
        } catch {
          window.localStorage.removeItem("wpi:equipment-catalog-collection:methods");
        }
      }
      const localTasks = readLocalCreatedTasks();
      if (localTasks.length) {
        setTasks((items) => [...localTasks, ...items.filter((item) => !localTasks.some((local) => local.id === item.id))]);
      }
      const params = new URLSearchParams(window.location.search);
      const createdTaskId = params.get("taskId");
      if (params.get("created") === "1" && createdTaskId) {
        setSelectedTaskId(createdTaskId);
        emitMockToast({ title: "采集任务已加入工作台", description: createdTaskId, tone: "success" });
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem("wpi:equipment-catalog-collection:disabled-sources", JSON.stringify(disabledSourceIds));
      window.localStorage.setItem("wpi:equipment-catalog-collection:visible-columns", JSON.stringify(visibleColumns));
      window.localStorage.setItem("wpi:equipment-catalog-collection:methods", JSON.stringify(methods));
    }
  }, [disabledSourceIds, methods, storageReady, visibleColumns]);

  useEffect(() => {
    let cancelled = false;
    const loadRealCollectionData = async (signal: AbortSignal) => {
        const [taskResponse, sourceResponse, methodResponse, importResponse, validationResponse] = await Promise.all([
          fetch("/api/price-collection", { cache: "no-store", signal }),
          fetch("/api/price-collection/sources", { cache: "no-store", signal }),
          fetch("/api/price-collection/methods", { cache: "no-store", signal }),
          fetch("/api/price-collection/source-imports", { cache: "no-store", signal }),
          fetch("/api/price-collection/source-validation-jobs", { cache: "no-store", signal }),
        ]);
        if (!taskResponse.ok || !sourceResponse.ok || !methodResponse.ok || !importResponse.ok || !validationResponse.ok) throw new Error("采集业务数据暂不可用");
        const bootstrap = await taskResponse.json() as PriceCollectionBootstrap;
        const sourcePayload = await sourceResponse.json() as { sources?: Array<Record<string, unknown>>; canManage?: boolean };
        const methodPayload = await methodResponse.json() as { methods?: EquipmentCollectionMethodRecord[]; canManage?: boolean };
        const importPayload = await importResponse.json() as { batches?: EquipmentSourceImportBatchRecord[]; canManage?: boolean };
        const validationPayload = await validationResponse.json() as { jobs?: CollectionSourceValidationJobRecord[]; canManage?: boolean };
        if (cancelled || signal.aborted) return false;
        const realSources = (sourcePayload.sources ?? []).map(mapRealSource);
        const realTasks = bootstrap.tasks.filter((task) => task.targetType === "equipment").map((task) => mapRealTask(task, bootstrap.leads, bootstrap.runs, realSources));
        if (realTasks.length) {
          const fallback = initialTasks.filter((mockTask) => !realTasks.some((task) => task.taskCode === mockTask.taskCode));
          const localTasks = readLocalCreatedTasks();
          const mergedTasks = [
            ...realTasks,
            ...localTasks.filter((local) => !realTasks.some((item) => local.id === item.id || local.taskCode === item.taskCode)),
            ...fallback.filter((item) => !localTasks.some((local) => local.id === item.id || local.taskCode === item.taskCode)),
          ];
          setTasks(mergedTasks);
          setSelectedTaskId((current) => mergedTasks.some((task) => task.id === current) ? current : mergedTasks[0].id);
        }
        if (realSources.length) {
          const fallback = initialSources.filter((mockSource) => !realSources.some((source) => source.name === mockSource.name));
          setSources([...realSources, ...fallback].slice(0, Math.max(12, realSources.length)));
          setDisabledSourceIds((items) => Array.from(new Set([
            ...items.filter((id) => !uuidPattern.test(id)),
            ...(sourcePayload.sources ?? []).filter((row) => row.is_active === false).map((row) => String(row.id)),
          ])));
        }
        const realMethods = (methodPayload.methods ?? []).filter((method) => method.isActive).map(mapRealMethod);
        if (realMethods.length) setMethods(realMethods);
        setImportHistory(importPayload.batches ?? []);
        setValidationJobs(validationPayload.jobs ?? []);
        setCanWrite(Boolean(bootstrap.permissions.canWrite && sourcePayload.canManage && methodPayload.canManage && importPayload.canManage && validationPayload.canManage));
        setDataMode("supabase");
        setSyncError("");
        return realTasks.some((task) => ["queued", "running"].includes(task.status))
          || (importPayload.batches ?? []).some((batch) => batch.status === "processing")
          || (validationPayload.jobs ?? []).some((job) => ["queued", "running"].includes(job.status));
    };
    let needsResultSync = false;
    const poller = createCollectionPoller({
      visible: () => document.visibilityState !== "hidden",
      onError: () => {
        if (!cancelled) setSyncError("同步失败，保留上次数据；请稍后刷新");
      },
      load: async (full, signal) => {
        if (full || needsResultSync) {
          const active = await loadRealCollectionData(signal);
          needsResultSync = false;
          return active;
        }
        const current = pollState.current;
        const ids = current.tasks.filter((task) => uuidPattern.test(task.id) && ["queued", "running"].includes(task.status)).map((task) => task.id).slice(0, 100);
        let active = false;
        if (ids.length) {
          const response = await fetch(`/api/price-collection?view=equipment_progress&taskIds=${ids.join(",")}`, { cache: "no-store", signal });
          if (!response.ok) throw new Error("Progress unavailable");
          const payload = await response.json() as { tasks: Array<{ id: string; status: PriceCollectionTaskRecord["status"]; progress: number; current_source: string | null; success_count: number; failed_count: number; last_run_at: string | null; next_run_at: string | null }> };
          if (cancelled || signal.aborted) return false;
          active = payload.tasks.some((task) => ["queued", "running"].includes(task.status));
          needsResultSync = payload.tasks.length !== ids.length || payload.tasks.some((task) => !["queued", "running"].includes(task.status));
          setTasks((items) => items.map((task) => {
            const row = payload.tasks.find((item) => item.id === task.id);
            if (!row) return task;
            const status: CollectionTaskStatus = row.status === "stopped" ? "archived" : row.status;
            return { ...task, status, progress: row.progress, currentStage: row.current_source || statusLabels[status], collectedPages: row.success_count + row.failed_count, parsedEquipment: row.success_count, failedCount: row.failed_count, lastRunAt: row.last_run_at || task.lastRunAt, nextRunAt: row.next_run_at || "仅手动运行" };
          }));
        }
        if (current.validationJobs.some((job) => ["queued", "running"].includes(job.status))) {
          const response = await fetch("/api/price-collection/source-validation-jobs", { cache: "no-store", signal });
          if (!response.ok) throw new Error("Validation unavailable");
          const payload = await response.json() as { jobs: CollectionSourceValidationJobRecord[] };
          if (cancelled || signal.aborted) return false;
          setValidationJobs(payload.jobs);
          active ||= payload.jobs.some((job) => ["queued", "running"].includes(job.status));
          needsResultSync ||= current.validationJobs.some((job) => ["queued", "running"].includes(job.status) && !payload.jobs.some((next) => next.id === job.id && ["queued", "running"].includes(next.status)));
        }
        if (current.importHistory.some((batch) => batch.status === "processing")) {
          const response = await fetch("/api/price-collection/source-imports", { cache: "no-store", signal });
          if (!response.ok) throw new Error("Imports unavailable");
          const payload = await response.json() as { batches: EquipmentSourceImportBatchRecord[] };
          if (cancelled || signal.aborted) return false;
          setImportHistory(payload.batches);
          active ||= payload.batches.some((batch) => batch.status === "processing");
          needsResultSync ||= current.importHistory.some((batch) => batch.status === "processing" && !payload.batches.some((next) => next.id === batch.id && next.status === "processing"));
        }
        if (needsResultSync) {
          active = await loadRealCollectionData(signal);
          needsResultSync = false;
        }
        if (!cancelled && !signal.aborted) setSyncError("");
        return active;
      },
    });
    pollerRef.current = poller;
    const visibilityChanged = () => poller.visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);
    poller.start();
    return () => {
      cancelled = true;
      poller.dispose();
      pollerRef.current = null;
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);

  const setTaskStatus = async (id: string, nextStatus: CollectionTaskStatus, message: string) => {
    if (!canWrite) {
      emitMockToast({ title: "没有操作权限", description: "当前角色缺少采集任务写入权限。", tone: "warning" });
      return;
    }
    if (uuidPattern.test(id)) {
      const action = nextStatus === "paused" ? "pause" : nextStatus === "archived" ? "stop" : nextStatus === "running" ? "resume" : null;
      if (action) {
        const response = await fetch("/api/price-collection", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "task", id, action }) });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) {
          emitMockToast({ title: "任务状态更新失败", description: payload.error || "请稍后重试。", tone: "danger" });
          return;
        }
      }
    }
    setTasks((items) => items.map((task) => task.id === id ? { ...task, status: nextStatus, currentStage: statusLabels[nextStatus] } : task));
    emitMockToast({ title: message, description: tasks.find((task) => task.id === id)?.taskName, tone: nextStatus === "failed" ? "danger" : "success" });
  };

  const retryTask = async (id: string) => {
    if (!canWrite) {
      emitMockToast({ title: "没有操作权限", description: "当前角色缺少采集任务写入权限。", tone: "warning" });
      return;
    }
    setLoadingTask(id);
    if (uuidPattern.test(id)) {
      const response = await fetch("/api/price-collection", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "task", id, action: "retry" }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setLoadingTask(null);
        emitMockToast({ title: "任务重试失败", description: payload.error || "采集执行网关暂不可用。", tone: "danger" });
        return;
      }
    }
    window.setTimeout(() => {
      setTasks((items) => items.map((task) => task.id === id ? { ...task, status: "running", progress: Math.max(task.progress, 8), failedCount: 0, currentStage: "重新连接来源" } : task));
      setLoadingTask(null);
      emitMockToast({ title: "任务已重新执行", description: "采集器正在重新连接并恢复断点。", tone: "success" });
    }, 900);
  };

  const deleteTask = async (task: EquipmentCatalogCollectionTask) => {
    if (!canWrite) {
      emitMockToast({ title: "没有操作权限", description: "当前角色缺少采集任务删除权限。", tone: "warning" });
      return;
    }
    setLoadingTask(task.id);
    if (uuidPattern.test(task.id)) {
      const response = await fetch(`/api/price-collection?id=${encodeURIComponent(task.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string; archiveRequired?: boolean };
      if (!response.ok) {
        setLoadingTask(null);
        emitMockToast({ title: payload.archiveRequired ? "该任务只能归档" : "任务删除失败", description: payload.error || "请稍后重试。", tone: payload.archiveRequired ? "warning" : "danger" });
        return;
      }
    } else {
      const localTasks = readLocalCreatedTasks().filter((item) => item.id !== task.id);
      window.localStorage.setItem("wpi:equipment-catalog-collection:created-tasks", JSON.stringify(localTasks));
    }
    const remaining = tasks.filter((item) => item.id !== task.id);
    setTasks(remaining);
    setSelectedTaskId((current) => current === task.id ? remaining[0]?.id ?? "" : current);
    setSelectedRows((items) => items.filter((id) => id !== task.id));
    setLoadingTask(null);
    emitMockToast({ title: "采集任务已删除", description: `${task.taskCode} 未产生业务成果，任务及临时运行记录已清理。`, tone: "success" });
  };

  const runSourceCheck = async (mode: "connection" | "health") => {
    if (!canWrite) {
      emitMockToast({ title: "没有操作权限", description: "当前角色缺少数据源管理权限。", tone: "warning" });
      return;
    }
    setQuickAction(mode);
    const targets = sources.filter((source) => selectedSourceType === "all" || source.type === selectedSourceType);
    const realTargets = targets.filter((source) => uuidPattern.test(source.id));
    if (dataMode === "supabase" && realTargets.length) {
      const response = await fetch("/api/price-collection/source-validation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: realTargets.map((source) => source.id) }),
      });
      const payload = await response.json().catch(() => ({})) as { queued?: number; skipped?: number; jobs?: CollectionSourceValidationJobRecord[]; error?: string };
      setQuickAction(null);
      if (!response.ok) {
        setQuickAction(null);
        emitMockToast({ title: "验证任务创建失败", description: payload.error || "后台验证队列暂不可用。", tone: "danger" });
        return;
      }
      setValidationJobs((items) => [...(payload.jobs ?? []), ...items]);
      emitMockToast({
        title: mode === "connection" ? "连接验证已排队" : "健康度检测已排队",
        description: `新增 ${payload.queued ?? 0} 个后台任务，跳过 ${payload.skipped ?? 0} 个正在处理的来源。系统将分批验证，避免瞬时并发过高。`,
        tone: "success",
      });
      return;
    }
    window.setTimeout(() => {
      setSources((items) => items.map((source) => ({
        ...source,
        lastCollectedAt: new Date().toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-"),
        healthStatus: source.healthStatus === "failed" ? "warning" : source.healthStatus,
      })));
      setQuickAction(null);
      emitMockToast({
        title: mode === "connection" ? "连接测试完成" : "健康度检测完成",
        description: `已检查 ${selectedSourceType === "all" ? sources.length : sources.filter((source) => source.type === selectedSourceType).length} 个数据源，异常来源已进入关注队列。`,
        tone: "success",
      });
    }, 900);
  };

  const createMethod = async (method: CollectionMethod) => {
    if (dataMode !== "supabase") {
      setMethods((items) => [method, ...items]);
      return true;
    }
    if (!canWrite) return false;
    const response = await fetch("/api/price-collection/methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(method),
    });
    const payload = await response.json().catch(() => ({})) as { method?: EquipmentCollectionMethodRecord; error?: string };
    if (!response.ok || !payload.method) {
      emitMockToast({ title: "采集方式创建失败", description: payload.error || "请检查名称或当前权限。", tone: "danger" });
      return false;
    }
    const savedMethod = mapRealMethod(payload.method);
    setMethods((items) => [savedMethod, ...items.filter((item) => item.id !== savedMethod.id)]);
    return true;
  };

  const toggleSources = async (enabled: boolean) => {
    if (!canWrite) {
      emitMockToast({ title: "没有操作权限", description: "当前角色缺少数据源管理权限。", tone: "warning" });
      return;
    }
    const targetIds = sources.filter((source) => selectedSourceType === "all" || source.type === selectedSourceType).map((source) => source.id);
    const realIds = targetIds.filter((id) => uuidPattern.test(id));
    if (realIds.length) {
      const results = await Promise.all(realIds.map(async (id) => {
        const response = await fetch("/api/price-collection/sources", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "toggle", isActive: enabled }) });
        return response.ok;
      }));
      if (results.some((result) => !result)) {
        emitMockToast({ title: "部分数据源处理失败", description: "未通过权限或数据源状态校验的记录没有被修改。", tone: "warning" });
      }
    }
    setDisabledSourceIds((items) => enabled ? items.filter((id) => !targetIds.includes(id)) : Array.from(new Set([...items, ...targetIds])));
    emitMockToast({ title: enabled ? "数据源已批量启用" : "数据源已批量停用", description: `已处理 ${targetIds.length} 个当前范围内的数据源。`, tone: enabled ? "success" : "warning" });
  };

  const createSource = async (source: EquipmentDataSource) => {
    if (dataMode !== "supabase") {
      setSources((items) => [source, ...items]);
      return true;
    }
    if (!canWrite) return false;
    const response = await fetch("/api/price-collection/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceKind: source.type === "api" ? "api" : "web",
        catalogSourceType: source.type,
        sourceCode: `EC_${Date.now().toString(36).toUpperCase()}`,
        name: source.name,
        baseUrl: source.url,
        extractionStrategy: source.type === "api" ? "json_api" : "structured_data",
        targetType: "equipment",
        brand: source.brand,
        supplierName: source.supplierName,
        equipmentCategory: source.equipmentCategories[0],
        qualityScore: 60,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { source?: Record<string, unknown>; error?: string };
    if (!response.ok || !payload.source) {
      emitMockToast({ title: "数据源创建失败", description: payload.error || "请检查地址、编码或当前权限。", tone: "danger" });
      return false;
    }
    const savedSource = mapRealSource(payload.source);
    setSources((items) => [savedSource, ...items.filter((item) => item.id !== savedSource.id)]);
    setDisabledSourceIds((items) => Array.from(new Set([...items, savedSource.id])));
    emitMockToast({ title: "数据源已登记", description: "来源默认停用，请先完成连接验证后再启用。", tone: "success" });
    return true;
  };

  const createTask = async (task: EquipmentCatalogCollectionTask) => {
    if (dataMode !== "supabase") {
      setTasks((items) => [task, ...items]);
      setSelectedTaskId(task.id);
      return true;
    }
    if (!canWrite) return false;
    const realSource = sources.find((source) => uuidPattern.test(source.id) && !disabledSourceIds.includes(source.id) && source.type === task.sourceType)
      ?? sources.find((source) => uuidPattern.test(source.id) && !disabledSourceIds.includes(source.id));
    if (!realSource) {
      emitMockToast({ title: "缺少可用数据源", description: "请先验证并启用至少一个真实数据源。", tone: "warning" });
      return false;
    }
    const collectionMode = realSource.type === "api" ? "api" : "web";
    const response = await fetch("/api/price-collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_task",
        targetType: "equipment",
        keyword: task.taskName,
        specification: task.collectionScope,
        sourceType: realSource.type,
        collectionMode,
        sourceIds: [realSource.id],
        frequency: task.frequency,
        config: { taskName: task.taskName, brand: task.brand, equipmentCategory: task.equipmentCategory, sourceIds: [realSource.id] },
      }),
    });
    const payload = await response.json().catch(() => ({})) as { task?: PriceCollectionTaskRecord; error?: string };
    if (!payload.task) {
      emitMockToast({ title: "采集任务创建失败", description: payload.error || "请检查采集来源和执行网关。", tone: "danger" });
      return false;
    }
    const savedTask = mapRealTask(payload.task, [], [], sources);
    setTasks((items) => [savedTask, ...items.filter((item) => item.id !== savedTask.id)]);
    setSelectedTaskId(savedTask.id);
    if (!response.ok) {
      emitMockToast({ title: "任务已登记，首次执行待恢复", description: payload.error || "执行网关暂不可用，可稍后点击重试。", tone: "warning" });
    }
    return true;
  };

  const importSources = async () => {
    if (!sourceImportFile || !canWrite) return;
    setSourceImporting(true);
    try {
      const fileText = await sourceImportFile.text();
      const rows = sourceImportFile.name.toLowerCase().endsWith(".json")
        ? JSON.parse(fileText) as Array<Record<string, unknown>>
        : parseCsv(fileText, { bom: true, columns: true, skip_empty_lines: true, trim: true }) as Array<Record<string, unknown>>;
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("文件中没有可导入的数据");
      const response = await fetch("/api/price-collection/source-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: sourceImportFile.name, rows: rows.slice(0, 100) }),
      });
      const payload = await response.json().catch(() => ({})) as { batch?: EquipmentSourceImportBatchRecord; sources?: Array<Record<string, unknown>>; error?: string };
      if (!payload.batch) throw new Error(payload.error || "导入批次创建失败");
      const imported = (payload.sources ?? []).map(mapRealSource);
      if (imported.length) {
        setSources((items) => [...imported, ...items.filter((item) => !imported.some((source) => source.id === item.id))]);
        setDisabledSourceIds((items) => Array.from(new Set([...items, ...imported.map((source) => source.id)])));
      }
      setImportHistory((items) => [payload.batch!, ...items.filter((item) => item.id !== payload.batch!.id)]);
      const failed = payload.batch.failedRows;
      emitMockToast({
        title: imported.length ? "数据源导入完成" : "数据源导入失败",
        description: `批次 ${payload.batch.batchCode}：成功 ${payload.batch.successRows} 条，失败 ${failed} 条。新来源需验证后启用。`,
        tone: failed ? "warning" : "success",
      });
      if (response.ok || imported.length) {
        setUploadOpen(false);
        setSourceImportFile(null);
      }
    } catch (error) {
      emitMockToast({ title: "无法解析导入文件", description: error instanceof Error ? error.message : "请使用标准 CSV 或 JSON 文件。", tone: "danger" });
    } finally {
      setSourceImporting(false);
    }
  };

  const exportSources = () => {
    const targetSources = sources.filter((source) => selectedSourceType === "all" || source.type === selectedSourceType);
    const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["来源编码", "来源名称", "来源类型", "品牌", "供应商", "采集地址", "状态", "最后检测"],
      ...targetSources.map((source) => [source.id, source.name, sourceTypeLabels[source.type], source.brand, source.supplierName, source.url ?? "", disabledSourceIds.includes(source.id) ? "停用" : "启用", source.lastCollectedAt]),
    ];
    const blob = new Blob(["\uFEFF", rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `equipment-catalog-sources-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    emitMockToast({ title: "数据源清单已导出", description: `已导出当前范围 ${targetSources.length} 条记录。`, tone: "success" });
  };

  const resetFilters = () => {
    setKeyword(""); setAppliedKeyword(""); setBrand("all"); setCategory("all"); setRisk("all"); setSelectedSourceType("all"); setSelectedMethod("all"); setStatus("all"); setPage(1);
  };

  const backfillMissingDocuments = async () => {
    if (!canWrite || backfillRunning) return;
    setBackfillRunning(true);
    setBackfillProgress(0);
    let cursor = "";
    let scanned = 0;
    let discovered = 0;
    let queued = 0;
    let remaining = 0;
    try {
      for (let batch = 0; batch < 20; batch += 1) {
        const response = await fetch("/api/equipment-catalog/documents/backfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cursor: cursor || undefined, batchSize: 6 }),
        });
        const payload = (await response.json()) as {
          data?: {
            scanned: number;
            discoveredCatalogs: number;
            queuedJobs: number;
            nextCursor: string | null;
            remaining: number;
            hasMore: boolean;
          };
          error?: string;
        };
        if (!response.ok || !payload.data) throw new Error(payload.error || "批量补抓失败");
        scanned += payload.data.scanned;
        discovered += payload.data.discoveredCatalogs;
        queued += payload.data.queuedJobs;
        remaining = payload.data.remaining;
        setBackfillProgress(scanned);
        if (!payload.data.hasMore || !payload.data.nextCursor || payload.data.nextCursor === cursor) break;
        cursor = payload.data.nextCursor;
      }
      emitMockToast({
        title: "缺失文档补抓已提交",
        description: `扫描 ${scanned} 条档案，发现 ${discovered} 条官方文档，新增 ${queued} 个解析任务；仍有 ${remaining} 条需要后续发现或人工补录。`,
        tone: remaining ? "warning" : "success",
      });
    } catch (error) {
      emitMockToast({
        title: "批量补抓未完成",
        description: error instanceof Error ? error.message : "请检查官网来源和AI配置后重试",
        tone: "danger",
      });
    } finally {
      setBackfillRunning(false);
    }
  };

  const retryFailedDocumentJobs = async () => {
    if (!canWrite || documentRetryRunning) return;
    setDocumentRetryRunning(true);
    try {
      const response = await fetch("/api/equipment-catalog/documents/retry-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const payload = (await response.json()) as { data?: { queued: number; remaining: number; worker?: { error?: string } }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "批量重试失败");
      const workerError = payload.data.worker?.error;
      emitMockToast({
        title: payload.data.queued ? "文档解析已重新排队" : "没有待重试的解析任务",
        description: workerError
          ? `已重新排队 ${payload.data.queued} 个任务，但执行网关返回：${workerError}`
          : `已重新排队 ${payload.data.queued} 个任务，剩余失败 ${payload.data.remaining} 个。`,
        tone: workerError ? "warning" : payload.data.queued ? "success" : "info",
      });
    } catch (error) {
      emitMockToast({ title: "文档解析重试失败", description: error instanceof Error ? error.message : "请先验证 AI Provider 与额度", tone: "danger" });
    } finally {
      setDocumentRetryRunning(false);
    }
  };

  const statusTabs: Array<{ value: CollectionTaskStatus | "all"; label: string }> = [
    { value: "all", label: "全部" }, { value: "running", label: "运行中" }, { value: "queued", label: "排队中" },
    { value: "paused", label: "已暂停" }, { value: "completed", label: "已完成" }, { value: "failed", label: "失败" },
    { value: "needs_review", label: "待审核" }, { value: "archived", label: "已归档" },
  ];

  return (
    <AppLayout>
      <div data-no-global-interaction className="space-y-4 pb-8">
        <PageHeader
          title="设备资料采集中心"
          description="统一管理供应商官网、产品目录、PDF样本与授权接口的设备资料采集任务，AI解析结果进入人工审核流程。"
          actions={<>
            <button type="button" title="刷新采集数据" aria-label="刷新采集数据" className={outlineButton} onClick={() => pollerRef.current?.refresh()}><RefreshCw className="size-4" /></button>
            {syncError ? <span role="status" className="text-[11px] text-warning">{syncError}</span> : null}
            <span className={cn("inline-flex h-8 items-center rounded-pill border px-2.5 text-[11px] font-medium", dataMode === "supabase" ? "border-success/20 bg-success-soft text-success" : dataMode === "loading" ? "border-primary/20 bg-primary-soft text-primary" : "border-warning/20 bg-warning-soft text-warning")}>{dataMode === "supabase" ? "Supabase 已同步" : dataMode === "loading" ? "正在同步" : "演示数据"}</span>
            <button type="button" disabled={!canWrite || backfillRunning} className={cn(outlineButton, "border-ai-border text-ai")} onClick={() => void backfillMissingDocuments()}>
              {backfillRunning ? <LoaderCircle className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
              {backfillRunning ? `补抓中 ${backfillProgress}` : "批量补抓缺失文档"}
            </button>
            <button type="button" disabled={!canWrite || documentRetryRunning} className={cn(outlineButton, "border-warning/30 text-warning")} onClick={() => void retryFailedDocumentJobs()}>
              <RefreshCw className={cn("size-4", documentRetryRunning && "animate-spin")} />
              {documentRetryRunning ? "重试中" : "重试文档解析"}
            </button>
            <button type="button" disabled={!canWrite} className={outlineButton} onClick={() => setDrawer("manage")}><Settings2 className="size-4" />采集配置</button>
            <Link href="/equipment-catalog/collection/create" aria-disabled={!canWrite} className={cn(primaryButton, !canWrite && "pointer-events-none opacity-55")}><Plus className="size-4" />新建采集任务</Link>
          </>}
        />

        <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard icon={Database} label="数据源总数" value={sources.length} suffix="个" note="覆盖官网、目录与授权接口" tone="blue" onClick={() => { setSelectedSourceType("all"); setPage(1); }} />
          <KpiCard icon={SquareStack} label="采集方式数量" value={methods.length} suffix="种" note="AI解析与人工导入并行" tone="purple" onClick={() => setDrawer("manage")} />
          <KpiCard icon={Activity} label="运行中任务" value={tasks.filter((task) => task.status === "running").length} suffix="个" note="实时读取任务调度状态" tone="green" active={status === "running"} onClick={() => setStatus("running")} />
          <KpiCard icon={CheckCircle2} label="今日完成" value={tasks.filter((task) => task.status === "completed").length + 27} suffix="个" note="较昨日 +7 个" tone="blue" active={status === "completed"} onClick={() => setStatus("completed")} />
          <KpiCard icon={XCircle} label="失败任务" value={tasks.filter((task) => task.status === "failed").length} suffix="个" note="建议优先检查来源健康度" tone="red" active={status === "failed"} onClick={() => setStatus("failed")} />
          <KpiCard icon={ClipboardCheck} label="待审核资料" value={pendingCatalogReviews.length} suffix="条" note="AI结果需人工最终确认" tone="orange" active={status === "needs_review"} onClick={() => setStatus("needs_review")} />
        </section>

        <section className="grid min-w-0 items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card ring-1 ring-slate-100/80">
            <div className="flex h-12 items-center justify-between border-b border-borderSoft px-3">
              <div><p className="text-[13px] font-semibold text-textMain">数据源分类</p><p className="text-[10px] text-textMuted">选择后联动任务列表</p></div>
              <Database className="size-4 text-primary" />
            </div>
            <div className="max-h-[650px] overflow-y-auto p-2">
              <div className="space-y-1.5">
                  <button type="button" onClick={() => selectSourceType("all")} className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all", selectedSourceType === "all" ? "border-primary/35 bg-primary-soft text-primary shadow-sm ring-1 ring-primary/10" : "border-borderSoft bg-slate-50 hover:border-primary/25 hover:bg-primary-soft/40")}>
                    <span className="flex items-center gap-2 text-[12px] font-semibold"><span className="flex size-7 items-center justify-center rounded-md bg-white text-primary shadow-sm"><Database className="size-4" /></span>全部数据源</span><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm">{sources.length} 源 · {tasks.length} 任务</span>
                  </button>
                  {configuredSourceGroups.map((group) => {
                    const Icon = sourceIcon[group.type] ?? Database;
                    const groupPalette = sourceGroupPalette[group.type] ?? sourceGroupPalette.api;
                    const groupDisabled = group.items.length > 0 && group.items.every((source) => disabledSourceIds.includes(source.id));
                    return (
                      <button key={group.type} type="button" onClick={() => selectSourceType(group.type)} className={cn("w-full rounded-lg border bg-white px-3 py-3 text-left transition-all duration-150 hover:-translate-y-px hover:shadow-sm", selectedSourceType === group.type ? cn(groupPalette.active, "shadow-sm ring-1 ring-current/10") : cn("border-borderSoft", groupPalette.idle), groupDisabled && "opacity-55")}>
                        <div className="flex items-center gap-2"><span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", groupPalette.icon)}><Icon className="size-4" /></span><span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{group.label}</span>{groupDisabled ? <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[10px] text-danger">停用</span> : null}<span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", groupPalette.count)}>{group.items.length} 源</span></div>
                        <div className="mt-2 flex items-center gap-1.5 pl-9 text-[10px]"><span className="rounded-md bg-success-soft px-1.5 py-0.5 font-medium text-success">已验证 {group.healthy}</span><span className={cn("rounded-md px-1.5 py-0.5 font-medium", group.abnormal ? "bg-danger-soft text-danger" : "bg-slate-100 text-textMuted")}>异常 {group.abnormal}</span><span className={cn("ml-auto rounded-md px-1.5 py-0.5 font-medium", group.pending ? "bg-warning-soft text-warning" : "bg-slate-100 text-textMuted")}>待验证 {group.pending}</span></div>
                        <div className="mt-1.5 flex justify-end text-[10px] font-medium text-primary">关联任务 {group.taskCount} 条</div>
                      </button>
                    );
                  })}
                  {unconfiguredSourceGroups.length > 0 ? (
                    <button type="button" disabled={!canWrite} onClick={() => setDrawer("source")} className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-borderSoft bg-slate-50 px-3 py-2 text-left text-[10px] text-textMuted transition hover:border-primary/30 hover:bg-primary-soft/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60">
                      <span className="truncate">未配置：{unconfiguredSourceGroups.map((group) => group.label).join("、")}</span>
                      <Plus className="size-3.5 shrink-0" />
                    </button>
                  ) : null}
              </div>
            </div>
            <div className="border-t border-borderSoft p-2">
                <div className="mb-2 rounded-lg border border-borderSoft bg-slate-50/60 p-2">
                  <p className="mb-2 text-[12px] font-semibold text-textMain">快捷操作</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" disabled={!canWrite || Boolean(quickAction)} onClick={() => runSourceCheck("connection")} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] font-medium hover:border-primary/30 hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50">{quickAction === "connection" ? <LoaderCircle className="size-3 animate-spin" /> : <Activity className="size-3 text-primary" />}测试连接</button>
                    <button type="button" disabled={!canWrite} onClick={() => toggleSources(true)} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] font-medium hover:border-success/30 hover:bg-success-soft disabled:cursor-not-allowed disabled:opacity-50"><Power className="size-3 text-success" />批量启用</button>
                    <button type="button" disabled={!canWrite} onClick={() => setConfirmAction("disable-sources")} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] font-medium hover:border-warning/30 hover:bg-warning-soft disabled:cursor-not-allowed disabled:opacity-50"><CirclePause className="size-3 text-warning" />批量停用</button>
                    <button type="button" disabled={!canWrite || Boolean(quickAction)} onClick={() => runSourceCheck("health")} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] font-medium hover:border-success/30 hover:bg-success-soft disabled:cursor-not-allowed disabled:opacity-50">{quickAction === "health" ? <LoaderCircle className="size-3 animate-spin" /> : <ShieldCheck className="size-3 text-success" />}健康度检测</button>
                    <button type="button" disabled={!canWrite} onClick={() => setUploadOpen(true)} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] font-medium hover:border-primary/30 hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"><Upload className="size-3 text-primary" />导入数据源</button>
                    <button type="button" onClick={exportSources} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] font-medium hover:border-primary/30 hover:bg-primary-soft"><Download className="size-3 text-primary" />导出清单</button>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-md border border-borderSoft bg-white px-2 py-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 font-medium text-textMain"><Network className="size-3 text-primary" />后台验证队列</span>
                    <span className="flex items-center gap-2"><b className="text-primary">待处理 {validationPending}</b><span className="text-success">完成 {validationCompleted}</span><span className="text-danger">失败 {validationFailed}</span></span>
                  </div>
                </div>
              <button type="button" disabled={!canWrite} className={cn(outlineButton, "w-full")} onClick={() => setDrawer("source")}><Plus className="size-4" />新增数据源</button>
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card ring-1 ring-slate-100/80">
            <div className="flex items-center justify-between gap-3 border-b border-borderSoft px-3 pt-2">
              <div className="flex min-w-0 overflow-x-auto">
                {statusTabs.map((tab) => {
                  const count = tab.value === "all" ? sourceScopedTasks.length : sourceScopedTasks.filter((task) => task.status === tab.value).length;
                  return <button key={tab.value} type="button" onClick={() => setStatus(tab.value)} className={cn("flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[12px] font-medium", status === tab.value ? "border-primary text-primary" : "border-transparent text-textMuted hover:text-textMain")}>{tab.label}<span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", status === tab.value ? "bg-primary-soft" : "bg-slate-100")}>{count}</span></button>;
                })}
              </div>
              <div className="flex shrink-0 items-center gap-2"><span className="text-[11px] text-textMuted">已选 {selectedRows.length} 条</span><button type="button" title="设置表格列" onClick={() => setColumnSettingsOpen(true)} className="flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textMuted hover:border-primary/30 hover:text-primary"><Columns3 className="size-3.5" /></button></div>
            </div>

            <div className="grid gap-2 border-b border-borderSoft bg-slate-50/70 p-2 md:grid-cols-4 xl:grid-cols-8">
              <div className="relative md:col-span-2 xl:col-span-2"><Search className="absolute left-2.5 top-2.5 size-4 text-textMuted" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setAppliedKeyword(keyword)} placeholder="任务编号、名称、供应商…" className="h-9 w-full rounded-md border border-borderSoft bg-white pl-8 pr-3 text-[12px]" /></div>
              <select value={brand} onChange={(event) => setBrand(event.target.value)} className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-2 text-[12px]"><option value="all">供应商 / 品牌</option>{brands.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={selectedMethod} onChange={(event) => { setSelectedMethod(event.target.value); setPage(1); }} className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-2 text-[12px]"><option value="all">全部采集方式</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-2 text-[12px]"><option value="all">设备类别</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={risk} onChange={(event) => setRisk(event.target.value)} className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-2 text-[12px]"><option value="all">风险等级</option><option value="low">低风险</option><option value="medium">中风险</option><option value="high">高风险</option></select>
              <button type="button" className={primaryButton} onClick={() => setAppliedKeyword(keyword)}><Search className="size-4" />查询</button>
              <button type="button" className={outlineButton} onClick={resetFilters}><RotateCcw className="size-4" />重置</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1160px] table-fixed text-[11px] leading-4">
                <thead className="h-9 bg-slate-50 text-left text-textMuted">
                  <tr><th className="w-9 px-2"><input type="checkbox" checked={allSelected} onChange={(event) => setSelectedRows(event.target.checked ? Array.from(new Set([...selectedRows, ...visibleTasks.map((task) => task.id)])) : selectedRows.filter((id) => !visibleTasks.some((task) => task.id === id)))} /></th><th className="w-28 px-2">任务编号</th><th className="w-40 px-2">任务名称</th>{visibleColumns.includes("brand") ? <th className="w-24 px-2">品牌</th> : null}{visibleColumns.includes("method") ? <th className="w-24 px-2">采集方式</th> : null}{visibleColumns.includes("category") ? <th className="w-20 px-2">类别</th> : null}<th className="w-16 px-2">状态</th><th className="w-28 px-2">进度</th>{visibleColumns.includes("pages") ? <th className="w-16 px-2 text-right">已采页面</th> : null}{visibleColumns.includes("parsed") ? <th className="w-16 px-2 text-right">已解析</th> : null}{visibleColumns.includes("pending") ? <th className="w-16 px-2 text-right">待审核</th> : null}{visibleColumns.includes("failed") ? <th className="w-14 px-2 text-right">失败</th> : null}{visibleColumns.includes("lastRun") ? <th className="w-24 px-2">最近运行</th> : null}<th className="w-36 px-2 text-right">操作</th></tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTaskId(task.id)} className={cn("h-12 cursor-pointer border-t border-borderSoft transition-colors hover:bg-primary-soft/45", selectedTask.id === task.id && "bg-primary-soft/70")}>
                      <td className="px-2" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedRows.includes(task.id)} onChange={(event) => setSelectedRows((rows) => event.target.checked ? [...rows, task.id] : rows.filter((id) => id !== task.id))} /></td>
                      <td className="truncate px-2 font-medium text-primary" title={task.taskCode}>{task.taskCode}</td><td className="truncate px-2 font-semibold" title={task.taskName}>{task.taskName}</td>{visibleColumns.includes("brand") ? <td className="truncate px-2">{task.brand}</td> : null}{visibleColumns.includes("method") ? <td className="truncate px-2">{task.collectionMethodName}</td> : null}{visibleColumns.includes("category") ? <td className="truncate px-2">{task.equipmentCategory}</td> : null}<td className="px-2"><StatusPill status={task.status} /></td><td className="px-2"><ProgressBar value={task.progress} tone={task.status === "failed" ? "red" : task.status === "completed" ? "green" : "blue"} /></td>{visibleColumns.includes("pages") ? <td className="px-2 text-right">{task.collectedPages}</td> : null}{visibleColumns.includes("parsed") ? <td className="px-2 text-right">{task.parsedEquipment}</td> : null}{visibleColumns.includes("pending") ? <td className="px-2 text-right font-medium text-warning">{task.pendingReview}</td> : null}{visibleColumns.includes("failed") ? <td className="px-2 text-right font-medium text-danger">{task.failedCount}</td> : null}{visibleColumns.includes("lastRun") ? <td className="truncate px-2 text-textMuted">{task.lastRunAt.slice(5)}</td> : null}
                      <td className="px-2" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-end gap-1"><Link href={`/equipment-catalog/collection/tasks/${task.id}`} title="查看任务详情" className="flex size-7 items-center justify-center rounded-md border border-borderSoft text-primary hover:bg-primary-soft"><FileSearch className="size-3.5" /></Link>{task.status === "running" ? <button type="button" title="暂停" className="flex size-7 items-center justify-center rounded-md border border-borderSoft hover:bg-warning-soft" onClick={() => setTaskStatus(task.id, "paused", "任务已暂停")}><Pause className="size-3.5" /></button> : task.status === "failed" ? <button type="button" title="重试" className="flex size-7 items-center justify-center rounded-md border border-borderSoft hover:bg-danger-soft" onClick={() => retryTask(task.id)}>{loadingTask === task.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}</button> : <button type="button" title="继续运行" className="flex size-7 items-center justify-center rounded-md border border-borderSoft hover:bg-success-soft" onClick={() => setTaskStatus(task.id, "running", "任务已继续运行")}><Play className="size-3.5" /></button>}<button type="button" title="查看日志" className="flex size-7 items-center justify-center rounded-md border border-borderSoft hover:bg-slate-100" onClick={() => { setSelectedTaskId(task.id); setDrawer("logs"); }}><Logs className="size-3.5" /></button>{!["running", "completed"].includes(task.status) ? <button type="button" title="删除未使用任务" disabled={loadingTask === task.id} className="flex size-7 items-center justify-center rounded-md border border-danger/20 text-danger hover:bg-danger-soft disabled:opacity-50" onClick={() => { setActionTaskId(task.id); setConfirmAction("delete-task"); }}><Trash2 className="size-3.5" /></button> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredTasks.length ? <div className="p-8"><EmptyState title="没有匹配的采集任务" description="请调整筛选条件或新建采集任务。" /></div> : null}
            </div>
            <div className="flex min-h-11 items-center justify-between border-t border-borderSoft px-3 text-[11px] text-textMuted">
              <span>共 {filteredTasks.length} 条，当前第 {currentPage} / {pageCount} 页，本页 {visibleTasks.length} 条</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="size-7 rounded-md border border-borderSoft disabled:opacity-40">‹</button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button key={item} type="button" onClick={() => setPage(item)} className={cn("size-7 rounded-md border", currentPage === item ? "border-primary bg-primary text-white" : "border-borderSoft bg-white")}>{item}</button>)}
                <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="size-7 rounded-md border border-borderSoft disabled:opacity-40">›</button>
                <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-7 rounded-md border border-borderSoft px-2"><option value={10}>10 条/页</option><option value={20}>20 条/页</option></select>
              </div>
            </div>
          </section>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card ring-1 ring-slate-100/80">
              <ModuleHeader icon={Activity} title="任务详情" subtitle={selectedTask.taskCode} density="compact" action={<StatusPill status={selectedTask.status} />} />
              <div className="mt-3 rounded-lg border border-primary/15 bg-primary-soft/55 p-3.5">
                <div className="flex items-center gap-3"><IconBox icon={Boxes} tone="blue" size="md" /><div className="min-w-0"><p className="truncate text-[13px] font-semibold">{selectedTask.taskName}</p><p className="mt-0.5 truncate text-[11px] text-textMuted">{selectedTask.brand} · {sourceTypeLabels[selectedTask.sourceType]}</p></div></div>
                <p className="mt-3 text-[12px] leading-5 text-textMuted">{selectedTask.collectionScope}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-success-soft p-2"><p className="text-[16px] font-bold text-success">{selectedTask.sourceHealth}%</p><p className="text-[10px] text-textMuted">来源健康</p></div><div className="rounded-lg bg-ai-soft p-2"><p className="text-[16px] font-bold text-ai">{selectedTask.aiConfidence}%</p><p className="text-[10px] text-textMuted">AI置信度</p></div><div className="rounded-lg bg-warning-soft p-2"><p className="text-[16px] font-bold text-warning">{selectedTask.pendingReview}</p><p className="text-[10px] text-textMuted">待审核</p></div></div>
            </section>

            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card ring-1 ring-slate-100/80">
              <ModuleHeader icon={Gauge} title="任务进度" subtitle={`当前阶段：${selectedTask.currentStage}`} density="compact" />
              <div className="mt-3 flex items-center gap-4"><div className="relative flex size-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#1677ff ${selectedTask.progress * 3.6}deg,#e8eef7 0)` }}><div className="flex size-16 flex-col items-center justify-center rounded-full bg-white"><strong className="text-[18px] text-primary">{selectedTask.progress}%</strong><span className="text-[10px] text-textMuted">完成度</span></div></div><div className="min-w-0 flex-1 space-y-2 text-[11px]"><p className="flex justify-between"><span className="text-textMuted">下次运行</span><strong>{selectedTask.nextRunAt.slice(5)}</strong></p><p className="flex justify-between"><span className="text-textMuted">采集频率</span><strong>{selectedTask.frequency}</strong></p><p className="flex justify-between"><span className="text-textMuted">失败记录</span><strong className="text-danger">{selectedTask.failedCount}</strong></p></div></div>
              <div className="relative mt-4 grid grid-cols-5 gap-0">
                <div className="absolute left-[10%] right-[10%] top-[7px] h-px bg-borderSoft" />
                <div className="absolute left-[10%] top-[7px] h-px bg-primary transition-all" style={{ width: `${selectedStageIndex * 20}%` }} />
                {progressStages.map((stage, index) => (
                  <div key={stage} className="relative z-10 flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <span className={cn("size-3.5 rounded-full border-2", index <= selectedStageIndex ? "border-primary bg-primary" : "border-slate-300 bg-white", index === selectedStageIndex && "ring-4 ring-primary/10")} />
                    <span className={cn("w-full truncate px-0.5 text-[10px]", index <= selectedStageIndex ? "font-medium text-primary" : "text-textMuted")} title={stage}>{stage}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1"><button type="button" title={selectedTask.status === "running" ? "暂停任务" : "继续任务"} className={outlineButton} onClick={() => setTaskStatus(selectedTask.id, selectedTask.status === "running" ? "paused" : "running", selectedTask.status === "running" ? "任务已暂停" : "任务已继续运行")}>{selectedTask.status === "running" ? <CirclePause className="size-4" /> : <CirclePlay className="size-4" />}</button><button type="button" title="重新执行任务" className={outlineButton} onClick={() => retryTask(selectedTask.id)}><RefreshCw className="size-4" /></button><button type="button" title="设置采集频率" className={outlineButton} onClick={() => setDrawer("frequency")}><Clock3 className="size-4" /></button><button type="button" title="查看运行日志" className={outlineButton} onClick={() => setDrawer("logs")}><Logs className="size-4" /></button></div>
            </section>

            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card ring-1 ring-slate-100/80">
              <ModuleHeader icon={Activity} title="运行概况" subtitle="当前任务实时采集指标" tone="green" density="compact" />
              <div className="mt-3 grid grid-cols-4 divide-x divide-borderSoft rounded-lg border border-borderSoft bg-slate-50 px-1 py-3 text-center">
                <div className="min-w-0 px-1"><p className="truncate text-[14px] font-bold text-primary">{Math.max(180, 760 - selectedTask.sourceHealth * 2)}ms</p><p className="mt-1 truncate text-[10px] text-textMuted">平均响应</p></div>
                <div className="min-w-0 px-1"><p className="truncate text-[14px] font-bold text-success">{Math.max(0, 100 - selectedTask.failedCount)}%</p><p className="mt-1 truncate text-[10px] text-textMuted">成功率</p></div>
                <div className="min-w-0 px-1"><p className="truncate text-[14px] font-bold text-danger">{selectedTask.failedCount}%</p><p className="mt-1 truncate text-[10px] text-textMuted">失败率</p></div>
                <div className="min-w-0 px-1"><p className="truncate text-[14px] font-bold text-ai">{selectedTask.collectedPages.toLocaleString()}</p><p className="mt-1 truncate text-[10px] text-textMuted">今日记录</p></div>
              </div>
            </section>

            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card ring-1 ring-slate-100/80">
              <ModuleHeader icon={History} title="最新日志" subtitle="最近 3 条运行记录" density="compact" action={<button type="button" className="text-[11px] font-medium text-primary" onClick={() => setDrawer("logs")}>全部日志</button>} />
              <div className="mt-3 space-y-2">{selectedTask.logs.map((log) => <div key={log.id} className="flex gap-2 text-[11px]"><span className={cn("mt-1 size-2 shrink-0 rounded-full", log.level === "warning" ? "bg-warning" : log.level === "error" ? "bg-danger" : log.level === "success" ? "bg-success" : "bg-primary")} /><div className="min-w-0"><p className="line-clamp-2 text-textMain">{log.message}</p><p className="mt-0.5 text-textMuted">{log.time}</p></div></div>)}</div>
            </section>

            <section className="rounded-card border border-ai-border bg-ai-soft/80 p-4 shadow-card ring-1 ring-ai/5">
              <ModuleHeader icon={WandSparkles} title="推荐操作" subtitle="AI辅助，需人工最终确认" tone="purple" density="compact" />
              <div className="mt-3 grid grid-cols-2 gap-2"><Link href={`/equipment-catalog?taskId=${selectedTask.id}`} className={cn(outlineButton, "bg-white")}>查看采集结果</Link><Link href={`/equipment-catalog/reviews?taskId=${selectedTask.id}`} className={cn(outlineButton, "bg-white")}>进入资料审核</Link><button type="button" className={cn(outlineButton, "bg-white")} onClick={() => setDrawer("source")}>补充数据源</button><button type="button" className={cn(outlineButton, "border-danger/20 bg-white text-danger")} onClick={() => setConfirmAction("archive-task")}>归档任务</button></div>
            </section>
          </aside>
        </section>

        <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card ring-1 ring-slate-100/80">
            <div className="p-3 pb-2"><ModuleHeader icon={Boxes} title="最近解析设备（近 7 天）" density="compact" action={<Link href="/equipment-catalog" className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">查看更多 <ChevronRight className="size-3" /></Link>} /></div>
            <div className="grid grid-cols-[minmax(88px,1.25fr)_64px_68px_50px_48px_70px] gap-1 border-y border-borderSoft bg-slate-50 px-3 py-1.5 text-[10px] text-textMuted"><span>设备名称</span><span>品牌</span><span>型号</span><span>来源</span><span className="text-right">解析数量</span><span className="text-right">解析时间</span></div>
            <div className="px-2 py-1">
              {recentExtractedEquipment.slice(0, 5).map((item) => {
                const task = tasks.find((entry) => entry.id === item.taskId);
                return (
                  <button key={item.id} type="button" className="grid w-full grid-cols-[minmax(88px,1.25fr)_64px_68px_50px_48px_70px] items-center gap-1 rounded-md px-1.5 py-1.5 text-left text-[10px] hover:bg-primary-soft" onClick={() => emitMockToast({ title: "已定位候选资料", description: `${item.name} · ${item.model}`, tone: "info" })}>
                    <span className="truncate font-medium" title={item.name}>{item.name}</span>
                    <span className="truncate text-textMuted" title={item.brand}>{item.brand}</span>
                    <span className="truncate font-medium text-[#536a85]" title={item.model}>{item.model}</span>
                    <span className="truncate text-textMuted" title={task ? sourceTypeLabels[task.sourceType] : "AI解析"}>{task ? sourceTypeLabels[task.sourceType].replace("厂家官网", "官网").replace("PDF样本", "PDF").replace("产品目录", "目录") : "AI解析"}</span>
                    <span className="text-right font-semibold text-textMain">{task?.parsedEquipment ?? 0}</span>
                    <span className="truncate text-right text-textMuted">{task?.lastRunAt.slice(5) ?? "--"}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card ring-1 ring-slate-100/80">
            <div className="p-3 pb-2"><ModuleHeader icon={ClipboardCheck} title={`待审核资料（${pendingCatalogReviews.length}）`} tone="orange" density="compact" action={<Link href="/equipment-catalog/reviews" className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">查看更多 <ChevronRight className="size-3" /></Link>} /></div>
            <div className="grid grid-cols-[minmax(78px,1fr)_42px_46px_42px_54px_66px] gap-1 border-y border-borderSoft bg-slate-50 px-3 py-1.5 text-[10px] text-textMuted"><span>资料名称</span><span>来源</span><span>类别</span><span className="text-right">待审核数</span><span className="text-center">风险等级</span><span className="text-right">操作</span></div>
            <div className="px-2 py-1">
              {pendingCatalogReviews.slice(0, 5).map((item) => {
                const task = tasks.find((entry) => entry.id === item.taskId);
                return (
                  <div key={item.id} className="grid grid-cols-[minmax(78px,1fr)_42px_46px_42px_54px_66px] items-center gap-1 rounded-md px-1.5 py-1 text-[10px] hover:bg-warning-soft/45">
                    <span className="truncate font-medium" title={`${item.name} · 缺失 ${item.missingParameters}`}>{item.name}</span>
                    <span className="truncate text-textMuted" title={task ? sourceTypeLabels[task.sourceType] : "AI解析"}>{task ? sourceTypeLabels[task.sourceType].replace("厂家官网", "官网").replace("PDF样本", "PDF").replace("产品目录", "目录") : "AI"}</span>
                    <span className="truncate text-textMuted" title={task?.equipmentCategory}>{task?.equipmentCategory.replace("设备", "") ?? "综合"}</span>
                    <span className="text-right font-semibold text-textMain">{task?.pendingReview ?? 0}</span>
                    <span className="flex justify-center"><RiskBadge level={item.riskLevel} className="h-5 px-1 text-[10px]" /></span>
                    <span className="flex justify-end gap-1"><Link href={`/equipment-catalog/reviews?taskId=${item.taskId}`} className="rounded border border-primary/20 bg-white px-1.5 py-1 font-medium text-primary hover:bg-primary-soft">审核</Link><button type="button" className="rounded border border-ai-border bg-white px-1.5 py-1 font-medium text-ai hover:bg-ai-soft" onClick={() => emitMockToast({ title: "AI补全已启动", description: `${item.name}：正在识别 ${item.missingParameters}`, tone: "ai" })}>AI补</button></span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card ring-1 ring-slate-100/80">
            <div className="p-3 pb-2"><ModuleHeader icon={ShieldAlert} title={`失败重试队列（${collectionFailures.length}）`} tone="red" density="compact" action={<button type="button" onClick={() => { setStatus("failed"); window.scrollTo({ top: 300, behavior: "smooth" }); }} className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">查看更多 <ChevronRight className="size-3" /></button>} /></div>
            <div className="grid grid-cols-[minmax(86px,1.2fr)_80px_70px_42px_38px] gap-1 border-y border-borderSoft bg-slate-50 px-3 py-1.5 text-[10px] text-textMuted"><span>任务名称</span><span>失败原因</span><span>失败时间</span><span className="text-right">重试次数</span><span className="text-right">操作</span></div>
            <div className="px-2 py-1">
              {collectionFailures.slice(0, 5).map((item) => {
                const task = tasks.find((entry) => entry.id === item.taskId);
                return (
                  <div key={item.id} className="grid grid-cols-[minmax(86px,1.2fr)_80px_70px_42px_38px] items-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] hover:bg-danger-soft/35">
                    <span className="truncate font-medium" title={task?.taskName ?? item.sourceName}>{task?.taskName ?? item.sourceName}</span>
                    <span className="truncate text-danger" title={item.reason}>{item.reason}</span>
                    <span className="truncate text-textMuted">{item.failedAt}</span>
                    <span className="text-right font-semibold text-textMain">{item.retryCount}</span>
                    <button type="button" className="text-right font-medium text-primary" onClick={() => retryTask(item.taskId)}>重试</button>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="min-w-0 rounded-card border border-borderSoft bg-white p-4 shadow-card ring-1 ring-slate-100/80">
            <ModuleHeader
              icon={Activity}
              title="来源质量与健康矩阵"
              subtitle={selectedSourceGroup ? `${selectedSourceGroup.label} · 已联动任务列表` : "每个数据源仅计一次，点击来源行联动任务列表"}
              tone="green"
              density="compact"
              action={selectedSourceGroup ? (
                <button
                  type="button"
                  onClick={() => { setSelectedSourceType("all"); setPage(1); }}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-[10px] font-medium text-primary hover:bg-primary/10"
                >
                  <RotateCcw className="size-3" />恢复全部
                </button>
              ) : null}
            />
            <div className="mt-3 grid grid-cols-[74px_repeat(4,minmax(0,1fr))] overflow-hidden rounded-md border border-borderSoft text-center text-[10px]">
              <button type="button" onClick={() => { setSelectedSourceType("all"); setPage(1); }} className="bg-slate-50 px-1 py-1.5 text-left font-medium text-textMuted hover:bg-primary-soft hover:text-primary">来源</button>
              {[
                ["优秀", "bg-success-soft text-success"],
                ["良好", "bg-primary-soft text-primary"],
                ["一般", "bg-warning-soft text-warning"],
                ["较差", "bg-danger-soft text-danger"],
              ].map(([label, classes]) => <div key={label} className={cn("px-1 py-1.5 font-medium", classes)}>{label}</div>)}
              {configuredSourceGroups.map((group) => {
                const isSelected = selectedSourceType === group.type;
                return (
                  <button
                    key={group.type}
                    type="button"
                    onClick={() => {
                      setSelectedSourceType(group.type);
                      setPage(1);
                      emitMockToast({ title: "已联动任务筛选", description: `任务列表已切换为「${group.label}」来源。`, tone: "info" });
                      window.scrollTo({ top: 300, behavior: "smooth" });
                    }}
                    className="contents group"
                  >
                    <span className={cn("truncate border-t border-borderSoft px-1.5 py-2 text-left font-medium transition-colors", isSelected ? "bg-primary text-white" : "bg-white group-hover:bg-slate-50")} title={group.label}>{group.label}</span>
                    {group.matrix.map((value, index) => (
                      <span key={`${group.type}-${index}`} className={cn("border-t border-l border-borderSoft px-1 py-2 font-semibold transition-all group-hover:brightness-95", index === 0 ? "bg-success-soft text-success" : index === 1 ? "bg-primary-soft text-primary" : index === 2 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger", isSelected && "ring-2 ring-inset ring-primary/35")}>{value}</span>
                    ))}
                  </button>
                );
              })}
            </div>
          </section>
        </section>
      </div>

      <CollectionDrawer kind={drawer} task={selectedTask} sources={sources} methods={methods} onClose={() => setDrawer(null)} onSwitch={setDrawer} onAddSource={createSource} onAddMethod={createMethod} onAddTask={createTask} />
      <OverlayShell open={uploadOpen} onClose={() => { setUploadOpen(false); setSourceImportFile(null); }} ariaLabel="导入设备资料数据源">
        <div className="border-b border-borderSoft px-5 py-4"><h2 className="text-[16px] font-semibold">导入数据源</h2><p className="mt-1 text-[12px] text-textMuted">支持 CSV / JSON，最多导入 100 条；新来源默认停用并等待连接验证。</p></div>
        <div className="space-y-4 p-5">
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-primary/35 bg-primary-soft/60 p-5 text-center">
            <Upload className="size-8 text-primary" />
            <span className="mt-3 text-[13px] font-semibold text-primary">{sourceImportFile?.name ?? "选择 CSV 或 JSON 文件"}</span>
            <span className="mt-1 text-[11px] text-textMuted">必填列：name、baseUrl；可选：sourceCode、sourceKind、brand、supplierName、equipmentCategory</span>
            <input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={(event) => setSourceImportFile(event.target.files?.[0] ?? null)} />
          </label>
          <section className="overflow-hidden rounded-card border border-borderSoft">
            <div className="flex items-center justify-between border-b border-borderSoft bg-slate-50 px-3 py-2"><div><p className="text-[12px] font-semibold">导入历史</p><p className="text-[10px] text-textMuted">保留最近 20 个批次及逐行失败原因</p></div><History className="size-4 text-primary" /></div>
            <div className="max-h-44 overflow-y-auto">
              {importHistory.length ? importHistory.map((batch) => (
                <div key={batch.id} className="grid grid-cols-[minmax(0,1fr)_72px_76px] items-center gap-2 border-b border-borderSoft px-3 py-2 text-[11px] last:border-b-0">
                  <div className="min-w-0"><p className="truncate font-medium" title={batch.fileName}>{batch.fileName}</p><p className="mt-0.5 text-[10px] text-textMuted">{batch.batchCode} · {batch.createdAt ? new Date(batch.createdAt).toLocaleString("zh-CN", { hour12: false }) : "--"}</p></div>
                  <div className="text-right"><p className="font-semibold text-success">成功 {batch.successRows}</p><p className={cn("text-[10px]", batch.failedRows ? "text-danger" : "text-textMuted")}>失败 {batch.failedRows}</p></div>
                  {batch.failedRows ? <a href={`/api/price-collection/source-imports?download=${batch.id}`} className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-danger/20 bg-danger-soft px-2 font-medium text-danger hover:bg-danger/10"><Download className="size-3" />错误明细</a> : <span className="text-center text-[10px] text-success">全部成功</span>}
                </div>
              )) : <p className="px-3 py-5 text-center text-[11px] text-textMuted">暂无导入历史</p>}
            </div>
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-borderSoft px-5 py-4"><button type="button" className={outlineButton} onClick={() => { setUploadOpen(false); setSourceImportFile(null); }}>取消</button><button type="button" disabled={!sourceImportFile || sourceImporting} className={primaryButton} onClick={importSources}>{sourceImporting ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}确认导入</button></div>
      </OverlayShell>
      <OverlayShell open={columnSettingsOpen} onClose={() => setColumnSettingsOpen(false)} ariaLabel="设置任务表格列">
        <div className="border-b border-borderSoft px-5 py-4"><h2 className="text-[16px] font-semibold">表格列设置</h2><p className="mt-1 text-[12px] text-textMuted">任务编号、任务名称、状态、进度和操作为固定列。</p></div>
        <div className="grid grid-cols-2 gap-2 p-5">
          {([
            ["brand", "品牌"], ["method", "采集方式"], ["category", "设备类别"], ["pages", "已采页面"],
            ["parsed", "已解析数量"], ["pending", "待审核数量"], ["failed", "失败数量"], ["lastRun", "最近运行"],
          ] as Array<[OptionalTaskColumn, string]>).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-borderSoft p-3 text-[12px] hover:bg-slate-50"><input type="checkbox" checked={visibleColumns.includes(value)} onChange={(event) => setVisibleColumns((items) => event.target.checked ? [...items, value] : items.filter((item) => item !== value))} /><span>{label}</span></label>
          ))}
        </div>
        <div className="flex justify-between border-t border-borderSoft px-5 py-4"><button type="button" className={outlineButton} onClick={() => setVisibleColumns(["brand", "method", "category", "pages", "parsed", "pending", "failed", "lastRun"])}>恢复默认</button><button type="button" className={primaryButton} onClick={() => { setColumnSettingsOpen(false); emitMockToast({ title: "表格列设置已保存", description: "列设置将在当前浏览器中保留。", tone: "success" }); }}>完成</button></div>
      </OverlayShell>
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction === "delete-task" ? "确认删除未使用任务？" : confirmAction === "archive-task" ? "确认归档采集任务？" : "确认批量停用数据源？"}
        description={confirmAction === "delete-task"
          ? `将删除 ${actionTask.taskCode}。系统会先检查是否已有候选资料或价格线索；存在业务成果时将拒绝删除并提示改为归档。`
          : confirmAction === "archive-task"
            ? `将归档 ${selectedTask.taskCode}，归档后不会继续自动调度。`
            : `将停用当前范围内 ${sources.filter((source) => selectedSourceType === "all" || source.type === selectedSourceType).length} 个数据源，相关定时任务将无法继续采集。`}
        confirmLabel={confirmAction === "delete-task" ? "确认删除" : confirmAction === "archive-task" ? "确认归档" : "确认停用"}
        tone={confirmAction === "delete-task" || confirmAction === "archive-task" ? "danger" : "warning"}
        onCancel={() => { setConfirmAction(null); setActionTaskId(null); }}
        onConfirm={() => {
          if (confirmAction === "archive-task") {
            setTaskStatus(selectedTask.id, "archived", "任务已归档");
          } else if (confirmAction === "delete-task") {
            void deleteTask(actionTask);
          } else if (confirmAction === "disable-sources") {
            toggleSources(false);
          }
          setConfirmAction(null);
          setActionTaskId(null);
        }}
      />
    </AppLayout>
  );
}
