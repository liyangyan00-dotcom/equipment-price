"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Database,
  Eye,
  FileSearch,
  Filter,
  Gauge,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { IconBox } from "@/components/common";
import { OverlayShell } from "@/components/common/OverlayShell";
import { cn } from "@/lib/utils";

type AuditRun = {
  run_id: string;
  run_type: "equipment_review" | "attachment_evidence" | "price_collection" | "ai_gateway";
  object_id: string | null;
  object_code: string | null;
  object_name: string | null;
  object_href: string;
  status: string;
  provider: string;
  model: string;
  prompt_key: string | null;
  prompt_version: string | null;
  schema_version: string | null;
  input_snapshot: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  confidence: number | null;
  risk_level: string | null;
  requires_human_review: boolean;
  human_decision: string | null;
  human_note: string | null;
  actor_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  estimated_cost_usd?: number | null;
};

type AuditResponse = {
  organization: { id: string; code: string; name: string } | null;
  currentRole: string;
  rows: AuditRun[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { total: number; successRate: number; needsReview: number; highRisk: number; failed: number; models: number };
  types: Array<{ name: string; count: number }>;
  models: Array<{ name: string; count: number }>;
};

type UserItem = { userId: string; displayName: string; email: string | null };

const typeMeta = {
  equipment_review: { label: "设备价格审核", icon: Gauge, tone: "blue" as const },
  attachment_evidence: { label: "附件证据分析", icon: FileSearch, tone: "cyan" as const },
  price_collection: { label: "AI价格采集", icon: Database, tone: "purple" as const },
  ai_gateway: { label: "AI执行网关", icon: Cpu, tone: "purple" as const },
};

const statusLabels: Record<string, string> = {
  queued: "排队中", running: "执行中", completed: "已完成", success: "已完成", transferred: "已转线索",
  needs_review: "待复核", reviewing: "复核中", failed: "失败", paused: "已暂停", draft: "草稿",
};

const statusClass: Record<string, string> = {
  completed: "border-success/20 bg-success-soft text-success", success: "border-success/20 bg-success-soft text-success",
  transferred: "border-success/20 bg-success-soft text-success", failed: "border-danger/20 bg-danger-soft text-danger",
  needs_review: "border-warning/20 bg-warning-soft text-warning", reviewing: "border-warning/20 bg-warning-soft text-warning",
  running: "border-ai-border bg-ai-soft text-ai", queued: "border-primary/20 bg-primary-soft text-primary",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (value == null) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function jsonText(value: Record<string, unknown> | null) {
  return JSON.stringify(value ?? {}, null, 2);
}

function confidenceLevel(value: number) {
  if (value >= 90) return "A" as const;
  if (value >= 75) return "B" as const;
  if (value >= 60) return "C" as const;
  if (value >= 40) return "D" as const;
  return "E" as const;
}

function AuditRiskBadge({ level }: { level: string | null }) {
  if (!level || level === "none") return <span className="inline-flex h-5 items-center rounded-pill border border-slate-200 bg-slate-50 px-2 text-[10px] font-semibold text-slate-500">无风险</span>;
  return <RiskBadge level={level as "low" | "medium" | "high" | "critical"} className="h-5 text-[10px]" />;
}

function SummaryCard({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: typeof Bot; tone: string }) {
  return <section className={cn("rounded-card border bg-gradient-to-br from-white p-3.5 shadow-card", tone)}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold">{label}</p><p className="mt-1 text-[24px] font-bold leading-none">{value}</p><p className="mt-2 text-[10px] text-textMuted">{note}</p></div><span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]"><Icon className="size-5" /></span></div></section>;
}

export default function AiAuditLogsPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");
  const [review, setReview] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<AuditRun | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: "15", type, status, risk, review });
    if (query) params.set("q", query);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    Promise.all([
      fetch(`/api/settings/ai/audit-logs?${params}`, { cache: "no-store" }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "AI 审计日志读取失败");
        return payload as AuditResponse;
      }),
      fetch("/api/settings/users", { cache: "no-store" }).then(async (response) => response.ok ? (await response.json()).data as UserItem[] : []),
    ])
      .then(([auditData, memberData]) => { if (!cancelled) { setData(auditData); setUsers(memberData); setError(""); } })
      .catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "读取失败"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, page, query, refresh, review, risk, status, to, type]);

  const userMap = useMemo(() => new Map(users.map((user) => [user.userId, user])), [users]);
  const reload = () => { setLoading(true); setRefresh((value) => value + 1); };
  const search = () => { setLoading(true); setPage(1); setQuery(keyword.trim()); setRefresh((value) => value + 1); };
  const reset = () => { setLoading(true); setKeyword(""); setQuery(""); setType("all"); setStatus("all"); setRisk("all"); setReview("all"); setFrom(""); setTo(""); setPage(1); setRefresh((value) => value + 1); };

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title="AI审计日志中心"
          description={`统一追踪 ${data?.organization?.name ?? "当前组织"} 的 AI 输入输出、模型版本、置信度、风险与人工复核证据。`}
          actions={<><Link href="/settings/ai" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"><ChevronLeft className="size-4" />AI规则设置</Link><Link href="/settings/logs" className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary"><History className="size-4" />系统审计</Link><button type="button" disabled={loading} onClick={reload} className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-3 text-[12px] font-semibold text-white disabled:cursor-wait disabled:opacity-70"><RefreshCw className={cn("size-4", loading && "animate-spin")} />{loading ? "读取中" : "刷新记录"}</button></>}
        />

        <section className="rounded-card border border-ai-border bg-gradient-to-r from-ai-soft via-white to-primary-soft p-3 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><IconBox icon={BrainCircuit} tone="purple" size="lg" /><div><div className="flex items-center gap-2"><h2 className="text-[14px] font-bold text-textMain">AI治理证据链</h2><AiBadge label="真实业务数据" /></div><p className="mt-1 text-[10px] text-textSecondary">只读追踪，不允许在审计页改写模型结果；最终商务判断仍由人工审核完成。</p></div></div><div className="flex items-center gap-2 text-[10px] font-semibold"><span className="rounded-pill border border-success/20 bg-success-soft px-2.5 py-1 text-success">RLS 组织隔离</span><span className="rounded-pill border border-ai-border bg-white px-2.5 py-1 text-ai">权限：audit.read</span></div></div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="AI执行总数" value={data?.summary.total ?? 0} note="当前组织真实运行" icon={Sparkles} tone="border-purple-100 to-purple-50 text-ai" />
          <SummaryCard label="执行成功率" value={`${data?.summary.successRate ?? 0}%`} note="完成或已转线索" icon={CheckCircle2} tone="border-emerald-100 to-emerald-50 text-success" />
          <SummaryCard label="待人工复核" value={data?.summary.needsReview ?? 0} note="强制人工判断" icon={UserCheck} tone="border-amber-100 to-amber-50 text-warning" />
          <SummaryCard label="高风险结果" value={data?.summary.highRisk ?? 0} note="不得直接采用" icon={AlertTriangle} tone="border-red-100 to-red-50 text-danger" />
          <SummaryCard label="失败任务" value={data?.summary.failed ?? 0} note="需排查或重试" icon={Activity} tone="border-orange-100 to-orange-50 text-[#EA580C]" />
          <SummaryCard label="模型与流程" value={data?.summary.models ?? 0} note="版本可追溯" icon={Bot} tone="border-cyan-100 to-cyan-50 text-cyan-700" />
        </div>

        <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
          <div className="flex items-center gap-2"><IconBox icon={Filter} tone="blue" size="sm" /><div><h2 className="text-[13px] font-semibold text-textMain">运行记录筛选</h2><p className="text-[10px] text-textMuted">按业务类型、状态、风险和人工复核阶段定位 AI 证据</p></div></div>
          <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(190px,1.3fr)_145px_130px_120px_145px_130px_130px_auto]">
            <label className="relative"><Search className="absolute left-3 top-2.5 size-3.5 text-textMuted" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search(); }} placeholder="对象、模型、版本或运行ID" className="h-9 w-full rounded-md border border-borderSoft pl-9 pr-3 text-[11px] outline-none focus:border-primary" /></label>
            <select value={type} onChange={(event) => { setLoading(true); setType(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft bg-white px-2 text-[11px]"><option value="all">全部AI类型</option>{Object.entries(typeMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select>
            <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft bg-white px-2 text-[11px]"><option value="all">全部状态</option><option value="completed">已完成</option><option value="running">执行中</option><option value="needs_review">待复核</option><option value="failed">失败</option></select>
            <select value={risk} onChange={(event) => { setLoading(true); setRisk(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft bg-white px-2 text-[11px]"><option value="all">全部风险</option><option value="critical">严重</option><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option><option value="none">无风险</option></select>
            <select value={review} onChange={(event) => { setLoading(true); setReview(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft bg-white px-2 text-[11px]"><option value="all">全部复核阶段</option><option value="required">要求人工复核</option><option value="pending">待人工复核</option><option value="completed">已人工处理</option></select>
            <input aria-label="开始日期" type="date" value={from} onChange={(event) => { setLoading(true); setFrom(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft px-2 text-[10px]" />
            <input aria-label="结束日期" type="date" value={to} onChange={(event) => { setLoading(true); setTo(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft px-2 text-[10px]" />
            <div className="flex gap-2"><button type="button" disabled={loading} onClick={search} className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"><Search className="size-3.5" />查询</button><button type="button" disabled={loading} onClick={reset} className="inline-flex h-9 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary disabled:cursor-wait disabled:opacity-60"><RefreshCw className="size-3.5" />重置</button></div>
          </div>
        </section>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_290px]">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div className="flex items-center gap-2"><IconBox icon={History} tone="purple" size="sm" /><div><h2 className="text-[14px] font-semibold text-textMain">AI运行审计记录</h2><p className="text-[10px] text-textMuted">当前筛选 {data?.pagination.total ?? 0} 条，点击详情检查输入输出和人工结论</p></div></div>{loading ? <RefreshCw className="size-4 animate-spin text-ai" /> : <AiBadge label="只读证据" />}</div>
            {error ? <div className="py-16 text-center"><p className="text-[12px] font-semibold text-danger">{error}</p><button type="button" disabled={loading} onClick={reload} className="mt-3 h-8 rounded-md bg-primary px-4 text-[11px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">{loading ? "读取中" : "重新加载"}</button></div> : data?.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-[10px]"><thead className="h-10 bg-[#F7FAFE] text-textSecondary"><tr><th className="px-3">时间 / 类型</th><th className="px-3">业务对象</th><th className="px-3">模型 / 版本</th><th className="px-3">状态</th><th className="px-3">置信度</th><th className="px-3">风险</th><th className="px-3">人工复核</th><th className="px-3">耗时</th><th className="px-3 text-center">操作</th></tr></thead><tbody className="divide-y divide-borderSoft">{data.rows.map((row) => { const meta = typeMeta[row.run_type] ?? typeMeta.price_collection; const Icon = meta.icon; const actor = row.actor_id ? userMap.get(row.actor_id) : null; return <tr key={row.run_id} className="h-12 transition hover:bg-ai-soft/25"><td className="px-3"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-[8px] bg-ai-soft text-ai"><Icon className="size-3.5" /></span><span><span className="block font-semibold text-textMain">{meta.label}</span><span className="text-[9px] text-textMuted">{formatDate(row.created_at)}</span></span></div></td><td className="max-w-[210px] px-3"><p className="truncate font-semibold text-textMain" title={row.object_name ?? ""}>{row.object_name || "未命名对象"}</p><code className="text-[9px] text-primary">{row.object_code || row.object_id?.slice(0, 8) || "—"}</code></td><td className="max-w-[190px] px-3"><p className="truncate font-semibold text-textSecondary">{row.provider} / {row.model}</p><p className="mt-0.5 text-[9px] text-textMuted">{row.prompt_version || "未标记版本"}</p></td><td className="px-3"><span className={cn("inline-flex rounded-pill border px-2 py-1 font-semibold", statusClass[row.status] ?? "border-slate-200 bg-slate-50 text-slate-600")}>{statusLabels[row.status] ?? row.status}</span></td><td className="px-3">{row.confidence == null ? <span className="text-textMuted">未提供</span> : <ConfidenceBadge level={confidenceLevel(row.confidence)} label={`${row.confidence}%`} className="h-5 text-[10px]" />}</td><td className="px-3"><AuditRiskBadge level={row.risk_level} /></td><td className="px-3"><p className={cn("font-semibold", row.human_decision ? "text-success" : row.requires_human_review ? "text-warning" : "text-textMuted")}>{row.human_decision ? "已处理" : row.requires_human_review ? "待人工" : "非强制"}</p><p className="mt-0.5 text-[9px] text-textMuted">{actor?.displayName ?? (row.actor_id ? `成员 ${row.actor_id.slice(0, 6)}` : "系统任务")}</p></td><td className="whitespace-nowrap px-3 font-mono text-textSecondary">{formatDuration(row.duration_ms)}</td><td className="px-3 text-center"><button type="button" onClick={() => setSelected(row)} className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-2 text-[10px] font-semibold text-ai"><Eye className="size-3.5" />详情</button></td></tr>; })}</tbody></table></div> : !loading ? <EmptyState title="没有匹配的 AI 审计记录" description="请调整业务类型、状态、风险或日期范围后重新查询。" className="m-4 shadow-none" /> : <div className="py-20 text-center"><RefreshCw className="mx-auto size-6 animate-spin text-ai" /></div>}
            <div className="flex items-center justify-between border-t border-borderSoft px-4 py-3 text-[10px] text-textMuted"><span>共 {data?.pagination.total ?? 0} 条，当前第 {data?.pagination.page ?? 1} / {data?.pagination.totalPages ?? 1} 页</span><div className="flex items-center gap-1"><button type="button" disabled={loading || !data || data.pagination.page <= 1} onClick={() => { setLoading(true); setPage((value) => Math.max(1, value - 1)); }} className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-35"><ChevronLeft className="size-4" /></button><span className="flex size-8 items-center justify-center rounded-md bg-ai font-semibold text-white">{data?.pagination.page ?? 1}</span><button type="button" disabled={loading || !data || data.pagination.page >= data.pagination.totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-35"><ChevronRight className="size-4" /></button></div></div>
          </section>

          <aside className="space-y-3">
            <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-4 shadow-card"><div className="flex items-center gap-2"><IconBox icon={ShieldCheck} tone="purple" size="sm" /><div><h2 className="text-[13px] font-semibold text-textMain">AI治理检查</h2><p className="text-[10px] text-textMuted">当前审计边界</p></div></div><div className="mt-3 space-y-2">{[["输入快照", "保留运行时业务上下文"], ["模型版本", "Provider、模型与提示词可追溯"], ["风险判断", "风险等级与置信度同时记录"], ["人工结论", "AI不得替代最终商务判断"]].map(([label, note]) => <div key={label} className="rounded-[10px] border border-white bg-white/80 p-2.5"><div className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-success" /><p className="text-[10px] font-semibold text-textMain">{label}</p></div><p className="mt-1 pl-5 text-[9px] leading-4 text-textMuted">{note}</p></div>)}</div></section>
            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card"><div className="flex items-center gap-2"><IconBox icon={Bot} tone="cyan" size="sm" /><div><h2 className="text-[13px] font-semibold text-textMain">模型使用分布</h2><p className="text-[10px] text-textMuted">真实运行记录聚合</p></div></div><div className="mt-3 space-y-2">{data?.models.length ? data.models.slice(0, 6).map((model) => <div key={model.name} className="rounded-[9px] border border-borderSoft bg-slate-50 p-2.5"><div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] font-semibold text-textSecondary" title={model.name}>{model.name}</p><span className="shrink-0 text-[11px] font-bold text-primary">{model.count}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-white"><span className="block h-full rounded-pill bg-primary" style={{ width: `${Math.max(8, Math.min(100, (model.count / Math.max(1, data.summary.total)) * 100))}%` }} /></div></div>) : <p className="py-8 text-center text-[10px] text-textMuted">暂无模型运行记录</p>}</div></section>
          </aside>
        </div>
      </div>

      <OverlayShell open={Boolean(selected)} onClose={() => setSelected(null)} variant="drawer" labelledBy="ai-audit-detail-title">
        {selected ? <div className="h-full overflow-y-auto"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-borderSoft bg-white/95 px-5 py-4 backdrop-blur"><div><div className="flex items-center gap-2"><h2 id="ai-audit-detail-title" className="text-[16px] font-semibold text-textMain">AI运行证据详情</h2><AiBadge label="只读" /></div><p className="mt-1 text-[10px] text-textMuted">运行 ID：{selected.run_id}</p></div><button type="button" onClick={() => setSelected(null)} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100"><X className="size-4" /></button></div><div className="space-y-4 p-5"><div className="grid grid-cols-2 gap-2">{[["业务对象", selected.object_name || "未命名"], ["运行状态", statusLabels[selected.status] ?? selected.status], ["模型", `${selected.provider} / ${selected.model}`], ["运行耗时", formatDuration(selected.duration_ms)], ["Token 用量", selected.total_tokens == null ? "未返回" : `${selected.total_tokens}`], ["估算成本", selected.estimated_cost_usd == null ? "未配置费率" : `$${selected.estimated_cost_usd.toFixed(6)}`], ["提示词版本", selected.prompt_version || "未标记"], ["输出结构", selected.schema_version || "未标记"]].map(([label, value]) => <div key={label} className="rounded-[10px] border border-borderSoft bg-slate-50 p-3"><p className="text-[9px] text-textMuted">{label}</p><p className="mt-1 break-all text-[11px] font-semibold text-textMain">{value}</p></div>)}</div><section className="rounded-card border border-ai-border bg-ai-soft p-3"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-ai">AI判断与人工边界</p>{selected.confidence == null ? null : <ConfidenceBadge level={confidenceLevel(selected.confidence)} label={`${selected.confidence}%`} className="h-5 text-[10px]" />}</div><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-[9px] bg-white p-2.5"><span className="text-textMuted">风险等级</span><div className="mt-1"><AuditRiskBadge level={selected.risk_level} /></div></div><div className="rounded-[9px] bg-white p-2.5"><span className="text-textMuted">人工复核</span><p className="mt-1 font-semibold text-warning">{selected.human_decision || (selected.requires_human_review ? "等待人工结论" : "非强制复核")}</p></div></div>{selected.human_note ? <p className="mt-2 rounded-[9px] bg-white p-2.5 text-[10px] leading-4 text-textSecondary">人工意见：{selected.human_note}</p> : null}</section>{selected.error_message ? <section className="rounded-card border border-danger/20 bg-danger-soft p-3"><p className="text-[11px] font-semibold text-danger">{selected.error_code || "AI_RUN_FAILED"}</p><p className="mt-1 text-[10px] leading-4 text-textSecondary">{selected.error_message}</p></section> : null}<section className="overflow-hidden rounded-card border border-borderSoft"><div className="border-b border-borderSoft px-3 py-2 text-[11px] font-semibold text-textMain">输入快照</div><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all bg-[#0B1730] p-3 text-[9px] leading-4 text-[#D9E8FF]">{jsonText(selected.input_snapshot)}</pre></section><section className="overflow-hidden rounded-card border border-borderSoft"><div className="border-b border-borderSoft px-3 py-2 text-[11px] font-semibold text-textMain">输出结果</div><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all bg-[#111827] p-3 text-[9px] leading-4 text-[#E9D5FF]">{jsonText(selected.output_payload)}</pre></section><div className="flex gap-2"><Link href={selected.object_href} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 text-[11px] font-semibold text-white"><Eye className="size-3.5" />查看业务对象</Link><button type="button" onClick={() => setSelected(null)} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[11px] font-semibold text-textSecondary">关闭</button></div><div className="rounded-[10px] border border-warning/20 bg-warning-soft p-3 text-[10px] leading-4 text-textSecondary"><p className="font-semibold text-warning">不可篡改说明</p><p className="mt-1">本页面只展示数据库中的 AI 运行证据。需要修正业务结果时，请前往对应设备、附件或采集任务页面执行人工复核。</p></div></div></div> : null}
      </OverlayShell>
    </AppLayout>
  );
}
