"use client";

import { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";
import { emitMockToast } from "@/hooks/useMockToast";
import { sourceTypeLabels, type CollectionMethod } from "@/data/mock/equipmentCatalogCollection";

const fieldClass = "h-10 w-full min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";
const buttonClass = "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[12px] font-medium disabled:opacity-50";

export function NewCollectionMethodDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (method: CollectionMethod) => Promise<boolean> | boolean }) {
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("manufacturer_site");
  const [target, setTarget] = useState<CollectionMethod["parseTarget"]>("webpage");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [dedupe, setDedupe] = useState(true);
  const [standardize, setStandardize] = useState(true);
  const [retry, setRetry] = useState(true);
  const [review, setReview] = useState(true);
  const [maxRetry, setMaxRetry] = useState(3);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) return emitMockToast({ title: "请填写采集方式名称", description: "名称不能为空。", tone: "warning" });
    setSaving(true);
    const saved = await onSave({ id: "", name: name.trim(), applicableSourceTypes: [sourceType], parseTarget: target, aiEnabled, dedupeEnabled: dedupe, standardizationEnabled: standardize, retryEnabled: retry, maxRetry, reviewRequired: review, scheduled: true, taskCount: 0 });
    setSaving(false);
    if (saved) onClose();
  };
  const toggles: Array<[string, boolean, (value: boolean) => void]> = [["启用 AI 解析", aiEnabled, setAiEnabled], ["启用去重", dedupe, setDedupe], ["参数标准化", standardize, setStandardize], ["失败重试", retry, setRetry], ["人工复核", review, setReview]];

  return <OverlayShell open={open} onClose={onClose} variant="drawer" panelClassName="w-[540px]" ariaLabel="新增采集方式">
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4"><div><h2 className="text-[17px] font-semibold">新增采集方式</h2><p className="mt-1 text-[11px] text-textMuted">配置解析、去重、标准化与人工复核规则。</p></div><button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button></div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <label className="block space-y-1.5 text-[12px] font-medium">采集方式名称 *<input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} placeholder="例如 官网网页 + PDF混合解析" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-[12px] font-medium">适用数据源类型<select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={fieldClass}>{Object.entries(sourceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="space-y-1.5 text-[12px] font-medium">解析对象<select value={target} onChange={(e) => setTarget(e.target.value as typeof target)} className={fieldClass}><option value="webpage">网页</option><option value="pdf">PDF</option><option value="excel">Excel</option><option value="manual">人工</option><option value="mixed">混合</option></select></label></div>
        <div className="grid gap-2 sm:grid-cols-2">{toggles.map(([label, value, setter]) => <label key={label} className="flex items-center justify-between rounded-lg border border-borderSoft p-3 text-[12px] font-medium"><span>{label}</span><input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} /></label>)}</div>
        <label className="block space-y-1.5 text-[12px] font-medium">最大重试次数<input type="number" min={0} max={10} value={maxRetry} onChange={(e) => setMaxRetry(Number(e.target.value))} className={fieldClass} /></label>
        <div className="rounded-lg border border-ai-border bg-ai-soft p-3 text-[11px] leading-5 text-ai">AI 解析仅生成候选字段和置信度，不能直接确认设备资料合格。</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-borderSoft p-4"><button type="button" onClick={onClose} disabled={saving} className={`${buttonClass} border-borderSoft bg-white`}>取消</button><button type="button" onClick={() => void save()} disabled={saving} className={`${buttonClass} border-ai bg-ai text-white`}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}保存采集方式</button></div>
    </div>
  </OverlayShell>;
}
