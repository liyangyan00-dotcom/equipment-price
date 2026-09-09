"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Eye,
  FileClock,
  Filter,
  History,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { OverlayShell } from "@/components/common/OverlayShell";
import { cn } from "@/lib/utils";

type AuditRow = {
  id: number;
  actor_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type LogsResponse = {
  organization: { id: string; code: string; name: string } | null;
  rows: AuditRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { total: number; inserts: number; updates: number; deletes: number; actors: number };
  tables: Array<{ name: string; count: number }>;
};

type UserItem = { userId: string; displayName: string; email: string | null };

const actionMeta: Record<string, { label: string; className: string; icon: typeof History }> = {
  insert: { label: "新增", className: "border-success/20 bg-success-soft text-success", icon: PlusCircle },
  update: { label: "修改", className: "border-primary/20 bg-primary-soft text-primary", icon: Activity },
  delete: { label: "删除", className: "border-danger/20 bg-danger-soft text-danger", icon: Trash2 },
};

const tableLabels: Record<string, string> = {
  wpi_organization_role_permissions: "角色权限",
  wpi_organization_members: "组织成员",
  wpi_equipment_prices: "设备价格",
  wpi_material_prices: "地材价格",
  wpi_suppliers: "供应商",
  wpi_inquiries: "询价任务",
  wpi_projects: "项目套价",
  wpi_reports: "报告",
  wpi_attachments: "附件证据",
  wpi_equipment_review_tasks: "设备价格审核",
  wpi_equipment_import_batches: "设备导入批次",
  wpi_price_collection_tasks: "价格采集任务",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function changedFields(row: AuditRow) {
  const keys = new Set([...Object.keys(row.old_data ?? {}), ...Object.keys(row.new_data ?? {})]);
  return [...keys].filter((key) => JSON.stringify(row.old_data?.[key]) !== JSON.stringify(row.new_data?.[key]));
}

function readableValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function StatCard({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: typeof History; tone: string }) {
  return <section className={cn("rounded-card border bg-gradient-to-br from-white p-3.5 shadow-card", tone)}><div className="flex items-start justify-between"><div><p className="text-[12px] font-semibold">{label}</p><p className="mt-1 text-[25px] font-bold leading-none">{value}</p><p className="mt-2 text-[11px] text-textMuted">{note}</p></div><span className="flex size-10 items-center justify-center rounded-[12px] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]"><Icon className="size-5" /></span></div></section>;
}

function SettingsLogsContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<LogsResponse | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [table, setTable] = useState(() => searchParams.get("table") ?? "all");
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get("role") ?? "all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [detailError, setDetailError] = useState("");
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);
  const openAuditDetail = async (row: AuditRow) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setDetailLoadingId(row.id);
    setDetailError("");
    try {
      const response = await fetch(`/api/settings/logs?id=${row.id}`, { cache: "no-store", signal: controller.signal });
      const body = await response.json() as { data?: AuditRow; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error || "审计详情读取失败");
      if (!controller.signal.aborted) setSelected(body.data);
    } catch (error) {
      if (!controller.signal.aborted) setDetailError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setDetailLoadingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: "15" });
    if (query) params.set("q", query);
    if (action !== "all") params.set("action", action);
    if (table !== "all") params.set("table", table);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const controller = new AbortController();
    Promise.all([
      fetch(`/api/settings/logs?${params.toString()}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "审计日志读取失败");
        return payload as LogsResponse;
      }),
    ])
      .then(([logs]) => { if (!cancelled) { setData(logs); setError(""); } })
      .catch((requestError) => { if (!cancelled) setError(errorMessage(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [action, from, page, query, refreshToken, roleFilter, table, to]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/settings/users", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? (await response.json()).data as UserItem[] : [])
      .then((members) => { if (!controller.signal.aborted) setUsers(members); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [refreshToken]);

  const actorMap = useMemo(() => new Map(users.map((user) => [user.userId, user])), [users]);
  const reset = () => { setKeyword(""); setQuery(""); setAction("all"); setTable("all"); setRoleFilter("all"); setFrom(""); setTo(""); setPage(1); };
  const search = () => { setPage(1); setQuery(keyword.trim()); };

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title="系统审计日志"
          description={`追踪 ${data?.organization?.name ?? "当前组织"} 的权限、成员和业务数据变化，所有记录只读且不可篡改。`}
          actions={<><Link href="/settings/roles" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary hover:border-primary hover:text-primary"><ChevronLeft className="size-4" />角色权限</Link><Link href="/settings" className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary"><ShieldCheck className="size-4" />系统设置</Link></>}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="近期记录" value={data?.summary.total ?? 0} note="最多统计最近 1,000 条" icon={History} tone="border-blue-100 to-blue-50 text-primary" />
          <StatCard label="新增操作" value={data?.summary.inserts ?? 0} note="数据创建与流程发起" icon={PlusCircle} tone="border-emerald-100 to-emerald-50 text-success" />
          <StatCard label="修改操作" value={data?.summary.updates ?? 0} note="状态与字段变更" icon={Activity} tone="border-purple-100 to-purple-50 text-ai" />
          <StatCard label="删除操作" value={data?.summary.deletes ?? 0} note="删除与恢复默认" icon={Trash2} tone="border-red-100 to-red-50 text-danger" />
          <StatCard label="操作人员" value={data?.summary.actors ?? 0} note="近期参与成员" icon={CircleUserRound} tone="border-cyan-100 to-cyan-50 text-cyan-700" />
        </div>

        <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
          <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-[10px] bg-primary-soft text-primary"><Filter className="size-4" /></span><div><h2 className="text-[13px] font-semibold text-textMain">审计筛选</h2><p className="text-[10px] text-textMuted">按对象、动作和时间范围定位操作证据</p></div></div>
          <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(220px,1.4fr)_160px_200px_150px_150px_auto]">
            <label className="relative"><Search className="absolute left-3 top-2.5 size-3.5 text-textMuted" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search(); }} placeholder="记录 ID、模块或动作" className="h-9 w-full rounded-md border border-borderSoft pl-9 pr-3 text-[12px] outline-none focus:border-primary" /></label>
            <select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft bg-white px-2 text-[12px] outline-none focus:border-primary"><option value="all">全部动作</option><option value="insert">新增</option><option value="update">修改</option><option value="delete">删除</option></select>
            <select value={table} onChange={(event) => { setTable(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft bg-white px-2 text-[12px] outline-none focus:border-primary"><option value="all">全部业务模块</option>{data?.tables.map((item) => <option key={item.name} value={item.name}>{tableLabels[item.name] ?? item.name}（{item.count}）</option>)}</select>
            <input aria-label="开始日期" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft px-2 text-[11px] outline-none focus:border-primary" />
            <input aria-label="结束日期" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="h-9 rounded-md border border-borderSoft px-2 text-[11px] outline-none focus:border-primary" />
            <div className="flex gap-2"><button type="button" onClick={search} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[12px] font-semibold text-white"><Search className="size-3.5" />查询</button><button type="button" onClick={reset} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"><RefreshCw className="size-3.5" />重置</button></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-[11px] bg-ai-soft text-ai"><FileClock className="size-4" /></span><div><h2 className="text-[14px] font-semibold text-textMain">操作记录</h2><p className="text-[11px] text-textMuted">当前筛选共 {data?.pagination.total ?? 0} 条，点击记录查看前后值</p></div></div>{loading ? <RefreshCw className="size-4 animate-spin text-primary" /> : null}</div>
          {error ? <div className="p-6 text-center"><p className="text-[13px] font-semibold text-danger">{error}</p><button type="button" onClick={() => setRefreshToken((value) => value + 1)} className="mt-3 h-8 rounded-md bg-primary px-4 text-[12px] font-semibold text-white">重新加载</button></div> : data?.rows.length ? <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-[11px]"><thead className="h-10 bg-[#F7FAFE] text-textSecondary"><tr><th className="px-3">发生时间</th><th className="px-3">业务模块</th><th className="px-3">动作</th><th className="px-3">记录对象</th><th className="px-3">操作人</th><th className="px-3">变更字段</th><th className="px-3">请求标识</th><th className="px-3 text-center">操作</th></tr></thead><tbody className="divide-y divide-borderSoft">{data.rows.map((row) => { const meta = actionMeta[row.action] ?? { label: row.action, className: "border-slate-200 bg-slate-50 text-slate-600", icon: History }; const Icon = meta.icon; const actor = row.actor_id ? actorMap.get(row.actor_id) : null; const changes = changedFields(row); return <tr key={row.id} className="h-11 transition hover:bg-primary-soft/30"><td className="whitespace-nowrap px-3 text-textSecondary">{formatDate(row.created_at)}</td><td className="px-3"><p className="font-semibold text-textMain">{tableLabels[row.table_name] ?? row.table_name}</p><code className="text-[9px] text-textMuted">{row.table_name}</code></td><td className="px-3"><span className={cn("inline-flex items-center gap-1 rounded-pill border px-2 py-1 font-semibold", meta.className)}><Icon className="size-3" />{meta.label}</span></td><td className="max-w-[190px] px-3"><p className="truncate font-semibold text-textSecondary" title={row.record_id ?? ""}>{row.record_id ?? "系统记录"}</p></td><td className="px-3"><p className="font-semibold text-textSecondary">{actor?.displayName ?? (row.actor_id ? `成员 ${row.actor_id.slice(0, 8)}` : "系统任务")}</p><p className="text-[9px] text-textMuted">{actor?.email ?? "自动审计"}</p></td><td className="max-w-[230px] px-3"><p className="truncate text-textSecondary" title={changes.join("、")}>{changes.length ? changes.slice(0, 4).join("、") : "详情中查看"}</p></td><td className="max-w-[150px] px-3"><p className="truncate font-mono text-[9px] text-textMuted">{row.request_id ?? "—"}</p></td><td className="px-3 text-center"><button type="button" onClick={() => void openAuditDetail(row)} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-[11px] font-semibold text-primary"><Eye className="size-3.5" />详情</button></td></tr>; })}</tbody></table></div> : !loading ? <EmptyState title="没有匹配的审计记录" description="请调整动作、业务模块、关键词或日期范围后重新查询。" className="m-4 shadow-none" /> : <div className="py-20 text-center"><RefreshCw className="mx-auto size-6 animate-spin text-primary" /></div>}
          <div className="flex items-center justify-between border-t border-borderSoft px-4 py-3 text-[11px] text-textMuted"><span>共 {data?.pagination.total ?? 0} 条，当前第 {data?.pagination.page ?? 1} / {data?.pagination.totalPages ?? 1} 页</span><div className="flex items-center gap-1"><button type="button" disabled={!data || data.pagination.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-35"><ChevronLeft className="size-4" /></button><span className="flex size-8 items-center justify-center rounded-md bg-primary font-semibold text-white">{data?.pagination.page ?? 1}</span><button type="button" disabled={!data || data.pagination.page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-35"><ChevronRight className="size-4" /></button></div></div>
        </section>
      </div>

      {detailError ? <p role="alert" className="text-[12px] text-danger">{detailError}</p> : null}
      {detailLoadingId !== null ? <p role="status" className="text-[12px] text-primary">正在读取审计详情...</p> : null}
      <OverlayShell open={Boolean(selected)} onClose={() => setSelected(null)} variant="drawer" labelledBy="audit-detail-title">
        {selected ? <div className="h-full overflow-y-auto"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-borderSoft bg-white/95 px-5 py-4 backdrop-blur"><div><h2 id="audit-detail-title" className="text-[16px] font-semibold text-textMain">审计记录 #{selected.id}</h2><p className="mt-1 text-[11px] text-textMuted">{formatDate(selected.created_at)} · {tableLabels[selected.table_name] ?? selected.table_name}</p></div><button type="button" onClick={() => setSelected(null)} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100"><X className="size-4" /></button></div><div className="space-y-4 p-5"><div className="grid grid-cols-2 gap-3">{[["动作", actionMeta[selected.action]?.label ?? selected.action], ["记录 ID", selected.record_id ?? "—"], ["操作人", selected.actor_id ? actorMap.get(selected.actor_id)?.displayName ?? selected.actor_id : "系统任务"], ["IP 地址", selected.ip_address ?? "未记录"]].map(([label, value]) => <div key={label} className="rounded-[10px] border border-borderSoft bg-slate-50 p-3"><p className="text-[10px] text-textMuted">{label}</p><p className="mt-1 break-all text-[12px] font-semibold text-textMain">{value}</p></div>)}</div><section className="rounded-card border border-borderSoft"><div className="border-b border-borderSoft px-3 py-2 text-[12px] font-semibold text-textMain">字段变化</div><div className="divide-y divide-borderSoft">{changedFields(selected).length ? changedFields(selected).map((field) => <div key={field} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 px-3 py-2.5 text-[11px]"><code className="font-semibold text-primary">{field}</code><div className="min-w-0"><p className="break-all text-danger line-through decoration-danger/40">{readableValue(selected.old_data?.[field])}</p><p className="mt-1 break-all font-semibold text-success">{readableValue(selected.new_data?.[field])}</p></div></div>) : <p className="px-3 py-6 text-center text-[11px] text-textMuted">该操作未记录字段级差异</p>}</div></section><div className="rounded-[10px] border border-warning/20 bg-warning-soft p-3 text-[11px] leading-5 text-textSecondary"><p className="font-semibold text-warning">审计证据说明</p><p className="mt-1">审计记录只读展示，无法在此修改或删除。需要回滚业务数据时，应返回对应业务页面执行受控操作。</p></div></div></div> : null}
      </OverlayShell>
    </AppLayout>
  );
}

export default function SettingsLogsPage() {
  return <Suspense fallback={<AppLayout><section className="rounded-card border border-borderSoft bg-white py-24 text-center shadow-card"><RefreshCw className="mx-auto size-6 animate-spin text-primary" /><p className="mt-3 text-[12px] text-textMuted">正在加载审计日志...</p></section></AppLayout>}><SettingsLogsContent /></Suspense>;
}
