"use client";
import { useUnsavedSettings } from "@/hooks/useUnsavedSettings";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Cable,
  CheckCircle2,
  ChevronLeft,
  CloudCog,
  DatabaseZap,
  FileClock,
  KeyRound,
  Mail,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { OverlayShell } from "@/components/common/OverlayShell";
import { CollectionSourceManager } from "@/components/settings/CollectionSourceManager";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";

type IntegrationType = "collector" | "ai_provider" | "email" | "webhook" | "data_source";
type IntegrationStatus = "unconfigured" | "active" | "disabled" | "error";

type Integration = {
  id: string;
  integration_code: string;
  integration_type: IntegrationType;
  name: string;
  provider: string;
  description: string | null;
  endpoint_url: string | null;
  status: IntegrationStatus;
  credential_state: "missing" | "configured" | "expiring";
  credential_hint: string | null;
  config: Record<string, string | number | boolean>;
  last_validated_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

type Audit = {
  id: string;
  action: "insert" | "update" | "delete";
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

type ApiResponse = {
  organization: { id: string; code: string; name: string } | null;
  currentRole: string;
  canManage: boolean;
  integrations: Integration[];
  audits: Audit[];
};

type EditorState = { item: Integration | null; type: IntegrationType };
type PendingAction = { item: Integration; action: "disable" | "delete" | "clear" };

const emptyResponse: ApiResponse = { organization: null, currentRole: "viewer", canManage: false, integrations: [], audits: [] };

const typeMeta: Record<IntegrationType, { label: string; icon: LucideIcon; tone: IconBoxTone; description: string }> = {
  collector: { label: "价格采集", icon: DatabaseZap, tone: "cyan", description: "公开价格与线索采集" },
  ai_provider: { label: "AI 模型", icon: Bot, tone: "purple", description: "识别、推荐与报告生成" },
  email: { label: "邮件服务", icon: Mail, tone: "blue", description: "询价函和通知发送" },
  webhook: { label: "Webhook", icon: Webhook, tone: "orange", description: "业务事件外部推送" },
  data_source: { label: "外部数据源", icon: CloudCog, tone: "green", description: "汇率与工商核验数据" },
};

const statusMeta: Record<IntegrationStatus, { label: string; className: string }> = {
  active: { label: "已启用", className: "bg-success-soft text-success" },
  unconfigured: { label: "待配置", className: "bg-warning-soft text-warning" },
  disabled: { label: "已停用", className: "bg-slate-100 text-textMuted" },
  error: { label: "校验失败", className: "bg-danger-soft text-danger" },
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败";
}

function formatDate(value: string | null) {
  if (!value) return "尚未验证";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

async function apiRequest(init?: RequestInit) {
  const response = await fetch("/api/settings/integrations", { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "请求失败");
  return payload;
}

function SummaryCard({ label, value, note, icon, tone }: { label: string; value: number; note: string; icon: LucideIcon; tone: IconBoxTone }) {
  return (
    <section className="flex min-h-[94px] items-center gap-3 rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <IconBox icon={icon} tone={tone} size="lg" />
      <div className="min-w-0"><p className="text-[10px] font-semibold text-textMuted">{label}</p><p className="mt-1 text-[23px] font-bold leading-none text-textMain">{value}</p><p className="mt-1.5 truncate text-[9px] text-textMuted">{note}</p></div>
    </section>
  );
}

function IntegrationEditor({ state, saving, onClose: closeEditor, onSubmit }: { state: EditorState; saving: boolean; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => void }) {
  const item = state.item;
  const [type, setType] = useState<IntegrationType>(item?.integration_type ?? state.type);
  const [code, setCode] = useState(item?.integration_code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [provider, setProvider] = useState(item?.provider ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [endpoint, setEndpoint] = useState(item?.endpoint_url ?? "");
  const [credential, setCredential] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [optionA, setOptionA] = useState(String(item?.config?.model ?? item?.config?.frequency ?? item?.config?.senderName ?? ""));
  const [optionB, setOptionB] = useState(String(item?.config?.timeoutSeconds ?? item?.config?.concurrency ?? item?.config?.senderAddress ?? item?.config?.baseCurrency ?? ""));
  const [optionC, setOptionC] = useState(String(item?.config?.replyToAddress ?? ""));
  const [optionD, setOptionD] = useState(String(item?.config?.publicAppUrl ?? ""));
  const [optionE, setOptionE] = useState(String(item?.config?.webhookUrl ?? ""));
  const [inputCostPerMillion, setInputCostPerMillion] = useState(String(item?.config?.inputCostPerMillion ?? ""));
  const [outputCostPerMillion, setOutputCostPerMillion] = useState(String(item?.config?.outputCostPerMillion ?? ""));
  const [humanReview, setHumanReview] = useState(item?.config?.humanReview !== false);
  const values = JSON.stringify([type, code, name, provider, description, endpoint, credential, webhookSecret, optionA, optionB, optionC, optionD, optionE, inputCostPerMillion, outputCostPerMillion, humanReview]);
  const [initialValues] = useState(values);
  const confirmLeave = useUnsavedSettings(values !== initialValues, saving);
  const onClose = () => { if (confirmLeave()) closeEditor(); };
  const credentialPlaceholder = item?.credential_state === "configured"
    ? `已安全配置 ${item.credential_hint ?? ""}，留空保持不变`
    : item?.integration_code === "DEEPSEEK"
      ? "输入 DeepSeek API Key"
      : item?.integration_code === "OPENAI_COMPATIBLE"
        ? "输入 OpenAI API Key"
        : "输入 API Key、Token 或密码";
  const meta = typeMeta[type];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const config: Record<string, string | number | boolean> = Object.fromEntries(
      Object.entries(item?.config ?? {}).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)),
    ) as Record<string, string | number | boolean>;
    if (type === "ai_provider") {
      config.model = optionA;
      config.timeoutSeconds = Number(optionB) || 60;
      config.humanReview = humanReview;
      if (inputCostPerMillion.trim()) config.inputCostPerMillion = Math.max(0, Number(inputCostPerMillion) || 0);
      if (outputCostPerMillion.trim()) config.outputCostPerMillion = Math.max(0, Number(outputCostPerMillion) || 0);
    }
    if (type === "collector") { config.frequency = optionA || "daily"; config.concurrency = Number(optionB) || 2; config.humanReview = true; }
    if (type === "email") {
      config.senderName = optionA;
      config.senderAddress = optionB;
      config.replyToAddress = optionC;
      config.publicAppUrl = optionD;
      config.webhookUrl = optionE;
    }
    if (type === "webhook") config.events = optionA;
    if (type === "data_source") { config.frequency = optionA || "manual"; config.baseCurrency = optionB || "USD"; config.humanReview = humanReview; }
    const protectedCredential = type === "email" && (credential.trim() || webhookSecret.trim())
      ? JSON.stringify({ apiKey: credential.trim(), webhookSecret: webhookSecret.trim() })
      : credential;
    const normalizedEndpoint = type === "email" && endpoint.trim().replace(/\/$/, "") === "https://api.resend.com"
      ? "https://api.resend.com/emails"
      : endpoint.trim();
    onSubmit({ id: item?.id, integrationType: type, integrationCode: code, name, provider, description, endpointUrl: normalizedEndpoint, credential: protectedCredential, config });
  };

  return (
    <OverlayShell open onClose={onClose} variant="drawer" panelClassName="flex h-full w-[520px] max-w-full flex-col" ariaLabel={item ? "编辑外部集成" : "新增外部集成"}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-start gap-3 border-b border-borderSoft p-5"><IconBox icon={meta.icon} tone={meta.tone} size="lg" /><div className="min-w-0 flex-1"><h2 className="text-[16px] font-bold text-textMain">{item ? "配置外部集成" : "新增自定义集成"}</h2><p className="mt-1 text-[11px] text-textMuted">安全配置服务地址、业务参数和 Vault 凭据。</p></div><button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100" aria-label="关闭"><X className="size-4" /></button></header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3"><label className="text-[11px] font-semibold text-textSecondary">集成类型<select disabled={Boolean(item)} value={type} onChange={(event) => setType(event.target.value as IntegrationType)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-primary disabled:bg-slate-50">{Object.entries(typeMeta).map(([value, typeInfo]) => <option key={value} value={value}>{typeInfo.label}</option>)}</select></label><label className="text-[11px] font-semibold text-textSecondary">集成编码<input disabled={Boolean(item)} required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="CUSTOM_PROVIDER" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-mono font-normal outline-none focus:border-primary disabled:bg-slate-50" /></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-[11px] font-semibold text-textSecondary">显示名称<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal outline-none focus:border-primary" /></label><label className="text-[11px] font-semibold text-textSecondary">服务商<input required value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal outline-none focus:border-primary" /></label></div>
          <label className="block text-[11px] font-semibold text-textSecondary">服务地址<input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder={type === "email" ? "https://api.resend.com/emails" : "https://api.example.com/v1"} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 font-normal outline-none focus:border-primary" /></label>
          <label className="block text-[11px] font-semibold text-textSecondary">业务说明<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1.5 w-full resize-none rounded-md border border-borderSoft p-3 font-normal leading-5 outline-none focus:border-primary" /></label>
          <section className="rounded-[12px] border border-primary/15 bg-primary-soft/50 p-3"><p className="text-[11px] font-bold text-primary">业务参数</p><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-[10px] font-semibold text-textSecondary">{type === "ai_provider" ? "模型名称" : type === "email" ? "发件人名称" : type === "webhook" ? "订阅事件" : "更新频率"}<input value={optionA} onChange={(event) => setOptionA(event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-primary" /></label>{type !== "webhook" ? <label className="text-[10px] font-semibold text-textSecondary">{type === "ai_provider" ? "超时秒数" : type === "email" ? "发件邮箱" : type === "collector" ? "并发数" : "基准币种"}<input value={optionB} onChange={(event) => setOptionB(event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-primary" /></label> : null}</div>{type === "email" ? <div className="mt-3 grid gap-3"><div className="grid grid-cols-2 gap-3"><label className="text-[10px] font-semibold text-textSecondary">供应商回复邮箱<input type="email" value={optionC} onChange={(event) => setOptionC(event.target.value)} placeholder="quotes@reply.example.com" className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-primary" /></label><label className="text-[10px] font-semibold text-textSecondary">系统公开地址<input type="url" value={optionD} onChange={(event) => setOptionD(event.target.value)} placeholder="https://price.example.com" className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-primary" /></label></div><label className="text-[10px] font-semibold text-textSecondary">Resend 事件回调地址<input type="url" value={optionE} onChange={(event) => setOptionE(event.target.value)} placeholder="https://PROJECT.supabase.co/functions/v1/wpi-inquiry-email-webhook" className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-primary" /></label></div> : null}{type === "ai_provider" ? <div className="mt-3 rounded-lg border border-ai-border/70 bg-white/85 p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold text-ai">成本估算费率</p><span className="rounded-pill bg-ai-soft px-2 py-0.5 text-[9px] font-semibold text-ai">USD / 1M tokens</span></div><div className="mt-2 grid grid-cols-2 gap-3"><label className="text-[10px] font-semibold text-textSecondary">输入 Token 费率<input type="number" min="0" step="0.000001" value={inputCostPerMillion} onChange={(event) => setInputCostPerMillion(event.target.value)} placeholder="按供应商账单填写" className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-ai" /></label><label className="text-[10px] font-semibold text-textSecondary">输出 Token 费率<input type="number" min="0" step="0.000001" value={outputCostPerMillion} onChange={(event) => setOutputCostPerMillion(event.target.value)} placeholder="按供应商账单填写" className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 font-normal outline-none focus:border-ai" /></label></div><p className="mt-2 text-[9px] leading-4 text-textMuted">费率由管理员按 Provider 当前价格维护。系统会在每次运行时保存估算成本快照，不会将此数值当作供应商最终账单。</p></div> : null}{type === "ai_provider" || type === "data_source" ? <label className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-textSecondary"><input type="checkbox" checked={humanReview} onChange={(event) => setHumanReview(event.target.checked)} />外部结果必须进入人工复核</label> : null}</section>
          <section className="rounded-[12px] border border-ai-border bg-ai-soft/55 p-3"><div className="flex items-center gap-2"><KeyRound className="size-4 text-ai" /><p className="text-[11px] font-bold text-ai">访问凭据</p></div><input type="password" autoComplete="new-password" value={credential} onChange={(event) => setCredential(event.target.value)} placeholder={type === "email" ? "输入 Resend API Key" : credentialPlaceholder} className="mt-3 h-10 w-full rounded-md border border-ai-border bg-white px-3 text-[11px] outline-none focus:border-ai" />{type === "email" ? <input type="password" autoComplete="new-password" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder="输入 Resend Webhook Signing Secret（whsec_...）" className="mt-2 h-10 w-full rounded-md border border-ai-border bg-white px-3 text-[11px] outline-none focus:border-ai" /> : null}<p className="mt-2 text-[9px] leading-4 text-textMuted">{type === "email" ? "API Key 与 Webhook 签名密钥会合并加密写入 Supabase Vault。更新凭据时需同时填写两项；留空则保持现有凭据。" : "每个 Provider 的凭据均独立加密写入 Supabase Vault，页面和普通数据接口不会读取或返回明文。"}</p></section>
        </div>
        <footer className="flex justify-end gap-2 border-t border-borderSoft p-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-borderSoft px-4 text-[11px] font-semibold text-textSecondary">取消</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[11px] font-semibold text-white disabled:opacity-50">{saving ? <RefreshCw className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}{item ? "保存配置" : "创建集成"}</button></footer>
      </form>
    </OverlayShell>
  );
}

export default function IntegrationsPage() {
  const toast = useMockToast();
  const [response, setResponse] = useState<ApiResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<IntegrationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | "all">("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const browserSearch = useSyncExternalStore(
    () => () => undefined,
    () => window.location.search,
    () => "",
  );
  const sourceManagement = useMemo(() => {
    const parameters = new URLSearchParams(browserSearch);
    const requestedType = parameters.get("type");
    const create = parameters.get("create");
    const requestedReturn = parameters.get("returnTo") ?? "";
    return {
      enabled: requestedType === "collector" || create === "collector" || parameters.get("manageSources") === "1",
      kind: (parameters.get("sourceKind") === "api" ? "api" : "web") as "web" | "api",
      autoOpen: create === "collector",
      returnTo: requestedReturn.startsWith("/") && !requestedReturn.startsWith("//") ? requestedReturn : "",
    };
  }, [browserSearch]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const payload = await apiRequest();
      setResponse(payload);
      setSelectedId((current) => current && payload.integrations.some((item: Integration) => item.id === current) ? current : payload.integrations[0]?.id ?? null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const selected = response.integrations.find((item) => item.id === selectedId) ?? null;
  const filtered = useMemo(() => response.integrations.filter((item) => {
    const q = keyword.trim().toLowerCase();
    return (!q || `${item.name} ${item.provider} ${item.integration_code}`.toLowerCase().includes(q))
      && (typeFilter === "all" || item.integration_type === typeFilter)
      && (statusFilter === "all" || item.status === statusFilter);
  }), [keyword, response.integrations, statusFilter, typeFilter]);
  const selectedAudits = response.audits.filter((audit) => audit.record_id === selectedId).slice(0, 6);

  const saveIntegration = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const isEdit = Boolean(payload.id);
      const result = await apiRequest({ method: isEdit ? "PATCH" : "POST", body: JSON.stringify(payload) });
      const id = String(payload.id ?? result.id);
      if (typeof payload.credential === "string" && payload.credential.trim()) await apiRequest({ method: "POST", body: JSON.stringify({ action: "set_credential", id, credential: payload.credential }) });
      toast.success(isEdit ? "集成配置已保存" : "自定义集成已创建", "配置已写入 Supabase；请运行验证后再启用。");
      setEditor(null);
      setSelectedId(id);
      await loadData(true);
    } catch (requestError) { toast.danger("保存失败", errorMessage(requestError)); }
    finally { setSaving(false); }
  };

  const validate = async (item: Integration) => {
    setRunningId(item.id);
    try {
      const result = await apiRequest({ method: "POST", body: JSON.stringify({ action: "validate", id: item.id }) });
      if (result.valid) {
        const gatewayNote = item.integration_type === "ai_provider" && result.gateway
          ? `真实模型连通成功，${result.gateway.model ?? "已配置模型"}，耗时 ${result.gateway.latencyMs ?? 0}ms。`
          : `${item.name} 已具备启用条件。`;
        toast.success(item.integration_type === "ai_provider" ? "AI 网关连通测试通过" : "配置验证通过", gatewayNote);
      }
      else toast.warning("配置验证未通过", result.issues.join("；"));
      await loadData(true);
    } catch (requestError) { toast.danger("验证失败", errorMessage(requestError)); }
    finally { setRunningId(null); }
  };

  const runPending = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      if (pending.action === "clear") await apiRequest({ method: "POST", body: JSON.stringify({ action: "clear_credential", id: pending.item.id }) });
      else if (pending.action === "disable") await apiRequest({ method: "PATCH", body: JSON.stringify({ id: pending.item.id, status: "disabled" }) });
      if (pending.action === "delete") {
        const deleteResponse = await fetch(`/api/settings/integrations?id=${encodeURIComponent(pending.item.id)}`, { method: "DELETE" });
        const deletePayload = await deleteResponse.json();
        if (!deleteResponse.ok) throw new Error(deletePayload.error || "删除失败");
      }
      toast.success(pending.action === "clear" ? "凭据已清除" : pending.action === "delete" ? "集成已删除" : "集成已停用", "变更已写入真实审计日志。");
      setPending(null);
      await loadData(true);
    } catch (requestError) { toast.danger("操作失败", errorMessage(requestError)); }
    finally { setSaving(false); }
  };

  const activeCount = response.integrations.filter((item) => item.status === "active").length;
  const needConfigCount = response.integrations.filter((item) => item.status === "unconfigured" || item.credential_state === "missing").length;
  const errorCount = response.integrations.filter((item) => item.status === "error").length;

  if (sourceManagement.enabled) {
    return (
      <AppLayout>
        <div className="space-y-3">
          <PageHeader
            title="价格采集来源管理"
            description="登记并验证网页与公开 API 来源；验证通过后才进入 AI价格采集白名单。"
            actions={<Link href="/settings/integrations" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary hover:text-primary"><ChevronLeft className="size-4" />全部外部集成</Link>}
          />
          <CollectionSourceManager
            initialKind={sourceManagement.kind}
            autoOpen={sourceManagement.autoOpen}
            returnTo={sourceManagement.returnTo}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader title="外部集成管理" description={`统一管理 ${response.organization?.name ?? "当前组织"} 的采集器、AI、邮件、Webhook 与外部数据源。凭据使用 Supabase Vault 加密保存。`} actions={<><Link href="/settings" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary hover:text-primary"><ChevronLeft className="size-4" />系统设置</Link><Link href="/settings/logs?table=wpi_integrations" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ai-border bg-ai-soft px-3 text-[11px] font-semibold text-ai"><FileClock className="size-4" />集成审计</Link><button type="button" onClick={() => void loadData()} title="刷新集成状态" className="inline-flex size-9 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:text-primary"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button><button type="button" disabled={!response.canManage} onClick={() => setEditor({ item: null, type: "data_source" })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[11px] font-semibold text-white disabled:opacity-45"><Plus className="size-4" />新增集成</button></>} />

        {error ? <section className="rounded-card border border-danger/20 bg-danger-soft p-4 text-[12px] text-danger"><strong>读取失败：</strong>{error}<button type="button" onClick={() => void loadData()} className="ml-3 font-semibold underline">重新加载</button></section> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="集成总数" value={response.integrations.length} note="系统预置与组织自定义" icon={Cable} tone="blue" />
          <SummaryCard label="已启用" value={activeCount} note="配置验证已通过" icon={CheckCircle2} tone="green" />
          <SummaryCard label="待配置" value={needConfigCount} note="缺地址或 Vault 凭据" icon={KeyRound} tone="orange" />
          <SummaryCard label="校验失败" value={errorCount} note="需修复后再次验证" icon={AlertTriangle} tone="red" />
          <SummaryCard label="近期变更" value={response.audits.length} note="Supabase 真实审计记录" icon={Activity} tone="purple" />
        </div>

        <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
          <div className="flex flex-wrap items-end gap-2.5"><label className="relative min-w-[240px] flex-1 text-[10px] font-semibold text-textMuted">搜索集成<Search className="absolute bottom-2.5 left-3 size-3.5 text-textMuted" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="名称、服务商、集成编码" className="mt-1.5 h-9 w-full rounded-md border border-borderSoft pl-9 pr-3 text-[11px] font-normal outline-none focus:border-primary" /></label><label className="text-[10px] font-semibold text-textMuted">集成类型<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="mt-1.5 block h-9 min-w-[150px] rounded-md border border-borderSoft bg-white px-3 text-[11px] font-normal outline-none"><option value="all">全部类型</option>{Object.entries(typeMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label><label className="text-[10px] font-semibold text-textMuted">运行状态<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="mt-1.5 block h-9 min-w-[140px] rounded-md border border-borderSoft bg-white px-3 text-[11px] font-normal outline-none"><option value="all">全部状态</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label><button type="button" onClick={() => { setKeyword(""); setTypeFilter("all"); setStatusFilter("all"); }} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[11px] font-semibold text-textSecondary">重置</button><span className="pb-2 text-[10px] text-textMuted">当前 {filtered.length} 项</span></div>
        </section>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div><h2 className="text-[14px] font-semibold text-textMain">集成连接</h2><p className="text-[10px] text-textMuted">保存配置后运行验证，验证通过才进入已启用状态</p></div><span className="rounded-pill bg-ai-soft px-2.5 py-1 text-[10px] font-semibold text-ai">Vault 凭据隔离</span></div>
            {loading ? <div className="flex min-h-[470px] items-center justify-center text-[12px] text-textMuted"><RefreshCw className="mr-2 size-4 animate-spin" />正在读取外部集成</div> : filtered.length ? <div className="grid gap-3 p-3 lg:grid-cols-2">{filtered.map((item) => { const meta = typeMeta[item.integration_type]; const Icon = meta.icon; const status = statusMeta[item.status]; return <article key={item.id} onClick={() => setSelectedId(item.id)} className={cn("cursor-pointer rounded-[12px] border p-3.5 transition", selectedId === item.id ? "border-primary/30 bg-primary-soft/35 shadow-sm" : "border-borderSoft bg-white hover:border-primary/20")}><div className="flex items-start gap-3"><IconBox icon={Icon} tone={meta.tone} size="lg" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[13px] font-bold text-textMain">{item.name}</h3><span className={cn("rounded-pill px-2 py-0.5 text-[9px] font-semibold", status.className)}>{status.label}</span>{item.is_system ? <span className="rounded-pill bg-ai-soft px-2 py-0.5 text-[9px] font-semibold text-ai">系统预置</span> : null}</div><p className="mt-0.5 text-[10px] text-textMuted">{item.provider} · {meta.label}</p></div></div><p className="mt-3 min-h-10 text-[10px] leading-5 text-textSecondary">{item.description || "未填写业务说明"}</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-[9px] bg-slate-50 p-2"><p className="text-[9px] text-textMuted">访问凭据</p><p className={cn("mt-1 text-[10px] font-semibold", item.credential_state === "configured" ? "text-success" : "text-warning")}>{item.credential_state === "configured" ? item.credential_hint || "已安全配置" : "尚未配置"}</p></div><div className="rounded-[9px] bg-slate-50 p-2"><p className="text-[9px] text-textMuted">最近验证</p><p className="mt-1 text-[10px] font-semibold text-textSecondary">{formatDate(item.last_validated_at)}</p></div></div>{item.last_error ? <p className="mt-2 rounded-[8px] bg-danger-soft px-2.5 py-2 text-[9px] leading-4 text-danger">{item.last_error}</p> : null}<div className="mt-3 flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}><button type="button" disabled={!response.canManage} onClick={() => setEditor({ item, type: item.integration_type })} className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2.5 text-[10px] font-semibold text-primary disabled:opacity-40"><PencilLine className="size-3.5" />配置</button><button type="button" disabled={!response.canManage || runningId === item.id} onClick={() => void validate(item)} className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-[10px] font-semibold text-white disabled:opacity-40">{runningId === item.id ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}{item.integration_type === "ai_provider" ? "真实连通测试" : "验证配置"}</button>{item.status !== "disabled" ? <button type="button" disabled={!response.canManage} onClick={() => setPending({ item, action: "disable" })} className="h-8 rounded-md border border-warning/20 bg-warning-soft px-2.5 text-[10px] font-semibold text-warning disabled:opacity-40">停用</button> : <button type="button" disabled={!response.canManage} onClick={() => void validate(item)} className="h-8 rounded-md border border-success/20 bg-success-soft px-2.5 text-[10px] font-semibold text-success disabled:opacity-40">验证并启用</button>}</div></article>; })}</div> : <EmptyState title="没有匹配的外部集成" description="调整搜索和筛选条件，或新增一个组织自定义集成。" className="m-4 min-h-[420px] shadow-none" />}
          </section>

          <aside className="space-y-3">
            <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><div className="border-b border-borderSoft bg-gradient-to-r from-white to-ai-soft px-4 py-3"><h2 className="text-[13px] font-semibold text-textMain">连接治理详情</h2><p className="mt-0.5 text-[10px] text-textMuted">状态、凭据与业务边界</p></div>{selected ? <div className="space-y-3 p-4"><div className="flex items-start gap-3"><IconBox icon={typeMeta[selected.integration_type].icon} tone={typeMeta[selected.integration_type].tone} size="lg" /><div className="min-w-0"><h3 className="text-[15px] font-bold text-textMain">{selected.name}</h3><code className="mt-1 block truncate text-[9px] text-primary">{selected.integration_code}</code></div></div><div className="rounded-[10px] border border-borderSoft bg-slate-50 p-3"><p className="text-[9px] text-textMuted">服务地址</p><p className="mt-1 break-all text-[10px] font-semibold text-textSecondary">{selected.endpoint_url || "尚未配置"}</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-[10px] border border-success/15 bg-success-soft p-3"><p className="text-[9px] text-textMuted">Vault 凭据</p><p className="mt-1 text-[11px] font-bold text-success">{selected.credential_state === "configured" ? selected.credential_hint || "已配置" : "未配置"}</p></div><div className="rounded-[10px] border border-ai-border bg-ai-soft p-3"><p className="text-[9px] text-textMuted">人工复核</p><p className="mt-1 text-[11px] font-bold text-ai">{selected.config?.humanReview === true ? "强制启用" : selected.integration_type === "ai_provider" ? "需要开启" : "按业务规则"}</p></div></div><div className="rounded-[10px] border border-borderSoft p-3"><p className="text-[10px] font-semibold text-textSecondary">安全边界</p><ul className="mt-2 space-y-1.5 text-[9px] leading-4 text-textMuted"><li>• 页面与 API 不返回凭据明文</li><li>• AI 服务验证会通过执行网关发起一次最小真实请求</li><li>• 每次调用记录模型、耗时、Token、错误和请求人</li><li>• AI 结果必须进入人工复核，不直接形成商务结论</li></ul></div><div className="flex gap-2"><button type="button" disabled={!response.canManage || selected.credential_state === "missing"} onClick={() => setPending({ item: selected, action: "clear" })} className="h-8 flex-1 rounded-md border border-warning/20 bg-warning-soft text-[10px] font-semibold text-warning disabled:opacity-35">清除凭据</button>{!selected.is_system ? <button type="button" disabled={!response.canManage} onClick={() => setPending({ item: selected, action: "delete" })} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-danger/20 bg-danger-soft px-3 text-[10px] font-semibold text-danger disabled:opacity-35"><Trash2 className="size-3.5" />删除</button> : null}</div></div> : <p className="p-8 text-center text-[11px] text-textMuted">选择一个集成查看详情</p>}</section>
            <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><div className="flex items-center justify-between border-b border-borderSoft px-4 py-3"><div><h2 className="text-[13px] font-semibold text-textMain">最近审计</h2><p className="text-[10px] text-textMuted">当前集成的真实变更</p></div><Link href="/settings/logs?table=wpi_integrations" className="text-[10px] font-semibold text-primary">全部记录</Link></div><div className="space-y-2 p-3">{selectedAudits.length ? selectedAudits.map((audit) => <Link key={audit.id} href="/settings/logs?table=wpi_integrations" className="flex items-start gap-2 rounded-[9px] border border-borderSoft bg-slate-50 p-2.5"><span className={cn("mt-1 size-2 shrink-0 rounded-full", audit.action === "insert" ? "bg-success" : audit.action === "delete" ? "bg-danger" : "bg-primary")} /><span className="min-w-0"><span className="block text-[10px] font-semibold text-textSecondary">{audit.action === "insert" ? "创建集成" : audit.action === "delete" ? "删除集成" : "更新配置"}</span><span className="mt-0.5 block text-[9px] text-textMuted">{formatDate(audit.created_at)}</span></span></Link>) : <p className="rounded-[9px] bg-slate-50 px-3 py-7 text-center text-[10px] text-textMuted">当前集成暂无变更记录</p>}</div></section>
          </aside>
        </div>
      </div>

      {editor ? <IntegrationEditor state={editor} saving={saving} onClose={() => setEditor(null)} onSubmit={(payload) => void saveIntegration(payload)} /> : null}
      <ConfirmDialog open={Boolean(pending)} title={pending?.action === "delete" ? "删除自定义集成" : pending?.action === "clear" ? "清除安全凭据" : "停用外部集成"} description={pending?.action === "delete" ? `确认删除“${pending?.item.name}”？配置与 Vault 凭据将一并移除。` : pending?.action === "clear" ? `确认清除“${pending?.item.name}”的 Vault 凭据？清除后必须重新配置。` : `停用“${pending?.item.name}”后，相关业务动作将不能调用该集成。`} confirmLabel={pending?.action === "delete" ? "确认删除" : pending?.action === "clear" ? "确认清除" : "确认停用"} tone={pending?.action === "delete" ? "danger" : "warning"} onCancel={() => setPending(null)} onConfirm={() => void runPending()} />
    </AppLayout>
  );
}
