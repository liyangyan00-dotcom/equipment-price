"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Download,
  FileBarChart2,
  FileCheck2,
  FileText,
  FolderArchive,
  Layers3,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useMockToast } from "@/hooks/useMockToast";
import { useRouteContext } from "@/hooks/useRouteContext";
import { createClient } from "@/lib/supabase/client";
import {
  buildStructuredReportChapters,
  getReportTemplateSpec,
} from "@/lib/reports/reportTemplates";
import { cn } from "@/lib/utils";
import type { AnalyticsPayload } from "@/types/analytics";
import type { AiExecutionTaskDetail } from "@/types/aiExecution";

type Tone = "blue" | "green" | "orange" | "red" | "cyan" | "purple";

type ReportKpi = {
  label: string;
  value: string;
  unit: string;
  trend: string;
  caption: string;
  tone: Tone;
  icon: LucideIcon;
};

type TemplateCard = {
  title: string;
  description: string;
  usage: number;
  icon: LucideIcon;
  tone: IconBoxTone;
  accent: string;
  outline: string[];
  defaultSource: string;
  defaultConfidence: number;
  defaultRisk: boolean;
  defaultAttachments: boolean;
};

type ReportFormat = "打印/另存PDF" | "预览" | "编辑" | "删除";
type ReportFileKind = "word" | "pdf" | "risk" | "decision";

type GeneratedReport = {
  id: string;
  databaseId?: string;
  title: string;
  project: string;
  time: string;
  status: "completed" | "needs_info";
  fileKind: ReportFileKind;
  formats: ReportFormat[];
  reportType: string;
  rawStatus: string;
  updatedAt: string;
  riskLevel: string;
};

type LinkedBusinessContext = {
  kind: "project_pricing" | "comparison" | "inquiry";
  id: string;
  data: Record<string, unknown>;
  detail?: Record<string, unknown>;
};

type ReportSummary = {
  total: number;
  draft: number;
  pendingReview: number;
  approved: number;
  archived: number;
};

const toneStyles: Record<
  Tone,
  {
    text: string;
    soft: string;
    border: string;
    icon: IconBoxTone;
  }
> = {
  blue: {
    text: "text-primary",
    soft: "bg-primary-soft",
    border: "border-primary/15",
    icon: "blue",
  },
  green: {
    text: "text-success",
    soft: "bg-success-soft",
    border: "border-success/20",
    icon: "green",
  },
  orange: {
    text: "text-warning",
    soft: "bg-warning-soft",
    border: "border-warning/20",
    icon: "orange",
  },
  red: {
    text: "text-danger",
    soft: "bg-danger-soft",
    border: "border-danger/20",
    icon: "red",
  },
  cyan: {
    text: "text-[#00A6B8]",
    soft: "bg-cyan-50",
    border: "border-cyan-300/30",
    icon: "cyan",
  },
  purple: {
    text: "text-ai",
    soft: "bg-ai-soft",
    border: "border-ai/20",
    icon: "purple",
  },
};

const reportKpiVisuals: Omit<ReportKpi, "value" | "trend">[] = [
  {
    label: "已生成报告",
    unit: "份",
    caption: "AI已完成报告",
    tone: "blue",
    icon: FileCheck2,
  },
  {
    label: "本月报告",
    unit: "份",
    caption: "本月生成",
    tone: "green",
    icon: CalendarDays,
  },
  {
    label: "待补充数据",
    unit: "份",
    caption: "缺少证据",
    tone: "orange",
    icon: FileBarChart2,
  },
  {
    label: "高风险报告",
    unit: "份",
    caption: "需人工复核",
    tone: "red",
    icon: ShieldAlert,
  },
  {
    label: "可导出报告",
    unit: "份",
    caption: "审核后可打印",
    tone: "cyan",
    icon: Download,
  },
  {
    label: "报告模板",
    unit: "个",
    caption: "覆盖主要场景",
    tone: "purple",
    icon: Layers3,
  },
];

const templates: TemplateCard[] = [
  {
    title: "项目成本分析报告",
    description: "全面分析项目成本构成与价格趋势",
    usage: 128,
    icon: BarChart3,
    tone: "green",
    accent: "from-emerald-500 to-green-400",
    outline: getReportTemplateSpec("项目成本分析报告").chapters.map(
      (chapter) => chapter.title,
    ),
    defaultSource: "项目套价与 BOQ 数据",
    defaultConfidence: 75,
    defaultRisk: true,
    defaultAttachments: true,
  },
  {
    title: "设备价格对比报告",
    description: "多供应商型号设备价格对比分析",
    usage: 96,
    icon: FileBarChart2,
    tone: "blue",
    accent: "from-blue-600 to-sky-400",
    outline: getReportTemplateSpec("设备价格对比报告").chapters.map(
      (chapter) => chapter.title,
    ),
    defaultSource: "询价与比价数据",
    defaultConfidence: 80,
    defaultRisk: true,
    defaultAttachments: true,
  },
  {
    title: "风险评估报告",
    description: "识别价格波动与供应链风险并给出建议",
    usage: 74,
    icon: ShieldAlert,
    tone: "red",
    accent: "from-red-500 to-orange-400",
    outline: getReportTemplateSpec("风险评估报告").chapters.map(
      (chapter) => chapter.title,
    ),
    defaultSource: "供应商与附件证据",
    defaultConfidence: 70,
    defaultRisk: true,
    defaultAttachments: true,
  },
  {
    title: "采购决策建议报告",
    description: "基于数据分析的采购决策建议与策略",
    usage: 62,
    icon: ShoppingCart,
    tone: "purple",
    accent: "from-ai to-violet-400",
    outline: getReportTemplateSpec("采购决策建议报告").chapters.map(
      (chapter) => chapter.title,
    ),
    defaultSource: "询价与比价数据",
    defaultConfidence: 85,
    defaultRisk: true,
    defaultAttachments: true,
  },
  {
    title: "月度价格监测报告",
    description: "月度价格走势监测与市场分析",
    usage: 58,
    icon: TrendingUp,
    tone: "cyan",
    accent: "from-cyan-500 to-sky-400",
    outline: getReportTemplateSpec("月度价格监测报告").chapters.map(
      (chapter) => chapter.title,
    ),
    defaultSource: "机电设备价格库 + 地材价格库",
    defaultConfidence: 60,
    defaultRisk: true,
    defaultAttachments: false,
  },
];

type ReportConfig = {
  type: string;
  project: string;
  startDate: string;
  endDate: string;
  source: string;
  confidence: number;
  includeRisk: boolean;
  includeAttachments: boolean;
};

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createInitialConfig(): ReportConfig {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  const template = templates[0];
  return {
    type: template.title,
    project: "全项目汇总",
    startDate: dateInputValue(start),
    endDate: dateInputValue(end),
    source: template.defaultSource,
    confidence: template.defaultConfidence,
    includeRisk: template.defaultRisk,
    includeAttachments: template.defaultAttachments,
  };
}

function CardShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-borderSoft bg-card shadow-card",
        className,
      )}
    >
      {children}
    </section>
  );
}

function ReportWorkflowSteps({
  canGenerate,
  hasTask,
}: {
  canGenerate: boolean;
  hasTask: boolean;
}) {
  const steps = [
    { title: "选择模板", detail: "确定报告结构", complete: true },
    {
      title: "配置与预览",
      detail: canGenerate ? "数据满足生成条件" : "检查数据与阈值",
      complete: canGenerate,
    },
    {
      title: "生成与审核",
      detail: hasTask ? "AI任务已创建" : "生成后进入人工审核",
      complete: hasTask,
    },
  ];
  return (
    <nav
      aria-label="报告生成流程"
      className="grid overflow-hidden rounded-card border border-borderSoft bg-white md:grid-cols-3"
    >
      {steps.map((step, index) => (
        <div
          key={step.title}
          className={cn(
            "flex min-h-16 items-center gap-3 px-4 py-3",
            index > 0 && "border-t border-borderSoft md:border-l md:border-t-0",
            step.complete && "bg-success-soft/35",
          )}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
              step.complete
                ? "bg-success text-white"
                : "bg-slate-100 text-textMuted",
            )}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-textMain">{step.title}</p>
            <p className="truncate text-[11px] text-textMuted">{step.detail}</p>
          </div>
        </div>
      ))}
    </nav>
  );
}

function GenerationTaskStatus({ task }: { task: AiExecutionTaskDetail }) {
  const stageLabels: Record<string, string> = {
    accepted: "任务已受理",
    loading_config: "加载模型与提示词",
    calling_provider: "AI正在生成章节",
    validating_output: "校验章节和证据结构",
    persisting_result: "写入报告与审核队列",
    awaiting_review: "等待人工审核",
    completed: "任务已完成",
    failed: "任务执行失败",
  };
  return (
    <section
      className="rounded-card border border-ai-border bg-white px-4 py-3"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBox icon={Sparkles} tone="purple" size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-textMain">
              {task.task_code} · {task.title}
            </p>
            <p className="text-[11px] text-textMuted">
              {stageLabels[task.stage] ?? task.stage}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-ai">
            {task.progress}%
          </span>
          <Link
            href={`/ai-workbench?workflow=report_generation&taskId=${encodeURIComponent(task.id)}`}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-ai-border px-3 text-[11px] font-bold text-ai"
          >
            查看AI任务 <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ai-soft">
        <div
          className="h-full bg-ai transition-[width] duration-200"
          style={{ width: `${Math.max(0, Math.min(100, task.progress))}%` }}
        />
      </div>
      {task.error_message ? (
        <p className="mt-2 text-[11px] font-semibold text-danger">
          {task.error_message}
        </p>
      ) : null}
    </section>
  );
}

function ReportKpiGrid({
  items,
  onSelect,
}: {
  items: ReportKpi[];
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {items.map((item, index) => {
        const style = toneStyles[item.tone];

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              "relative min-h-[112px] overflow-hidden rounded-card border bg-gradient-to-br from-white via-white to-slate-50 px-4 py-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/30",
              style.border,
            )}
          >
            <span
              className={cn(
                "pointer-events-none absolute -right-8 -top-10 size-24 rounded-full blur-2xl",
                style.soft,
              )}
            />
            <div className="relative flex h-full items-center gap-3">
              <IconBox
                icon={item.icon}
                tone={style.icon}
                size="lg"
                className="size-14 rounded-[17px] [&_svg]:size-7"
              />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-[14px] font-bold", style.text)}>
                  {item.label}
                </p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span
                    className={cn(
                      "text-[31px] font-bold leading-none",
                      style.text,
                    )}
                  >
                    {item.value}
                  </span>
                  <span
                    className={cn("mb-1 text-[12px] font-semibold", style.text)}
                  >
                    {item.unit}
                  </span>
                </div>
                <p className="mt-2 truncate text-[11px] font-semibold text-textMuted">
                  {item.trend}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ReportTemplateVisual({
  icon: Icon,
  tone,
  accent,
}: {
  icon: LucideIcon;
  tone: IconBoxTone;
  accent: string;
}) {
  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/70">
      <span
        className={cn(
          "absolute inset-1 rounded-[14px] bg-gradient-to-br opacity-95",
          accent,
        )}
      />
      <span className="absolute left-2 top-2 size-2 rounded-full bg-white/70 blur-[1px]" />
      <Icon
        className="relative z-10 size-7 text-white drop-shadow-[0_3px_8px_rgba(15,23,42,0.25)]"
        aria-hidden="true"
      />
      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-white bg-white shadow-sm">
        <IconBox
          icon={Sparkles}
          tone={tone}
          size="sm"
          className="size-4 rounded-full [&_svg]:size-2.5"
        />
      </span>
    </div>
  );
}

function TemplateLibrary({
  items,
  selected,
  onSelect,
}: {
  items: TemplateCard[];
  selected: string;
  onSelect: (template: TemplateCard) => void;
}) {
  return (
    <CardShell className="overflow-hidden p-4">
      <ModuleHeader
        icon={Layers3}
        title="报告模板库"
        tone="blue"
        density="compact"
      />
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((template) => (
          <div
            key={template.title}
            className={cn(
              "group relative flex min-h-[142px] flex-col overflow-hidden rounded-card border bg-gradient-to-br from-white via-white to-[#F8FAFF] p-4 transition hover:-translate-y-0.5 hover:border-primary/20",
              selected === template.title
                ? "border-ai bg-ai-soft/30 ring-1 ring-ai/20"
                : "border-borderSoft",
            )}
          >
            <span
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl",
                template.accent,
              )}
            />
            <div className="relative flex items-start gap-3">
              <ReportTemplateVisual
                icon={template.icon}
                tone={template.tone}
                accent={template.accent}
              />
              <div className="min-w-0">
                <div className="min-h-10 line-clamp-2 text-[14px] font-bold leading-5 text-textMain">
                  {template.title}
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-textMuted">
                  {template.description}
                </p>
              </div>
            </div>
            <div className="relative mt-auto flex items-center justify-between border-t border-borderSoft/80 pt-3">
              <span className="text-[12px] font-semibold text-textMuted">
                {template.outline.length} 个章节 · 使用 {template.usage} 次
              </span>
              <button
                onClick={() => onSelect(template)}
                className={cn(
                  "inline-flex h-8 min-w-[70px] items-center justify-center rounded-md border px-3 text-[12px] font-bold transition",
                  selected === template.title
                    ? "border-ai bg-ai text-white"
                    : "border-primary/20 bg-white text-primary group-hover:bg-primary group-hover:text-white",
                )}
                type="button"
              >
                {selected === template.title ? "已选择" : "使用"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function FieldRow({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold text-textSecondary">
      <span>
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function ConfigSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textMain outline-none focus:border-primary"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function ReportConfigPanel({
  config,
  projects,
  template,
  analytics,
  selectedRange,
  refreshing,
  onChange,
  onTemplateChange,
  onRangeChange,
  onRefresh,
}: {
  config: ReportConfig;
  projects: string[];
  template: TemplateCard;
  analytics: AnalyticsPayload | null;
  selectedRange: 7 | 30 | 90;
  refreshing: boolean;
  onChange: <K extends keyof ReportConfig>(
    key: K,
    value: ReportConfig[K],
  ) => void;
  onTemplateChange: (value: string) => void;
  onRangeChange: (days: 7 | 30 | 90) => void;
  onRefresh: () => void;
}) {
  const kpis = new Map(
    analytics?.kpis.map((item) => [item.label, item.value]) ?? [],
  );
  const coverage = [
    ["价格记录", kpis.get("价格数据总量") ?? "0", "条"],
    ["供应商", kpis.get("供应商数量") ?? "0", "家"],
    ["AI任务", kpis.get("AI任务数量") ?? "0", "项"],
    ["数据区间", analytics?.rangeDays ?? selectedRange, "天"],
  ];
  return (
    <CardShell className="p-4">
      <ModuleHeader
        icon={FileBarChart2}
        title="报告生成配置"
        tone="blue"
        density="compact"
      />
      <div className="mt-3 rounded-md border border-ai-border bg-ai-soft px-3 py-2 text-[11px] leading-5 text-textSecondary">
        <span className="font-bold text-ai">当前模板：</span>
        {template.title} · 已自动应用推荐数据源和审核阈值
      </div>
      <div className="mt-4 space-y-3">
        <FieldRow label="报告类型" required>
          <ConfigSelect
            value={config.type}
            options={templates.map((template) => template.title)}
            onChange={onTemplateChange}
          />
        </FieldRow>
        <FieldRow label="项目名称" required>
          <ConfigSelect
            value={config.project}
            options={projects}
            onChange={(value) => onChange("project", value)}
          />
        </FieldRow>
        <FieldRow label="统计周期" required>
          <ConfigSelect
            value={`近${selectedRange}天`}
            options={["近7天", "近30天", "近90天"]}
            onChange={(value) =>
              onRangeChange(Number(value.replace(/\D/g, "")) as 7 | 30 | 90)
            }
          />
          <span className="text-[10px] font-normal text-textMuted">
            实际取数：{config.startDate} 至 {config.endDate}
          </span>
        </FieldRow>
        <FieldRow label="报告取数范围" required>
          <ConfigSelect
            value={config.source}
            options={[
              "机电设备价格库 + 地材价格库",
              "询价与比价数据",
              "项目套价与 BOQ 数据",
              "供应商与附件证据",
            ]}
            onChange={(value) => onChange("source", value)}
          />
          <span className="text-[10px] font-normal text-textMuted">
            决定真实 AI 任务优先引用的业务数据范围
          </span>
        </FieldRow>
        <div className="rounded-md border border-borderSoft bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-textMain">
              本次数据覆盖
            </span>
            <span className="text-[10px] text-textMuted">随筛选实时更新</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            {coverage.map(([label, value, unit]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="text-textMuted">{label}</span>
                <span className="font-bold text-textMain">
                  {String(value)} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-1">
          <div className="flex items-center justify-between text-[12px] font-semibold text-primary">
            <span>可信度范围</span>
            <span>{config.confidence}% - 100%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={config.confidence}
            onChange={(event) =>
              onChange("confidence", Number(event.target.value))
            }
            className="mt-2 h-2 w-full accent-ai"
          />
          <div className="mt-1 flex justify-between text-[10px] text-textMuted">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
        <SegmentedControl
          label="是否包含风险"
          value={config.includeRisk}
          onChange={(value) => onChange("includeRisk", value)}
        />
        <SegmentedControl
          label="是否包含附件清单"
          value={config.includeAttachments}
          onChange={(value) => onChange("includeAttachments", value)}
        />
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-bold text-white shadow-[0_8px_16px_rgba(47,107,255,0.18)]"
          type="button"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          {refreshing ? "正在刷新业务数据" : "刷新数据预览"}
        </button>
      </div>
    </CardShell>
  );
}

function SegmentedControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3">
      <span className="text-[13px] font-semibold text-textSecondary">
        {label}
      </span>
      <div className="grid h-8 grid-cols-2 overflow-hidden rounded-md border border-borderSoft bg-white text-[12px] font-semibold">
        <button
          onClick={() => onChange(true)}
          className={value ? "bg-primary text-white" : "text-textMuted"}
          type="button"
        >
          是
        </button>
        <button
          onClick={() => onChange(false)}
          className={!value ? "bg-primary text-white" : "text-textMuted"}
          type="button"
        >
          否
        </button>
      </div>
    </div>
  );
}

function AiPreviewPanel({
  config,
  template,
  analytics,
  linkedContext,
  error,
  loading,
  submitting,
  activeOutline,
  generated,
  onOutline,
  onRefresh,
  onSubmit,
  onDetails,
  onDataSources,
  onCollect,
  onInquiry,
}: {
  config: ReportConfig;
  template: TemplateCard;
  analytics: AnalyticsPayload | null;
  linkedContext: LinkedBusinessContext | null;
  error: string;
  loading: boolean;
  submitting: boolean;
  activeOutline: number;
  generated: boolean;
  onOutline: (index: number) => void;
  onRefresh: () => void;
  onSubmit: () => void;
  onDetails: () => void;
  onDataSources: () => void;
  onCollect: () => void;
  onInquiry: () => void;
}) {
  const kpi = new Map(analytics?.kpis.map((item) => [item.label, item]) ?? []);
  const priceCount = Number(
    String(kpi.get("价格数据总量")?.value ?? "0").replaceAll(",", ""),
  );
  const supplierCount = Number(
    String(kpi.get("供应商数量")?.value ?? "0").replaceAll(",", ""),
  );
  const highRisk =
    analytics?.riskDistribution.find((item) => item.name === "高风险")?.value ??
    0;
  const gapCount =
    analytics?.priceGapAnalysis.reduce((sum, item) => sum + item.value, 0) ?? 0;
  const risks = config.includeRisk
    ? [
        `高风险业务记录 ${highRisk} 条，必须进入人工复核。`,
        `价格与证据缺口 ${gapCount} 项，生成结论前需核对来源完整性。`,
        `当前分析可信度 ${analytics?.analysisConfidence ?? 0}%，正式生成阈值为 ${config.confidence}%。`,
      ]
    : [];
  const dataRefs = [
    `价格记录：${kpi.get("价格数据总量")?.value ?? 0} 条`,
    `供应商：${kpi.get("供应商数量")?.value ?? 0} 家`,
    `AI任务：${kpi.get("AI任务数量")?.value ?? 0} 项`,
    `数据区间：近 ${analytics?.rangeDays ?? 30} 天 · ${config.source}`,
  ];
  const activeSection =
    template.outline[Math.min(activeOutline, template.outline.length - 1)];
  const structuredChapters = buildStructuredReportChapters(
    template.title,
    analytics ? { ...analytics, linkedContext } : { linkedContext },
    undefined,
    {
      project: config.project,
      period: `${config.startDate} 至 ${config.endDate}`,
      source: config.source,
    },
  );
  const structuredChapter =
    structuredChapters[Math.min(activeOutline, structuredChapters.length - 1)];
  const trendItems = analytics
    ? [
        `设备价格变化：${analytics.trendSummary.equipment}`,
        `地材价格变化：${analytics.trendSummary.material}`,
        `询价任务变化：${analytics.trendSummary.inquiry}`,
      ]
    : [];
  const supplierItems = analytics?.supplierPerformance.length
    ? analytics.supplierPerformance.map(
        (item) =>
          `${item.name}：响应率 ${item.response}%，有效回复 ${item.quotes} 次`,
      )
    : [
        `当前组织已建档供应商 ${supplierCount} 家，筛选区间内暂无有效回复统计。`,
      ];
  const priceItems = [
    `正式价格记录 ${priceCount} 条，当前分析可信度 ${analytics?.analysisConfidence ?? 0}%。`,
    `价格与证据缺口 ${gapCount} 项，高风险记录 ${highRisk} 条。`,
  ];
  const summaryItems = structuredChapter?.findings.length
    ? structuredChapter.findings.slice(0, 5)
    : activeSection.includes("风险") ||
        activeSection.includes("缺口") ||
        activeSection.includes("异常")
      ? risks
      : activeSection.includes("供应商") || activeSection.includes("交付")
        ? supplierItems
        : activeSection.includes("趋势") ||
            activeSection.includes("指数") ||
            activeSection.includes("波动") ||
            activeSection.includes("展望")
          ? trendItems
          : priceItems;
  const canSubmit =
    priceCount > 0 && (analytics?.analysisConfidence ?? 0) >= config.confidence;
  const readinessLabel = !priceCount
    ? "缺少价格数据"
    : !canSubmit
      ? "可信度未达阈值"
      : gapCount > 0
        ? "可生成，需复核缺口"
        : "数据已就绪";

  if (loading && !analytics) {
    return (
      <CardShell className="min-h-[520px] p-4">
        <ModuleHeader
          icon={Sparkles}
          title="AI生成预览"
          subtitle="正在读取真实业务数据"
          tone="purple"
          density="compact"
        />
        <div className="mt-4 space-y-3" aria-label="正在加载">
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-32 animate-pulse rounded-md bg-slate-100" />
          <div className="h-28 animate-pulse rounded-md bg-slate-100" />
          <div className="h-24 animate-pulse rounded-md bg-slate-100" />
        </div>
      </CardShell>
    );
  }
  if (error && !analytics) {
    return (
      <CardShell className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
        <IconBox icon={AlertTriangle} tone="orange" size="lg" />
        <h3 className="mt-4 text-[15px] font-bold text-textMain">
          业务数据加载失败
        </h3>
        <p className="mt-2 max-w-md text-[12px] leading-5 text-textMuted">
          {error}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white"
        >
          <RefreshCw className="size-4" />
          重新加载
        </button>
      </CardShell>
    );
  }

  return (
    <CardShell className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-borderSoft px-4 py-3">
        <ModuleHeader
          icon={Sparkles}
          title="AI生成预览"
          subtitle={`${template.title} · ${activeSection}`}
          tone="purple"
          density="compact"
          action={<AiBadge label={loading ? "同步中" : "实时数据"} />}
        />
        <button
          onClick={onRefresh}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary"
          type="button"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          刷新当前章节
        </button>
      </div>
      <div className="grid gap-0 lg:grid-cols-[150px_minmax(0,1fr)]">
        <aside className="border-r border-borderSoft bg-[var(--color-bg-muted)] p-3">
          <div className="text-[13px] font-bold text-textMain">报告大纲</div>
          <div className="mt-3 space-y-2">
            {template.outline.map((item, index) => (
              <button
                type="button"
                onClick={() => onOutline(index)}
                key={item}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-left text-[12px]",
                  index === activeOutline
                    ? "bg-white font-bold text-primary shadow-sm"
                    : "text-textSecondary hover:bg-white/70",
                )}
              >
                {index + 1}. {item}
              </button>
            ))}
          </div>
          <button
            onClick={() => onOutline(template.outline.length - 1)}
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
            type="button"
          >
            展开全部 <ArrowRight className="size-3.5" />
          </button>
        </aside>
        <div className="space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-borderSoft bg-white px-3 py-2 text-[11px]">
            <span className="font-bold text-textMain">数据准备状态</span>
            <span
              className={cn(
                "rounded-pill px-2 py-1 font-semibold",
                canSubmit
                  ? "bg-success-soft text-success"
                  : "bg-warning-soft text-warning",
              )}
            >
              {readinessLabel}
            </span>
            <span className="text-textMuted">价格 {priceCount} 条</span>
            <span className="text-textMuted">
              可信度 {analytics?.analysisConfidence ?? 0}%
            </span>
            <span className="text-textMuted">缺口 {gapCount} 项</span>
          </div>
          <PreviewBlock
            title={`${activeSection}（实时摘要）`}
            tone="purple"
            badge={generated ? "已生成" : "待生成"}
          >
            {structuredChapter ? (
              <div className="mb-3 border-l-2 border-ai pl-3">
                <p className="text-[10px] font-bold text-ai">领导需要回答</p>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-textMain">
                  {structuredChapter.leadershipQuestion}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-textSecondary">
                  {structuredChapter.summary}
                </p>
              </div>
            ) : null}
            {structuredChapter?.metrics.length ? (
              <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {structuredChapter.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="min-w-0 border border-ai-border bg-white px-2 py-2"
                  >
                    <p className="truncate text-[9px] text-textMuted">
                      {metric.label}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-bold text-ai">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            <ul className="space-y-1.5 text-[12px] leading-5 text-textSecondary">
              {summaryItems.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 size-1.5 rounded-full bg-ai" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {structuredChapter?.actions.length ? (
              <div className="mt-3 border-t border-ai-border pt-2">
                <p className="text-[10px] font-bold text-ai">建议动作</p>
                {structuredChapter.actions.slice(0, 2).map((item) => (
                  <p
                    key={`${item.action}-${item.owner}`}
                    className="mt-1 text-[11px] leading-5 text-textSecondary"
                  >
                    <span className="font-bold text-textMain">
                      {item.priority}
                    </span>
                    {" · "}
                    {item.action}（{item.owner} · {item.timing}）
                  </p>
                ))}
              </div>
            ) : null}
          </PreviewBlock>
          <PreviewBlock
            title={`风险提示（${risks.length}项）`}
            tone="orange"
            badge="AI"
          >
            <ul className="space-y-1.5 text-[12px] leading-5 text-[#92400E]">
              {risks.length ? (
                risks.map((item) => (
                  <li key={item} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li>当前配置未包含风险章节。</li>
              )}
            </ul>
            <button
              onClick={onDetails}
              className="mt-2 text-[12px] font-semibold text-primary"
              type="button"
            >
              查看详情 &gt;
            </button>
          </PreviewBlock>
          <PreviewBlock title="数据参考（摘要）" tone="green">
            <ul className="space-y-1.5 text-[12px] leading-5 text-[#166534]">
              {dataRefs.map((item) => (
                <li key={item} className="flex gap-2">
                  <DatabaseZap className="mt-0.5 size-3.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={onDataSources}
              className="mt-2 text-[12px] font-semibold text-primary"
              type="button"
            >
              查看数据源 &gt;
            </button>
          </PreviewBlock>
          <p className="text-center text-[12px] font-semibold text-ai">
            {generated
              ? `${config.type}已保存至报告库，仍需人工复核后发布`
              : `预览随业务数据自动更新 · ${analytics ? new Date(analytics.generatedAt).toLocaleString("zh-CN", { hour12: false }) : "等待数据"}`}
          </p>
          {!canSubmit ? (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border border-warning/20 bg-warning-soft p-2">
              <span className="text-[11px] font-semibold text-warning">
                数据尚未达到正式生成条件
              </span>
              <button
                type="button"
                onClick={onCollect}
                className="h-7 rounded-md border border-warning/30 bg-white px-2 text-[11px] font-semibold text-warning"
              >
                补充价格采集
              </button>
              <button
                type="button"
                onClick={onInquiry}
                className="h-7 rounded-md border border-warning/30 bg-white px-2 text-[11px] font-semibold text-warning"
              >
                发起询价
              </button>
              <button
                type="button"
                onClick={onDataSources}
                className="h-7 rounded-md border border-warning/30 bg-white px-2 text-[11px] font-semibold text-warning"
              >
                补充证据
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            title={canSubmit ? "生成报告并进入人工审核" : readinessLabel}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ai text-[13px] font-bold text-white shadow-ai disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {submitting ? "真实 AI 任务执行中" : "生成报告并提交人工审核"}
          </button>
        </div>
      </div>
    </CardShell>
  );
}

function PreviewBlock({
  title,
  tone,
  badge,
  children,
}: {
  title: string;
  tone: "purple" | "orange" | "green";
  badge?: string;
  children: ReactNode;
}) {
  const className = {
    purple: "border-ai-border bg-ai-soft/55",
    orange: "border-warning/20 bg-warning-soft/55",
    green: "border-success/20 bg-success-soft/55",
  }[tone];

  return (
    <div className={cn("rounded-[14px] border p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "text-[13px] font-bold",
            tone === "purple"
              ? "text-ai"
              : tone === "orange"
                ? "text-warning"
                : "text-success",
          )}
        >
          {title}
        </span>
        {badge ? <AiBadge label={badge} className="h-5 text-[11px]" /> : null}
      </div>
      {children}
    </div>
  );
}

const reportFileVisual: Record<
  ReportFileKind,
  { label: string; className: string; icon: LucideIcon }
> = {
  word: { label: "", className: "from-blue-600 to-sky-500", icon: FileText },
  pdf: {
    label: "",
    className: "from-red-500 to-rose-500",
    icon: FileBarChart2,
  },
  risk: { label: "", className: "from-violet-500 to-ai", icon: ShieldAlert },
  decision: {
    label: "",
    className: "from-orange-400 to-amber-500",
    icon: ShoppingCart,
  },
};

function ReportFileIcon({ kind }: { kind: ReportFileKind }) {
  const style = reportFileVisual[kind];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-gradient-to-br text-white shadow-[0_12px_26px_rgba(47,107,255,0.16)]",
        style.className,
      )}
    >
      <span className="absolute right-0 top-0 size-4 rounded-bl-md bg-white/30" />
      <Icon className="absolute size-7 opacity-55" aria-hidden="true" />
      {style.label ? (
        <span className="relative z-10 text-[14px] font-black tracking-tight">
          {style.label}
        </span>
      ) : null}
    </span>
  );
}

function ReportFormatButton({
  format,
  onClick,
}: {
  format: ReportFormat;
  onClick: () => void;
}) {
  const iconMap: Record<ReportFormat, LucideIcon> = {
    "打印/另存PDF": Download,
    预览: FileText,
    编辑: FileText,
    删除: AlertTriangle,
  };
  const Icon = iconMap[format];
  const isDanger = format === "删除";
  const isEdit = format === "编辑";

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-[78px] items-center justify-center gap-1.5 rounded-md border bg-white px-2 text-[12px] font-bold shadow-sm transition hover:-translate-y-px",
        isDanger
          ? "border-danger/20 text-danger hover:bg-danger-soft"
          : isEdit
            ? "border-primary/20 bg-primary-soft text-primary hover:bg-primary hover:text-white"
            : "border-primary/20 text-primary hover:bg-primary-soft",
      )}
      type="button"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {format}
    </button>
  );
}

function GeneratedReportsPanel({
  reports,
  loading,
  page,
  onPage,
  onOpen,
  onFormat,
}: {
  reports: GeneratedReport[];
  loading: boolean;
  page: number;
  onPage: (page: number) => void;
  onOpen: (report: GeneratedReport) => void;
  onFormat: (report: GeneratedReport, format: ReportFormat) => void;
}) {
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(reports.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleReports = reports.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  return (
    <CardShell className="flex min-h-full flex-col p-4">
      <ModuleHeader
        icon={FileCheck2}
        title="已生成报告"
        tone="blue"
        density="compact"
        action={
          <Link
            href="/reports"
            className="text-[12px] font-semibold text-primary"
          >
            查看全部 &gt;
          </Link>
        }
      />
      <div className="mt-4 flex-1 divide-y divide-borderSoft">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-[13px] text-textMuted">
            <LoaderCircle className="size-4 animate-spin" />
            正在同步报告库
          </div>
        ) : null}
        {!loading && visibleReports.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <IconBox icon={FileCheck2} tone="blue" size="lg" />
            <p className="mt-3 text-[14px] font-bold text-textMain">暂无报告</p>
            <p className="mt-1 text-[12px] text-textMuted">
              调整左侧配置后生成首份报告，结果将进入人工审核。
            </p>
          </div>
        ) : null}
        {visibleReports.map((report) => (
          <div
            key={report.id}
            className="grid gap-3 py-4 sm:grid-cols-[48px_minmax(0,1fr)_96px_minmax(170px,auto)] sm:items-center"
          >
            <ReportFileIcon kind={report.fileKind} />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onOpen(report)}
                className="block w-full truncate text-left text-[14px] font-bold text-textMain hover:text-primary"
              >
                {report.title}
              </button>
              <div className="mt-1 truncate text-[12px] font-medium text-textMuted">
                {report.project}
              </div>
              <div className="mt-1 text-[12px] text-textMuted">
                {report.time}
              </div>
            </div>
            <StatusBadge
              status={report.status}
              label={
                report.rawStatus === "draft"
                  ? "草稿"
                  : report.rawStatus === "pending_review"
                    ? "待人工审核"
                    : report.rawStatus === "rejected"
                      ? "已退回"
                      : "已完成"
              }
              className={cn(
                "justify-center text-[11px]",
                report.status === "needs_info" ? "h-6" : "h-6",
              )}
            />
            <div className="flex flex-wrap justify-end gap-2">
              {report.formats.map((format) => (
                <ReportFormatButton
                  key={`${report.title}-${format}`}
                  format={format}
                  onClick={() => onFormat(report, format)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-borderSoft pt-3">
        <div className="flex items-center gap-1">
          <button
            disabled={safePage === 1}
            onClick={() => onPage(Math.max(1, safePage - 1))}
            className="flex size-7 items-center justify-center rounded-md border border-borderSoft text-textMuted disabled:opacity-40"
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (pageNumber) => (
              <button
                onClick={() => onPage(pageNumber)}
                key={pageNumber}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md text-[12px] font-semibold",
                  pageNumber === safePage
                    ? "bg-primary text-white"
                    : "text-textSecondary",
                )}
                type="button"
              >
                {pageNumber}
              </button>
            ),
          )}
          <button
            disabled={safePage === pageCount}
            onClick={() => onPage(Math.min(pageCount, safePage + 1))}
            className="flex size-7 items-center justify-center rounded-md border border-borderSoft text-textMuted disabled:opacity-40"
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <span className="text-[12px] text-textMuted">
          共 {reports.length} 份，当前第 {safePage} / {pageCount} 页
        </span>
      </div>
    </CardShell>
  );
}

function CompactTitleBar({
  onSave,
  onGenerate,
  onExport,
  onRefresh,
  canExport,
  canGenerate,
  generating,
  refreshing,
  lastUpdated,
}: {
  onSave: () => void;
  onGenerate: () => void;
  onExport: () => void;
  onRefresh: () => void;
  canExport: boolean;
  canGenerate: boolean;
  generating: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-bold text-textMain">
          AI报告生成中心（智能报告）
        </h1>
        <p className="mt-1 text-[13px] text-textMuted">
          通过 AI 汇总价格、供应商、比价、套价与风险证据，生成可复核的智能报告。
        </p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-textMuted">
          <span className="size-2 rounded-full bg-success" />
          Supabase 实时联动
          <span>·</span>
          <span>
            {lastUpdated
              ? `更新于 ${lastUpdated.toLocaleTimeString("zh-CN", { hour12: false })}`
              : "等待同步"}
          </span>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <Link
          href="/reports"
          title="查看、审核和管理全部报告"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm"
        >
          <FolderArchive className="size-4" />
          报告库
        </Link>
        <button
          onClick={onRefresh}
          aria-label="刷新报告数据"
          title="刷新报告数据"
          className="flex size-9 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary shadow-sm"
          type="button"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </button>
        <button
          onClick={onSave}
          title="保存当前模板与取数配置，不调用 AI"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm"
          type="button"
        >
          <FileText className="size-4" />
          保存草稿
        </button>
        <button
          onClick={onGenerate}
          disabled={!canGenerate || generating}
          title={
            canGenerate ? "生成报告并提交人工审核" : "当前数据未达到生成条件"
          }
          className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-3 text-[13px] font-semibold text-white shadow-ai disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
        >
          {generating ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {generating ? "AI生成中" : "生成并送审"}
        </button>
        <button
          onClick={onExport}
          disabled={!canExport}
          title={canExport ? "导出最近一份已审核报告" : "暂无已审核报告可导出"}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[13px] font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
        >
          <Download className="size-4" />
          导出已审核报告
        </button>
      </div>
    </div>
  );
}

function ReportEditDrawer({
  report,
  onClose,
  onSave,
}: {
  report: GeneratedReport | null;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [title, setTitle] = useState(report?.title ?? "");
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <button
        type="button"
        aria-label="关闭报告编辑"
        className="flex-1"
        onClick={onClose}
      />
      <aside className="h-full w-[430px] max-w-full border-l border-borderSoft bg-white shadow-panel">
        <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-textMain">
              编辑报告任务
            </h2>
            <p className="mt-1 text-[12px] text-textMuted">
              {report.id} · 修改后仍需人工审核
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="text-[12px] font-semibold text-textSecondary">
              报告名称
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-borderSoft px-3 text-[13px] outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-textSecondary">
              补充说明
            </span>
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-borderSoft p-3 text-[13px] outline-none focus:border-primary"
              defaultValue="请补充缺失数据后重新生成风险与采购建议章节。"
            />
          </label>
          <div className="rounded-card border border-ai-border bg-ai-soft p-3 text-[12px] leading-5 text-textSecondary">
            <b className="text-ai">AI 提醒：</b>
            保存修改后报告仍处于待人工确认状态，不会自动发布。
          </div>
        </div>
        <div className="absolute bottom-0 right-0 flex w-[430px] max-w-full justify-end gap-3 border-t border-borderSoft bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-borderSoft px-4 text-[13px] font-semibold"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(title)}
            className="h-9 rounded-md bg-primary px-4 text-[13px] font-semibold text-white"
          >
            保存修改
          </button>
        </div>
      </aside>
    </div>
  );
}

function mapReportRow(row: Record<string, unknown>): GeneratedReport {
  const content =
    row.content && typeof row.content === "object"
      ? (row.content as Record<string, unknown>)
      : {};
  const rawStatus = String(row.status ?? "draft");
  const completed = rawStatus === "approved" || rawStatus === "archived";
  const reportType = String(row.report_type ?? "智能报告");
  const updatedAt = String(row.updated_at ?? new Date().toISOString());
  return {
    id: String(row.report_code),
    databaseId: String(row.id),
    title: String(row.title),
    project: String(content.project || "全项目汇总"),
    time: new Date(updatedAt).toLocaleString("zh-CN", { hour12: false }),
    status: completed ? "completed" : "needs_info",
    fileKind: reportType.includes("风险") ? "risk" : "word",
    formats: completed
      ? ["打印/另存PDF"]
      : rawStatus === "pending_review"
        ? ["预览"]
        : ["预览", "编辑", "删除"],
    reportType,
    rawStatus,
    updatedAt,
    riskLevel: String(content.aiRiskLevel ?? "low"),
  };
}

function analyticsRange(startDate: string, endDate: string): 7 | 30 | 90 {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
  );
  if (days <= 7) return 7;
  if (days <= 30) return 30;
  return 90;
}

function AiReportCenterPageContent() {
  const router = useRouter();
  const routeContext = useRouteContext();
  const toast = useMockToast();
  const [config, setConfig] = useState(createInitialConfig);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].title);
  const [generated, setGenerated] = useState(false);
  const [activeOutline, setActiveOutline] = useState(0);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary>({
    total: 0,
    draft: 0,
    pendingReview: 0,
    approved: 0,
    archived: 0,
  });
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [linkedContext, setLinkedContext] =
    useState<LinkedBusinessContext | null>(null);
  const [projects, setProjects] = useState<string[]>(["全项目汇总"]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<AiExecutionTaskDetail | null>(
    null,
  );
  const [deleteReport, setDeleteReport] = useState<GeneratedReport | null>(
    null,
  );
  const [editReport, setEditReport] = useState<GeneratedReport | null>(null);
  const selectedRange = analyticsRange(config.startDate, config.endDate);
  const activeTemplate = useMemo(
    () =>
      templates.find((template) => template.title === selectedTemplate) ??
      templates[0],
    [selectedTemplate],
  );

  const updateConfig = <K extends keyof ReportConfig>(
    key: K,
    value: ReportConfig[K],
  ) => {
    setGenerated(false);
    setConfig((current) => ({ ...current, [key]: value }));
  };
  const applyTemplate = (template: TemplateCard) => {
    setSelectedTemplate(template.title);
    setActiveOutline(0);
    setGenerated(false);
    setConfig((current) => ({
      ...current,
      type: template.title,
      source: template.defaultSource,
      confidence: template.defaultConfidence,
      includeRisk: template.defaultRisk,
      includeAttachments: template.defaultAttachments,
    }));
  };
  const applyRange = (days: 7 | 30 | 90) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    setGenerated(false);
    setConfig((current) => ({
      ...current,
      startDate: dateInputValue(start),
      endDate: dateInputValue(end),
    }));
  };
  const visibleReports = reports;
  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setReportsLoading(true);
    setReportsError("");
    try {
      const response = await fetch("/api/reports?view=summary", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "报告列表加载失败");
      setReports((payload.data ?? []).map(mapReportRow));
      setReportSummary(
        payload.summary ?? {
          total: 0,
          draft: 0,
          pendingReview: 0,
          approved: 0,
          archived: 0,
        },
      );
      setLastUpdated(new Date());
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "报告列表加载失败";
      setReportsError(message);
      throw reason;
    } finally {
      if (!silent) setReportsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(
    async (silent = false) => {
      if (!silent) setAnalyticsLoading(true);
      setAnalyticsError("");
      try {
        const response = await fetch(`/api/analytics?range=${selectedRange}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || "报告业务数据加载失败");
        setAnalytics(payload.data as AnalyticsPayload);
        setLastUpdated(new Date());
      } catch (reason) {
        const message =
          reason instanceof Error ? reason.message : "报告业务数据加载失败";
        setAnalyticsError(message);
        throw reason;
      } finally {
        if (!silent) setAnalyticsLoading(false);
      }
    },
    [selectedRange],
  );

  const loadProjects = useCallback(async () => {
    const response = await fetch("/api/project-pricing?view=names", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "项目列表加载失败");
    const names = (payload.projects ?? [])
      .map((project: Record<string, unknown>) =>
        String(project.name ?? "").trim(),
      )
      .filter(Boolean);
    setProjects(["全项目汇总", ...new Set<string>(names)]);
  }, []);

  const loadLinkedContext = useCallback(async () => {
    const target = routeContext.projectPricingId
      ? {
          kind: "project_pricing" as const,
          id: routeContext.projectPricingId,
          href: `/api/project-pricing/${routeContext.projectPricingId}`,
        }
      : routeContext.comparisonId
        ? {
            kind: "comparison" as const,
            id: routeContext.comparisonId,
            href: `/api/comparisons/${routeContext.comparisonId}`,
          }
        : routeContext.inquiryId
          ? {
              kind: "inquiry" as const,
              id: routeContext.inquiryId,
              href: `/api/inquiries/${routeContext.inquiryId}`,
            }
          : null;
    if (!target) {
      setLinkedContext(null);
      return;
    }
    const response = await fetch(target.href, { cache: "no-store" });
    const payload = (await response.json()) as {
      data?: Record<string, unknown>;
      detail?: Record<string, unknown>;
    };
    if (!response.ok || !payload.data) {
      setLinkedContext(null);
      return;
    }
    setLinkedContext({
      kind: target.kind,
      id: target.id,
      data: payload.data,
      detail: payload.detail,
    });
  }, [
    routeContext.comparisonId,
    routeContext.inquiryId,
    routeContext.projectPricingId,
  ]);

  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshAll = useCallback(
    async (silent = false) => {
      if (refreshInFlight.current) return refreshInFlight.current;
      if (!silent) setRefreshing(true);
      const pending = Promise.allSettled([
        loadReports(silent), loadAnalytics(silent), loadProjects(), loadLinkedContext(),
      ]).then((results) => {
        const failed = results.find((result) => result.status === "rejected");
        if (failed?.status === "rejected") throw failed.reason;
      });
      refreshInFlight.current = pending;
      try {
        await pending;
      } catch (reason) {
        if (!silent)
          toast.warning(
            "数据同步失败",
            reason instanceof Error ? reason.message : "请稍后重试",
          );
      } finally {
        refreshInFlight.current = null;
        if (!silent) setRefreshing(false);
      }
    },
    [loadAnalytics, loadLinkedContext, loadProjects, loadReports, toast],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshAll(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshAll]);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer = 0;
    let disposed = false;
    let running = false;
    let failures = 0;
    const dirty = new Set<string>();
    const flush = async () => {
      if (disposed || running || document.visibilityState === "hidden" || !dirty.size || failures >= 5) return;
      running = true;
      const changed = new Set(dirty);
      dirty.clear();
      // Invalidate only the data represented by each event; do not reload all
      // projects and linked business details for a task progress update.
      const operations: Promise<unknown>[] = [];
      if (changed.has("wpi_reports")) operations.push(loadReports(true));
      if ([...changed].some((table) => table !== "wpi_reports")) operations.push(loadAnalytics(true));
      if (changed.has("wpi_inquiries")) operations.push(loadLinkedContext());
      const results = await Promise.allSettled(operations);
      if (results.some((result) => result.status === "rejected")) {
        failures++;
        changed.forEach((table) => dirty.add(table));
      } else failures = 0;
      running = false;
      if (!disposed && dirty.size && failures < 5) queueRefresh();
    };
    const queueRefresh = (table?: string) => {
      if (table) dirty.add(table);
      if (refreshTimer) return;
      if (!disposed && document.visibilityState !== "hidden" && failures < 5)
        refreshTimer = window.setTimeout(() => { refreshTimer = 0; void flush(); }, Math.min(300_000, 5_000 * 2 ** failures));
    };
    const tables = [
      "wpi_reports",
      "wpi_equipment_prices",
      "wpi_material_prices",
      "wpi_suppliers",
      "wpi_price_collection_leads",
      "wpi_inquiries",
      "wpi_attachments",
      "wpi_ai_execution_tasks",
    ];
    let channel = supabase.channel("ai-report-center-live");
    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: { eventType: string; new: Record<string, unknown> }) => {
          if (table === "wpi_ai_execution_tasks" && payload.eventType === "UPDATE" && ["queued", "running"].includes(String(payload.new.status))) return;
          queueRefresh(table);
        },
      );
    }
    channel.subscribe();
    const onVisibility = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = 0;
      if (document.visibilityState !== "hidden" && dirty.size) queueRefresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      window.clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [loadReports, loadAnalytics, loadLinkedContext]);

  const kpiItems = useMemo<ReportKpi[]>(() => {
    const now = new Date();
    const thisMonth = reports.filter((report) => {
      const date = new Date(report.updatedAt);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }).length;
    const highRisk = reports.filter((report) =>
      ["high", "critical"].includes(report.riskLevel),
    ).length;
    const values = [
      reportSummary.total,
      thisMonth,
      reportSummary.draft + reportSummary.pendingReview,
      highRisk,
      reportSummary.approved + reportSummary.archived,
      templates.length,
    ];
    const trends = [
      "报告库当前记录",
      "按更新时间统计",
      "草稿与待审核",
      "需人工复核",
      "已审核可导出",
      "当前可用模板",
    ];
    return reportKpiVisuals.map((item, index) => ({
      ...item,
      value: String(values[index]),
      trend: trends[index],
    }));
  }, [reportSummary, reports]);

  const templateItems = useMemo(
    () =>
      templates.map((template) => ({
        ...template,
        usage: reports.filter((report) => report.reportType === template.title)
          .length,
      })),
    [reports],
  );

  const exportableReport =
    reports.find((report) => report.status === "completed") ?? null;
  const currentPriceCount = Number(
    String(
      analytics?.kpis.find((item) => item.label === "价格数据总量")?.value ??
        "0",
    ).replaceAll(",", ""),
  );
  const canGenerate =
    currentPriceCount > 0 &&
    (analytics?.analysisConfidence ?? 0) >= config.confidence;

  const persistReport = async (
    status: "draft" | "pending_review",
    aiTask?: AiExecutionTaskDetail,
  ) => {
    const highRiskCount =
      analytics?.riskDistribution.find((item) => item.name === "高风险")
        ?.value ?? 0;
    const sourceId =
      routeContext.projectPricingId ??
      routeContext.comparisonId ??
      routeContext.inquiryId ??
      null;
    const dataSnapshot = analytics
      ? {
          kpis: analytics.kpis,
          insights: analytics.insights,
          priceTrendSeries: analytics.priceTrendSeries,
          trendSummary: analytics.trendSummary,
          supplierPerformance: analytics.supplierPerformance,
          aiEfficiency: analytics.aiEfficiency,
          riskDistribution: analytics.riskDistribution,
          confidenceDistribution: analytics.confidenceDistribution,
          priceGapAnalysis: analytics.priceGapAnalysis,
          analysisConfidence: analytics.analysisConfidence,
          rangeDays: analytics.rangeDays,
          generatedAt: analytics.generatedAt,
          source: analytics.source,
          truncated: analytics.truncated,
          linkedContext,
        }
      : null;
    const rawAiOutput =
      aiTask?.output_payload &&
      typeof aiTask.output_payload === "object" &&
      !Array.isArray(aiTask.output_payload)
        ? (aiTask.output_payload as Record<string, unknown>)
        : {};
    const structuredChapters = buildStructuredReportChapters(
      activeTemplate.title,
      dataSnapshot,
      rawAiOutput,
      {
        project: config.project,
        period: `${config.startDate} 至 ${config.endDate}`,
        source: config.source,
        sourceId,
      },
    );
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${config.project}${config.type}`,
        reportType: config.type,
        project: config.project,
        status,
        sourceType: routeContext.source || "ai_report_center",
        sourceId,
        outline: activeTemplate.outline,
        config,
        aiConfidence: aiTask?.confidence ?? analytics?.analysisConfidence ?? 0,
        aiRiskLevel: aiTask?.risk_level ?? (highRiskCount > 0 ? "high" : "low"),
        content: {
          selectedTemplate,
          templateVersion: getReportTemplateSpec(activeTemplate.title).version,
          generated: Boolean(aiTask),
          aiTaskId: aiTask?.id ?? null,
          aiTaskCode: aiTask?.task_code ?? null,
          aiOutput: {
            ...rawAiOutput,
            chapters: structuredChapters,
            templateVersion: getReportTemplateSpec(activeTemplate.title)
              .version,
            humanReviewRequired: true,
          },
          dataSnapshot,
          reviewNotice: "AI生成结果必须经人工审核后发布",
        },
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "报告保存失败");
    const row = payload.data as Record<string, unknown>;
    const report = mapReportRow(row);
    setReports((current) => [
      report,
      ...current.filter((item) => item.id !== report.id),
    ]);
    void loadReports(true).catch(() => undefined);
    return report;
  };

  const saveDraft = async () => {
    try {
      const report = await persistReport("draft");
      toast.success("报告草稿已保存", `${report.id} 已写入报告库。`);
    } catch (reason) {
      toast.warning(
        "草稿保存失败",
        reason instanceof Error ? reason.message : "请稍后重试",
      );
    }
  };
  const generateReport = async () => {
    if (!canGenerate) {
      toast.warning(
        "暂不能生成正式报告",
        "请先补充价格数据，或调整可信度阈值后刷新预览。",
      );
      return;
    }
    if (aiGenerating) return;
    setAiGenerating(true);
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "report_generation",
          title: `${config.project}${config.type}`,
          sourceLabel: config.source,
          businessObjectType: "report_draft",
          businessHref: "/ai-report-center",
          idempotencyKey: `report-${config.type}-${config.project}-${Date.now()}`,
          input: {
            template: {
              name: activeTemplate.title,
              version: getReportTemplateSpec(activeTemplate.title).version,
              outline: activeTemplate.outline,
              chapterGuidance: getReportTemplateSpec(
                activeTemplate.title,
              ).chapters.map((chapter) => ({
                title: chapter.title,
                leadershipQuestion: chapter.leadershipQuestion,
                purpose: chapter.purpose,
                decisionFocus: chapter.decisionFocus,
                requiredMetrics: chapter.metricKeys,
              })),
            },
            project: config.project,
            period: { startDate: config.startDate, endDate: config.endDate },
            sourceScope: config.source,
            confidenceThreshold: config.confidence,
            includeRisk: config.includeRisk,
            includeAttachments: config.includeAttachments,
            businessData: analytics
              ? {
                  kpis: analytics.kpis,
                  insights: analytics.insights,
                  trendSummary: analytics.trendSummary,
                  supplierPerformance: analytics.supplierPerformance,
                  riskDistribution: analytics.riskDistribution,
                  confidenceDistribution: analytics.confidenceDistribution,
                  priceGapAnalysis: analytics.priceGapAnalysis,
                  linkedContext,
                  generatedAt: analytics.generatedAt,
                }
              : null,
            policy: {
              humanReviewRequired: true,
              doNotInventMissingFacts: true,
              doNotPublishAutomatically: true,
            },
            outputContract: {
              schemaVersion: "2.0",
              summary: "string",
              recommendation: "string",
              confidence: "0-100",
              riskLevel: "low|medium|high|critical",
              reasonCodes: ["string"],
              findings: [
                {
                  code: "string",
                  title: "string",
                  detail: "string",
                  severity: "info|low|medium|high|critical",
                },
              ],
              chapters: activeTemplate.outline.map((title) => ({
                title,
                leadershipQuestion: "string",
                summary: "string",
                findings: ["string"],
                evidenceRefs: ["string"],
                metrics: [
                  {
                    label: "string",
                    value: "string",
                    interpretation: "string",
                  },
                ],
                decisionFocus: ["string"],
                actions: [
                  {
                    action: "string",
                    owner: "string",
                    timing: "string",
                    priority: "P0|P1|P2",
                  },
                ],
              })),
            },
          },
        }),
      });
      const payload = (await response.json()) as {
        data?: AiExecutionTaskDetail;
        error?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "AI报告任务创建失败");
      let task = payload.data;
      setActiveTask(task);
      for (let attempt = 0; attempt < 80; attempt += 1) {
        if (
          ["needs_review", "completed", "failed", "cancelled"].includes(
            task.status,
          )
        )
          break;
        await new Promise((resolve) => window.setTimeout(resolve, 1250));
        const taskResponse = await fetch(
          `/api/ai/tasks?id=${encodeURIComponent(task.id)}`,
          { cache: "no-store" },
        );
        const taskPayload = (await taskResponse.json()) as {
          data?: AiExecutionTaskDetail;
          error?: string;
        };
        if (!taskResponse.ok || !taskPayload.data)
          throw new Error(taskPayload.error || "AI报告任务状态读取失败");
        task = taskPayload.data;
        setActiveTask(task);
      }
      if (task.status === "failed")
        throw new Error(task.error_message || "AI报告生成失败");
      if (task.status === "cancelled") throw new Error("AI报告任务已取消");
      if (
        !task.output_payload ||
        !["needs_review", "completed"].includes(task.status)
      ) {
        throw new Error("AI报告任务仍在执行，请稍后在 AI 工作台查看");
      }
      const report = await persistReport("pending_review", task);
      setGenerated(true);
      setPage(1);
      toast.success(
        "真实 AI 报告已生成",
        `${report.id} 已关联任务 ${task.task_code} 并进入人工审核。`,
      );
      router.push(
        `/reports/${report.databaseId ?? report.id}?source=ai-report-center&reportId=${report.id}`,
      );
    } catch (reason) {
      toast.danger(
        "AI报告生成失败",
        reason instanceof Error ? reason.message : "请检查 AI 模型与集成配置",
      );
    } finally {
      setAiGenerating(false);
    }
  };
  const openReport = (report: GeneratedReport) => {
    router.push(
      `/reports/${report.databaseId ?? report.id}?source=ai-report-center&reportId=${report.id}`,
    );
  };
  const handleFormat = (report: GeneratedReport, format: ReportFormat) => {
    if (format === "编辑") {
      setEditReport(report);
      return;
    }
    if (format === "删除") {
      setDeleteReport(report);
      return;
    }
    const preview = format === "预览" ? "?preview=1" : "";
    window.open(
      `/api/reports/${report.databaseId ?? report.id}/export${preview}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <AppLayout>
      <div data-no-global-interaction className="space-y-3">
        <CompactTitleBar
          onSave={saveDraft}
          onGenerate={() => void generateReport()}
          onRefresh={() => void refreshAll()}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          canGenerate={canGenerate}
          generating={aiGenerating}
          canExport={exportableReport !== null}
          onExport={() => {
            if (exportableReport)
              handleFormat(exportableReport, "打印/另存PDF");
          }}
        />
        <ReportWorkflowSteps
          canGenerate={canGenerate}
          hasTask={activeTask !== null || generated}
        />
        {activeTask ? <GenerationTaskStatus task={activeTask} /> : null}
        <ReportKpiGrid
          items={kpiItems}
          onSelect={(index) => {
            const destinations = [
              "/reports",
              "/reports?period=month",
              "/reports?status=pending_review",
              "/reports?risk=highRisk",
              "/reports?status=approved",
            ];
            if (index < destinations.length) router.push(destinations[index]);
            else
              document
                .getElementById("report-template-library")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
        <div id="report-template-library">
          <TemplateLibrary
            items={templateItems}
            selected={selectedTemplate}
            onSelect={applyTemplate}
          />
        </div>
        <div className="grid min-w-0 gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
          <ReportConfigPanel
            config={config}
            projects={projects}
            template={activeTemplate}
            analytics={analytics}
            selectedRange={selectedRange}
            refreshing={analyticsLoading || refreshing}
            onChange={updateConfig}
            onTemplateChange={(value) => {
              const template = templates.find((item) => item.title === value);
              if (template) applyTemplate(template);
            }}
            onRangeChange={applyRange}
            onRefresh={() => void refreshAll()}
          />
          <AiPreviewPanel
            config={config}
            template={activeTemplate}
            analytics={analytics}
            linkedContext={linkedContext}
            error={analyticsError}
            loading={analyticsLoading || refreshing}
            submitting={aiGenerating}
            activeOutline={activeOutline}
            generated={generated}
            onOutline={setActiveOutline}
            onRefresh={() => void refreshAll()}
            onSubmit={() => void generateReport()}
            onDetails={() => {
              const highRisk =
                analytics?.riskDistribution.find(
                  (item) => item.name === "高风险",
                )?.value ?? 0;
              toast.warning(
                "风险详情",
                config.includeRisk
                  ? `当前真实业务数据含 ${highRisk} 条高风险记录，报告发布前必须人工复核。`
                  : "当前配置未包含风险章节。",
              );
            }}
            onDataSources={() =>
              router.push(
                "/attachments?source=ai-report-center&relatedObject=report-draft",
              )
            }
            onCollect={() =>
              router.push(
                `/ai-price-collection?source=ai-report-center&keyword=${encodeURIComponent(config.type)}`,
              )
            }
            onInquiry={() =>
              router.push(
                `/inquiries/create?source=ai-report-center&project=${encodeURIComponent(config.project)}`,
              )
            }
          />
        </div>
        <GeneratedReportsPanel
          reports={visibleReports}
          loading={reportsLoading}
          page={page}
          onPage={setPage}
          onOpen={openReport}
          onFormat={handleFormat}
        />
        {reportsError ? (
          <div className="flex items-center justify-between rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger">
            <span>报告库同步失败：{reportsError}</span>
            <button
              type="button"
              onClick={() => void loadReports()}
              className="font-bold underline"
            >
              重试
            </button>
          </div>
        ) : null}
        <div className="flex justify-between text-[12px] text-textMuted">
          <span>© 2026 水厂项目机电设备与地材价格信息库 V1.0</span>
          <span>技术支持：WaterProject Tech Team</span>
        </div>
      </div>
      <ConfirmDialog
        open={deleteReport !== null}
        title="删除报告任务"
        description={deleteReport ? `确认删除《${deleteReport.title}》？` : ""}
        confirmLabel="确认删除"
        tone="danger"
        onCancel={() => setDeleteReport(null)}
        onConfirm={async () => {
          if (!deleteReport) return;
          const response = await fetch(
            `/api/reports/${deleteReport.databaseId ?? deleteReport.id}`,
            { method: "DELETE" },
          );
          const payload = await response.json();
          if (!response.ok) {
            toast.warning("报告删除失败", payload.error || "请稍后重试");
            return;
          }
          setReports((current) =>
            current.filter((report) => report.id !== deleteReport.id),
          );
          void loadReports(true).catch(() => undefined);
          setDeleteReport(null);
          setPage(1);
          toast.success("报告任务已删除", "报告库已同步更新。");
        }}
      />
      <ReportEditDrawer
        key={editReport?.id ?? "closed"}
        report={editReport}
        onClose={() => setEditReport(null)}
        onSave={async (title) => {
          if (!editReport) return;
          const response = await fetch(
            `/api/reports/${editReport.databaseId ?? editReport.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            },
          );
          const payload = await response.json();
          if (!response.ok) {
            toast.warning("报告更新失败", payload.error || "请稍后重试");
            return;
          }
          setReports((current) =>
            current.map((report) =>
              report.id === editReport.id ? { ...report, title } : report,
            ),
          );
          void loadReports(true).catch(() => undefined);
          setEditReport(null);
          toast.success("报告任务已更新", "修改已写入报告库。");
        }}
      />
    </AppLayout>
  );
}

export default function AiReportCenterPage() {
  return (
    <Suspense fallback={null}>
      <AiReportCenterPageContent />
    </Suspense>
  );
}
