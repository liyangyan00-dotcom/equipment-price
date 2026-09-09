"use client";
import { useUnsavedSettings } from "@/hooks/useUnsavedSettings";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Database,
  FileClock,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingButton } from "@/components/common/LoadingButton";
import { OverlayShell } from "@/components/common/OverlayShell";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";

type DictionaryType = "equipment_category" | "material_category" | "unit" | "currency" | "business_status";

type DictionaryItem = {
  id: string;
  dictionary_type: DictionaryType;
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  metadata: Record<string, string | number | boolean>;
  created_at: string;
  updated_at: string;
  usageCount: number;
};

type AuditItem = {
  id: number;
  actor_id: string | null;
  action: "insert" | "update" | "delete";
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

type DictionariesResponse = {
  organization: { id: string; code: string; name: string } | null;
  currentRole: string;
  canManage: boolean;
  items: DictionaryItem[];
  audits: AuditItem[];
};

type EditorState = {
  item: DictionaryItem | null;
  dictionaryType: DictionaryType;
};

const typeMeta: Record<DictionaryType, { label: string; description: string; icon: typeof Boxes; tone: string }> = {
  equipment_category: { label: "设备分类", description: "设备价格与供应商能力分类", icon: Boxes, tone: "border-blue-100 bg-blue-50 text-primary" },
  material_category: { label: "材料分类", description: "地材价格与采集线索分类", icon: Tags, tone: "border-emerald-100 bg-emerald-50 text-success" },
  unit: { label: "计量单位", description: "价格、BOQ 和询价统一单位", icon: Database, tone: "border-cyan-100 bg-cyan-50 text-cyan-700" },
  currency: { label: "币种", description: "报价币种及金额展示规则", icon: CircleDollarSign, tone: "border-purple-100 bg-purple-50 text-ai" },
  business_status: { label: "业务状态", description: "审核、归档与流程状态", icon: ShieldCheck, tone: "border-orange-100 bg-orange-50 text-warning" },
};

const typeOrder = Object.keys(typeMeta) as DictionaryType[];

const emptyResponse: DictionariesResponse = {
  organization: null,
  currentRole: "viewer",
  canManage: false,
  items: [],
  audits: [],
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function apiRequest<T>(init?: RequestInit, query = "") {
  const response = await fetch(`/api/settings/dictionaries${query}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload;
}

function SummaryCard({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: typeof Boxes; tone: string }) {
  return (
    <section className={cn("min-h-[88px] rounded-card border bg-gradient-to-br from-white p-3.5 shadow-card", tone)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold">{label}</p>
          <p className="mt-1 text-[24px] font-bold leading-none">{value}<span className="ml-1 text-[11px] font-semibold">项</span></p>
          <p className="mt-2 text-[10px] text-textMuted">{note}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-[12px] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]"><Icon className="size-5" /></span>
      </div>
    </section>
  );
}

function DictionaryEditor({ state, loading, onClose: closeEditor, onSubmit }: { state: EditorState; loading: boolean; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => void }) {
  const item = state.item;
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sort_order ?? 100));
  const [metadataKey, setMetadataKey] = useState(() => {
    if (state.dictionaryType === "unit" || state.dictionaryType === "currency") return "symbol";
    if (state.dictionaryType === "business_status") return "tone";
    return "color";
  });
  const [metadataValue, setMetadataValue] = useState(() => String(item?.metadata?.symbol ?? item?.metadata?.tone ?? item?.metadata?.color ?? ""));
  const values = JSON.stringify([code, name, description, sortOrder, metadataKey, metadataValue]);
  const [initialValues] = useState(values);
  const confirmLeave = useUnsavedSettings(values !== initialValues, loading);
  const onClose = () => { if (confirmLeave()) closeEditor(); };

  return (
    <OverlayShell open onClose={onClose} variant="drawer" ariaLabel={item ? "编辑字典项" : "新增字典项"} panelClassName="w-[480px]">
      <form className="flex h-full flex-col" onSubmit={(event) => { event.preventDefault(); onSubmit({ id: item?.id, dictionaryType: state.dictionaryType, code, name, description, sortOrder: Number(sortOrder), isActive: item?.is_active ?? true, metadata: metadataKey && metadataValue ? { ...item?.metadata, [metadataKey]: metadataValue } : item?.metadata ?? {} }); }}>
        <div className="border-b border-borderSoft bg-gradient-to-r from-primary-soft to-ai-soft px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-[12px] bg-primary text-white shadow-[0_10px_22px_rgba(47,107,255,0.24)]"><PencilLine className="size-5" /></span><div><h2 className="text-[16px] font-semibold text-textMain">{item ? "编辑字典项" : "新增字典项"}</h2><p className="mt-1 text-[11px] text-textMuted">{typeMeta[state.dictionaryType].label} · 保存后立即进入组织字典与审计链</p></div></div>
            <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-white/70"><X className="size-4" /></button>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block text-[12px] font-semibold text-textSecondary">字典编码<span className="ml-1 text-danger">*</span><input data-overlay-autofocus required value={code} disabled={Boolean(item?.is_system)} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="例如 PUMP" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 font-mono text-[12px] uppercase outline-none focus:border-primary disabled:bg-slate-50 disabled:text-textMuted" /><span className="mt-1 block text-[10px] font-normal text-textMuted">系统内稳定标识，创建后建议不要修改。</span></label>
          <label className="block text-[12px] font-semibold text-textSecondary">显示名称<span className="ml-1 text-danger">*</span><input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] outline-none focus:border-primary" /></label>
          <label className="block text-[12px] font-semibold text-textSecondary">业务说明<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="说明该字典项适用范围" className="mt-1.5 w-full resize-none rounded-md border border-borderSoft bg-white px-3 py-2 text-[12px] leading-5 outline-none focus:border-primary" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12px] font-semibold text-textSecondary">排序号<input type="number" min={0} max={9999} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary" /></label>
            <label className="block text-[12px] font-semibold text-textSecondary">扩展属性<select value={metadataKey} onChange={(event) => setMetadataKey(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary"><option value="color">颜色标识</option><option value="symbol">显示符号</option><option value="tone">状态色调</option></select></label>
          </div>
          <label className="block text-[12px] font-semibold text-textSecondary">属性值<input value={metadataValue} onChange={(event) => setMetadataValue(event.target.value)} placeholder="例如 blue、¥、green" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary" /></label>
          <div className="rounded-[12px] border border-warning/20 bg-warning-soft p-3 text-[11px] leading-5 text-textSecondary"><strong className="text-warning">治理提醒：</strong>停用或修改已被业务记录引用的字典项前，应先检查使用次数。系统只更新显示与可选状态，不自动改写历史价格。</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-borderSoft bg-white px-5 py-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[12px] font-semibold text-textSecondary">取消</button><LoadingButton loading={loading} type="submit">{item ? "保存修改" : "新增字典项"}</LoadingButton></div>
      </form>
    </OverlayShell>
  );
}

export default function DictionariesPage() {
  const toast = useMockToast();
  const [response, setResponse] = useState<DictionariesResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeType, setActiveType] = useState<DictionaryType>("equipment_category");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pendingAction, setPendingAction] = useState<{ item: DictionaryItem; action: "toggle" | "delete" } | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await apiRequest<DictionariesResponse>();
      setResponse(data);
      setSelectedId((current) => current && data.items.some((item) => item.id === current) ? current : data.items[0]?.id ?? null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest<DictionariesResponse>()
      .then((data) => {
        if (cancelled) return;
        setResponse(data);
        setSelectedId(data.items.find((item) => item.dictionary_type === "equipment_category")?.id ?? data.items[0]?.id ?? null);
      })
      .catch((requestError) => {
        if (!cancelled) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => Object.fromEntries(typeOrder.map((type) => [type, response.items.filter((item) => item.dictionary_type === type).length])) as Record<DictionaryType, number>, [response.items]);
  const filteredItems = useMemo(() => response.items.filter((item) => item.dictionary_type === activeType && (status === "all" || (status === "active" ? item.is_active : !item.is_active)) && (!keyword.trim() || `${item.code} ${item.name} ${item.description ?? ""}`.toLowerCase().includes(keyword.trim().toLowerCase()))), [activeType, keyword, response.items, status]);
  const selected = response.items.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const activeCount = response.items.filter((item) => item.is_active).length;
  const referencedCount = response.items.filter((item) => item.usageCount > 0).length;

  const saveItem = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      await apiRequest(payload.id ? { method: "PATCH", body: JSON.stringify(payload) } : { method: "POST", body: JSON.stringify(payload) });
      toast.success(payload.id ? "字典项已更新" : "字典项已新增", "变更已写入 Supabase，并记录到组织审计日志。");
      setEditor(null);
      await loadData(true);
    } catch (requestError) {
      toast.danger("保存失败", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    setSaving(true);
    try {
      if (pendingAction.action === "delete") {
        await apiRequest({ method: "DELETE" }, `?id=${encodeURIComponent(pendingAction.item.id)}`);
        toast.success("字典项已删除", `${pendingAction.item.name} 已从当前组织字典移除。`);
      } else {
        await apiRequest({ method: "PATCH", body: JSON.stringify({ id: pendingAction.item.id, isActive: !pendingAction.item.is_active }) });
        toast.success(pendingAction.item.is_active ? "字典项已停用" : "字典项已启用", "新的可选状态已生效，历史业务记录保持不变。");
      }
      setPendingAction(null);
      await loadData(true);
    } catch (requestError) {
      toast.danger("操作失败", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const moveItem = async (item: DictionaryItem, direction: -1 | 1) => {
    const siblings = response.items.filter((candidate) => candidate.dictionary_type === item.dictionary_type).sort((left, right) => left.sort_order - right.sort_order);
    const index = siblings.findIndex((candidate) => candidate.id === item.id);
    const other = siblings[index + direction];
    if (!other) return;
    try {
      await Promise.all([
        apiRequest({ method: "PATCH", body: JSON.stringify({ id: item.id, sortOrder: other.sort_order }) }),
        apiRequest({ method: "PATCH", body: JSON.stringify({ id: other.id, sortOrder: item.sort_order }) }),
      ]);
      toast.success("排序已更新", `${item.name} 已${direction < 0 ? "上移" : "下移"}。`);
      await loadData(true);
    } catch (requestError) {
      toast.danger("排序失败", errorMessage(requestError));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader title="数据字典治理" description={`统一维护 ${response.organization?.name ?? "当前组织"} 的设备、地材、单位、币种和业务状态。字典变更受权限控制并自动进入审计日志。`} actions={<><Link href="/settings" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary hover:text-primary"><ChevronLeft className="size-4" />系统设置</Link><Link href="/settings/logs?table=wpi_dictionary_items" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ai-border bg-ai-soft px-3 text-[11px] font-semibold text-ai"><FileClock className="size-4" />字典审计</Link><button type="button" onClick={() => void loadData()} title="刷新数据" className="inline-flex size-9 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:text-primary"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button><button type="button" disabled={!response.canManage} onClick={() => setEditor({ item: null, dictionaryType: activeType })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(47,107,255,0.2)] disabled:cursor-not-allowed disabled:opacity-45"><Plus className="size-4" />新增字典项</button></>} />

        {error ? <section className="rounded-card border border-danger/20 bg-danger-soft p-4 text-[12px] text-danger"><strong>数据字典读取失败：</strong>{error}<button type="button" onClick={() => void loadData()} className="ml-3 font-semibold underline">重新加载</button></section> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="字典项总数" value={response.items.length} note="当前组织全部配置" icon={Database} tone="border-blue-100 to-blue-50 text-primary" />
          <SummaryCard label="启用字典项" value={activeCount} note="可在业务表单中选用" icon={CheckCircle2} tone="border-emerald-100 to-emerald-50 text-success" />
          <SummaryCard label="业务已引用" value={referencedCount} note="修改前应评估历史影响" icon={Activity} tone="border-cyan-100 to-cyan-50 text-cyan-700" />
          <SummaryCard label="系统预置" value={response.items.filter((item) => item.is_system).length} note="不可删除，可停用" icon={ShieldCheck} tone="border-purple-100 to-purple-50 text-ai" />
          <SummaryCard label="近期变更" value={response.audits.length} note="真实 Supabase 审计记录" icon={FileClock} tone="border-orange-100 to-orange-50 text-warning" />
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          <aside className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="border-b border-borderSoft px-4 py-3"><h2 className="text-[13px] font-semibold text-textMain">字典分类</h2><p className="mt-0.5 text-[10px] text-textMuted">按业务域切换治理范围</p></div>
            <div className="space-y-1.5 p-2.5">{typeOrder.map((type) => { const meta = typeMeta[type]; const Icon = meta.icon; return <button key={type} type="button" onClick={() => { setActiveType(type); setKeyword(""); setStatus("all"); setSelectedId(response.items.find((item) => item.dictionary_type === type)?.id ?? null); }} className={cn("flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition", activeType === type ? "border-primary/20 bg-primary-soft shadow-sm" : "border-transparent hover:border-borderSoft hover:bg-slate-50")}><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[9px] border", meta.tone)}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-textMain">{meta.label}</span><span className="block truncate text-[9px] text-textMuted">{meta.description}</span></span><span className="rounded-pill bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-textSecondary">{counts[type]}</span></button>; })}</div>
            <div className="border-t border-borderSoft bg-ai-soft/50 p-3 text-[10px] leading-5 text-textSecondary"><strong className="text-ai">权限边界：</strong>{response.canManage ? "当前账号可维护字典。所有变更会记录操作者、前后值和时间。" : "当前账号仅可查看。请由系统管理员维护字典。"}</div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft px-4 py-3"><div><h2 className="text-[14px] font-semibold text-textMain">{typeMeta[activeType].label}</h2><p className="text-[10px] text-textMuted">{typeMeta[activeType].description} · {filteredItems.length} 项</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-textMuted" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索编码、名称" className="h-9 w-[210px] rounded-md border border-borderSoft bg-white pl-8 pr-3 text-[11px] outline-none focus:border-primary" /></label><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[11px] outline-none focus:border-primary"><option value="all">全部状态</option><option value="active">仅启用</option><option value="inactive">仅停用</option></select></div></div>
            {loading ? <div className="flex min-h-[420px] items-center justify-center text-[12px] text-textMuted"><RefreshCw className="mr-2 size-4 animate-spin" />正在读取 Supabase 数据字典</div> : filteredItems.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-[11px]"><thead className="h-10 bg-[#F7FAFE] text-textSecondary"><tr><th className="px-3">排序</th><th className="px-3">编码</th><th className="px-3">显示名称</th><th className="px-3">说明</th><th className="px-3 text-center">业务引用</th><th className="px-3 text-center">来源</th><th className="px-3 text-center">状态</th><th className="px-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-borderSoft">{filteredItems.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className={cn("h-12 cursor-pointer transition hover:bg-primary-soft/30", selected?.id === item.id && "bg-primary-soft/50")}><td className="px-3 font-mono text-textMuted">{item.sort_order}</td><td className="px-3"><code className="rounded bg-slate-100 px-1.5 py-1 text-[10px] font-semibold text-primary">{item.code}</code></td><td className="px-3 font-semibold text-textMain">{item.name}</td><td className="max-w-[250px] truncate px-3 text-textMuted" title={item.description ?? ""}>{item.description || "未填写说明"}</td><td className="px-3 text-center"><span className={cn("rounded-pill px-2 py-1 text-[10px] font-semibold", item.usageCount ? "bg-primary-soft text-primary" : "bg-slate-100 text-textMuted")}>{item.usageCount} 条</span></td><td className="px-3 text-center"><span className={cn("rounded-pill px-2 py-1 text-[10px] font-semibold", item.is_system ? "bg-ai-soft text-ai" : "bg-cyan-50 text-cyan-700")}>{item.is_system ? "系统" : "组织"}</span></td><td className="px-3 text-center"><span className={cn("rounded-pill px-2 py-1 text-[10px] font-semibold", item.is_active ? "bg-success-soft text-success" : "bg-slate-100 text-textMuted")}>{item.is_active ? "启用" : "停用"}</span></td><td className="px-3"><div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}><button type="button" disabled={!response.canManage} onClick={() => void moveItem(item, -1)} className="flex size-7 items-center justify-center rounded-md border border-borderSoft text-textMuted hover:text-primary disabled:opacity-35" title="上移"><ArrowUp className="size-3.5" /></button><button type="button" disabled={!response.canManage} onClick={() => void moveItem(item, 1)} className="flex size-7 items-center justify-center rounded-md border border-borderSoft text-textMuted hover:text-primary disabled:opacity-35" title="下移"><ArrowDown className="size-3.5" /></button><button type="button" disabled={!response.canManage} onClick={() => setEditor({ item, dictionaryType: item.dictionary_type })} className="flex size-7 items-center justify-center rounded-md border border-primary/20 bg-primary-soft text-primary disabled:opacity-35" title="编辑"><PencilLine className="size-3.5" /></button><button type="button" disabled={!response.canManage} onClick={() => setPendingAction({ item, action: "toggle" })} className={cn("h-7 rounded-md border px-2 text-[10px] font-semibold disabled:opacity-35", item.is_active ? "border-warning/20 bg-warning-soft text-warning" : "border-success/20 bg-success-soft text-success")}>{item.is_active ? "停用" : "启用"}</button>{!item.is_system ? <button type="button" disabled={!response.canManage || item.usageCount > 0} onClick={() => setPendingAction({ item, action: "delete" })} className="flex size-7 items-center justify-center rounded-md border border-danger/20 bg-danger-soft text-danger disabled:opacity-35" title={item.usageCount ? "已有业务引用，不能删除" : "删除"}><Trash2 className="size-3.5" /></button> : null}</div></td></tr>)}</tbody></table></div> : <EmptyState title="没有匹配的字典项" description="调整关键词或状态筛选，也可以新增当前类型的组织字典项。" className="m-4 min-h-[360px] shadow-none" primaryAction={response.canManage ? <button type="button" onClick={() => setEditor({ item: null, dictionaryType: activeType })} className="rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-white">新增字典项</button> : undefined} />}
          </section>

          <aside className="space-y-3">
            <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><div className="border-b border-borderSoft bg-gradient-to-r from-white to-primary-soft px-4 py-3"><h2 className="text-[13px] font-semibold text-textMain">字典项影响分析</h2><p className="mt-0.5 text-[10px] text-textMuted">当前选中项的实时使用与治理边界</p></div>{selected ? <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><code className="text-[10px] font-semibold text-primary">{selected.code}</code><h3 className="mt-1 text-[16px] font-bold text-textMain">{selected.name}</h3><p className="mt-1 text-[11px] leading-5 text-textMuted">{selected.description || "暂无业务说明"}</p></div><span className={cn("shrink-0 rounded-pill px-2 py-1 text-[10px] font-semibold", selected.is_active ? "bg-success-soft text-success" : "bg-slate-100 text-textMuted")}>{selected.is_active ? "启用" : "停用"}</span></div><div className="grid grid-cols-2 gap-2"><div className="rounded-[10px] border border-primary/15 bg-primary-soft p-3"><p className="text-[10px] text-textMuted">业务引用</p><p className="mt-1 text-[20px] font-bold text-primary">{selected.usageCount}<span className="ml-1 text-[10px]">条</span></p></div><div className="rounded-[10px] border border-ai-border bg-ai-soft p-3"><p className="text-[10px] text-textMuted">配置来源</p><p className="mt-2 text-[12px] font-bold text-ai">{selected.is_system ? "系统预置" : "组织自定义"}</p></div></div><div className="rounded-[10px] border border-borderSoft bg-slate-50 p-3"><p className="text-[10px] font-semibold text-textSecondary">扩展属性</p><div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(selected.metadata ?? {}).length ? Object.entries(selected.metadata).map(([key, value]) => <span key={key} className="rounded-pill border border-borderSoft bg-white px-2 py-1 text-[9px] text-textSecondary">{key}: {String(value)}</span>) : <span className="text-[10px] text-textMuted">未配置扩展属性</span>}</div></div><div className={cn("rounded-[10px] border p-3 text-[10px] leading-5", selected.usageCount ? "border-warning/20 bg-warning-soft text-textSecondary" : "border-success/20 bg-success-soft text-textSecondary")}><strong className={selected.usageCount ? "text-warning" : "text-success"}>{selected.usageCount ? "变更提醒：" : "可安全调整："}</strong>{selected.usageCount ? "该项已被业务记录引用。停用不会改写历史数据，但会从后续新增表单候选项中移除。" : "当前尚无业务引用，可调整编码、名称或删除组织自定义项。"}</div><button type="button" disabled={!response.canManage} onClick={() => setEditor({ item: selected, dictionaryType: selected.dictionary_type })} className="h-9 w-full rounded-md bg-primary text-[11px] font-semibold text-white disabled:opacity-40">编辑当前字典项</button></div> : <div className="p-8 text-center text-[11px] text-textMuted">选择一条字典项查看影响</div>}</section>
            <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div><h2 className="text-[13px] font-semibold text-textMain">最近字典审计</h2><p className="text-[10px] text-textMuted">数据库真实变更记录</p></div><Link href="/settings/logs?table=wpi_dictionary_items" className="text-[10px] font-semibold text-primary">查看全部</Link></div><div className="space-y-2 p-3">{response.audits.length ? response.audits.slice(0, 6).map((audit) => { const data = audit.new_data ?? audit.old_data; return <Link key={audit.id} href="/settings/logs?table=wpi_dictionary_items" className="flex gap-2 rounded-[10px] border border-borderSoft bg-slate-50 p-2.5 hover:border-primary/25"><span className={cn("mt-1 size-2 shrink-0 rounded-full", audit.action === "insert" ? "bg-success" : audit.action === "delete" ? "bg-danger" : "bg-primary")} /><div className="min-w-0"><p className="truncate text-[10px] font-semibold text-textSecondary">{audit.action === "insert" ? "新增" : audit.action === "delete" ? "删除" : "更新"} · {String(data?.name ?? "字典项")}</p><p className="mt-0.5 text-[9px] text-textMuted">{formatDate(audit.created_at)}</p></div></Link>; }) : <p className="rounded-[10px] bg-slate-50 px-3 py-8 text-center text-[10px] text-textMuted">暂无字典变更</p>}</div></section>
          </aside>
        </div>
      </div>

      {editor ? <DictionaryEditor state={editor} loading={saving} onClose={() => setEditor(null)} onSubmit={(payload) => void saveItem(payload)} /> : null}
      <ConfirmDialog open={Boolean(pendingAction)} title={pendingAction?.action === "delete" ? "删除组织字典项" : pendingAction?.item.is_active ? "停用字典项" : "启用字典项"} description={pendingAction?.action === "delete" ? `确认删除“${pendingAction?.item.name}”？该操作会写入审计日志。` : `${pendingAction?.item.is_active ? "停用后将不再出现在新增业务表单中" : "启用后将恢复为可选项"}，历史记录不会被改写。`} confirmLabel={pendingAction?.action === "delete" ? "确认删除" : pendingAction?.item.is_active ? "确认停用" : "确认启用"} tone={pendingAction?.action === "delete" ? "danger" : "warning"} onCancel={() => setPendingAction(null)} onConfirm={() => void runPendingAction()} />
    </AppLayout>
  );
}
