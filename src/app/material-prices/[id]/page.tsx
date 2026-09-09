import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Edit3,
  FileText,
  LineChart,
  MapPinned,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
  Workflow,
} from "lucide-react";

import { AiBadge, ConfidenceBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { ModuleHeader } from "@/components/common";
import { materialPriceRecords, type MaterialPriceRecord } from "@/data/mock/materialPrices";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { getCurrentAccess } from "@/lib/auth/authorization";
import {
  mapMaterialPriceRow,
  type MaterialPriceDatabaseRow,
} from "@/lib/data/priceInquiryMapper";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

const detail = {
  materialCode: "",
  materialName: "未命名地材",
  category: "未记录",
  specification: "未记录",
  unit: "项",
  materialGrade: "未记录",
  standard: "未记录",
  process: "未记录",
  scope: "未记录",
  confidence: "未评估",
  reviewStatus: "待审核",
  riskLevel: "中风险",
  originalPrice: "未记录",
  usdPrice: "未记录",
  currency: "未记录",
  exchangeRate: "未记录",
  quoteDate: "未记录",
  validUntil: "未记录",
  transportCondition: "未记录",
  destination: "未记录",
  supplier: "未记录",
  sourceType: "未记录",
  quoteOwner: "未记录",
  quoteMethod: "未记录",
  project: "未关联项目",
  inputBy: "未记录",
  updatedAt: "未记录",
};

type MaterialDetail = typeof detail;

function recordedConfidence(record: MaterialPriceRecord) {
  const score = record.confidenceScore;
  return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100 ? `${score}%` : "未评估";
}

const reviewStatusLabelMap: Record<MaterialPriceRecord["reviewStatus"], string> = {
  pending: "待审核",
  need_info: "需补充资料",
  confirmed: "已审核",
  rejected: "已驳回",
  voided: "已作废",
};

const riskLevelLabelMap: Record<MaterialPriceRecord["riskLevel"], string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: value >= 100 ? 2 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildMaterialDetail(record: MaterialPriceRecord): MaterialDetail {
  const confidence = recordedConfidence(record);
  const value = (key: string) => {
    const raw = record[key];
    return typeof raw === "string" && raw.trim() ? raw.trim() : "";
  };
  const numeric = (key: string) => {
    const raw = Number(record[key]);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  };
  const exchangeRate = numeric("exchangeRate");
  const usdPrice = record.usdPrice !== null && record.usdPrice >= 0 ? formatMoney(record.usdPrice, "USD") : "未记录";
  const specification = record.specification || "未记录";

  return {
    ...detail,
    materialCode: record.materialCode,
    materialName: specification === "未记录" ? record.materialName : `${record.materialName}（${specification}）`,
    category: record.category || "未记录",
    specification,
    unit: record.unit,
    materialGrade: value("materialGrade") || "未记录",
    standard: value("standard") || "未记录",
    process: value("process") || "未记录",
    scope: value("scope") || "未记录",
    confidence,
    reviewStatus: reviewStatusLabelMap[record.reviewStatus],
    riskLevel: riskLevelLabelMap[record.riskLevel],
    originalPrice: formatMoney(record.originalPrice, record.currency),
    usdPrice,
    currency: record.currency,
    exchangeRate: exchangeRate ? `1 ${record.currency} = ${exchangeRate.toLocaleString("zh-CN", { maximumFractionDigits: 8 })} CNY` : "未记录",
    quoteDate: record.quoteDate || "未记录",
    validUntil: record.validUntil || "未记录",
    transportCondition: record.transportCondition || "未记录",
    destination: record.region || "未记录",
    supplier: record.supplierName || "未记录",
    sourceType: record.source || "未记录",
    quoteOwner: value("quoteOwner") || "未记录",
    quoteMethod: value("quoteMethod") || (record.source.includes("AI") ? "AI采集" : "人工录入"),
    project: value("project") || "未关联项目",
    inputBy: record.source || "未记录",
    updatedAt: value("updatedAt") || record.quoteDate || "未记录",
  };
}

function normalizeMaterialLookup(value: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();

  return decoded
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\w\u4e00-\u9fa5.-]+/g, "");
}

function findMaterialRecord(id: string) {
  const lookup = normalizeMaterialLookup(id);

  if (!lookup) return null;

  return (
    materialPriceRecords.find((item) => {
      const candidates = [
        item.id,
        item.materialCode,
        item.materialName,
        item.specification,
        `${item.materialName}-${item.specification}`,
      ].map(normalizeMaterialLookup);

      return candidates.some((candidate) => candidate === lookup || candidate.includes(lookup) || lookup.includes(candidate));
    }) ?? null
  );
}

type DetailStatCard = {
  label: string;
  value: string;
  unit: string;
  icon: typeof LineChart;
  tone: keyof typeof toneMap;
  note: string;
};

function getStatCards(material: MaterialDetail): DetailStatCard[] {
  return [
    { label: "当前折算美元价", value: material.usdPrice.replace("USD ", ""), unit: `USD / ${material.unit}`, icon: LineChart, tone: "purple", note: material.usdPrice === "未记录" ? "尚未形成美元标准价" : "已保存标准化价格" },
    { label: "原始报价", value: material.originalPrice, unit: `${material.currency} / ${material.unit}`, icon: WalletCards, tone: "blue", note: "供应商原始报价" },
    { label: "币种 / 汇率", value: material.currency, unit: material.exchangeRate, icon: Database, tone: "cyan", note: "按报价日汇率折算" },
    { label: "报价日期", value: material.quoteDate, unit: material.validUntil === "未记录" ? "有效期未记录" : `有效至 ${material.validUntil}`, icon: CalendarDays, tone: "blue", note: "价格所属期" },
    { label: "运输条件", value: material.transportCondition, unit: material.destination, icon: PackageSearch, tone: "green", note: "到场条件" },
    { label: "数据来源", value: material.sourceType, unit: material.inputBy, icon: ShieldCheck, tone: "orange", note: "保留报价依据" },
  ];
}

const toneMap = {
  blue: "from-[#2F6BFF] to-[#0EA5E9] text-primary",
  cyan: "from-[#14B8A6] to-[#38BDF8] text-cyan",
  green: "from-[#22C55E] to-[#10B981] text-success",
  orange: "from-[#F59E0B] to-[#F97316] text-warning",
  purple: "from-[#8B5CF6] to-[#6D5DFB] text-ai",
} as const;

function getBaseInfo(material: MaterialDetail) {
  return [
    ["材料编号", material.materialCode],
    ["材料名称", material.materialName.replace(/（.*）$/, "")],
    ["材料类别", material.category],
    ["规格型号", material.specification],
    ["计量单位", material.unit],
    ["材料材质", material.materialGrade],
    ["执行标准", material.standard],
    ["生产工艺", material.process],
    ["适用范围", material.scope],
    ["记录可信度", material.confidence],
  ];
}

function getSourceInfo(material: MaterialDetail) {
  return [
    ["原始价格", `${material.originalPrice} / ${material.unit}`],
    ["折算美元价", `${material.usdPrice} / ${material.unit}`],
    ["币种", material.currency],
    ["汇率", material.exchangeRate],
    ["报价日期", material.quoteDate],
    ["有效期", material.validUntil],
    ["运输条件", material.transportCondition],
    ["目的地", material.destination],
    ["供应商", material.supplier],
    ["来源类型", material.sourceType],
    ["报价人", material.quoteOwner],
    ["报价方式", material.quoteMethod],
    ["关联项目", material.project],
    ["审核状态", material.reviewStatus],
    ["录入人", material.inputBy],
    ["更新时间", material.updatedAt],
  ];
}

type MaterialHistoryRow = {
  id: string;
  quoteDate: string;
  originalPrice: string;
  usdPrice: string;
  transportCondition: string;
  source: string;
  reviewStatus: string;
  confidence: string;
};

type MaterialEvidenceItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  external?: boolean;
};

type MaterialInsightItem = {
  title: string;
  desc: string;
  action: string;
  tone: "purple" | "orange" | "green";
};

type MaterialRiskItem = {
  title: string;
  desc: string;
  level: "low" | "medium" | "high" | "critical";
};

const actions = [
  ["发起询价任务", "向 3 家供应商发起补充询价"],
  ["补充市场调研", "扩充同地区同规格报价"],
  ["生成价格说明", "生成该条价格依据报告"],
  ["加入项目套价", "选择项目并加入套价清单"],
];


function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  icon = Sparkles,
  tone = "purple",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: typeof Sparkles;
  tone?: "blue" | "cyan" | "purple" | "orange" | "red" | "green" | "slate";
}) {
  return (
    <section className={cn("overflow-hidden rounded-[10px] border border-borderSoft bg-white shadow-card", className)}>
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader icon={icon} title={title} subtitle={subtitle} tone={tone} action={action} density="compact" headingLevel={3} />
      </div>
      {children}
    </section>
  );
}

function TopStats({ cards }: { cards: readonly DetailStatCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {cards.map((item) => {
        const Icon = item.icon;
        const tone = toneMap[item.tone];

        return (
          <section key={item.label} className="rounded-[10px] border border-borderSoft bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-extrabold text-textSecondary">{item.label}</span>
              <span className={cn("flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br text-white shadow-lg", tone.split(" text-")[0])}>
                <Icon className="size-5" strokeWidth={2.3} />
              </span>
            </div>
            <div className={cn("text-[18px] font-extrabold", tone.split(" ").at(-1))}>{item.value}</div>
            <div className="mt-1 text-[11px] font-semibold text-textMuted">{item.unit}</div>
          </section>
        );
      })}
    </div>
  );
}

function InfoGrid({ rows, columns = 5 }: { rows: string[][]; columns?: 4 | 5 }) {
  return (
    <div className={cn("grid grid-cols-2 border-t border-borderSoft lg:grid-cols-4", columns === 5 && "2xl:grid-cols-5")}>
      {rows.map(([label, value]) => {
        const completeness = Math.min(Math.max(Number.parseInt(value, 10) || 0, 0), 100);

        return (
          <div key={label} className="min-h-[54px] min-w-0 border-b border-r border-borderSoft px-3 py-2 last:border-r-0">
            <p className="text-[11px] font-semibold text-textMuted">{label}</p>
            {label === "参数完整度" ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-ai-soft">
                    <div className="h-full rounded-full bg-ai" style={{ width: `${completeness}%` }} />
                  </div>
                  <span className="text-[11px] font-extrabold text-textMuted">{value}</span>
                </div>
              </div>
            ) : (
              <p className="mt-1 break-words text-[13px] font-extrabold text-textMain" title={value}>{value}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AiInsightPanel({ materialId, items }: { materialId: string; items: MaterialInsightItem[] }) {
  const insightLinks = [
    `/ai-price-collection?materialIds=${materialId}&source=material-detail-insight`,
    `/ai-price-collection?materialIds=${materialId}&source=material-detail-gap`,
    `/analytics?materialId=${materialId}&source=material-detail`,
    `/material-prices/manage?materialId=${materialId}&action=alternative`,
  ];

  return (
    <SectionCard title="AI 智能洞察" icon={Sparkles} tone="purple" action={<AiBadge label="AI洞察" icon="analysis" className="h-5 text-[11px]" />}>
      <div className="space-y-3 p-3">
        {items.map((item, index) => (
          <div key={item.title} className={cn("rounded-[10px] border p-3", item.tone === "orange" ? "border-warning/20 bg-warning-soft" : item.tone === "green" ? "border-success/20 bg-success-soft" : "border-ai-border bg-ai-soft")}>
            <div className="mb-1 flex items-center justify-between">
              <h4 className={cn("text-[12px] font-extrabold", item.tone === "orange" ? "text-warning" : item.tone === "green" ? "text-success" : "text-ai")}>{item.title}</h4>
              <Link href={insightLinks[index] ?? `/material-prices/manage?materialId=${materialId}`} className="text-[11px] font-bold text-primary hover:underline">
                {item.action}
              </Link>
            </div>
            <p className="text-[11px] font-medium leading-5 text-textSecondary">{item.desc}</p>
          </div>
        ))}
        {!items.length ? (
          <div className="rounded-[10px] bg-slate-50 p-4 text-center text-[11px] font-semibold text-textMuted">
            暂无可验证的智能洞察，请先补充价格证据或历史样本。
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function AnalysisCards({
  materialId,
  material,
  history,
  evidenceCount,
}: {
  materialId: string;
  material: MaterialDetail;
  history: MaterialHistoryRow[];
  evidenceCount: number;
}) {
  const usdReady = material.usdPrice !== "未记录";
  const enhancedCards = [
    {
      title: "证据完整性",
      eyebrow: "真实来源证据",
      value: evidenceCount ? "已关联" : "待补充",
      metric: `${evidenceCount} 份证据`,
      desc: evidenceCount ? "已关联可追溯附件或采集证据，仍需人工核对原文。" : "当前正式价格没有可展示证据，不能作为完整商务依据。",
      tone: evidenceCount ? "green" : "orange",
    },
    {
      title: "标准价格口径",
      eyebrow: `${material.currency} · ${material.quoteDate}`,
      value: material.usdPrice,
      metric: usdReady ? "美元折算已保存" : "美元折算待补充",
      desc: usdReady ? `当前汇率口径：${material.exchangeRate}。` : "仅保留原币价格，暂不能用于跨币种横向比较。",
      tone: usdReady ? "blue" : "orange",
    },
    {
      title: "历史样本覆盖",
      eyebrow: "同品名、同规格正式价格",
      value: `${history.length} 条`,
      metric: history.length >= 2 ? "可进行历史比较" : "样本不足",
      desc: history.length >= 2 ? "历史表仅使用组织内真实正式价格，不使用模拟趋势。" : "不足 2 条真实样本，不生成涨跌预测或均价结论。",
      tone: "purple",
    },
    {
      title: "人工商务判断",
      eyebrow: "AI 不替代最终确认",
      value: material.reviewStatus,
      metric: "保留人工复核",
      desc: "结合证据、价格所属期、交付条件和项目范围后再决定是否用于套价。",
      tone: "green",
    },
  ];

  return (
    <SectionCard title="AI 价格分析与建议" subtitle="地材价格智能估值、区域对比、趋势预测与采购动作建议" icon={Sparkles} tone="purple" action={<AiBadge label="AI建议" icon="suggestion" className="h-5 text-[11px]" />}>
      <div className="grid gap-3 p-3 md:grid-cols-2 2xl:grid-cols-4">
        {enhancedCards.map((item, index) => {
          const isGreen = item.tone === "green";
          const isBlue = item.tone === "blue";
          const isOrange = item.tone === "orange";

          return (
            <div
              key={item.title}
              className={cn(
                "relative overflow-hidden rounded-[14px] border p-4 shadow-sm",
                isGreen
                  ? "border-success/20 bg-gradient-to-br from-white via-success-soft to-white"
                  : isBlue
                    ? "border-primary/20 bg-gradient-to-br from-white via-primary-soft to-white"
                    : isOrange
                      ? "border-warning/25 bg-gradient-to-br from-white via-warning-soft to-white"
                      : "border-ai-border bg-gradient-to-br from-white via-ai-soft to-white",
              )}
            >
              <div className={cn("absolute -right-10 -top-10 size-28 rounded-full opacity-40", isGreen ? "bg-success-soft" : isBlue ? "bg-primary-soft" : isOrange ? "bg-warning-soft" : "bg-ai-soft")} />
              <div className="relative">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className={cn("text-[11px] font-extrabold", isGreen ? "text-success" : isBlue ? "text-primary" : isOrange ? "text-warning" : "text-ai")}>{item.eyebrow}</p>
                    <h4 className="mt-1 text-[14px] font-extrabold text-textMain">{item.title}</h4>
                  </div>
                  <span className={cn("flex size-9 items-center justify-center rounded-xl", isGreen ? "bg-success-soft text-success" : isBlue ? "bg-primary-soft text-primary" : isOrange ? "bg-warning-soft text-warning" : "bg-ai-soft text-ai")}>
                    {index === 0 ? <ShieldCheck className="size-5" /> : index === 1 ? <MapPinned className="size-5" /> : index === 2 ? <LineChart className="size-5" /> : <Workflow className="size-5" />}
                  </span>
                </div>
                <div className="mb-3">
                  <p className={cn("text-[22px] font-extrabold", isGreen ? "text-success" : isBlue ? "text-primary" : isOrange ? "text-warning" : "text-ai")}>{item.value}</p>
                  <p className="mt-1 text-[12px] font-extrabold text-textSecondary">{item.metric}</p>
                </div>
                <p className="min-h-[48px] text-[12px] font-semibold leading-5 text-textSecondary">{item.desc}</p>
                {index === 3 ? (
                  <Link
                    href={`/inquiries/create?materialIds=${materialId}&source=material-detail-ai`}
                    className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md bg-ai text-[12px] font-bold text-white shadow-ai"
                  >
                    创建询价任务
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function HistoryTable({ rows }: { rows: MaterialHistoryRow[] }) {
  const headers = ["报价日期", "原始价格", "折算美元价", "运输条件", "来源", "审核状态", "可信度"];

  return (
    <SectionCard title="历史价格记录" icon={CalendarDays} tone="blue">
      <div className="border-b border-borderSoft px-3 pt-2">
        <div className="flex gap-5 text-[12px] font-bold">
          {["历史价格记录", "价格来源记录", "审核记录", "价格变更日志"].map((tab, index) => (
            <span key={tab} className={cn("border-b-2 px-1 pb-2", index === 0 ? "border-ai text-ai" : "border-transparent text-textMuted")}>{tab}</span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead className="bg-[var(--color-bg-muted)] text-textSecondary">
            <tr>
              {headers.map((header) => (
                <th key={header} className="h-9 px-3 text-left font-bold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-borderSoft">
                {[row.quoteDate, row.originalPrice, row.usdPrice, row.transportCondition, row.source, row.reviewStatus, row.confidence].map((cell, index) => (
                  <td key={`${row.id}-${index}`} className={cn("h-9 whitespace-nowrap px-3", index === 5 ? "font-bold text-success" : "text-textSecondary")}>{cell}</td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={headers.length} className="h-28 px-3 text-center text-[12px] font-semibold text-textMuted">
                  暂无同品名、同规格的真实历史价格记录
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-3 text-[12px] text-textMuted">
        <span>共 {rows.length} 条真实记录</span>
        <div className="flex items-center gap-2">
          <button type="button" data-no-global-interaction aria-disabled="true" className="cursor-default rounded-md border border-borderSoft px-2 py-1">
            10 条/页
          </button>
          <button type="button" data-no-global-interaction aria-current="page" className="cursor-default rounded-md bg-ai px-2 py-1 text-white">
            1
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function RightActions({ materialId }: { materialId: string }) {
  const actionLinks = [
    `/inquiries/create?materialIds=${materialId}&source=material-detail`,
    `/ai-price-collection?materialIds=${materialId}&source=material-detail`,
    `/ai-report-center?materialId=${materialId}&source=material-detail`,
    `/project-pricing?materialIds=${materialId}&source=material-detail`,
  ];

  return (
    <SectionCard title="推荐操作" icon={Workflow} tone="purple">
      <div className="space-y-2 p-3">
        {actions.map(([title, desc], index) => (
          <Link
            key={title}
            href={actionLinks[index] ?? `/material-prices/manage?materialId=${materialId}`}
            className="grid w-full grid-cols-[28px_1fr] items-center gap-2 rounded-lg border border-borderSoft bg-white px-3 py-2 text-left hover:border-ai-border hover:bg-ai-soft"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-ai-soft text-ai"><FileText className="size-4" /></span>
            <span>
              <span className="block text-[12px] font-extrabold text-textMain">{title}</span>
              <span className="block text-[10px] font-medium text-textMuted">{desc}</span>
            </span>
          </Link>
        ))}
        <Link
          href={`/material-prices/manage?materialId=${materialId}&action=more`}
          className="mt-1 inline-flex h-8 w-full items-center justify-center rounded-md border border-borderSoft text-[12px] font-bold text-ai"
        >
          更多操作 <ChevronDown className="ml-1 inline size-3.5" />
        </Link>
      </div>
    </SectionCard>
  );
}

function AttachmentPanel({ materialId, items }: { materialId: string; items: MaterialEvidenceItem[] }) {
  return (
    <SectionCard
      title="关联附件"
      icon={FileText}
      tone="blue"
      action={
        <Link href={`/attachments?relatedObject=${materialId}&type=material-price`} className="text-[11px] font-bold text-primary">
          全部下载
        </Link>
      }
    >
      <div className="space-y-2 p-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer" : undefined}
            className="flex items-center gap-2 rounded-lg border border-borderSoft bg-white p-2 hover:border-primary/30 hover:bg-primary-soft/40"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-danger-soft text-danger"><FileText className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-textMain">{item.title}</span>
              <span className="block truncate text-[10px] font-medium text-textMuted">{item.meta}</span>
            </span>
            <ChevronRight className="size-4 text-textMuted" />
          </Link>
        ))}
        {!items.length ? (
          <div className="rounded-[10px] bg-slate-50 px-3 py-6 text-center text-[11px] font-semibold text-textMuted">
            暂无真实附件或采集证据
          </div>
        ) : (
          <Link
            href={`/attachments?relatedObject=${materialId}&type=material-price`}
            className="inline-flex h-8 w-full items-center justify-center rounded-md bg-ai-soft text-[12px] font-bold text-ai"
          >
            查看全部真实证据（{items.length}）
          </Link>
        )}
      </div>
    </SectionCard>
  );
}

function RiskPanel({ items }: { items: MaterialRiskItem[] }) {
  return (
    <SectionCard title="风险与注意事项" icon={AlertTriangle} tone="orange">
      <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.title} className="rounded-[10px] border border-borderSoft bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[12px] font-extrabold text-textMain">
                <AlertTriangle className={cn("size-3.5", item.level === "low" ? "text-success" : item.level === "medium" ? "text-warning" : "text-danger")} />
                {item.title}
              </span>
              <RiskBadge level={item.level} className="h-5 text-[10px]" />
            </div>
            <p className="text-[11px] font-medium leading-5 text-textSecondary">{item.desc}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function buildMaterialInsights(
  material: MaterialDetail,
  history: MaterialHistoryRow[],
  evidenceCount: number,
): MaterialInsightItem[] {
  return [
    {
      title: "来源证据",
      desc: evidenceCount
        ? `已关联 ${evidenceCount} 份真实附件或采集证据，建议在使用价格前核对原文。`
        : "尚未关联可展示的真实证据，当前价格不能作为完整商务依据。",
      action: evidenceCount ? "查看证据" : "去补充",
      tone: evidenceCount ? "green" : "orange",
    },
    {
      title: "标准价格口径",
      desc: material.usdPrice === "未记录"
        ? `${material.currency} 原币价格尚未形成美元标准价，跨币种比较前需补充汇率。`
        : `已保存美元标准价与价格所属期；汇率口径为 ${material.exchangeRate}。`,
      action: material.usdPrice === "未记录" ? "去核验" : "查看详情",
      tone: material.usdPrice === "未记录" ? "orange" : "green",
    },
    {
      title: "历史样本",
      desc: history.length >= 2
        ? `当前有 ${history.length} 条同品名、同规格正式价格，可用于人工比较。`
        : `当前仅有 ${history.length} 条真实历史样本，系统不生成涨跌预测。`,
      action: history.length >= 2 ? "查看分析" : "去采集",
      tone: history.length >= 2 ? "purple" : "orange",
    },
    {
      title: "人工复核",
      desc: `当前审核状态为“${material.reviewStatus}”。AI只提供证据和口径检查，不替代最终商务判断。`,
      action: "去审核",
      tone: "purple",
    },
  ];
}

function buildMaterialRisks(
  material: MaterialDetail,
  record: MaterialPriceRecord,
  evidenceCount: number,
): MaterialRiskItem[] {
  const expired = material.validUntil !== "未记录"
    && new Date(`${material.validUntil}T23:59:59`).getTime() < Date.now();
  return [
    {
      title: "价格风险",
      desc: `业务记录风险等级为“${material.riskLevel}”，需结合项目条件人工判断。`,
      level: record.riskLevel,
    },
    {
      title: "证据风险",
      desc: evidenceCount ? `已关联 ${evidenceCount} 份真实证据。` : "缺少可展示的真实来源证据。",
      level: evidenceCount ? "low" : "high",
    },
    {
      title: "汇率风险",
      desc: material.usdPrice === "未记录" ? "尚未保存美元标准价，不能直接跨币种比较。" : `已保存美元标准价；${material.exchangeRate}。`,
      level: material.usdPrice === "未记录" ? "high" : "low",
    },
    {
      title: "有效期风险",
      desc: material.validUntil === "未记录" ? "价格有效期未记录。" : expired ? `价格已于 ${material.validUntil} 过期。` : `价格有效至 ${material.validUntil}。`,
      level: material.validUntil === "未记录" || expired ? "medium" : "low",
    },
    {
      title: "参数风险",
      desc: material.specification === "未记录" ? "规格型号未记录。" : `已记录规格：${material.specification}。`,
      level: material.specification === "未记录" ? "medium" : "low",
    },
  ];
}

function formatEvidenceSize(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "大小未记录";
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function MaterialPriceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const access = await getCurrentAccess();
  const supabase = await createClient();
  let databaseRecord: MaterialPriceDatabaseRow | null = null;

  if (access) {
    const query = () =>
      supabase
        .from("wpi_material_prices")
        .select("*, wpi_suppliers(id, legacy_id, name)")
        .eq("organization_id", access.organizationId);
    const byLegacyId = await query().eq("legacy_id", id).maybeSingle();
    databaseRecord = byLegacyId.data as MaterialPriceDatabaseRow | null;
    if (!databaseRecord) {
      const byCode = await query().eq("price_code", id).maybeSingle();
      databaseRecord = byCode.data as MaterialPriceDatabaseRow | null;
    }
  }

  const fallbackRecord = findMaterialRecord(id);
  const materialRecord = databaseRecord
    ? mapMaterialPriceRow(databaseRecord)
    : fallbackRecord;
  if (!materialRecord) notFound();

  const metadata = databaseRecord?.metadata ?? {};
  const collectionLeadId = typeof metadata.collectionLeadId === "string" ? metadata.collectionLeadId : "";
  let history: MaterialHistoryRow[] = [];
  let evidenceItems: MaterialEvidenceItem[] = [];

  if (access && databaseRecord) {
    let historyQuery = supabase
      .from("wpi_material_prices")
      .select("*, wpi_suppliers(id, legacy_id, name)")
      .eq("organization_id", access.organizationId)
      .eq("material_name", databaseRecord.material_name)
      .order("updated_at", { ascending: false })
      .limit(10);
    historyQuery = databaseRecord.specification
      ? historyQuery.eq("specification", databaseRecord.specification)
      : historyQuery.is("specification", null);

    const [historyResult, attachmentResult, collectionEvidenceResult] = await Promise.all([
      historyQuery,
      supabase
        .from("wpi_attachments")
        .select("id,attachment_code,original_name,content_type,size_bytes,verification_status,document_date,created_at")
        .eq("organization_id", access.organizationId)
        .eq("related_type", "material_price")
        .eq("related_id", databaseRecord.id)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(20),
      collectionLeadId
        ? supabase
            .from("wpi_price_collection_evidence")
            .select("id,evidence_code,page_title,source_url,mime_type,fetched_at")
            .eq("organization_id", access.organizationId)
            .eq("lead_id", collectionLeadId)
            .order("fetched_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
    ]);

    history = ((historyResult.data ?? []) as MaterialPriceDatabaseRow[]).map((row) => {
      const mapped = mapMaterialPriceRow(row);
      return {
        id: row.id,
        quoteDate: mapped.quoteDate || row.updated_at.slice(0, 10),
        originalPrice: formatMoney(mapped.originalPrice, mapped.currency),
        usdPrice: mapped.usdPrice !== null && mapped.usdPrice >= 0 ? formatMoney(mapped.usdPrice, "USD") : "未记录",
        transportCondition: mapped.transportCondition || "未记录",
        source: mapped.source || "未记录",
        reviewStatus: reviewStatusLabelMap[mapped.reviewStatus],
        confidence: recordedConfidence(mapped),
      };
    });

    evidenceItems = [
      ...((attachmentResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        title: String(row.original_name || "未命名附件"),
        meta: `${formatEvidenceSize(row.size_bytes)} · ${String(row.verification_status || "待核验")} · ${String(row.document_date || row.created_at || "日期未记录").slice(0, 10)}`,
        href: `/attachments/${encodeURIComponent(String(row.attachment_code || row.id))}`,
      })),
      ...((collectionEvidenceResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        title: String(row.page_title || row.evidence_code || "采集来源证据"),
        meta: `${String(row.evidence_code || "证据编号未记录")} · ${String(row.mime_type || "网页证据")} · ${String(row.fetched_at || "日期未记录").slice(0, 10)}`,
        href: String(row.source_url || `/price-leads?leadId=${encodeURIComponent(collectionLeadId)}`),
        external: Boolean(row.source_url),
      })),
    ];
  }

  const material = buildMaterialDetail(materialRecord);
  const baseInfo = getBaseInfo(material);
  const sourceInfo = getSourceInfo(material);
  const materialStats = getStatCards(material);
  const insights = buildMaterialInsights(material, history, evidenceItems.length);
  const risks = buildMaterialRisks(material, materialRecord, evidenceItems.length);

  return (
    <AppLayout>
      <main className="space-y-3 p-4" data-no-global-interaction>
        <section className="rounded-[14px] border border-borderSoft bg-white/90 px-4 py-3 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <Link href="/material-prices" className="mb-2 inline-flex items-center gap-1 text-[12px] font-bold text-primary">
                <ArrowLeft className="size-4" />
                返回地材价格库
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[26px] font-extrabold text-textMain">{material.materialName}</h1>
                <Star className="size-4 text-textMuted" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-textMuted">
                <span>材料编号：{material.materialCode}</span>
                {materialRecord.confidence ? <ConfidenceBadge level={materialRecord.confidence} className="h-6" /> : <span className="text-xs text-textMuted">未评估</span>}
                <StatusBadge status={materialRecord.reviewStatus} label={material.reviewStatus} className="h-6" />
                <RiskBadge level={materialRecord.riskLevel} className="h-6" />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <Link href={`/material-prices/${materialRecord.id}/edit`} className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary shadow-sm"><Edit3 className="size-4" />编辑</Link>
              <Link href={`/material-prices/reviews?materialId=${materialRecord.databaseId ?? materialRecord.id}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-[12px] font-bold text-amber-700 shadow-sm"><Copy className="size-4" />进入审核</Link>
              <Link href={`/ai-price-collection?materialIds=${materialRecord.id}&source=material-detail`} className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-3 text-[12px] font-bold text-white shadow-ai"><Sparkles className="size-4" />AI 价格分析</Link>
              <Link href={`/inquiries/create?materialIds=${materialRecord.id}&source=material-detail`} className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary shadow-sm">创建询价 <ChevronDown className="size-4" /></Link>
            </div>
          </div>
          <div className="pb-1">
            <TopStats cards={materialStats} />
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            <SectionCard title="基础信息" icon={Database} tone="blue">
              <InfoGrid rows={baseInfo} columns={5} />
            </SectionCard>

            <SectionCard title="价格与来源信息" icon={WalletCards} tone="cyan">
              <InfoGrid rows={sourceInfo} columns={4} />
            </SectionCard>

            <AnalysisCards materialId={materialRecord.id} material={material} history={history} evidenceCount={evidenceItems.length} />
            <HistoryTable rows={history} />
          </div>

          <aside className="space-y-3">
            <AiInsightPanel materialId={materialRecord.id} items={insights} />
            <RightActions materialId={materialRecord.id} />
            <AttachmentPanel materialId={materialRecord.id} items={evidenceItems} />
          </aside>
        </div>

        <RiskPanel items={risks} />
      </main>
    </AppLayout>
  );
}
