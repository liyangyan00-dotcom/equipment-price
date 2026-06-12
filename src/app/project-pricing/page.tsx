"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderSearch,
  HandCoins,
  PieChart as PieChartIcon,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { DataTable, ModuleHeader, PriceCell, TableActionGroup } from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  boqParseDistribution,
  costRiskSummary,
  feeSummary,
  projectInfo,
  projectPricingKpis,
  projectPricingRows,
  recommendedPriceSources,
  unmatchedReasons,
  type ProjectPricingRow,
} from "@/data/mock/projectPricing";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";

const toneStyles = {
  blue: {
    icon: "from-primary to-[#67A5FF] text-white shadow-[0_14px_28px_rgba(47,107,255,0.22)]",
    card: "from-white to-primary-soft/70",
    text: "text-primary",
  },
  green: {
    icon: "from-success to-[#7DDAA2] text-white shadow-[0_14px_28px_rgba(31,165,85,0.22)]",
    card: "from-white to-success-soft/70",
    text: "text-success",
  },
  orange: {
    icon: "from-warning to-[#FFD37A] text-white shadow-[0_14px_28px_rgba(245,158,11,0.24)]",
    card: "from-white to-warning-soft/70",
    text: "text-warning",
  },
  red: {
    icon: "from-danger to-[#FF8A8A] text-white shadow-[0_14px_28px_rgba(239,68,68,0.22)]",
    card: "from-white to-danger-soft/70",
    text: "text-danger",
  },
  purple: {
    icon: "from-ai to-[#A78BFA] text-white shadow-ai",
    card: "from-white to-ai-soft/70",
    text: "text-ai",
  },
} as const;

const kpiIcons = [Database, CheckCircle2, Search, CircleHelp, Database, AlertTriangle] as const;

const matchClassName = {
  精准匹配: "bg-success-soft text-success",
  相似匹配: "bg-primary-soft text-primary",
  类型匹配: "bg-warning-soft text-warning",
  无匹配: "bg-danger-soft text-danger",
} as const;

const columns: DataTableColumn<ProjectPricingRow>[] = [
  {
    key: "boqCode",
    header: "BOQ编号",
    className: "min-w-[126px]",
    render: (row) => <span className="font-bold text-primary">{row.boqCode}</span>,
  },
  {
    key: "itemName",
    header: "项目名称",
    className: "min-w-[132px]",
    render: (row) => <span className="font-semibold text-textMain">{row.itemName}</span>,
  },
  { key: "specification", header: "规格型号", className: "min-w-[126px]" },
  {
    key: "quantity",
    header: "数量",
    align: "right",
    className: "min-w-[64px]",
    render: (row) => <span className="font-bold tabular-nums text-textMain">{row.quantity.toLocaleString("zh-CN")}</span>,
  },
  { key: "unit", header: "单位", align: "center", className: "min-w-[54px]" },
  {
    key: "matchedPrice",
    header: "匹配价格(USD)",
    align: "right",
    className: "min-w-[116px]",
    render: (row) => row.matchedPrice ? <PriceCell value={row.matchedPrice} currency={row.currency} /> : <span className="font-bold text-textMuted">-</span>,
  },
  { key: "priceSource", header: "价格来源", className: "min-w-[100px]" },
  { key: "supplier", header: "供应商", className: "min-w-[132px]" },
  {
    key: "confidence",
    header: "可信度",
    className: "min-w-[98px]",
    render: (row) => <ConfidenceBadge level={row.confidence} showPrefix={false} className="h-5 text-[11px]" />,
  },
  {
    key: "matchLevel",
    header: "匹配等级",
    className: "min-w-[94px]",
    render: (row) => <span className={cn("rounded-pill px-2 py-1 text-[11px] font-bold", matchClassName[row.matchLevel])}>{row.matchLevel}</span>,
  },
  {
    key: "needsInquiry",
    header: "是否需重新询价",
    align: "center",
    className: "min-w-[112px]",
    render: (row) => <span className={cn("font-bold", row.needsInquiry ? "text-danger" : "text-textSecondary")}>{row.needsInquiry ? "是" : "否"}</span>,
  },
  {
    key: "actions",
    header: "操作",
    align: "right",
    className: "min-w-[104px]",
    render: (row) => (
      <TableActionGroup
        actions={[
          { label: "查看", icon: FolderSearch, tone: "default" },
          row.needsInquiry ? { label: "询价", icon: Send, tone: "ai", href: "/inquiries/create" } : { label: "替换", icon: RefreshCw, tone: "primary" },
        ]}
      />
    ),
  },
];

function KpiGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {projectPricingKpis.map((item, index) => {
        const Icon = kpiIcons[index];
        const tone = toneStyles[item.tone];

        return (
          <section key={item.label} className={cn("min-h-[92px] rounded-card border border-borderSoft bg-gradient-to-br px-3 py-3 shadow-card", tone.card)}>
            <div className="flex items-center gap-3">
              <span className={cn("relative flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-gradient-to-br", tone.icon)}>
                <span className="absolute inset-1 rounded-[inherit] bg-white/10" />
                <Icon className="relative size-5" />
              </span>
              <div className="min-w-0">
                <p className={cn("truncate text-[12px] font-bold", tone.text)}>{item.label}</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className={cn("text-[25px] font-bold leading-7", tone.text)}>{item.value}</span>
                  {item.unit ? <span className="mb-0.5 text-[11px] font-bold text-textMuted">{item.unit}</span> : null}
                </div>
                <p className="mt-1 truncate text-[10px] font-semibold text-textSecondary">{item.trend}</p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function UploadAndProjectInfo() {
  return (
    <section className="flex h-full min-h-[270px] flex-col rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={UploadCloud} title="1. 项目信息与BOQ上传" tone="blue" density="compact" />
      <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary-soft/50 p-5 text-center">
        <UploadCloud className="size-14 text-primary" />
        <div className="mt-4 text-[16px] font-bold text-primary">上传 BOQ 文件</div>
        <p className="mt-1 text-[12px] leading-5 text-textMuted">支持 .xlsx / .xls / .csv / .xml</p>
        <button className="mt-2 rounded-pill bg-white px-3 py-1 text-[12px] font-bold text-primary shadow-sm" type="button">点击上传</button>
      </div>
    </section>
  );
}

function ProjectInfoPanel() {
  return (
    <section className="flex h-full min-h-[270px] flex-col rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-borderSoft">
        {projectInfo.map((item, index) => (
          <div key={item.label} className="grid min-h-[38px] flex-1 grid-cols-[116px_1fr_auto] items-center border-b border-borderSoft last:border-b-0">
            <div className="px-4 py-3.5 text-[12px] font-bold text-textSecondary">{item.label}</div>
            <div className="px-4 py-3.5 text-[12px] font-semibold text-textMain">{item.value}</div>
            {index === 0 ? (
              <button className="mr-2 h-7 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-bold text-primary" type="button">
                编辑
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BoqParsePanel() {
  return (
    <section className="flex h-full min-h-[270px] flex-col rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader
        icon={Sparkles}
        title="2. AI解析BOQ"
        tone="purple"
        density="compact"
        action={<span className="inline-flex items-center gap-1 text-[11px] font-bold text-success"><CheckCircle2 className="size-3.5" />解析完成</span>}
      />
      <div className="mt-5 grid min-h-0 flex-1 grid-cols-[170px_1fr] items-start gap-4 pt-1">
        <div className="relative h-[170px]">
          <PieChart width={170} height={170}>
            <Pie data={boqParseDistribution} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={1} stroke="#fff" strokeWidth={2}>
              {boqParseDistribution.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-bold text-textMain">156</span>
            <span className="text-[11px] font-semibold text-textMuted">总项数</span>
          </div>
        </div>
        <div className="space-y-2.5">
          {boqParseDistribution.map((item) => (
            <div key={item.name} className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-3 text-[12px]">
              <span className="size-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-textSecondary">{item.name}</span>
              <span className="font-bold text-textMain">{item.value}</span>
              <span className="text-textMuted">{item.percent}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto grid grid-cols-[1fr_auto] items-center gap-3 border-t border-borderSoft pt-2 text-[11px] leading-5 text-textMuted">
        <div>
          <div>识别文件：机电设备清单_20250520.xlsx</div>
          <div>解析时间：2026-05-20 14:30　耗时：18s</div>
        </div>
        <button className="h-7 rounded-md border border-primary/20 bg-primary-soft px-3 text-[11px] font-bold text-primary" type="button">重新解析</button>
      </div>
    </section>
  );
}

function FeeSummaryPanel() {
  const total = feeSummary.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="flex h-full min-h-[270px] flex-col rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={HandCoins} title="费用汇总（USD）" tone="blue" density="compact" action={<button className="text-[11px] font-bold text-primary" type="button">查看明细</button>} />
      <div className="mt-2.5 flex-1 space-y-2">
        {feeSummary.map((item) => (
          <div key={item.label} className="grid grid-cols-[18px_1fr_auto] items-center gap-3 border-b border-borderSoft pb-1.5 text-[12px] last:border-b-0">
            <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-bold text-textSecondary">{item.label}</span>
            <span className={cn("font-bold tabular-nums", item.label.includes("未匹配") ? "text-danger" : "text-textMain")}>{item.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-borderSoft pt-3">
        <span className="text-[13px] font-bold text-textMain">项目总价（含税）</span>
        <span className="text-[24px] font-bold leading-7 text-ai">{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      </div>
    </section>
  );
}

function FilterBar() {
  return (
    <div className="grid items-center gap-2 border-b border-borderSoft px-3 py-2.5 xl:grid-cols-[150px_130px_130px_1fr_76px_64px]">
      <span className="text-[13px] font-bold text-textMain">3. AI自动套价结果</span>
      <button className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[12px] font-semibold text-textSecondary" type="button">全部匹配等级</button>
      <button className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[12px] font-semibold text-textSecondary" type="button">全部分类</button>
      <label className="flex h-8 min-w-0 items-center gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-3 text-[12px] text-textMuted">
        <Search className="size-3.5" />
        <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-textMuted" placeholder="请输入 BOQ 编号 / 名称 / 规格型号" />
      </label>
      <button className="h-8 rounded-md bg-primary px-3 text-[12px] font-bold text-white" type="button">搜索</button>
      <button className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[12px] font-semibold text-textSecondary" type="button">重置</button>
    </div>
  );
}

function PricingTable() {
  return (
    <DataTable
      columns={columns}
      data={projectPricingRows}
      rowKey="id"
      density="compact"
      actions={<FilterBar />}
      className="min-h-[410px]"
    />
  );
}

function RecommendedSourcesPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={PieChartIcon} title="4. AI推荐价格来源（Top 5）" tone="purple" density="compact" />
      <div className="mt-2 grid grid-cols-[118px_1fr] items-center gap-3">
        <div className="relative h-[118px]">
          <PieChart width={118} height={118}>
            <Pie data={recommendedPriceSources} dataKey="value" innerRadius={34} outerRadius={54} paddingAngle={1} stroke="#fff" strokeWidth={2}>
              {recommendedPriceSources.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </div>
        <div className="space-y-1.5">
          {recommendedPriceSources.map((item, index) => (
            <div key={item.label} className="grid grid-cols-[18px_1fr_auto_auto] items-center gap-1.5 text-[11px]">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">{index + 1}</span>
              <span className="truncate font-semibold text-textSecondary">{item.label}</span>
              <span className="font-bold text-textMain">{item.value} 项</span>
              <span className="text-textMuted">{item.percent}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UnmatchedPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={CircleHelp} title="5. AI无匹配项建议（17项）" tone="orange" density="compact" />
      <div className="mt-2 space-y-2">
        {unmatchedReasons.map((item) => (
          <div key={item.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[12px]">
            <span className="font-semibold text-textSecondary">{item.label}</span>
            <span className="font-bold text-textMain">{item.value} 项</span>
            <span className="text-textMuted">{item.percent}</span>
          </div>
        ))}
      </div>
      <button className="mt-3 w-full rounded-md border border-primary/20 bg-primary-soft py-2 text-[12px] font-bold text-primary" type="button">查看详情</button>
    </section>
  );
}

function MiniDecisionCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="rounded-card border border-danger/20 bg-white p-3 shadow-card">
        <ModuleHeader icon={AlertTriangle} title="6. AI成本风险预警" subtitle="（12项）" tone="red" density="compact" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {costRiskSummary.map((item) => (
            <div
              key={item.label}
              className={cn(
                "rounded-lg border px-2 py-2 text-center",
                item.tone === "red" && "border-danger/15 bg-danger-soft/60",
                item.tone === "orange" && "border-warning/20 bg-warning-soft/70",
                item.tone === "green" && "border-success/20 bg-success-soft/70"
              )}
            >
              <div className={cn("text-[12px] font-bold", item.tone === "red" ? "text-danger" : item.tone === "orange" ? "text-warning" : "text-success")}>{item.label}</div>
              <div className={cn("mt-1 text-[18px] font-bold", item.tone === "red" ? "text-danger" : item.tone === "orange" ? "text-warning" : "text-success")}>{item.value} 项</div>
            </div>
          ))}
        </div>
        <button className="mt-3 w-full rounded-md bg-white py-1.5 text-[12px] font-bold text-primary" type="button">查看风险清单 ›</button>
      </section>
      <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-4 shadow-card">
        <ModuleHeader icon={FileText} title="7. AI生成测算报告" subtitle="基于AI匹配结果生成项目测算报告..." tone="purple" density="compact" />
        <button className="mt-6 h-11 w-full rounded-md bg-ai text-[14px] font-bold text-white shadow-ai" type="button">预览报告</button>
      </section>
    </div>
  );
}

function BottomActions() {
  const actions = [
    { label: "AI 自动套价", desc: "推荐优先", icon: WandSparkles, className: "bg-primary text-white border-primary" },
    { label: "手动选价", desc: "人工干预", icon: HandCoins, className: "bg-white text-primary border-primary/30" },
    { label: "生成询价任务", desc: "针对未匹配项", icon: Send, className: "bg-warning-soft text-warning border-warning/40" },
    { label: "导出套价表（Excel）", desc: "包含匹配明细", icon: FileSpreadsheet, className: "bg-success-soft text-success border-success/40" },
    { label: "生成测算报告", desc: "含风险与建议", icon: FileText, className: "bg-ai-soft text-ai border-ai-border" },
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-5">
      {actions.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <Icon className="size-5" />
            <span>
              <span className="block text-[16px] font-bold leading-5">{item.label}</span>
              <span className="mt-0.5 block text-[11px] font-semibold opacity-75">{item.desc}</span>
            </span>
          </>
        );

        if (item.label.includes("询价")) {
          return (
            <Link key={item.label} href="/inquiries/create" className={cn("flex h-[62px] items-center justify-center gap-3 rounded-card border shadow-card", item.className)}>
              {content}
            </Link>
          );
        }

        return (
          <button key={item.label} className={cn("flex h-[62px] items-center justify-center gap-3 rounded-card border shadow-card", item.className)} type="button">
            {content}
          </button>
        );
      })}
    </div>
  );
}

export default function ProjectPricingPage() {
  return (
    <AppLayout>
      <div className="space-y-3 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[24px] font-bold leading-8 text-textMain">AI增强项目套价中心</h1>
            <p className="mt-1 text-[13px] text-textMuted">上传 BOQ、AI解析清单、自动匹配价格来源，并形成项目套价与询价任务。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-3 text-[13px] font-semibold text-white shadow-ai" type="button">
              <WandSparkles className="size-4" />
              AI自动套价
            </button>
            <Link href="/inquiries/create" className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm">
              <Send className="size-4" />
              生成询价任务
            </Link>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm" type="button">
              <Download className="size-4" />
              导出套价表
            </button>
          </div>
        </div>

        <KpiGrid />

        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(260px,1.5fr)_minmax(300px,1.9fr)_minmax(0,2.6fr)_minmax(300px,1.8fr)] xl:[&>section]:h-[270px]">
          <UploadAndProjectInfo />
          <ProjectInfoPanel />
          <BoqParsePanel />
          <FeeSummaryPanel />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,7.4fr)_minmax(300px,2.6fr)]">
          <PricingTable />
          <div className="space-y-3">
            <RecommendedSourcesPanel />
            <UnmatchedPanel />
            <MiniDecisionCards />
          </div>
        </div>

        <BottomActions />
      </div>
    </AppLayout>
  );
}
