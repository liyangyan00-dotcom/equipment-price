"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Download,
  FileWarning,
  GitCompareArrows,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ModuleHeader,
  PriceCell,
  RouteContextBanner,
} from "@/components/common";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { MockExportDialog } from "@/components/common/MockExportDialog";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import {
  aiRecommendationRecords,
  recommendationInsights,
  recommendationKpis,
  recommendedSuppliers,
  type AiRecommendationRecord,
} from "@/data/mock/aiRecommendations";
import { equipmentPriceRecords } from "@/data/mock/equipmentPrices";
import type { EquipmentPriceEditData } from "@/types/equipmentPriceCreate";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useMockAiAction } from "@/hooks/useMockAiAction";
import { useMockToast } from "@/hooks/useMockToast";

const kpiIcons = [
  Sparkles,
  CheckCircle2,
  FileWarning,
  Send,
  AlertTriangle,
  ShieldCheck,
] as const;

function resolveRecommendationRecord(equipmentId: string) {
  const equipment = equipmentPriceRecords.find(
    (item) => item.id === equipmentId || item.equipmentCode === equipmentId,
  );
  if (!equipment) {
    return aiRecommendationRecords.find(
      (record) =>
        record.equipmentCode === equipmentId || record.id === equipmentId,
    );
  }

  const existing = aiRecommendationRecords.find(
    (record) => record.equipmentCode === equipment.equipmentCode,
  );
  if (existing) return existing;

  const adjustment =
    equipment.riskLevel === "high" || equipment.riskLevel === "critical"
      ? 1.08
      : equipment.aiRecommended
        ? 0.97
        : 1.02;
  const recommendedPrice = Math.round(equipment.usdPrice * adjustment);

  return {
    id: `REC-${equipment.id}`,
    equipmentCode: equipment.equipmentCode,
    equipmentName: equipment.equipmentName,
    brand: equipment.brand,
    specification: equipment.specification,
    currentPrice: equipment.usdPrice,
    recommendedPrice,
    currency: "USD",
    differenceRate: Number(
      (((recommendedPrice - equipment.usdPrice) / equipment.usdPrice) * 100).toFixed(1),
    ),
    similarCount: equipment.confidence === "A" ? 12 : equipment.confidence === "B" ? 8 : 4,
    supplier: equipment.supplier,
    confidence: equipment.confidence,
    riskLevel: equipment.riskLevel,
    action:
      equipment.riskLevel === "high" || equipment.riskLevel === "critical"
        ? "create_inquiry"
        : equipment.aiRecommended
          ? "adopt"
          : "review",
    reason: equipment.aiSuggestion,
    missingParams:
      equipment.riskLevel === "low"
        ? []
        : ["关键技术参数", "交付周期", "价格有效期"],
  } satisfies AiRecommendationRecord;
}

function recommendationFromPersistedPrice(data: EquipmentPriceEditData) {
  const currentPrice = data.usdPrice || data.originalPrice;
  const adjustment =
    data.riskLevel === "high" || data.riskLevel === "critical" ? 1.08 : 0.97;
  const recommendedPrice = Math.round(currentPrice * adjustment);
  const confidence =
    data.confidence >= 90
      ? "A"
      : data.confidence >= 80
        ? "B"
        : data.confidence >= 70
          ? "C"
          : data.confidence >= 60
            ? "D"
            : "E";
  const existing = aiRecommendationRecords.find(
    (record) => record.equipmentCode === data.priceCode
  );
  return {
    ...(existing ?? {}),
    id: data.id,
    databaseId: data.id,
    equipmentCode: data.priceCode,
    equipmentName: data.equipmentName,
    brand: data.brand,
    specification: data.model,
    currentPrice,
    recommendedPrice,
    currency: "USD" as const,
    differenceRate:
      currentPrice > 0
        ? Number((((recommendedPrice - currentPrice) / currentPrice) * 100).toFixed(1))
        : 0,
    similarCount: existing?.similarCount ?? (confidence === "A" ? 12 : confidence === "B" ? 8 : 4),
    supplier: existing?.supplier ?? "待选择询价供应商",
    confidence,
    riskLevel: data.riskLevel,
    action:
      data.riskLevel === "high" || data.riskLevel === "critical"
        ? ("create_inquiry" as const)
        : ("review" as const),
    reason:
      data.aiRecommendation ||
      data.aiJudgment ||
      "已基于当前价格、参数完整度与历史样本生成推荐，最终采用需人工确认。",
    missingParams: data.technicalParameters
      .filter((item) => item.required && !item.value)
      .map((item) => item.name),
  } satisfies AiRecommendationRecord;
}

const toneStyles = {
  blue: {
    card: "from-white to-primary-soft",
    icon: "from-primary to-[#68A6FF]",
    text: "text-primary",
    badge: "bg-primary-soft text-primary",
  },
  cyan: {
    card: "from-white to-info-soft",
    icon: "from-info to-[#67D6F7]",
    text: "text-info",
    badge: "bg-info-soft text-info",
  },
  green: {
    card: "from-white to-success-soft",
    icon: "from-success to-[#7ADFA0]",
    text: "text-success",
    badge: "bg-success-soft text-success",
  },
  orange: {
    card: "from-white to-warning-soft",
    icon: "from-warning to-[#FDBA5A]",
    text: "text-warning",
    badge: "bg-warning-soft text-warning",
  },
  red: {
    card: "from-white to-danger-soft",
    icon: "from-danger to-[#FF7A7A]",
    text: "text-danger",
    badge: "bg-danger-soft text-danger",
  },
  purple: {
    card: "from-white to-ai-soft",
    icon: "from-ai to-[#9A6CFF]",
    text: "text-ai",
    badge: "bg-ai-soft text-ai",
  },
} as const;

type Tone = keyof typeof toneStyles;
type ConfirmAction = "adopt" | "review" | null;
type FilterState = {
  keyword: string;
  category: string;
  brand: string;
  risk: string;
  confidence: string;
  difference: string;
  similarSamples: string;
  missingParameters: string;
};

const initialFilters: FilterState = {
  keyword: "",
  category: "all",
  brand: "all",
  risk: "all",
  confidence: "all",
  difference: "all",
  similarSamples: "all",
  missingParameters: "all",
};

const recommendationFilterParams: Array<[keyof FilterState, string]> = [
  ["keyword", "q"],
  ["category", "category"],
  ["brand", "brand"],
  ["risk", "risk"],
  ["confidence", "confidence"],
  ["difference", "difference"],
  ["similarSamples", "samples"],
  ["missingParameters", "missing"],
];

function matchesRecommendationFilters(
  record: AiRecommendationRecord,
  filters: FilterState,
) {
  const keyword = filters.keyword.trim().toLowerCase();
  const category = record.equipmentName.includes("阀")
    ? "阀门设备"
    : record.equipmentName.includes("柜")
      ? "电气设备"
      : "机电设备";
  const minDifference =
    filters.difference === "10"
      ? 10
      : filters.difference === "20"
        ? 20
        : 0;
  const minSamples =
    filters.similarSamples === "5"
      ? 5
      : filters.similarSamples === "10"
        ? 10
        : 0;

  return (
    (!keyword ||
      `${record.equipmentCode}${record.equipmentName}${record.specification}`
        .toLowerCase()
        .includes(keyword)) &&
    (filters.category === "all" || category === filters.category) &&
    (filters.brand === "all" || record.brand === filters.brand) &&
    (filters.risk === "all" || record.riskLevel === filters.risk) &&
    (filters.confidence === "all" || record.confidence === filters.confidence) &&
    Math.abs(record.differenceRate) >= minDifference &&
    record.similarCount >= minSamples &&
    (filters.missingParameters === "all" ||
      (filters.missingParameters === "yes"
        ? record.missingParams.length > 0
        : record.missingParams.length === 0))
  );
}

const actionLabel = {
  create_inquiry: "创建询价",
  adopt: "采用推荐",
  review: "人工复核",
  complete_params: "补全参数",
} as const;

function RecommendationKpiGrid({
  onSelect,
}: {
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {recommendationKpis.map((item, index) => {
        const tone = item.tone as Tone;
        const Icon = kpiIcons[index];
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              "min-h-[96px] rounded-card border border-borderSoft bg-gradient-to-br px-3.5 py-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-panel",
              toneStyles[tone].card,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-[12px] font-bold",
                    toneStyles[tone].text,
                  )}
                >
                  {item.label}
                </p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span
                    className={cn(
                      "text-[25px] font-bold leading-8",
                      toneStyles[tone].text,
                    )}
                  >
                    {item.value}
                  </span>
                  <span className="mb-1 text-[11px] font-bold text-textMuted">
                    {item.unit}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                  toneStyles[tone].icon,
                )}
              >
                <Icon className="size-5" />
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-pill px-1.5 py-0.5 text-[10px] font-bold",
                  toneStyles[tone].badge,
                )}
              >
                {item.trend}
              </span>
              <span className="truncate text-[10px] font-medium text-textMuted">
                {item.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative grid h-9 min-w-[132px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] shadow-sm">
      <span className="whitespace-nowrap font-semibold text-textSecondary">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 appearance-none bg-transparent pr-4 font-medium text-textMuted outline-none"
      >
        <option value="all">全部</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none size-3.5 text-textMuted" />
    </label>
  );
}

function ParameterDrawer({
  open,
  record,
  onClose,
  onSave,
}: {
  open: boolean;
  record: AiRecommendationRecord;
  onClose: () => void;
  onSave: (parameters: Array<{ name: string; value: string }>) => void;
}) {
  if (!open) return null;
  const parameters = record.missingParams.length
    ? record.missingParams
    : ["执行器参数", "材质说明", "质保条件"];

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <button
        type="button"
        aria-label="关闭参数补全"
        className="flex-1"
        onClick={onClose}
      />
      <aside className="h-full w-[430px] max-w-full border-l border-borderSoft bg-white shadow-panel">
        <form
          className="flex h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSave(
              parameters
                .map((name, index) => ({
                  name,
                  value: String(formData.get(`parameter-${index}`) ?? "").trim(),
                }))
                .filter((item) => item.value)
            );
          }}
        >
        <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-textMain">
              补全设备参数
            </h2>
            <p className="mt-1 text-[12px] text-textMuted">
              {record.equipmentCode} · {record.equipmentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {parameters.map((param, index) => (
            <label key={param} className="block">
              <span className="text-[12px] font-semibold text-textSecondary">
                {param}
              </span>
              <input
                name={`parameter-${index}`}
                defaultValue={index === 0 ? "待人工确认" : ""}
                placeholder={`请输入${param}`}
                className="mt-1 h-10 w-full rounded-md border border-borderSoft px-3 text-[13px] outline-none focus:border-ai focus:ring-2 focus:ring-ai/10"
              />
            </label>
          ))}
          <div className="rounded-lg border border-ai-border bg-ai-soft p-3 text-[12px] leading-5 text-textSecondary">
            <b className="text-ai">AI 提示：</b>
            补全后将重新计算推荐价格与置信度，结果仍需人工复核。
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-borderSoft bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-borderSoft px-4 text-[13px] font-semibold text-textSecondary"
          >
            取消
          </button>
          <button
            type="submit"
            className="h-9 rounded-md bg-ai px-4 text-[13px] font-semibold text-white"
          >
            保存并重新评估
          </button>
        </div>
        </form>
      </aside>
    </div>
  );
}

export default function EquipmentAiRecommendationPage() {
  const router = useRouter();
  const toast = useMockToast();
  const aiAction = useMockAiAction("AI 推荐评估");
  const [records, setRecords] = useState(aiRecommendationRecords);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedId, setSelectedId] = useState(aiRecommendationRecords[0].id);
  const [checkedIds, setCheckedIds] = useState<string[]>([
    aiRecommendationRecords[0].id,
  ]);
  const [selectedSupplier, setSelectedSupplier] = useState(
    aiRecommendationRecords[0].supplier,
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [parameterOpen, setParameterOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [persistingAction, setPersistingAction] = useState("");
  const [recommendationUrlReady, setRecommendationUrlReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const restoredFilters = { ...initialFilters };
      recommendationFilterParams.forEach(([key, param]) => {
        const value = searchParams.get(param);
        if (value) restoredFilters[key] = value;
      });
      const equipmentId =
        searchParams.get("equipmentId") ??
        searchParams.get("equipmentIds")?.split(",")[0];
      let matched = equipmentId
        ? resolveRecommendationRecord(equipmentId)
        : undefined;
      if (equipmentId) {
        try {
          const response = await fetch(
            `/api/equipment-prices/${encodeURIComponent(equipmentId)}`,
            { cache: "no-store" }
          );
          const payload = (await response.json()) as {
            data?: EquipmentPriceEditData;
          };
          if (response.ok && payload.data) {
            matched = recommendationFromPersistedPrice(payload.data);
          }
        } catch {
          // The static recommendation remains available for legacy links only.
        }
      }
      setDraftFilters(restoredFilters);
      setFilters(restoredFilters);
      setAdvancedFiltersOpen(
        searchParams.get("advanced") === "1" ||
          restoredFilters.difference !== "all" ||
          restoredFilters.similarSamples !== "all" ||
          restoredFilters.missingParameters !== "all"
      );
      if (matched) {
        setRecords((current) =>
          current.some((record) => record.id === matched.id)
            ? current
            : [matched, ...current],
        );
        setSelectedId(matched.id);
        setCheckedIds([matched.id]);
        setSelectedSupplier(matched.supplier);
        if (searchParams.get("action") === "complete-parameters") {
          setParameterOpen(true);
        }
      }
      setRecommendationUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records.map((record) =>
            record.equipmentName.includes("阀")
              ? "阀门设备"
              : record.equipmentName.includes("柜")
                ? "电气设备"
                : "机电设备",
          ),
        ),
      ),
    [records],
  );
  const brandOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.brand))),
    [records],
  );
  const filteredRecords = useMemo(
    () => records.filter((record) => matchesRecommendationFilters(record, filters)),
    [filters, records],
  );
  const selected =
    records.find((record) => record.id === selectedId) ?? records[0];
  const checkedRecords = records.filter((record) =>
    checkedIds.includes(record.id),
  );
  const selectedTotal = checkedRecords.reduce(
    (sum, record) => sum + record.recommendedPrice,
    0,
  );
  const optimizedTotal = checkedRecords.reduce(
    (sum, record) =>
      sum + Math.max(record.currentPrice - record.recommendedPrice, 0),
    0,
  );

  useEffect(() => {
    if (!recommendationUrlReady || !selected) return;
    const currentParams = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    ["action", "view", "source"].forEach((key) => {
      const value = currentParams.get(key);
      if (value) params.set(key, value);
    });
    params.set("equipmentId", String(selected.databaseId ?? selected.id));
    recommendationFilterParams.forEach(([key, param]) => {
      const value = filters[key];
      if (value && value !== initialFilters[key]) params.set(param, value);
    });
    if (advancedFiltersOpen) params.set("advanced", "1");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
  }, [advancedFiltersOpen, filters, recommendationUrlReady, selected]);

  const setFilter = (key: keyof FilterState, value: string) =>
    setDraftFilters((current) => ({ ...current, [key]: value }));
  const applyRecommendationFilters = (
    nextFilters: FilterState,
    announce = true
  ) => {
    const nextRecords = records.filter((record) =>
      matchesRecommendationFilters(record, nextFilters)
    );
    setFilters(nextFilters);
    setCheckedIds((current) =>
      current.filter((id) => nextRecords.some((record) => record.id === id))
    );
    if (!nextRecords.some((record) => record.id === selectedId) && nextRecords[0]) {
      setSelectedId(nextRecords[0].id);
      setSelectedSupplier(nextRecords[0].supplier);
    }
    if (announce) {
      toast.success("筛选已应用", `找到 ${nextRecords.length} 条推荐记录。`);
    }
  };
  const selectRecord = (record: AiRecommendationRecord) => {
    setSelectedId(record.id);
    setSelectedSupplier(record.supplier);
  };
  const toggleChecked = (id: string) =>
    setCheckedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const openInquiry = (record?: AiRecommendationRecord) => {
    const chosen = record
      ? [record]
      : checkedRecords.length
        ? checkedRecords
        : [selected];
    const ids = chosen.map((record) => String(record.databaseId ?? record.id)).join(",");
    const supplier = record?.supplier ?? selectedSupplier;
    router.push(
      `/inquiries/create?equipmentIds=${encodeURIComponent(ids)}&supplier=${encodeURIComponent(supplier)}&source=ai-recommendation`,
    );
  };
  const persistRecommendation = async (
    record: AiRecommendationRecord,
    action: "adopt" | "review",
  ) => {
    const response = await fetch(
      `/api/equipment-prices/${encodeURIComponent(String(record.databaseId ?? record.id))}/workflow`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:
            action === "adopt"
              ? "adopt_ai_recommendation"
              : "request_review",
          recommendedUsdPrice: record.recommendedPrice,
          aiReason: record.reason,
        }),
      },
    );
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `${record.equipmentName} 状态写入失败`);
    }
  };

  const updateAction = async (action: "adopt" | "review") => {
    if (persistingAction) return;
    const targets = checkedRecords.length ? checkedRecords : [selected];
    setPersistingAction(action);
    try {
      await Promise.all(
        targets.map((record) => persistRecommendation(record, action)),
      );
      const targetIds = targets.map((record) => record.id);
      setRecords((current) =>
        current.map((record) =>
          targetIds.includes(record.id)
            ? { ...record, action: action === "adopt" ? "adopt" : "review" }
            : record,
        ),
      );
      toast.success(
        action === "adopt" ? "AI 推荐已提交采用" : "已进入人工复核",
        `${targets.length} 条设备已写入 Supabase 审核队列，最终价格仍需人工审核。`,
      );
      setConfirmAction(null);
    } catch (error) {
      toast.danger(
        "推荐结果写入失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setPersistingAction("");
    }
  };

  const saveParameters = async (
    parameters: Array<{ name: string; value: string }>,
  ) => {
    if (persistingAction) return;
    if (!parameters.length) {
      toast.warning("请填写参数", "至少填写一项技术参数后再保存。");
      return;
    }
    setPersistingAction("parameters");
    try {
      const response = await fetch(
        `/api/equipment-prices/${encodeURIComponent(String(selected.databaseId ?? selected.id))}/workflow`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete_parameters",
            parameters,
            aiReason: selected.reason,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "参数补全写入失败");
      setRecords((current) =>
        current.map((record) =>
          record.id === selected.id
            ? {
                ...record,
                missingParams: record.missingParams.filter(
                  (name) => !parameters.some((item) => item.name === name),
                ),
                confidence: "A",
                action: "review",
              }
            : record,
        ),
      );
      setParameterOpen(false);
      toast.success(
        "参数已补全",
        "参数已写入设备价格记录，AI 已重新评估并进入人工复核。",
      );
    } catch (error) {
      toast.danger(
        "参数补全失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setPersistingAction("");
    }
  };
  const handleKpi = (index: number) => {
    if (index === 2)
      setDraftFilters((current) => ({ ...current, keyword: "电磁" }));
    if (index === 4) {
      setDraftFilters((current) => ({ ...current, risk: "high" }));
      setFilters((current) => ({ ...current, risk: "high" }));
    }
    toast.info(
      `${recommendationKpis[index].label}视图`,
      "已更新筛选条件或聚焦相应推荐记录。 ",
    );
  };

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title="设备价格 AI 推荐"
          description="基于历史价格、相似设备、供应商表现与参数完整度，辅助生成推荐价格和询价任务。"
          actions={
            <>
              <button
                type="button"
                onClick={() => openInquiry()}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm"
              >
                <Send className="size-4" />
                创建询价任务
              </button>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm"
              >
                <Download className="size-4" />
                导出建议
              </button>
              <button
                type="button"
                disabled={aiAction.status === "running"}
                onClick={() => aiAction.run("AI 批量评估", "needs_review")}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm disabled:opacity-60"
              >
                {aiAction.status === "running" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                AI批量评估
              </button>
            </>
          }
        />
        <RouteContextBanner
          title={`当前推荐对象：${selected.equipmentCode} · ${selected.equipmentName}`}
        />
        <RecommendationKpiGrid onSelect={handleKpi} />

        <section className="rounded-card border border-borderSoft bg-white px-3 py-2.5 shadow-card">
          <div className="grid min-w-0 items-center gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(240px,1.25fr)_repeat(4,minmax(132px,.64fr))_56px_64px_42px]">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-3 text-[12px] text-textMuted shadow-sm sm:col-span-2 lg:col-span-2 2xl:col-span-1">
              <Search className="size-4" />
              <input
                value={draftFilters.keyword}
                onChange={(event) => setFilter("keyword", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyRecommendationFilters(draftFilters);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent font-medium outline-none"
                placeholder="搜索设备编号、名称或规格"
              />
            </label>
            <FilterSelect
              label="设备类别"
              value={draftFilters.category}
              options={categoryOptions}
              onChange={(value) => setFilter("category", value)}
            />
            <FilterSelect
              label="品牌"
              value={draftFilters.brand}
              options={brandOptions}
              onChange={(value) => setFilter("brand", value)}
            />
            <FilterSelect
              label="风险等级"
              value={draftFilters.risk}
              options={["low", "medium", "high", "critical"]}
              onChange={(value) => setFilter("risk", value)}
            />
            <FilterSelect
              label="AI置信度"
              value={draftFilters.confidence}
              options={["A", "B", "C", "D"]}
              onChange={(value) => setFilter("confidence", value)}
            />
            <button
              type="button"
              onClick={() => {
                setDraftFilters(initialFilters);
                applyRecommendationFilters(initialFilters, false);
              }}
              className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"
            >
              重置
            </button>
            <button
              type="button"
              onClick={() => {
                applyRecommendationFilters(draftFilters);
              }}
              className="h-9 rounded-md bg-primary px-4 text-[12px] font-bold text-white"
            >
              查询
            </button>
            <button
              type="button"
              onClick={() => setAdvancedFiltersOpen((current) => !current)}
              aria-label="筛选设置"
              aria-expanded={advancedFiltersOpen}
              className={cn(
                "flex h-9 items-center justify-center rounded-md border bg-white",
                advancedFiltersOpen
                  ? "border-ai-border text-ai"
                  : "border-borderSoft text-textMuted",
              )}
            >
              <Settings className="size-4" />
            </button>
          </div>
          {advancedFiltersOpen ? (
            <div className="mt-2 grid gap-2 border-t border-borderSoft pt-2 md:grid-cols-3">
              <label className="grid gap-1 text-[10px] font-semibold text-textMuted">
                推荐价差绝对值
                <select
                  value={draftFilters.difference}
                  onChange={(event) => setFilter("difference", event.target.value)}
                  className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary outline-none"
                >
                  <option value="all">不限</option>
                  <option value="10">不低于 10%</option>
                  <option value="20">不低于 20%</option>
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold text-textMuted">
                相似价格样本
                <select
                  value={draftFilters.similarSamples}
                  onChange={(event) =>
                    setFilter("similarSamples", event.target.value)
                  }
                  className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary outline-none"
                >
                  <option value="all">不限</option>
                  <option value="5">至少 5 条</option>
                  <option value="10">至少 10 条</option>
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold text-textMuted">
                参数完整性
                <select
                  value={draftFilters.missingParameters}
                  onChange={(event) =>
                    setFilter("missingParameters", event.target.value)
                  }
                  className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary outline-none"
                >
                  <option value="all">全部</option>
                  <option value="yes">仅参数缺失</option>
                  <option value="no">仅参数完整</option>
                </select>
              </label>
            </div>
          ) : null}
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,8fr)_minmax(320px,4fr)]">
          <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="border-b border-borderSoft px-3 py-2.5">
              <ModuleHeader
                icon={PackageCheck}
                title="AI推荐价格明细"
                subtitle={`当前 ${filteredRecords.length} 条 · 已选择 ${checkedIds.length} 条`}
                tone="purple"
                density="compact"
                action={
                  <AiBadge label="AI推荐已启用" className="h-5 text-[11px]" />
                }
              />
            </div>
            {filteredRecords.length === 0 ? (
              <EmptyState
                title="没有匹配的推荐记录"
                description="请调整筛选条件后重新查询。"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1420px] border-collapse text-[12px] text-textSecondary">
                  <thead className="bg-[var(--color-bg-muted)]">
                    <tr className="h-9 border-b border-borderSoft">
                      <th className="w-10 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={filteredRecords.every((record) =>
                            checkedIds.includes(record.id),
                          )}
                          onChange={(event) =>
                            setCheckedIds(
                              event.target.checked
                                ? Array.from(
                                    new Set([
                                      ...checkedIds,
                                      ...filteredRecords.map(
                                        (record) => record.id,
                                      ),
                                    ]),
                                  )
                                : checkedIds.filter(
                                    (id) =>
                                      !filteredRecords.some(
                                        (record) => record.id === id,
                                      ),
                              ),
                            )
                          }
                          aria-label="全选当前推荐结果"
                        />
                      </th>
                      {[
                        "设备编号",
                        "设备名称 / 规格",
                        "品牌",
                        "当前价格",
                        "AI推荐价格",
                        "差异",
                        "相似价格",
                        "推荐供应商",
                        "AI置信度",
                        "风险等级",
                        "推荐动作",
                        "操作",
                      ].map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-2.5 text-left font-semibold"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        onClick={() => selectRecord(record)}
                        onKeyDown={(event) => {
                          if (event.currentTarget !== event.target) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectRecord(record);
                          }
                        }}
                        tabIndex={0}
                        aria-current={selected.id === record.id ? "true" : undefined}
                        aria-selected={checkedIds.includes(record.id)}
                        className={cn(
                          "h-11 cursor-pointer border-b border-borderSoft outline-none hover:bg-primary-soft/40 focus-visible:bg-ai-soft/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ai/30",
                          selected.id === record.id && "bg-ai-soft/50",
                        )}
                      >
                        <td
                          className="px-2 text-center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checkedIds.includes(record.id)}
                            onChange={() => toggleChecked(record.id)}
                            aria-label={`选择 ${record.equipmentName}`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-2.5 font-semibold text-primary">
                          {record.equipmentCode}
                        </td>
                        <td className="max-w-[190px] px-2.5">
                          <div className="font-semibold text-textMain">
                            {record.equipmentName}
                          </div>
                          <div
                            title={record.specification}
                            className="truncate text-[11px] text-textMuted"
                          >
                            {record.specification}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2.5">
                          {record.brand}
                        </td>
                        <td className="px-2.5 text-right">
                          <PriceCell
                            value={record.currentPrice}
                            currency={record.currency}
                          />
                        </td>
                        <td className="px-2.5 text-right">
                          <PriceCell
                            value={record.recommendedPrice}
                            currency={record.currency}
                          />
                        </td>
                        <td
                          className={cn(
                            "px-2.5 text-right font-bold",
                            record.differenceRate > 0
                              ? "text-danger"
                              : "text-success",
                          )}
                        >
                          {record.differenceRate > 0 ? "+" : ""}
                          {record.differenceRate}%
                        </td>
                        <td className="whitespace-nowrap px-2.5 text-center font-semibold text-primary">
                          {record.similarCount} 条
                        </td>
                        <td
                          className="max-w-[180px] truncate px-2.5"
                          title={record.supplier}
                        >
                          {record.supplier}
                        </td>
                        <td className="px-2.5">
                          <ConfidenceBadge
                            level={record.confidence}
                            className="h-5 whitespace-nowrap text-[11px]"
                          />
                        </td>
                        <td className="px-2.5">
                          <RiskBadge
                            level={record.riskLevel}
                            className="h-5 whitespace-nowrap text-[11px]"
                          />
                        </td>
                        <td className="px-2.5">
                          <AiBadge
                            label={actionLabel[record.action]}
                            className="h-5 whitespace-nowrap text-[11px]"
                          />
                        </td>
                        <td
                          className="px-2.5"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex flex-nowrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/equipment-prices/${record.equipmentCode}`,
                                )
                              }
                              className="h-7 rounded-md border border-borderSoft px-2 text-[11px] font-semibold text-primary"
                            >
                              查看
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                selectRecord(record);
                                if (record.action === "complete_params")
                                  setParameterOpen(true);
                                else if (record.action === "create_inquiry")
                                  openInquiry(record);
                                else setConfirmAction("adopt");
                              }}
                              className="h-7 rounded-md border border-ai-border bg-ai-soft px-2 text-[11px] font-semibold text-ai"
                            >
                              {actionLabel[record.action]}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                selectRecord(record);
                                setConfirmAction("review");
                              }}
                              className="h-7 rounded-md border border-warning/30 bg-warning-soft px-2 text-[11px] font-semibold text-warning"
                            >
                              复核
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-3 shadow-card">
            <ModuleHeader
              icon={Bot}
              title="AI决策助手"
              subtitle={`${selected.equipmentName} · ${selected.equipmentCode}`}
              tone="purple"
              density="compact"
              action={
                <button
                  type="button"
                  disabled={aiAction.status === "running"}
                  onClick={() => aiAction.run("当前设备重新分析")}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-white px-2 text-[11px] font-semibold text-ai"
                >
                  {aiAction.status === "running" ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  刷新
                </button>
              }
            />
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-ai-border bg-white/90 p-2.5">
                <div className="flex items-center gap-2 text-[12px] font-bold text-ai">
                  <Sparkles className="size-4" />
                  AI推荐理由
                </div>
                <p className="mt-2 text-[12px] leading-5 text-textSecondary">
                  {selected.reason}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    toast.ai(
                      "AI 分析详情",
                      `置信度 ${selected.confidence}，已匹配 ${selected.similarCount} 条历史价格。`,
                    )
                  }
                  className="mt-2 text-[12px] font-semibold text-primary"
                >
                  查看详细分析 〉
                </button>
              </div>
              <div className="rounded-lg border border-warning/20 bg-warning-soft p-2.5">
                <div className="flex items-center gap-2 text-[12px] font-bold text-warning">
                  <AlertTriangle className="size-4" />
                  参数缺失提醒
                </div>
                <p className="mt-1 text-[12px] text-textSecondary">
                  {selected.missingParams.length
                    ? `${selected.missingParams.length} 项参数可能影响推荐准确性`
                    : "关键参数完整，可进入采用复核。"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.missingParams.map((item) => (
                    <span
                      key={item}
                      className="rounded-pill bg-white px-2 py-0.5 text-[11px] font-semibold text-warning"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setParameterOpen(true)}
                  className="mt-2 text-[12px] font-semibold text-primary"
                >
                  补全参数 〉
                </button>
              </div>
              <div className="rounded-lg border border-borderSoft bg-white/90 p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[12px] font-bold text-ai">
                      相似价格匹配
                    </div>
                    <p className="mt-1 text-[12px] text-textMuted">
                      历史样本 {selected.similarCount} 条
                    </p>
                  </div>
                  <div className="text-[24px] font-bold text-primary">
                    {Math.min(98, 76 + selected.similarCount)}%
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-textSecondary">
                  推荐价{" "}
                  {formatCurrency(selected.recommendedPrice, selected.currency)}
                  ，与当前价差 {selected.differenceRate}%。
                </p>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("similar-prices")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="mt-2 text-[12px] font-semibold text-primary"
                >
                  查看更多样本 〉
                </button>
              </div>
              <div className="rounded-lg border border-ai-border bg-white/90 p-2.5">
                <div className="text-[12px] font-bold text-ai">
                  推荐询价动作
                </div>
                <p className="mt-1 text-[12px] leading-5 text-textSecondary">
                  当前选择：{selectedSupplier}
                </p>
                <button
                  type="button"
                  onClick={() => openInquiry()}
                  className="mt-2 inline-flex h-8 items-center gap-1 rounded-md bg-ai px-3 text-[12px] font-semibold text-white"
                >
                  <Send className="size-3.5" />
                  创建询价任务
                </button>
              </div>
            </div>
          </section>
        </div>

        <div
          id="similar-prices"
          className="grid gap-3 xl:grid-cols-[1.1fr_.95fr_.95fr]"
        >
          <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
            <ModuleHeader
              icon={GitCompareArrows}
              title="相似价格样本"
              subtitle={`当前设备：${selected.equipmentName}`}
              tone="blue"
              density="compact"
            />
            <div className="mt-3 space-y-2">
              {[0.94, 1.02, 0.89].map((factor, index) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() =>
                    toast.info(
                      "已选中相似样本",
                      `样本 ${selected.equipmentCode}-S${index + 1} 可用于人工复核。`,
                    )
                  }
                  className="grid w-full grid-cols-[1fr_100px] gap-2 rounded-lg border border-borderSoft bg-[var(--color-bg-muted)] p-2 text-left text-[12px] hover:border-primary"
                >
                  <div>
                    <div className="font-semibold text-textMain">
                      {selected.equipmentCode}-S{index + 1} ·{" "}
                      {selected.equipmentName}
                    </div>
                    <div className="mt-1 truncate text-textMuted">
                      {selected.specification} · 历史成交样本
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-textMain">
                      {formatCurrency(
                        Math.round(selected.recommendedPrice * factor),
                        selected.currency,
                      )}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-success">
                      相似度 {96 - index * 4}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
            <ModuleHeader
              icon={UsersRound}
              title="推荐询价供应商"
              subtitle="点击选择询价供应商"
              tone="cyan"
              density="compact"
            />
            <div className="mt-3 space-y-2">
              {recommendedSuppliers.map((supplier) => (
                <button
                  key={supplier.name}
                  type="button"
                  onClick={() => {
                    setSelectedSupplier(supplier.name);
                    toast.success("推荐供应商已选择", supplier.name);
                  }}
                  className={cn(
                    "grid w-full grid-cols-[1fr_44px_72px] items-center gap-2 rounded-lg border p-2 text-left text-[12px]",
                    selectedSupplier === supplier.name
                      ? "border-ai bg-ai-soft"
                      : "border-borderSoft",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-textMain">
                      {supplier.name}
                    </div>
                    <div className="mt-0.5 text-textMuted">
                      {supplier.category} · 响应{supplier.response}
                    </div>
                  </div>
                  <span className="rounded-md bg-primary px-2 py-1 text-center text-[11px] font-bold text-white">
                    {supplier.score}
                  </span>
                  <RiskBadge
                    level={supplier.risk}
                    className="h-5 text-[10px]"
                  />
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
            <ModuleHeader
              icon={AlertTriangle}
              title="风险提示 / 采用建议"
              subtitle="推荐结果进入询价前的风险校验"
              tone="orange"
              density="compact"
            />
            <div className="mt-3 space-y-2">
              {recommendationInsights.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() =>
                    item.tone === "warning"
                      ? setConfirmAction("review")
                      : toast.info(item.title, item.description)
                  }
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-[12px]",
                    item.tone === "warning"
                      ? "border-warning/20 bg-warning-soft"
                      : item.tone === "success"
                        ? "border-success/20 bg-success-soft"
                        : "border-primary/20 bg-primary-soft",
                  )}
                >
                  <div className="font-bold text-textMain">{item.title}</div>
                  <div className="mt-1 leading-5 text-textSecondary">
                    {item.description}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-3 z-20 min-w-0 rounded-card border border-borderSoft bg-white/95 px-4 py-2 shadow-panel backdrop-blur">
          <div className="grid min-w-0 items-center gap-3 2xl:grid-cols-[1fr_auto_auto_auto_auto]">
            <div className="flex flex-wrap items-center gap-6 text-[13px] text-textSecondary">
              <span>
                已选择 <b className="text-textMain">{checkedIds.length}</b>{" "}
                条设备
              </span>
              <span>
                总AI推荐金额{" "}
                <b className="text-textMain">
                  {formatCurrency(selectedTotal, "USD")}
                </b>
              </span>
              <span>
                预计优化{" "}
                <b className="text-success">
                  {formatCurrency(optimizedTotal, "USD")}
                </b>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmAction("adopt")}
              className="h-10 rounded-md bg-primary px-6 text-[13px] font-bold text-white"
            >
              采用推荐价
            </button>
            <button
              type="button"
              onClick={() => openInquiry()}
              className="h-10 rounded-md bg-ai px-6 text-[13px] font-bold text-white"
            >
              发起询价
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction("review")}
              className="h-10 rounded-md bg-warning-soft px-6 text-[13px] font-bold text-warning"
            >
              标记复核
            </button>
            <button
              type="button"
              disabled={aiAction.status === "running"}
              onClick={() => aiAction.run("AI 推荐说明生成")}
              className="h-10 rounded-md border border-borderSoft bg-white px-6 text-[13px] font-bold text-textSecondary disabled:opacity-60"
            >
              生成说明
            </button>
          </div>
        </div>
      </div>

      <ParameterDrawer
        open={parameterOpen}
        record={selected}
        onClose={() => setParameterOpen(false)}
        onSave={(parameters) => void saveParameters(parameters)}
      />
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === "adopt" ? "采用 AI 推荐价格" : "标记人工复核"}
        description={
          confirmAction === "adopt"
            ? `将采用已选 ${checkedRecords.length || 1} 条设备的推荐价格。`
            : `将把已选 ${checkedRecords.length || 1} 条设备加入人工复核队列。`
        }
        confirmLabel={confirmAction === "adopt" ? "确认采用" : "确认标记"}
        tone={confirmAction === "review" ? "warning" : "default"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void updateAction(confirmAction ?? "review")}
      />
      <MockExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(format) => {
          setExportOpen(false);
          toast.success(
            "导出任务已创建",
            `已生成 ${format} 格式的前端 mock 导出任务。`,
          );
        }}
      />
    </AppLayout>
  );
}
