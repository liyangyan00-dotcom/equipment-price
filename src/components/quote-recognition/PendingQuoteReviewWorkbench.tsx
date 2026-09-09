"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  History,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Rows3,
  Save,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { IconBox } from "@/components/common/IconBox";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AiBadge } from "@/components/badges/AiBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { QuoteEvidenceLocator } from "@/components/quote-recognition/QuoteEvidenceLocator";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import type { AiTaskStatus, ReviewStatus } from "@/types/common";
import type {
  QuoteRecognitionDocument,
  QuoteRecognitionItem,
  QuoteRecognitionItemInput,
  QuoteRecognitionListResponse,
} from "@/types/quoteRecognition";
import type { PriceCollectionLeadPoolResponse } from "@/types/priceCollection";

type ReviewRow = QuoteRecognitionItem & { document: QuoteRecognitionDocument };
type FormState = Required<Pick<QuoteRecognitionItemInput, "itemType" | "itemName" | "brand" | "specification" | "category" | "unit" | "quantity" | "unitPrice" | "currency" | "region" | "priceCondition" | "supplierName" | "confidence" | "riskLevel">> & { note: string };

const pageSize = 10;
const buttonBase = "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const fieldClass = "h-9 min-w-0 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] text-textMain outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

function formatMoney(value: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);
}

function statusBadge(status: QuoteRecognitionItem["review_status"]): { status: ReviewStatus | AiTaskStatus; label: string } {
  const map: Record<QuoteRecognitionItem["review_status"], { status: ReviewStatus | AiTaskStatus; label: string }> = {
    pending_review: { status: "pending", label: "待审核" },
    needs_info: { status: "need_info", label: "需补资料" },
    approved: { status: "confirmed", label: "已批准" },
    imported: { status: "confirmed", label: "已入库" },
    rejected: { status: "rejected", label: "已驳回" },
    voided: { status: "voided", label: "已作废" },
  };
  return map[status];
}

const eventLabels: Record<string, string> = {
  "quote.source_previewed": "查看源文件",
  "quote.source_downloaded": "下载源文件",
  "quote.parse_completed": "解析完成",
  "quote.ai_review_queued": "AI复核已排队",
  "quote.ai_review_unavailable": "AI复核不可用",
  "quote.fields_saved": "保存人工修正",
  "quote.needs_info": "退回补充资料",
  "quote.rejected": "驳回报价",
  "quote.imported": "确认入库",
};

function toForm(item: QuoteRecognitionItem | null): FormState {
  return {
    itemType: item?.item_type ?? "equipment",
    itemName: item?.item_name ?? "",
    brand: item?.brand ?? "",
    specification: item?.specification ?? "",
    category: item?.category ?? "",
    unit: item?.unit ?? "",
    quantity: item?.quantity ?? 1,
    unitPrice: item?.unit_price ?? 0,
    currency: item?.currency ?? "CNY",
    region: item?.region ?? "",
    priceCondition: item?.price_condition ?? "",
    supplierName: item?.supplier_name ?? "",
    confidence: item?.confidence ?? 0,
    riskLevel: item?.risk_level ?? "low",
    note: item?.review_note ?? "",
  };
}

function Kpi({ title, value, note, tone, icon: Icon }: { title: string; value: number; note: string; tone: "blue" | "purple" | "orange" | "red" | "green"; icon: typeof Database }) {
  const style = {
    blue: "border-primary/15 bg-primary-soft/45 text-primary",
    purple: "border-ai/15 bg-ai-soft text-ai",
    orange: "border-warning/15 bg-warning-soft text-warning",
    red: "border-danger/15 bg-danger-soft text-danger",
    green: "border-success/15 bg-success-soft text-success",
  };
  return <article className={cn("flex h-[82px] items-center gap-3 rounded-card border px-4 shadow-card", style[tone])}><IconBox icon={Icon} tone={tone === "purple" ? "purple" : tone === "orange" ? "orange" : tone === "red" ? "red" : tone === "green" ? "green" : "blue"} /><div><p className="text-[11px] font-medium text-textMuted">{title}</p><p className="text-[22px] font-bold text-current">{value}</p><p className="text-[10px] text-textMuted">{note}</p></div></article>;
}

export function PendingQuoteReviewWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [payload, setPayload] = useState<QuoteRecognitionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(() => toForm(null));
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");
  const [itemType, setItemType] = useState("all");
  const [page, setPage] = useState(1);
  const [working, setWorking] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"import" | "needs_info" | "reject" | "batch_import" | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [pendingLeadCount, setPendingLeadCount] = useState(0);
  const selectedItemIdRef = useRef<string | null>(null);

  const chooseItem = useCallback((item: QuoteRecognitionItem | null) => {
    selectedItemIdRef.current = item?.id ?? null;
    setSelectedItemId(item?.id ?? null);
    setForm(toForm(item));
  }, []);

  const load = useCallback(async (preferredItemId?: string | null) => {
    setLoading(true);
    try {
      const documentId = searchParams.get("documentId");
      const [response, leadResponse] = await Promise.all([
        fetch(`/api/quote-recognition?limit=50${documentId ? `&id=${encodeURIComponent(documentId)}` : ""}`, { cache: "no-store" }),
        fetch("/api/price-collection?view=lead_pool&page=1&pageSize=1", { cache: "no-store" }),
      ]);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "读取待审核报价失败");
      if (leadResponse.ok) {
        const leadBody = await leadResponse.json() as PriceCollectionLeadPoolResponse;
        setPendingLeadCount(leadBody.summary.pending);
      }
      const next = body as QuoteRecognitionListResponse;
      setPayload(next);
      const allItems = next.data.flatMap((document) => (document.items ?? []).map((item) => ({ ...item, document })));
      const candidateId = preferredItemId || selectedItemIdRef.current;
      const candidate = candidateId && allItems.find((item) => item.id === candidateId)
        || allItems.find((item) => !["imported", "rejected", "voided"].includes(item.review_status))
        || allItems[0]
        || null;
      chooseItem(candidate);
    } catch (error) {
      toast.danger("读取失败", error instanceof Error ? error.message : "无法读取待审核报价");
    } finally {
      setLoading(false);
    }
  }, [chooseItem, searchParams, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(searchParams.get("itemId")), 0);
    return () => window.clearTimeout(timer);
  }, [load, searchParams]);

  useEffect(() => {
    const requestedStatus = searchParams.get("status");
    const requestedRisk = searchParams.get("risk");
    const timer = window.setTimeout(() => {
      if (requestedStatus === "pending") setStatus("pending_review");
      else if (requestedStatus === "need_info") setStatus("needs_info");
      if (["low", "medium", "high", "critical"].includes(requestedRisk || "")) setRisk(requestedRisk as string);
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const rows = useMemo<ReviewRow[]>(() => payload?.data.flatMap((document) => (document.items ?? []).map((item) => ({ ...item, document }))) ?? [], [payload]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const text = `${row.item_name} ${row.brand || ""} ${row.specification || ""} ${row.supplier_name || ""} ${row.document.document_code}`.toLowerCase();
    return (!keyword.trim() || text.includes(keyword.trim().toLowerCase()))
      && (status === "all" || row.review_status === status)
      && (risk === "all" || row.risk_level === risk)
      && (itemType === "all" || row.item_type === itemType);
  }), [itemType, keyword, risk, rows, status]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = rows.find((row) => row.id === selectedItemId) ?? null;

  const patchItem = async (action: "save" | "needs_info" | "reject" | "import", itemId = selectedItemId, overrideNote?: string) => {
    if (!itemId) return null;
    setWorking(itemId);
    try {
      const response = await fetch(`/api/quote-recognition/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          fields: {
            itemType: form.itemType,
            itemName: form.itemName,
            brand: form.brand,
            specification: form.specification,
            category: form.category,
            unit: form.unit,
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
            totalPrice: Number(form.quantity) * Number(form.unitPrice),
            currency: form.currency,
            region: form.region,
            priceCondition: form.priceCondition,
            supplierName: form.supplierName,
            confidence: Number(form.confidence),
            riskLevel: form.riskLevel,
          },
          note: overrideNote ?? form.note,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "审核操作失败");
      await load(itemId);
      if (action === "import") {
        const targetId = body.data?.equipmentPriceId || body.data?.materialPriceId;
        toast.success("已确认入库", `${form.itemName} 已写入${form.itemType === "equipment" ? "设备" : "地材"}价格库${targetId ? `，记录 ${targetId}` : ""}。`);
      } else if (action === "save") toast.success("修正已保存", "字段修正已写入真实审核记录。" );
      else if (action === "needs_info") toast.warning("已退回补充", "该报价已标记为需补充资料。" );
      else toast.info("报价已驳回", "该报价不会进入正式价格库。" );
      return body.data;
    } catch (error) {
      toast.danger("操作失败", error instanceof Error ? error.message : "请稍后重试");
      return null;
    } finally {
      setWorking(null);
    }
  };

  const batchImport = async () => {
    const candidates = rows.filter((row) => selectedIds.includes(row.id) && !["imported", "rejected", "voided"].includes(row.review_status));
    if (!candidates.length) return toast.warning("未选择可入库记录", "请先勾选待审核报价。" );
    setWorking("batch");
    let success = 0;
    let failed = 0;
    for (const row of candidates) {
      const response = await fetch(`/api/quote-recognition/items/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", fields: {}, note: "批量审核确认入库" }),
      });
      if (response.ok) success += 1; else failed += 1;
    }
    setSelectedIds([]);
    await load();
    setWorking(null);
    if (failed) toast.warning("批量入库部分完成", `成功 ${success} 条，失败 ${failed} 条，请逐项检查必填字段。`);
    else toast.success("批量入库完成", `已写入正式价格库 ${success} 条。`);
  };

  const openSourceFile = async (mode: "preview" | "download") => {
    if (!selected) return;
    try {
      const response = await fetch(`/api/quote-recognition/${selected.document.id}/source?mode=${mode}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "源文件访问失败");
      window.open(body.data.url, "_blank", "noopener,noreferrer");
      toast.success(mode === "download" ? "下载链接已生成" : "报价源文件已打开", "访问行为已记录到真实审计链。");
      await load(selected.id);
    } catch (error) {
      toast.danger("源文件访问失败", error instanceof Error ? error.message : "请稍后重试");
    }
  };

  const pendingCount = rows.filter((item) => item.review_status === "pending_review").length;
  const needsInfoCount = rows.filter((item) => item.review_status === "needs_info").length;
  const importedCount = rows.filter((item) => item.review_status === "imported").length;
  const highRiskCount = rows.filter((item) => ["high", "critical"].includes(item.risk_level)).length;
  const selectedAllVisible = visibleRows.length > 0 && visibleRows.every((item) => selectedIds.includes(item.id));

  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader title="报价文件审核中心" description="专门审核上传报价经 AI 识别后生成的文件价格；在线采集候选请进入价格线索池审核。" actions={<><button type="button" onClick={() => router.push("/ai-price-collection?mode=quote_upload")} className={cn(buttonBase, "border border-borderSoft bg-white text-textSecondary hover:bg-page")}><ChevronLeft className="size-4" />返回价格采集</button><button type="button" onClick={() => router.push("/price-leads?status=待确认&source=collection")} className={cn(buttonBase, "border border-ai/25 bg-ai-soft text-ai")}><Rows3 className="size-4" />待审采集线索 {pendingLeadCount}</button><button type="button" onClick={() => void load()} className={cn(buttonBase, "bg-primary text-white hover:bg-primary-hover")}><RefreshCw className={cn("size-4", loading && "animate-spin")} />刷新数据</button></>} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi title="待审核文件价格" value={pendingCount} note="来自上传报价" tone="blue" icon={FileCheck2} />
          <Kpi title="高风险报价" value={highRiskCount} note="不可批量放行" tone="red" icon={ShieldAlert} />
          <Kpi title="待补充资料" value={needsInfoCount} note="缺失关键字段" tone="orange" icon={AlertTriangle} />
          <Kpi title="AI复核任务" value={payload?.data.filter((item) => item.ai_task_id).length ?? 0} note="仅作辅助判断" tone="purple" icon={Search} />
          <Kpi title="已确认入库" value={importedCount} note="正式价格记录" tone="green" icon={Database} />
        </div>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ai/20 bg-ai-soft px-4 py-3 shadow-card">
          <div className="flex min-w-0 items-center gap-3"><IconBox icon={Rows3} tone="purple" size="sm" /><div><h2 className="text-[13px] font-bold text-textMain">另有 {pendingLeadCount} 条在线采集线索待审核</h2><p className="mt-0.5 text-[11px] text-textSecondary">这类记录保留网页来源与采集证据，在价格线索池完成确认，不计入上方“文件价格”数量。</p></div></div>
          <button type="button" onClick={() => router.push("/price-leads?status=待确认&source=collection")} className={cn(buttonBase, "shrink-0 bg-ai text-white hover:bg-ai/90")}><Rows3 className="size-4" />进入线索池审核</button>
        </section>

        <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(130px,.7fr))_auto]">
            <label className="relative"><Search className="absolute left-3 top-2.5 size-4 text-textMuted" /><input value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="搜索设备、地材、供应商或报价编号" className={cn(fieldClass, "w-full pl-9")} /></label>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={fieldClass}><option value="all">全部状态</option><option value="pending_review">待审核</option><option value="needs_info">需补资料</option><option value="imported">已入库</option><option value="rejected">已驳回</option></select>
            <select value={risk} onChange={(event) => { setRisk(event.target.value); setPage(1); }} className={fieldClass}><option value="all">全部风险</option><option value="critical">严重风险</option><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option></select>
            <select value={itemType} onChange={(event) => { setItemType(event.target.value); setPage(1); }} className={fieldClass}><option value="all">全部类型</option><option value="equipment">设备价格</option><option value="material">地材价格</option></select>
            <button type="button" onClick={() => { setKeyword(""); setStatus("all"); setRisk("all"); setItemType("all"); setPage(1); }} className={cn(buttonBase, "h-9 border border-borderSoft bg-white text-textSecondary hover:bg-page")}>重置</button>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-borderSoft bg-card px-3 py-2 shadow-card">
          <p className="text-[12px] text-textSecondary">当前 {filteredRows.length} 条 · 已选 {selectedIds.length} 条</p>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setConfirmAction("batch_import")} disabled={!selectedIds.length || working === "batch" || !payload?.permissions.canReview} className={cn(buttonBase, "bg-success text-white hover:bg-success/90")}><CheckCircle2 className="size-4" />批量确认入库</button><button type="button" onClick={() => selectedIds.length ? toast.info("批量补资料", "请逐条填写补充说明，避免产生不可追溯的统一备注。") : toast.warning("未选择记录", "请先勾选报价明细。") } className={cn(buttonBase, "border border-warning/30 bg-warning-soft text-warning")}>批量补充资料</button></div>
        </div>

        <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div className="flex items-center gap-2"><IconBox icon={FileSpreadsheet} tone="blue" size="sm" /><div><h2 className="text-[14px] font-semibold">文件价格审核队列</h2><p className="text-[11px] text-textMuted">上传报价识别结果，每页 10 条；采集候选可从页头入口进入</p></div></div><AiBadge label="AI预审已完成" /></div>
            {loading ? <p className="py-16 text-center text-[13px] text-textMuted">正在读取真实审核数据...</p> : visibleRows.length ? <div className="overflow-x-auto"><table className="min-w-[1120px] w-full text-[12px]"><thead className="h-10 bg-[#F7F9FC] text-left text-textMuted"><tr><th className="w-10 px-3"><input type="checkbox" checked={selectedAllVisible} onChange={(event) => setSelectedIds((current) => event.target.checked ? Array.from(new Set([...current, ...visibleRows.map((item) => item.id)])) : current.filter((id) => !visibleRows.some((item) => item.id === id)))} /></th><th className="px-2">设备/地材</th><th className="px-2">供应商</th><th className="px-2">申报价格</th><th className="px-2">来源</th><th className="px-2">完整度</th><th className="px-2">AI置信度</th><th className="px-2">风险</th><th className="px-2">状态</th><th className="px-2">操作</th></tr></thead><tbody>{visibleRows.map((row) => {
              const badge = statusBadge(row.review_status);
              const sourceLabel = row.document.recognition_method === "openai_responses_pdf" ? "PDF视觉" : row.document.recognition_method === "openai_responses_vision" ? "图片视觉" : row.document.file_name.endsWith(".csv") ? "CSV" : "Excel";
              return <tr key={row.id} onClick={() => chooseItem(row)} className={cn("h-11 cursor-pointer border-t border-borderSoft hover:bg-primary-soft/30", selectedItemId === row.id && "bg-primary-soft/55")}><td className="px-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></td><td className="max-w-[230px] px-2"><p className="truncate font-semibold" title={row.item_name}>{row.item_name}</p><p className="truncate text-[10px] text-textMuted">{row.document.document_code} · {row.specification || "无规格"}</p></td><td className="max-w-[160px] truncate px-2" title={row.supplier_name || row.document.supplier_name || ""}>{row.supplier_name || row.document.supplier_name || "待识别"}</td><td className="px-2 text-right font-semibold">{formatMoney(row.unit_price, row.currency)}</td><td className="px-2 text-textSecondary">{sourceLabel}</td><td className="px-2 font-semibold text-primary">{Math.max(0, 100 - row.missing_fields.length * 12)}%</td><td className="px-2 font-semibold text-ai">{row.confidence}%</td><td className="px-2"><RiskBadge level={row.risk_level} className="h-5 px-1.5 text-[10px]" /></td><td className="px-2"><StatusBadge status={badge.status} label={badge.label} className="h-5 px-1.5 text-[10px]" /></td><td className="px-2"><button type="button" onClick={(event) => { event.stopPropagation(); chooseItem(row); }} className="rounded border border-primary/20 bg-primary-soft px-2 py-1 text-[11px] font-medium text-primary">审核</button></td></tr>;
            })}</tbody></table></div> : <EmptyState className="m-4 py-10 shadow-none" title="没有符合条件的文件价格" description="调整筛选条件，或从价格采集页上传新的报价文件。" />}
            <div className="flex items-center justify-between border-t border-borderSoft px-4 py-3 text-[11px] text-textMuted"><span>共 {filteredRows.length} 条，当前第 {safePage} / {totalPages} 页</span><div className="flex items-center gap-1"><button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="flex size-7 items-center justify-center rounded border border-borderSoft disabled:opacity-30"><ChevronLeft className="size-4" /></button><span className="flex size-7 items-center justify-center rounded bg-primary font-semibold text-white">{safePage}</span><button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="flex size-7 items-center justify-center rounded border border-borderSoft disabled:opacity-30"><ChevronRight className="size-4" /></button></div></div>
          </section>

          <aside className="sticky top-[68px] min-w-0 overflow-hidden rounded-card border border-ai-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-ai-border bg-ai-soft px-4 py-3"><div className="flex items-center gap-2"><IconBox icon={FileCheck2} tone="purple" size="sm" /><div><h2 className="text-[14px] font-semibold">人工审核工作区</h2><p className="text-[11px] text-textMuted">字段修正与最终商务确认</p></div></div>{selected ? <RiskBadge level={selected.risk_level} className="h-5 px-1.5 text-[10px]" /> : null}</div>
            {selected ? <div className="max-h-[820px] space-y-3 overflow-y-auto p-4">
              <div className="rounded-md border border-borderSoft bg-page/70 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-[15px] font-bold">{selected.item_name}</p><p className="mt-1 text-[11px] text-textMuted">{selected.document.document_code} · 第 {selected.line_number} 行</p></div><p className="text-[18px] font-bold text-primary">{formatMoney(Number(form.unitPrice), form.currency)}</p></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded bg-white p-2"><p className="text-[10px] text-textMuted">AI置信度</p><p className="font-bold text-ai">{form.confidence}%</p></div><div className="rounded bg-white p-2"><p className="text-[10px] text-textMuted">缺失字段</p><p className="font-bold text-warning">{selected.missing_fields.length}</p></div><div className="rounded bg-white p-2"><p className="text-[10px] text-textMuted">目标库</p><p className="font-bold text-primary">{form.itemType === "equipment" ? "设备" : "地材"}</p></div></div></div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void openSourceFile("preview")} className={cn(buttonBase, "border border-primary/20 bg-primary-soft text-primary")}><ExternalLink className="size-4" />查看源文件</button>
                <button type="button" onClick={() => void openSourceFile("download")} className={cn(buttonBase, "border border-borderSoft bg-white text-textSecondary")}><Download className="size-4" />下载证据</button>
              </div>
              {selected.evidence?.length ? <div className="rounded-md border border-ai-border bg-ai-soft p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-[11px] font-semibold text-ai">行级原文证据</p><p className="mt-1 text-[10px] text-textMuted">第 {selected.evidence[0].page_number} 页 · 证据置信度 {selected.evidence[0].confidence}%</p></div><button type="button" onClick={() => setEvidenceOpen(true)} className={cn(buttonBase, "border border-ai-border bg-white text-ai")}><MapPin className="size-4" />定位原文</button></div><p className="mt-2 line-clamp-3 text-[11px] leading-5 text-textSecondary">{selected.evidence[0].source_text || "未返回原文片段，请直接核对源文件定位区域。"}</p></div> : null}
              <div className="grid grid-cols-2 gap-2"><label className="space-y-1"><span className="text-[10px] text-textMuted">价格类型</span><select className={cn(fieldClass, "w-full")} value={form.itemType} onChange={(event) => setForm((current) => ({ ...current, itemType: event.target.value as "equipment" | "material" }))}><option value="equipment">设备价格</option><option value="material">地材价格</option></select></label><label className="space-y-1"><span className="text-[10px] text-textMuted">币种</span><input className={cn(fieldClass, "w-full")} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></label></div>
              <label className="block space-y-1"><span className="text-[10px] text-textMuted">名称 *</span><input className={cn(fieldClass, "w-full")} value={form.itemName} onChange={(event) => setForm((current) => ({ ...current, itemName: event.target.value }))} /></label>
              <div className="grid grid-cols-2 gap-2"><label className="space-y-1"><span className="text-[10px] text-textMuted">品牌</span><input className={cn(fieldClass, "w-full")} value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} /></label><label className="space-y-1"><span className="text-[10px] text-textMuted">规格型号</span><input className={cn(fieldClass, "w-full")} value={form.specification} onChange={(event) => setForm((current) => ({ ...current, specification: event.target.value }))} /></label></div>
              <div className="grid grid-cols-3 gap-2"><label className="space-y-1"><span className="text-[10px] text-textMuted">数量</span><input type="number" min="0.0001" step="0.01" className={cn(fieldClass, "w-full")} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} /></label><label className="space-y-1"><span className="text-[10px] text-textMuted">单位</span><input className={cn(fieldClass, "w-full")} value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} /></label><label className="space-y-1"><span className="text-[10px] text-textMuted">单价 *</span><input type="number" min="0" step="0.01" className={cn(fieldClass, "w-full")} value={form.unitPrice} onChange={(event) => setForm((current) => ({ ...current, unitPrice: Number(event.target.value) }))} /></label></div>
              <div className="grid grid-cols-2 gap-2"><label className="space-y-1"><span className="text-[10px] text-textMuted">类别</span><input className={cn(fieldClass, "w-full")} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></label><label className="space-y-1"><span className="text-[10px] text-textMuted">地区</span><input className={cn(fieldClass, "w-full")} value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} /></label></div>
              <label className="block space-y-1"><span className="text-[10px] text-textMuted">供应商</span><input className={cn(fieldClass, "w-full")} value={form.supplierName} onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))} /></label>
              <div className="rounded-md border border-ai-border bg-ai-soft p-3"><div className="flex items-center justify-between"><p className="text-[12px] font-semibold text-ai">AI预审判断</p><AiBadge label="需人工确认" /></div><p className="mt-2 text-[11px] leading-5 text-textSecondary">{selected.document.ai_task?.output_payload?.recommendation as string || "请核验价格来源、供应商主体、规格参数和有效期。AI结论不得替代最终商务审核。"}</p></div>
              {selected.missing_fields.length ? <div className="rounded-md border border-warning/25 bg-warning-soft p-3"><p className="text-[11px] font-semibold text-warning">缺失字段：{selected.missing_fields.join("、")}</p></div> : null}
              <div className="rounded-md border border-borderSoft bg-white p-3">
                <div className="flex items-center gap-2"><History className="size-4 text-primary" /><p className="text-[12px] font-semibold">审核与证据轨迹</p></div>
                <div className="mt-2 space-y-2">
                  {(selected.document.events ?? []).filter((event) => !event.item_id || event.item_id === selected.id).slice(0, 5).map((event) => (
                    <div key={event.id} className="border-l-2 border-primary/20 pl-2.5"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold text-textMain">{eventLabels[event.action] || event.action}</p><time className="shrink-0 text-[9px] text-textMuted">{new Date(event.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></div>{event.note ? <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-textMuted">{event.note}</p> : null}</div>
                  ))}
                  {!(selected.document.events ?? []).some((event) => !event.item_id || event.item_id === selected.id) ? <p className="py-2 text-center text-[10px] text-textMuted">暂无可见审计事件</p> : null}
                </div>
              </div>
              <label className="block space-y-1"><span className="text-[10px] text-textMuted">人工审核意见</span><textarea rows={3} className="w-full resize-y rounded-md border border-borderSoft bg-white p-2.5 text-[12px] outline-none focus:border-primary" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="高风险、退回或驳回时请填写明确依据" /></label>
              <div className="grid grid-cols-2 gap-2"><button type="button" disabled={Boolean(working)} onClick={() => void patchItem("save")} className={cn(buttonBase, "border border-primary/25 bg-primary-soft text-primary")}><Save className="size-4" />保存修正</button><button type="button" disabled={Boolean(working) || !payload?.permissions.canReview} onClick={() => setConfirmAction("import")} className={cn(buttonBase, "bg-success text-white")}><CheckCircle2 className="size-4" />确认入库</button><button type="button" disabled={Boolean(working) || !payload?.permissions.canReview} onClick={() => setConfirmAction("needs_info")} className={cn(buttonBase, "border border-warning/25 bg-warning-soft text-warning")}><RefreshCw className="size-4" />补充资料</button><button type="button" disabled={Boolean(working) || !payload?.permissions.canReview} onClick={() => setConfirmAction("reject")} className={cn(buttonBase, "border border-danger/25 bg-danger-soft text-danger")}><XCircle className="size-4" />驳回</button></div>
              {selected.review_status === "imported" ? <button type="button" onClick={() => router.push(selected.item_type === "equipment" ? `/equipment-prices/${selected.target_equipment_price_id}` : `/material-prices/${selected.target_material_price_id}`)} className={cn(buttonBase, "w-full bg-primary text-white")}><Database className="size-4" />查看已入库价格</button> : null}
            </div> : <EmptyState className="m-4 py-10 shadow-none" title="请选择报价明细" description="点击左侧表格行进入人工审核。" />}
          </aside>
        </div>
      </div>

      <ConfirmDialog open={Boolean(confirmAction)} title={confirmAction === "import" ? "确认写入正式价格库？" : confirmAction === "batch_import" ? `确认批量入库 ${selectedIds.length} 条？` : confirmAction === "needs_info" ? "退回补充资料？" : "驳回该报价？"} description={confirmAction === "import" || confirmAction === "batch_import" ? "系统将执行数据库事务，生成正式设备/地材价格记录并保留原始报价证据。" : "该结论会写入真实审核记录，请确保已填写明确审核意见。"} confirmLabel={confirmAction === "import" || confirmAction === "batch_import" ? "确认入库" : "确认提交"} tone={confirmAction === "reject" ? "danger" : confirmAction === "needs_info" ? "warning" : "default"} onCancel={() => setConfirmAction(null)} onConfirm={() => {
        const action = confirmAction;
        setConfirmAction(null);
        if (action === "batch_import") void batchImport();
        else if (action === "import") void patchItem("import");
        else if (action === "needs_info") void patchItem("needs_info");
        else if (action === "reject") void patchItem("reject");
      }} />
      <QuoteEvidenceLocator open={Boolean(evidenceOpen && selected)} documentId={selected?.document.id ?? ""} fileName={selected?.document.file_name ?? ""} mimeType={selected?.document.mime_type ?? ""} itemName={selected?.item_name ?? ""} evidence={selected?.evidence?.find((entry) => entry.is_primary) ?? selected?.evidence?.[0] ?? null} onClose={() => setEvidenceOpen(false)} />
      {working ? <div className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-md bg-[#0B1F3A] px-4 py-3 text-[12px] font-medium text-white shadow-xl"><LoaderCircle className="size-4 animate-spin" />正在写入真实审核数据...</div> : null}
    </AppLayout>
  );
}
