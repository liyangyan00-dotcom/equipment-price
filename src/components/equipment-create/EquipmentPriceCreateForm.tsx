"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  Info,
  Link2,
  PackageCheck,
  Paperclip,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SupplierPicker } from "@/components/suppliers/SupplierPicker";
import { IconBox } from "@/components/common/IconBox";
import { LoadingButton } from "@/components/common/LoadingButton";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { useMockToast } from "@/hooks/useMockToast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  EquipmentEvidenceInput,
  EquipmentPriceCreateAction,
  EquipmentPriceEditData,
  EquipmentPriceCreatePayload,
  EquipmentPriceCreateResponse,
  EquipmentTechnicalParameter,
} from "@/types/equipmentPriceCreate";


type FormState = Omit<
  EquipmentPriceCreatePayload,
  "id" | "action" | "technicalParameters" | "evidence"
>;

type LocalEvidence = {
  id: string;
  file?: File;
  name: string;
  size: number;
  contentType: string;
  evidenceType: string;
  inherited?: boolean;
  uploaded?: EquipmentEvidenceInput;
};

const DRAFT_KEY = "wpi:equipment-price-create:draft";

const initialParameters: EquipmentTechnicalParameter[] = [
  { id: "flow", name: "设计流量", value: "", unit: "m³/h", required: true },
  { id: "head", name: "设计扬程", value: "", unit: "m", required: true },
  { id: "power", name: "电机功率", value: "", unit: "kW", required: true },
  { id: "material", name: "主要材质", value: "", unit: "", required: false },
  { id: "protection", name: "防护等级", value: "", unit: "", required: false },
];

const initialForm: FormState = {
  equipmentName: "",
  brand: "",
  model: "",
  category: "",
  unit: "台",
  originalPrice: 0,
  originalCurrency: "CNY",
  exchangeRate: 7.18,
  usdPrice: 0,
  priceTerm: "含税到场价",
  quoteDate: new Date().toISOString().slice(0, 10),
  validUntil: "",
  taxStatus: "含13%增值税",
  deliveryCycle: "",
  priceBoundary: "",
  supplierId: "",
  sourceType: "供应商报价",
  sourceUrl: "",
  inquiryCode: "",
  confidence: 60,
  riskLevel: "medium",
  aiJudgment: "",
  aiRecommendation: "",
};

const inputClass =
  "h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[13px] text-textMain outline-none transition placeholder:text-textMuted/70 focus:border-primary focus:ring-2 focus:ring-primary/10";
const selectClass = cn(inputClass, "appearance-none pr-8");
const labelClass = "mb-1.5 block text-[12px] font-semibold text-textSecondary";

function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("min-w-0", className)}>
      <span className={labelClass}>
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] text-textMuted">{hint}</span> : null}
    </label>
  );
}

function SectionCard({
  step,
  icon,
  tone,
  title,
  subtitle,
  action,
  children,
}: {
  step: number;
  icon: typeof Building2;
  tone: "blue" | "cyan" | "purple" | "orange" | "green";
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-borderSoft px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
            {step}
          </span>
          <IconBox icon={icon} tone={tone} size="sm" />
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-textMain">{title}</h2>
            <p className="truncate text-[11px] text-textMuted">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StepBar({ activeStep }: { activeStep: number }) {
  const steps = [
    ["基础信息", Building2],
    ["技术参数", Gauge],
    ["价格条件", CircleDollarSign],
    ["供应与来源", Link2],
    ["附件与审核", ClipboardCheck],
  ] as const;

  return (
    <div className="rounded-card border border-borderSoft bg-white px-5 py-3 shadow-card">
      <div className="grid grid-cols-5 gap-2">
        {steps.map(([label, Icon], index) => {
          const step = index + 1;
          const completed = step < activeStep;
          const active = step === activeStep;
          return (
            <div key={label} className="relative flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border transition",
                  completed && "border-success bg-success text-white",
                  active && "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(47,107,255,.24)]",
                  !completed && !active && "border-borderSoft bg-page text-textMuted"
                )}
              >
                {completed ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <div className="min-w-0">
                <p className={cn("text-[10px] font-semibold", active ? "text-primary" : "text-textMuted")}>
                  步骤 {step}
                </p>
                <p className="truncate text-[12px] font-semibold text-textMain">{label}</p>
              </div>
              {index < steps.length - 1 ? (
                <ChevronRight className="ml-auto hidden size-4 shrink-0 text-borderStrong lg:block" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fileSizeLabel(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function EquipmentPriceCreateForm({
  mode = "create",
  equipmentId = "",
}: {
  mode?: "create" | "edit";
  equipmentId?: string;
}) {
  const router = useRouter();
  const toast = useMockToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [parameters, setParameters] = useState(initialParameters);
  const [evidence, setEvidence] = useState<LocalEvidence[]>([]);
  const [draftId, setDraftId] = useState("");
  const [revisionSourceId, setRevisionSourceId] = useState("");
  const [draftCode, setDraftCode] = useState("待生成");
  const [originalReviewStatus, setOriginalReviewStatus] = useState("draft");
  const [loadingRecord, setLoadingRecord] = useState(mode === "edit");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");

  const setValue = <K extends keyof FormState,>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const localDraftKey =
    mode === "edit" && equipmentId
      ? `wpi:equipment-price-edit:${equipmentId}`
      : DRAFT_KEY;

  useEffect(() => {
    if (mode !== "create") return;
    const stored = window.localStorage.getItem(DRAFT_KEY);
    const timer = window.setTimeout(() => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as {
            form?: Partial<FormState>;
            parameters?: EquipmentTechnicalParameter[];
            draftId?: string;
            draftCode?: string;
          };
          setForm((current) => ({ ...current, ...parsed.form }));
          if (Array.isArray(parsed.parameters) && parsed.parameters.length) {
            setParameters(parsed.parameters);
          }
          setDraftId(parsed.draftId ?? "");
          setDraftCode(parsed.draftCode ?? "待生成");
        } catch {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !equipmentId) return;
    let active = true;
    const loadRecord = async () => {
      setLoadingRecord(true);
      setLoadError("");
      try {
        const response = await fetch(
          `/api/equipment-prices/${encodeURIComponent(equipmentId)}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as {
          data?: EquipmentPriceEditData;
          error?: string;
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "设备价格记录加载失败");
        }
        if (!active) return;
        const data = payload.data;
        setForm({
          equipmentName: data.equipmentName,
          brand: data.brand,
          model: data.model,
          category: data.category,
          unit: data.unit,
          originalPrice: data.originalPrice,
          originalCurrency: data.originalCurrency,
          exchangeRate: data.exchangeRate,
          usdPrice: data.usdPrice,
          priceTerm: data.priceTerm,
          quoteDate: data.quoteDate,
          validUntil: data.validUntil,
          taxStatus: data.taxStatus,
          deliveryCycle: data.deliveryCycle,
          priceBoundary: data.priceBoundary,
          supplierId: data.supplierId,
          sourceType: data.sourceType,
          sourceUrl: data.sourceUrl,
          inquiryCode: data.inquiryCode,
          confidence: data.confidence,
          riskLevel: data.riskLevel,
          aiJudgment: data.aiJudgment,
          aiRecommendation: data.aiRecommendation,
        });
        setParameters(
          data.technicalParameters.length
            ? data.technicalParameters
            : initialParameters
        );
        setEvidence(
          data.evidence.map((item) => ({
            id: `${item.bucket}:${item.path}`,
            name: item.name,
            size: item.size,
            contentType: item.contentType,
            evidenceType: item.evidenceType,
            inherited: ["approved", "archived"].includes(data.reviewStatus),
            uploaded: item,
          }))
        );
        setDraftCode(data.priceCode);
        setOriginalReviewStatus(data.reviewStatus);
        setRevisionSourceId(data.id);
        setDraftId(
          ["approved", "archived"].includes(data.reviewStatus) ? "" : data.id
        );
        setAiAnalyzed(Boolean(data.aiJudgment || data.aiRecommendation));
        setLastSavedAt(
          new Intl.DateTimeFormat("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(data.updatedAt))
        );
      } catch (error) {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : "设备价格记录加载失败"
        );
      } finally {
        if (active) setLoadingRecord(false);
      }
    };
    void loadRecord();
    return () => {
      active = false;
    };
  }, [equipmentId, mode]);

  useEffect(() => {
    if (loadingRecord) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        localDraftKey,
        JSON.stringify({ form, parameters, draftId, draftCode })
      );
      setLastSavedAt(
        new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draftCode, draftId, form, parameters, loadingRecord, localDraftKey]);


  const convertedUsdPrice = useMemo(
    () =>
      form.originalCurrency === "USD"
        ? form.originalPrice
        : form.exchangeRate > 0
          ? form.originalPrice / form.exchangeRate
          : 0,
    [form.exchangeRate, form.originalCurrency, form.originalPrice]
  );


  const quality = useMemo(() => {
    const requiredParameters = parameters.filter((item) => item.required);
    const completedParameters = requiredParameters.filter((item) => item.value.trim());
    const missing = [
      !form.equipmentName ? "设备名称" : "",
      !form.brand ? "品牌" : "",
      !form.model ? "规格型号" : "",
      !form.category ? "设备类别" : "",
      !form.supplierId ? "供应商" : "",
      !form.sourceType ? "价格来源" : "",
      !form.validUntil ? "有效期" : "",
      ...requiredParameters.filter((item) => !item.value.trim()).map((item) => item.name),
    ].filter(Boolean);
    const confidence = Math.max(
      42,
      Math.min(
        96,
        56 +
          (form.originalPrice > 0 ? 8 : 0) +
          (form.supplierId ? 8 : 0) +
          (form.sourceUrl ? 5 : 0) +
          (evidence.length ? 8 : 0) +
          completedParameters.length * 3 -
          missing.length * 2
      )
    );
    const riskLevel =
      form.originalPrice <= 0 || !form.supplierId
        ? ("high" as const)
        : missing.length >= 4 || evidence.length === 0
          ? ("medium" as const)
          : ("low" as const);
    const judgment =
      riskLevel === "low"
        ? "核心价格、供应商和技术参数已形成完整证据链，具备进入人工审核的基础。"
        : riskLevel === "medium"
          ? "价格数据基本可用，但证据或参数仍有缺口，建议补全后再用于项目套价。"
          : "关键商务字段尚未形成有效闭环，当前记录不建议直接进入正式价格库。";
    const recommendation = missing.length
      ? `优先补充：${missing.slice(0, 4).join("、")}。AI结果仅作辅助，仍需人工复核。`
      : "建议提交价格审核中心，由价格审核员核验来源、价格边界和有效期。";

    return {
      confidence,
      riskLevel,
      missing,
      judgment,
      recommendation,
      parameterProgress: requiredParameters.length
        ? Math.round((completedParameters.length / requiredParameters.length) * 100)
        : 100,
    };
  }, [evidence.length, form, parameters]);

  const activeStep = useMemo(() => {
    if (!form.equipmentName || !form.category) return 1;
    if (quality.parameterProgress < 100) return 2;
    if (form.originalPrice <= 0 || !form.validUntil) return 3;
    if (!form.supplierId || !form.sourceType) return 4;
    return 5;
  }, [
    form.category,
    form.equipmentName,
    form.originalPrice,
    form.sourceType,
    form.supplierId,
    form.validUntil,
    quality.parameterProgress,
  ]);

  const runAiAnalysis = () => {
    setAiRunning(true);
    window.setTimeout(() => {
      setForm((current) => ({
        ...current,
        confidence: quality.confidence,
        riskLevel: quality.riskLevel,
        aiJudgment: quality.judgment,
        aiRecommendation: quality.recommendation,
      }));
      setAiAnalyzed(true);
      setAiRunning(false);
      toast.ai("AI质量检查完成", `置信度 ${quality.confidence}%，发现 ${quality.missing.length} 项待补充字段。`);
    }, 900);
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const allowed = /\.(pdf|xlsx|docx|jpe?g|png)$/i;
    const accepted = files.filter((file) => allowed.test(file.name) && file.size <= 20 * 1024 * 1024);
    if (accepted.length !== files.length) {
      toast.warning("部分文件未加入", "仅支持 PDF、XLSX、DOCX、JPG、PNG，单文件不超过 20 MB。");
    }
    setEvidence((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        contentType: file.type,
        evidenceType: "quote_evidence",
      })),
    ]);
    event.target.value = "";
  };

  const uploadPendingEvidence = useCallback(
    async (equipmentPriceId: string) => {
      const supabase = createClient();
      const uploaded: LocalEvidence[] = [];

      for (const item of evidence) {
        if (item.uploaded) {
          uploaded.push(item);
          continue;
        }
        if (!item.file) {
          throw new Error(`${item.name} 缺少本地文件内容`);
        }
        const sessionResponse = await fetch(
          "/api/equipment-prices/evidence/upload-session",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: item.name,
              fileSize: item.size,
              contentType: item.contentType,
              equipmentPriceId,
            }),
          }
        );
        const session = (await sessionResponse.json()) as {
          upload?: { bucket: string; path: string; contentType: string };
          error?: string;
        };
        if (!sessionResponse.ok || !session.upload) {
          throw new Error(session.error || `${item.name} 上传会话创建失败`);
        }
        const { error } = await supabase.storage
          .from(session.upload.bucket)
          .upload(session.upload.path, item.file, {
            contentType: session.upload.contentType,
            upsert: false,
          });
        if (error) throw error;
        uploaded.push({
          ...item,
          uploaded: {
            bucket: session.upload.bucket,
            path: session.upload.path,
            name: item.name,
            contentType: item.contentType || session.upload.contentType,
            size: item.size,
            evidenceType: item.evidenceType,
          },
        });
      }

      setEvidence(uploaded);
      return uploaded;
    },
    [evidence]
  );

  const buildPayload = (
    action: EquipmentPriceCreateAction,
    id: string | undefined,
    uploadedEvidence: EquipmentEvidenceInput[]
  ): EquipmentPriceCreatePayload => ({
    ...form,
    usdPrice: Number(convertedUsdPrice.toFixed(2)),
    id,
    action,
    technicalParameters: parameters,
    confidence: aiAnalyzed ? form.confidence : quality.confidence,
    riskLevel: aiAnalyzed ? form.riskLevel : quality.riskLevel,
    aiJudgment: aiAnalyzed ? form.aiJudgment : quality.judgment,
    aiRecommendation: aiAnalyzed ? form.aiRecommendation : quality.recommendation,
    evidence: uploadedEvidence,
  });

  const postPrice = async (payload: EquipmentPriceCreatePayload) => {
    const response = await fetch("/api/equipment-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as EquipmentPriceCreateResponse & {
      error?: string;
    };
    if (!response.ok || !result.data) {
      throw new Error(result.error || "设备价格保存失败");
    }
    return result.data;
  };

  const save = async (action: EquipmentPriceCreateAction) => {
    if (!form.equipmentName.trim()) {
      toast.warning("请填写设备名称", "设备名称是建立价格档案的最小必填字段。");
      return;
    }
    if (action === "submit_review" && form.originalPrice <= 0) {
      toast.warning("价格信息不完整", "提交审核前必须填写大于 0 的原始价格。");
      return;
    }

    if (action === "submit_review") {
      setSubmitting(true);
    } else {
      setSaving(true);
    }
    try {
      let currentId = draftId || undefined;
      let currentCode = draftCode;
      let uploadedEvidence = evidence.flatMap((item) =>
        item.uploaded && !item.inherited ? [item.uploaded] : []
      );

      if (!currentId) {
        const draft = await postPrice(
          buildPayload(
            "draft",
            mode === "edit" ? revisionSourceId || undefined : undefined,
            evidence.flatMap((item) => (item.uploaded ? [item.uploaded] : []))
          )
        );
        currentId = draft.id;
        currentCode = draft.priceCode;
        setDraftId(draft.id);
        setDraftCode(draft.priceCode);
      }

      if (evidence.some((item) => !item.uploaded)) {
        const uploadedItems = await uploadPendingEvidence(currentId);
        uploadedEvidence = uploadedItems.flatMap((item) =>
          item.uploaded && !item.inherited ? [item.uploaded] : []
        );
      }

      const result = await postPrice(
        buildPayload(action, currentId, uploadedEvidence)
      );
      setDraftId(result.id);
      setDraftCode(result.priceCode || currentCode);

      if (action === "submit_review") {
        window.localStorage.removeItem(localDraftKey);
        toast.success("已提交设备价格审核", `${result.priceCode} 已进入人工审核队列。`);
        router.push(`/equipment-prices/reviews?priceId=${result.id}`);
        return;
      }
      toast.success(
        mode === "edit" ? "修改已保存" : "草稿已保存",
        `${result.priceCode} 已保存到独立价格库。`
      );
      window.localStorage.removeItem(localDraftKey);
      router.push(
        `/equipment-prices?active=${encodeURIComponent(result.id)}&saved=${Date.now()}`
      );
    } catch (error) {
      toast.danger(
        action === "submit_review" ? "提交审核失败" : "保存草稿失败",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  if (loadingRecord) {
    return (
      <AppLayout>
        <div className="space-y-3" data-no-global-interaction>
          <div className="h-20 animate-pulse rounded-card border border-borderSoft bg-white shadow-card" />
          <div className="h-16 animate-pulse rounded-card border border-borderSoft bg-white shadow-card" />
          <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)]">
            <div className="h-[620px] animate-pulse rounded-card border border-borderSoft bg-white shadow-card" />
            <div className="h-[420px] animate-pulse rounded-card border border-borderSoft bg-white shadow-card" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout>
        <div
          className="flex min-h-[420px] items-center justify-center rounded-card border border-danger/20 bg-white shadow-card"
          data-no-global-interaction
        >
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto size-10 text-danger" />
            <h1 className="mt-3 text-lg font-bold text-textMain">设备价格加载失败</h1>
            <p className="mt-2 text-[13px] text-textMuted">{loadError}</p>
            <Link
              href="/equipment-prices"
              className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-[12px] font-semibold text-white"
            >
              返回设备价格库
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isRevision =
    mode === "edit" && ["approved", "archived"].includes(originalReviewStatus);

  return (
    <AppLayout>
      <div className="space-y-3 pb-20" data-no-global-interaction>
        <div className="flex flex-col gap-3 rounded-card border border-borderSoft bg-white px-5 py-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/equipment-prices"
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary transition hover:border-primary hover:text-primary"
              aria-label="返回设备价格库"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <IconBox icon={BadgeDollarSign} tone="blue" size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-page-title text-textMain">
                  {mode === "edit" ? "编辑设备价格" : "新增设备价格"}
                </h1>
                <span className="rounded-full border border-primary/15 bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {draftCode}
                </span>
              </div>
              <p className="mt-0.5 text-page-subtitle text-textMuted">
                {mode === "edit"
                  ? "修改设备价格档案、证据链与 AI 判断，重要变更仍需重新提交人工审核。"
                  : "建立设备价格档案、证据链与 AI 辅助判断，提交后仍需人工审核。"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] text-textMuted xl:flex">
              <CheckCircle2 className="size-3.5 text-success" />
              {lastSavedAt ? `本地草稿 ${lastSavedAt}` : "正在准备本地草稿"}
            </span>
            <Link
              href="/equipment-prices"
              className="inline-flex h-9 items-center rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary transition hover:border-primary hover:text-primary"
            >
              取消
            </Link>
            <LoadingButton
              tone="ghost"
              loading={saving}
              icon={<Save className="size-4" />}
              onClick={() => void save("draft")}
            >
              {mode === "edit" ? "保存修改" : "保存草稿"}
            </LoadingButton>
            <LoadingButton
              tone="primary"
              loading={submitting}
              icon={<ClipboardCheck className="size-4" />}
              onClick={() => void save("submit_review")}
            >
              {mode === "edit" ? "提交复核" : "提交审核"}
            </LoadingButton>
          </div>
        </div>

        {isRevision ? (
          <div className="flex items-start gap-3 rounded-card border border-warning/25 bg-warning-soft px-4 py-3 text-[12px] text-warning">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-bold">当前记录已经批准或归档</p>
              <p className="mt-0.5 leading-5">
                保存时将建立新的修订草稿，不会覆盖原正式价格；新版本必须重新经过人工审核后才能生效。
              </p>
            </div>
          </div>
        ) : null}

        <StepBar activeStep={activeStep} />

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)]">
          <div className="space-y-3">
            <SectionCard
              step={1}
              icon={Building2}
              tone="blue"
              title="设备基础信息"
              subtitle="用于检索、分类和形成设备价格主档案"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="设备名称" required className="xl:col-span-2">
                  <input
                    className={inputClass}
                    value={form.equipmentName}
                    onChange={(event) => setValue("equipmentName", event.target.value)}
                    placeholder="例如：DN300 电动蝶阀"
                  />
                </Field>
                <Field label="设备类别" required>
                  <select
                    className={selectClass}
                    value={form.category}
                    onChange={(event) => setValue("category", event.target.value)}
                  >
                    <option value="">请选择</option>
                    <option>泵类设备</option>
                    <option>阀门及管道配件</option>
                    <option>水处理工艺设备</option>
                    <option>电气自动化设备</option>
                    <option>实验室及辅助设备</option>
                  </select>
                </Field>
                <Field label="计价单位">
                  <select
                    className={selectClass}
                    value={form.unit}
                    onChange={(event) => setValue("unit", event.target.value)}
                  >
                    <option>台</option>
                    <option>套</option>
                    <option>组</option>
                    <option>批</option>
                  </select>
                </Field>
                <Field label="品牌">
                  <input
                    className={inputClass}
                    value={form.brand}
                    onChange={(event) => setValue("brand", event.target.value)}
                    placeholder="品牌或制造商"
                  />
                </Field>
                <Field label="规格型号" required className="xl:col-span-2">
                  <input
                    className={inputClass}
                    value={form.model}
                    onChange={(event) => setValue("model", event.target.value)}
                    placeholder="规格、口径、型号"
                  />
                </Field>
                <Field label="关联询价编号">
                  <input
                    className={inputClass}
                    value={form.inquiryCode}
                    onChange={(event) => setValue("inquiryCode", event.target.value)}
                    placeholder="可选"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              step={2}
              icon={Gauge}
              tone="cyan"
              title="技术参数"
              subtitle="关键参数用于 AI 相似价格匹配和比价判断"
              action={
                <button
                  type="button"
                  onClick={() =>
                    setParameters((current) => [
                      ...current,
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        value: "",
                        unit: "",
                        required: false,
                      },
                    ])
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-2.5 text-[11px] font-semibold text-primary"
                >
                  <Plus className="size-3.5" />
                  新增参数
                </button>
              }
            >
              <div className="overflow-hidden rounded-md border border-borderSoft">
                <div className="grid grid-cols-[minmax(120px,1fr)_minmax(160px,1.5fr)_100px_72px_40px] gap-2 bg-page px-3 py-2 text-[11px] font-semibold text-textMuted">
                  <span>参数名称</span>
                  <span>参数值</span>
                  <span>单位</span>
                  <span>必填</span>
                  <span />
                </div>
                <div className="divide-y divide-borderSoft">
                  {parameters.map((parameter) => (
                    <div
                      key={parameter.id}
                      className="grid grid-cols-[minmax(120px,1fr)_minmax(160px,1.5fr)_100px_72px_40px] items-center gap-2 px-3 py-2"
                    >
                      <input
                        className={cn(inputClass, "h-8")}
                        value={parameter.name}
                        onChange={(event) =>
                          setParameters((current) =>
                            current.map((item) =>
                              item.id === parameter.id
                                ? { ...item, name: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="参数名称"
                      />
                      <input
                        className={cn(inputClass, "h-8")}
                        value={parameter.value}
                        onChange={(event) =>
                          setParameters((current) =>
                            current.map((item) =>
                              item.id === parameter.id
                                ? { ...item, value: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="请输入参数值"
                      />
                      <input
                        className={cn(inputClass, "h-8")}
                        value={parameter.unit}
                        onChange={(event) =>
                          setParameters((current) =>
                            current.map((item) =>
                              item.id === parameter.id
                                ? { ...item, unit: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="单位"
                      />
                      <label className="flex items-center gap-1.5 text-[11px] text-textSecondary">
                        <input
                          type="checkbox"
                          checked={parameter.required}
                          onChange={(event) =>
                            setParameters((current) =>
                              current.map((item) =>
                                item.id === parameter.id
                                  ? { ...item, required: event.target.checked }
                                  : item
                              )
                            )
                          }
                          className="size-4 rounded border-borderStrong accent-primary"
                        />
                        是
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setParameters((current) =>
                            current.filter((item) => item.id !== parameter.id)
                          )
                        }
                        className="flex size-8 items-center justify-center rounded-md text-textMuted transition hover:bg-danger-soft hover:text-danger"
                        aria-label={`删除${parameter.name || "参数"}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              step={3}
              icon={CircleDollarSign}
              tone="green"
              title="价格与商务条件"
              subtitle="原始价格保留原币种，同时折算美元价格用于跨区域比较"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="原始价格" required>
                  <input
                    className={cn(inputClass, "text-right font-semibold text-primary")}
                    type="number"
                    min={0}
                    value={form.originalPrice || ""}
                    onChange={(event) => setValue("originalPrice", Number(event.target.value))}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="币种">
                  <select
                    className={selectClass}
                    value={form.originalCurrency}
                    onChange={(event) => setValue("originalCurrency", event.target.value)}
                  >
                    <option>CNY</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>ZAR</option>
                  </select>
                </Field>
                <Field label="折算汇率" hint="当前系统配置 USD/CNY 7.18">
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step="0.0001"
                    value={form.exchangeRate}
                    onChange={(event) => setValue("exchangeRate", Number(event.target.value))}
                  />
                </Field>
                <Field label="折算美元价">
                  <div className="flex h-9 items-center justify-end rounded-md border border-success/20 bg-success-soft px-3 text-[13px] font-bold text-success">
                    USD {convertedUsdPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </div>
                </Field>
                <Field label="价格条件">
                  <select
                    className={selectClass}
                    value={form.priceTerm}
                    onChange={(event) => setValue("priceTerm", event.target.value)}
                  >
                    <option>含税到场价</option>
                    <option>出厂价</option>
                    <option>FOB</option>
                    <option>CIF</option>
                    <option>DDP</option>
                  </select>
                </Field>
                <Field label="报价日期">
                  <input
                    className={inputClass}
                    type="date"
                    value={form.quoteDate}
                    onChange={(event) => setValue("quoteDate", event.target.value)}
                  />
                </Field>
                <Field label="有效期" required>
                  <input
                    className={inputClass}
                    type="date"
                    value={form.validUntil}
                    onChange={(event) => setValue("validUntil", event.target.value)}
                  />
                </Field>
                <Field label="税费说明">
                  <input
                    className={inputClass}
                    value={form.taxStatus}
                    onChange={(event) => setValue("taxStatus", event.target.value)}
                  />
                </Field>
                <Field label="交货周期" className="xl:col-span-2">
                  <input
                    className={inputClass}
                    value={form.deliveryCycle}
                    onChange={(event) => setValue("deliveryCycle", event.target.value)}
                    placeholder="例如：合同生效后 45 天"
                  />
                </Field>
                <Field label="价格边界说明" className="xl:col-span-2">
                  <input
                    className={inputClass}
                    value={form.priceBoundary}
                    onChange={(event) => setValue("priceBoundary", event.target.value)}
                    placeholder="包含或不包含的安装、运输、调试范围"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              step={4}
              icon={PackageCheck}
              tone="purple"
              title="供应商与价格来源"
              subtitle="供应商必须与来源证据对应，AI不会替代主体准入判断"
            >
              <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
                <SupplierPicker value={form.supplierId} onChange={id => setValue("supplierId", id)} />
                <div className="grid gap-3">
                  <Field label="来源类型" required>
                    <select
                      className={selectClass}
                      value={form.sourceType}
                      onChange={(event) => setValue("sourceType", event.target.value)}
                    >
                      <option>供应商报价</option>
                      <option>历史询价</option>
                      <option>项目采购记录</option>
                      <option>AI价格采集</option>
                      <option>公开市场信息</option>
                    </select>
                  </Field>
                  <Field label="来源链接">
                    <input
                      className={inputClass}
                      value={form.sourceUrl}
                      onChange={(event) => setValue("sourceUrl", event.target.value)}
                      placeholder="https://"
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              step={5}
              icon={Paperclip}
              tone="orange"
              title="附件与价格证据"
              subtitle="文件将上传至本系统独立的私有 Supabase Storage"
              action={
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-warning/25 bg-warning-soft px-2.5 text-[11px] font-semibold text-warning"
                >
                  <UploadCloud className="size-3.5" />
                  选择文件
                </button>
              }
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFiles}
              />
              {evidence.length ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {evidence.map((item) => (
                    <div
                      key={item.id}
                      className="flex min-w-0 items-center gap-3 rounded-md border border-borderSoft bg-page/55 p-3"
                    >
                      <IconBox icon={FileCheck2} tone={item.uploaded ? "green" : "orange"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-textMain" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-textMuted">
                          {fileSizeLabel(item.size)} · {item.uploaded ? "已上传" : "保存时上传"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEvidence((current) =>
                            current.filter((record) => record.id !== item.id)
                          )
                        }
                        className="flex size-7 items-center justify-center rounded-md text-textMuted hover:bg-danger-soft hover:text-danger"
                        aria-label={`移除${item.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-28 w-full flex-col items-center justify-center rounded-md border border-dashed border-primary/25 bg-gradient-to-br from-primary-soft/60 to-white text-center transition hover:border-primary/50"
                >
                  <UploadCloud className="size-7 text-primary" />
                  <span className="mt-2 text-[12px] font-semibold text-textMain">
                    上传报价单、技术协议或询价依据
                  </span>
                  <span className="mt-1 text-[10px] text-textMuted">
                    PDF / XLSX / DOCX / JPG / PNG，单文件不超过 20 MB
                  </span>
                </button>
              )}
            </SectionCard>
          </div>

          <aside className="space-y-3 xl:sticky xl:top-[68px]">
            <section className="overflow-hidden rounded-card border border-ai-border bg-gradient-to-br from-white via-ai-soft/55 to-[#F0EAFF] shadow-card">
              <div className="border-b border-ai-border/70 p-4">
                <ModuleHeader
                  icon={Bot}
                  title="AI 价格录入助手"
                  subtitle="字段质量、价格证据与风险辅助判断"
                  tone="purple"
                  density="compact"
                  action={
                    <span className="rounded-full bg-ai px-2 py-0.5 text-[9px] font-bold text-white">
                      AI
                    </span>
                  }
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-white/80 bg-white/80 p-3">
                    <p className="text-[10px] text-textMuted">整体置信度</p>
                    <p className="mt-1 text-[22px] font-bold text-ai">
                      {aiAnalyzed ? form.confidence : quality.confidence}
                      <span className="ml-0.5 text-[11px]">%</span>
                    </p>
                  </div>
                  <div className="rounded-md border border-white/80 bg-white/80 p-3">
                    <p className="text-[10px] text-textMuted">参数完整度</p>
                    <p className="mt-1 text-[22px] font-bold text-primary">
                      {quality.parameterProgress}
                      <span className="ml-0.5 text-[11px]">%</span>
                    </p>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] text-textMuted">
                    <span>录入质量</span>
                    <span>{quality.confidence}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-ai transition-all"
                      style={{ width: `${quality.confidence}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-md border border-ai-border bg-white/85 p-3">
                  <div className="flex items-center gap-2">
                    <WandSparkles className="size-4 text-ai" />
                    <p className="text-[11px] font-semibold text-ai">AI 判断</p>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-textSecondary">
                    {aiAnalyzed ? form.aiJudgment : quality.judgment}
                  </p>
                </div>
                <LoadingButton
                  tone="ai"
                  loading={aiRunning}
                  icon={<Sparkles className="size-4" />}
                  onClick={runAiAnalysis}
                  className="w-full"
                >
                  {aiAnalyzed ? "重新执行 AI 检查" : "执行 AI 质量检查"}
                </LoadingButton>
              </div>
            </section>

            <section className="rounded-card border border-warning/20 bg-white p-4 shadow-card">
              <ModuleHeader
                icon={AlertTriangle}
                title="缺失与风险提示"
                subtitle={`${quality.missing.length} 项字段需要关注`}
                tone={quality.riskLevel === "high" ? "red" : "orange"}
                density="compact"
              />
              <div className="mt-3 space-y-2">
                {quality.missing.length ? (
                  quality.missing.slice(0, 6).map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex items-center gap-2 rounded-md border border-warning/15 bg-warning-soft px-2.5 py-2"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-warning text-[9px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-[11px] text-textSecondary">{item}待补充</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success-soft p-3 text-[11px] text-success">
                    <CheckCircle2 className="size-4" />
                    核心字段已填写完整
                  </div>
                )}
              </div>
              <p className="mt-3 text-[10px] leading-4 text-textMuted">
                {aiAnalyzed ? form.aiRecommendation : quality.recommendation}
              </p>
            </section>

            <section className="rounded-card border border-primary/15 bg-white p-4 shadow-card">
              <ModuleHeader
                icon={ShieldCheck}
                title="人工审核闸门"
                subtitle="AI结果不直接替代商务判断"
                tone="blue"
                density="compact"
              />
              <div className="mt-3 space-y-2 text-[11px]">
                {[
                  ["来源证据核验", evidence.length > 0],
                  ["供应商主体关联", Boolean(form.supplierId)],
                  ["价格有效期核验", Boolean(form.validUntil)],
                  ["关键参数完整", quality.parameterProgress === 100],
                ].map(([label, completed]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-md bg-page px-2.5 py-2">
                    <span className="text-textSecondary">{label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        completed
                          ? "bg-success-soft text-success"
                          : "bg-warning-soft text-warning"
                      )}
                    >
                      {completed ? "已就绪" : "待处理"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/10 bg-primary-soft p-3">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-[10px] leading-4 text-textSecondary">
                  提交后将进入“设备价格审核中心”。审核通过前，该价格不会作为正式项目套价依据。
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-sidebar right-0 z-30 border-t border-borderSoft bg-white/95 px-page py-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
        data-no-global-interaction
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden text-[11px] text-textMuted md:block">
              当前完整度 {quality.confidence}% · {quality.missing.length} 项待补充 ·
              {evidence.length} 个证据文件
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                quality.riskLevel === "low"
                  ? "bg-success-soft text-success"
                  : quality.riskLevel === "medium"
                    ? "bg-warning-soft text-warning"
                    : "bg-danger-soft text-danger"
              )}
            >
              {quality.riskLevel === "low"
                ? "低风险"
                : quality.riskLevel === "medium"
                  ? "中风险"
                  : "高风险"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LoadingButton
              tone="ghost"
              loading={saving}
              icon={<Save className="size-4" />}
              onClick={() => void save("draft")}
            >
              {mode === "edit" ? "保存修改" : "保存草稿"}
            </LoadingButton>
            <LoadingButton
              tone="primary"
              loading={submitting}
              icon={<ClipboardCheck className="size-4" />}
              onClick={() => void save("submit_review")}
            >
              {mode === "edit" ? "提交价格复核" : "提交价格审核"}
            </LoadingButton>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
