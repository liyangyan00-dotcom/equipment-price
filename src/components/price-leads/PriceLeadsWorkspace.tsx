"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  LoaderCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { RouteContextBanner } from "@/components/common/RouteContextBanner";
import { PriceLeadReviewGovernance } from "@/components/price-leads/PriceLeadReviewGovernance";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import { localizePriceRegion } from "@/lib/priceCollection/localization";
import type {
  PriceCollectionLeadDetailResponse,
  PriceCollectionLeadPoolResponse,
  PriceCollectionLeadRecord,
  PriceCollectionRisk,
} from "@/types/priceCollection";

type Tone = "blue" | "orange" | "green" | "cyan" | "slate" | "red" | "purple";
type LeadType = "设备" | "地材";
type LeadStatus = "待确认" | "可入库" | "已入库" | "已作废";
type RiskLabel = "低风险" | "中风险" | "高风险" | "严重风险";
type Confidence = "高" | "中" | "低";
type AdmissionIssue = "全部" | "admission" | "missing_evidence" | "missing_fx" | "duplicate" | "stale_source" | "invalid_fields" | "critical_risk";

type PriceLead = {
  databaseId: string;
  id: string;
  type: LeadType;
  name: string;
  originalName: string;
  spec: string;
  originalSpec: string;
  source: string;
  sourceType: string;
  sourceDetail: string;
  price: number;
  currency: string;
  unit: string;
  region: string;
  aiMatch: number;
  confidenceScore: number;
  confidence: Confidence;
  status: LeadStatus;
  supplier: string;
  risk: RiskLabel;
  riskValue: PriceCollectionRisk;
  duplicate: boolean;
  evidenceCode: string;
  fxStatus: PriceCollectionLeadRecord["fxStatus"];
  normalizedPriceCny: number | null;
  priceValidityStatus: PriceCollectionLeadRecord["priceValidityStatus"];
  sourceCheckedAt: string;
  quoteDate: string;
  pricePeriodGranularity: PriceCollectionLeadRecord["pricePeriodGranularity"];
  createdAt: string;
  reviewedAt: string;
  transferredAt: string;
  reviewNotes: string;
  assignedReviewerId: string | null;
  assignedAt: string;
  assignmentNote: string;
  reviewDueAt: string;
  missingFields: string[];
};

type FilterState = {
  keyword: string;
  type: "全部" | LeadType;
  source: string;
  region: string;
  status: "全部" | LeadStatus;
  risk: "全部" | RiskLabel;
  minMatch: string;
  maxMatch: string;
  dateFrom: string;
  dateTo: string;
  assignee: string;
  issue: AdmissionIssue;
};

type DistributionItem = { label: string; displayLabel?: string; value: number; count: number; color: string };
type KpiItem = {
  title: string;
  value: number;
  unit: string;
  trend: string;
  icon: LucideIcon;
  tone: Tone;
  filter: "all" | "pending" | "ready" | "transferring" | "transferred" | "risk";
};

const emptyFilters: FilterState = {
  keyword: "",
  type: "全部",
  source: "全部",
  region: "全部",
  status: "全部",
  risk: "全部",
  minMatch: "",
  maxMatch: "",
  dateFrom: "",
  dateTo: "",
  assignee: "全部",
  issue: "全部",
};

const toneText: Record<Tone, string> = {
  blue: "text-primary",
  orange: "text-warning",
  green: "text-success",
  cyan: "text-[#0EA5E9]",
  slate: "text-slate-500",
  red: "text-danger",
  purple: "text-ai",
};
const toneSoft: Record<Tone, string> = {
  blue: "from-[#EFF6FF] via-white to-[#DCEBFF] border-primary/15",
  orange: "from-[#FFF7ED] via-white to-[#FFE8C7] border-warning/20",
  green: "from-[#ECFDF5] via-white to-[#D8F7E8] border-success/20",
  cyan: "from-[#EFFBFF] via-white to-[#D9F4FF] border-cyan-300/30",
  slate: "from-[#F8FAFC] via-white to-[#EEF3F8] border-slate-200",
  red: "from-[#FFF1F2] via-white to-[#FFE0E0] border-danger/20",
  purple: "from-[#F6F2FF] via-white to-[#E9DFFF] border-ai/20",
};
const iconTone: Record<Tone, IconBoxTone> = {
  blue: "blue",
  orange: "orange",
  green: "green",
  cyan: "cyan",
  slate: "slate",
  red: "red",
  purple: "purple",
};

const sourceColors = ["#2F6BFF", "#18B89B", "#7B61FF", "#F5A623", "#EF5A5A", "#64748B"];
const statusColors: Record<LeadStatus, string> = {
  待确认: "#F59E0B",
  可入库: "#24B26B",
  已入库: "#2F6BFF",
  已作废: "#94A3B8",
};

function sourceTypeLabel(sourceType: string) {
  const labels: Record<string, string> = {
    ai_quote_recognition: "AI解析文件",
    quote_upload: "供应商报价",
    supplier_quote: "供应商报价",
    manufacturer_website: "制造商官网",
    marketplace: "电商平台",
    tender: "招投标文件",
    public_tender: "招投标文件",
    api: "授权 API",
    manual: "人工录入",
  };
  return labels[sourceType] ?? (sourceType || "未标注来源");
}

function statusLabel(status: PriceCollectionLeadRecord["status"]): LeadStatus {
  if (status === "ready") return "可入库";
  if (status === "transferred") return "已入库";
  if (status === "rejected") return "已作废";
  return "待确认";
}

function riskLabel(risk: PriceCollectionRisk): RiskLabel {
  if (risk === "critical") return "严重风险";
  if (risk === "high") return "高风险";
  if (risk === "medium") return "中风险";
  return "低风险";
}

function confidenceLabel(score: number): Confidence {
  if (score >= 85) return "高";
  if (score >= 65) return "中";
  return "低";
}

function leadReviewChecks(lead: PriceLead, strongestHistoryMatch = 0) {
  const duplicateDetected = lead.duplicate || strongestHistoryMatch >= 85;
  const sourceCheckedAt = lead.sourceCheckedAt ? new Date(lead.sourceCheckedAt) : null;
  const sourceFresh = Boolean(sourceCheckedAt && !Number.isNaN(sourceCheckedAt.getTime()) && Date.now() - sourceCheckedAt.getTime() <= 180 * 86_400_000);
  const fxReady = lead.currency.toUpperCase() === "CNY" || (lead.fxStatus === "verified" && Number(lead.normalizedPriceCny) > 0);
  return [
    { label: "字段有效性", ready: lead.priceValidityStatus === "valid", detail: lead.priceValidityStatus === "valid" ? "名称、规格、单位和价格口径完整" : "字段有效性准入未通过" },
    { label: "来源证据", ready: Boolean(lead.evidenceCode) && lead.sourceDetail !== "来源证据待补充", detail: Boolean(lead.evidenceCode) ? `已关联 ${lead.evidenceCode}` : "缺少持久化来源证据" },
    { label: "汇率核验", ready: fxReady, detail: fxReady ? (lead.currency.toUpperCase() === "CNY" ? "人民币无需换算" : `已核验标准价 ¥${Number(lead.normalizedPriceCny).toLocaleString("zh-CN")}`) : `${lead.currency} 尚未配置可用的 CNY 汇率` },
    { label: "来源有效期", ready: sourceFresh, detail: sourceFresh ? "来源核验时间在 180 天内" : "来源未核验或已超过 180 天" },
    { label: "规格参数", ready: lead.spec !== "待补充", detail: lead.spec !== "待补充" ? lead.spec : "规格型号待补充" },
    { label: "供应商主体", ready: lead.supplier !== "待补充", detail: lead.supplier !== "待补充" ? lead.supplier : "供应商主体待核验" },
    { label: "地区与单位", ready: lead.region !== "待补充" && Boolean(lead.unit), detail: lead.region !== "待补充" && lead.unit ? `${lead.region} · ${lead.unit}` : "地区或计价单位不完整" },
    { label: "重复检查", ready: !duplicateDetected, detail: duplicateDetected ? `历史价格相似度 ${Math.max(strongestHistoryMatch, 85).toFixed(0)}%，需人工核对` : "未发现强重复记录" },
  ];
}

function isLeadReviewReady(lead: PriceLead) {
  return leadReviewChecks(lead).every((item) => item.ready) && lead.riskValue !== "critical";
}

function mapLead(row: PriceCollectionLeadRecord): PriceLead {
  const missingFields = [
    !row.specification && "规格型号",
    !row.supplierName && "供应商",
    !row.region && "地区",
    !row.sourceUrl && "来源链接",
    row.targetType === "material" && !row.originalUnit && "计价单位",
  ].filter((value): value is string => Boolean(value));
  return {
    databaseId: row.id,
    id: row.leadCode,
    type: row.targetType === "material" ? "地材" : "设备",
    name: row.translatedName || row.name,
    originalName: row.originalName || row.name,
    spec: row.translatedSpecification || row.specification || "待补充",
    originalSpec: row.originalSpecification || row.specification || "待补充",
    source: sourceTypeLabel(row.sourceType),
    sourceType: row.sourceType,
    sourceDetail: row.sourceUrl || row.evidenceCode || "来源证据待补充",
    price: row.price,
    currency: row.currency || "CNY",
    unit: row.originalUnit || "",
    region: localizePriceRegion(row.region || "待补充"),
    aiMatch: Math.round(row.aiMatchScore || row.confidence || 0),
    confidenceScore: Math.round(row.confidence || 0),
    confidence: confidenceLabel(row.confidence || 0),
    status: statusLabel(row.status),
    supplier: row.supplierName || "待补充",
    risk: riskLabel(row.riskLevel),
    riskValue: row.riskLevel,
    duplicate: row.duplicateStatus === "suspected_duplicate",
    evidenceCode: row.evidenceCode,
    fxStatus: row.fxStatus,
    normalizedPriceCny: row.normalizedPriceCny,
    priceValidityStatus: row.priceValidityStatus,
    sourceCheckedAt: row.sourceCheckedAt,
    quoteDate: row.quoteDate,
    pricePeriodGranularity: row.pricePeriodGranularity,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    transferredAt: row.transferredAt,
    reviewNotes: row.reviewNotes,
    assignedReviewerId: row.assignedReviewerId,
    assignedAt: row.assignedAt,
    assignmentNote: row.assignmentNote,
    reviewDueAt: row.reviewDueAt,
    missingFields,
  };
}

function formatPricePeriod(lead: Pick<PriceLead, "quoteDate" | "pricePeriodGranularity">) {
  if (!lead.quoteDate) return "所属期待核验";
  const value = new Date(`${lead.quoteDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(value.getTime())) return lead.quoteDate;
  return lead.pricePeriodGranularity === "month"
    ? `${value.getFullYear()}年${value.getMonth() + 1}月`
    : value.toLocaleDateString("zh-CN");
}

function MonthlyTrendCard({ data, currency }: {
  data: PriceCollectionLeadDetailResponse["monthlyTrend"];
  currency: string;
}) {
  const values = data.map((item) => item.averagePrice);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 0;
  const width = 320;
  const height = 86;
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : 10 + index * ((width - 20) / (data.length - 1));
    const y = maximum === minimum ? height / 2 : 8 + (maximum - item.averagePrice) / (maximum - minimum) * (height - 20);
    return { ...item, x, y };
  });
  const latest = data.at(-1);
  return (
    <section className="rounded-[12px] border border-borderSoft p-3">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="inline-flex items-center gap-1.5 text-[13px] font-bold"><TrendingUp className="size-4 text-primary" />月度价格趋势</h3><p className="mt-1 text-[10px] text-textMuted">同品名、同规格、同地区、同币种</p></div>
        {latest?.monthOverMonthPct != null ? <span className={cn("rounded-md px-2 py-1 text-[10px] font-bold", latest.monthOverMonthPct > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>环比 {latest.monthOverMonthPct > 0 ? "+" : ""}{latest.monthOverMonthPct.toFixed(1)}%</span> : null}
      </div>
      {data.length ? <>
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-[86px] w-full" role="img" aria-label="月度价格趋势图">
          <line x1="10" y1={height - 8} x2={width - 10} y2={height - 8} stroke="#E2E8F0" />
          {points.length > 1 ? <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" /> : null}
          {points.map((point) => <circle key={point.month} cx={point.x} cy={point.y} r="4" fill="#2563EB"><title>{point.month} · {currency} {point.averagePrice.toLocaleString("zh-CN")} · {point.sampleCount} 个样本</title></circle>)}
        </svg>
        <div className="flex justify-between text-[10px] text-textMuted"><span>{data[0].month}</span><span>{data.length < 2 ? "仅 1 个月，暂不能判断波动" : `${data.length} 个月 · 最新 ${currency} ${latest?.averagePrice.toLocaleString("zh-CN")}`}</span><span>{latest?.month}</span></div>
      </> : <div className="mt-3 rounded-[8px] bg-slate-50 px-3 py-4 text-center text-[11px] text-textMuted">来源未提供价格所属期，暂不能生成月度趋势。</div>}
    </section>
  );
}

function KpiCard({ item, onClick }: { item: KpiItem; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("h-[100px] rounded-card border bg-gradient-to-br p-3.5 text-left shadow-card transition hover:-translate-y-0.5", toneSoft[item.tone])}>
      <div className="flex h-full items-center gap-3">
        <IconBox icon={item.icon} tone={iconTone[item.tone]} size="lg" className="size-12 rounded-[14px]" />
        <div className="min-w-0 flex-1">
          <div className={cn("text-[12px] font-semibold", toneText[item.tone])}>{item.title}</div>
          <div className="mt-1 flex items-end gap-1">
            <strong className={cn("text-[27px] leading-none", toneText[item.tone])}>{item.value.toLocaleString()}</strong>
            <span className={cn("pb-0.5 text-[12px] font-semibold", toneText[item.tone])}>{item.unit}</span>
          </div>
          <div className="mt-2 truncate text-[11px] text-textSecondary">{item.trend}</div>
        </div>
      </div>
    </button>
  );
}

function TypeBadge({ type }: { type: LeadType }) {
  return <span className={cn("inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-[7px] border px-2 text-[11px] font-semibold", type === "设备" ? "border-primary/20 bg-primary-soft text-primary" : "border-ai/20 bg-ai-soft text-ai")}>{type}</span>;
}

function ConfidenceBadge({ value }: { value: Confidence }) {
  const cls = value === "高" ? "border-success/20 bg-success/10 text-success" : value === "中" ? "border-warning/25 bg-warning/10 text-warning" : "border-danger/20 bg-danger/10 text-danger";
  return <span className={cn("inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-[7px] border px-2 text-[11px] font-semibold", cls)}>{value}</span>;
}

function StatusBadge({ value }: { value: LeadStatus }) {
  const cls = value === "可入库" ? "border-success/20 bg-success/10 text-success" : value === "待确认" ? "border-warning/25 bg-warning/10 text-warning" : value === "已入库" ? "border-primary/20 bg-primary-soft text-primary" : "border-slate-200 bg-slate-100 text-slate-500";
  return <span className={cn("inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-[7px] border px-2 text-[11px] font-semibold", cls)}>{value}</span>;
}

function DonutCard({ title, total, items, onSelect }: { title: string; total: number; items: DistributionItem[]; onSelect: (label: string) => void }) {
  const circumference = 264;
  const segments = items.map((item, index) => {
    const length = (item.value / 100) * circumference;
    const consumed = items.slice(0, index).reduce((sum, previous) => sum + (previous.value / 100) * circumference, 0);
    return { ...item, length, offset: -consumed };
  });
  return (
    <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">{title}</h3>
        <button type="button" onClick={() => onSelect("全部")} className="text-[12px] font-semibold text-primary">清除筛选 ›</button>
      </div>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 120 120" className="size-[118px] shrink-0">
          <circle cx="60" cy="60" r="42" fill="none" stroke="#EDF2F7" strokeWidth="16" />
          {segments.map((item) => <circle key={item.label} cx="60" cy="60" r="42" fill="none" stroke={item.color} strokeDasharray={`${item.length} ${circumference - item.length}`} strokeDashoffset={item.offset} strokeWidth="16" transform="rotate(-90 60 60)" />)}
          <text x="60" y="56" textAnchor="middle" className="fill-textMain text-[17px] font-bold">{total.toLocaleString()}</text>
          <text x="60" y="74" textAnchor="middle" className="fill-textSecondary text-[9px]">当前线索</text>
        </svg>
        <div className="min-w-0 flex-1 space-y-2">
          {items.length ? items.map((item) => (
            <button key={item.label} type="button" onClick={() => onSelect(item.label)} className="grid w-full grid-cols-[9px_1fr_auto] items-center gap-2 text-left text-[11px]">
              <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.displayLabel ?? item.label}</span>
              <strong>{item.value.toFixed(1)}%（{item.count}）</strong>
            </button>
          )) : <span className="text-[12px] text-textMuted">暂无可统计数据</span>}
        </div>
      </div>
    </section>
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "请求失败");
  return payload;
}

async function fetchPriceLeads(
  filters: FilterState,
  page: number,
  pageSize: number,
  taskId = "",
) {
  const params = new URLSearchParams({ view: "lead_pool", page: String(page), pageSize: String(pageSize) });
  if (taskId) {
    params.set("taskId", taskId);
    params.set("validity", "all");
  }
  const requestedId = new URLSearchParams(window.location.search).get("leadId");
  if (requestedId) params.set("leadId", requestedId);
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.type !== "全部") params.set("type", filters.type);
  if (filters.source !== "全部") params.set("source", filters.source);
  if (filters.region !== "全部") params.set("region", filters.region);
  if (filters.status !== "全部") params.set("status", filters.status);
  if (filters.risk !== "全部") params.set("risk", filters.risk);
  if (filters.minMatch) params.set("minMatch", filters.minMatch);
  if (filters.maxMatch) params.set("maxMatch", filters.maxMatch);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.assignee !== "全部") params.set("assignee", filters.assignee);
  if (filters.issue !== "全部") {
    params.set("issue", filters.issue);
    params.set("validity", "all");
  }
  const data = await readJson<PriceCollectionLeadPoolResponse>(await fetch(`/api/price-collection?${params.toString()}`, { cache: "no-store" }));
  return { data, records: data.leads.map(mapLead), requestedId };
}

async function fetchLeadDetail(leadId: string) {
  const params = new URLSearchParams({ view: "lead_detail", leadId });
  return readJson<PriceCollectionLeadDetailResponse>(await fetch(`/api/price-collection?${params.toString()}`, { cache: "no-store" }));
}

export function PriceLeadsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopedTaskId = searchParams.get("taskId")?.trim() ?? "";
  const toast = useMockToast();
  const [bootstrap, setBootstrap] = useState<PriceCollectionLeadPoolResponse | null>(null);
  const [leadDetail, setLeadDetail] = useState<PriceCollectionLeadDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [records, setRecords] = useState<PriceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [applied, setApplied] = useState<FilterState>(emptyFilters);
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PriceLead | null>(null);
  const [confirmAction, setConfirmAction] = useState<"store" | "void" | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<"ai" | "review" | "transfer" | "reject" | "update" | "assign" | "snapshot" | "resolve_duplicate" | "refresh_admission" | "" >("");
  const [transferringIds, setTransferringIds] = useState<string[]>([]);
  const pageSize = 10;

  useEffect(() => {
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const typeParam = searchParams.get("objectType") || searchParams.get("type");
    const type = typeParam === "equipment" ? "设备" : typeParam === "material" ? "地材" : "全部";
    const riskParam = searchParams.get("risk");
    const risk = riskParam === "high" ? "高风险" : riskParam === "critical" ? "严重风险" : "全部";
    const statusParam = searchParams.get("status");
    const status = (["待确认", "可入库", "已入库", "已作废"] as const).includes(statusParam as LeadStatus) ? statusParam as LeadStatus : "全部";
    const issueParam = searchParams.get("issue");
    const issue = (["admission", "missing_evidence", "missing_fx", "duplicate", "stale_source", "invalid_fields", "critical_risk"] as const).includes(issueParam as Exclude<AdmissionIssue, "全部">) ? issueParam as AdmissionIssue : "全部";
    if (!dateFrom && !dateTo && type === "全部" && risk === "全部" && status === "全部" && issue === "全部") return;
    const next = { ...emptyFilters, dateFrom, dateTo, type, risk, status, issue } as FilterState;
    const timer = window.setTimeout(() => {
      setFilters(next);
      setApplied(next);
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const loadRecords = useCallback(async (announce = false) => {
    setLoading(true);
    setLoadError("");
    try {
      const { data, records: next, requestedId } = await fetchPriceLeads(applied, page, pageSize, scopedTaskId);
      setBootstrap(data);
      setRecords(next);
      setSelectedId((current) => {
        const preferred = requestedId && next.find((item) => item.id === requestedId || item.databaseId === requestedId)?.databaseId;
        return preferred || (next.some((item) => item.databaseId === current) ? current : next[0]?.databaseId || "");
      });
      setCheckedIds((current) => current.filter((id) => next.some((item) => item.databaseId === id)));
      if (announce) toast.success("价格线索已刷新", `服务端返回第 ${data.pagination.page} 页，共 ${data.pagination.total} 条业务数据。`);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "价格线索加载失败");
    } finally {
      setLoading(false);
    }
  }, [applied, page, scopedTaskId, toast]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRecords]);

  const selected = records.find((item) => item.databaseId === selectedId) ?? records[0];
  const loadSelectedDetail = useCallback(async () => {
    if (!selectedId) {
      setLeadDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      setLeadDetail(await fetchLeadDetail(selectedId));
    } catch (error) {
      setLeadDetail(null);
      toast.danger("线索审核详情加载失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId, toast]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSelectedDetail(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSelectedDetail]);

  const detailMatchesSelection = Boolean(leadDetail && selected && leadDetail.lead.id === selected.databaseId);
  const selectedHistoryMatches = detailMatchesSelection ? leadDetail?.historyMatches ?? [] : [];
  const selectedEvidence = detailMatchesSelection ? leadDetail?.evidence ?? [] : [];
  const strongestHistoryMatch = selectedHistoryMatches[0]?.matchScore ?? 0;
  const selectedChecks = useMemo(() => selected ? leadReviewChecks(selected, strongestHistoryMatch) : [], [selected, strongestHistoryMatch]);
  const selectedReady = selectedChecks.length > 0 && selectedChecks.every((item) => item.ready) && selected?.riskValue !== "critical";
  const confirmStoreTypes = Array.from(new Set(records.filter((item) => confirmIds.includes(item.databaseId)).map((item) => item.type)));
  const confirmStoreTarget = confirmStoreTypes.length === 1 ? confirmStoreTypes[0] : null;
  const confirmStoreLabel = confirmStoreTarget ? `确认并转入${confirmStoreTarget}价格库` : "确认并入库";
  const sources = bootstrap?.availableSourceTypes ?? [];
  const regions = bootstrap?.availableRegions ?? [];
  const filtered = records;
  const pageCount = bootstrap?.pagination.pageCount ?? 1;
  const visible = records;
  const allVisibleChecked = visible.length > 0 && visible.every((item) => checkedIds.includes(item.databaseId));
  const actionRecords = useMemo(() => {
    const ids = checkedIds.length ? checkedIds : selected ? [selected.databaseId] : [];
    return records.filter((item) => ids.includes(item.databaseId));
  }, [checkedIds, records, selected]);

  const kpis = useMemo<KpiItem[]>(() => [
    { title: "全部线索", value: bootstrap?.summary.total ?? 0, unit: "条", trend: "服务端筛选实时总量", icon: Database, tone: "blue", filter: "all" },
    { title: "待人工确认", value: bootstrap?.summary.pending ?? 0, unit: "条", trend: `未分派 ${bootstrap?.summary.unassigned ?? 0} 条`, icon: Clock3, tone: "orange", filter: "pending" },
    { title: "可入库", value: bootstrap?.summary.ready ?? 0, unit: "条", trend: "已通过人工确认", icon: CheckCircle2, tone: "green", filter: "ready" },
    { title: "入库处理中", value: transferringIds.length, unit: "条", trend: busyAction === "transfer" ? "正在原子写入价格库" : "当前无执行任务", icon: LoaderCircle, tone: "purple", filter: "transferring" },
    { title: "已入库", value: bootstrap?.summary.transferred ?? 0, unit: "条", trend: "已进入正式价格库", icon: Database, tone: "cyan", filter: "transferred" },
    { title: "高风险线索", value: bootstrap?.summary.highRisk ?? 0, unit: "条", trend: "必须人工复核", icon: ShieldAlert, tone: "red", filter: "risk" },
  ], [bootstrap, busyAction, transferringIds.length]);

  const sourceDistribution = useMemo<DistributionItem[]>(() => {
    const total = bootstrap?.summary.total ?? 0;
    return (bootstrap?.sourceDistribution ?? []).slice(0, 6).map((item, index) => ({
      label: item.label,
      displayLabel: sourceTypeLabel(item.label),
      count: item.count,
      value: total ? item.count / total * 100 : 0,
      color: sourceColors[index],
    }));
  }, [bootstrap]);
  const statusDistribution = useMemo<DistributionItem[]>(() => {
    const total = bootstrap?.summary.total ?? 0;
    return (bootstrap?.statusDistribution ?? []).map((item) => {
      const label = statusLabel(item.label as PriceCollectionLeadRecord["status"]);
      return { label, count: item.count, value: total ? item.count / total * 100 : 0, color: statusColors[label] };
    });
  }, [bootstrap]);

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  function applyFilters() {
    setApplied(filters);
    setPage(1);
    toast.info("筛选已应用", "列表、统计图和当前记录数已按同一组业务数据联动。 ");
  }
  function resetFilters() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
    toast.info("筛选已重置");
  }
  function chooseStatus(status: FilterState["status"]) {
    setFilters((current) => ({ ...current, status, risk: "全部" }));
    setApplied((current) => ({ ...current, status, risk: "全部" }));
    setPage(1);
  }
  function chooseRisk(risk: FilterState["risk"]) {
    setFilters((current) => ({ ...current, risk, status: "全部" }));
    setApplied((current) => ({ ...current, risk, status: "全部" }));
    setPage(1);
  }
  function toggleAll() {
    setCheckedIds((ids) => allVisibleChecked ? ids.filter((id) => !visible.some((item) => item.databaseId === id)) : Array.from(new Set([...ids, ...visible.map((item) => item.databaseId)])));
  }

  function selectLead(lead: PriceLead) {
    setSelectedId(lead.databaseId);
    const params = new URLSearchParams(window.location.search);
    params.set("leadId", lead.id);
    router.replace(`/price-leads?${params.toString()}`, { scroll: false });
  }

  function requestConfirmation(action: "store" | "void", ids: string[]) {
    if (!ids.length) return toast.warning("请先选择价格线索");
    setConfirmIds(ids);
    setConfirmAction(action);
  }

  async function patchLeads(action: "confirm" | "reject" | "transfer" | "update" | "assign" | "capture_snapshot" | "resolve_duplicate" | "refresh_admission", ids: string[], extra: Record<string, unknown> = {}) {
    return readJson<{
      leads?: PriceCollectionLeadRecord[];
      lead?: PriceCollectionLeadRecord;
      failed?: Array<{ id: string; error: string }>;
      summary?: { requested: number; refreshed: number; failed: number };
    }>(await fetch("/api/price-collection", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "lead", action, ids, ...extra }),
    }));
  }

  async function assignReviewer(reviewerId: string, note: string, dueAt: string) {
    if (!selected) return;
    setBusyAction("assign");
    try {
      await patchLeads("assign", [selected.databaseId], {
        reviewerId,
        assignmentNote: note,
        reviewDueAt: dueAt,
      });
      await Promise.all([loadRecords(), loadSelectedDetail()]);
      const reviewer = bootstrap?.reviewers.find((item) => item.userId === reviewerId);
      toast.success("审核任务已分派", `${selected.id} 已分派给 ${reviewer?.displayName || "所选审核员"}。`);
    } catch (error) {
      toast.danger("审核任务分派失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setBusyAction("");
    }
  }

  async function captureEvidenceSnapshot() {
    if (!selected) return;
    setBusyAction("snapshot");
    try {
      await patchLeads("capture_snapshot", [selected.databaseId]);
      await loadSelectedDetail();
      toast.success("来源证据快照已保存", `${selected.id} 的当前来源、价格和审核上下文已写入证据链。`);
    } catch (error) {
      toast.danger("证据快照保存失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setBusyAction("");
    }
  }

  async function runAiEvaluation() {
    if (!actionRecords.length) return toast.warning("当前没有可评估线索");
    setBusyAction("ai");
    try {
      await readJson(await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "price_collection",
          title: `价格线索批量评估（${actionRecords.length} 条）`,
          sourceLabel: "价格线索池",
          businessObjectType: "price_collection_lead",
          businessObjectId: actionRecords[0].databaseId,
          businessHref: `/price-leads?leadId=${actionRecords[0].id}`,
          idempotencyKey: `lead-evaluation:${actionRecords.map((item) => item.databaseId).sort().join(":")}`,
          input: { action: "evaluate_price_leads", leadIds: actionRecords.map((item) => item.databaseId), leads: actionRecords.map((item) => ({ id: item.id, name: item.name, specification: item.spec, price: item.price, currency: item.currency, source: item.source })) },
        }),
      }));
      toast.success("AI评估任务已进入执行网关", "进度与结果可在 AI 工作台查看，AI不会直接替代人工确认。 ");
    } catch (error) {
      toast.danger("AI评估任务创建失败", error instanceof Error ? error.message : "请检查 AI Provider 配置");
    } finally {
      setBusyAction("");
    }
  }

  async function confirmReady(ids: string[]) {
    const pending = records.filter((item) => ids.includes(item.databaseId) && item.status === "待确认");
    if (!pending.length) return;
    setBusyAction("review");
    await patchLeads("confirm", pending.map((item) => item.databaseId), { notes: "价格线索池人工确认：允许进入正式价格库" });
  }

  async function resolveDuplicateIssues(explicitIds: string[] = []) {
    const subjects = explicitIds.length ? records.filter((item) => explicitIds.includes(item.databaseId)) : actionRecords;
    const duplicates = subjects.filter((item) => item.duplicate);
    if (!duplicates.length) return toast.warning("所选线索中没有疑似重复项");
    setBusyAction("resolve_duplicate");
    try {
      await patchLeads("resolve_duplicate", duplicates.map((item) => item.databaseId), {
        notes: "人工核对来源、规格、报价日期与价格条件后，确认该记录不是重复价格。",
      });
      await loadRecords();
      setCheckedIds([]);
      toast.success("重复项已人工核对", `${duplicates.length} 条线索已标记为非重复，仍需完成其他入库门槛。`);
    } catch (error) {
      toast.danger("重复项处理失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setBusyAction("");
    }
  }

  async function refreshAdmissionIssues(explicitIds: string[] = []) {
    const ids = explicitIds.length ? explicitIds : actionRecords.map((item) => item.databaseId);
    if (!ids.length) return toast.warning("请先选择需要重新核验的线索");
    setBusyAction("refresh_admission");
    try {
      const result = await patchLeads("refresh_admission", ids);
      await loadRecords();
      setCheckedIds([]);
      if (result.summary?.failed) {
        const firstFailure = result.failed?.[0];
        toast.warning(
          "部分来源核验失败",
          `真实访问成功 ${result.summary.refreshed} 条，失败 ${result.summary.failed} 条${firstFailure ? `；首条原因：${firstFailure.error}` : ""}。失败线索未刷新来源有效期。`,
        );
      } else {
        toast.success(
          "来源准入已重新核验",
          `已真实访问并验证 ${result.summary?.refreshed ?? ids.length} 条来源，成功线索的有效期已刷新。`,
        );
      }
    } catch (error) {
      toast.danger("准入核验失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setBusyAction("");
    }
  }

  async function storeSelected(explicitIds: string[] = []) {
    const subjects = explicitIds.length ? records.filter((item) => explicitIds.includes(item.databaseId)) : actionRecords;
    if (!subjects.length) return toast.warning("请先选择价格线索");
    const eligible = subjects.filter((item) => item.status === "待确认" || item.status === "可入库");
    if (!eligible.length) return toast.warning("所选线索已入库或已作废，无法再次处理。 ");
    const blocked = eligible.filter((item) => !isLeadReviewReady(item));
    if (blocked.length) {
      selectLead(blocked[0]);
      return toast.warning("存在未满足入库门槛的线索", `${blocked.map((item) => item.id).join("、")} 仍需补齐证据、汇率、主体、规格、地区/单位，或处理重复项与严重风险。`);
    }
    setConfirmAction(null);
    setConfirmIds([]);
    setBusyAction("transfer");
    setTransferringIds(eligible.map((item) => item.databaseId));
    try {
      await confirmReady(eligible.map((item) => item.databaseId));
      await patchLeads("transfer", eligible.map((item) => item.databaseId));
      setCheckedIds([]);
      await loadRecords();
      toast.success("真实入库完成", `${eligible.length} 条线索已原子写入对应价格库并记录审计链。`);
      if (eligible.every((item) => item.type === "地材")) {
        router.push(`/material-prices?source=price-leads&leadIds=${eligible.map((item) => encodeURIComponent(item.id)).join(",")}`);
      } else if (eligible.every((item) => item.type === "设备")) {
        router.push(`/equipment-prices?source=price-leads&leadIds=${eligible.map((item) => encodeURIComponent(item.id)).join(",")}`);
      }
    } catch (error) {
      toast.danger("价格线索入库失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setBusyAction("");
      setTransferringIds([]);
    }
  }

  async function voidSelected(explicitIds: string[] = []) {
    const subjects = explicitIds.length ? records.filter((item) => explicitIds.includes(item.databaseId)) : actionRecords;
    const pending = subjects.filter((item) => item.status === "待确认");
    setConfirmAction(null);
    setConfirmIds([]);
    if (!pending.length) return toast.warning("只有待确认线索可以驳回作废。 ");
    setBusyAction("reject");
    try {
      await patchLeads("reject", pending.map((item) => item.databaseId), { notes: "价格线索池人工驳回：信息不足或不适合进入正式价格库" });
      setCheckedIds([]);
      await loadRecords();
      toast.success("线索已驳回", `${pending.length} 条记录已作废并保留审计信息。`);
    } catch (error) {
      toast.danger("驳回失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setBusyAction("");
    }
  }

  function openEdit(item = selected) {
    if (!item) return toast.warning("请选择一条价格线索");
    setEditing({ ...item, missingFields: [...item.missingFields] });
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editing) return;
    setBusyAction("update");
    try {
      await patchLeads("update", [editing.databaseId], { patch: { name: editing.name, specification: editing.spec === "待补充" ? "" : editing.spec, supplierName: editing.supplier === "待补充" ? "" : editing.supplier, sourceUrl: editing.sourceDetail === "来源证据待补充" ? "" : editing.sourceDetail, region: editing.region === "待补充" ? "" : editing.region, originalUnit: editing.unit, reviewNotes: editing.reviewNotes } });
      setEditOpen(false);
      await loadRecords();
      toast.success("线索资料已保存", "Supabase 记录与审计日志已更新。 ");
    } catch (error) {
      toast.danger("资料保存失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setBusyAction("");
    }
  }

  function handleKpi(item: KpiItem) {
    if (item.filter === "all") resetFilters();
    else if (item.filter === "pending") chooseStatus("待确认");
    else if (item.filter === "ready") chooseStatus("可入库");
    else if (item.filter === "transferred") chooseStatus("已入库");
    else if (item.filter === "risk") chooseRisk("高风险");
    else toast.info(transferringIds.length ? "正在执行真实入库" : "当前没有入库中的任务");
  }

  function exportRows() {
    if (!filtered.length) return toast.warning("当前没有可导出的线索");
    const headers = ["线索编号", "类型", "名称", "规格", "来源", "价格", "币种", "地区", "AI匹配度", "可信度", "风险", "状态"];
    const rows = filtered.map((item) => [item.id, item.type, item.name, item.spec, item.source, item.price, item.currency, item.region, item.aiMatch, item.confidenceScore, item.risk, item.status]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `price-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("当前页线索已导出", `${filtered.length} 条真实业务记录。`);
  }

  const selectClass = "h-9 rounded-[8px] border border-borderSoft bg-white px-3 text-[12px] text-textSecondary shadow-sm outline-none focus:border-primary";
  const disabled = Boolean(busyAction) || loading;
  const canWrite = bootstrap?.permissions.canWrite ?? false;
  const canReview = bootstrap?.permissions.canReview ?? false;

  return (
    <AppLayout>
      <div data-no-global-interaction className="space-y-3">
        <section className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-ai/20 bg-ai-soft px-2.5 py-1 text-[12px] font-semibold text-ai"><Sparkles className="size-3.5" />AI价格线索池</div>
            <h1 className="mt-2 text-[24px] font-bold text-textMain">价格线索池</h1>
            <p className="mt-1 text-[13px] text-textSecondary">统一评估 AI解析、价格采集、供应商报价与人工录入线索的可信度、风险与入库动作。</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex h-9 items-center rounded-[9px] border border-success/25 bg-success/10 px-3 text-[12px] font-semibold text-success">Supabase · {bootstrap?.role || "读取中"}</span>
            <button type="button" onClick={runAiEvaluation} disabled={disabled || !canWrite} className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-ai/25 bg-ai-soft px-3 text-[13px] font-semibold text-ai disabled:opacity-60"><Sparkles className={cn("size-4", busyAction === "ai" && "animate-spin")} />{busyAction === "ai" ? "提交中" : "AI批量评估"}</button>
            <button type="button" onClick={() => requestConfirmation("store", checkedIds)} disabled={disabled || !canReview} className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-primary px-3 text-[13px] font-semibold text-white disabled:opacity-60"><Database className="size-4" />批量确认入库</button>
          </div>
        </section>

        <RouteContextBanner title="已带入统计分析筛选" />

        {loadError ? <section className="rounded-card border border-danger/20 bg-danger/10 p-4 text-[13px] text-danger"><strong>真实数据加载失败：</strong>{loadError}<button type="button" onClick={() => void loadRecords()} className="ml-3 font-bold underline">重新加载</button></section> : null}
        {bootstrap && !canReview ? <section className="flex items-center justify-between rounded-card border border-warning/25 bg-warning/10 px-4 py-2.5 text-[12px] text-warning"><span><strong>当前角色仅可查看：</strong>确认入库、驳回和批量审核需要价格审核权限。</span><span className="rounded-md bg-white/80 px-2 py-1 font-semibold">角色：{bootstrap.role}</span></section> : null}
        {scopedTaskId ? <section className="flex flex-wrap items-center justify-between gap-3 border-y border-primary/20 bg-primary-soft px-4 py-3 text-[12px]"><div><strong className="text-primary">当前任务结果</strong><span className="ml-2 text-textSecondary">任务 {scopedTaskId.slice(0, 8)}… · 共 {bootstrap?.pagination.total ?? 0} 条，包含有效价格和待人工核验结果。</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => router.push(`/ai-price-collection/tasks/${encodeURIComponent(scopedTaskId)}`)} className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/20 bg-white px-3 font-bold text-primary"><ExternalLink className="size-3.5" />返回任务详情</button><button type="button" onClick={() => router.replace("/price-leads")} className="inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 font-bold text-textSecondary"><RotateCcw className="size-3.5" />查看全部线索</button></div></section> : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">{kpis.map((item) => <KpiCard key={item.title} item={item} onClick={() => handleKpi(item)} />)}</section>

        <section className="overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-3">
            <div><h2 className="text-[15px] font-bold">准入问题队列</h2><p className="mt-0.5 text-[11px] text-textMuted">数字按当前业务筛选独立统计；点击问题类型只筛选记录，不会自动处理问题。</p></div>
            {applied.issue !== "全部" ? <button type="button" onClick={() => { setFilters((current) => ({ ...current, issue: "全部" })); setApplied((current) => ({ ...current, issue: "全部" })); setPage(1); }} className="inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft px-3 text-[11px] font-bold text-primary"><RotateCcw className="size-3.5" />清除问题筛选</button> : null}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {([
              ["missing_evidence", "缺少证据", bootstrap?.issueSummary.missingEvidence ?? 0],
              ["missing_fx", "缺少汇率", bootstrap?.issueSummary.missingFx ?? 0],
              ["duplicate", "疑似重复", bootstrap?.issueSummary.duplicate ?? 0],
              ["stale_source", "来源过期", bootstrap?.issueSummary.staleSource ?? 0],
              ["invalid_fields", "字段不完整", bootstrap?.issueSummary.invalidFields ?? 0],
              ["critical_risk", "严重风险", bootstrap?.issueSummary.criticalRisk ?? 0],
            ] as Array<[AdmissionIssue, string, number]>).map(([value, label, count]) => (
              <button key={value} type="button" onClick={() => { setFilters((current) => ({ ...current, issue: value })); setApplied((current) => ({ ...current, issue: value })); setPage(1); }} className={cn("flex min-h-16 items-center justify-between gap-2 border-b border-r border-borderSoft px-3 text-left transition hover:bg-slate-50", applied.issue === value && "bg-warning/10 ring-1 ring-inset ring-warning/30")}><span><strong className="block text-[12px] text-textMain">{label}</strong><span className="mt-1 block text-[10px] text-textMuted">点击查看待处理记录</span></span><strong className={cn("text-[18px] tabular-nums", count ? "text-warning" : "text-textMuted")}>{count}</strong></button>
            ))}
          </div>
        </section>

        <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-3">
            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <div className="grid gap-3 xl:grid-cols-5">
                <label><span className="mb-1.5 block text-[12px] font-semibold">线索名称</span><div className="flex h-9 items-center gap-2 rounded-[8px] border border-borderSoft px-3"><Search className="size-4 text-textMuted" /><input value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyFilters()} placeholder="名称 / 关键词" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none" /></div></label>
                <label><span className="mb-1.5 block text-[12px] font-semibold">类型</span><select value={filters.type} onChange={(event) => updateFilter("type", event.target.value as FilterState["type"])} className={cn(selectClass, "w-full")}><option>全部</option><option>设备</option><option>地材</option></select></label>
                <label><span className="mb-1.5 block text-[12px] font-semibold">来源类型</span><select value={filters.source} onChange={(event) => updateFilter("source", event.target.value)} className={cn(selectClass, "w-full")}><option value="全部">全部</option>{sources.map((item) => <option key={item} value={item}>{sourceTypeLabel(item)}</option>)}</select></label>
                <label><span className="mb-1.5 block text-[12px] font-semibold">地区</span><select value={filters.region} onChange={(event) => updateFilter("region", event.target.value)} className={cn(selectClass, "w-full")}><option>全部</option>{regions.map((item) => <option key={item} value={item}>{localizePriceRegion(item)}</option>)}</select></label>
                <label><span className="mb-1.5 block text-[12px] font-semibold">审核责任人</span><select value={filters.assignee} onChange={(event) => updateFilter("assignee", event.target.value)} className={cn(selectClass, "w-full")}><option value="全部">全部</option><option value="unassigned">未分派</option>{(bootstrap?.reviewers ?? []).map((item) => <option key={item.userId} value={item.userId}>{item.displayName}{item.isCurrentUser ? "（我）" : ""}</option>)}</select></label>
              </div>
              {!collapsed ? <div className="mt-3 grid items-end gap-3 xl:grid-cols-[1fr_1fr_1.2fr_1.5fr_auto_auto_auto]">
                <label><span className="mb-1.5 block text-[12px] font-semibold">状态</span><select value={filters.status} onChange={(event) => updateFilter("status", event.target.value as FilterState["status"])} className={cn(selectClass, "w-full")}><option>全部</option><option>待确认</option><option>可入库</option><option>已入库</option><option>已作废</option></select></label>
                <label><span className="mb-1.5 block text-[12px] font-semibold">风险等级</span><select value={filters.risk} onChange={(event) => updateFilter("risk", event.target.value as FilterState["risk"])} className={cn(selectClass, "w-full")}><option>全部</option><option>低风险</option><option>中风险</option><option>高风险</option><option>严重风险</option></select></label>
                <label><span className="mb-1.5 block text-[12px] font-semibold">AI匹配度</span><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"><input type="number" min={0} max={100} value={filters.minMatch} onChange={(event) => updateFilter("minMatch", event.target.value)} placeholder="最低%" className={selectClass} /><span>-</span><input type="number" min={0} max={100} value={filters.maxMatch} onChange={(event) => updateFilter("maxMatch", event.target.value)} placeholder="最高%" className={selectClass} /></div></label>
                <label><span className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold">价格所属期 <span title="用于月度价格分析，不是采集时间" className="text-[10px] font-normal text-textMuted">按报价日期</span></span><div className="flex h-9 items-center gap-2 rounded-[8px] border border-borderSoft px-2"><input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} className="min-w-0 flex-1 text-[11px] outline-none" /><span>-</span><input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} className="min-w-0 flex-1 text-[11px] outline-none" /></div></label>
                <button type="button" onClick={resetFilters} className="h-9 rounded-[8px] border border-borderSoft px-4 text-[12px] font-semibold">重置</button><button type="button" onClick={applyFilters} className="h-9 rounded-[8px] bg-primary px-5 text-[12px] font-semibold text-white">查询</button><button type="button" onClick={() => setCollapsed(true)} className="h-9 px-2 text-[12px] font-semibold text-primary">收起 ^</button>
              </div> : <button type="button" onClick={() => setCollapsed(false)} className="mt-3 text-[12px] font-semibold text-primary">展开高级筛选 <ChevronDown className="inline size-3.5" /></button>}
            </section>

            <section className="overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
              <div id="price-lead-list" className="scroll-mt-24 flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft px-4 py-3">
                <div><div className="flex items-center gap-2"><h2 className="text-[15px] font-bold">价格线索列表</h2><span className="rounded-md bg-primary-soft px-2 py-1 text-[11px] font-bold text-primary">{bootstrap?.pagination.total ?? 0} 条</span></div><p className="mt-1 text-[11px] text-textMuted">中文字段优先展示，原始采集文本完整保留；选择一行进入右侧审核工作区。</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  {checkedIds.length ? <span className="inline-flex h-9 items-center rounded-[8px] border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary">已选 {checkedIds.length} 条</span> : null}
                  {checkedIds.length ? <button type="button" onClick={() => setCheckedIds([])} className="h-9 rounded-[8px] border border-borderSoft px-3 text-[12px] font-semibold text-textSecondary">清空选择</button> : null}
                  {checkedIds.length ? <button type="button" onClick={() => void resolveDuplicateIssues(checkedIds)} disabled={disabled || !canReview || !actionRecords.some((item) => item.duplicate)} className="h-9 rounded-[8px] border border-warning/25 bg-warning/10 px-3 text-[12px] font-semibold text-warning disabled:opacity-40">批量确认非重复</button> : null}
                  {checkedIds.length ? <button type="button" onClick={() => void refreshAdmissionIssues(checkedIds)} disabled={disabled || !canReview} className="h-9 rounded-[8px] border border-primary/20 px-3 text-[12px] font-semibold text-primary disabled:opacity-40">批量重新核验</button> : null}
                  <button type="button" title={!canWrite ? "当前角色没有资料编辑权限" : undefined} onClick={() => openEdit()} disabled={!selected || disabled || !canWrite} className="h-9 rounded-[8px] border border-ai/25 bg-ai-soft px-4 text-[12px] font-semibold text-ai disabled:opacity-50">补充资料</button>
                  <button type="button" title={!canReview ? "当前角色没有价格审核权限" : undefined} onClick={() => requestConfirmation("store", checkedIds)} disabled={disabled || !canReview} className="h-9 rounded-[8px] border border-primary/25 bg-primary-soft px-4 text-[12px] font-semibold text-primary disabled:opacity-50">批量入库</button>
                  <button type="button" onClick={exportRows} className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-success/25 bg-success/10 px-4 text-[12px] font-semibold text-success"><FileText className="size-3.5" />导出线索</button>
                </div>
              </div>
              {loading ? <div className="flex h-56 items-center justify-center gap-2 text-[13px] text-textMuted"><LoaderCircle className="size-5 animate-spin" />正在读取 Supabase 价格线索</div> : visible.length ? <>
                <div className="overflow-x-auto">
                  <table className="w-max min-w-full table-auto border-collapse text-left text-[12px] [&_td]:whitespace-nowrap">
                    <thead className="bg-[#F8FAFD] font-bold text-textSecondary">
                      <tr className="h-10 border-b border-borderSoft">
                        <th className="w-10 px-3"><input type="checkbox" aria-label="全选当前页线索" checked={allVisibleChecked} onChange={toggleAll} /></th>
                        {["线索编号", "类型", "名称", "规格", "价格所属期", "采集时间", "来源", "价格", "地区", "AI匹配", "可信度", "风险", "状态", "操作"].map((header) => <th key={header} className={cn("whitespace-nowrap px-3", header === "线索编号" && "min-w-44", header === "类型" && "min-w-20", header === "规格" && "min-w-52", header === "来源" && "min-w-48", header === "地区" && "min-w-44", header === "操作" && "min-w-32")}>{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((lead) => <tr key={lead.databaseId} onClick={() => selectLead(lead)} className={cn("h-11 cursor-pointer border-b border-borderSoft hover:bg-primary-soft/40", selectedId === lead.databaseId && "bg-primary-soft/60")}><td className="px-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`选择线索 ${lead.id}`} checked={checkedIds.includes(lead.databaseId)} onChange={() => setCheckedIds((ids) => ids.includes(lead.databaseId) ? ids.filter((id) => id !== lead.databaseId) : [...ids, lead.databaseId])} /></td><td className="px-3 font-semibold text-primary">{lead.id}</td><td className="px-3"><TypeBadge type={lead.type} /></td><td className="px-3 font-bold">{lead.name}</td><td className="px-3">{lead.spec}</td><td className="px-3"><span className="inline-flex items-center gap-1 font-semibold"><CalendarDays className="size-3.5 text-primary" />{formatPricePeriod(lead)}</span></td><td className="px-3 text-textSecondary">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("zh-CN") : "-"}</td><td className="px-3">{lead.source}</td><td className="px-3 text-right font-bold tabular-nums">{lead.currency} {lead.price.toLocaleString()}</td><td className="px-3">{lead.region}</td><td className="px-3 font-bold tabular-nums">{lead.aiMatch}%</td><td className="px-3"><ConfidenceBadge value={lead.confidence} /></td><td className={cn("px-3 font-semibold", lead.riskValue === "high" || lead.riskValue === "critical" ? "text-danger" : lead.riskValue === "medium" ? "text-warning" : "text-success")}>{lead.risk}</td><td className="px-3"><StatusBadge value={lead.status} /></td><td className="px-3" onClick={(event) => event.stopPropagation()}><div className="flex flex-nowrap gap-1"><button type="button" onClick={() => selectLead(lead)} className="h-7 whitespace-nowrap rounded-[7px] border border-primary/20 px-2.5 text-[11px] font-semibold text-primary">查看</button><button type="button" title={!canWrite ? "当前角色没有资料编辑权限" : undefined} onClick={() => openEdit(lead)} disabled={!canWrite} className="h-7 whitespace-nowrap rounded-[7px] border border-primary/20 bg-primary-soft px-2.5 text-[11px] font-semibold text-primary disabled:opacity-40">编辑</button></div></td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-[12px] text-textSecondary"><span>共 {bootstrap?.pagination.total ?? 0} 条，每页 {pageSize} 条，当前第 {page} / {pageCount} 页</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="size-8 rounded-md border border-borderSoft disabled:opacity-40">‹</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button key={item} type="button" onClick={() => setPage(item)} className={cn("size-8 rounded-md border font-bold", item === page ? "bg-primary text-white" : "bg-white")}>{item}</button>)}<button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="size-8 rounded-md border border-borderSoft disabled:opacity-40">›</button></div></div>
              </> : <div className="p-8"><EmptyState title="没有匹配的价格线索" description="请调整筛选条件，或检查真实采集任务是否已产生线索。" /></div>}
            </section>

            <div className="grid gap-3 2xl:grid-cols-[1fr_1fr_1.2fr]">
              <DonutCard title="来源类型占比" total={bootstrap?.summary.total ?? 0} items={sourceDistribution} onSelect={(label) => { setFilters((current) => ({ ...current, source: label })); setApplied((current) => ({ ...current, source: label })); setPage(1); }} />
              <DonutCard title="状态分布" total={bootstrap?.summary.total ?? 0} items={statusDistribution} onSelect={(label) => chooseStatus(label === "全部" ? "全部" : label as LeadStatus)} />
              <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
                <div className="flex items-center justify-between"><h3 className="text-[15px] font-bold">线索转正式价格库流程</h3><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-textMuted">点击状态可筛选</span></div>
                <div className="mt-4 grid grid-cols-[1fr_20px_1fr_20px_1fr_20px_1fr] items-start">{[
                  { label: "待确认", hint: "人工核验", value: bootstrap?.summary.pending ?? 0, icon: Clock3, cls: "bg-warning/10 text-warning" },
                  { label: "可入库", hint: "审核通过", value: bootstrap?.summary.ready ?? 0, icon: CheckCircle2, cls: "bg-success/10 text-success" },
                  { label: "入库中", hint: "系统写入", value: transferringIds.length, icon: Database, cls: "bg-ai-soft text-ai" },
                  { label: "已入库", hint: "正式价格", value: bootstrap?.summary.transferred ?? 0, icon: CheckCircle2, cls: "bg-primary-soft text-primary" },
                ].map(({ label, hint, value, icon: Icon, cls }, index) => <div key={label} className="contents"><button type="button" title={`筛选${label}记录`} onClick={() => label === "入库中" ? handleKpi(kpis[3]) : chooseStatus(label as LeadStatus)} className="text-center"><span className={cn("mx-auto flex size-10 items-center justify-center rounded-full", cls)}><Icon className="size-4.5" /></span><div className="mt-2 text-[11px] font-semibold">{label}</div><div className="text-[9px] text-textMuted">{hint}</div><div className="mt-1 text-[19px] font-bold text-primary">{value}</div></button>{index < 3 ? <ArrowRight className="mt-4 size-5 text-primary" /> : null}</div>)}</div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-primary/10 bg-primary-soft/45 px-3 py-2.5"><p className="text-[10px] leading-4 text-textSecondary"><strong className="text-primary">下一步：</strong>选择待确认线索，在右侧完成准入核验，然后点击“确认并入库”。“可入库”和“入库中”由系统自动推进。</p><button type="button" onClick={() => { chooseStatus("待确认"); document.getElementById("price-lead-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="shrink-0 rounded-md bg-primary px-3 py-2 text-[10px] font-bold text-white">处理待确认 {bootstrap?.summary.pending ?? 0} 条</button></div>
              </section>
            </div>
          </div>

          <aside className="overflow-hidden rounded-card border border-borderSoft bg-card shadow-card xl:sticky xl:top-20 xl:max-h-[calc(100vh-92px)] xl:overflow-y-auto">
            {selected ? <>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-borderSoft bg-white/95 px-4 py-3 backdrop-blur"><div><h2 className="text-[17px] font-bold">人工审核工作区</h2><p className="mt-0.5 text-[11px] text-textMuted">{selected.id}</p></div><StatusBadge value={selected.status} /></div>
              <div className="space-y-3 p-4">
                <section className="rounded-[12px] border border-primary/15 bg-gradient-to-br from-primary-soft via-white to-white p-3">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[16px] font-black">{selected.name}</div><p className="mt-1 truncate text-[11px] text-textSecondary" title={`${selected.spec} · ${selected.supplier}`}>{selected.spec} · {selected.supplier}</p></div><div className="shrink-0 text-right"><strong className="text-[18px] text-primary tabular-nums">{selected.currency} {selected.price.toLocaleString()}</strong><div className="mt-1 text-[10px] text-textMuted">{selected.unit || "计价单位待补"}</div></div></div>
                  <div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-[9px] border border-ai/15 bg-ai-soft p-2"><span className="text-[10px] text-textMuted">AI匹配</span><strong className="mt-1 block text-[16px] text-ai">{selected.aiMatch}%</strong></div><div className="rounded-[9px] border border-success/15 bg-success/10 p-2"><span className="text-[10px] text-textMuted">可信度</span><strong className="mt-1 block text-[16px] text-success">{selected.confidenceScore}%</strong></div><div className={cn("rounded-[9px] border p-2", selected.riskValue === "high" || selected.riskValue === "critical" ? "border-danger/20 bg-danger/10" : "border-warning/20 bg-warning/10")}><span className="text-[10px] text-textMuted">风险</span><strong className={cn("mt-1 block text-[14px]", selected.riskValue === "high" || selected.riskValue === "critical" ? "text-danger" : "text-warning")}>{selected.risk}</strong></div></div>
                </section>

                <section className="rounded-[12px] border border-borderSoft p-3"><div className="flex items-center justify-between"><div><h3 className="text-[13px] font-bold">入库门槛核验</h3><p className="mt-0.5 text-[10px] text-textMuted">人工确认前必须逐项满足</p></div><span className={cn("rounded-md px-2 py-1 text-[10px] font-bold", selectedReady ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{selectedChecks.filter((item) => item.ready).length}/{selectedChecks.length} 通过</span></div><div className="mt-3 space-y-1.5">{selectedChecks.map((item) => <div key={item.label} className={cn("grid grid-cols-[18px_76px_1fr] items-center gap-2 rounded-[8px] border px-2.5 py-2 text-[11px]", item.ready ? "border-success/15 bg-success/5" : "border-warning/20 bg-warning/5")}><span className={cn("flex size-[18px] items-center justify-center rounded-full", item.ready ? "bg-success text-white" : "bg-warning/15 text-warning")}>{item.ready ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}</span><strong>{item.label}</strong><span className="truncate text-textSecondary" title={item.detail}>{item.detail}</span></div>)}</div>{selected.riskValue === "critical" ? <div className="mt-2 rounded-[8px] bg-danger/10 p-2 text-[11px] font-semibold text-danger">严重风险线索不得直接入库，请先补充证据或驳回。</div> : null}</section>

                <PriceLeadReviewGovernance
                  key={selected.databaseId}
                  assignedReviewerId={selected.assignedReviewerId}
                  assignmentNote={selected.assignmentNote}
                  reviewDueAt={selected.reviewDueAt}
                  reviewers={bootstrap?.reviewers ?? []}
                  evidence={selectedEvidence}
                  historyMatches={selectedHistoryMatches}
                  loading={detailLoading}
                  canReview={canReview}
                  disabled={disabled}
                  onAssign={assignReviewer}
                  onCaptureSnapshot={captureEvidenceSnapshot}
                  onRefresh={loadSelectedDetail}
                />

                <section className="rounded-[12px] border border-primary/15 bg-primary-soft/40 p-3">
                  <div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><h3 className="text-[13px] font-bold">价格时间口径</h3></div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><span className="block text-textMuted">价格所属期</span><strong className="mt-1 block text-[12px] text-primary">{formatPricePeriod(selected)}</strong></div><div><span className="block text-textMuted">来源核验</span><strong className="mt-1 block text-[12px]">{selected.sourceCheckedAt ? new Date(selected.sourceCheckedAt).toLocaleDateString("zh-CN") : "待核验"}</strong></div><div><span className="block text-textMuted">采集入库</span><strong className="mt-1 block text-[12px]">{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("zh-CN") : "-"}</strong></div></div>
                  <p className="mt-2 text-[10px] leading-4 text-textMuted">月度波动按价格所属期统计；来源核验时间用于有效期判断；采集时间仅用于审计。</p>
                </section>

                <MonthlyTrendCard data={detailMatchesSelection ? leadDetail?.monthlyTrend ?? [] : []} currency={selected.currency} />

                <section className="rounded-[12px] border border-borderSoft p-3"><div className="flex items-center justify-between"><h3 className="text-[13px] font-bold">来源证据</h3><span className="text-[10px] text-textMuted">{selected.source}</span></div><p className="mt-2 break-all rounded-[8px] bg-slate-50 p-2 text-[11px] leading-5 text-textSecondary">{selected.sourceDetail}</p><div className="mt-2 flex items-center justify-between text-[10px] text-textMuted"><span>{selected.region} · 核验于 {selected.sourceCheckedAt ? new Date(selected.sourceCheckedAt).toLocaleDateString("zh-CN") : "待核验"}</span><button type="button" onClick={() => /^https?:\/\//.test(selected.sourceDetail) ? window.open(selected.sourceDetail, "_blank", "noopener,noreferrer") : toast.info("来源证据", selected.sourceDetail)} className="inline-flex items-center gap-1 font-semibold text-primary">查看原始内容 <ExternalLink className="size-3" /></button></div></section>

                <section className="rounded-[12px] border border-ai/20 bg-ai-soft p-3"><div className="flex items-center justify-between"><h3 className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ai"><Sparkles className="size-4" />AI辅助判断</h3><span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-ai">需人工确认</span></div><p className="mt-2 text-[11px] leading-5 text-textSecondary">{selectedReady ? "关键资料已满足入库门槛，可由审核员确认后写入正式价格库。" : `当前仍有 ${selectedChecks.filter((item) => !item.ready).length} 项核验未通过，建议先补充资料或核对原始证据。`}</p></section>

                <section className="rounded-[12px] border border-borderSoft p-3">
                  <h3 className="mb-2 text-[13px] font-bold">业务动作</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" title={!canReview ? "当前角色没有价格审核权限" : !selectedReady ? "请先完成全部入库门槛核验" : undefined} onClick={() => requestConfirmation("store", [selected.databaseId])} disabled={disabled || !canReview || !selectedReady || selected.status === "已入库" || selected.status === "已作废"} className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-success/30 bg-success/10 px-3 text-[12px] font-semibold text-success disabled:opacity-40"><Database className="size-3.5" />确认并转入{selected.type}价格库</button>
                    <button type="button" onClick={() => router.push(`/inquiries/create?leadId=${encodeURIComponent(selected.id)}&leadType=${encodeURIComponent(selected.type)}&leadName=${encodeURIComponent(selected.name)}&leadSpec=${encodeURIComponent(selected.spec)}&currency=${encodeURIComponent(selected.currency)}&source=price-leads`)} className="h-9 rounded-[8px] border border-ai/30 bg-ai-soft text-[12px] font-semibold text-ai">创建询价任务</button>
                    <button type="button" onClick={() => void resolveDuplicateIssues([selected.databaseId])} disabled={disabled || !canReview || !selected.duplicate} className="h-9 rounded-[8px] border border-warning/30 bg-warning/10 text-[12px] font-semibold text-warning disabled:opacity-40">确认非重复</button>
                    <button type="button" onClick={() => void refreshAdmissionIssues([selected.databaseId])} disabled={disabled || !canReview} className="h-9 rounded-[8px] border border-primary/20 text-[12px] font-semibold text-primary disabled:opacity-40">重新核验准入</button>
                    <button type="button" onClick={() => requestConfirmation("void", [selected.databaseId])} disabled={disabled || !canReview || selected.status !== "待确认"} className="h-9 rounded-[8px] border border-danger/30 bg-danger/10 text-[12px] font-semibold text-danger disabled:opacity-40">驳回作废</button>
                    <button type="button" onClick={() => openEdit()} disabled={disabled || !canWrite} className="h-9 rounded-[8px] border border-primary/20 text-[12px] font-semibold text-primary disabled:opacity-40">补充资料</button>
                  </div>
                </section>

                <section className="rounded-[12px] border border-borderSoft p-3"><h3 className="mb-2 text-[13px] font-bold">审计时间线</h3><div className="space-y-2 border-l border-primary/20 pl-3 text-[11px] text-textSecondary"><div><strong className="text-textMain">创建线索</strong><br />{selected.createdAt ? new Date(selected.createdAt).toLocaleString("zh-CN") : "-"}</div>{selected.reviewedAt ? <div><strong className="text-textMain">人工审核</strong><br />{new Date(selected.reviewedAt).toLocaleString("zh-CN")} · {selected.reviewNotes || selected.status}</div> : <div className="text-warning">尚未完成人工审核</div>}{selected.transferredAt ? <div className="text-success"><strong>写入正式价格库</strong><br />{new Date(selected.transferredAt).toLocaleString("zh-CN")}</div> : null}</div></section>
              </div>
            </> : <div className="p-6"><EmptyState title="暂无选中线索" description="请从左侧列表选择一条记录。" /></div>}
          </aside>
        </section>

        <section className="flex items-center justify-between rounded-card border border-borderSoft bg-card px-4 py-3 text-[12px] text-textSecondary shadow-card"><span>真实闭环：AI采集 / 报价识别 → 可信度评估 → 人工确认 → 设备/地材价格库 → 审计留痕。</span><button type="button" onClick={() => void loadRecords(true)} disabled={loading} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-borderSoft px-3 font-semibold disabled:opacity-50"><RotateCcw className={cn("size-3.5", loading && "animate-spin")} />刷新线索</button></section>
      </div>

      <ConfirmDialog open={confirmAction !== null} title={confirmAction === "store" ? confirmStoreLabel : "确认驳回价格线索"} description={confirmAction === "store" ? `将处理 ${confirmIds.length} 条线索。待确认记录会先完成人工确认，再原子写入${confirmStoreTarget ? `${confirmStoreTarget}价格库` : "各自对应的设备或地材价格库"}。` : `将驳回 ${confirmIds.length} 条线索，并保留原始数据、审核意见和审计记录。`} confirmLabel={confirmAction === "store" ? confirmStoreLabel : "确认驳回"} tone={confirmAction === "void" ? "danger" : "default"} onCancel={() => { setConfirmAction(null); setConfirmIds([]); }} onConfirm={() => confirmAction === "store" ? void storeSelected(confirmIds) : void voidSelected(confirmIds)} />

      {editOpen && editing ? <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/35 backdrop-blur-sm"><aside className="h-full w-full max-w-[470px] overflow-y-auto bg-white shadow-panel"><div className="flex items-center justify-between border-b border-borderSoft px-5 py-4"><div><h2 className="text-[18px] font-black">补充线索资料</h2><p className="mt-1 text-[12px] text-textMuted">{editing.id} · 保存后写入 Supabase</p></div><button type="button" onClick={() => setEditOpen(false)} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100">×</button></div><div className="space-y-4 p-5">{[["名称", "name"], ["规格型号", "spec"], ["供应商", "supplier"], ["来源链接 / 说明", "sourceDetail"], ["地区", "region"], ["计价单位", "unit"]].map(([label, key]) => <label key={key} className="grid gap-1.5 text-[13px] font-bold text-textSecondary">{label}<input value={String(editing[key as keyof PriceLead])} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })} className="h-10 rounded-md border border-borderSoft px-3 font-normal outline-none focus:border-primary" /></label>)}<label className="grid gap-1.5 text-[13px] font-bold text-textSecondary">人工复核备注<textarea value={editing.reviewNotes} onChange={(event) => setEditing({ ...editing, reviewNotes: event.target.value })} className="min-h-24 rounded-md border border-borderSoft p-3 font-normal outline-none focus:border-primary" /></label><section className="rounded-[12px] border border-ai/20 bg-ai-soft p-3 text-[12px] text-textSecondary"><strong className="text-ai">资料检查：</strong>{editing.missingFields.length ? `当前检测到 ${editing.missingFields.join("、")} 待补充。` : "关键资料已完整，仍需人工核验来源真实性。"}</section></div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-borderSoft bg-white px-5 py-4"><button type="button" onClick={() => setEditOpen(false)} className="h-9 rounded-md border border-borderSoft px-4 text-[13px] font-bold">取消</button><button type="button" onClick={() => void saveEdit()} disabled={busyAction === "update"} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-bold text-white disabled:opacity-60">{busyAction === "update" ? <LoaderCircle className="size-4 animate-spin" /> : null}保存资料</button></div></aside></div> : null}
    </AppLayout>
  );
}
