"use client";

import { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";
import { emitMockToast } from "@/hooks/useMockToast";
import { sourceTypeLabels, type EquipmentDataSource } from "@/data/mock/equipmentCatalogCollection";

const fieldClass = "h-10 w-full min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";
const buttonClass = "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[12px] font-medium disabled:opacity-50";

export function NewDataSourceDrawer({ open, ownerType, ownerName, brand, category, onClose, onSave }: { open: boolean; ownerType: "manufacturer" | "supplier"; ownerName: string; brand: string; category: string; onClose: () => void; onSave: (source: EquipmentDataSource) => Promise<boolean> | boolean }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("manufacturer_site");
  const [supplier, setSupplier] = useState(ownerType === "supplier" ? ownerName : "");
  const [url, setUrl] = useState("");
  const [region, setRegion] = useState("中国");
  const [language, setLanguage] = useState("中文");
  const [allowPdf, setAllowPdf] = useState(true);
  const [reviewRequired, setReviewRequired] = useState(true);
  const [confidence, setConfidence] = useState<"A" | "B" | "C" | "D" | "E">("B");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !brand.trim() || !url.trim()) return emitMockToast({ title: "请补全必填字段", description: "数据源名称、归属品牌和链接必须填写。", tone: "warning" });
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:") throw new Error("数据源地址必须使用 HTTPS");
    } catch (error) {
      return emitMockToast({ title: "数据源地址无效", description: error instanceof Error ? error.message : "请输入完整 HTTPS 地址。", tone: "warning" });
    }
    setSaving(true);
    const saved = await onSave({ id: "", name: name.trim(), type, supplierName: supplier.trim() || `${brand} 官方`, brand: brand.trim(), url: url.trim(), equipmentCategories: [category || "综合"], healthStatus: "warning", lastCollectedAt: "等待验证", failureCount: 0, confidenceLevel: confidence, normalCount: 0, abnormalCount: 0 });
    setSaving(false);
    if (saved) onClose();
  };

  return <OverlayShell open={open} onClose={onClose} variant="drawer" panelClassName="w-[560px]" ariaLabel="新增数据源">
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-borderSoft px-5 py-4"><div><h2 className="text-[17px] font-semibold">新增数据源</h2><p className="mt-1 text-[11px] text-textMuted">保存后写入 Supabase，并立即执行真实连接验证。</p></div><button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button></div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-[12px] font-medium">数据源名称 *<input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} placeholder="例如 Grundfos PDF样本中心" /></label><label className="space-y-1.5 text-[12px] font-medium">数据源类型 *<select value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>{Object.entries(sourceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <div className="rounded-lg border border-primary/20 bg-primary-soft/40 p-3"><p className="text-[10px] text-textMuted">归属采集主体</p><p className="mt-1 text-[12px] font-semibold text-primary">{ownerName} · {ownerType === "manufacturer" ? "厂家/品牌" : "供应商"}</p><p className="mt-1 text-[10px] leading-4 text-textMuted">归属关系随当前采集对象锁定。数据源名称可按用途命名，但不会改变其所属主体。</p></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-[12px] font-medium">规范品牌<input value={brand} readOnly className={`${fieldClass} bg-slate-50`} /></label><label className="space-y-1.5 text-[12px] font-medium">供应商{ownerType === "supplier" ? "（已锁定）" : "（可选）"}<input value={supplier} onChange={(e) => setSupplier(e.target.value)} readOnly={ownerType === "supplier"} className={`${fieldClass} ${ownerType === "supplier" ? "bg-slate-50" : ""}`} /></label></div>
        <label className="block space-y-1.5 text-[12px] font-medium">官网 / 目录链接 *<input value={url} onChange={(e) => setUrl(e.target.value)} className={fieldClass} placeholder="https://example.com/catalog" /></label>
        <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-1.5 text-[12px] font-medium">覆盖类别<input value={category || "综合"} readOnly className={fieldClass} /></label><label className="space-y-1.5 text-[12px] font-medium">国家 / 地区<input value={region} onChange={(e) => setRegion(e.target.value)} className={fieldClass} /></label><label className="space-y-1.5 text-[12px] font-medium">语言<select value={language} onChange={(e) => setLanguage(e.target.value)} className={fieldClass}><option>中文</option><option>英文</option><option>法文</option><option>德文</option></select></label></div>
        <div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-lg border border-borderSoft p-3 text-[12px]"><input type="checkbox" checked={allowPdf} onChange={(e) => setAllowPdf(e.target.checked)} />允许采集 PDF</label><label className="flex items-center gap-2 rounded-lg border border-borderSoft p-3 text-[12px]"><input type="checkbox" checked={reviewRequired} onChange={(e) => setReviewRequired(e.target.checked)} />需要人工复核</label></div>
        <label className="block space-y-1.5 text-[12px] font-medium">初始可信度等级<select value={confidence} onChange={(e) => setConfidence(e.target.value as typeof confidence)} className={fieldClass}>{["A", "B", "C", "D", "E"].map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="flex justify-end gap-2 border-t border-borderSoft p-4"><button type="button" onClick={onClose} disabled={saving} className={`${buttonClass} border-borderSoft bg-white`}>取消</button><button type="button" onClick={() => void save()} disabled={saving} className={`${buttonClass} border-primary bg-primary text-white`}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}登记并验证</button></div>
    </div>
  </OverlayShell>;
}
