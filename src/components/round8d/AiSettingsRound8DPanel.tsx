"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, AlertTriangle, ArrowLeft, Bot, BrainCircuit, CheckCircle2, FileKey2,
  FileText, History, Link2, RefreshCw, RotateCcw, Save, ShieldAlert,
  SlidersHorizontal, Sparkles, Workflow,
} from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfirmDialog, EmptyState, IconBox, LoadingButton, ModuleHeader } from "@/components/common";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/useToast";
import { useUnsavedSettings } from "@/hooks/useUnsavedSettings";
import { cn } from "@/lib/utils";
import type {
  AiModelConfig, AiOperationMode, AiPromptConfig, AiReviewPolicyConfig,
  AiRiskRuleConfig, AiSettingsPayload, AiSettingsResponse, AiTaskConfig,
} from "@/types/aiSettingsConfig";

type TabKey = "overview" | "models" | "thresholds" | "risks" | "reviews" | "prompts" | "tasks" | "audit";

const tabs: Array<{ key: TabKey; label: string; icon: typeof Bot }> = [
  { key: "overview", label: "治理总览", icon: BrainCircuit },
  { key: "models", label: "模型配置", icon: Bot },
  { key: "thresholds", label: "置信度阈值", icon: SlidersHorizontal },
  { key: "risks", label: "风险规则", icon: ShieldAlert },
  { key: "reviews", label: "人工复核", icon: Workflow },
  { key: "prompts", label: "提示词版本", icon: FileText },
  { key: "tasks", label: "任务开关", icon: Activity },
  { key: "audit", label: "审计与集成", icon: History },
];

const modeMeta: Record<AiOperationMode, { label: string; description: string }> = {
  conservative: { label: "保守模式", description: "低置信度结果全部进入人工复核，强调证据完整性。" },
  balanced: { label: "平衡模式", description: "在处理效率和人工确认边界之间保持平衡。" },
  aggressive: { label: "高效模式", description: "提高自动处理比例，但高风险结果仍强制人工确认。" },
};

function clonePayload(data: AiSettingsResponse): AiSettingsPayload {
  return JSON.parse(JSON.stringify({ settings: data.settings, models: data.models, riskRules: data.riskRules, reviewPolicies: data.reviewPolicies, prompts: data.prompts, tasks: data.tasks })) as AiSettingsPayload;
}

function formatTime(value: string | null) {
  if (!value) return "尚未记录";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} data-no-global-interaction onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 rounded-pill transition disabled:cursor-not-allowed disabled:opacity-50", checked ? "bg-ai" : "bg-slate-200")}><span className={cn("absolute top-1 size-4 rounded-full bg-white shadow transition", checked ? "left-6" : "left-1")} /></button>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[10px] font-semibold text-textMuted">{children}</span>;
}

export function AiSettingsRound8DPanel() {
  const toast = useToast();
  const [active, setActive] = useState<TabKey>("overview");
  const [serverData, setServerData] = useState<AiSettingsResponse | null>(null);
  const [draft, setDraft] = useState<AiSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/settings/ai/config", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "读取AI配置失败");
      const data = result as AiSettingsResponse;
      setServerData(data);
      setDraft(clonePayload(data));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取AI配置失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dirty = useMemo(() => Boolean(serverData && draft && JSON.stringify(draft) !== JSON.stringify(clonePayload(serverData))), [draft, serverData]);
  const confirmLeave = useUnsavedSettings(dirty, saving || resetting);
  const canManage = Boolean(serverData?.canManage);
  const updateSettings = (patch: Partial<AiSettingsPayload["settings"]>) => setDraft((current) => current ? { ...current, settings: { ...current.settings, ...patch } } : current);
  const updateModel = (index: number, patch: Partial<AiModelConfig>) => setDraft((current) => current ? { ...current, models: current.models.map((item, i) => i === index ? { ...item, ...patch } : item) } : current);
  const updateRisk = (index: number, patch: Partial<AiRiskRuleConfig>) => setDraft((current) => current ? { ...current, riskRules: current.riskRules.map((item, i) => i === index ? { ...item, ...patch } : item) } : current);
  const updateReview = (index: number, patch: Partial<AiReviewPolicyConfig>) => setDraft((current) => current ? { ...current, reviewPolicies: current.reviewPolicies.map((item, i) => i === index ? { ...item, ...patch } : item) } : current);
  const updatePrompt = (index: number, patch: Partial<AiPromptConfig>) => setDraft((current) => current ? { ...current, prompts: current.prompts.map((item, i) => i === index ? { ...item, ...patch } : item) } : current);
  const updateTask = (index: number, patch: Partial<AiTaskConfig>) => setDraft((current) => current ? { ...current, tasks: current.tasks.map((item, i) => i === index ? { ...item, ...patch } : item) } : current);

  const save = async () => {
    if (!draft || !canManage || !dirty) return;
    setSaveOpen(false);
    setSaving(true);
    try {
      const response = await fetch("/api/settings/ai/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存AI配置失败");
      const data = result.data as AiSettingsResponse;
      setServerData(data);
      setDraft(clonePayload(data));
      toast.success("AI配置已写入数据库", `配置版本已更新为 v${result.version}，变更已进入审计日志。`);
    } catch (saveError) {
      toast.danger("AI配置保存失败", saveError instanceof Error ? saveError.message : "请稍后重试");
    } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!canManage) return;
    setResetOpen(false);
    setResetting(true);
    try {
      const response = await fetch("/api/settings/ai/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "恢复默认配置失败");
      const data = result.data as AiSettingsResponse;
      setServerData(data);
      setDraft(clonePayload(data));
      toast.success("AI默认配置已恢复", `数据库配置版本已更新为 v${result.version}。`);
    } catch (resetError) {
      toast.danger("恢复默认配置失败", resetError instanceof Error ? resetError.message : "请稍后重试");
    } finally { setResetting(false); }
  };

  if (loading) return <div className="flex min-h-[520px] items-center justify-center rounded-card border border-borderSoft bg-white"><RefreshCw className="size-7 animate-spin text-ai" /><span className="ml-3 text-[13px] font-semibold text-textSecondary">正在读取组织级AI配置</span></div>;
  if (error || !draft || !serverData) return <EmptyState title="AI配置读取失败" description={error || "数据库未返回有效配置"} primaryAction={<button type="button" data-no-global-interaction onClick={() => void load()} className="h-9 rounded-md bg-primary px-4 text-[13px] font-semibold text-white">重新加载</button>} />;

  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];
  const CurrentIcon = current.icon;
  const connectedProviders = serverData.providers.filter((provider) => provider.status === "active" && provider.credentialState === "configured");

  return <div className="space-y-3">
    <PageHeader title="AI规则设置" description={`集中维护 ${serverData.organization?.name ?? "当前组织"} 的模型、阈值、风险规则、提示词版本与人工复核边界。`} actions={<>
      <Link href="/settings/ai/audit-logs" className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai"><History className="size-4" />AI审计日志</Link>
      <Link href="/settings/integrations" className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[13px] font-semibold text-primary"><Link2 className="size-4" />Provider集成</Link>
      <Link href="/settings" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary"><ArrowLeft className="size-4" />系统设置</Link>
      <LoadingButton tone="ghost" loading={resetting} disabled={!canManage} icon={<RotateCcw className="size-4" />} onClick={() => setResetOpen(true)} data-no-global-interaction>恢复默认</LoadingButton>
      <LoadingButton tone="ai" loading={saving} disabled={!canManage || !dirty} icon={<Save className="size-4" />} onClick={() => setSaveOpen(true)} data-no-global-interaction>{dirty ? "保存AI配置" : "配置已同步"}</LoadingButton>
    </>} />

    <section className="rounded-card border border-ai-border bg-gradient-to-r from-ai-soft via-white to-primary-soft p-3.5 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><ModuleHeader icon={Sparkles} title="AI治理边界" subtitle="AI只提供可追溯建议；高风险、低置信度和缺证据结果必须由人工确认。" tone="purple" density="compact" action={<AiBadge label="人工复核优先" />} /><div className="flex flex-wrap gap-2 text-[10px] font-semibold"><span className="rounded-pill border border-success/20 bg-success-soft px-2.5 py-1 text-success">Supabase实时配置</span><span className="rounded-pill border border-ai-border bg-white px-2.5 py-1 text-ai">版本 v{draft.settings.configVersion}</span><span className="rounded-pill border border-borderSoft bg-white px-2.5 py-1 text-textSecondary">更新 {formatTime(draft.settings.updatedAt)}</span>{dirty ? <span className="rounded-pill border border-warning/20 bg-warning-soft px-2.5 py-1 text-warning">有未保存修改</span> : null}</div></div></section>
    {!canManage ? <div className="rounded-card border border-warning/20 bg-warning-soft px-4 py-3 text-[12px] font-semibold text-warning">当前角色 {serverData.currentRole} 仅可查看配置；保存和恢复默认需要 settings.manage 权限。</div> : null}

    <section className="rounded-card border border-ai-border bg-gradient-to-br from-white via-white to-ai-soft/60 p-3.5 shadow-card"><div className="grid gap-3 xl:grid-cols-[190px_minmax(0,1fr)]">
      <nav className="grid content-start gap-1.5" aria-label="AI设置分区">{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.key} type="button" data-no-global-interaction onClick={() => setActive(tab.key)} className={cn("flex h-9 items-center gap-2 rounded-[9px] px-3 text-left text-[12px] font-bold transition", active === tab.key ? "bg-ai text-white shadow-ai" : "border border-ai-border bg-white text-ai hover:bg-ai-soft")}><Icon className="size-3.5" />{tab.label}</button>; })}</nav>
      <div className="min-w-0 rounded-[14px] border border-ai-border bg-white p-4"><div className="mb-4 flex items-center gap-2 border-b border-borderSoft pb-3"><IconBox icon={CurrentIcon} tone="purple" size="sm" /><div><h2 className="text-[14px] font-bold text-textMain">{current.label}</h2><p className="text-[10px] text-textMuted">所有修改在保存后统一写入组织级数据库配置</p></div></div>

        {active === "overview" ? <div className="space-y-4"><div className="grid gap-3 md:grid-cols-3">{(Object.keys(modeMeta) as AiOperationMode[]).map((mode) => <button key={mode} type="button" data-no-global-interaction disabled={!canManage} onClick={() => updateSettings({ operationMode: mode })} className={cn("rounded-[12px] border p-3 text-left transition disabled:cursor-not-allowed", draft.settings.operationMode === mode ? "border-ai bg-ai-soft text-ai" : "border-borderSoft bg-slate-50 text-textSecondary")}><p className="text-[13px] font-bold">{modeMeta[mode].label}</p><p className="mt-1 text-[11px] leading-5">{modeMeta[mode].description}</p></button>)}</div><div className="grid gap-3 md:grid-cols-4">{[["配置模型", draft.models.filter((item) => item.enabled).length, "个启用模型", Bot], ["风险规则", draft.riskRules.filter((item) => item.enabled).length, "条有效规则", ShieldAlert], ["强制复核", draft.reviewPolicies.filter((item) => item.enabled && item.required).length, "条人工边界", Workflow], ["提示词版本", draft.prompts.filter((item) => item.enabled).length, "个活动模板", FileText]].map(([label, value, note, icon]) => { const Icon = icon as typeof Bot; return <div key={String(label)} className="rounded-[12px] border border-borderSoft bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-textSecondary">{String(label)}</span><Icon className="size-4 text-ai" /></div><p className="mt-2 text-[22px] font-black text-textMain">{String(value)}</p><p className="text-[10px] text-textMuted">{String(note)}</p></div>; })}</div><div className="grid gap-2 md:grid-cols-4">{["结果必须有置信度", "风险必须可追溯", "允许人工修正", "不得替代商务判断"].map((item) => <div key={item} className="flex items-center gap-2 rounded-[10px] border border-success/15 bg-success-soft px-3 py-2 text-[11px] font-semibold text-success"><CheckCircle2 className="size-4" />{item}</div>)}</div></div> : null}

        {active === "models" ? <div className="space-y-3">{connectedProviders.length === 0 ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-warning/20 bg-warning-soft p-3"><div><p className="text-[12px] font-bold text-warning">尚无已验证的AI Provider</p><p className="mt-1 text-[10px] text-textSecondary">配置可保存，真实AI执行前必须在集成管理中验证凭据。</p></div><Link href="/settings/integrations" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-warning px-3 text-[11px] font-semibold text-white"><FileKey2 className="size-3.5" />配置Provider</Link></div> : null}<div className="grid gap-3 lg:grid-cols-2">{draft.models.map((model, index) => <div key={model.key} className="rounded-[12px] border border-borderSoft bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><IconBox icon={Bot} tone="purple" size="sm" /><div><p className="text-[13px] font-bold text-textMain">{model.name}</p><code className="text-[9px] text-textMuted">{model.key}</code></div></div><Toggle checked={model.enabled} disabled={!canManage} onChange={(enabled) => updateModel(index, { enabled })} label={`${model.name}开关`} /></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><label><FieldLabel>Provider集成</FieldLabel><select disabled={!canManage} value={model.provider} onChange={(event) => updateModel(index, { provider: event.target.value })} className="h-9 w-full rounded-md border border-borderSoft bg-white px-2 text-[11px]"><option value="unconfigured">未配置</option>{serverData.providers.map((provider) => <option key={provider.code} value={provider.code}>{provider.name} · {provider.credentialState === "configured" ? "凭据已配置" : "缺少凭据"}</option>)}</select></label><label><FieldLabel>模型标识</FieldLabel><input disabled={!canManage} value={model.model} onChange={(event) => updateModel(index, { model: event.target.value })} className="h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[11px]" /></label><label><FieldLabel>运行模式</FieldLabel><input disabled={!canManage} value={model.mode} onChange={(event) => updateModel(index, { mode: event.target.value })} className="h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[11px]" /></label><label><FieldLabel>触发阈值：{model.threshold}%</FieldLabel><input disabled={!canManage} type="range" min={1} max={99} value={model.threshold} onChange={(event) => updateModel(index, { threshold: Number(event.target.value) })} className="mt-2 w-full accent-[#7754F6]" /></label></div><textarea disabled={!canManage} value={model.description} onChange={(event) => updateModel(index, { description: event.target.value })} className="mt-2 min-h-16 w-full rounded-md border border-borderSoft bg-white p-2 text-[11px] leading-5" /></div>)}</div></div> : null}

        {active === "thresholds" ? <div className="grid gap-3 md:grid-cols-2">{[["自动入库阈值", "高于该值可建议直接入库", "autoApproveThreshold", draft.settings.autoApproveThreshold, 55, 99], ["人工复核阈值", "低于该值必须进入待复核池", "humanReviewThreshold", draft.settings.humanReviewThreshold, 1, 98], ["价格偏差预警", "偏离市场均价后触发风险", "priceDeviationThreshold", draft.settings.priceDeviationThreshold, 0, 100], ["BOQ匹配阈值", "低于该值列为相似或未匹配", "boqMatchThreshold", draft.settings.boqMatchThreshold, 1, 99]].map(([label, note, settingKey, value, min, max]) => <div key={String(settingKey)} className="rounded-[12px] border border-ai-border bg-gradient-to-br from-white to-ai-soft p-4"><div className="flex items-start justify-between"><div><p className="text-[13px] font-bold text-textMain">{String(label)}</p><p className="mt-1 text-[10px] text-textMuted">{String(note)}</p></div><span className="rounded-pill bg-white px-2.5 py-1 text-[13px] font-bold text-ai shadow-sm">{String(value)}%</span></div><input disabled={!canManage} type="range" min={Number(min)} max={Number(max)} value={Number(value)} onChange={(event) => updateSettings({ [String(settingKey)]: Number(event.target.value) } as Partial<AiSettingsPayload["settings"]>)} className="mt-4 w-full accent-[#7754F6]" /></div>)}</div> : null}

        {active === "risks" ? <div className="grid gap-3 lg:grid-cols-2">{draft.riskRules.map((rule, index) => <div key={rule.key} className="rounded-[12px] border border-danger/15 bg-danger-soft/40 p-3"><div className="flex items-center justify-between gap-2"><input disabled={!canManage} value={rule.title} onChange={(event) => updateRisk(index, { title: event.target.value })} className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-danger outline-none" /><Toggle checked={rule.enabled} disabled={!canManage} onChange={(enabled) => updateRisk(index, { enabled })} label={`${rule.title}开关`} /></div><div className="mt-2 grid gap-2"><label><FieldLabel>风险等级</FieldLabel><select disabled={!canManage} value={rule.severity} onChange={(event) => updateRisk(index, { severity: event.target.value as AiRiskRuleConfig["severity"] })} className="h-8 w-full rounded-md border border-danger/15 bg-white px-2 text-[11px]"><option value="low">低风险</option><option value="medium">中风险</option><option value="high">高风险</option><option value="critical">严重</option></select></label><label><FieldLabel>触发条件</FieldLabel><textarea disabled={!canManage} value={rule.condition} onChange={(event) => updateRisk(index, { condition: event.target.value })} className="min-h-14 w-full rounded-md border border-danger/15 bg-white p-2 text-[11px] leading-5" /></label><label><FieldLabel>处理动作</FieldLabel><textarea disabled={!canManage} value={rule.action} onChange={(event) => updateRisk(index, { action: event.target.value })} className="min-h-14 w-full rounded-md border border-danger/15 bg-white p-2 text-[11px] leading-5" /></label></div></div>)}</div> : null}

        {active === "reviews" ? <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><label className="flex items-center justify-between rounded-[12px] border border-warning/20 bg-warning-soft p-3 text-[12px] font-bold text-warning">所有AI流程保留人工复核入口<Toggle checked={draft.settings.mandatoryHumanReview} disabled={!canManage} onChange={(mandatoryHumanReview) => updateSettings({ mandatoryHumanReview })} label="人工复核总开关" /></label><label className="flex items-center justify-between rounded-[12px] border border-danger/20 bg-danger-soft p-3 text-[12px] font-bold text-danger">启用高风险强提醒<Toggle checked={draft.settings.riskAlertEnabled} disabled={!canManage} onChange={(riskAlertEnabled) => updateSettings({ riskAlertEnabled })} label="风险提醒总开关" /></label></div>{draft.reviewPolicies.map((policy, index) => <div key={policy.key} className="grid gap-3 rounded-[12px] border border-borderSoft bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_110px_70px]"><input disabled={!canManage} value={policy.title} onChange={(event) => updateReview(index, { title: event.target.value })} className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textMain" /><label className="flex items-center justify-between text-[11px] font-semibold text-warning">强制执行<Toggle checked={policy.required} disabled={!canManage} onChange={(required) => updateReview(index, { required })} label={`${policy.title}强制开关`} /></label><Toggle checked={policy.enabled} disabled={!canManage} onChange={(enabled) => updateReview(index, { enabled })} label={`${policy.title}启用开关`} /></div>)}</div> : null}

        {active === "prompts" ? <div className="space-y-3">{draft.prompts.map((prompt, index) => <div key={prompt.key} className="rounded-[12px] border border-ai-border bg-ai-soft/35 p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_100px_64px]"><div><p className="text-[13px] font-bold text-textMain">{prompt.name}</p><p className="text-[10px] text-textMuted">{prompt.scope}</p></div><input disabled={!canManage} value={prompt.version} onChange={(event) => updatePrompt(index, { version: event.target.value })} className="h-8 rounded-md border border-ai-border bg-white px-2 text-center text-[11px] font-bold text-ai" /><Toggle checked={prompt.enabled} disabled={!canManage} onChange={(enabled) => updatePrompt(index, { enabled })} label={`${prompt.name}开关`} /></div><textarea disabled={!canManage} value={prompt.content} onChange={(event) => updatePrompt(index, { content: event.target.value })} className="mt-3 min-h-24 w-full rounded-[10px] border border-ai-border bg-white p-3 text-[11px] leading-5 text-textMain outline-none focus:border-ai" /><p className="mt-1 text-right text-[9px] text-textMuted">{prompt.content.length} / 12000 字符 · 保存后进入数据库审计</p></div>)}</div> : null}

        {active === "tasks" ? <div className="grid gap-3 md:grid-cols-2">{draft.tasks.map((task, index) => <div key={task.key} className="flex items-center justify-between gap-3 rounded-[12px] border border-borderSoft bg-slate-50 p-3"><div className="min-w-0"><p className="text-[13px] font-bold text-textMain">{task.name}</p><div className="mt-2 flex items-center gap-2"><span className="text-[10px] text-textMuted">业务负责人</span><input disabled={!canManage} value={task.owner} onChange={(event) => updateTask(index, { owner: event.target.value })} className="h-7 min-w-0 rounded-md border border-borderSoft bg-white px-2 text-[10px] text-textSecondary" /></div></div><Toggle checked={task.enabled} disabled={!canManage} onChange={(enabled) => updateTask(index, { enabled })} label={`${task.name}开关`} /></div>)}</div> : null}

        {active === "audit" ? <div className="grid gap-3 md:grid-cols-2"><Link href="/settings/ai/audit-logs" className="rounded-[14px] border border-ai-border bg-gradient-to-br from-ai-soft to-white p-4 transition hover:-translate-y-0.5"><div className="flex items-center gap-3"><IconBox icon={History} tone="purple" size="md" /><div><p className="text-[13px] font-bold text-textMain">AI审计日志中心</p><p className="mt-1 text-[10px] text-textMuted">追踪真实运行、模型版本、风险和人工结论</p></div></div></Link><Link href="/settings/integrations" className="rounded-[14px] border border-primary/20 bg-gradient-to-br from-primary-soft to-white p-4 transition hover:-translate-y-0.5"><div className="flex items-center gap-3"><IconBox icon={FileKey2} tone="blue" size="md" /><div><p className="text-[13px] font-bold text-textMain">Provider与密钥管理</p><p className="mt-1 text-[10px] text-textMuted">凭据由服务端和Vault管理，本页不展示明文</p></div></div></Link><div className="rounded-[14px] border border-success/20 bg-success-soft p-4"><p className="text-[12px] font-bold text-success">数据库持久化状态</p><div className="mt-3 space-y-2 text-[10px] text-textSecondary"><p>组织隔离：RLS已启用</p><p>变更权限：settings.manage</p><p>当前配置版本：v{draft.settings.configVersion}</p><p>Provider已配置：{connectedProviders.length} 个</p></div></div><div className="rounded-[14px] border border-warning/20 bg-warning-soft p-4"><div className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /><p className="text-[10px] leading-5 text-textSecondary">配置保存只改变AI治理规则，不会让AI直接作出商务结论。高风险和低置信度结果仍必须进入人工复核。</p></div></div></div> : null}
      </div>
    </div></section>

    <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-borderSoft bg-white/95 px-4 py-3 shadow-float backdrop-blur"><div><p className="text-[12px] font-semibold text-textMain">{dirty ? "存在未保存的组织级AI配置" : "AI配置与Supabase数据库一致"}</p><p className="text-[10px] text-textMuted">保存将原子更新全部配置，并自动记录修改人、版本和审计证据。</p></div><div className="flex gap-2"><button type="button" data-no-global-interaction disabled={!dirty || saving} onClick={() => { if (confirmLeave()) setDraft(clonePayload(serverData)); }} className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary disabled:opacity-40"><RotateCcw className="size-4" />放弃修改</button><LoadingButton tone="ai" loading={saving} disabled={!canManage || !dirty} icon={<Save className="size-4" />} onClick={() => setSaveOpen(true)} data-no-global-interaction>{dirty ? "保存到数据库" : "已保存"}</LoadingButton></div></div>
    <ConfirmDialog open={resetOpen} title="恢复AI默认配置？" description="此操作会将当前组织的模型模式、阈值、风险规则、提示词和任务开关写回系统默认值，并产生新的配置版本和审计记录。" confirmLabel="确认恢复" tone="warning" onCancel={() => setResetOpen(false)} onConfirm={() => void reset()} />
    <ConfirmDialog open={saveOpen} title="保存组织级 AI 配置？" description="本次修改影响当前组织的模型、规则、提示词与任务开关。保存后使用新配置的执行将受其影响；不会自动确认历史价格或替代人工商务审核。请确认影响范围。" confirmLabel="确认保存" tone="warning" onCancel={() => setSaveOpen(false)} onConfirm={() => void save()} />
  </div>;
}
