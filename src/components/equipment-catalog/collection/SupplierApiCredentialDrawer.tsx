"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, LoaderCircle, Save, ShieldCheck, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";
import { emitMockToast } from "@/hooks/useMockToast";

const fieldClass = "h-10 w-full min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

type ApiState = {
  integration?: {
    endpoint_url?: string | null;
    status?: string | null;
    credential_state?: string | null;
    credential_hint?: string | null;
    last_validated_at?: string | null;
    last_error?: string | null;
    config?: Record<string, unknown> | null;
  } | null;
  canManage?: boolean;
};

export function SupplierApiCredentialDrawer({
  open,
  brand,
  onClose,
  onSaved,
}: {
  open: boolean;
  brand: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [state, setState] = useState<ApiState>({});
  const [endpointUrl, setEndpointUrl] = useState("");
  const [authType, setAuthType] = useState<"bearer" | "api_key" | "basic">("bearer");
  const [credential, setCredential] = useState("");
  const [headerName, setHeaderName] = useState("X-API-Key");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !brand) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/price-collection/supplier-api?brand=${encodeURIComponent(brand)}`, { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json() as ApiState & { error?: string };
          if (!response.ok) throw new Error(payload.error || "API 配置读取失败");
          setState(payload);
          setEndpointUrl(payload.integration?.endpoint_url || "");
          const configuredAuth = String(payload.integration?.config?.authType || "bearer");
          if (["bearer", "api_key", "basic"].includes(configuredAuth)) setAuthType(configuredAuth as typeof authType);
          setHeaderName(String(payload.integration?.config?.headerName || "X-API-Key"));
        })
        .catch((error) => emitMockToast({ title: "API 配置读取失败", description: error instanceof Error ? error.message : "请稍后重试。", tone: "danger" }))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [brand, open]);

  const save = async () => {
    if (!endpointUrl.trim()) return emitMockToast({ title: "请填写 API 地址", description: "必须使用厂家正式提供的 HTTPS 接口地址。", tone: "warning" });
    if (authType === "basic" ? !username.trim() || !password : !credential.trim()) {
      return emitMockToast({ title: "请填写访问凭据", description: "凭据由厂家或授权渠道提供，不能使用 MyKSB 登录密码代替。", tone: "warning" });
    }
    setSaving(true);
    try {
      const response = await fetch("/api/price-collection/supplier-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, endpointUrl, authType, credential, headerName, username, password }),
      });
      const payload = await response.json().catch(() => ({})) as { valid?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "API 凭证保存或验证失败");
      emitMockToast({ title: "API 授权验证通过", description: `${brand} API 已关联到真实采集来源。`, tone: "success" });
      await onSaved();
      onClose();
    } catch (error) {
      emitMockToast({ title: "API 授权未通过", description: error instanceof Error ? error.message : "请检查接口地址、认证方式和调用权限。", tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const configured = state.integration?.credential_state === "configured";
  const active = state.integration?.status === "active";

  return <OverlayShell open={open} onClose={onClose} variant="drawer" panelClassName="w-[560px]" ariaLabel={`${brand} API 授权配置`}>
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-warning-soft text-warning"><KeyRound className="size-5" /></span><div><h2 className="text-[17px] font-semibold">{brand} API 授权</h2><p className="mt-0.5 text-[11px] text-textMuted">凭证加密写入 Supabase Vault，浏览器不会再次读取明文。</p></div></div>
        <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <section className="rounded-lg border border-primary/15 bg-primary-soft/45 p-4 text-[11px] leading-5 text-textSecondary">
          <p className="font-semibold text-textMain">配置前请确认</p>
          <p className="mt-1">这里只接受厂家正式提供的 API Endpoint 与访问凭据。产品网页、公开目录和 PDF 不需要 API 授权，可独立采集。</p>
          {brand === "KSB" ? <a href="https://www.ksb.com/zh-cn/contact" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-primary">联系 KSB 申请数据接口 <ExternalLink className="size-3.5" /></a> : null}
        </section>
        {loading ? <div className="flex h-24 items-center justify-center text-textMuted"><LoaderCircle className="size-5 animate-spin" /></div> : <>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-lg border border-borderSoft bg-slate-50 p-3"><p className="text-[10px] text-textMuted">凭据状态</p><p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold">{configured ? <CheckCircle2 className="size-4 text-success" /> : <KeyRound className="size-4 text-warning" />}{configured ? state.integration?.credential_hint || "已配置" : "未配置"}</p></article>
            <article className="rounded-lg border border-borderSoft bg-slate-50 p-3"><p className="text-[10px] text-textMuted">连接状态</p><p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold">{active ? <ShieldCheck className="size-4 text-success" /> : <KeyRound className="size-4 text-warning" />}{active ? "验证通过" : state.integration?.last_error || "等待验证"}</p></article>
          </div>
          <label className="block space-y-1.5 text-[12px] font-medium">API Endpoint *<input value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} className={fieldClass} placeholder="https://api.vendor.com/v1/products" /></label>
          <label className="block space-y-1.5 text-[12px] font-medium">认证方式<select value={authType} onChange={(event) => setAuthType(event.target.value as typeof authType)} className={fieldClass}><option value="bearer">Bearer Token</option><option value="api_key">API Key Header</option><option value="basic">Basic Auth</option></select></label>
          {authType === "api_key" ? <label className="block space-y-1.5 text-[12px] font-medium">Header 名称<input value={headerName} onChange={(event) => setHeaderName(event.target.value)} className={fieldClass} placeholder="X-API-Key" /></label> : null}
          {authType === "basic" ? <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-[12px] font-medium">用户名<input value={username} onChange={(event) => setUsername(event.target.value)} className={fieldClass} autoComplete="off" /></label><label className="space-y-1.5 text-[12px] font-medium">密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} autoComplete="new-password" /></label></div> : <label className="block space-y-1.5 text-[12px] font-medium">{authType === "bearer" ? "Access Token" : "API Key"}<input type="password" value={credential} onChange={(event) => setCredential(event.target.value)} className={fieldClass} autoComplete="new-password" placeholder={configured ? "输入新值将覆盖现有凭据" : "输入厂家提供的访问凭据"} /></label>}
        </>}
      </div>
      <div className="flex justify-end gap-2 border-t border-borderSoft p-4"><button type="button" onClick={onClose} disabled={saving} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[12px] font-medium">取消</button><button type="button" onClick={() => void save()} disabled={loading || saving || !state.canManage} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary bg-primary px-4 text-[12px] font-medium text-white disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}保存并验证</button></div>
    </div>
  </OverlayShell>;
}
