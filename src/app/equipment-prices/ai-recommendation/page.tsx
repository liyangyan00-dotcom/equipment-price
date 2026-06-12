"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileWarning,
  GitCompareArrows,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, ModuleHeader, PriceCell, TableActionGroup } from "@/components/common";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import {
  aiRecommendationReasons,
  aiRecommendationRecords,
  recommendationInsights,
  recommendationKpis,
  recommendedSuppliers,
  similarPriceMatches,
  type AiRecommendationRecord,
} from "@/data/mock/aiRecommendations";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";

const kpiIcons = [Sparkles, CheckCircle2, FileWarning, Send, AlertTriangle, ShieldCheck] as const;

const toneStyles = {
  blue: {
    card: "from-white to-primary-soft",
    icon: "from-primary to-[#68A6FF] text-white shadow-[0_12px_24px_rgba(47,107,255,0.24)]",
    text: "text-primary",
    badge: "bg-primary-soft text-primary",
  },
  cyan: {
    card: "from-white to-info-soft",
    icon: "from-info to-[#67D6F7] text-white shadow-[0_12px_24px_rgba(20,184,224,0.22)]",
    text: "text-info",
    badge: "bg-info-soft text-info",
  },
  green: {
    card: "from-white to-success-soft",
    icon: "from-success to-[#7ADFA0] text-white shadow-[0_12px_24px_rgba(57,181,108,0.22)]",
    text: "text-success",
    badge: "bg-success-soft text-success",
  },
  orange: {
    card: "from-white to-warning-soft",
    icon: "from-warning to-[#FDBA5A] text-white shadow-[0_12px_24px_rgba(245,158,11,0.22)]",
    text: "text-warning",
    badge: "bg-warning-soft text-warning",
  },
  red: {
    card: "from-white to-danger-soft",
    icon: "from-danger to-[#FF7A7A] text-white shadow-[0_12px_24px_rgba(239,68,68,0.2)]",
    text: "text-danger",
    badge: "bg-danger-soft text-danger",
  },
  purple: {
    card: "from-white to-ai-soft",
    icon: "from-ai to-[#9A6CFF] text-white shadow-[0_12px_24px_rgba(124,58,237,0.24)]",
    text: "text-ai",
    badge: "bg-ai-soft text-ai",
  },
} as const;

type Tone = keyof typeof toneStyles;

const actionLabel = {
  create_inquiry: "创建询价",
  adopt: "采用推荐",
  review: "人工复核",
  complete_params: "补全参数",
} as const;

const columns: DataTableColumn<AiRecommendationRecord>[] = [
  {
    key: "equipmentCode",
    header: "设备编号",
    className: "min-w-[118px] whitespace-nowrap",
  },
  {
    key: "equipmentName",
    header: "设备名称",
    className: "min-w-[132px]",
    render: (row) => (
      <div>
        <div className="font-semibold text-textMain">{row.equipmentName}</div>
        <div className="mt-0.5 truncate text-[11px] text-textMuted">{row.specification}</div>
      </div>
    ),
  },
  {
    key: "brand",
    header: "品牌",
    className: "min-w-[92px]",
    render: (row) => <span className="font-medium text-textSecondary">{row.brand}</span>,
  },
  {
    key: "specification",
    header: "规格型号",
    className: "min-w-[122px]",
    render: (row) => <span className="line-clamp-1 text-textSecondary">{row.specification}</span>,
  },
  {
    key: "currentPrice",
    header: "当前价格",
    align: "right",
    className: "min-w-[104px]",
    render: (row) => <PriceCell value={row.currentPrice} currency={row.currency} />,
  },
  {
    key: "recommendedPrice",
    header: "AI推荐价格",
    align: "right",
    className: "min-w-[112px]",
    render: (row) => <PriceCell value={row.recommendedPrice} currency={row.currency} />,
  },
  {
    key: "differenceRate",
    header: "差异比例",
    align: "right",
    className: "min-w-[82px]",
    render: (row) => (
      <span className={cn("font-semibold tabular-nums", row.differenceRate > 0 ? "text-danger" : "text-success")}>
        {row.differenceRate > 0 ? "+" : ""}
        {row.differenceRate}%
      </span>
    ),
  },
  {
    key: "similarCount",
    header: "相似价格",
    align: "center",
    className: "min-w-[78px]",
    render: (row) => <span className="font-semibold text-primary">{row.similarCount} 条</span>,
  },
  {
    key: "supplier",
    header: "推荐供应商",
    className: "min-w-[150px]",
    render: (row) => <span className="line-clamp-1 font-medium text-textMain">{row.supplier}</span>,
  },
  {
    key: "confidence",
    header: "AI置信度",
    className: "min-w-[116px] whitespace-nowrap",
    render: (row) => <ConfidenceBadge level={row.confidence} className="h-5 text-[11px]" />,
  },
  {
    key: "riskLevel",
    header: "风险等级",
    className: "min-w-[104px] whitespace-nowrap",
    render: (row) => <RiskBadge level={row.riskLevel} className="h-5 text-[11px]" />,
  },
  {
    key: "action",
    header: "推荐动作",
    className: "min-w-[112px] whitespace-nowrap",
    render: (row) => <AiBadge label={actionLabel[row.action]} className="h-5 text-[11px]" />,
  },
  {
    key: "actions",
    header: "操作",
    align: "right",
    className: "min-w-[236px] whitespace-nowrap",
    render: (row) => (
      <TableActionGroup
        actions={[
          { label: "查看", icon: Search },
          {
            label: row.action === "create_inquiry" ? "创建询价" : "标记采用",
            icon: row.action === "create_inquiry" ? Send : CheckCircle2,
            tone: row.action === "create_inquiry" ? "ai" : "primary",
            href: row.action === "create_inquiry" ? "/inquiries/create" : undefined,
          },
          { label: "复核", icon: ClipboardList, tone: row.riskLevel === "high" || row.riskLevel === "critical" ? "warning" : "default" },
        ]}
      />
    ),
  },
];

function FilterChip({ label }: { label: string }) {
  return (
    <button type="button" className="grid h-9 min-w-[136px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <span className="whitespace-nowrap font-semibold text-textSecondary">{label}</span>
      <span className="truncate font-medium text-textMuted">全部</span>
      <ChevronDown className="size-3.5 text-textMuted" />
    </button>
  );
}

function RecommendationKpiGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {recommendationKpis.map((item, index) => {
        const tone = item.tone as Tone;
        const Icon = kpiIcons[index];
        return (
          <section key={item.label} className={cn("min-h-[96px] rounded-card border border-borderSoft bg-gradient-to-br px-3.5 py-3 shadow-card", toneStyles[tone].card)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-textSecondary">{item.label}</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className={cn("text-[25px] font-bold leading-8 tracking-normal", toneStyles[tone].text)}>{item.value}</span>
                  {item.unit ? <span className="mb-1 text-[11px] font-bold text-textMuted">{item.unit}</span> : null}
                </div>
              </div>
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br", toneStyles[tone].icon)}>
                <Icon className="size-5" />
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={cn("rounded-pill px-1.5 py-0.5 text-[10px] font-bold", toneStyles[tone].badge)}>{item.trend}</span>
              <span className="min-w-0 truncate text-[10px] font-medium text-textMuted">{item.description}</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ReasonPanel() {
  return (
    <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-3 shadow-card">
      <ModuleHeader icon={Bot} title="AI决策助手" subtitle="基于多维数据智能分析" tone="purple" density="compact" action={<button className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-white px-2 text-[11px] font-semibold text-ai" type="button"><RefreshCw className="size-3.5" />刷新</button>} />
      <div className="mt-3 space-y-2">
        <div className="rounded-lg border border-ai-border bg-white/90 p-2.5">
          <div className="flex items-center gap-2 text-[12px] font-bold text-ai">
            <Sparkles className="size-4" />
            AI推荐理由
          </div>
          <ol className="mt-2 space-y-1.5 text-[12px] leading-5 text-textSecondary">
            {aiRecommendationReasons.map((item, index) => (
              <li key={item} className="grid grid-cols-[18px_1fr] gap-1.5">
                <span className="font-bold text-primary">{index + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <button className="mt-2 text-[12px] font-semibold text-primary" type="button">查看详细分析 〉</button>
        </div>
        <div className="rounded-lg border border-warning/20 bg-warning-soft p-2.5">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#B45309]">
            <AlertTriangle className="size-4" />
            参数缺失提醒
          </div>
          <p className="mt-1 text-[12px] leading-5 text-textSecondary">3 项参数缺失可能影响推荐准确性</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["阀体材质", "密封材质", "防护等级"].map((item) => (
              <span key={item} className="rounded-pill bg-white px-2 py-0.5 text-[11px] font-semibold text-warning">{item}</span>
            ))}
          </div>
          <button className="mt-2 text-[12px] font-semibold text-primary" type="button">去补充参数 〉</button>
        </div>
        <div className="rounded-lg border border-borderSoft bg-white/90 p-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-bold text-ai">相似价格匹配</div>
              <p className="mt-1 text-[12px] text-textMuted">匹配度最高的历史样本</p>
            </div>
            <div className="text-right text-[24px] font-bold leading-none text-primary">86%</div>
          </div>
          <p className="mt-2 text-[12px] text-textSecondary">材料设备　电动蝶阀 DN300 PN16　成交价 CDF 8,620.00</p>
          <button className="mt-2 text-[12px] font-semibold text-primary" type="button">查看更多样本 〉</button>
        </div>
        <div className="rounded-lg border border-ai-border bg-white/90 p-2.5">
          <div className="text-[12px] font-bold text-ai">推荐询价动作</div>
          <p className="mt-1 text-[12px] leading-5 text-textSecondary">建议选择至少 3 家供应商验证推荐价格。</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Kinshasa SARL", "Aqua Congo Services", "Kinshasa Water"].map((item) => (
              <span key={item} className="rounded-md border border-ai-border bg-ai-soft px-2 py-1 text-[11px] font-semibold text-ai">{item}</span>
            ))}
          </div>
          <button className="mt-2 text-[12px] font-semibold text-primary" type="button">生成询价清单 〉</button>
        </div>
      </div>
    </section>
  );
}

function SimilarPricePanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <ModuleHeader icon={GitCompareArrows} title="相似价格匹配" subtitle="按规格、品牌、来源时间综合匹配" tone="blue" density="compact" />
      <div className="mt-3 space-y-2">
        {similarPriceMatches.map((item) => (
          <div key={item.code} className="grid grid-cols-[1fr_72px] gap-2 rounded-lg border border-borderSoft bg-[var(--color-bg-muted)] p-2 text-[12px]">
            <div className="min-w-0">
              <div className="font-semibold text-textMain">{item.code} {item.name}</div>
              <div className="mt-1 truncate text-textMuted">{item.spec} · {item.supplier}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-textMain">{formatCurrency(item.price, "USD")}</div>
              <div className="mt-1 text-[11px] font-semibold text-success">相似度 {item.similarity}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendedSupplierPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <ModuleHeader icon={UsersRound} title="推荐询价供应商" subtitle="用于一键创建询价任务" tone="cyan" density="compact" />
      <div className="mt-3 space-y-2">
        {recommendedSuppliers.map((supplier) => (
          <div key={supplier.name} className="grid grid-cols-[1fr_54px_70px] items-center gap-2 rounded-lg border border-borderSoft p-2 text-[12px]">
            <div className="min-w-0">
              <div className="truncate font-semibold text-textMain">{supplier.name}</div>
              <div className="mt-0.5 text-textMuted">{supplier.category} · 响应{supplier.response}</div>
            </div>
            <span className="rounded-md bg-primary px-2 py-1 text-center text-[11px] font-bold text-white">{supplier.score}</span>
            <RiskBadge level={supplier.risk} className="h-5 px-1.5 text-[10px]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskAdvicePanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <ModuleHeader icon={AlertTriangle} title="风险提示 / 采用建议" subtitle="推荐结果进入询价前的风险校验" tone="orange" density="compact" />
      <div className="mt-3 space-y-2">
        {recommendationInsights.map((item) => {
          const tone = item.tone === "warning" ? "bg-warning-soft text-warning border-warning/20" : item.tone === "success" ? "bg-success-soft text-success border-success/20" : "bg-primary-soft text-primary border-primary/20";
          return (
            <div key={item.title} className={cn("rounded-lg border px-3 py-2 text-[12px]", tone)}>
              <div className="font-bold">{item.title}</div>
              <div className="mt-1 leading-5 text-textSecondary">{item.description}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BottomActionBar() {
  return (
    <div className="sticky bottom-3 z-20 rounded-card border border-borderSoft bg-white/95 px-4 py-2 shadow-[0_14px_42px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="grid items-center gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="flex flex-wrap items-center gap-6 text-[13px] text-textSecondary">
          <span>已选择 <b className="text-textMain">3</b> 条设备</span>
          <span>总AI推荐金额 <b className="text-textMain">CDF 36,550.00</b></span>
          <span>预计优化 <b className="text-success">CDF 1,950.00 (5.1%)</b></span>
        </div>
        <button className="h-10 rounded-md bg-primary px-8 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(47,107,255,0.22)]" type="button">采用推荐价</button>
        <Link href="/inquiries/create" className="inline-flex h-10 items-center justify-center rounded-md bg-ai px-8 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(124,58,237,0.22)]">发起询价</Link>
        <button className="h-10 rounded-md bg-warning-soft px-8 text-[13px] font-bold text-warning" type="button">标记复核</button>
        <button className="h-10 rounded-md border border-borderSoft bg-white px-8 text-[13px] font-bold text-textSecondary" type="button">生成说明</button>
      </div>
    </div>
  );
}

export default function EquipmentAiRecommendationPage() {
  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader
          title="设备价格 AI 推荐"
          description="基于历史价格、相似设备、供应商表现与参数完整度，辅助生成推荐价格和询价任务。"
          actions={
            <>
              <Link href="/inquiries/create" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm">
                <Send className="size-4" />
                创建询价任务
              </Link>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm">
                <ClipboardList className="size-4" />
                导出建议
              </button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm">
                <Sparkles className="size-4" />
                AI批量评估
              </button>
            </>
          }
        />

        <RecommendationKpiGrid />

        <section className="rounded-card border border-borderSoft bg-white px-3 py-2.5 shadow-card">
          <div className="grid items-center gap-2 xl:grid-cols-[minmax(260px,1.3fr)_minmax(136px,0.62fr)_minmax(136px,0.62fr)_minmax(136px,0.62fr)_minmax(150px,0.68fr)_56px_64px_42px]">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-3 text-[12px] text-textMuted shadow-[0_1px_0_rgba(15,23,42,0.02)]">
              <Search className="size-4" />
              <input className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-textMuted" placeholder="搜索设备编号" />
            </label>
            {["设备类别", "品牌", "风险等级", "AI置信度"].map((item) => (
              <FilterChip key={item} label={item} />
            ))}
            <button className="inline-flex h-9 items-center justify-center rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary shadow-sm" type="button">重置</button>
            <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(47,107,255,0.24)]" type="button">查询</button>
            <button className="flex h-9 items-center justify-center rounded-md border border-borderSoft bg-white text-textMuted shadow-sm" type="button"><Settings className="size-4" /></button>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,8fr)_minmax(310px,4fr)]">
          <DataTable
            columns={columns}
            data={aiRecommendationRecords}
            rowKey="id"
            density="compact"
            actions={
              <ModuleHeader
                icon={PackageCheck}
                title="AI推荐价格明细"
                subtitle="推荐价格、差异比例、相似价格、供应商与风险状态统一复核"
                tone="purple"
                density="compact"
                action={<AiBadge label="AI推荐已启用" className="h-5 text-[11px]" />}
              />
            }
          />
          <div className="space-y-3">
            <ReasonPanel />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.95fr_0.95fr]">
          <SimilarPricePanel />
          <RecommendedSupplierPanel />
          <RiskAdvicePanel />
        </div>

        <BottomActionBar />
      </div>
    </AppLayout>
  );
}
