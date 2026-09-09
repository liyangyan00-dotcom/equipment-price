"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Bot,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  LibraryBig,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import {
  ActionMenu,
  ConfirmDialog,
  EmptyState,
  LoadingButton,
  ModuleHeader,
  RouteContextBanner,
} from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { downloadCsv } from "@/lib/downloadCsv";
import {
  equipmentKpis,
  type EquipmentPriceRecord,
} from "@/data/mock/equipmentPrices";
import { useMockToast } from "@/hooks/useMockToast";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  mapEquipmentPriceRow,
  type EquipmentPriceDatabaseRow,
} from "@/lib/data/priceInquiryMapper";
import type { PriceCondition, ReviewStatus, RiskLevel } from "@/types/common";

type Filters = {
  keyword: string;
  category: string;
  specification: string;
  supplier: string;
  sourceType: string;
  confidence: string;
  riskLevel: string;
  reviewStatus: string;
  validity: string;
  dateFrom: string;
  dateTo: string;
};

type QuickFilter = "all" | "confirmed" | "ai" | "review" | "risk" | "month";
type EquipmentSortKey =
  | "equipmentCode"
  | "equipmentName"
  | "brand"
  | "category"
  | "originalPrice"
  | "usdPrice"
  | "supplier"
  | "confidence"
  | "riskLevel"
  | "updatedAt";
type SortDirection = "asc" | "desc";
type SortState = {
  key: EquipmentSortKey | null;
  direction: SortDirection;
};

type EquipmentTableHeader = {
  label: string;
  sortKey?: EquipmentSortKey;
  align?: "left" | "right" | "center";
};

const defaultFilters: Filters = {
  keyword: "",
  category: "all",
  specification: "all",
  supplier: "all",
  sourceType: "all",
  confidence: "all",
  riskLevel: "all",
  reviewStatus: "all",
  validity: "all",
  dateFrom: "",
  dateTo: "",
};

const defaultSort: SortState = {
  key: null,
  direction: "asc",
};

const equipmentTableHeaders: EquipmentTableHeader[] = [
  { label: "设备编号", sortKey: "equipmentCode" },
  { label: "设备名称", sortKey: "equipmentName" },
  { label: "品牌", sortKey: "brand" },
  { label: "规格型号" },
  { label: "设备类别", sortKey: "category" },
  { label: "原始价格", sortKey: "originalPrice", align: "right" },
  { label: "折算美元价", sortKey: "usdPrice", align: "right" },
  { label: "币种" },
  { label: "价格条件" },
  { label: "供应商", sortKey: "supplier" },
  { label: "来源" },
  { label: "可信度", sortKey: "confidence" },
  { label: "审核状态" },
  { label: "风险等级", sortKey: "riskLevel" },
  { label: "更新时间", sortKey: "updatedAt" },
  { label: "操作", align: "center" },
];

const reviewLabel: Record<ReviewStatus, string> = {
  pending: "待审核",
  need_info: "需补充",
  confirmed: "已确认",
  rejected: "已退回",
  voided: "已作废",
};

const riskLabel: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};

const priceConditionLabel: Record<PriceCondition, string> = {
  EXW: "EXW",
  FOB: "FOB",
  CIF: "CIF",
  DDP: "DDP",
  SITE: "现场价",
  LOCAL_PICKUP: "自提",
  LOCAL_DELIVERY: "本地交付",
};

const kpiConfig = [
  {
    icon: Box,
    wrap: "from-blue-500 to-blue-600 shadow-blue-500/25",
    value: "text-blue-600",
    soft: "from-blue-50 to-white",
    border: "border-blue-100",
    wave: "text-blue-400",
  },
  {
    icon: CheckCircle2,
    wrap: "from-emerald-400 to-emerald-600 shadow-emerald-500/25",
    value: "text-emerald-600",
    soft: "from-emerald-50 to-white",
    border: "border-emerald-100",
    wave: "text-emerald-400",
  },
  {
    icon: Bot,
    wrap: "from-violet-500 to-purple-600 shadow-violet-500/25",
    value: "text-violet-600",
    soft: "from-violet-50 to-white",
    border: "border-violet-100",
    wave: "text-violet-400",
  },
  {
    icon: UserCheck,
    wrap: "from-amber-400 to-orange-500 shadow-orange-500/25",
    value: "text-orange-500",
    soft: "from-orange-50 to-white",
    border: "border-orange-100",
    wave: "text-orange-400",
  },
  {
    icon: ShieldAlert,
    wrap: "from-red-400 to-red-600 shadow-red-500/25",
    value: "text-red-500",
    soft: "from-red-50 to-white",
    border: "border-red-100",
    wave: "text-red-400",
  },
  {
    icon: BarChart3,
    wrap: "from-cyan-400 to-sky-500 shadow-cyan-500/25",
    value: "text-sky-500",
    soft: "from-cyan-50 to-white",
    border: "border-cyan-100",
    wave: "text-sky-400",
  },
] as const;

const confidenceData = [
  { name: "90-100分", label: "高可信", value: 678, percent: "54.0%", color: "#2F6BFF" },
  { name: "70-89分", label: "较可信", value: 286, percent: "22.8%", color: "#58C29A" },
  { name: "50-69分", label: "一般", value: 162, percent: "12.9%", color: "#F5B84B" },
  { name: "30-49分", label: "较低", value: 85, percent: "6.8%", color: "#7C3AED" },
  { name: "0-29分", label: "低可信", value: 43, percent: "3.5%", color: "#EF5A5A" },
];

const anomalyItems = [
  { code: "EQP-2026-0010", name: "鼓风机", price: "7,801 USD", reason: "高于市场均价 32%", date: "2026-05-19", level: "critical" as RiskLevel },
  { code: "EQP-2026-0008", name: "投加加药装置", price: "5,358 USD", reason: "高于市场均价 25%", date: "2026-05-20", level: "high" as RiskLevel },
  { code: "EQP-2026-0003", name: "电动蝶阀", price: "4,800 USD", reason: "低于市场均价 25%", date: "2026-05-16", level: "medium" as RiskLevel },
  { code: "EQP-2026-0006", name: "变频控制柜", price: "3,733 USD", reason: "高于市场均价 18%", date: "2026-05-17", level: "medium" as RiskLevel },
];

const inquiryTasks = [
  { supplier: "上海凯泉实业集团", equipment: "卧式离心泵", success: "92%", equipmentId: "EQ-001" },
  { supplier: "格兰富水泵（上海）", equipment: "潜水排污泵", success: "88%", equipmentId: "EQ-002" },
  { supplier: "正泰电气股份有限公司", equipment: "低压配电柜", success: "85%", equipmentId: "EQ-005" },
];

const pageSize = 10;
const kpiQuickFilters: QuickFilter[] = ["all", "confirmed", "ai", "review", "risk", "month"];

type EquipmentFacets = {
  categories: string[];
  specifications: string[];
  suppliers: string[];
  sourceTypes: string[];
};

type EquipmentSummary = {
  total: number;
  confirmed: number;
  aiRecommended: number;
  pending: number;
  highRisk: number;
  updatedThisMonth: number;
};

const emptyFacets: EquipmentFacets = {
  categories: [],
  specifications: [],
  suppliers: [],
  sourceTypes: [],
};

const emptySummary: EquipmentSummary = {
  total: 0,
  confirmed: 0,
  aiRecommended: 0,
  pending: 0,
  highRisk: 0,
  updatedThisMonth: 0,
};

function MiniWave({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-14", className)} viewBox="0 0 60 20" fill="none" aria-hidden="true">
      <path
        d="M2 14 C8 14 10 7 16 7 C22 7 23 15 30 15 C36 15 38 5 44 5 C50 5 51 12 58 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EquipmentKpiGrid({
  activeQuickFilter,
  summary,
  onKpiClick,
}: {
  activeQuickFilter: QuickFilter;
  summary: EquipmentSummary;
  onKpiClick: (filter: QuickFilter, label: string) => void;
}) {
  return (
    <div className="grid gap-2.5 2xl:grid-cols-6 xl:grid-cols-3 md:grid-cols-2">
      {equipmentKpis.map((item, index) => {
        const config = kpiConfig[index];
        const Icon = config.icon;
        const quickFilter = kpiQuickFilters[index] ?? "all";
        const active = activeQuickFilter === quickFilter;

        const values = [
          summary.total,
          summary.confirmed,
          summary.aiRecommended,
          summary.pending,
          summary.highRisk,
          summary.updatedThisMonth,
        ];
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onKpiClick(quickFilter, item.label)}
            className={cn(
              "min-h-[92px] rounded-[10px] border bg-gradient-to-br px-4 py-3 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              config.soft,
              config.border,
              active && "ring-2 ring-primary/20"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("truncate text-[13px] font-bold", config.value)}>{item.label}</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className={cn("text-[28px] font-bold leading-8", config.value)}>{values[index].toLocaleString("zh-CN")}</span>
                  <span className={cn("mb-1 whitespace-nowrap text-[12px] font-semibold", config.value)}>{item.unit}</span>
                </div>
              </div>
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br text-white shadow-lg", config.wrap)}>
                <Icon className="size-7" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-medium text-textMuted">{item.trend}</span>
              <MiniWave className={config.wave} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function uniqueOptions<T extends string>(values: T[]) {
  return Array.from(new Set(values)).map((value) => ({ label: value, value }));
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="min-w-[190px] flex-1">
      <span className="mb-1 block text-[12px] font-semibold text-textSecondary">{label}</span>
      <span className="flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-2.5 text-[13px] text-textSecondary shadow-sm">
        <Search className="size-4 shrink-0 text-textMuted" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-textMuted"
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-[116px] flex-1">
      <span className="mb-1 block text-[12px] font-semibold text-textSecondary">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-md border border-borderSoft bg-white px-2.5 pr-7 text-[13px] font-medium text-textSecondary shadow-sm outline-none transition focus:border-primary"
        >
          <option value="all">全部</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-textMuted" />
      </span>
    </label>
  );
}

function EquipmentFilterPanel({
  filters,
  facets,
  setFilters,
  onSubmit,
  onReset,
}: {
  filters: Filters;
  facets: EquipmentFacets;
  setFilters: (updater: (current: Filters) => Filters) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  const options = useMemo(
    () => ({
      categories: uniqueOptions(facets.categories),
      specifications: uniqueOptions(facets.specifications),
      suppliers: uniqueOptions(facets.suppliers),
      sourceTypes: uniqueOptions(facets.sourceTypes),
      confidence: [
        { label: "可信度 A", value: "A" },
        { label: "可信度 B", value: "B" },
        { label: "可信度 C", value: "C" },
        { label: "可信度 D/E", value: "DE" },
      ],
      risk: [
        { label: "低风险", value: "low" },
        { label: "中风险", value: "medium" },
        { label: "高风险", value: "high" },
        { label: "严重风险", value: "critical" },
      ],
      review: [
        { label: "已确认", value: "confirmed" },
        { label: "待审核", value: "pending" },
        { label: "需补充", value: "need_info" },
        { label: "已退回", value: "rejected" },
      ],
      validity: [
        { label: "30天内有效", value: "valid30" },
        { label: "需重新确认", value: "expired" },
      ],
    }),
    [facets]
  );

  const update = (key: keyof Filters, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));

  return (
    <form
      className="rounded-card border border-borderSoft bg-white p-3 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <FilterInput
          label="设备名 / 型号 / 品牌"
          value={filters.keyword}
          onChange={(value) => update("keyword", value)}
          placeholder="请输入关键词"
        />
        <FilterSelect label="设备类别" value={filters.category} options={options.categories} onChange={(value) => update("category", value)} />
        <FilterSelect label="规格型号" value={filters.specification} options={options.specifications} onChange={(value) => update("specification", value)} />
        <FilterSelect label="供应商" value={filters.supplier} options={options.suppliers} onChange={(value) => update("supplier", value)} />
        <FilterSelect label="来源类型" value={filters.sourceType} options={options.sourceTypes} onChange={(value) => update("sourceType", value)} />
        <FilterSelect label="可信度" value={filters.confidence} options={options.confidence} onChange={(value) => update("confidence", value)} />
        <FilterSelect label="风险等级" value={filters.riskLevel} options={options.risk} onChange={(value) => update("riskLevel", value)} />
        <FilterSelect label="审核状态" value={filters.reviewStatus} options={options.review} onChange={(value) => update("reviewStatus", value)} />
        <FilterSelect label="有效期" value={filters.validity} options={options.validity} onChange={(value) => update("validity", value)} />
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onReset} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm">
            <RotateCcw className="size-4" />
            重置
          </button>
          <button type="button" onClick={onSubmit} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm">
            <Search className="size-4" />
            查询
          </button>
        </div>
      </div>
    </form>
  );
}

function sourceBadgeClass(sourceType: EquipmentPriceRecord["sourceType"]) {
  if (sourceType === "AI采集") return "bg-ai-soft text-ai border-ai-border";
  if (sourceType === "历史成交") return "bg-primary-soft text-primary border-primary/20";
  if (sourceType === "邮件报价") return "bg-cyan-50 text-cyan-700 border-cyan-100";
  return "bg-blue-50 text-blue-700 border-blue-100";
}

function conditionClass(condition: PriceCondition) {
  if (condition === "CIF" || condition === "DDP") return "bg-success-soft text-success border-success/20";
  if (condition === "FOB" || condition === "EXW") return "bg-warning-soft text-warning border-warning/20";
  return "bg-primary-soft text-primary border-primary/20";
}

function EquipmentActionBar({
  total,
  selectedCount,
  allVisibleSelected,
  onToggleVisible,
  onUpload,
  onExport,
  onAiComplete,
  aiRunning,
  onCreate,
  onAiInquiry,
  onMore,
}: {
  total: number;
  selectedCount: number;
  allVisibleSelected: boolean;
  onToggleVisible: () => void;
  onUpload: () => void;
  onExport: () => void;
  onAiComplete: () => void;
  aiRunning: boolean;
  onCreate: () => void;
  onAiInquiry: () => void;
  onMore: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-borderSoft bg-white px-3 py-2 shadow-card">
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-textSecondary">
        <span className="font-semibold text-textMain">共 {total.toLocaleString("zh-CN")} 条</span>
        <span>已选择 <b className="text-primary">{selectedCount}</b> 项</span>
        <button type="button" onClick={onToggleVisible} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-2.5 font-semibold text-primary">
          <ClipboardCheck className="size-3.5" />
          {allVisibleSelected ? "取消本页" : "全选本页"}
        </button>
      </div>
      <div className="flex flex-nowrap gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={onCreate} className="inline-flex h-9 min-w-[110px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-primary bg-primary px-3 text-[12px] font-semibold text-white shadow-sm">
          <Plus className="size-4" />
          新增设备价格
        </button>
        <button type="button" onClick={onUpload} className="inline-flex h-9 min-w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-primary/20 bg-white px-3 text-[12px] font-semibold text-primary shadow-sm">
          <Upload className="size-4" />
          上传报价
        </button>
        <LoadingButton loading={aiRunning} tone="ai" onClick={onAiComplete} icon={<Sparkles className="size-4" />} className="h-9 min-w-[110px] shrink-0 px-3 text-[12px]">
          AI补全参数
        </LoadingButton>
        <button type="button" onClick={onAiInquiry} className="inline-flex h-9 min-w-[112px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-warning/30 bg-warning-soft px-3 text-[12px] font-semibold text-[#C2410C] shadow-sm">
          <Bot className="size-4" />
          AI推荐询价
        </button>
        <button type="button" onClick={onExport} className="inline-flex h-9 min-w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-primary/20 bg-white px-3 text-[12px] font-semibold text-primary shadow-sm">
          <Download className="size-4" />
          导出价格表
        </button>
        <button type="button" onClick={onMore} className="inline-flex h-9 min-w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary shadow-sm">
          <MoreHorizontal className="size-4" />
          更多操作
        </button>
      </div>
    </section>
  );
}

function EquipmentTableCard({
  records,
  total,
  page,
  pageCount,
  selectedIds,
  activeId,
  sort,
  onPageChange,
  onToggleRow,
  onActivateRow,
  onSort,
  onEdit,
  onMore,
}: {
  records: EquipmentPriceRecord[];
  total: number;
  page: number;
  pageCount: number;
  selectedIds: string[];
  activeId?: string;
  sort: SortState;
  onPageChange: (page: number) => void;
  onToggleRow: (id: string) => void;
  onActivateRow: (id: string) => void;
  onSort: (key: EquipmentSortKey) => void;
  onEdit: (row: EquipmentPriceRecord) => void;
  onMore: (
    row: EquipmentPriceRecord,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader
          icon={Database}
          title="设备价格明细"
          subtitle="价格、来源、可信度与风险状态统一校验"
          density="compact"
          action={<AiBadge label="AI推荐已启用" className="h-6" />}
        />
      </div>
      {records.length === 0 ? (
        <EmptyState
          title="没有匹配的设备价格"
          description="请调整筛选条件，或重置后查看正式设备价格数据。"
          className="border-0 shadow-none"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1420px] border-collapse text-[12px] text-[#334155]">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                <th className="h-9 w-10 border-b border-borderSoft px-2 text-center">
                  <span className="sr-only">选择</span>
                </th>
                {equipmentTableHeaders.map((header) => {
                  const activeSort = header.sortKey && sort.key === header.sortKey;
                  const ariaSort = activeSort
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : header.sortKey
                      ? "none"
                      : undefined;
                  const SortIcon = activeSort
                    ? sort.direction === "asc"
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;
                  return (
                  <th
                    key={header.label}
                    aria-sort={ariaSort}
                    className={cn(
                      "h-9 whitespace-nowrap border-b border-borderSoft px-2 text-left text-[12px] font-bold text-textSecondary",
                      header.align === "right" && "text-right",
                      header.align === "center" && "text-center"
                    )}
                  >
                    {header.sortKey ? (
                      <button
                        type="button"
                        onClick={() => onSort(header.sortKey!)}
                        className={cn(
                          "inline-flex w-full items-center gap-1 rounded-sm outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/30",
                          header.align === "right" && "justify-end"
                        )}
                        aria-label={`按${header.label}${activeSort && sort.direction === "asc" ? "降序" : "升序"}排列`}
                      >
                        {header.label}
                        <SortIcon
                          className={cn("size-3.5", activeSort ? "text-primary" : "text-textMuted")}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      header.label
                    )}
                  </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {records.map((row) => {
                const selected = selectedIds.includes(row.id);
                const active = activeId === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onActivateRow(row.id)}
                    onKeyDown={(event) => {
                      if (event.currentTarget !== event.target) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onActivateRow(row.id);
                      }
                    }}
                    tabIndex={0}
                    aria-current={active ? "true" : undefined}
                    aria-selected={selected}
                    className={cn(
                      "h-10 cursor-pointer border-b border-borderSoft outline-none transition last:border-0 hover:bg-[var(--color-muted-soft)] focus-visible:bg-primary-soft/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30",
                      active && "bg-primary-soft/60"
                    )}
                  >
                    <td className="px-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          event.stopPropagation();
                          onToggleRow(row.id);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`选择 ${row.equipmentName}`}
                        className="size-4 rounded border-borderSoft text-primary"
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 font-semibold text-primary">{row.equipmentCode}</td>
                    <td className="max-w-[120px] px-2">
                      <div className="truncate font-bold text-textMain" title={row.equipmentName}>
                        {row.equipmentName}
                      </div>
                      <div className="truncate text-[11px] text-textMuted" title={row.aiSuggestion}>
                        {row.aiSuggestion}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2">{row.brand}</td>
                    <td className="max-w-[132px] px-2">
                      <span className="block truncate" title={row.specification}>
                        {row.specification}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2">{row.category}</td>
                    <td className="whitespace-nowrap px-2 text-right font-semibold tabular-nums text-textMain">
                      {row.originalPrice.toLocaleString("zh-CN")}
                    </td>
                    <td className="whitespace-nowrap px-2 text-right font-semibold tabular-nums text-textMain">
                      {row.usdPrice.toLocaleString("zh-CN")}
                    </td>
                    <td className="whitespace-nowrap px-2">{row.currency}</td>
                    <td className="whitespace-nowrap px-2">
                      <span className={cn("inline-flex h-5 items-center rounded-pill border px-2 text-[11px] font-semibold", conditionClass(row.priceCondition))}>
                        {priceConditionLabel[row.priceCondition] ?? row.priceCondition}
                      </span>
                    </td>
                    <td className="max-w-[142px] px-2">
                      <span className="block truncate" title={row.supplier}>
                        {row.supplier}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <span className={cn("inline-flex h-5 items-center rounded-pill border px-2 text-[11px] font-semibold", sourceBadgeClass(row.sourceType))}>
                        {row.sourceType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <div className="flex items-center gap-1">
                        <ConfidenceBadge level={row.confidence} showPrefix={false} className="h-5 px-1.5 text-[11px]" />
                        {row.aiRecommended ? <AiBadge label="AI" className="h-5 px-1.5 text-[10px]" /> : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <StatusBadge status={row.reviewStatus} label={reviewLabel[row.reviewStatus]} className="h-5 px-1.5 text-[11px]" />
                    </td>
                    <td className="whitespace-nowrap px-2">
                      <RiskBadge level={row.riskLevel} className="h-5 px-1.5 text-[11px]" />
                    </td>
                    <td className="whitespace-nowrap px-2 text-textMuted">{formatDate(row.updatedAt)}</td>
                    <td className="px-2">
                      <div className="flex items-center justify-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                        <Link href={`/equipment-prices/${row.id}`} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-white px-2 text-[11px] font-semibold text-primary">
                          <Eye className="size-3.5" />
                          查看
                        </Link>
                        <button type="button" onClick={() => onEdit(row)} className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[11px] font-semibold text-textSecondary">
                          <Edit3 className="size-3.5" />
                          编辑
                        </button>
                        <Link href={`/equipment-prices/ai-recommendation?equipmentId=${row.id}`} className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-2 text-[11px] font-semibold text-ai">
                          <Bot className="size-3.5" />
                          AI推荐
                        </Link>
                        {row.reviewStatus === "pending" || row.reviewStatus === "need_info" ? (
                          <Link
                            href={`/equipment-prices/reviews?priceId=${encodeURIComponent(row.id)}`}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-warning/25 bg-warning-soft px-2 text-[11px] font-semibold text-warning"
                          >
                            <ClipboardCheck className="size-3.5" />
                            审核
                          </Link>
                        ) : null}
                        <Link href={`/inquiries/create?equipmentIds=${row.id}`} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-[11px] font-semibold text-primary">
                          <FilePlus2 className="size-3.5" />
                          询价
                        </Link>
                        <button
                          type="button"
                          onClick={(event) => onMore(row, event)}
                          aria-label={`更多操作：${row.equipmentName}`}
                          className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary"
                        >
                          <MoreHorizontal className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borderSoft px-3 py-2 text-[12px] text-textSecondary">
        <span>
          共 <b className="text-textMain">{total.toLocaleString("zh-CN")}</b> 条，当前第 {page} / {pageCount} 页
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white disabled:opacity-40"
            aria-label="上一页"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: pageCount }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md border text-[12px] font-semibold",
                  pageNumber === page ? "border-primary bg-primary text-white" : "border-borderSoft bg-white text-textSecondary"
                )}
                aria-label={`第 ${pageNumber} 页`}
                aria-current={pageNumber === page ? "page" : undefined}
              >
                {pageNumber}
              </button>
            );
          })}
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white disabled:opacity-40"
            aria-label="下一页"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function RightAiCard({
  title,
  subtitle,
  children,
  action,
  tone = "ai",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "ai" | "risk" | "success";
}) {
  const toneClass = {
    ai: "bg-ai-soft text-ai border-ai-border",
    risk: "bg-danger-soft text-danger border-danger/20",
    success: "bg-success-soft text-success border-success/20",
  };

  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] border", toneClass[tone])}>
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-bold text-textMain">{title}</h3>
            {subtitle ? <p className="mt-0.5 truncate text-[12px] text-textMuted">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EquipmentAiColumn({
  active,
  onAiComplete,
  onViewSimilar,
}: {
  active: EquipmentPriceRecord;
  onAiComplete: () => void;
  onViewSimilar: () => void;
}) {
  const isHighRisk = active.riskLevel === "high" || active.riskLevel === "critical";
  const similarPrice = Math.max(active.usdPrice * (isHighRisk ? 0.82 : 0.94), 320).toFixed(0);

  return (
    <aside className="space-y-2">
      <RightAiCard
        title="AI设备价格决策助手"
        subtitle={`当前选中：${active.equipmentName}`}
        action={<AiBadge label="AI洞察" className="h-6" />}
      >
        <div className="rounded-lg border border-ai-border bg-gradient-to-br from-ai-soft to-white p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-ai">AI判断</span>
            <ConfidenceBadge level={active.confidence} className="h-5 px-1.5 text-[11px]" />
          </div>
          <p className="mt-1.5 text-[12px] leading-5 text-textSecondary">
            {active.aiSuggestion}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md bg-white px-2 py-1">
              <span className="text-textMuted">影响对象</span>
              <div className="mt-0.5 truncate font-semibold text-textMain">{active.specification}</div>
            </div>
            <div className="rounded-md bg-white px-2 py-1">
              <span className="text-textMuted">建议动作</span>
              <div className="mt-0.5 truncate font-semibold text-ai">{isHighRisk ? "人工复核" : "纳入推荐价"}</div>
            </div>
          </div>
        </div>
      </RightAiCard>

      <RightAiCard
        title="AI参数补全建议"
        subtitle="缺失参数不得直接进入比价"
        action={<button type="button" onClick={onAiComplete} className="text-[12px] font-semibold text-ai">补全参数</button>}
      >
        <div className="space-y-2 rounded-lg border border-borderSoft bg-[var(--color-bg-muted)] px-2.5 py-2">
          <p className="text-[12px] leading-5 text-textSecondary">
            {active.equipmentName} 建议补全执行标准、交货周期、质保期与安装边界，避免报价条件不可比。
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["执行标准", "质保期", "交货周期", "安装边界"].map((tag) => (
              <span key={tag} className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-textSecondary">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </RightAiCard>

      <RightAiCard
        title="AI相似价格匹配"
        subtitle="基于规格、品牌和历史成交"
        action={<button type="button" onClick={onViewSimilar} className="text-[12px] font-semibold text-primary">查看相似</button>}
      >
        <div className="rounded-lg border border-borderSoft bg-white px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-[13px] font-bold text-primary">{active.equipmentCode} {active.equipmentName}</div>
            <span className="shrink-0 rounded-md bg-success-soft px-1.5 py-0.5 text-[11px] font-semibold text-success">匹配度 92%</span>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_74px_64px] gap-2 text-[11px] font-semibold text-textSecondary">
            <span>历史样本</span>
            <span className="text-right">价格</span>
            <span className="text-right">偏差</span>
          </div>
          {[
            ["历史成交记录", `$${similarPrice}`, "-8.6%"],
            ["供应商报价库", `$${active.usdPrice.toLocaleString("zh-CN")}`, "当前"],
            ["AI推荐价格", `$${Math.round(active.usdPrice * 0.96).toLocaleString("zh-CN")}`, "-4.0%"],
          ].map((row) => (
            <div key={row[0]} className="mt-1 grid grid-cols-[1fr_74px_64px] gap-2 text-[11px] text-textSecondary">
              <span className="truncate">{row[0]}</span>
              <span className="text-right tabular-nums">{row[1]}</span>
              <span className="text-right text-success">{row[2]}</span>
            </div>
          ))}
        </div>
      </RightAiCard>

      <RightAiCard
        title={isHighRisk ? "高风险设备提醒" : "推荐询价任务"}
        subtitle={isHighRisk ? riskLabel[active.riskLevel] : "优先补充供应商报价"}
        tone={isHighRisk ? "risk" : "success"}
        action={<RiskBadge level={active.riskLevel} className="h-5 px-1.5 text-[11px]" />}
      >
        <div className={cn("rounded-lg border px-2.5 py-2", isHighRisk ? "border-danger/20 bg-danger-soft" : "border-success/20 bg-success-soft")}>
          <p className="text-[12px] leading-5 text-textSecondary">
            {isHighRisk
              ? `当前报价可能存在异常波动，建议先对 ${active.supplier} 的报价来源与价格条件进行人工复核。`
              : `建议针对 ${active.equipmentName} 发起 3 家供应商询价，补齐当前价格库覆盖。`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/inquiries/create?equipmentIds=${active.id}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-white">
              创建询价 <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href={`/equipment-prices/reviews?priceId=${encodeURIComponent(active.id)}`}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[11px] font-semibold text-textSecondary transition hover:border-warning/35 hover:bg-warning-soft hover:text-warning"
              title={`进入 ${active.equipmentName} 的人工审核工作区`}
            >
              人工复核
            </Link>
          </div>
        </div>
      </RightAiCard>
    </aside>
  );
}

function ConfidenceDistributionCard({
  onSelectConfidence,
  onShowDetails,
}: {
  onSelectConfidence: (value: string, label: string) => void;
  onShowDetails: () => void;
}) {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-textMain">AI来源可信度评分分布</h3>
          <p className="text-[11px] text-textMuted">历史表现、证据完整度与供应商稳定性</p>
        </div>
        <button type="button" onClick={onShowDetails} className="text-[11px] font-semibold text-primary">查看详情</button>
      </div>
      <div className="grid grid-cols-[132px_1fr] items-center gap-3">
        <div className="relative flex h-[128px] items-center justify-center">
          <PieChart width={128} height={128}>
            <Pie data={confidenceData} dataKey="value" innerRadius={40} outerRadius={58} paddingAngle={1} stroke="#fff" strokeWidth={2}>
              {confidenceData.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[18px] font-bold text-textMain">1,254</span>
            <span className="text-[11px] font-medium text-textMuted">总数</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {confidenceData.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelectConfidence(index === 3 || index === 4 ? "DE" : ["A", "B", "C"][index], item.name)}
              className="grid w-full grid-cols-[12px_62px_1fr_70px] items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[11px] transition hover:bg-primary-soft"
            >
              <span className="size-2.5 rounded-sm" style={{ background: item.color }} />
              <span className="font-medium text-textSecondary">{item.name}</span>
              <span className="text-textMuted">{item.label}</span>
              <span className="text-right tabular-nums text-textSecondary">{item.value} ({item.percent})</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 rounded-md bg-primary-soft px-2 py-1.5 text-[11px] leading-5 text-primary">
        AI结论：A/B级来源占比 76.8%，高风险报价集中在过期邮件与参数缺失记录。
      </p>
    </section>
  );
}

function AnomalyWarningCard({ onFilterRisk }: { onFilterRisk: () => void }) {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-textMain">AI异常价格预警<span className="ml-1 text-[11px] text-textMuted">近30天</span></h3>
          <p className="text-[11px] text-textMuted">对比历史均价与同规格供应商报价</p>
        </div>
        <button type="button" onClick={onFilterRisk} className="text-[11px] font-semibold text-primary">筛选风险</button>
      </div>
      <div className="space-y-2">
        {anomalyItems.map((item) => (
          <button key={item.code} type="button" onClick={onFilterRisk} className="grid w-full grid-cols-[18px_1fr_82px_1fr] items-center gap-2 rounded-md text-left text-[11px] transition hover:bg-danger-soft/60">
            <span className={cn("flex size-4 items-center justify-center rounded-full text-[10px] text-white", item.level === "critical" ? "bg-danger" : "bg-warning")}>!</span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-textMain">{item.code} {item.name}</div>
              <div className="text-textMuted">{item.date}</div>
            </div>
            <div className="text-right text-textSecondary">{item.price}</div>
            <div className={cn("text-right font-semibold", item.level === "critical" ? "text-danger" : "text-warning")}>{item.reason}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function InquiryTaskCard({ onShowAll }: { onShowAll: () => void }) {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-textMain">AI推荐询价任务</h3>
          <p className="text-[11px] text-textMuted">按相似价格缺口生成询价建议</p>
        </div>
        <button type="button" onClick={onShowAll} className="text-right text-[11px] font-semibold text-primary">
          待处理 5 条
        </button>
      </div>
      <div className="space-y-1.5">
        {inquiryTasks.map((item) => (
          <div key={item.supplier} className="grid grid-cols-[1fr_1fr_54px_68px] items-center gap-2 rounded-lg border border-borderSoft px-2.5 py-1.5 text-[11px]">
            <span className="truncate">推荐：{item.supplier}</span>
            <span className="truncate">匹配设备：{item.equipment}</span>
            <span className="text-right font-semibold text-success">{item.success}</span>
            <Link href={`/inquiries/create?equipmentIds=${item.equipmentId}`} className="inline-flex h-6 items-center justify-center rounded-md border border-primary/20 bg-primary-soft text-[11px] font-semibold text-primary">
              去询价
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

const filterParamMap: Array<[keyof Filters, string]> = [
  ["keyword", "keyword"],
  ["category", "category"],
  ["specification", "specification"],
  ["supplier", "supplier"],
  ["sourceType", "sourceType"],
  ["confidence", "confidence"],
  ["riskLevel", "riskLevel"],
  ["reviewStatus", "reviewStatus"],
  ["validity", "validity"],
  ["dateFrom", "dateFrom"],
  ["dateTo", "dateTo"],
];

function isQuickFilter(value: string | null): value is QuickFilter {
  return ["all", "confirmed", "ai", "review", "risk", "month"].includes(value ?? "");
}

function isEquipmentSortKey(value: string | null): value is EquipmentSortKey {
  return equipmentTableHeaders.some((header) => header.sortKey === value);
}

export default function EquipmentPricesPage() {
  const router = useRouter();
  const toast = useMockToast();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(defaultSort);
  const [urlReady, setUrlReady] = useState(false);
  const [voidTarget, setVoidTarget] = useState<EquipmentPriceRecord | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [actionMenu, setActionMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    scope: "bulk" | "row";
    rowId?: string;
  }>({ open: false, x: 0, y: 0, scope: "bulk" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [equipmentData, setEquipmentData] = useState<EquipmentPriceRecord[]>([]);
  const [equipmentFacets, setEquipmentFacets] = useState<EquipmentFacets>(emptyFacets);
  const [equipmentSummary, setEquipmentSummary] = useState<EquipmentSummary>(emptySummary);
  const [canVoidEquipment, setCanVoidEquipment] = useState(false);
  const [equipmentTotal, setEquipmentTotal] = useState(0);
  const [equipmentPageCount, setEquipmentPageCount] = useState(1);
  const [equipmentLoading, setEquipmentLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const restoredFilters = { ...defaultFilters };
      filterParamMap.forEach(([key, param]) => {
        const value = params.get(param);
        if (value) restoredFilters[key] = value;
      });
      restoredFilters.riskLevel = params.get("risk") || restoredFilters.riskLevel;
      const restoredQuickFilter = params.get("quick");
      const restoredPage = Number(params.get("page"));
      const restoredActiveId = params.get("active");
      const restoredSortKey = params.get("sort");
      const restoredDirection = params.get("direction");

      setFilters(restoredFilters);
      setAppliedFilters(restoredFilters);
      if (isQuickFilter(restoredQuickFilter)) setQuickFilter(restoredQuickFilter);
      if (Number.isInteger(restoredPage) && restoredPage > 0) setPage(restoredPage);
      if (restoredActiveId) setActiveId(restoredActiveId);
      if (isEquipmentSortKey(restoredSortKey)) {
        setSort({
          key: restoredSortKey,
          direction: restoredDirection === "desc" ? "desc" : "asc",
        });
      }
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadEquipmentPrices = useCallback(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    filterParamMap.forEach(([key, param]) => {
      const value = appliedFilters[key];
      if (value && value !== defaultFilters[key]) params.set(param, value);
    });
    if (quickFilter !== "all") params.set("quick", quickFilter);
    if (sort.key) {
      params.set("sort", sort.key);
      params.set("direction", sort.direction);
    }
    queueMicrotask(() => {
      if (active) setEquipmentLoading(true);
    });
    void fetch(`/api/equipment-prices?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Supabase equipment query failed");
        return response.json() as Promise<{
          data: EquipmentPriceDatabaseRow[];
          pagination: { page: number; pageSize: number; total: number; pageCount: number };
          facets?: EquipmentFacets;
          summary?: EquipmentSummary;
          permissions?: { canVoid?: boolean };
        }>;
      })
      .then(({ data, pagination, facets, summary, permissions }) => {
        if (!active) return;
        const mapped = data.map((row) => mapEquipmentPriceRow(row));
        setEquipmentData(mapped);
        setEquipmentTotal(pagination.total);
        setEquipmentPageCount(pagination.pageCount);
        if (facets) setEquipmentFacets(facets);
        if (summary) setEquipmentSummary(summary);
        setCanVoidEquipment(Boolean(permissions?.canVoid));
        setActiveId((current) =>
          mapped.some((record) => record.id === current)
            ? current
            : mapped[0]?.id,
        );
      })
      .catch(() => {
        if (active) {
          setEquipmentData([]);
          setEquipmentTotal(0);
          setEquipmentPageCount(1);
          toast.danger("设备价格加载失败", "未使用 Mock 数据覆盖数据库，请稍后重试。");
        }
      })
      .finally(() => {
        if (active) setEquipmentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedFilters, page, quickFilter, sort, toast]);

  useEffect(() => {
    const cancelInitial = loadEquipmentPrices();
    const refresh = () => {
      loadEquipmentPrices();
    };
    window.addEventListener("focus", refresh);
    return () => {
      cancelInitial();
      window.removeEventListener("focus", refresh);
    };
  }, [loadEquipmentPrices]);

  const currentPage = Math.min(page, equipmentPageCount);
  const pagedRecords = equipmentData;
  const activeRecord =
    equipmentData.find((row) => row.id === activeId) ?? pagedRecords[0];
  const effectiveActiveId = activeRecord?.id;
  const visibleIds = pagedRecords.map((row) => row.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const exportEquipmentPrices = () => {
    downloadCsv(
      `设备价格表-${new Date().toISOString().slice(0, 10)}`,
      ["价格编码", "设备名称", "品牌", "规格", "类别", "单位", "原币价格", "币种", "美元价格", "供应商", "价格来源", "审核状态", "可信度", "风险等级", "更新时间"],
      equipmentData.map((record) => [
        record.equipmentCode, record.equipmentName, record.brand, record.specification,
        record.category, record.unit, record.originalPrice, record.currency, record.usdPrice,
        record.supplier, record.priceSource, record.reviewStatus, record.confidence,
        record.riskLevel, record.updatedAt,
      ]),
    );
    toast.success("导出完成", `已导出 ${equipmentData.length} 条当前查询结果。`);
  };

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    filterParamMap.forEach(([key, param]) => {
      const value = appliedFilters[key];
      if (value && value !== defaultFilters[key]) params.set(param, value);
    });
    if (quickFilter !== "all") params.set("quick", quickFilter);
    if (currentPage > 1) params.set("page", String(currentPage));
    if (effectiveActiveId) params.set("active", effectiveActiveId);
    if (sort.key) {
      params.set("sort", sort.key);
      params.set("direction", sort.direction);
    }

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [appliedFilters, currentPage, effectiveActiveId, quickFilter, sort, urlReady]);

  const handleSort = (key: EquipmentSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  const submitFilters = () => {
    setQuickFilter("all");
    setAppliedFilters(filters);
    setPage(1);
    setSelectedIds([]);
    toast.info("筛选已应用", "设备价格表已按当前条件更新。");
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setQuickFilter("all");
    setSelectedIds([]);
    setPage(1);
    toast.info("筛选已重置", "已恢复全部设备价格记录。");
  };

  const toggleRow = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setActiveId(id);
  };

  const toggleVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const requireSelection = (action: string) => {
    if (selectedIds.length === 0) {
      toast.warning("请先选择设备价格", `${action}需要至少选择一条设备价格记录。`);
      return false;
    }

    return true;
  };

  const handleAiComplete = (fallbackId?: string) => {
    const targetIds = selectedIds.length > 0 ? selectedIds : fallbackId ? [fallbackId] : [];
    if (targetIds.length === 0) {
      toast.warning("请先选择设备价格", "AI参数补全需要至少选择一条设备价格记录。");
      return;
    }

    if (fallbackId && selectedIds.length === 0) {
      setSelectedIds([fallbackId]);
    }

    router.push(
      `/equipment-prices/ai-recommendation?equipmentIds=${encodeURIComponent(
        targetIds.join(",")
      )}&action=complete-parameters`
    );
  };

  const handleAiInquiry = () => {
    if (!requireSelection("AI推荐询价")) return;
    router.push(`/inquiries/create?equipmentIds=${selectedIds.join(",")}`);
  };

  const handleRiskFilter = () => {
    const nextFilters = {
      ...defaultFilters,
      riskLevel: "high",
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setQuickFilter("all");
    setSelectedIds([]);
    setPage(1);
    toast.warning("已筛选高风险设备价格", "表格仅展示需要重点复核的设备价格。");
  };

  const handleKpiClick = (filter: QuickFilter, label: string) => {
    setQuickFilter(filter);
    setAppliedFilters(defaultFilters);
    setFilters(defaultFilters);
    setSelectedIds([]);
    setPage(1);
    toast.info(`${label}快捷筛选`, filter === "all" ? "已展示全部设备价格记录。" : "表格已按对应运营指标更新。");
  };

  const handleConfidenceFilter = (value: string, label: string) => {
    const nextFilters = {
      ...defaultFilters,
      confidence: value,
    };
    setQuickFilter("all");
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSelectedIds([]);
    setPage(1);
    toast.info("可信度筛选已应用", `正在查看 ${label} 的设备价格来源。`);
  };

  const submitReviewRequests = async (ids: string[]) => {
    if (!ids.length || reviewSubmitting) {
      if (!ids.length) {
        toast.warning("请先选择设备价格", "提交人工复核需要至少选择一条记录。");
      }
      return;
    }

    setReviewSubmitting(true);
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const response = await fetch(
          `/api/equipment-prices/${encodeURIComponent(id)}/workflow`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request_review" }),
          }
        );
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error || "提交复核失败");
      })
    );
    const succeeded = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - succeeded;
    setReviewSubmitting(false);
    if (succeeded) {
      toast.success(
        "已提交人工复核",
        `${succeeded} 条设备价格已进入审核队列${failed ? `，${failed} 条未提交` : ""}。`
      );
      setSelectedIds([]);
      loadEquipmentPrices();
    } else {
      toast.danger("提交复核失败", "所选记录均未能进入审核队列，请稍后重试。");
    }
  };

  const voidEquipmentPrice = async () => {
    if (!voidTarget || voiding) return;
    if (voidReason.trim().length < 4) {
      toast.warning("请补充作废原因", "作废原因至少需要 4 个字，并将写入审计记录。");
      return;
    }
    setVoiding(true);
    try {
      const response = await fetch(
        `/api/equipment-prices/${encodeURIComponent(voidTarget.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: voidReason.trim() }),
        }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "设备价格作废失败");
      toast.success("设备价格已作废", `${voidTarget.equipmentCode} 已从有效价格库移除。`);
      setSelectedIds((current) => current.filter((id) => id !== voidTarget.id));
      setVoidTarget(null);
      setVoidReason("");
      loadEquipmentPrices();
    } catch (error) {
      toast.danger("作废失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setVoiding(false);
    }
  };

  const menuRow = actionMenu.rowId
    ? equipmentData.find((row) => row.id === actionMenu.rowId)
    : undefined;
  const actionMenuItems =
    actionMenu.scope === "row" && menuRow
      ? [
          {
            label: "查看证据链",
            description: `打开 ${menuRow.equipmentName} 的关联附件`,
            tone: "blue" as const,
            onClick: () =>
              router.push(
                `/attachments?relatedObject=${encodeURIComponent(menuRow.equipmentCode)}`
              ),
          },
          {
            label: "提交人工复核",
            description: "写入审核队列，由审核角色给出最终结论",
            tone: "orange" as const,
            onClick: () => void submitReviewRequests([menuRow.id]),
          },
          {
            label: "查看 AI 推荐",
            description: "查看相似价格、推荐供应商和采用建议",
            tone: "purple" as const,
            onClick: () =>
              router.push(
                `/equipment-prices/ai-recommendation?equipmentId=${encodeURIComponent(menuRow.id)}`
              ),
          },
          ...(canVoidEquipment
            ? [
                {
                  label: "作废设备价格",
                  description: "保留审计记录并从有效价格库移除",
                  tone: "red" as const,
                  onClick: () => {
                    setVoidTarget(menuRow);
                    setVoidReason("");
                  },
                },
              ]
            : []),
        ]
      : [
          {
            label: "批量提交人工复核",
            description: "将已选价格写入设备价格审核队列",
            tone: "orange" as const,
            onClick: () => void submitReviewRequests(selectedIds),
          },
          {
            label: "打开审核中心",
            description: "查看待审核、待补充和高风险任务",
            tone: "purple" as const,
            onClick: () =>
              router.push(
                selectedIds[0]
                  ? `/equipment-prices/reviews?priceId=${encodeURIComponent(selectedIds[0])}`
                  : "/equipment-prices/reviews"
              ),
          },
          {
            label: "清空当前选择",
            description: `取消已选择的 ${selectedIds.length} 条设备价格`,
            tone: "blue" as const,
            onClick: () => setSelectedIds([]),
          },
        ];

  return (
    <AppLayout>
      <div className="min-w-0 space-y-3 overflow-x-clip" data-no-global-interaction>
        <PageHeader
          title="设备价格库"
          description="集中管理水厂机电设备价格、报价来源、供应商、可信度和风险状态。"
          actions={
            <>
              <Link
                href="/equipment-catalog"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[13px] font-semibold text-primary shadow-sm transition hover:border-primary/40"
              >
                <LibraryBig className="size-4" aria-hidden="true" />
                设备资料库
              </Link>
              <Link
                href="/equipment-prices/import"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm transition hover:border-primary/30 hover:text-primary"
              >
                <Upload className="size-4" aria-hidden="true" />
                导入报价
              </Link>
              <Link
                href="/equipment-prices/ai-recommendation"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm transition hover:border-ai/40"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                AI推荐
              </Link>
              <Link
                href="/equipment-prices/reviews"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-warning/25 bg-warning-soft px-3 text-[13px] font-semibold text-warning shadow-sm transition hover:border-warning/40"
              >
                <ClipboardCheck className="size-4" aria-hidden="true" />
                价格审核
              </Link>
              <Link
                href="/equipment-prices/create"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90"
              >
                <Plus className="size-4" aria-hidden="true" />
                新增设备价格
              </Link>
            </>
          }
        />

        <RouteContextBanner title="已带入统计分析范围" />

        <EquipmentKpiGrid
          activeQuickFilter={quickFilter}
          summary={equipmentSummary}
          onKpiClick={handleKpiClick}
        />
        <EquipmentFilterPanel
          filters={filters}
          facets={equipmentFacets}
          setFilters={setFilters}
          onSubmit={submitFilters}
          onReset={resetFilters}
        />

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,9fr)_minmax(320px,3fr)]">
          <div className="min-w-0 space-y-2">
            <EquipmentActionBar
              total={equipmentTotal}
              selectedCount={selectedIds.length}
              allVisibleSelected={allVisibleSelected}
              onToggleVisible={toggleVisible}
              onUpload={() => router.push("/equipment-prices/import")}
              onExport={exportEquipmentPrices}
              onAiComplete={handleAiComplete}
              aiRunning={false}
              onCreate={() => router.push("/equipment-prices/create")}
              onAiInquiry={handleAiInquiry}
              onMore={(event) =>
                setActionMenu({
                  open: true,
                  x: event.clientX - 190,
                  y: event.clientY + 8,
                  scope: "bulk",
                })
              }
            />
            <EquipmentTableCard
              records={pagedRecords}
              total={equipmentTotal}
              page={currentPage}
              pageCount={equipmentPageCount}
              selectedIds={selectedIds}
              activeId={activeRecord?.id}
              sort={sort}
              onPageChange={setPage}
              onToggleRow={toggleRow}
              onActivateRow={setActiveId}
              onSort={handleSort}
              onEdit={(row) =>
                router.push(`/equipment-prices/${encodeURIComponent(row.id)}/edit`)
              }
              onMore={(row, event) =>
                setActionMenu({
                  open: true,
                  x: event.clientX - 190,
                  y: event.clientY + 8,
                  scope: "row",
                  rowId: row.id,
                })
              }
            />
            {equipmentLoading ? (
              <p className="px-3 text-[12px] text-textMuted" role="status">
                正在从价格库读取最新数据...
              </p>
            ) : null}
          </div>
          {activeRecord ? (
            <EquipmentAiColumn
              active={activeRecord}
              onAiComplete={() => handleAiComplete(activeRecord.id)}
              onViewSimilar={() =>
                router.push(
                  `/equipment-prices/ai-recommendation?equipmentId=${encodeURIComponent(activeRecord.id)}&view=similar-prices`
                )
              }
            />
          ) : null}
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[1.1fr_1fr_1.7fr]">
          <ConfidenceDistributionCard
            onSelectConfidence={handleConfidenceFilter}
            onShowDetails={() =>
              router.push("/analytics?view=equipment-confidence&source=equipment-prices")
            }
          />
          <AnomalyWarningCard onFilterRisk={handleRiskFilter} />
          <InquiryTaskCard onShowAll={() => router.push("/inquiries/create?source=equipment-ai-recommendation")} />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(voidTarget)}
        title="作废设备价格"
        description={
          voidTarget
            ? `${voidTarget.equipmentCode} · ${voidTarget.equipmentName} 将从有效价格库移除，但保留完整审计记录。`
            : undefined
        }
        confirmLabel={voiding ? "正在作废..." : "确认作废"}
        onConfirm={() => void voidEquipmentPrice()}
        onCancel={() => {
          if (voiding) return;
          setVoidTarget(null);
          setVoidReason("");
        }}
        tone="danger"
      >
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-textSecondary">
            作废原因
          </span>
          <textarea
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="例如：报价已失效，由新版本 EQP-... 替代"
            className="w-full resize-none rounded-md border border-borderSoft bg-white px-3 py-2 text-[13px] text-textMain outline-none transition focus:border-danger/50 focus:ring-2 focus:ring-danger/10"
          />
        </label>
      </ConfirmDialog>
      <ActionMenu
        open={actionMenu.open}
        x={actionMenu.x}
        y={actionMenu.y}
        items={actionMenuItems}
        onClose={() =>
          setActionMenu((current) => ({ ...current, open: false }))
        }
      />
    </AppLayout>
  );
}
