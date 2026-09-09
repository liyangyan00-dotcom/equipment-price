"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parse as parseCsv } from "csv-parse/browser/esm/sync";
import readXlsxFile from "read-excel-file/browser";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Import,
  PackagePlus,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Truck,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EditDrawer } from "@/components/common";
import {
  aiInquiryLetterDraft,
  inquiryCreateSteps,
  inquiryItemCandidates,
  inquiryOverview,
  inquirySupplierCandidates,
  type InquiryItemCandidate,
  type InquirySupplierCandidate,
} from "@/data/mock/inquiryCreate";
import { RouteContextBanner } from "@/components/common";
import { emitMockToast } from "@/hooks/useMockToast";
import { appendMockWorkflowEvent } from "@/hooks/useMockWorkflow";
import { updateMockWorkflowContext } from "@/hooks/useMockWorkflowContext";
import { useRouteContext } from "@/hooks/useRouteContext";
import { useSupplierVerification } from "@/hooks/useSupplierVerification";
import { equipmentPriceRecords } from "@/data/mock/equipmentPrices";
import { materialPriceRecords } from "@/data/mock/materialPrices";
import { supplierRecords } from "@/data/mock/suppliers";
import { priceLeads } from "@/data/mock/priceLeads";
import { parsedBoqRows } from "@/data/mock/boqParse";
import { cn } from "@/lib/utils";
import type { SupplierInquiryAdmissionDecision } from "@/lib/supplierInquiryAdmission";
import type { RiskLevel } from "@/types/common";
import type { EquipmentCatalogDetail } from "@/types/equipmentCatalog";
import type { AiExecutionTask } from "@/types/aiExecution";
import { InquiryLifecycleStrip } from "@/components/inquiries/InquiryLifecycleStrip";

const riskLabel: Record<RiskLevel, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};

const riskClassName: Record<RiskLevel, string> = {
  low: "bg-success-soft text-success border-success/20",
  medium: "bg-warning-soft text-warning border-warning/20",
  high: "bg-danger-soft text-danger border-danger/20",
  critical: "bg-danger text-white border-danger",
};

type InquiryTaskSettings = {
  taskName: string;
  deadline: string;
  location: string;
  currency: string;
  paymentTerms: string;
  quoteBasis: string;
  taxPolicy: string;
  freightPolicy: string;
  validityDays: string;
  deliveryRequirement: string;
  note: string;
};

type SupplierItemAssignments = Record<string, string[]>;

type StoredInquiryDraft = {
  version: 2;
  items: InquiryItemCandidate[];
  suppliers: InquirySupplierCandidate[];
  supplierItemAssignments: SupplierItemAssignments;
  letterGenerated: boolean;
  letterContent: string;
  riskAcknowledged: boolean;
  taskSettings: InquiryTaskSettings;
  currentStep: number;
  savedAt: string;
};

const INQUIRY_DRAFT_STORAGE_KEY = "wpi-inquiry-create-draft";

const inquiryImportHeaders = {
  itemCode: ["编码", "物资编码", "itemcode", "code"],
  name: ["名称", "物资名称", "设备名称", "材料名称", "name"],
  category: ["类型", "类别", "category"],
  specification: ["规格", "规格型号", "specification", "model"],
  quantity: ["数量", "quantity", "qty"],
  unit: ["单位", "unit"],
  targetPrice: ["目标单价", "参考单价", "targetprice", "price"],
  currency: ["币种", "currency"],
  remark: ["备注", "remark"],
} as const;

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

async function parseInquiryImport(file: File): Promise<InquiryItemCandidate[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const rows = extension === "xlsx" || extension === "xls"
    ? await readXlsxFile(file) as unknown as unknown[][]
    : parseCsv(await file.text(), { bom: true, skip_empty_lines: true, relax_column_count: true }) as unknown[][];
  if (rows.length < 2) throw new Error("文件至少需要表头和一行数据");
  const headers = rows[0].map(normalizeHeader);
  const indexOf = (aliases: readonly string[]) => headers.findIndex((header) => aliases.some((alias) => normalizeHeader(alias) === header));
  const indexes = Object.fromEntries(Object.entries(inquiryImportHeaders).map(([key, aliases]) => [key, indexOf(aliases)])) as Record<keyof typeof inquiryImportHeaders, number>;
  if (indexes.name < 0) throw new Error("缺少“名称”列");

  return rows.slice(1).reduce<InquiryItemCandidate[]>((items, row, index) => {
    const value = (key: keyof typeof inquiryImportHeaders) => indexes[key] >= 0 ? row[indexes[key]] : "";
    const name = String(value("name") ?? "").trim();
    if (!name) return items;
    const quantity = Number(value("quantity") || 1);
    const targetPrice = Number(value("targetPrice") || 0);
    const currency = String(value("currency") || "CDF").trim().toUpperCase() === "USD" ? "USD" as const : "CDF" as const;
    const categoryText = String(value("category") || "").toLowerCase();
    items.push({
      id: `ITEM-IMPORT-${Date.now()}-${index}`,
      itemCode: String(value("itemCode") || `IMPORT-${String(index + 1).padStart(4, "0")}`).trim(),
      name,
      category: categoryText.includes("材") || categoryText.includes("material") ? "地材" as const : "设备" as const,
      specification: String(value("specification") || "规格由供应商报价时确认").trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit: String(value("unit") || "项").trim(),
      targetPrice: Number.isFinite(targetPrice) && targetPrice >= 0 ? targetPrice : 0,
      currency,
      riskLevel: "medium" as const,
      selected: true,
      remark: String(value("remark") || `批量导入：${file.name}`).trim(),
    });
    return items;
  }, []);
}

function getDefaultInquiryDeadline() {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  deadline.setHours(17, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())}T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;
}

function createInitialTaskSettings(): InquiryTaskSettings {
  return {
    taskName: aiInquiryLetterDraft.subject,
    deadline: getDefaultInquiryDeadline(),
    location: aiInquiryLetterDraft.location,
    currency: aiInquiryLetterDraft.currency,
    paymentTerms: aiInquiryLetterDraft.paymentTerms,
    quoteBasis: "含税到场单价",
    taxPolicy: "含税，单列税率",
    freightPolicy: "含运费及卸货",
    validityDays: "30",
    deliveryRequirement: "按采购清单分批交付，交货计划须随报价提交",
    note: aiInquiryLetterDraft.note,
  };
}

function notifyAction(title: string, description: string, tone: "success" | "info" | "warning" = "info") {
  emitMockToast({ title, description, tone });
}

function inquirySourceId(item: InquiryItemCandidate) {
  return typeof item.sourceId === "string" ? item.sourceId : item.id;
}

function dedupeInquiryItems(rows: InquiryItemCandidate[]) {
  const deduped = new Map<string, InquiryItemCandidate>();
  rows.forEach((item) => {
    const key = [item.category, item.itemCode, item.specification, item.unit]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, { ...item });
      return;
    }
    deduped.set(key, {
      ...existing,
      quantity: existing.quantity + item.quantity,
      selected: existing.selected || item.selected,
    });
  });
  return Array.from(deduped.values());
}

function buildInitialItems(
  equipmentIds: string[],
  materialIds: string[],
  leadIds: string[],
  boqId?: string,
  catalogIds: string[] = [],
) {
  if (equipmentIds.length === 0 && materialIds.length === 0 && leadIds.length === 0 && !boqId && catalogIds.length === 0) {
    return inquiryItemCandidates.map((item) => ({ ...item }));
  }

  const rows: InquiryItemCandidate[] = [];
  equipmentIds.forEach((id) => {
    const record = equipmentPriceRecords.find((item) => item.id === id || item.equipmentCode === id);
    if (!record) return;
    rows.push({
      ...inquiryItemCandidates[0],
      id: `ITEM-${record.id}`,
      sourceId: record.id,
      itemCode: record.equipmentCode,
      name: record.equipmentName,
      category: "设备",
      specification: record.specification,
      quantity: 1,
      unit: record.unit,
      targetPrice: record.originalPrice,
      currency: record.currency === "USD" ? "USD" : "CDF",
      riskLevel: record.riskLevel,
      selected: true,
      remark: `${record.brand} · ${record.supplier}`,
    });
  });
  materialIds.forEach((id) => {
    const record = materialPriceRecords.find((item) => item.id === id || item.materialCode === id);
    if (!record) return;
    rows.push({
      ...inquiryItemCandidates[0],
      id: `ITEM-${record.id}`,
      sourceId: record.id,
      itemCode: record.materialCode,
      name: record.materialName,
      category: "地材",
      specification: record.specification,
      quantity: 1,
      unit: record.unit,
      targetPrice: record.originalPrice,
      currency: record.currency === "USD" ? "USD" : "CDF",
      riskLevel: record.riskLevel,
      selected: true,
      remark: `${record.region} · ${record.supplierName}`,
    });
  });
  leadIds.forEach((id) => {
    const record = priceLeads.find((item) => item.leadCode === id);
    if (!record) return;
    rows.push({
      ...inquiryItemCandidates[0],
      id: `ITEM-${record.leadCode}`,
      sourceId: record.leadCode,
      itemCode: record.leadCode,
      name: record.leadName,
      category: record.leadType === "地材" ? "地材" : "设备",
      specification: record.matchedObject,
      quantity: 1,
      unit: "项",
      targetPrice: record.originalPrice,
      currency: record.currency === "USD" ? "USD" : "CDF",
      riskLevel: record.riskLevel,
      selected: true,
      remark: `${record.sourcePlatform} · ${record.supplier}`,
    });
  });
  if (boqId) {
    const record = parsedBoqRows.find((item) => item.boqCode === boqId);
    if (record) {
      rows.push({
        ...inquiryItemCandidates[0],
        id: `ITEM-${record.boqCode}`,
        sourceId: record.boqCode,
        itemCode: record.boqCode,
        name: record.itemName,
        category: record.category === "地材" ? "地材" : "设备",
        specification: record.specification,
        quantity: record.quantity,
        unit: record.unit,
        targetPrice: record.matchedPrice ?? 0,
        currency: "USD",
        riskLevel: record.riskLevel,
        selected: true,
        remark: `${record.projectName} · ${record.source}`,
      });
    }
  }

  if (catalogIds.length) return [];
  return dedupeInquiryItems(rows.length ? rows : inquiryItemCandidates.map((item) => ({ ...item, selected: false })));
}

function buildInitialSuppliers(supplierIds: string[]) {
  if (supplierIds.length === 0) {
    return inquirySupplierCandidates.map((supplier) => ({ ...supplier }));
  }

  const rows = supplierIds.flatMap((id) => {
    const record = supplierRecords.find((supplier) =>
      supplier.id === id || supplier.supplierCode === id || supplier.supplierName === id,
    );
    if (!record) {
      return [{
        ...inquirySupplierCandidates[0],
        id,
        sourceId: id,
        supplierName: id,
        logoText: id.slice(0, 2).toUpperCase(),
        tags: ["AI推荐", "待核验资料"],
        selected: true,
      } satisfies InquirySupplierCandidate];
    }
    return [{
      ...inquirySupplierCandidates[0],
      id: record.id,
      sourceId: record.id,
      supplierName: record.supplierName,
      logoText: record.supplierName.slice(0, 2).toUpperCase(),
      category: record.category,
      tags: [record.countryRegion, record.mainScope, record.status],
      matchRate: record.overallScore,
      deliveryScore: record.technicalCapability,
      confidence: record.confidence,
      riskLevel: record.riskLevel,
      responseSpeed: record.responseSpeed === "快" ? "快" : record.responseSpeed === "较慢" ? "慢" : "中",
      selected: true,
    } satisfies InquirySupplierCandidate];
  });

  return rows.length ? rows : inquirySupplierCandidates.map((supplier) => ({ ...supplier, selected: false }));
}

function PrettyIcon({
  icon: Icon,
  tone = "ai",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: "blue" | "cyan" | "green" | "orange" | "red" | "ai";
  size?: "sm" | "md" | "lg";
}) {
  const toneClass = {
    blue: "from-primary/95 to-[#5aa7ff] text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]",
    cyan: "from-[#20b8d8] to-[#62d2ee] text-white shadow-[0_12px_24px_rgba(32,184,216,0.22)]",
    green: "from-success to-[#72d99a] text-white shadow-[0_12px_24px_rgba(31,165,85,0.22)]",
    orange: "from-warning to-[#ffbe67] text-white shadow-[0_12px_24px_rgba(245,158,11,0.24)]",
    red: "from-danger to-[#ff7a7a] text-white shadow-[0_12px_24px_rgba(239,68,68,0.22)]",
    ai: "from-ai to-[#9c6bff] text-white shadow-ai",
  }[tone];

  const sizeClass = {
    sm: "size-8 rounded-[10px]",
    md: "size-10 rounded-[13px]",
    lg: "size-12 rounded-[16px]",
  }[size];

  const iconSize = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-4";

  return (
    <span className={cn("relative flex shrink-0 items-center justify-center bg-gradient-to-br", sizeClass, toneClass)}>
      <span className="absolute inset-1 rounded-[inherit] bg-white/10" />
      <Icon className={cn("relative", iconSize)} />
    </span>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone = "default",
  onClick,
  disabled = false,
  title,
}: {
  label: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "ai";
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      data-no-global-interaction
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
        tone === "primary" && "border-primary bg-primary text-white hover:bg-primary/90",
        tone === "ai" && "border-ai-border bg-ai text-white hover:bg-ai/90",
        tone === "default" && "border-borderSoft bg-white text-textSecondary hover:border-primary/30 hover:text-primary",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function CreatePageHeader({
  onSaveDraft,
  draftSaved,
  lastSavedAt,
}: {
  onSaveDraft: () => void;
  draftSaved: boolean;
  lastSavedAt: string;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[24px] font-bold leading-8 text-textMain">创建询价任务</h1>
        <p className="mt-1 text-[13px] text-textMuted">选择询价对象与供应商，生成初版询价函并创建待审核任务</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-right text-[11px] text-textMuted"><strong className={draftSaved ? "text-success" : "text-warning"}>{draftSaved ? "本机草稿已保存" : "存在未保存修改"}</strong><div className="mt-0.5">{lastSavedAt ? `本机保存 ${lastSavedAt}` : "尚未保存到本机"}</div></div>
        <ActionButton label="保存草稿" icon={Save} onClick={onSaveDraft} />
      </div>
    </div>
  );
}

function StepIndicator({ currentStep, maxStep, summaries, onChange }: { currentStep: number; maxStep: number; summaries: string[]; onChange: (step: number) => void }) {
  return (
    <section className="rounded-card border border-borderSoft bg-white px-4 py-3 shadow-card">
      <div className="grid gap-3 lg:grid-cols-4">
        {inquiryCreateSteps.map((step, index) => {
          const status = index < currentStep ? "done" : index === currentStep ? "active" : "pending";
          const locked = index > maxStep;
          return (
          <button type="button" key={step.label} disabled={locked} onClick={() => onChange(index)} className="relative flex min-w-0 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45">
            <span
              className={cn(
                "z-10 flex size-9 shrink-0 items-center justify-center rounded-full border text-[14px] font-bold",
                status === "active" && "border-ai bg-ai text-white shadow-ai",
                status === "done" && "border-ai/30 bg-white text-ai",
                status === "pending" && "border-borderSoft bg-[var(--color-bg-muted)] text-textMuted",
              )}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-textMain">{step.label}</div>
              <div className="truncate text-[11px] text-textMuted">{index < currentStep ? summaries[index] : step.description}</div>
            </div>
            {index < inquiryCreateSteps.length - 1 ? (
              <span className="absolute left-[142px] right-4 top-4 hidden h-0.5 bg-ai/70 lg:block" />
            ) : null}
          </button>
          );
        })}
      </div>
    </section>
  );
}

function SectionShell({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-borderSoft bg-white shadow-card", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-borderSoft px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <PrettyIcon icon={Icon} size="sm" /> : null}
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold text-textMain">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-[11px] text-textMuted">{subtitle}</p> : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function TinyButton({ label, icon: Icon, onClick }: { label: string; icon?: LucideIcon; onClick?: () => void }) {
  return (
    <button type="button" data-no-global-interaction onClick={onClick} className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] font-semibold text-textSecondary">
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
    </button>
  );
}

function RiskPill({ level }: { level: RiskLevel }) {
  return <span className={cn("inline-flex h-5 min-w-6 items-center justify-center rounded-pill border px-2 text-[11px] font-semibold", riskClassName[level])}>{riskLabel[level]}</span>;
}

function InquiryItemsPanel({ items, onToggle, onToggleAll, onClear, onDelete, onAdd, onImport, onProjectImport, onEdit, onFixMissing, onKeepCurrency }: {
  items: InquiryItemCandidate[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onClear: () => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onImport?: () => void;
  onProjectImport: () => void;
  onEdit?: (id: string) => void;
  onFixMissing: () => void;
  onKeepCurrency: (currency: InquiryItemCandidate["currency"]) => void;
}) {
  const selectedItems = items.filter((item) => item.selected);
  const selectedCount = selectedItems.length;
  const total = selectedItems.reduce((sum, item) => sum + item.targetPrice * item.quantity, 0);
  const missingCount = selectedItems.filter((item) => !item.specification.trim() || item.specification.includes("待补") || !item.unit.trim()).length;
  const currencies = Array.from(new Set(selectedItems.map((item) => item.currency)));
  const primaryCurrency = currencies
    .map((currency) => ({ currency, count: selectedItems.filter((item) => item.currency === currency).length }))
    .sort((left, right) => right.count - left.count)[0]?.currency ?? "CDF";

  return (
    <SectionShell
      title="询价对象清单"
      subtitle={`共 ${items.length} 条`}
      action={
        <>
          <TinyButton label="添加设备/材料" icon={PackagePlus} onClick={onAdd} />
          <TinyButton label="批量导入" icon={Download} onClick={onImport} />
          <TinyButton label="从项目导入" icon={Import} onClick={onProjectImport} />
        </>
      }
    >
      <div className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-borderSoft bg-slate-50 px-3 py-2 text-[11px] text-textSecondary">
        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-success">重复项自动合并已启用</span>{missingCount ? <span className="font-semibold text-warning">{missingCount} 项缺少完整规格或单位</span> : <span className="font-semibold text-success">规格与单位完整</span>}{currencies.length > 1 ? <span className="font-semibold text-warning">检测到混合币种：{currencies.join(" / ")}</span> : null}</div>
        <div className="flex items-center gap-2">{missingCount ? <button type="button" onClick={onFixMissing} className="h-7 whitespace-nowrap rounded-md border border-warning/25 bg-white px-2 font-bold text-warning">补齐默认字段</button> : null}{currencies.length > 1 ? <button type="button" onClick={() => onKeepCurrency(primaryCurrency)} className="h-7 whitespace-nowrap rounded-md border border-primary/20 bg-white px-2 font-bold text-primary">仅保留 {primaryCurrency}</button> : null}</div>
      </div>
      <div className="overflow-x-auto px-3 py-3">
        <table className="w-full min-w-[760px] border-collapse text-[12px]">
          <thead>
            <tr className="h-9 bg-[var(--color-bg-muted)] text-left text-[11px] font-semibold text-textSecondary">
              <th className="w-8 rounded-l-md px-2">
                <input checked={items.length > 0 && selectedCount === items.length} onChange={onToggleAll} type="checkbox" className="accent-ai" />
              </th>
              <th className="px-2">序号</th>
              <th className="px-2">编码</th>
              <th className="px-2">名称 / 规格型号</th>
              <th className="px-2">单位</th>
              <th className="px-2 text-right">数量</th>
              <th className="px-2 text-right">目标单价 / 币种</th>
              <th className="px-2 text-center">风险</th>
              <th className="rounded-r-md px-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className={cn("h-[43px] border-b border-borderSoft last:border-0", item.selected && "bg-ai-soft/45")}>
                <td className="px-2">
                  <input checked={item.selected} onChange={() => onToggle(item.id)} type="checkbox" className="accent-ai" />
                </td>
                <td className="px-2 text-textSecondary">{index + 1}</td>
                <td className="px-2 font-medium text-textMain">{item.itemCode}</td>
                <td className="px-2">
                  <div className="font-semibold text-textMain">{item.name}</div>
                  <div className="text-[11px] text-textMuted">{item.specification}</div>
                </td>
                <td className="px-2 text-textSecondary">{item.unit}</td>
                <td className="px-2 text-right font-semibold tabular-nums text-textMain">{item.quantity.toLocaleString("zh-CN")}</td>
                <td className="px-2 text-right font-semibold tabular-nums text-textMain">{item.targetPrice.toLocaleString("zh-CN")} <span className="text-[10px] text-textMuted">{item.currency}</span></td>
                <td className="px-2 text-center">
                  <RiskPill level={item.riskLevel} />
                </td>
                <td className="px-2">
                  <div className="flex justify-center gap-2 text-textMuted">
                    <button type="button" data-no-global-interaction aria-label="编辑" onClick={() => onEdit?.(item.id)}>
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" data-no-global-interaction aria-label="删除" onClick={() => onDelete(item.id)}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mx-3 mb-3 flex items-center justify-between rounded-lg border border-borderSoft bg-white px-3 py-2 text-[12px]">
        <div className="text-textMuted">
          已选择 <span className="font-bold text-primary">{selectedCount}</span> 项
          <button type="button" data-no-global-interaction onClick={onClear} className="ml-3 font-semibold text-ai">清空选择</button>
        </div>
        <div className="font-semibold text-textMain">
          目标金额合计：<span className="ml-2 text-[15px]">{currencies.length === 1 ? `${currencies[0]} ${total.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}` : "混合币种，请先拆分"}</span>
        </div>
      </div>
    </SectionShell>
  );
}

function SupplierLogo({ supplier }: { supplier: InquirySupplierCandidate }) {
  const iconMap: Record<string, LucideIcon> = {
    KW: Sparkles,
    AC: ShieldCheck,
    GS: WandSparkles,
    TB: Building2,
    KL: Truck,
  };
  const Icon = iconMap[supplier.logoText] ?? Building2;
  const tone = supplier.selected ? "blue" : "cyan";

  return <PrettyIcon icon={Icon} tone={tone} size="lg" />;
}

function SupplierCard({
  supplier,
  admission,
  onToggle,
}: {
  supplier: InquirySupplierCandidate;
  admission: SupplierInquiryAdmissionDecision;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full rounded-xl border px-2.5 py-2 text-left shadow-sm",
        admission.allowed
          ? supplier.selected
            ? "border-ai-border bg-ai-soft/30"
            : "border-borderSoft bg-white"
          : "border-danger/25 bg-danger-soft/40",
      )}
    >
      <div className="flex items-start gap-2">
        <SupplierLogo supplier={supplier} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-textMain">{supplier.supplierName}</div>
              <div
                className={cn(
                  "mt-1 text-[10px] font-bold",
                  admission.allowed ? "text-success" : "text-danger",
                )}
              >
                {admission.allowed ? "询价准入通过" : admission.blockers[0]}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {supplier.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-md bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-[10px] font-medium text-textMuted">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <input checked={supplier.selected} readOnly type="checkbox" className="mt-1 size-4 accent-ai" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-medium text-textSecondary">
            <div>
              响应速度：
              <span
                className={cn(
                  "ml-1 rounded-pill px-1.5 py-0.5 font-bold",
                  supplier.responseSpeed === "快" && "bg-success-soft text-success",
                  supplier.responseSpeed === "中" && "bg-warning-soft text-warning",
                  supplier.responseSpeed === "慢" && "bg-danger-soft text-danger",
                )}
              >
                {supplier.responseSpeed}
              </span>
            </div>
            <div>
              交付评分：
              <span className={cn("ml-1 rounded-pill px-1.5 py-0.5 font-bold", supplier.deliveryScore >= 85 ? "bg-success-soft text-success" : supplier.deliveryScore >= 74 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger")}>
                {supplier.deliveryScore}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function SuppliersPanel({
  suppliers,
  admissions,
  onToggle,
  onRecommend,
  onMore,
}: {
  suppliers: InquirySupplierCandidate[];
  admissions: Record<string, SupplierInquiryAdmissionDecision>;
  onToggle: (id: string) => void;
  onRecommend: () => void;
  onMore: () => void;
}) {
  const selectedCount = suppliers.filter((supplier) => supplier.selected).length;
  return (
    <SectionShell
      title="已选供应商"
      subtitle={`${selectedCount} / ${suppliers.length}`}
      action={
        <>
          <button data-no-global-interaction onClick={onRecommend} className="inline-flex items-center gap-1 text-[11px] font-semibold text-textMuted" type="button">
            <UsersRound className="size-3.5" />
            智能推荐
          </button>
          <button data-no-global-interaction onClick={onMore} className="text-[11px] font-semibold text-ai" type="button">更多供应商</button>
        </>
      }
    >
      <div className="space-y-2 p-3">
        {suppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            admission={admissions[supplier.id]}
            onToggle={() => onToggle(supplier.id)}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function SupplierCoveragePanel({
  items,
  suppliers,
  assignments,
  onToggleItem,
  onAssignAll,
}: {
  items: InquiryItemCandidate[];
  suppliers: InquirySupplierCandidate[];
  assignments: SupplierItemAssignments;
  onToggleItem: (supplierId: string, itemId: string) => void;
  onAssignAll: (supplierId: string, assign: boolean) => void;
}) {
  const uncoveredItems = items.filter((item) => !suppliers.some((supplier) => assignments[supplier.id]?.includes(item.id)));
  const emptySuppliers = suppliers.filter((supplier) => (assignments[supplier.id]?.length ?? 0) === 0);

  return (
    <SectionShell
      title="供应商询价范围"
      subtitle="明确每家供应商收到哪些询价对象，后续按此方案发送和回收报价"
      icon={PackagePlus}
      action={(
        <span className={cn("rounded-pill px-2 py-1 text-[11px] font-bold", uncoveredItems.length || emptySuppliers.length ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
          {uncoveredItems.length || emptySuppliers.length ? `${uncoveredItems.length} 项未覆盖 · ${emptySuppliers.length} 家未分配` : "覆盖方案完整"}
        </span>
      )}
    >
      <div className="space-y-2 p-3">
        {suppliers.map((supplier) => {
          const assigned = assignments[supplier.id] ?? [];
          return (
            <div key={supplier.id} className="rounded-lg border border-borderSoft bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-bold text-textMain">{supplier.supplierName}</div>
                  <div className="mt-0.5 text-[11px] text-textMuted">已分配 {assigned.length} / {items.length} 项</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onAssignAll(supplier.id, true)} className="text-[11px] font-bold text-primary">全选</button>
                  <button type="button" onClick={() => onAssignAll(supplier.id, false)} className="text-[11px] font-bold text-textMuted">清空</button>
                </div>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <label key={item.id} title={`${item.name} · ${item.specification}`} className={cn("flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-[11px]", assigned.includes(item.id) ? "border-primary/20 bg-primary-soft text-primary" : "border-borderSoft bg-slate-50 text-textSecondary")}>
                    <input type="checkbox" checked={assigned.includes(item.id)} onChange={() => onToggleItem(supplier.id, item.id)} className="shrink-0 accent-primary" />
                    <span className="truncate">{item.name} · {item.specification}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function SupplierAdmissionBanner({
  admissions,
  onOpenReviewQueue,
}: {
  admissions: SupplierInquiryAdmissionDecision[];
  onOpenReviewQueue: (supplierId: string) => void;
}) {
  const blocked = admissions.filter((item) => !item.allowed);
  const warnings = admissions.filter((item) => item.allowed && item.warnings.length > 0);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-[12px]",
        blocked.length > 0
          ? "border-danger/25 bg-danger-soft text-danger"
          : warnings.length > 0
            ? "border-warning/25 bg-warning-soft text-warning"
            : "border-success/20 bg-success-soft text-success",
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-4 shrink-0" />
        {blocked.length > 0
          ? `已选 ${admissions.length} 家：${admissions.length - blocked.length} 家可询价，${blocked.length} 家未通过准入`
          : warnings.length > 0
            ? `已选 ${admissions.length} 家：可创建待审核任务，其中 ${warnings.length} 家须在正式发送前完成核验`
            : `已选 ${admissions.length} 家：全部通过询价准入检查`}
      </div>
      {blocked.length > 0 ? (
        <button
          type="button"
          onClick={() => onOpenReviewQueue(blocked[0].supplierId)}
          className="rounded-md border border-danger/20 bg-white px-3 py-1.5 font-bold text-danger"
        >
          进入人工复核队列
        </button>
      ) : warnings.length > 0 ? (
        <button
          type="button"
          onClick={() => onOpenReviewQueue(warnings[0].supplierId)}
          className="rounded-md border border-warning/25 bg-white px-3 py-1.5 font-bold text-warning"
        >
          去完成供应商核验
        </button>
      ) : null}
    </div>
  );
}

function AiSmartAdvicePanel({ supplierCount, highRiskCount }: { supplierCount: number; highRiskCount: number }) {
  return (
    <SectionShell title="AI 智能建议" subtitle="推荐策略、竞争度与价格预测" icon={Bot} className="overflow-hidden">
      <div className="relative p-3">
        <div className="pointer-events-none absolute right-3 top-3 size-20 rounded-full bg-ai/15 blur-xl" />
        <div className="relative rounded-xl border border-ai-border bg-gradient-to-br from-ai-soft via-white to-white p-3">
          <div className="mb-3 flex justify-end">
            <span className="flex size-16 items-center justify-center rounded-full bg-ai text-[18px] font-bold text-white shadow-ai ring-8 ring-ai/10">AI</span>
          </div>
          <div className="space-y-3 text-[12px] leading-5">
            <div>
              <div className="font-bold text-textMain">推荐策略</div>
              <p className="mt-1 text-textSecondary">当前已选择 {supplierCount} 家供应商。建议结合准入状态与地区覆盖补充候选供应商。</p>
            </div>
            <div className="border-t border-borderSoft pt-2">
              <div className="font-bold text-textMain">预计竞争度</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-warning">★★★★☆</span>
                <span className="text-textMuted">{supplierCount >= 3 ? "较高" : "偏低"}（{supplierCount} 家供应商）</span>
              </div>
            </div>
            <div className="border-t border-borderSoft pt-2">
              <div className="font-bold text-textMain">价格波动预测</div>
              <div className="mt-1 flex items-center gap-2 text-success">
                <span className="text-[18px] font-bold leading-5">↓ 下降 8.6%</span>
                <span className="text-textMuted">未来 30 天预计下降</span>
              </div>
            </div>
            <div className="border-t border-borderSoft pt-2">
              <div className="font-bold text-textMain">风险提示</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-bold text-danger">{highRiskCount} 项高风险对象</span>
                <span className="text-textMuted">建议重点关注钢筋价格波动</span>
              </div>
            </div>
          </div>
          <button type="button" data-no-global-interaction onClick={() => window.location.assign("/ai-workbench?workflow=inquiry_letter&source=inquiries/create")} className="mt-3 h-8 w-full rounded-md border border-ai-border bg-white text-[12px] font-semibold text-ai">查看 AI 分析详情</button>
        </div>
      </div>
    </SectionShell>
  );
}

function AiRiskPanel({ highRiskCount, acknowledged, onAcknowledge }: { highRiskCount: number; acknowledged: boolean; onAcknowledge: (checked: boolean) => void }) {
  const risks = [
    { title: "钢筋价格波动风险", level: "高" },
    { title: "市场供应紧张", level: "中" },
  ].slice(0, highRiskCount);

  return (
    <SectionShell title="AI 风险检测" subtitle={`检测到 ${highRiskCount} 项高风险询价对象`} icon={Sparkles}>
      <div className="space-y-3 p-4">
        {highRiskCount === 0 ? <div className="rounded-md border border-success/20 bg-success-soft p-3 text-[12px] font-semibold text-success">当前已选对象未发现阻断创建的高风险项。</div> : null}
        {risks.map((risk, index) => (
          <div key={risk.title} className="flex items-center justify-between gap-3 rounded-xl border border-borderSoft bg-[var(--color-bg-muted)] px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-danger-soft text-[13px] font-bold text-danger">{index + 1}</span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-bold text-textMain">{risk.title}</div>
                <div className="mt-0.5 text-[12px] text-textMuted">风险等级：{risk.level}</div>
              </div>
            </div>
          </div>
        ))}
        <button type="button" data-no-global-interaction onClick={() => window.location.assign("/analytics?view=inquiry-risk&source=inquiries/create")} className="h-9 w-full rounded-md border border-ai-border bg-ai-soft text-[13px] font-semibold text-ai">查看风险详情</button>
        {highRiskCount > 0 ? <label className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning-soft p-2.5 text-[11px] font-semibold text-warning"><input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)} className="mt-0.5 accent-warning" /><span>我已核对高风险询价对象和来源证据，确认继续创建任务。</span></label> : null}
      </div>
    </SectionShell>
  );
}

function LetterPreviewPanel({ items, generated, content, settings, onGenerate, onContentChange }: { items: InquiryItemCandidate[]; generated: boolean; content: string; settings: InquiryTaskSettings; onGenerate: () => void; onContentChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <SectionShell
      title="初版询价函草稿"
      subtitle="随任务创建初版；创建后在询价函工作台进行双语、版本比较、审批和导出"
      icon={Sparkles}
      action={<><TinyButton label="重新生成" icon={RefreshCw} onClick={onGenerate} /><TinyButton label="标准询价模板" icon={FileText} onClick={() => notifyAction("当前模板", "正在使用设备与地材标准询价模板。")} /><TinyButton label={editing ? "完成编辑" : "人工编辑"} icon={Pencil} onClick={() => setEditing((value) => !value)} /></>}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)]">
        <div className="text-[12px] leading-6 text-textSecondary">
          {!generated ? <p className="rounded-lg bg-ai-soft p-3 font-semibold text-ai">请选择询价对象、供应商和报价口径后生成 AI 询价函。</p> : editing ? <textarea aria-label="询价函正文" value={content} onChange={(event) => onContentChange(event.target.value)} className="min-h-[220px] w-full resize-y rounded-md border border-ai-border bg-white p-3 text-[12px] leading-6 text-textMain" /> : <div className="whitespace-pre-line">{content}</div>}
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>{settings.quoteBasis}（{settings.currency}）</li>
            <li>交货周期和方式</li>
            <li>付款条件</li>
            <li>质保及售后服务</li>
            <li>其他商务条款</li>
          </ol>
          <p className="mt-3">请于 {settings.deadline.replace("T", " ")}（当地时间）前回复报价。</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-borderSoft">
          <table className="w-full text-[11px]">
            <thead className="bg-ai-soft text-textSecondary">
              <tr className="h-8">
                <th className="px-2 text-left">序号</th>
                <th className="px-2 text-left">物资名称 / 规格型号</th>
                <th className="px-2 text-center">单位</th>
                <th className="px-2 text-right">数量</th>
                <th className="px-2 text-left">备注</th>
              </tr>
            </thead>
            <tbody>
              {items.filter((item) => item.selected).map((item, index) => (
                <tr key={item.id} className="h-9 border-t border-borderSoft">
                  <td className="px-2">{index + 1}</td>
                  <td className="px-2 font-semibold text-textMain">{item.name}</td>
                  <td className="px-2 text-center">{item.unit}</td>
                  <td className="px-2 text-right tabular-nums">{item.quantity.toLocaleString("zh-CN")}</td>
                  <td className="px-2 text-textMuted">{item.remark ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionShell>
  );
}

function TaskSettingsPanel({ value, onChange }: { value: InquiryTaskSettings; onChange: (next: InquiryTaskSettings) => void }) {
  const fieldClass = "h-8 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textMain";
  const patch = (key: keyof InquiryTaskSettings, nextValue: string) => onChange({ ...value, [key]: nextValue });

  return (
    <SectionShell title="任务设置" subtitle="询价任务名称、截止时间与商务条件" icon={FileText}>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">任务名称 *</span>
          <input className={cn(fieldClass, "w-full")} value={value.taskName} onChange={(event) => patch("taskName", event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">询价截止时间 *</span>
          <input type="datetime-local" className={cn(fieldClass, "w-full")} value={value.deadline} onChange={(event) => patch("deadline", event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">交货地点</span>
          <input className={cn(fieldClass, "w-full")} value={value.location} onChange={(event) => patch("location", event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">币种</span>
          <input className={cn(fieldClass, "w-full")} value={value.currency} onChange={(event) => patch("currency", event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">付款条件</span>
          <input className={cn(fieldClass, "w-full")} value={value.paymentTerms} onChange={(event) => patch("paymentTerms", event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">报价口径 *</span>
          <select className={cn(fieldClass, "w-full")} value={value.quoteBasis} onChange={(event) => patch("quoteBasis", event.target.value)}><option>含税到场单价</option><option>未税出厂单价</option><option>含税出厂单价</option><option>到岸综合单价</option></select>
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">税费口径 *</span>
          <select className={cn(fieldClass, "w-full")} value={value.taxPolicy} onChange={(event) => patch("taxPolicy", event.target.value)}><option>含税，单列税率</option><option>未税，单列税额</option><option>税费另议</option></select>
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">运费口径 *</span>
          <select className={cn(fieldClass, "w-full")} value={value.freightPolicy} onChange={(event) => patch("freightPolicy", event.target.value)}><option>含运费及卸货</option><option>含运费，不含卸货</option><option>运费单列</option><option>买方自提</option></select>
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">报价有效期（天）*</span>
          <input type="number" min="1" max="365" className={cn(fieldClass, "w-full")} value={value.validityDays} onChange={(event) => patch("validityDays", event.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">交付要求 *</span>
          <input className={cn(fieldClass, "w-full")} value={value.deliveryRequirement} onChange={(event) => patch("deliveryRequirement", event.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">备注</span>
          <textarea maxLength={200} value={value.note} onChange={(event) => patch("note", event.target.value)} className="h-[74px] w-full resize-none rounded-md border border-borderSoft bg-white px-2 py-2 text-[12px] text-textMain" />
          <span className="mt-1 block text-right text-[11px] text-textMuted">{value.note.length}/200</span>
        </label>
      </div>
    </SectionShell>
  );
}

function OverviewCard({ item, index }: { item: (typeof inquiryOverview)[number]; index: number }) {
  const configs = [
    { icon: UsersRound, tone: "blue" as const, text: "text-primary", bg: "from-white to-primary-soft/50" },
    { icon: PackagePlus, tone: "green" as const, text: "text-success", bg: "from-white to-success-soft/50" },
    { icon: ShieldCheck, tone: "orange" as const, text: "text-warning", bg: "from-white to-warning-soft/50" },
    { icon: Star, tone: "ai" as const, text: "text-ai", bg: "from-white to-ai-soft/60" },
    { icon: Clock3, tone: "orange" as const, text: "text-warning", bg: "from-white to-warning-soft/50" },
    { icon: Bot, tone: "ai" as const, text: "text-ai", bg: "from-white to-ai-soft/60" },
  ];
  const config = configs[index];

  return (
    <div className={cn("flex min-w-0 items-center gap-3 rounded-xl border border-borderSoft bg-gradient-to-br p-3 shadow-sm", config.bg)}>
      <PrettyIcon icon={config.icon} tone={config.tone} size="md" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-textMuted">{item.label}</div>
        <div className={cn("mt-0.5 truncate text-[22px] font-bold leading-7", config.text)}>
          {item.value} {item.unit ? <span className="text-[11px] font-semibold text-textMuted">{item.unit}</span> : null}
        </div>
        <div className="truncate text-[11px] text-textMuted">{item.description}</div>
      </div>
    </div>
  );
}

function InquiryOverviewPanel({ itemCount, quantity, total, currency, supplierCount }: { itemCount: number; quantity: number; total: number; currency: string; supplierCount: number }) {
  const dynamicOverview = inquiryOverview.map((item, index) => {
    if (index === 0) return { ...item, value: String(itemCount) };
    if (index === 1) return { ...item, value: quantity.toLocaleString("zh-CN") };
    if (index === 2) return { ...item, value: `${currency} ${total.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}` };
    if (index === 3) return { ...item, value: String(supplierCount) };
    return item;
  });
  return (
    <SectionShell title="询价概览" subtitle="生成任务前的关键摘要">
      <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
        {dynamicOverview.map((item, index) => <OverviewCard key={item.label} item={item} index={index} />)}
      </div>
    </SectionShell>
  );
}

function DispatchPlanSummary({ suppliers, items, assignments, settings }: { suppliers: InquirySupplierCandidate[]; items: InquiryItemCandidate[]; assignments: SupplierItemAssignments; settings: InquiryTaskSettings }) {
  return (
    <SectionShell title="发送方案确认" subtitle="创建后生成草稿任务，人工审核通过后才可正式发送" icon={ShieldCheck}>
      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2">
          {suppliers.map((supplier) => {
            const assignedItems = items.filter((item) => assignments[supplier.id]?.includes(item.id));
            return (
              <div key={supplier.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-borderSoft bg-slate-50 px-3 py-2">
                <div className="min-w-0"><div className="truncate text-[12px] font-bold text-textMain">{supplier.supplierName}</div><div className="mt-0.5 truncate text-[11px] text-textMuted">{assignedItems.map((item) => item.name).join("、")}</div></div>
                <span className="shrink-0 rounded-pill bg-primary-soft px-2 py-1 text-[11px] font-bold text-primary">{assignedItems.length} 项</span>
              </div>
            );
          })}
        </div>
        <div className="rounded-md border border-borderSoft bg-white p-3 text-[11px] leading-6 text-textSecondary">
          <div className="font-bold text-textMain">统一报价口径</div>
          <div>{settings.quoteBasis} · {settings.currency}</div>
          <div>{settings.taxPolicy} · {settings.freightPolicy}</div>
          <div>报价有效期：{settings.validityDays} 天</div>
          <div className="truncate" title={settings.deliveryRequirement}>交付：{settings.deliveryRequirement}</div>
        </div>
      </div>
    </SectionShell>
  );
}

function InquiryCreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeContext = useRouteContext();
  const requestedReturnTo = searchParams.get("returnTo") ?? "";
  const safeReturnTo = requestedReturnTo.startsWith("/project-pricing") ? requestedReturnTo : "";
  const hasExplicitRouteContext = [
    "equipmentIds", "equipmentId", "catalogIds", "catalogId", "materialIds", "materialId",
    "supplierIds", "supplierId", "supplier", "leadIds", "leadId", "boqId", "boqItem",
    "projectPricingId", "pricingId",
  ].some((key) => Boolean(searchParams.get(key)));
  const supplierVerification = useSupplierVerification();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [items, setItems] = useState(() => buildInitialItems(
    routeContext.equipmentIds,
    routeContext.materialIds,
    routeContext.leadIds,
    routeContext.boqId,
    routeContext.catalogIds,
  ));
  const [suppliers, setSuppliers] = useState(() => buildInitialSuppliers(routeContext.supplierIds));
  const [supplierItemAssignments, setSupplierItemAssignments] = useState<SupplierItemAssignments>(() => {
    const itemIds = items.filter((item) => item.selected).map((item) => item.id);
    return Object.fromEntries(suppliers.filter((supplier) => supplier.selected).map((supplier) => [supplier.id, itemIds]));
  });
  const [letterGenerated, setLetterGenerated] = useState(false);
  const [letterContent, setLetterContent] = useState(aiInquiryLetterDraft.body.join("\n"));
  const [draftSaved, setDraftSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [draftHydrated, setDraftHydrated] = useState(() => hasExplicitRouteContext);
  const [restoredDraftAt, setRestoredDraftAt] = useState("");
  const [restoreNoticeVisible, setRestoreNoticeVisible] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [validationNow] = useState(() => Date.now());
  const [taskSettings, setTaskSettings] = useState<InquiryTaskSettings>(() => {
    const settings = createInitialTaskSettings();
    const packageName = searchParams.get("packageName")?.trim();
    const responseDays = Number(searchParams.get("responseDays"));
    if (packageName) settings.taskName = packageName.slice(0, 120);
    if (Number.isInteger(responseDays) && responseDays >= 1 && responseDays <= 30) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + responseDays);
      deadline.setHours(17, 0, 0, 0);
      const pad = (value: number) => String(value).padStart(2, "0");
      settings.deadline = `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())}T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;
    }
    return settings;
  });
  const catalogIdsKey = routeContext.catalogIds.join(",");

  useEffect(() => {
    if (hasExplicitRouteContext) return;
    const timeout = window.setTimeout(() => {
      try {
        const rawDraft = window.localStorage.getItem(INQUIRY_DRAFT_STORAGE_KEY);
        if (!rawDraft) return;
        const draft = JSON.parse(rawDraft) as Partial<StoredInquiryDraft>;
        if (
          draft.version !== 2 ||
          !Array.isArray(draft.items) ||
          !Array.isArray(draft.suppliers) ||
          !draft.supplierItemAssignments ||
          !draft.taskSettings ||
          typeof draft.savedAt !== "string"
        ) {
          window.localStorage.removeItem(INQUIRY_DRAFT_STORAGE_KEY);
          return;
        }

        setItems(draft.items);
        setSuppliers(draft.suppliers);
        setSupplierItemAssignments(draft.supplierItemAssignments);
        setLetterGenerated(draft.letterGenerated === true);
        setLetterContent(typeof draft.letterContent === "string" ? draft.letterContent : aiInquiryLetterDraft.body.join("\n"));
        setRiskAcknowledged(draft.riskAcknowledged === true);
        setTaskSettings(draft.taskSettings);
        setCurrentStep(Math.max(0, Math.min(3, Number(draft.currentStep) || 0)));
        setDraftSaved(true);
        setLastSavedAt(new Date(draft.savedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
        setRestoredDraftAt(new Date(draft.savedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }));
        setRestoreNoticeVisible(true);
      } catch {
        window.localStorage.removeItem(INQUIRY_DRAFT_STORAGE_KEY);
      } finally {
        setDraftHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [hasExplicitRouteContext]);

  useEffect(() => {
    const catalogIds = catalogIdsKey.split(",").filter(Boolean);
    if (!catalogIds.length) return;
    let cancelled = false;

    void Promise.all(catalogIds.map(async (id) => {
      const response = await fetch(`/api/equipment-catalog/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json() as { data?: EquipmentCatalogDetail; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "设备资料读取失败");
      return payload.data;
    })).then((catalogRecords) => {
      if (cancelled) return;
      setItems(dedupeInquiryItems(catalogRecords.map((record, index) => {
        const latestPrice = record.prices[0];
        return {
          ...inquiryItemCandidates[index % inquiryItemCandidates.length],
          id: `ITEM-CATALOG-${record.id}`,
          sourceId: record.id,
          itemCode: record.catalog_code,
          name: record.equipment_name,
          category: "设备",
          specification: record.specification || [record.brand, record.product_series, record.model].filter(Boolean).join(" · ") || "规格参数待补充",
          quantity: 1,
          unit: "台",
          targetPrice: Number(latestPrice?.original_price ?? latestPrice?.usd_price ?? 0),
          currency: latestPrice?.original_currency === "USD" ? "USD" : "CDF",
          riskLevel: record.risk_level,
          selected: true,
          remark: `设备资料库 · ${record.brand || "品牌待补充"} · 完整度 ${Math.round(record.parameter_completeness)}%`,
        } satisfies InquiryItemCandidate;
      })));
      setDraftSaved(false);
      emitMockToast({ title: "已带入设备资料", description: `${catalogRecords.length} 项数据库设备主数据已加入询价清单。`, tone: "success" });
    }).catch((catalogError) => {
      if (cancelled) return;
      emitMockToast({ title: "设备资料带入失败", description: catalogError instanceof Error ? catalogError.message : "请返回设备资料库重试", tone: "danger" });
    });

    return () => { cancelled = true; };
  }, [catalogIdsKey]);

  useEffect(() => {
    const pricingId = routeContext.projectPricingId;
    if (!pricingId) return;
    const requestedIds = new Set(
      (searchParams.get("boqItemIds") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    );
    let cancelled = false;

    void fetch(`/api/project-pricing/${encodeURIComponent(pricingId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "项目套价数据读取失败");
        return payload.data as {
          project: { project_code: string; name: string };
          items: Array<{
            id: string;
            boq_code: string;
            item_name: string;
            specification: string;
            category: "equipment" | "material" | "service";
            quantity: number;
            unit: string;
            matched_unit_price: number | null;
            normalized_usd_price: number | null;
            currency: string;
            risk_level: RiskLevel;
            needs_inquiry: boolean;
          }>;
        };
      })
      .then((payload) => {
        if (cancelled) return;
        const candidates = payload.items
          .filter((item) => requestedIds.size ? requestedIds.has(item.id) : item.needs_inquiry)
          .map((item) => ({
            ...inquiryItemCandidates[0],
            id: `ITEM-${item.id}`,
            sourceId: item.id,
            itemCode: item.boq_code,
            name: item.item_name,
            category: item.category === "material" ? "地材" as const : "设备" as const,
            specification: item.specification,
            quantity: Number(item.quantity),
            unit: item.unit,
            targetPrice: Number(item.normalized_usd_price ?? item.matched_unit_price ?? 0),
            currency: "USD" as const,
            riskLevel: item.risk_level,
            selected: true,
            remark: `${payload.project.project_code} · ${payload.project.name} · 项目套价缺口`,
          }));
        setItems(dedupeInquiryItems(candidates));
        setDraftSaved(false);
        notifyAction(
          "已载入项目套价缺口",
          candidates.length ? `已带入 ${candidates.length} 条 BOQ 行项目。` : "当前方案没有符合条件的询价缺口。",
          candidates.length ? "success" : "warning",
        );
      })
      .catch((error) => {
        if (!cancelled) notifyAction("套价上下文读取失败", error instanceof Error ? error.message : "请返回套价中心重试", "warning");
      });

    return () => { cancelled = true; };
  }, [routeContext.projectPricingId, searchParams]);

  const selectedItems = items.filter((item) => item.selected);
  const selectedSuppliers = suppliers.filter((supplier) => supplier.selected);
  const supplierAdmissions = useMemo(
    () =>
      Object.fromEntries(
        suppliers.map((supplier) => [
          supplier.id,
          supplierVerification.getInquiryAdmission(supplier.id),
        ]),
      ) as Record<string, SupplierInquiryAdmissionDecision>,
    [supplierVerification, suppliers],
  );
  const selectedAdmissions = selectedSuppliers.map(
    (supplier) => supplierAdmissions[supplier.id],
  );
  const blockedSelectedSuppliers = selectedSuppliers.filter(
    (supplier) => !supplierAdmissions[supplier.id].allowed,
  );
  const reviewPendingSelectedSuppliers = selectedSuppliers.filter(
    (supplier) => supplierAdmissions[supplier.id].level === "needs_review",
  );
  const highRiskItems = selectedItems.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical");
  const selectedCurrencies = Array.from(new Set(selectedItems.map((item) => item.currency)));
  const hasMixedCurrencies = selectedCurrencies.length > 1;
  const uncoveredItems = selectedItems.filter((item) => !selectedSuppliers.some((supplier) => supplierItemAssignments[supplier.id]?.includes(item.id)));
  const emptyAssignedSuppliers = selectedSuppliers.filter((supplier) => (supplierItemAssignments[supplier.id]?.length ?? 0) === 0);
  const missingBusinessTerms = !taskSettings.taskName.trim() || !taskSettings.deadline || !taskSettings.location.trim() || !taskSettings.quoteBasis || !taskSettings.taxPolicy || !taskSettings.freightPolicy || !taskSettings.validityDays || !taskSettings.deliveryRequirement.trim();
  const deadlineExpired = Boolean(taskSettings.deadline) && new Date(taskSettings.deadline).getTime() <= validationNow;
  const maxStep = selectedItems.length === 0 || hasMixedCurrencies
    ? 0
    : selectedSuppliers.length === 0 || blockedSelectedSuppliers.length > 0 || uncoveredItems.length > 0 || emptyAssignedSuppliers.length > 0
      ? 1
      : letterGenerated
        ? 3
        : 2;
  const visibleStep = Math.min(currentStep, maxStep);
  const generateDisabled = selectedItems.length === 0 || selectedSuppliers.length === 0 || blockedSelectedSuppliers.length > 0 || uncoveredItems.length > 0 || emptyAssignedSuppliers.length > 0 || missingBusinessTerms || deadlineExpired;
  const createDisabledReason = selectedItems.length === 0
    ? "请先选择至少 1 个询价对象"
    : hasMixedCurrencies
      ? `当前包含 ${selectedCurrencies.join("、")} 多种币种，请先按币种拆分询价`
    : selectedSuppliers.length === 0
      ? "请先选择至少 1 家供应商"
      : blockedSelectedSuppliers.length > 0
        ? `${blockedSelectedSuppliers.length} 家供应商未通过询价准入`
        : uncoveredItems.length > 0
          ? `${uncoveredItems.length} 项询价对象尚未分配供应商`
          : emptyAssignedSuppliers.length > 0
            ? `${emptyAssignedSuppliers.length} 家供应商尚未分配询价对象`
            : missingBusinessTerms
              ? "请补全任务名称、截止时间和统一报价口径"
              : deadlineExpired
                ? "询价截止时间必须晚于当前时间"
        : !letterGenerated
          ? "请先生成并检查询价函"
          : highRiskItems.length > 0 && !riskAcknowledged
              ? `请先确认 ${highRiskItems.length} 项高风险询价对象`
              : "";
  const createDisabled = Boolean(createDisabledReason);

  const persistDraft = useCallback((showToast = false) => {
    const itemIds = selectedItems.map(inquirySourceId);
    const supplierIds = selectedSuppliers.map((supplier) => supplier.id);
    const savedAt = new Date();
    const supplierAdmissionSnapshot = selectedSuppliers.map((supplier) => ({
      supplierId: supplier.id,
      level: supplierAdmissions[supplier.id].level,
      checkedAt: supplierAdmissions[supplier.id].checkedAt,
      warnings: supplierAdmissions[supplier.id].warnings,
    }));
    const storedDraft: StoredInquiryDraft = {
      version: 2,
      items,
      suppliers,
      supplierItemAssignments,
      letterGenerated,
      letterContent,
      riskAcknowledged,
      taskSettings,
      currentStep: visibleStep,
      savedAt: savedAt.toISOString(),
    };
    window.localStorage.setItem(INQUIRY_DRAFT_STORAGE_KEY, JSON.stringify(storedDraft));
    updateMockWorkflowContext({
      equipmentIds: itemIds.filter((id) => id.startsWith("EQ")),
      materialIds: itemIds.filter((id) => id.startsWith("MAT")),
      supplierIds,
      createdInquiry: {
        id: "INQ-MOCK-DRAFT",
        comparisonId: "CMP-MOCK-DRAFT",
        title: taskSettings.taskName,
        itemIds,
        supplierIds,
        supplierAdmissionSnapshot,
        status: "draft",
        createdAt: savedAt.toISOString(),
      },
    }, { replaceArrays: true });
    setDraftSaved(true);
    setLastSavedAt(savedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
    if (showToast) notifyAction("本机草稿已保存", "询价对象、供应商和当前流程状态已保存在当前浏览器。", "success");
  }, [items, letterContent, letterGenerated, riskAcknowledged, selectedItems, selectedSuppliers, supplierAdmissions, supplierItemAssignments, suppliers, taskSettings, visibleStep]);

  useEffect(() => {
    if (!draftHydrated || draftSaved) return;
    const timeout = window.setTimeout(() => persistDraft(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [draftHydrated, draftSaved, persistDraft]);

  const discardRestoredDraft = () => {
    window.localStorage.removeItem(INQUIRY_DRAFT_STORAGE_KEY);
    const resetItems = buildInitialItems(
      routeContext.equipmentIds,
      routeContext.materialIds,
      routeContext.leadIds,
      routeContext.boqId,
      routeContext.catalogIds,
    );
    const resetSuppliers = buildInitialSuppliers(routeContext.supplierIds);
    const selectedItemIds = resetItems.filter((item) => item.selected).map((item) => item.id);
    setItems(resetItems);
    setSuppliers(resetSuppliers);
    setSupplierItemAssignments(Object.fromEntries(resetSuppliers.filter((supplier) => supplier.selected).map((supplier) => [supplier.id, selectedItemIds])));
    setLetterGenerated(false);
    setLetterContent(aiInquiryLetterDraft.body.join("\n"));
    setRiskAcknowledged(false);
    setTaskSettings(createInitialTaskSettings());
    setCurrentStep(0);
    setDraftSaved(true);
    setLastSavedAt("");
    setRestoredDraftAt("");
    setRestoreNoticeVisible(false);
    notifyAction("本机草稿已放弃", "已恢复为新建询价任务的初始内容。", "info");
  };

  useEffect(() => {
    if (draftSaved) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [draftSaved]);

  const goToNextStep = () => {
    if (visibleStep === 0 && selectedItems.length === 0) return notifyAction("无法继续", "请至少选择 1 个询价对象。", "warning");
    if (visibleStep === 0 && hasMixedCurrencies) return notifyAction("请先拆分币种", createDisabledReason, "warning");
    if (visibleStep === 0) {
      const selectedItemIds = selectedItems.map((item) => item.id);
      setSupplierItemAssignments(Object.fromEntries(selectedSuppliers.map((supplier) => [supplier.id, selectedItemIds])));
      setTaskSettings((current) => ({ ...current, currency: selectedCurrencies[0] ?? current.currency }));
    }
    if (visibleStep === 1 && selectedSuppliers.length === 0) return notifyAction("无法继续", "请至少选择 1 家供应商。", "warning");
    if (visibleStep === 1 && blockedSelectedSuppliers.length > 0) return notifyAction("供应商未通过准入", createDisabledReason, "warning");
    if (visibleStep === 1 && (uncoveredItems.length > 0 || emptyAssignedSuppliers.length > 0)) return notifyAction("询价范围不完整", createDisabledReason, "warning");
    if (visibleStep === 2 && !letterGenerated) return notifyAction("请先生成询价函", "生成并检查询价函后才能进入预览创建步骤。", "warning");
    setCurrentStep((step) => Math.min(3, step + 1));
  };

  const generateLetter = async () => {
    if (selectedItems.length === 0 || selectedSuppliers.length === 0) {
      notifyAction("无法生成询价函", "请至少选择 1 个询价对象和 1 家供应商。", "warning");
      return;
    }
    if (blockedSelectedSuppliers.length > 0) {
      notifyAction(
        "供应商未通过询价准入",
        `${blockedSelectedSuppliers.map((supplier) => supplier.supplierName).join("、")} 需先完成人工复核或重复记录归并。`,
        "warning",
      );
      return;
    }
    if (uncoveredItems.length > 0 || emptyAssignedSuppliers.length > 0) {
      notifyAction("询价范围不完整", createDisabledReason, "warning");
      return;
    }
    if (missingBusinessTerms || deadlineExpired) {
      notifyAction("报价口径未完成", missingBusinessTerms ? "请先补全任务设置和统一报价口径。" : "询价截止时间必须晚于当前时间。", "warning");
      return;
    }
    setAiGenerating(true);
    setDraftSaved(false);
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "inquiry_letter",
          title: taskSettings.taskName,
          sourceLabel: "新建询价任务",
          businessObjectType: "inquiry_draft",
          businessHref: "/inquiries/create",
          input: {
            language: "zh-CN",
            settings: taskSettings,
            items: selectedItems.map(({ id, itemCode, name, category, specification, quantity, unit, targetPrice, currency, riskLevel }) => ({ id, itemCode, name, category, specification, quantity, unit, targetPrice, currency, riskLevel })),
            suppliers: selectedSuppliers.map(({ id, supplierName, category, confidence, riskLevel }) => ({ id, supplierName, category, confidence, riskLevel, assignedItemIds: supplierItemAssignments[id] ?? [] })),
            instruction: "生成完整、专业、可人工编辑的供应商询价函草稿；不得声称已发送或已批准供应商。",
          },
        }),
      });
      const queued = await response.json() as { data?: AiExecutionTask; error?: string };
      if (!response.ok || !queued.data?.id) throw new Error(queued.error || "AI 询价函任务创建失败");

      let task = queued.data;
      for (let attempt = 0; attempt < 30 && ["queued", "running"].includes(task.status); attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const taskResponse = await fetch(`/api/ai/tasks?id=${encodeURIComponent(task.id)}`, { cache: "no-store" });
        const taskPayload = await taskResponse.json() as { data?: AiExecutionTask; error?: string };
        if (!taskResponse.ok || !taskPayload.data) throw new Error(taskPayload.error || "AI 任务状态读取失败");
        task = taskPayload.data;
      }
      if (task.status === "failed") throw new Error(task.error_message || "AI 询价函生成失败");
      const body = task.output_payload?.body;
      if (typeof body !== "string" || body.trim().length < 80) throw new Error("AI 任务尚未返回有效函件正文，请稍后在 AI 工作台查看");
      setLetterContent(body);
      setLetterGenerated(true);
      notifyAction("AI 询价函草稿已生成", `${task.task_code} 已通过结构校验，请人工检查并修改后再创建任务。`, "success");
    } catch (error) {
      setLetterGenerated(false);
      notifyAction("询价函生成失败", error instanceof Error ? error.message : "请稍后重试", "warning");
    } finally {
      setAiGenerating(false);
    }
  };

  const importInquiryItems = async (file: File) => {
    try {
      const imported = await parseInquiryImport(file);
      if (!imported.length) throw new Error("文件中没有可导入的有效数据行");
      setItems((current) => dedupeInquiryItems([...current, ...imported]));
      setLetterGenerated(false);
      setRiskAcknowledged(false);
      setDraftSaved(false);
      notifyAction("导入完成", `已从 ${file.name} 导入 ${imported.length} 条询价对象。`, "success");
    } catch (error) {
      notifyAction("导入失败", error instanceof Error ? error.message : "请检查文件格式", "warning");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const createInquiryTask = async () => {
    if (createDisabledReason) {
      notifyAction("暂不能创建询价任务", createDisabledReason, "warning");
      return;
    }
    if (blockedSelectedSuppliers.length > 0) {
      notifyAction(
        "创建询价被拦截",
        `${blockedSelectedSuppliers.length} 家供应商未通过统一准入检查，请先进入供应商资料维护页处理。`,
        "warning",
      );
      return;
    }
    if (!letterGenerated) {
      notifyAction(
        "请先生成询价函",
        "完成对象和供应商选择后，需先生成 AI 询价函草稿。",
        "warning",
      );
      return;
    }

    const itemIds = selectedItems.map(inquirySourceId);
    const supplierIds = selectedSuppliers.map((supplier) => supplier.id);
    const supplierAdmissionSnapshot = selectedSuppliers.map((supplier) => ({
      supplierId: supplier.id,
      level: supplierAdmissions[supplier.id].level,
      checkedAt: supplierAdmissions[supplier.id].checkedAt,
      warnings: supplierAdmissions[supplier.id].warnings,
    }));
    setCreatingTask(true);

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: taskSettings.taskName,
          deadline: `${taskSettings.deadline.replace(" ", "T")}+08:00`,
          letterContent,
          equipmentIds: itemIds.filter((id) => id.startsWith("EQ")),
          materialIds: itemIds.filter((id) => id.startsWith("MAT")),
          supplierIds,
          supplierAssignments: selectedSuppliers.map((supplier) => ({
            supplierId: supplier.id,
            itemIds: supplierItemAssignments[supplier.id] ?? [],
          })),
          projectPricingId: routeContext.projectPricingId,
          projectPricingItemIds: selectedItems
            .map(inquirySourceId)
            .filter((id) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)),
          items: selectedItems.map((item) => ({
            id: item.id,
            sourceId: inquirySourceId(item),
            category: item.category,
            name: item.name,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit,
            targetPrice: item.targetPrice,
            currency: item.currency,
            riskLevel: item.riskLevel,
          })),
          metadata: {
            source: routeContext.source || "/inquiries/create",
            projectPricingId: routeContext.projectPricingId,
            supplierAdmissionSnapshot,
            supplierItemAssignments,
            quoteBasis: taskSettings.quoteBasis,
            taxPolicy: taskSettings.taxPolicy,
            freightPolicy: taskSettings.freightPolicy,
            validityDays: Number(taskSettings.validityDays),
            deliveryRequirement: taskSettings.deliveryRequirement,
            location: taskSettings.location,
            currency: taskSettings.currency,
            paymentTerms: taskSettings.paymentTerms,
            note: taskSettings.note,
            supplierReviewPendingCount: reviewPendingSelectedSuppliers.length,
            lifecycleStage: "server_draft",
          },
        }),
      });
      const result = (await response.json()) as {
        data?: { legacy_id: string; inquiry_code: string };
        error?: string;
      };
      if (!response.ok || !result.data) {
        throw new Error(result.error || "询价任务写入失败");
      }

      const inquiryId = result.data.legacy_id ?? result.data.inquiry_code;
      const comparisonId = inquiryId.replace(/^INQ-/, "CMP-");
      window.localStorage.removeItem(INQUIRY_DRAFT_STORAGE_KEY);
      updateMockWorkflowContext(
        {
          source: routeContext.source || "/inquiries/create",
          equipmentIds: itemIds.filter((id) => id.startsWith("EQ")),
          materialIds: itemIds.filter((id) => id.startsWith("MAT")),
          supplierIds,
          inquiryId,
          comparisonId,
          createdInquiry: {
            id: inquiryId,
            comparisonId,
            title: taskSettings.taskName,
            itemIds,
            supplierIds,
            supplierAdmissionSnapshot,
            status: "created",
            createdAt: new Date().toISOString(),
          },
        },
        { replaceArrays: true },
      );
      appendMockWorkflowEvent({
        type: "create",
        label: "创建询价任务",
        from: "/inquiries/create",
        to: "/inquiries",
        status: "created",
        payload: {
          inquiryId,
          comparisonId,
          itemIds,
          supplierIds,
          supplierAdmissionSnapshot,
          persistence: "supabase",
        },
      });
      notifyAction(
        "询价任务已创建",
        `${inquiryId} 已写入 Supabase，当前为草稿并等待人工确认。`,
        "success",
      );
      window.setTimeout(
        () => {
          const destination = safeReturnTo
            ? `${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}createdInquiry=${encodeURIComponent(inquiryId)}`
            : `/inquiries?created=${inquiryId}&inquiryId=${inquiryId}`;
          router.push(destination);
        },
        250,
      );
    } catch (error) {
      notifyAction(
        "询价任务创建失败",
        error instanceof Error ? error.message : "请检查网络和登录状态后重试。",
        "warning",
      );
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <AppLayout>
      <div data-no-global-interaction className="space-y-3">
        <CreatePageHeader
          onSaveDraft={() => persistDraft(true)}
          draftSaved={draftSaved}
          lastSavedAt={lastSavedAt}
        />
        <InquiryLifecycleStrip currentStage="local_draft" />
        <StepIndicator
          currentStep={visibleStep}
          maxStep={maxStep}
          summaries={[
            `已选择 ${selectedItems.length} 项询价对象`,
            `已选择 ${selectedSuppliers.length} 家供应商`,
            letterGenerated ? "询价函已生成并进入预览" : "询价函尚未生成",
            createDisabledReason || "创建条件已满足",
          ]}
          onChange={setCurrentStep}
        />
        <RouteContextBanner
          title="已带入询价对象与供应商"
          source={routeContext.source}
          summary={[
            `设备 ${items.filter((item) => item.category === "设备").length} 项`,
            `地材 ${items.filter((item) => item.category === "地材").length} 项`,
            `供应商 ${suppliers.length} 家`,
            `当前已选 ${selectedItems.length} 项 / ${selectedSuppliers.length} 家`,
          ]}
        />

        {restoreNoticeVisible ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary-soft px-4 py-2 text-[12px] text-primary">
            <div><strong>已恢复本机草稿</strong><span className="ml-2 text-textSecondary">保存于 {restoredDraftAt}，尚未提交到服务器。</span></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRestoreNoticeVisible(false)} className="h-8 rounded-md border border-primary/20 bg-white px-3 font-semibold text-primary">继续编辑</button>
              <button type="button" onClick={discardRestoredDraft} className="h-8 rounded-md border border-danger/20 bg-white px-3 font-semibold text-danger">放弃并重置</button>
            </div>
          </div>
        ) : null}

        {visibleStep === 0 ? <InquiryItemsPanel
          items={items}
          onToggle={(id) => {
            setItems((current) => current.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
            setLetterGenerated(false);
            setRiskAcknowledged(false);
            setDraftSaved(false);
          }}
          onToggleAll={() => {
            setItems((current) => {
              const shouldSelect = !current.every((item) => item.selected);
              return current.map((item) => ({ ...item, selected: shouldSelect }));
            });
            setLetterGenerated(false);
            setRiskAcknowledged(false);
            setDraftSaved(false);
          }}
          onClear={() => {
            setItems((current) => current.map((item) => ({ ...item, selected: false })));
            setLetterGenerated(false);
            setRiskAcknowledged(false);
            setDraftSaved(false);
            notifyAction("已清空选择", "询价对象选择已更新。", "success");
          }}
          onDelete={(id) => {
            const target = items.find((item) => item.id === id);
            setItems((current) => current.filter((item) => item.id !== id));
            setLetterGenerated(false);
            setRiskAcknowledged(false);
            setDraftSaved(false);
            notifyAction("询价对象已移除", `${target?.name ?? id} 已从当前清单移除。`, "warning");
          }}
          onAdd={() => router.push("/equipment-catalog?intent=select-for-inquiry&returnTo=/inquiries/create")}
          onImport={() => importInputRef.current?.click()}
          onProjectImport={() => router.push("/project-pricing?intent=create-inquiry")}
          onEdit={(id) => setEditingItemId(id)}
          onFixMissing={() => {
            setItems((current) => current.map((item) => item.selected ? { ...item, specification: item.specification.trim() && !item.specification.includes("待补") ? item.specification : "规格由供应商报价时确认", unit: item.unit.trim() || "项" } : item));
            setLetterGenerated(false);
            setDraftSaved(false);
            notifyAction("默认字段已补齐", "缺失规格已标记为供应商确认，缺失单位已暂设为“项”。", "success");
          }}
          onKeepCurrency={(currency) => {
            setItems((current) => current.map((item) => ({ ...item, selected: item.selected && item.currency === currency })));
            setTaskSettings((current) => ({ ...current, currency }));
            setLetterGenerated(false);
            setRiskAcknowledged(false);
            setDraftSaved(false);
            notifyAction("已按币种拆分", `当前询价仅保留 ${currency} 项目，其他币种可另建询价任务。`, "success");
          }}
        /> : null}

        {visibleStep === 1 ? <div className="space-y-3">
          {selectedAdmissions.length ? <SupplierAdmissionBanner
            admissions={selectedAdmissions}
            onOpenReviewQueue={(supplierId) => router.push(`/suppliers/manage?tab=pending&keyword=${encodeURIComponent(supplierId)}`)}
          /> : <div className="rounded-lg border border-warning/25 bg-warning-soft px-4 py-2.5 text-[12px] font-semibold text-warning">尚未选择供应商，请至少选择 1 家通过准入检查的供应商。</div>}
          <SuppliersPanel
            suppliers={suppliers}
            admissions={supplierAdmissions}
            onRecommend={() => router.push(`/suppliers?view=ai-recommendation&intent=select-for-inquiry&itemIds=${selectedItems.map((item) => item.id).join(",")}`)}
            onMore={() => router.push("/suppliers?intent=select-for-inquiry&returnTo=/inquiries/create")}
            onToggle={(id) => {
              const supplier = suppliers.find((item) => item.id === id);
              if (supplier && !supplier.selected && !supplierAdmissions[id].allowed) {
                notifyAction("供应商未通过询价准入", supplierAdmissions[id].blockers.join(" "), "warning");
                return;
              }
              if (supplier && !supplier.selected) {
                setSupplierItemAssignments((current) => ({ ...current, [id]: selectedItems.map((item) => item.id) }));
              } else {
                setSupplierItemAssignments((current) => {
                  const next = { ...current };
                  delete next[id];
                  return next;
                });
              }
              setSuppliers((current) => current.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
              setLetterGenerated(false);
              setRiskAcknowledged(false);
              setDraftSaved(false);
            }}
          />
          {selectedSuppliers.length > 0 ? <SupplierCoveragePanel
            items={selectedItems}
            suppliers={selectedSuppliers}
            assignments={supplierItemAssignments}
            onToggleItem={(supplierId, itemId) => {
              setSupplierItemAssignments((current) => {
                const assigned = current[supplierId] ?? [];
                return { ...current, [supplierId]: assigned.includes(itemId) ? assigned.filter((id) => id !== itemId) : [...assigned, itemId] };
              });
              setLetterGenerated(false);
              setDraftSaved(false);
            }}
            onAssignAll={(supplierId, assign) => {
              setSupplierItemAssignments((current) => ({ ...current, [supplierId]: assign ? selectedItems.map((item) => item.id) : [] }));
              setLetterGenerated(false);
              setDraftSaved(false);
            }}
          /> : null}
        </div> : null}

        {visibleStep === 2 ? <div className="space-y-3">
          <TaskSettingsPanel
            value={taskSettings}
            onChange={(next) => {
              setTaskSettings(next);
              setLetterGenerated(false);
              setDraftSaved(false);
            }}
          />
          <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.72fr)]">
            <LetterPreviewPanel items={items} generated={letterGenerated} content={letterContent} settings={taskSettings} onGenerate={generateLetter} onContentChange={(value) => { setLetterContent(value); setDraftSaved(false); }} />
            <AiSmartAdvicePanel supplierCount={selectedSuppliers.length} highRiskCount={highRiskItems.length} />
          </div>
        </div> : null}

        {visibleStep === 3 ? <>
          {reviewPendingSelectedSuppliers.length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning-soft px-4 py-2.5 text-[12px] font-semibold text-warning">
              <ShieldCheck className="size-4 shrink-0" />
              当前可创建待审核任务；其中 {reviewPendingSelectedSuppliers.length} 家供应商须完成人工核验后，才能正式发送询价函。
            </div>
          ) : null}
          <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
            <DispatchPlanSummary suppliers={selectedSuppliers} items={selectedItems} assignments={supplierItemAssignments} settings={taskSettings} />
            <AiRiskPanel highRiskCount={highRiskItems.length} acknowledged={riskAcknowledged} onAcknowledge={(checked) => { setRiskAcknowledged(checked); setDraftSaved(false); }} />
          </div>
          <InquiryOverviewPanel
            itemCount={selectedItems.length}
            quantity={selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
            total={selectedItems.reduce((sum, item) => sum + item.quantity * item.targetPrice, 0)}
            currency={selectedCurrencies[0] ?? taskSettings.currency}
            supplierCount={selectedSuppliers.length}
          />
        </> : null}

        <section className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-borderSoft bg-white/95 px-4 py-3 shadow-panel backdrop-blur">
          <div className="min-w-0"><strong className="text-[13px] text-textMain">第 {visibleStep + 1} 步：{inquiryCreateSteps[visibleStep].label}</strong><p className="mt-0.5 truncate text-[11px] text-textMuted">{createDisabledReason || (reviewPendingSelectedSuppliers.length ? `可创建待审核任务，${reviewPendingSelectedSuppliers.length} 家供应商发送前仍需核验。` : "全部创建条件已满足，可提交询价任务。")}</p></div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={visibleStep === 0} onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} className="inline-flex h-9 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary disabled:opacity-35"><ChevronLeft className="size-4" />上一步</button>
            {visibleStep < 2 ? <button type="button" onClick={goToNextStep} className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-[12px] font-bold text-white">下一步<ChevronRight className="size-4" /></button> : null}
            {visibleStep === 2 && !letterGenerated ? <button type="button" disabled={generateDisabled || aiGenerating} onClick={() => void generateLetter()} className="inline-flex h-9 items-center gap-1 rounded-md bg-ai px-4 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><WandSparkles className="size-4" />{aiGenerating ? "正在生成" : "生成初版询价函"}</button> : null}
            {visibleStep === 2 && letterGenerated ? <button type="button" onClick={goToNextStep} className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-[12px] font-bold text-white">预览并创建<ChevronRight className="size-4" /></button> : null}
            {visibleStep === 3 ? <button type="button" disabled={creatingTask || createDisabled} onClick={() => void createInquiryTask()} title={createDisabledReason || undefined} className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><CheckCircle2 className="size-4" />{creatingTask ? "正在创建" : "创建待审核任务"}</button> : null}
          </div>
        </section>

      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importInquiryItems(file);
        }}
      />
      <EditDrawer
        open={editingItemId !== null}
        title="编辑询价对象"
        description={items.find((item) => item.id === editingItemId)?.name ?? "编辑当前询价对象。"}
        onClose={() => setEditingItemId(null)}
        onSave={() => {
          setEditingItemId(null);
          setLetterGenerated(false);
          setRiskAcknowledged(false);
          setDraftSaved(false);
          notifyAction("询价对象已更新", "对象信息已保存，需重新生成询价函。", "success");
        }}
      />
    </AppLayout>
  );
}

export default function InquiryCreatePage() {
  return (
    <Suspense fallback={null}>
      <InquiryCreatePageContent />
    </Suspense>
  );
}
