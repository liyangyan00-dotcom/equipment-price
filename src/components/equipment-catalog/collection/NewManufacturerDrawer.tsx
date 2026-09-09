"use client";

import { useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, Globe2, LoaderCircle, Save, SearchCheck, ShieldCheck, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";
import { emitMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";

const inputClass = "h-10 w-full min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

export type ManufacturerMasterRow = {
  id: string; official_name: string; local_name: string; brand: string;
  website_url?: string | null; country_code?: string | null;
  status: "pending" | "verified" | "inactive";
};

type DuplicateCandidate = {
  type: "manufacturer" | "supplier"; id: string; score: number; reason: string;
  official_name?: string | null; local_name?: string | null; brand?: string | null;
  website_url?: string | null; country_code?: string | null; status?: ManufacturerMasterRow["status"];
  name?: string | null; legal_name?: string | null; website?: string | null;
};

type RecognitionResult = {
  candidate: { officialName: string; localName: string; brand: string; websiteUrl: string; countryCode: string; language: string; confidence: number };
  evidence: Array<{ label: string; value: string }>;
  duplicates: DuplicateCandidate[];
};

export function NewManufacturerDrawer({ open, onClose, onSaved }: {
  open: boolean;
  onClose: () => void;
  onSaved: (manufacturer: ManufacturerMasterRow) => Promise<void> | void;
}) {
  const [officialName, setOfficialName] = useState("");
  const [localName, setLocalName] = useState("");
  const [brand, setBrand] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [notes, setNotes] = useState("");
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [savingMode, setSavingMode] = useState<"plain" | "bind" | null>(null);

  const resetAndClose = () => {
    setOfficialName(""); setLocalName(""); setBrand(""); setWebsiteUrl("");
    setCountryCode(""); setNotes(""); setRecognition(null); onClose();
  };

  const identifyWebsite = async () => {
    if (!websiteUrl.trim()) return emitMockToast({ title: "请填写厂家官网", description: "系统将从官网提取主体名称、品牌和可核验依据。", tone: "warning" });
    setIdentifying(true);
    try {
      const response = await fetch("/api/equipment-catalog/manufacturers/identify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteUrl }) });
      const payload = await response.json().catch(() => ({})) as RecognitionResult & { error?: string };
      if (!response.ok || !payload.candidate) throw new Error(payload.error || "官网识别失败");
      setRecognition(payload);
      setWebsiteUrl(payload.candidate.websiteUrl);
      setOfficialName(payload.candidate.officialName);
      setBrand(payload.candidate.brand);
      if (payload.candidate.localName) setLocalName(payload.candidate.localName);
      if (payload.candidate.countryCode) setCountryCode(payload.candidate.countryCode);
      emitMockToast({ title: "官网识别完成", description: payload.duplicates.length ? `发现 ${payload.duplicates.length} 条相似主体，请先确认。` : "未发现重复主体，可以继续保存。", tone: payload.duplicates.length ? "warning" : "success" });
    } catch (error) {
      setRecognition(null);
      emitMockToast({ title: "官网识别失败", description: error instanceof Error ? error.message : "请检查官网地址后重试。", tone: "danger" });
    } finally { setIdentifying(false); }
  };

  const save = async (bindWebsite: boolean) => {
    if (!officialName.trim() || !brand.trim()) return emitMockToast({ title: "请补齐厂家信息", description: "厂家规范名称和品牌为必填项。", tone: "warning" });
    if (bindWebsite && !recognition) return emitMockToast({ title: "请先识别官网", description: "保存并绑定来源前，必须完成官网访问、主体识别和查重。", tone: "warning" });
    setSavingMode(bindWebsite ? "bind" : "plain");
    try {
      const response = await fetch("/api/equipment-catalog/manufacturers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ officialName, localName, brand, websiteUrl, countryCode, notes, bindWebsite }) });
      const payload = await response.json().catch(() => ({})) as { manufacturer?: ManufacturerMasterRow; source?: { id: string } | null; sourceWarning?: string; error?: string };
      if (!response.ok || !payload.manufacturer) throw new Error(payload.error || "厂家登记失败");
      emitMockToast({ title: payload.source ? "厂家与官网来源已建立" : "厂家已登记", description: payload.sourceWarning || (payload.source ? `${payload.manufacturer.brand} 官网已验证并绑定，可直接创建采集任务。` : "下一步可继续登记并验证数据源。"), tone: payload.sourceWarning ? "warning" : "success" });
      await onSaved(payload.manufacturer);
      resetAndClose();
    } catch (error) {
      emitMockToast({ title: "厂家登记失败", description: error instanceof Error ? error.message : "请稍后重试。", tone: "danger" });
    } finally { setSavingMode(null); }
  };

  const selectExistingManufacturer = async (duplicate: DuplicateCandidate) => {
    if (duplicate.type !== "manufacturer") return;
    await onSaved({ id: duplicate.id, official_name: duplicate.official_name || duplicate.brand || "已有厂家", local_name: duplicate.local_name || "", brand: duplicate.brand || duplicate.official_name || "", website_url: duplicate.website_url, country_code: duplicate.country_code, status: duplicate.status || "pending" });
    emitMockToast({ title: "已使用已有厂家", description: "没有创建重复主体，已切换到现有厂家。", tone: "success" });
    resetAndClose();
  };

  const blockingDuplicate = recognition?.duplicates.find((item) => item.type === "manufacturer" && item.score >= 90);
  const busy = identifying || savingMode !== null;

  return <OverlayShell open={open} onClose={resetAndClose} variant="drawer" panelClassName="w-[620px]" ariaLabel="新增厂家主数据">
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><Building2 className="size-5" /></span><div><h2 className="text-[17px] font-semibold">新增厂家</h2><p className="mt-0.5 text-[11px] text-textMuted">官网识别、主体查重、来源绑定一次完成。</p></div></div>
        <button type="button" onClick={resetAndClose} disabled={busy} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-50"><X className="size-4" /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <section className="rounded-card border border-primary/20 bg-primary-soft/35 p-4"><div className="flex items-center gap-2"><Globe2 className="size-4 text-primary" /><h3 className="text-[13px] font-semibold">1. 输入厂家官网</h3></div><p className="mt-1 text-[10px] leading-4 text-textMuted">系统会验证 HTTPS、跟随安全重定向，并读取网页标题、Open Graph 与 Schema.org 企业信息。</p><div className="mt-3 flex gap-2"><input value={websiteUrl} onChange={(event) => { setWebsiteUrl(event.target.value); setRecognition(null); }} className={inputClass} placeholder="https://www.manufacturer.com" /><button type="button" onClick={() => void identifyWebsite()} disabled={busy || !websiteUrl.trim()} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 text-[12px] font-medium text-white disabled:opacity-50">{identifying ? <LoaderCircle className="size-4 animate-spin" /> : <SearchCheck className="size-4" />}识别并查重</button></div></section>

        {recognition ? <section className="rounded-card border border-success/20 bg-success-soft/30 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /><h3 className="text-[13px] font-semibold">官网识别完成</h3></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-success">置信度 {recognition.candidate.confidence}%</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{recognition.evidence.slice(0, 4).map((item) => <div key={`${item.label}-${item.value}`} className="min-w-0 rounded-md border border-success/15 bg-white/75 px-3 py-2"><p className="text-[9px] text-textMuted">{item.label}</p><p className="mt-0.5 truncate text-[10px] font-medium" title={item.value}>{item.value}</p></div>)}</div></section> : null}

        <section className="rounded-card border border-borderSoft bg-white p-4"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h3 className="text-[13px] font-semibold">2. 确认厂家主体</h3></div><div className="mt-3 space-y-3"><label className="block space-y-1.5 text-[12px] font-medium">厂家规范名称 *<input value={officialName} onChange={(event) => setOfficialName(event.target.value)} className={inputClass} placeholder="例如 KSB SE & Co. KGaA" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-[12px] font-medium">中文名称<input value={localName} onChange={(event) => setLocalName(event.target.value)} className={inputClass} placeholder="例如 凯士比" /></label><label className="space-y-1.5 text-[12px] font-medium">品牌 *<input value={brand} onChange={(event) => setBrand(event.target.value)} className={inputClass} placeholder="例如 KSB" /></label></div><div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]"><label className="space-y-1.5 text-[12px] font-medium">国家 / 地区代码<input value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className={inputClass} placeholder="CN / DE" maxLength={8} /></label><label className="space-y-1.5 text-[12px] font-medium">备注<input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} placeholder="主体关系、品牌别名或核验说明" /></label></div></div></section>

        {recognition?.duplicates.length ? <section className={cn("rounded-card border p-4", blockingDuplicate ? "border-danger/25 bg-danger-soft/35" : "border-warning/25 bg-warning-soft/35")}><div className="flex items-center gap-2"><AlertTriangle className={cn("size-4", blockingDuplicate ? "text-danger" : "text-warning")} /><h3 className="text-[13px] font-semibold">3. 相似主体检查</h3></div><div className="mt-3 space-y-2">{recognition.duplicates.map((item) => <article key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 rounded-md border border-white/80 bg-white/85 p-3"><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{item.type === "manufacturer" ? item.local_name || item.official_name || item.brand : item.name || item.legal_name}</p><p className="mt-0.5 text-[10px] text-textMuted">{item.type === "manufacturer" ? "厂家主数据" : "供应商库"} · 相似度 {item.score}% · {item.reason}</p></div>{item.type === "manufacturer" ? <button type="button" onClick={() => void selectExistingManufacturer(item)} className="h-8 shrink-0 rounded-md border border-primary/20 bg-primary-soft px-3 text-[10px] font-medium text-primary">使用已有厂家</button> : <span className="shrink-0 rounded bg-warning-soft px-2 py-1 text-[9px] text-warning">核对主体关系</span>}</article>)}</div></section> : recognition ? <section className="flex items-center gap-2 rounded-card border border-success/20 bg-success-soft/35 p-3 text-[11px] text-success"><CheckCircle2 className="size-4" />未发现重复厂家或高相似供应商。</section> : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-borderSoft p-4"><button type="button" onClick={resetAndClose} disabled={busy} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[12px] font-medium disabled:opacity-50">取消</button><button type="button" onClick={() => void save(false)} disabled={busy || Boolean(blockingDuplicate)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-4 text-[12px] font-medium text-primary disabled:opacity-50">{savingMode === "plain" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}仅保存厂家</button><button type="button" onClick={() => void save(true)} disabled={busy || !recognition || Boolean(blockingDuplicate)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[12px] font-medium text-white disabled:opacity-50">{savingMode === "bind" ? <LoaderCircle className="size-4 animate-spin" /> : <Globe2 className="size-4" />}保存并绑定官网</button></div>
    </div>
  </OverlayShell>;
}
