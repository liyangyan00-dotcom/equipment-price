"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpFromLine,
  BadgeCheck,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileDown,
  FileSearch,
  GitCompareArrows,
  History,
  ListChecks,
  LoaderCircle,
  MoreHorizontal,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { ConfidenceBadge, RiskBadge, StatusBadge } from "@/components/badges";
import {
  EmptyState,
  IconBox,
  MockExportDialog,
  ModuleHeader,
} from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { emitMockToast } from "@/hooks/useMockToast";
import type { ConfidenceLevel, ReviewStatus } from "@/types/common";
import type { EquipmentCatalogRecord } from "@/types/equipmentCatalog";

type CountItem = { name: string; count: number };

type CatalogResponse = {
  data: EquipmentCatalogRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  summary: {
    total: number;
    approved: number;
    pending: number;
    suppliers: number;
    brands: number;
    averageCompleteness: number;
    highCompleteness: number;
    highRisk: number;
  };
  facets: {
    categories: string[];
    equipmentTypes: string[];
    equipmentTypesByCategory: Record<string, string[]>;
    brands: string[];
    suppliers: Array<{ id: string; name: string }>;
    sourceTypes: string[];
  };
  analytics: { categories: CountItem[]; brands: CountItem[] };
};

type FilterState = {
  keyword: string;
  category: string;
  equipmentType: string;
  brand: string;
  supplier: string;
  reviewStatus: string;
  sourceType: string;
  riskLevel: string;
  completeness: string;
};

type CreateForm = {
  equipmentName: string;
  equipmentCategory: string;
  brand: string;
  manufacturer: string;
  productSeries: string;
  model: string;
  specification: string;
};

const emptyFilters: FilterState = {
  keyword: "",
  category: "all",
  equipmentType: "all",
  brand: "all",
  supplier: "all",
  reviewStatus: "all",
  sourceType: "all",
  riskLevel: "all",
  completeness: "all",
};

const emptyCreateForm: CreateForm = {
  equipmentName: "",
  equipmentCategory: "",
  brand: "",
  manufacturer: "",
  productSeries: "",
  model: "",
  specification: "",
};

const defaultSummary: CatalogResponse["summary"] = {
  total: 0,
  approved: 0,
  pending: 0,
  suppliers: 0,
  brands: 0,
  averageCompleteness: 0,
  highCompleteness: 0,
  highRisk: 0,
};

const defaultFacets: CatalogResponse["facets"] = {
  categories: [],
  equipmentTypes: [],
  equipmentTypesByCategory: {},
  brands: [],
  suppliers: [],
  sourceTypes: [],
};

const chartColors = [
  "#1769e0",
  "#15a66a",
  "#f59e0b",
  "#7c4dff",
  "#3aa7d8",
  "#ef5b5b",
  "#94a3b8",
];

function uiStatus(
  status: EquipmentCatalogRecord["review_status"],
): ReviewStatus {
  return {
    draft: "need_info",
    pending_review: "pending",
    approved: "confirmed",
    rejected: "rejected",
    archived: "voided",
  }[status] as ReviewStatus;
}

function confidenceLevel(value: number): ConfidenceLevel {
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  if (value >= 60) return "D";
  return "E";
}

function sourceLabel(source: string) {
  return (
    (
      {
        manual: "人工录入",
        import: "数据导入",
        supplier: "供应商资料",
        website: "官网资料",
        pdf: "产品样本",
        ai_collection: "AI采集",
      } as Record<string, string>
    )[source] ||
    source ||
    "待补来源"
  );
}

function KpiCard({
  label,
  value,
  suffix,
  icon,
  tone,
  meta,
  onClick,
  progress,
}: {
  label: string;
  value: number;
  suffix: string;
  icon: typeof Database;
  tone: "blue" | "green" | "orange" | "purple" | "red";
  meta: string;
  onClick: () => void;
  progress?: number;
}) {
  const toneText = {
    blue: "text-primary",
    green: "text-success",
    orange: "text-warning",
    purple: "text-ai",
    red: "text-danger",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-[94px] min-w-0 rounded-card border border-borderSoft bg-white p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
    >
      <div className="flex h-full items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <IconBox icon={icon} tone={tone} size="sm" />
            <p className="truncate text-[12px] font-semibold text-textSecondary">
              {label}
            </p>
          </div>
          {progress === undefined ? (
            <p className={`mt-2 text-[25px] font-bold leading-7 ${toneText}`}>
              {value.toLocaleString("zh-CN")}
              <span className="ml-1 text-[11px] font-semibold text-textMuted">
                {suffix}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-[12px] font-semibold text-textSecondary">
              平均资料完整度
            </p>
          )}
          <p className="mt-1 truncate text-[10px] text-textMuted">{meta}</p>
        </div>
        {progress === undefined ? null : (
          <div
            className="relative size-16 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(#1769e0 ${progress}%, #e8eef8 ${progress}% 100%)`,
            }}
          >
            <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-white text-[16px] font-bold text-textMain">
              {progress}%
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

export function EquipmentCatalogPage({
  initialReviewStatus = "all",
  taskId = "",
  pageTitle = "设备资料库",
  pageDescription = "设备主数据与技术资料库，统一管理设备型号、技术参数、产品样本及供应商产品目录。",
}: {
  initialReviewStatus?: string;
  taskId?: string;
  pageTitle?: string;
  pageDescription?: string;
} = {}) {
  const router = useRouter();
  const initialFilters = useMemo(
    () => ({ ...emptyFilters, reviewStatus: initialReviewStatus }),
    [initialReviewStatus],
  );
  const [records, setRecords] = useState<EquipmentCatalogRecord[]>([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [facets, setFacets] = useState(defaultFacets);
  const [analytics, setAnalytics] = useState<CatalogResponse["analytics"]>({
    categories: [],
    brands: [],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    pageCount: 1,
  });
  const [filters, setFilters] = useState<FilterState>(() => initialFilters);
  const [applied, setApplied] = useState<FilterState>(() => initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyCreateForm);
  const [batchAction, setBatchAction] = useState<"review" | "ai" | null>(null);
  const [batchMenuOpen, setBatchMenuOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      page: String(pagination.page),
      pageSize: String(pagination.pageSize),
      ...applied,
    });
    if (taskId) query.set("taskId", taskId);
    try {
      const response = await fetch(
        `/api/equipment-catalog?${query.toString()}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as CatalogResponse & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "设备资料加载失败");
      setRecords(payload.data);
      setSummary(payload.summary);
      setFacets(payload.facets);
      setAnalytics(payload.analytics);
      setPagination(payload.pagination);
      setSelectedId((current) =>
        payload.data.some((item) => item.id === current)
          ? current
          : (payload.data[0]?.id ?? null),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "设备资料加载失败",
      );
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [applied, pagination.page, pagination.pageSize, taskId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pageIds = useMemo(() => records.map((record) => record.id), [records]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const maxBrandCount = Math.max(
    1,
    ...analytics.brands.map((item) => item.count),
  );
  const donutGradient = useMemo(() => {
    const total = analytics.categories.reduce(
      (sum, item) => sum + item.count,
      0,
    );
    if (!total) return "conic-gradient(#e8eef8 0 100%)";
    let start = 0;
    const stops = analytics.categories.slice(0, 7).map((item, index) => {
      const end = start + (item.count / total) * 100;
      const segment = `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${stops.join(",")})`;
  }, [analytics.categories]);

  function setFilter<K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function setCategoryFilter(category: string) {
    const allowedTypes =
      category === "all"
        ? facets.equipmentTypes
        : (facets.equipmentTypesByCategory[category] ?? []);
    setFilters((current) => ({
      ...current,
      category,
      equipmentType:
        current.equipmentType === "all" ||
        allowedTypes.includes(current.equipmentType)
          ? current.equipmentType
          : "all",
    }));
  }

  function syncQuery(next: FilterState) {
    const params = new URLSearchParams();
    if (taskId) params.set("taskId", taskId);
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }

  function applyFilters(next = filters) {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters(next);
    setApplied(next);
    syncQuery(next);
  }

  function resetFilters() {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters(initialFilters);
    setApplied(initialFilters);
    syncQuery(initialFilters);
  }

  function selectCategory(category: string) {
    const allowedTypes =
      category === "all"
        ? facets.equipmentTypes
        : (facets.equipmentTypesByCategory[category] ?? []);
    applyFilters({
      ...filters,
      category,
      equipmentType:
        filters.equipmentType === "all" ||
        allowedTypes.includes(filters.equipmentType)
          ? filters.equipmentType
          : "all",
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function togglePageSelection() {
    setSelectedIds((current) =>
      allPageSelected
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds])),
    );
  }

  function actionIds(fallbackId?: string | null) {
    return selectedIds.length ? selectedIds : fallbackId ? [fallbackId] : [];
  }

  function createInquiry(ids = actionIds(selectedId)) {
    if (!ids.length) {
      emitMockToast({
        title: "请先选择设备资料",
        description: "勾选设备后即可带入询价任务。",
        tone: "warning",
      });
      return;
    }
    router.push(
      `/inquiries/create?source=equipment-catalog&catalogIds=${encodeURIComponent(ids.join(","))}`,
    );
  }

  async function submitForReview(ids = actionIds(selectedId)) {
    if (!ids.length) {
      emitMockToast({ title: "请先选择设备资料", tone: "warning" });
      return;
    }
    setBatchAction("review");
    try {
      await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(
            `/api/equipment-catalog/${encodeURIComponent(id)}/review`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                decision: "pending_review",
                notes: "从设备资料库提交人工审核",
              }),
            },
          );
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(payload.error || "提交审核失败");
        }),
      );
      emitMockToast({
        title: "已提交人工审核",
        description: `${ids.length} 条设备资料已进入审核队列。`,
        tone: "success",
      });
      setSelectedIds([]);
      await load();
    } catch (reviewError) {
      emitMockToast({
        title: "提交审核失败",
        description:
          reviewError instanceof Error ? reviewError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setBatchAction(null);
    }
  }

  async function runAiCompletion(ids = actionIds(selectedId)) {
    if (!ids.length) {
      emitMockToast({ title: "请先选择设备资料", tone: "warning" });
      return;
    }
    const inputRecords = records.filter((record) => ids.includes(record.id));
    setBatchAction("ai");
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "equipment_price_pre_review",
          title: `设备资料参数补全（${ids.length}项）`,
          sourceLabel: "设备资料库",
          businessObjectType: "equipment_catalog",
          businessObjectId: ids.length === 1 ? ids[0] : "batch",
          businessHref: `/equipment-catalog?selected=${ids.join(",")}`,
          idempotencyKey: `catalog-completion-${ids.slice().sort().join("-")}-${new Date().toISOString().slice(0, 13)}`,
          input: {
            catalogIds: ids,
            records: inputRecords.map((record) => ({
              id: record.id,
              code: record.catalog_code,
              name: record.equipment_name,
              category: record.equipment_category,
              brand: record.brand,
              model: record.model,
              specification: record.specification,
              completeness: record.parameter_completeness,
            })),
            requirement:
              "识别缺失关键参数并生成待人工复核建议，不直接覆盖设备主数据",
          },
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "AI任务创建失败");
      emitMockToast({
        title: "AI参数补全任务已创建",
        description: "任务已进入 AI 工作台，结果需人工审核后写入主数据。",
        tone: "success",
      });
    } catch (aiError) {
      emitMockToast({
        title: "AI参数补全未启动",
        description:
          aiError instanceof Error
            ? aiError.message
            : "请检查 AI Provider 配置",
        tone: "danger",
      });
    } finally {
      setBatchAction(null);
    }
  }

  async function createCatalogRecord() {
    if (!form.equipmentName.trim()) {
      emitMockToast({ title: "请填写设备名称", tone: "warning" });
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/equipment-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as {
        data?: EquipmentCatalogRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "新增设备资料失败");
      emitMockToast({
        title: "设备资料草稿已创建",
        description: "记录已进入人工补全与审核流程。",
        tone: "success",
      });
      setCreateOpen(false);
      setForm(emptyCreateForm);
      await load();
    } catch (createError) {
      emitMockToast({
        title: "新增失败",
        description:
          createError instanceof Error ? createError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-3 pb-6" data-no-global-interaction>
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          actions={
            <>
              <Link
                href="/equipment-prices/import?target=equipment-catalog"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary shadow-sm hover:border-primary/30 hover:text-primary"
              >
                <ArrowUpFromLine className="size-4" />
                数据导入
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBatchMenuOpen((open) => !open)}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary shadow-sm hover:border-primary/30 hover:text-primary"
                >
                  <Settings2 className="size-4" />
                  批量操作
                  <ChevronDown className="size-3.5" />
                </button>
                {batchMenuOpen ? (
                  <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-md border border-borderSoft bg-white py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setBatchMenuOpen(false);
                        void submitForReview();
                      }}
                      className="flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] hover:bg-surfaceSubtle"
                    >
                      <BadgeCheck className="size-4 text-primary" />
                      提交人工审核
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBatchMenuOpen(false);
                        void runAiCompletion();
                      }}
                      className="flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] hover:bg-ai-soft"
                    >
                      <WandSparkles className="size-4 text-ai" />
                      AI参数补全
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBatchMenuOpen(false);
                        createInquiry();
                      }}
                      className="flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] hover:bg-surfaceSubtle"
                    >
                      <Send className="size-4 text-primary" />
                      创建询价任务
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBatchMenuOpen(false);
                        setExportOpen(true);
                      }}
                      className="flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] hover:bg-surfaceSubtle"
                    >
                      <Download className="size-4 text-success" />
                      导出资料
                    </button>
                  </div>
                ) : null}
              </div>
              <Link
                href="/equipment-catalog/collection/create"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-white shadow-primary hover:bg-primary/90"
              >
                <Plus className="size-4" />
                新建采集任务
              </Link>
            </>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            label="设备资料总数"
            value={summary.total}
            suffix="条"
            icon={Database}
            tone="blue"
            meta="数据库实时统计"
            onClick={() => resetFilters()}
          />
          <KpiCard
            label="已确认设备"
            value={summary.approved}
            suffix="条"
            icon={CheckCircle2}
            tone="green"
            meta={`占比 ${summary.total ? ((summary.approved / summary.total) * 100).toFixed(1) : 0}%`}
            onClick={() =>
              applyFilters({ ...filters, reviewStatus: "approved" })
            }
          />
          <KpiCard
            label="待审核设备"
            value={summary.pending}
            suffix="条"
            icon={FileSearch}
            tone="orange"
            meta="需人工确认后启用"
            onClick={() => router.push("/equipment-catalog/reviews?tab=pending")}
          />
          <KpiCard
            label="供应商品牌数"
            value={summary.brands}
            suffix="个"
            icon={Building2}
            tone="purple"
            meta={`${summary.suppliers} 条供应能力关系`}
            onClick={() => applyFilters({ ...filters, brand: "all" })}
          />
          <KpiCard
            label="参数完整度"
            value={summary.averageCompleteness}
            suffix="%"
            icon={Sparkles}
            tone="blue"
            meta={`高完整度 ${summary.highCompleteness} 条`}
            progress={summary.averageCompleteness}
            onClick={() => applyFilters({ ...filters, completeness: "high" })}
          />
          <KpiCard
            label="高风险资料"
            value={summary.highRisk}
            suffix="条"
            icon={ShieldAlert}
            tone="red"
            meta="需补证或重新审核"
            onClick={() => applyFilters({ ...filters, riskLevel: "high" })}
          />
        </section>

        <section className="rounded-card border border-borderSoft bg-white p-2.5 shadow-card">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(240px,1.8fr)_repeat(7,minmax(100px,1fr))_auto]">
            <label className="relative min-w-0 sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-textMuted" />
              <input
                value={filters.keyword}
                onChange={(event) => setFilter("keyword", event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && applyFilters()}
                placeholder="搜索设备名称、型号、品牌、规格、供应商..."
                className="h-9 w-full rounded-md border border-borderSoft bg-white pl-9 pr-3 text-[11px] outline-none focus:border-primary"
              />
            </label>
            <FilterSelect
              value={filters.category}
              onChange={setCategoryFilter}
              placeholder="设备类别"
              options={facets.categories}
            />
            <FilterSelect
              value={filters.equipmentType}
              onChange={(value) => setFilter("equipmentType", value)}
              placeholder="细分类型"
              options={
                filters.category === "all"
                  ? facets.equipmentTypes
                  : (facets.equipmentTypesByCategory[filters.category] ?? [])
              }
            />
            <FilterSelect
              value={filters.brand}
              onChange={(value) => setFilter("brand", value)}
              placeholder="品牌"
              options={facets.brands}
            />
            <FilterSelect
              value={filters.supplier}
              onChange={(value) => setFilter("supplier", value)}
              placeholder="供应商"
              options={facets.suppliers.map((item) => item.name)}
            />
            <FilterSelect
              value={filters.reviewStatus}
              onChange={(value) => setFilter("reviewStatus", value)}
              placeholder="审核状态"
              options={["approved", "pending_review", "draft", "rejected"]}
              labels={{
                approved: "已确认",
                pending_review: "待审核",
                draft: "草稿",
                rejected: "已退回",
              }}
            />
            <FilterSelect
              value={filters.sourceType}
              onChange={(value) => setFilter("sourceType", value)}
              placeholder="资料来源"
              options={facets.sourceTypes}
              labels={Object.fromEntries(
                facets.sourceTypes.map((item) => [item, sourceLabel(item)]),
              )}
            />
            <FilterSelect
              value={filters.riskLevel}
              onChange={(value) => setFilter("riskLevel", value)}
              placeholder="风险等级"
              options={["low", "medium", "high", "critical"]}
              labels={{
                low: "低风险",
                medium: "中风险",
                high: "高风险",
                critical: "严重风险",
              }}
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => applyFilters()}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md bg-primary px-3 text-[11px] font-semibold text-white"
              >
                <Search className="size-3.5" />
                查询
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary"
                title="重置筛选"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="flex items-center justify-between rounded-card border border-danger/25 bg-danger-soft p-4 text-[12px] text-danger">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="font-semibold underline"
            >
              重新加载
            </button>
          </section>
        ) : null}

        <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_286px]">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-3 py-2">
              <ModuleHeader
                icon={Boxes}
                title="设备主数据明细"
                subtitle={`共 ${pagination.total} 条，数据库实时读取`}
                density="compact"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] text-textMuted">
                  已选{" "}
                  <strong className="text-primary">{selectedIds.length}</strong>{" "}
                  条
                </span>
                <button
                  type="button"
                  disabled={batchAction !== null}
                  onClick={() => void submitForReview()}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] font-semibold text-textSecondary disabled:opacity-50"
                >
                  <ClipboardCheck className="size-3.5" />
                  提交审核
                </button>
                <button
                  type="button"
                  disabled={batchAction !== null}
                  onClick={() => void runAiCompletion()}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-2 text-[10px] font-semibold text-ai disabled:opacity-50"
                >
                  {batchAction === "ai" ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Bot className="size-3.5" />
                  )}
                  AI补全
                </button>
                <button
                  type="button"
                  onClick={() => createInquiry()}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-[10px] font-semibold text-primary"
                >
                  <Send className="size-3.5" />
                  创建询价
                </button>
              </div>
            </div>

            {applied.reviewStatus === "all" && summary.pending > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/20 bg-warning-soft px-3 py-2 text-[11px] text-warning-dark">
                <span>
                  当前展示全部设备资料，其中 <strong>{summary.pending}</strong> 条仍在候选审核阶段；只有“已确认”记录才属于正式资料库。
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/equipment-catalog/reviews?tab=pending")}
                  className="inline-flex h-7 items-center rounded-md border border-warning/30 bg-white px-2.5 font-semibold text-warning-dark hover:bg-warning-soft"
                >
                  进入资料审核中心
                </button>
              </div>
            ) : null}
            <div
              className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-borderSoft px-3 py-1.5"
              role="tablist"
              aria-label="设备类别"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filters.category === "all"}
                onClick={() => selectCategory("all")}
                className={`h-8 shrink-0 border-b-2 px-2.5 text-[11px] font-semibold ${filters.category === "all" ? "border-primary text-primary" : "border-transparent text-textSecondary hover:text-primary"}`}
              >
                全部设备{" "}
                <span className="ml-1 text-textMuted">{summary.total}</span>
              </button>
              {analytics.categories.slice(0, 7).map((item) => (
                <button
                  key={item.name}
                  type="button"
                  role="tab"
                  aria-selected={filters.category === item.name}
                  onClick={() => selectCategory(item.name)}
                  className={`h-8 shrink-0 border-b-2 px-2.5 text-[11px] font-semibold ${filters.category === item.name ? "border-primary text-primary" : "border-transparent text-textSecondary hover:text-primary"}`}
                >
                  {item.name}{" "}
                  <span className="ml-1 text-textMuted">{item.count}</span>
                </button>
              ))}
              {analytics.categories.length > 7 ? (
                <button
                  type="button"
                  className="ml-auto inline-flex h-8 shrink-0 items-center gap-1 px-2 text-[11px] font-semibold text-textSecondary"
                >
                  更多
                  <ChevronDown className="size-3.5" />
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex min-h-[500px] items-center justify-center gap-2 text-[12px] text-textMuted">
                <LoaderCircle className="size-5 animate-spin text-primary" />
                正在读取设备主数据
              </div>
            ) : records.length ? (
              <CatalogTable
                records={records}
                selectedId={selectedId}
                selectedIds={selectedIds}
                allPageSelected={allPageSelected}
                rowMenuId={rowMenuId}
                onSelectId={setSelectedId}
                onToggleSelected={toggleSelected}
                onTogglePage={togglePageSelection}
                onToggleRowMenu={(id) =>
                  setRowMenuId((current) => (current === id ? null : id))
                }
                onAi={(id) => void runAiCompletion([id])}
                onInquiry={(id) => createInquiry([id])}
              />
            ) : (
              <EmptyState
                title={
                  applied.reviewStatus === "approved"
                    ? "暂无已审核入库的设备资料"
                    : "没有匹配的设备资料"
                }
                description={
                  applied.reviewStatus === "approved" && summary.pending > 0
                    ? `当前有 ${summary.pending} 条候选资料等待人工审核，通过后会进入正式资料库。`
                    : "请调整筛选条件，或创建新的设备资料采集任务。"
                }
                className="m-4 min-h-[420px] shadow-none"
                primaryAction={
                  <button
                    type="button"
                    onClick={() =>
                      applied.reviewStatus === "approved" && summary.pending > 0
                        ? router.push("/equipment-catalog/reviews?tab=pending")
                        : router.push("/equipment-catalog/collection/create")
                    }
                    className="rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-white"
                  >
                    {applied.reviewStatus === "approved" && summary.pending > 0
                      ? "进入资料审核中心"
                      : "新建采集任务"}
                  </button>
                }
              />
            )}

            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t border-borderSoft px-3 py-2 text-[10px] text-textMuted">
              <span>
                共 {pagination.total} 条，当前第 {pagination.page} /{" "}
                {pagination.pageCount} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
                  }
                  className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary font-semibold text-white">
                  {pagination.page}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.pageCount}
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                  className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                </button>
                <select
                  value={pagination.pageSize}
                  onChange={(event) =>
                    setPagination((current) => ({
                      ...current,
                      page: 1,
                      pageSize: Number(event.target.value),
                    }))
                  }
                  className="ml-2 h-7 rounded-md border border-borderSoft bg-white px-2 text-[10px]"
                >
                  <option value={10}>10 条/页</option>
                  <option value={15}>15 条/页</option>
                  <option value={20}>20 条/页</option>
                </select>
              </div>
            </div>
          </section>

          <aside className="min-w-0 space-y-3">
            <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
              <ModuleHeader
                icon={Boxes}
                title="设备类别分布"
                subtitle="数据库实时统计"
                density="compact"
              />
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="relative size-[104px] shrink-0 rounded-full"
                  style={{ background: donutGradient }}
                >
                  <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-white">
                    <strong className="text-[17px] text-textMain">
                      {summary.total}
                    </strong>
                    <span className="text-[9px] text-textMuted">设备总数</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {analytics.categories.slice(0, 7).map((item, index) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => selectCategory(item.name)}
                      className="flex w-full items-center justify-between gap-2 text-[9px] text-textSecondary hover:text-primary"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              chartColors[index % chartColors.length],
                          }}
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {item.count} (
                        {summary.total
                          ? ((item.count / summary.total) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
              <ModuleHeader
                icon={Building2}
                title="品牌 Top 10"
                subtitle="设备资料覆盖数量"
                density="compact"
              />
              <div className="mt-3 space-y-2">
                {analytics.brands.length ? (
                  analytics.brands.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() =>
                        applyFilters({ ...filters, brand: item.name })
                      }
                      className="grid w-full grid-cols-[88px_1fr_28px] items-center gap-2 text-left text-[9px] hover:text-primary"
                    >
                      <span className="truncate font-medium" title={item.name}>
                        {item.name}
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{
                            width: `${(item.count / maxBrandCount) * 100}%`,
                          }}
                        />
                      </span>
                      <strong className="text-right text-textSecondary">
                        {item.count}
                      </strong>
                    </button>
                  ))
                ) : (
                  <p className="py-4 text-center text-[10px] text-textMuted">
                    暂无品牌统计
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
              <ModuleHeader
                icon={ListChecks}
                title="快捷入口"
                subtitle="资料治理常用操作"
                density="compact"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <QuickLink
                  href="/equipment-catalog/collection"
                  icon={FileSearch}
                  label="资料采集任务"
                  tone="blue"
                />
                <QuickLink
                  href="/equipment-catalog/reviews"
                  icon={ClipboardCheck}
                  label="资料审核中心"
                  tone="purple"
                />
                <QuickLink
                  href="/settings/dictionaries?scope=equipment-parameters"
                  icon={Settings2}
                  label="参数模型管理"
                  tone="cyan"
                />
                <QuickLink
                  href="/equipment-prices/import?target=equipment-catalog"
                  icon={ArrowUpFromLine}
                  label="数据导入"
                  tone="blue"
                />
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="flex min-h-12 items-center gap-2 rounded-md border border-borderSoft p-2 text-left text-[9px] font-semibold text-textSecondary hover:border-primary/25 hover:bg-primary-soft hover:text-primary"
                >
                  <IconBox icon={FileDown} tone="green" size="sm" />
                  数据导出
                </button>
                <QuickLink
                  href="/settings/logs?module=equipment-catalog"
                  icon={History}
                  label="操作日志"
                  tone="orange"
                />
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-[10px] font-semibold text-white"
              >
                <Plus className="size-3.5" />
                新增设备资料
              </button>
            </section>
          </aside>
        </div>
      </div>

      {createOpen ? (
        <CreateCatalogDialog
          form={form}
          creating={creating}
          onChange={(key, value) =>
            setForm((current) => ({ ...current, [key]: value }))
          }
          onClose={() => setCreateOpen(false)}
          onCreate={() => void createCatalogRecord()}
        />
      ) : null}
      <MockExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(format) => {
          setExportOpen(false);
          emitMockToast({
            title: "设备资料导出任务已创建",
            description: `${selectedIds.length || pagination.total} 条记录将按 ${format} 格式生成。`,
            tone: "success",
          });
        }}
      />
    </AppLayout>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  labels = {},
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-2 text-[11px]"
    >
      <option value="all">{placeholder}</option>
      {options.filter(Boolean).map((item) => (
        <option key={item} value={item}>
          {labels[item] || item}
        </option>
      ))}
    </select>
  );
}

function CatalogTable({
  records,
  selectedId,
  selectedIds,
  allPageSelected,
  rowMenuId,
  onSelectId,
  onToggleSelected,
  onTogglePage,
  onToggleRowMenu,
  onAi,
  onInquiry,
}: {
  records: EquipmentCatalogRecord[];
  selectedId: string | null;
  selectedIds: string[];
  allPageSelected: boolean;
  rowMenuId: string | null;
  onSelectId: (id: string) => void;
  onToggleSelected: (id: string) => void;
  onTogglePage: () => void;
  onToggleRowMenu: (id: string) => void;
  onAi: (id: string) => void;
  onInquiry: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1220px] text-left text-[11px]">
        <thead className="h-9 bg-surfaceSubtle text-textMuted">
          <tr>
            <th className="w-10 px-3">
              <input
                type="checkbox"
                aria-label="全选当前页"
                checked={allPageSelected}
                onChange={onTogglePage}
                className="size-3.5 accent-primary"
              />
            </th>
            <th className="px-2">设备名称</th>
            <th className="px-2">型号规格</th>
            <th className="px-2">设备类别</th>
            <th className="px-2">品牌 / 供应商</th>
            <th className="px-2">关键参数摘要</th>
            <th className="px-2">参数完整度</th>
            <th className="px-2">AI置信度</th>
            <th className="px-2">审核状态</th>
            <th className="px-2">风险等级</th>
            <th className="px-2">资料来源</th>
            <th className="px-2 text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              onClick={() => onSelectId(record.id)}
              className={`h-12 cursor-pointer border-t border-borderSoft transition hover:bg-primary-soft/35 ${selectedId === record.id ? "bg-primary-soft/45" : ""}`}
            >
              <td className="px-3">
                <input
                  type="checkbox"
                  aria-label={`选择${record.equipment_name}`}
                  checked={selectedIds.includes(record.id)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => onToggleSelected(record.id)}
                  className="size-3.5 accent-primary"
                />
              </td>
              <td className="max-w-[190px] px-2">
                <div className="flex items-center gap-2">
                  <span
                    role={record.thumbnail_url ? "img" : undefined}
                    aria-label={
                      record.thumbnail_url
                        ? `${record.equipment_name}产品缩略图`
                        : undefined
                    }
                    title={record.thumbnail_name || record.equipment_name}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/10 bg-primary-soft bg-cover bg-center text-primary"
                    style={
                      record.thumbnail_url
                        ? { backgroundImage: `url(${record.thumbnail_url})` }
                        : undefined
                    }
                  >
                    {record.thumbnail_url ? null : <Boxes className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/equipment-catalog/${record.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="block truncate font-semibold text-textMain hover:text-primary"
                      title={record.equipment_name}
                    >
                      {record.equipment_name}
                    </Link>
                    <p className="truncate text-[9px] text-textMuted">
                      {record.catalog_code}
                    </p>
                  </div>
                </div>
              </td>
              <td className="max-w-[150px] px-2">
                <p
                  className="truncate font-semibold text-primary"
                  title={record.model}
                >
                  {record.model || "待补型号"}
                </p>
                <p
                  className="truncate text-[9px] text-textMuted"
                  title={record.specification}
                >
                  {record.product_series || record.specification || "规格待补"}
                </p>
              </td>
              <td className="px-2">
                <span className="whitespace-nowrap text-textSecondary">
                  {record.equipment_category || "未分类"}
                </span>
              </td>
              <td className="max-w-[170px] px-2">
                <p className="truncate font-medium text-textMain">
                  {record.brand || "品牌待补"}
                </p>
                <p className="truncate text-[9px] text-textMuted">
                  {record.source_supplier?.name ||
                    record.manufacturer ||
                    "供应商待关联"}
                </p>
              </td>
              <td className="max-w-[210px] px-2">
                <p
                  className="line-clamp-2 leading-4 text-textSecondary"
                  title={record.specification}
                >
                  {record.specification ||
                    record.equipment_type ||
                    "关键参数待补充"}
                </p>
              </td>
              <td className="px-2">
                <div className="flex min-w-[76px] items-center gap-1.5">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${record.parameter_completeness >= 85 ? "bg-success" : record.parameter_completeness >= 60 ? "bg-warning" : "bg-danger"}`}
                      style={{ width: `${record.parameter_completeness}%` }}
                    />
                  </div>
                  <span className="font-semibold">
                    {Math.round(record.parameter_completeness)}%
                  </span>
                </div>
              </td>
              <td className="px-2">
                <ConfidenceBadge
                  level={confidenceLevel(record.ai_confidence)}
                  label={(record.ai_confidence / 100).toFixed(2)}
                  className="h-5 text-[9px]"
                />
              </td>
              <td className="px-2">
                <StatusBadge
                  status={uiStatus(record.review_status)}
                  className="h-5 text-[9px]"
                />
              </td>
              <td className="px-2">
                <RiskBadge
                  level={record.risk_level}
                  className="h-5 text-[9px]"
                />
              </td>
              <td className="max-w-[100px] px-2">
                <span
                  className="block truncate text-[10px] text-textSecondary"
                  title={sourceLabel(record.source_type)}
                >
                  {sourceLabel(record.source_type)}
                </span>
              </td>
              <td className="relative px-2">
                <div className="flex items-center justify-center gap-1">
                  <Link
                    href={`/equipment-catalog/${record.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-semibold text-primary hover:bg-primary-soft"
                  >
                    <Eye className="size-3.5" />
                    查看
                  </Link>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleRowMenu(record.id);
                    }}
                    className="inline-flex size-7 items-center justify-center rounded-md text-textMuted hover:bg-surfaceSubtle"
                    title="更多操作"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
                {rowMenuId === record.id ? (
                  <div className="absolute right-2 top-9 z-30 w-36 overflow-hidden rounded-md border border-borderSoft bg-white py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleRowMenu(record.id);
                        onAi(record.id);
                      }}
                      className="flex h-8 w-full items-center gap-2 px-3 text-left text-[10px] hover:bg-ai-soft"
                    >
                      <WandSparkles className="size-3.5 text-ai" />
                      AI参数补全
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleRowMenu(record.id);
                        onInquiry(record.id);
                      }}
                      className="flex h-8 w-full items-center gap-2 px-3 text-left text-[10px] hover:bg-primary-soft"
                    >
                      <Send className="size-3.5 text-primary" />
                      创建询价
                    </button>
                    <Link
                      href={`/project-pricing/boq-parse?source=equipment-catalog&catalogId=${encodeURIComponent(record.id)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleRowMenu(record.id);
                      }}
                      className="flex h-8 items-center gap-2 px-3 text-[10px] hover:bg-surfaceSubtle"
                    >
                      <GitCompareArrows className="size-3.5" />
                      BOQ智能匹配
                    </Link>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  tone,
}: {
  href: string;
  icon: typeof Database;
  label: string;
  tone: "blue" | "purple" | "cyan" | "orange";
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-2 rounded-md border border-borderSoft p-2 text-[9px] font-semibold text-textSecondary hover:border-primary/25 hover:bg-primary-soft hover:text-primary"
    >
      <IconBox icon={icon} tone={tone} size="sm" />
      {label}
    </Link>
  );
}

function CreateCatalogDialog({
  form,
  creating,
  onChange,
  onClose,
  onCreate,
}: {
  form: CreateForm;
  creating: boolean;
  onChange: (key: keyof CreateForm, value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const fields: Array<[keyof CreateForm, string, string]> = [
    ["equipmentName", "设备名称 *", "例如：卧式离心泵"],
    ["equipmentCategory", "设备类别", "例如：水泵设备"],
    ["brand", "品牌", "例如：KSB"],
    ["manufacturer", "制造商", "制造商法律名称"],
    ["productSeries", "产品系列", "例如：Etanorm"],
    ["model", "型号", "例如：80-250"],
    ["specification", "规格摘要", "流量、扬程、功率等关键规格"],
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-2xl overflow-hidden rounded-card border border-borderSoft bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
          <ModuleHeader
            icon={PackagePlus}
            title="新增设备资料草稿"
            subtitle="先建立型号主档，再补充参数、供应商和来源证据"
            density="compact"
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-surfaceSubtle"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {fields.map(([key, label, placeholder]) => (
            <label
              key={key}
              className={key === "specification" ? "sm:col-span-2" : ""}
            >
              <span className="mb-1 block text-[12px] font-semibold text-textSecondary">
                {label}
              </span>
              <input
                value={form[key]}
                onChange={(event) => onChange(key, event.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-md border border-borderSoft px-3 text-[13px] outline-none focus:border-primary"
              />
            </label>
          ))}
          <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-[12px] leading-5 text-textSecondary sm:col-span-2">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            新记录将以草稿状态保存，不能直接替代人工型号确认或商务判断。
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-borderSoft px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold"
          >
            取消
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={onCreate}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {creating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            创建草稿
          </button>
        </div>
      </section>
    </div>
  );
}
