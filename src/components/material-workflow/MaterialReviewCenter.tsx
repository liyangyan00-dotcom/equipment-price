"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileQuestion,
  Filter,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { AiBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LoadingButton } from "@/components/common/LoadingButton";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/downloadCsv";
import { materialOptionalNumber } from "@/lib/data/materialOptionalNumber";
import { readMaterialReviewExport } from "@/lib/data/materialReviewExport";
import { defaultMaterialReviewFilters, type MaterialReviewFilters } from "@/lib/data/materialReviewQuery";
import type { MaterialPriceApiRecord, MaterialReviewDecision } from "@/types/materialPriceWorkflow";

type Filters = MaterialReviewFilters;
const defaultFilters = defaultMaterialReviewFilters;
const pageSize = 10;

function statusLabel(status: MaterialPriceApiRecord["review_status"]) {
  return status === "approved" ? "已通过" : status === "rejected" ? "已驳回" : status === "draft" ? "草稿" : status === "archived" ? "已归档" : "待审核";
}

function completion(record: MaterialPriceApiRecord) {
  const checks = [record.material_name, record.specification, record.unit, record.price > 0, record.region, record.source_type, record.valid_until, Number(record.confidence ?? 0) > 0];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function confidenceLabel(value: unknown) {
  const score = materialOptionalNumber(value, 100);
  return score === null ? "未评估" : `${score}%`;
}

export function MaterialReviewCenter() {
  const searchParams = useSearchParams();
  const toast = useMockToast();
  const [rows, setRows] = useState<MaterialPriceApiRecord[]>([]);
  const [fetching, setLoading] = useState(true);
  const [loadedUrl, setLoadedUrl] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pageCount: 1 });
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [summaryAt, setSummaryAt] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const exportController = useRef<AbortController | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [selectedId, setSelectedId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<MaterialReviewDecision | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mutationInFlight = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const selectionScope = useRef<string | null>(null);
  const linkedIds = [searchParams.get("materialId"), searchParams.get("materialIds")].filter(Boolean).join(",");
  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({ ...applied, page: String(page), pageSize: String(pageSize), materialIds: linkedIds });
    return `/api/material-prices/review-queue?${params}`;
  }, [applied, page, linkedIds]);
  const loading = fetching || loadedUrl !== requestUrl;

  useEffect(() => () => { exportController.current?.abort(); }, [requestUrl, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/material-prices/review-queue?view=summary${reloadKey ? "&refresh=1" : ""}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("统计暂不可用");
        return response.json() as Promise<{ counts: Record<string, number>; generatedAt: string }>;
      }).then(payload => {
        if (controller.signal.aborted) return;
        if (!["awaiting","highRisk","needsInfo","highConfidence","approved"].every(key => Number.isSafeInteger(payload.counts?.[key]) && payload.counts[key] >= 0)) throw new Error("统计响应异常");
        setCounts(payload.counts); setSummaryAt(payload.generatedAt);
      }).catch(() => { if (!controller.signal.aborted) { setCounts(null); setSummaryAt(""); } });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const requestedIds = linkedIds.split(",").map((item) => item.trim()).filter(Boolean);

    fetch(requestUrl, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(response.status === 401 ? "登录已失效，请重新登录。" : response.status === 403 ? "当前账号没有访问权限。" : payload.error || "审核队列加载失败，请稍后重试。");
        }
        return response.json() as Promise<{ data: MaterialPriceApiRecord[]; pagination: { page: number; pageSize: number; total: number; pageCount: number } }>;
      })
      .then((payload) => {
        if (cancelled) return;
        if (!Array.isArray(payload.data) || !payload.pagination || payload.pagination.pageSize !== pageSize
          || !Number.isSafeInteger(payload.pagination.total) || payload.pagination.total < payload.data.length
          || !Number.isSafeInteger(payload.pagination.page) || payload.pagination.page < 1
          || payload.pagination.page > payload.pagination.pageCount
          || payload.pagination.pageCount !== Math.max(1, Math.ceil(payload.pagination.total / pageSize))
          || payload.data.length > pageSize || payload.data.some(row => !row || typeof row.id !== "string" || !row.id || typeof row.updated_at !== "string")
          || new Set(payload.data.map(row => row.id)).size !== payload.data.length) throw new Error("审核队列响应异常，请刷新重试。");
        const requestedRows = payload.data.filter((row) => requestedIds.includes(row.id) || requestedIds.includes(row.price_code) || (row.legacy_id ? requestedIds.includes(row.legacy_id) : false));
        setRows(payload.data);
        setPagination(payload.pagination);
        setSelectedId(previous => payload.data.some(row => row.id === previous) ? previous : payload.data[0]?.id ?? "");
        const initialSelection = selectionScope.current !== linkedIds;
        selectionScope.current = linkedIds;
        setSelectedIds(previous => initialSelection ? requestedRows.map(row => row.id) : previous.filter(id => payload.data.some(row => row.id === id)));
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRows([]);
        setSelectedId("");
        setSelectedIds([]);
        setDecision(null);
        setLoadError(error instanceof Error ? error.message : "审核队列加载失败。");
      })
      .finally(() => {
        if (!cancelled) { setLoadedUrl(requestUrl); setLoading(false); }
      });

    return () => { cancelled = true; controller.abort(); };
  }, [reloadKey, requestUrl, linkedIds]);

  const filtered = rows;
  const totalPages = pagination.pageCount;
  const safePage = pagination.page;
  const visible = loading || loadError ? [] : rows;
  const active = loading || loadError ? undefined : filtered.find((row) => row.id === selectedId) ?? visible[0];
  const metadata = active?.metadata ?? {};
  const activeCompletion = active ? completion(active) : 0;
  const checks = active ? [
    { label: "价格来源", ok: Boolean(active.source_type), note: active.source_type || "缺失" },
    { label: "供应商主体", ok: Boolean(active.supplier_id || metadata.supplierName), note: String(active.wpi_suppliers?.name ?? metadata.supplierName ?? "缺失") },
    { label: "地区与单位", ok: Boolean(active.region && active.unit), note: `${active.region || "缺失"} / ${active.unit || "缺失"}` },
    { label: "有效期", ok: Boolean(active.valid_until), note: active.valid_until || "缺失" },
  ] : [];
  const canReview = Boolean(active && (active.review_status === "draft" || active.review_status === "pending_review"));
  const canApprove = canReview && checks.every((item) => item.ok) && activeCompletion >= 80;

  const applyFilters = () => { if (mutationInFlight.current) return; setApplied({ ...filters }); setPage(1); setSelectedIds([]); setSelectedId(""); setComment(""); setDecision(null); };
  const resetFilters = () => { if (mutationInFlight.current) return; setFilters(defaultFilters); setApplied({ ...defaultFilters }); setPage(1); setSelectedIds([]); setSelectedId(""); setComment(""); setDecision(null); };
  const refreshQueue = () => { setLoading(true); setReloadKey(value => value + 1); };

  const updateReview = async (target: MaterialPriceApiRecord, nextDecision: MaterialReviewDecision, reviewComment: string) => {
    exportController.current?.abort();
    const response = await fetch(`/api/material-prices/${encodeURIComponent(target.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: nextDecision, comment: reviewComment, expectedUpdatedAt: target.updated_at }) });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error || "审核提交失败");
    }
    const payload = await response.json() as { data: MaterialPriceApiRecord };
    const expectedStatus = nextDecision === "approve" ? "approved" : nextDecision === "reject" ? "rejected" : "pending_review";
    if (payload.data?.id !== target.id || payload.data.review_status !== expectedStatus) {
      throw new Error("审核响应未确认目标记录状态，请刷新核实后重试。");
    }
    setRows((items) => items.map((item) => item.id === target.id ? payload.data : item));
  };

  const confirmDecision = async () => {
    if (!active || !decision || !canReview || mutationInFlight.current) return;
    if (decision === "approve" && !canApprove) {
      toast.warning("暂不能通过", "请先补齐来源、供应商、地区单位和有效期。");
      setDecision(null);
      return;
    }
    if (!comment.trim()) {
      toast.warning("请填写审核意见", "请说明人工核验结论后再提交。");
      setDecision(null);
      return;
    }
    mutationInFlight.current = true;
    setSubmitting(true);
    setReviewError("");
    try {
      await updateReview(active, decision, comment);
      toast.success(decision === "approve" ? "审核通过" : decision === "need_info" ? "已退回补充资料" : "已驳回", `${active.price_code} 的审核状态已更新。`);
      setComment("");
      refreshQueue();
    } catch (error) {
      const message = error instanceof Error ? error.message : "审核提交失败，请刷新核实。";
      setReviewError(message);
      toast.danger("审核未确认成功", message);
    } finally {
      setSubmitting(false);
      setDecision(null);
      mutationInFlight.current = false;
    }
  };

  const bulkApprove = async () => {
    if (loading || loadError || mutationInFlight.current) return;
    const targets = filtered.filter((row) => selectedIds.includes(row.id) && row.risk_level === "low" && completion(row) >= 80 && row.review_status === "pending_review");
    if (!targets.length) { toast.warning("没有可批量通过记录", "仅支持资料完整度不低于 80% 的低风险记录。"); return; }
    mutationInFlight.current = true;
    setSubmitting(true);
    setReviewError("");
    let success = 0;
    const succeeded = new Set<string>();
    for (const target of targets) {
      try { await updateReview(target, "approve", "批量低风险审核通过"); success += 1; succeeded.add(target.id); } catch { /* Failed records retain their persisted state and selection. */ }
    }
    setSubmitting(false);
    mutationInFlight.current = false;
    setSelectedIds((ids) => ids.filter(id => !succeeded.has(id)));
    if (success) refreshQueue();
    if (success < targets.length) {
      const message = `${success} 条成功，${targets.length - success} 条未确认成功；未成功记录保持选中，请刷新核实。`;
      setReviewError(message);
      toast.warning("批量审核未全部成功", message);
    } else toast.success("批量审核完成", `${success} 条低风险记录已通过。`);
  };

  const downloadRows = (records: MaterialPriceApiRecord[], filename: string) => {
    const safeText = (value: unknown) => {
      const text = String(value ?? "");
      return /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    };
    downloadCsv(filename, ["编号", "材料", "规格", "地区", "原币价格", "币种", "单位", "来源", "报价日期", "审核状态", "风险", "可信度", "审核意见"],
      records.map(row => [row.price_code, row.material_name, row.specification, row.region, row.price, row.currency, row.unit, row.source_type, row.metadata?.quoteDate, statusLabel(row.review_status), row.risk_level, row.confidence, row.metadata?.reviewComment].map(safeText)));
  };
  const exportRows = () => { if (!loading && !loadError && filtered.length) downloadRows(filtered, `地材审核清单-第${safePage}页.csv`); };
  const exportAll = async () => {
    if (loading || loadError || mutationInFlight.current || exportController.current) return;
    const controller = new AbortController(); exportController.current = controller;
    setExporting(true); setExportProgress("正在读取筛选结果");
    try {
      const records = await readMaterialReviewExport(requestUrl, controller.signal, fetch, (loaded, total) => setExportProgress(`已读取 ${loaded} / ${total} 条`));
      controller.signal.throwIfAborted();
      if (!records.length) { toast.warning("没有可导出记录", "当前筛选结果为空。"); return; }
      downloadRows(records, `地材审核清单-全部筛选-${records.length}条.csv`);
      toast.success("导出完成", `${records.length} 条筛选记录已生成CSV。`);
    } catch (error) {
      if (!controller.signal.aborted) toast.danger("导出未完成", error instanceof Error ? error.message : "未生成文件，请重试。");
    } finally {
      if (exportController.current === controller) { exportController.current = null; setExporting(false); setExportProgress(""); }
    }
  };

  const kpis = [
    { label: "待审核价格", key: "awaiting", tone: "blue", icon: ClipboardCheck },
    { label: "高风险价格", key: "highRisk", tone: "red", icon: ShieldAlert },
    { label: "已退回补充", key: "needsInfo", tone: "orange", icon: FileQuestion },
    { label: "高可信记录", key: "highConfidence", tone: "purple", icon: Sparkles },
    { label: "已审核通过", key: "approved", tone: "green", icon: CheckCircle2 },
  ].map(item => ({ ...item, value: counts?.[item.key] ?? "--" }));

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader title="地材价格审核中心" description="集中审核地材价格来源、地区、有效期与风险；AI 预审不替代人工商务判断。" actions={<><Link href="/material-prices" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary"><ArrowLeft className="size-4" />返回价格库</Link><LoadingButton tone="ghost" icon={<Download className="size-4" />} disabled={loading || Boolean(loadError) || !filtered.length || submitting} onClick={exportRows}>导出本页</LoadingButton><LoadingButton icon={<RotateCcw className="size-4" />} loading={loading} disabled={submitting} onClick={() => { setLoading(true); setLoadError(""); setReviewError(""); setDecision(null); setReloadKey((value) => value + 1); }}>刷新数据</LoadingButton></>} />

        <div className="grid gap-2 md:grid-cols-5">{kpis.map(({ label, key, value, tone, icon: Icon }) => <button key={label} type="button" disabled={submitting} onClick={() => { if (mutationInFlight.current) return; const next: Filters = { ...defaultFilters, queue: key as Filters["queue"] }; setFilters(next); setApplied(next); setPage(1); setSelectedIds([]); setComment(""); setDecision(null); }} className={cn("flex h-20 items-center gap-3 rounded-card border bg-card px-4 text-left shadow-card", tone === "red" ? "border-red-100" : tone === "orange" ? "border-amber-100" : tone === "purple" ? "border-violet-100" : tone === "green" ? "border-emerald-100" : "border-blue-100")}><span className={cn("flex size-10 items-center justify-center rounded-md text-white shadow-lg", tone === "red" ? "bg-danger" : tone === "orange" ? "bg-warning" : tone === "purple" ? "bg-ai" : tone === "green" ? "bg-success" : "bg-primary")}><Icon className="size-5" /></span><span><span className="block text-[11px] font-semibold text-textMuted">{label}</span><span className="text-2xl font-bold text-textMain">{loading || loadError ? "--" : value}</span><span className="ml-1 text-[11px] text-textMuted">条</span></span></button>)}</div>
        <p className="text-[11px] text-textMuted">组织统计：{summaryAt ? new Date(summaryAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) + "（北京时间）" : "暂不可用"}</p>
        <div className="flex flex-wrap items-center gap-2"><LoadingButton tone="ghost" icon={<Download className="size-4" />} loading={exporting} disabled={loading || Boolean(loadError) || submitting || !pagination.total} onClick={() => void exportAll()}>导出全部筛选结果</LoadingButton>{exporting ? <><span role="status" className="text-xs text-textMuted">{exportProgress}</span><button type="button" className="text-xs text-primary" onClick={() => exportController.current?.abort()}>取消导出</button></> : null}</div>

        <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
          <ModuleHeader icon={Filter} title="审核任务筛选" subtitle="筛选条件与队列、右侧工作区联动" density="compact" />
          <div className="mt-3 grid items-end gap-2 xl:grid-cols-[1.4fr_repeat(4,minmax(120px,0.7fr))_auto_auto]">
            <label><span className="text-[11px] font-semibold text-textSecondary">搜索任务</span><div className="mt-1 flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3"><Search className="size-4 text-textMuted" /><input value={filters.keyword} onChange={(e) => setFilters((current) => ({ ...current, keyword: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }} className="min-w-0 flex-1 bg-transparent text-[12px] outline-none" placeholder="材料、编号、地区、供应商" /></div></label>
            {[["审核状态", "status", [["all", "全部状态"], ["pending_review", "待审核"], ["approved", "已通过"], ["rejected", "已驳回"], ["draft", "草稿"], ["archived", "已归档"]]], ["风险等级", "risk", [["all", "全部风险"], ["low", "低风险"], ["medium", "中风险"], ["high", "高风险"], ["critical", "严重风险"]]]].map(([label, key, options]) => <label key={String(key)}><span className="text-[11px] font-semibold text-textSecondary">{String(label)}</span><select className="mt-1 h-9 w-full rounded-md border border-borderSoft bg-white px-2 text-[12px]" value={filters[key as keyof Filters]} onChange={(e) => setFilters((current) => ({ ...current, [key as keyof Filters]: e.target.value }))}>{(options as string[][]).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}
            {([ ["材料类别", "category"], ["来源类型", "source"] ] as const).map(([label, key]) => <label key={key}><span className="text-[11px] font-semibold text-textSecondary">{label}</span><input className="mt-1 h-9 w-full rounded-md border border-borderSoft bg-white px-2 text-[12px]" placeholder="全部（输入完整名称）" value={filters[key] === "all" ? "" : filters[key]} onChange={event => setFilters(current => ({ ...current, [key]: event.target.value || "all" }))} /></label>)}
            <LoadingButton className="h-9 px-3" icon={<Search className="size-4" />} onClick={applyFilters}>查询</LoadingButton><LoadingButton className="h-9 px-3" tone="ghost" icon={<RotateCcw className="size-4" />} onClick={resetFilters}>重置</LoadingButton>
          </div>
        </section>

        {loadError ? <div role="alert" className="rounded-md border border-danger/20 bg-red-50 p-4 text-sm text-danger">{loadError} 请使用上方刷新数据重试。</div> : null}
        {reviewError ? <div role="alert" className="rounded-md border border-warning/20 bg-amber-50 p-4 text-sm text-amber-800">{reviewError}</div> : null}
        <fieldset disabled={loading || submitting || Boolean(loadError)} className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_350px]">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-3"><ModuleHeader icon={ClipboardCheck} title="地材价格审核队列" subtitle={loading ? "正在加载" : loadError ? "加载失败" : `当前筛选已加载 ${filtered.length} 条，已选 ${selectedIds.length} 条`} density="compact" /><div className="flex gap-2"><LoadingButton className="h-8 px-3" tone="success" icon={<UserCheck className="size-4" />} loading={submitting} disabled={loading || Boolean(loadError) || !selectedIds.length} onClick={() => void bulkApprove()}>批量通过低风险</LoadingButton></div></div>
            <div className="overflow-x-auto"><table className="min-w-[1080px] w-full text-[12px]"><thead className="bg-slate-50 text-textSecondary"><tr>{["选择", "材料与规格", "地区", "申报价格", "来源", "完整度", "记录可信度", "风险", "状态", "操作"].map((item) => <th key={item} className="h-9 border-b border-borderSoft px-3 text-left font-semibold">{item}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.id} onClick={() => { setSelectedId(row.id); setComment(String(row.metadata?.reviewComment ?? "")); }} className={cn("h-11 cursor-pointer border-b border-borderSoft hover:bg-blue-50/50", active?.id === row.id && "bg-primary-soft/50")}><td className="px-3"><input type="checkbox" checked={selectedIds.includes(row.id)} onClick={(e) => e.stopPropagation()} onChange={() => setSelectedIds((items) => items.includes(row.id) ? items.filter((id) => id !== row.id) : [...items, row.id])} /></td><td className="px-3"><p className="font-bold text-textMain">{row.material_name}</p><p className="max-w-52 truncate text-[11px] text-textMuted">{row.price_code} · {row.specification || "待补规格"}</p></td><td className="px-3">{row.region || "待补"}</td><td className="px-3 font-bold">{row.currency} {Number(row.price).toLocaleString()}</td><td className="px-3">{row.source_type || "待补"}</td><td className="px-3 font-bold text-primary">{completion(row)}%</td><td className="px-3"><span className="rounded-full bg-violet-50 px-2 py-1 font-bold text-ai">{confidenceLabel(row.confidence)}</span></td><td className="px-3"><RiskBadge level={row.risk_level} /></td><td className="px-3"><StatusBadge status={row.review_status === "approved" ? "confirmed" : row.review_status === "rejected" ? "rejected" : "pending"} label={statusLabel(row.review_status)} /></td><td className="px-3"><button type="button" onClick={(e) => { e.stopPropagation(); setSelectedId(row.id); setComment(String(row.metadata?.reviewComment ?? "")); }} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 font-bold text-primary"><Eye className="size-3.5" />审核</button></td></tr>)}</tbody></table></div>
            {!visible.length ? <div className="flex h-44 items-center justify-center text-[12px] text-textMuted">{loading ? "正在加载审核队列..." : loadError ? "审核队列暂不可用" : "没有符合条件的审核任务"}</div> : null}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borderSoft px-4 py-2 text-[12px] text-textSecondary"><span>{loading || loadError ? "--" : `共 ${pagination.total} 条，每页 ${pageSize} 条，当前第 ${safePage} / ${totalPages} 页`}</span><div className="flex gap-1"><button type="button" aria-label="上一页" title="上一页" disabled={safePage <= 1} onClick={() => { setPage(safePage - 1); setSelectedIds([]); setComment(""); }} className="size-8 rounded-md border border-borderSoft bg-white disabled:opacity-40"><ChevronLeft className="mx-auto size-4" /></button><button type="button" aria-label="下一页" title="下一页" disabled={safePage >= totalPages} onClick={() => { setPage(safePage + 1); setSelectedIds([]); setComment(""); }} className="size-8 rounded-md border border-borderSoft bg-white disabled:opacity-40"><ChevronRight className="mx-auto size-4" /></button></div></div>
          </section>

          <aside className="overflow-hidden rounded-card border border-ai/20 bg-card shadow-card">
            <div className="border-b border-ai/10 bg-gradient-to-r from-violet-50 to-white px-4 py-3"><div className="flex items-center justify-between"><ModuleHeader icon={UserCheck} title="人工审核工作区" subtitle="AI 预审后由人工确认" density="compact" tone="purple" /><AiBadge label="人工终审" /></div></div>
            {active ? <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-[16px] font-bold text-textMain">{active.material_name}</h3><p className="mt-1 text-[11px] text-textMuted">{active.price_code} · {active.specification || "待补规格"}</p></div><div className="text-right"><p className="text-lg font-bold text-primary">{active.currency} {Number(active.price).toLocaleString()}</p><p className="text-[11px] text-textMuted">/ {active.unit}</p></div></div>
              <div className="grid grid-cols-3 gap-2">{[["记录可信度", confidenceLabel(active.confidence), "text-ai"], ["资料完整度", `${activeCompletion}%`, "text-primary"], ["风险结论", active.risk_level, "text-warning"]].map(([label, value, color]) => <div key={label} className="rounded-md border border-borderSoft bg-slate-50 p-2"><p className="text-[10px] text-textMuted">{label}</p><p className={cn("mt-1 text-[13px] font-bold", color)}>{value}</p></div>)}</div>
              <div><p className="mb-2 text-[12px] font-bold text-textMain">证据与字段核验</p><div className="space-y-2">{checks.map((item) => <div key={item.label} className={cn("rounded-md border px-3 py-2", item.ok ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50")}><div className="flex items-center justify-between text-[12px]"><span className="font-bold">{item.label}</span><span className={item.ok ? "text-success" : "text-warning"}>{item.ok ? "字段已提供" : "待补充"}</span></div><p className="mt-1 truncate text-[11px] text-textMuted" title={item.note}>{item.note}</p></div>)}</div></div>
              <div className="rounded-md border border-violet-100 bg-violet-50 p-3"><div className="flex items-center gap-2 text-[12px] font-bold text-ai"><Sparkles className="size-4" />AI 预审判断</div><p className="mt-2 text-[12px] leading-5 text-textSecondary">{String(metadata.aiSuggestion ?? "暂无 AI 预审结论，请核对原始证据。")}</p></div>
              <label className="block"><span className="text-[12px] font-bold text-textMain">人工审核意见</span><textarea value={comment} onChange={(e) => setComment(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-borderSoft bg-white p-3 text-[12px] outline-none focus:border-primary" placeholder="填写核验结论；退回或驳回时必须说明原因" /></label>
              <div className="grid grid-cols-3 gap-2"><LoadingButton className="h-9 px-2" tone="success" disabled={!canApprove} onClick={() => setDecision("approve")}>审核通过</LoadingButton><LoadingButton className="h-9 px-2" tone="warning" disabled={!canReview} onClick={() => setDecision("need_info")}>补充资料</LoadingButton><LoadingButton className="h-9 px-2" tone="danger" disabled={!canReview} onClick={() => setDecision("reject")}>驳回</LoadingButton></div>
              {!canApprove ? <div className="flex gap-2 rounded-md border border-amber-100 bg-amber-50 p-2 text-[11px] leading-5 text-amber-700"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{canReview ? "资料完整度不足或关键证据缺失，暂不能审核通过。" : "当前记录不在待审核状态，请勿重复提交审核。"}</div> : null}
            </div> : <div className="flex h-64 items-center justify-center text-[12px] text-textMuted">请选择一条审核任务</div>}
          </aside>
        </fieldset>

        <ConfirmDialog open={Boolean(decision)} title={decision === "approve" ? "确认审核通过" : decision === "need_info" ? "确认退回补充资料" : "确认驳回地材价格"} description={active ? `${active.material_name} · ${active.price_code}` : ""} confirmLabel={decision === "approve" ? "确认通过" : decision === "need_info" ? "退回补充" : "确认驳回"} tone={decision === "reject" ? "danger" : decision === "need_info" ? "warning" : "default"} onCancel={() => { if (!mutationInFlight.current) setDecision(null); }} onConfirm={() => void confirmDecision()}>{submitting ? "正在提交，请勿重复操作。" : "确认后提交审核，以服务器返回结果为准。"}</ConfirmDialog>

      </div>
    </AppLayout>
  );
}
