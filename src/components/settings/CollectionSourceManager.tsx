"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Globe2,
  Network,
  Plus,
  RefreshCw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { IconBox } from "@/components/common/IconBox";
import { OverlayShell } from "@/components/common/OverlayShell";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";

type SourceKind = "web" | "api";

type CollectionSource = {
  id: string;
  source_code: string;
  name: string;
  source_kind: SourceKind;
  base_url: string;
  allowed_path_prefixes: string[];
  is_active: boolean;
  robots_policy: "respect" | "manual_only";
  rate_limit_per_minute: number;
  default_currency: string;
  default_region: string | null;
  quality_score: number;
  extraction_strategy: "structured_data" | "html_table" | "json_api";
  last_checked_at: string | null;
  last_error: string | null;
};

type SourceEditorProps = {
  kind: SourceKind;
  returnTo: string;
  onClose: () => void;
  onCompleted: (source: CollectionSource) => void;
};

function makeCode(name: string, kind: SourceKind) {
  const ascii = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 42);
  return `${kind === "api" ? "API" : "WEB"}_${ascii || Date.now().toString().slice(-8)}`;
}

async function sourceRequest(init?: RequestInit) {
  const response = await fetch("/api/price-collection/sources", {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "采集来源操作失败");
  return payload;
}

function SourceEditor({ kind, returnTo, onClose, onCompleted }: SourceEditorProps) {
  const toast = useMockToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [paths, setPaths] = useState("/");
  const [targetType, setTargetType] = useState("all");
  const [currency, setCurrency] = useState("CNY");
  const [region, setRegion] = useState("");
  const [strategy, setStrategy] = useState(kind === "api" ? "json_api" : "structured_data");
  const [rateLimit, setRateLimit] = useState("6");
  const [authorizationNote, setAuthorizationNote] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await sourceRequest({
        method: "POST",
        body: JSON.stringify({
          sourceKind: kind,
          sourceCode: code.trim() || makeCode(name, kind),
          name,
          baseUrl,
          allowedPathPrefixes: paths.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
          targetType,
          defaultCurrency: currency,
          defaultRegion: region,
          extractionStrategy: strategy,
          rateLimitPerMinute: Number(rateLimit),
          robotsPolicy: "respect",
          qualityScore: 60,
          authorizationNote,
        }),
      });
      const source = created.source as CollectionSource;
      toast.info("采集来源已登记", "正在执行 HTTPS、域名和响应内容校验。 ");
      const validated = await sourceRequest({
        method: "PATCH",
        body: JSON.stringify({ action: "validate", id: source.id }),
      });
      const activeSource = validated.source as CollectionSource;
      toast.success("来源验证通过", `${activeSource.name} 已加入采集白名单。`);
      onCompleted(activeSource);
    } catch (error) {
      toast.danger("来源登记或验证失败", error instanceof Error ? error.message : "请检查来源配置");
    } finally {
      setSaving(false);
    }
  };

  const Icon = kind === "web" ? Globe2 : Network;
  const title = kind === "web" ? "新增采集网页" : "新增 API 数据源";

  return (
    <OverlayShell open onClose={onClose} variant="drawer" panelClassName="flex h-full w-[560px] max-w-full flex-col" ariaLabel={title}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-start gap-3 border-b border-borderSoft p-5">
          <IconBox icon={Icon} tone={kind === "web" ? "blue" : "purple"} size="lg" />
          <div className="min-w-0 flex-1"><h2 className="text-[16px] font-bold text-textMain">{title}</h2><p className="mt-1 text-[11px] leading-5 text-textMuted">保存后执行真实连通校验，通过后才进入价格采集白名单。</p></div>
          <button type="button" onClick={onClose} className="inline-flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100" aria-label="关闭"><X className="size-4" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <section className="rounded-[12px] border border-primary/15 bg-primary-soft/45 p-3 text-[10px] leading-5 text-textSecondary">
            <strong className="text-primary">安全边界：</strong>仅允许 HTTPS 公网地址；禁止内网、localhost、私有 IP 和跨白名单域名重定向。采集结果仍需人工确认。
          </section>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-textSecondary">来源名称<input required value={name} onChange={(event) => { setName(event.target.value); if (!code) setCode(makeCode(event.target.value, kind)); }} placeholder={kind === "web" ? "如：KSB 官方产品页" : "如：授权价格 JSON API"} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal outline-none focus:border-primary" /></label>
            <label className="text-[11px] font-semibold text-textSecondary">来源编码<input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-mono font-normal outline-none focus:border-primary" /></label>
          </div>
          <label className="block text-[11px] font-semibold text-textSecondary">{kind === "web" ? "起始采集 URL" : "API Endpoint"}<input required type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://example.com/prices" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal outline-none focus:border-primary" /></label>
          <label className="block text-[11px] font-semibold text-textSecondary">允许路径前缀<textarea value={paths} onChange={(event) => setPaths(event.target.value)} rows={3} placeholder="每行一个路径，例如 /products/" className="mt-1.5 w-full resize-none rounded-md border border-borderSoft p-3 font-mono font-normal leading-5 outline-none focus:border-primary" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-textSecondary">业务对象<select value={targetType} onChange={(event) => setTargetType(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 font-normal"><option value="all">设备与地材</option><option value="equipment">仅设备</option><option value="material">仅地材</option></select></label>
            <label className="text-[11px] font-semibold text-textSecondary">解析策略<select value={strategy} onChange={(event) => setStrategy(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 font-normal"><option value="structured_data">结构化数据</option><option value="html_table">HTML 表格</option><option value="json_api">JSON API</option></select></label>
            <label className="text-[11px] font-semibold text-textSecondary">默认币种<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 font-normal"><option>CNY</option><option>USD</option><option>EUR</option><option>ZAR</option></select></label>
            <label className="text-[11px] font-semibold text-textSecondary">默认地区<input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="可选" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal outline-none focus:border-primary" /></label>
            <label className="text-[11px] font-semibold text-textSecondary">每分钟请求上限<input type="number" min="1" max="60" value={rateLimit} onChange={(event) => setRateLimit(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal outline-none focus:border-primary" /></label>
          </div>
          <label className="block text-[11px] font-semibold text-textSecondary">公开来源或授权说明<textarea required value={authorizationNote} onChange={(event) => setAuthorizationNote(event.target.value)} rows={3} placeholder="说明该页面/API 的公开性、授权范围或内部审批依据" className="mt-1.5 w-full resize-none rounded-md border border-borderSoft p-3 font-normal leading-5 outline-none focus:border-primary" /></label>
          {kind === "api" ? <p className="rounded-[10px] border border-warning/20 bg-warning-soft p-3 text-[10px] leading-5 text-warning">当前来源白名单支持公开 HTTPS JSON API。需要 Header/API Key 的受控接口，应先在外部集成管理中配置 Vault 凭据，再接入采集执行网关。</p> : null}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-borderSoft p-4">
          <p className="text-[9px] text-textMuted">{returnTo ? "验证成功后返回采集中心并自动选中" : "验证成功后立即启用"}</p>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft px-4 text-[11px] font-semibold text-textSecondary">取消</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[11px] font-semibold text-white disabled:opacity-50">{saving ? <RefreshCw className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}{saving ? "保存并验证中" : returnTo ? "保存、验证并返回" : "保存并验证"}</button></div>
        </footer>
      </form>
    </OverlayShell>
  );
}

export function CollectionSourceManager({ initialKind, autoOpen, returnTo }: { initialKind: SourceKind; autoOpen: boolean; returnTo: string }) {
  const toast = useMockToast();
  const [sources, setSources] = useState<CollectionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [editorKind, setEditorKind] = useState<SourceKind | null>(autoOpen ? initialKind : null);
  const [workingId, setWorkingId] = useState("");

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await sourceRequest();
      setSources((payload.sources as CollectionSource[]) ?? []);
      setCanManage(Boolean(payload.canManage));
    } catch (error) {
      toast.danger("采集来源读取失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSources(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSources]);

  const counts = useMemo(() => ({ web: sources.filter((item) => item.source_kind === "web").length, api: sources.filter((item) => item.source_kind === "api").length, active: sources.filter((item) => item.is_active).length }), [sources]);

  const selectSource = (source: CollectionSource) => {
    if (!source.is_active) {
      toast.warning("来源尚未通过验证");
      return;
    }
    if (!returnTo) {
      toast.success("来源已启用", source.name);
      return;
    }
    const destination = new URL(returnTo, window.location.origin);
    destination.searchParams.set("sourceId", source.id);
    destination.searchParams.set("sourceKind", source.source_kind);
    window.location.assign(`${destination.pathname}${destination.search}`);
  };

  const validateSource = async (source: CollectionSource) => {
    setWorkingId(source.id);
    try {
      const payload = await sourceRequest({ method: "PATCH", body: JSON.stringify({ action: "validate", id: source.id }) });
      const validated = payload.source as CollectionSource;
      setSources((current) => current.map((item) => item.id === validated.id ? validated : item));
      toast.success("来源验证通过", validated.name);
    } catch (error) {
      toast.danger("来源验证失败", error instanceof Error ? error.message : "请检查来源地址");
      await loadSources();
    } finally {
      setWorkingId("");
    }
  };

  const toggleSource = async (source: CollectionSource) => {
    setWorkingId(source.id);
    try {
      const payload = await sourceRequest({ method: "PATCH", body: JSON.stringify({ action: "toggle", id: source.id, isActive: !source.is_active }) });
      const updated = payload.source as CollectionSource;
      setSources((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(updated.is_active ? "来源已启用" : "来源已停用", updated.name);
    } catch (error) {
      toast.danger("来源状态更新失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft bg-gradient-to-r from-white to-primary-soft/55 px-4 py-3">
          <div><h2 className="text-[14px] font-semibold text-textMain">价格采集来源白名单</h2><p className="mt-0.5 text-[10px] text-textMuted">网页 {counts.web} 个 · API {counts.api} 个 · 已启用 {counts.active} 个</p></div>
          <div className="flex flex-wrap gap-2">
            {returnTo ? <button type="button" onClick={() => window.location.assign(returnTo)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft px-3 text-[11px] font-semibold text-textSecondary"><ArrowLeft className="size-4" />返回采集中心</button> : null}
            <button type="button" disabled={!canManage} onClick={() => setEditorKind("web")} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[11px] font-semibold text-primary disabled:opacity-40"><Globe2 className="size-4" />新增采集网页</button>
            <button type="button" disabled={!canManage} onClick={() => setEditorKind("api")} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ai px-3 text-[11px] font-semibold text-white disabled:opacity-40"><Network className="size-4" />新增 API 数据源</button>
            <button type="button" onClick={() => void loadSources()} title="刷新来源" className="inline-flex size-9 items-center justify-center rounded-md border border-borderSoft text-textSecondary"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button>
          </div>
        </div>
        {loading ? <div className="flex min-h-52 items-center justify-center text-[11px] text-textMuted"><RefreshCw className="mr-2 size-4 animate-spin" />正在读取采集来源</div> : sources.length ? (
          <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
            {sources.map((source) => {
              const Icon = source.source_kind === "web" ? Globe2 : Network;
              return <article key={source.id} className={cn("rounded-[12px] border p-3", source.is_active ? "border-success/20 bg-success/5" : source.last_error && source.last_error !== "等待来源验证" ? "border-danger/20 bg-danger/5" : "border-warning/20 bg-warning/5")}>
                <div className="flex items-start gap-3"><IconBox icon={Icon} tone={source.source_kind === "web" ? "blue" : "purple"} size="md" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="truncate text-[12px] font-bold text-textMain">{source.name}</h3><span className={cn("rounded-pill px-2 py-0.5 text-[9px] font-semibold", source.is_active ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>{source.is_active ? "已启用" : "待验证"}</span></div><p className="mt-0.5 truncate font-mono text-[9px] text-textMuted">{source.source_code}</p></div></div>
                <a href={source.base_url} target="_blank" rel="noreferrer" className="mt-3 flex min-w-0 items-center gap-1 rounded-[8px] bg-white/80 px-2.5 py-2 text-[9px] text-primary"><span className="truncate">{source.base_url}</span><ExternalLink className="size-3 shrink-0" /></a>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center"><div className="rounded-[8px] bg-white/80 p-2"><p className="text-[8px] text-textMuted">类型</p><p className="mt-1 text-[10px] font-bold text-textSecondary">{source.source_kind === "web" ? "网页" : "API"}</p></div><div className="rounded-[8px] bg-white/80 p-2"><p className="text-[8px] text-textMuted">质量</p><p className="mt-1 text-[10px] font-bold text-primary">{source.quality_score}</p></div><div className="rounded-[8px] bg-white/80 p-2"><p className="text-[8px] text-textMuted">限速</p><p className="mt-1 text-[10px] font-bold text-textSecondary">{source.rate_limit_per_minute}/分</p></div></div>
                {source.last_error ? <p className="mt-2 flex items-start gap-1 rounded-[8px] bg-white/75 px-2 py-1.5 text-[9px] leading-4 text-danger"><CircleAlert className="mt-0.5 size-3 shrink-0" />{source.last_error}</p> : <p className="mt-2 flex items-center gap-1 text-[9px] text-success"><CheckCircle2 className="size-3" />最近验证正常</p>}
                <div className="mt-3 flex flex-wrap gap-1.5"><button type="button" disabled={!canManage || workingId === source.id} onClick={() => void validateSource(source)} className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/20 bg-white px-2.5 text-[10px] font-semibold text-primary disabled:opacity-40">{workingId === source.id ? <RefreshCw className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}验证</button><button type="button" disabled={!canManage || workingId === source.id} onClick={() => void toggleSource(source)} className="inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[10px] font-semibold text-textSecondary disabled:opacity-40">{source.is_active ? <ToggleRight className="size-3.5 text-success" /> : <ToggleLeft className="size-3.5" />}{source.is_active ? "停用" : "启用"}</button>{returnTo ? <button type="button" disabled={!source.is_active} onClick={() => selectSource(source)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-[10px] font-semibold text-white disabled:opacity-35"><Plus className="size-3" />选择并返回</button> : null}</div>
              </article>;
            })}
          </div>
        ) : <EmptyState title="尚未登记采集来源" description="新增采集网页或公开 API，验证通过后即可在 AI价格采集中心使用。" className="m-4 min-h-52 shadow-none" />}
      </section>
      {editorKind ? <SourceEditor kind={editorKind} returnTo={returnTo} onClose={() => setEditorKind(null)} onCompleted={(source) => { setEditorKind(null); setSources((current) => [source, ...current.filter((item) => item.id !== source.id)]); selectSource(source); }} /> : null}
    </>
  );
}
