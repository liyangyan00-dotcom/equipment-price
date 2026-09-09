"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  History,
  LineChart,
  PackageCheck,
  PenLine,
  ShieldAlert,
  Sparkles,
  Upload,
  Wrench,
} from "lucide-react";

import { AiBadge } from "@/components/badges/AiBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { MockExportDialog, ModuleHeader } from "@/components/common";
import {
  EquipmentEvidenceManagerDialog,
  evidenceTypeLabels,
} from "@/components/equipment-create/EquipmentEvidenceManagerDialog";
import { EquipmentEvidenceUploadDialog } from "@/components/equipment-create/EquipmentEvidenceUploadDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { equipmentPriceRecords, type EquipmentPriceRecord } from "@/data/mock/equipmentPrices";
import { supplierRecords } from "@/data/mock/suppliers";
import { useMockAiAction } from "@/hooks/useMockAiAction";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type {
  EquipmentEvidenceInput,
  EquipmentPriceEditData,
} from "@/types/equipmentPriceCreate";

type Tone = "blue" | "cyan" | "green" | "purple" | "orange" | "red" | "slate";

type EquipmentArchive = {
  id: string;
  code: string;
  name: string;
  equipmentName: string;
  model: string;
  category: string;
  brand: string;
  currentPrice: string;
  usdPrice: string;
  supplier: string;
  supplierCode: string;
  supplierId: string;
  quoteDate: string;
  validUntil: string;
  condition: string;
  confidence: number;
  confidenceLevel: EquipmentPriceRecord["confidence"];
  reviewStatus: EquipmentPriceRecord["reviewStatus"];
  riskLevel: EquipmentPriceRecord["riskLevel"];
  quoteCount: number;
  evidenceCount: number;
  aiSummary: string;
  record: EquipmentPriceRecord;
};

const toneClass: Record<Tone, { icon: string; soft: string; text: string; border: string }> = {
  blue: {
    icon: "from-[#2F6BFF] to-[#0EA5E9]",
    soft: "bg-primary-soft",
    text: "text-primary",
    border: "border-primary/20",
  },
  cyan: {
    icon: "from-[#06B6D4] to-[#38BDF8]",
    soft: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
  },
  green: {
    icon: "from-[#22C55E] to-[#10B981]",
    soft: "bg-success-soft",
    text: "text-success",
    border: "border-success/20",
  },
  purple: {
    icon: "from-[#8B5CF6] to-[#6D5DFB]",
    soft: "bg-ai-soft",
    text: "text-ai",
    border: "border-ai-border",
  },
  orange: {
    icon: "from-[#F59E0B] to-[#F97316]",
    soft: "bg-warning-soft",
    text: "text-warning",
    border: "border-warning/25",
  },
  red: {
    icon: "from-[#EF4444] to-[#F97316]",
    soft: "bg-danger-soft",
    text: "text-danger",
    border: "border-danger/25",
  },
  slate: {
    icon: "from-[#64748B] to-[#334155]",
    soft: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

const confidenceScore: Record<EquipmentPriceRecord["confidence"], number> = {
  A: 94,
  B: 86,
  C: 74,
  D: 62,
  E: 48,
};

const riskTone: Record<EquipmentPriceRecord["riskLevel"], Tone> = {
  low: "green",
  medium: "orange",
  high: "red",
  critical: "red",
};

const priceConditionLabel: Record<string, string> = {
  EXW: "EXW 工厂交货",
  FOB: "FOB 离岸价",
  CIF: "CIF 到岸价",
  DDP: "DDP 完税交付",
  SITE: "现场价",
  LOCAL_PICKUP: "本地自提",
  LOCAL_DELIVERY: "本地交付",
};

function formatMoney(value: number, currency: string) {
  const prefix = currency === "USD" ? "$" : currency === "CNY" ? "¥" : `${currency} `;
  return `${prefix}${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "2026-06-19";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getRouteId(rawId: string | string[] | undefined) {
  const value = Array.isArray(rawId) ? rawId[0] : rawId;
  return decodeURIComponent(value ?? equipmentPriceRecords[0]?.id ?? "");
}

function findEquipmentRecord(
  routeId: string,
  records: EquipmentPriceRecord[] = equipmentPriceRecords,
) {
  const normalized = routeId.trim().toLowerCase();

  return (
    records.find((record) =>
      [record.id, record.equipmentCode, record.equipmentName, record.brand]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase() === normalized),
    ) ?? records[0] ?? equipmentPriceRecords[0]
  );
}

function normalizeLookup(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function resolveSupplierRecord(record: EquipmentPriceRecord) {
  const supplierName = normalizeLookup(record.supplier);
  const exactMatch = supplierRecords.find((supplier) =>
    [supplier.id, supplier.supplierCode, supplier.supplierName]
      .filter(Boolean)
      .some((value) => normalizeLookup(value) === supplierName),
  );

  if (exactMatch) return exactMatch;

  const numericId = Number(record.id.replace(/\D/g, ""));
  if (Number.isFinite(numericId) && supplierRecords.length > 0) {
    return supplierRecords[Math.max(0, (numericId - 1) % supplierRecords.length)];
  }

  return supplierRecords[0];
}

function buildArchive(record: EquipmentPriceRecord): EquipmentArchive {
  const score = confidenceScore[record.confidence] ?? 80;
  const evidenceCount = record.aiRecommended ? 8 : Math.max(4, Math.round(score / 14));
  const quoteCount = 24 + Number(record.id.replace(/\D/g, "") || 1) * 7;
  const supplierRecord = resolveSupplierRecord(record);

  return {
    id: record.id,
    code: record.equipmentCode,
    name: record.equipmentName,
    equipmentName: record.equipmentName,
    model: record.specification,
    category: record.category,
    brand: record.brand,
    currentPrice: formatMoney(record.originalPrice, record.currency),
    usdPrice: formatMoney(record.usdPrice, "USD"),
    supplier: record.supplier,
    supplierCode: supplierRecord?.supplierCode ?? `SUP-${record.id.replace(/\D/g, "").padStart(4, "0")}`,
    supplierId: supplierRecord?.id ?? supplierRecord?.supplierCode ?? "SUP-001",
    quoteDate: record.updatedAt,
    validUntil: addDays(record.updatedAt, 30),
    condition: priceConditionLabel[record.priceCondition] ?? record.priceCondition,
    confidence: score,
    confidenceLevel: record.confidence,
    reviewStatus: record.reviewStatus,
    riskLevel: record.riskLevel,
    quoteCount,
    evidenceCount,
    aiSummary:
      record.aiSuggestion ||
      `${record.equipmentName} 当前报价已与历史价格、供应商报价和相似规格记录完成比对，建议人工确认关键商务条款后再进入项目套价。`,
    record,
  };
}

function getTechParams(archive: EquipmentArchive) {
  return [
    ["设备编号", archive.code],
    ["设备名称", archive.name],
    ["品牌", archive.brand],
    ["规格型号", archive.model],
    ["设备类别", archive.category],
    ["计量单位", archive.record.unit],
    ["价格条件", archive.condition],
    ["价格来源", archive.record.sourceType],
    ["参数完整度", archive.confidence >= 90 ? "较完整" : archive.confidence >= 75 ? "需补充关键参数" : "缺失较多"],
    ["适用场景", archive.category.includes("泵") ? "水厂泵站 / 污水处理" : archive.category.includes("阀") ? "管网阀门 / 工艺控制" : "水厂机电与自动化"],
    ["执行标准", archive.category.includes("电气") ? "IEC / GB 电气设备规范" : "GB/T 5657-2013"],
    ["AI备注", archive.record.aiRecommended ? "可进入 AI 推荐和询价流程" : "建议先人工复核后再采用"],
  ];
}

function getQuoteInfo(archive: EquipmentArchive) {
  return [
    ["原始价格", archive.currentPrice],
    ["折算美元价", archive.usdPrice],
    ["币种", archive.record.currency],
    ["单位", archive.record.unit],
    ["价格条件", archive.condition],
    ["报价日期", archive.quoteDate],
    ["有效期", archive.validUntil],
    ["报价来源", archive.record.priceSource],
    ["来源类型", archive.record.sourceType],
    ["供应商", archive.supplier],
    ["审核状态", archive.record.reviewStatus],
    ["风险等级", archive.record.riskLevel],
  ];
}

function getSupplierInfo(archive: EquipmentArchive) {
  return [
    ["供应商编码", archive.supplierCode],
    ["供应商名称", archive.supplier],
    ["供应商等级", archive.confidenceLevel === "A" ? "A 级" : archive.confidenceLevel === "B" ? "B 级" : "需复核"],
    ["综合评分", `${Math.min(96, archive.confidence + 2)} 分`],
    ["主营设备", archive.category],
    ["报价次数", `${archive.quoteCount} 次`],
    ["最近报价", archive.quoteDate],
    ["联系人", "张工 / 138 1234 5678"],
  ];
}

function getPriceHistory(archive: EquipmentArchive) {
  const base = archive.record.originalPrice;
  const supplierShort = archive.supplier.replace(/（.*?）/g, "").slice(0, 12);

  return [0, 1, 2, 3, 4].map((offset) => {
    const date = new Date(`${archive.quoteDate}T00:00:00`);
    date.setDate(date.getDate() - offset * 31);
    const price = Math.round(base * (1 + offset * 0.026));
    return {
      version: `V${1.5 - offset / 10}`,
      date: date.toISOString().slice(0, 10),
      price: price.toLocaleString("zh-CN"),
      quantity: String(2 + (offset % 3)),
      supplier: supplierShort,
      reviewStatus: offset <= 2 ? "confirmed" : archive.reviewStatus,
      confidence: `${Math.max(68, archive.confidence - offset * 2).toFixed(1)}%`,
      riskLevel: offset <= 1 ? archive.riskLevel : "medium",
    };
  });
}

function getAiJudgements(archive: EquipmentArchive) {
  const delta = archive.riskLevel === "low" ? "低于均值 6.8%" : archive.riskLevel === "medium" ? "偏离均值 12.4%" : "偏离均值 18.6%";

  return [
    {
      title: "价格合理性判断",
      value: archive.riskLevel === "low" ? "可采用" : "需复核",
      desc: `${archive.name} 当前报价 ${delta}，AI建议结合供应商资质、交付周期和证据完整度进行人工确认。`,
      action: archive.riskLevel === "low" ? "查看AI理由" : "人工复核",
      tone: archive.riskLevel === "low" ? ("green" as Tone) : ("orange" as Tone),
    },
    {
      title: "相似价格匹配",
      value: `${archive.confidenceLevel === "A" ? 9 : 5} 条`,
      desc: `已匹配 ${archive.brand} / ${archive.model} 的历史成交、供应商报价和 AI 推荐价格样本。`,
      action: "查看相似价格",
      tone: "blue" as Tone,
    },
    {
      title: "证据链完整度",
      value: `${archive.evidenceCount}/9`,
      desc: `${archive.record.sourceType}、技术资料和供应商信息已关联，仍建议补充付款或交付条款证明。`,
      action: "补充证据",
      tone: "purple" as Tone,
    },
  ];
}

function getRiskActions(archive: EquipmentArchive) {
  const tone = riskTone[archive.riskLevel];

  return [
    {
      type: "价格偏离",
      level: archive.riskLevel,
      desc:
        archive.riskLevel === "low"
          ? "报价与历史区间基本一致，可进入套价候选。"
          : `${archive.name} 报价与同类样本存在偏差，建议复核报价来源。`,
      action: archive.riskLevel === "low" ? "记录确认" : "发起复核",
      tone,
    },
    {
      type: "供应商可信度",
      level: archive.confidenceLevel === "A" || archive.confidenceLevel === "B" ? "low" : "medium",
      desc: `${archive.supplier} 当前可信度为 ${archive.confidenceLevel}，报价证据 ${archive.evidenceCount} 份。`,
      action: archive.confidenceLevel === "A" ? "查看证据链" : "补充资料",
      tone: archive.confidenceLevel === "A" || archive.confidenceLevel === "B" ? ("green" as Tone) : ("orange" as Tone),
    },
    {
      type: "参数完整度",
      level: archive.confidence >= 85 ? "low" : "medium",
      desc: `${archive.model} 参数完整度 ${archive.confidence}%，可继续补充工况、材质或防护等级。`,
      action: "补全参数",
      tone: archive.confidence >= 85 ? ("green" as Tone) : ("orange" as Tone),
    },
  ];
}

function SectionCard({
  title,
  subtitle,
  icon,
  tone = "blue",
  action,
  children,
  className,
  id,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} tabIndex={id ? -1 : undefined} className={cn("min-w-0 scroll-mt-20 overflow-hidden rounded-[12px] border border-borderSoft bg-white shadow-card outline-none focus-visible:ring-2 focus-visible:ring-primary/30", className)}>
      <div className="border-b border-borderSoft px-4 py-3">
        <ModuleHeader icon={icon} title={title} subtitle={subtitle} tone={tone} action={action} density="compact" headingLevel={3} />
      </div>
      {children}
    </section>
  );
}

function TopSummaryCards({ archive, onSelect }: { archive: EquipmentArchive; onSelect: (label: string) => void }) {
  const cards = [
    { label: "设备名称", value: archive.name, desc: archive.code, icon: PackageCheck, tone: "blue" as Tone },
    { label: "规格型号", value: archive.model, desc: `${archive.brand} / ${archive.category}`, icon: Wrench, tone: "green" as Tone },
    { label: "当前价格", value: archive.currentPrice, desc: `${archive.record.currency} / ${archive.record.unit}`, icon: BarChart3, tone: "orange" as Tone },
    { label: "价格可信度", value: `${archive.confidence}%`, desc: `可信度 ${archive.confidenceLevel}`, icon: Sparkles, tone: "purple" as Tone },
    { label: "审核状态", value: archive.reviewStatus === "confirmed" ? "已确认" : "待确认", desc: "需保留人工复核记录", icon: CheckCircle2, tone: archive.reviewStatus === "confirmed" ? "green" : "orange" },
    { label: "报价次数", value: `${archive.quoteCount} 次`, desc: "近12个月报价记录", icon: ClipboardCheck, tone: "cyan" as Tone },
  ];

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const tone = toneClass[card.tone as Tone];

        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onSelect(card.label)}
            className={cn(
              "group flex min-w-0 min-h-[92px] items-center gap-3 rounded-[12px] border bg-white px-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-panel",
              tone.border,
            )}
          >
            <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br text-white shadow-lg", tone.icon)}>
              <Icon className="size-7" strokeWidth={2.3} />
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[12px] font-extrabold", tone.text)}>{card.label}</span>
              <span className="mt-1 block truncate text-[20px] font-extrabold leading-6 text-textMain" title={card.value}>
                {card.value}
              </span>
              <span className="mt-1 block truncate text-[11px] font-semibold text-textMuted" title={card.desc}>
                {card.desc}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EquipmentVisual({ archive, activeView, onViewChange }: { archive: EquipmentArchive; activeView: string; onViewChange: (view: string) => void }) {
  const isValve = archive.category.includes("阀");
  const isElectric = archive.category.includes("电气") || archive.category.includes("自控");

  return (
    <div className="relative flex h-[312px] items-center justify-center bg-gradient-to-b from-[#F8FBFF] to-white">
      <div className="absolute right-4 top-4 rounded-lg border border-borderSoft bg-white px-2 py-1 text-[11px] font-bold text-primary shadow-sm">
        {archive.category}
      </div>
      <svg
        width="172"
        height="250"
        viewBox="0 0 172 250"
        fill="none"
        aria-label={`${archive.name} ${activeView}占位图`}
        className={cn("transition duration-300", activeView === "侧视图" && "scale-x-75", activeView === "图纸" && "opacity-55 grayscale")}
      >
        {isValve ? (
          <>
            <rect x="64" y="24" width="44" height="52" rx="10" fill="url(#blueTop)" />
            <circle cx="86" cy="126" r="54" fill="#DBEAFE" stroke="#2563EB" strokeWidth="10" />
            <rect x="22" y="112" width="128" height="28" rx="14" fill="#2563EB" />
            <rect x="74" y="72" width="24" height="106" rx="12" fill="#F97316" />
            <rect x="34" y="188" width="104" height="22" rx="10" fill="#1D4ED8" />
          </>
        ) : isElectric ? (
          <>
            <rect x="38" y="24" width="96" height="174" rx="18" fill="url(#cabinet)" />
            <rect x="52" y="46" width="68" height="42" rx="8" fill="#EFF6FF" />
            <rect x="54" y="108" width="64" height="10" rx="5" fill="#60A5FA" />
            <rect x="54" y="132" width="64" height="10" rx="5" fill="#93C5FD" />
            <rect x="54" y="156" width="42" height="10" rx="5" fill="#CBD5E1" />
            <rect x="44" y="206" width="84" height="18" rx="9" fill="#1D4ED8" />
          </>
        ) : (
          <>
            <rect x="59" y="6" width="54" height="58" rx="18" fill="url(#blueTop)" />
            <rect x="44" y="54" width="82" height="56" rx="16" fill="url(#pumpBody)" />
            <rect x="74" y="82" width="20" height="96" rx="10" fill="#F97316" />
            <rect x="58" y="106" width="54" height="90" rx="20" fill="url(#pumpTube)" />
            <rect x="18" y="165" width="104" height="58" rx="20" fill="#E2F6FF" stroke="#2563EB" strokeWidth="7" />
            <rect x="112" y="184" width="48" height="18" rx="9" fill="#2563EB" />
            <rect x="30" y="222" width="112" height="22" rx="10" fill="url(#pumpBase)" />
          </>
        )}
        <defs>
          <linearGradient id="blueTop" x1="59" x2="113" y1="6" y2="64">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="pumpBody" x1="44" x2="126" y1="54" y2="110">
            <stop stopColor="#1E40AF" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id="pumpTube" x1="58" x2="112" y1="106" y2="196">
            <stop stopColor="#93C5FD" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="pumpBase" x1="30" x2="142" y1="222" y2="244">
            <stop stopColor="#1D4ED8" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id="cabinet" x1="38" x2="134" y1="24" y2="198">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#1E40AF" />
          </linearGradient>
        </defs>
      </svg>
      {activeView === "铭牌" ? (
        <div className="absolute left-1/2 top-1/2 w-[176px] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-primary bg-white/95 p-3 shadow-panel">
          <p className="text-[12px] font-extrabold text-primary">{archive.brand}</p>
          <p className="mt-2 text-[11px] font-bold text-textMain">{archive.name}</p>
          <p className="mt-1 text-[10px] text-textMuted">型号：{archive.model}</p>
          <p className="mt-1 text-[10px] text-textMuted">编号：{archive.code}</p>
        </div>
      ) : null}
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-4 gap-2">
        {["主视图", "侧视图", "铭牌", "图纸"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onViewChange(item)}
            aria-pressed={activeView === item}
            className={cn(
              "h-11 rounded-lg border bg-white text-[11px] font-bold text-textSecondary",
              activeView === item ? "border-primary text-primary ring-2 ring-primary/10" : "border-borderSoft",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function KeyValueTable({ rows }: { rows: string[][] }) {
  return (
    <div className="divide-y divide-borderSoft px-4 py-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[108px_1fr] items-center gap-3 py-[8px] text-[12px]">
          <span className="font-semibold text-textMuted">{label}</span>
          <span className="text-right font-extrabold leading-5 text-textMain">{value}</span>
        </div>
      ))}
    </div>
  );
}

function SupplierInfo({ archive }: { archive: EquipmentArchive }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-[14px] font-extrabold leading-6 text-textMain">{archive.supplier}</h4>
          <p className="mt-1 text-[11px] font-semibold text-textMuted">{archive.category}供应商 · 报价 {archive.quoteCount} 次</p>
        </div>
        <span className="rounded-md bg-success-soft px-2 py-1 text-[12px] font-extrabold text-success">{archive.confidenceLevel} 级</span>
      </div>
      <KeyValueTable rows={getSupplierInfo(archive)} />
      <div className="mt-3 flex items-center gap-4 border-t border-borderSoft pt-3">
        <Link href={`/suppliers/${archive.supplierId}`} className="inline-flex items-center gap-1 text-[12px] font-extrabold text-primary">
          查看供应商详情 <ChevronRight className="size-3.5" />
        </Link>
        <Link href={`/suppliers/${archive.supplierId}?tab=cooperation`} className="inline-flex items-center gap-1 text-[12px] font-extrabold text-primary">
          历史合作记录 <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function TrendChart({
  archive,
  expanded,
  onMore,
}: {
  archive: EquipmentArchive;
  expanded: boolean;
  onMore: () => void;
}) {
  const base = archive.record.usdPrice;
  const points = [0.98, 1.04, 1.02, 1.09, 1.06, 1.12, 1.1, 1.14, 1.18].map((factor, index) => {
    const x = 42 + index * 56;
    const value = base * factor;
    const y = 212 - Math.min(160, Math.max(34, (value / Math.max(base * 1.35, 1)) * 170));
    return [x, y] as const;
  });
  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");

  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold text-textMuted">折算美元价（USD / {archive.record.unit}）</span>
        <button
          className="inline-flex items-center gap-1 text-[12px] font-extrabold text-primary"
          type="button"
          onClick={onMore}
          aria-expanded={expanded}
        >
          {expanded ? "收起详情" : "更多趋势"} <ChevronRight className={cn("size-4 transition", expanded && "rotate-90")} />
        </button>
      </div>
      <svg viewBox="0 0 540 245" className="h-[236px] w-full">
        {[38, 82, 126, 170, 214].map((y, index) => (
          <g key={y}>
            <line x1="42" x2="520" y1={y} y2={y} stroke="#E5EAF3" strokeDasharray="4 5" />
            <text x="0" y={y + 4} fill="#64748B" fontSize="12" fontWeight="700">
              {["高位", "P75", "均值", "P25", "低位"][index]}
            </text>
          </g>
        ))}
        <path d={`${path} L490 214 L42 214 Z`} fill="url(#trendArea)" opacity="0.16" />
        <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#2F6BFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="white" stroke="#2F6BFF" strokeWidth="3" />
        ))}
        <foreignObject x="318" y="54" width="166" height="92">
          <div className="rounded-lg border border-borderSoft bg-white/95 p-3 text-[12px] font-bold text-textSecondary shadow-card">
            <p className="mb-1 text-textMuted">{archive.quoteDate}</p>
            <p>当前价：{archive.usdPrice}</p>
            <p className="mt-1 text-success">AI判断：{archive.riskLevel === "low" ? "价格稳定" : "需要复核"}</p>
            <p className="mt-1 text-primary">可信度：{archive.confidence}%</p>
          </div>
        </foreignObject>
        <defs>
          <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#2F6BFF" />
            <stop offset="1" stopColor="#2F6BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {["02-15", "03-18", "04-21", "05-01", "05-20", "06-19"].map((label, index) => (
          <text key={label} x={42 + index * 88} y="238" fill="#64748B" fontSize="12" fontWeight="700">
            {label}
          </text>
        ))}
      </svg>
      {expanded ? (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-borderSoft pt-3">
          {[
            ["12个月变化", "+18.0%", "较年初温和上行"],
            ["同规格偏差", archive.riskLevel === "low" ? "+2.4%" : "+12.6%", "对比同规格有效样本"],
            ["样本覆盖", `${archive.quoteCount} 次`, "历史报价与成交记录"],
          ].map(([label, value, description]) => (
            <div key={label} className="rounded-lg border border-borderSoft bg-[var(--color-bg-muted)] px-3 py-2">
              <p className="text-[11px] font-semibold text-textMuted">{label}</p>
              <p className="mt-1 text-[18px] font-extrabold text-primary">{value}</p>
              <p className="mt-0.5 text-[10px] font-medium text-textMuted">{description}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatEvidenceSize(value: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function EvidenceChain({
  archive,
  evidence,
  onUpload,
  onManage,
  mutable,
}: {
  archive: EquipmentArchive;
  evidence: EquipmentEvidenceInput[] | null;
  onUpload: () => void;
  onManage: (evidence: EquipmentEvidenceInput) => void;
  mutable: boolean;
}) {
  const items = evidence ?? [];

  return (
    <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id ?? item.path}
          className="relative min-w-0 rounded-[12px] border border-borderSoft bg-white p-3 text-left shadow-sm transition hover:border-primary"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft text-primary">
              <FileText className="size-6" />
            </span>
            <span className="rounded-md bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning">
              {item.verificationStatus === "verified" ? "已核验" : "待核验"}
            </span>
          </div>
          <button type="button" onClick={() => onManage(item)} className="mt-3 block w-full min-w-0 text-left">
            <p className="truncate text-[12px] font-extrabold text-textMain" title={item.name}>{item.name}</p>
            <p className="mt-1 truncate text-[11px] font-semibold text-textMuted">
              {evidenceTypeLabels[item.evidenceType] ?? "其他证据"} · {formatEvidenceSize(item.size)}
            </p>
            <p className="mt-1 truncate text-[10px] text-textMuted">
              {item.documentDate ? `单据日期 ${item.documentDate}` : "单据日期待补充"}
            </p>
          </button>
          {item.id ? (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-borderSoft pt-2">
              <a href={`/api/equipment-prices/${encodeURIComponent(archive.id)}/evidence/${encodeURIComponent(item.id)}?mode=preview`} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-primary-soft text-[10px] font-bold text-primary">
                <FileCheck2 className="size-3" /> 预览
              </a>
              <a href={`/api/equipment-prices/${encodeURIComponent(archive.id)}/evidence/${encodeURIComponent(item.id)}?mode=download`} className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-borderSoft text-[10px] font-bold text-textSecondary">
                <Download className="size-3" /> 下载
              </a>
            </div>
          ) : null}
        </div>
      ))}
      {evidence === null ? (
        <div className="flex min-h-[128px] flex-col items-center justify-center rounded-[12px] border border-dashed border-warning/40 bg-warning-soft/40 px-4 text-center text-warning">
          <FileCheck2 className="size-8" />
          <span className="mt-2 text-[12px] font-extrabold">真实证据暂未加载</span>
          <span className="mt-1 text-[10px] font-semibold text-textMuted">刷新页面后重试，不展示 Mock 文件</span>
        </div>
      ) : null}
      {evidence?.length === 0 ? (
        <div className="flex min-h-[128px] flex-col items-center justify-center rounded-[12px] border border-dashed border-borderSoft bg-slate-50 px-4 text-center text-textMuted">
          <FileText className="size-8" />
          <span className="mt-2 text-[12px] font-extrabold text-textMain">尚未关联真实证据</span>
          <span className="mt-1 text-[10px] font-semibold">上传后将写入私有 Storage 并进入审核证据链</span>
        </div>
      ) : null}
      <button type="button" onClick={onUpload} disabled={!mutable} title={mutable ? "上传新证据" : "当前审核状态下证据链已冻结"} className="flex min-h-[128px] flex-col items-center justify-center rounded-[12px] border border-dashed border-primary bg-primary-soft/70 text-primary disabled:cursor-not-allowed disabled:border-borderSoft disabled:bg-slate-50 disabled:text-textMuted">
        <Upload className="size-8" />
        <span className="mt-2 text-[13px] font-extrabold">{mutable ? "上传新证据" : "证据链已冻结"}</span>
        <span className="mt-1 text-[11px] font-semibold text-textMuted">{mutable ? "写入私有 Supabase Storage" : "退回补正或创建新版本后可变更"}</span>
      </button>
    </div>
  );
}

function AiJudgementPanel({ archive, onAction }: { archive: EquipmentArchive; onAction: (label: string) => void }) {
  return (
    <SectionCard
      id="ai-judgement"
      title="AI 价格判断"
      subtitle="AI结果仅作辅助，需保留人工复核"
      icon={Sparkles}
      tone="purple"
      action={<AiBadge label="AI判断" />}
    >
      <div className="space-y-3 p-4">
        <div className="rounded-[14px] border border-ai-border bg-gradient-to-br from-ai-soft to-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-ai">综合判断置信度</p>
              <p className="mt-1 text-[28px] font-extrabold text-ai">{archive.confidence}%</p>
            </div>
            <div className="relative flex size-20 items-center justify-center rounded-full bg-[conic-gradient(#7C3AED_0_92%,#EDE9FE_92%_100%)]">
              <span className="absolute size-14 rounded-full bg-white" />
              <span className="relative text-[18px] font-extrabold text-ai">{archive.confidenceLevel}</span>
            </div>
          </div>
          <p className="mt-3 text-[12px] font-semibold leading-5 text-textSecondary">{archive.aiSummary}</p>
        </div>

        {getAiJudgements(archive).map((item) => {
          const tone = toneClass[item.tone];
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onAction(item.action)}
              className={cn("w-full rounded-[12px] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-card", tone.border, tone.soft)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={cn("text-[12px] font-extrabold", tone.text)}>{item.title}</span>
                <span className={cn("text-[18px] font-extrabold", tone.text)}>{item.value}</span>
              </div>
              <p className="mt-2 text-[12px] font-semibold leading-5 text-textSecondary">{item.desc}</p>
              <span className={cn("mt-2 inline-flex items-center gap-1 text-[12px] font-extrabold", tone.text)}>
                {item.action} <ArrowRight className="size-3.5" />
              </span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

function RiskHandlingPanel({ archive, onAction }: { archive: EquipmentArchive; onAction: (label: string) => void }) {
  return (
    <SectionCard title="风险处理" subtitle="风险必须进入人工确认流程" icon={ShieldAlert} tone="orange">
      <div className="space-y-3 p-4">
        {getRiskActions(archive).map((risk) => {
          const tone = toneClass[risk.tone];
          return (
            <div key={risk.type} className={cn("rounded-[12px] border p-3", tone.border, tone.soft)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", risk.tone === "green" ? "bg-success" : risk.tone === "red" ? "bg-danger" : "bg-warning")} />
                  <p className="text-[13px] font-extrabold text-textMain">{risk.type}</p>
                </div>
                <RiskBadge level={risk.level as EquipmentPriceRecord["riskLevel"]} className="h-5 text-[11px]" />
              </div>
              <p className="mt-2 text-[12px] font-semibold leading-5 text-textSecondary">{risk.desc}</p>
              <button
                type="button"
                onClick={() => onAction(risk.action)}
                className={cn("mt-3 inline-flex h-7 items-center rounded-md border bg-white px-3 text-[12px] font-extrabold", tone.border, tone.text)}
              >
                {risk.action}
              </button>
            </div>
          );
        })}
        <Link href={`/inquiries/create?equipmentIds=${archive.id}`} className="flex h-9 items-center justify-center rounded-md bg-ai text-[13px] font-extrabold text-white shadow-[0_12px_28px_rgba(126,58,242,0.22)]">
          生成询价任务
        </Link>
      </div>
    </SectionCard>
  );
}

function HistoryTable({ archive, selectedVersion, onView }: { archive: EquipmentArchive; selectedVersion: string | null; onView: (version: string) => void }) {
  const rows = getPriceHistory(archive);
  const selectedRow = rows.find((row) => row.version === selectedVersion);
  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12px]">
        <thead className="bg-[var(--color-bg-muted)] text-textSecondary">
          <tr>
            {["版本", "报价日期", "原始价格", "数量", "报价单位", "审核状态", "可信度", "风险", "操作"].map((header) => (
              <th key={header} className="h-9 px-3 text-left font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borderSoft">
          {rows.map((row) => (
            <tr key={row.version} className={cn("hover:bg-primary-soft/30", selectedVersion === row.version && "bg-primary-soft/60")}>
              <td className="h-10 px-3 font-semibold text-textSecondary">{row.version}</td>
              <td className="h-10 px-3 font-semibold text-textSecondary">{row.date}</td>
              <td className="h-10 px-3 font-extrabold text-textMain">{row.price}</td>
              <td className="h-10 px-3 font-semibold text-textSecondary">{row.quantity}</td>
              <td className="h-10 px-3 font-semibold text-textSecondary">{row.supplier}</td>
              <td className="h-10 px-3"><StatusBadge status={row.reviewStatus} className="h-5 text-[11px]" /></td>
              <td className="h-10 px-3 font-semibold text-textSecondary">{row.confidence}</td>
              <td className="h-10 px-3"><RiskBadge level={row.riskLevel as EquipmentPriceRecord["riskLevel"]} className="h-5 text-[11px]" /></td>
              <td className="h-10 px-3">
                <button className="text-[12px] font-bold text-primary" type="button" onClick={() => onView(row.version)}>
                  查看
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {selectedRow ? (
        <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg border border-primary/20 bg-primary-soft/50 p-3 text-[11px]">
          <div><span className="text-textMuted">所选版本</span><p className="mt-1 font-bold text-primary">{selectedRow.version}</p></div>
          <div><span className="text-textMuted">报价日期</span><p className="mt-1 font-bold text-textMain">{selectedRow.date}</p></div>
          <div><span className="text-textMuted">报价单位</span><p className="mt-1 truncate font-bold text-textMain" title={selectedRow.supplier}>{selectedRow.supplier}</p></div>
          <div><span className="text-textMuted">版本结论</span><p className="mt-1 font-bold text-textMain">{selectedRow.reviewStatus === "confirmed" ? "已确认，可追溯" : "待人工复核"}</p></div>
        </div>
      ) : null}
    </div>
  );
}

function EquipmentPriceDetailContent({ routeId }: { routeId: string }) {
  const router = useRouter();
  const toast = useMockToast();
  const aiAction = useMockAiAction("设备价格AI判断");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeView, setActiveView] = useState("主视图");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [trendExpanded, setTrendExpanded] = useState(false);
  const [persistedEvidence, setPersistedEvidence] =
    useState<EquipmentEvidenceInput[] | null>(null);
  const [selectedEvidence, setSelectedEvidence] =
    useState<EquipmentEvidenceInput | null>(null);
  const [reviewTaskStatus, setReviewTaskStatus] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState("");
  const [persistedRecord, setPersistedRecord] = useState<EquipmentPriceRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(true);
  const [recordError, setRecordError] = useState("");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setRecordLoading(true);
      setRecordError("");
    });
    fetch(`/api/equipment-prices/${encodeURIComponent(routeId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: EquipmentPriceEditData;
          error?: string;
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "设备价格档案读取失败");
        }
        return payload.data;
      })
      .then((data) => {
        if (!active) return;
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
        setPersistedRecord({
          id: data.id,
          equipmentCode: data.priceCode,
          equipmentName: data.equipmentName,
          brand: data.brand,
          specification: data.model,
          category: data.category,
          originalPrice: data.originalPrice,
          usdPrice: data.usdPrice,
          currency: data.originalCurrency as EquipmentPriceRecord["currency"],
          unit: data.unit,
          priceCondition: (data.priceTerm || "SITE") as EquipmentPriceRecord["priceCondition"],
          supplier: data.supplierName,
          priceSource: data.sourceUrl || data.sourceType,
          sourceType: (data.sourceType || "报价单") as EquipmentPriceRecord["sourceType"],
          confidence,
          riskLevel: data.riskLevel,
          reviewStatus:
            data.reviewStatus === "approved"
              ? "confirmed"
              : data.reviewStatus === "rejected"
                ? "rejected"
                : data.reviewStatus === "archived"
                  ? "voided"
                  : "pending",
          updatedAt: data.updatedAt.slice(0, 10),
          aiRecommended: Boolean(data.aiRecommendation),
          aiSuggestion: data.aiRecommendation || data.aiJudgment,
        });
        setPersistedEvidence(data.evidence);
        setReviewTaskStatus(data.reviewTaskStatus ?? "");
      })
      .catch((error) => {
        if (!active) return;
        setPersistedRecord(null);
        setRecordError(error instanceof Error ? error.message : "设备价格档案读取失败");
      })
      .finally(() => {
        if (active) setRecordLoading(false);
      });
    return () => {
      active = false;
    };
  }, [routeId]);

  const record = persistedRecord ?? findEquipmentRecord(routeId);
  const baseArchive = useMemo(() => buildArchive(record), [record]);
  const [reviewStatus, setReviewStatus] = useState<EquipmentPriceRecord["reviewStatus"]>(baseArchive.reviewStatus);
  const [evidenceCount, setEvidenceCount] = useState(baseArchive.evidenceCount);
  const archive = useMemo(
    () => ({ ...baseArchive, reviewStatus, evidenceCount, record: { ...baseArchive.record, reviewStatus } }),
    [baseArchive, evidenceCount, reviewStatus],
  );
  const actionLink = useMemo(() => `/equipment-prices/ai-recommendation?equipmentId=${archive.id}`, [archive.id]);

  const loadPersistedDetail = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/equipment-prices/${encodeURIComponent(routeId)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        data?: EquipmentPriceEditData;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "读取设备价格详情失败");
      }
      setReviewStatus(
        payload.data.reviewStatus === "approved"
          ? "confirmed"
          : payload.data.reviewStatus === "rejected"
            ? "rejected"
            : payload.data.reviewStatus === "archived"
              ? "voided"
              : "pending"
      );
      setPersistedEvidence(payload.data.evidence);
      setEvidenceCount(payload.data.evidence.length);
      setReviewTaskStatus(payload.data.reviewTaskStatus ?? "");
    } catch {
      setPersistedEvidence(null);
    }
  }, [routeId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadPersistedDetail();
    }, 0);
    const refresh = () => void loadPersistedDetail();
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", refresh);
    };
  }, [loadPersistedDetail]);

  const handleAiRun = () => {
    aiAction.run(`${archive.name} AI价格判断`);
  };

  const evidenceMutable =
    !reviewTaskStatus || reviewTaskStatus === "need_info";

  const persistWorkflowAction = async (
    action:
      | "request_review"
      | "record_confirmation"
      | "adopt_ai_recommendation"
      | "complete_parameters",
    successTitle: string,
    successDescription: string
  ) => {
    if (workflowLoading) return;
    setWorkflowLoading(action);
    try {
      const response = await fetch(
        `/api/equipment-prices/${encodeURIComponent(routeId)}/workflow`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "工作流状态写入失败");
      setReviewStatus("pending");
      await loadPersistedDetail();
      toast.success(successTitle, successDescription);
    } catch (error) {
      toast.danger(
        "操作失败",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setWorkflowLoading("");
    }
  };

  const handleDecisionAction = (label: string) => {
    if (label === "查看AI理由") {
      handleAiRun();
      return;
    }
    if (label === "查看相似价格") {
      router.push(
        `/equipment-prices/ai-recommendation?equipmentId=${encodeURIComponent(archive.id)}#similar-prices`
      );
      return;
    }
    if (label.includes("复核")) {
      void persistWorkflowAction(
        "request_review",
        "已进入人工复核",
        `${archive.name} 已写入设备价格审核队列，AI结果不会直接生效。`
      );
      return;
    }
    if (label.includes("确认")) {
      void persistWorkflowAction(
        "record_confirmation",
        "业务确认已记录",
        `${archive.name} 的确认记录已持久化，等待审核人终审。`
      );
      return;
    }
    if (label === "查看证据链") {
      router.push(`/attachments?relatedObject=${encodeURIComponent(archive.code)}`);
      return;
    }
    if (label.includes("证据") || label.includes("资料")) {
      setUploadOpen(true);
      return;
    }
    if (label.includes("补全参数")) {
      router.push(
        `/equipment-prices/${encodeURIComponent(archive.id)}/edit?focus=technical-parameters`
      );
      return;
    }
    toast.info("操作已定位", `${archive.name}：${label}`);
  };

  const handleSummarySelect = (label: string) => {
    const sectionMap: Record<string, string> = {
      设备名称: "equipment-visual",
      规格型号: "technical-parameters",
      当前价格: "price-trend",
      价格可信度: "ai-judgement",
      审核状态: "review-history",
      报价次数: "price-history",
    };
    const sectionId = sectionMap[label];
    const target = sectionId ? document.getElementById(sectionId) : null;
    if (!target) {
      toast.warning("暂未找到对应模块", `${label}模块当前不可定位。`);
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus({ preventScroll: true });
    toast.info(`${label}已定位`, `已跳转到 ${archive.name} 的对应档案模块。`);
  };

  if (recordLoading) {
    return (
      <AppLayout>
        <div className="space-y-3" data-no-global-interaction>
          <div className="h-24 animate-pulse rounded-card border border-borderSoft bg-white shadow-card" />
          <div className="grid gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-card border border-borderSoft bg-white shadow-card" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (recordError || !persistedRecord) {
    return (
      <AppLayout>
        <div className="rounded-card border border-danger/20 bg-white p-8 text-center shadow-card" data-no-global-interaction>
          <ShieldAlert className="mx-auto size-9 text-danger" />
          <h1 className="mt-3 text-[18px] font-bold text-textMain">设备价格档案无法打开</h1>
          <p className="mt-2 text-[13px] text-textMuted">{recordError || "记录不存在或已作废"}</p>
          <button type="button" onClick={() => router.push("/equipment-prices")} className="mt-5 h-9 rounded-md bg-primary px-4 text-[13px] font-semibold text-white">
            返回设备价格库
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-3 overflow-x-clip" data-no-global-interaction>
        <div className="flex min-w-0 flex-col gap-4 rounded-[14px] border border-borderSoft bg-white px-4 py-3 shadow-card xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <button type="button" onClick={() => router.push("/equipment-prices")} className="mb-2 inline-flex items-center gap-1 text-[12px] font-bold text-primary">
              <ArrowLeft className="size-4" />
              返回设备价格库
            </button>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="text-[22px] font-extrabold text-textMain">{archive.name} 价格档案（AI价格判断）</h1>
              <StatusBadge status={archive.reviewStatus} />
              <AiBadge label="AI辅助判断" />
            </div>
            <p className="mt-1 text-[12px] font-medium text-textMuted">
              {archive.code} · {archive.model} · {archive.supplier} · 价格证据链、AI判断、风险处理与人工复核记录
            </p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2 xl:justify-end">
            <Link href={`/equipment-prices/${encodeURIComponent(archive.id)}/edit`} className="inline-flex h-9 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary">
              <PenLine className="size-4" />
              编辑价格
            </Link>
            <button type="button" onClick={() => setUploadOpen(true)} disabled={!evidenceMutable} title={evidenceMutable ? "上传设备价格证据" : "当前审核状态下证据链已冻结"} className="inline-flex h-9 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-textMuted">
              <Upload className="size-4" />
              上传证据
            </button>
            <button type="button" onClick={handleAiRun} className="inline-flex h-9 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-bold text-ai">
              <Sparkles className="size-4" />
              {aiAction.status === "running" ? "AI分析中..." : "AI重新判断"}
            </button>
            <Link href={actionLink} className="inline-flex h-9 items-center gap-1 rounded-md bg-ai px-3 text-[12px] font-bold text-white shadow-[0_12px_28px_rgba(126,58,242,0.22)]">
              <Bot className="size-4" />
              AI推荐与询价
            </Link>
            <Link
              href={`/equipment-prices/reviews?priceId=${encodeURIComponent(archive.id)}`}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-warning/25 bg-warning-soft px-3 text-[12px] font-bold text-warning"
            >
              <ClipboardCheck className="size-4" />
              进入价格审核
            </Link>
          </div>
        </div>

        <div className="min-w-0">
          <TopSummaryCards
            archive={archive}
            onSelect={handleSummarySelect}
          />
        </div>

        <div className="grid min-w-0 items-start gap-3 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 space-y-3">
            <div className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-4">
              <SectionCard id="equipment-visual" title="设备外观" subtitle="按设备类型展示占位图" icon={PackageCheck} tone="blue">
                <EquipmentVisual
                  archive={archive}
                  activeView={activeView}
                  onViewChange={(view) => {
                    setActiveView(view);
                    toast.info(`已切换至${view}`, `${archive.name} 当前展示 ${view} mock 预览。`);
                  }}
                />
              </SectionCard>
              <SectionCard id="technical-parameters" title="技术参数" subtitle="核心选型参数" icon={Wrench} tone="green">
                <KeyValueTable rows={getTechParams(archive)} />
              </SectionCard>
              <SectionCard title="报价信息" subtitle="价格条件与报价来源" icon={FileCheck2} tone="orange">
                <KeyValueTable rows={getQuoteInfo(archive)} />
              </SectionCard>
              <SectionCard title="供应商信息" subtitle="报价主体与证据来源" icon={BadgeCheck} tone="cyan">
                <SupplierInfo archive={archive} />
              </SectionCard>
            </div>

            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
              <SectionCard id="price-trend" title="价格趋势（近12个月）" subtitle="价格波动与当前价位置" icon={LineChart} tone="blue">
                <TrendChart
                  archive={archive}
                  expanded={trendExpanded}
                  onMore={() => setTrendExpanded((current) => !current)}
                />
              </SectionCard>
              <SectionCard
                title="价格证据链"
                subtitle={`共 ${archive.evidenceCount} 份，当前展示 6 份`}
                icon={FileText}
                tone="purple"
                action={
                  <Link href={`/attachments?relatedObject=${archive.code}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-primary">
                    查看证据库 <ChevronRight className="size-3.5" />
                  </Link>
                }
              >
                <EvidenceChain
                  archive={archive}
                  evidence={persistedEvidence}
                  onUpload={() => setUploadOpen(true)}
                  onManage={setSelectedEvidence}
                  mutable={evidenceMutable}
                />
              </SectionCard>
            </div>

            <SectionCard id="price-history" title="历史价格版本" subtitle="价格、证据、审核与风险变化记录" icon={History} tone="slate">
              <HistoryTable
                archive={archive}
                selectedVersion={selectedVersion}
                onView={(version) => {
                  setSelectedVersion(version);
                  toast.info(`历史版本 ${version}`, `${archive.name} 的 ${version} 价格、证据与审核记录已定位。`);
                }}
              />
            </SectionCard>
          </main>

          <aside className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:block 2xl:space-y-3">
            <AiJudgementPanel archive={archive} onAction={handleDecisionAction} />
            <RiskHandlingPanel archive={archive} onAction={handleDecisionAction} />
            <SectionCard id="review-history" title="人工复核记录" subtitle="AI不得替代最终商务判断" icon={Clock3} tone="slate">
              <div className="space-y-3 p-4">
                {[
                  [`${archive.quoteDate} 10:32`, `商务预算组确认 ${archive.name} 报价证据完整度 ${archive.confidence}%`],
                  [`${archive.quoteDate} 11:08`, `AI标记 ${archive.supplier} 报价来源为 ${archive.record.sourceType}`],
                  [`${archive.quoteDate} 14:20`, `${archive.reviewStatus === "confirmed" ? "已允许进入项目套价" : "等待人工复核后再入库"}`],
                ].map(([time, text]) => (
                  <div key={time} className="flex gap-3">
                    <span className="mt-1 size-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-[12px] font-bold text-textMain">{text}</p>
                      <p className="mt-1 text-[11px] font-semibold text-textMuted">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </aside>
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-borderSoft bg-white px-4 py-3 shadow-card xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 break-words text-[12px] font-semibold text-textMuted">
            当前档案已关联独立 Supabase 价格库：{archive.code} / {archive.name} / {archive.supplier}
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2 xl:justify-end">
            <Link
              href={`/equipment-prices/reviews?priceId=${encodeURIComponent(archive.id)}`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-warning/25 bg-warning-soft px-5 text-[13px] font-bold text-warning"
            >
              <ClipboardCheck className="size-4" />
              人工复核
            </Link>
            <Link href={`/inquiries/create?equipmentIds=${archive.id}`} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-[13px] font-bold text-white">
              <ArrowRight className="size-4" />
              创建询价任务
            </Link>
            <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-borderSoft bg-white px-5 text-[13px] font-bold text-textSecondary">
              <Download className="size-4" />
              导出价格档案
            </button>
          </div>
        </div>
      </div>

      <EquipmentEvidenceUploadDialog
        open={uploadOpen}
        equipmentPriceId={routeId}
        onClose={() => setUploadOpen(false)}
        onUploaded={(evidence) => {
          setPersistedEvidence((current) => [...(current ?? []), evidence]);
          setEvidenceCount((count) => count + 1);
        }}
      />
      <EquipmentEvidenceManagerDialog
        open={Boolean(selectedEvidence)}
        equipmentPriceId={archive.id}
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        onChanged={(nextEvidence) => {
          setPersistedEvidence((current) =>
            current?.map((item) =>
              item.id === nextEvidence.id ? nextEvidence : item
            ) ?? current
          );
          setSelectedEvidence(nextEvidence);
        }}
        onArchived={(id) => {
          setPersistedEvidence((current) =>
            current?.filter((item) => item.id !== id) ?? current
          );
          setEvidenceCount((count) => Math.max(0, count - 1));
          setSelectedEvidence(null);
        }}
      />
      <MockExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(format) => {
          setExportOpen(false);
          toast.success("已创建导出任务", `${archive.name} 价格档案将以 ${format} 格式模拟导出。`);
        }}
      />
    </AppLayout>
  );
}

export default function EquipmentPriceDetailPage() {
  const params = useParams<{ id: string }>();
  const routeId = getRouteId(params?.id);

  return <EquipmentPriceDetailContent key={routeId} routeId={routeId} />;
}
