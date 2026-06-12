"use client";

import Link from "next/link";
import {
  Activity,
  Bot,
  Box,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  MapPinned,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  SearchCheck,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, ModuleHeader } from "@/components/common";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import {
  materialKpis,
  materialPriceRecords,
  type MaterialPriceRecord,
} from "@/data/mock/materialPrices";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";

const reviewLabel = {
  pending: "待审核",
  need_info: "需补充",
  confirmed: "已审核",
  rejected: "已退回",
  voided: "已作废",
} as const;

const kpiConfig = [
  {
    icon: Box,
    label: "地材价格条目",
    valueClassName: "text-blue-600",
    iconClassName: "from-blue-500 to-blue-600 text-white shadow-blue-500/25",
    waveClassName: "text-blue-400",
  },
  {
    icon: SearchCheck,
    label: "今日AI采集线索",
    valueClassName: "text-emerald-600",
    iconClassName: "from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25",
    waveClassName: "text-emerald-400",
  },
  {
    icon: FileSpreadsheet,
    label: "待复核地材价格",
    valueClassName: "text-orange-500",
    iconClassName: "from-amber-400 to-orange-500 text-white shadow-orange-500/25",
    waveClassName: "text-orange-400",
  },
  {
    icon: TrendingUp,
    label: "高速波动材料",
    valueClassName: "text-red-500",
    iconClassName: "from-red-400 to-red-600 text-white shadow-red-500/25",
    waveClassName: "text-red-400",
  },
  {
    icon: Bot,
    label: "AI预警项",
    valueClassName: "text-violet-600",
    iconClassName: "from-violet-500 to-purple-600 text-white shadow-violet-500/25",
    waveClassName: "text-violet-400",
  },
  {
    icon: CalendarDays,
    label: "本月更新",
    valueClassName: "text-sky-500",
    iconClassName: "from-cyan-400 to-sky-500 text-white shadow-cyan-500/25",
    waveClassName: "text-sky-400",
  },
] as const;

const regionCompareData = [
  { region: "Kinshasa", value: 3.69 },
  { region: "Matadi", value: 3.12 },
  { region: "Lubumbashi", value: 3.85 },
  { region: "Goma", value: 4.08 },
  { region: "Likasi", value: 3.45 },
];

const collectionPieData = [
  { name: "供应商网站", value: 32, percent: "37.2%", color: "#2F6BFF" },
  { name: "行业媒体", value: 21, percent: "24.4%", color: "#7C3AED" },
  { name: "招投标平台", value: 15, percent: "17.4%", color: "#58C29A" },
  { name: "同行报价单", value: 10, percent: "11.6%", color: "#F5B84B" },
  { name: "其他公开渠道", value: 8, percent: "9.3%", color: "#EF5A5A" },
];

const collectionSuggestions = [
  { material: "沥青", spec: "60/70", region: "Kinshasa, Matadi", risk: "高", dots: 5 },
  { material: "钢绞线", spec: "15.2mm", region: "Kinshasa", risk: "中", dots: 4 },
  { material: "木方", spec: "50x100mm", region: "Kisantu", risk: "中", dots: 4 },
  { material: "PVC管", spec: "DN160", region: "Kinshasa", risk: "低", dots: 2 },
];

const gapWarnings = [
  { title: "缺口预警", value: "12", text: "缺口材料需补采" },
  { title: "高风险预警", value: "5", text: "波动超过阈值" },
  { title: "中风险预警", value: "7", text: "样本不足或过期" },
];

const columns: DataTableColumn<MaterialPriceRecord>[] = [
  { key: "materialCode", header: "材料编号", className: "min-w-[126px] whitespace-nowrap" },
  {
    key: "materialName",
    header: "材料名称",
    className: "min-w-[118px]",
    render: (row) => (
      <div>
        <div className="font-semibold text-textMain">{row.materialName}</div>
        <div className="mt-0.5 text-[11px] text-textMuted">{row.source}</div>
      </div>
    ),
  },
  { key: "category", header: "类别", className: "min-w-[70px] whitespace-nowrap" },
  { key: "specification", header: "规格", className: "min-w-[98px] whitespace-nowrap" },
  {
    key: "region",
    header: "地区",
    className: "min-w-[88px] whitespace-nowrap",
    render: (row) => (
      <span className="inline-flex items-center gap-1 text-textSecondary">
        <MapPinned className="size-3.5 text-cyan" aria-hidden="true" />
        {row.region}
      </span>
    ),
  },
  { key: "unit", header: "单位", className: "min-w-[48px] whitespace-nowrap" },
  {
    key: "originalPrice",
    header: "原始价格",
    align: "right",
    className: "min-w-[82px] whitespace-nowrap",
    render: (row) => <span className="font-semibold tabular-nums text-textMain">{row.originalPrice.toLocaleString("zh-CN")}</span>,
  },
  { key: "currency", header: "币种", className: "min-w-[48px] whitespace-nowrap" },
  {
    key: "usdPrice",
    header: "折算美元价",
    align: "right",
    className: "min-w-[82px] whitespace-nowrap",
    render: (row) => <span className="font-semibold tabular-nums text-textMain">{row.usdPrice.toLocaleString("zh-CN")}</span>,
  },
  {
    key: "quoteDate",
    header: "报价日期",
    className: "min-w-[86px] whitespace-nowrap",
    render: (row) => <span className="text-textMuted">{formatDate(row.quoteDate)}</span>,
  },
  { key: "transportCondition", header: "运输条件", className: "min-w-[92px] whitespace-nowrap" },
  {
    key: "confidence",
    header: "可信度",
    className: "min-w-[74px] whitespace-nowrap",
    render: (row) => <ConfidenceBadge level={row.confidence} showPrefix={false} className="h-5 px-1.5 text-[11px]" />,
  },
  {
    key: "reviewStatus",
    header: "审核状态",
    className: "min-w-[74px] whitespace-nowrap",
    render: (row) => <StatusBadge status={row.reviewStatus} label={reviewLabel[row.reviewStatus]} className="h-5 text-[11px]" />,
  },
  {
    key: "source",
    header: "来源",
    className: "min-w-[70px] whitespace-nowrap",
    render: (row) => <AiBadge label={row.source} className="h-5 px-1.5 text-[10px]" />,
  },
  {
    key: "actions",
    header: "操作",
    align: "center",
    className: "min-w-[78px] whitespace-nowrap",
    render: (row) => (
      <div className="flex items-center justify-center gap-2 text-primary">
        <Link href={`/material-prices/${row.id}`} aria-label="????">
          <Eye className="size-4" />
        </Link>
        <button type="button" aria-label="趋势">
          <Activity className="size-4" />
        </button>
        <button type="button" aria-label="更多">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    ),
  },
];

function MiniWave({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-14", className)} viewBox="0 0 60 20" fill="none" aria-hidden="true">
      <path d="M2 14 C8 14 10 7 16 7 C22 7 23 15 30 15 C36 15 38 5 44 5 C50 5 51 12 58 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MaterialKpiGrid() {
  const items = [
    materialKpis[0],
    materialKpis[2],
    materialKpis[3],
    materialKpis[4],
    { ...materialKpis[3], label: "AI预警项", value: "12", unit: "项", trend: "较昨日 +3项" },
    materialKpis[1],
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-6">
      {items.map((item, index) => {
        const config = kpiConfig[index];
        const Icon = config.icon;

        return (
          <section key={`${config.label}-${index}`} className="min-h-[90px] rounded-[10px] border border-borderSoft bg-white px-4 py-3 shadow-card">
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

function FilterSelect({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide ? "w-[158px]" : "w-[82px]")}>
      <div className="mb-1 text-[12px] font-semibold text-textSecondary">{label}</div>
      <button type="button" className="flex h-9 w-full items-center justify-between rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary">
        <span>{wide ? "请输入材料名称/编号/规格" : "全部"}</span>
        {wide ? <Search className="size-4 text-textMuted" /> : <ChevronDown className="size-4 text-textMuted" />}
      </button>
    </div>
  );
}

function MaterialFilterPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="flex flex-wrap items-end gap-1.5">
        <FilterSelect label="材料搜索" wide />
        <FilterSelect label="类别" />
        <FilterSelect label="地区" />
        <FilterSelect label="供应商" />
        <FilterSelect label="运输条件" />
        <FilterSelect label="可信度" />
        <FilterSelect label="审核状态" />
        <button type="button" className="inline-flex h-9 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] font-semibold text-primary shadow-sm">
          展开
          <ChevronDown className="size-4" />
        </button>
        <button type="button" className="inline-flex h-9 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] font-semibold text-textSecondary shadow-sm">
          <Database className="size-4" />
          列设置
        </button>
        <button type="button" className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-[12px] font-semibold text-white shadow-sm">
          <Search className="size-4" />
          查询
        </button>
        <button type="button" className="inline-flex h-9 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] font-semibold text-textSecondary shadow-sm">
          <RotateCcw className="size-4" />
          重置
        </button>
      </div>
    </section>
  );
}

function MaterialActionBar() {
  const actions = [
    { label: "新增地材价格", icon: Plus, className: "bg-primary text-white border-primary" },
    { label: "导入调研表", icon: Upload, className: "bg-white text-success border-success/30" },
    { label: "AI采集线索", icon: Sparkles, className: "bg-ai-soft text-ai border-ai-border" },
    { label: "AI整理记录", icon: Bot, className: "bg-white text-primary border-primary/20" },
    { label: "导出价格表", icon: Download, className: "bg-white text-textSecondary border-borderSoft" },
  ];

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button key={action.label} type="button" className={cn("inline-flex h-9 min-w-[110px] shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold shadow-sm", action.className)}>
            <Icon className="size-4" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

function CollectionSidePanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[17px] font-bold text-textMain">AI建议补充采集</h3>
        <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
          <RotateCcw className="size-3.5" />
          换一批
        </button>
      </div>
      <div className="mb-3 grid grid-cols-2 rounded-lg border border-borderSoft bg-[var(--color-bg-muted)] p-1 text-center text-[13px] font-semibold">
        <button className="h-8 rounded-md bg-primary-soft text-primary shadow-sm">建议采集 <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[11px]">8</span></button>
        <button className="h-8 rounded-md text-textMuted">已采集 <span className="ml-1">12</span></button>
      </div>
      <div className="space-y-3">
        {collectionSuggestions.map((item) => (
          <div key={item.material} className="rounded-xl border border-borderSoft bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white shadow-sm">
                  <SearchCheck className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-bold text-textMain">{item.material}（{item.spec}）</div>
                  <p className="truncate text-[12px] text-textMuted">{item.material}</p>
                </div>
              </div>
              <button className="h-8 shrink-0 rounded-md border border-primary/40 bg-white px-3 text-[13px] font-bold text-primary shadow-sm">去采集</button>
            </div>
            <div className="mt-3 space-y-2 text-[12px] text-textMuted">
              <div>建议地区：<span className="font-semibold text-textSecondary">{item.region}</span></div>
              <div className="flex items-center justify-between">
                <span>缺口指数：
                  <span className={cn("ml-1", item.risk === "低" ? "text-success" : "text-danger")}>{"●".repeat(item.dots)}</span>
                <span className="text-borderSoft">{"○".repeat(5 - item.dots)}</span>
                </span>
                <span className={cn("rounded-md px-2 py-1 text-[12px] font-bold", item.risk === "高" ? "bg-danger-soft text-danger" : item.risk === "中" ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>{item.risk}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 inline-flex w-full items-center justify-center gap-1 text-[13px] font-bold text-primary">
        查看全部建议（8）<ChevronRight className="size-4" />
      </button>
    </section>
  );
}

function MarketResearchCard() {
  const stats = [
    { label: "今日新增线索", value: "86", unit: "条", className: "text-primary bg-primary-soft border-primary/15" },
    { label: "已整理入库", value: "68", unit: "条", className: "text-success bg-success-soft border-success/15" },
    { label: "AI提取准确率", value: "92.6", unit: "%", className: "text-ai bg-ai-soft border-ai-border" },
    { label: "待人工复核", value: "12", unit: "条", className: "text-danger bg-danger-soft border-danger/15" },
  ];

  return (
    <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-[17px] font-bold text-textMain">AI市场调研整理</h3>
        <button className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          查看详情 <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map((item) => (
          <div key={item.label} className={cn("rounded-lg border px-2 py-2 text-center", item.className)}>
            <div className="text-[22px] font-bold leading-6">
              {item.value}
              <span className="ml-0.5 text-[11px]">{item.unit}</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-textSecondary">{item.label}</div>
          </div>
        ))}
      </div>
      <h4 className="mt-4 text-[14px] font-bold text-textMain">近期AI采集来源分布</h4>
      <div className="mt-2 grid grid-cols-[168px_1fr] items-center gap-4">
        <div className="relative flex h-[156px] items-center justify-center">
          <div
            className="size-[144px] rounded-full"
            style={{
              background:
                "conic-gradient(#2F6BFF 0 37.2%, #7C3AED 37.2% 61.6%, #58C29A 61.6% 79%, #F5B84B 79% 90.6%, #EF5A5A 90.6% 100%)",
            }}
          />
          <div className="absolute size-[88px] rounded-full border border-borderSoft bg-white" />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[24px] font-bold text-textMain">86</span>
            <span className="text-[12px] font-semibold text-textMuted">总计（条）</span>
          </div>
        </div>
        <div className="space-y-2">
          {collectionPieData.map((item) => (
            <div key={item.name} className="grid grid-cols-[12px_1fr_78px] items-center gap-2 text-[12px]">
              <span className="size-3 rounded-sm" style={{ background: item.color }} />
              <span className="truncate font-medium text-textSecondary">{item.name}</span>
              <span className="text-right text-textMuted">{item.value} ({item.percent})</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PriceTrendCard() {
  const topItems = [
    { label: "柴油（ENS90）", value: "28.4%", color: "bg-primary", className: "text-danger" },
    { label: "钢筋 HRB400（Φ16mm）", value: "18.7%", color: "bg-success", className: "text-danger" },
    { label: "水泥（CEM II 42.5R）", value: "12.7%", color: "bg-warning", className: "text-danger" },
  ];

  return (
    <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-[17px] font-bold text-textMain">AI价格波动分析</h3>
        <button className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          查看详情 <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="text-[13px] font-bold text-textSecondary">主要材料折算美元价趋势 <span className="ml-1 text-[12px] font-semibold text-textMuted">（USD/单位）</span></div>
      <div className="mt-3 flex justify-center gap-4 text-[12px] font-semibold text-textSecondary">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-primary" />水泥</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-success" />钢筋</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-ai" />柴油</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-warning" />砂石</span>
      </div>
      <div className="mt-2">
        <svg viewBox="0 0 320 170" className="h-[170px] w-full" aria-label="主要材料折算美元价趋势">
          {[28, 64, 100, 136].map((y) => (
            <line key={y} x1="34" x2="306" y1={y} y2={y} stroke="#E5EDF7" strokeDasharray="4 4" />
          ))}
          {[250, 200, 150, 100, 50, 0].map((label, index) => (
            <text key={label} x="6" y={20 + index * 28} fill="#64748B" fontSize="10">{label}</text>
          ))}
          {["04-21", "04-28", "05-05", "05-12", "05-19", "05-20"].map((label, index) => (
            <text key={label} x={34 + index * 52} y="164" fill="#64748B" fontSize="10">{label}</text>
          ))}
          <polyline points="36,72 88,68 140,61 192,55 244,51 296,43" fill="none" stroke="#2F6BFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="36,105 88,101 140,98 192,93 244,89 296,84" fill="none" stroke="#58C29A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="36,129 88,126 140,124 192,120 244,116 296,113" fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="36,121 88,118 140,116 192,111 244,106 296,101" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {[36, 88, 140, 192, 244, 296].map((x, i) => (
            <circle key={`cement-${x}`} cx={x} cy={[72, 68, 61, 55, 51, 43][i]} r="3" fill="#2F6BFF" />
          ))}
        </svg>
      </div>
      <div className="border-t border-borderSoft pt-3">
        <div className="mb-2 text-[14px] font-bold text-primary">本月波动Top3</div>
        <div className="space-y-1.5">
          {topItems.map((item) => (
            <div key={item.label} className="grid grid-cols-[14px_1fr_58px] items-center gap-2 text-[12px]">
              <span className={cn("size-2.5 rounded-full", item.color)} />
              <span className="font-medium text-textSecondary">{item.label}</span>
              <span className={cn("text-right font-bold", item.className)}>↑ {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RegionCompareCard() {
  const advice = [
    { text: "Kinshasa 价格最低，建议优先比价采购", color: "bg-success" },
    { text: "Matadi 与 Kinshasa 差异较小，可考虑就近采购", color: "bg-warning" },
    { text: "Goma 价格偏高，建议关注运输方式优化", color: "bg-danger" },
  ];

  return (
    <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-[17px] font-bold text-textMain">AI地区价格对比建议</h3>
        <button className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          查看详情 <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="text-[13px] font-bold text-textSecondary">水泥（CEM II 42.5R） 折算美元价（USD/袋）</div>
      <div className="mt-3 flex h-[174px] items-end gap-4 border-b border-l border-borderSoft px-3 pb-6">
        {regionCompareData.map((item, index) => (
          <div key={item.region} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[12px] font-bold text-textSecondary">{item.value}</span>
            <div
              className="w-full max-w-[42px] rounded-t-md"
              style={{
                height: `${item.value * 28}px`,
                background: ["#2F6BFF", "#14B8A6", "#58C29A", "#38BDF8", "#60A5FA"][index],
              }}
            />
            <span className="mt-1 text-[10px] text-textMuted">{item.region}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-borderSoft pt-3">
        <div className="mb-2 text-[14px] font-bold text-primary">AI建议</div>
        <div className="space-y-2">
          {advice.map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-[12px] text-textSecondary">
              <span className={cn("size-2.5 rounded-full", item.color)} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GapWarningCard() {
  const topItems = [
    { material: "沥青（60/70）", risk: "高", dots: 5, color: "bg-danger", text: "text-danger" },
    { material: "钢绞线（15.2mm）", risk: "中", dots: 4, color: "bg-orange-500", text: "text-orange-500" },
    { material: "木方（50x100mm）", risk: "中", dots: 4, color: "bg-warning", text: "text-warning" },
    { material: "PVC管（DN160）", risk: "低", dots: 2, color: "bg-success", text: "text-success" },
    { material: "玻璃纤维网格布", risk: "低", dots: 2, color: "bg-success", text: "text-success" },
  ];

  return (
    <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-[17px] font-bold text-textMain">AI价格缺口预警</h3>
        <button className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          查看详情 <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {gapWarnings.map((item, index) => (
          <div key={item.title} className={cn("rounded-lg border p-3 text-center", index === 0 ? "border-danger/15 bg-danger-soft" : index === 1 ? "border-danger/10 bg-danger-soft/60" : "border-warning/20 bg-warning-soft")}>
            <div className={cn("text-[22px] font-bold", index === 0 ? "text-danger" : index === 1 ? "text-danger" : "text-warning")}>
              {item.value}
              <span className="ml-0.5 text-[11px]">项</span>
            </div>
            <div className="mt-1 text-[12px] font-semibold text-textSecondary">{item.title}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[14px] font-bold text-textMain">缺口Top5</div>
      <div className="mt-2 space-y-2.5">
        {topItems.map((item) => (
          <div key={item.material} className="grid grid-cols-[18px_1fr_92px_30px] items-center gap-2 text-[12px]">
            <span className={cn("flex size-5 items-center justify-center rounded-full text-[12px] font-bold text-white", item.color)}>!</span>
            <span className="truncate font-bold text-textSecondary">{item.material}</span>
            <span className={cn("text-right", item.text)}>
              {"●".repeat(item.dots)}
              <span className="text-borderSoft">{"○".repeat(5 - item.dots)}</span>
            </span>
            <span className={cn("rounded px-1.5 py-0.5 text-center text-[11px] font-semibold", item.risk === "高" ? "bg-danger-soft text-danger" : item.risk === "中" ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>{item.risk}</span>
          </div>
        ))}
      </div>
      <button className="mt-4 inline-flex w-full items-center justify-center gap-1 text-[13px] font-semibold text-primary">
        查看全部预警（12）<ChevronRight className="size-4" />
      </button>
    </section>
  );
}

function MaterialBottomActions() {
  const actions = [
    { label: "新增地材价格", icon: Plus, className: "bg-primary text-white border-primary" },
    { label: "导入调研表", icon: Upload, className: "bg-white text-success border-success/40" },
    { label: "AI采集线索", icon: Sparkles, className: "bg-ai-soft text-ai border-ai-border" },
    { label: "AI整理记录", icon: Bot, className: "bg-white text-primary border-primary/25" },
    { label: "导出价格表", icon: Download, className: "bg-white text-textSecondary border-borderSoft" },
  ];

  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="grid gap-3 md:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md border text-[13px] font-semibold shadow-sm", action.className)}>
              <Icon className="size-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function MaterialPricesPage() {
  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader
          title="地材价格库"
          description="管理项目所在地材料价格、来源、区域、运输条件与 AI 采集线索。"
          actions={
            <>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm transition hover:border-cyan/30 hover:text-cyan">
                <Upload className="size-4" aria-hidden="true" />
                导入价格
              </button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm transition hover:border-ai/40">
                <SearchCheck className="size-4" aria-hidden="true" />
                AI采集
              </button>
              <Link href="/material-prices/manage" className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan/30 bg-cyan-soft px-3 text-[13px] font-semibold text-cyan shadow-sm transition hover:border-cyan/50">
                <Database className="size-4" aria-hidden="true" />
                管理价格库
              </Link>
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-cyan px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-cyan/90">
                <Plus className="size-4" aria-hidden="true" />
                新增地材价格
              </button>
            </>
          }
        />

        <MaterialKpiGrid />
        <MaterialFilterPanel />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,9fr)_minmax(300px,3fr)]">
          <div className="space-y-3">
            <MaterialActionBar />
            <DataTable
              columns={columns}
              data={materialPriceRecords}
              rowKey="id"
              density="compact"
              actions={
                <ModuleHeader
                  icon={Activity}
                  title="地材价格明细"
                  subtitle="地区、运输条件、价格趋势和可信度集中管理"
                  tone="cyan"
                  density="compact"
                  action={<AiBadge label="AI采集同步" className="h-5 text-[11px]" />}
                />
              }
            />
          </div>
          <CollectionSidePanel />
        </div>

        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-4">
          <MarketResearchCard />
          <PriceTrendCard />
          <RegionCompareCard />
          <GapWarningCard />
        </div>

        <MaterialBottomActions />
      </div>
    </AppLayout>
  );
}
