"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  Mail,
  Merge,
  MoreHorizontal,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { AiBadge, StatusBadge } from "@/components/badges";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog, DataTable, EditDrawer, MockExportDialog, MockUploadDialog, ModuleHeader } from "@/components/common";
import { supplierGovernanceRows, type SupplierGovernanceRow } from "@/data/mock/supplierManagement";
import { supplierManualReviewSummary } from "@/data/mock/supplierManualReviewQueue";
import { importedKanangaSuppliers } from "@/data/mock/importedKanangaSuppliers";
import {
  supplierVerificationById,
} from "@/data/mock/supplierVerificationRegistry";
import { useMockAiAction } from "@/hooks/useMockAiAction";
import { useMockToast } from "@/hooks/useMockToast";
import { useSupplierVerification } from "@/hooks/useSupplierVerification";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";

type SupplierMaintainRow = Record<string, unknown> &
  SupplierGovernanceRow & {
    country: string;
    countryCode: string;
    scope: string;
    contact: string;
    missingSummary: string;
    lastImport: string;
    aiAction: string;
  };

const rows: SupplierMaintainRow[] = supplierGovernanceRows.map((item) => {
  const importedSupplier = item.supplierId
    ? importedKanangaSuppliers.find((supplier) => supplier.id === item.supplierId)
    : undefined;

  return {
    ...item,
    country: importedSupplier?.countryRegion ?? "待核验",
    countryCode: importedSupplier?.countryCode ?? "--",
    scope: importedSupplier?.mainScope ?? "待分类",
    contact: importedSupplier?.contact ?? "待补全",
    missingSummary: item.missingFields.length > 0 ? item.missingFields.slice(0, 2).join("、") : "无",
    lastImport: importedSupplier?.importBatch ?? "待核验",
    aiAction: item.aiSuggestion || "等待人工复核",
  };
});

const kpis = [
  { label: "统一复核队列", value: String(supplierManualReviewSummary.total), trend: "P0/P1/P2 全部纳入", icon: UsersRound, tone: "purple" },
  { label: "冲突供应商", value: String(supplierManualReviewSummary.conflictSuppliers), trend: `${supplierManualReviewSummary.conflictFields} 个冲突字段`, icon: FileCheck2, tone: "orange" },
  { label: "重复来源组", value: String(supplierManualReviewSummary.duplicateGroups), trend: "归并主档并保留来源", icon: Merge, tone: "green" },
  { label: "关键阻断", value: String(supplierManualReviewSummary.blocked), trend: "主体未识别，不得询价", icon: ShieldCheck, tone: "red" },
  { label: "高优先复核", value: String(supplierManualReviewSummary.high + supplierManualReviewSummary.critical), trend: "优先处理冲突与缺失", icon: Sparkles, tone: "purple" },
] as const;

type ManageTab = "all" | "incomplete" | "pending" | "duplicate" | "abnormal" | "disabled";

type ManageFilters = {
  country: string;
  scope: string;
  category: string;
  reviewStatus: string;
  completeness: string;
  keyword: string;
};

const defaultManageFilters: ManageFilters = {
  country: "全部",
  scope: "全部",
  category: "全部",
  reviewStatus: "全部",
  completeness: "全部",
  keyword: "",
};

const tabs: Array<{ label: string; value: ManageTab }> = [
  { label: "全部供应商", value: "all" },
  { label: "资料待补全", value: "incomplete" },
  { label: "待审核", value: "pending" },
  { label: "重复记录", value: "duplicate" },
  { label: "异常供应商", value: "abnormal" },
  { label: "已禁用", value: "disabled" },
];

const toneMap = {
  purple: {
    icon: "from-[#8B5CF6] to-[#6D5DFB] text-white shadow-[#7C3AED]/25",
    soft: "bg-ai-soft",
    label: "text-ai",
    value: "text-ai",
    wave: "text-ai",
  },
  orange: {
    icon: "from-[#FDBA3B] to-[#F97316] text-white shadow-[#F97316]/25",
    soft: "bg-warning-soft",
    label: "text-warning",
    value: "text-warning",
    wave: "text-warning",
  },
  red: {
    icon: "from-[#FB7185] to-[#EF4444] text-white shadow-[#EF4444]/25",
    soft: "bg-danger-soft",
    label: "text-danger",
    value: "text-danger",
    wave: "text-danger",
  },
  green: {
    icon: "from-[#34D399] to-[#16A34A] text-white shadow-[#16A34A]/25",
    soft: "bg-success-soft",
    label: "text-success",
    value: "text-success",
    wave: "text-success",
  },
} as const;

const auditText = {
  confirmed: "已审核",
  pending: "待审核",
  need_info: "待补全",
  rejected: "已退回",
} as const;

const legalEntityStatusMap = {
  confirmed_with_public_evidence: { label: "公开证据已确认", className: "bg-success-soft text-success" },
  exact_name_pending_registry: { label: "同名待公示复核", className: "bg-primary-soft text-primary" },
  candidate_pending_registry: { label: "候选主体待复核", className: "bg-warning-soft text-warning" },
  unresolved_channel: { label: "渠道主体未识别", className: "bg-danger-soft text-danger" },
} as const;

const phase2VerificationStatusMap = {
  verified: { label: "已核验", className: "bg-success-soft text-success" },
  partial: { label: "部分核验", className: "bg-primary-soft text-primary" },
  missing: { label: "缺失", className: "bg-warning-soft text-warning" },
  manual_required: { label: "人工查询", className: "bg-warning-soft text-warning" },
  risk_found: { label: "有风险", className: "bg-danger-soft text-danger" },
} as const;

const reviewPriorityMap = {
  critical: { label: "关键阻断", className: "bg-danger-soft text-danger" },
  high: { label: "高优先", className: "bg-warning-soft text-warning" },
  medium: { label: "中优先", className: "bg-primary-soft text-primary" },
  low: { label: "低优先", className: "bg-success-soft text-success" },
} as const;

const reviewStatusLabelToValue: Record<string, SupplierGovernanceRow["reviewStatus"] | "全部"> = {
  全部: "全部",
  已审核: "confirmed",
  待审核: "pending",
  待补全: "need_info",
  已退回: "rejected",
};

function matchesTab(row: SupplierMaintainRow, tab: ManageTab) {
  if (tab === "all") {
    return true;
  }
  if (tab === "incomplete") {
    return row.completeness < 90 || row.missingFields.length > 0 || row.reviewStatus === "need_info";
  }
  if (tab === "pending") {
    return row.reviewStatus === "pending";
  }
  if (tab === "duplicate") {
    return row.duplicateRisk !== "low";
  }
  if (tab === "abnormal") {
    return row.reviewStatus === "rejected" || row.completeness < 70 || row.contactStatus !== "complete" || row.emailStatus !== "complete";
  }
  return row.reviewStatus === "rejected";
}

function matchesFilters(row: SupplierMaintainRow, filters: ManageFilters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const reviewStatus = reviewStatusLabelToValue[filters.reviewStatus] ?? "全部";

  const matchesKeyword =
    !keyword ||
    [row.supplierCode, row.supplierName, row.country, row.countryCode, row.scope, row.contact, row.aiSuggestion, row.aiAction]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  const matchesCountry = filters.country === "全部" || row.country === filters.country;
  const matchesScope = filters.scope === "全部" || row.scope.includes(filters.scope);
  const matchesCategory =
    filters.category === "全部" ||
    (filters.category === "设备供应商" && row.scope.includes("设备")) ||
    (filters.category === "地材供应商" && (row.scope.includes("钢材") || row.scope.includes("管材"))) ||
    (filters.category === "服务供应商" && row.scope.includes("服务"));
  const matchesReview = reviewStatus === "全部" || row.reviewStatus === reviewStatus;
  const matchesCompleteness =
    filters.completeness === "全部" ||
    (filters.completeness === "90%以上" && row.completeness >= 90) ||
    (filters.completeness === "70-89%" && row.completeness >= 70 && row.completeness < 90) ||
    (filters.completeness === "70%以下" && row.completeness < 70);

  return matchesKeyword && matchesCountry && matchesScope && matchesCategory && matchesReview && matchesCompleteness;
}

function MiniWave({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-14", className)} viewBox="0 0 60 20" fill="none" aria-hidden="true">
      <path
        d="M2 14 C8 14 10 7 16 7 C22 7 23 15 30 15 C36 15 38 5 44 5 C50 5 51 12 58 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("flex size-7 items-center justify-center rounded-[9px] bg-ai-soft text-ai", className)}>
      {children}
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  icon: Icon = Sparkles,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <ModuleHeader
      icon={Icon}
      title={title}
      subtitle={subtitle}
      tone={title.includes("AI") ? "purple" : title.includes("风险") || title.includes("重复") ? "orange" : "blue"}
      headingLevel={3}
      action={
        action ? (
          <button type="button" onClick={onAction} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-primary">
            {action}
            <ChevronRight className="size-3.5" />
          </button>
        ) : null
      }
    />
  );
}

function KpiCards() {
  return (
    <div className="grid min-w-[980px] grid-cols-5 gap-3">
      {kpis.map((item) => {
        const Icon = item.icon;
        const tone = toneMap[item.tone];
        return (
          <section key={item.label} className="rounded-[10px] border border-borderSoft bg-white px-5 py-4 shadow-card">
            <div className="flex items-center gap-4">
              <span className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-[17px]", tone.soft)}>
                <span className={cn("absolute inset-1 rounded-[14px] blur-md", tone.soft)} />
                <span className={cn("relative flex size-12 items-center justify-center rounded-[15px] bg-gradient-to-br shadow-lg", tone.icon)}>
                  <Icon className="size-7 drop-shadow-sm" strokeWidth={2.35} />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn("text-[13px] font-extrabold", tone.label)}>{item.label}</div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className={cn("text-[30px] font-extrabold leading-8 tabular-nums", tone.value)}>{item.value}</span>
                  <MiniWave className={tone.wave} />
                </div>
                <div className="mt-1 text-[12px] font-semibold text-textMuted">{item.trend}</div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FilterBlock({
  activeTab,
  filters,
  resultCount,
  onTabChange,
  onChange,
  onSearch,
  onReset,
}: {
  activeTab: ManageTab;
  filters: ManageFilters;
  resultCount: number;
  onTabChange: (tab: ManageTab) => void;
  onChange: (filters: ManageFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}) {
  const selectFilters = [
    { key: "country", label: "国家/地区", options: ["全部", "中国", "德国", "肯尼亚", "刚果(金)", "南非"] },
    { key: "scope", label: "主营范围", options: ["全部", "水泵/阀门", "阀门/执行器", "钢材", "水处理设备", "机电设备"] },
    { key: "category", label: "供应商类别", options: ["全部", "设备供应商", "地材供应商", "服务供应商"] },
    { key: "reviewStatus", label: "审核状态", options: ["全部", "已审核", "待审核", "待补全", "已退回"] },
    { key: "completeness", label: "资料完整度", options: ["全部", "90%以上", "70-89%", "70%以下"] },
  ] as const;

  return (
    <section className="rounded-[10px] border border-borderSoft bg-white shadow-card">
      <div className="flex border-b border-borderSoft px-4">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "h-10 border-b-2 px-5 text-[13px] font-bold",
              activeTab === tab.value ? "border-primary text-primary" : "border-transparent text-textSecondary hover:text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="grid min-w-[980px] grid-cols-[repeat(5,minmax(120px,1fr))_minmax(240px,2fr)_72px_92px] items-end gap-2 px-4 py-3">
        {selectFilters.map((filter) => (
          <label key={filter.key} className="min-w-0">
            <span className="sr-only">{filter.label}</span>
            <select
              value={filters[filter.key]}
              onChange={(event) => onChange({ ...filters, [filter.key]: event.target.value })}
              className="h-9 w-full rounded-md border border-borderSoft bg-white px-2 text-[12px] font-semibold text-textSecondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {filter.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
        <label className="flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textMuted focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
          <Search className="size-4" />
          <input
            value={filters.keyword}
            onChange={(event) => onChange({ ...filters, keyword: event.target.value })}
            className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-textMuted"
            placeholder="搜索供应商名称/联系人/WhatsApp/邮箱"
          />
        </label>
        <button type="button" onClick={onReset} className="h-9 rounded-md border border-borderSoft bg-white text-[12px] font-bold text-textSecondary hover:bg-[var(--color-bg-muted)]">
          重置
        </button>
        <button type="button" onClick={onSearch} className="h-9 rounded-md bg-primary text-[12px] font-bold text-white shadow-sm hover:bg-primary-hover">
          查询
        </button>
      </div>
      <div className="border-t border-borderSoft px-4 py-2 text-[12px] font-semibold text-textMuted">当前显示 {resultCount} 条资料治理记录</div>
    </section>
  );
}

function Toolbar({
  selectedCount,
  aiRunning,
  onBatchComplete,
  onReview,
  onMarkRisk,
  onExport,
  onRefresh,
}: {
  selectedCount: number;
  aiRunning: boolean;
  onBatchComplete: () => void;
  onReview: () => void;
  onMarkRisk: () => void;
  onExport: () => void;
  onRefresh: () => void;
}) {
  const actions = [
    [`已选择 ${selectedCount} 项`, CheckCircle2, "bg-white text-textSecondary border-borderSoft", undefined],
    [aiRunning ? "AI补全中..." : "批量补全", WandSparkles, "bg-primary-soft text-primary border-primary/20", onBatchComplete],
    ["批量审核", ClipboardCheck, "bg-primary-soft text-primary border-primary/20", onReview],
    ["标记异常", AlertTriangle, "bg-danger-soft text-danger border-danger/20", onMarkRisk],
    ["导出数据", Download, "bg-white text-textSecondary border-borderSoft", onExport],
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-borderSoft bg-white px-3 py-2 shadow-card">
      <div className="flex flex-wrap gap-2">
        {actions.map(([label, Icon, className, onClick]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-bold transition hover:-translate-y-px", className)}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {[
          [RefreshCw, onRefresh, "刷新"],
          [ShieldCheck, onReview, "审核"],
          [MoreHorizontal, onExport, "更多"],
        ].map(([Icon, onClick, label]) => {
          const IconComponent = Icon as LucideIcon;
          return (
          <button key={label as string} type="button" onClick={onClick as () => void} className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:bg-[var(--color-bg-muted)]" aria-label={label as string}>
            <IconComponent className="size-4" />
          </button>
          );
        })}
      </div>
    </div>
  );
}

function createColumns({
  selectedIds,
  onToggle,
  onEdit,
  onReview,
  onMore,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onEdit: (row: SupplierMaintainRow) => void;
  onReview: (row: SupplierMaintainRow) => void;
  onMore: (row: SupplierMaintainRow) => void;
}): DataTableColumn<SupplierMaintainRow>[] {
  return [
  {
    key: "select",
    header: "",
    className: "min-w-[32px]",
    render: (row) => (
      <input
        type="checkbox"
        checked={selectedIds.includes(row.id)}
        onClick={(event) => event.stopPropagation()}
        onChange={() => onToggle(row.id)}
        className="size-3.5 rounded border-borderSoft accent-primary"
        aria-label={`选择 ${row.supplierName}`}
      />
    ),
  },
  { key: "supplierCode", header: "供应商编号", className: "min-w-[118px] text-[11px] text-textSecondary" },
  { key: "supplierName", header: "供应商名称", className: "min-w-[168px] font-semibold" },
  {
    key: "candidateLegalEntity",
    header: "候选法律主体",
    className: "min-w-[190px]",
    render: (row) => (
      <div>
        <p className="line-clamp-2 text-[12px] font-semibold text-textMain">{row.candidateLegalEntity ?? "非本次导入记录"}</p>
        {row.verificationBatch ? <span className="mt-1 inline-flex rounded-md bg-ai-soft px-1.5 py-0.5 text-[10px] font-bold text-ai">{row.verificationBatch}</span> : null}
      </div>
    ),
  },
  {
    key: "legalEntityReviewStatus",
    header: "主体消歧状态",
    className: "min-w-[118px]",
    render: (row) => {
      const status = row.legalEntityReviewStatus
        ? legalEntityStatusMap[row.legalEntityReviewStatus]
        : { label: "待建立总账", className: "bg-surface text-textMuted" };
      return <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold", status.className)}>{status.label}</span>;
    },
  },
  {
    key: "phase2Verification",
    header: "四域核验",
    className: "min-w-[188px]",
    render: (row) => {
      const items = [
        ["工商", row.businessVerificationStatus],
        ["联系", row.contactVerificationStatus],
        ["资质", row.qualificationVerificationStatus],
        ["风险", row.riskVerificationStatus],
      ] as const;

      return (
        <div className="grid grid-cols-2 gap-1">
          {items.map(([label, status]) => {
            const config = status ? phase2VerificationStatusMap[status] : null;
            return (
              <span
                key={label}
                className={cn(
                  "inline-flex min-w-0 items-center justify-between gap-1 rounded-md px-1.5 py-1 text-[9px] font-bold",
                  config?.className ?? "bg-surface text-textMuted",
                )}
                title={`${label}：${config?.label ?? "待建立"}`}
              >
                <span>{label}</span>
                <span className="truncate">{config?.label ?? "待建立"}</span>
              </span>
            );
          })}
        </div>
      );
    },
  },
  {
    key: "countryDisplay",
    header: "国家/地区",
    className: "min-w-[88px]",
    render: (row) => (
      <span>
        {row.countryCode === "CN" ? "中国" : row.countryCode === "DE" ? "德国" : row.countryCode === "KE" ? "肯尼亚" : row.countryCode === "ZA" ? "南非" : "刚果(金)"}
      </span>
    ),
  },
  {
    key: "completeness",
    header: "资料完整度",
    className: "min-w-[112px]",
    render: (row) => (
      <div className="flex items-center gap-2">
        <span>{row.completeness}%</span>
        <span className="h-1.5 w-12 rounded-full bg-borderSoft">
          <span
            className={cn("block h-full rounded-full", row.completeness >= 80 ? "bg-success" : row.completeness >= 60 ? "bg-warning" : "bg-danger")}
            style={{ width: `${row.completeness}%` }}
          />
        </span>
      </div>
    ),
  },
  {
    key: "missingSummary",
    header: "缺失字段",
    className: "min-w-[112px]",
    render: (row) => (
      <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", row.missingSummary === "无" ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
        {row.missingSummary}
      </span>
    ),
  },
  { key: "contact", header: "联系人", className: "min-w-[74px]" },
  { key: "whatsappStatus", header: "WhatsApp", className: "min-w-[74px]", render: (row) => (row.whatsappStatus === "complete" ? <Phone className="size-4 text-success" /> : <Phone className="size-4 text-danger" />) },
  { key: "emailStatus", header: "邮箱", className: "min-w-[58px]", render: (row) => (row.emailStatus === "complete" ? <Mail className="size-4 text-success" /> : <Mail className="size-4 text-danger" />) },
  { key: "scope", header: "主营范围", className: "min-w-[104px]" },
  { key: "lastImport", header: "最近导入批次", className: "min-w-[112px]" },
  { key: "reviewStatus", header: "审核状态", className: "min-w-[82px]", render: (row) => <StatusBadge status={row.reviewStatus} label={auditText[row.reviewStatus]} className="h-5 text-[11px]" /> },
  {
    key: "verificationConfidence",
    header: "核验可信度",
    className: "min-w-[88px]",
    render: (row) => <span className="font-bold text-ai">{row.verificationConfidence ?? "--"}{row.verificationConfidence ? "%" : ""}</span>,
  },
  {
    key: "reviewQueue",
    header: "治理队列",
    className: "min-w-[156px]",
    render: (row) => {
      const priority = row.reviewPriority ? reviewPriorityMap[row.reviewPriority] : null;
      const duplicateCount = row.duplicateSourceRows?.length ?? 0;
      return (
        <div className="space-y-1">
          <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold", priority?.className ?? "bg-surface text-textMuted")}>
            {priority?.label ?? "待分级"}
          </span>
          <p className="whitespace-nowrap text-[10px] text-textMuted">
            冲突 {row.conflictCount ?? 0} · 重复 {duplicateCount > 1 ? duplicateCount : 0} · 缺失 {row.missingFields.length}
          </p>
          {row.reviewStatus === "confirmed" ? (
            <p className="text-[10px] font-bold text-success">已写入系统 · 原始证据保留</p>
          ) : null}
        </div>
      );
    },
  },
  { key: "aiAction", header: "AI补全建议", className: "min-w-[150px]", render: (row) => <span className="text-[12px] text-textSecondary">{row.aiAction}</span> },
  {
    key: "actions",
    header: "操作",
    className: "min-w-[152px]",
    render: (row) => (
      <div className="flex items-center gap-2 text-primary" onClick={(event) => event.stopPropagation()}>
        <Link
          href={`/suppliers/${row.supplierCode}`}
          className="inline-flex size-7 items-center justify-center rounded-md border border-primary/20 bg-primary-soft text-primary hover:border-primary/40"
          title="查看供应商档案"
        >
          <Eye className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:border-primary/30 hover:text-primary"
          title="编辑资料"
        >
          <Pencil className="size-4" />
        </button>
        {row.supplierId ? (
          <button
            type="button"
            onClick={() => onReview(row)}
            className="inline-flex size-7 items-center justify-center rounded-md border border-success/20 bg-success-soft text-success hover:border-success/40"
            title="人工复核"
          >
            <ClipboardCheck className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onMore(row)}
          className="inline-flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:border-ai/30 hover:text-ai"
          title="更多治理动作"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    ),
  },
];
}

function AiSuggestionPanel({ onShowAll, onComplete }: { onShowAll: () => void; onComplete: (name: string) => void }) {
  const suggestions = [
    ["SinoFlow Pumps Co., Ltd.", "建议补全", "建议补充公司成立年限、认证资质等信息", "green"],
    ["EastAfrica Steel Ltd.", "建议补全", "建议补充WhatsApp、邮箱联系方式", "green"],
    ["Grundfos South Africa (Pty)Ltd", "建议补全", "建议补充主营范围、联系方式", "orange"],
  ] as const;

  return (
    <section className="rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="AI 智能补全建议" subtitle="共 24 条待补全建议" action="查看全部" onAction={onShowAll} icon={Sparkles} />
      <div className="-mt-1 mb-2">
        <AiBadge label="AI补全" icon="suggestion" className="h-5 text-[11px]" />
      </div>
      <div className="space-y-2.5">
        {suggestions.map(([name, tag, desc, tone]) => (
          <div key={name} className="rounded-lg border border-borderSoft bg-white px-3 py-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-extrabold text-textMain">{name}</span>
              <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", tone === "green" ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>{tag}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="line-clamp-2 text-[12px] leading-5 text-textSecondary">{desc}</p>
              <button
                type="button"
                onClick={() => onComplete(name)}
                className="h-8 shrink-0 rounded-md border border-ai/30 bg-ai-soft px-3 text-[12px] font-extrabold text-ai"
              >
                立即补全
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompletenessPanel({ onView }: { onView: () => void }) {
  const items = [
    ["完整（90-100%）", "56 (25.9%)", "bg-success"],
    ["较完整（70-89%）", "92 (42.6%)", "bg-primary"],
    ["一般（50-69%）", "48 (22.2%)", "bg-warning"],
    ["缺失较多（<50%）", "20 (9.3%)", "bg-danger"],
  ] as const;

  return (
    <section className="rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="资料完整度分布" action="查看详情" onAction={onView} icon={WandSparkles} />
      <div className="grid grid-cols-[118px_minmax(0,1fr)] items-center gap-3">
        <DonutGraphic
          size={116}
          inner={72}
          centerTop="216"
          centerBottom="供应商总数"
          gradient="conic-gradient(#22C55E 0 25.9%, #2F6BFF 25.9% 68.5%, #F59E0B 68.5% 90.7%, #EF4444 90.7% 100%)"
        />
        <div className="space-y-2">
          {items.map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between gap-2 text-[12px] font-semibold text-textSecondary">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", color)} />
                <span className="truncate">{label}</span>
              </span>
              <span className="shrink-0 text-textMain">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickActionsPanel({
  onBatchComplete,
  onMerge,
  onImport,
  onExport,
}: {
  onBatchComplete: () => void;
  onMerge: () => void;
  onImport: () => void;
  onExport: () => void;
}) {
  const actions = [
    ["批量补全资料", "AI自动补全缺失信息", WandSparkles, onBatchComplete],
    ["去重合并", "合并重复供应商记录", Merge, onMerge],
    ["导入记录", "查看历史导入日志", Upload, onImport],
    ["资料导出", "导出供应商资料", Download, onExport],
  ] as const;

  return (
    <section className="rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="快捷操作" icon={ClipboardCheck} />
      <div className="grid grid-cols-2 gap-2">
        {actions.map(([label, desc, Icon, onClick]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex min-h-[54px] items-center gap-2 rounded-lg border border-borderSoft bg-white px-2.5 text-left transition hover:border-ai/40 hover:bg-ai-soft/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-ai-soft text-ai">
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-extrabold text-textMain">{label}</span>
              <span className="mt-0.5 block truncate text-[10px] font-medium text-textMuted">{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RightPanel({
  onShowSuggestions,
  onCompleteSuggestion,
  onViewCompleteness,
  onBatchComplete,
  onMerge,
  onImport,
  onExport,
}: {
  onShowSuggestions: () => void;
  onCompleteSuggestion: (name: string) => void;
  onViewCompleteness: () => void;
  onBatchComplete: () => void;
  onMerge: () => void;
  onImport: () => void;
  onExport: () => void;
}) {
  return (
    <aside className="space-y-3">
      <AiSuggestionPanel onShowAll={onShowSuggestions} onComplete={onCompleteSuggestion} />
      <CompletenessPanel onView={onViewCompleteness} />
      <QuickActionsPanel onBatchComplete={onBatchComplete} onMerge={onMerge} onImport={onImport} onExport={onExport} />
    </aside>
  );
}

function DuplicatePanel({ onShowAll, onMerge }: { onShowAll: () => void; onMerge: (name: string) => void }) {
  const items = [
    ["SinoFlow Pumps Co., Ltd.", "3 条记录"],
    ["Aqua Congo Services SARL", "2 条记录"],
    ["Hebei Pipe Industry", "2 条记录"],
  ];

  return (
    <section className="flex h-[210px] flex-col rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <IconBox>
            <Merge className="size-4" />
          </IconBox>
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-extrabold leading-5 text-textMain">重复供应商检测</h3>
            <p className="mt-1 text-[12px] font-medium text-textMuted">发现 11 组重复记录</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-danger-soft px-2 py-1 text-[11px] font-bold text-danger">高风险重复</span>
      </div>
      <div className="space-y-1.5">
        {items.map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => onMerge(name)}
            className="grid h-8 grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-2 rounded-lg border border-borderSoft px-2 text-left text-[12px] transition hover:border-ai/30 hover:bg-ai-soft/30"
          >
            <span className="truncate font-bold text-textSecondary">{name}</span>
            <span className="whitespace-nowrap rounded bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-center font-semibold text-textSecondary">{count}</span>
            <span className="whitespace-nowrap rounded bg-success-soft px-1.5 py-0.5 text-center font-bold text-success">合并建议</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onShowAll}
        className="mx-auto mt-3 flex h-8 shrink-0 items-center justify-center rounded-md border border-ai/25 bg-ai-soft px-4 text-[12px] font-extrabold text-ai"
      >
        查看全部重复记录
      </button>
    </section>
  );
}

function MissingStatsPanel({ onSelectMissing }: { onSelectMissing: (label: string) => void }) {
  const items = [
    ["WhatsApp 缺失", "16", "占比 25.4%"],
    ["邮箱缺失", "15", "占比 23.8%"],
    ["主营范围缺失", "14", "占比 22.2%"],
    ["联系人缺失", "10", "占比 15.9%"],
    ["公司资质缺失", "8", "占比 12.7%"],
  ];

  return (
    <section className="h-[210px] rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="资料缺失统计" subtitle="共发现 63 条采购缺失" icon={FileCheck2} />
      <div className="space-y-2.5 pt-1">
        {items.map(([label, value, percent]) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelectMissing(label)}
            className="grid grid-cols-[minmax(0,1fr)_32px_70px] items-center gap-2 rounded-md px-1 py-0.5 text-left text-[12px] transition hover:bg-ai-soft/30"
          >
            <span className="truncate font-semibold text-textSecondary">{label}</span>
            <span className="text-right font-extrabold text-textMain">{value}</span>
            <span className="text-right font-semibold text-textSecondary">{percent}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BarPanel({ onSelectMonth }: { onSelectMonth: (month: number) => void }) {
  const values = [28, 36, 42, 38, 32, 40];
  return (
    <section className="h-[210px] rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="导入批次分布" subtitle="近 6 个月导入情况" icon={Upload} />
      <div className="flex h-[126px] items-end justify-around gap-4 px-1">
        {values.map((value, index) => (
          <button key={index} type="button" onClick={() => onSelectMonth(index + 1)} className="flex flex-1 flex-col items-center gap-1 rounded-md transition hover:bg-ai-soft/30">
            <span className="text-[12px] font-extrabold text-textMain">{value}</span>
            <span
              className="w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-[#7C3AED] to-[#A78BFA] shadow-[0_8px_18px_rgba(124,58,237,0.18)]"
              style={{ height: `${value * 1.55}px` }}
            />
            <span className="text-[11px] font-semibold text-textMuted">{index + 1}月</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DonutGraphic({
  size,
  inner,
  centerTop,
  centerBottom,
  gradient,
}: {
  size: number;
  inner: number;
  centerTop: string;
  centerBottom: string;
  gradient: string;
}) {
  return (
    <div className="relative flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: gradient }}>
      <div className="absolute rounded-full bg-white" style={{ width: inner, height: inner }} />
      <div className="relative flex w-[62px] flex-col items-center justify-center text-center leading-none">
        <div className="text-[22px] font-extrabold tabular-nums text-textMain">{centerTop}</div>
        <div className="mt-1 text-[11px] font-semibold leading-4 text-textMuted">{centerBottom}</div>
      </div>
    </div>
  );
}

function AuditStatusPanel({ onSelectStatus }: { onSelectStatus: (status: string) => void }) {
  const items = [
    ["已审核", "146 (67.6%)", "bg-success"],
    ["待审核", "38 (17.6%)", "bg-warning"],
    ["待补全", "24 (11.1%)", "bg-ai"],
    ["已禁用", "8 (3.7%)", "bg-slate-500"],
  ] as const;

  return (
    <section className="h-[210px] rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="审核状态分布" subtitle="供应商审核状态统计" icon={ShieldCheck} />
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
        <DonutGraphic
          size={112}
          inner={70}
          centerTop="216"
          centerBottom="总数"
          gradient="conic-gradient(#22C55E 0 67.6%, #F59E0B 67.6% 85.2%, #7C3AED 85.2% 96.3%, #64748B 96.3% 100%)"
        />
        <div className="space-y-2">
          {items.map(([label, value, color]) => (
            <button
              key={label}
              type="button"
              onClick={() => onSelectStatus(label)}
              className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left text-[12px] font-semibold text-textSecondary transition hover:bg-ai-soft/30"
            >
              <span className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", color)} />
                {label}
              </span>
              <span className="text-textMain">{value}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function EffectPanel({ onInspect }: { onInspect: (metric: string) => void }) {
  const metrics = [
    ["补全总数", "45", ShieldCheck, "text-primary"],
    ["补全准确率", "92.6%", CheckCircle2, "text-success"],
    ["节省时间", "32.5 h", RefreshCw, "text-primary"],
    ["本月处理", "18 供应商", ClipboardCheck, "text-primary"],
  ] as const;

  return (
    <section className="h-[210px] rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="AI 补全效果" subtitle="本月 AI 补全效果累计" icon={Sparkles} />
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(([label, value, Icon, color]) => (
          <button
            key={label}
            type="button"
            onClick={() => onInspect(label)}
            className="flex h-[58px] items-center gap-2 rounded-lg bg-[var(--color-bg-muted)] px-2.5 text-left transition hover:bg-ai-soft/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-ai-soft text-ai">
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-textSecondary">{label}</span>
            <span className={cn("mt-0.5 block whitespace-nowrap text-[17px] font-extrabold tabular-nums", color)}>{value}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BottomPanels({
  onDuplicateAll,
  onMergeDuplicate,
  onMissingSelect,
  onBatchSelect,
  onAuditSelect,
  onEffectInspect,
}: {
  onDuplicateAll: () => void;
  onMergeDuplicate: (name: string) => void;
  onMissingSelect: (label: string) => void;
  onBatchSelect: (month: number) => void;
  onAuditSelect: (status: string) => void;
  onEffectInspect: (metric: string) => void;
}) {
  return (
    <div className="grid min-w-[1280px] grid-cols-[1.25fr_1.05fr_1.2fr_1.25fr_1.25fr] gap-3">
      <DuplicatePanel onShowAll={onDuplicateAll} onMerge={onMergeDuplicate} />
      <MissingStatsPanel onSelectMissing={onMissingSelect} />
      <BarPanel onSelectMonth={onBatchSelect} />
      <AuditStatusPanel onSelectStatus={onAuditSelect} />
      <EffectPanel onInspect={onEffectInspect} />
    </div>
  );
}

function SupplierManageContent() {
  const searchParams = useSearchParams();
  const toast = useMockToast();
  const aiAction = useMockAiAction("供应商资料治理");
  const supplierVerification = useSupplierVerification();
  const requestedTab = searchParams.get("tab") as ManageTab | null;
  const initialTab = requestedTab && tabs.some((item) => item.value === requestedTab) ? requestedTab : "all";
  const initialFilters = { ...defaultManageFilters, keyword: searchParams.get("keyword") ?? "" };
  const [activeTab, setActiveTab] = useState<ManageTab>(initialTab);
  const [filters, setFilters] = useState<ManageFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ManageFilters>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editRow, setEditRow] = useState<SupplierMaintainRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "default" | "warning" | "danger";
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);

  const reviewedRows = useMemo(
    () =>
      rows.map((row) => {
        if (!row.supplierId) return row;
        const status = supplierVerification.getReviewStatus(row.supplierId);
        return {
          ...row,
          reviewStatus: status === "approved" ? "confirmed" as const : status === "rejected" ? "rejected" as const : "pending" as const,
          duplicateRisk:
            row.supplierId && supplierVerification.isDuplicateResolved(row.supplierId)
              ? "low" as const
              : row.duplicateRisk,
        };
      }),
    [supplierVerification],
  );

  const filteredRows = useMemo(
    () => reviewedRows.filter((row) => matchesTab(row, activeTab) && matchesFilters(row, appliedFilters)),
    [reviewedRows, activeTab, appliedFilters]
  );

  function toggleRow(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function requireSelection(action: string) {
    if (selectedIds.length === 0) {
      toast.warning("请先选择供应商", `${action} 需要至少选择 1 条供应商资料。`);
      return false;
    }
    return true;
  }

  function handleTabChange(tab: ManageTab) {
    setActiveTab(tab);
    setSelectedIds([]);
    toast.info("分类已切换", `已切换到「${tabs.find((item) => item.value === tab)?.label ?? "全部供应商"}」。`);
  }

  function handleSearch() {
    const nextCount = reviewedRows.filter((row) => matchesTab(row, activeTab) && matchesFilters(row, filters)).length;
    setAppliedFilters(filters);
    setSelectedIds([]);
    toast.success("筛选已应用", `当前显示 ${nextCount} 条资料治理记录。`);
  }

  function handleReset() {
    setFilters(defaultManageFilters);
    setAppliedFilters(defaultManageFilters);
    setSelectedIds([]);
    toast.info("筛选已重置", "已恢复供应商资料维护全部 mock 记录。");
  }

  function switchTabWithToast(tab: ManageTab, title: string, description?: string) {
    setActiveTab(tab);
    setSelectedIds([]);
    toast.info(title, description ?? `已切换到「${tabs.find((item) => item.value === tab)?.label ?? "供应商资料"}」。`);
  }

  function applyManageFilter(patch: Partial<ManageFilters>, title: string, description: string, tab?: ManageTab) {
    const nextFilters = { ...defaultManageFilters, ...patch };
    if (tab) {
      setActiveTab(tab);
    }
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSelectedIds([]);
    toast.info(title, description);
  }

  function completeSuggestion(name: string) {
    applyManageFilter({ keyword: name }, "已定位补全建议", `${name} 已进入资料补全确认视图。`, "incomplete");
    aiAction.run("AI资料补全");
    toast.ai("AI补全建议已应用", "当前仅更新前端 mock 状态，仍需人工确认后生效。");
  }

  function createMergeSuggestion(name: string) {
    const target = reviewedRows.find((row) => row.supplierName === name);
    applyManageFilter({ keyword: name }, "已定位重复供应商", `${name} 的重复记录已展示，可继续生成合并建议。`, "duplicate");
    setConfirmAction({
      title: "生成重复供应商合并建议",
      description: `${name} 将进入 AI 去重合并 mock 流程，不会删除真实数据。`,
      confirmLabel: "生成建议",
      tone: "warning",
      onConfirm: () => {
        aiAction.run("AI去重合并");
        if (target?.supplierId) {
          supplierVerification.resolveDuplicate(target.supplierId);
        }
        toast.ai("合并建议已生成", `${name} 已进入去重合并人工确认流程。`);
      },
    });
  }

  function inspectMetric(metric: string) {
    toast.info("治理指标已聚焦", `已查看「${metric}」对应的 mock 统计口径。`);
  }

  function runGlobalAiComplete() {
    aiAction.run("AI智能补全");
    toast.ai("AI补全已启动", "正在扫描供应商缺失字段、重复记录和联系人状态。");
  }

  function runBatchComplete() {
    if (!requireSelection("批量补全")) {
      return;
    }
    aiAction.run("批量AI补全");
    toast.ai("批量补全已进入队列", `已选择 ${selectedIds.length} 条供应商资料，稍后进入人工确认流程。`);
  }

  function openReviewConfirm() {
    if (!requireSelection("批量审核")) {
      return;
    }
    const selectedRows = reviewedRows.filter((row) => selectedIds.includes(row.id));
    const eligibleRows = selectedRows.filter((row) => row.supplierId && !row.legalEntityBlocked);
    const blockedRows = selectedRows.filter((row) => row.legalEntityBlocked);
    if (eligibleRows.length === 0 && blockedRows.length > 0) {
      toast.warning("存在关键阻断", "所选记录尚未识别法律主体，不能通过人工准入。");
      return;
    }
    setConfirmAction({
      title: "确认统一人工复核结果",
      description: `将 ${eligibleRows.length} 家供应商标记为人工审核通过；${blockedRows.length} 家主体未识别记录继续保留在关键阻断队列。原始冲突和来源记录不会被删除。`,
      confirmLabel: "确认审核",
      tone: "warning",
      onConfirm: async () => {
        await supplierVerification.setReviewStatuses(
          eligibleRows.flatMap((row) => row.supplierId ? [row.supplierId] : []),
          "approved",
          "批量人工复核已完成，法律主体、冲突项及来源证据已逐项核验",
        );
        toast.success("人工复核已完成", `${eligibleRows.length} 家供应商获得创建询价准入，${blockedRows.length} 家仍被阻断。`);
        setSelectedIds([]);
      },
    });
  }

  function openSingleReview(row: SupplierMaintainRow) {
    if (!row.supplierId) {
      toast.info("非本次 33 家导入记录", "该供应商继续沿用原有资料维护流程。");
      return;
    }
    const verification = supplierVerificationById[row.supplierId];
    if (!verification) {
      toast.warning("缺少核验总账", `${row.supplierName} 尚未建立统一人工复核记录。`);
      return;
    }
    if (verification.legalEntityReviewStatus === "unresolved_channel") {
      toast.warning("主体未识别，禁止放行", `${row.supplierName} 必须先补齐法律主体、注册信息和联系人。`);
      return;
    }
    setConfirmAction({
      title: "人工确认供应商准入",
      description: `${row.supplierName}（${verification.batch}）存在 ${verification.conflicts.length} 项冲突、${verification.missingFields.length} 项待补字段。请确认冲突已逐项处理、重复来源已归并，并已留存官方核验依据。`,
      confirmLabel: "人工通过",
      tone: "warning",
      onConfirm: async () => {
        await supplierVerification.setReviewStatus(
          row.supplierId!,
          "approved",
          "人工复核已完成，法律主体、冲突项和官方来源证据已核验",
        );
        toast.success("人工复核已通过", `${row.supplierName} 已允许创建询价；AI 结论未被视为最终商务判断。`);
      },
    });
  }

  function openRiskConfirm() {
    if (!requireSelection("标记异常")) {
      return;
    }
    setConfirmAction({
      title: "标记为异常供应商",
      description: `将 ${selectedIds.length} 条记录加入异常供应商治理队列。`,
      confirmLabel: "标记异常",
      tone: "warning",
      onConfirm: () => {
        toast.warning("已加入异常治理队列", "风险标签已更新到前端 mock 状态，等待人工复核。");
        setSelectedIds([]);
      },
    });
  }

  function openMergeConfirm() {
    if (!requireSelection("去重合并")) {
      return;
    }
    const selectedRows = reviewedRows.filter((row) => selectedIds.includes(row.id));
    const duplicateRows = selectedRows.filter((row) => row.duplicateRisk !== "low" && row.supplierId);
    if (duplicateRows.length === 0) {
      toast.warning("未选择重复记录", "当前所选供应商没有多个 Excel 来源行，无需执行去重归并。");
      return;
    }
    setConfirmAction({
      title: "确认去重合并",
      description: `将 ${duplicateRows.length} 个重复来源组归并到各自主档。系统保留原始 Excel 行号、原值和冲突原因，不删除证据。`,
      confirmLabel: "确认归并主档",
      tone: "warning",
      onConfirm: () => {
        aiAction.run("AI去重合并");
        duplicateRows.forEach((row) => {
          if (row.supplierId) supplierVerification.resolveDuplicate(row.supplierId);
        });
        setSelectedIds([]);
        toast.success("重复来源已归并", `${duplicateRows.length} 个主档已保留全部来源行和冲突证据。`);
      },
    });
  }

  function openRejectConfirm(row: SupplierMaintainRow) {
    if (!row.supplierId) return;
    setConfirmAction({
      title: "退回供应商人工复核",
      description: `${row.supplierName} 将标记为人工驳回，保留全部冲突、缺失和来源记录，并禁止创建询价。`,
      confirmLabel: "确认退回",
      tone: "danger",
      onConfirm: async () => {
        await supplierVerification.setReviewStatus(
          row.supplierId!,
          "rejected",
          "人工复核退回，需补充法律主体、联系人或来源证据后重新提交",
        );
        toast.warning("供应商已退回", `${row.supplierName} 已进入补充证据和重新复核队列。`);
      },
    });
  }

  function handleRefresh() {
    toast.info("资料维护列表已刷新", "当前页面使用 mock 数据，已重新计算筛选结果。");
  }

  const columns = createColumns({
    selectedIds,
    onToggle: toggleRow,
    onEdit: setEditRow,
    onReview: openSingleReview,
    onMore: openRejectConfirm,
  });

  const headerActions: Array<{ label: string; icon: LucideIcon; tone: "primary" | "ai" | "default"; onClick: () => void }> = [
    { label: "导入供应商", icon: Upload, tone: "primary", onClick: () => setUploadOpen(true) },
    { label: aiAction.status === "running" ? "AI补全中" : "AI 智能补全", icon: Sparkles, tone: "ai", onClick: runGlobalAiComplete },
    { label: "去重合并", icon: Merge, tone: "default", onClick: openMergeConfirm },
    { label: "批量审核", icon: ClipboardCheck, tone: "default", onClick: openReviewConfirm },
    { label: "更多操作", icon: MoreHorizontal, tone: "default", onClick: () => setExportOpen(true) },
  ];

  return (
    <AppLayout>
      <div className="min-w-0 space-y-3 overflow-x-auto overflow-y-hidden" data-no-global-interaction>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-textMain">
              供应商资料维护 <ShieldCheck className="ml-2 inline size-5 text-ai" />
            </h1>
            <p className="mt-1 text-[13px] text-textSecondary">集中管理供应商基础资料，AI智能补全与去重合并，确保资料准确完整</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {headerActions.map(({ label, icon: IconComponent, tone, onClick }) => {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-bold shadow-sm",
                    tone === "primary"
                      ? "border-primary bg-primary text-white"
                      : tone === "ai"
                        ? "border-ai-border bg-ai-soft text-ai"
                        : "border-borderSoft bg-white text-textSecondary"
                  )}
                >
                  <IconComponent className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-w-[1322px] grid-cols-[minmax(980px,1fr)_330px] gap-3">
          <div className="space-y-3">
            <KpiCards />
            <FilterBlock
              activeTab={activeTab}
              filters={filters}
              resultCount={filteredRows.length}
              onTabChange={handleTabChange}
              onChange={setFilters}
              onSearch={handleSearch}
              onReset={handleReset}
            />
            <Toolbar
              selectedCount={selectedIds.length}
              aiRunning={aiAction.status === "running"}
              onBatchComplete={runBatchComplete}
              onReview={openReviewConfirm}
              onMarkRisk={openRiskConfirm}
              onExport={() => setExportOpen(true)}
              onRefresh={handleRefresh}
            />
            <DataTable
              columns={columns}
              data={filteredRows}
              rowKey="id"
              density="compact"
              emptyTitle="暂无供应商资料治理记录"
              emptyDescription="请调整筛选条件，或点击导入供应商新增 mock 资料。"
              onRowClick={(row) => setEditRow(row)}
            />
          </div>
          <RightPanel
            onShowSuggestions={() => switchTabWithToast("incomplete", "已打开 AI 补全建议", "资料待补全供应商已筛选。")}
            onCompleteSuggestion={completeSuggestion}
            onViewCompleteness={() => applyManageFilter({}, "资料完整度分布已刷新", "已展示全部供应商的资料完整度分布。")}
            onBatchComplete={runGlobalAiComplete}
            onMerge={openMergeConfirm}
            onImport={() => setUploadOpen(true)}
            onExport={() => setExportOpen(true)}
          />
        </div>

        <BottomPanels
          onDuplicateAll={() => switchTabWithToast("duplicate", "已筛选重复供应商", "重复记录治理队列已打开。")}
          onMergeDuplicate={createMergeSuggestion}
          onMissingSelect={(label) =>
            applyManageFilter({ keyword: label.replace(" 缺失", "") }, "已筛选资料缺失项", `${label} 对应供应商已进入资料待补全视图。`, "incomplete")
          }
          onBatchSelect={(month) => toast.info("导入批次已聚焦", `${month} 月导入批次记录已在 mock 视图中高亮。`)}
          onAuditSelect={(status) => {
            const statusTabMap: Record<string, ManageTab> = {
              已审核: "all",
              待审核: "pending",
              待补全: "incomplete",
              已禁用: "disabled",
            };
            switchTabWithToast(statusTabMap[status] ?? "all", `已筛选${status}供应商`);
          }}
          onEffectInspect={inspectMetric}
        />

        <MockUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onConfirm={() => {
            setUploadOpen(false);
            toast.success("导入任务已创建", "供应商资料已加入资料维护治理队列。");
          }}
        />
        <MockExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          onConfirm={(format) => {
            setExportOpen(false);
            toast.success("导出任务已创建", `供应商资料维护清单将模拟导出为 ${format}。`);
          }}
        />
        <EditDrawer
          open={Boolean(editRow)}
          title="维护供应商资料"
          description={editRow ? `${editRow.supplierName} 的资料完整度、联系人和审核状态维护。` : undefined}
          onClose={() => setEditRow(null)}
          onSave={() => {
            toast.success("资料维护已保存", editRow ? `${editRow.supplierName} 的 mock 资料已更新。` : "mock 资料已更新。");
            setEditRow(null);
          }}
        />
        <ConfirmDialog
          open={Boolean(confirmAction)}
          title={confirmAction?.title ?? ""}
          description={confirmAction?.description}
          confirmLabel={confirmAction?.confirmLabel}
          tone={confirmAction?.tone}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (!confirmAction || reviewSaving) return;
            setReviewSaving(true);
            void Promise.resolve(confirmAction.onConfirm())
              .then(() => setConfirmAction(null))
              .catch((error) => toast.warning("供应商审核写入失败", error instanceof Error ? error.message : "请检查审核权限后重试"))
              .finally(() => setReviewSaving(false));
          }}
        />
      </div>
    </AppLayout>
  );
}

export default function SupplierManagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-pageBg" />}>
      <SupplierManageContent />
    </Suspense>
  );
}
