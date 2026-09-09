"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  FileUp,
  FolderSearch,
  HandCoins,
  LoaderCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import {
  ConfirmDialog,
  ModuleHeader,
  OverlayShell,
  PriceCell,
  TableActionGroup,
} from "@/components/common";
import { emitMockToast } from "@/hooks/useMockToast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ProjectPricingEmptyState,
  ProjectPricingList,
  ProjectPricingWorkflow,
  type ProjectPricingListItem,
} from "@/components/project-pricing/ProjectPricingOverview";
import { ProjectPricingGapPlan } from "@/components/project-pricing/ProjectPricingGapPlan";

type Risk = "low" | "medium" | "high" | "critical";
type PricingItem = {
  id: string;
  project_id: string;
  boq_code: string;
  line_no: number;
  item_name: string;
  specification: string;
  category: "equipment" | "material" | "service";
  quantity: number;
  unit: string;
  matched_unit_price: number | null;
  currency: string;
  normalized_usd_price: number | null;
  price_source_type: string;
  source_record_id: string | null;
  source_legacy_id: string | null;
  supplier_id: string | null;
  confidence: number;
  match_level: "exact" | "similar" | "type" | "model" | "unmatched";
  risk_level: Risk;
  needs_inquiry: boolean;
  decision_status: "gap" | "ai_recommended" | "manual_selected" | "confirmed";
  evidence_count: number;
  notes: string;
  metadata: Record<string, unknown>;
  supplier?: { name?: string; supplier_name?: string } | null;
};
type Project = {
  id: string;
  project_code: string;
  name: string;
  status: string;
  project_stage: string;
  base_currency: string;
  price_term: string;
  exchange_rate: number;
  valid_until: string | null;
  risk_level: Risk;
  updated_at: string;
  metadata?: Record<string, unknown>;
  pricing_result?: Record<string, unknown> | null;
};
type Summary = {
  totalItems: number;
  matchedItems: number;
  gapItems: number;
  highRiskItems: number;
  totalUsd: number;
  confirmedUsd: number;
  averageConfidence: number;
};
type PricingPayload = {
  project: Project;
  items: PricingItem[];
  summary: Summary;
};

type PricingAlternative = {
  id: string;
  code: string;
  name: string;
  specification?: string;
  score: number;
  reasons?: string[];
  price?: number;
  currency?: string;
  supplierName?: string;
  supplierId?: string | null;
  sourceType?: string;
  validUntil?: string;
  quoteDate?: string;
  priceTerm?: string;
  region?: string;
  usdPrice?: number;
};

const riskLabel: Record<Risk, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};
const riskStyle: Record<Risk, string> = {
  low: "bg-success-soft text-success",
  medium: "bg-warning-soft text-warning",
  high: "bg-danger-soft text-danger",
  critical: "bg-danger text-white",
};
const matchLabel = {
  exact: "精准匹配",
  similar: "相似匹配",
  model: "型号匹配",
  type: "类型匹配",
  unmatched: "无匹配",
} as const;
const matchStyle = {
  exact: "bg-success-soft text-success",
  similar: "bg-primary-soft text-primary",
  model: "bg-ai-soft text-ai",
  type: "bg-warning-soft text-warning",
  unmatched: "bg-danger-soft text-danger",
} as const;

type PricingView = "projects" | "workspace" | "review" | "gaps" | "reports";

function refreshSidebarCounts() {
  window.dispatchEvent(new Event("wpi:sidebar-counts-refresh"));
}

function requestError(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function linkedInquiry(item: PricingItem) {
  const id =
    typeof item.metadata?.inquiryId === "string" ? item.metadata.inquiryId : "";
  const code =
    typeof item.metadata?.inquiryCode === "string"
      ? item.metadata.inquiryCode
      : "";
  const status =
    typeof item.metadata?.inquiryStatus === "string"
      ? item.metadata.inquiryStatus
      : "";
  const inactive =
    status === "rejected" || status === "archived" || status === "missing";
  return inactive
    ? { id: "", code: "", href: "" }
    : {
        id,
        code,
        href: id || code ? `/inquiries/${encodeURIComponent(code || id)}` : "",
      };
}

function priceSourceHref(item: PricingItem) {
  if (!item.source_record_id) return "";
  if (item.price_source_type === "equipment_price")
    return `/equipment-prices/${item.source_record_id}`;
  if (item.price_source_type === "material_price")
    return `/material-prices/${item.source_record_id}`;
  return "";
}

function pricingAlternatives(item: PricingItem): PricingAlternative[] {
  if (!Array.isArray(item.metadata?.alternatives)) return [];
  return item.metadata.alternatives.filter(
    (candidate): candidate is PricingAlternative => {
      if (!candidate || typeof candidate !== "object") return false;
      const value = candidate as Record<string, unknown>;
      return (
        typeof value.id === "string" &&
        typeof value.code === "string" &&
        typeof value.name === "string" &&
        typeof value.score === "number"
      );
    },
  );
}

function pricingViewHref(view: PricingView, projectId?: string) {
  const params = new URLSearchParams({ view });
  if (projectId) params.set("projectId", projectId);
  return `/project-pricing?${params.toString()}`;
}

function inquiryCreateHref(projectId: string, boqItemIds: string[]) {
  const params = new URLSearchParams({
    source: "project-pricing",
    pricingId: projectId,
    boqItemIds: boqItemIds.join(","),
    returnTo: pricingViewHref("gaps", projectId),
  });
  return `/inquiries/create?${params.toString()}`;
}

function KpiCard({
  label,
  value,
  unit,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "blue" | "green" | "purple" | "orange" | "red";
  icon: typeof Database;
}) {
  const styles = {
    blue: "border-primary/20 bg-primary-soft/50 text-primary",
    green: "border-success/20 bg-success-soft/55 text-success",
    purple: "border-ai-border bg-ai-soft/60 text-ai",
    orange: "border-warning/20 bg-warning-soft/60 text-warning",
    red: "border-danger/20 bg-danger-soft/60 text-danger",
  }[tone];
  return (
    <section
      className={cn(
        "flex min-h-[88px] items-center gap-3 rounded-card border px-3 shadow-card",
        styles,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold">{label}</p>
        <p
          className="mt-1 truncate whitespace-nowrap text-[21px] font-bold leading-7 tabular-nums"
          title={`${value}${unit ? ` ${unit}` : ""}`}
        >
          {value}
          <span className="ml-1 text-[11px]">{unit}</span>
        </p>
      </div>
    </section>
  );
}

function ProjectPricingResults({
  data,
  workflowState,
  unresolvedForReport,
  onExport,
}: {
  data: PricingPayload;
  workflowState: {
    confirmedItems: number;
    matchedItems: number;
    inquiryLinkedItems: number;
    inquiryQuoteItems: number;
    gapItems: number;
  };
  unresolvedForReport: number;
  onExport: () => void;
}) {
  const formalReady = unresolvedForReport === 0;
  const confirmationRate = workflowState.matchedItems
    ? Math.round(
        (workflowState.confirmedItems / workflowState.matchedItems) * 100,
      )
    : 0;
  const backfillRate = workflowState.gapItems
    ? Math.round(
        (workflowState.inquiryQuoteItems / workflowState.gapItems) * 100,
      )
    : 100;
  const pendingConfirmation = Math.max(
    0,
    workflowState.matchedItems - workflowState.confirmedItems,
  );
  const pendingBackfill = Math.max(
    0,
    workflowState.gapItems - workflowState.inquiryQuoteItems,
  );
  const nextAction = pendingConfirmation
    ? {
        href: pricingViewHref("review", data.project.id),
        label: `处理 ${pendingConfirmation} 项待确认价格`,
      }
    : pendingBackfill
      ? {
          href: pricingViewHref("gaps", data.project.id),
          label: `处理 ${pendingBackfill} 项询价缺口`,
        }
      : null;
  const displayedAmount = formalReady
    ? data.summary.totalUsd
    : data.summary.confirmedUsd;
  const evidenceCount = data.items.reduce(
    (total, item) => total + Number(item.evidence_count || 0),
    0,
  );
  const sourceCount = new Set(
    data.items
      .map((item) => item.price_source_type)
      .filter((source) => source && source !== "unmatched"),
  ).size;
  const pendingInquiryCreation = Math.max(
    0,
    workflowState.gapItems - workflowState.inquiryLinkedItems,
  );
  const metadata = data.project.metadata ?? {};
  const costScope = `${metadata.includeTax === true ? "含税" : "未标记含税"} · ${metadata.includeFreight === false ? "不含运费" : "含运费"}`;
  const updatedAt = data.project.updated_at
    ? data.project.updated_at.replace("T", " ").slice(0, 16)
    : "待记录";
  return (
    <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4",
          formalReady
            ? "border-success/20 bg-success-soft/45"
            : "border-warning/20 bg-warning-soft/55",
        )}
      >
        <div>
          <p
            className={cn(
              "text-[15px] font-bold",
              formalReady ? "text-success" : "text-warning",
            )}
          >
            {formalReady
              ? "正式套价成果已具备输出条件"
              : "当前只能形成套价成果草稿"}
          </p>
          <p className="mt-1 text-[11px] text-textMuted">
            {formalReady
              ? "价格确认、缺口询价与报价回填已经闭合。"
              : `仍有 ${unresolvedForReport} 项未闭合，正式成果需完成确认或报价回填。`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-pill px-3 py-1.5 text-[11px] font-bold",
              formalReady ? "bg-success text-white" : "bg-warning text-white",
            )}
          >
            {formalReady ? "可正式发布" : "待业务闭环"}
          </span>
          {nextAction ? (
            <Link
              href={nextAction.href}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-warning/30 bg-white px-3 text-[11px] font-bold text-warning"
            >
              {nextAction.label}
              <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </header>
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <article className="rounded-md border border-borderSoft bg-slate-50 p-3">
          <p className="text-[11px] font-bold text-textSecondary">价格确认</p>
          <p className="mt-2 text-[24px] font-bold text-primary">
            {workflowState.matchedItems ? `${confirmationRate}%` : "无可确认项"}
          </p>
          <p className="mt-1 text-[10px] text-textMuted">
            {workflowState.matchedItems
              ? `${workflowState.confirmedItems} / ${workflowState.matchedItems} 项已人工确认`
              : "当前尚未形成可供人工确认的价格推荐"}
          </p>
        </article>
        <article className="rounded-md border border-borderSoft bg-slate-50 p-3">
          <p className="text-[11px] font-bold text-textSecondary">询价回填</p>
          <p className="mt-2 text-[24px] font-bold text-warning">
            {backfillRate}%
          </p>
          <p className="mt-1 text-[10px] text-textMuted">
            {workflowState.inquiryQuoteItems} / {workflowState.gapItems}{" "}
            项已取得报价
          </p>
        </article>
        <article className="rounded-md border border-borderSoft bg-slate-50 p-3">
          <p className="text-[11px] font-bold text-textSecondary">
            {formalReady ? "正式成果金额" : "已确认金额"}
          </p>
          <p className="mt-2 text-[24px] font-bold text-ai">
            {displayedAmount.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}
            <span className="ml-1 text-[10px]">USD</span>
          </p>
          <p className="mt-1 text-[10px] text-textMuted">
            {formalReady
              ? "全部价格已完成人工确认"
              : `当前估算 USD ${data.summary.totalUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}，含待确认推荐`}
          </p>
        </article>
      </div>
      <div className="grid gap-3 border-t border-borderSoft bg-slate-50/65 p-4 lg:grid-cols-3">
        <article className="rounded-md border border-borderSoft bg-white p-3">
          <p className="text-[12px] font-bold text-textMain">成果口径</p>
          <dl className="mt-3 space-y-2 text-[11px]">
            <div className="flex justify-between gap-3">
              <dt className="text-textMuted">计价条件</dt>
              <dd className="text-right font-semibold text-textSecondary">
                {data.project.base_currency} 基准 · {data.project.price_term} ·
                汇率 {data.project.exchange_rate}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-textMuted">成本范围</dt>
              <dd className="text-right font-semibold text-textSecondary">
                {costScope}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-textMuted">价格有效期</dt>
              <dd className="font-semibold text-textSecondary">
                {data.project.valid_until || "待设置"}
              </dd>
            </div>
          </dl>
        </article>
        <article className="rounded-md border border-borderSoft bg-white p-3">
          <p className="text-[12px] font-bold text-textMain">数据追溯</p>
          <dl className="mt-3 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <dt className="text-textMuted">证据记录</dt>
              <dd className="font-semibold text-textSecondary">
                {evidenceCount} 条
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-textMuted">价格来源类型</dt>
              <dd className="font-semibold text-textSecondary">
                {sourceCount} 类
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-textMuted">最近更新</dt>
              <dd className="font-semibold text-textSecondary">{updatedAt}</dd>
            </div>
          </dl>
        </article>
        <article
          className={cn(
            "rounded-md border p-3",
            formalReady
              ? "border-success/20 bg-success-soft/35"
              : "border-warning/25 bg-warning-soft/45",
          )}
        >
          <p className="text-[12px] font-bold text-textMain">闭环待办</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Link
              href={pricingViewHref("review", data.project.id)}
              className="rounded bg-white px-2 py-2 font-semibold text-primary"
            >
              待确认 {pendingConfirmation} 项
            </Link>
            <Link
              href={pricingViewHref("gaps", data.project.id)}
              className="rounded bg-white px-2 py-2 font-semibold text-warning"
            >
              待建询价 {pendingInquiryCreation} 项
            </Link>
            <Link
              href={pricingViewHref("gaps", data.project.id)}
              className="rounded bg-white px-2 py-2 font-semibold text-warning"
            >
              待回填 {pendingBackfill} 项
            </Link>
            <span className="rounded bg-white px-2 py-2 font-semibold text-danger">
              高风险 {data.summary.highRiskItems} 项
            </span>
          </div>
        </article>
      </div>
      <div className="grid gap-2 border-t border-borderSoft p-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={onExport}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border text-[12px] font-bold",
            formalReady
              ? "border-success/30 bg-success-soft text-success"
              : "border-warning/30 bg-warning-soft text-warning",
          )}
        >
          <Download className="size-4" />
          {formalReady ? "导出正式套价表" : "导出套价草稿"}
        </button>
        <Link
          href={`/ai-report-center?source=project-pricing&projectPricingId=${data.project.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ai text-[12px] font-bold text-white"
        >
          <FileSpreadsheet className="size-4" />
          {formalReady ? "生成正式报告" : "生成报告草稿"}
        </Link>
        <Link
          href={`/project-pricing/${data.project.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary-soft text-[12px] font-bold text-primary"
        >
          <FolderSearch className="size-4" />
          查看成果档案
        </Link>
      </div>
    </section>
  );
}

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function BoqUploadDialog({
  open,
  project,
  onClose,
  onCompleted,
}: {
  open: boolean;
  project?: Project;
  onClose: () => void;
  onCompleted: (data: PricingPayload) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const metadata = project?.metadata ?? {};
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(project?.name || "");
  const [country, setCountry] = useState(String(metadata.country || "刚果金"));
  const [targetRegion, setTargetRegion] = useState(
    String(metadata.targetRegion || "Kinshasa"),
  );
  const [baseCurrency, setBaseCurrency] = useState(
    project?.base_currency || "USD",
  );
  const [priceTerm, setPriceTerm] = useState(project?.price_term || "CIF");
  const [exchangeRate, setExchangeRate] = useState(
    String(project?.exchange_rate || 7.18),
  );
  const [exchangeRateDate, setExchangeRateDate] = useState(
    String(metadata.exchangeRateDate || new Date().toISOString().slice(0, 10)),
  );
  const [validUntil, setValidUntil] = useState(
    project?.valid_until || dateAfter(30),
  );
  const [includeTax, setIncludeTax] = useState(metadata.includeTax === true);
  const [includeFreight, setIncludeFreight] = useState(
    metadata.includeFreight !== false,
  );
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    try {
      const sessionResponse = await fetch(
        "/api/project-pricing/upload-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project?.id,
            projectName: name,
            projectStage: "budgeting",
            country,
            targetRegion,
            baseCurrency,
            priceTerm,
            exchangeRate: Number(exchangeRate),
            exchangeRateDate,
            validUntil,
            includeTax,
            includeFreight,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
          }),
        },
      );
      const session = await sessionResponse.json();
      if (!sessionResponse.ok)
        throw new Error(requestError(session, "无法创建 BOQ 上传会话"));
      const storage = await createClient()
        .storage.from(session.upload.bucket)
        .upload(session.upload.path, file, {
          contentType: session.upload.contentType,
          upsert: false,
        });
      if (storage.error) throw storage.error;
      const parseResponse = await fetch(
        `/api/project-pricing/${session.data.projectId}/parse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...session.upload,
            fileName: file.name,
            fileSize: file.size,
          }),
        },
      );
      const parsed = await parseResponse.json();
      if (!parseResponse.ok)
        throw new Error(requestError(parsed, "BOQ 解析失败"));
      onCompleted(parsed.data);
      refreshSidebarCounts();
      emitMockToast({
        title: parsed.aiQueueError ? "BOQ 已解析，AI 复核未排队" : "BOQ 已上传并解析",
        description: parsed.aiQueueError
          ? `已写入 ${parsed.data.summary.totalItems} 条行项目；${parsed.aiQueueError}`
          : `已写入 ${parsed.data.summary.totalItems} 条真实行项目，AI 复核任务已排队。`,
        tone: parsed.aiQueueError ? "warning" : "success",
      });
      onClose();
    } catch (error) {
      emitMockToast({
        title: "BOQ 上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        tone: "warning",
      });
    } finally {
      setBusy(false);
    }
  }
  const creating = !project;
  const ready = Boolean(
    file &&
    name.trim() &&
    (!creating || (targetRegion.trim() && Number(exchangeRate) > 0)),
  );
  const fieldClass =
    "mt-1 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary";
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-card border border-borderSoft bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
          <div>
            <h2 className="text-[17px] font-bold text-textMain">
              {creating ? "新建项目并上传 BOQ" : "更新项目 BOQ"}
            </h2>
            <p className="mt-1 text-[12px] text-textMuted">
              {creating
                ? "先明确项目套价口径，再归档并解析 BOQ 源文件。"
                : `${project.project_code} · ${project.name}`}
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-md hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block text-[12px] font-bold text-textSecondary">
            项目名称 <span className="text-danger">*</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!creating}
              placeholder="例如：金沙萨水厂一期设备与地材套价"
              className={fieldClass}
            />
          </label>
          {creating ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-[12px] font-bold text-textSecondary">
                  国家 <span className="text-danger">*</span>
                  <input
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-[12px] font-bold text-textSecondary">
                  目标地区 <span className="text-danger">*</span>
                  <input
                    value={targetRegion}
                    onChange={(event) => setTargetRegion(event.target.value)}
                    placeholder="Kinshasa"
                    className={fieldClass}
                  />
                </label>
                <label className="block text-[12px] font-bold text-textSecondary">
                  基准币种 <span className="text-danger">*</span>
                  <select
                    value={baseCurrency}
                    onChange={(event) => {
                      setBaseCurrency(event.target.value);
                      if (event.target.value === "CNY") setExchangeRate("1");
                    }}
                    className={fieldClass}
                  >
                    <option>USD</option>
                    <option>CNY</option>
                    <option>CDF</option>
                    <option>EUR</option>
                  </select>
                </label>
                <label className="block text-[12px] font-bold text-textSecondary">
                  贸易条件 <span className="text-danger">*</span>
                  <select
                    value={priceTerm}
                    onChange={(event) => setPriceTerm(event.target.value)}
                    className={fieldClass}
                  >
                    <option>EXW</option>
                    <option>FOB</option>
                    <option>CIF</option>
                    <option>CFR</option>
                    <option>DDP</option>
                  </select>
                </label>
                <label className="block text-[12px] font-bold text-textSecondary">
                  折算汇率（对 CNY） <span className="text-danger">*</span>
                  <input
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    value={exchangeRate}
                    onChange={(event) => setExchangeRate(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-[12px] font-bold text-textSecondary">
                  汇率日期 <span className="text-danger">*</span>
                  <input
                    type="date"
                    value={exchangeRateDate}
                    onChange={(event) =>
                      setExchangeRateDate(event.target.value)
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block text-[12px] font-bold text-textSecondary">
                  价格有效期 <span className="text-danger">*</span>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3 rounded-[9px] border border-borderSoft bg-slate-50 px-3 py-2.5">
                <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-textSecondary">
                  <input
                    type="checkbox"
                    checked={includeTax}
                    onChange={(event) => setIncludeTax(event.target.checked)}
                  />
                  套价口径包含税费
                </label>
                <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-textSecondary">
                  <input
                    type="checkbox"
                    checked={includeFreight}
                    onChange={(event) =>
                      setIncludeFreight(event.target.checked)
                    }
                  />
                  套价口径包含运费
                </label>
                <span className="text-[10px] text-textMuted">
                  以上条件将保存在项目证据链中，后续询价与导出沿用该口径。
                </span>
              </div>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-36 w-full flex-col items-center justify-center rounded-[10px] border border-dashed border-primary/35 bg-primary-soft/45 text-center transition hover:border-primary"
          >
            <FileUp className="size-9 text-primary" />
            <span className="mt-3 text-[13px] font-bold text-primary">
              {file?.name || "选择 .xlsx / .csv BOQ 文件"}
            </span>
            <span className="mt-1 text-[10.5px] text-textMuted">
              最大 50 MB，旧版 .xls 请先另存为 .xlsx
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-borderSoft px-5 py-4">
          <p className="text-[10.5px] text-textMuted">
            上传后进入“解析核对”，不会直接形成最终商务价格。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-borderSoft px-4 text-[12px] font-semibold"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!ready || busy}
              onClick={upload}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )}
              {busy ? "上传解析中" : creating ? "创建并解析" : "上传并解析"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

const confirmationReasonOptions = [
  { value: "accept_ai_recommendation", label: "AI 推荐价格及条件可接受" },
  { value: "select_alternative", label: "其他候选价格更适用" },
  { value: "commercial_adjustment", label: "根据商务条件人工调整" },
  { value: "latest_quote", label: "采用最新供应商报价" },
  { value: "other", label: "其他原因" },
] as const;

type ConfirmationReason =
  | "accept_ai_recommendation"
  | "select_alternative"
  | "commercial_adjustment"
  | "latest_quote"
  | "other";

type PriceBasis =
  | "ai_recommendation"
  | "price_library_candidate"
  | "supplier_quote"
  | "manual_adjustment";

function metadataText(
  metadata: Record<string, unknown>,
  key: string,
  fallback = "待核验",
) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function formatCommercialAmount(value: number, currency = "USD") {
  return `${currency} ${Number.isFinite(value) ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "0"}`;
}

function ManualPriceDialog({
  item,
  project,
  projectTotalUsd,
  reviewItems,
  onClose,
  onMove,
  onSaved,
}: {
  item: PricingItem;
  project: Project;
  projectTotalUsd: number;
  reviewItems: PricingItem[];
  onClose: () => void;
  onMove: (item: PricingItem) => void;
  onSaved: (data: PricingPayload, nextItem: PricingItem | null) => void;
}) {
  const alternatives = pricingAlternatives(item);
  const initialPrice = Number(item.matched_unit_price ?? 0);
  const initialUsdPrice = Number(
    item.normalized_usd_price ??
      (item.currency === "USD" ? item.matched_unit_price : 0) ??
      0,
  );
  const [price, setPrice] = useState(initialPrice ? String(initialPrice) : "");
  const [currency, setCurrency] = useState(item.currency || "USD");
  const [normalizedUsdPrice, setNormalizedUsdPrice] = useState(
    initialUsdPrice ? String(initialUsdPrice) : "",
  );
  const [confirmationReason, setConfirmationReason] =
    useState<ConfirmationReason>(
      item.price_source_type === "inquiry_quote"
        ? "latest_quote"
        : item.price_source_type === "manual"
          ? "commercial_adjustment"
          : "accept_ai_recommendation",
    );
  const [priceBasis, setPriceBasis] = useState<PriceBasis>(
    item.price_source_type === "inquiry_quote"
      ? "supplier_quote"
      : item.price_source_type === "manual"
        ? "manual_adjustment"
        : "ai_recommendation",
  );
  const [notes, setNotes] = useState("");
  const [sourceRecordId, setSourceRecordId] = useState(
    item.source_record_id || "",
  );
  const [sourceType, setSourceType] = useState(
    item.price_source_type || "manual",
  );
  const [supplierId, setSupplierId] = useState(item.supplier_id || "");
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    item.source_record_id || "",
  );
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedAlternative = alternatives.find(
    (candidate) => candidate.id === selectedCandidateId,
  );
  const sourceCode =
    selectedAlternative?.code || item.source_legacy_id || "人工录入";
  const supplierName =
    selectedAlternative?.supplierName ||
    item.supplier?.supplier_name ||
    item.supplier?.name ||
    metadataText(item.metadata, "supplierName", "未指定供应商");
  const quoteDate =
    selectedAlternative?.quoteDate ||
    metadataText(item.metadata, "selectedCandidateQuoteDate");
  const validUntil =
    selectedAlternative?.validUntil ||
    metadataText(item.metadata, "selectedCandidateValidUntil");
  const priceTerm =
    selectedAlternative?.priceTerm ||
    metadataText(
      item.metadata,
      "selectedCandidatePriceTerm",
      project.price_term || "待核验",
    );
  const region =
    selectedAlternative?.region ||
    metadataText(item.metadata, "selectedCandidateRegion");
  const taxFreightTerms = metadataText(
    item.metadata,
    "taxFreightTerms",
    "来源记录未结构化，确认时需核验",
  );

  const inputPrice = Number(price || 0);
  const inputUsdPrice =
    currency === "USD" ? inputPrice : Number(normalizedUsdPrice || 0);
  const currentSubtotalUsd = initialUsdPrice * Number(item.quantity || 0);
  const adjustedSubtotalUsd = inputUsdPrice * Number(item.quantity || 0);
  const subtotalDeltaUsd = adjustedSubtotalUsd - currentSubtotalUsd;
  const adjustedProjectTotalUsd =
    projectTotalUsd - currentSubtotalUsd + adjustedSubtotalUsd;
  const differencePercent = initialUsdPrice
    ? ((inputUsdPrice - initialUsdPrice) / initialUsdPrice) * 100
    : 0;
  const currentIndex = reviewItems.findIndex(
    (reviewItem) => reviewItem.id === item.id,
  );
  const previousItem = currentIndex > 0 ? reviewItems[currentIndex - 1] : null;
  const nextItem =
    currentIndex >= 0 && currentIndex < reviewItems.length - 1
      ? reviewItems[currentIndex + 1]
      : null;

  const notesRequired = confirmationReason === "other";
  const baseValid =
    inputPrice > 0 &&
    /^[A-Z]{3}$/.test(currency) &&
    (!notesRequired || Boolean(notes.trim()));
  const confirmationValid =
    baseValid &&
    inputUsdPrice > 0 &&
    Boolean(sourceType) &&
    (currency === "USD" || Number(normalizedUsdPrice) > 0);

  function applyRecommendedPrice() {
    setPrice(initialPrice ? String(initialPrice) : "");
    setCurrency(item.currency || "USD");
    setNormalizedUsdPrice(initialUsdPrice ? String(initialUsdPrice) : "");
    setSourceRecordId(item.source_record_id || "");
    setSourceType(item.price_source_type || "manual");
    setSupplierId(item.supplier_id || "");
    setSelectedCandidateId(item.source_record_id || "");
    setConfirmationReason("accept_ai_recommendation");
    setPriceBasis("ai_recommendation");
  }

  function applyAlternative(candidate: PricingAlternative) {
    setPrice(candidate.price !== undefined ? String(candidate.price) : "");
    setCurrency(candidate.currency || "USD");
    setNormalizedUsdPrice(
      candidate.usdPrice !== undefined ? String(candidate.usdPrice) : "",
    );
    setSourceRecordId(candidate.id);
    setSourceType(candidate.sourceType || "manual");
    setSupplierId(candidate.supplierId || "");
    setSelectedCandidateId(candidate.id);
    setConfirmationReason("select_alternative");
    setPriceBasis("price_library_candidate");
  }

  function markManualAdjustment() {
    setConfirmationReason("commercial_adjustment");
    setPriceBasis("manual_adjustment");
  }

  async function save(confirm: boolean) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/project-pricing/${project.id}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitPrice: inputPrice,
            currency,
            normalizedUsdPrice: inputUsdPrice,
            notes,
            confirmationReason,
            priceBasis,
            confirm,
            sourceType: sourceType || "manual",
            sourceRecordId: sourceRecordId || undefined,
            supplierId: supplierId || undefined,
            sourceCode,
            supplierName,
            sourceQuoteDate: quoteDate,
            sourceValidUntil: validUntil,
            sourcePriceTerm: priceTerm,
            sourceRegion: region,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          requestError(payload, confirm ? "价格确认失败" : "候选方案保存失败"),
        );
      const pendingItems = (payload.data.items as PricingItem[]).filter(
        (candidate) =>
          candidate.matched_unit_price !== null &&
          candidate.decision_status !== "confirmed",
      );
      const nextPending = confirm
        ? pendingItems.find((candidate) => candidate.line_no > item.line_no) ||
          pendingItems[0] ||
          null
        : null;
      onSaved(payload.data, nextPending);
      refreshSidebarCounts();
      emitMockToast({
        title: confirm ? "本项价格已确认" : "候选方案已保存",
        description: confirm
          ? nextPending
            ? `已写入审计记录，继续确认 ${nextPending.boq_code}。`
            : "已写入审计记录，当前待确认价格已全部处理。"
          : "候选方案尚未计入已确认金额，可继续复核。",
        tone: "success",
      });
    } catch (error) {
      emitMockToast({
        title: confirm ? "确认失败" : "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        tone: "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  const sourceHref = sourceRecordId
    ? sourceType === "equipment_price"
      ? `/equipment-prices/${sourceRecordId}`
      : sourceType === "material_price"
        ? `/material-prices/${sourceRecordId}`
        : ""
    : "";

  return (
    <>
      <OverlayShell
        open
        variant="drawer"
        onClose={onClose}
        ariaLabel="价格确认"
        panelClassName="flex w-[600px] max-w-full flex-col"
      >
        <header className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-bold text-textMain">价格确认</h2>
              <span className="rounded-pill bg-ai-soft px-2 py-1 text-[10px] font-bold text-ai">
                AI {item.confidence}%
              </span>
              <span
                className={cn(
                  "rounded-pill px-2 py-1 text-[10px] font-bold",
                  riskStyle[item.risk_level],
                )}
              >
                {riskLabel[item.risk_level]}
              </span>
            </div>
            <p className="mt-1 truncate text-[12px] text-textMuted">
              {item.boq_code} · {item.item_name} ·{" "}
              {item.specification || "无规格"}
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭价格确认"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-textMuted hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <section className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-borderSoft px-5 py-4 text-[12px] sm:grid-cols-4">
            <div>
              <p className="text-[10px] text-textMuted">数量</p>
              <p className="mt-1 font-bold tabular-nums">
                {item.quantity.toLocaleString("zh-CN")} {item.unit}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-textMuted">当前推荐单价</p>
              <p className="mt-1 font-bold tabular-nums text-primary">
                {formatCommercialAmount(initialPrice, item.currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-textMuted">匹配等级</p>
              <p className="mt-1 font-bold">{matchLabel[item.match_level]}</p>
            </div>
            <div>
              <p className="text-[10px] text-textMuted">证据</p>
              <p className="mt-1 font-bold">{item.evidence_count} 条</p>
            </div>
          </section>

          <section className="border-b border-borderSoft px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-bold">AI 推荐依据</h3>
                <p className="mt-1 text-[10px] text-textMuted">
                  价格来源、商务条件与有效期必须由人工核验
                </p>
              </div>
              {sourceHref ? (
                <Link
                  href={sourceHref}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  查看价格记录
                </Link>
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 rounded-md bg-slate-50 p-3 text-[11px] sm:grid-cols-3">
              <div>
                <dt className="text-textMuted">来源编号</dt>
                <dd
                  className="mt-1 truncate font-bold text-primary"
                  title={sourceCode}
                >
                  {sourceCode}
                </dd>
              </div>
              <div>
                <dt className="text-textMuted">供应商</dt>
                <dd
                  className="mt-1 truncate font-semibold"
                  title={supplierName}
                >
                  {supplierName}
                </dd>
              </div>
              <div>
                <dt className="text-textMuted">报价日期</dt>
                <dd className="mt-1 font-semibold">{quoteDate}</dd>
              </div>
              <div>
                <dt className="text-textMuted">有效期</dt>
                <dd className="mt-1 font-semibold">{validUntil}</dd>
              </div>
              <div>
                <dt className="text-textMuted">价格条件 / 区域</dt>
                <dd className="mt-1 font-semibold">
                  {priceTerm} · {region}
                </dd>
              </div>
              <div>
                <dt className="text-textMuted">税费与运保</dt>
                <dd className="mt-1 font-semibold text-warning">
                  {taxFreightTerms}
                </dd>
              </div>
            </dl>
            {item.notes ? (
              <p className="mt-3 rounded-md border border-warning/20 bg-warning-soft/45 px-3 py-2 text-[11px] leading-5 text-warning">
                风险提示：{item.notes}
              </p>
            ) : null}
          </section>

          <section className="border-b border-borderSoft px-5 py-4">
            <h3 className="text-[13px] font-bold">价格决策方式</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={applyRecommendedPrice}
                className={cn(
                  "min-h-10 rounded-md border px-3 text-[11px] font-bold",
                  priceBasis === "ai_recommendation"
                    ? "border-ai bg-ai-soft text-ai"
                    : "border-borderSoft text-textSecondary",
                )}
              >
                采用 AI 推荐
              </button>
              <button
                type="button"
                disabled={!alternatives.length}
                onClick={() => {
                  if (alternatives[0]) applyAlternative(alternatives[0]);
                }}
                className={cn(
                  "min-h-10 rounded-md border px-3 text-[11px] font-bold disabled:opacity-40",
                  priceBasis === "price_library_candidate"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-borderSoft text-textSecondary",
                )}
              >
                选择候选价格
              </button>
              <button
                type="button"
                onClick={markManualAdjustment}
                className={cn(
                  "min-h-10 rounded-md border px-3 text-[11px] font-bold",
                  priceBasis === "manual_adjustment"
                    ? "border-warning bg-warning-soft text-warning"
                    : "border-borderSoft text-textSecondary",
                )}
              >
                手工调整
              </button>
            </div>
            {alternatives.length ? (
              <div className="mt-3 space-y-2">
                {alternatives.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => applyAlternative(candidate)}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-md border px-3 py-2 text-left text-[11px]",
                      selectedCandidateId === candidate.id
                        ? "border-primary bg-primary-soft/55"
                        : "border-borderSoft hover:border-primary/30",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      <strong>{candidate.code}</strong>
                      <span className="ml-2 text-textMuted">
                        {candidate.supplierName || candidate.name}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums text-primary">
                      {formatCommercialAmount(
                        Number(candidate.price || 0),
                        candidate.currency || "USD",
                      )}
                    </span>
                    <span className="font-bold text-ai">
                      {candidate.score}%
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="border-b border-borderSoft px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-bold">确认价格与原因</h3>
              <span className="text-[10px] text-textMuted">
                当前来源：{sourceCode}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-[11px] font-bold">
                确认单价 <span className="text-danger">*</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value);
                    markManualAdjustment();
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-borderSoft px-3 tabular-nums"
                />
              </label>
              <label className="block text-[11px] font-bold">
                币种 <span className="text-danger">*</span>
                <select
                  value={currency}
                  onChange={(event) => {
                    setCurrency(event.target.value);
                    markManualAdjustment();
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-borderSoft px-3"
                >
                  <option>USD</option>
                  <option>CNY</option>
                  <option>CDF</option>
                  <option>EUR</option>
                </select>
              </label>
              {currency !== "USD" ? (
                <label className="block text-[11px] font-bold">
                  USD 折算单价 <span className="text-danger">*</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={normalizedUsdPrice}
                    onChange={(event) => {
                      setNormalizedUsdPrice(event.target.value);
                      markManualAdjustment();
                    }}
                    className="mt-1 h-10 w-full rounded-md border border-borderSoft px-3 tabular-nums"
                  />
                </label>
              ) : null}
              <label className="block text-[11px] font-bold">
                确认原因 <span className="text-danger">*</span>
                <select
                  value={confirmationReason}
                  onChange={(event) =>
                    setConfirmationReason(
                      event.target.value as ConfirmationReason,
                    )
                  }
                  className="mt-1 h-10 w-full rounded-md border border-borderSoft px-3"
                >
                  {confirmationReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-[11px] font-bold">
              补充说明{" "}
              {notesRequired ? <span className="text-danger">*</span> : null}
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 min-h-20 w-full resize-y rounded-md border border-borderSoft p-3 leading-5"
                placeholder="补充税费、运输、付款、技术偏差或其他商务判断"
              />
            </label>
          </section>

          <section className="border-b border-borderSoft px-5 py-4">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              <h3 className="text-[13px] font-bold">金额影响预览</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
              <div>
                <p className="text-textMuted">调整后小计</p>
                <p className="mt-1 font-bold tabular-nums text-primary">
                  {formatCommercialAmount(adjustedSubtotalUsd)}
                </p>
              </div>
              <div>
                <p className="text-textMuted">小计变化</p>
                <p
                  className={cn(
                    "mt-1 font-bold tabular-nums",
                    subtotalDeltaUsd > 0
                      ? "text-danger"
                      : subtotalDeltaUsd < 0
                        ? "text-success"
                        : "text-textSecondary",
                  )}
                >
                  {subtotalDeltaUsd > 0 ? "+" : ""}
                  {formatCommercialAmount(subtotalDeltaUsd)}
                </p>
              </div>
              <div>
                <p className="text-textMuted">单价差异</p>
                <p className="mt-1 font-bold tabular-nums">
                  {differencePercent > 0 ? "+" : ""}
                  {differencePercent.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-textMuted">项目估算更新后</p>
                <p className="mt-1 font-bold tabular-nums text-ai">
                  {formatCommercialAmount(adjustedProjectTotalUsd)}
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-start gap-3 px-5 py-4 text-[11px] leading-5 text-textSecondary">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-textMuted" />
            <p>
              最终确认将记录操作者、确认时间、原价格、调整后价格、确认原因和价格口径；AI
              推荐不会替代最终商务判断。
            </p>
          </section>
        </div>

        <footer className="border-t border-borderSoft bg-white px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="上一条待确认价格"
                disabled={!previousItem || busy}
                onClick={() => previousItem && onMove(previousItem)}
                className="flex size-9 items-center justify-center rounded-md border border-borderSoft text-textSecondary disabled:opacity-35"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="min-w-16 text-center text-[11px] tabular-nums text-textMuted">
                {currentIndex >= 0 ? currentIndex + 1 : 1} /{" "}
                {reviewItems.length}
              </span>
              <button
                type="button"
                aria-label="下一条待确认价格"
                disabled={!nextItem || busy}
                onClick={() => nextItem && onMove(nextItem)}
                className="flex size-9 items-center justify-center rounded-md border border-borderSoft text-textSecondary disabled:opacity-35"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-md border border-borderSoft px-4 text-[12px] font-semibold text-textSecondary"
              >
                取消
              </button>
              <button
                type="button"
                disabled={busy || !baseValid}
                onClick={() => void save(false)}
                className="min-h-10 rounded-md border border-primary/30 bg-white px-4 text-[12px] font-bold text-primary disabled:opacity-50"
              >
                保存候选方案
              </button>
              <button
                type="button"
                disabled={busy || !confirmationValid}
                onClick={() => setConfirmOpen(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                确认价格并完成本项
              </button>
            </div>
          </div>
        </footer>
      </OverlayShell>
      <ConfirmDialog
        open={confirmOpen}
        title="确认采用该价格？"
        description={`${item.boq_code} · ${formatCommercialAmount(inputPrice, currency)} · 小计 ${formatCommercialAmount(adjustedSubtotalUsd)}`}
        confirmLabel="确认价格"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void save(true);
        }}
      >
        确认后将计入已确认金额，并生成不可省略的人工决策审计信息。
      </ConfirmDialog>
    </>
  );
}

function ProjectPricingPageContent() {
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("projectId") ?? "";
  const requestedBoqId = searchParams.get("boqId") ?? "";
  const createdInquiry = searchParams.get("createdInquiry") ?? "";
  const requestedView = searchParams.get("view");
  const view: PricingView =
    requestedView === "projects" ||
    requestedView === "workspace" ||
    requestedView === "review" ||
    requestedView === "gaps" ||
    requestedView === "reports"
      ? requestedView
      : requestedProjectId
        ? "workspace"
        : "projects";
  const [data, setData] = useState<PricingPayload | null>(null);
  const [projects, setProjects] = useState<ProjectPricingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [manualItem, setManualItem] = useState<PricingItem | null>(null);
  const [autoPricing, setAutoPricing] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGapIds, setSelectedGapIds] = useState<Set<string> | null>(
    null,
  );
  const loadedRouteKeyRef = useRef("");
  const notifiedInquiryRef = useRef("");
  const routeKey = `${requestedProjectId}:${requestedBoqId}`;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const suffix = requestedProjectId
        ? `?id=${encodeURIComponent(requestedProjectId)}`
        : "";
      const response = await fetch(`/api/project-pricing${suffix}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(requestError(payload, "项目套价加载失败"));
      setData(payload.data);
      setProjects(Array.isArray(payload.projects) ? payload.projects : []);
      if (
        requestedBoqId &&
        payload.data?.items?.some(
          (item: PricingItem) =>
            item.id === requestedBoqId || item.boq_code === requestedBoqId,
        )
      )
        setSelectedId(
          payload.data.items.find(
            (item: PricingItem) =>
              item.id === requestedBoqId || item.boq_code === requestedBoqId,
          ).id,
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "项目套价加载失败");
    } finally {
      setLoading(false);
    }
  }, [requestedBoqId, requestedProjectId]);
  useEffect(() => {
    if (loadedRouteKeyRef.current === routeKey) return;
    loadedRouteKeyRef.current = routeKey;
    // The remote collection is synchronized when the route-selected project changes.
    void load();
  }, [load, routeKey]);
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const viewMatches =
          view === "review"
            ? item.matched_unit_price !== null &&
              item.decision_status !== "confirmed"
            : view === "gaps"
              ? item.needs_inquiry || item.match_level === "unmatched"
              : true;
        return (
          viewMatches &&
          (level === "all" || item.match_level === level) &&
          (category === "all" || item.category === category) &&
          (!keyword.trim() ||
            `${item.boq_code} ${item.item_name} ${item.specification}`
              .toLowerCase()
              .includes(keyword.trim().toLowerCase()))
        );
      }),
    [items, level, category, keyword, view],
  );
  const selected =
    filtered.find((item) => item.id === selectedId) || filtered[0] || null;
  const gapItems = useMemo(
    () =>
      items.filter(
        (item) => item.needs_inquiry || item.match_level === "unmatched",
      ),
    [items],
  );
  const workflowGapItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.needs_inquiry ||
          item.match_level === "unmatched" ||
          Boolean(linkedInquiry(item).id || linkedInquiry(item).code),
      ),
    [items],
  );
  const inquiryEligibleItems = useMemo(
    () =>
      gapItems.filter(
        (item) => !linkedInquiry(item).id && !linkedInquiry(item).code,
      ),
    [gapItems],
  );
  const inquiryEligibleIds = useMemo(
    () => inquiryEligibleItems.map((item) => item.id),
    [inquiryEligibleItems],
  );
  useEffect(() => {
    if (!createdInquiry || notifiedInquiryRef.current === createdInquiry)
      return;
    notifiedInquiryRef.current = createdInquiry;
    emitMockToast({
      title: "询价任务已创建并关联",
      description: `${createdInquiry} 已回到缺口工作区，可继续处理其余缺口。`,
      tone: "success",
    });
  }, [createdInquiry]);
  const selectedInquiryIds = useMemo(
    () =>
      selectedGapIds === null
        ? inquiryEligibleIds
        : inquiryEligibleIds.filter((id) => selectedGapIds.has(id)),
    [inquiryEligibleIds, selectedGapIds],
  );
  const actionInquiryIds =
    view === "gaps" ? selectedInquiryIds : inquiryEligibleIds;
  const selectedGroupSummary = useMemo(() => {
    const selectedSet = new Set(selectedInquiryIds);
    const labels = {
      equipment: "设备",
      material: "地材",
      service: "服务",
    } as const;
    return (
      Object.entries(
        inquiryEligibleItems.reduce<Record<PricingItem["category"], number>>(
          (counts, item) => {
            if (selectedSet.has(item.id)) counts[item.category] += 1;
            return counts;
          },
          { equipment: 0, material: 0, service: 0 },
        ),
      )
        .filter(([, count]) => count > 0)
        .map(
          ([key, count]) =>
            `${labels[key as PricingItem["category"]]} ${count}`,
        )
        .join(" · ") || "尚未选择缺口"
    );
  }, [inquiryEligibleItems, selectedInquiryIds]);
  const workflowState = useMemo(
    () => ({
      hasProject: Boolean(data),
      totalItems: items.length,
      matchedItems: items.filter((item) => item.matched_unit_price !== null)
        .length,
      confirmedItems: items.filter(
        (item) =>
          item.matched_unit_price !== null &&
          item.decision_status === "confirmed",
      ).length,
      gapItems: workflowGapItems.length,
      inquiryLinkedItems: workflowGapItems.filter((item) =>
        Boolean(linkedInquiry(item).id || linkedInquiry(item).code),
      ).length,
      inquiryQuoteItems: workflowGapItems.filter(
        (item) =>
          item.price_source_type === "inquiry_quote" ||
          Boolean(item.metadata?.inquiryQuoteReceivedAt),
      ).length,
      matchingCompleted: Boolean(data?.project.pricing_result?.pricedAt),
    }),
    [data, items, workflowGapItems],
  );
  const unresolvedForReport =
    Math.max(0, workflowState.matchedItems - workflowState.confirmedItems) +
    Math.max(0, workflowState.gapItems - workflowState.inquiryQuoteItems);
  const formalReady = unresolvedForReport === 0;
  function handleUploadCompleted(payload: PricingPayload) {
    setData(payload);
    void load();
  }
  function openNewProject() {
    setCreatingProject(true);
    setUploadOpen(true);
  }
  function openBoqUpdate() {
    setCreatingProject(false);
    setUploadOpen(true);
  }
  async function runAutoPricing() {
    if (!data || autoPricing) {
      if (!data) openNewProject();
      return;
    }
    setAutoPricing(true);
    try {
      const response = await fetch(
        `/api/project-pricing/${data.project.id}/auto-price`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(requestError(payload, "自动套价失败"));
      setData(payload.data);
      refreshSidebarCounts();
      emitMockToast({
        title: "AI 自动套价完成",
        description: `已处理 ${payload.data.summary.totalItems} 项；${payload.data.summary.gapItems} 项仍需询价或人工复核。`,
        tone: "success",
      });
    } catch (e) {
      emitMockToast({
        title: "自动套价失败",
        description: e instanceof Error ? e.message : "请稍后重试",
        tone: "warning",
      });
    } finally {
      setAutoPricing(false);
    }
  }
  function exportCsv() {
    if (!data) return;
    const exportedAt = new Date().toISOString();
    const resultStatus = formalReady ? "正式成果" : "草稿（未完成业务闭环）";
    const rows = [
      ["项目编号", data.project.project_code],
      ["项目名称", data.project.name],
      ["成果状态", resultStatus],
      ["未闭环项数", unresolvedForReport],
      ["导出时间", exportedAt],
      [
        "使用说明",
        formalReady
          ? "价格确认与询价回填已闭环，可进入正式商务审批。"
          : "仅供过程复核，不得作为正式商务成果发布。",
      ],
      [],
      [
        "BOQ编号",
        "名称",
        "规格",
        "数量",
        "单位",
        "匹配单价",
        "币种",
        "来源",
        "可信度",
        "风险",
        "决策状态",
      ],
      ...data.items.map((item) => [
        item.boq_code,
        item.item_name,
        item.specification,
        item.quantity,
        item.unit,
        item.matched_unit_price ?? "",
        item.currency,
        item.price_source_type,
        item.confidence,
        item.risk_level,
        item.decision_status,
      ]),
    ];
    const blob = new Blob(
      [
        `\ufeff${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")}`,
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.project.project_code}-${formalReady ? "pricing-final" : "pricing-draft"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    emitMockToast({
      title: formalReady ? "正式套价表已导出" : "套价草稿已导出",
      description: formalReady
        ? "闭环校验已通过，文件已标记为正式成果。"
        : `仍有 ${unresolvedForReport} 项未闭环，文件已标记为草稿。`,
      tone: formalReady ? "success" : "warning",
    });
  }

  return (
    <AppLayout>
      <div className="space-y-3 pb-6">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-bold text-textMain">
                {view === "projects"
                  ? "项目套价"
                  : view === "reports"
                    ? "套价成果"
                    : "项目套价工作台"}
              </h1>
              <span className="rounded-pill border border-success/20 bg-success-soft px-2 py-1 text-[10px] font-bold text-success">
                Supabase 真实数据
              </span>
            </div>
            <p className="mt-1 text-[13px] text-textMuted">
              {view === "projects"
                ? "创建、选择并跟踪项目套价方案。"
                : view === "reports"
                  ? "检查闭环状态，形成可追溯的套价成果与报告。"
                  : "集中处理 BOQ 解析、AI 匹配、人工确认和缺口询价。"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {view === "projects" ? (
              <button
                type="button"
                onClick={openNewProject}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-bold text-white"
              >
                <FileUp className="size-4" />
                新建套价项目
              </button>
            ) : data && view === "reports" ? (
              <button
                onClick={exportCsv}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold",
                  formalReady
                    ? "border-success/30 bg-success-soft text-success"
                    : "border-warning/30 bg-warning-soft text-warning",
                )}
              >
                <Download className="size-4" />
                {formalReady ? "导出正式套价表" : "导出套价草稿"}
              </button>
            ) : data ? (
              <>
                <button
                  onClick={runAutoPricing}
                  disabled={autoPricing || !items.length}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ai px-3 text-[13px] font-bold text-white shadow-ai disabled:opacity-50"
                >
                  {autoPricing ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <WandSparkles className="size-4" />
                  )}
                  {autoPricing ? "套价中" : "AI自动套价"}
                </button>
                <button
                  onClick={openBoqUpdate}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary/25 bg-white px-3 text-[13px] font-bold text-primary"
                >
                  <FileUp className="size-4" />
                  更新 BOQ
                </button>
                <Link
                  href={`/project-pricing/boq-parse?projectId=${data.project.id}`}
                  title="核对上传 BOQ 的识别结果，不用于确认价格"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-bold text-primary"
                >
                  <FileSpreadsheet className="size-4" />
                  核对原始 BOQ
                </Link>
              </>
            ) : null}
          </div>
        </header>
        {view === "workspace" || view === "review" || view === "gaps" ? (
          <ProjectPricingWorkflow state={workflowState} />
        ) : null}
        {error ? (
          <section className="flex items-center justify-between rounded-card border border-danger/20 bg-danger-soft p-4 text-[13px] font-semibold text-danger">
            <span>真实数据加载失败：{error}</span>
            <button
              onClick={load}
              className="rounded-md bg-white px-3 py-2 font-bold"
            >
              <RefreshCw className="mr-1 inline size-4" />
              重新加载
            </button>
          </section>
        ) : null}
        {loading ? (
          <section className="flex min-h-40 items-center justify-center rounded-card border border-borderSoft bg-white">
            <LoaderCircle className="size-6 animate-spin text-primary" />
            <span className="ml-2 text-[13px] text-textMuted">
              正在读取项目套价数据...
            </span>
          </section>
        ) : null}
        {!loading && !error && !data && view === "projects" ? (
          <ProjectPricingEmptyState onCreate={openNewProject} />
        ) : null}
        {!loading && !error && view === "projects" ? (
          <ProjectPricingList
            projects={projects}
            currentId={data?.project.id}
            view="workspace"
          />
        ) : null}
        {data && view !== "projects" ? (
          <>
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary/20 bg-primary-soft/45 px-4 py-3">
              <div>
                <p className="text-[12px] font-bold text-primary">
                  {data.project.project_code} · {data.project.name}
                </p>
                <p className="mt-1 text-[11px] text-textMuted">
                  {String(
                    data.project.metadata?.targetRegion ||
                      data.project.metadata?.country ||
                      "地区待补充",
                  )}{" "}
                  · {data.project.base_currency} · {data.project.price_term} ·
                  汇率 {data.project.exchange_rate} · 有效期{" "}
                  {data.project.valid_until || "待设置"}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={pricingViewHref("projects")}
                  className="rounded-md border border-primary/20 bg-white px-3 py-2 text-[12px] font-bold text-primary"
                >
                  切换项目
                </Link>
                <Link
                  href={`/project-pricing/${data.project.id}`}
                  className="rounded-md border border-primary/20 bg-white px-3 py-2 text-[12px] font-bold text-primary"
                >
                  查看方案档案
                </Link>
              </div>
            </section>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <KpiCard
                label="BOQ总项"
                value={String(data.summary.totalItems)}
                unit="项"
                tone="blue"
                icon={Database}
              />
              <KpiCard
                label="已匹配"
                value={String(data.summary.matchedItems)}
                unit="项"
                tone="green"
                icon={CheckCircle2}
              />
              <KpiCard
                label="平均可信度"
                value={`${data.summary.averageConfidence}%`}
                tone="purple"
                icon={Sparkles}
              />
              <KpiCard
                label="价格缺口"
                value={String(data.summary.gapItems)}
                unit="项"
                tone="orange"
                icon={Search}
              />
              <KpiCard
                label="当前估算"
                value={data.summary.totalUsd.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
                unit="USD"
                tone="purple"
                icon={HandCoins}
              />
              <KpiCard
                label="高风险"
                value={String(data.summary.highRiskItems)}
                unit="项"
                tone="red"
                icon={AlertTriangle}
              />
            </div>
            {view === "reports" ? (
              <ProjectPricingResults
                data={data}
                workflowState={workflowState}
                unresolvedForReport={unresolvedForReport}
                onExport={exportCsv}
              />
            ) : (
              <>
                {view === "gaps" ? (
                  <ProjectPricingGapPlan projectId={data.project.id} />
                ) : null}
                <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
                    <div className="border-b border-borderSoft p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <ModuleHeader
                          icon={FileSpreadsheet}
                          title="BOQ 自动套价结果"
                          subtitle={
                            view === "review"
                              ? "仅显示待人工确认的推荐价；选择一行后在右侧核验并确认采用"
                              : view === "gaps"
                                ? "仅显示价格缺口；选择条目后生成供应商询价任务"
                                : `显示全部 ${items.length} 条 BOQ、匹配价格及确认状态`
                          }
                          tone="purple"
                          density="compact"
                        />
                        <div
                          className="inline-flex rounded-md border border-borderSoft bg-slate-50 p-1"
                          role="tablist"
                          aria-label="套价结果工作队列"
                        >
                          <Link
                            href={pricingViewHref("workspace", data.project.id)}
                            role="tab"
                            aria-selected={view === "workspace"}
                            className={cn(
                              "flex min-h-8 items-center rounded px-3 text-[11px] font-bold",
                              view === "workspace"
                                ? "bg-primary text-white shadow-sm"
                                : "text-textSecondary",
                            )}
                          >
                            全部 BOQ
                            <span className="ml-1 tabular-nums">
                              {items.length}
                            </span>
                          </Link>
                          <Link
                            href={pricingViewHref("review", data.project.id)}
                            role="tab"
                            aria-selected={view === "review"}
                            className={cn(
                              "flex min-h-8 items-center rounded px-3 text-[11px] font-bold",
                              view === "review"
                                ? "bg-primary text-white shadow-sm"
                                : "text-textSecondary",
                            )}
                          >
                            待确认价格
                            <span className="ml-1 tabular-nums">
                              {Math.max(
                                0,
                                workflowState.matchedItems -
                                  workflowState.confirmedItems,
                              )}
                            </span>
                          </Link>
                          <Link
                            href={pricingViewHref("gaps", data.project.id)}
                            role="tab"
                            aria-selected={view === "gaps"}
                            className={cn(
                              "flex min-h-8 items-center rounded px-3 text-[11px] font-bold",
                              view === "gaps"
                                ? "bg-warning text-white shadow-sm"
                                : "text-textSecondary",
                            )}
                          >
                            价格缺口
                            <span className="ml-1 tabular-nums">
                              {gapItems.length}
                            </span>
                          </Link>
                        </div>
                      </div>
                      {view === "review" ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/15 bg-primary-soft/45 px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-textSecondary">
                            <span className="font-bold text-primary">
                              价格确认流程
                            </span>
                            <span>选择待确认 BOQ</span>
                            <ArrowRight className="size-3.5 text-textMuted" />
                            <span>核验来源与证据</span>
                            <ArrowRight className="size-3.5 text-textMuted" />
                            <span>确认或调整价格</span>
                          </div>
                          <a
                            href="#pricing-decision-panel"
                            className="inline-flex min-h-8 items-center gap-1 rounded-md border border-primary/20 bg-white px-2.5 text-[11px] font-bold text-primary"
                          >
                            定位人工确认区
                            <ArrowRight className="size-3.5" />
                          </a>
                        </div>
                      ) : null}
                      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_150px_150px_auto]">
                        <label className="flex h-9 items-center gap-2 rounded-md border border-borderSoft px-3">
                          <Search className="size-4 text-textMuted" />
                          <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="搜索 BOQ、名称或规格"
                            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                          />
                        </label>
                        <select
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                          className="h-9 rounded-md border border-borderSoft px-2 text-[12px]"
                        >
                          <option value="all">全部匹配等级</option>
                          <option value="exact">精准匹配</option>
                          <option value="similar">相似匹配</option>
                          <option value="model">型号匹配</option>
                          <option value="type">类型匹配</option>
                          <option value="unmatched">无匹配</option>
                        </select>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="h-9 rounded-md border border-borderSoft px-2 text-[12px]"
                        >
                          <option value="all">全部分类</option>
                          <option value="equipment">设备</option>
                          <option value="material">地材</option>
                          <option value="service">服务</option>
                        </select>
                        <button
                          onClick={() => {
                            setKeyword("");
                            setLevel("all");
                            setCategory("all");
                          }}
                          className="min-h-11 rounded-md border border-borderSoft px-3 text-[12px] font-semibold"
                        >
                          重置
                        </button>
                      </div>
                      {view === "gaps" ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/20 bg-warning-soft/45 px-3 py-2">
                          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[12px] font-bold text-textMain">
                            <input
                              type="checkbox"
                              checked={
                                inquiryEligibleIds.length > 0 &&
                                selectedInquiryIds.length ===
                                  inquiryEligibleIds.length
                              }
                              onChange={(event) =>
                                setSelectedGapIds(
                                  event.target.checked
                                    ? new Set(inquiryEligibleIds)
                                    : new Set(),
                                )
                              }
                              className="size-4 accent-primary"
                            />
                            选择全部待询价缺口
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-textMuted">
                              已选 {selectedInquiryIds.length} 项 ·{" "}
                              {selectedGroupSummary}
                            </span>
                            {selectedInquiryIds.length ? (
                              <button
                                type="button"
                                onClick={() => setSelectedGapIds(new Set())}
                                className="min-h-9 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-bold text-textSecondary"
                              >
                                清除选择
                              </button>
                            ) : null}
                            <Link
                              href={inquiryCreateHref(
                                data.project.id,
                                actionInquiryIds,
                              )}
                              className={cn(
                                "inline-flex min-h-9 items-center rounded-md bg-warning px-3 text-[11px] font-bold text-white",
                                !actionInquiryIds.length &&
                                  "pointer-events-none opacity-50",
                              )}
                            >
                              {actionInquiryIds.length
                                ? `生成询价（${actionInquiryIds.length}）`
                                : "请选择缺口"}
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed min-w-[1440px] text-left text-[12px] [&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                        <thead className="h-10 bg-slate-50 text-textSecondary">
                          <tr>
                            <th className="w-32 px-3">
                              {view === "gaps" ? "选择 / BOQ编号" : "BOQ编号"}
                            </th>
                            <th className="w-40 px-3">项目名称</th>
                            <th className="w-40 px-3">规格</th>
                            <th className="w-24 px-3 text-right">数量</th>
                            <th className="w-28 px-3 text-right">匹配单价</th>
                            <th className="w-44 px-3">
                              {view === "gaps" ? "缺口原因" : "来源"}
                            </th>
                            <th className="w-40 px-3">
                              {view === "gaps" ? "询价状态" : "供应商"}
                            </th>
                            <th className="w-24 px-3">可信度</th>
                            <th className="w-24 px-3">匹配</th>
                            <th className="w-24 px-3">风险</th>
                            <th className="w-40 px-2 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedId(item.id)}
                              className={cn(
                                "h-11 cursor-pointer border-t border-borderSoft hover:bg-primary-soft/30",
                                selected?.id === item.id &&
                                  "bg-primary-soft/50",
                              )}
                            >
                              <td className="px-3 font-bold text-primary">
                                <div className="flex items-center gap-2">
                                  {view === "gaps" ? (
                                    <input
                                      type="checkbox"
                                      aria-label={`选择缺口 ${item.boq_code}`}
                                      checked={
                                        selectedGapIds?.has(item.id) ?? true
                                      }
                                      disabled={Boolean(
                                        linkedInquiry(item).href,
                                      )}
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                      onChange={(event) =>
                                        setSelectedGapIds((current) => {
                                          const next = new Set(
                                            current ?? inquiryEligibleIds,
                                          );
                                          if (event.target.checked)
                                            next.add(item.id);
                                          else next.delete(item.id);
                                          return next;
                                        })
                                      }
                                      className="size-4 shrink-0 accent-primary disabled:opacity-40"
                                    />
                                  ) : null}
                                  <button
                                    type="button"
                                    aria-label={`选择 ${item.item_name}`}
                                    aria-pressed={selected?.id === item.id}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedId(item.id);
                                    }}
                                    className="inline-flex min-h-11 items-center rounded-sm text-left font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                  >
                                    {item.boq_code}
                                  </button>
                                </div>
                              </td>
                              <td
                                className="max-w-44 truncate px-3 font-semibold"
                                title={item.item_name}
                              >
                                {item.item_name}
                              </td>
                              <td
                                className="max-w-40 truncate px-3"
                                title={item.specification}
                              >
                                {item.specification || "-"}
                              </td>
                              <td className="px-3 text-right tabular-nums">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="px-3 text-right">
                                {item.matched_unit_price !== null ? (
                                  <PriceCell
                                    value={item.matched_unit_price}
                                    currency={item.currency}
                                  />
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td
                                className="max-w-52 truncate px-3"
                                title={
                                  view === "gaps"
                                    ? item.notes ||
                                      "未找到满足阈值的可核验价格来源"
                                    : item.source_legacy_id ||
                                      item.price_source_type
                                }
                              >
                                {view === "gaps" ? (
                                  item.notes || "无满足阈值的价格来源"
                                ) : priceSourceHref(item) ? (
                                  <Link
                                    href={priceSourceHref(item)}
                                    className="font-bold text-primary hover:underline"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {item.source_legacy_id ||
                                      item.price_source_type}
                                  </Link>
                                ) : (
                                  item.source_legacy_id ||
                                  item.price_source_type
                                )}
                              </td>
                              <td className="max-w-40 truncate px-3">
                                {view === "gaps" ? (
                                  linkedInquiry(item).href ? (
                                    <Link
                                      href={linkedInquiry(item).href}
                                      className="font-bold text-ai"
                                    >
                                      {linkedInquiry(item).code || "已关联询价"}
                                    </Link>
                                  ) : (
                                    <span className="rounded-pill bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning">
                                      待创建
                                    </span>
                                  )
                                ) : (
                                  item.supplier?.supplier_name ||
                                  String(item.metadata.supplierName || "-")
                                )}
                              </td>
                              <td className="!overflow-visible px-2">
                                {item.match_level === "unmatched" ? (
                                  <span className="whitespace-nowrap text-[10px] font-semibold text-textMuted">
                                    暂无建议
                                  </span>
                                ) : (
                                  <ConfidenceBadge
                                    level={
                                      item.confidence >= 90
                                        ? "A"
                                        : item.confidence >= 75
                                          ? "B"
                                          : item.confidence >= 60
                                            ? "C"
                                            : "D"
                                    }
                                    showPrefix={false}
                                  />
                                )}
                              </td>
                              <td className="px-3">
                                <span
                                  className={cn(
                                    "rounded-pill px-2 py-1 text-[10px] font-bold",
                                    matchStyle[item.match_level],
                                  )}
                                >
                                  {matchLabel[item.match_level]}
                                </span>
                              </td>
                              <td className="px-3">
                                <span
                                  className={cn(
                                    "rounded-pill px-2 py-1 text-[10px] font-bold",
                                    riskStyle[item.risk_level],
                                  )}
                                >
                                  {riskLabel[item.risk_level]}
                                </span>
                              </td>
                              <td className="px-3">
                                <TableActionGroup
                                  actions={[
                                    {
                                      label: "查看",
                                      icon: FolderSearch,
                                      href: `/project-pricing/${data.project.id}?boqId=${item.id}`,
                                    },
                                    linkedInquiry(item).href
                                      ? {
                                          label: "查看询价",
                                          icon: Send,
                                          tone: "ai",
                                          href: linkedInquiry(item).href,
                                        }
                                      : item.needs_inquiry
                                        ? {
                                            label: "询价",
                                            icon: Send,
                                            tone: "warning",
                                            href: inquiryCreateHref(
                                              data.project.id,
                                              [item.id],
                                            ),
                                          }
                                        : {
                                            label: "选价",
                                            icon: HandCoins,
                                            tone: "primary",
                                            onClick: () => setManualItem(item),
                                          },
                                  ]}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!filtered.length ? (
                        <div className="flex min-h-40 flex-col items-center justify-center text-center">
                          <Search className="size-8 text-textMuted" />
                          <p className="mt-2 text-[13px] font-bold">
                            没有符合条件的套价行
                          </p>
                          <button
                            onClick={() => {
                              setKeyword("");
                              setLevel("all");
                              setCategory("all");
                            }}
                            className="mt-2 text-[12px] font-bold text-primary"
                          >
                            清除筛选
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between border-t border-borderSoft px-3 py-2 text-[11px] text-textMuted">
                      <span>
                        共 {filtered.length} / {items.length} 项
                      </span>
                      <span>真实服务端数据 · 行点击查看决策上下文</span>
                    </div>
                  </section>
                  <aside className="space-y-3">
                    <section
                      id="pricing-decision-panel"
                      tabIndex={-1}
                      className="scroll-mt-24 rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-3 shadow-card outline-none target:ring-2 target:ring-primary/30"
                    >
                      <ModuleHeader
                        icon={Sparkles}
                        title="AI 建议与人工确认"
                        subtitle="核验当前选中 BOQ 的推荐价格"
                        tone="purple"
                        density="compact"
                      />
                      {selected ? (
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="font-bold text-textMain">
                              {selected.item_name}
                            </p>
                            <p className="mt-1 text-[11px] text-textMuted">
                              {selected.boq_code} ·{" "}
                              {selected.specification || "无规格"}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-white p-2">
                              <p className="text-[10px] text-textMuted">
                                AI可信度
                              </p>
                              <p className="mt-1 text-[18px] font-bold text-ai">
                                {selected.confidence}%
                              </p>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              <p className="text-[10px] text-textMuted">
                                证据数量
                              </p>
                              <p className="mt-1 text-[18px] font-bold text-primary">
                                {selected.evidence_count}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-lg border border-ai-border bg-white/70 p-3 text-[12px] leading-5 text-textSecondary">
                            {selected.match_level === "unmatched"
                              ? "未找到满足阈值的价格来源，必须发起询价或人工选价。"
                              : `已从 ${selected.source_legacy_id || selected.price_source_type} 形成 AI 推荐。该结果尚未经过最终商务确认。`}
                          </div>
                          {selected.match_level !== "unmatched" ? (
                            <div className="rounded-lg border border-borderSoft bg-white p-3 text-[11px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-textMuted">
                                  采用来源
                                </span>
                                {priceSourceHref(selected) ? (
                                  <Link
                                    href={priceSourceHref(selected)}
                                    className="font-bold text-primary hover:underline"
                                  >
                                    {selected.source_legacy_id ||
                                      "查看价格记录"}
                                  </Link>
                                ) : (
                                  <span className="font-bold text-textSecondary">
                                    {selected.price_source_type}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(Array.isArray(
                                  selected.metadata?.selectedCandidateReasons,
                                )
                                  ? selected.metadata.selectedCandidateReasons
                                  : []
                                ).map((reason) => (
                                  <span
                                    key={String(reason)}
                                    className="rounded-pill bg-success-soft px-2 py-1 text-[10px] font-semibold text-success"
                                  >
                                    {String(reason)}
                                  </span>
                                ))}
                              </div>
                              <p className="mt-2 text-textMuted">
                                有效期至{" "}
                                {String(
                                  selected.metadata
                                    ?.selectedCandidateValidUntil || "待核验",
                                )}{" "}
                                ·{" "}
                                {String(
                                  selected.metadata
                                    ?.selectedCandidatePriceTerm ||
                                    data.project.price_term ||
                                    "条件待核验",
                                )}
                              </p>
                            </div>
                          ) : null}
                          {pricingAlternatives(selected).length ? (
                            <div>
                              <p className="text-[11px] font-bold text-textSecondary">
                                候选价格对比
                              </p>
                              <div className="mt-2 space-y-1.5">
                                {pricingAlternatives(selected)
                                  .slice(0, 3)
                                  .map((candidate, index) => (
                                    <Link
                                      key={candidate.id}
                                      href={
                                        candidate.sourceType ===
                                        "equipment_price"
                                          ? `/equipment-prices/${candidate.id}`
                                          : candidate.sourceType ===
                                              "material_price"
                                            ? `/material-prices/${candidate.id}`
                                            : "#"
                                      }
                                      className="flex items-center justify-between gap-2 rounded-md border border-borderSoft bg-white px-2.5 py-2 hover:border-primary/30"
                                    >
                                      <span className="min-w-0 truncate">
                                        <strong className="text-textMain">
                                          {index + 1}. {candidate.code}
                                        </strong>
                                        <span className="ml-1 text-textMuted">
                                          {candidate.supplierName ||
                                            candidate.name}
                                        </span>
                                      </span>
                                      <span className="shrink-0 font-bold text-ai">
                                        {candidate.score}%
                                      </span>
                                    </Link>
                                  ))}
                              </div>
                            </div>
                          ) : null}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setManualItem(selected)}
                              className="min-h-11 rounded-md bg-primary text-[12px] font-bold text-white"
                            >
                              确认或调整价格
                            </button>
                            <Link
                              href={`/project-pricing/${data.project.id}?boqId=${selected.id}`}
                              className="flex min-h-11 items-center justify-center rounded-md border border-borderSoft bg-white text-[12px] font-bold text-primary"
                            >
                              证据详情
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-[12px] text-textMuted">
                          请选择一条 BOQ 行项目。
                        </p>
                      )}
                    </section>
                    <section className="rounded-card border border-warning/20 bg-warning-soft/60 p-3 shadow-card">
                      <ModuleHeader
                        icon={AlertTriangle}
                        title="询价缺口"
                        tone="orange"
                        density="compact"
                      />
                      <p className="mt-3 text-[28px] font-bold text-warning">
                        {data.summary.gapItems}
                        <span className="ml-1 text-[11px]">项</span>
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-textMuted">
                        {workflowState.inquiryLinkedItems} 项已关联询价，
                        {inquiryEligibleItems.length} 项仍待创建任务。
                      </p>
                      <div className="mt-3 rounded-md border border-warning/20 bg-white/75 px-3 py-2 text-[11px] font-semibold text-warning">
                        {view === "gaps"
                          ? `已选择 ${selectedInquiryIds.length} 项，请使用上方主按钮创建询价。`
                          : `还有 ${inquiryEligibleIds.length} 项待创建询价任务。`}
                      </div>
                    </section>
                    <section className="rounded-card border border-success/20 bg-success-soft/50 p-3 shadow-card">
                      <ModuleHeader
                        icon={CheckCircle2}
                        title="闭环状态"
                        tone="green"
                        density="compact"
                      />
                      <div className="mt-3 space-y-2 text-[11px] font-semibold text-textSecondary">
                        <p>1. BOQ 源文件已归档</p>
                        <p>2. {data.summary.totalItems} 条行项目已持久化</p>
                        <p>3. {data.summary.matchedItems} 条已形成价格推荐</p>
                        <p>
                          4. {workflowState.inquiryLinkedItems} /{" "}
                          {workflowGapItems.length} 条已关联询价
                        </p>
                        <p>
                          5. {workflowState.inquiryQuoteItems} /{" "}
                          {workflowGapItems.length} 条已回填报价
                        </p>
                      </div>
                    </section>
                  </aside>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <button
                    disabled={autoPricing || !items.length}
                    onClick={runAutoPricing}
                    className="flex h-14 items-center justify-center gap-2 rounded-card bg-primary font-bold text-white disabled:opacity-50"
                  >
                    <WandSparkles className="size-5" />
                    {autoPricing ? "套价中" : "AI自动套价"}
                  </button>
                  <button
                    onClick={() =>
                      selected
                        ? setManualItem(selected)
                        : emitMockToast({
                            title: "请先选择行项目",
                            description: "从套价表选择一行后再人工选价。",
                            tone: "warning",
                          })
                    }
                    className="flex h-14 items-center justify-center gap-2 rounded-card border border-primary/30 bg-white font-bold text-primary"
                  >
                    <HandCoins className="size-5" />
                    手动选价
                  </button>
                  <Link
                    href={pricingViewHref("gaps", data.project.id)}
                    className="flex h-14 items-center justify-center gap-2 rounded-card border border-warning/30 bg-warning-soft font-bold text-warning"
                  >
                    <Send className="size-5" />
                    处理询价缺口
                  </Link>
                  <button
                    onClick={exportCsv}
                    className={cn(
                      "flex h-14 items-center justify-center gap-2 rounded-card border font-bold",
                      formalReady
                        ? "border-success/30 bg-success-soft text-success"
                        : "border-warning/30 bg-warning-soft text-warning",
                    )}
                  >
                    <Download className="size-5" />
                    {formalReady ? "导出正式套价表" : "导出套价草稿"}
                  </button>
                  <Link
                    href={`/ai-report-center?source=project-pricing&projectPricingId=${data.project.id}`}
                    className="flex h-14 items-center justify-center gap-2 rounded-card border border-ai-border bg-ai-soft font-bold text-ai"
                  >
                    <FileSpreadsheet className="size-5" />
                    进入报告中心
                  </Link>
                </div>
              </>
            )}
          </>
        ) : null}
        {uploadOpen ? (
          <BoqUploadDialog
            open
            project={creatingProject ? undefined : data?.project}
            onClose={() => setUploadOpen(false)}
            onCompleted={handleUploadCompleted}
          />
        ) : null}
        {manualItem ? (
          <ManualPriceDialog
            key={manualItem.id}
            item={manualItem}
            project={data!.project}
            projectTotalUsd={data!.summary.totalUsd}
            reviewItems={
              view === "review"
                ? filtered
                : items.filter(
                    (candidate) => candidate.matched_unit_price !== null,
                  )
            }
            onClose={() => setManualItem(null)}
            onMove={(nextItem) => {
              setSelectedId(nextItem.id);
              setManualItem(nextItem);
            }}
            onSaved={(nextData, nextItem) => {
              setData(nextData);
              setSelectedId(nextItem?.id || null);
              setManualItem(nextItem);
            }}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}

export default function ProjectPricingPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <section className="flex min-h-64 items-center justify-center rounded-card border border-borderSoft bg-white">
            <LoaderCircle className="size-6 animate-spin text-primary" />
            <span className="ml-2 text-[13px] text-textMuted">
              正在加载项目套价中心...
            </span>
          </section>
        </AppLayout>
      }
    >
      <ProjectPricingPageContent />
    </Suspense>
  );
}
