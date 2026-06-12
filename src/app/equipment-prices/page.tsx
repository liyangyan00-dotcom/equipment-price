"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Edit3,
  Eye,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, ModuleHeader } from "@/components/common";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import {
  equipmentKpis,
  equipmentPriceRecords,
  type EquipmentPriceRecord,
} from "@/data/mock/equipmentPrices";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";

const reviewLabel = {
  pending: "待审核",
  need_info: "需补充",
  confirmed: "已确认",
  rejected: "已退回",
  voided: "已作废",
} as const;

const kpiConfig = [
  {
    icon: Box,
    iconClassName: "from-blue-500 to-blue-600 text-white shadow-blue-500/25",
    valueClassName: "text-blue-600",
    waveClassName: "text-blue-400",
  },
  {
    icon: CheckCircle2,
    iconClassName: "from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25",
    valueClassName: "text-emerald-600",
    waveClassName: "text-emerald-400",
  },
  {
    icon: Bot,
    iconClassName: "from-violet-500 to-purple-600 text-white shadow-violet-500/25",
    valueClassName: "text-violet-600",
    waveClassName: "text-violet-400",
  },
  {
    icon: UserCheck,
    iconClassName: "from-amber-400 to-orange-500 text-white shadow-orange-500/25",
    valueClassName: "text-orange-500",
    waveClassName: "text-orange-400",
  },
  {
    icon: ShieldAlert,
    iconClassName: "from-red-400 to-red-600 text-white shadow-red-500/25",
    valueClassName: "text-red-500",
    waveClassName: "text-red-400",
  },
  {
    icon: BarChart3,
    iconClassName: "from-cyan-400 to-sky-500 text-white shadow-cyan-500/25",
    valueClassName: "text-sky-500",
    waveClassName: "text-sky-400",
  },
] as const;

const confidenceData = [
  { name: "90-100分", label: "高可信", value: 678, percent: "54.0%", color: "#2F6BFF" },
  { name: "70-89分", label: "较可信", value: 286, percent: "22.8%", color: "#58C29A" },
  { name: "50-69分", label: "一般", value: 162, percent: "12.9%", color: "#F5B84B" },
  { name: "30-49分", label: "较低", value: 85, percent: "6.8%", color: "#7C3AED" },
  { name: "0-29分", label: "低可信", value: 43, percent: "3.5%", color: "#EF5A5A" },
];

const anomalyItems = [
  { code: "EQP-2026-0010", name: "鼓风机", price: "7,801 USD", reason: "高于市场均价 32%", date: "2026-05-19", tone: "red" },
  { code: "EQP-2026-0008", name: "投加加药装置", price: "5,358 USD", reason: "高于市场均价 25%", date: "2026-05-20", tone: "red" },
  { code: "EQP-2026-0003", name: "电动蝶阀", price: "4,800 USD", reason: "低于市场均价 25%", date: "2026-05-16", tone: "orange" },
  { code: "EQP-2026-0006", name: "变频控制柜", price: "3,733 USD", reason: "高于市场均价 18%", date: "2026-05-17", tone: "orange" },
];

const inquiryTasks = [
  { supplier: "上海凯泉实业集团", equipment: "卧式离心泵", success: "92%" },
  { supplier: "格兰富水泵（上海）", equipment: "潜水排污泵", success: "88%" },
  { supplier: "正泰电气股份有限公司", equipment: "低压配电柜", success: "85%" },
];

const columns: DataTableColumn<EquipmentPriceRecord>[] = [
  { key: "equipmentCode", header: "设备编号", className: "min-w-[108px] whitespace-nowrap" },
  {
    key: "equipmentName",
    header: "设备名称",
    className: "min-w-[108px]",
    render: (row) => <span className="font-semibold text-textMain">{row.equipmentName}</span>,
  },
  { key: "category", header: "类别", className: "min-w-[70px] whitespace-nowrap" },
  { key: "specification", header: "规格型号", className: "min-w-[114px] whitespace-nowrap" },
  { key: "brand", header: "品牌", className: "min-w-[58px] whitespace-nowrap" },
  {
    key: "supplier",
    header: "供应商",
    className: "min-w-[118px] max-w-[140px] whitespace-nowrap",
    render: (row) => <span className="block truncate">{row.supplier}</span>,
  },
  {
    key: "originalPrice",
    header: "原始价格",
    align: "right",
    className: "min-w-[78px] whitespace-nowrap",
    render: (row) => <span className="font-semibold tabular-nums text-textMain">{row.originalPrice.toLocaleString("zh-CN")}</span>,
  },
  { key: "currency", header: "币种", className: "min-w-[48px] whitespace-nowrap" },
  {
    key: "usdPrice",
    header: "折算美元价",
    align: "right",
    className: "min-w-[84px] whitespace-nowrap",
    render: (row) => <span className="font-semibold tabular-nums text-textMain">{row.usdPrice.toLocaleString("zh-CN")}</span>,
  },
  {
    key: "confidence",
    header: "可信度",
    className: "min-w-[76px] whitespace-nowrap",
    render: (row) => (
      <div className="flex items-center gap-1">
        <ConfidenceBadge level={row.confidence} showPrefix={false} className="h-5 px-1.5 text-[11px]" />
        {row.aiRecommended ? <AiBadge label="AI" className="h-5 px-1.5 text-[10px]" /> : null}
      </div>
    ),
  },
  {
    key: "reviewStatus",
    header: "审核状态",
    className: "min-w-[74px] whitespace-nowrap",
    render: (row) => <StatusBadge status={row.reviewStatus} label={reviewLabel[row.reviewStatus]} className="h-5 text-[11px]" />,
  },
  {
    key: "updatedAt",
    header: "报价日期",
    className: "min-w-[82px] whitespace-nowrap",
    render: (row) => <span className="text-textMuted">{formatDate(row.updatedAt)}</span>,
  },
  {
    key: "actions",
    header: "操作",
    align: "center",
    className: "min-w-[76px] whitespace-nowrap",
    render: (row) => (
      <div className="flex items-center justify-center gap-2 text-primary">
        <Link href={`/equipment-prices/${row.id}`} aria-label="查看详情">
          <Eye className="size-4" />
        </Link>
        <button type="button" aria-label="编辑">
          <Edit3 className="size-4" />
        </button>
        <Link href="/equipment-prices/ai-recommendation" aria-label="AI推荐">
          <Bot className="size-4" />
        </Link>
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

function EquipmentKpiGrid() {
  return (
    <div className="grid gap-3 xl:grid-cols-6">
      {equipmentKpis.map((item, index) => {
        const config = kpiConfig[index];
        const Icon = config.icon;

        return (
          <section key={item.label} className="min-h-[90px] rounded-[10px] border border-borderSoft bg-white px-4 py-3 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className={cn("text-[13px] font-semibold", config.valueClassName)}>{item.label}</p>
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
    <div className={cn("min-w-0", wide ? "w-[160px]" : "w-[86px]")}>
      <div className="mb-1 text-[12px] font-semibold text-textSecondary">{label}</div>
      <button type="button" className="flex h-9 w-full items-center justify-between rounded-md border border-borderSoft bg-white px-2.5 text-[13px] text-textSecondary">
        <span>{wide ? "请输入关键词" : "全部"}</span>
        {wide ? <Search className="size-4 text-textMuted" /> : <ChevronDown className="size-4 text-textMuted" />}
      </button>
    </div>
  );
}

function EquipmentFilterPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="flex flex-wrap items-end gap-2">
        <FilterSelect label="设备名 / 型号 / 品牌" wide />
        <FilterSelect label="设备类别" />
        <FilterSelect label="供应商" />
        <FilterSelect label="币种" />
        <FilterSelect label="可信度" />
        <FilterSelect label="审核状态" />
        <FilterSelect label="报价日期" wide />
        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm">
          <Search className="size-4" />
          查询
        </button>
        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm">
          <RotateCcw className="size-4" />
          重置
        </button>
      </div>
    </section>
  );
}

function EquipmentActionBar() {
  const actions = [
    { label: "新增设备价格", icon: Plus, className: "bg-primary text-white border-primary" },
    { label: "上传报价", icon: Upload, className: "bg-white text-primary border-primary/20" },
    { label: "AI补全参数", icon: Sparkles, className: "bg-primary-soft text-primary border-primary/20" },
    { label: "AI推荐询价", icon: Bot, className: "bg-warning-soft text-[#C2410C] border-warning/30" },
    { label: "导出价格表", icon: Download, className: "bg-white text-primary border-primary/20" },
    { label: "更多操作", icon: MoreHorizontal, className: "bg-white text-textSecondary border-borderSoft" },
  ];

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button key={action.label} type="button" className={cn("inline-flex h-9 min-w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold shadow-sm", action.className)}>
            <Icon className="size-4" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

function RightAiCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: string;
}) {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-2.5 shadow-card">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-bold text-textMain">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[12px] text-textMuted">{subtitle}</p> : null}
        </div>
        <button type="button" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
          {action ?? "查看全部"}
          <ChevronRight className="size-3.5" />
        </button>
      </div>
      {children}
    </section>
  );
}

function EquipmentAiColumn() {
  return (
    <div className="space-y-2">
      <RightAiCard title="AI智能洞察" action="本月洞察">
        <div className="space-y-1">
          {[
            { icon: Bot, tone: "bg-ai-soft text-ai", title: "发现 12 条低可信价格", text: "可信度 < 70%，建议重点复核，避免预算风险。" },
            { icon: AlertTriangle, tone: "bg-warning-soft text-warning", title: "6 款设备存在价格波动较大", text: "较上月平均上涨 8.7%，建议关注市场变化。" },
            { icon: CheckCircle2, tone: "bg-success-soft text-success", title: "AI推荐询价成功率 88.9%", text: "通过相似匹配路径，已节省询价时间约 16h。" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-bg-muted)] px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", item.tone)}>
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-bold text-textMain">{item.title}</div>
                    <p className="truncate text-[11px] leading-4 text-textMuted">{item.text}</p>
                  </div>
                </div>
                <button type="button" className="shrink-0 text-[11px] font-semibold text-primary">详情</button>
              </div>
            );
          })}
        </div>
      </RightAiCard>

      <RightAiCard title="AI参数补全建议" subtitle="待处理 8 条">
        <div className="rounded-lg border border-borderSoft bg-[var(--color-bg-muted)] px-2.5 py-2">
          <div className="truncate text-[13px] font-bold text-primary">EQP-2026-0007 电磁流量计</div>
          <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
            <span className="rounded-md bg-white px-1.5 py-0.5 text-textSecondary">精度等级</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-textSecondary">输出信号</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-textSecondary">电源电压</span>
          </div>
          <button type="button" className="mt-1.5 h-6 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-white">应用建议</button>
        </div>
        <div className="mt-1.5 flex justify-center gap-2 text-primary">
          <span>‹</span>
          <span className="size-2 rounded-full bg-primary" />
          <span className="size-2 rounded-full bg-primary/30" />
          <span className="size-2 rounded-full bg-primary/30" />
          <span>›</span>
        </div>
      </RightAiCard>

      <RightAiCard title="AI相似价格匹配" subtitle="基于历史数据和规格相似度">
        <div className="rounded-lg border border-borderSoft bg-[var(--color-bg-muted)] px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-[13px] font-bold text-primary">EQP-2026-0001 卧式离心泵</div>
            <span className="shrink-0 rounded-md bg-success-soft px-1.5 py-0.5 text-[11px] font-semibold text-success">92%</span>
          </div>
          <div className="mt-1.5 grid grid-cols-[1fr_1fr_68px] gap-2 text-[11px] font-semibold text-textSecondary">
            <span>匹配设备</span>
            <span>规格型号</span>
            <span className="text-right">报价(CNY)</span>
          </div>
          {[
            ["EQP-2025-0412", "Q=500m3/h H=40m", "86,500"],
            ["EQP-2025-0321", "Q=520m3/h H=45m", "90,200"],
            ["EQP-2025-0188", "Q=480m3/h H=45m", "84,300"],
          ].map((row) => (
            <div key={row[0]} className="mt-1 grid grid-cols-[1fr_1fr_68px] gap-2 text-[11px] text-textSecondary">
              <span className="truncate">{row[0]}</span>
              <span className="truncate">{row[1]}</span>
              <span className="text-right tabular-nums">{row[2]}</span>
            </div>
          ))}
          <button type="button" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            更多匹配 <ChevronRight className="size-3.5" />
          </button>
        </div>
      </RightAiCard>
    </div>
  );
}

function ConfidenceDistributionCard() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-textMain">AI来源可信度评分分布</h3>
          <p className="text-[11px] text-textMuted">基于历史表现、证据完整度综合评估</p>
        </div>
        <button type="button" className="text-[11px] font-semibold text-primary">查看详情</button>
      </div>
      <div className="grid grid-cols-[150px_1fr] items-center gap-3">
        <div className="relative flex h-[138px] items-center justify-center">
          <PieChart width={138} height={138}>
            <Pie data={confidenceData} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={1} stroke="#fff" strokeWidth={2}>
              {confidenceData.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-bold text-textMain">1,254</span>
            <span className="text-[11px] font-medium text-textMuted">总数（条）</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {confidenceData.map((item) => (
            <div key={item.name} className="grid grid-cols-[14px_60px_1fr_68px] items-center gap-1.5 text-[11px]">
              <span className="size-2.5 rounded-sm" style={{ background: item.color }} />
              <span className="font-medium text-textSecondary">{item.name}</span>
              <span className="text-textMuted">{item.label}</span>
              <span className="text-right tabular-nums text-textSecondary">{item.value} ({item.percent})</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnomalyWarningCard() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-textMain">AI异常价格预警<span className="ml-1 text-[11px] text-textMuted">近30天</span></h3>
        </div>
        <button type="button" className="text-[11px] font-semibold text-primary">查看全部</button>
      </div>
      <div className="space-y-2">
        {anomalyItems.map((item) => (
          <div key={item.code} className="grid grid-cols-[16px_1fr_76px_1fr] items-center gap-2 text-[11px]">
            <span className={cn("flex size-4 items-center justify-center rounded-full text-[10px] text-white", item.tone === "red" ? "bg-danger" : "bg-warning")}>!</span>
            <div>
              <div className="font-semibold text-textMain">{item.code} {item.name}</div>
            </div>
            <div className="text-right text-textSecondary">折算价 {item.price}</div>
            <div className={cn("text-right", item.tone === "red" ? "text-danger" : "text-success")}>
              {item.reason}
              <div className="text-[11px] text-current/70">{item.date}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InquiryTaskCard() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-textMain">AI推荐询价任务</h3>
        </div>
        <div className="text-right text-[11px] text-textMuted">
          待处理 5 条
          <button type="button" className="ml-3 font-semibold text-primary">查看全部</button>
        </div>
      </div>
      <div className="space-y-1.5">
        {inquiryTasks.map((item) => (
          <div key={item.supplier} className="grid grid-cols-[1fr_1fr_54px_68px] items-center gap-2 rounded-lg border border-borderSoft px-2.5 py-1.5 text-[11px]">
            <span>推荐：{item.supplier}</span>
            <span>匹配设备：{item.equipment}</span>
            <span className="text-right font-semibold text-success">{item.success}</span>
            <button type="button" className="h-6 rounded-md border border-primary/20 bg-primary-soft text-[11px] font-semibold text-primary">去询价</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EquipmentPricesPage() {
  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader
          title="设备价格库"
          description="集中管理水厂机电设备价格、报价来源、供应商、可信度和风险状态。"
          actions={
            <>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm transition hover:border-primary/30 hover:text-primary">
                <Upload className="size-4" aria-hidden="true" />
                导入报价
              </button>
              <Link href="/equipment-prices/ai-recommendation" className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm transition hover:border-ai/40">
                <Search className="size-4" aria-hidden="true" />
                AI推荐
              </Link>
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90">
                <Plus className="size-4" aria-hidden="true" />
                新增设备价格
              </button>
            </>
          }
        />

        <EquipmentKpiGrid />
        <EquipmentFilterPanel />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,9fr)_minmax(300px,3fr)]">
          <div className="space-y-3">
            <EquipmentActionBar />
            <DataTable
              columns={columns}
              data={equipmentPriceRecords}
              rowKey="id"
              density="compact"
              actions={
                <ModuleHeader
                  icon={Database}
                  title="设备价格明细"
                  subtitle="设备编号、品牌、价格、审核与风险状态统一管理"
                  density="compact"
                />
              }
            />
          </div>
          <EquipmentAiColumn />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1.7fr]">
          <ConfidenceDistributionCard />
          <AnomalyWarningCard />
          <InquiryTaskCard />
        </div>
      </div>
    </AppLayout>
  );
}
