"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Database,
  GitMerge,
  ListPlus,
  RefreshCw,
  RotateCcw,
  Search,
  ScanSearch,
  ShieldAlert,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { OverlayShell } from "@/components/common/OverlayShell";
import { emitMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type { EquipmentCatalogRecord } from "@/types/equipmentCatalog";

type ReviewTab =
  | "pending"
  | "need_info"
  | "high_risk"
  | "duplicate"
  | "approved"
  | "rejected";

type Reviewer = { user_id: string; display_name: string; role: string };
type ReviewRow = EquipmentCatalogRecord & {
  reviewer_name: string;
  difference_count: number;
  duplicate_candidate_ids: string[];
  duplicate_candidates: Array<{
    id: string;
    catalog_code: string;
    equipment_name: string;
    brand: string;
    model: string;
  }>;
};
type ReviewResponse = {
  data: ReviewRow[];
  count: number;
  page: number;
  pageSize: number;
  summary: Record<ReviewTab | "overdue", number>;
  reviewers: Reviewer[];
  categories: string[];
  permissions: { canReview: boolean; canAssign: boolean; canMerge: boolean };
};

const tabItems: Array<{
  key: ReviewTab;
  label: string;
  Icon: typeof Clock3;
}> = [
  { key: "pending", label: "待审核", Icon: Clock3 },
  { key: "need_info", label: "需补充", Icon: CircleAlert },
  { key: "high_risk", label: "高风险", Icon: ShieldAlert },
  { key: "duplicate", label: "重复疑似", Icon: GitMerge },
  { key: "approved", label: "已通过", Icon: CheckCircle2 },
  { key: "rejected", label: "已退回", Icon: RotateCcw },
];

const reviewLabels: Record<string, string> = {
  draft: "待审核",
  pending_review: "待审核",
  approved: "已通过",
  rejected: "已退回",
  archived: "已归档",
};
const riskLabels: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};

function defaultDeadline() {
  const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value?: string | null) {
  if (!value) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function EquipmentCatalogReviewQueue({ taskId = "" }: { taskId?: string }) {
  const [activeTab, setActiveTab] = useState<ReviewTab>("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [queryKeyword, setQueryKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [risk, setRisk] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [response, setResponse] = useState<ReviewResponse | null>(null);
  const [referenceTime, setReferenceTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignReviewer, setAssignReviewer] = useState("");
  const [assignDueAt, setAssignDueAt] = useState(defaultDeadline);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeRecords, setMergeRecords] = useState<Array<Pick<ReviewRow, "id" | "catalog_code" | "equipment_name" | "brand" | "model">>>([]);
  const [mergeNotes, setMergeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    void refreshKey;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      tab: activeTab,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (queryKeyword) params.set("keyword", queryKeyword);
    if (category !== "all") params.set("category", category);
    if (risk !== "all") params.set("risk", risk);
    if (assignee !== "all") params.set("assignee", assignee);
    if (taskId) params.set("taskId", taskId);
    try {
      const result = await fetch(`/api/equipment-catalog/reviews?${params}`, {
        cache: "no-store",
      });
      const payload = (await result.json()) as ReviewResponse & { error?: string };
      if (!result.ok) throw new Error(payload.error || "审核队列加载失败");
      setResponse(payload);
      setReferenceTime(Date.now());
      setSelected([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "审核队列加载失败");
    } finally {
      setLoading(false);
    }
  }, [activeTab, assignee, category, page, pageSize, queryKeyword, refreshKey, risk, taskId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pageCount = Math.max(1, Math.ceil((response?.count ?? 0) / pageSize));
  const allCurrentSelected = Boolean(
    response?.data.length && response.data.every((row) => selected.includes(row.id)),
  );
  const selectedRows = useMemo(
    () => (response?.data ?? []).filter((row) => selected.includes(row.id)),
    [response?.data, selected],
  );

  const postAction = async (body: Record<string, unknown>, success: string) => {
    setSubmitting(true);
    try {
      const result = await fetch("/api/equipment-catalog/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await result.json()) as { error?: string };
      if (!result.ok) throw new Error(payload.error || "操作失败");
      emitMockToast({ title: success, description: "审核队列与审计记录已同步更新。", tone: "success" });
      setAssignOpen(false);
      setRejectOpen(false);
      setMergeOpen(false);
      setRejectNotes("");
      setMergeNotes("");
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      emitMockToast({
        title: "操作未完成",
        description: actionError instanceof Error ? actionError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openMerge = () => {
    if (selectedRows.length < 2) {
      emitMockToast({ title: "请选择至少两条疑似重复资料", tone: "warning" });
      return;
    }
    setMergeRecords(selectedRows);
    setMergeTargetId(selectedRows[0].id);
    setMergeOpen(true);
  };

  const resetFilters = () => {
    setKeyword("");
    setQueryKeyword("");
    setCategory("all");
    setRisk("all");
    setAssignee("all");
    setPage(1);
  };

  return (
    <AppLayout>
      <div className="space-y-3 pb-6">
        <PageHeader
          title="设备资料审核中心"
          description="集中处理采集识别后的资料补全、风险复核、重复合并与参数差异确认，人工审批后进入正式资料库。"
          actions={
            <>
              <Link href="/equipment-catalog/collection" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-medium text-textSecondary hover:bg-bgMuted">
                <ArrowLeft className="size-4" />采集中心
              </Link>
              <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[13px] font-medium text-primary hover:bg-primary/10">
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />刷新队列
              </button>
              <Link href="/equipment-catalog" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-white hover:bg-primary/90">
                正式资料库<ArrowRight className="size-4" />
              </Link>
            </>
          }
        />

        <section className="overflow-hidden rounded-card border border-primary/15 bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-primary-soft/35 px-4 py-2.5">
            <div>
              <p className="text-[13px] font-semibold text-textMain">设备资料业务流程</p>
              <p className="mt-0.5 text-[11px] text-textMuted">采集结果必须经过人工审核，审核通过后才进入正式资料库。</p>
            </div>
            <span className="shrink-0 rounded-pill border border-ai-border bg-ai-soft px-2.5 py-1 text-[11px] font-semibold text-ai">当前：第 3 步</span>
          </div>
          <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { step: 1, title: "资料采集中心", description: "查看任务、运行状态与采集结果", href: "/equipment-catalog/collection", Icon: ScanSearch, state: "done" },
              { step: 2, title: "新建采集任务", description: "选择厂家并配置真实数据来源", href: "/equipment-catalog/collection/create", Icon: ListPlus, state: "done" },
              { step: 3, title: "资料审核中心", description: "补全、复核、去重和差异确认", href: "/equipment-catalog/reviews", Icon: ClipboardCheck, state: "active" },
              { step: 4, title: "正式资料库", description: "查询已确认、可复用的设备档案", href: "/equipment-catalog", Icon: Database, state: "next" },
            ].map(({ step, title, description, href, Icon, state }, index) => (
              <Link
                key={step}
                href={href}
                className={cn(
                  "group relative flex min-w-0 items-center gap-3 px-4 py-3.5 transition hover:bg-primary-soft/45",
                  index > 0 && "border-t border-borderSoft sm:border-l sm:border-t-0",
                  state === "active" && "bg-ai-soft/70"
                )}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md border", state === "active" ? "border-ai bg-ai text-white" : state === "done" ? "border-success/25 bg-success-soft text-success" : "border-primary/20 bg-primary-soft text-primary")}>
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2"><strong className="text-[12px] text-textMain">{step}. {title}</strong>{state === "active" ? <span className="rounded-pill bg-ai px-1.5 py-0.5 text-[9px] font-semibold text-white">当前</span> : null}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-textMuted" title={description}>{description}</span>
                </span>
                <ArrowRight className="ml-auto size-3.5 shrink-0 text-textMuted transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "待审核资料", value: response?.summary.pending ?? 0, tone: "blue", Icon: ClipboardCheck },
            { label: "资料需补充", value: response?.summary.need_info ?? 0, tone: "amber", Icon: CircleAlert },
            { label: "高风险资料", value: response?.summary.high_risk ?? 0, tone: "red", Icon: ShieldAlert },
            { label: "重复疑似", value: response?.summary.duplicate ?? 0, tone: "purple", Icon: GitMerge },
            { label: "已逾期", value: response?.summary.overdue ?? 0, tone: "orange", Icon: Clock3 },
          ].map(({ label, value, tone, Icon }) => (
            <article key={label} className={cn("rounded-card border bg-white p-3 shadow-card", tone === "red" ? "border-danger/20" : tone === "purple" ? "border-ai-border" : tone === "amber" || tone === "orange" ? "border-warning/25" : "border-primary/15")}>
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[12px] text-textMuted">{label}</p><p className="mt-1 text-[24px] font-semibold text-textMain">{value}<span className="ml-1 text-[12px] font-normal text-textMuted">条</span></p></div>
                <span className={cn("flex size-9 items-center justify-center rounded-md", tone === "red" ? "bg-danger-soft text-danger" : tone === "purple" ? "bg-ai-soft text-ai" : tone === "amber" || tone === "orange" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary")}><Icon className="size-4.5" /></span>
              </div>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
          <div className="flex min-w-0 overflow-x-auto border-b border-borderSoft px-3">
            {tabItems.map(({ key, label, Icon }) => {
              const active = activeTab === key;
              return <button key={key} type="button" onClick={() => { setActiveTab(key); setPage(1); }} className={cn("flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[13px] font-medium", active ? "border-primary text-primary" : "border-transparent text-textMuted hover:text-textMain")}><Icon className="size-4" />{label}<span className={cn("rounded-pill px-1.5 py-0.5 text-[11px]", active ? "bg-primary-soft text-primary" : "bg-bgMuted text-textMuted")}>{response?.summary[key] ?? 0}</span></button>;
            })}
          </div>

          <div className="grid gap-2 border-b border-borderSoft bg-bgMuted/45 p-3 md:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(130px,0.7fr))_auto]">
            <label className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-textMuted" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { setQueryKeyword(keyword.trim()); setPage(1); } }} placeholder="设备名称、编号、品牌或型号" className="h-9 w-full min-w-0 rounded-md border border-borderSoft bg-white pl-9 pr-3 text-[13px] outline-none focus:border-primary" /></label>
            <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[13px]"><option value="all">全部设备类别</option>{(response?.categories ?? []).map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={risk} onChange={(event) => { setRisk(event.target.value); setPage(1); }} className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[13px]"><option value="all">全部风险等级</option><option value="low">低风险</option><option value="medium">中风险</option><option value="high">高风险</option><option value="critical">严重风险</option></select>
            <select value={assignee} onChange={(event) => { setAssignee(event.target.value); setPage(1); }} className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[13px]"><option value="all">全部责任人</option><option value="unassigned">未分派</option>{(response?.reviewers ?? []).map((reviewer) => <option key={reviewer.user_id} value={reviewer.user_id}>{reviewer.display_name}</option>)}</select>
            <div className="flex gap-2"><button type="button" onClick={() => { setQueryKeyword(keyword.trim()); setPage(1); }} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-medium text-white"><Search className="size-4" />查询</button><button type="button" onClick={resetFilters} className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[13px] text-textSecondary">重置</button></div>
          </div>

          <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-3 py-2">
            <p className="text-[12px] text-textMuted">共 <strong className="text-textMain">{response?.count ?? 0}</strong> 条，已选 <strong className="text-primary">{selected.length}</strong> 条</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!selected.length || !response?.permissions.canAssign} onClick={() => { setAssignReviewer(response?.reviewers[0]?.user_id ?? ""); setAssignOpen(true); }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-medium text-primary disabled:cursor-not-allowed disabled:opacity-45"><UsersRound className="size-3.5" />批量分派</button>
              <button type="button" disabled={!selected.length || !response?.permissions.canReview} onClick={() => setRejectOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-warning/30 bg-warning-soft px-3 text-[12px] font-medium text-warning disabled:cursor-not-allowed disabled:opacity-45"><RotateCcw className="size-3.5" />批量退回</button>
              <button type="button" disabled={selected.length < 2 || !response?.permissions.canMerge} onClick={openMerge} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-medium text-ai disabled:cursor-not-allowed disabled:opacity-45"><GitMerge className="size-3.5" />合并重复</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse text-left text-[12px]">
              <thead className="h-10 bg-[#f7f9fc] text-textMuted"><tr><th className="w-10 px-3"><input type="checkbox" checked={allCurrentSelected} onChange={() => setSelected(allCurrentSelected ? [] : (response?.data ?? []).map((row) => row.id))} /></th><th className="px-2">设备资料</th><th className="px-2">品牌 / 型号</th><th className="px-2">完整度</th><th className="px-2">AI置信度</th><th className="px-2">风险</th><th className="px-2">参数差异</th><th className="px-2">审核责任人</th><th className="px-2">审核时限</th><th className="px-2">审核状态</th><th className="sticky right-0 bg-[#f7f9fc] px-3 text-right">操作</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={11} className="h-40 text-center text-textMuted"><RefreshCw className="mx-auto mb-2 size-5 animate-spin text-primary" />正在加载真实审核队列</td></tr> : null}
                {!loading && error ? <tr><td colSpan={11} className="h-40 text-center text-danger"><AlertTriangle className="mx-auto mb-2 size-5" />{error}<button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="ml-2 text-primary underline">重新加载</button></td></tr> : null}
                {!loading && !error && !response?.data.length ? <tr><td colSpan={11} className="h-40 text-center text-textMuted"><ClipboardCheck className="mx-auto mb-2 size-7 text-primary/50" />当前筛选条件下没有审核资料</td></tr> : null}
                {!loading && !error && (response?.data ?? []).map((row) => {
                  const overdue = Boolean(row.review_due_at && new Date(row.review_due_at).getTime() < referenceTime && ["draft", "pending_review"].includes(row.review_status));
                  return <tr key={row.id} className={cn("h-12 border-t border-borderSoft hover:bg-primary-soft/25", selected.includes(row.id) && "bg-primary-soft/35")}>
                    <td className="px-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => setSelected((items) => items.includes(row.id) ? items.filter((id) => id !== row.id) : [...items, row.id])} /></td>
                    <td className="max-w-[240px] px-2"><Link href={`/equipment-catalog/${row.id}`} className="block truncate font-semibold text-textMain hover:text-primary" title={row.equipment_name}>{row.equipment_name}</Link><p className="truncate text-[11px] text-textMuted">{row.catalog_code} · {row.equipment_category || "未分类"}</p></td>
                    <td className="max-w-[170px] px-2"><p className="truncate text-textMain">{row.brand || "待补充"}</p><p className="truncate text-[11px] text-textMuted">{row.model || "型号待补充"}</p></td>
                    <td className="px-2"><div className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-pill bg-bgMuted"><span className={cn("block h-full rounded-pill", row.parameter_completeness >= 85 ? "bg-success" : row.parameter_completeness >= 60 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.min(100, row.parameter_completeness)}%` }} /></span><strong>{Math.round(row.parameter_completeness)}%</strong></div></td>
                    <td className="px-2"><span className="rounded-pill border border-ai-border bg-ai-soft px-2 py-1 font-medium text-ai">{Math.round(row.ai_confidence)}%</span></td>
                    <td className="px-2"><span className={cn("rounded-pill border px-2 py-1", ["high", "critical"].includes(row.risk_level) ? "border-danger/25 bg-danger-soft text-danger" : row.risk_level === "medium" ? "border-warning/25 bg-warning-soft text-warning" : "border-success/20 bg-success-soft text-success")}>{riskLabels[row.risk_level] ?? row.risk_level}</span></td>
                    <td className="px-2">{row.difference_count ? <Link href={`/equipment-catalog/${row.id}#document-differences`} className="font-medium text-primary hover:underline">{row.difference_count} 项待确认</Link> : row.duplicate_candidate_ids.length ? <button type="button" onClick={() => { setSelected(Array.from(new Set([row.id, ...row.duplicate_candidate_ids]))); setMergeRecords([row, ...row.duplicate_candidates]); setMergeTargetId(row.id); setMergeOpen(true); }} className="font-medium text-ai hover:underline">{row.duplicate_candidate_ids.length} 条重复候选</button> : <span className="text-textMuted">无差异</span>}</td>
                    <td className="px-2"><div className="flex items-center gap-1.5"><UserRoundCheck className={cn("size-3.5", row.assigned_reviewer_id ? "text-primary" : "text-textMuted")} /><span className={row.assigned_reviewer_id ? "text-textMain" : "text-warning"}>{row.reviewer_name}</span></div></td>
                    <td className={cn("px-2", overdue ? "font-medium text-danger" : "text-textSecondary")}>{formatDate(row.review_due_at)}{overdue ? <span className="ml-1 rounded-pill bg-danger-soft px-1.5 py-0.5 text-[10px]">逾期</span> : null}</td>
                    <td className="px-2"><span className={cn("rounded-pill border px-2 py-1", row.review_status === "approved" ? "border-success/20 bg-success-soft text-success" : row.review_status === "rejected" ? "border-danger/20 bg-danger-soft text-danger" : "border-warning/25 bg-warning-soft text-warning")}>{reviewLabels[row.review_status] ?? row.review_status}</span></td>
                    <td className="sticky right-0 bg-white px-3 text-right"><div className="flex justify-end gap-1.5"><Link href={`/equipment-catalog/${row.id}`} className="inline-flex h-7 items-center rounded-md border border-borderSoft px-2 text-[11px] font-medium text-primary hover:bg-primary-soft">审核详情</Link><Link href={`/equipment-catalog/${row.id}#document-differences`} className="inline-flex h-7 items-center rounded-md border border-ai-border bg-ai-soft px-2 text-[11px] font-medium text-ai hover:bg-ai/10">差异确认</Link></div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-borderSoft px-3 py-2 text-[12px] text-textMuted">
            <span>共 {response?.count ?? 0} 条，当前第 {Math.min(page, pageCount)} / {pageCount} 页</span>
            <div className="flex items-center gap-2"><span>每页</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-8 rounded-md border border-borderSoft bg-white px-2 text-textMain"><option value={10}>10 条</option><option value={20}>20 条</option><option value={30}>30 条</option></select><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white disabled:opacity-40"><ChevronLeft className="size-4" /></button><span className="flex size-8 items-center justify-center rounded-md bg-primary font-medium text-white">{page}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white disabled:opacity-40"><ChevronRight className="size-4" /></button></div>
          </div>
        </section>
      </div>

      <OverlayShell open={assignOpen} onClose={() => setAssignOpen(false)} panelClassName="max-w-[480px] bg-white p-5" ariaLabel="批量分派审核">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-section-title text-textMain">批量分派审核</h2><p className="mt-1 text-[12px] text-textMuted">为已选 {selected.length} 条资料设置责任人与完成时限。</p></div><button type="button" onClick={() => setAssignOpen(false)} className="flex size-8 items-center justify-center rounded-md hover:bg-bgMuted"><X className="size-4" /></button></div>
        <div className="mt-4 space-y-4"><label className="block text-[13px] font-medium text-textSecondary">审核责任人<select value={assignReviewer} onChange={(event) => setAssignReviewer(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3"><option value="">请选择责任人</option>{(response?.reviewers ?? []).map((reviewer) => <option key={reviewer.user_id} value={reviewer.user_id}>{reviewer.display_name} · {reviewer.role}</option>)}</select></label><label className="block text-[13px] font-medium text-textSecondary">审核时限<input type="datetime-local" value={assignDueAt} onChange={(event) => setAssignDueAt(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3" /></label></div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setAssignOpen(false)} className="h-9 rounded-md border border-borderSoft px-4 text-[13px]">取消</button><button type="button" disabled={submitting || !assignReviewer || !assignDueAt} onClick={() => void postAction({ action: "assign", ids: selected, reviewerId: assignReviewer, dueAt: assignDueAt }, "审核任务已分派")} className="h-9 rounded-md bg-primary px-4 text-[13px] font-medium text-white disabled:opacity-50">{submitting ? "正在分派..." : "确认分派"}</button></div>
      </OverlayShell>

      <ConfirmDialog open={rejectOpen} title="批量退回资料" description={`将已选 ${selected.length} 条资料退回补充，退回原因会写入审核记录。`} confirmLabel={submitting ? "正在退回..." : "确认退回"} tone="warning" onCancel={() => setRejectOpen(false)} onConfirm={() => { if (!rejectNotes.trim()) { emitMockToast({ title: "请填写退回原因", tone: "warning" }); return; } void postAction({ action: "reject", ids: selected, notes: rejectNotes }, "资料已退回补充"); }}><textarea value={rejectNotes} onChange={(event) => setRejectNotes(event.target.value)} placeholder="请填写缺失字段、证据问题或风险原因" className="h-24 w-full resize-none rounded-md border border-borderSoft p-3 text-[13px] outline-none focus:border-warning" /></ConfirmDialog>

      <OverlayShell open={mergeOpen} onClose={() => setMergeOpen(false)} panelClassName="max-w-[560px] bg-white p-5" ariaLabel="合并重复设备资料">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-section-title text-textMain">合并重复设备资料</h2><p className="mt-1 text-[12px] text-textMuted">选择保留的主记录。其他记录将归档并保留合并关系与审计记录。</p></div><button type="button" onClick={() => setMergeOpen(false)} className="flex size-8 items-center justify-center rounded-md hover:bg-bgMuted"><X className="size-4" /></button></div>
        <div className="mt-4 space-y-2">{mergeRecords.map((row) => <label key={row.id} className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3", mergeTargetId === row.id ? "border-ai bg-ai-soft" : "border-borderSoft")}><input type="radio" name="merge-target" checked={mergeTargetId === row.id} onChange={() => setMergeTargetId(row.id)} /><span className="min-w-0"><strong className="block truncate text-[13px] text-textMain">{row.equipment_name}</strong><span className="text-[11px] text-textMuted">{row.catalog_code} · {row.brand} · {row.model}</span></span>{mergeTargetId === row.id ? <span className="ml-auto rounded-pill bg-ai px-2 py-1 text-[10px] text-white">保留主记录</span> : null}</label>)}</div>
        <textarea value={mergeNotes} onChange={(event) => setMergeNotes(event.target.value)} placeholder="合并说明（可选）" className="mt-3 h-20 w-full resize-none rounded-md border border-borderSoft p-3 text-[13px]" />
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setMergeOpen(false)} className="h-9 rounded-md border border-borderSoft px-4 text-[13px]">取消</button><button type="button" disabled={submitting || !mergeTargetId} onClick={() => void postAction({ action: "merge", ids: mergeRecords.map((row) => row.id), targetId: mergeTargetId, notes: mergeNotes }, "重复设备已合并")} className="h-9 rounded-md bg-ai px-4 text-[13px] font-medium text-white disabled:opacity-50">{submitting ? "正在合并..." : "确认合并"}</button></div>
      </OverlayShell>
    </AppLayout>
  );
}
