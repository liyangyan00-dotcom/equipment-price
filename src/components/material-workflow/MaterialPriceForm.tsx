"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileSearch,
  MapPinned,
  PackagePlus,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AiBadge, RiskBadge } from "@/components/badges";
import { LoadingButton } from "@/components/common/LoadingButton";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import { materialDate } from "@/lib/data/materialInsights";
import { materialOptionalNumber } from "@/lib/data/materialOptionalNumber";
import type { RiskLevel } from "@/types/common";
import type { MaterialPriceApiRecord, MaterialPricePayload } from "@/types/materialPriceWorkflow";

type MaterialPriceFormProps = {
  mode?: "create" | "edit";
  materialId?: string;
};

type FormState = Omit<MaterialPricePayload, "action">;

const initialForm: FormState = {
  materialName: "",
  category: "",
  specification: "",
  unit: "",
  price: 0,
  usdPrice: null,
  currency: "",
  region: "",
  supplierName: "",
  sourceType: "",
  sourceNote: "",
  sourceUrl: "",
  quoteDate: "",
  validUntil: "",
  transportCondition: "",
  confidence: null,
  riskLevel: "medium",
  aiSuggestion: "",
  notes: "",
};

const inputClass = "mt-1 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] text-textMain outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const textareaClass = "mt-1 min-h-20 w-full resize-y rounded-md border border-borderSoft bg-white px-3 py-2 text-[13px] text-textMain outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

function Field({ label, required, children, className }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="text-[11px] font-semibold text-textSecondary">
        {label}{required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Options({ value, options }: { value: string; options: string[] }) {
  return <><option value="">请选择</option>{value && !options.includes(value) ? <option value={value}>{value}</option> : null}{options.map(item => <option key={item} value={item}>{item}</option>)}</>;
}

function mapApiToForm(record: MaterialPriceApiRecord): FormState {
  const metadata = record.metadata ?? {};
  return {
    materialName: record.material_name,
    category: record.category ?? "",
    specification: record.specification ?? "",
    unit: record.unit,
    price: Number(record.price),
    usdPrice: materialOptionalNumber(metadata.usdPrice),
    currency: record.currency,
    region: record.region ?? "",
    supplierId: record.supplier_id ?? undefined,
    supplierName: record.wpi_suppliers?.name ?? String(metadata.supplierName ?? ""),
    sourceType: record.source_type ?? "",
    sourceNote: String(metadata.sourceNote ?? ""),
    sourceUrl: String(record.source_url ?? ""),
    quoteDate: String(metadata.quoteDate ?? ""),
    validUntil: record.valid_until ?? "",
    transportCondition: String(metadata.transportCondition ?? ""),
    confidence: materialOptionalNumber(record.confidence, 100),
    riskLevel: record.risk_level,
    aiSuggestion: String(metadata.aiSuggestion ?? ""),
    notes: String(metadata.notes ?? ""),
  };
}

export function MaterialPriceForm({ mode = "create", materialId = "" }: MaterialPriceFormProps) {
  const router = useRouter();
  const toast = useMockToast();
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState("");
  const [recordVersion, setRecordVersion] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const saveInFlight = useRef(false);
  const [saving, setSaving] = useState<"draft" | "submit_review" | null>(null);
  const [checksVisible, setChecksVisible] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !materialId) return;
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/material-prices/${encodeURIComponent(materialId)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("数据库中未找到该记录");
        const payload = await response.json() as { data: MaterialPriceApiRecord };
        if (!payload.data?.id || !payload.data.updated_at) throw new Error("记录缺少版本，无法安全编辑");
        if (active) {
          setForm(mapApiToForm(payload.data));
          setRecordVersion(payload.data.updated_at);
          setLoadedFor(materialId);
          setLoadError("");
        }
      } catch (error) {
        if (active) {
          setLoadedFor(materialId);
          setLoadError(error instanceof Error ? error.message : "无法加载地材价格");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [materialId, mode, toast]);

  const requiredChecks = useMemo(() => [
    { label: "材料名称", ok: Boolean(form.materialName.trim()) },
    { label: "材料类别", ok: Boolean(form.category.trim()) },
    { label: "规格型号", ok: Boolean(form.specification.trim()) },
    { label: "计量单位", ok: Boolean(form.unit.trim()) },
    { label: "价格", ok: form.price > 0 },
    { label: "币种", ok: Boolean(form.currency.trim()) },
    { label: "地区", ok: Boolean(form.region.trim()) },
    { label: "价格来源", ok: Boolean(form.sourceType.trim()) },
    { label: "供应商 / 信息发布方", ok: Boolean(form.supplierId || form.supplierName.trim()) },
    { label: "报价日期", ok: Boolean(materialDate(form.quoteDate)) && form.quoteDate <= new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) },
    { label: "有效期", ok: Boolean(materialDate(form.validUntil)) && Boolean(materialDate(form.quoteDate)) && form.validUntil >= form.quoteDate },
  ], [form]);
  const completeness = Math.round(requiredChecks.filter((item) => item.ok).length / requiredChecks.length * 100);
  const missing = requiredChecks.filter((item) => !item.ok).map((item) => item.label);
  const canSubmit = missing.length === 0;

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (action: "draft" | "submit_review") => {
    if (saveInFlight.current || loadError || (mode === "edit" && (!recordVersion || loadedFor !== materialId))) return;
    if (!form.materialName.trim() || !form.unit.trim() || !form.currency.trim() || !Number.isFinite(form.price) || form.price <= 0) {
      toast.warning("必填信息不完整", "请填写材料名称、计量单位、币种和有效价格。");
      return;
    }
    if (action === "submit_review" && !canSubmit) {
      toast.warning("暂不能提交审核", `请先补齐：${missing.join("、")}。`);
      return;
    }
    saveInFlight.current = true;
    setSaving(action);
    try {
      const response = await fetch(mode === "edit" ? `/api/material-prices/${encodeURIComponent(materialId)}` : "/api/material-prices", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, action, ...(mode === "edit" ? { expectedUpdatedAt: recordVersion } : {}) }),
      });
      const payload = await response.json() as { data?: MaterialPriceApiRecord; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "保存失败");
      toast.success(action === "draft" ? "草稿已保存" : "已提交人工审核", `${payload.data.price_code} 已保存；修改后的价格需重新审核。`);
      router.push(action === "submit_review" ? `/material-prices/reviews?materialId=${payload.data.id}` : `/material-prices/${payload.data.id}`);
    } catch (error) {
      toast.danger("保存失败", error instanceof Error ? error.message : "请稍后重试。");
    } finally {
      saveInFlight.current = false;
      setSaving(null);
    }
  };

  if (loading || (mode === "edit" && loadedFor !== materialId)) {
    return <AppLayout><div className="flex min-h-[420px] items-center justify-center text-[13px] text-textMuted">正在加载地材价格...</div></AppLayout>;
  }

  if (loadError) {
    return <AppLayout><div role="alert" className="space-y-3 rounded-card border border-danger/20 bg-card p-6 text-sm"><h1 className="font-semibold text-danger">无法加载地材价格</h1><p>{loadError}</p><Link href="/material-prices" className="inline-flex text-primary">返回价格库重新选择</Link></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title={mode === "edit" ? "编辑地材价格" : "新增地材价格"}
          description="材料价格与来源维护"
          actions={
            <>
              <Link href="/material-prices" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary hover:text-primary"><ArrowLeft className="size-4" />返回价格库</Link>
              <LoadingButton tone="ghost" icon={<Save className="size-4" />} loading={saving === "draft"} onClick={() => void save("draft")}>保存草稿</LoadingButton>
              <LoadingButton tone="ghost" icon={<FileSearch className="size-4" />} onClick={() => setChecksVisible(true)}>检查资料</LoadingButton>
              <LoadingButton tone="success" icon={<CheckCircle2 className="size-4" />} loading={saving === "submit_review"} onClick={() => void save("submit_review")}>提交审核</LoadingButton>
            </>
          }
        />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-3">
            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={PackagePlus} title="材料基础信息" subtitle="定义材料、规格、分类与计量口径" density="compact" />
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="材料名称" required><input className={inputClass} value={form.materialName} onChange={(e) => patch("materialName", e.target.value)} placeholder="例如：HRB400 螺纹钢" /></Field>
                <Field label="材料类别" required><select className={inputClass} value={form.category} onChange={(e) => patch("category", e.target.value)}><Options value={form.category} options={["水泥", "钢筋", "钢材", "砂石", "管材", "木材", "燃料", "五金耗材", "沥青", "其他"]} /></select></Field>
                <Field label="规格型号" required><input className={inputClass} value={form.specification} onChange={(e) => patch("specification", e.target.value)} placeholder="型号、强度或粒径" /></Field>
                <Field label="计量单位" required><select className={inputClass} value={form.unit} onChange={(e) => patch("unit", e.target.value)}><Options value={form.unit} options={["吨", "袋", "立方米", "米", "根", "公斤", "升", "套"]} /></select></Field>
              </div>
            </section>

            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={CircleDollarSign} title="价格与地区" subtitle="统一原币价格、折算价格和交付条件" density="compact" tone="blue" />
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="原始价格" required><input type="number" min="0" className={inputClass} value={form.price || ""} onChange={(e) => patch("price", Number(e.target.value))} /></Field>
                <Field label="币种" required><select className={inputClass} value={form.currency} onChange={(e) => patch("currency", e.target.value)}><Options value={form.currency} options={["CDF", "CNY", "USD", "EUR", "ZAR"]} /></select></Field>
                <Field label="折算美元价"><input type="number" min="0" className={inputClass} value={form.usdPrice ?? ""} onChange={(e) => patch("usdPrice", materialOptionalNumber(e.target.value))} placeholder="未提供" /></Field>
                <Field label="地区" required><input className={inputClass} value={form.region} onChange={(e) => patch("region", e.target.value)} /></Field>
                <Field label="报价日期"><input type="date" className={inputClass} value={form.quoteDate} onChange={(e) => patch("quoteDate", e.target.value)} /></Field>
                <Field label="有效期" required><input type="date" className={inputClass} value={form.validUntil} onChange={(e) => patch("validUntil", e.target.value)} /></Field>
                <Field label="运输条件" className="md:col-span-2"><input className={inputClass} value={form.transportCondition} onChange={(e) => patch("transportCondition", e.target.value)} placeholder="含运费到厂 / 不含运费" /></Field>
              </div>
            </section>

            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={FileSearch} title="来源与供应商" subtitle="保留价格证据、供应商和原始来源" density="compact" tone="cyan" />
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="供应商名称" className="xl:col-span-2"><input className={inputClass} value={form.supplierName} onChange={(e) => patch("supplierName", e.target.value)} /></Field>
                <Field label="来源类型" required><select className={inputClass} value={form.sourceType} onChange={(e) => patch("sourceType", e.target.value)}><Options value={form.sourceType} options={["供应商报价", "AI采集", "市场调研", "招投标平台", "行业信息价", "人工录入"]} /></select></Field>
                <Field label="来源链接"><input type="url" className={inputClass} value={form.sourceUrl} onChange={(e) => patch("sourceUrl", e.target.value)} placeholder="https://" /></Field>
                <Field label="来源说明" className="md:col-span-2"><textarea className={textareaClass} value={form.sourceNote} onChange={(e) => patch("sourceNote", e.target.value)} /></Field>
                <Field label="业务备注" className="md:col-span-2"><textarea className={textareaClass} value={form.notes} onChange={(e) => patch("notes", e.target.value)} /></Field>
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-card border border-ai/20 bg-gradient-to-br from-violet-50 to-white p-4 shadow-card">
              <div className="flex items-center justify-between"><ModuleHeader icon={Bot} title="AI 辅助与资料检查" subtitle="表单模型预审未接入" density="compact" tone="purple" /><AiBadge label="需人工确认" /></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-violet-100 bg-white p-3"><p className="text-[11px] text-textMuted">资料完整度</p><p className="mt-1 text-xl font-bold text-ai">{completeness}%</p></div>
                <div className="rounded-md border border-violet-100 bg-white p-3"><p className="text-[11px] text-textMuted">记录可信度</p><p className="mt-1 text-xl font-bold text-primary">{form.confidence === null ? "未评估" : `${form.confidence}%`}</p></div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-ai transition-all" style={{ width: `${completeness}%` }} /></div>
              <div className="mt-3 rounded-md border border-violet-100 bg-white p-3 text-[12px] leading-5 text-textSecondary">
                {form.aiSuggestion ? <>已有建议（未重新核验）：{form.aiSuggestion}</> : "暂无模型预审结论"}
              </div>
              {checksVisible ? <p role="status" className="mt-3 text-[12px] leading-5 text-textSecondary">{missing.length ? `资料检查：待补齐或核对${missing.join("、")}。` : "资料检查：必填字段已提供，来源真实性仍待人工核验。"}</p> : null}
              <Link className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-ai/20 bg-ai-soft px-3 text-[13px] font-semibold text-ai" href={`/ai-price-collection?target=material&keyword=${encodeURIComponent(form.materialName)}&source=material-prices`} target="_blank" rel="noopener noreferrer"><Sparkles className="size-4" />AI 补充采集</Link>
            </section>

            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={ShieldCheck} title="提交检查" subtitle="审核前完整性校验" density="compact" tone="green" />
              <div className="mt-3 space-y-2">
                {requiredChecks.map((item) => <div key={item.label} className={cn("flex items-center justify-between rounded-md border px-3 py-2 text-[12px]", item.ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700")}><span>{item.label}</span><span className="font-bold">{item.ok ? "完整" : "待补"}</span></div>)}
              </div>
            </section>

            <section className="rounded-card border border-warning/20 bg-card p-4 shadow-card">
              <ModuleHeader icon={AlertTriangle} title="风险与责任边界" subtitle="最终由商务审核人确认" density="compact" tone="orange" />
              <div className="mt-3 flex items-center justify-between rounded-md bg-warning-soft px-3 py-2"><span className="text-[12px] font-semibold text-textSecondary">当前风险</span><RiskBadge level={form.riskLevel} /></div>
              <select className={inputClass} value={form.riskLevel} onChange={(e) => patch("riskLevel", e.target.value as RiskLevel)}>{["low", "medium", "high", "critical"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <p className="mt-3 text-[11px] leading-5 text-textMuted">AI 不直接确认价格有效性。提交后进入地材价格审核中心，由具备审核权限的人员形成最终结论。</p>
            </section>
          </aside>
        </div>

        <div className="bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-card border border-borderSoft bg-white/95 px-4 py-3 shadow-panel backdrop-blur md:sticky">
          <div className="flex min-w-0 flex-wrap items-center gap-2 break-all text-[12px] text-textSecondary"><MapPinned className="size-4 shrink-0 text-primary" /><span>{form.region || "未设置地区"}</span><CalendarDays className="ml-2 size-4 shrink-0 text-primary" /><span>{form.validUntil || "未设置有效期"}</span><Building2 className="ml-2 size-4 shrink-0 text-primary" /><span>{form.supplierName || "未关联供应商"}</span></div>
          <div className="flex items-center gap-2"><LoadingButton tone="ghost" icon={<Save className="size-4" />} loading={saving === "draft"} onClick={() => void save("draft")}>保存草稿</LoadingButton><LoadingButton tone="success" icon={<CheckCircle2 className="size-4" />} loading={saving === "submit_review"} onClick={() => void save("submit_review")}>提交人工审核</LoadingButton></div>
        </div>
      </div>
    </AppLayout>
  );
}
