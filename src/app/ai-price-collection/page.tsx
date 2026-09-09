"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ArrowRight,
  BrainCircuit,
  Box,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Database,
  Download,
  ExternalLink,
  Eraser,
  Eye,
  FilePenLine,
  FileSpreadsheet,
  Globe2,
  Hourglass,
  ListTodo,
  MapPinned,
  Network,
  PieChart,
  PlusCircle,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Sparkles,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import { PriceCollectionSchedulePolicies } from "@/components/ai-workflow/PriceCollectionSchedulePolicies";
import { AppLayout } from "@/components/layout/AppLayout";
import { CollectionPathSelector } from "@/components/price-collection/CollectionPathSelector";
import { CollectionRunMonitor } from "@/components/price-collection/CollectionRunMonitor";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { PriceCollectionExportDialog } from "@/components/price-collection/PriceCollectionExportDialog";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { localizePriceRegion } from "@/lib/priceCollection/localization";
import {
  collectionRegionOptions,
  getMaterialSpecificationOptionsForKeywords,
  materialKeywordGroups,
  materialKeywordOptions,
} from "@/data/materialCollectionDictionary";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  PriceCollectionBootstrap,
  PriceCollectionLeadDetailResponse,
  PriceCollectionLeadPoolResponse,
  PriceCollectionLeadRecord,
  PriceCollectionReviewerRecord,
  PriceCollectionRunRecord,
  PriceCollectionSourceRunRecord,
  PriceCollectionSourceRecord,
  PriceCollectionTaskDetail,
  PriceCollectionTaskRecord,
} from "@/types/priceCollection";

type Tone = "blue" | "cyan" | "orange" | "green" | "red" | "purple";
type LeadType = "设备" | "地材";
type LeadStatus =
  | "待线索池审核"
  | "待正式入库"
  | "采集中"
  | "已入正式价格库"
  | "已驳回";

type Lead = {
  databaseId?: string;
  taskId?: string | null;
  code: string;
  type: LeadType;
  name: string;
  originalName: string;
  translationStatus: PriceCollectionLeadRecord["translationStatus"];
  translationConfidence: number | null;
  spec: string;
  source: string;
  region: string;
  price: number;
  currency: string;
  match: number;
  credibility: number;
  status: LeadStatus;
  supplier: string;
  risk: "低风险" | "中风险" | "高风险";
  collectedAt: string;
  priceMonth: string;
  sourceUrl: string;
  evidenceId: string;
  originalUnit: string;
  priceValidityStatus: PriceCollectionLeadRecord["priceValidityStatus"];
  priceValidationReasons: string[];
  priceOriginalText: string;
  priceContextExcerpt: string;
  isComparable: boolean;
  matchTarget: string;
  duplicateStatus: "无重复" | "疑似重复";
  assignedReviewerId: string | null;
  reviewDueAt: string;
};

type TaskConfig = {
  target: LeadType;
  keyword: string;
  spec: string;
  region: string;
  currency: string;
  source: string;
  frequency: string;
};

type CollectionMode = "web" | "quote_upload" | "api" | "manual";
type SourceViewFilter = "all" | "selected" | "healthy" | "pending";
type TaskHistoryFilter = "all" | "recurring" | "attention" | "qualified" | "archived";

function taskExecutionLabel(status: PriceCollectionTaskRecord["status"]) {
  return status === "queued" ? "排队中"
    : status === "running" ? "执行中"
      : status === "paused" ? "已暂停"
        : status === "completed" ? "执行完成"
          : status === "failed" ? "执行失败"
            : "已终止";
}

function taskOutcomeLabel(task: PriceCollectionTaskRecord) {
  return task.catalogCandidateCount > 0 ? `目录候选 ${task.catalogCandidateCount} 条`
    : task.outcomeStatus === "qualified" ? `合格价格 ${task.qualifiedLeadCount} 条`
    : task.outcomeStatus === "partial" ? `部分成功 · 合格 ${task.qualifiedLeadCount} 条`
      : task.outcomeStatus === "no_price" ? "未形成合格价格"
        : task.outcomeStatus === "blocked" ? "来源异常阻塞"
          : "等待业务结果";
}

function taskNeedsAttention(task: PriceCollectionTaskRecord) {
  return task.status === "failed" || task.outcomeStatus === "blocked" || (task.outcomeStatus === "no_price" && task.catalogCandidateCount === 0);
}

function taskResultTone(task: PriceCollectionTaskRecord) {
  return task.status === "failed" || task.outcomeStatus === "blocked"
    ? "bg-danger/10 text-danger"
    : task.catalogCandidateCount > 0
      ? "bg-success/10 text-success"
    : task.outcomeStatus === "no_price"
      ? "bg-warning/10 text-warning"
      : task.outcomeStatus === "qualified" || task.outcomeStatus === "partial"
        ? "bg-success/10 text-success"
        : "bg-ai-soft text-ai";
}

function defaultReviewDueAt() {
  const due = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const local = new Date(due.getTime() - due.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function defaultPriceDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function defaultPriceMonth() {
  return defaultPriceDate().slice(0, 7);
}

function formatBeijingDate(value: string) {
  if (!value) return "待计算";
  return `${new Date(value).toLocaleString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" })}（北京时间）`;
}

const equipmentKeywordOptions = ["水泵", "潜水排污泵", "离心泵", "蝶阀", "闸阀", "鼓风机", "加药装置", "水质分析仪"];
const equipmentSpecOptions = ["DN50", "DN100", "DN200", "DN300", "380V / 50Hz", "IP68", "PN10", "PN16"];
const currencyOptions = ["CDF", "USD", "EUR", "CNY", "ZAR", "XAF"];

function splitMaterialKeywords(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[、,，;；|]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

const sourceTypeLabels: Record<string, string> = {
  manufacturer_site: "厂家官网",
  supplier_site: "供应商官网",
  distributor_site: "经销商官网",
  material_ecommerce: "建材商城",
  classified_marketplace: "市场平台",
  supplier_directory: "供应商目录",
  cement_supplier: "水泥供应商",
  api: "API 数据源",
};

const priceValidationReasonLabels: Record<string, string> = {
  missing_product_name: "缺少产品名称",
  invalid_price: "价格不是有效正数",
  unsupported_currency: "币种无法识别",
  missing_specification: "缺少规格型号",
  missing_unit: "缺少计价单位",
  missing_region: "缺少价格适用地区",
  missing_price_context: "缺少价格原文上下文",
  non_product_detail_page: "来源不是商品详情页",
  shipping_threshold_not_product_price: "疑似免运费门槛，不是商品价格",
  missing_keyword_near_price: "数字附近缺少价格关键词",
  non_product_number: "疑似非商品数字",
  contact_number: "疑似联系电话",
  minimum_order_amount: "疑似起订金额",
  currency_mismatch: "页面币种与记录币种不一致",
};

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isCollectionSourceReady(source: PriceCollectionSourceRecord) {
  return source.isActive
    && source.qualityScore >= 60
    && Boolean(source.lastCheckedAt)
    && !source.lastError;
}

const collectionModeMeta: Record<
  CollectionMode,
  { label: string; description: string; icon: LucideIcon }
> = {
  web: {
    label: "网上采集",
    description: "从已登记的制造商官网和公开数据源抓取价格与来源证据",
    icon: Globe2,
  },
  api: {
    label: "API 数据源",
    description: "调用已登记的结构化价格接口，保留请求来源和采集时间",
    icon: Network,
  },
  quote_upload: {
    label: "上传报价识别",
    description: "上传 Excel、PDF 或图片报价，识别明细后进入人工复核",
    icon: FileSpreadsheet,
  },
  manual: {
    label: "人工录入",
    description: "记录电话、邮件和现场询价，生成待线索池审核的候选价格",
    icon: PlusCircle,
  },
};

type ManualEntryDraft = {
  supplierName: string;
  price: string;
  unit: string;
  sourceUrl: string;
  priceDate: string;
};

type AdvancedConfig = {
  timeWindowDays: number;
  priceHistoryMonths: number;
  pricePeriodFrom: string;
  pricePeriodToMode: "current_month" | "fixed_month";
  pricePeriodTo: string;
  excludeUnknownPriceDate: boolean;
  maxPriceAgeDays: number;
  sourceConcurrency: number;
  maxPagesPerSource: number;
  dedupThreshold: number;
  deviationThreshold: number;
  maxResults: number;
  requireEvidence: boolean;
  stopOnHighRisk: boolean;
};

type CollectionRun = {
  databaseId?: string;
  id: string;
  status: "idle" | "running" | "paused" | "completed" | "stopped" | "failed";
  progress: number;
  currentSource: string;
  successCount: number;
  failedCount: number;
  fetchedCount: number;
  evidenceCount: number;
  updatedCount: number;
  duplicateCount: number;
  startedAt: string;
  finishedAt: string;
  logs: string[];
  sourceRuns: PriceCollectionSourceRunRecord[];
};

const leadStatusFromDatabase: Record<
  PriceCollectionLeadRecord["status"],
  LeadStatus
> = {
  pending_review: "待线索池审核",
  ready: "待正式入库",
  transferred: "已入正式价格库",
  rejected: "已驳回",
};

const leadRiskFromDatabase: Record<
  PriceCollectionLeadRecord["riskLevel"],
  Lead["risk"]
> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "高风险",
};

function mapDatabaseLead(record: PriceCollectionLeadRecord): Lead {
  return {
    databaseId: record.id,
    taskId: record.taskId,
    code: record.leadCode,
    type: record.targetType === "material" ? "地材" : "设备",
    name: record.translatedName || record.name,
    originalName: record.originalName || record.name,
    translationStatus: record.translationStatus,
    translationConfidence: record.translationConfidence,
    spec: record.translatedSpecification || record.specification || "待AI补全规格",
    source: record.sourceType,
    region: record.region,
    price: record.price,
    currency: record.currency,
    match: record.aiMatchScore,
    credibility: record.confidence,
    status: leadStatusFromDatabase[record.status],
    supplier: record.supplierName || "待核验供应商",
    risk: leadRiskFromDatabase[record.riskLevel],
    collectedAt: record.sourceCheckedAt || record.createdAt,
    priceMonth: record.quoteDate,
    sourceUrl: record.sourceUrl,
    evidenceId: record.evidenceCode,
    originalUnit: record.originalUnit,
    priceValidityStatus: record.priceValidityStatus,
    priceValidationReasons: record.priceValidationReasons,
    priceOriginalText: record.priceOriginalText,
    priceContextExcerpt: record.priceContextExcerpt,
    isComparable: record.isComparable,
    matchTarget: record.matchTarget,
    duplicateStatus:
      record.duplicateStatus === "suspected_duplicate"
        ? "疑似重复"
        : "无重复",
    assignedReviewerId: record.assignedReviewerId,
    reviewDueAt: record.reviewDueAt,
  };
}

function mapDatabaseTask(
  record: PriceCollectionTaskRecord,
  latestRun?: PriceCollectionRunRecord,
  evidenceCount = 0,
  sourceRuns: PriceCollectionSourceRunRecord[] = [],
): CollectionRun {
  return {
    databaseId: record.id,
    id: record.taskCode,
    status: record.status === "queued" ? "idle" : record.status,
    progress: record.progress,
    currentSource: record.currentSource || record.sourceType,
    successCount: record.qualifiedLeadCount ?? record.successCount,
    failedCount: latestRun?.failedSourceCount ?? record.failedCount,
    fetchedCount: latestRun?.fetchedCount ?? 0,
    evidenceCount: evidenceCount || latestRun?.evidenceCount || 0,
    updatedCount: latestRun?.updatedLeadCount ?? 0,
    duplicateCount: latestRun?.duplicateCount ?? 0,
    startedAt: record.startedAt || "--",
    finishedAt: record.finishedAt || "--",
    logs: [
      `任务由 ${record.provider || "queue_only"} 提供器管理`,
      record.lastError ? `最近错误：${record.lastError}` : "任务状态已从业务库同步",
    ],
    sourceRuns,
  };
}

const toneMap: Record<
  Tone,
  { iconTone: IconBoxTone; text: string; soft: string; stroke: string }
> = {
  blue: {
    iconTone: "blue",
    text: "text-[#2563EB]",
    soft: "from-[#F8FBFF] to-[#EFF6FF]",
    stroke: "#3B82F6",
  },
  cyan: {
    iconTone: "cyan",
    text: "text-[#0284C7]",
    soft: "from-[#F8FDFF] to-[#EAF8FF]",
    stroke: "#38BDF8",
  },
  orange: {
    iconTone: "orange",
    text: "text-[#F97316]",
    soft: "from-[#FFFBF6] to-[#FFF2DF]",
    stroke: "#F59E0B",
  },
  green: {
    iconTone: "green",
    text: "text-[#16A34A]",
    soft: "from-[#F8FFFB] to-[#ECFDF5]",
    stroke: "#22C55E",
  },
  red: {
    iconTone: "red",
    text: "text-[#EF4444]",
    soft: "from-[#FFF9F9] to-[#FFF0F0]",
    stroke: "#F87171",
  },
  purple: {
    iconTone: "purple",
    text: "text-[#7C3AED]",
    soft: "from-[#FBFAFF] to-[#F2EDFF]",
    stroke: "#8B5CF6",
  },
};

type KpiItem = {
  title: string;
  value: string;
  unit: string;
  caption: string;
  icon: LucideIcon;
  tone: Tone;
};

type DistributionItem = {
  label: string;
  value: number;
  percent: string;
  color: string;
};

function KpiCard({
  item,
  onClick,
}: {
  item: KpiItem;
  onClick: () => void;
}) {
  const tone = toneMap[item.tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative min-h-[94px] overflow-hidden rounded-[14px] border border-borderSoft bg-gradient-to-br px-3 py-2.5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        tone.soft,
      )}
    >
      <div className="relative flex h-full items-center gap-4">
        <IconBox
          icon={item.icon}
          tone={tone.iconTone}
          className="size-[48px] rounded-[14px] shadow-[0_8px_12px_rgba(15,23,42,0.10)]"
        />
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[14px] font-black", tone.text)}>
            {item.title}
          </div>
          <div className="mt-1 flex items-end gap-1">
            <span
              className={cn("text-[26px] font-black leading-none", tone.text)}
            >
              {item.value}
            </span>
            <span className={cn("pb-1 text-[13px] font-bold", tone.text)}>
              {item.unit}
            </span>
          </div>
          <div
            className={cn(
              "mt-1.5 text-[11px] font-semibold",
              item.tone === "red"
                ? "text-danger"
                : item.tone === "orange"
                  ? "text-warning"
                  : "text-primary",
            )}
          >
            {item.caption}
          </div>
        </div>
      </div>
    </button>
  );
}

function DonutChart({
  data,
  total,
  label,
}: {
  data: DistributionItem[];
  total: string;
  label: string;
}) {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const segments = totalValue
    ? data.map((item, index) => ({
        item,
        dash: (item.value / totalValue) * 270,
        offset:
          25 +
          data
            .slice(0, index)
            .reduce(
              (sum, previous) =>
                sum + (previous.value / totalValue) * 270,
              0,
            ),
      }))
    : [];
  return (
    <div className="relative size-[136px] shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="43"
          fill="none"
          stroke="#E8EEF7"
          strokeWidth="16"
        />
        {segments.map(({ item, dash, offset }) => {
          return (
            <circle
              key={item.label}
              cx="60"
              cy="60"
              r="43"
              fill="none"
              stroke={item.color}
              strokeDasharray={`${dash} ${270 - dash}`}
              strokeDashoffset={-offset}
              strokeWidth="16"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-[24px] font-black leading-none text-textMain">
          {total}
        </div>
        <div className="mt-1.5 text-[10px] font-bold text-textMuted">{label}</div>
      </div>
    </div>
  );
}

function DistributionCard({
  title,
  data,
  total,
  onSelect,
  icon,
  subtitle,
  insight,
}: {
  title: string;
  data: DistributionItem[];
  total: number;
  onSelect: (label: string) => void;
  icon: LucideIcon;
  subtitle: string;
  insight: string;
}) {
  const dominant = [...data].sort((a, b) => b.value - a.value)[0];
  return (
    <section className="flex min-h-[226px] min-w-0 flex-col rounded-[16px] border border-borderSoft bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconBox icon={icon} tone="blue" size="sm" />
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-black text-textMain">
              {title}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-textMuted">
              {subtitle}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-primary-soft px-2 py-1 text-[11px] font-black text-primary">
          {data.filter((item) => item.value > 0).length} 类
        </span>
      </div>
      <div className="mt-2.5 grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-4">
        <div className="flex justify-center">
          <DonutChart data={data} total={String(total)} label="当前结果" />
        </div>
        <div className="min-w-0 space-y-2.5">
          {data.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item.label)}
              className="group grid w-full grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 text-left text-[11px] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate font-semibold">{item.label}</span>
              <span className="whitespace-nowrap font-black text-textMain group-hover:text-primary">
                {item.value} · {item.percent}
              </span>
              <span className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full transition-[width] duration-200"
                  style={{ width: item.percent, backgroundColor: item.color }}
                />
              </span>
            </button>
          ))}
          {!data.length ? (
            <div className="flex min-h-20 items-center justify-center rounded-[10px] bg-slate-50 text-[11px] font-semibold text-textMuted">
              当前筛选条件下暂无分布数据
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-borderSoft pt-2 text-[11px]">
        <span className="min-w-0 truncate font-semibold text-textMuted">
          {insight}
        </span>
        <span className="shrink-0 font-black text-primary">
          主项 {dominant?.label || "暂无"}
        </span>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  const cls =
    status === "待正式入库"
      ? "bg-success/10 text-success border-success/20"
      : status === "待线索池审核"
        ? "bg-warning/10 text-warning border-warning/25"
        : status === "采集中"
          ? "bg-ai-soft text-ai border-ai/20"
          : status === "已驳回"
            ? "bg-danger/10 text-danger border-danger/20"
            : "bg-primary-soft text-primary border-primary/20";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-bold",
        cls,
      )}
    >
      {status}
    </span>
  );
}

function ProgressMini({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-14 rounded-full bg-slate-100">
      <div
        className="h-full rounded-full"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

function PriceTrendPanel({
  leads,
  scopeLabel,
  refreshKey,
  onRefresh,
  className,
}: {
  leads: Lead[];
  scopeLabel: string;
  refreshKey: number;
  onRefresh: () => void;
  className?: string;
}) {
  type SeriesKey = "equipment" | "material" | "overall";
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    equipment: true,
    material: true,
    overall: true,
  });
  const seriesMeta: Record<
    SeriesKey,
    { label: string; color: string; tone: string }
  > = {
    equipment: { label: "设备", color: "#2563EB", tone: "text-primary" },
    material: { label: "地材", color: "#16A34A", tone: "text-success" },
    overall: { label: "综合", color: "#7C3AED", tone: "text-ai" },
  };
  const chart = useMemo(() => {
    const pointCount = 7;
    const validTimes = leads
      .map((lead) => new Date(lead.priceMonth || lead.collectedAt).getTime())
      .filter(Number.isFinite);
    const fallbackEnd = new Date("2026-08-22T00:00:00+08:00").getTime();
    const end = validTimes.length ? Math.max(...validTimes) : fallbackEnd;
    const start = end - rangeDays * 24 * 60 * 60 * 1000;
    const step = (end - start) / (pointCount - 1);
    const buckets = Array.from({ length: pointCount }, (_, index) => ({
      time: start + step * index,
      equipment: [] as number[],
      material: [] as number[],
      overall: [] as number[],
    }));

    leads.forEach((lead) => {
      const time = new Date(lead.priceMonth || lead.collectedAt).getTime();
      if (!Number.isFinite(time) || time < start || time > end) return;
      const bucketIndex = Math.max(
        0,
        Math.min(pointCount - 1, Math.round((time - start) / step)),
      );
      const price = lead.price;
      buckets[bucketIndex].overall.push(price);
      buckets[bucketIndex][lead.type === "设备" ? "equipment" : "material"].push(
        price,
      );
    });

    const buildSeries = (key: SeriesKey) => {
      const raw = buckets.map((bucket) => {
        const values = bucket[key];
        return values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null;
      });
      const baseline = raw.find((value): value is number => value !== null) ?? 0;
      return {
        key,
        samples: buckets.reduce((sum, bucket) => sum + bucket[key].length, 0),
        values: raw.map((value) =>
          value === null || baseline === 0
            ? null
            : Number(((value / baseline) * 100).toFixed(1)),
        ),
      };
    };

    return {
      labels: buckets.map((bucket) =>
        new Intl.DateTimeFormat("zh-CN", {
          month: "2-digit",
          day: "2-digit",
        })
          .format(bucket.time)
          .replace("/", "-"),
      ),
      series: [
        buildSeries("equipment"),
        buildSeries("material"),
        buildSeries("overall"),
      ],
    };
  }, [leads, rangeDays]);

  const visibleValues = chart.series.flatMap((series) =>
    visibleSeries[series.key]
      ? series.values.filter((value): value is number => value !== null)
      : [],
  );
  const visibleSampleCount = Math.max(
    0,
    ...chart.series
      .filter((series) => visibleSeries[series.key])
      .map((series) => series.values.filter((value) => value !== null).length),
  );
  const minValue = visibleValues.length
    ? Math.min(...visibleValues, 100) - 4
    : 92;
  const maxValue = visibleValues.length
    ? Math.max(...visibleValues, 100) + 4
    : 108;
  const chartHeight = 132;
  const chartTop = 26;
  const xAt = (index: number) => 54 + index * 70;
  const yAt = (value: number) =>
    chartTop + ((maxValue - value) / Math.max(1, maxValue - minValue)) * chartHeight;
  const summaryFor = (key: SeriesKey) => {
    const series = chart.series.find((item) => item.key === key);
    const values = series?.values.filter((value): value is number => value !== null) ?? [];
    if (values.length < 2) return "样本不足";
    const delta = ((values.at(-1)! - values[0]) / values[0]) * 100;
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
  };
  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries((current) => {
      const activeCount = Object.values(current).filter(Boolean).length;
      if (current[key] && activeCount === 1) return current;
      return { ...current, [key]: !current[key] };
    });
  };

  return (
    <section
      className={cn(
        "flex min-h-[254px] min-w-0 flex-col rounded-[16px] border border-borderSoft bg-white p-4 shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconBox icon={TrendingUp} tone="blue" size="sm" />
          <div>
            <h3 className="text-[16px] font-black text-textMain">价格趋势</h3>
            <p className="mt-0.5 text-[11px] text-textMuted">
              {scopeLabel} · 近{rangeDays}天价格指数
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex rounded-[8px] border border-borderSoft bg-slate-50 p-0.5 text-[10px] font-bold">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={cn(
                  "rounded-[6px] px-2 py-1.5 transition",
                  rangeDays === days
                    ? "bg-white text-primary shadow-sm"
                    : "text-textMuted hover:text-primary",
                )}
              >
                {days}天
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            title="刷新趋势"
            className="inline-flex size-7 items-center justify-center rounded-[8px] border border-borderSoft text-textMuted transition hover:border-primary/30 hover:text-primary"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(seriesMeta) as SeriesKey[]).map((key) => {
          const item = seriesMeta[key];
          const samples = chart.series.find((series) => series.key === key)?.samples ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleSeries(key)}
              aria-pressed={visibleSeries[key]}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold transition",
                visibleSeries[key]
                  ? "border-borderSoft bg-white text-textMain"
                  : "border-transparent bg-slate-50 text-textMuted opacity-60",
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
              <span className="text-textMuted">{samples}条</span>
            </button>
          );
        })}
      </div>
      <svg
        key={`${rangeDays}-${refreshKey}`}
        viewBox="0 0 520 205"
        className={cn("mt-1 h-[145px] w-full overflow-visible", !leads.length && "hidden")}
        aria-label="价格趋势"
      >
        {[0, 1, 2, 3].map((index) => {
          const value = maxValue - ((maxValue - minValue) / 3) * index;
          const y = chartTop + (chartHeight / 3) * index;
          return (
            <g key={index}>
              <line
                x1="48"
                y1={y}
                x2="486"
                y2={y}
                stroke="#E5ECF5"
                strokeDasharray="4 5"
              />
              <text x="42" y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
                {value.toFixed(0)}
              </text>
            </g>
          );
        })}
        {chart.series.map((series) => {
          if (!visibleSeries[series.key]) return null;
          const meta = seriesMeta[series.key];
          const actualValues = series.values.filter(
            (value): value is number => value !== null,
          );
          const plottedValues =
            actualValues.length === 1
              ? series.values.map(() => actualValues[0])
              : series.values;
          const points = plottedValues
            .map((value, index) =>
              value === null ? null : `${xAt(index)},${yAt(value)}`,
            )
            .filter(Boolean)
            .join(" ");
          return (
            <g key={series.key}>
              {points ? (
                <polyline
                  points={points}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={series.key === "overall" ? 3 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={actualValues.length === 1 ? "6 6" : undefined}
                  opacity={actualValues.length === 1 ? 0.72 : 1}
                />
              ) : null}
              {series.values.map((value, index) =>
                value === null ? null : (
                  <circle
                    key={`${series.key}-${index}`}
                    cx={xAt(index)}
                    cy={yAt(value)}
                    r={series.key === "overall" ? 4 : 3.5}
                    fill="white"
                    stroke={meta.color}
                    strokeWidth="2.5"
                  >
                    <title>{`${meta.label} · ${chart.labels[index]} · 指数 ${value}`}</title>
                  </circle>
                ),
              )}
            </g>
          );
        })}
        {chart.labels.map((label, index) => (
          <g key={label}>
            <text
              x={xAt(index)}
              y="190"
              textAnchor="middle"
              className="fill-slate-500 text-[9px]"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
      {!leads.length ? (
        <div className="mt-3 flex min-h-[145px] items-center justify-center rounded-[10px] bg-slate-50 px-4 text-center text-[11px] font-semibold text-textMuted">
          当前分析对象暂无价格样本
        </div>
      ) : null}
      {leads.length && !visibleValues.length ? (
        <div className="-mt-3 mb-2 rounded-md bg-slate-50 px-2 py-1.5 text-center text-[10px] font-semibold text-textMuted">
          当前时间范围内暂无可绘制的价格样本
        </div>
      ) : visibleSampleCount < 2 ? (
        <div className="-mt-3 mb-2 flex items-center justify-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-center text-[10px] font-semibold text-textMuted">
          <span className="inline-block w-5 border-t-2 border-dashed border-ai/60" />
          当前仅有 1 个有效时间点，虚线为当前价格基线
        </div>
      ) : null}
      <div className="mt-auto grid grid-cols-3 divide-x divide-borderSoft border-t border-borderSoft pt-2 text-center">
        {(Object.keys(seriesMeta) as SeriesKey[]).map((key) => (
          <div key={key}>
            <div className={cn("text-[13px] font-black", seriesMeta[key].tone)}>
              {summaryFor(key)}
            </div>
            <div className="text-[10px] font-semibold text-textMuted">
              {seriesMeta[key].label}指数变化
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiPriceCollectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<PriceCollectionTaskRecord[]>([]);
  const [reviewers, setReviewers] = useState<PriceCollectionReviewerRecord[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("全部");
  const [pageSize, setPageSize] = useState<10 | 20 | 30>(10);
  const [leadPoolLoading, setLeadPoolLoading] = useState(false);
  const [poolPagination, setPoolPagination] = useState({ page: 1, pageSize: 10, total: 0, pageCount: 1 });
  const [poolSummary, setPoolSummary] = useState<PriceCollectionLeadPoolResponse["summary"]>({
    total: 0, pending: 0, ready: 0, transferred: 0, rejected: 0,
    highRisk: 0, unassigned: 0, overdue: 0, averageConfidence: 0, averageMatch: 0,
    valid: 0, needsReview: 0, invalid: 0,
  });
  const [dataMode, setDataMode] = useState<"loading" | "supabase" | "error">(
    "loading",
  );
  const [dataMessage, setDataMessage] = useState("正在连接价格采集业务库");
  const [permissions, setPermissions] = useState({
    canWrite: false,
    canReview: false,
  });
  const [collectionMode, setCollectionMode] = useState<CollectionMode>(() => {
    const requestedMode = searchParams.get("mode");
    return ["web", "api", "quote_upload", "manual"].includes(requestedMode || "")
      ? requestedMode as CollectionMode
      : "web";
  });
  const [sources, setSources] = useState<PriceCollectionSourceRecord[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceViewFilter, setSourceViewFilter] = useState<SourceViewFilter>("all");
  const [sourceListExpanded, setSourceListExpanded] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [materialPickerQuery, setMaterialPickerQuery] = useState("");
  const materialPickerRef = useRef<HTMLDivElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [templateAction, setTemplateAction] = useState<"load" | "save" | "">("");
  const [templateFeedback, setTemplateFeedback] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [manualDraft, setManualDraft] = useState<ManualEntryDraft>({
    supplierName: "",
    price: "",
    unit: "台",
    sourceUrl: "",
    priceDate: defaultPriceDate(),
  });
  const [selectedId, setSelectedId] = useState("");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [task, setTask] = useState<TaskConfig>({
    target: "设备",
    keyword: "",
    spec: "",
    region: "南京",
    currency: "CNY",
    source: "全部来源",
    frequency: "每天",
  });
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>({
    timeWindowDays: 30,
    priceHistoryMonths: 1,
    pricePeriodFrom: "2026-01",
    pricePeriodToMode: "current_month",
    pricePeriodTo: defaultPriceMonth(),
    excludeUnknownPriceDate: true,
    maxPriceAgeDays: 90,
    sourceConcurrency: 3,
    maxPagesPerSource: 18,
    dedupThreshold: 85,
    deviationThreshold: 30,
    maxResults: 100,
    requireEvidence: true,
    stopOnHighRisk: false,
  });
  const [freshnessReferenceTime] = useState(() => Date.now());
  const [appliedType, setAppliedType] = useState<"全部" | LeadType>("全部");
  const [appliedStatus, setAppliedStatus] = useState<"全部" | LeadStatus>(
    "全部",
  );
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("全部");
  const [credibilityFilter, setCredibilityFilter] = useState("全部");
  const [riskFilter, setRiskFilter] = useState<"全部" | Lead["risk"]>("全部");
  const [run, setRun] = useState<CollectionRun>({
    id: "",
    status: "idle",
    progress: 0,
    currentSource: "等待创建任务",
    successCount: 0,
    failedCount: 0,
    fetchedCount: 0,
    evidenceCount: 0,
    updatedCount: 0,
    duplicateCount: 0,
    startedAt: "--",
    finishedAt: "--",
    logs: [],
    sourceRuns: [],
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [resultScope, setResultScope] = useState<"current" | "all">("current");
  const [validityFilter, setValidityFilter] = useState<"valid" | "needs_review" | "invalid" | "all">("valid");
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmDeleteResults, setConfirmDeleteResults] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<PriceCollectionSourceRecord | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignmentReviewerId, setAssignmentReviewerId] = useState("");
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [leadDetail, setLeadDetail] = useState<PriceCollectionLeadDetailResponse | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [collectionGuideOpen, setCollectionGuideOpen] = useState(false);
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(false);
  const [taskHistoryTab, setTaskHistoryTab] = useState<"history" | "policies">("history");
  const [taskHistoryFilter, setTaskHistoryFilter] = useState<TaskHistoryFilter>("all");
  const [taskHistoryQuery, setTaskHistoryQuery] = useState("");
  const [taskActionBusyId, setTaskActionBusyId] = useState("");
  const [taskSwitching, setTaskSwitching] = useState(false);
  const [taskManagementMode, setTaskManagementMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<PriceCollectionTaskRecord | null>(null);
  const [scheduleTask, setScheduleTask] = useState<PriceCollectionTaskRecord | null>(null);
  const [scheduleFrequency, setScheduleFrequency] = useState("每天");
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [showRunLogs, setShowRunLogs] = useState(false);
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);
  const [regionMode, setRegionMode] = useState<"count" | "price">("count");
  const [analysisType, setAnalysisType] = useState<"全部" | LeadType>("全部");
  const [analysisPool, setAnalysisPool] = useState<Lead[]>([]);
  const [analysisTotal, setAnalysisTotal] = useState(0);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!materialPickerOpen) return;
    const closePicker = (event: PointerEvent) => {
      if (!materialPickerRef.current?.contains(event.target as Node)) {
        setMaterialPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", closePicker);
    return () => document.removeEventListener("pointerdown", closePicker);
  }, [materialPickerOpen]);

  async function loadBusinessData(showToast = false) {
    setDataMessage("正在同步价格采集业务数据");
    try {
      const response = await fetch("/api/price-collection", {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "价格采集业务接口不可用");
      }
      const body = (await response.json()) as PriceCollectionBootstrap;
      const databaseLeads = body.leads.map(mapDatabaseLead);
      setLeads(databaseLeads);
      setSelectedId(databaseLeads[0]?.code ?? "");
      const latestTask = body.tasks.find((item) => !item.archivedAt);
      if (latestTask) {
        const latestRun = body.runs.find((item) => item.taskId === latestTask.id);
        setRun(mapDatabaseTask(
          latestTask,
          latestRun,
          0,
          body.sourceRuns.filter((item) => item.parentRunId === latestRun?.id),
        ));
      }
      setTasks(body.tasks);
      setSources(body.sources);
      setSelectedSourceIds((current) => current.length ? current : body.sources.map((source) => source.id));
      setPermissions(body.permissions);
      setDataMode("supabase");
      setDataMessage(
        databaseLeads.length ? `已同步 ${databaseLeads.length} 条业务线索` : "业务库暂无线索，可创建网页采集或上传报价任务",
      );
      if (showToast) toast.success("业务数据同步完成");
    } catch (error) {
      const message = error instanceof Error ? error.message : "连接失败";
      setDataMode("error");
      setDataMessage(`${message}；未使用伪造采集结果`);
      setLeads([]);
      setPermissions({ canWrite: false, canReview: false });
      if (showToast) toast.warning("业务数据连接失败", message);
    }
  }

  async function callCollectionApi(
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
  ) {
    const response = await fetch("/api/price-collection", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string" ? payload.error : "业务操作失败",
      );
    }
    return payload;
  }

  useEffect(() => {
    let active = true;
    fetch("/api/price-collection", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error || "价格采集业务接口不可用");
        }
        return (await response.json()) as PriceCollectionBootstrap;
      })
      .then((body) => {
        if (!active) return;
        const databaseLeads = body.leads.map(mapDatabaseLead);
        setLeads(databaseLeads);
        setSelectedId(databaseLeads[0]?.code ?? "");
        const latestTask = body.tasks.find((item) => !item.archivedAt);
        if (latestTask) {
          const latestRun = body.runs.find((item) => item.taskId === latestTask.id);
          setRun(mapDatabaseTask(
            latestTask,
            latestRun,
            0,
            body.sourceRuns.filter((item) => item.parentRunId === latestRun?.id),
          ));
        }
        setTasks(body.tasks);
        setSources(body.sources);
        const returnParameters = new URLSearchParams(window.location.search);
        const returnedSourceId = returnParameters.get("sourceId") ?? "";
        const returnedSource = body.sources.find((source) => source.id === returnedSourceId);
        if (returnedSource) {
          setCollectionMode(returnedSource.sourceKind);
          setSelectedSourceIds([returnedSource.id]);
          toast.success("新来源已加入采集范围", `${returnedSource.name} 已验证并自动选中。`);
          window.history.replaceState({}, "", window.location.pathname);
        } else {
          setSelectedSourceIds(body.sources.map((source) => source.id));
        }
        setPermissions(body.permissions);
        setDataMode("supabase");
        setDataMessage(
          databaseLeads.length ? `已同步 ${databaseLeads.length} 条业务线索` : "业务库暂无线索，可创建网页采集或上传报价任务",
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "连接失败";
        setDataMode("error");
        setDataMessage(`${message}；未使用伪造采集结果`);
        setLeads([]);
        setPermissions({ canWrite: false, canReview: false });
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const currentTaskId = run.databaseId || tasks.find((item) => !item.archivedAt)?.id || "";
  useEffect(() => {
    if (dataMode !== "supabase") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const parameters = new URLSearchParams({
        view: "lead_pool",
        page: String(page),
        pageSize: String(pageSize),
        validity: validityFilter,
      });
      if (query.trim()) parameters.set("keyword", query.trim());
      if (appliedType !== "全部") parameters.set("type", appliedType);
      if (appliedStatus !== "全部") parameters.set("status", appliedStatus);
      if (sourceFilter !== "全部") parameters.set("source", sourceFilter);
      if (riskFilter !== "全部") parameters.set("risk", riskFilter);
      if (assigneeFilter !== "全部") parameters.set("assignee", assigneeFilter);
      if (resultScope === "current" && currentTaskId) parameters.set("taskId", currentTaskId);
      if (credibilityFilter === "非常高（≥90%）") parameters.set("minConfidence", "90");
      if (credibilityFilter === "高（75%-90%）") { parameters.set("minConfidence", "75"); parameters.set("maxConfidence", "90"); }
      if (credibilityFilter === "中（50%-75%）") { parameters.set("minConfidence", "50"); parameters.set("maxConfidence", "75"); }
      if (credibilityFilter === "低（<50%）") parameters.set("maxConfidence", "50");
      setLeadPoolLoading(true);
      try {
        const response = await fetch(`/api/price-collection?${parameters}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json().catch(() => ({})) as PriceCollectionLeadPoolResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "价格线索查询失败");
        const nextLeads = body.leads.map(mapDatabaseLead);
        setLeads(nextLeads);
        setReviewers(body.reviewers);
        setPoolPagination(body.pagination);
        setPoolSummary(body.summary);
        setSelectedId((current) => nextLeads.some((lead) => lead.code === current) ? current : (nextLeads[0]?.code ?? ""));
        setCheckedIds((current) => current.filter((code) => nextLeads.some((lead) => lead.code === code)));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.danger("采集结果加载失败", error instanceof Error ? error.message : "服务端分页查询不可用");
      } finally {
        setLeadPoolLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    appliedStatus, appliedType, assigneeFilter, credibilityFilter, currentTaskId,
    dataMode, page, pageSize, query, refreshKey, resultScope, riskFilter, sourceFilter, toast,
    validityFilter,
  ]);
  useEffect(() => {
    if (dataMode !== "supabase") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const parameters = new URLSearchParams({
        view: "lead_pool",
        page: "1",
        pageSize: "100",
        validity: validityFilter,
      });
      if (query.trim()) parameters.set("keyword", query.trim());
      if (appliedStatus !== "全部") parameters.set("status", appliedStatus);
      if (sourceFilter !== "全部") parameters.set("source", sourceFilter);
      if (riskFilter !== "全部") parameters.set("risk", riskFilter);
      if (assigneeFilter !== "全部") parameters.set("assignee", assigneeFilter);
      if (resultScope === "current" && currentTaskId) parameters.set("taskId", currentTaskId);
      if (credibilityFilter === "非常高（≥90%）") parameters.set("minConfidence", "90");
      if (credibilityFilter === "高（75%-90%）") { parameters.set("minConfidence", "75"); parameters.set("maxConfidence", "90"); }
      if (credibilityFilter === "中（50%-75%）") { parameters.set("minConfidence", "50"); parameters.set("maxConfidence", "75"); }
      if (credibilityFilter === "低（<50%）" || credibilityFilter === "低于75%") parameters.set("maxConfidence", credibilityFilter === "低于75%" ? "75" : "50");
      setAnalysisLoading(true);
      try {
        const response = await fetch(`/api/price-collection?${parameters}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json().catch(() => ({})) as PriceCollectionLeadPoolResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "分析样本加载失败");
        setAnalysisPool(body.leads.map(mapDatabaseLead));
        setAnalysisTotal(body.pagination.total);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAnalysisPool([]);
        setAnalysisTotal(0);
      } finally {
        setAnalysisLoading(false);
      }
    }, 240);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    appliedStatus, assigneeFilter, credibilityFilter, currentTaskId, dataMode,
    query, refreshKey, resultScope, riskFilter, sourceFilter, validityFilter,
  ]);
  const scopedLeads = useMemo(
    () => resultScope === "current" && currentTaskId
      ? leads.filter((item) => item.taskId === currentTaskId)
      : leads,
    [currentTaskId, leads, resultScope],
  );
  const filtered = useMemo(
    () =>
      scopedLeads.filter((item) => {
        const text =
          `${item.code}${item.name}${item.spec}${item.source}${item.region}${item.supplier}`.toLowerCase();
        return (
          (!query || text.includes(query.toLowerCase())) &&
          (appliedType === "全部" || item.type === appliedType) &&
          (appliedStatus === "全部" || item.status === appliedStatus) &&
          (sourceFilter === "全部" || item.source === sourceFilter) &&
          (riskFilter === "全部" || item.risk === riskFilter) &&
          (credibilityFilter === "全部" ||
            (credibilityFilter === "低于75%" && item.credibility < 75) ||
            (credibilityFilter === "非常高（≥90%）" && item.credibility >= 90) ||
            (credibilityFilter === "高（75%-90%）" &&
              item.credibility >= 75 &&
              item.credibility < 90) ||
            (credibilityFilter === "中（50%-75%）" &&
              item.credibility >= 50 &&
              item.credibility < 75) ||
            (credibilityFilter === "低（<50%）" && item.credibility < 50))
        );
      }),
    [
      scopedLeads,
      query,
      appliedType,
      appliedStatus,
      sourceFilter,
      riskFilter,
      credibilityFilter,
    ],
  );
  const analysisRows = useMemo(
    () => analysisType === "全部"
      ? analysisPool
      : analysisPool.filter((lead) => lead.type === analysisType),
    [analysisPool, analysisType],
  );
  const analysisCounts = useMemo(() => ({
    all: analysisPool.length,
    equipment: analysisPool.filter((lead) => lead.type === "设备").length,
    material: analysisPool.filter((lead) => lead.type === "地材").length,
  }), [analysisPool]);
  const analysisScopeLabel = analysisType === "全部" ? "设备与地材" : analysisType;
  const analysisInsightItems = analysisType === "设备"
    ? [
        ["核实厂家官网报价", "优先回到厂家官网核对设备报价与有效期。", "去核验"],
        ["补充技术参数", "检查型号、品牌和技术参数是否完整。", "去补充"],
        ["进入设备价格库审核", "高匹配线索可提交设备价格库人工审核。", "去审核"],
      ]
    : analysisType === "地材"
      ? [
          ["核实价格发布机构", "优先核对月报或官方价格发布页面。", "去核验"],
          ["补充运输与交付条件", "检查运距、交付地和计价条件是否完整。", "去补充"],
          ["进入地材价格库审核", "高匹配线索可提交地材价格库人工审核。", "去审核"],
        ]
      : [
          ["核实来源原文", "优先回到来源页面核对报价与有效期。", "去核验"],
          ["补充规格与交易条件", "检查规格、单位和交付条件是否完整。", "去补充"],
          ["进入对应价格库审核", "按对象类型提交至相应价格库人工审核。", "去审核"],
        ];
  const pageCount = poolPagination.pageCount;
  const visible = filtered;
  const latestQuoteTime = Math.max(...visible.map((lead) => new Date(lead.priceMonth).getTime()).filter(Number.isFinite), 0);
  const latestCollectedTime = Math.max(...visible.map((lead) => new Date(lead.collectedAt).getTime()).filter(Number.isFinite), 0);
  const stalePriceCount = visible.filter((lead) => {
    const quoteTime = new Date(lead.priceMonth).getTime();
    return Number.isFinite(quoteTime) && freshnessReferenceTime - quoteTime > advancedConfig.maxPriceAgeDays * 86_400_000;
  }).length;
  const selected: Lead | null =
    filtered.find((item) => item.code === selectedId) ?? filtered.at(0) ?? null;
  const analysisSelected: Lead | null =
    analysisRows.find((item) => item.code === selectedId) ?? analysisRows.at(0) ?? null;
  const leadDetailLoading = Boolean(
    detailOpen && selected?.databaseId && leadDetail?.lead.id !== selected.databaseId,
  );
  const allVisibleChecked =
    visible.length > 0 && visible.every((item) => checkedIds.includes(item.code));
  const targetType = task.target === "地材" ? "material" : "equipment";
  const activeSourceIds = useMemo(
    () =>
      selectedSourceIds.filter((id) =>
        sources.some(
          (source) =>
            source.id === id &&
            source.sourceKind === collectionMode &&
            isCollectionSourceReady(source) &&
            (source.config.targetType === "all" || !source.config.targetType || source.config.targetType === targetType),
        ),
      ),
    [collectionMode, selectedSourceIds, sources, targetType],
  );
  const webSourceCount = sources.filter((source) => source.sourceKind === "web").length;
  const apiSourceCount = sources.filter((source) => source.sourceKind === "api").length;
  const currentSources = useMemo(
    () => sources.filter((source) => {
      const configuredTarget = source.config.targetType || "all";
      return source.sourceKind === collectionMode && (configuredTarget === "all" || configuredTarget === targetType);
    }),
    [collectionMode, sources, targetType],
  );
  const healthyCurrentSources = useMemo(
    () => currentSources.filter(isCollectionSourceReady),
    [currentSources],
  );
  const materialWebSources = useMemo(
    () => sources.filter((source) => source.sourceKind === "web" && source.config.targetType === "material"),
    [sources],
  );
  const healthyMaterialWebSources = useMemo(
    () => materialWebSources.filter(isCollectionSourceReady),
    [materialWebSources],
  );
  const recommendedSourceIds = useMemo(
    () => healthyCurrentSources
      .filter((source) => source.qualityScore >= 70)
      .slice(0, targetType === "material" ? 8 : 6)
      .map((source) => source.id),
    [healthyCurrentSources, targetType],
  );
  const visibleCurrentSources = useMemo(() => {
    const normalizedQuery = sourceQuery.trim().toLowerCase();
    return currentSources.filter((source) => {
      const healthy = isCollectionSourceReady(source);
      const matchesView = sourceViewFilter === "all"
        || (sourceViewFilter === "selected" && selectedSourceIds.includes(source.id))
        || (sourceViewFilter === "healthy" && healthy)
        || (sourceViewFilter === "pending" && !healthy);
      if (!matchesView) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        source.name,
        source.baseUrl,
        source.defaultRegion,
        source.defaultCurrency,
        source.config.catalogSourceType,
        ...(source.config.materialCategories || []),
      ].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [currentSources, selectedSourceIds, sourceQuery, sourceViewFilter]);
  const runActive = run.status === "running" || run.status === "paused";

  useEffect(() => {
    if (!detailOpen || !selected?.databaseId) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/price-collection?view=lead_detail&leadId=${encodeURIComponent(selected.databaseId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as PriceCollectionLeadDetailResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "线索证据加载失败");
        setLeadDetail(body);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.warning("证据详情加载失败", error instanceof Error ? error.message : "请稍后重试");
      });
    return () => controller.abort();
  }, [detailOpen, selected?.databaseId, toast]);
  const preflightChecks = useMemo(() => {
    const sourceModes = collectionMode === "web" || collectionMode === "api";
    const effectivePricePeriodTo = advancedConfig.pricePeriodToMode === "current_month"
      ? defaultPriceMonth()
      : advancedConfig.pricePeriodTo;
    const pricePeriodReady = Boolean(advancedConfig.pricePeriodFrom)
      && Boolean(effectivePricePeriodTo)
      && advancedConfig.pricePeriodFrom <= effectivePricePeriodTo;
    const selectedModeSources = currentSources.filter((source) => selectedSourceIds.includes(source.id));
    const objectReady = collectionMode === "quote_upload" || Boolean(task.keyword.trim());
    const inputReady = collectionMode === "manual"
      ? Boolean(manualDraft.supplierName.trim()) && Number(manualDraft.price) > 0 && Boolean(manualDraft.priceDate)
      : collectionMode === "quote_upload"
        ? Boolean(uploadFile)
        : activeSourceIds.length > 0;
    return [
      { label: "业务库与写入权限", passed: dataMode === "supabase" && permissions.canWrite, detail: dataMode === "supabase" ? (permissions.canWrite ? "业务库可写" : "当前账号无写入权限") : "业务库未连接" },
      { label: collectionMode === "quote_upload" ? "文件业务归属" : "价格对象", passed: objectReady, detail: task.keyword.trim() || `${task.target} · ${task.region}` },
      { label: sourceModes ? "来源健康与提取能力" : collectionMode === "manual" ? "人工报价必填项" : "报价文件", passed: inputReady, detail: sourceModes ? `${activeSourceIds.length}/${selectedModeSources.length} 个来源通过质量分、连通性和解析策略检查` : collectionMode === "manual" ? `${manualDraft.supplierName.trim() || "未填写来源主体"} · ${manualDraft.priceDate || "未填写价格日期"}` : uploadFile?.name || "尚未选择文件" },
      { label: "价格所属期", passed: sourceModes ? pricePeriodReady : true, detail: sourceModes ? `${advancedConfig.pricePeriodFrom || "未设置"} 至 ${advancedConfig.pricePeriodToMode === "current_month" ? `${effectivePricePeriodTo}（随当前月更新）` : effectivePricePeriodTo || "未设置"}` : "按录入或文件识别的价格日期校验" },
      { label: "来源证据留存", passed: sourceModes ? advancedConfig.requireEvidence : true, detail: collectionMode === "manual" ? (manualDraft.sourceUrl.trim() ? "已填写外部依据，初始可信度 70%" : "以信息提供方和操作记录追溯，初始可信度降为 45%") : collectionMode === "quote_upload" ? "原始文件写入私有存储并与识别明细关联" : advancedConfig.requireEvidence ? "候选必须保存网址、快照或原始文件" : "当前规则允许无证据候选，不建议执行" },
      { label: "人工审核闸门", passed: true, detail: "AI结果只进入价格线索池，必须在线索池人工确认后才能写入正式价格库" },
    ];
  }, [activeSourceIds.length, advancedConfig.pricePeriodFrom, advancedConfig.pricePeriodTo, advancedConfig.pricePeriodToMode, advancedConfig.requireEvidence, collectionMode, currentSources, dataMode, manualDraft.price, manualDraft.priceDate, manualDraft.sourceUrl, manualDraft.supplierName, permissions.canWrite, selectedSourceIds, task.keyword, task.region, task.target, uploadFile]);
  const executeDisabledReason = useMemo(() => {
    if (dataMode === "loading") return "正在连接业务库";
    if (dataMode !== "supabase") return "业务库不可用";
    if (!permissions.canWrite) return "当前账号没有任务写入权限";
    if (runActive) return "请先完成或终止当前任务";
    if (collectionMode === "quote_upload") {
      return uploadFile ? "" : "请先选择报价文件";
    }
    if (collectionMode === "manual") {
      if (!task.keyword.trim()) return "请填写价格对象名称";
      if (!manualDraft.supplierName.trim()) return "请填写供应商或信息提供方";
      if (!(Number(manualDraft.price) > 0)) return "请填写有效价格";
      if (!manualDraft.priceDate) return "请选择价格日期";
      return "";
    }
    if (!task.keyword.trim()) return "请填写名称或关键词";
    if (!activeSourceIds.length) return "请至少选择一个已验证来源";
    const effectivePricePeriodTo = advancedConfig.pricePeriodToMode === "current_month" ? defaultPriceMonth() : advancedConfig.pricePeriodTo;
    if (!advancedConfig.pricePeriodFrom || !effectivePricePeriodTo) return "请设置价格所属期";
    if (advancedConfig.pricePeriodFrom > effectivePricePeriodTo) return "起始月份不能晚于截止月份";
    return "";
  }, [
    activeSourceIds.length,
    advancedConfig.pricePeriodFrom,
    advancedConfig.pricePeriodTo,
    advancedConfig.pricePeriodToMode,
    collectionMode,
    dataMode,
    permissions.canWrite,
    runActive,
    manualDraft.price,
    manualDraft.priceDate,
    manualDraft.supplierName,
    task.keyword,
    uploadFile,
  ]);

  const activeFilters = useMemo(
    () =>
      [
        query ? { key: "query", label: `关键词：${query}` } : null,
        appliedType !== "全部"
          ? { key: "type", label: `类型：${appliedType}` }
          : null,
        appliedStatus !== "全部"
          ? { key: "status", label: `状态：${appliedStatus}` }
          : null,
        sourceFilter !== "全部"
          ? { key: "source", label: `来源：${sourceFilter}` }
          : null,
        credibilityFilter !== "全部"
          ? { key: "credibility", label: `可信度：${credibilityFilter}` }
          : null,
        riskFilter !== "全部"
          ? { key: "risk", label: `风险：${riskFilter}` }
          : null,
        assigneeFilter !== "全部"
          ? { key: "assignee", label: assigneeFilter === "unassigned" ? "责任人：未分派" : `责任人：${reviewers.find((item) => item.userId === assigneeFilter)?.displayName || "已指定"}` }
          : null,
      ].filter(Boolean) as Array<{ key: string; label: string }>,
    [
      query,
      appliedType,
      appliedStatus,
      sourceFilter,
      credibilityFilter,
      riskFilter,
      assigneeFilter,
      reviewers,
    ],
  );

  const kpis = useMemo<KpiItem[]>(() => {
    return [
      {
        title: "本批采集结果",
        value: String(poolSummary.total),
        unit: "条",
        caption: run.id ? `任务 ${run.id.slice(-6)}` : "等待新任务",
        icon: Box,
        tone: "blue",
      },
      {
        title: "待线索池审核",
        value: String(poolSummary.pending),
        unit: "条",
        caption: "AI不可直接确认",
        icon: Hourglass,
        tone: "orange",
      },
      {
        title: "待正式入库",
        value: String(poolSummary.ready),
        unit: "条",
        caption: "等待正式入库操作",
        icon: CheckCircle2,
        tone: "green",
      },
      {
        title: "已入正式价格库",
        value: String(poolSummary.transferred),
        unit: "条",
        caption: "已完成人工审核入库",
        icon: Database,
        tone: "purple",
      },
      {
        title: "高风险结果",
        value: String(poolSummary.highRisk),
        unit: "条",
        caption: "必须人工复核",
        icon: ShieldAlert,
        tone: "red",
      },
    ];
  }, [poolSummary, run.id]);

  const credibilityDistribution = useMemo<DistributionItem[]>(() => {
    if (!analysisRows.length) return [];
    const groups = [
      { label: "非常高（≥90%）", color: "#3B82F6", match: (v: number) => v >= 90 },
      { label: "高（75%-90%）", color: "#22B8A7", match: (v: number) => v >= 75 && v < 90 },
      { label: "中（50%-75%）", color: "#F59E0B", match: (v: number) => v >= 50 && v < 75 },
      { label: "低（<50%）", color: "#EF4444", match: (v: number) => v < 50 },
    ];
    return groups.map((group) => {
      const value = analysisRows.filter((lead) => group.match(lead.credibility)).length;
      return {
        label: group.label,
        value,
        percent: `${((value / analysisRows.length) * 100).toFixed(1)}%`,
        color: group.color,
      };
    });
  }, [analysisRows]);

  const sourceDistribution = useMemo<DistributionItem[]>(() => {
    const colors = ["#3B82F6", "#22B8A7", "#F59E0B", "#8B5CF6", "#EF4444", "#94A3B8"];
    return Array.from(new Set(analysisRows.map((lead) => lead.source))).map(
      (label, index) => {
        const value = analysisRows.filter((lead) => lead.source === label).length;
        return {
          label,
          value,
          percent: `${analysisRows.length ? ((value / analysisRows.length) * 100).toFixed(1) : "0.0"}%`,
          color: colors[index % colors.length],
        };
      },
    );
  }, [analysisRows]);

  const riskBreakdown = useMemo(
    () => [
      {
        key: "high",
        label: "高风险结果",
        count: filtered.filter((lead) => lead.risk === "高风险").length,
      },
      {
        key: "low-credibility",
        label: "来源可信度低于75%",
        count: filtered.filter((lead) => lead.credibility < 75).length,
      },
      {
        key: "missing-spec",
        label: "规格信息不完整",
        count: filtered.filter((lead) => lead.spec === "待AI补全规格").length,
      },
      {
        key: "duplicate",
        label: "疑似重复记录",
        count: filtered.filter((lead) => lead.duplicateStatus === "疑似重复")
          .length,
      },
    ],
    [filtered],
  );

  const regions = useMemo(() => {
    const regionNames = Array.from(new Set(analysisRows.map((lead) => lead.region)));
    if (regionMode === "count") {
      return regionNames
        .map((name) => ({
          name,
          raw: analysisRows.filter((lead) => lead.region === name).length,
        }))
        .sort((a, b) => b.raw - a.raw)
        .slice(0, 5)
        .map((item) => [
          item.name,
          `${analysisRows.length ? ((item.raw / analysisRows.length) * 100).toFixed(1) : "0.0"}%`,
        ] as const);
    }
    const averages = regionNames.map((name) => {
      const rows = analysisRows.filter((lead) => lead.region === name);
      return {
        name,
        raw:
          rows.reduce((sum, lead) => sum + lead.price, 0) /
          Math.max(1, rows.length),
      };
    });
    const max = Math.max(...averages.map((item) => item.raw), 1);
    return averages
      .sort((a, b) => b.raw - a.raw)
      .slice(0, 5)
      .map(
        (item) =>
          [item.name, `${((item.raw / max) * 100).toFixed(1)}%`] as const,
      );
  }, [analysisRows, regionMode]);

  function appendRunLog(message: string) {
    setRun((current) => ({
      ...current,
      logs: [message, ...current.logs].slice(0, 8),
    }));
  }

  async function startCollection() {
    if (dataMode === "loading") {
      toast.info("正在连接价格采集业务库", "同步完成后即可创建采集任务。");
      return;
    }
    if (dataMode !== "supabase") {
      toast.danger("业务库连接不可用", "为避免产生伪采集结果，连接恢复前不能创建采集任务。");
      return;
    }
    if (!task.keyword.trim()) {
      toast.warning("请输入采集名称或关键词", "用于生成本次采集任务。");
      document.getElementById("collection-keyword")?.focus();
      return;
    }
    if (dataMode === "supabase" && !permissions.canWrite) {
      toast.warning("当前角色没有价格采集写入权限");
      return;
    }
    if ((collectionMode === "web" || collectionMode === "api") && activeSourceIds.length === 0) {
      toast.warning("请选择白名单采集来源", "网页与 API 采集不能访问未登记来源。" );
      return;
    }
    const now = new Date().toLocaleString("zh-CN", { hour12: false });
    const taskId = `COL-${Date.now().toString().slice(-8)}`;
    let nextRun: CollectionRun = {
      id: taskId,
      status: "running",
      progress: 8,
      currentSource: "正在调用白名单采集器",
      successCount: 0,
      failedCount: 0,
      fetchedCount: 0,
      evidenceCount: 0,
      updatedCount: 0,
      duplicateCount: 0,
      startedAt: now,
      finishedAt: "--",
      logs: [
        `${now} 任务已启动，价格所属期 ${advancedConfig.pricePeriodFrom} 至 ${advancedConfig.pricePeriodToMode === "current_month" ? "当前月" : advancedConfig.pricePeriodTo}，最多 ${advancedConfig.maxResults} 条`,
        `已选择 ${activeSourceIds.length} 个白名单来源，去重阈值 ${advancedConfig.dedupThreshold}%`,
      ],
      sourceRuns: [],
    };
    setCollectionSubmitting(true);
    try {
      const payload = await callCollectionApi("POST", {
        action: "create_task",
        collectionMode,
        sourceIds: activeSourceIds,
        targetType: task.target === "地材" ? "material" : "equipment",
        keyword: task.keyword,
        specification: task.spec,
        region: task.region,
        currency: task.currency,
        sourceType: task.source,
        frequency: task.frequency,
          config: {
            ...advancedConfig,
            dedupScope: "item_source_price_period",
            samePeriodPolicy: "update_observation",
            crossPeriodPolicy: "create_new",
            materialKeywords: task.target === "地材"
            ? splitMaterialKeywords(task.keyword)
            : [],
        },
        deferExecution: true,
      });
      const createdTask = payload.task as PriceCollectionTaskRecord;
      nextRun = mapDatabaseTask(createdTask);
      nextRun.status = "running";
      nextRun.progress = Math.max(nextRun.progress, 3);
      nextRun.currentSource = "任务已提交，正在连接采集器";
      nextRun.logs = [
        `${now} 任务已进入真实采集队列`,
        ...nextRun.logs,
      ];
      setRun(nextRun);
      toast.info("采集任务已提交", "页面将持续显示抓取、证据和价格线索进度。");

      const executionRequest = callCollectionApi("PATCH", {
        entity: "task",
        action: "start",
        id: createdTask.id,
      });
      let completed = false;
      let latestSnapshot: {
        task: PriceCollectionTaskRecord;
        run: PriceCollectionRunRecord | null;
        sourceRuns: PriceCollectionSourceRunRecord[];
        evidenceCount: number;
      } | null = null;
      for (let attempt = 0; attempt < 180 && !completed; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const response = await fetch(
          `/api/price-collection?view=task_status&taskId=${encodeURIComponent(createdTask.id)}`,
          { cache: "no-store" },
        );
        if (!response.ok) continue;
        const snapshot = (await response.json()) as {
          task: PriceCollectionTaskRecord;
          run: PriceCollectionRunRecord | null;
          sourceRuns: PriceCollectionSourceRunRecord[];
          evidenceCount: number;
        };
        latestSnapshot = snapshot;
        setRun(mapDatabaseTask(snapshot.task, snapshot.run ?? undefined, snapshot.evidenceCount, snapshot.sourceRuns));
        completed = ["completed", "failed", "stopped"].includes(snapshot.task.status);
      }
      const execution = await executionRequest;
      const finishedTask = latestSnapshot?.task ?? execution.task as PriceCollectionTaskRecord;
      const detailResponse = await fetch(
        `/api/price-collection/tasks/${encodeURIComponent(createdTask.id)}?view=evidence&page=1&pageSize=10`,
        { cache: "no-store" },
      );
      const detail = detailResponse.ok
        ? (await detailResponse.json()) as PriceCollectionTaskDetail
        : null;
      const finishedRun = detail?.runs[0];
      nextRun = mapDatabaseTask(finishedTask, finishedRun, detail?.summary.evidence ?? 0, detail?.sourceRuns ?? []);
      nextRun.logs = [
        `${new Date().toLocaleString("zh-CN", { hour12: false })} 抓取完成：${nextRun.fetchedCount} 页，证据 ${nextRun.evidenceCount} 条，价格线索 ${nextRun.successCount} 条`,
        ...nextRun.logs,
      ];
    } catch (error) {
      const message = error instanceof Error ? error.message : "任务创建失败";
      toast.danger("采集任务创建失败", message);
      setCollectionSubmitting(false);
      return;
    }
    await loadBusinessData(false);
    setRun(nextRun);
    setCollectionSubmitting(false);
    toast.success(
      nextRun.status === "failed" ? "采集执行失败，已记录来源错误" : "真实采集任务执行完成",
      `${task.target} · ${task.keyword} · 抓取 ${nextRun.fetchedCount} 页 · 价格线索 ${nextRun.successCount} 条`,
    );
  }

  async function saveCollectionTemplate() {
    if (templateAction) return;
    setTemplateAction("save");
    setTemplateFeedback({ tone: "info", text: "正在保存当前采集方式、范围、来源和规则..." });
    try {
      const response = await fetch("/api/price-collection/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: [{ id: "default", name: "我的常用采集模板", collectionMode, task, advancedConfig, selectedSourceIds, updatedAt: new Date().toISOString() }] }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "模板保存失败");
      setTemplateFeedback({ tone: "success", text: `已保存“我的常用采集模板” · ${collectionModeMeta[collectionMode].label} · ${task.target}${task.keyword ? ` · ${task.keyword}` : ""}` });
      toast.success("采集模板已同步", "当前范围、来源和高级规则已保存到个人业务配置。 ");
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      setTemplateFeedback({ tone: "danger", text: `保存失败：${message}` });
      toast.danger("模板保存失败", message);
    } finally {
      setTemplateAction("");
    }
  }

  async function applyCollectionTemplate() {
    if (templateAction) return;
    setTemplateAction("load");
    setTemplateFeedback({ tone: "info", text: "正在读取个人常用采集模板..." });
    try {
      const response = await fetch("/api/price-collection/templates", { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { templates?: Array<{
        collectionMode?: CollectionMode;
        task?: Partial<TaskConfig>;
        advancedConfig?: Partial<AdvancedConfig>;
        selectedSourceIds?: string[];
      }>; error?: string };
      if (!response.ok) throw new Error(body.error || "模板读取失败");
      const parsed = body.templates?.[0];
      if (!parsed) {
        setTemplateFeedback({ tone: "info", text: "尚未保存常用模板，请先设置范围并点击“保存为常用模板”。" });
        toast.info("暂无已保存模板", "设置采集范围后点击“保存模板”。");
        return;
      }
      if (parsed.collectionMode) setCollectionMode(parsed.collectionMode);
      setTask((current) => ({ ...current, ...parsed.task }));
      setAdvancedConfig((current) => ({
        ...current,
        ...parsed.advancedConfig,
      }));
      if (Array.isArray(parsed.selectedSourceIds)) {
        setSelectedSourceIds(
          parsed.selectedSourceIds.filter((id) => sources.some((source) => source.id === id)),
        );
      }
      const loadedMode = parsed.collectionMode || collectionMode;
      const loadedTarget = parsed.task?.target || task.target;
      const loadedKeyword = parsed.task?.keyword || task.keyword;
      setTemplateFeedback({ tone: "success", text: `已载入“我的常用采集模板” · ${collectionModeMeta[loadedMode].label} · ${loadedTarget}${loadedKeyword ? ` · ${loadedKeyword}` : ""}` });
      toast.success("常用模板已应用");
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      setTemplateFeedback({ tone: "danger", text: `载入失败：${message}` });
      toast.warning("模板读取失败", message);
    } finally {
      setTemplateAction("");
    }
  }

  function resetCollectionScope() {
    setTask({
      target: "设备",
      keyword: "",
      spec: "",
      region: "南京",
      currency: "CNY",
      source: "全部来源",
      frequency: "每天",
    });
    setManualDraft({ supplierName: "", price: "", unit: "台", sourceUrl: "", priceDate: defaultPriceDate() });
    setUploadFile(null);
    setSelectedSourceIds(sources.map((source) => source.id));
    toast.info("采集范围已清空");
  }

  function changeCollectionMode(mode: CollectionMode) {
    setCollectionMode(mode);
    setMaterialPickerOpen(false);
    setSourceQuery("");
    setSourceViewFilter("all");
    if (mode === "manual") {
      setManualDraft((current) => ({
        ...current,
        unit: current.unit || (task.target === "地材" ? "吨" : "台"),
      }));
    }
  }

  function changeCollectionTarget(target: LeadType) {
    if (target === task.target) return;
    setTask((current) => ({
      ...current,
      target,
      keyword: "",
      spec: "",
    }));
    setManualDraft((current) => ({
      ...current,
      unit: target === "地材" ? "吨" : "台",
    }));
    setMaterialPickerOpen(false);
    setMaterialPickerQuery("");
    setSourceQuery("");
    setSourceViewFilter("all");
  }

  function applyCongoMaterialPreset() {
    const materialSourceIds = sources
      .filter((source) =>
        source.sourceKind === "web"
        && source.config.targetType === "material"
        && isCollectionSourceReady(source),
      )
      .map((source) => source.id);
    if (!materialSourceIds.length) {
      toast.warning("暂无可用地材来源", "请先同步业务数据或验证刚果地材来源。");
      return;
    }
    setCollectionMode("web");
    setTask({
      target: "地材",
      keyword: "水泥",
      spec: "",
      region: "Kinshasa / 金沙萨",
      currency: "USD",
      source: "全部来源",
      frequency: "仅本次",
    });
    setSelectedSourceIds(materialSourceIds);
    setSourceQuery("");
    setSourceViewFilter("all");
    setSourceListExpanded(true);
    toast.success("刚果地材采集已配置", `已选择 ${materialSourceIds.length} 个可用来源，可修改关键词后开始采集。`);
    window.setTimeout(() => document.getElementById("collection-keyword")?.focus(), 50);
  }

  function toggleMaterialKeyword(keyword: string) {
    setTask((current) => {
      const selected = splitMaterialKeywords(current.keyword);
      const next = selected.includes(keyword)
        ? selected.filter((item) => item !== keyword)
        : [...selected, keyword];
      return { ...current, keyword: next.join("、"), spec: "" };
    });
  }

  function toggleAllMaterialKeywords() {
    setTask((current) => {
      const selected = splitMaterialKeywords(current.keyword);
      const next = selected.length === materialKeywordOptions.length
        ? []
        : materialKeywordOptions;
      return { ...current, keyword: next.join("、"), spec: "" };
    });
  }

  function toggleMaterialKeywordGroup(groupItems: readonly string[]) {
    setTask((current) => {
      const selected = splitMaterialKeywords(current.keyword);
      const selectedSet = new Set(selected);
      const groupIsSelected = groupItems.every((item) => selectedSet.has(item));
      const next = groupIsSelected
        ? selected.filter((item) => !groupItems.includes(item))
        : Array.from(new Set([...selected, ...groupItems]));
      return { ...current, keyword: next.join("、"), spec: "" };
    });
  }

  function runTaskPreflight() {
    setPreflightOpen(true);
  }

  async function submitManualEntry() {
    if (executeDisabledReason) {
      toast.warning("人工录入校验未通过", executeDisabledReason);
      return;
    }
    setManualSubmitting(true);
    try {
      const created = await callCollectionApi("POST", {
        action: "create_task",
        collectionMode: "manual",
        sourceIds: [],
        targetType: task.target === "地材" ? "material" : "equipment",
        keyword: task.keyword.trim(),
        specification: task.spec.trim(),
        region: task.region,
        currency: task.currency,
        sourceType: "manual_entry",
        frequency: "仅本次",
        config: { ...advancedConfig, requiresHumanReview: true },
      });
      const createdTask = created.task as PriceCollectionTaskRecord;
      setRun(mapDatabaseTask(createdTask));
      const ingested = await callCollectionApi("POST", {
        action: "ingest_result",
        taskId: createdTask.id,
        result: {
          targetType: task.target === "地材" ? "material" : "equipment",
          name: task.keyword.trim(),
          specification: task.spec.trim(),
          sourceType: "人工询价记录",
          sourceUrl: manualDraft.sourceUrl.trim(),
          region: task.region,
          quoteDate: manualDraft.priceDate,
          price: Number(manualDraft.price),
          currency: task.currency,
          originalUnit: manualDraft.unit.trim() || (task.target === "地材" ? "吨" : "台"),
          supplierName: manualDraft.supplierName.trim(),
          matchTarget: task.keyword.trim(),
          aiMatchScore: 0,
          confidence: manualDraft.sourceUrl.trim() ? 70 : 45,
          riskLevel: manualDraft.sourceUrl.trim() ? "low" : "medium",
          duplicateStatus: "unique",
        },
      });
      await loadBusinessData(false);
      const lead = ingested.lead as PriceCollectionLeadRecord | undefined;
      if (lead?.leadCode) setSelectedId(lead.leadCode);
      setManualDraft((current) => ({ ...current, price: "" }));
      toast.success(
        "人工价格已提交",
        `${task.keyword.trim()} 已进入价格线索池审核队列，不会直接进入正式价格库。`,
      );
    } catch (error) {
      toast.danger(
        "人工价格提交失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setManualSubmitting(false);
    }
  }

  async function uploadQuoteForCollection() {
    if (!uploadFile) {
      toast.warning("请先选择报价文件", "支持 Excel、CSV、PDF、PNG、JPEG 和 WEBP。 ");
      return;
    }
    if (!permissions.canWrite) {
      toast.warning("当前角色没有报价采集上传权限");
      return;
    }

    setUploading(true);
    try {
      const sessionResponse = await fetch("/api/price-collection/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type,
          targetType: task.target === "地材" ? "material" : "equipment",
          region: task.region,
          currency: task.currency,
        }),
      });
      const session = (await sessionResponse.json().catch(() => ({}))) as {
        error?: string;
        task?: PriceCollectionTaskRecord;
        document?: { id: string };
        upload?: { bucket: string; path: string; contentType: string };
        next?: { parseUrl: string; reviewUrl: string };
      };
      if (!sessionResponse.ok || !session.upload || !session.next || !session.document) {
        throw new Error(session.error || "无法创建报价上传会话");
      }

      const uploaded = await createBrowserSupabaseClient()
        .storage.from(session.upload.bucket)
        .upload(session.upload.path, uploadFile, {
          contentType: session.upload.contentType,
          upsert: false,
        });
      if (uploaded.error) throw uploaded.error;

      toast.success("报价文件已上传", "源文件已写入私有 Storage，正在识别报价明细。 ");
      const parseResponse = await fetch(session.next.parseUrl, { method: "POST" });
      const parseResult = (await parseResponse.json().catch(() => ({}))) as {
        error?: string;
        data?: { items?: unknown[] };
        aiQueueError?: string;
      };
      if (!parseResponse.ok) throw new Error(parseResult.error || "报价识别失败");

      if (session.task) setRun(mapDatabaseTask(session.task));
      setUploadFile(null);
      await loadBusinessData(false);
      if (parseResult.aiQueueError) {
        toast.warning("结构化解析完成", "AI复核暂不可用，报价已进入人工审核队列。 ");
      } else {
        toast.ai(
          "报价识别任务已创建",
          `已提取 ${parseResult.data?.items?.length ?? 0} 条明细，请完成人工复核后转入价格线索池。`,
        );
      }
      router.push(session.next.reviewUrl);
    } catch (error) {
      toast.danger(
        "报价采集失败",
        error instanceof Error ? error.message : "请检查文件格式和网络后重试",
      );
    } finally {
      setUploading(false);
    }
  }

  async function pauseOrResumeRun() {
    if (dataMode === "supabase" && run.databaseId) {
      try {
        await callCollectionApi("PATCH", {
          entity: "task",
          id: run.databaseId,
          action: run.status === "running" ? "pause" : "resume",
        });
      } catch (error) {
        toast.danger(
          "任务状态更新失败",
          error instanceof Error ? error.message : "请稍后重试",
        );
        return;
      }
    }
    if (run.status === "running") {
      setRun((current) => ({ ...current, status: "paused" }));
      appendRunLog(`${new Date().toLocaleTimeString("zh-CN")} 任务已人工暂停`);
      toast.info("采集任务已暂停");
      return;
    }
    if (run.status === "paused") {
      setRun((current) => ({ ...current, status: "running" }));
      appendRunLog(`${new Date().toLocaleTimeString("zh-CN")} 任务已继续运行`);
      toast.success("采集任务已继续");
    }
  }

  async function toggleTaskSchedule(item: PriceCollectionTaskRecord, nextFrequency?: string) {
    if (!permissions.canWrite) return toast.warning("当前角色没有周期调度管理权限");
    setTaskActionBusyId(item.id);
    try {
      const payload = await callCollectionApi("PATCH", {
        entity: "task",
        id: item.id,
        action: "update_schedule",
        scheduleEnabled: !item.scheduleEnabled,
        frequency: item.scheduleEnabled ? "仅本次" : nextFrequency || (item.frequency === "每小时" || item.frequency === "每周" || item.frequency === "每月" ? item.frequency : "每天"),
      });
      const updated = payload.task as PriceCollectionTaskRecord | undefined;
      if (!updated) throw new Error("周期调度更新结果缺失");
      setTasks((current) => current.map((taskItem) => taskItem.id === updated.id ? updated : taskItem));
      toast.success(updated.scheduleEnabled ? "周期调度已启用" : "周期调度已关闭", updated.scheduleEnabled ? `下次运行：${new Date(updated.nextRunAt).toLocaleString("zh-CN", { hour12: false })}` : "该任务不会再被定时器自动领取。");
    } catch (error) {
      toast.danger("周期调度更新失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setTaskActionBusyId("");
    }
  }

  function requestTaskSchedule(item: PriceCollectionTaskRecord) {
    if (item.scheduleEnabled) {
      void toggleTaskSchedule(item);
      return;
    }
    setScheduleTask(item);
    setScheduleFrequency(item.frequency === "每小时" || item.frequency === "每周" || item.frequency === "每月" ? item.frequency : "每天");
  }

  async function retryHistoryTask(item: PriceCollectionTaskRecord, failedOnly: boolean) {
    if (!permissions.canWrite) return toast.warning("当前角色没有采集任务操作权限");
    setTaskActionBusyId(item.id);
    try {
      await callCollectionApi("PATCH", {
        entity: "task",
        id: item.id,
        action: failedOnly ? "retry_failed" : "retry",
      });
      await loadBusinessData(false);
      toast.success(failedOnly ? "失败来源已重试" : "任务已重新执行", item.taskCode);
    } catch (error) {
      toast.danger("任务重试失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setTaskActionBusyId("");
    }
  }

  function adjustHistoryTask(item: PriceCollectionTaskRecord) {
    if (item.collectionMode === "web" || item.collectionMode === "api") setCollectionMode(item.collectionMode);
    setTask({
      target: item.targetType === "material" ? "地材" : "设备",
      keyword: item.keyword,
      spec: item.specification,
      region: item.region,
      currency: item.currency,
      source: item.sourceType || "全部来源",
      frequency: item.scheduleEnabled ? item.frequency : "仅本次",
    });
    setAdvancedConfig((current) => ({ ...current, ...(item.config as Partial<AdvancedConfig>) }));
    setTaskHistoryOpen(false);
    window.setTimeout(() => document.getElementById("collection-task-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    toast.info("已载入历史任务范围", "请调整关键词、来源或规则后重新执行。");
  }

  async function selectExecutionTask(taskId: string) {
    if (!taskId || taskId === currentTaskId) return;
    setTaskSwitching(true);
    try {
      const response = await fetch(`/api/price-collection/tasks/${encodeURIComponent(taskId)}?view=evidence&page=1&pageSize=10`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as PriceCollectionTaskDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error || "任务详情加载失败");
      setRun(mapDatabaseTask(payload.task, payload.runs[0], payload.summary.evidence, payload.sourceRuns));
      setResultScope("current");
      setCheckedIds([]);
      setPage(1);
      setShowRunLogs(false);
      toast.success("已切换执行任务", payload.task.taskCode);
    } catch (error) {
      toast.danger("任务切换失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setTaskSwitching(false);
    }
  }

  function toggleTaskSelection(taskId: string) {
    setSelectedTaskIds((current) => current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId]);
  }

  async function updateTaskArchive(item: PriceCollectionTaskRecord) {
    if (!permissions.canWrite) return toast.warning("当前角色没有任务归档权限");
    setTaskActionBusyId(item.id);
    try {
      const action = item.archivedAt ? "restore" : "archive";
      const payload = await callCollectionApi("PATCH", { entity: "task", id: item.id, action });
      const updated = payload.task as PriceCollectionTaskRecord | undefined;
      if (!updated) throw new Error("任务归档结果缺失");
      setTasks((current) => current.map((taskItem) => taskItem.id === updated.id ? updated : taskItem));
      setSelectedTaskIds((current) => current.filter((id) => id !== item.id));
      toast.success(action === "archive" ? "任务已归档" : "任务已恢复", action === "archive" ? "成果、证据与审计记录均已保留。" : "周期调度保持关闭，可按需重新启用。");
    } catch (error) {
      toast.danger(item.archivedAt ? "任务恢复失败" : "任务归档失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setTaskActionBusyId("");
    }
  }

  async function runBulkTaskAction(action: "bulk_disable_schedule" | "bulk_archive") {
    if (!selectedTaskIds.length) return toast.warning("请先选择任务");
    setTaskActionBusyId("bulk");
    try {
      const payload = await callCollectionApi("PATCH", { entity: "task", action, ids: selectedTaskIds });
      await loadBusinessData(false);
      const count = Number(payload.updatedCount || 0);
      setSelectedTaskIds([]);
      toast.success(action === "bulk_archive" ? "批量归档完成" : "周期调度已批量关闭", `已处理 ${count} 个任务`);
    } catch (error) {
      toast.danger("批量操作失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setTaskActionBusyId("");
    }
  }

  async function deleteHistoryTask() {
    if (!taskToDelete || !permissions.canWrite) return;
    const deleting = taskToDelete;
    setTaskActionBusyId(deleting.id);
    try {
      const response = await fetch(`/api/price-collection?entity=task&id=${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "任务删除失败");
      setTasks((current) => current.filter((item) => item.id !== deleting.id));
      setSelectedTaskIds((current) => current.filter((id) => id !== deleting.id));
      toast.success("空任务已删除", deleting.taskCode);
    } catch (error) {
      toast.danger("任务删除失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setTaskActionBusyId("");
      setTaskToDelete(null);
    }
  }

  function exportTaskHistory() {
    const exportItems = selectedTaskIds.length
      ? tasks.filter((item) => selectedTaskIds.includes(item.id))
      : filteredHistoryTasks;
    if (!exportItems.length) return toast.warning("当前没有可导出的任务");
    const escapeCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = exportItems.map((item) => [
      item.taskCode,
      item.targetType === "material" ? "地材" : "设备",
      item.keyword,
      item.specification,
      item.region,
      item.status,
      taskOutcomeLabel(item),
      item.qualifiedLeadCount,
      item.evidenceCount,
      item.failedCount,
      item.scheduleEnabled ? item.frequency : "仅本次",
      item.archivedAt ? "已归档" : "使用中",
      item.createdAt,
      item.finishedAt,
    ]);
    const header = ["任务编号", "类型", "关键词", "规格", "地区", "执行状态", "业务结果", "合格价格", "证据数", "失败来源", "调度", "管理状态", "创建时间", "完成时间"];
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `价格采集任务历史-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("任务历史已导出", `${exportItems.length} 条任务记录`);
  }

  async function stopRun() {
    if (dataMode === "supabase" && run.databaseId) {
      try {
        await callCollectionApi("PATCH", {
          entity: "task",
          id: run.databaseId,
          action: "stop",
        });
      } catch (error) {
        toast.danger(
          "终止任务失败",
          error instanceof Error ? error.message : "请稍后重试",
        );
        return;
      }
    }
    setRun((current) => ({
      ...current,
      status: "stopped",
      finishedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      logs: [`${new Date().toLocaleTimeString("zh-CN")} 任务已人工终止`, ...current.logs],
    }));
    toast.warning("采集任务已终止");
  }

  function toggleAll() {
    setCheckedIds((ids) =>
      allVisibleChecked
        ? ids.filter((id) => !visible.some((item) => item.code === id))
        : Array.from(new Set([
            ...ids,
            ...visible.map((item) => item.code),
          ])),
    );
  }

  async function deleteSelectedResults() {
    const selectedLeads = leads.filter((item) => checkedIds.includes(item.code));
    const blocked = selectedLeads.filter((item) => item.status === "已入正式价格库");
    if (blocked.length) {
      setConfirmDeleteResults(false);
      toast.warning("已入库结果不能删除", `请取消选择 ${blocked.length} 条已写入正式价格库的结果。`);
      return;
    }
    const databaseIds = selectedLeads.map((item) => item.databaseId).filter((id): id is string => Boolean(id));
    if (!databaseIds.length || databaseIds.length !== selectedLeads.length) {
      setConfirmDeleteResults(false);
      toast.warning("结果缺少业务主键", "请刷新后重新选择要删除的采集结果。");
      return;
    }
    try {
      const response = await fetch("/api/price-collection?entity=lead", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: databaseIds }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; deletedCount?: number };
      if (!response.ok) throw new Error(payload.error || "采集结果删除失败");
      setConfirmDeleteResults(false);
      setCheckedIds([]);
      setSelectedId("");
      setRefreshKey((value) => value + 1);
      toast.success("采集结果已删除", `已清理 ${payload.deletedCount ?? databaseIds.length} 条结果，操作已写入审计记录。`);
    } catch (error) {
      toast.danger("删除失败", error instanceof Error ? error.message : "请稍后重试");
    }
  }

  async function deleteCollectionSource() {
    if (!sourceToDelete) return;
    try {
      const response = await fetch("/api/price-collection/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sourceToDelete.id }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "采集来源删除失败");
      setSources((current) => current.filter((source) => source.id !== sourceToDelete.id));
      setSelectedSourceIds((current) => current.filter((id) => id !== sourceToDelete.id));
      toast.success("采集来源已删除", sourceToDelete.name);
      setSourceToDelete(null);
    } catch (error) {
      toast.danger("来源删除失败", error instanceof Error ? error.message : "请稍后重试");
    }
  }

  async function assignSelectedLeads() {
    if (!checkedIds.length || !assignmentReviewerId) {
      toast.warning("请选择线索和审核责任人");
      return;
    }
    const databaseIds = leads
      .filter((item) => checkedIds.includes(item.code))
      .map((item) => item.databaseId)
      .filter((id): id is string => Boolean(id));
    try {
      await callCollectionApi("PATCH", {
        entity: "lead",
        action: "assign",
        ids: databaseIds,
        reviewerId: assignmentReviewerId,
        reviewDueAt: assignmentDueAt ? new Date(assignmentDueAt).toISOString() : null,
        assignmentNote,
      });
      setAssignOpen(false);
      setCheckedIds([]);
      setAssignmentNote("");
      setRefreshKey((value) => value + 1);
      toast.success("审核任务已分派", `${databaseIds.length} 条线索已设置责任人和审核时限。`);
    } catch (error) {
      toast.danger("分派失败", error instanceof Error ? error.message : "请稍后重试");
    }
  }

  function openLeadPoolForReview(explicitIds: string[] = []) {
    const ids = explicitIds.length
      ? explicitIds
      : checkedIds.length
        ? checkedIds
        : selected
          ? [selected.code]
          : [];
    if (!ids.length) {
      toast.warning("请先选择价格候选");
      return;
    }
    const parameters = new URLSearchParams({
      source: "collection",
      leadId: ids[0],
    });
    if (ids.length > 1) parameters.set("leadIds", ids.join(","));
    router.push(`/price-leads?${parameters.toString()}`);
  }

  function handleKpi(title: string) {
    setQuery("");
    setSourceFilter("全部");
    setCredibilityFilter("全部");
    setRiskFilter("全部");
    setAssigneeFilter("全部");
    setAppliedType("全部");
    setAppliedStatus("全部");
    if (title === "待线索池审核") setAppliedStatus("待线索池审核");
    else if (title === "待正式入库") setAppliedStatus("待正式入库");
    else if (title === "已入正式价格库") setAppliedStatus("已入正式价格库");
    else if (title === "高风险结果") {
      setRiskFilter("高风险");
      toast.warning("已定位高风险结果", "高风险结果必须人工复核。 ");
    } else {
      setAppliedStatus("全部");
      setRiskFilter("全部");
      toast.info(title, "指标与当前采集结果使用同一数据口径。");
    }
    setPage(1);
  }

  function clearAllFilters() {
    setQuery("");
    setAppliedType("全部");
    setAppliedStatus("全部");
    setSourceFilter("全部");
    setCredibilityFilter("全部");
    setRiskFilter("全部");
    setPage(1);
  }

  function removeFilter(key: string) {
    if (key === "query") setQuery("");
    if (key === "type") setAppliedType("全部");
    if (key === "status") setAppliedStatus("全部");
    if (key === "source") setSourceFilter("全部");
    if (key === "credibility") setCredibilityFilter("全部");
    if (key === "risk") setRiskFilter("全部");
    if (key === "assignee") setAssigneeFilter("全部");
    setPage(1);
  }

  async function exportCollectionResults(format: "csv" | "json", selectedOnly: boolean) {
    try {
      const selectedDatabaseIds = checkedIds
        .map((code) => leads.find((lead) => lead.code === code)?.databaseId)
        .filter((id): id is string => Boolean(id));
      const response = await fetch("/api/price-collection/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          ids: selectedOnly ? selectedDatabaseIds : [],
          filters: {
            taskId: resultScope === "current" ? currentTaskId : "",
            keyword: query,
            type: appliedType,
            status: appliedStatus,
            source: sourceFilter,
            risk: riskFilter,
          },
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "导出文件生成失败");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || `price-collection.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("采集结果已导出", `${response.headers.get("x-export-count") || filtered.length} 条真实业务记录`);
    } catch (error) {
      toast.danger("导出失败", error instanceof Error ? error.message : "无法生成导出文件");
      throw error;
    }
  }

  function focusLead(lead: Lead, openDetail = false) {
    setSelectedId(lead.code);
    setQuery(lead.code);
    setPage(1);
    if (openDetail) setDetailOpen(true);
  }

  async function rejectSelectedLead() {
    if (!selected) {
      setConfirmReject(false);
      toast.warning("请先选择采集结果");
      return;
    }
    if (dataMode === "supabase") {
      if (!permissions.canReview || !selected.databaseId) {
        toast.warning("当前记录不能执行人工驳回");
        return;
      }
      if (!reviewNotes.trim()) {
        toast.warning("请填写驳回原因");
        return;
      }
      try {
        await callCollectionApi("PATCH", {
          entity: "lead",
          id: selected.databaseId,
          action: "reject",
          notes: reviewNotes,
        });
      } catch (error) {
        toast.danger(
          "驳回失败",
          error instanceof Error ? error.message : "请稍后重试",
        );
        return;
      }
    }
    setLeads((items) =>
      items.map((item) =>
        item.code === selected.code ? { ...item, status: "已驳回" } : item,
      ),
    );
    setDetailOpen(false);
    setReviewNotes("");
    toast.warning("采集结果已驳回", `${selected.code} 不会进入线索池。`);
  }

  const inputClass =
    "h-10 min-w-0 rounded-[8px] border border-borderSoft bg-white px-3 text-[13px] text-textSecondary shadow-sm outline-none focus:border-primary";
  const selectedMaterialNames = task.target === "地材"
    ? splitMaterialKeywords(task.keyword)
    : [];
  const allMaterialsSelected =
    selectedMaterialNames.length === materialKeywordOptions.length;
  const materialSpecificationOptions =
    getMaterialSpecificationOptionsForKeywords(selectedMaterialNames);
  const normalizedMaterialPickerQuery = materialPickerQuery.trim().toLowerCase();
  const filteredMaterialKeywordGroups = materialKeywordGroups
    .map((group) => ({
      ...group,
      allItems: group.items,
      items: group.items.filter((item) =>
        !normalizedMaterialPickerQuery ||
        item.toLowerCase().includes(normalizedMaterialPickerQuery) ||
        group.label.toLowerCase().includes(normalizedMaterialPickerQuery)
      ),
    }))
    .filter((group) => group.items.length > 0);
  const operationalTasks = tasks.filter((item) => !item.archivedAt);
  const archivedTasks = tasks.filter((item) => item.archivedAt);
  const recurringTasks = operationalTasks.filter((item) => item.scheduleEnabled);
  const attentionTasks = operationalTasks.filter(taskNeedsAttention);
  const qualifiedTasks = operationalTasks.filter((item) => item.catalogCandidateCount > 0 || item.outcomeStatus === "qualified" || item.outcomeStatus === "partial");
  const normalizedTaskHistoryQuery = taskHistoryQuery.trim().toLowerCase();
  const filteredHistoryTasks = [...tasks]
    .filter((item) => {
      const matchesQuery = !normalizedTaskHistoryQuery || `${item.keyword} ${item.taskCode} ${item.region}`.toLowerCase().includes(normalizedTaskHistoryQuery);
      const matchesFilter = (taskHistoryFilter === "all" && !item.archivedAt)
        || (taskHistoryFilter === "recurring" && !item.archivedAt && item.scheduleEnabled)
        || (taskHistoryFilter === "attention" && !item.archivedAt && taskNeedsAttention(item))
        || (taskHistoryFilter === "qualified" && !item.archivedAt && (item.catalogCandidateCount > 0 || item.outcomeStatus === "qualified" || item.outcomeStatus === "partial"))
        || (taskHistoryFilter === "archived" && Boolean(item.archivedAt));
      return matchesQuery && matchesFilter;
    })
    .sort((left, right) => {
      const priority = (item: PriceCollectionTaskRecord) => item.status === "running" || item.status === "queued" ? 0 : taskNeedsAttention(item) ? 1 : item.scheduleEnabled ? 2 : 3;
      return priority(left) - priority(right) || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  const nextScheduledTask = recurringTasks
    .filter((item) => item.nextRunAt)
    .sort((left, right) => new Date(left.nextRunAt).getTime() - new Date(right.nextRunAt).getTime())[0];
  const activeTask = operationalTasks.find((item) => item.status === "running" || item.status === "queued");
  const failedTask = operationalTasks.find((item) => item.status === "failed" || item.outcomeStatus === "blocked");
  const workQueue = [
    {
      label: "运行中任务",
      value: operationalTasks.filter((item) => item.status === "running" || item.status === "queued").length,
      description: activeTask ? `${activeTask.taskCode} · ${activeTask.progress}%` : "当前没有执行中的采集任务",
      action: activeTask ? "查看运行" : "创建任务",
      icon: RefreshCw,
      tone: "blue",
      onClick: () => activeTask ? router.push(`/ai-price-collection/tasks/${activeTask.id}`) : document.getElementById("collection-task-form")?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      label: "执行失败",
      value: operationalTasks.filter((item) => item.status === "failed" || item.outcomeStatus === "blocked").length,
      description: failedTask ? "查看失败来源并执行定向重试" : "当前没有阻塞任务",
      action: failedTask ? "处理异常" : "查看历史",
      icon: CircleAlert,
      tone: "red",
      onClick: () => failedTask ? router.push(`/ai-price-collection/tasks/${failedTask.id}`) : setTaskHistoryOpen(true),
    },
    {
      label: "待线索池审核",
      value: poolSummary.pending,
      description: "核验证据、价格口径与风险后人工确认",
      action: poolSummary.pending ? "开始审核" : "查看线索池",
      icon: ListTodo,
      tone: "orange",
      onClick: () => router.push("/price-leads?status=待确认&source=collection"),
    },
    {
      label: "准入问题",
      value: poolSummary.needsReview + poolSummary.invalid,
      description: "缺字段、解析异常或价格口径不完整",
      action: "处理问题",
      icon: ShieldAlert,
      tone: "purple",
      onClick: () => router.push("/price-leads?issue=admission&source=collection"),
    },
    {
      label: "周期任务",
      value: recurringTasks.length,
      description: nextScheduledTask ? `下次 ${new Date(nextScheduledTask.nextRunAt).toLocaleString("zh-CN", { hour12: false })}` : "尚未启用自动调度",
      action: recurringTasks.length ? "管理调度" : "配置调度",
      icon: CalendarClock,
      tone: "green",
      onClick: () => setTaskHistoryOpen(true),
    },
  ] as const;
  return (
    <AppLayout>
      <div data-no-global-interaction className="space-y-3">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-borderSoft bg-white px-4 py-3 shadow-card">
          <div>
            <h1 className="text-[26px] font-black text-textMain">
              AI价格采集中心
            </h1>
            <p className="mt-1 text-[13px] text-textSecondary">
              AI驱动的价格采集与线索管理，覆盖设备与地材价格信息。
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-[11px]">
            <span className={cn("rounded-md border px-2.5 py-1.5 font-bold", dataMode === "supabase" ? "border-success/20 bg-success/10 text-success" : "border-warning/25 bg-warning/10 text-warning")}>{dataMessage}</span>
            {dataMode === "supabase" ? <span className="rounded-md bg-slate-100 px-2.5 py-1.5 font-semibold text-textSecondary">写入 {permissions.canWrite ? "可用" : "受限"} · 审核 {permissions.canReview ? "可用" : "受限"}</span> : null}
            <span className={cn("rounded-md border px-2.5 py-1.5 font-semibold", recurringTasks.length ? "border-success/20 bg-success/10 text-success" : "border-warning/25 bg-warning/10 text-warning")}>
              周期调度 {recurringTasks.length ? `已启用 ${recurringTasks.length} 个` : "未启用"}{nextScheduledTask ? ` · 下次 ${new Date(nextScheduledTask.nextRunAt).toLocaleString("zh-CN", { hour12: false })}` : ""}
            </span>
            <button type="button" onClick={() => void loadBusinessData(true)} className="flex size-8 items-center justify-center rounded-md border border-borderSoft text-primary" title="同步业务数据"><RefreshCw className={cn("size-4", dataMode === "loading" && "animate-spin")} /></button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[12px] border border-borderSoft bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-3">
            <div>
              <h2 className="text-[16px] font-black text-textMain">今日工作队列</h2>
              <p className="mt-0.5 text-[11px] text-textMuted">按业务优先级处理运行异常、人工审核和周期调度。</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-textSecondary">实时业务数据</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-5">
            {workQueue.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} type="button" onClick={item.onClick} className="group min-w-0 border-b border-borderSoft p-3 text-left transition hover:bg-slate-50 md:border-r xl:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", item.tone === "red" ? "bg-danger/10 text-danger" : item.tone === "orange" ? "bg-warning/10 text-warning" : item.tone === "purple" ? "bg-ai-soft text-ai" : item.tone === "green" ? "bg-success/10 text-success" : "bg-primary-soft text-primary")}><Icon className="size-4" /></span>
                    <strong className={cn("text-[20px] tabular-nums", item.value ? "text-textMain" : "text-textMuted")}>{item.value}</strong>
                  </div>
                  <span className="mt-2 block text-[12px] font-black text-textMain">{item.label}</span>
                  <span className="mt-1 block min-h-8 text-[10px] leading-4 text-textMuted">{item.description}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary">{item.action}<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" /></span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {kpis.map((item) => (
              <KpiCard
                key={item.title}
                item={item}
                onClick={() => handleKpi(item.title)}
              />
            ))}
        </section>

        <section className="grid grid-cols-2 divide-x divide-borderSoft overflow-hidden rounded-[10px] border border-borderSoft bg-white md:grid-cols-4">
          {[
            ["平均 AI 匹配度", `${poolSummary.averageMatch.toFixed(1)}%`, "用于判断对象匹配质量"],
            ["平均来源可信度", `${poolSummary.averageConfidence.toFixed(1)}%`, "来自当前服务端筛选范围"],
            ["未分派审核", `${poolSummary.unassigned} 条`, "建议先分派责任人"],
            ["审核已逾期", `${poolSummary.overdue} 条`, "超过设置的审核时限"],
          ].map(([label, value, description]) => (
            <button key={label} type="button" onClick={() => { if (label === "未分派审核") setAssigneeFilter("unassigned"); setPage(1); }} className="min-w-0 px-4 py-2.5 text-left hover:bg-slate-50">
              <span className="block text-[10px] font-bold text-textMuted">{label}</span>
              <strong className={cn("mt-1 block text-[16px]", label === "审核已逾期" && poolSummary.overdue ? "text-danger" : "text-textMain")}>{value}</strong>
              <span className="mt-0.5 block truncate text-[10px] text-textMuted">{description}</span>
            </button>
          ))}
        </section>

        <section
          id="collection-task-form"
          className="overflow-hidden rounded-[16px] border border-borderSoft bg-white shadow-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-black text-textMain">
                新建采集任务
              </h2>
              <button
                type="button"
                onClick={() => setCollectionGuideOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-primary hover:bg-primary-soft"
                title="查看采集方式说明"
              >
                <CircleAlert className="size-4" />
                如何采集
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setTaskHistoryOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-borderSoft px-2.5 text-[11px] font-bold text-primary">
                <Hourglass className="size-3.5" /> 最近任务 {operationalTasks.length}
              </button>
              <span className="rounded-full border border-ai/15 bg-ai-soft px-2.5 py-1 text-[11px] font-bold text-ai">
                执行模式：{collectionModeMeta[collectionMode].label} · 真实业务队列
              </span>
              <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
                详情页优先 · 六项字段准入
              </span>
              {collectionMode === "web" || collectionMode === "api" ? (
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(true)}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-primary"
                >
                  <Settings2 className="size-3.5" /> 高级设置
                </button>
              ) : null}
            </div>
          </div>
          <div className="grid gap-0 xl:grid-cols-[240px_minmax(0,1fr)_260px]">
            <div className="border-b border-borderSoft p-4 xl:border-b-0 xl:border-r">
              <CollectionPathSelector
                mode={collectionMode}
                webSourceCount={webSourceCount}
                apiSourceCount={apiSourceCount}
                onChange={changeCollectionMode}
              />
            </div>

            <div className="min-w-0 border-b border-borderSoft p-4 xl:border-b-0 xl:border-r">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-black text-textMain">2. {collectionMode === "manual" ? "填写候选价格" : collectionMode === "quote_upload" ? "设置文件归属" : "设置采集范围"}</div>
                  <p className="mt-1 text-[11px] text-textMuted">{collectionMode === "manual" ? "记录价格对象、报价信息与依据，提交后进入人工审核。" : collectionMode === "quote_upload" ? "先标记文件对应的业务对象与地区，再上传识别。" : "明确对象、范围与可核验来源，避免泛化抓取。"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {collectionMode === "web" || collectionMode === "api" ? (
                    <button type="button" title="自动设置刚果金地材、地区、币种和已验证网页来源" onClick={applyCongoMaterialPreset} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-success px-3 text-[11px] font-bold text-white shadow-sm"><MapPinned className="size-3.5" /> 应用刚果地材预设（{materialWebSources.length}个来源）</button>
                  ) : null}
                  <button type="button" title="载入之前保存的个人采集范围与规则" aria-busy={templateAction === "load"} disabled={Boolean(templateAction)} onClick={() => void applyCollectionTemplate()} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/15 bg-primary-soft px-2 text-[10px] font-bold text-primary disabled:cursor-wait disabled:opacity-60">{templateAction === "load" ? <RefreshCw className="size-3 animate-spin" /> : <BookmarkCheck className="size-3" />} {templateAction === "load" ? "载入中" : "载入常用模板"}</button>
                  <button type="button" title="把当前范围、来源和高级规则保存为个人模板" aria-busy={templateAction === "save"} disabled={Boolean(templateAction)} onClick={() => void saveCollectionTemplate()} className="inline-flex h-7 items-center gap-1 rounded-md border border-ai/15 bg-ai-soft px-2 text-[10px] font-bold text-ai disabled:cursor-wait disabled:opacity-60">{templateAction === "save" ? <RefreshCw className="size-3 animate-spin" /> : <BookmarkPlus className="size-3" />} {templateAction === "save" ? "保存中" : "保存为常用模板"}</button>
                  <button type="button" onClick={resetCollectionScope} className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft px-2 text-[10px] font-bold text-textSecondary"><Eraser className="size-3" /> 清空</button>
                </div>
              </div>
              {templateFeedback ? (
                <div
                  role={templateFeedback.tone === "danger" ? "alert" : "status"}
                  className={cn(
                    "mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-[10px] font-bold",
                    templateFeedback.tone === "success" && "border-success/20 bg-success/10 text-success",
                    templateFeedback.tone === "danger" && "border-danger/20 bg-danger/10 text-danger",
                    templateFeedback.tone === "info" && "border-primary/20 bg-primary-soft text-primary",
                  )}
                >
                  {templateAction ? <RefreshCw className="size-3.5 shrink-0 animate-spin" /> : templateFeedback.tone === "success" ? <CheckCircle2 className="size-3.5 shrink-0" /> : <CircleAlert className="size-3.5 shrink-0" />}
                  <span className="min-w-0 flex-1">{templateFeedback.text}</span>
                  {!templateAction ? <button type="button" onClick={() => setTemplateFeedback(null)} className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-white/60" title="关闭操作提示" aria-label="关闭操作提示"><X className="size-3" /></button> : null}
                </div>
              ) : null}
              <div className="border-y border-borderSoft bg-[#FAFCFF] px-3 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">A</span>
                  <div>
                    <strong className="block text-[11px] text-textMain">对象与采集条件</strong>
                    <span className="block text-[10px] text-textMuted">先确定要找什么，再限定规格、地区和报价币种。</span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold text-textSecondary">采集对象</span>
                  <div className="grid h-9 grid-cols-2 rounded-md border border-borderSoft bg-slate-50 p-0.5">
                    {(["设备", "地材"] as LeadType[]).map((target) => (
                      <button key={target} type="button" aria-pressed={task.target === target} onClick={() => changeCollectionTarget(target)} className={cn("rounded-[5px] text-[11px] font-bold transition-colors", task.target === target ? "bg-primary text-white shadow-sm" : "text-textSecondary hover:bg-white")}>{target}</button>
                    ))}
                  </div>
                </div>
                {collectionMode === "manual" ? (
                  <label className="grid gap-1">
                    <span className="text-[11px] font-bold text-textSecondary">价格对象名称</span>
                    <input
                      id="collection-keyword"
                      value={task.keyword}
                      onChange={(event) => setTask((current) => ({ ...current, keyword: event.target.value }))}
                      placeholder={task.target === "地材" ? "如：钢筋、水泥、砂石" : "如：水泵、阀门、仪表"}
                      className={inputClass}
                    />
                  </label>
                ) : collectionMode === "web" || collectionMode === "api" ? (
                  task.target === "地材" ? (
                    <div ref={materialPickerRef} className="relative grid min-w-0 gap-1">
                      <span className="text-[11px] font-bold text-textSecondary">名称 / 关键词</span>
                      <button
                        id="collection-keyword"
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={materialPickerOpen}
                        onClick={() => setMaterialPickerOpen((current) => !current)}
                        className={cn(inputClass, "flex items-center justify-between gap-2 text-left")}
                      >
                        <span className={cn("min-w-0 flex-1 truncate", !selectedMaterialNames.length && "text-textMuted")}>
                          {allMaterialsSelected
                            ? "全部地材"
                            : selectedMaterialNames.length
                              ? selectedMaterialNames.join("、")
                              : "请选择地材名称"}
                        </span>
                        {selectedMaterialNames.length ? (
                          <span className="shrink-0 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {allMaterialsSelected ? "已选全部" : `已选 ${selectedMaterialNames.length}`}
                          </span>
                        ) : null}
                        <ChevronDown className={cn("size-4 shrink-0 transition-transform", materialPickerOpen && "rotate-180")} />
                      </button>
                      {materialPickerOpen ? (
                        <div className="absolute left-0 top-full z-40 mt-1 w-[min(620px,calc(100vw-48px))] overflow-hidden rounded-[8px] border border-borderSoft bg-white shadow-xl">
                          <div className="flex items-center gap-2 border-b border-borderSoft p-2">
                            <Search className="size-4 shrink-0 text-textMuted" />
                            <input
                              autoFocus
                              value={materialPickerQuery}
                              onChange={(event) => setMaterialPickerQuery(event.target.value)}
                              placeholder="搜索地材名称或分类"
                              className="h-8 min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                            />
                            {selectedMaterialNames.length ? (
                              <button type="button" onClick={() => setTask((current) => ({ ...current, keyword: "", spec: "" }))} className="h-7 rounded-md px-2 text-[10px] font-bold text-danger hover:bg-danger/5">
                                清空
                              </button>
                            ) : null}
                          </div>
                          <div className="max-h-80 overflow-y-auto p-2" role="listbox" aria-multiselectable="true">
                            {!normalizedMaterialPickerQuery ? (
                              <button
                                type="button"
                                role="option"
                                aria-selected={allMaterialsSelected}
                                onClick={toggleAllMaterialKeywords}
                                className={cn(
                                  "mb-2 flex h-9 w-full items-center gap-2 rounded-md border px-2.5 text-left text-[11px] font-bold",
                                  allMaterialsSelected ? "border-primary/35 bg-primary-soft text-primary" : "border-borderSoft bg-slate-50 text-textSecondary hover:border-primary/25",
                                )}
                              >
                                <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", allMaterialsSelected ? "border-primary bg-primary text-white" : "border-borderSoft bg-white")}>
                                  {allMaterialsSelected ? <CheckCircle2 className="size-3" /> : null}
                                </span>
                                <span className="min-w-0 flex-1">全部地材</span>
                                <span className="text-[10px] font-semibold text-textMuted">{materialKeywordOptions.length} 项</span>
                              </button>
                            ) : null}
                            {filteredMaterialKeywordGroups.map((group) => (
                              <div key={group.label} className="border-b border-borderSoft py-2 last:border-0">
                                <div className="mb-1 flex items-center justify-between gap-3 px-1">
                                  <div className="text-[10px] font-bold text-textMuted">{group.label}</div>
                                  {(() => {
                                    const selectedCount = group.allItems.filter((item) => selectedMaterialNames.includes(item)).length;
                                    const groupIsSelected = selectedCount === group.allItems.length;
                                    const groupIsPartial = selectedCount > 0 && !groupIsSelected;
                                    return (
                                      <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-bold text-textSecondary">
                                        <input
                                          type="checkbox"
                                          checked={groupIsSelected}
                                          ref={(input) => {
                                            if (input) input.indeterminate = groupIsPartial;
                                          }}
                                          onChange={() => toggleMaterialKeywordGroup(group.allItems)}
                                          className="size-3.5 accent-[var(--color-primary)]"
                                        />
                                        <span>{groupIsSelected ? "取消全选" : "全选"}</span>
                                        {selectedCount ? <span className="font-semibold text-primary">{selectedCount}/{group.allItems.length}</span> : null}
                                      </label>
                                    );
                                  })()}
                                </div>
                                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                                  {group.items.map((option) => {
                                    const checked = selectedMaterialNames.includes(option);
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        role="option"
                                        aria-selected={checked}
                                        onClick={() => toggleMaterialKeyword(option)}
                                        className={cn(
                                          "flex h-8 min-w-0 items-center gap-2 rounded-md border px-2 text-left text-[11px] font-semibold",
                                          checked ? "border-primary/35 bg-primary-soft text-primary" : "border-transparent text-textSecondary hover:border-borderSoft hover:bg-slate-50",
                                        )}
                                      >
                                        <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", checked ? "border-primary bg-primary text-white" : "border-borderSoft bg-white")}>
                                          {checked ? <CheckCircle2 className="size-3" /> : null}
                                        </span>
                                        <span className="truncate">{option}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                            {!filteredMaterialKeywordGroups.length ? <div className="px-3 py-8 text-center text-[11px] text-textMuted">没有匹配的地材名称</div> : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <label className="grid gap-1">
                      <span className="text-[11px] font-bold text-textSecondary">名称 / 关键词</span>
                      <input id="collection-keyword" list="equipment-keyword-options" value={task.keyword} onChange={(event) => setTask((current) => ({ ...current, keyword: event.target.value }))} placeholder="输入或选择：水泵、阀门、仪表" className={inputClass} />
                      <datalist id="equipment-keyword-options">{equipmentKeywordOptions.map((option) => <option key={option} value={option} />)}</datalist>
                    </label>
                  )
                ) : null}
                {collectionMode !== "quote_upload" ? (
                  <label className="grid gap-1">
                    <span className="text-[11px] font-bold text-textSecondary">规格型号</span>
                    {collectionMode === "manual" ? (
                      <input value={task.spec} onChange={(event) => setTask((current) => ({ ...current, spec: event.target.value }))} placeholder={task.target === "地材" ? "如：Φ10 mm、P.O 42.5" : "如：DN100、PN16"} className={inputClass} />
                    ) : task.target === "地材" ? (
                      <select value={task.spec} onChange={(event) => setTask({ ...task, spec: event.target.value })} className={inputClass}>
                        <option value="">全部规格（按所选名称匹配）</option>
                        {materialSpecificationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <>
                        <input list="equipment-spec-options" value={task.spec} onChange={(event) => setTask({ ...task, spec: event.target.value })} placeholder="请先选择名称" className={inputClass} />
                        <datalist id="equipment-spec-options">{equipmentSpecOptions.map((option) => <option key={option} value={option} />)}</datalist>
                      </>
                    )}
                  </label>
                ) : null}
                <label className="grid gap-1">
                  <span className="text-[11px] font-bold text-textSecondary">目标地区</span>
                  <select value={task.region} onChange={(event) => setTask({ ...task, region: event.target.value })} className={inputClass}>
                    {collectionRegionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-bold text-textSecondary">目标币种</span>
                  <select value={task.currency} onChange={(event) => setTask({ ...task, currency: event.target.value })} className={inputClass}>
                    {currencyOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                {collectionMode === "web" || collectionMode === "api" ? (
                  <label className="grid gap-1">
                    <span className="text-[11px] font-bold text-textSecondary">来源类型</span>
                    <select value={task.source} onChange={(event) => setTask({ ...task, source: event.target.value })} className={inputClass}>
                      <option>全部来源</option><option>制造商官网</option><option>供应商报价单</option><option>电商平台</option>
                    </select>
                  </label>
                ) : null}
                </div>
              </div>

              {collectionMode === "manual" ? (
                <div className="mt-3 grid gap-2 rounded-[10px] border border-warning/20 bg-warning/5 p-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="grid gap-1"><span className="text-[11px] font-bold text-textSecondary">供应商 / 信息提供方</span><input value={manualDraft.supplierName} onChange={(event) => setManualDraft({ ...manualDraft, supplierName: event.target.value })} placeholder="必填" className={inputClass} /></label>
                  <label className="grid gap-1"><span className="text-[11px] font-bold text-textSecondary">报价金额</span><input type="number" min="0" step="0.01" value={manualDraft.price} onChange={(event) => setManualDraft({ ...manualDraft, price: event.target.value })} placeholder="必填" className={inputClass} /></label>
                  <label className="grid gap-1"><span className="text-[11px] font-bold text-textSecondary">计价单位</span><input value={manualDraft.unit} onChange={(event) => setManualDraft({ ...manualDraft, unit: event.target.value })} placeholder="台 / 套 / 吨 / 米" className={inputClass} /></label>
                  <label className="grid gap-1"><span className="text-[11px] font-bold text-textSecondary">价格日期</span><input type="date" value={manualDraft.priceDate} onChange={(event) => setManualDraft({ ...manualDraft, priceDate: event.target.value })} className={inputClass} /></label>
                  <label className="grid gap-1"><span className="text-[11px] font-bold text-textSecondary">来源链接或邮件依据</span><input value={manualDraft.sourceUrl} onChange={(event) => setManualDraft({ ...manualDraft, sourceUrl: event.target.value })} placeholder="建议填写，便于追溯" className={inputClass} /></label>
                </div>
              ) : null}

              {collectionMode === "quote_upload" ? (
                <label className="mt-3 flex min-h-20 cursor-pointer items-center gap-3 rounded-[10px] border border-dashed border-ai/35 bg-ai-soft/45 px-4 py-3 text-ai hover:bg-ai-soft">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[9px] bg-white"><UploadCloud className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[12px]">{uploadFile?.name || "选择 Excel、PDF 或报价图片"}</strong>
                    <span className="mt-1 block text-[10px] text-textMuted">文件将写入私有 Storage，识别结果进入人工评估。</span>
                  </span>
                  <input type="file" accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg,.webp" className="sr-only" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
                </label>
              ) : collectionMode === "web" || collectionMode === "api" ? (
                <div className="mt-3">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-ai text-[10px] font-black text-white">B</span>
                    <div>
                      <strong className="block text-[11px] text-textMain">来源选择与准入</strong>
                      <span className="block text-[10px] text-textMuted">选择可核验来源；每个来源独立执行、独立显示额度和进度。</span>
                    </div>
                  </div>
                  {task.target === "设备" && materialWebSources.length ? (
                    <button type="button" onClick={applyCongoMaterialPreset} className="mb-2 flex w-full items-center justify-between gap-3 rounded-[8px] border border-success/25 bg-success/10 px-3 py-2 text-left">
                      <span className="flex min-w-0 items-center gap-2"><MapPinned className="size-4 shrink-0 text-success" /><span className="min-w-0"><strong className="block text-[11px] text-success">已加载 {materialWebSources.length} 个刚果地材来源</strong><span className="block truncate text-[10px] text-textSecondary">当前处于设备模式，因此下方只显示设备来源。</span></span></span>
                      <span className="shrink-0 rounded-md bg-success px-2.5 py-1 text-[10px] font-bold text-white">切换并选中 {healthyMaterialWebSources.length} 个可用来源</span>
                    </button>
                  ) : null}
                  <div className="rounded-[8px] border border-borderSoft bg-slate-50/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] font-black text-textMain">{task.target}采集来源</span>
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">已选 {activeSourceIds.length}</span>
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">可用 {healthyCurrentSources.length}</span>
                          {currentSources.length > healthyCurrentSources.length ? <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">待验证 {currentSources.length - healthyCurrentSources.length}</span> : null}
                        </div>
                        <p className="mt-1 text-[10px] text-textMuted">仅显示与当前“{task.target}”匹配的白名单来源，待验证来源不可用于启动任务。</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px] font-bold">
                        <button type="button" onClick={() => setSelectedSourceIds((current) => Array.from(new Set([...current.filter((id) => !currentSources.some((source) => source.id === id)), ...recommendedSourceIds])))} className="inline-flex h-7 items-center gap-1 rounded-md border border-ai/20 bg-ai-soft px-2 text-ai"><Sparkles className="size-3" />推荐来源</button>
                        <button type="button" onClick={() => setSelectedSourceIds((current) => Array.from(new Set([...current, ...healthyCurrentSources.map((source) => source.id)])))} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-primary"><CheckCircle2 className="size-3" />全选可用</button>
                        <button type="button" onClick={() => setSelectedSourceIds((current) => current.filter((id) => !currentSources.some((source) => source.id === id)))} className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-textSecondary"><Eraser className="size-3" />清空</button>
                        <button type="button" onClick={() => router.push(`/settings/integrations?create=collector&sourceKind=${collectionMode}&returnTo=%2Fai-price-collection`)} className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-textSecondary"><PlusCircle className="size-3" />新增来源</button>
                        <button type="button" title="管理数据源" aria-label="管理数据源" onClick={() => router.push("/settings/integrations?type=collector&manageSources=1&returnTo=%2Fai-price-collection")} className="flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary"><Settings2 className="size-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-y border-borderSoft py-2">
                      <label className="relative min-w-[220px] flex-1 sm:max-w-[340px]">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-textMuted" />
                        <input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} placeholder="搜索名称、网址、地区或地材分类" className="h-8 w-full rounded-md border border-borderSoft bg-white pl-8 pr-3 text-[11px] outline-none focus:border-primary" />
                      </label>
                      <div className="flex h-8 items-center rounded-md border border-borderSoft bg-white p-0.5">
                        {([
                          ["all", `全部 ${currentSources.length}`],
                          ["selected", `已选 ${activeSourceIds.length}`],
                          ["healthy", `可用 ${healthyCurrentSources.length}`],
                          ["pending", `待验证 ${currentSources.length - healthyCurrentSources.length}`],
                        ] as Array<[SourceViewFilter, string]>).map(([value, label]) => (
                          <button key={value} type="button" onClick={() => setSourceViewFilter(value)} className={cn("h-6 rounded px-2 text-[10px] font-bold transition-colors", sourceViewFilter === value ? "bg-primary text-white" : "text-textSecondary hover:bg-primary-soft")}>{label}</button>
                        ))}
                      </div>
                      <span className="ml-auto text-[10px] text-textMuted">质量分 ≥ 60 且连通正常才可选择</span>
                    </div>

                    <div className={cn("mt-2 grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3", sourceListExpanded ? "max-h-[420px]" : "max-h-[224px]")}>
                      {visibleCurrentSources.map((source) => {
                        const checked = selectedSourceIds.includes(source.id);
                        const healthy = isCollectionSourceReady(source);
                        const sourceType = sourceTypeLabels[source.config.catalogSourceType || ""] || (source.sourceKind === "api" ? "API 数据源" : "网页来源");
                        return (
                          <div key={source.id} className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)_30px] items-stretch overflow-hidden rounded-[8px] border bg-white transition-colors", checked && healthy ? "border-primary bg-primary-soft/45" : "border-borderSoft", !healthy && "bg-slate-100")}>
                            <button type="button" disabled={!healthy} aria-pressed={checked} onClick={() => setSelectedSourceIds((current) => checked ? current.filter((id) => id !== source.id) : [...current, source.id])} className={cn("grid min-w-0 grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-2 px-3 py-2.5 text-left", !healthy && "cursor-not-allowed opacity-70")}>
                              <span className={cn("mt-0.5 flex size-4 items-center justify-center rounded border", checked && healthy ? "border-primary bg-primary text-white" : "border-slate-300 bg-white")}><CheckCircle2 className={cn("size-3", checked && healthy ? "opacity-100" : "opacity-0")} /></span>
                              <span className="min-w-0">
                                <span className="flex min-w-0 items-center gap-1.5"><strong className="truncate text-[11px] text-textMain">{source.name}</strong><span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold", healthy ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{healthy ? "可用" : "待验证"}</span></span>
                                <span className="mt-1 block truncate text-[10px] text-textSecondary">{sourceType} · {source.defaultRegion || "地区不限"} · {source.defaultCurrency}</span>
                                <span className="mt-0.5 block truncate text-[9px] text-textMuted" title={source.baseUrl}>{sourceHost(source.baseUrl)}</span>
                              </span>
                              <span className="shrink-0 text-right"><span className="block text-[10px] font-black text-primary">质量 {source.qualityScore}</span>{source.config.trustLevel ? <span className="mt-1 block text-[9px] text-textMuted">可信 {source.config.trustLevel}</span> : null}</span>
                            </button>
                            <button type="button" onClick={() => setSourceToDelete(source)} className="flex items-center justify-center border-l border-borderSoft text-textMuted hover:bg-danger-soft hover:text-danger" title={`删除来源：${source.name}`} aria-label={`删除来源：${source.name}`}><Trash2 className="size-3.5" /></button>
                          </div>
                        );
                      })}
                      {!visibleCurrentSources.length ? <div className="col-span-full flex min-h-20 items-center justify-center rounded-[8px] border border-dashed border-borderSoft bg-white px-3 text-[11px] text-textMuted">没有符合当前筛选的来源，请调整关键词或状态。</div> : null}
                    </div>
                    {currentSources.length > 6 ? <button type="button" onClick={() => setSourceListExpanded((value) => !value)} className="mt-2 flex h-7 w-full items-center justify-center gap-1 rounded-md text-[10px] font-bold text-primary hover:bg-primary-soft">{sourceListExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}{sourceListExpanded ? "收起来源列表" : `展开查看全部 ${currentSources.length} 个来源`}</button> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-[9px] border border-warning/20 bg-warning/5 px-3 py-2 text-[10px] leading-5 text-textSecondary">人工录入只创建候选价格，并保留操作人与审核轨迹；无来源证据时自动降低可信度。</div>
              )}
            </div>

            <div className="p-4">
              <div className="text-[12px] font-black text-textMain">3. {collectionMode === "manual" ? "提交与审核" : collectionMode === "quote_upload" ? "识别与审核" : "执行策略"}</div>
              <p className="mt-1 text-[11px] text-textMuted">{collectionMode === "manual" ? "只创建待审核候选，不会直接写入正式价格库。" : collectionMode === "quote_upload" ? "文件识别结果保留原件，并进入人工复核。" : "任务进入真实队列，所有结果必须人工确认。"}</p>
              <label className="mt-3 grid gap-1">
                <span className="text-[11px] font-bold text-textSecondary">{collectionMode === "manual" ? "提交方式" : collectionMode === "quote_upload" ? "识别方式" : "采集频率"}</span>
                <select
                  value={collectionMode === "quote_upload" || collectionMode === "manual" ? "仅本次" : task.frequency}
                  onChange={(event) => setTask({ ...task, frequency: event.target.value })}
                  disabled={collectionMode === "quote_upload" || collectionMode === "manual"}
                  className={inputClass}
                >
                  <option>每天</option><option>每周</option><option>仅本次</option>
                </select>
              </label>
              <div className="mt-3 space-y-1.5 rounded-[9px] bg-page p-3 text-[11px] text-textSecondary">
                <div className="flex justify-between gap-2"><span>执行：</span><strong>{collectionModeMeta[collectionMode].label}</strong></div>
                <div className="flex justify-between gap-2"><span>结果：</span><strong>{collectionMode === "manual" ? "待审核价格线索" : collectionMode === "quote_upload" ? "待复核识别明细" : "候选价格与来源证据"}</strong></div>
                {collectionMode === "manual" ? (
                  <>
                    <div className="flex justify-between gap-2"><span>初始可信度</span><strong>{manualDraft.sourceUrl.trim() ? "70%" : "45%"}</strong></div>
                    <div className="flex justify-between gap-2"><span>风险提示</span><strong className="text-warning">{manualDraft.sourceUrl.trim() ? "低风险" : "缺少外部依据"}</strong></div>
                  </>
                ) : collectionMode === "quote_upload" ? (
                  <>
                    <div className="flex justify-between gap-2"><span>当前文件</span><strong className="max-w-[140px] truncate" title={uploadFile?.name}>{uploadFile?.name || "尚未选择"}</strong></div>
                    <div className="flex justify-between gap-2"><span>原件留存</span><strong>私有存储</strong></div>
                    <div className="flex justify-between gap-2"><span>识别结果</span><strong>待人工复核</strong></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between gap-2"><span>来源并发</span><strong>{advancedConfig.sourceConcurrency} 个域名</strong></div>
                    <div className="flex justify-between gap-2"><span>单来源额度</span><strong>{advancedConfig.maxPagesPerSource} 页</strong></div>
                    <div className="flex justify-between gap-2"><span>价格所属期</span><strong>{advancedConfig.pricePeriodFrom} 至 {advancedConfig.pricePeriodToMode === "current_month" ? "当前月" : advancedConfig.pricePeriodTo}</strong></div>
                    <div className="flex justify-between gap-2"><span>证据要求</span><strong>{advancedConfig.requireEvidence ? "必须保留" : "可选"}</strong></div>
                    <div className="flex justify-between gap-2"><span>最大价格账龄</span><strong>{advancedConfig.maxPriceAgeDays} 天</strong></div>
                  </>
                )}
                <div className="flex justify-between gap-2"><span>人工关口</span><strong className="text-warning">启用</strong></div>
              </div>
              {(collectionMode === "web" || collectionMode === "api") ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                  <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5", task.keyword.trim() ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                    {task.keyword.trim() ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
                    {task.keyword.trim() ? `关键词：${task.keyword}` : "还需填写关键词"}
                  </div>
                  <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5", activeSourceIds.length ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                    {activeSourceIds.length ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
                    {activeSourceIds.length ? `可用来源：${activeSourceIds.length}` : "还需选择可用来源"}
                  </div>
                </div>
              ) : null}
              <div className={cn("mt-3 grid gap-2", collectionMode === "web" || collectionMode === "api" ? "grid-cols-2" : "grid-cols-1")}>
                <button type="button" onClick={runTaskPreflight} className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-[8px] border border-success/25 bg-success/5 px-2 text-[11px] font-bold text-success"><CheckCircle2 className="size-3.5" /> {collectionMode === "manual" ? "录入校验" : collectionMode === "quote_upload" ? "文件校验" : "任务预检"}</button>
                {collectionMode === "web" || collectionMode === "api" ? <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-[8px] border border-borderSoft px-2 text-[11px] font-bold text-primary"><Settings2 className="size-3.5" /> 高级规则</button> : null}
              </div>
              <button
                type="button"
                onClick={() => collectionMode === "quote_upload" ? void uploadQuoteForCollection() : collectionMode === "manual" ? void submitManualEntry() : void startCollection()}
                disabled={Boolean(executeDisabledReason) || uploading || manualSubmitting || collectionSubmitting}
                title={executeDisabledReason || undefined}
                className={cn("mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] text-[13px] font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300", collectionMode === "quote_upload" ? "bg-ai" : collectionMode === "manual" ? "bg-warning" : "bg-primary")}
              >
                {collectionMode === "quote_upload" ? <UploadCloud className={cn("size-4", uploading && "animate-pulse")} /> : collectionMode === "manual" ? <FilePenLine className={cn("size-4", manualSubmitting && "animate-pulse")} /> : <Rocket className={cn("size-4", collectionSubmitting && "animate-pulse")} />}
                {uploading ? "上传并识别中" : manualSubmitting ? "提交候选价格中" : collectionSubmitting ? "采集中，请查看下方进度" : collectionMode === "quote_upload" ? "上传并识别" : collectionMode === "manual" ? "创建候选价格" : "开始采集"}
              </button>
              {executeDisabledReason ? <p className="mt-2 text-center text-[10px] font-bold text-warning">{executeDisabledReason}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-borderSoft bg-[#F8FBFF] sm:grid-cols-4">
            {(collectionMode === "manual"
              ? ["填写价格对象", "记录报价与依据", "生成待审核候选", "人工确认后流转"]
              : collectionMode === "quote_upload"
                ? ["设置文件归属", "上传并智能识别", "核对明细与原件", "人工确认后流转"]
                : ["定义采集范围", "执行受控采集", "生成候选与证据", "人工确认后流转"]
            ).map((label, index) => (
              <div key={label} className="flex min-w-0 items-center gap-2 border-r border-borderSoft px-3 py-2 last:border-r-0">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">{index + 1}</span>
                <span className="truncate text-[10px] font-bold text-textSecondary">{label}</span>
              </div>
            ))}
          </div>
          <CollectionRunMonitor
            run={run}
            showLogs={showRunLogs}
            onDetails={() => run.id && router.push(`/ai-price-collection/tasks/${encodeURIComponent(run.databaseId || run.id)}`)}
            onPauseResume={() => void pauseOrResumeRun()}
            onStop={() => void stopRun()}
            onRetry={() => collectionMode === "quote_upload" ? void uploadQuoteForCollection() : collectionMode === "manual" ? void submitManualEntry() : void startCollection()}
            onToggleLogs={() => setShowRunLogs((value) => !value)}
            taskCount={operationalTasks.length}
            onHistory={() => setTaskHistoryOpen(true)}
            taskOptions={operationalTasks.map((item) => ({ id: item.id, taskCode: item.taskCode, keyword: item.keyword }))}
            selectedTaskId={currentTaskId}
            switchingTask={taskSwitching}
            onTaskSelect={(taskId) => void selectExecutionTask(taskId)}
          />
        </section>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section id="collection-results" className="scroll-mt-24 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-bold text-textMain">
                  最新采集结果
                </h2>
                <div className="flex h-8 items-center rounded-md border border-borderSoft bg-slate-50 p-0.5" aria-label="结果数据范围">
                  {(["current", "all"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => {
                        setResultScope(scope);
                        setCheckedIds([]);
                        setPage(1);
                      }}
                      className={cn(
                        "h-7 rounded-[5px] px-2.5 text-[11px] font-bold transition",
                        resultScope === scope ? "bg-white text-primary shadow-sm" : "text-textMuted",
                      )}
                    >
                      {scope === "current" ? "当前任务" : "全部线索"}
                    </button>
                  ))}
                </div>
                <div className="flex h-8 items-center rounded-md border border-borderSoft bg-white p-0.5" aria-label="价格有效性筛选">
                  {([
                    ["valid", "有效价格", poolSummary.valid],
                    ["needs_review", "待补充", poolSummary.needsReview],
                    ["invalid", "解析异常", poolSummary.invalid],
                    ["all", "全部", poolSummary.valid + poolSummary.needsReview + poolSummary.invalid],
                  ] as const).map(([value, label, count]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setValidityFilter(value);
                        setCheckedIds([]);
                        setPage(1);
                      }}
                      className={cn(
                        "h-7 rounded-[5px] px-2.5 text-[11px] font-bold transition",
                        validityFilter === value
                          ? value === "invalid"
                            ? "bg-danger/10 text-danger"
                            : value === "needs_review"
                              ? "bg-warning/10 text-warning"
                              : "bg-primary-soft text-primary"
                          : "text-textMuted",
                      )}
                    >
                      {label} {count}
                    </button>
                  ))}
                </div>
                <span className="text-[12px] text-textMuted">
                  当前显示 <strong className="text-textMain">{poolPagination.total}</strong> / {poolSummary.valid + poolSummary.needsReview + poolSummary.invalid} 条
                </span>
                <div className="flex h-8 items-center gap-2 rounded-md border border-borderSoft px-2">
                  <Search className="size-3.5 text-textMuted" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="搜索采集结果"
                    className="w-36 bg-transparent text-[12px] outline-none"
                  />
                </div>
                <select
                  value={appliedType}
                  onChange={(e) => {
                    setAppliedType(e.target.value as "全部" | LeadType);
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-borderSoft px-2 text-[12px]"
                >
                  <option>全部</option>
                  <option>设备</option>
                  <option>地材</option>
                </select>
                <select
                  value={appliedStatus}
                  onChange={(e) => {
                    setAppliedStatus(e.target.value as "全部" | LeadStatus);
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-borderSoft px-2 text-[12px]"
                >
                  <option>全部</option>
                  <option>待线索池审核</option>
                  <option>待正式入库</option>
                  <option>已入正式价格库</option>
                  <option>已驳回</option>
                </select>
                <select
                  value={riskFilter}
                  onChange={(event) => {
                    setRiskFilter(event.target.value as "全部" | Lead["risk"]);
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-borderSoft px-2 text-[12px]"
                  aria-label="风险筛选"
                >
                  <option>全部</option><option>低风险</option><option>中风险</option><option>高风险</option>
                </select>
                <select
                  value={credibilityFilter}
                  onChange={(event) => {
                    setCredibilityFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-borderSoft px-2 text-[12px]"
                  aria-label="可信度筛选"
                >
                  <option>全部</option><option>非常高（≥90%）</option><option>高（75%-90%）</option><option>中（50%-75%）</option><option>低（&lt;50%）</option>
                </select>
                <select
                  value={assigneeFilter}
                  onChange={(event) => { setAssigneeFilter(event.target.value); setPage(1); }}
                  className="h-8 rounded-md border border-borderSoft px-2 text-[12px]"
                  aria-label="审核责任人筛选"
                >
                  <option value="全部">全部责任人</option>
                  <option value="unassigned">未分派</option>
                  {reviewers.map((reviewer) => <option key={reviewer.userId} value={reviewer.userId}>{reviewer.displayName}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById("collection-task-form")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    window.setTimeout(
                      () =>
                        document
                          .getElementById("collection-keyword")
                          ?.focus(),
                      250,
                    );
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-primary/25 px-3 text-[13px] font-bold text-primary"
                >
                  <PlusCircle className="size-4" />
                  创建采集任务
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!assignmentDueAt) setAssignmentDueAt(defaultReviewDueAt());
                    setAssignOpen(true);
                  }}
                  disabled={!checkedIds.length || !permissions.canReview}
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-primary/25 px-3 text-[13px] font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <BookmarkCheck className="size-4" />
                  分派审核
                </button>
                <button
                  type="button"
                  onClick={() => openLeadPoolForReview()}
                  disabled={!checkedIds.length}
                  title={!checkedIds.length ? "请先勾选价格候选" : undefined}
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-ai/25 px-3 text-[13px] font-bold text-ai disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Database className="size-4" />
                  进入线索池审核
                </button>
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-primary/25 px-3 text-[13px] font-bold text-primary"
                >
                  <Download className="size-4" />
                  导出采集结果
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteResults(true)}
                  disabled={!checkedIds.length || !permissions.canWrite}
                  title={!checkedIds.length ? "请先勾选要清理的结果" : "删除所选且尚未入池的采集结果"}
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-danger/25 px-3 text-[13px] font-bold text-danger disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                  删除结果
                </button>
              </div>
            </div>
            {visible.length ? <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-[11px]", stalePriceCount ? "border-warning/20 bg-warning/5 text-warning" : "border-borderSoft bg-success/5 text-success")}><span className="inline-flex items-center gap-1.5 font-semibold"><CalendarClock className="size-3.5" />价格时间口径：最新报价月 {latestQuoteTime ? new Date(latestQuoteTime).toISOString().slice(0, 7) : "待识别"} · 最新采集时间 {latestCollectedTime ? new Date(latestCollectedTime).toLocaleDateString("zh-CN") : "待识别"}；采集时间不等于报价月份。</span><span className="font-bold">{stalePriceCount ? `${stalePriceCount} 条超过 ${advancedConfig.maxPriceAgeDays} 天，按历史价格处理` : "当前价格账龄符合规则"}</span></div> : null}
            {activeFilters.length ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-borderSoft bg-[#FAFCFF] px-4 py-2 text-[11px]">
                <span className="font-bold text-textSecondary">当前筛选</span>
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => removeFilter(filter.key)}
                    className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/15 bg-primary-soft px-2 font-bold text-primary"
                    title="点击移除此筛选"
                  >
                    {filter.label} <X className="size-3" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="ml-auto font-bold text-textMuted hover:text-primary"
                >
                  清空全部
                </button>
              </div>
            ) : null}
            {visible.length ? (
              <>
                <div className={cn("overflow-x-auto overflow-y-hidden transition-opacity", leadPoolLoading && "pointer-events-none opacity-55")} aria-busy={leadPoolLoading}>
                  <table className="w-full min-w-[1520px] table-fixed border-collapse text-left text-[12px]">
                    <colgroup>
                      <col className="w-10" />
                      <col className="w-40" />
                      <col className="w-20" />
                      <col className="w-32" />
                      <col className="w-44" />
                      <col className="w-48" />
                      <col className="w-36" />
                      <col className="w-40" />
                      <col className="w-24" />
                      <col className="w-24" />
                      <col className="w-48" />
                      <col className="w-28" />
                      <col className="w-28" />
                      <col className="w-24" />
                      <col className="w-20" />
                      <col className="w-28" />
                      <col className="w-52" />
                    </colgroup>
                    <thead className="bg-[#F8FAFD] font-bold text-textSecondary">
                      <tr className="border-b border-borderSoft">
                        <th className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            disabled={!visible.length}
                            checked={allVisibleChecked}
                            onChange={toggleAll}
                          />
                        </th>
                        {[
                          "线索编号",
                          "类型",
                          "名称",
                          "规格",
                          "来源",
                          "来源证据",
                          "地区",
                          "价格月份",
                          "价格",
                          "币种 / 单位",
                          "AI匹配度",
                          "建议可信度",
                          "有效性",
                          "风险",
                          "状态",
                          "操作",
                        ].map((header) => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-3 py-3"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-textSecondary">
                      {visible.map((lead) => (
                        <tr
                          key={lead.code}
                          onClick={() => setSelectedId(lead.code)}
                          className={cn(
                            "h-10 cursor-pointer border-b border-borderSoft hover:bg-primary-soft/40",
                            selectedId === lead.code && "bg-primary-soft/60",
                          )}
                        >
                          <td
                            className="px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={checkedIds.includes(lead.code)}
                              onChange={() =>
                                setCheckedIds((ids) =>
                                  ids.includes(lead.code)
                                    ? ids.filter((id) => id !== lead.code)
                                    : [...ids, lead.code],
                                )
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-primary">
                            {lead.code}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex h-6 min-w-10 items-center justify-center whitespace-nowrap rounded-md px-1.5 py-1 font-bold leading-none",
                                lead.type === "设备"
                                  ? "bg-primary-soft text-primary"
                                  : "bg-success/10 text-success",
                              )}
                            >
                              {lead.type}
                            </span>
                          </td>
                          <td
                            className="truncate whitespace-nowrap px-3 py-2 font-bold text-textMain"
                            title={lead.originalName !== lead.name ? `${lead.name}（原文：${lead.originalName}）` : lead.name}
                          >
                            {lead.name}
                          </td>
                          <td
                            className="max-w-[170px] truncate px-3 py-2.5"
                            title={lead.spec}
                          >
                            {lead.spec}
                          </td>
                          <td className="truncate whitespace-nowrap px-3 py-2.5" title={lead.source}>
                            {lead.source}
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedId(lead.code);
                                setDetailOpen(true);
                              }}
                              className="whitespace-nowrap font-bold text-primary hover:underline"
                              title={lead.sourceUrl}
                            >
                              {lead.evidenceId}
                            </button>
                          </td>
                          <td className="truncate whitespace-nowrap px-3 py-2.5" title={`${localizePriceRegion(lead.region)}（原始值：${lead.region}）`}>
                            {localizePriceRegion(lead.region)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-textMain">
                            <span>{lead.priceMonth ? lead.priceMonth.slice(0, 7) : "待识别"}</span>
                            {lead.priceMonth ? <span className={cn("ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold", freshnessReferenceTime - new Date(lead.priceMonth).getTime() > advancedConfig.maxPriceAgeDays * 86_400_000 ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>{freshnessReferenceTime - new Date(lead.priceMonth).getTime() > advancedConfig.maxPriceAgeDays * 86_400_000 ? "历史价" : "有效期内"}</span> : null}
                          </td>
                          <td
                            className="truncate whitespace-nowrap px-3 py-2.5 text-right font-bold text-textMain"
                            title={lead.priceOriginalText || String(lead.price)}
                          >
                            {lead.price.toLocaleString()}
                          </td>
                          <td className="truncate whitespace-nowrap px-3 py-2.5" title={`${lead.currency} / ${lead.originalUnit || "待识别"}`}>
                            <span className="font-bold text-textMain">{lead.currency}</span>
                            <span className={cn("ml-1.5", lead.originalUnit ? "text-textSecondary" : "text-warning")}>
                              / {lead.originalUnit || "待识别"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{lead.match}%</span>
                              <ProgressMini
                                value={lead.match}
                                color="#2563EB"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">
                                {lead.credibility}%
                              </span>
                              <ProgressMini
                                value={lead.credibility}
                                color="#16A34A"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn(
                              "whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold",
                              lead.priceValidityStatus === "valid"
                                ? "bg-success/10 text-success"
                                : lead.priceValidityStatus === "invalid"
                                  ? "bg-danger/10 text-danger"
                                  : "bg-warning/10 text-warning",
                            )}>
                              {lead.priceValidityStatus === "valid" ? "有效价格" : lead.priceValidityStatus === "invalid" ? "解析异常" : "待补充"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn("whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold", lead.risk === "高风险" ? "bg-danger/10 text-danger" : lead.risk === "中风险" ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>
                              {lead.risk}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusPill status={lead.status} />
                          </td>
                          <td
                            className="px-3 py-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedId(lead.code);
                                  setDetailOpen(true);
                                }}
                                className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-primary/15 bg-primary-soft px-2.5 font-black text-primary"
                              >
                                <Eye className="size-3" />
                                查看
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedId(lead.code);
                                  if (lead.status === "已入正式价格库")
                                    router.push(
                                      `/price-leads?leadId=${lead.code}`,
                                    );
                                  else setDetailOpen(true);
                                }}
                                className="h-7 rounded-[7px] border border-primary/15 px-2.5 font-black text-primary"
                              >
                                {lead.status === "已入正式价格库" ? "价格库" : "证据"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="sticky bottom-0 flex items-center justify-between border-t border-borderSoft bg-white px-4 py-3 text-[12px] text-textSecondary">
                  <span>
                    共 {poolPagination.total} 条，当前第 {page} / {pageCount} 页
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(event) => { setPageSize(Number(event.target.value) as 10 | 20 | 30); setPage(1); }}
                      className="h-8 rounded-md border border-borderSoft px-2 text-[12px]"
                      aria-label="每页条数"
                    >
                      <option value={10}>10 条/页</option>
                      <option value={20}>20 条/页</option>
                      <option value={30}>30 条/页</option>
                    </select>
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      className="size-8 rounded-md border border-borderSoft disabled:opacity-40"
                    >
                      ‹
                    </button>
                    {Array.from({ length: Math.min(5, pageCount) }, (_, index) => {
                      const start = Math.min(Math.max(1, page - 2), Math.max(1, pageCount - 4));
                      return start + index;
                    }).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        className={cn(
                          "size-8 rounded-md border border-borderSoft font-bold",
                          item === page ? "bg-primary text-white" : "bg-white",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={page === pageCount}
                      onClick={() =>
                        setPage((value) => Math.min(pageCount, value + 1))
                      }
                      className="size-8 rounded-md border border-borderSoft disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8">
                <EmptyState
                  title="没有匹配的采集结果"
                  description="请调整搜索词或筛选条件。"
                />
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <section className="overflow-hidden rounded-[16px] border border-ai/20 bg-white shadow-card">
              <header className="flex items-center justify-between border-b border-ai/15 bg-ai-soft px-4 py-3">
                <div className="flex items-center gap-2"><IconBox icon={Sparkles} tone="purple" size="sm" /><div><h3 className="text-[14px] font-black text-textMain">结果审查工作区</h3><p className="text-[10px] text-textMuted">随表格选中项实时联动</p></div></div>
                <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-ai">人工关口</span>
              </header>
              {selected ? (
                <div className="space-y-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><strong className="block truncate text-[15px] text-textMain">{selected.name}</strong><span className="mt-1 block truncate text-[10px] text-textMuted">{selected.code} · {selected.spec}</span></div>
                      <strong className="shrink-0 text-[16px] text-primary">{selected.currency} {selected.price.toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-[8px] bg-primary-soft p-2"><span className="block text-[9px] text-textMuted">AI匹配</span><strong className="text-[13px] text-primary">{selected.match}%</strong></div>
                    <div className="rounded-[8px] bg-success/10 p-2"><span className="block text-[9px] text-textMuted">可信度</span><strong className="text-[13px] text-success">{selected.credibility}%</strong></div>
                    <div className={cn("rounded-[8px] p-2", selected.risk === "高风险" ? "bg-danger/10" : selected.risk === "中风险" ? "bg-warning/10" : "bg-success/10")}><span className="block text-[9px] text-textMuted">风险</span><strong className={cn("text-[12px]", selected.risk === "高风险" ? "text-danger" : selected.risk === "中风险" ? "text-warning" : "text-success")}>{selected.risk}</strong></div>
                  </div>
                  <div className="rounded-[9px] border-l-2 border-ai bg-ai-soft p-3 text-[11px] leading-5 text-textSecondary"><strong className="text-ai">AI判断：</strong>{selected.priceValidityStatus === "invalid" ? "该数字已判定为解析异常，只可核对原文或驳回，不能用于套价。" : selected.priceValidityStatus === "needs_review" ? `当前缺少${selected.priceValidationReasons.includes("missing_specification") ? "规格、" : ""}${selected.priceValidationReasons.includes("missing_unit") ? "计价单位、" : ""}完整价格口径，补齐前不可横向比较。` : selected.duplicateStatus === "疑似重复" ? "发现疑似重复价格记录，建议先核对来源时间与报价条件。" : "价格字段与证据口径完整，可在人工核验后确认。"}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setDetailOpen(true)} className="inline-flex h-8 items-center justify-center gap-1 rounded-[8px] border border-primary/20 text-[11px] font-bold text-primary"><Eye className="size-3.5" /> 查看证据</button>
                    <button type="button" onClick={() => router.push(`/inquiries/create?source=price-collection&leadId=${encodeURIComponent(selected.code)}&leadType=${encodeURIComponent(selected.type)}&leadName=${encodeURIComponent(selected.name)}&leadSpec=${encodeURIComponent(selected.spec)}&currency=${encodeURIComponent(selected.currency)}`)} disabled={selected.priceValidityStatus !== "valid"} className="inline-flex h-8 items-center justify-center gap-1 rounded-[8px] border border-ai/20 text-[11px] font-bold text-ai disabled:cursor-not-allowed disabled:opacity-40"><PlusCircle className="size-3.5" /> 创建询价</button>
                    <button type="button" onClick={() => openLeadPoolForReview([selected.code])} className="col-span-2 h-8 rounded-[8px] bg-ai text-[11px] font-bold text-white">进入线索池审核</button>
                  </div>
                </div>
              ) : <div className="p-4"><EmptyState title="请选择采集结果" description="点击表格行后在此查看证据与人工动作。" /></div>}
            </section>
            <section className="rounded-[16px] border border-borderSoft bg-white p-4 shadow-card">
              <h3 className="text-[16px] font-black text-textMain">
                高风险结果提醒{" "}
                <span className="text-danger">
                  （{leads.filter((lead) => lead.risk === "高风险").length}条）
                </span>
              </h3>
              <div className="mt-3 space-y-2">
                {riskBreakdown.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      clearAllFilters();
                      const matched =
                        item.key === "high"
                          ? leads.find((lead) => lead.risk === "高风险")
                          : item.key === "low-credibility"
                            ? leads.find((lead) => lead.credibility < 75)
                            : item.key === "missing-spec"
                              ? leads.find(
                                  (lead) => lead.spec === "待AI补全规格",
                                )
                              : leads.find(
                                  (lead) =>
                                    lead.duplicateStatus === "疑似重复",
                                );
                      if (item.key === "high") setRiskFilter("高风险");
                      if (item.key === "low-credibility")
                        setCredibilityFilter("低于75%");
                      if (item.key === "missing-spec")
                        setQuery("待AI补全规格");
                      if (item.key === "duplicate" && matched)
                        setQuery(matched.code);
                      if (matched) setSelectedId(matched.code);
                      setPage(1);
                      toast.warning("已应用风险筛选", item.label);
                    }}
                    className="flex w-full items-center gap-2 text-left text-[12px]"
                  >
                    <CircleAlert
                      className={cn(
                        "size-4",
                        index === 0 ? "text-danger" : "text-warning",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {item.label}
                    </span>
                    <span className="font-black text-danger">
                      {item.count} 条
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => router.push("/price-leads?risk=high")}
                className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-[8px] border border-primary/15 bg-primary-soft py-2 text-[12px] font-bold text-primary"
              >
                查看全部风险线索 <ChevronRight className="size-3.5" />
              </button>
            </section>
          </aside>
        </div>

        <section className="flex flex-wrap items-center justify-between gap-3 border-y border-borderSoft bg-white/70 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <IconBox icon={BarChart3} tone="blue" size="sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-black text-textMain">分析对象</h2>
                {analysisLoading ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-textMuted">
                    <RefreshCw className="size-3 animate-spin" /> 正在更新样本
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-textMuted">
                    已加载 {analysisPool.length} / {analysisTotal} 条分析样本
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-textMuted">
                仅切换下方分析口径，不改变上方结果表和审核选择。
              </p>
            </div>
          </div>
          <div className="inline-flex max-w-full rounded-[8px] border border-borderSoft bg-slate-50 p-0.5">
            {([
              ["全部", analysisCounts.all],
              ["设备", analysisCounts.equipment],
              ["地材", analysisCounts.material],
            ] as const).map(([label, count]) => (
              <button
                key={label}
                type="button"
                onClick={() => setAnalysisType(label)}
                aria-pressed={analysisType === label}
                className={cn(
                  "inline-flex h-8 min-w-[76px] items-center justify-center gap-1.5 rounded-[6px] px-3 text-[11px] font-bold transition",
                  analysisType === label
                    ? "bg-primary text-white shadow-sm"
                    : "text-textMuted hover:bg-white hover:text-primary",
                )}
              >
                {label}
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[9px]",
                  analysisType === label ? "bg-white/20 text-white" : "bg-white text-textMuted",
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-2">
          <DistributionCard
            title="来源可信度分布"
            subtitle={`${analysisScopeLabel} · 按当前筛选结果评估来源可靠性`}
            icon={ShieldCheck}
            data={credibilityDistribution}
            total={analysisRows.length}
            insight={analysisRows.length ? "高可信来源可优先进入人工确认" : `当前${analysisScopeLabel}暂无分析样本`}
            onSelect={(label) => {
              setCredibilityFilter(label);
              setPage(1);
              toast.info("已筛选可信度", label);
            }}
          />
          <DistributionCard
            title="采集来源占比"
            subtitle={`${analysisScopeLabel} · 识别来源集中度与数据覆盖结构`}
            icon={PieChart}
            data={sourceDistribution}
            total={analysisRows.length}
            insight={analysisRows.length ? "点击任一来源可直接联动上方结果表" : `当前${analysisScopeLabel}暂无来源数据`}
            onSelect={(label) => {
              setSourceFilter(label);
              setPage(1);
              toast.info("已筛选采集来源", label);
            }}
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-12">
          <section className="flex min-h-[254px] min-w-0 flex-col rounded-[16px] border border-ai/15 bg-white p-4 shadow-card 2xl:col-span-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <IconBox icon={BrainCircuit} tone="purple" size="sm" />
                <div className="min-w-0">
                  <h3 className="text-[16px] font-black text-textMain">
                    AI 采集洞察
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] text-textMuted">
                    {analysisScopeLabel} · 针对当前筛选结果给出治理建议
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-ai-soft px-2 py-1 text-[10px] font-black text-ai">
                人工确认
              </span>
            </div>
            <div className="mt-3 rounded-[10px] bg-ai-soft px-3 py-2 text-[11px] text-ai">
              当前对象：
              <strong className="ml-1">
                {analysisSelected ? `${analysisSelected.name} · ${analysisSelected.code}` : `暂无${analysisScopeLabel}结果`}
              </strong>
            </div>
            <div className="mt-2 flex-1 divide-y divide-borderSoft">
              {!analysisRows.length ? (
                <div className="flex min-h-[148px] items-center justify-center rounded-[10px] bg-slate-50 px-4 text-center text-[11px] font-semibold text-textMuted">
                  当前{analysisScopeLabel}没有可分析线索，采集或调整筛选后将生成治理建议。
                </div>
              ) : analysisInsightItems.map(([title, desc, action], index) => (
                <div
                  key={title}
                  className="flex items-center gap-2.5 py-2.5"
                >
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black",
                      index === 2
                        ? "bg-success/10 text-success"
                        : "bg-primary-soft text-primary",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-black">{title}</div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-textMuted">
                      {desc}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!analysisSelected) {
                        toast.warning(`当前没有可操作的${analysisScopeLabel}结果`);
                        return;
                      }
                      if (index === 0) {
                        setSelectedId(analysisSelected.code);
                        setDetailOpen(true);
                        toast.info("已打开来源证据", analysisSelected.evidenceId);
                        return;
                      }
                      if (index === 1) {
                        const incomplete = analysisRows.find(
                          (lead) => lead.spec === "待AI补全规格",
                        );
                        if (incomplete) focusLead(incomplete, true);
                        else toast.success("规格检查完成", "当前结果规格字段完整。 ");
                        return;
                      }
                      openLeadPoolForReview([analysisSelected.code]);
                    }}
                    className="shrink-0 rounded-[8px] border border-primary/20 px-2.5 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    {action}
                  </button>
                </div>
              ))}
            </div>
          </section>
          <PriceTrendPanel
            leads={analysisRows}
            scopeLabel={analysisScopeLabel}
            refreshKey={refreshKey}
            onRefresh={() => {
              setRefreshKey((value) => value + 1);
              toast.success("趋势数据已刷新", `已按当前 ${analysisRows.length} 条${analysisScopeLabel}样本重新计算。`);
            }}
            className="2xl:col-span-4"
          />
          <section className="flex min-h-[254px] min-w-0 flex-col rounded-[16px] border border-borderSoft bg-white p-4 shadow-card 2xl:col-span-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <IconBox icon={MapPinned} tone="cyan" size="sm" />
                <div>
                  <h3 className="text-[16px] font-black">地区价格分布</h3>
                  <p className="mt-0.5 text-[11px] text-textMuted">
                    {analysisScopeLabel} · 当前筛选范围的地区集中度
                  </p>
                </div>
              </div>
              <div className="flex rounded-md border border-borderSoft p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setRegionMode("count")}
                  className={cn(
                    "rounded px-2 py-1",
                    regionMode === "count" && "bg-primary text-white",
                  )}
                >
                  按线索数量
                </button>
                <button
                  type="button"
                  onClick={() => setRegionMode("price")}
                  className={cn(
                    "rounded px-2 py-1",
                    regionMode === "price" && "bg-primary text-white",
                  )}
                >
                  按平均价格
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 divide-x divide-borderSoft rounded-[10px] bg-primary-soft/70 py-2 text-center">
              <div>
                <div className="text-[16px] font-black text-primary">
                  {regions.length}
                </div>
                <div className="text-[10px] font-semibold text-textMuted">
                  覆盖地区
                </div>
              </div>
              <div>
                <div className="truncate px-2 text-[13px] font-black text-primary">
                  {regions[0]?.[0] || "暂无"}
                </div>
                <div className="text-[10px] font-semibold text-textMuted">
                  重点地区
                </div>
              </div>
            </div>
            <div className="mt-3 flex-1 space-y-3">
              {regions.map(([name, percent], index) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setQuery(name.replace("省", ""));
                    setPage(1);
                  }}
                  className="grid w-full grid-cols-[70px_1fr_44px] items-center gap-2 text-left text-[12px]"
                >
                  <span className="font-bold">
                    <b className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                      {index + 1}
                    </b>
                    {name}
                  </span>
                  <span className="h-2 rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: percent }}
                    />
                  </span>
                  <span className="font-bold">{percent}</span>
                </button>
              ))}
              {!regions.length ? (
                <div className="flex h-20 items-center justify-center rounded-[10px] bg-slate-50 text-[12px] font-semibold text-textMuted">
                  当前{analysisScopeLabel}筛选下暂无地区数据
                </div>
              ) : null}
            </div>
            <div className="mt-2 border-t border-borderSoft pt-2 text-[11px] font-semibold text-textMuted">
              点击地区可联动筛选上方采集结果
            </div>
          </section>
          <section className="flex min-h-[254px] min-w-0 flex-col rounded-[16px] border border-ai/15 bg-white p-4 shadow-card 2xl:col-span-2">
            <div className="flex items-center gap-2.5">
              <IconBox icon={BarChart3} tone="purple" size="sm" />
              <div className="min-w-0">
                <h3 className="truncate text-[16px] font-black">
                  AI 智能识别能力
                </h3>
                <p className="mt-0.5 text-[11px] text-textMuted">
                  {analysisScopeLabel} · 当前结果质量概览
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between rounded-[10px] bg-ai-soft px-3 py-2.5">
              <div>
                <div className="text-[10px] font-bold text-ai">综合识别质量</div>
                <div className="mt-1 text-[26px] font-black leading-none text-ai">
                  {analysisRows.length
                    ? (
                        analysisRows.reduce((sum, lead) => sum + lead.credibility, 0) /
                        analysisRows.length
                      ).toFixed(1)
                    : "0.0"}
                  <span className="ml-0.5 text-[12px]">%</span>
                </div>
              </div>
              <BrainCircuit className="size-8 text-ai/55" />
            </div>
            <div className="mt-3 flex-1 space-y-3">
              {[
                [
                  "AI匹配度",
                  analysisRows.length
                    ? analysisRows.reduce((sum, lead) => sum + lead.match, 0) /
                      analysisRows.length
                    : 0,
                  "bg-primary",
                ],
                [
                  "来源可信度",
                  analysisRows.length
                    ? analysisRows.reduce((sum, lead) => sum + lead.credibility, 0) /
                      analysisRows.length
                    : 0,
                  "bg-success",
                ],
                [
                  "证据覆盖率",
                  analysisRows.length
                    ? (analysisRows.filter((lead) => lead.evidenceId).length /
                        analysisRows.length) *
                      100
                    : 0,
                  "bg-ai",
                ],
              ].map(([label, value, color]) => (
                <div
                  key={label}
                  className="text-[11px]"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-textMuted">{label}</span>
                    <strong className="text-textMain">
                      {Number(value).toFixed(1)}%
                    </strong>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full", color)}
                      style={{ width: `${Math.min(100, Number(value))}%` }}
                    />
                  </div>
                </div>
              ))}
              {!analysisRows.length ? (
                <div className="rounded-[8px] bg-slate-50 px-2 py-1.5 text-center text-[10px] font-semibold text-textMuted">
                  暂无{analysisScopeLabel}样本，质量指标不参与判断
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => router.push("/ai-workbench?type=collection")}
              className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-[8px] border border-primary/15 bg-primary-soft py-2 text-[11px] font-bold text-primary transition hover:border-primary/30"
            >
              查看识别记录 <ChevronRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setRefreshKey((value) => value + 1);
                toast.success("分析数据已刷新");
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 text-[11px] font-bold text-textMuted hover:text-primary"
            >
              <RefreshCw className="size-3.5" />
              刷新分析
            </button>
          </section>
        </section>
      </div>

      <PriceCollectionExportDialog
        open={exportOpen}
        count={poolPagination.total}
        selectedCount={checkedIds.length}
        onClose={() => setExportOpen(false)}
        onExport={exportCollectionResults}
      />
      <ConfirmDialog
        open={confirmReject}
        title="驳回采集结果"
        description={`${selected?.code || "当前记录"} 将标记为已驳回，不会进入价格线索池。来源证据仍会保留用于审计。`}
        confirmLabel="确认驳回"
        onCancel={() => setConfirmReject(false)}
        onConfirm={() => {
          setConfirmReject(false);
          void rejectSelectedLead();
        }}
      />
      <ConfirmDialog
        open={confirmDeleteResults}
        title="删除采集结果"
        description={`将永久删除已选择的 ${checkedIds.length} 条采集结果。已写入正式价格库的结果受保护，不能在这里删除；其余删除操作会保留审计轨迹。`}
        confirmLabel="确认删除"
        tone="danger"
        onCancel={() => setConfirmDeleteResults(false)}
        onConfirm={() => void deleteSelectedResults()}
      />
      <ConfirmDialog
        open={Boolean(sourceToDelete)}
        title="删除采集来源"
        description={`${sourceToDelete?.name || "该来源"} 将从来源白名单中移除，后续任务不再采集该站点。历史证据仍保留用于追溯。`}
        confirmLabel="删除来源"
        tone="danger"
        onCancel={() => setSourceToDelete(null)}
        onConfirm={() => void deleteCollectionSource()}
      />
      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="永久删除空任务"
        description={`${taskToDelete?.taskCode || "该任务"} 没有业务成果，删除后任务配置和执行日志将不可恢复。含价格、目录候选或证据的任务只能归档。`}
        confirmLabel="确认删除"
        tone="danger"
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => void deleteHistoryTask()}
      />
      {taskHistoryOpen ? (
        <div className="fixed inset-0 z-[81] flex justify-end bg-slate-950/35 backdrop-blur-sm">
          <button type="button" aria-label="关闭最近任务" onClick={() => setTaskHistoryOpen(false)} className="absolute inset-0" />
          <aside className="relative flex h-full w-full max-w-[580px] flex-col overflow-hidden bg-white shadow-panel">
            <header className="flex items-start justify-between border-b border-borderSoft bg-white px-5 py-4">
              <div><h2 className="text-[17px] font-black text-textMain">采集任务管理</h2><p className="mt-1 text-[12px] text-textMuted">查看执行结果、处理异常任务并管理品类周期。</p></div>
              <button type="button" onClick={() => setTaskHistoryOpen(false)} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button>
            </header>
            <div className="grid grid-cols-2 border-b border-borderSoft bg-slate-50 p-1.5">
              <button type="button" onClick={() => setTaskHistoryTab("history")} className={cn("h-9 rounded-md text-[12px] font-bold", taskHistoryTab === "history" ? "bg-white text-primary shadow-sm" : "text-textMuted")}>任务历史（{operationalTasks.length}）</button>
              <button type="button" onClick={() => setTaskHistoryTab("policies")} className={cn("h-9 rounded-md text-[12px] font-bold", taskHistoryTab === "policies" ? "bg-white text-primary shadow-sm" : "text-textMuted")}>周期策略（实际任务 {recurringTasks.length}）</button>
            </div>
            {taskHistoryTab === "policies" ? <div className="min-h-0 flex-1 overflow-y-auto"><PriceCollectionSchedulePolicies tasks={operationalTasks} onApplied={() => void loadBusinessData(false)} /></div> : <>
              <div className="border-b border-borderSoft bg-white p-4">
                <div className="grid grid-cols-5 overflow-hidden rounded-md border border-borderSoft">
                  {([[
                    "all", "全部", operationalTasks.length,
                  ], ["recurring", "周期", recurringTasks.length], ["attention", "需处理", attentionTasks.length], ["qualified", "有成果", qualifiedTasks.length], ["archived", "已归档", archivedTasks.length]] as Array<[TaskHistoryFilter, string, number]>).map(([value, label, count]) => <button key={value} type="button" onClick={() => setTaskHistoryFilter(value)} className={cn("border-r border-borderSoft px-2 py-2.5 text-left last:border-r-0", taskHistoryFilter === value ? "bg-primary-soft" : "hover:bg-slate-50")}><span className="block text-[10px] font-bold text-textMuted">{label}</span><strong className={cn("mt-0.5 block text-[17px]", value === "attention" && count ? "text-danger" : "text-textMain")}>{count}</strong></button>)}
                </div>
                <div className="mt-3 flex gap-2">
                  <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-borderSoft px-3"><Search className="size-3.5 text-textMuted" /><input value={taskHistoryQuery} onChange={(event) => setTaskHistoryQuery(event.target.value)} placeholder="搜索任务、编号或地区" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none" /></label>
                  <button type="button" onClick={exportTaskHistory} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-bold text-textSecondary"><Download className="size-3.5" />导出</button>
                  <button type="button" onClick={() => { setTaskManagementMode((current) => !current); setSelectedTaskIds([]); }} className={cn("h-9 shrink-0 rounded-md border px-3 text-[11px] font-bold", taskManagementMode ? "border-primary bg-primary text-white" : "border-borderSoft bg-white text-primary")}>{taskManagementMode ? "退出管理" : "批量管理"}</button>
                </div>
              </div>
              {taskManagementMode ? <div className="flex flex-wrap items-center gap-2 border-b border-borderSoft bg-primary-soft px-4 py-2.5 text-[11px]">
                <button type="button" onClick={() => setSelectedTaskIds(filteredHistoryTasks.map((item) => item.id))} className="font-bold text-primary">选择当前筛选</button>
                <button type="button" onClick={() => setSelectedTaskIds([])} className="font-bold text-textMuted">清空</button>
                <span className="mr-auto text-textSecondary">已选 {selectedTaskIds.length} 个任务</span>
                <button type="button" disabled={!selectedTaskIds.length || taskActionBusyId === "bulk" || !permissions.canWrite} onClick={() => void runBulkTaskAction("bulk_disable_schedule")} className="h-7 rounded-md border border-primary/20 bg-white px-2.5 font-bold text-primary disabled:opacity-40">关闭周期</button>
                <button type="button" disabled={!selectedTaskIds.length || taskActionBusyId === "bulk" || !permissions.canWrite} onClick={() => void runBulkTaskAction("bulk_archive")} className="h-7 rounded-md bg-textMain px-2.5 font-bold text-white disabled:opacity-40">归档所选</button>
              </div> : null}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                {filteredHistoryTasks.map((item) => {
                  const busy = taskActionBusyId === item.id;
                  const deletable = !item.archivedAt && ["queued", "paused", "failed", "stopped"].includes(item.status) && item.successCount === 0 && item.qualifiedLeadCount === 0 && item.catalogCandidateCount === 0;
                  return <article key={item.id} className={cn("rounded-[8px] border p-3", item.archivedAt ? "border-slate-200 bg-slate-50" : taskNeedsAttention(item) ? "border-warning/25 bg-warning/5" : "border-borderSoft bg-white")}>
                    <div className="flex items-start justify-between gap-3">
                      {taskManagementMode ? <input type="checkbox" aria-label={`选择任务 ${item.taskCode}`} checked={selectedTaskIds.includes(item.id)} onChange={() => toggleTaskSelection(item.id)} className="mt-1 size-4 shrink-0 accent-primary" /> : null}
                      <div className="min-w-0"><div className="flex items-start gap-1.5"><span className={cn("mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold", item.targetType === "material" ? "bg-success/10 text-success" : "bg-primary-soft text-primary")}>{item.targetType === "material" ? "地材" : "设备"}</span><strong className="line-clamp-2 text-[13px] leading-5 text-textMain" title={item.keyword || item.taskCode}>{item.keyword || item.taskCode}</strong></div><span className="mt-1 block text-[10px] text-textMuted">{item.taskCode} · {item.region || "地区不限"}</span></div>
                      <span className={cn("shrink-0 rounded-md px-2 py-1 text-[10px] font-bold", item.archivedAt ? "bg-slate-200 text-textSecondary" : taskResultTone(item))}>{item.archivedAt ? "已归档" : `${taskExecutionLabel(item.status)} · ${taskOutcomeLabel(item)}`}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-[10px] text-textMuted"><span>{item.catalogCandidateCount > 0 ? "目录候选" : "合格价格"}<strong className="ml-1 text-textMain">{item.catalogCandidateCount > 0 ? item.catalogCandidateCount : item.qualifiedLeadCount}</strong></span><span>证据<strong className="ml-1 text-textMain">{item.evidenceCount}</strong></span><span>失败来源<strong className={cn("ml-1", item.failedCount ? "text-danger" : "text-textMain")}>{item.failedCount}</strong></span></div>
                    {item.lastError ? <p className="mt-2 line-clamp-2 rounded-md bg-danger/5 px-2 py-1.5 text-[10px] leading-4 text-danger" title={item.lastError}>{item.lastError}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-borderSoft pt-2">
                      <button type="button" onClick={() => { setTaskHistoryOpen(false); router.push(`/ai-price-collection/tasks/${item.id}`); }} className="h-7 rounded-md border border-primary/20 bg-white px-2.5 text-[10px] font-bold text-primary">查看详情</button>
                      {(item.status === "failed" || item.outcomeStatus === "blocked") ? <button type="button" onClick={() => void retryHistoryTask(item, true)} disabled={busy || !permissions.canWrite} className="h-7 rounded-md bg-danger px-2.5 text-[10px] font-bold text-white disabled:opacity-40">{busy ? "重试中" : "重试失败来源"}</button> : null}
                      {item.outcomeStatus === "no_price" && item.catalogCandidateCount === 0 ? <><button type="button" onClick={() => adjustHistoryTask(item)} className="h-7 rounded-md border border-warning/25 bg-white px-2.5 text-[10px] font-bold text-warning">调整范围</button><button type="button" onClick={() => void retryHistoryTask(item, false)} disabled={busy || !permissions.canWrite} className="h-7 rounded-md bg-warning px-2.5 text-[10px] font-bold text-white disabled:opacity-40">{busy ? "执行中" : "重新执行"}</button></> : null}
                      {taskManagementMode && item.archivedAt ? <button type="button" onClick={() => void updateTaskArchive(item)} disabled={busy || !permissions.canWrite} className="h-7 rounded-md border border-primary/20 bg-white px-2.5 text-[10px] font-bold text-primary disabled:opacity-40">恢复任务</button> : null}
                      {taskManagementMode && !item.archivedAt && !["running", "queued"].includes(item.status) ? <button type="button" onClick={() => void updateTaskArchive(item)} disabled={busy || !permissions.canWrite} className="h-7 rounded-md border border-textMuted/25 bg-white px-2.5 text-[10px] font-bold text-textSecondary disabled:opacity-40">归档</button> : null}
                      {taskManagementMode && deletable ? <button type="button" onClick={() => setTaskToDelete(item)} disabled={busy || !permissions.canWrite} className="h-7 rounded-md border border-danger/20 bg-white px-2.5 text-[10px] font-bold text-danger disabled:opacity-40">删除空任务</button> : null}
                      {!taskManagementMode && !item.archivedAt && ["web", "api"].includes(item.collectionMode) ? <button type="button" onClick={() => requestTaskSchedule(item)} disabled={busy || !permissions.canWrite} className={cn("ml-auto h-7 rounded-md border px-2.5 text-[10px] font-bold disabled:opacity-40", item.scheduleEnabled ? "border-warning/25 bg-warning/10 text-warning" : "border-primary/20 bg-white text-primary")}>{item.scheduleEnabled ? "关闭周期" : "设为周期任务"}</button> : null}
                    </div>
                    <p className="mt-2 text-[10px] font-semibold text-textMuted">{item.archivedAt ? `归档于 ${formatBeijingDate(item.archivedAt)}` : item.scheduleEnabled ? `${item.frequency}调度 · 下次 ${formatBeijingDate(item.nextRunAt)}` : `最近执行 ${formatBeijingDate(item.finishedAt || item.createdAt)}`}</p>
                  </article>;
                })}
                {!filteredHistoryTasks.length ? <EmptyState title="没有匹配的采集任务" description="请调整搜索条件或任务筛选。" /> : null}
              </div>
            </>}
          </aside>
        </div>
      ) : null}
      {scheduleTask ? (
        <div className="fixed inset-0 z-[82] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <button type="button" aria-label="关闭周期任务设置" onClick={() => setScheduleTask(null)} className="absolute inset-0" />
          <section className="relative w-full max-w-[440px] overflow-hidden rounded-[10px] border border-borderSoft bg-white shadow-panel">
            <header className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
              <div>
                <h2 className="text-[16px] font-black text-textMain">设为周期任务</h2>
                <p className="mt-1 text-[12px] text-textMuted">确认执行频率后，系统将按原采集范围和来源自动运行。</p>
              </div>
              <button type="button" onClick={() => setScheduleTask(null)} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button>
            </header>
            <div className="space-y-4 p-5">
              <div className="rounded-md border border-borderSoft bg-slate-50 px-3 py-2.5">
                <strong className="block text-[12px] text-textMain">{scheduleTask.keyword || scheduleTask.taskCode}</strong>
                <span className="mt-1 block text-[10px] text-textMuted">{scheduleTask.taskCode} · {scheduleTask.region || "地区不限"}</span>
              </div>
              <label className="grid gap-1.5 text-[12px] font-bold text-textSecondary">运行频率
                <select value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value)} className="h-10 rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-primary">
                  {(["每小时", "每天", "每周", "每月"] as const).map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                </select>
              </label>
              <div className="rounded-md border border-primary/15 bg-primary-soft px-3 py-2.5 text-[11px] leading-5 text-textSecondary">
                周期运行只负责再次采集，新增价格仍会进入人工审核流程，不会自动写入正式价格库。
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-borderSoft px-5 py-4">
              <button type="button" onClick={() => setScheduleTask(null)} className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-bold">取消</button>
              <button
                type="button"
                disabled={taskActionBusyId === scheduleTask.id || !permissions.canWrite}
                onClick={() => {
                  const item = scheduleTask;
                  setScheduleTask(null);
                  void toggleTaskSchedule(item, scheduleFrequency);
                }}
                className="h-9 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:bg-slate-300"
              >确认启用</button>
            </footer>
          </section>
        </div>
      ) : null}
      {assignOpen ? (
        <div className="fixed inset-0 z-[82] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <button type="button" aria-label="关闭审核分派" onClick={() => setAssignOpen(false)} className="absolute inset-0" />
          <section className="relative w-full max-w-[500px] overflow-hidden rounded-[12px] border border-borderSoft bg-white shadow-panel">
            <header className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
              <div><h2 className="text-[16px] font-black text-textMain">分派人工审核</h2><p className="mt-1 text-[12px] text-textMuted">已选择 {checkedIds.length} 条线索，设置责任人与完成时限。</p></div>
              <button type="button" onClick={() => setAssignOpen(false)} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button>
            </header>
            <div className="grid gap-4 p-5">
              <label className="grid gap-1.5 text-[12px] font-bold text-textSecondary">审核责任人
                <select value={assignmentReviewerId} onChange={(event) => setAssignmentReviewerId(event.target.value)} className="h-10 rounded-[8px] border border-borderSoft px-3 font-normal">
                  <option value="">请选择责任人</option>
                  {reviewers.map((reviewer) => <option key={reviewer.userId} value={reviewer.userId}>{reviewer.displayName}{reviewer.isCurrentUser ? "（我）" : ""}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-[12px] font-bold text-textSecondary">审核时限
                <input type="datetime-local" value={assignmentDueAt} onChange={(event) => setAssignmentDueAt(event.target.value)} className="h-10 rounded-[8px] border border-borderSoft px-3 font-normal" />
              </label>
              <label className="grid gap-1.5 text-[12px] font-bold text-textSecondary">分派说明
                <textarea rows={3} value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} placeholder="例如：优先核验价格条件和来源有效期" className="resize-none rounded-[8px] border border-borderSoft p-3 font-normal" />
              </label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-borderSoft px-5 py-4">
              <button type="button" onClick={() => setAssignOpen(false)} className="h-9 rounded-[8px] border border-borderSoft px-4 text-[12px] font-bold">取消</button>
              <button type="button" disabled={!assignmentReviewerId} onClick={() => void assignSelectedLeads()} className="h-9 rounded-[8px] bg-primary px-4 text-[12px] font-bold text-white disabled:bg-slate-300">确认分派</button>
            </footer>
          </section>
        </div>
      ) : null}
      {preflightOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <button type="button" aria-label="关闭任务预检" onClick={() => setPreflightOpen(false)} className="absolute inset-0" />
          <section className="relative w-full max-w-[620px] overflow-hidden rounded-[12px] border border-borderSoft bg-white shadow-panel">
            <header className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
              <div className="flex items-start gap-3">
                <IconBox icon={ShieldCheck} tone="green" size="sm" />
                <div>
                  <h2 className="text-[16px] font-black text-textMain">任务执行预检</h2>
                  <p className="mt-1 text-[12px] text-textMuted">在写入采集队列前核对权限、来源、证据和人工审核边界。</p>
                </div>
              </div>
              <button type="button" onClick={() => setPreflightOpen(false)} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button>
            </header>
            <div className="space-y-2 p-5">
              {preflightChecks.map((check) => (
                <div key={check.label} className="flex items-start gap-3 rounded-[8px] border border-borderSoft p-3">
                  {check.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" />}
                  <div><strong className="block text-[13px] text-textMain">{check.label}</strong><span className="mt-1 block text-[11px] leading-5 text-textMuted">{check.detail}</span></div>
                  <span className={cn("ml-auto rounded-md px-2 py-1 text-[10px] font-bold", check.passed ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>{check.passed ? "通过" : "需处理"}</span>
                </div>
              ))}
            </div>
            <footer className="flex items-center justify-between border-t border-borderSoft px-5 py-4">
              <span className={cn("text-[12px] font-bold", preflightChecks.every((item) => item.passed) ? "text-success" : "text-danger")}>{preflightChecks.every((item) => item.passed) ? "全部检查通过，可以执行" : "存在未通过项，暂不能执行"}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPreflightOpen(false)} className="h-9 rounded-[8px] border border-borderSoft px-4 text-[12px] font-bold">返回修改</button>
                <button type="button" disabled={!preflightChecks.every((item) => item.passed) || Boolean(executeDisabledReason)} onClick={() => {
                  setPreflightOpen(false);
                  if (collectionMode === "quote_upload") void uploadQuoteForCollection();
                  else if (collectionMode === "manual") void submitManualEntry();
                  else void startCollection();
                }} className="h-9 rounded-[8px] bg-primary px-4 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">确认执行</button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
      {collectionGuideOpen ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="关闭采集说明"
            onClick={() => setCollectionGuideOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <section className="relative w-full max-w-[680px] overflow-hidden rounded-[16px] border border-borderSoft bg-white shadow-panel">
            <header className="flex items-center justify-between border-b border-borderSoft bg-gradient-to-r from-primary-soft to-ai-soft px-5 py-4">
              <div className="flex items-center gap-3">
                <IconBox icon={Network} tone="purple" size="sm" />
                <div>
                  <h2 className="text-[18px] font-black text-textMain">
                    价格采集如何执行
                  </h2>
                  <p className="mt-0.5 text-[12px] text-textMuted">
                    从业务任务到人工确认的受控流程
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollectionGuideOpen(false)}
                className="flex size-8 items-center justify-center rounded-md hover:bg-white/70"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["1", "定义范围", "对象、关键词、地区、来源"],
                  ["2", "创建任务", "写入 Supabase 业务队列"],
                  ["3", "生成候选", "保留原始价格、币种、单位和来源证据"],
                  ["4", "线索池审核", "人工确认后才能写入正式价格库"],
                ].map(([step, title, description]) => (
                  <div
                    key={step}
                    className="rounded-[10px] border border-borderSoft bg-[#FAFCFF] p-3"
                  >
                    <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-black text-white">
                      {step}
                    </span>
                    <strong className="mt-2 block text-[13px] text-textMain">
                      {title}
                    </strong>
                    <span className="mt-1 block text-[11px] leading-5 text-textMuted">
                      {description}
                    </span>
                  </div>
                ))}
              </div>
              <section className="rounded-[12px] border border-success/20 bg-success/5 p-4 text-[12px] leading-6 text-textSecondary">
                <strong className="text-success">当前已经真实生效：</strong>
                白名单网页/API采集、报价文件上传到私有 Storage、结构化识别、来源证据、候选线索持久化、角色权限、人工审核和审计记录。
              </section>
              <section className="rounded-[12px] border border-warning/25 bg-warning/10 p-4 text-[12px] leading-6 text-textSecondary">
                <strong className="text-warning">业务边界：</strong>
                采集仅访问已登记白名单来源。网页内容、报价识别和 AI 判断都只生成候选数据，必须由人工确认后才能进入价格线索池或正式价格库。
              </section>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCollectionGuideOpen(false);
                    setAdvancedOpen(true);
                  }}
                  className="h-9 rounded-[8px] border border-primary/20 px-3 text-[12px] font-bold text-primary"
                >
                  配置采集规则
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollectionGuideOpen(false);
                    window.setTimeout(
                      () => document.getElementById("collection-keyword")?.focus(),
                      50,
                    );
                  }}
                  className="h-9 rounded-[8px] bg-primary px-4 text-[12px] font-bold text-white"
                >
                  填写任务
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {advancedOpen ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/35 backdrop-blur-sm">
          <button
            type="button"
            aria-label="关闭高级设置"
            onClick={() => setAdvancedOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <aside className="relative h-full w-full max-w-[460px] overflow-y-auto bg-white shadow-panel">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-borderSoft bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <IconBox icon={Settings2} tone="purple" size="sm" />
                <div>
                  <h2 className="text-[18px] font-black text-textMain">
                    采集高级设置
                  </h2>
                  <p className="mt-0.5 text-[12px] text-textMuted">
                    控制来源范围、去重、波动预警和停止条件
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdvancedOpen(false)}
                className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="space-y-5 p-5">
              <section className="rounded-[10px] border border-primary/15 bg-primary-soft p-3 text-[12px] leading-5 text-textSecondary">
                <strong className="text-primary">来源白名单由来源登记表统一管理。</strong>
                当前任务只能勾选已经验证的来源，不能在此临时输入任意网址。
              </section>
              <section className="rounded-[10px] border border-borderSoft p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[13px] font-black text-textMain">价格所属期</h3>
                    <p className="mt-1 text-[11px] leading-5 text-textMuted">只采集并入池该月份范围内的价格。采集时间不作为价格月份。</p>
                  </div>
                  <span className="shrink-0 rounded bg-success/10 px-2 py-1 text-[10px] font-bold text-success">入池前强校验</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-[12px] font-bold text-textSecondary">
                    起始月份
                    <input
                      type="month"
                      value={advancedConfig.pricePeriodFrom}
                      max={advancedConfig.pricePeriodToMode === "current_month" ? defaultPriceMonth() : advancedConfig.pricePeriodTo}
                      onChange={(event) => setAdvancedConfig((value) => ({ ...value, pricePeriodFrom: event.target.value }))}
                      className="h-10 rounded-[8px] border border-borderSoft px-3 text-[13px] font-normal outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[12px] font-bold text-textSecondary">
                    截止方式
                    <select
                      value={advancedConfig.pricePeriodToMode}
                      onChange={(event) => setAdvancedConfig((value) => ({ ...value, pricePeriodToMode: event.target.value as AdvancedConfig["pricePeriodToMode"] }))}
                      className="h-10 rounded-[8px] border border-borderSoft px-3 text-[13px] font-normal outline-none focus:border-primary"
                    >
                      <option value="current_month">至当前月（自动更新）</option>
                      <option value="fixed_month">指定截止月份</option>
                    </select>
                  </label>
                  {advancedConfig.pricePeriodToMode === "fixed_month" ? (
                    <label className="col-span-2 grid gap-1.5 text-[12px] font-bold text-textSecondary">
                      截止月份
                      <input
                        type="month"
                        value={advancedConfig.pricePeriodTo}
                        min={advancedConfig.pricePeriodFrom}
                        max={defaultPriceMonth()}
                        onChange={(event) => setAdvancedConfig((value) => ({ ...value, pricePeriodTo: event.target.value }))}
                        className="h-10 rounded-[8px] border border-borderSoft px-3 text-[13px] font-normal outline-none focus:border-primary"
                      />
                    </label>
                  ) : null}
                </div>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-textSecondary">
                  <input
                    type="checkbox"
                    checked={advancedConfig.excludeUnknownPriceDate}
                    onChange={(event) => setAdvancedConfig((value) => ({ ...value, excludeUnknownPriceDate: event.target.checked }))}
                    className="mt-1"
                  />
                  <span><strong className="text-textMain">排除无法识别价格月份的数据</strong><br />这类数据保留来源处理记录，但不会生成待审核价格线索。</span>
                </label>
              </section>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["采集时间窗（天）", "timeWindowDays", 1, 365],
                  ["最大价格账龄（天）", "maxPriceAgeDays", 1, 365],
                  ["来源并发数", "sourceConcurrency", 1, 8],
                  ["单来源页数额度", "maxPagesPerSource", 1, 100],
                  ["最大结果数", "maxResults", 10, 500],
                  ["去重阈值（%）", "dedupThreshold", 50, 100],
                  ["价格波动阈值（%）", "deviationThreshold", 5, 100],
                ].map(([label, key, min, max]) => (
                  <label
                    key={String(key)}
                    className="grid gap-1.5 text-[12px] font-bold text-textSecondary"
                  >
                    {label}
                    <input
                      type="number"
                      min={Number(min)}
                      max={Number(max)}
                      value={advancedConfig[key as keyof AdvancedConfig] as number}
                      onChange={(event) =>
                        setAdvancedConfig((value) => ({
                          ...value,
                          [key]: Number(event.target.value),
                        }))
                      }
                      className="h-10 rounded-[8px] border border-borderSoft px-3 text-[13px] font-normal outline-none focus:border-primary"
                    />
                  </label>
                ))}
              </div>
              {[
                ["requireEvidence", "必须保存来源证据", "无来源网址或快照的结果不会进入人工评估队列"],
                ["stopOnHighRisk", "高风险时停止自动推进", "发现高风险结果后暂停任务，等待人工处理"],
              ].map(([key, title, description]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-borderSoft p-3"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(
                      advancedConfig[key as keyof AdvancedConfig],
                    )}
                    onChange={(event) =>
                      setAdvancedConfig((value) => ({
                        ...value,
                        [key]: event.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    <strong className="block text-[13px] text-textMain">
                      {title}
                    </strong>
                    <span className="mt-1 block text-[12px] leading-5 text-textMuted">
                      {description}
                    </span>
                  </span>
                </label>
              ))}
              <section className="rounded-[10px] border border-ai/20 bg-ai-soft p-3 text-[12px] leading-5 text-textSecondary">
                AI 只根据这些规则生成候选结果。人工评估、线索转入和正式入库仍需业务人员确认。
              </section>
            </div>
            <footer className="sticky bottom-0 flex gap-2 border-t border-borderSoft bg-white p-4">
              <button
                type="button"
                onClick={() =>
                  setAdvancedConfig({
                    timeWindowDays: 30,
                    priceHistoryMonths: 1,
                    pricePeriodFrom: "2026-01",
                    pricePeriodToMode: "current_month",
                    pricePeriodTo: defaultPriceMonth(),
                    excludeUnknownPriceDate: true,
                    maxPriceAgeDays: 90,
                    sourceConcurrency: 3,
                    maxPagesPerSource: 18,
                    dedupThreshold: 85,
                    deviationThreshold: 30,
                    maxResults: 100,
                    requireEvidence: true,
                    stopOnHighRisk: false,
                  })
                }
                className="h-10 flex-1 rounded-[8px] border border-borderSoft text-[13px] font-bold"
              >
                恢复默认
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdvancedOpen(false);
                  toast.success("高级采集规则已保存");
                }}
                className="h-10 flex-1 rounded-[8px] bg-primary text-[13px] font-bold text-white"
              >
                保存设置
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
      {detailOpen && selected ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/35 backdrop-blur-sm">
          <aside className="h-full w-full max-w-[430px] overflow-y-auto bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
              <div>
                <h2 className="text-[18px] font-black">采集结果与来源证据</h2>
                <p className="mt-1 text-[12px] text-textMuted">
                  {selected.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <section className="rounded-[12px] border border-primary/15 bg-primary-soft p-4">
                <div className="text-[18px] font-black text-primary">
                  {selected.name}
                </div>
                <div className="mt-1 text-[13px] text-textSecondary">
                  {selected.spec}
                </div>
                {selected.originalName !== selected.name ? (
                  <div className="mt-2 border-t border-primary/10 pt-2 text-[11px] text-textMuted">
                    原文名称：{selected.originalName}
                  </div>
                ) : null}
              </section>
              {selected.translationStatus === "needs_review" && selected.databaseId ? (
                <section className="rounded-[10px] border border-ai/20 bg-ai-soft p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <strong className="text-[12px] text-ai">DeepSeek 译名待审核</strong>
                      <p className="mt-1 text-[10px] text-textMuted">置信度 {selected.translationConfidence ?? 0}% · 原文始终保留</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => void (async () => {
                        try {
                          await callCollectionApi("PATCH", { entity: "lead", id: selected.databaseId, action: "reject_translation", note: reviewNotes || "译名需重新处理" });
                          await loadBusinessData(false);
                          toast.info("已退回译名", "可稍后重新调用 DeepSeek 翻译。");
                        } catch (error) {
                          toast.danger("译名退回失败", error instanceof Error ? error.message : "请稍后重试");
                        }
                      })()} className="h-8 rounded-md border border-warning/30 bg-white px-2.5 text-[10px] font-bold text-warning">退回</button>
                      <button type="button" onClick={() => void (async () => {
                        try {
                          await callCollectionApi("PATCH", { entity: "lead", id: selected.databaseId, action: "approve_translation", note: reviewNotes || "译名已人工确认" });
                          await loadBusinessData(false);
                          toast.success("译名已确认", "中文名称已作为主显示，原文继续保留。");
                        } catch (error) {
                          toast.danger("译名确认失败", error instanceof Error ? error.message : "请稍后重试");
                        }
                      })()} className="h-8 rounded-md bg-ai px-2.5 text-[10px] font-bold text-white">确认译名</button>
                    </div>
                  </div>
                </section>
              ) : null}
              <section className={cn(
                "rounded-[10px] border p-3",
                selected.priceValidityStatus === "valid"
                  ? "border-success/25 bg-success/10"
                  : selected.priceValidityStatus === "invalid"
                    ? "border-danger/25 bg-danger/10"
                    : "border-warning/25 bg-warning/10",
              )}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-[12px] text-textMain">价格有效性</strong>
                  <span className={cn(
                    "rounded-md px-2 py-1 text-[10px] font-bold",
                    selected.priceValidityStatus === "valid"
                      ? "bg-success text-white"
                      : selected.priceValidityStatus === "invalid"
                        ? "bg-danger text-white"
                        : "bg-warning text-white",
                  )}>
                    {selected.priceValidityStatus === "valid" ? "有效价格" : selected.priceValidityStatus === "invalid" ? "解析异常" : "待补充口径"}
                  </span>
                </div>
                {selected.priceValidationReasons.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.priceValidationReasons.map((reason) => (
                      <span key={reason} className="rounded-md bg-white/80 px-2 py-1 text-[10px] text-textSecondary">
                        {priceValidationReasonLabels[reason] || reason}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-success">名称、规格、单位、币种和原文证据均已满足准入条件。</p>
                )}
              </section>
              {[
                ["线索类型", selected.type],
                ["采集来源", selected.source],
                ["来源网址", selected.sourceUrl],
                ["证据编号", selected.evidenceId],
                ["供应商", selected.supplier],
                ["地区", selected.region],
                ["价格月份", selected.priceMonth ? selected.priceMonth.slice(0, 7) : "待识别"],
                [
                  "识别价格",
                  selected.priceOriginalText || `${selected.currency} ${selected.price.toLocaleString()}`,
                ],
                ["币种 / 单位", `${selected.currency} / ${selected.originalUnit || "待识别"}`],
                ["匹配对象", selected.matchTarget],
                ["重复判断", selected.duplicateStatus],
                ["AI匹配度", `${selected.match}%`],
                ["建议可信度", `${selected.credibility}%`],
                ["风险等级", selected.risk],
                ["审核责任人", reviewers.find((item) => item.userId === selected.assignedReviewerId)?.displayName || "未分派"],
                ["审核时限", selected.reviewDueAt ? new Date(selected.reviewDueAt).toLocaleString("zh-CN", { hour12: false }) : "未设置"],
                ["采集时间", selected.collectedAt],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-borderSoft py-2 text-[13px]"
                >
                  <span className="text-textMuted">{label}</span>
                  <strong className="text-right text-textMain">{value}</strong>
                </div>
              ))}
              <section className="rounded-[10px] border border-borderSoft p-3">
                <strong className="text-[13px] text-textMain">价格原文片段</strong>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-[8px] bg-slate-50 p-2.5 text-[11px] leading-5 text-textSecondary">
                  {selected.priceContextExcerpt || "未保存数字附近的原文上下文，无法确认该数字是否为商品价格。"}
                </p>
              </section>
              <section className="rounded-[10px] border border-borderSoft p-3">
                <div className="flex items-center justify-between"><strong className="text-[13px] text-textMain">来源证据快照</strong><span className="text-[10px] font-bold text-primary">{leadDetailLoading ? "加载中" : `${leadDetail?.evidence.length || 0} 项`}</span></div>
                <div className="mt-2 space-y-2">
                  {leadDetail?.evidence.slice(0, 3).map((evidence) => (
                    <a key={evidence.id} href={evidence.sourceUrl || selected.sourceUrl} target="_blank" rel="noreferrer" className="block rounded-[8px] bg-slate-50 p-2.5 hover:bg-primary-soft">
                      <span className="block truncate text-[11px] font-bold text-textMain">{evidence.pageTitle || evidence.evidenceCode}</span>
                      <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-textMuted">{evidence.excerpt || "已保存来源网址、抓取时间和不可变快照载荷。"}</span>
                      <span className="mt-1 block text-[10px] text-primary">{evidence.mimeType || evidence.snapshotKind} · {evidence.capturedAt ? new Date(evidence.capturedAt).toLocaleString("zh-CN", { hour12: false }) : evidence.fetchedAt}</span>
                    </a>
                  ))}
                  {!leadDetailLoading && !leadDetail?.evidence.length ? <p className="rounded-[8px] bg-warning/10 p-2 text-[10px] text-warning">当前线索没有可读取的证据快照，审核前应补抓或人工保存来源证据。</p> : null}
                </div>
              </section>
              <section className="rounded-[10px] border border-borderSoft p-3">
                <div className="flex items-center justify-between"><strong className="text-[13px] text-textMain">历史价格对照</strong><span className="text-[10px] font-bold text-primary">{leadDetail?.historyMatches.length || 0} 条匹配</span></div>
                <div className="mt-2 space-y-2">
                  {leadDetail?.historyMatches.slice(0, 3).map((match) => (
                    <div key={match.recordId} className="flex items-center justify-between gap-3 rounded-[8px] bg-slate-50 p-2.5 text-[10px]">
                      <div className="min-w-0"><strong className="block truncate text-textMain">{match.recordName} · {match.recordCode}</strong><span className="mt-1 block text-textMuted">匹配 {match.matchScore.toFixed(0)}% · {match.recordedAt ? new Date(match.recordedAt).toLocaleDateString("zh-CN") : "--"}</span></div>
                      <div className="shrink-0 text-right"><strong className="block text-primary">{match.recordCurrency} {match.recordPrice.toLocaleString()}</strong><span className={cn("mt-1 block", (match.priceDeltaPct || 0) > 20 ? "text-danger" : "text-textMuted")}>{match.priceDeltaPct == null ? "无价差" : `${match.priceDeltaPct > 0 ? "+" : ""}${match.priceDeltaPct.toFixed(1)}%`}</span></div>
                    </div>
                  ))}
                  {!leadDetailLoading && !leadDetail?.historyMatches.length ? <p className="text-[10px] text-textMuted">暂无可比历史价格，当前价格需要更严格的人工判断。</p> : null}
                </div>
              </section>
              <section className="rounded-[12px] border border-ai/20 bg-ai-soft p-3 text-[12px] text-textSecondary">
                <strong className="text-ai">AI判断：</strong>
                {selected.priceValidityStatus === "invalid"
                  ? "该数字被识别为非商品价格或解析异常，不能确认、询价或进入价格线索池。"
                  : selected.priceValidityStatus === "needs_review"
                    ? "价格口径尚不完整。补齐规格、单位、币种或原文证据后，系统才会重新判断是否可比。"
                    : "该价格已通过字段准入，但仍需人工核验来源、含税运费条件与有效期。"}
              </section>
              {selected.status === "待线索池审核" ? (
                <section className="rounded-[12px] border border-warning/25 bg-warning/10 p-3 text-[12px] text-warning">
                  当前结果尚未通过人工评估。请核验来源网址、证据快照、规格、价格条件和重复记录后再确认。
                </section>
              ) : null}
              <label className="grid gap-1.5 text-[12px] font-bold text-textSecondary">
                人工审核意见
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  rows={3}
                  placeholder="记录来源核验、价格条件、重复判断或驳回原因"
                  className="resize-none rounded-[8px] border border-borderSoft p-3 text-[13px] font-normal outline-none focus:border-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.open(selected.sourceUrl, "_blank", "noopener,noreferrer");
                    toast.info("已打开来源网址", selected.sourceUrl);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-primary/20 text-[12px] font-bold text-primary"
                >
                  <Globe2 className="size-3.5" /> 核验来源
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/attachments?relatedObject=${encodeURIComponent(selected.evidenceId)}&returnTo=${encodeURIComponent("/ai-price-collection")}`,
                    )
                  }
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-primary/20 text-[12px] font-bold text-primary"
                >
                  <ExternalLink className="size-3.5" /> 查看证据
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openLeadPoolForReview([selected.code])}
                  className="h-10 rounded-md bg-primary text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  进入线索池审核
                </button>
                <button
                  type="button"
                  disabled={selected.priceValidityStatus !== "valid"}
                  onClick={() =>
                    router.push(`/inquiries/create?source=price-collection&leadId=${encodeURIComponent(selected.code)}&leadType=${encodeURIComponent(selected.type)}&leadName=${encodeURIComponent(selected.name)}&leadSpec=${encodeURIComponent(selected.spec)}&currency=${encodeURIComponent(selected.currency)}`)
                  }
                  className="h-10 rounded-md border border-ai/30 text-[13px] font-bold text-ai disabled:cursor-not-allowed disabled:opacity-40"
                >
                  创建询价
                </button>
              </div>
              <button
                type="button"
                onClick={() => setConfirmReject(true)}
                disabled={selected.status === "已入正式价格库"}
                className="h-9 w-full rounded-md border border-danger/20 text-[12px] font-bold text-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                驳回该结果
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </AppLayout>
  );
}

export default function AiPriceCollectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <AiPriceCollectionContent />
    </Suspense>
  );
}
