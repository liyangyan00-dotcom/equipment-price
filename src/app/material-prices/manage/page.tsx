"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  Layers3,
  LineChart,
  MapPin,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiGrid } from "@/components/common/KpiGrid";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { DataTable } from "@/components/common/DataTable";
import { PriceCell } from "@/components/common/PriceCell";
import { TableActionGroup } from "@/components/common/TableActionGroup";
import { LoadingButton } from "@/components/common/LoadingButton";
import { MockExportDialog } from "@/components/common/MockExportDialog";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type { DataTableColumn, RiskLevel, ReviewStatus } from "@/types/common";
import {
  editableMaterialRecords,
  materialBatchReviewItems,
  materialCollectionSuggestions,
  materialManagementKpis,
  materialQualityStats,
  type EditableMaterialRecord,
} from "@/data/mock/materialPriceManagement";

type Filters = {
  keyword: string;
  category: string;
  region: string;
  source: string;
  confidence: string;
  risk: string;
  status: string;
};

const pageSize = 6;

const defaultFilters: Filters = {
  keyword: "",
  category: "全部",
  region: "全部",
  source: "全部",
  confidence: "全部",
  risk: "全部",
  status: "全部",
};

function firstLookupValue(value: string | null) {
  return decodeURIComponent((value ?? "").split(",")[0] ?? "").trim();
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase();
}

function resolveMaterialRecordId(records: EditableMaterialRecord[], lookup: string) {
  const normalized = normalizeLookup(lookup);
  if (!normalized) {
    return "";
  }

  return (
    records.find((record) =>
      [record.id, record.materialCode, record.materialName, record.specification, `${record.materialName}-${record.specification}`]
        .filter(Boolean)
        .some((candidate) => normalizeLookup(String(candidate)) === normalized)
    )?.id ??
    records.find((record) =>
      [record.id, record.materialCode, record.materialName, record.specification, record.supplierName]
        .filter(Boolean)
        .some((candidate) => normalizeLookup(String(candidate)).includes(normalized))
    )?.id ??
    ""
  );
}

const kpiIconConfig = [
  { icon: Database, tone: "blue" as const },
  { icon: CheckCircle2, tone: "orange" as const },
  { icon: Plus, tone: "green" as const },
  { icon: Sparkles, tone: "purple" as const },
  { icon: AlertTriangle, tone: "red" as const },
  { icon: MapPin, tone: "cyan" as const },
];

function uniqueOptions(records: EditableMaterialRecord[], key: keyof EditableMaterialRecord) {
  return ["全部", ...Array.from(new Set(records.map((item) => String(item[key] ?? "")).filter(Boolean)))];
}

function reviewStatusLabel(status: ReviewStatus) {
  return {
    pending: "待审核",
    need_info: "需补充",
    confirmed: "已确认",
    rejected: "已驳回",
    voided: "已作废",
  }[status];
}

function riskLabel(level: RiskLevel) {
  return {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
    critical: "严重风险",
  }[level];
}

function riskPillClass(level: RiskLevel) {
  return {
    low: "border-success/25 bg-success-soft text-success",
    medium: "border-warning/25 bg-warning-soft text-[#B45309]",
    high: "border-danger/25 bg-danger-soft text-danger",
    critical: "border-danger/35 bg-danger-soft text-danger",
  }[level];
}

function SmallRiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-pill border px-2 text-[12px] font-semibold", riskPillClass(level))}>
      <AlertTriangle className="size-3.5" aria-hidden="true" />
      {riskLabel(level)}
    </span>
  );
}

function selectClassName() {
  return "h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
}

export default function MaterialPricesManagePage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="p-4 text-[13px] font-semibold text-textMuted">正在加载地材价格维护交互页...</div>
        </AppLayout>
      }
    >
      <MaterialPricesManageContent />
    </Suspense>
  );
}

function MaterialPricesManageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useMockToast();
  const queryLookup =
    firstLookupValue(searchParams.get("materialId")) ||
    firstLookupValue(searchParams.get("materialIds")) ||
    firstLookupValue(searchParams.get("id"));
  const initialActiveId = resolveMaterialRecordId(editableMaterialRecords, queryLookup);
  const [records, setRecords] = useState<EditableMaterialRecord[]>(editableMaterialRecords);
  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    keyword: initialActiveId ? "" : queryLookup,
  }));
  const [appliedFilters, setAppliedFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    keyword: initialActiveId ? "" : queryLookup,
  }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState(initialActiveId || editableMaterialRecords[0]?.id || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);

  const categoryOptions = useMemo(() => uniqueOptions(records, "category"), [records]);
  const regionOptions = useMemo(() => uniqueOptions(records, "region"), [records]);
  const sourceOptions = useMemo(() => uniqueOptions(records, "source"), [records]);

  const filteredRecords = useMemo(() => {
    const keyword = appliedFilters.keyword.trim().toLowerCase();
    return records.filter((item) => {
      const text = [
        item.id,
        item.materialCode,
        item.materialName,
        item.specification,
        item.category,
        item.region,
        item.source,
        item.supplierName,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || text.includes(keyword)) &&
        (appliedFilters.category === "全部" || item.category === appliedFilters.category) &&
        (appliedFilters.region === "全部" || item.region === appliedFilters.region) &&
        (appliedFilters.source === "全部" || item.source === appliedFilters.source) &&
        (appliedFilters.confidence === "全部" || item.confidence === appliedFilters.confidence) &&
        (appliedFilters.risk === "全部" || item.riskLevel === appliedFilters.risk) &&
        (appliedFilters.status === "全部" || item.batchStatus === appliedFilters.status)
      );
    });
  }, [appliedFilters, records]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleRecords = filteredRecords.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const effectiveActiveId = filteredRecords.some((item) => item.id === activeId) ? activeId : filteredRecords[0]?.id;
  const activeRecord = records.find((item) => item.id === effectiveActiveId) ?? visibleRecords[0] ?? records[0];
  const allVisibleSelected = visibleRecords.length > 0 && visibleRecords.every((item) => selectedIds.includes(item.id));

  const kpiItems = materialManagementKpis.map((item, index) => ({
    ...item,
    icon: kpiIconConfig[index]?.icon ?? Database,
    tone: kpiIconConfig[index]?.tone ?? "blue",
  }));

  function applyFilters() {
    setAppliedFilters(filters);
    setCurrentPage(1);
    toast.info("已应用筛选", "地材价格管理表已按当前条件刷新。");
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setSelectedIds([]);
    setCurrentPage(1);
    toast.info("已重置筛选", "列表已恢复为全部地材价格记录。");
  }

  function applyQuickFilter(nextFilters: Partial<Filters>, title: string, description: string) {
    const merged = { ...defaultFilters, ...nextFilters };
    setFilters(merged);
    setAppliedFilters(merged);
    setSelectedIds([]);
    setCurrentPage(1);
    toast.info(title, description);
  }

  function toggleSelect(id: string) {
    setSelectedIds((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
    setActiveId(id);
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((items) => items.filter((id) => !visibleRecords.some((row) => row.id === id)));
      return;
    }
    setSelectedIds((items) => Array.from(new Set([...items, ...visibleRecords.map((row) => row.id)])));
  }

  function runAiClean() {
    setAiRunning(true);
    toast.ai("AI 正在整理地材价格", "正在补全缺失字段、识别异常价格并生成复核建议。");
    window.setTimeout(() => {
      setRecords((items) =>
        items.map((item, index) =>
          index < 3
            ? {
                ...item,
                completeness: Math.min(98, item.completeness + 6),
                batchStatus: "AI已整理",
                missingFields: ["无"],
              }
            : item
        )
      );
      setAiRunning(false);
      toast.success("AI整理完成", "3 条地材记录已完成字段清洗，可进入人工复核。");
    }, 900);
  }

  function bulkConfirm() {
    if (selectedIds.length === 0) {
      toast.warning("请选择记录", "批量审核前需要先勾选至少一条地材价格。");
      return;
    }
    router.push(`/material-prices/reviews?materialIds=${selectedIds.join(",")}&source=material-manage`);
  }

  function openEdit(record?: EditableMaterialRecord) {
    router.push(record ? `/material-prices/${record.id}/edit` : "/material-prices/create");
  }

  function createInquiry(record = activeRecord) {
    router.push(`/inquiries/create?materialIds=${record.id}&source=material-manage`);
  }

  function collectLead(record = activeRecord) {
    router.push(`/ai-price-collection?materialIds=${record.id}&source=material-manage`);
  }

  const columns: DataTableColumn<EditableMaterialRecord>[] = [
    {
      key: "select",
      header: "",
      className: "w-9",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(event) => event.stopPropagation()}
          className="size-4 rounded border-borderSoft accent-primary"
          aria-label={`选择 ${row.materialName}`}
        />
      ),
    },
    {
      key: "materialCode",
      header: "材料编号",
      render: (row) => (
        <Link href={`/material-prices/${row.id}?from=material-manage`} className="font-semibold text-primary hover:underline">
          {row.materialCode}
        </Link>
      ),
    },
    {
      key: "materialName",
      header: "材料名称",
      render: (row) => (
        <button
          type="button"
          onClick={() => setActiveId(row.id)}
          className="max-w-[150px] text-left"
          title={`${row.materialName} ${row.specification}`}
        >
          <span className="block truncate font-semibold text-textMain">{row.materialName}</span>
          <span className="block truncate text-[11px] text-textMuted">{row.specification}</span>
        </button>
      ),
    },
    { key: "category", header: "类别", render: (row) => <span className="rounded-pill bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">{row.category}</span> },
    { key: "region", header: "地区" },
    {
      key: "usdPrice",
      header: "折算美元价",
      align: "right",
      render: (row) => row.usdPrice === null ? <span className="text-textMuted">未记录</span> : <PriceCell value={row.usdPrice} currency="USD" unit={row.unit} className="text-[12px]" />,
    },
    { key: "supplierName", header: "供应商", render: (row) => <span className="line-clamp-1 max-w-[130px]" title={row.supplierName}>{row.supplierName}</span> },
    { key: "source", header: "来源", render: (row) => <span className="rounded-pill bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary">{row.source}</span> },
    {
      key: "confidence",
      header: "可信度",
      render: (row) => row.confidence ? <ConfidenceBadge level={row.confidence} label={`可信度 ${row.confidence}`} className="h-5 text-[11px]" /> : <span className="text-textMuted">未评估</span>,
    },
    {
      key: "riskLevel",
      header: "风险",
      render: (row) => <SmallRiskBadge level={row.riskLevel} />,
    },
    {
      key: "completeness",
      header: "资料完整度",
      render: (row) => (
        <div className="min-w-[92px]">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>{row.completeness}%</span>
            <span className={row.completeness >= 85 ? "text-success" : "text-warning"}>{row.batchStatus}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${row.completeness}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: "reviewStatus",
      header: "审核",
      render: (row) => <StatusBadge status={row.reviewStatus} label={reviewStatusLabel(row.reviewStatus)} className="h-5 text-[11px]" />,
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      render: (row) => (
        <TableActionGroup
          actions={[
            { label: "查看", icon: Search, tone: "primary", href: `/material-prices/${row.id}?from=material-manage` },
            { label: "编辑", icon: Edit3, onClick: () => openEdit(row) },
            { label: "采集", icon: Sparkles, tone: "ai", onClick: () => collectLead(row) },
            { label: "询价", icon: FileSpreadsheet, tone: "primary", onClick: () => createInquiry(row) },
          ]}
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title="地材价格资料维护"
          description="集中治理地材价格来源、地区、有效期、AI采集线索与人工复核状态。"
          actions={
            <>
              <LoadingButton tone="ghost" icon={<ChevronLeft className="size-4" />} onClick={() => router.push("/material-prices")}>
                返回价格库
              </LoadingButton>
              <LoadingButton icon={<Plus className="size-4" />} onClick={() => openEdit()}>
                新增地材价格
              </LoadingButton>
              <LoadingButton tone="warning" icon={<CheckCircle2 className="size-4" />} onClick={() => router.push("/material-prices/reviews")}>
                价格审核
              </LoadingButton>
              <LoadingButton tone="ai" icon={<Sparkles className="size-4" />} loading={aiRunning} onClick={runAiClean}>
                AI整理记录
              </LoadingButton>
            </>
          }
        />

        <KpiGrid items={kpiItems} />

        <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
          <div className="grid items-end gap-2 xl:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.75fr_auto_auto]">
            <label className="block">
              <span className="text-[11px] font-semibold text-textSecondary">关键词</span>
              <div className="mt-1 flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3">
                <Search className="size-4 text-textMuted" />
                <input
                  value={filters.keyword}
                  onChange={(event) => setFilters((items) => ({ ...items, keyword: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyFilters();
                    }
                  }}
                  placeholder="材料名称、规格、供应商"
                  className="h-full min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                />
              </div>
            </label>
            {[
              ["材料类别", "category", categoryOptions],
              ["地区", "region", regionOptions],
              ["来源", "source", sourceOptions],
              ["可信度", "confidence", ["全部", "A", "B", "C", "D", "E"]],
              ["风险", "risk", ["全部", "low", "medium", "high", "critical"]],
              ["状态", "status", ["全部", "待审核", "已确认", "需补充", "AI已整理"]],
            ].map(([label, key, options]) => (
              <label key={String(key)} className="block">
                <span className="text-[11px] font-semibold text-textSecondary">{String(label)}</span>
                <select
                  value={filters[key as keyof Filters]}
                  onChange={(event) => setFilters((items) => ({ ...items, [key as keyof Filters]: event.target.value }))}
                  className={cn("mt-1 w-full", selectClassName())}
                >
                  {(options as string[]).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <LoadingButton className="h-9 px-3" icon={<Filter className="size-4" />} onClick={applyFilters}>
              查询
            </LoadingButton>
            <LoadingButton className="h-9 px-3" tone="ghost" icon={<RotateCcw className="size-4" />} onClick={resetFilters}>
              重置
            </LoadingButton>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-2">
            <DataTable
              data={visibleRecords}
              columns={columns}
              rowKey="id"
              density="compact"
              emptyTitle="没有匹配的地材价格"
              emptyDescription="请调整关键词、地区、来源或风险条件后重新查询。"
              rowClassName={(row) => (row.id === activeRecord?.id ? "bg-primary-soft/40" : "")}
              actions={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ModuleHeader
                    icon={Layers3}
                    title="地材价格治理表"
                    subtitle={`共 ${filteredRecords.length} 条，已选 ${selectedIds.length} 条`}
                    density="compact"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-8 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} className="size-4 accent-primary" />
                      本页全选
                    </label>
                    <LoadingButton className="h-8 px-3" tone="ghost" icon={<Upload className="size-4" />} onClick={() => router.push("/material-prices/import")}>
                      导入调研表
                    </LoadingButton>
                    <LoadingButton className="h-8 px-3" tone="ai" icon={<Bot className="size-4" />} loading={aiRunning} onClick={runAiClean}>
                      AI补全字段
                    </LoadingButton>
                    <LoadingButton className="h-8 px-3" tone="success" icon={<CheckCircle2 className="size-4" />} onClick={bulkConfirm}>
                      批量审核
                    </LoadingButton>
                    <LoadingButton className="h-8 px-3" tone="ghost" icon={<Download className="size-4" />} onClick={() => setExportOpen(true)}>
                      导出
                    </LoadingButton>
                  </div>
                </div>
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-borderSoft bg-card px-3 py-2 text-[12px] text-textSecondary shadow-card">
              <span>
                共 {filteredRecords.length} 条，当前第 {safeCurrentPage} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="上一页"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-md border text-[12px] font-bold",
                        safeCurrentPage === page ? "border-primary bg-primary text-white shadow-blue" : "border-borderSoft bg-white text-textSecondary hover:border-primary/40"
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="下一页"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft/70 p-4 shadow-card">
              <ModuleHeader
                icon={Sparkles}
                title="AI地材治理助手"
                subtitle="随选中记录联动判断"
                tone="purple"
                action={<span className="rounded-pill bg-ai-soft px-2 py-1 text-[11px] font-bold text-ai">AI建议</span>}
              />
              {activeRecord ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-card border border-borderSoft bg-white p-3">
                    <p className="text-[13px] font-bold text-textMain">{activeRecord.materialName} {activeRecord.specification}</p>
                    <p className="mt-1 text-[12px] leading-5 text-textMuted">{activeRecord.aiSuggestion}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeRecord.confidence ? <ConfidenceBadge level={activeRecord.confidence} label={`可信度 ${activeRecord.confidence}`} className="h-5 text-[11px]" /> : <span className="text-xs text-textMuted">未评估</span>}
                      <SmallRiskBadge level={activeRecord.riskLevel} />
                    </div>
                  </div>
                  <div className="rounded-card border border-warning/20 bg-warning-soft/70 p-3">
                    <p className="text-[12px] font-bold text-[#B45309]">缺失字段</p>
                    <p className="mt-1 text-[12px] text-textSecondary">{activeRecord.missingFields.join("、")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <LoadingButton className="h-8 px-2 text-[12px]" tone="ghost" icon={<Edit3 className="size-4" />} onClick={() => openEdit(activeRecord)}>
                      补充资料
                    </LoadingButton>
                    <LoadingButton className="h-8 px-2 text-[12px]" tone="ai" icon={<Sparkles className="size-4" />} onClick={() => collectLead(activeRecord)}>
                      AI采集
                    </LoadingButton>
                    <LoadingButton className="col-span-2 h-8 px-2 text-[12px]" icon={<FileSpreadsheet className="size-4" />} onClick={() => createInquiry(activeRecord)}>
                      创建询价任务
                    </LoadingButton>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={PackageCheck} title="待处理清单" subtitle="资料治理与人工复核" density="compact" />
              <div className="mt-3 space-y-2">
                {materialBatchReviewItems.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => toast.info("已定位处理项", item.meta)}
                    className="w-full rounded-card border border-borderSoft bg-white p-3 text-left transition hover:border-primary/40 hover:bg-primary-soft/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-textMain">{item.title}</span>
                      <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-[#B45309]">{item.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-textMuted">{item.meta}</p>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
            <ModuleHeader icon={BarChart3} title="AI市场调研整理" subtitle="采集来源与入库质量" density="compact" tone="cyan" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {materialQualityStats.map((item) => (
                <div key={item.label} className="rounded-card border border-borderSoft bg-white p-3 text-center">
                  <p className={cn("text-[20px] font-bold", item.tone === "green" ? "text-success" : item.tone === "orange" ? "text-warning" : "text-ai")}>{item.value}</p>
                  <p className="mt-1 text-[11px] text-textMuted">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {materialCollectionSuggestions.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => router.push(`/ai-price-collection?keyword=${encodeURIComponent(item.title)}&source=material-manage`)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-borderSoft bg-white px-3 py-2 text-left hover:border-ai/40 hover:bg-ai-soft"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-textMain">{item.title}</span>
                    <span className="block truncate text-[11px] text-textMuted">{item.description}</span>
                  </span>
                  <span className="shrink-0 rounded-pill bg-ai-soft px-2 py-0.5 text-[11px] font-bold text-ai">{item.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
            <ModuleHeader icon={LineChart} title="AI价格波动分析" subtitle="近30天主要材料走势" density="compact" tone="blue" />
            <div className="mt-4 h-24 rounded-card bg-gradient-to-br from-primary-soft to-white p-3">
              <svg viewBox="0 0 260 80" className="h-full w-full">
                <polyline points="5,58 55,50 105,43 155,48 205,28 255,20" fill="none" stroke="#2F6BFF" strokeWidth="4" strokeLinecap="round" />
                <polyline points="5,65 55,61 105,55 155,51 205,44 255,38" fill="none" stroke="#22A06B" strokeWidth="3" strokeLinecap="round" />
                <polyline points="5,70 55,66 105,63 155,58 205,54 255,48" fill="none" stroke="#7E3AF2" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="mt-3 space-y-2 text-[12px]">
              {["钢筋 HRB400 ↑18.7%", "柴油 ENS90 ↑28.4%", "水泥 42.5R ↑12.7%"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-md bg-[var(--color-muted-soft)] px-3 py-2">
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => applyQuickFilter({ keyword: item.split(" ")[0] }, "已筛选波动材料", `${item} 已同步到地材价格治理表。`)}
                    className="font-bold text-primary"
                  >
                    查看
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
            <ModuleHeader icon={MapPin} title="AI地区价格对比建议" subtitle="区域价差与采购建议" density="compact" tone="green" />
            <div className="mt-4 space-y-3">
              {[
                ["Kinshasa", "3.69", "优先采购", 92],
                ["Matadi", "3.12", "就近采购", 78],
                ["Goma", "4.08", "关注运输", 66],
              ].map(([city, price, desc, width]) => (
                <div key={city}>
                  <div className="flex justify-between text-[12px] font-semibold">
                    <span>{city}</span>
                    <span>{price} USD/袋</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-textMuted">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-warning/20 bg-card p-4 shadow-card">
            <ModuleHeader icon={AlertTriangle} title="AI价格缺口预警" subtitle="缺口 Top5 与复核动作" density="compact" tone="orange" />
            <div className="mt-4 space-y-2">
              {[
                ["钢筋（60/70）", "高", "danger"],
                ["木方（50x100mm）", "中", "warning"],
                ["PVC管（DN160）", "低", "success"],
              ].map(([name, level, tone]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => router.push(`/ai-price-collection?keyword=${encodeURIComponent(name)}&source=material-gap`)}
                  className="flex w-full items-center justify-between rounded-md border border-borderSoft bg-white px-3 py-2 hover:border-warning/40"
                >
                  <span className="text-[12px] font-bold text-textMain">{name}</span>
                  <span className={cn("rounded-pill px-2 py-0.5 text-[11px] font-bold", tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-[#B45309]" : "bg-success-soft text-success")}>
                    {level}
                  </span>
                </button>
              ))}
            </div>
            <LoadingButton
              className="mt-4 h-8 w-full"
              tone="warning"
              icon={<AlertTriangle className="size-4" />}
              onClick={() => applyQuickFilter({ risk: "high" }, "已筛选缺口预警", "列表已聚焦高风险缺口材料，可继续采集或创建询价。")}
            >
              查看全部预警
            </LoadingButton>
          </section>
        </div>
      </div>

      <MockExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(format) => {
          setExportOpen(false);
          toast.success("已创建导出任务", `地材价格治理表将以 ${format} 格式生成。`);
        }}
      />
    </AppLayout>
  );
}
