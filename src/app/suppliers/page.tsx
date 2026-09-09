"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cog,
  Download,
  Eye,
  FilePlus2,
  FlaskConical,
  Gauge,
  Handshake,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Network,
  Plus,
  RotateCcw,
  Search,
  SearchCheck,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Star,
  Upload,
  UsersRound,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, EditDrawer, MockExportDialog, MockUploadDialog, ModuleHeader, RouteContextBanner, SupplierScoreBadge } from "@/components/common";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { supplierKpis, supplierRecords, type SupplierRecord } from "@/data/mock/suppliers";
import { useMockAiAction } from "@/hooks/useMockAiAction";
import { useMockToast } from "@/hooks/useMockToast";
import { useSupplierVerification } from "@/hooks/useSupplierVerification";
import { supplierVerificationById } from "@/data/mock/supplierVerificationRegistry";
import { cn } from "@/lib/utils";
import {
  mapSupplierDatabaseRow,
  type SupplierDatabaseRow,
} from "@/lib/data/supplierMapper";
import type { DataTableColumn } from "@/types/common";

const countryFlag: Record<string, string> = {
  CN: "🇨🇳",
  CD: "🇨🇩",
  ZA: "🇿🇦",
  DE: "🇩🇪",
  AT: "🇦🇹",
} as const;

const responseClassName = {
  快: "bg-success-soft text-success border-success/20",
  较快: "bg-success-soft text-success border-success/20",
  一般: "bg-warning-soft text-[#B45309] border-warning/20",
  较慢: "bg-danger-soft text-danger border-danger/20",
} as const;

const kpiConfig = [
  {
    icon: UsersRound,
    label: "供应商总数",
    valueClassName: "text-blue-600",
    iconClassName: "from-blue-500 to-blue-600 text-white shadow-blue-500/25",
    waveClassName: "text-blue-400",
  },
  {
    icon: Bot,
    label: "AI推荐供应商",
    valueClassName: "text-violet-600",
    iconClassName: "from-violet-500 to-purple-600 text-white shadow-violet-500/25",
    waveClassName: "text-violet-400",
  },
  {
    icon: FilePlus2,
    label: "待补全供应商资料",
    valueClassName: "text-orange-500",
    iconClassName: "from-amber-400 to-orange-500 text-white shadow-orange-500/25",
    waveClassName: "text-orange-400",
  },
  {
    icon: Star,
    label: "高评分供应商",
    valueClassName: "text-emerald-600",
    iconClassName: "from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25",
    waveClassName: "text-emerald-400",
  },
  {
    icon: ShieldAlert,
    label: "高风险供应商",
    valueClassName: "text-red-500",
    iconClassName: "from-red-400 to-red-600 text-white shadow-red-500/25",
    waveClassName: "text-red-400",
  },
  {
    icon: Sparkles,
    label: "新增供应商",
    valueClassName: "text-sky-500",
    iconClassName: "from-cyan-400 to-sky-500 text-white shadow-cyan-500/25",
    waveClassName: "text-sky-400",
  },
] as const;

function supplierSearchText(row: SupplierRecord) {
  return [
    row.supplierCode,
    row.supplierName,
    row.countryRegion,
    row.category,
    row.mainScope,
    row.contact,
    row.whatsapp,
    row.email,
    row.aiEvaluation,
    ...(row.bidPackages ?? []),
    ...(row.equipmentLists ?? []),
    ...(row.mainProducts ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function uniqueSupplierOptions(values: string[]) {
  return ["全部", ...Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right, "zh-CN"))];
}

function buildMatchItem(rows: SupplierRecord[], name: string, scope: string, keywords: string[]) {
  const count = rows.filter((row) => {
    const text = supplierSearchText(row);
    return keywords.some((keyword) => text.includes(keyword));
  }).length;

  return {
    name,
    scope,
    count,
    rate: Math.round((count / Math.max(1, rows.length)) * 100),
  };
}

const supplierCountryOptions = uniqueSupplierOptions(supplierRecords.map((item) => item.countryRegion));
const supplierCategoryOptions = uniqueSupplierOptions(supplierRecords.map((item) => item.category));
const supplierResponseOptions = uniqueSupplierOptions(supplierRecords.map((item) => item.responseSpeed));
const supplierRiskOptions = ["全部", "low", "medium", "high", "critical"];
const supplierScopeOptions = ["全部", "水泵", "阀门", "管道", "水处理", "自动化", "仪表", "实验室", "空压", "消毒"];

type SupplierFilters = {
  keyword: string;
  country: string;
  category: string;
  scope: string;
  response: string;
  risk: string;
  score: string;
};

const defaultSupplierFilters: SupplierFilters = {
  keyword: "",
  country: "全部",
  category: "全部",
  scope: "全部",
  response: "全部",
  risk: "全部",
  score: "全部",
};

const supplierPageSize = 15;

type EquipmentCategoryKey =
  | "all"
  | "pump-fluid"
  | "pump"
  | "valve-pipe"
  | "water-process"
  | "pretreatment"
  | "filtration"
  | "membrane"
  | "sludge"
  | "dosing-disinfection"
  | "automation-power"
  | "electrical-control"
  | "instrumentation"
  | "air-power"
  | "lab-auxiliary"
  | "lab-analysis"
  | "water-quality"
  | "auxiliary";

type EquipmentTreeLeaf = {
  key: EquipmentCategoryKey;
  label: string;
  icon: LucideIcon;
  keywords: string[];
};

type EquipmentTreeGroup = {
  key: EquipmentCategoryKey;
  label: string;
  icon: LucideIcon;
  children: EquipmentTreeLeaf[];
};

const equipmentSupplierTree: EquipmentTreeGroup[] = [
  {
    key: "pump-fluid",
    label: "泵阀与输配设备",
    icon: Waves,
    children: [
      { key: "pump", label: "水泵及泵站", icon: Waves, keywords: ["泵", "pump", "泵站", "取水设备"] },
      { key: "valve-pipe", label: "阀门、管道及管件", icon: SlidersHorizontal, keywords: ["阀", "管道", "管件", "铸管", "法兰"] },
    ],
  },
  {
    key: "water-process",
    label: "水处理工艺设备",
    icon: Cog,
    children: [
      { key: "pretreatment", label: "取水与预处理", icon: Gauge, keywords: ["取水", "预处理", "格栅", "沉淀", "净水装置"] },
      { key: "filtration", label: "过滤与净化", icon: Network, keywords: ["过滤", "滤池", "滤料", "净化", "活性炭"] },
      { key: "membrane", label: "膜处理与纯水", icon: Waves, keywords: ["反渗透", "膜", "纯水", "去离子", "软化"] },
      { key: "sludge", label: "污泥与脱水", icon: Boxes, keywords: ["污泥", "压滤", "脱水", "刮泥", "浓缩"] },
      { key: "dosing-disinfection", label: "加药与消毒", icon: Sparkles, keywords: ["加药", "药剂", "消毒", "紫外", "臭氧", "pac", "pam"] },
    ],
  },
  {
    key: "automation-power",
    label: "自动化与动力",
    icon: Zap,
    children: [
      { key: "electrical-control", label: "电气自动化与控制", icon: Zap, keywords: ["自动化", "控制", "plc", "dcs", "变频", "伺服", "电气"] },
      { key: "instrumentation", label: "仪表与在线监测", icon: Gauge, keywords: ["仪表", "监测", "传感器", "流量计", "水质在线"] },
      { key: "air-power", label: "空压与动力设备", icon: Wind, keywords: ["空压", "压缩机", "动力", "发电", "康明斯"] },
    ],
  },
  {
    key: "lab-auxiliary",
    label: "实验室及辅助设备",
    icon: FlaskConical,
    children: [
      { key: "lab-analysis", label: "实验室分析仪器", icon: FlaskConical, keywords: ["实验室", "分析仪", "色谱", "质谱", "光谱", "显微镜"] },
      { key: "water-quality", label: "水质检测设备", icon: Gauge, keywords: ["水质", "cod", "bod", "浊度", "ph", "检测仪"] },
      { key: "auxiliary", label: "通用与辅助设备", icon: Boxes, keywords: ["辅助", "配套", "工具", "物流", "本地采购"] },
    ],
  },
];

function supplierEquipmentText(row: SupplierRecord) {
  return [
    row.mainScope,
    ...(row.bidPackages ?? []),
    ...(row.equipmentLists ?? []),
    ...(row.mainProducts ?? []),
    row.supplierName,
  ]
    .join(" ")
    .toLowerCase();
}

function findEquipmentGroup(key: EquipmentCategoryKey) {
  return equipmentSupplierTree.find((group) => group.key === key);
}

function findEquipmentLeaf(key: EquipmentCategoryKey) {
  return equipmentSupplierTree.flatMap((group) => group.children).find((leaf) => leaf.key === key);
}

function matchesEquipmentCategory(row: SupplierRecord, key: EquipmentCategoryKey) {
  if (key === "all") return true;
  const text = supplierEquipmentText(row);
  const group = findEquipmentGroup(key);
  const leaves = group?.children ?? [findEquipmentLeaf(key)].filter((leaf): leaf is EquipmentTreeLeaf => Boolean(leaf));
  return leaves.some((leaf) => leaf.keywords.some((keyword) => text.includes(keyword.toLowerCase())));
}

function EquipmentSupplierTree({
  selectedKey,
  suppliers,
  onSelect,
}: {
  selectedKey: EquipmentCategoryKey;
  suppliers: SupplierRecord[];
  onSelect: (key: EquipmentCategoryKey, label: string) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<EquipmentCategoryKey[]>(equipmentSupplierTree.map((group) => group.key));

  const countFor = (key: EquipmentCategoryKey) => suppliers.filter((row) => matchesEquipmentCategory(row, key)).length;

  function toggleGroup(key: EquipmentCategoryKey) {
    setExpandedGroups((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  return (
    <aside className="min-w-0 self-start rounded-[10px] border border-borderSoft bg-white shadow-card xl:sticky xl:top-[68px]">
      <div className="border-b border-borderSoft px-3 py-3">
        <ModuleHeader
          icon={Network}
          title="设备供应商分类"
          subtitle="按设备组织树筛选"
          tone="blue"
          density="compact"
        />
      </div>
      <div className="p-2">
        <button
          type="button"
          data-no-global-interaction
          onClick={() => onSelect("all", "全部设备供应商")}
          className={cn(
            "flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] font-bold transition",
            selectedKey === "all" ? "bg-primary text-white shadow-sm" : "text-textSecondary hover:bg-primary-soft hover:text-primary",
          )}
        >
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", selectedKey === "all" ? "bg-white/18" : "bg-primary-soft text-primary")}>
            <Boxes className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate">全部设备供应商</span>
          <span className={cn("rounded-pill px-1.5 py-0.5 text-[10px]", selectedKey === "all" ? "bg-white/20 text-white" : "bg-[var(--color-bg-muted)] text-textMuted")}>
            {suppliers.length}
          </span>
        </button>

        <div className="mt-1.5 space-y-1">
          {equipmentSupplierTree.map((group) => {
            const expanded = expandedGroups.includes(group.key);
            const groupSelected = selectedKey === group.key;
            const GroupIcon = group.icon;
            return (
              <div key={group.key}>
                <div className={cn("flex items-center rounded-md", groupSelected ? "bg-primary-soft" : "hover:bg-[var(--color-bg-muted)]")}>
                  <button
                    type="button"
                    data-no-global-interaction
                    onClick={() => toggleGroup(group.key)}
                    className="flex size-8 shrink-0 items-center justify-center text-textMuted"
                    aria-label={`${expanded ? "收起" : "展开"}${group.label}`}
                  >
                    {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    data-no-global-interaction
                    onClick={() => onSelect(group.key, group.label)}
                    className={cn("flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-[12px] font-bold", groupSelected ? "text-primary" : "text-textSecondary")}
                  >
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", groupSelected ? "bg-primary text-white" : "bg-primary-soft text-primary")}>
                      <GroupIcon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    <span className="rounded-pill bg-white px-1.5 py-0.5 text-[10px] font-semibold text-textMuted">{countFor(group.key)}</span>
                  </button>
                </div>

                {expanded ? (
                  <div className="relative ml-4 mt-1 space-y-0.5 border-l border-borderSoft pl-3">
                    {group.children.map((leaf) => {
                      const selected = selectedKey === leaf.key;
                      const LeafIcon = leaf.icon;
                      return (
                        <button
                          key={leaf.key}
                          type="button"
                          data-no-global-interaction
                          onClick={() => onSelect(leaf.key, leaf.label)}
                          className={cn(
                            "relative flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] font-semibold transition",
                            selected ? "bg-ai-soft text-ai" : "text-textSecondary hover:bg-[var(--color-bg-muted)] hover:text-primary",
                          )}
                        >
                          <span className="absolute -left-[13px] top-1/2 h-px w-3 bg-borderSoft" />
                          <LeafIcon className={cn("size-3.5 shrink-0", selected ? "text-ai" : "text-textMuted")} />
                          <span className="min-w-0 flex-1 truncate">{leaf.label}</span>
                          <span className={cn("rounded-pill px-1.5 py-0.5 text-[10px]", selected ? "bg-white text-ai" : "bg-[var(--color-bg-muted)] text-textMuted")}>
                            {countFor(leaf.key)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-borderSoft px-3 py-2.5 text-[10px] leading-4 text-textMuted">
        同一家供应商可匹配多个设备分类，分类结果来自主营范围、设备清单和产品资料。
      </div>
    </aside>
  );
}

function createSupplierColumns({
  selectedIds,
  onToggle,
  onMore,
  onCreateInquiry,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onMore: (row: SupplierRecord) => void;
  onCreateInquiry: (row: SupplierRecord) => void;
}): DataTableColumn<SupplierRecord>[] {
  return [
    {
      key: "select",
      header: "选择",
      align: "center",
      className: "min-w-[46px]",
      render: (row) => (
        <button
          type="button"
          data-no-global-interaction
          onClick={(event) => {
            event.stopPropagation();
            onToggle(row.id);
          }}
          className={cn("size-4 rounded border", selectedIds.includes(row.id) ? "border-primary bg-primary" : "border-borderSoft bg-white")}
          aria-label={`选择 ${row.supplierName}`}
        />
      ),
    },
    { key: "supplierCode", header: "供应商编号", className: "min-w-[122px] whitespace-nowrap" },
    {
      key: "supplierName",
      header: "供应商名称",
      className: "min-w-[176px]",
      render: (row) => (
        <div className="min-w-0">
          <Link
            href={`/suppliers/${row.id}`}
            data-no-global-interaction
            onClick={(event) => event.stopPropagation()}
            className="block truncate font-semibold text-textMain transition hover:text-primary hover:underline hover:underline-offset-2"
            title={`查看 ${row.supplierName} 详情`}
          >
            {row.supplierName}
          </Link>
          <div className="mt-0.5 truncate text-[11px] text-textMuted">{row.aiEvaluation}</div>
        </div>
      ),
    },
    {
      key: "countryRegion",
      header: "国家",
      className: "min-w-[78px] whitespace-nowrap",
      render: (row) => (
        <span className="inline-flex items-center gap-1">
          <span>{countryFlag[row.countryCode] ?? "🏳️"}</span>
          {row.countryRegion}
        </span>
      ),
    },
    {
      key: "category",
      header: "类型",
      className: "min-w-[76px] whitespace-nowrap",
      render: (row) => <span className="rounded-pill bg-cyan-soft px-2 py-1 text-[12px] font-medium text-cyan">{row.category}</span>,
    },
    { key: "contact", header: "联系人", className: "min-w-[64px] whitespace-nowrap" },
    {
      key: "whatsapp",
      header: "WhatsApp",
      className: "max-w-[118px] min-w-[118px] truncate whitespace-nowrap",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-textSecondary">
          <MessageCircle className="size-3.5 text-success" aria-hidden="true" />
          <span className="truncate" title={row.whatsapp}>{row.whatsapp}</span>
        </span>
      ),
    },
    {
      key: "email",
      header: "邮箱",
      className: "max-w-[138px] min-w-[138px] truncate whitespace-nowrap",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-textSecondary">
          <Mail className="size-3.5 text-primary" aria-hidden="true" />
          <span className="truncate" title={row.email}>{row.email}</span>
        </span>
      ),
    },
    {
      key: "aiEvaluation",
      header: "AI观察与建议",
      className: "max-w-[150px] min-w-[150px]",
      render: (row) => (
        <span className={cn("line-clamp-2 rounded-md px-2 py-1 text-[11px] leading-4", row.riskLevel === "high" ? "bg-warning-soft text-[#C2410C]" : "bg-success-soft text-success")}>
          AI建议：{row.aiEvaluation}
        </span>
      ),
    },
    {
      key: "responseSpeed",
      header: "响应速度",
      className: "min-w-[72px] whitespace-nowrap",
      render: (row) => <span className={`inline-flex h-5 items-center rounded-pill border px-2 text-[11px] font-semibold ${responseClassName[row.responseSpeed]}`}>{row.responseSpeed}</span>,
    },
    {
      key: "technicalCapability",
      header: "技术能力",
      align: "center",
      className: "min-w-[78px] whitespace-nowrap",
      render: (row) => (
        <span className="text-primary">
          {"★".repeat(Math.max(3, Math.round(row.technicalCapability / 20)))}
          <span className="text-borderSoft">{"☆".repeat(5 - Math.max(3, Math.round(row.technicalCapability / 20)))}</span>
        </span>
      ),
    },
    {
      key: "deliveryRisk",
      header: "交付风险",
      className: "min-w-[76px] whitespace-nowrap",
      render: (row) => <RiskBadge level={row.deliveryRisk} className="h-5 text-[11px]" />,
    },
    {
      key: "overallScore",
      header: "综合评分",
      className: "min-w-[72px] whitespace-nowrap",
      render: (row) => <SupplierScoreBadge score={row.overallScore} className="h-5 text-[11px]" />,
    },
    {
      key: "actions",
      header: "操作",
      align: "center",
      className: "min-w-[118px] whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5 text-primary">
          <Link
            href={`/suppliers/${row.id}`}
            data-no-global-interaction
            aria-label={`查看 ${row.supplierName}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex size-7 items-center justify-center rounded-md border border-primary/20 bg-primary-soft text-primary"
          >
            <Eye className="size-3.5" />
          </Link>
          <button
            type="button"
            data-no-global-interaction
            aria-label={`为 ${row.supplierName} 创建询价`}
            onClick={(event) => {
              event.stopPropagation();
              onCreateInquiry(row);
            }}
            className="inline-flex size-7 items-center justify-center rounded-md border border-ai/20 bg-ai-soft text-ai"
          >
            <ClipboardList className="size-3.5" />
          </button>
          <button
            type="button"
            data-no-global-interaction
            aria-label={`更多 ${row.supplierName}`}
            onClick={(event) => {
              event.stopPropagation();
              onMore(row);
            }}
            className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];
}

function MiniWave({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-14", className)} viewBox="0 0 60 20" fill="none" aria-hidden="true">
      <path d="M2 14 C8 14 10 7 16 7 C22 7 23 15 30 15 C36 15 38 5 44 5 C50 5 51 12 58 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SupplierKpiGrid() {
  return (
    <div className="grid gap-3 xl:grid-cols-6">
      {supplierKpis.map((item, index) => {
        const config = kpiConfig[index];
        const Icon = config.icon;

        return (
          <section key={item.label} className="min-h-[90px] rounded-[10px] border border-borderSoft bg-white px-4 py-3 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className={cn("text-[13px] font-semibold", config.valueClassName)}>{config.label}</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className={cn("text-[28px] font-bold leading-8", config.valueClassName)}>{item.value}</span>
                  <span className={cn("mb-1 text-[12px] font-semibold", config.valueClassName)}>{item.unit}</span>
                </div>
              </div>
              <span className={cn("flex size-11 items-center justify-center rounded-[12px] bg-gradient-to-br shadow-lg", config.iconClassName)}>
                <Icon className="size-7" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-textMuted">{item.trend}</span>
              <MiniWave className={config.waveClassName} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="min-w-0 xl:col-span-2">
      <div className="mb-1 text-[12px] font-semibold text-textSecondary">{label}</div>
      <div className="flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
        <Search className="size-4 shrink-0 text-textMuted" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </div>
    </label>
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
    <label className="min-w-0 xl:col-span-1">
      <div className="mb-1 text-[12px] font-semibold text-textSecondary">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SupplierFilterPanel({
  filters,
  onChange,
  onSearch,
  onReset,
  resultCount,
}: {
  filters: SupplierFilters;
  onChange: (patch: Partial<SupplierFilters>) => void;
  onSearch: () => void;
  onReset: () => void;
  resultCount: number;
}) {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <form
        className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <FilterInput label="供应商搜索" value={filters.keyword} onChange={(keyword) => onChange({ keyword })} placeholder="请输入供应商名称/编号/联系人" />
        <FilterSelect label="国家" value={filters.country} onChange={(country) => onChange({ country })} options={supplierCountryOptions} />
        <FilterSelect label="类型" value={filters.category} onChange={(category) => onChange({ category })} options={supplierCategoryOptions} />
        <FilterSelect label="设备范围" value={filters.scope} onChange={(scope) => onChange({ scope })} options={supplierScopeOptions} />
        <FilterSelect label="响应速度" value={filters.response} onChange={(response) => onChange({ response })} options={supplierResponseOptions} />
        <FilterSelect label="交付风险" value={filters.risk} onChange={(risk) => onChange({ risk })} options={supplierRiskOptions} />
        <FilterSelect label="综合评分" value={filters.score} onChange={(score) => onChange({ score })} options={["全部", "90分以上", "80-89分", "80分以下"]} />
        <button type="submit" data-no-global-interaction className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-[12px] font-semibold text-white shadow-sm xl:col-span-1">
          <Search className="size-4" />
          搜索
        </button>
        <button type="button" data-no-global-interaction onClick={onReset} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] font-semibold text-textSecondary shadow-sm xl:col-span-1">
          <RotateCcw className="size-4" />
          重置
        </button>
        <div className="flex h-9 items-center text-[12px] font-semibold text-textMuted xl:col-span-1">
          当前 {resultCount} 家
        </div>
      </form>
    </section>
  );
}

function SupplierActionBar({
  selectedCount,
  aiRunning,
  onAdd,
  onImport,
  onAiRecommend,
  onAiComplete,
  onCreateInquiry,
  onExport,
}: {
  selectedCount: number;
  aiRunning: boolean;
  onAdd: () => void;
  onImport: () => void;
  onAiRecommend: () => void;
  onAiComplete: () => void;
  onCreateInquiry: () => void;
  onExport: () => void;
}) {
  const actions = [
    { label: "新增供应商", icon: Plus, className: "bg-primary text-white border-primary", onClick: onAdd },
    { label: "导入供应商", icon: Upload, className: "bg-white text-success border-success/40", onClick: onImport },
    { label: aiRunning ? "AI处理中..." : "AI推荐供应商", icon: Bot, className: "bg-ai-soft text-ai border-ai-border", onClick: onAiRecommend },
    { label: "AI补全资料", icon: FilePlus2, className: "bg-white text-[#C2410C] border-warning/30", onClick: onAiComplete },
    { label: "创建询价任务", icon: ClipboardList, className: "bg-white text-primary border-primary/20", onClick: onCreateInquiry },
    { label: "导出供应商库", icon: Download, className: "bg-white text-textSecondary border-borderSoft", onClick: onExport },
  ];
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 text-[12px] font-semibold text-textMuted">已选 {selectedCount} 家供应商</div>
      <div className="grid gap-3 md:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} type="button" data-no-global-interaction onClick={action.onClick} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md border text-[13px] font-semibold shadow-sm transition hover:-translate-y-0.5", action.className)}>
              <Icon className="size-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SupplierModuleShell({
  title,
  subtitle,
  action,
  actionHref,
  onAction,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action: string;
  actionHref?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const actionClassName = "inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary";

  return (
    <section className={cn("rounded-[10px] border border-borderSoft bg-white p-3 shadow-card", className)}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold leading-5 text-textMain">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-textMuted">{subtitle}</p> : null}
        </div>
        {actionHref ? (
          <Link href={actionHref} data-no-global-interaction className={actionClassName}>
            {action} <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <button type="button" data-no-global-interaction onClick={onAction} className={actionClassName}>
            {action} <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function SupplierMiniIcon({ tone }: { tone: "blue" | "cyan" | "red" }) {
  const className =
    tone === "blue"
      ? "bg-primary-soft text-primary"
      : tone === "cyan"
        ? "bg-cyan-soft text-cyan"
        : "bg-danger-soft text-danger";

  return (
    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", className)}>
      <UsersRound className="size-3.5" />
    </span>
  );
}

function RecommendationCard({
  items,
  contextLabel,
  onMore,
  onOpenSupplier,
}: {
  items: Array<{ name: string; score: number }>;
  contextLabel: string;
  onMore: () => void;
  onOpenSupplier: (supplierName: string) => void;
}) {
  return (
    <SupplierModuleShell title="AI供应商推荐" subtitle={`基于${contextLabel}智能推荐`} action="更多推荐" onAction={onMore} className="min-h-[142px]">
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <button
            key={item.name}
            type="button"
            data-no-global-interaction
            onClick={() => onOpenSupplier(item.name)}
            className="grid w-full grid-cols-[20px_minmax(0,1fr)_58px] items-center gap-2 border-b border-borderSoft/70 pb-1.5 text-left transition hover:text-primary last:border-b-0 last:pb-0"
          >
            <SupplierMiniIcon tone={item.score > 90 ? "blue" : "cyan"} />
            <span className="truncate text-[12px] font-semibold text-textSecondary">{item.name}</span>
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-center text-[11px] font-bold text-white">{item.score}</span>
            <span className="col-start-3 -mt-2 text-center text-[10px] font-semibold text-textMuted">匹配度</span>
          </button>
        ))}
        {items.length === 0 ? <p className="py-4 text-center text-[11px] text-textMuted">当前条件下暂无推荐供应商</p> : null}
      </div>
    </SupplierModuleShell>
  );
}

function SupplementCard({
  items,
  total,
  onMore,
  onOpenGovernance,
}: {
  items: Array<{ name: string; missing: string }>;
  total: number;
  onMore: () => void;
  onOpenGovernance: (supplierName: string) => void;
}) {
  return (
    <SupplierModuleShell title="AI资料补全建议" subtitle={`${total} 家供应商资料待补全`} action="更多建议" onAction={onMore} className="min-h-[142px]">
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <button
            key={item.name}
            type="button"
            data-no-global-interaction
            onClick={() => onOpenGovernance(item.name)}
            className="grid w-full grid-cols-[20px_minmax(0,1fr)_84px] items-center gap-2 border-b border-borderSoft/70 pb-1.5 text-left transition hover:text-ai last:border-b-0 last:pb-0"
          >
            <span className={cn("flex size-5 items-center justify-center rounded-md", index === 0 ? "bg-primary-soft text-primary" : index === 1 ? "bg-cyan-soft text-cyan" : "bg-danger-soft text-danger")}>
              <FilePlus2 className="size-3.5" />
            </span>
            <span className="truncate text-[12px] font-semibold text-textSecondary">{item.name}</span>
            <span className={cn("text-right text-[11px] font-semibold", index === 0 ? "text-primary" : index === 1 ? "text-[#EA7A1F]" : "text-danger")}>{item.missing}</span>
          </button>
        ))}
        {items.length === 0 ? <p className="py-4 text-center text-[11px] text-success">当前范围内资料均已完整</p> : null}
      </div>
    </SupplierModuleShell>
  );
}

function MatchCard({
  items,
  contextLabel,
  onMore,
  onSelectScope,
}: {
  items: Array<{ name: string; scope: string; count: number; rate: number }>;
  contextLabel: string;
  onMore: () => void;
  onSelectScope: (scope: string, label: string) => void;
}) {
  return (
    <SupplierModuleShell title="AI匹配项目需求" subtitle={`基于${contextLabel}计算设备覆盖`} action="更多匹配" onAction={onMore} className="min-h-[300px]">
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <button
            key={item.name}
            type="button"
            data-no-global-interaction
            onClick={() => onSelectScope(item.scope, item.name)}
            className="grid w-full grid-cols-[72px_1fr_44px] items-center gap-3 rounded-md px-1 py-0.5 text-left text-[12px] transition hover:bg-primary-soft/60"
          >
            <span className="font-semibold text-textSecondary">{item.name}</span>
            <div className="min-w-0">
              <div className="mb-1 flex justify-between text-[11px] text-textMuted">
                <span>匹配供应商 {item.count} 家</span>
                <span>匹配度</span>
              </div>
              <span className="block h-2.5 overflow-hidden rounded-full bg-[#EEF3F8]">
                <span className="block h-full rounded-full bg-success transition-[width]" style={{ width: `${item.rate}%` }} />
              </span>
            </div>
            <span className="text-right font-bold text-textMain">{item.rate}%</span>
          </button>
        ))}
      </div>
    </SupplierModuleShell>
  );
}

function DeliveryRiskCard({
  high,
  medium,
  low,
  contextLabel,
  onMore,
  onSelectRisk,
}: {
  high: number;
  medium: number;
  low: number;
  contextLabel: string;
  onMore: () => void;
  onSelectRisk: (risk: "high" | "medium" | "low") => void;
}) {
  const total = high + medium + low;
  const highRate = Math.round((high / Math.max(1, total)) * 1000) / 10;
  const mediumRate = Math.round((medium / Math.max(1, total)) * 1000) / 10;
  const lowRate = Math.max(0, Math.round((100 - highRate - mediumRate) * 10) / 10);

  return (
    <SupplierModuleShell title="AI交付风险分析" subtitle={`${contextLabel} · 共 ${total} 家`} action="更多分析" onAction={onMore} className="min-h-[300px]">
      <div className="mt-5 grid grid-cols-[minmax(118px,1fr)_minmax(116px,1fr)] items-center gap-3">
        <div className="relative flex h-[160px] items-center justify-center">
          <div
            className="size-[142px] rounded-full transition"
            style={{ background: `conic-gradient(#EF5A5A 0 ${highRate}%, #F5B84B ${highRate}% ${highRate + mediumRate}%, #58C29A ${highRate + mediumRate}% 100%)` }}
          />
          <div className="absolute size-[96px] rounded-full border border-borderSoft bg-white" />
          <div className="absolute flex max-w-[72px] flex-col items-center text-center">
            <div className="text-[28px] font-bold leading-8 text-textMain">{high}</div>
            <div className="mt-0.5 text-[11px] font-semibold leading-3 text-textMuted">
              高风险
              <br />
              供应商
            </div>
          </div>
        </div>
        <div className="space-y-4 text-[13px]">
          {[
            { key: "high" as const, label: "高风险", count: high, rate: highRate, className: "bg-danger" },
            { key: "medium" as const, label: "中风险", count: medium, rate: mediumRate, className: "bg-warning" },
            { key: "low" as const, label: "低风险", count: low, rate: lowRate, className: "bg-success" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              data-no-global-interaction
              onClick={() => onSelectRisk(item.key)}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-surface"
            >
              <span className={cn("size-3 rounded-sm", item.className)} />
              <span className="font-semibold text-textSecondary">{item.label}</span>
              <span className="ml-auto font-bold">{item.count} ({item.rate}%)</span>
            </button>
          ))}
        </div>
      </div>
    </SupplierModuleShell>
  );
}

function ScoreRadarCard({
  metrics,
  contextLabel,
  onMore,
}: {
  metrics: Array<{ label: string; value: number }>;
  contextLabel: string;
  onMore: () => void;
}) {
  function radarPoints(scale: number | number[]) {
    const values = Array.isArray(scale) ? scale : Array.from({ length: 5 }, () => scale);
    return values
      .map((value, index) => {
        const angle = (-90 + index * 72) * (Math.PI / 180);
        const radius = 66 * (value / 100);
        return `${90 + Math.cos(angle) * radius},${80 + Math.sin(angle) * radius}`;
      })
      .join(" ");
  }

  return (
    <SupplierModuleShell title="AI综合评分分布" subtitle={`${contextLabel}多维平均评分`} action="更多分析" onAction={onMore} className="min-h-[300px]">
      <div className="mt-4 flex h-[220px] flex-col items-center justify-center">
        <div className="text-center text-[13px] font-bold leading-4 text-textMain">
          {metrics[0].label}
          <div className="text-[16px] leading-5">{metrics[0].value}</div>
        </div>
        <div className="grid w-full max-w-[320px] grid-cols-[72px_1fr_72px] items-center gap-2">
          <div className="text-center text-[13px] font-bold leading-4 text-textMain">
            {metrics[4].label}
            <div className="text-[16px] leading-5">{metrics[4].value}</div>
          </div>
          <svg viewBox="0 0 180 160" className="h-[150px] w-full" aria-label="供应商综合评分雷达图">
            <polygon points={radarPoints(100)} fill="none" stroke="#D8E3F0" strokeWidth="2" />
            <polygon points={radarPoints(50)} fill="none" stroke="#E5EDF7" />
            <polygon points={radarPoints(metrics.map((item) => item.value))} fill="#2F6BFF" fillOpacity="0.22" stroke="#2F6BFF" strokeWidth="3" />
            {metrics.map((item, index) => {
              const point = radarPoints(metrics.map((metric, metricIndex) => (metricIndex === index ? metric.value : 0))).split(" ")[index].split(",");
              return <circle key={item.label} cx={point[0]} cy={point[1]} r="4" fill="#2F6BFF" />;
            })}
          </svg>
          <div className="text-center text-[13px] font-bold leading-4 text-textMain">
            {metrics[1].label}
            <div className="text-[16px] leading-5">{metrics[1].value}</div>
          </div>
        </div>
        <div className="grid w-full max-w-[260px] grid-cols-2 gap-10 text-center text-[13px] font-bold leading-4 text-textMain">
          <div>
            {metrics[3].label}
            <div className="text-[16px] leading-5">{metrics[3].value}</div>
          </div>
          <div>
            {metrics[2].label}
            <div className="text-[16px] leading-5">{metrics[2].value}</div>
          </div>
        </div>
      </div>
    </SupplierModuleShell>
  );
}

function PriorityContactCard({
  items,
  onMore,
  onContact,
}: {
  items: Array<{ name: string; reason: string }>;
  onMore: () => void;
  onContact: (supplierName: string) => void;
}) {
  return (
    <SupplierModuleShell title="AI优先联系名单" subtitle="今日推荐优先联系的供应商" action="更多名单" onAction={onMore} className="min-h-[142px]">
      <div className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <div key={item.name} className="grid grid-cols-[22px_minmax(0,1fr)_minmax(0,1.25fr)_48px] items-center gap-2 text-[12px]">
            <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white", index === 0 ? "bg-danger" : index === 1 ? "bg-warning" : "bg-[#F2B54B]")}>{index + 1}</span>
            <span className="truncate font-semibold text-textMain">{item.name}</span>
            <span className="truncate text-[11px] text-textMuted">推荐理由：{item.reason}</span>
            <button
              type="button"
              data-no-global-interaction
              onClick={() => onContact(item.name)}
              className="h-7 rounded-md border border-primary/30 bg-white text-[11px] font-semibold text-primary"
            >
              联系
            </button>
          </div>
        ))}
        {items.length === 0 ? <p className="py-4 text-center text-[11px] text-textMuted">当前范围内暂无优先联系供应商</p> : null}
      </div>
    </SupplierModuleShell>
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const toast = useMockToast();
  const supplierVerification = useSupplierVerification();
  const aiAction = useMockAiAction();
  const [filters, setFilters] = useState<SupplierFilters>(defaultSupplierFilters);
  const [appliedFilters, setAppliedFilters] = useState<SupplierFilters>(defaultSupplierFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentCategoryKey>("all");
  const [equipmentCategoryLabel, setEquipmentCategoryLabel] = useState("全部设备供应商");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [supplierData, setSupplierData] = useState<SupplierRecord[]>(supplierRecords);

  useEffect(() => {
    let active = true;

    fetch("/api/suppliers", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Supabase supplier query failed");
        return response.json() as Promise<{ data: SupplierDatabaseRow[] }>;
      })
      .then(({ data }) => {
        if (!active || !data.length) return;
        setSupplierData(
          data.map((row) =>
            mapSupplierDatabaseRow(
              row,
              supplierRecords.find(
                (record) =>
                  record.id === row.legacy_id ||
                  record.supplierCode === row.supplier_code,
              ),
            ),
          ),
        );
      })
      .catch(() => {
        if (active) {
          toast.warning(
            "已使用本地供应商数据",
            "Supabase 暂时不可用，页面已自动回退到已核验的 Mock 数据。",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [toast]);

  const baseFilteredSuppliers = useMemo(() => {
    const keyword = appliedFilters.keyword.trim().toLowerCase();

    return supplierData.filter((row) => {
      const rowSearchText = supplierSearchText(row);
      const matchesKeyword = !keyword || rowSearchText.includes(keyword);
      const matchesCountry = appliedFilters.country === "全部" || row.countryRegion === appliedFilters.country;
      const matchesCategory = appliedFilters.category === "全部" || row.category === appliedFilters.category;
      const matchesScope = appliedFilters.scope === "全部" || rowSearchText.includes(appliedFilters.scope.toLowerCase());
      const matchesResponse = appliedFilters.response === "全部" || row.responseSpeed === appliedFilters.response;
      const matchesRisk = appliedFilters.risk === "全部" || row.deliveryRisk === appliedFilters.risk;
      const matchesScore =
        appliedFilters.score === "全部" ||
        (appliedFilters.score === "90分以上" && row.overallScore >= 90) ||
        (appliedFilters.score === "80-89分" && row.overallScore >= 80 && row.overallScore < 90) ||
        (appliedFilters.score === "80分以下" && row.overallScore < 80);
      return matchesKeyword && matchesCountry && matchesCategory && matchesScope && matchesResponse && matchesRisk && matchesScore;
    });
  }, [appliedFilters, supplierData]);

  const filteredSuppliers = useMemo(
    () => baseFilteredSuppliers.filter((row) => matchesEquipmentCategory(row, equipmentCategory)),
    [baseFilteredSuppliers, equipmentCategory],
  );
  const analysisSuppliers = useMemo(() => {
    if (selectedIds.length === 0) {
      return filteredSuppliers;
    }
    return filteredSuppliers.filter((row) => selectedIds.includes(row.id));
  }, [filteredSuppliers, selectedIds]);
  const analysisContextLabel = selectedIds.length > 0
    ? `已选 ${analysisSuppliers.length} 家供应商`
    : `当前筛选 ${analysisSuppliers.length} 家供应商`;
  const recommendationItems = useMemo(
    () =>
      [...analysisSuppliers]
        .sort((left, right) => right.overallScore - left.overallScore)
        .slice(0, 3)
        .map((item) => ({
          name: item.supplierName,
          score: Math.round(item.overallScore * 0.75 + (item.dataCompleteness ?? item.overallScore) * 0.25),
        })),
    [analysisSuppliers],
  );
  const supplementCandidates = useMemo(
    () =>
      analysisSuppliers
        .filter((item) => item.verification?.missingFields.length)
        .sort((left, right) => (left.dataCompleteness ?? 0) - (right.dataCompleteness ?? 0)),
    [analysisSuppliers],
  );
  const supplementItems = supplementCandidates.slice(0, 3).map((item) => ({
    name: item.supplierName,
    missing: item.verification?.missingFields.slice(0, 2).join("、") || "资料待人工补全",
  }));
  const matchItems = useMemo(
    () => [
      buildMatchItem(analysisSuppliers, "水泵设备", "水泵", ["水泵", "泵类", "离心泵", "潜水泵"]),
      buildMatchItem(analysisSuppliers, "阀门管道", "阀门", ["阀门", "蝶阀", "管道", "管材"]),
      buildMatchItem(analysisSuppliers, "电气自动化", "自动化", ["电气", "自动化", "控制柜", "变频"]),
      buildMatchItem(analysisSuppliers, "仪表实验室", "实验室", ["仪表", "检测", "实验室", "分析仪"]),
    ],
    [analysisSuppliers],
  );
  const riskCounts = useMemo(
    () => ({
      high: analysisSuppliers.filter((item) => item.deliveryRisk === "high" || item.deliveryRisk === "critical").length,
      medium: analysisSuppliers.filter((item) => item.deliveryRisk === "medium").length,
      low: analysisSuppliers.filter((item) => item.deliveryRisk === "low").length,
    }),
    [analysisSuppliers],
  );
  const scoreMetrics = useMemo(() => {
    const average = (values: number[]) =>
      values.length > 0 ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;
    const responseScores = { 快: 95, 较快: 88, 一般: 75, 较慢: 60 } as const;
    const reliabilityScores = { low: 92, medium: 75, high: 48, critical: 35 } as const;

    return [
      { label: "响应速度", value: average(analysisSuppliers.map((item) => responseScores[item.responseSpeed])) },
      { label: "技术能力", value: average(analysisSuppliers.map((item) => item.technicalCapability)) },
      { label: "交付可靠性", value: average(analysisSuppliers.map((item) => reliabilityScores[item.deliveryRisk])) },
      { label: "价格竞争力", value: average(analysisSuppliers.map((item) => item.overallScore)) },
      { label: "服务质量", value: average(analysisSuppliers.map((item) => item.dataCompleteness ?? item.overallScore)) },
    ];
  }, [analysisSuppliers]);
  const priorityContacts = useMemo(
    () =>
      [...analysisSuppliers]
        .sort((left, right) => {
          const leftPriority = left.verification?.batch === "P0" ? 1 : 0;
          const rightPriority = right.verification?.batch === "P0" ? 1 : 0;
          return rightPriority - leftPriority || right.overallScore - left.overallScore;
        })
        .slice(0, 3)
        .map((item) => ({
          name: item.supplierName,
          reason:
            item.verification?.batch === "P0"
              ? "P0 核心供应商，建议优先完成人工复核"
              : `${item.verification?.batch ?? "待分批"} 供应商，综合评分 ${item.overallScore} 分`,
        })),
    [analysisSuppliers],
  );
  const pageCount = Math.max(1, Math.ceil(filteredSuppliers.length / supplierPageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedSuppliers = filteredSuppliers.slice((currentPage - 1) * supplierPageSize, currentPage * supplierPageSize);

  function toggleSupplier(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function handleSearch() {
    setAppliedFilters(filters);
    setPage(1);
    setSelectedIds([]);
    toast.success("筛选已应用", "供应商情报表已按当前条件刷新。");
  }

  function handleFilterChange(patch: Partial<SupplierFilters>) {
    setFilters((current) => {
      const next = { ...current, ...patch };
      setAppliedFilters(next);
      return next;
    });
    setPage(1);
    setSelectedIds([]);
  }

  function handleReset() {
    setFilters(defaultSupplierFilters);
    setAppliedFilters(defaultSupplierFilters);
    setEquipmentCategory("all");
    setEquipmentCategoryLabel("全部设备供应商");
    setPage(1);
    setSelectedIds([]);
    toast.info("筛选已重置", `已恢复本次导入的全部 ${supplierData.length} 家供应商。`);
  }

  function handleEquipmentCategorySelect(key: EquipmentCategoryKey, label: string) {
    setEquipmentCategory(key);
    setEquipmentCategoryLabel(label);
    setPage(1);
    setSelectedIds([]);
    toast.info("设备分类已切换", `当前显示「${label}」关联的 ${baseFilteredSuppliers.filter((row) => matchesEquipmentCategory(row, key)).length} 家供应商。`);
  }

  function applyQuickFilter(patch: Partial<SupplierFilters>, title: string, description: string) {
    const next = { ...defaultSupplierFilters, ...patch };
    setFilters(next);
    setAppliedFilters(next);
    setEquipmentCategory("all");
    setEquipmentCategoryLabel("全部设备供应商");
    setPage(1);
    setSelectedIds([]);
    toast.info(title, description);
  }

  function findSupplierByName(supplierName: string) {
    return supplierData.find((item) => item.supplierName === supplierName || item.supplierName.includes(supplierName) || supplierName.includes(item.supplierName));
  }

  function openSupplierDetail(supplierName: string) {
    const supplier = findSupplierByName(supplierName);
    if (!supplier) {
      toast.warning("未找到供应商", "当前供应商不在 mock 明细表中，请从供应商情报表进入。");
      return;
    }
    router.push(`/suppliers/${supplier.id}`);
  }

  function openSupplierGovernance(supplierName: string) {
    router.push(`/suppliers/manage?tab=incomplete&keyword=${encodeURIComponent(supplierName)}`);
  }

  function createInquiryForSupplier(supplierName: string) {
    const supplier = findSupplierByName(supplierName);
    if (!supplier) {
      toast.warning("未找到供应商", "无法带入供应商 ID，已为你打开创建询价页。");
      router.push("/inquiries/create?source=suppliers");
      return;
    }
    openInquiryWithVerification(supplier);
  }

  function openInquiryWithVerification(supplier: SupplierRecord) {
    const verification = supplierVerificationById[supplier.id];
    if (verification && !supplierVerification.canCreateInquiry(supplier.id)) {
      const reviewStatus = supplierVerification.getReviewStatus(supplier.id);
      const batchMessage = verification.legalEntityReviewStatus === "unresolved_channel"
        ? "该供应商法律主体尚未识别，暂不可创建询价。"
        : reviewStatus === "rejected"
          ? "该供应商人工复核未通过，暂不可创建询价。"
          : `该 ${verification.batch} 供应商尚未完成人工复核，暂不可创建询价。`;
      toast.warning("询价准入被拦截", `${batchMessage} 已为你打开资料维护审核队列。`);
      router.push(`/suppliers/manage?tab=pending&keyword=${encodeURIComponent(supplier.supplierName)}`);
      return;
    }
    router.push(`/inquiries/create?source=suppliers&supplierIds=${supplier.id}`);
  }

  function requireSelection(action: string) {
    if (selectedIds.length === 0) {
      toast.warning("请先选择供应商", `${action} 需要至少选择 1 家供应商。`);
      return false;
    }
    return true;
  }

  const columns = createSupplierColumns({
    selectedIds,
    onToggle: toggleSupplier,
    onMore: (row) => toast.info("更多操作", `${row.supplierName} 的更多动作将在后续弹出菜单中扩展。`),
    onCreateInquiry: openInquiryWithVerification,
  });

  function createInquiryFromSelection() {
    if (!requireSelection("创建询价任务")) {
      return;
    }
    const blocked = selectedIds
      .map((id) => supplierData.find((item) => item.id === id))
      .filter((item): item is SupplierRecord => Boolean(item))
      .filter((item) => !supplierVerification.canCreateInquiry(item.id));
    if (blocked.length > 0) {
      toast.warning("存在未通过人工复核的供应商", `已拦截 ${blocked.length} 家供应商。请先在资料维护页完成统一人工复核。`);
      router.push("/suppliers/manage?tab=pending");
      return;
    }
    router.push(`/inquiries/create?source=suppliers&supplierIds=${selectedIds.join(",")}`);
  }

  return (
    <AppLayout>
      <div data-no-global-interaction className="min-w-0 space-y-3 overflow-hidden">
        <PageHeader
          title="供应商库"
          description="集中管理水厂设备、地材、服务类供应商信息、报价记录与 AI 评估。"
          actions={
            <>
              <button type="button" data-no-global-interaction onClick={() => setUploadOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm transition hover:border-primary/30 hover:text-primary">
                <Upload className="size-4" aria-hidden="true" />
                导入供应商
              </button>
              <button type="button" data-no-global-interaction onClick={() => aiAction.run("AI供应商评估")} className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm transition hover:border-ai/40">
                <SearchCheck className="size-4" aria-hidden="true" />
                {aiAction.status === "running" ? "评估中..." : "AI评估"}
              </button>
              <Link href="/suppliers/manage" data-no-global-interaction className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan/30 bg-cyan-soft px-3 text-[13px] font-semibold text-cyan shadow-sm transition hover:border-cyan/50">
                <UsersRound className="size-4" aria-hidden="true" />
                管理供应商
              </Link>
              <button type="button" data-no-global-interaction onClick={() => setEditOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90">
                <Plus className="size-4" aria-hidden="true" />
                新增供应商
              </button>
            </>
          }
        />

        <RouteContextBanner title="已接收供应商链路上下文" />
        <SupplierKpiGrid />
        <SupplierFilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          onReset={handleReset}
          resultCount={filteredSuppliers.length}
        />

        <div className="grid min-w-0 gap-3 xl:grid-cols-[250px_minmax(0,1fr)]">
          <EquipmentSupplierTree selectedKey={equipmentCategory} suppliers={baseFilteredSuppliers} onSelect={handleEquipmentCategorySelect} />
          <div className="min-w-0">
            <DataTable
              columns={columns}
              data={pagedSuppliers}
              rowKey="id"
              density="compact"
              emptyTitle="当前设备分类下暂无匹配供应商"
              emptyDescription="请切换左侧设备分类，或调整国家、类型、设备范围和关键词筛选。"
              onRowClick={(row) => toggleSupplier(row.id)}
              rowClassName={(row) => (selectedIds.includes(row.id) ? "bg-primary-soft/55" : "")}
              actions={
                <ModuleHeader
                  icon={Handshake}
                  title="供应商情报明细"
                  subtitle={`${equipmentCategoryLabel} · ${filteredSuppliers.length} 家；已选 ${selectedIds.length} 家`}
                  tone="cyan"
                  density="compact"
                  action={
                    <div className="flex items-center gap-2">
                      {equipmentCategory !== "all" ? (
                        <button
                          type="button"
                          data-no-global-interaction
                          onClick={() => handleEquipmentCategorySelect("all", "全部设备供应商")}
                          className="rounded-pill border border-borderSoft bg-white px-2.5 py-1 text-[11px] font-semibold text-textSecondary"
                        >
                          清除分类
                        </button>
                      ) : null}
                      <button type="button" data-no-global-interaction onClick={() => aiAction.run("AI供应商评估")} className="rounded-pill border border-ai-border bg-ai-soft px-2.5 py-1 text-[11px] font-semibold text-ai">
                        AI供应商评估
                      </button>
                    </div>
                  }
                />
              }
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-textMuted">
                    共 <span className="font-bold text-textMain">{filteredSuppliers.length}</span> 家供应商，每页 15 家，当前第 {currentPage} / {pageCount} 页
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-no-global-interaction
                      disabled={currentPage === 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="上一页"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        data-no-global-interaction
                        onClick={() => setPage(pageNumber)}
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-md border text-[11px] font-bold transition",
                          pageNumber === currentPage
                            ? "border-primary bg-primary text-white"
                            : "border-borderSoft bg-white text-textSecondary hover:border-primary/30 hover:text-primary",
                        )}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      type="button"
                      data-no-global-interaction
                      disabled={currentPage === pageCount}
                      onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                      className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="下一页"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              }
            />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-5">
          <div className="grid gap-3 2xl:col-span-2">
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-2">
              <RecommendationCard
                items={recommendationItems}
                contextLabel={analysisContextLabel}
                onMore={() => applyQuickFilter({ score: "90分以上" }, "已筛选高匹配供应商", "供应商情报表已切换到 90 分以上的优先推荐范围。")}
                onOpenSupplier={openSupplierDetail}
              />
              <SupplementCard
                items={supplementItems}
                total={supplementCandidates.length}
                onMore={() => router.push("/suppliers/manage?tab=incomplete")}
                onOpenGovernance={openSupplierGovernance}
              />
            </div>
            <PriorityContactCard
              items={priorityContacts}
              onMore={() => router.push("/inquiries/create?source=suppliers")}
              onContact={createInquiryForSupplier}
            />
          </div>
          <MatchCard
            items={matchItems}
            contextLabel={analysisContextLabel}
            onMore={() => router.push("/inquiries/create?source=suppliers")}
            onSelectScope={(scope, label) => {
              handleFilterChange({ scope });
              toast.info("设备范围已联动", `供应商情报表已切换到「${label}」相关供应商。`);
            }}
          />
          <DeliveryRiskCard
            {...riskCounts}
            contextLabel={analysisContextLabel}
            onMore={() => applyQuickFilter({ risk: "high" }, "已筛选高风险供应商", "供应商情报表已切换到交付高风险记录。")}
            onSelectRisk={(risk) => {
              handleFilterChange({ risk });
              toast.info("风险分布已联动", `供应商情报表已切换到 ${risk} 风险记录。`);
            }}
          />
          <ScoreRadarCard
            metrics={scoreMetrics}
            contextLabel={analysisContextLabel}
            onMore={() => applyQuickFilter({ score: "80分以下" }, "已筛选低评分供应商", "供应商情报表已切换到综合评分低于 80 分的记录。")}
          />
        </div>

        <SupplierActionBar
          selectedCount={selectedIds.length}
          aiRunning={aiAction.status === "running"}
          onAdd={() => setEditOpen(true)}
          onImport={() => setUploadOpen(true)}
          onAiRecommend={() => aiAction.run("AI推荐供应商")}
          onAiComplete={() => {
            if (requireSelection("AI补全资料")) {
              aiAction.run("AI补全供应商资料");
            }
          }}
          onCreateInquiry={createInquiryFromSelection}
          onExport={() => setExportOpen(true)}
        />
      </div>

      <MockUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConfirm={() => {
          setUploadOpen(false);
          toast.success("供应商文件已模拟上传", "系统已创建供应商导入任务，待人工确认后入库。");
        }}
      />
      <MockExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(format) => {
          setExportOpen(false);
          toast.success("供应商库导出任务已创建", `导出格式：${format}，当前不会生成真实文件。`);
        }}
      />
      <EditDrawer
        open={editOpen}
        title="新增 / 编辑供应商"
        description="前端 mock 表单，用于演示供应商资料维护入口。"
        onClose={() => setEditOpen(false)}
        onSave={() => {
          setEditOpen(false);
          toast.success("供应商资料已保存", "当前仅更新前端演示状态。");
        }}
      />
    </AppLayout>
  );
}
