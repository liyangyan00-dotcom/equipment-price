"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  Box,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  SearchCheck,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";

import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DataTable,
  LoadingButton,
  ModuleHeader,
  RouteContextBanner,
} from "@/components/common";
import type { MaterialPriceRecord } from "@/data/mock/materialPrices";
import { materialDate, materialDateInRange, materialFacets, recentlyUpdated } from "@/lib/data/materialInsights";
import { MaterialCollectionSuggestions, MaterialPriceInsights } from "@/components/material-workflow/MaterialPriceInsights";
import { formatDate } from "@/lib/formatters";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/downloadCsv";
import {
  mapMaterialPriceRow,
  type MaterialPriceDatabaseRow,
} from "@/lib/data/priceInquiryMapper";
import type { ConfidenceLevel, DataTableColumn, ReviewStatus, RiskLevel } from "@/types/common";

type MaterialFilters = {
  keyword: string;
  category: string;
  region: string;
  unit: string;
  source: string;
  confidence: string;
  reviewStatus: string;
  riskLevel: string;
  dateFrom: string;
  dateTo: string;
};

type QuickFilter = "all" | "recent" | "ai" | "risk" | "review";

const pageSize = 10;

const defaultFilters: MaterialFilters = {
  keyword: "",
  category: "全部",
  region: "全部",
  unit: "全部",
  source: "全部",
  confidence: "全部",
  reviewStatus: "全部",
  riskLevel: "全部",
  dateFrom: "",
  dateTo: "",
};

const kpiConfig = [
  { icon: Box, tone: "blue" },
  { icon: RefreshCcw, tone: "green" },
  { icon: Sparkles, tone: "purple" },
  { icon: Activity, tone: "orange" },
] as const;

const confidenceOptions = ["全部", "A", "B", "C", "D"];
const reviewOptions: Array<"全部" | ReviewStatus> = ["全部", "confirmed", "pending", "need_info", "rejected"];
const riskOptions: Array<"全部" | RiskLevel> = ["全部", "low", "medium", "high", "critical"];


function matchesConfidence(row: MaterialPriceRecord, value: string) {
  if (value === "全部") return true;
  if (value === "D") return row.confidence === "D" || row.confidence === "E";
  return row.confidence === value;
}

function matchesQuickFilter(row: MaterialPriceRecord, quick: QuickFilter) {
  if (quick === "all") return true;
  if (quick === "recent") return recentlyUpdated(row.updatedAt);
  if (quick === "ai") return row.source.includes("AI");
  if (quick === "risk") return row.riskLevel === "high" || row.riskLevel === "critical";
  if (quick === "review") return row.reviewStatus === "pending" || row.reviewStatus === "need_info";
  return true;
}

function matchesFilters(row: MaterialPriceRecord, filters: MaterialFilters, quick: QuickFilter) {
  const keyword = filters.keyword.trim().toLowerCase();
  const text = [
    row.materialCode,
    row.materialName,
    row.category,
    row.specification,
    row.region,
    row.source,
    row.transportCondition,
  ]
    .join(" ")
    .toLowerCase();

  return (
    matchesQuickFilter(row, quick) &&
    (!keyword || text.includes(keyword)) &&
    (filters.category === "全部" || row.category === filters.category) &&
    (filters.region === "全部" || row.region === filters.region) &&
    (filters.unit === "全部" || row.unit === filters.unit) &&
    (filters.source === "全部" || row.source === filters.source) &&
    matchesConfidence(row, filters.confidence) &&
    (filters.reviewStatus === "全部" || row.reviewStatus === filters.reviewStatus) &&
    (filters.riskLevel === "全部" || row.riskLevel === filters.riskLevel) &&
    materialDateInRange(row.quoteDate, filters.dateFrom, filters.dateTo)
  );
}


function MaterialKpiGrid({
  items,
  activeQuick,
  onKpiClick,
}: {
  items: Array<{ label: string; value: string; unit: string; description: string }>;
  activeQuick: QuickFilter;
  onKpiClick: (quick: QuickFilter) => void;
}) {
  const quickMap: QuickFilter[] = ["all", "recent", "ai", "review", "risk", "all"];
  const colorByTone = {
    blue: "from-blue-50 to-white text-blue-600 border-blue-100",
    green: "from-emerald-50 to-white text-emerald-600 border-emerald-100",
    purple: "from-violet-50 to-white text-violet-600 border-violet-100",
    orange: "from-orange-50 to-white text-orange-600 border-orange-100",
    red: "from-red-50 to-white text-red-600 border-red-100",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {items.map((item, index) => {
        const config = kpiConfig[index % kpiConfig.length];
        const Icon = config.icon;
        const quick = quickMap[index] ?? "all";
        const active = activeQuick === quick && index !== 5;

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onKpiClick(quick)}
            className={cn(
              "group h-[98px] rounded-card border bg-gradient-to-br p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-cardHover",
              colorByTone[config.tone],
              active && "ring-2 ring-primary/30"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold">{item.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-normal text-slate-950">{item.value}</span>
                  <span className="text-[11px] font-semibold">{item.unit}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{item.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-sm transition group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
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
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-borderSoft bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "confirmed"
              ? "已审核"
              : option === "pending"
                ? "待审核"
                : option === "need_info"
                  ? "需补充"
                  : option === "rejected"
                    ? "已驳回"
                    : option === "low"
                      ? "低风险"
                      : option === "medium"
                        ? "中风险"
                        : option === "high"
                          ? "高风险"
                          : option === "critical"
                            ? "严重风险"
                            : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MaterialFilterPanel({
  records,
  filters,
  onChange,
  onSubmit,
  onReset,
}: {
  records: MaterialPriceRecord[];
  filters: MaterialFilters;
  onChange: (patch: Partial<MaterialFilters>) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-borderSoft bg-white p-3 shadow-card" data-no-global-interaction>
      <div className="grid min-w-[1120px] grid-cols-[minmax(220px,1.5fr)_repeat(7,minmax(96px,1fr))_auto_auto] items-end gap-2">
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          材料搜索
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.keyword}
              onChange={(event) => onChange({ keyword: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSubmit();
              }}
              placeholder="搜索材料名称、规格、地区或来源"
              className="h-9 w-full rounded-lg border border-borderSoft bg-white pl-9 pr-3 text-[13px] font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </label>
        <FilterSelect label="类别" value={filters.category} options={["全部", ...materialFacets(records, "category")]} onChange={(value) => onChange({ category: value })} />
        <FilterSelect label="地区" value={filters.region} options={["全部", ...materialFacets(records, "region")]} onChange={(value) => onChange({ region: value })} />
        <FilterSelect label="单位" value={filters.unit} options={["全部", ...materialFacets(records, "unit")]} onChange={(value) => onChange({ unit: value })} />
        <FilterSelect label="来源" value={filters.source} options={["全部", ...materialFacets(records, "source")]} onChange={(value) => onChange({ source: value })} />
        <FilterSelect label="可信度" value={filters.confidence} options={confidenceOptions} onChange={(value) => onChange({ confidence: value })} />
        <FilterSelect label="审核状态" value={filters.reviewStatus} options={reviewOptions} onChange={(value) => onChange({ reviewStatus: value })} />
        <FilterSelect label="风险等级" value={filters.riskLevel} options={riskOptions} onChange={(value) => onChange({ riskLevel: value })} />
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-borderSoft bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          重置
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          <SearchCheck className="h-4 w-4" />
          查询
        </button>
      </div>
    </div>
  );
}

function MaterialActionBar({
  total,
  selectedCount,
  allVisibleSelected,
  onToggleVisible,
  onCreate,
  onUpload,
  onCollect,
  onAiOrganize,
  onInquiry,
  onExport,
  onMore,
  aiOrganizeLoading,
}: {
  total: number;
  selectedCount: number;
  allVisibleSelected: boolean;
  onToggleVisible: () => void;
  onCreate: () => void;
  onUpload: () => void;
  onCollect: () => void;
  onAiOrganize: () => void;
  onInquiry: () => void;
  onExport: () => void;
  onMore: () => void;
  aiOrganizeLoading: boolean;
}) {
  return (
    <div className="flex min-h-12 min-w-0 items-center justify-between gap-3 overflow-x-auto rounded-card border border-borderSoft bg-white px-3 py-1 shadow-card" data-no-global-interaction>
      <div className="flex shrink-0 items-center gap-3 whitespace-nowrap text-[12px] font-semibold text-slate-500">
        <label className="inline-flex items-center gap-2 rounded-lg border border-borderSoft bg-slate-50 px-3 py-2 text-slate-600">
          <input type="checkbox" checked={allVisibleSelected} onChange={onToggleVisible} className="h-4 w-4 rounded border-slate-300" />
          选择当前页
        </label>
        <span>共 {total} 条</span>
        <span className="text-primary">已选 {selectedCount} 条</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          新增地材价格
        </button>
        <button type="button" onClick={onUpload} className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-100">
          <Upload className="h-4 w-4" />
          导入调研表
        </button>
        <button type="button" onClick={onCollect} className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 text-[13px] font-semibold text-violet-700 hover:bg-violet-100">
          <Sparkles className="h-4 w-4" />
          AI采集线索
        </button>
        <LoadingButton
          loading={aiOrganizeLoading}
          onClick={onAiOrganize}
          className="h-9 border-blue-200 bg-blue-50 text-[13px] font-semibold text-blue-700 hover:bg-blue-100"
        >
          <Bot className="h-4 w-4" />
          AI整理记录
        </LoadingButton>
        <button type="button" onClick={onInquiry} className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-[13px] font-semibold text-amber-700 hover:bg-amber-100">
          <FileSpreadsheet className="h-4 w-4" />
          创建询价
        </button>
        <button type="button" onClick={onExport} className="inline-flex h-9 items-center gap-2 rounded-lg border border-borderSoft bg-white px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
          <Download className="h-4 w-4" />
          导出价格表
        </button>
        <button type="button" onClick={onMore} className="inline-flex h-9 items-center gap-2 rounded-lg border border-borderSoft bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
          <MoreHorizontal className="h-4 w-4" />
          更多
        </button>
      </div>
    </div>
  );
}


function MaterialBottomActions({ onCreate, onUpload, onCollect, onOrganize, onExport }: { onCreate: () => void; onUpload: () => void; onCollect: () => void; onOrganize: () => void; onExport: () => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-no-global-interaction>
      {[
        { label: "新增地材价格", sub: "手工录入", icon: Plus, tone: "bg-primary text-white", onClick: onCreate },
        { label: "导入调研表", sub: "Excel批量入库", icon: Upload, tone: "border-emerald-200 bg-emerald-50 text-emerald-700", onClick: onUpload },
        { label: "AI采集线索", sub: "自动采集", icon: Sparkles, tone: "border-violet-200 bg-violet-50 text-violet-700", onClick: onCollect },
        { label: "AI整理记录", sub: "归类与去重", icon: Bot, tone: "border-blue-200 bg-blue-50 text-blue-700", onClick: onOrganize },
        { label: "导出价格表", sub: "输出Excel", icon: Download, tone: "border-borderSoft bg-white text-slate-700", onClick: onExport },
      ].map((action) => {
        const Icon = action.icon;
        return (
          <button key={action.label} type="button" onClick={action.onClick} className={cn("flex h-16 items-center justify-center gap-3 rounded-card border px-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-cardHover", action.tone)}>
            <Icon className="h-5 w-5 shrink-0" />
            <span>
              <span className="block text-[13px] font-bold">{action.label}</span>
              <span className="block text-[11px] opacity-80">{action.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function MaterialPricesPage() {
  const router = useRouter();
  const toast = useMockToast();
  const [aiOrganizing, setAiOrganizing] = useState(false);
  const [filters, setFilters] = useState<MaterialFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<MaterialFilters>(defaultFilters);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState("");
  const [page, setPage] = useState(1);
  const [materialData, setMaterialData] = useState<MaterialPriceRecord[]>([]);
  const [dataSource, setDataSource] = useState<"loading" | "supabase" | "error">("loading");
  const [materialLeadSummary, setMaterialLeadSummary] = useState<{ pending: number; ready: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const risk = params.get("risk");
    const next = {
      ...defaultFilters,
      dateFrom: params.get("dateFrom") || "",
      dateTo: params.get("dateTo") || "",
      riskLevel: risk === "high" || risk === "critical" ? risk : "全部",
    };
    if (!next.dateFrom && !next.dateTo && next.riskLevel === "全部") return;
    const timer = window.setTimeout(() => {
      setFilters(next);
      setAppliedFilters(next);
      setQuickFilter(risk === "high" ? "risk" : "all");
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/material-prices", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Supabase material query failed");
        return response.json() as Promise<{ data: MaterialPriceDatabaseRow[] }>;
      })
      .then(({ data }) => {
        if (!active) return;
        const mapped = data.map((row) => mapMaterialPriceRow(row));
        setMaterialData(mapped);
        setDataSource("supabase");
        const requestedLeadCodes = (new URLSearchParams(window.location.search).get("leadIds") || "").split(",").filter(Boolean);
        const linkedRecord = requestedLeadCodes.length
          ? mapped.find((record) => requestedLeadCodes.includes(String(record.collectionLeadCode || "")))
          : undefined;
        setActiveId((current) =>
          linkedRecord?.id ?? (mapped.some((record) => record.id === current)
            ? current
            : mapped[0]?.id ?? ""),
        );
      })
      .catch(() => {
        if (active) {
          setMaterialData([]);
          setActiveId("");
          setDataSource("error");
          toast.danger("地材价格加载失败", "未使用 Mock 数据覆盖正式价格，请稍后重试。");
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [toast]);

  useEffect(() => {
    let active = true;
    fetch("/api/price-collection?view=lead_pool&type=material&validity=all&page=1&pageSize=1", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Material lead summary query failed");
        return response.json() as Promise<{ summary?: { pending?: number; ready?: number } }>;
      })
      .then(({ summary }) => {
        if (active) setMaterialLeadSummary({ pending: Number(summary?.pending || 0), ready: Number(summary?.ready || 0) });
      })
      .catch(() => { if (active) setMaterialLeadSummary(null); });
    return () => { active = false; };
  }, []);

  const dynamicKpis = useMemo(() => {
    const recent = materialData.filter((item) => recentlyUpdated(item.updatedAt)).length;
    const pendingReview = materialData.filter((item) => item.reviewStatus === "pending" || item.reviewStatus === "need_info").length;
    const risks = materialData.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length;
    const regions = new Set(materialData.map((item) => item.region).filter(Boolean)).size;
    return [
      { label: "已加载地材价格", value: String(materialData.length), unit: "条", description: "当前已加载的价格库记录" },
      { label: "近30天更新", value: String(recent), unit: "条", description: "按记录更新时间统计" },
      { label: "AI采集线索", value: materialLeadSummary ? String(materialLeadSummary.pending + materialLeadSummary.ready) : "--", unit: "条", description: materialLeadSummary ? `待确认 ${materialLeadSummary.pending} · 可入库 ${materialLeadSummary.ready}` : "线索统计暂未获取" },
      { label: "待审核价格", value: String(pendingReview), unit: "条", description: "正式库内待复核记录" },
      { label: "价格异常", value: String(risks), unit: "项", description: "高风险与严重风险" },
      { label: "覆盖地区", value: String(regions), unit: "个", description: "正式价格覆盖地区" },
    ];
  }, [materialData, materialLeadSummary]);

  const filteredRecords = useMemo(
    () => materialData.filter((record) => matchesFilters(record, appliedFilters, quickFilter)),
    [appliedFilters, materialData, quickFilter]
  );

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeRecord = filteredRecords.find((record) => record.id === activeId) ?? pagedRecords[0];
  const visibleIds = pagedRecords.map((record) => record.id);

  const exportMaterialPrices = () => {
    downloadCsv(
      `地材价格表-${new Date().toISOString().slice(0, 10)}`,
      ["价格编码", "材料名称", "类别", "规格", "单位", "原币价格", "币种", "美元价格", "地区", "供应商", "报价日期", "审核状态", "可信度", "风险等级"],
      filteredRecords.map((record) => [
        record.materialCode, record.materialName, record.category, record.specification,
        record.unit, record.originalPrice, record.currency, record.usdPrice, record.region,
        record.supplierName, record.quoteDate, record.reviewStatus, record.confidence, record.riskLevel,
      ]),
    );
    toast.success("导出完成", `已导出 ${filteredRecords.length} 条当前筛选结果。`);
  };
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), pageCount);
    const firstRecord = filteredRecords[(safePage - 1) * pageSize];
    setPage(safePage);
    setActiveId(firstRecord?.id ?? "");
  };

  const patchFilters = (patch: Partial<MaterialFilters>) => setFilters((current) => ({ ...current, ...patch }));

  const submitFilters = () => {
    const nextRecords = materialData.filter((record) => matchesFilters(record, filters, quickFilter));
    setAppliedFilters(filters);
    setPage(1);
    setSelectedIds([]);
    setActiveId(nextRecords[0]?.id ?? "");
    toast.success("已按当前条件筛选地材价格");
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setQuickFilter("all");
    setPage(1);
    setSelectedIds([]);
    setActiveId(materialData[0]?.id ?? "");
    toast.info("筛选条件已重置");
  };

  const handleKpiClick = (quick: QuickFilter) => {
    if (quick === "ai") {
      router.push("/price-leads?type=地材");
      return;
    }
    const nextRecords = materialData.filter((record) => matchesFilters(record, appliedFilters, quick));
    setQuickFilter(quick);
    setPage(1);
    setSelectedIds([]);
    setActiveId(nextRecords[0]?.id ?? "");
    toast.info(quick === "all" ? "已显示全部地材价格" : "已按KPI快速筛选");
  };

  const toggleRow = (id: string) => {
    setActiveId(id);
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const selectedOrActiveIds = () => (selectedIds.length > 0 ? selectedIds : activeRecord ? [activeRecord.id] : []);

  const requireSelection = (message = "请先选择至少一条地材价格记录") => {
    if (selectedOrActiveIds().length === 0) {
      toast.warning(message);
      return false;
    }
    return true;
  };

  const handleCreate = () => {
    router.push("/material-prices/create");
  };

  const handleCollect = () => {
    const ids = selectedOrActiveIds();
    if (ids.length === 0) {
      toast.warning("请先选择要采集补充线索的地材");
      return;
    }
    router.push(`/ai-price-collection?materialIds=${ids.join(",")}&source=material-prices`);
  };

  const handleInquiry = (ids = selectedOrActiveIds()) => {
    if (ids.length === 0) {
      toast.warning("请先选择要询价的地材");
      return;
    }
    router.push(`/inquiries/create?materialIds=${ids.join(",")}&source=material-prices`);
  };

  const handleAiOrganize = async () => {
    if (!requireSelection()) return;
    const ids = selectedOrActiveIds();
    setAiOrganizing(true);
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "price_collection",
          title: "整理地材价格记录",
          sourceLabel: "地材价格库",
          businessObjectType: "material_price",
          businessHref: `/material-prices?ids=${ids.join(",")}`,
          input: {
            recordIds: ids,
            records: materialData.filter((record) => ids.includes(record.id)).map((record) => ({
              id: record.id,
              code: record.materialCode,
              name: record.materialName,
              specification: record.specification,
              price: record.originalPrice,
              currency: record.currency,
              source: record.source,
              confidence: record.confidence,
              riskLevel: record.riskLevel,
            })),
          },
        }),
      });
      const payload = await response.json() as { data?: { task_code?: string }; error?: string };
      if (!response.ok) throw new Error(payload.error || "AI 任务创建失败");
      toast.ai("AI整理任务已入队", `${payload.data?.task_code ?? "任务"} 将输出置信度和风险提示，完成后需人工复核。`);
      router.push("/ai-workbench?workflow=price_collection&status=needs_review");
    } catch (error) {
      toast.danger("AI整理任务创建失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setAiOrganizing(false);
    }
  };

  const handleMore = () => toast.info("更多操作将在后续批量治理中开放");

  const handleTrend = useCallback((row: MaterialPriceRecord) => {
    setActiveId(row.id);
    document.querySelector('[aria-label="地材样本分析"]')?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const columns = useMemo<DataTableColumn<MaterialPriceRecord>[]>(
    () => [
      {
        key: "select",
        header: "选择",
        align: "center",
        className: "w-[44px]",
        render: (row) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.id)}
            onChange={() => toggleRow(row.id)}
            onClick={(event) => event.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300"
            aria-label={`选择${row.materialName}`}
          />
        ),
      },
      {
        key: "materialCode",
        header: "材料编号",
        className: "min-w-[130px]",
        render: (row) => (
          <button type="button" onClick={() => setActiveId(row.id)} className="text-left font-semibold text-primary hover:underline">
            {row.materialCode}
          </button>
        ),
      },
      {
        key: "materialName",
        header: "材料名称",
        className: "min-w-[170px]",
        render: (row) => (
          <div className="max-w-[150px]" title={`${row.materialName} ${row.specification}`}>
            <p className="truncate font-semibold text-slate-900">{row.materialName}</p>
            <p className="truncate text-[11px] text-slate-500">{row.specification}</p>
          </div>
        ),
      },
      { key: "category", header: "材料类别", className: "min-w-[92px]", render: (row) => <span className="font-medium text-slate-700">{row.category}</span> },
      { key: "unit", header: "单位", align: "center", className: "min-w-[64px]" },
      {
        key: "usdPrice",
        header: "最新价格",
        align: "right",
        className: "min-w-[112px]",
        render: (row) => (
          <div className="font-semibold text-slate-950">
            {row.currency} {row.originalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <p className="text-[11px] font-medium text-slate-500">/ {row.unit}</p>
          </div>
        ),
      },
      { key: "currency", header: "币种", align: "center", className: "min-w-[72px]" },
      { key: "region", header: "地区", className: "min-w-[92px]", render: (row) => <span className="font-medium text-slate-700">{row.region}</span> },
      { key: "source", header: "来源", className: "min-w-[118px]", render: (row) => (row.source.includes("AI") ? <AiBadge label={row.source} /> : <span className="rounded-full bg-blue-50 px-2 py-1 text-[12px] font-semibold text-blue-700">{row.source}</span>) },
      { key: "confidence", header: "可信度", className: "min-w-[120px]", render: (row) => row.confidence ? <ConfidenceBadge level={row.confidence as ConfidenceLevel} showPrefix /> : <span className="text-textMuted">未评估</span> },
      {
        key: "trend",
        header: "价格趋势",
        className: "min-w-[116px]",
        render: (row) => (
          <button type="button" onClick={() => handleTrend(row)} className="whitespace-nowrap text-xs font-semibold text-primary">
            查看同口径趋势
          </button>
        ),
      },
      { key: "riskLevel", header: "风险", className: "min-w-[92px]", render: (row) => <RiskBadge level={row.riskLevel} /> },
      { key: "quoteDate", header: "报价日期", className: "min-w-[104px]", render: (row) => materialDate(row.quoteDate) ? formatDate(row.quoteDate) : row.quoteDate ? "日期异常" : "未提供" },
      {
        key: "actions",
        header: "操作",
        align: "right",
        className: "min-w-[286px]",
        render: (row) => (
          <div className="flex flex-nowrap items-center justify-end gap-1" data-no-global-interaction>
            <Link
              href={`/material-prices/${row.id}?from=material-prices`}
              onClick={() => setActiveId(row.id)}
              className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-borderSoft bg-white px-2 text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-primary"
            >
              <Eye className="h-3.5 w-3.5" />
              查看
            </Link>
            <Link href={`/material-prices/${row.id}/edit`} onClick={() => setActiveId(row.id)} className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-borderSoft bg-white px-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
              <Pencil className="h-3.5 w-3.5" />
              编辑
            </Link>
            <button type="button" onClick={() => router.push(`/ai-price-collection?materialIds=${row.id}&source=material-prices`)} className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-violet-200 bg-violet-50 px-2 text-[12px] font-semibold text-violet-700 hover:bg-violet-100">
              <Sparkles className="h-3.5 w-3.5" />
              采集线索
            </button>
            <button type="button" onClick={() => handleTrend(row)} className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-2 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">
              <TrendingUp className="h-3.5 w-3.5" />
              趋势
            </button>
          </div>
        ),
      },
    ],
    [handleTrend, selectedIds, router]
  );

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <RouteContextBanner />
        <PageHeader
          title="地材价格库"
          description="管理项目所在地材料价格、来源、区域、有效期与 AI 采集线索。"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/material-prices/import" className="inline-flex h-9 items-center gap-2 rounded-lg border border-borderSoft bg-white px-4 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                导入价格
              </Link>
              <button type="button" onClick={handleCollect} className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 text-[13px] font-semibold text-violet-700 shadow-sm hover:bg-violet-100">
                <Sparkles className="h-4 w-4" />
                AI采集
              </button>
              <Link href="/material-prices/reviews" className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-[13px] font-semibold text-amber-700 shadow-sm hover:bg-amber-100">
                <SearchCheck className="h-4 w-4" />
                价格审核
              </Link>
              <Link href="/material-prices/manage" className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-teal-700">
                <Database className="h-4 w-4" />
                管理价格库
              </Link>
            </div>
          }
        />

        <section className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-borderSoft bg-white px-4 py-2.5 text-[12px] shadow-sm">
          <span className="text-textSecondary"><strong className="text-textMain">价格库实时联动：</strong>{dataSource === "loading" ? "正在读取 Supabase" : dataSource === "supabase" ? `已加载 ${materialData.length} 条地材价格库记录` : "Supabase 暂不可用，未展示非正式数据"}</span>
          <Link href="/price-leads?type=地材" className="inline-flex h-7 items-center whitespace-nowrap rounded-md border border-ai/25 bg-ai-soft px-2.5 font-semibold text-ai">待处理地材线索 {materialLeadSummary ? materialLeadSummary.pending + materialLeadSummary.ready : "--"} 条</Link>
        </section>

        <MaterialKpiGrid items={dataSource === "supabase" ? dynamicKpis : dynamicKpis.map(item => ({ ...item, value: "--" }))} activeQuick={quickFilter} onKpiClick={handleKpiClick} />

        <MaterialFilterPanel records={materialData} filters={filters} onChange={patchFilters} onSubmit={submitFilters} onReset={resetFilters} />

        <MaterialActionBar
          total={filteredRecords.length}
          selectedCount={selectedIds.length}
          allVisibleSelected={allVisibleSelected}
          onToggleVisible={toggleVisible}
          onCreate={handleCreate}
          onUpload={() => router.push("/material-prices/import")}
          onCollect={handleCollect}
          onAiOrganize={handleAiOrganize}
          onInquiry={handleInquiry}
          onExport={exportMaterialPrices}
          onMore={handleMore}
          aiOrganizeLoading={aiOrganizing}
        />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <ModuleHeader
              icon={Activity}
              title="地材价格明细"
              subtitle="地区、单位、价格趋势和可信度集中管理"
              action={<AiBadge label="AI采集线索同步" />}
              className="border-b border-borderSoft px-4 py-3"
            />
            <DataTable
              columns={columns}
              data={pagedRecords}
              rowKey={(row) => row.id}
              density="compact"
              onRowClick={(row) => setActiveId(row.id)}
              rowClassName={(row) => (row.id === activeId ? "bg-blue-50/75 hover:bg-blue-50" : "")}
              emptyTitle={dataSource === "loading" ? "正在加载价格" : dataSource === "error" ? "价格加载失败" : "暂无匹配的地材价格"}
              emptyDescription={dataSource === "error" ? "未使用演示数据替代查询结果，请重新加载页面。" : "当前筛选范围暂无价格记录。"}
            />
            <div className="flex items-center justify-between border-t border-borderSoft px-4 py-3 text-[13px] text-slate-500">
              <span>
                共 {filteredRecords.length} 条，当前第 {currentPage} / {pageCount} 页。
              </span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-borderSoft bg-white disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: pageCount }).map((_, index) => (
                  <button
                    key={index + 1}
                    type="button"
                    onClick={() => goToPage(index + 1)}
                    className={cn("h-8 min-w-8 rounded-lg border px-3 text-[13px] font-semibold", currentPage === index + 1 ? "border-primary bg-primary text-white" : "border-borderSoft bg-white text-slate-600")}
                  >
                    {index + 1}
                  </button>
                ))}
                <button type="button" disabled={currentPage >= pageCount} onClick={() => goToPage(currentPage + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-borderSoft bg-white disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {dataSource === "supabase" && <MaterialCollectionSuggestions records={filteredRecords} />}
        </div>

        {dataSource === "supabase" && <MaterialPriceInsights records={filteredRecords} activeRecord={activeRecord} />}

        <MaterialBottomActions
          onCreate={handleCreate}
          onUpload={() => router.push("/material-prices/import")}
          onCollect={handleCollect}
          onOrganize={handleAiOrganize}
          onExport={exportMaterialPrices}
        />
      </div>
    </AppLayout>
  );
}
