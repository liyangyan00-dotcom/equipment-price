"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowLeft, ArrowRight, Bot, Building2, CheckCircle2, ClipboardCheck,
  Database, FileSearch, FileText, Globe2, KeyRound, ListChecks, LoaderCircle,
  Network, PackageSearch, Plus, RefreshCw, Settings2, ShieldAlert,
  Sparkles, Tag, WandSparkles,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { IconBox } from "@/components/common/IconBox";
import { emitMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import {
  defaultEquipmentCatalogCollectionDraft,
  equipmentParameterTemplates,
  sourceTypeLabels,
  waterPlantEquipmentTaxonomy,
  type CollectionMethod,
  type EquipmentCatalogCollectionDraft,
  type EquipmentDataSource,
} from "@/data/mock/equipmentCatalogCollection";
import type { EquipmentCollectionMethodRecord, PriceCollectionTaskRecord } from "@/types/priceCollection";
import { CollectionTaskStepIndicator, collectionTaskSteps } from "./CollectionTaskStepIndicator";
import { CollectionTaskSummaryPanel } from "./CollectionTaskSummaryPanel";
import { NewDataSourceDrawer } from "./NewDataSourceDrawer";
import { NewCollectionMethodDrawer } from "./NewCollectionMethodDrawer";
import { NewManufacturerDrawer, type ManufacturerMasterRow } from "./NewManufacturerDrawer";
import { SupplierApiCredentialDrawer } from "./SupplierApiCredentialDrawer";

const inputClass = "h-10 w-full min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px] text-textMain outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10";
const textareaClass = "min-h-24 w-full resize-y rounded-md border border-borderSoft bg-white px-3 py-2 text-[12px] leading-5 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";
const buttonBase = "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const outlineButton = `${buttonBase} border-borderSoft bg-white text-textMain hover:border-primary/35 hover:bg-primary-soft`;
const primaryButton = `${buttonBase} border-primary bg-primary text-white shadow-sm hover:bg-primary/90`;
const aiButton = `${buttonBase} border-ai bg-ai text-white shadow-sm hover:bg-ai/90`;

const quickSourceTypes = [
  { type: "manufacturer_site", label: "厂家官网", description: "产品中心、详情页与技术参数", icon: Globe2, tone: "blue" },
  { type: "supplier_site", label: "供应商网站", description: "代理目录、品牌页与可供范围", icon: Building2, tone: "green" },
  { type: "product_catalog", label: "产品目录", description: "在线目录、系列与型号索引", icon: PackageSearch, tone: "purple" },
  { type: "pdf_datasheet", label: "PDF资料", description: "样本、说明书与技术手册", icon: FileText, tone: "orange" },
  { type: "api", label: "授权 API", description: "有接口时验证凭证后同步", icon: KeyRound, tone: "blue" },
] as const;

type CollectionScopePreset = "all" | "water_treatment";

const waterTreatmentScopeKeywords = [
  "水处理", "污水", "废水", "饮用水", "供水", "排水", "净水", "海水淡化", "市政给排水", "污泥",
  "排污泵", "潜水泵", "轴流泵", "混流泵", "计量泵", "加药泵",
  "water treatment", "wastewater", "sewage", "drinking water", "water supply", "drainage",
  "desalination", "municipal water", "stormwater", "sludge", "submersible pump", "dosing pump",
];

type RegisteredSourceRow = {
  id: string;
  name?: string | null;
  source_kind?: "web" | "api" | null;
  base_url?: string | null;
  is_active?: boolean | null;
  quality_score?: number | null;
  last_checked_at?: string | null;
  last_error?: string | null;
  config?: Record<string, unknown> | null;
};

type CollectionOrganization = {
  id: string;
  name: string;
  brand: string;
  catalogCount: number;
  sourceCount: number;
  verifiedSourceCount: number;
  status: "verified" | "pending" | "inferred";
};

type CatalogManufacturerFacet = {
  name: string;
  brand: string;
  catalogCount: number;
};

type SourceReadiness = "verified" | "discoverable" | "authorization_required" | "unavailable";

const readinessMeta: Record<SourceReadiness, { label: string; className: string }> = {
  verified: { label: "已验证", className: "bg-success-soft text-success" },
  discoverable: { label: "运行时发现", className: "bg-primary-soft text-primary" },
  authorization_required: { label: "需要授权", className: "bg-warning-soft text-warning" },
  unavailable: { label: "不可用", className: "bg-danger-soft text-danger" },
};

function sourceCatalogType(row: RegisteredSourceRow) {
  const configured = row.config?.catalogSourceType;
  return typeof configured === "string" && configured ? configured : row.source_kind === "api" ? "api" : "manufacturer_site";
}

function normalizeSubjectName(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s·•()（）._-]+/g, "");
}

function organizationId(kind: "manufacturer" | "supplier", value: string) {
  return `${kind}:${normalizeSubjectName(value)}`;
}

function buildManufacturerOrganizations(
  facets: CatalogManufacturerFacet[],
  sources: RegisteredSourceRow[],
  masterRows: ManufacturerMasterRow[],
) {
  const result = new Map<string, CollectionOrganization>();
  for (const manufacturer of masterRows) {
    const key = normalizeSubjectName(manufacturer.brand);
    if (!key) continue;
    result.set(key, {
      id: manufacturer.id,
      name: manufacturer.local_name || manufacturer.official_name,
      brand: manufacturer.brand,
      catalogCount: 0,
      sourceCount: 0,
      verifiedSourceCount: 0,
      status: manufacturer.status === "verified" ? "verified" : "pending",
    });
  }
  for (const facet of facets) {
    const key = normalizeSubjectName(facet.brand || facet.name);
    if (!key) continue;
    const current = result.get(key);
    result.set(key, current ? { ...current, catalogCount: facet.catalogCount } : {
      id: organizationId("manufacturer", facet.brand || facet.name),
      name: facet.name || facet.brand,
      brand: facet.brand || facet.name,
      catalogCount: facet.catalogCount,
      sourceCount: 0,
      verifiedSourceCount: 0,
      status: "inferred",
    });
  }
  for (const source of sources) {
    const configuredKind = String(source.config?.sourceOwnerType ?? "");
    if (configuredKind && configuredKind !== "manufacturer") continue;
    const brand = String(source.config?.canonicalBrand ?? source.config?.brand ?? "").trim();
    if (!brand) continue;
    const key = normalizeSubjectName(brand);
    const current = result.get(key) ?? {
      id: String(source.config?.sourceOwnerId ?? "") || organizationId("manufacturer", brand),
      name: String(source.config?.sourceOwnerName ?? "") || brand,
      brand,
      catalogCount: 0,
      sourceCount: 0,
      verifiedSourceCount: 0,
      status: "inferred" as const,
    };
    current.id = String(source.config?.sourceOwnerId ?? "") || current.id;
    current.sourceCount += 1;
    if (source.is_active && source.last_checked_at && !source.last_error) {
      current.verifiedSourceCount += 1;
    }
    result.set(key, current);
  }
  return Array.from(result.values()).sort(
    (a, b) =>
      b.verifiedSourceCount - a.verifiedSourceCount ||
      b.catalogCount - a.catalogCount ||
      a.name.localeCompare(b.name, "zh-CN"),
  );
}

function buildSupplierOrganizations(
  suppliers: Array<{ id: string; name: string }>,
  sources: RegisteredSourceRow[],
) {
  return suppliers.map<CollectionOrganization>((supplier) => {
    const matching = sources.filter((source) => {
      const ownerId = String(source.config?.sourceOwnerId ?? "");
      const ownerName = normalizeSubjectName(source.config?.sourceOwnerName ?? source.config?.supplierName);
      return ownerId === supplier.id || ownerName === normalizeSubjectName(supplier.name);
    });
    const brand = String(matching[0]?.config?.canonicalBrand ?? matching[0]?.config?.brand ?? "");
    return {
      id: supplier.id,
      name: supplier.name,
      brand,
      catalogCount: 0,
      sourceCount: matching.length,
      verifiedSourceCount: matching.filter((source) => source.is_active && source.last_checked_at && !source.last_error).length,
      status: "verified",
    };
  });
}

function sourceMatchesSubject(
  row: RegisteredSourceRow,
  kind: "manufacturer" | "supplier",
  subjectId: string,
  subjectName: string,
  brand: string,
) {
  const configuredId = String(row.config?.sourceOwnerId ?? "");
  const configuredKind = String(row.config?.sourceOwnerType ?? "");
  if (configuredId) return configuredId === subjectId && (!configuredKind || configuredKind === kind);

  const configuredBrand = normalizeSubjectName(row.config?.canonicalBrand ?? row.config?.brand);
  const configuredSupplier = normalizeSubjectName(row.config?.supplierName);
  return kind === "manufacturer"
    ? Boolean(configuredBrand && configuredBrand === normalizeSubjectName(brand))
    : Boolean(configuredSupplier && configuredSupplier === normalizeSubjectName(subjectName));
}

function mapRegisteredSource(row: RegisteredSourceRow): EquipmentDataSource {
  const score = Number(row.quality_score ?? 60);
  const verified = Boolean(row.is_active && row.last_checked_at && !row.last_error);
  return {
    id: row.id,
    name: row.name || "未命名来源",
    type: sourceCatalogType(row),
    supplierName: String(row.config?.supplierName ?? row.name ?? "待识别供应商"),
    brand: String(row.config?.brand ?? row.name ?? "待识别品牌"),
    url: row.base_url || "",
    equipmentCategories: [String(row.config?.equipmentCategory ?? "全部设备")],
    healthStatus: verified ? "healthy" : row.last_error && row.last_error !== "等待来源验证" ? "failed" : "warning",
    lastCollectedAt: row.last_checked_at || "尚未验证",
    failureCount: row.last_error && row.last_error !== "等待来源验证" ? 1 : 0,
    confidenceLevel: score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "E",
    normalCount: verified ? 1 : 0,
    abnormalCount: row.last_error && row.last_error !== "等待来源验证" ? 1 : 0,
  };
}

type ValidationErrors = Partial<Record<keyof EquipmentCatalogCollectionDraft | "sources" | "methods", string>>;

function newTaskCode() {
  const now = new Date();
  return `COLL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1.5 text-[12px] font-medium text-textMain"><span>{label}{required ? <b className="ml-0.5 text-danger">*</b> : null}</span>{children}{error ? <span className="block text-[10px] font-normal text-danger">{error}</span> : null}</label>;
}

function SectionTitle({ icon, title, description, tone = "blue" }: { icon: typeof Database; title: string; description: string; tone?: "blue" | "purple" | "green" | "orange" }) {
  return <div className="flex items-center gap-3 border-b border-borderSoft px-5 py-4"><IconBox icon={icon} tone={tone} size="md" /><div><h2 className="text-[15px] font-semibold">{title}</h2><p className="mt-0.5 text-[11px] text-textMuted">{description}</p></div></div>;
}

function ToggleRow({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  return <label className={cn("flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition", checked ? "border-primary/25 bg-primary-soft/45" : "border-borderSoft bg-white")}><span className="min-w-0"><span className="block text-[12px] font-medium">{label}</span>{hint ? <span className="mt-0.5 block text-[10px] text-textMuted">{hint}</span> : null}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
}

function TargetOverview({ draft, sourceCount }: { draft: EquipmentCatalogCollectionDraft; sourceCount: number }) {
  const series = draft.productSeries.length ? draft.productSeries.join("、") : "待配置";
  const parameterCount = draft.parameterFields.length || (equipmentParameterTemplates[draft.equipmentCategory] ?? []).length;
  const cards = [
    { icon: FileSearch, label: "设备类型", value: draft.equipmentCategory || "待选择", tone: "border-primary/15 bg-primary-soft/45 text-primary" },
    { icon: ListChecks, label: "系列范围", value: series, tone: "border-success/15 bg-success-soft/45 text-success" },
    { icon: Database, label: "预计型号数量", value: sourceCount ? "约 1,200 - 1,800 个" : "待选择数据源", tone: "border-ai/15 bg-ai-soft/45 text-ai" },
    { icon: Tag, label: "关键参数项", value: `${parameterCount} 项`, tone: "border-warning/20 bg-warning-soft/55 text-warning" },
    { icon: Activity, label: "预计资料量", value: sourceCount ? "300 - 500 MB" : "待评估", tone: "border-primary/15 bg-sky-50 text-primary" },
  ];

  return <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card"><h2 className="text-[14px] font-semibold text-textMain">采集目标概览</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ icon: Icon, label, value, tone }) => <article key={label} className={cn("min-w-0 rounded-lg border px-3 py-3", tone)}><div className="flex items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/85 shadow-sm"><Icon className="size-4" /></span><div className="min-w-0"><p className="text-[10px] font-medium opacity-80">{label}</p><p className="mt-1 truncate text-[11px] font-semibold text-textMain" title={value}>{value}</p></div></div></article>)}</div></section>;
}

export function CreateCollectionTaskWizard() {
  const router = useRouter();
  const [experienceMode, setExperienceMode] = useState<"quick" | "advanced">("quick");
  const [scopePreset, setScopePreset] = useState<CollectionScopePreset>("all");
  const [organizationKind, setOrganizationKind] = useState<"manufacturer" | "supplier">("manufacturer");
  const [organizationKey, setOrganizationKey] = useState("");
  const [enabledQuickSourceTypes, setEnabledQuickSourceTypes] = useState<string[]>(quickSourceTypes.map((item) => item.type));
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [invalidSteps, setInvalidSteps] = useState<number[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [draft, setDraft] = useState<EquipmentCatalogCollectionDraft>(() => ({
    ...defaultEquipmentCatalogCollectionDraft,
    taskCode: newTaskCode(),
    equipmentCategory: "全部设备",
    description: "全量采集 Grundfos 厂家及授权供应商公开的全部设备系列、型号、技术参数、产品样本与可核验来源。",
    collectionScope: "全部设备、全部系列、全部可识别型号",
    selectedDataSourceIds: [],
    selectedCollectionMethodIds: ["MTH-001", "MTH-002", "MTH-003", "MTH-006"],
    maxPages: 5000,
    maxPdfFiles: 2000,
  }));
  const [sources, setSources] = useState<EquipmentDataSource[]>([]);
  const [registeredSourceRows, setRegisteredSourceRows] = useState<RegisteredSourceRow[]>([]);
  const [manufacturerOrganizations, setManufacturerOrganizations] = useState<CollectionOrganization[]>([]);
  const [supplierOrganizations, setSupplierOrganizations] = useState<CollectionOrganization[]>([]);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [sourceError, setSourceError] = useState("");
  const [canManageSources, setCanManageSources] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isBindingSources, setIsBindingSources] = useState(false);
  const [methods, setMethods] = useState<CollectionMethod[]>([]);
  const [drawer, setDrawer] = useState<"source" | "method" | null>(null);
  const [apiCredentialOpen, setApiCredentialOpen] = useState(false);
  const [manufacturerDrawerOpen, setManufacturerDrawerOpen] = useState(false);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const selectedSources = useMemo(() => sources.filter((item) => draft.selectedDataSourceIds.includes(item.id)), [draft.selectedDataSourceIds, sources]);
  const selectedMethods = useMemo(() => methods.filter((item) => draft.selectedCollectionMethodIds.includes(item.id)), [draft.selectedCollectionMethodIds, methods]);
  const activeOrganizations = organizationKind === "manufacturer" ? manufacturerOrganizations : supplierOrganizations;
  const matchingRegisteredRows = useMemo(() => registeredSourceRows.filter((row) => sourceMatchesSubject(
    row,
    organizationKind,
    draft.manufacturerId,
    draft.manufacturerName,
    draft.brand,
  )), [draft.brand, draft.manufacturerId, draft.manufacturerName, organizationKind, registeredSourceRows]);
  const matchingSourceIds = useMemo(() => new Set(matchingRegisteredRows.map((row) => row.id)), [matchingRegisteredRows]);
  const subjectSources = useMemo(() => sources.filter((source) => matchingSourceIds.has(source.id)), [matchingSourceIds, sources]);
  const legacyMatchedCount = useMemo(() => matchingRegisteredRows.filter((row) => !row.config?.sourceOwnerId).length, [matchingRegisteredRows]);
  const recommendedSourceIds = useMemo(() => subjectSources.filter((source) => source.equipmentCategories.some((item) => draft.equipmentCategory === "全部设备" || item.includes(draft.equipmentCategory))).map((source) => source.id), [draft.equipmentCategory, subjectSources]);
  const recommendedMethodIds = useMemo(() => methods.filter((method) => selectedSources.some((source) => method.applicableSourceTypes.includes(source.type))).map((method) => method.id), [methods, selectedSources]);
  const parameterTemplate = equipmentParameterTemplates[draft.equipmentCategory] ?? equipmentParameterTemplates.辅助设备;

  const loadRegisteredSources = useCallback(async (silent = false, preferredBrand = "") => {
    if (!silent) setSourceLoading(true);
    try {
      const [response, methodResponse, catalogResponse, manufacturerResponse] = await Promise.all([
        fetch("/api/price-collection/sources", { cache: "no-store" }),
        fetch("/api/price-collection/methods", { cache: "no-store" }),
        fetch("/api/equipment-catalog?page=1&pageSize=1", { cache: "no-store" }),
        fetch("/api/equipment-catalog/manufacturers", { cache: "no-store" }),
      ]);
      const payload = await response.json().catch(() => ({})) as { sources?: RegisteredSourceRow[]; canManage?: boolean; error?: string };
      const methodPayload = await methodResponse.json().catch(() => ({})) as { methods?: EquipmentCollectionMethodRecord[]; error?: string };
      const catalogPayload = await catalogResponse.json().catch(() => ({})) as {
        facets?: {
          manufacturers?: CatalogManufacturerFacet[];
          suppliers?: Array<{ id: string; name: string }>;
        };
        error?: string;
      };
      const manufacturerPayload = await manufacturerResponse.json().catch(() => ({})) as { manufacturers?: ManufacturerMasterRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "数据源读取失败");
      if (!methodResponse.ok) throw new Error(methodPayload.error || "采集方式读取失败");
      if (!catalogResponse.ok) throw new Error(catalogPayload.error || "厂家主体读取失败");
      if (!manufacturerResponse.ok) throw new Error(manufacturerPayload.error || "厂家主数据读取失败");
      const rows = payload.sources ?? [];
      const realManufacturers = buildManufacturerOrganizations(catalogPayload.facets?.manufacturers ?? [], rows, manufacturerPayload.manufacturers ?? []);
      const realSuppliers = buildSupplierOrganizations(catalogPayload.facets?.suppliers ?? [], rows);
      const realMethods = (methodPayload.methods ?? []).map<CollectionMethod>((method) => ({
        id: method.id,
        name: method.name,
        applicableSourceTypes: method.applicableSourceTypes,
        parseTarget: method.parseTarget,
        aiEnabled: method.aiEnabled,
        dedupeEnabled: method.dedupeEnabled,
        standardizationEnabled: method.standardizationEnabled,
        retryEnabled: method.retryEnabled,
        maxRetry: method.maxRetry,
        reviewRequired: method.reviewRequired,
        scheduled: method.scheduled,
        taskCount: 0,
      }));
      setRegisteredSourceRows(rows);
      setManufacturerOrganizations(realManufacturers);
      setSupplierOrganizations(realSuppliers);
      setSources(rows.map(mapRegisteredSource));
      setMethods(realMethods);
      setCanManageSources(Boolean(payload.canManage));
      setSourceError("");
      const initialOrganization = realManufacturers.find(
        (item) => normalizeSubjectName(item.brand) === normalizeSubjectName(preferredBrand || defaultEquipmentCatalogCollectionDraft.brand),
      ) ?? realManufacturers[0];
      setOrganizationKey(initialOrganization?.id ?? "");
      setDraft((current) => {
        const selectedOrganization = initialOrganization;
        const matchingIds = rows.filter((row) => {
          const brand = String(row.config?.canonicalBrand ?? row.config?.brand ?? "");
          const supplier = String(row.config?.supplierName ?? "");
          return selectedOrganization && (
            normalizeSubjectName(brand) === normalizeSubjectName(selectedOrganization.brand) ||
            normalizeSubjectName(supplier) === normalizeSubjectName(selectedOrganization.name)
          );
        }).map((row) => row.id);
        return {
          ...current,
          manufacturerId: selectedOrganization?.id ?? "",
          manufacturerName: selectedOrganization?.name ?? "",
          brand: selectedOrganization?.brand ?? "",
          taskName: selectedOrganization ? `${selectedOrganization.name} 全量设备资料采集` : current.taskName,
          description: selectedOrganization ? `全量采集 ${selectedOrganization.name} 的全部设备系列、型号、技术参数、产品样本、目录文件与可核验来源。` : current.description,
          selectedDataSourceIds: matchingIds,
          selectedCollectionMethodIds: realMethods.map((method) => method.id),
        };
      });
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "数据源读取失败");
      setRegisteredSourceRows([]);
      setSources([]);
    } finally {
      setSourceLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRegisteredSources(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRegisteredSources]);

  const verifiedRows = useMemo(() => matchingRegisteredRows.filter((row) => row.is_active && row.last_checked_at && !row.last_error), [matchingRegisteredRows]);
  const pendingValidationRows = useMemo(() => matchingRegisteredRows.filter((row) => !row.is_active || !row.last_checked_at || Boolean(row.last_error)), [matchingRegisteredRows]);

  const update = <K extends keyof EquipmentCatalogCollectionDraft>(key: K, value: EquipmentCatalogCollectionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const selectManufacturer = (id: string) => {
    const manufacturer = manufacturerOrganizations.find((item) => item.id === id);
    const brand = manufacturer?.brand ?? "";
    setDraft((current) => ({
      ...current,
      manufacturerId: id,
      manufacturerName: manufacturer?.name ?? "",
      brand,
      taskName: current.taskName || (manufacturer ? `${manufacturer.name} 设备产品资料采集` : ""),
      selectedDataSourceIds: registeredSourceRows.filter((row) => sourceMatchesSubject(row, "manufacturer", id, manufacturer?.name ?? "", brand)).map((row) => row.id),
    }));
    setErrors((current) => ({ ...current, manufacturerId: undefined }));
  };

  const configureQuickOrganization = (kind: "manufacturer" | "supplier", id: string, enabledTypes = enabledQuickSourceTypes) => {
    const organizations = kind === "manufacturer" ? manufacturerOrganizations : supplierOrganizations;
    const organization = organizations.find((item) => item.id === id) ?? organizations[0];
    if (!organization) return;
    const matchedIds = new Set(registeredSourceRows.filter((row) => sourceMatchesSubject(row, kind, organization.id, organization.name, organization.brand)).map((row) => row.id));
    const registeredSources = sources.filter((source) => matchedIds.has(source.id) && enabledTypes.includes(source.type));
    const selectedMethodIds = new Set<string>();
    if (enabledTypes.includes("manufacturer_site") || enabledTypes.includes("supplier_site")) selectedMethodIds.add("MTH-001");
    if (enabledTypes.includes("pdf_datasheet")) selectedMethodIds.add("MTH-002");
    if (enabledTypes.includes("product_catalog")) selectedMethodIds.add("MTH-003");
    if (enabledTypes.includes("api")) selectedMethodIds.add("MTH-006");
    const allParameterFields = Array.from(new Set(Object.values(equipmentParameterTemplates).flat()));
    const waterTreatmentOnly = scopePreset === "water_treatment";

    setOrganizationKind(kind);
    setOrganizationKey(organization.id);
    setDraft((current) => ({
      ...current,
      taskName: `${organization.name} ${waterTreatmentOnly ? "水处理设备定向" : "全量设备"}资料采集`,
      manufacturerId: organization.id,
      manufacturerName: organization.name,
      brand: organization.brand,
      equipmentCategory: waterTreatmentOnly ? "水处理相关设备" : "全部设备",
      description: waterTreatmentOnly
        ? `定向采集 ${organization.name} 与水厂、污水厂和水处理工艺相关的设备系列、技术参数、产品样本与来源证据。`
        : `全量采集 ${organization.name} 的全部设备系列、型号、技术参数、产品样本、目录文件与可核验来源。`,
      tags: Array.from(new Set([organization.brand, kind === "manufacturer" ? "厂家采集" : "供应商采集", waterTreatmentOnly ? "水处理定向" : "全设备"])),
      selectedDataSourceIds: registeredSources.map((source) => source.id),
      selectedCollectionMethodIds: Array.from(selectedMethodIds),
      collectionScope: waterTreatmentOnly ? "仅限水厂、污水厂、供排水、污泥、加药与水处理工艺相关设备" : "全部设备、全部系列、全部可识别型号",
      productSeries: [],
      modelKeywords: [],
      equipmentTypeKeywords: waterTreatmentOnly ? waterTreatmentScopeKeywords : [],
      parameterFields: allParameterFields,
      maxPages: 5000,
      maxPdfFiles: 2000,
      autoReviewRequired: true,
      duplicateDetection: true,
      riskDetection: true,
    }));
    setErrors({});
  };

  const applyScopePreset = (preset: CollectionScopePreset) => {
    setScopePreset(preset);
    const waterTreatmentOnly = preset === "water_treatment";
    const allParameterFields = Array.from(new Set(Object.values(equipmentParameterTemplates).flat()));
    setDraft((current) => ({
      ...current,
      taskName: `${current.manufacturerName} ${waterTreatmentOnly ? "水处理设备定向" : "全量设备"}资料采集`,
      equipmentCategory: waterTreatmentOnly ? "水处理相关设备" : "全部设备",
      description: waterTreatmentOnly
        ? `定向采集 ${current.manufacturerName} 与水厂、污水厂和水处理工艺相关的设备系列、技术参数、产品样本与来源证据。`
        : `全量采集 ${current.manufacturerName} 的全部设备系列、型号、技术参数、产品样本、目录文件与可核验来源。`,
      collectionScope: waterTreatmentOnly ? "仅限水厂、污水厂、供排水、污泥、加药与水处理工艺相关设备" : "全部设备、全部系列、全部可识别型号",
      equipmentTypeKeywords: waterTreatmentOnly ? waterTreatmentScopeKeywords : [],
      tags: Array.from(new Set([current.brand, waterTreatmentOnly ? "水处理定向" : "全设备"])).filter(Boolean),
      parameterFields: allParameterFields,
    }));
  };

  const toggleQuickSourceType = (type: string) => {
    const nextTypes = enabledQuickSourceTypes.includes(type) ? enabledQuickSourceTypes.filter((item) => item !== type) : [...enabledQuickSourceTypes, type];
    if (!nextTypes.length) return emitMockToast({ title: "至少保留一种采集来源", description: "建议保留厂家官网或产品目录。", tone: "warning" });
    setEnabledQuickSourceTypes(nextTypes);
    configureQuickOrganization(organizationKind, organizationKey, nextTypes);
  };

  const bindLegacySources = async () => {
    const legacyRows = matchingRegisteredRows.filter((row) => !row.config?.sourceOwnerId);
    if (!legacyRows.length) return;
    setIsBindingSources(true);
    try {
      const results = await Promise.all(legacyRows.map(async (row) => {
        const response = await fetch("/api/price-collection/sources", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: row.id,
            action: "bind_subject",
            sourceOwnerType: organizationKind,
            sourceOwnerId: draft.manufacturerId,
            sourceOwnerName: draft.manufacturerName,
            canonicalBrand: draft.brand,
          }),
        });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error || `${row.name || "数据源"}绑定失败`);
        return row.id;
      }));
      await loadRegisteredSources(true);
      emitMockToast({ title: "来源主体已绑定", description: `已将 ${results.length} 个历史来源绑定到 ${draft.manufacturerName}。`, tone: "success" });
    } catch (error) {
      emitMockToast({ title: "来源主体绑定失败", description: error instanceof Error ? error.message : "请稍后重试。", tone: "danger" });
    } finally {
      setIsBindingSources(false);
    }
  };

  const selectCategory = (category: string) => {
    setDraft((current) => ({ ...current, equipmentCategory: category, parameterFields: [...(equipmentParameterTemplates[category] ?? [])] }));
    setErrors((current) => ({ ...current, equipmentCategory: undefined }));
  };

  const validateStep = (step: number) => {
    const next: ValidationErrors = {};
    if (step === 1) {
      if (!draft.taskName.trim()) next.taskName = "请填写任务名称";
      if (!draft.manufacturerId) next.manufacturerId = "请选择品牌 / 厂家";
      if (!draft.equipmentCategory) next.equipmentCategory = "请选择设备类别";
      if (!draft.description.trim()) next.description = "请填写任务描述";
    }
    if (step === 2 && !draft.selectedDataSourceIds.length) next.sources = "至少选择 1 个数据源";
    if (step === 3 && !draft.selectedCollectionMethodIds.length) next.methods = "至少选择 1 个采集方式";
    if (step === 4) {
      if (!draft.collectionScope.trim()) next.collectionScope = "请填写采集范围";
      if (draft.maxPages <= 0) next.maxPages = "最大采集页面数必须大于 0";
      if (draft.maxPdfFiles <= 0) next.maxPdfFiles = "最大 PDF 文件数必须大于 0";
    }
    if (step === 5 && (draft.confidenceThreshold < 0 || draft.confidenceThreshold > 1)) next.confidenceThreshold = "可信度阈值必须在 0-1 之间";
    setErrors((current) => ({ ...current, ...next }));
    const valid = !Object.keys(next).length;
    setInvalidSteps((items) => valid ? items.filter((item) => item !== step) : Array.from(new Set([...items, step])));
    if (valid) setCompletedSteps((items) => Array.from(new Set([...items, step])));
    return valid;
  };

  const goToStep = (step: number) => {
    if (step > currentStep && !validateStep(currentStep)) {
      emitMockToast({ title: "当前步骤尚未完成", description: "请先处理橙色提示字段。", tone: "warning" });
      return;
    }
    setCurrentStep(step);
  };

  const next = () => {
    if (!validateStep(currentStep)) return emitMockToast({ title: "请补全当前步骤", description: "必填项通过校验后才能继续。", tone: "warning" });
    setCurrentStep((step) => Math.min(6, step + 1));
  };

  const validateRegisteredSource = async (id: string) => {
    setTestingSourceId(id);
    try {
      const response = await fetch("/api/price-collection/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "validate" }),
      });
      const payload = await response.json().catch(() => ({})) as { source?: RegisteredSourceRow; error?: string };
      if (!response.ok || !payload.source) throw new Error(payload.error || "来源验证失败");
      await loadRegisteredSources(true);
      emitMockToast({ title: "来源验证通过", description: payload.source.name || "该来源已可用于采集任务。", tone: "success" });
      return true;
    } catch (error) {
      await loadRegisteredSources(true);
      emitMockToast({ title: "来源验证未通过", description: error instanceof Error ? error.message : "请检查地址与访问策略。", tone: "warning" });
      return false;
    } finally {
      setTestingSourceId(null);
    }
  };

  const discoverAndValidateSources = async () => {
    if (!canManageSources) return emitMockToast({ title: "没有数据源管理权限", description: "请联系管理员登记或验证来源。", tone: "warning" });
    if (!pendingValidationRows.length) {
      await loadRegisteredSources();
      return emitMockToast({ title: verifiedRows.length ? "来源状态已刷新" : "尚无可验证来源", description: verifiedRows.length ? "已同步最新验证状态。" : "请先登记一个厂家官网、供应商网站、目录或 API 入口。", tone: verifiedRows.length ? "success" : "warning" });
    }
    setIsDiscovering(true);
    try {
      const response = await fetch("/api/price-collection/source-validation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: pendingValidationRows.map((row) => row.id) }),
      });
      const payload = await response.json().catch(() => ({})) as { queued?: number; skipped?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "验证任务创建失败");
      emitMockToast({ title: "来源验证已进入后台队列", description: `新增 ${payload.queued ?? 0} 个验证任务，跳过 ${payload.skipped ?? 0} 个正在处理的来源。`, tone: "success" });
      for (const delay of [1200, 1800, 2500]) {
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        await loadRegisteredSources(true);
      }
    } catch (error) {
      emitMockToast({ title: "来源验证失败", description: error instanceof Error ? error.message : "请稍后重试。", tone: "danger" });
    } finally {
      setIsDiscovering(false);
    }
  };

  const createTask = async () => {
    if (experienceMode === "advanced") {
      const invalid = [1, 2, 3, 4, 5].filter((step) => !validateStep(step));
      if (invalid.length) {
        setCurrentStep(invalid[0]);
        return emitMockToast({ title: "任务配置未通过校验", description: `请先完成第 ${invalid[0]} 步。`, tone: "warning" });
      }
    }
    const enabledVerifiedRows = verifiedRows.filter((row) => experienceMode === "advanced"
      ? draft.selectedDataSourceIds.includes(row.id)
      : enabledQuickSourceTypes.includes(sourceCatalogType(row)));
    if (!enabledVerifiedRows.length) return emitMockToast({ title: "缺少已验证起始来源", description: "至少登记并验证一个真实来源后，才能创建全量采集任务。", tone: "warning" });

    setIsCreating(true);
    try {
      const hasWebSource = enabledVerifiedRows.some((row) => row.source_kind !== "api");
      const response = await fetch("/api/price-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_task",
          targetType: "equipment",
          keyword: draft.taskName || `${draft.manufacturerName} 全量设备资料采集`,
          specification: draft.collectionScope,
          region: "全球",
          currency: "CNY",
          sourceType: enabledVerifiedRows.length > 1 ? "all" : sourceCatalogType(enabledVerifiedRows[0]),
          collectionMode: hasWebSource ? "web" : "api",
          sourceIds: enabledVerifiedRows.map((row) => row.id),
          frequency: draft.frequency,
          config: {
            workflow: "equipment_catalog_full_collection",
            taskName: draft.taskName,
            organizationKind,
            organizationName: draft.manufacturerName,
            brand: draft.brand,
            equipmentCategory: draft.equipmentCategory,
            enabledSourceTypes: enabledQuickSourceTypes,
            discoverMissingSources: true,
            collectAllEquipment: scopePreset === "all",
            scopePreset,
            includeKeywords: scopePreset === "water_treatment" ? waterTreatmentScopeKeywords : [],
            equipmentTypeKeywords: draft.equipmentTypeKeywords,
            maxPages: draft.maxPages,
            maxPdfFiles: draft.maxPdfFiles,
            pagesPerRun: 40,
            pdfsPerRun: 80,
            selectedCollectionMethodIds: draft.selectedCollectionMethodIds,
            requiresHumanReview: true,
            aiFinalDecision: false,
          },
        }),
      });
      const payload = await response.json().catch(() => ({})) as { task?: PriceCollectionTaskRecord; error?: string };
      if (!payload.task) throw new Error(payload.error || "采集任务创建失败");
      emitMockToast({
        title: response.ok ? "全量采集任务已创建" : "任务已登记，首次执行待恢复",
        description: response.ok ? `${payload.task.taskCode} 已进入真实采集队列。` : payload.error || "执行网关暂不可用，可在采集中心重试。",
        tone: response.ok ? "success" : "warning",
      });
      router.push(`/equipment-catalog/collection?created=1&taskId=${encodeURIComponent(payload.task.id)}`);
    } catch (error) {
      emitMockToast({ title: "采集任务创建失败", description: error instanceof Error ? error.message : "请检查来源状态和当前权限。", tone: "danger" });
    } finally {
      setIsCreating(false);
    }
  };

  const saveRegisteredSource = async (source: EquipmentDataSource) => {
    try {
      const response = await fetch("/api/price-collection/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceKind: source.type === "api" ? "api" : "web",
          catalogSourceType: source.type,
          sourceCode: `EC_${Date.now().toString(36).toUpperCase()}`,
          name: source.name,
          baseUrl: source.url,
          extractionStrategy: source.type === "api" ? "json_api" : "structured_data",
          targetType: "equipment",
          brand: source.brand,
          supplierName: source.supplierName,
          sourceOwnerType: organizationKind,
          sourceOwnerId: draft.manufacturerId,
          sourceOwnerName: draft.manufacturerName,
          canonicalBrand: draft.brand,
          equipmentCategory: source.equipmentCategories[0] || "全部设备",
          qualityScore: 60,
          discoveryEnabled: source.type !== "api",
          maxDiscoveryDepth: 2,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { source?: RegisteredSourceRow; error?: string };
      if (!response.ok || !payload.source) throw new Error(payload.error || "数据源登记失败");
      const validated = await validateRegisteredSource(payload.source.id);
      if (!validated) {
        emitMockToast({ title: "数据源已登记，等待修正", description: "记录已写入 Supabase，但连接验证未通过。", tone: "warning" });
      }
      return true;
    } catch (error) {
      emitMockToast({ title: "数据源登记失败", description: error instanceof Error ? error.message : "请检查地址、编码和当前权限。", tone: "danger" });
      return false;
    }
  };

  const saveCollectionMethod = async (method: CollectionMethod) => {
    try {
      const response = await fetch("/api/price-collection/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(method),
      });
      const payload = await response.json().catch(() => ({})) as { method?: EquipmentCollectionMethodRecord; error?: string };
      if (!response.ok || !payload.method) throw new Error(payload.error || "采集方式创建失败");
      const saved: CollectionMethod = {
        id: payload.method.id,
        name: payload.method.name,
        applicableSourceTypes: payload.method.applicableSourceTypes,
        parseTarget: payload.method.parseTarget,
        aiEnabled: payload.method.aiEnabled,
        dedupeEnabled: payload.method.dedupeEnabled,
        standardizationEnabled: payload.method.standardizationEnabled,
        retryEnabled: payload.method.retryEnabled,
        maxRetry: payload.method.maxRetry,
        reviewRequired: payload.method.reviewRequired,
        scheduled: payload.method.scheduled,
        taskCount: 0,
      };
      setMethods((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      update("selectedCollectionMethodIds", Array.from(new Set([...draft.selectedCollectionMethodIds, saved.id])));
      emitMockToast({ title: "采集方式已保存", description: `${saved.name} 已写入 Supabase。`, tone: "success" });
      return true;
    } catch (error) {
      emitMockToast({ title: "采集方式保存失败", description: error instanceof Error ? error.message : "请检查当前权限。", tone: "danger" });
      return false;
    }
  };

  const toggleId = (key: "selectedDataSourceIds" | "selectedCollectionMethodIds", id: string) => update(key, draft[key].includes(id) ? draft[key].filter((item) => item !== id) : [...draft[key], id]);
  const toggleText = (key: "parameterFields" | "standardizationRules" | "languages", value: string) => update(key, draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value]);

  const renderQuickMode = () => <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    <main className="min-w-0 space-y-4">
      <section className="rounded-card border border-borderSoft bg-white p-5 shadow-card">
        <div className="flex items-start gap-3"><IconBox icon={Building2} tone="blue" size="md" /><div><h2 className="text-[15px] font-semibold">1. 选择采集对象</h2><p className="mt-0.5 text-[11px] text-textMuted">只需选择一家厂家或供应商，系统默认采集其全部设备资料。</p></div></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Field label="采集主体类型"><div className="grid grid-cols-2 rounded-md border border-borderSoft bg-slate-50 p-1">{(["manufacturer", "supplier"] as const).map((kind) => <button key={kind} type="button" title={kind === "manufacturer" ? "生产制造设备并发布官方产品资料的主体" : "代理、经销或集成设备并承担实际供货的主体"} onClick={() => { const list = kind === "manufacturer" ? manufacturerOrganizations : supplierOrganizations; if (list[0]) configureQuickOrganization(kind, list[0].id); else emitMockToast({ title: "暂无可用主体", description: kind === "manufacturer" ? "请先在正式资料库登记厂家档案或绑定采集来源。" : "请先在供应商库登记供应商。", tone: "warning" }); }} className={cn("h-8 rounded text-[11px] font-medium transition", organizationKind === kind ? "bg-white text-primary shadow-sm" : "text-textMuted hover:text-textMain")}>{kind === "manufacturer" ? "厂家 / 品牌" : "供应商 / 代理"}</button>)}</div></Field>
          <Field label={organizationKind === "manufacturer" ? "选择厂家 / 品牌" : "选择供应商"} required>
            <div className="flex min-w-0 gap-2"><select value={organizationKey} onChange={(event) => configureQuickOrganization(organizationKind, event.target.value)} disabled={sourceLoading || !activeOrganizations.length} className={inputClass}>
              {!activeOrganizations.length ? <option value="">{sourceLoading ? "正在读取主体主数据..." : "暂无已登记主体"}</option> : null}
              {activeOrganizations.map((item) => <option key={item.id} value={item.id}>{item.name}{item.brand && item.brand !== item.name ? ` · ${item.brand}` : ""} · 档案 {item.catalogCount} · 已验证来源 {item.verifiedSourceCount}/{item.sourceCount}{item.status === "pending" ? " · 待核验" : ""}</option>)}
            </select>{organizationKind === "manufacturer" ? <button type="button" onClick={() => setManufacturerDrawerOpen(true)} className={cn(outlineButton, "shrink-0 text-primary")}><Plus className="size-4" />新增厂家</button> : null}</div>
            <span className="block text-[10px] font-normal leading-4 text-textMuted">来自正式设备资料库、供应商库及已绑定采集源；选择后仅展示该主体的数据源。</span>
          </Field>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className={cn("rounded-lg border px-3 py-2.5", organizationKind === "manufacturer" ? "border-primary/25 bg-primary-soft/45" : "border-borderSoft bg-slate-50")}><p className="text-[11px] font-semibold text-textMain">厂家 / 品牌</p><p className="mt-1 text-[10px] leading-4 text-textMuted">设备生产制造主体。优先采集官方产品页、技术样本、PDF、选型资料和厂家 API。</p></div>
          <div className={cn("rounded-lg border px-3 py-2.5", organizationKind === "supplier" ? "border-success/25 bg-success-soft/45" : "border-borderSoft bg-slate-50")}><p className="text-[11px] font-semibold text-textMain">供应商 / 代理</p><p className="mt-1 text-[10px] leading-4 text-textMuted">实际供货或代理主体。重点采集代理目录、可供品牌、区域能力与供应商公开资料。</p></div>
        </div>
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary-soft/35 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-primary shadow-sm"><CheckCircle2 className="size-4" /></span><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-textMain">当前采集主体：{draft.manufacturerName} <span className="font-normal text-textMuted">· 主体编号 {draft.manufacturerId}</span></p><p className="mt-0.5 text-[10px] text-textMuted">数据源名称可以不同，但归属主体固定为当前选择；下方只统计并使用该主体的数据源。</p></div></div>
          <div className="flex shrink-0 items-center gap-2"><span className="rounded-pill border border-success/20 bg-success-soft px-2.5 py-1 text-[10px] font-semibold text-success">当前匹配 {matchingRegisteredRows.length} 个来源</span>{legacyMatchedCount ? <button type="button" onClick={() => void bindLegacySources()} disabled={isBindingSources || !canManageSources} className="inline-flex h-7 items-center gap-1 rounded-md border border-warning/30 bg-warning-soft px-2.5 text-[10px] font-semibold text-warning disabled:opacity-50">{isBindingSources ? <LoaderCircle className="size-3 animate-spin" /> : <Database className="size-3" />}绑定 {legacyMatchedCount} 个旧来源</button> : <span className="rounded-pill border border-success/20 bg-success-soft px-2.5 py-1 text-[10px] font-semibold text-success">主体关系已完整</span>}</div>
        </div>
        <div className="mt-4 rounded-lg border border-borderSoft bg-slate-50/70 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-semibold">设备范围</p><p className="mt-0.5 text-[10px] text-textMuted">行业预设会在产品详情层做准入判断，范围外页面只留跳过记录。</p></div><div className="grid grid-cols-2 rounded-md border border-borderSoft bg-white p-1"><button type="button" onClick={() => applyScopePreset("water_treatment")} className={cn("h-8 rounded px-3 text-[11px] font-medium", scopePreset === "water_treatment" ? "bg-primary text-white shadow-sm" : "text-textMuted hover:text-textMain")}>水处理相关</button><button type="button" onClick={() => applyScopePreset("all")} className={cn("h-8 rounded px-3 text-[11px] font-medium", scopePreset === "all" ? "bg-primary text-white shadow-sm" : "text-textMuted hover:text-textMain")}>全部设备</button></div></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-primary/15 bg-primary-soft/45 p-3"><p className="text-[10px] text-primary">采集范围</p><p className="mt-1 text-[12px] font-semibold">{scopePreset === "water_treatment" ? "水厂 / 污水厂 / 水处理" : "全部设备与全部系列"}</p></div>
          <div className="rounded-lg border border-success/15 bg-success-soft/45 p-3"><p className="text-[10px] text-success">资料类型</p><p className="mt-1 text-[12px] font-semibold">网页、PDF、目录、API</p></div>
          <div className="rounded-lg border border-ai/15 bg-ai-soft/45 p-3"><p className="text-[10px] text-ai">入库规则</p><p className="mt-1 text-[12px] font-semibold">AI解析后人工审核</p></div>
        </div>
      </section>

      <section className="rounded-card border border-borderSoft bg-white p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><IconBox icon={Network} tone="purple" size="md" /><div><h2 className="text-[15px] font-semibold">2. 来源覆盖与准入</h2><p className="mt-0.5 text-[11px] text-textMuted">不要求五类来源全部配置；至少一个真实来源验证通过后即可创建任务。</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void loadRegisteredSources()} disabled={sourceLoading} className={outlineButton}>{sourceLoading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}刷新状态</button><button type="button" onClick={() => void discoverAndValidateSources()} disabled={sourceLoading || isDiscovering} className={cn(primaryButton, "border-ai bg-ai hover:bg-ai/90")}>{isDiscovering ? <LoaderCircle className="size-4 animate-spin" /> : <Activity className="size-4" />}发现并验证数据源</button></div></div>
        {sourceError ? <div className="mt-3 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[10px] text-danger">真实数据源加载失败：{sourceError}</div> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{quickSourceTypes.map(({ type, label, description, icon: Icon, tone }) => {
          const selected = enabledQuickSourceTypes.includes(type);
          const typeRows = matchingRegisteredRows.filter((row) => sourceCatalogType(row) === type);
          const activeCount = typeRows.filter((row) => row.is_active && row.last_checked_at && !row.last_error).length;
          const hasFailure = typeRows.some((row) => !row.is_active && row.last_error && row.last_error !== "等待来源验证");
          const readiness: SourceReadiness = activeCount ? "verified" : type === "api" && !typeRows.length ? "authorization_required" : hasFailure ? "unavailable" : "discoverable";
          const meta = readinessMeta[readiness];
          return <button key={type} type="button" onClick={() => toggleQuickSourceType(type)} className={cn("min-w-0 rounded-lg border p-3 text-left transition", selected ? tone === "purple" ? "border-ai/30 bg-ai-soft/55" : tone === "green" ? "border-success/25 bg-success-soft/45" : tone === "orange" ? "border-warning/30 bg-warning-soft/55" : "border-primary/25 bg-primary-soft/45" : "border-borderSoft bg-white opacity-60 hover:opacity-100")}><div className="flex items-center justify-between"><span className="flex size-9 items-center justify-center rounded-md bg-white shadow-sm"><Icon className={cn("size-4", selected ? "text-primary" : "text-textMuted")} /></span><span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold", meta.className)}>{sourceLoading ? "读取中" : meta.label}</span></div><p className="mt-3 text-[12px] font-semibold">{label}</p><p className="mt-1 min-h-8 text-[10px] leading-4 text-textMuted">{description}</p><p className="mt-2 text-[9px] font-medium text-textMuted">{activeCount ? `${activeCount} 个真实入口可用` : typeRows.length ? `${typeRows.length} 个入口待处理` : type === "api" ? "凭证配置后可启用" : "运行时可继续发现"}</p></button>;
        })}</div>
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-borderSoft bg-slate-50/75 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-[11px] font-semibold">真实来源准入：{verifiedRows.length} 个已验证 · {pendingValidationRows.length} 个待处理</p><p className="mt-0.5 text-[10px] text-textMuted">官网通过后即可创建任务；产品页与 PDF 在受控域名内运行时发现，供应商网站和授权 API 为可选来源。</p></div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => setApiCredentialOpen(true)} disabled={!canManageSources || !draft.brand} className={cn(outlineButton, "border-warning/30 text-warning")}><KeyRound className="size-4" />配置 {draft.brand || "厂家"} API</button><button type="button" onClick={() => setDrawer("source")} disabled={!canManageSources} className={cn(outlineButton, "border-primary/25 text-primary")}><Plus className="size-4" />登记起始来源</button></div></div>
      </section>

      <section className="rounded-card border border-borderSoft bg-white p-5 shadow-card">
        <div className="flex items-start gap-3"><IconBox icon={Bot} tone="purple" size="md" /><div><h2 className="text-[15px] font-semibold">3. 系统自动处理</h2><p className="mt-0.5 text-[11px] text-textMuted">以下规则已经按全量采集场景预设，无需逐项配置。</p></div></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[["自动遍历设备目录", Globe2], ["PDF与网页AI解析", WandSparkles], ["型号去重与参数标准化", ListChecks], ["风险检测与人工审核", ShieldAlert]].map(([label, Icon]) => <div key={String(label)} className="flex items-center gap-2 rounded-lg border border-borderSoft bg-slate-50 px-3 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-ai shadow-sm"><Icon className="size-4" /></span><span className="text-[11px] font-medium">{String(label)}</span><CheckCircle2 className="ml-auto size-4 shrink-0 text-success" /></div>)}</div>
      </section>
    </main>

    <aside className="space-y-3 xl:sticky xl:top-20">
      <section className="rounded-card border border-primary/20 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary"><PackageSearch className="size-5" /></span><div className="min-w-0"><h2 className="truncate text-[15px] font-semibold">{scopePreset === "water_treatment" ? "水处理定向采集" : "全量采集任务"}</h2><p className="text-[10px] text-textMuted">{draft.manufacturerName}</p></div></div>
        <dl className="mt-4 divide-y divide-borderSoft">{[["采集对象", draft.manufacturerName], ["设备范围", scopePreset === "water_treatment" ? "水厂 / 污水厂 / 水处理" : "全部设备 / 全部系列"], ["已验证来源", `${verifiedRows.length} 个真实入口`], ["待发现类型", `${Math.max(0, enabledQuickSourceTypes.length - new Set(verifiedRows.map(sourceCatalogType)).size)} 类`], ["页面上限", `${draft.maxPages.toLocaleString()} 页`], ["PDF上限", `${draft.maxPdfFiles.toLocaleString()} 份`]].map(([label, value]) => <div key={label} className="grid grid-cols-[82px_minmax(0,1fr)] gap-2 py-2.5 text-[11px]"><dt className="text-textMuted">{label}</dt><dd className="break-words text-right font-semibold">{value}</dd></div>)}</dl>
        {enabledQuickSourceTypes.includes("api") ? <div className="mt-3 flex gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-[10px] leading-4 text-warning"><KeyRound className="mt-0.5 size-4 shrink-0" /><p>API 会先验证授权和调用额度；未通过时不影响官网、目录与 PDF 采集。</p></div> : null}
        {!sourceLoading && verifiedRows.length === 0 ? <div className="mt-3 rounded-lg border border-warning/25 bg-warning-soft p-3 text-[10px] leading-4 text-warning">创建按钮暂不可用：请先登记并验证至少一个真实来源。</div> : null}
        <button type="button" onClick={() => void createTask()} disabled={isCreating || sourceLoading || verifiedRows.length === 0} className={cn(aiButton, "mt-4 h-10 w-full")}>{isCreating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{scopePreset === "water_treatment" ? "创建水处理定向采集任务" : "创建全量采集任务"}</button>
        <button type="button" onClick={() => setExperienceMode("advanced")} className="mt-2 h-9 w-full rounded-md border border-borderSoft bg-white text-[11px] font-medium text-textMain hover:bg-slate-50"><Settings2 className="mr-1 inline size-3.5" />需要精细控制？进入高级自定义</button>
      </section>
      <section className="rounded-card border border-success/20 bg-success-soft/40 p-4"><div className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-success" /><div><p className="text-[11px] font-semibold text-success">创建后自动执行</p><p className="mt-1 text-[10px] leading-4 text-textMuted">发现来源 → 验证可用性 → 遍历设备 → 解析参数 → 去重 → 待人工审核。不会由 AI 直接确认资料合格。</p></div></div></section>
    </aside>
  </div>;

  const renderStep = () => {
    if (currentStep === 1) return <div className="space-y-3">
      <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
        <div className="border-b border-borderSoft px-5 py-4"><h2 className="text-[14px] font-semibold text-textMain">基本信息</h2></div>
        <div className="grid gap-x-8 gap-y-4 p-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <Field label="任务名称" required error={errors.taskName}><input value={draft.taskName} onChange={(e) => update("taskName", e.target.value)} className={inputClass} placeholder="例如 Grundfos 水泵产品资料采集" /></Field>
            <Field label="任务编号"><div className="relative"><input value={draft.taskCode} readOnly className={cn(inputClass, "bg-slate-50 pr-10")} /><button type="button" title="刷新编号" onClick={() => update("taskCode", newTaskCode())} className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md text-primary hover:bg-primary-soft"><RefreshCw className="size-4" /></button></div></Field>
            <Field label="品牌 / 厂家" required error={errors.manufacturerId}><select value={draft.manufacturerId} onChange={(e) => selectManufacturer(e.target.value)} className={inputClass}><option value="">请选择品牌 / 厂家</option>{manufacturerOrganizations.map((item) => <option key={item.id} value={item.id}>{item.name} · 档案 {item.catalogCount} · 来源 {item.verifiedSourceCount}/{item.sourceCount}</option>)}</select></Field>
            <Field label="设备类别" required error={errors.equipmentCategory}><select value={draft.equipmentCategory} onChange={(e) => selectCategory(e.target.value)} className={inputClass}><option value="">请选择设备类别</option><option value="全部设备">全部设备</option><option value="水处理相关设备">水处理相关设备</option>{waterPlantEquipmentTaxonomy.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="任务优先级"><select value={draft.priority} onChange={(e) => update("priority", e.target.value as typeof draft.priority)} className={inputClass}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field>
            <Field label="任务负责人"><select value={draft.owner} onChange={(e) => update("owner", e.target.value)} className={inputClass}><option>Admin</option><option>张工</option><option>李工</option><option>王工</option><option>采购情报组</option></select></Field>
          </div>
          <div className="min-w-0 space-y-4">
            <Field label="任务描述" required error={errors.description}><textarea value={draft.description} onChange={(e) => update("description", e.target.value)} className={cn(textareaClass, "min-h-[76px]")} placeholder="说明本次采集的业务目的、资料范围和人工复核要求" /></Field>
            <Field label="所属项目（可选）"><select value={draft.projectId} onChange={(e) => update("projectId", e.target.value)} className={inputClass}><option value="">请选择项目</option><option value="PRJ-KIN-001">Kinshasa 水厂扩建项目</option><option value="PRJ-JB-001">江北水厂提标改造项目</option></select></Field>
            <Field label="任务标签"><div className="flex min-h-10 min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-borderSoft bg-white px-2 py-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">{draft.tags.map((tag) => <button key={tag} type="button" title={`移除 ${tag}`} onClick={() => update("tags", draft.tags.filter((item) => item !== tag))} className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-[10px] font-medium text-primary"><span className="truncate">{tag}</span><span aria-hidden>×</span></button>)}<input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) { e.preventDefault(); update("tags", Array.from(new Set([...draft.tags, tagInput.trim()]))); setTagInput(""); } }} className="h-6 min-w-[92px] flex-1 bg-transparent px-1 text-[11px] outline-none" placeholder="+ 添加标签" /></div></Field>
            <Field label="预期完成时间"><input type="date" value={draft.expectedCompleteAt} onChange={(e) => update("expectedCompleteAt", e.target.value)} className={inputClass} /></Field>
            <Field label="任务备注"><textarea value={draft.notes} onChange={(e) => update("notes", e.target.value)} className={cn(textareaClass, "min-h-[70px]")} placeholder="请输入备注信息..." /></Field>
          </div>
        </div>
      </section>
      <TargetOverview draft={draft} sourceCount={selectedSources.length} />
    </div>;

    if (currentStep === 2) return <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><SectionTitle icon={Database} title="2. 数据源选择" description={`仅显示归属于 ${draft.manufacturerName} 的数据源；创建任务至少需要一个验证通过的来源。`} /><div className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[12px] font-semibold">当前主体数据源 <span className="text-primary">{subjectSources.length}</span></p><p className="text-[10px] text-textMuted">主体编号 {draft.manufacturerId}，不会混入其他厂家或供应商来源</p></div><button type="button" onClick={() => setDrawer("source")} disabled={!canManageSources} className={outlineButton}><Plus className="size-4" />新增数据源</button></div>{errors.sources ? <p className="mb-3 rounded-md bg-warning-soft px-3 py-2 text-[11px] text-warning">{errors.sources}</p> : null}{subjectSources.length === 0 && !sourceLoading ? <div className="rounded-lg border border-warning/25 bg-warning-soft p-4 text-[11px] text-warning">当前主体尚无真实数据源，请为 {draft.manufacturerName} 登记并验证一个起始来源。</div> : <div className="grid gap-3 lg:grid-cols-2">{subjectSources.map((source) => { const selected = draft.selectedDataSourceIds.includes(source.id); const recommended = recommendedSourceIds.includes(source.id); return <article key={source.id} className={cn("rounded-card border p-4 transition", selected ? "border-primary/35 bg-primary-soft/45 ring-1 ring-primary/10" : "border-borderSoft bg-white hover:border-primary/25")}><div className="flex items-start gap-3"><input type="checkbox" checked={selected} onChange={() => toggleId("selectedDataSourceIds", source.id)} className="mt-1" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="truncate text-[12px] font-semibold">{source.name}</h3>{recommended ? <span className="rounded bg-ai-soft px-1.5 py-0.5 text-[10px] text-ai">推荐</span> : null}<span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] text-primary">归属：{draft.manufacturerName}</span><span className={cn("rounded px-1.5 py-0.5 text-[10px]", source.healthStatus === "healthy" ? "bg-success-soft text-success" : source.healthStatus === "failed" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning")}>{source.healthStatus === "healthy" ? "已验证" : source.healthStatus === "failed" ? "不可用" : "待验证"}</span></div><p className="mt-1 text-[10px] text-textMuted">{sourceTypeLabels[source.type] || source.type} · 规范品牌 {draft.brand} · 可信度 {source.confidenceLevel}</p><p className="mt-2 truncate text-[10px] text-primary" title={source.url}>{source.url}</p><div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-textMuted">最近验证：{source.lastCollectedAt}</span><button type="button" disabled={testingSourceId === source.id || !canManageSources} onClick={() => void validateRegisteredSource(source.id)} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-white px-2 text-[10px] font-medium text-primary">{testingSourceId === source.id ? <LoaderCircle className="size-3 animate-spin" /> : <Activity className="size-3" />}真实验证</button></div></div></div></article>; })}</div>}</div></section>;

    if (currentStep === 3) return <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><SectionTitle icon={Bot} title="3. 采集方式配置" description="采集方式决定网页、PDF、Excel 或人工资料如何解析。" tone="purple" /><div className="p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-[12px] font-semibold">适配采集方式 <span className="text-ai">{recommendedMethodIds.length}</span></p><p className="text-[10px] text-textMuted">已根据所选数据源类型完成适配</p></div><button type="button" onClick={() => setDrawer("method")} className={outlineButton}><Plus className="size-4" />新增采集方式</button></div>{errors.methods ? <p className="mb-3 rounded-md bg-warning-soft px-3 py-2 text-[11px] text-warning">{errors.methods}</p> : null}<div className="grid gap-3 lg:grid-cols-2">{methods.map((method) => { const selected = draft.selectedCollectionMethodIds.includes(method.id); const recommended = recommendedMethodIds.includes(method.id); return <article key={method.id} className={cn("rounded-card border p-4", selected ? "border-ai-border bg-ai-soft/55 ring-1 ring-ai/10" : "border-borderSoft")}><div className="flex items-start gap-3"><input type="checkbox" checked={selected} onChange={() => toggleId("selectedCollectionMethodIds", method.id)} className="mt-1" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="text-[12px] font-semibold">{method.name}</h3>{recommended ? <span className="rounded bg-ai-soft px-1.5 py-0.5 text-[10px] text-ai">AI推荐</span> : null}</div><p className="mt-1 text-[10px] text-textMuted">解析对象：{method.parseTarget} · 当前 {method.taskCount} 个任务</p><div className="mt-3 flex flex-wrap gap-1">{[["AI解析", method.aiEnabled], ["去重", method.dedupeEnabled], ["标准化", method.standardizationEnabled], ["人工复核", method.reviewRequired]].map(([label, enabled]) => <span key={String(label)} className={cn("rounded px-1.5 py-0.5 text-[10px]", enabled ? "bg-success-soft text-success" : "bg-slate-100 text-textMuted")}>{label}</span>)}</div></div></div></article>; })}</div></div></section>;

    if (currentStep === 4) return <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><SectionTitle icon={ListChecks} title="4. 采集范围与规则" description="限定采集边界并配置字段、去重和标准化规则。" /><div className="space-y-5 p-5"><Field label="采集范围" required error={errors.collectionScope}><textarea value={draft.collectionScope} onChange={(e) => update("collectionScope", e.target.value)} className={textareaClass} placeholder="例如 CR、NB、NK、SP 系列水泵" /></Field><div className="grid gap-4 md:grid-cols-3"><Field label="产品系列"><input value={draft.productSeries.join("，")} onChange={(e) => update("productSeries", e.target.value.split(/[，,]/).filter(Boolean))} className={inputClass} placeholder="CR，NB，NK" /></Field><Field label="型号关键词"><input value={draft.modelKeywords.join("，")} onChange={(e) => update("modelKeywords", e.target.value.split(/[，,]/).filter(Boolean))} className={inputClass} /></Field><Field label="设备类型关键词"><input value={draft.equipmentTypeKeywords.join("，")} onChange={(e) => update("equipmentTypeKeywords", e.target.value.split(/[，,]/).filter(Boolean))} className={inputClass} /></Field></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{[["采集产品详情页", "collectProductPages"], ["采集 PDF 样本", "collectPdfDatasheets"], ["采集图片资源", "collectImages"], ["采集技术参数表", "collectParameterTables"], ["采集标准规范", "collectStandards"]].map(([label, key]) => <ToggleRow key={key} label={label} checked={draft[key as keyof EquipmentCatalogCollectionDraft] as boolean} onChange={(value) => update(key as keyof EquipmentCatalogCollectionDraft, value as never)} />)}</div><div className="grid gap-4 md:grid-cols-3"><Field label="采集语言"><div className="flex h-10 items-center gap-3 rounded-md border border-borderSoft px-3">{["中文", "英文", "法文"].map((item) => <label key={item} className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={draft.languages.includes(item)} onChange={() => toggleText("languages", item)} />{item}</label>)}</div></Field><Field label="最大采集页面数" error={errors.maxPages}><input type="number" min={1} value={draft.maxPages} onChange={(e) => update("maxPages", Number(e.target.value))} className={inputClass} /></Field><Field label="最大 PDF 文件数" error={errors.maxPdfFiles}><input type="number" min={1} value={draft.maxPdfFiles} onChange={(e) => update("maxPdfFiles", Number(e.target.value))} className={inputClass} /></Field></div><div><p className="mb-2 text-[12px] font-semibold">{draft.equipmentCategory || "设备"}参数字段模板</p><div className="flex flex-wrap gap-2">{parameterTemplate.map((item) => <button key={item} type="button" onClick={() => toggleText("parameterFields", item)} className={cn("rounded-md border px-2.5 py-1.5 text-[11px]", draft.parameterFields.includes(item) ? "border-primary bg-primary-soft text-primary" : "border-borderSoft bg-white text-textMuted")}>{draft.parameterFields.includes(item) ? <CheckCircle2 className="mr-1 inline size-3" /> : null}{item}</button>)}</div></div><div className="grid gap-4 md:grid-cols-2"><Field label="去重规则"><select value={draft.dedupeRule} onChange={(e) => update("dedupeRule", e.target.value)} className={inputClass}><option>品牌 + 型号</option><option>品牌 + 型号 + 关键参数</option><option>品牌 + 系列 + 规格</option></select></Field><Field label="标准化规则"><div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-borderSoft p-2">{["单位换算", "型号清洗", "参数归一", "中英文名称映射", "重复设备合并"].map((item) => <label key={item} className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={draft.standardizationRules.includes(item)} onChange={() => toggleText("standardizationRules", item)} />{item}</label>)}</div></Field></div></div></section>;

    if (currentStep === 5) return <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><SectionTitle icon={Settings2} title="5. 高级设置" description="配置调度、可信度、AI辅助与人工审核边界。" tone="purple" /><div className="space-y-5 p-5"><div className="grid gap-4 md:grid-cols-3"><ToggleRow label="定时采集" checked={draft.scheduled} onChange={(value) => update("scheduled", value)} hint="开启后按配置频率执行" /><Field label="采集频率"><select value={draft.frequency} onChange={(e) => update("frequency", e.target.value as typeof draft.frequency)} className={inputClass}><option value="once">一次性</option><option value="daily">每日</option><option value="weekly">每周</option><option value="monthly">每月</option><option value="manual">手动触发</option></select></Field><Field label="计划开始时间"><input type="datetime-local" value={draft.plannedStartAt} onChange={(e) => update("plannedStartAt", e.target.value)} className={inputClass} /></Field></div><div className="grid gap-4 md:grid-cols-3"><Field label="失败重试次数"><input type="number" min={0} max={10} value={draft.retryCount} onChange={(e) => update("retryCount", Number(e.target.value))} className={inputClass} /></Field><Field label="重试间隔（分钟）"><input type="number" min={1} value={draft.retryIntervalMinutes} onChange={(e) => update("retryIntervalMinutes", Number(e.target.value))} className={inputClass} /></Field><Field label={`可信度阈值 ${Math.round(draft.confidenceThreshold * 100)}%`} error={errors.confidenceThreshold}><input type="range" min={0} max={1} step={0.01} value={draft.confidenceThreshold} onChange={(e) => update("confidenceThreshold", Number(e.target.value))} className="h-10 w-full accent-primary" /></Field></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{[["生成候选设备资料", "autoGenerateCandidates", "仅生成候选，不直接入库"], ["自动进入人工审核", "autoReviewRequired", "人工确认后才进入资料库"], ["AI参数补全", "aiParameterCompletion", "缺失参数生成建议值"], ["重复设备检测", "duplicateDetection", "匹配品牌、型号与关键参数"], ["风险检测", "riskDetection", "识别来源与参数异常"], ["生成采集报告", "generateCollectionReport", "记录来源与处理结果"], ["任务完成通知", "completionNotification", "任务结束后通知负责人"], ["异常失败通知", "failureNotification", "失败与高风险即时提醒"]].map(([label, key, hint]) => <ToggleRow key={key} label={label} hint={hint} checked={draft[key as keyof EquipmentCatalogCollectionDraft] as boolean} onChange={(value) => update(key as keyof EquipmentCatalogCollectionDraft, value as never)} />)}</div>{!draft.autoReviewRequired ? <div className="flex gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-[11px] leading-5 text-warning"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><p>关闭人工审核会降低资料入库的可控性。AI 不能替代最终技术与商务判断，建议保持开启。</p></div> : null}</div></section>;

    return <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card"><SectionTitle icon={ClipboardCheck} title="6. 确认与创建" description="检查最终配置，确认后生成待调度采集任务。" tone="green" /><div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["任务名称", draft.taskName], ["任务编号", draft.taskCode], ["厂家 / 品牌", draft.manufacturerName], ["设备类别", draft.equipmentCategory], ["已选数据源", `${selectedSources.length} 个`], ["已选采集方式", `${selectedMethods.length} 种`], ["采集范围", draft.collectionScope], ["预计页面", `${draft.maxPages} 页`], ["预计 PDF", `${draft.maxPdfFiles} 份`], ["可信度阈值", `${Math.round(draft.confidenceThreshold * 100)}%`], ["人工复核", draft.autoReviewRequired ? "必须" : "已关闭"], ["采集频率", ({ once: "一次性", daily: "每日", weekly: "每周", monthly: "每月", manual: "手动触发" } as const)[draft.frequency]]].map(([label, value]) => <div key={label} className="rounded-lg border border-borderSoft bg-slate-50 p-3"><p className="text-[10px] text-textMuted">{label}</p><p className="mt-1 break-words text-[12px] font-semibold">{value || "未设置"}</p></div>)}</div><div className="rounded-card border border-ai-border bg-ai-soft/55 p-4"><div className="flex items-center gap-2 text-ai"><Sparkles className="size-4" /><h3 className="text-[13px] font-semibold">AI处理边界</h3></div><p className="mt-2 text-[11px] leading-5 text-ai">AI仅执行字段识别、参数标准化、相似资料去重与风险提示。所有候选资料仍进入人工审核，不直接确认供应商能力或设备资料合格。</p></div><div className="rounded-card border border-warning/25 bg-warning-soft p-4 text-[11px] leading-5 text-warning"><p><b>创建前确认：</b>当前任务不会抓取价格，仅采集设备名称、型号、技术参数、产品样本、来源证据与供应商可供能力。人工确认后才进入设备资料库。</p></div></div></section>;
  };

  const renderNextAction = (showTarget = false) => currentStep < 6
    ? <button type="button" onClick={next} className={primaryButton}>{showTarget ? `下一步：${collectionTaskSteps[currentStep]}` : "下一步"}<ArrowRight className="size-4" /></button>
    : <button type="button" onClick={() => void createTask()} disabled={isCreating || verifiedRows.length === 0} className={aiButton}>{isCreating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}创建采集任务</button>;

  return <AppLayout>
    <div className="space-y-3 pb-6" data-no-global-interaction>
      <header className="flex min-w-0 flex-col gap-3 px-1 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h1 className="text-[22px] font-semibold leading-tight text-textMain">新建设备资料采集任务</h1><p className="mt-1 text-[11px] leading-5 text-textMuted">选择一家厂家或供应商，即可自动发现并采集其全部设备网页、目录、PDF 与授权 API 数据。</p></div>
        <div className="flex flex-wrap items-center gap-2"><div className="grid grid-cols-2 rounded-md border border-borderSoft bg-slate-50 p-1"><button type="button" onClick={() => setExperienceMode("quick")} className={cn("h-8 rounded px-3 text-[11px] font-medium", experienceMode === "quick" ? "bg-white text-primary shadow-sm" : "text-textMuted")}>全量采集</button><button type="button" onClick={() => setExperienceMode("advanced")} className={cn("h-8 rounded px-3 text-[11px] font-medium", experienceMode === "advanced" ? "bg-white text-primary shadow-sm" : "text-textMuted")}>高级自定义</button></div><Link href="/equipment-catalog/collection" className={outlineButton}>取消</Link>{experienceMode === "advanced" ? renderNextAction() : null}</div>
      </header>

      {experienceMode === "quick" ? renderQuickMode() : <>
        <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
          <CollectionTaskStepIndicator currentStep={currentStep} completedSteps={completedSteps} invalidSteps={invalidSteps} onChange={goToStep} />
          <div className="grid min-w-0 items-start gap-4 bg-slate-50/35 p-3 xl:grid-cols-[minmax(0,1.8fr)_430px]"><main className="min-w-0">{renderStep()}</main><CollectionTaskSummaryPanel draft={draft} sources={sources} methods={methods} onEditStep={goToStep} /></div>
        </section>

        <div className="flex flex-col gap-3 rounded-card border border-borderSoft bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3"><Link href="/equipment-catalog/collection" className={cn(outlineButton, "min-w-36")}>取消</Link><div className="hidden min-w-0 md:block"><p className="text-[11px] font-semibold">第 {currentStep} / 6 步 · {collectionTaskSteps[currentStep - 1]}</p><p className="truncate text-[10px] text-textMuted">创建时写入 Supabase；未创建的表单内容仅保留在当前会话。</p></div></div>
          <div className="flex flex-wrap justify-end gap-2">{currentStep > 1 ? <button type="button" onClick={() => setCurrentStep((step) => step - 1)} className={outlineButton}><ArrowLeft className="size-4" />上一步</button> : null}{renderNextAction(true)}</div>
        </div>
      </>}
    </div>
    <NewDataSourceDrawer key={draft.manufacturerId || "new-source"} open={drawer === "source"} ownerType={organizationKind} ownerName={draft.manufacturerName} brand={draft.brand} category={draft.equipmentCategory} onClose={() => setDrawer(null)} onSave={saveRegisteredSource} />
    <NewCollectionMethodDrawer open={drawer === "method"} onClose={() => setDrawer(null)} onSave={saveCollectionMethod} />
    <SupplierApiCredentialDrawer open={apiCredentialOpen} brand={draft.brand} onClose={() => setApiCredentialOpen(false)} onSaved={() => loadRegisteredSources(true)} />
    <NewManufacturerDrawer open={manufacturerDrawerOpen} onClose={() => setManufacturerDrawerOpen(false)} onSaved={(manufacturer) => loadRegisteredSources(true, manufacturer.brand)} />
  </AppLayout>;
}
