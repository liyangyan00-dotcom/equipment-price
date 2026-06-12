"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Download,
  GitCompareArrows,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Timer,
  UsersRound,
} from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { DataTable, ModuleHeader, PriceCell, TableActionGroup } from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  adoptionPlanData,
  highSpreadAlerts,
  inquiryKpis,
  inquiryTaskRecords,
  pendingTasks,
  supplierResponseRanking,
  type InquiryTaskRecord,
} from "@/data/mock/inquiries";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";

const kpiIcons = [ClipboardList, Send, CheckSquare, GitCompareArrows, ShieldAlert, Sparkles] as const;

const toneStyles = {
  blue: {
    box: "from-primary to-[#67A5FF] text-white shadow-[0_14px_28px_rgba(47,107,255,0.22)]",
    soft: "from-white to-primary-soft/70",
    text: "text-primary",
    badge: "bg-success-soft text-success",
  },
  cyan: {
    box: "from-[#22B8CF] to-[#8CE6F7] text-white shadow-[0_14px_28px_rgba(34,184,207,0.22)]",
    soft: "from-white to-[#ECFEFF]",
    text: "text-[#0E7490]",
    badge: "bg-success-soft text-success",
  },
  green: {
    box: "from-success to-[#7DDAA2] text-white shadow-[0_14px_28px_rgba(31,165,85,0.22)]",
    soft: "from-white to-success-soft/70",
    text: "text-success",
    badge: "bg-success-soft text-success",
  },
  orange: {
    box: "from-warning to-[#FFD37A] text-white shadow-[0_14px_28px_rgba(245,158,11,0.24)]",
    soft: "from-white to-warning-soft/70",
    text: "text-warning",
    badge: "bg-warning-soft text-warning",
  },
  red: {
    box: "from-danger to-[#FF8A8A] text-white shadow-[0_14px_28px_rgba(239,68,68,0.22)]",
    soft: "from-white to-danger-soft/70",
    text: "text-danger",
    badge: "bg-warning-soft text-[#B45309]",
  },
  purple: {
    box: "from-ai to-[#A78BFA] text-white shadow-ai",
    soft: "from-white to-ai-soft/70",
    text: "text-ai",
    badge: "bg-ai-soft text-ai",
  },
} as const;

const statusLabel = {
  created: "待发送",
  running: "询价中",
  completed: "已完成",
  needs_review: "待比价",
  needs_info: "需补充",
  confirmed: "已确认",
  rejected: "已退回",
  voided: "已作废",
} as const;

const planClassName = {
  "方案 A": "bg-primary-soft text-primary border-primary/20",
  "方案 B": "bg-success-soft text-success border-success/20",
  "需人工评估": "bg-warning-soft text-warning border-warning/20",
} as const;

function PrettyIcon({
  icon: Icon,
  tone = "blue",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: keyof typeof toneStyles;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-gradient-to-br",
        toneStyles[tone].box,
        size === "lg" ? "size-12 rounded-[16px]" : size === "md" ? "size-10 rounded-[13px]" : "size-8 rounded-[10px]",
      )}
    >
      <span className="absolute inset-1 rounded-[inherit] bg-white/10" />
      <Icon className={cn("relative", size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-4")} />
    </span>
  );
}

function InquiryKpiGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {inquiryKpis.map((item, index) => {
        const tone = item.tone;
        const Icon = kpiIcons[index];

        return (
          <section key={item.label} className={cn("min-h-[92px] rounded-card border border-borderSoft bg-gradient-to-br px-3.5 py-3 shadow-card", toneStyles[tone].soft)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-textSecondary">{item.label}</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className={cn("text-[28px] font-bold leading-8 tracking-normal", toneStyles[tone].text)}>{item.value}</span>
                  {item.unit ? <span className="mb-1 text-[12px] font-bold text-textMuted">{item.unit}</span> : null}
                </div>
              </div>
              <PrettyIcon icon={Icon} tone={tone} size="md" />
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

const columns: DataTableColumn<InquiryTaskRecord>[] = [
  {
    key: "select",
    header: "",
    className: "w-8 min-w-8",
    render: () => <input readOnly type="checkbox" className="accent-primary" />,
  },
  {
    key: "inquiryCode",
    header: "询价编号",
    className: "min-w-[128px] whitespace-nowrap",
    render: (row) => <span className="font-bold text-primary">{row.inquiryCode}</span>,
  },
  {
    key: "subject",
    header: "询价主题",
    className: "min-w-[150px]",
    render: (row) => <span className="font-semibold text-textMain">{row.subject}</span>,
  },
  {
    key: "relatedItem",
    header: "关联设备/材料",
    className: "min-w-[156px]",
    render: (row) => <span className="text-textSecondary">{row.relatedItem}</span>,
  },
  {
    key: "supplierCount",
    header: "供应商数量",
    align: "center",
    className: "min-w-[82px]",
    render: (row) => <span className="font-bold text-textMain">{row.supplierCount}</span>,
  },
  {
    key: "respondedCount",
    header: "已响应数量",
    align: "center",
    className: "min-w-[92px]",
    render: (row) => (
      <span className="font-bold text-success">
        {row.respondedCount} <span className="text-[11px]">({Math.round((row.respondedCount / row.supplierCount) * 100)}%)</span>
      </span>
    ),
  },
  {
    key: "lowestQuote",
    header: "最低报价",
    align: "right",
    className: "min-w-[126px]",
    render: (row) => (
      <div>
        <PriceCell value={row.lowestQuote} currency={row.currency} />
        <div className="text-[10px] text-textMuted">{row.lowestSupplier}</div>
      </div>
    ),
  },
  {
    key: "highestQuote",
    header: "最高报价",
    align: "right",
    className: "min-w-[126px]",
    render: (row) => (
      <div>
        <PriceCell value={row.highestQuote} currency={row.currency} />
        <div className="text-[10px] text-textMuted">{row.highestSupplier}</div>
      </div>
    ),
  },
  {
    key: "differenceRate",
    header: "价差差异",
    align: "right",
    className: "min-w-[86px]",
    render: (row) => (
      <span className={cn("font-bold tabular-nums", row.differenceRate > 50 ? "text-danger" : "text-danger/80")}>
        +{row.differenceRate}%
      </span>
    ),
  },
  {
    key: "aiPlan",
    header: "AI建议",
    className: "min-w-[96px]",
    render: (row) => <span className={cn("rounded-pill border px-2 py-1 text-[11px] font-bold", planClassName[row.aiPlan])}>采用{row.aiPlan}</span>,
  },
  {
    key: "status",
    header: "状态",
    className: "min-w-[82px]",
    render: (row) => <StatusBadge status={row.status} label={statusLabel[row.status]} className="h-5 text-[11px]" />,
  },
  {
    key: "riskLevel",
    header: "风险",
    className: "min-w-[82px]",
    render: (row) => <RiskBadge level={row.riskLevel} className="h-5 text-[11px]" />,
  },
  {
    key: "actions",
    header: "操作",
    align: "right",
    className: "min-w-[132px]",
    render: (row) => (
      <TableActionGroup
        actions={[
          { label: "查看", icon: ClipboardList, tone: "default" },
          { label: "比价", icon: GitCompareArrows, tone: "ai", href: `/comparisons/${row.inquiryCode}` },
        ]}
      />
    ),
  },
];

function FilterSelectField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <button
      className={cn("grid h-9 grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-left text-[12px] shadow-[0_1px_0_rgba(15,23,42,0.02)]", className)}
      type="button"
    >
      <span className="whitespace-nowrap font-semibold text-textSecondary">{label}</span>
      <span className="min-w-0 truncate font-medium text-textMuted">{value}</span>
      <ChevronDown className="size-3.5 text-textMuted" />
    </button>
  );
}

function DateRangeField() {
  return (
    <button
      className="grid h-9 min-w-[260px] grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-left text-[12px] shadow-[0_1px_0_rgba(15,23,42,0.02)]"
      type="button"
    >
      <span className="whitespace-nowrap font-semibold text-textSecondary">创建时间</span>
      <span className="truncate font-medium text-textMuted">开始日期</span>
      <span className="text-textMuted">→</span>
      <span className="truncate font-medium text-textMuted">结束日期</span>
      <CalendarDays className="size-3.5 text-textMuted" />
    </button>
  );
}

function HeaderActions() {
  return (
    <>
      <Link href="/inquiries/create" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm">
        <Plus className="size-4" />
        新建询价任务
      </Link>
      <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm" type="button">
        <Download className="size-4" />
        导出比价
      </button>
      <button className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm" type="button">
        <Sparkles className="size-4" />
        AI比价建议
      </button>
    </>
  );
}

function FilterBar() {
  return (
    <section className="rounded-card border border-borderSoft bg-white px-3 py-2.5 shadow-card">
      <div className="grid items-center gap-2 xl:grid-cols-[minmax(260px,1.35fr)_minmax(148px,0.58fr)_minmax(180px,0.75fr)_minmax(260px,1.05fr)_minmax(148px,0.58fr)_56px_64px]">
        <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-3 text-[12px] text-textMuted shadow-[0_1px_0_rgba(15,23,42,0.02)]">
          <Search className="size-4" />
          <input className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-textMuted" placeholder="搜索询价编号/主题" />
        </label>
        <FilterSelectField label="状态" value="全部" />
        <FilterSelectField label="关联类型" value="全部" />
        <DateRangeField />
        <FilterSelectField label="供应商" value="全部" />
        <button className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary shadow-sm" type="button">
          <RefreshCw className="size-3.5" />
          重置
        </button>
        <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(47,107,255,0.24)]" type="button">
          查询
        </button>
      </div>
    </section>
  );
}

function BatchToolbar() {
  return (
    <section className="rounded-card border border-borderSoft bg-white px-3 py-2 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] text-textSecondary">
          <input readOnly type="checkbox" className="accent-primary" />
          <span>已选择 <b className="text-textMain">0</b> 项</span>
          <button className="h-7 rounded-md border border-borderSoft bg-white px-2.5 font-semibold" type="button">批量发送</button>
          <Link href="/comparisons/INQ-202506-001" className="inline-flex h-7 items-center rounded-md border border-borderSoft bg-white px-2.5 font-semibold">进入比价</Link>
          <button className="h-7 rounded-md border border-borderSoft bg-white px-2.5 font-semibold" type="button">生成比价说明</button>
          <button className="h-7 rounded-md border border-borderSoft bg-white px-2.5 font-semibold" type="button">导出所选</button>
          <button className="h-7 rounded-md border border-borderSoft bg-white px-2.5 font-semibold" type="button">更多操作</button>
        </div>
        <button className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] font-semibold text-textSecondary" type="button">
          <RefreshCw className="size-3.5" />
          重新加载
        </button>
      </div>
    </section>
  );
}

function AiComparisonAssistant() {
  return (
    <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-3 shadow-card">
      <ModuleHeader icon={Sparkles} title="AI比价助手" subtitle="本周任务、响应与建议采用分析" tone="purple" density="compact" action={<button className="text-[11px] font-semibold text-ai">查看比价详情</button>} />
      <div className="mt-3 space-y-2 text-[12px]">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 text-ai" />
          <span>本周新增 <b>8</b> 个询价任务，已响应 <b>72</b> 个供应商报价</span>
        </div>
        <div className="flex items-start gap-2">
          <GitCompareArrows className="mt-0.5 size-4 text-ai" />
          <span>平均价格差异 <b>48.6%</b>，较上周上升 <b>6.2%</b></span>
        </div>
        <div className="flex items-start gap-2">
          <Target className="mt-0.5 size-4 text-ai" />
          <span>AI建议采用率 <b>43.1%</b>，可节约成本约 <b>CDF 1,256,800</b></span>
        </div>
      </div>
      <button className="mt-3 h-8 w-full rounded-md border border-ai-border bg-white text-[12px] font-semibold text-ai" type="button">生成比价说明</button>
    </section>
  );
}

function HighSpreadReminder() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <ModuleHeader
        icon={AlertTriangle}
        title="高差异报价提醒"
        tone="red"
        density="compact"
        action={<button className="text-[11px] font-semibold text-primary" type="button">查看全部 9 条 〉</button>}
      />
      <div className="mt-3 space-y-2">
        {highSpreadAlerts.map((item) => (
          <div key={item.code} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[12px]">
            <div className="min-w-0">
              <div className="truncate font-bold text-textMain">{item.code}</div>
              <div className="truncate text-textMuted">{item.title}</div>
            </div>
            <span className="rounded-pill bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger">差异 {item.rate}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdoptionPlanPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <ModuleHeader
        icon={PieChartIcon}
        title="推荐采用方案"
        tone="purple"
        density="compact"
        action={<button className="text-[11px] font-semibold text-primary" type="button">查看全部建议 〉</button>}
      />
      <div className="mt-2 grid grid-cols-[116px_1fr] items-center gap-3">
        <div className="relative flex h-[112px] items-center justify-center">
          <PieChart width={112} height={112}>
            <Pie data={adoptionPlanData} dataKey="value" innerRadius={34} outerRadius={50} paddingAngle={1} stroke="#fff" strokeWidth={2}>
              {adoptionPlanData.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-bold text-textMain">31</span>
            <span className="text-[10px] text-textMuted">个建议</span>
          </div>
        </div>
        <div className="space-y-2.5">
          {adoptionPlanData.map((item) => (
            <div key={item.label} className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-[12px]">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-textSecondary">{item.label}</span>
              <span className="font-semibold text-textMain">{item.value} <span className="text-textMuted">({item.percent})</span></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupplierResponsePanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <ModuleHeader
        icon={UsersRound}
        title="供应商响应监测"
        tone="purple"
        density="compact"
        action={<button className="text-[11px] font-semibold text-primary" type="button">发送提醒 〉</button>}
      />
      <div className="mt-3 grid grid-cols-3 divide-x divide-borderSoft rounded-lg bg-white py-2 text-center">
        <div>
          <div className="text-[11px] font-semibold text-textSecondary">响应及时率</div>
          <div className="mt-1 text-[25px] font-bold leading-7 text-primary">82%</div>
          <div className="mt-0.5 text-[10px] font-bold text-success">较上月 +6.1%</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-textSecondary">未响应供应商</div>
          <div className="mt-1 text-[25px] font-bold leading-7 text-textMain">12 <span className="text-[11px] text-textMuted">家</span></div>
          <div className="mt-0.5 text-[10px] text-textMuted">占比 18%</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-textSecondary">需跟进供应商</div>
          <div className="mt-1 text-[25px] font-bold leading-7 text-success">8 <span className="text-[11px] text-textMuted">家</span></div>
          <div className="mt-0.5 text-[10px] font-bold text-success">较上月 -2 家</div>
        </div>
      </div>
    </section>
  );
}

function RightAiStack() {
  return (
    <div className="space-y-3">
      <AiComparisonAssistant />
      <HighSpreadReminder />
      <AdoptionPlanPanel />
      <SupplierResponsePanel />
    </div>
  );
}

function BottomStatusAnalysis() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr]">
      <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
        <ModuleHeader icon={BarChart3} title="供应商响应概览" subtitle="本周响应优先级统计" tone="blue" density="compact" />
        <div className="mt-3 space-y-2">
          {supplierResponseRanking.map((item) => (
            <div key={item.name} className="grid grid-cols-[150px_1fr_52px] items-center gap-2 text-[12px]">
              <span className="truncate font-medium text-textSecondary">{item.name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[#EEF3F8]">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
              </span>
              <span className="text-right font-semibold text-textMain">{item.count}</span>
            </div>
          ))}
        </div>
        <button className="mt-3 text-[12px] font-semibold text-primary" type="button">查看响应明细表</button>
      </section>

      <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
        <ModuleHeader icon={Timer} title="待处理任务" subtitle="需要您关注的事项" tone="purple" density="compact" />
        <div className="mt-3 space-y-2">
          {pendingTasks.map((item) => (
            <div key={item.code} className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-2 border-b border-borderSoft pb-2 text-[12px] last:border-b-0 last:pb-0">
              <span className="flex size-6 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <ClipboardList className="size-3.5" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-bold text-textMain">{item.code}</div>
                <div className="truncate text-textSecondary">{item.title}</div>
              </div>
              <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning">{item.status}</span>
              <span className="whitespace-nowrap text-[11px] font-medium text-textMuted">{item.age}</span>
            </div>
          ))}
        </div>
        <button className="mt-3 text-[12px] font-semibold text-primary" type="button">查看所有待办 〉</button>
      </section>

      <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
        <ModuleHeader icon={AlertTriangle} title="风险报价关注" subtitle="重点记录的风险信息" tone="red" density="compact" />
        <div className="mt-3 space-y-2">
          {inquiryTaskRecords.slice(0, 3).map((item) => (
            <div key={item.id} className="grid grid-cols-[22px_1fr_auto_auto] items-center gap-2 border-b border-borderSoft pb-2 text-[12px] last:border-b-0 last:pb-0">
              <AlertTriangle className={cn("size-4", item.riskLevel === "high" ? "text-danger" : "text-warning")} />
              <div className="min-w-0">
                <div className="truncate font-bold text-textMain">{item.inquiryCode}　{item.subject}</div>
                <div className="truncate text-textSecondary">最高价较最低价高出 CDF {(item.highestQuote - item.lowestQuote).toLocaleString("zh-CN")}（{item.differenceRate}%）</div>
              </div>
              <RiskBadge level={item.riskLevel} className="h-5 text-[11px]" />
              <button className="whitespace-nowrap text-[11px] font-semibold text-primary" type="button">查看详情 〉</button>
            </div>
          ))}
        </div>
        <button className="mt-3 text-[12px] font-semibold text-primary" type="button">查看全部风险预警 〉</button>
      </section>
    </div>
  );
}

function FloatingBatchBar() {
  return (
    <div className="sticky bottom-3 z-20 mx-auto flex w-fit items-center gap-3 rounded-card border border-borderSoft bg-white/95 px-5 py-2 shadow-[0_12px_36px_rgba(15,23,42,0.18)] backdrop-blur">
      <span className="text-[13px] text-textSecondary">已选择 <b className="text-textMain">0</b> 项询价任务</span>
      <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-semibold text-white" type="button">
        <Send className="size-4" />
        批量发送
      </button>
      <Link href="/comparisons/INQ-202506-001" className="inline-flex h-9 items-center gap-2 rounded-md bg-warning px-4 text-[13px] font-semibold text-white">
        <GitCompareArrows className="size-4" />
        进入比价
      </Link>
      <button className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-4 text-[13px] font-semibold text-white" type="button">
        <Sparkles className="size-4" />
        AI生成说明
      </button>
      <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary" type="button">
        <Download className="size-4" />
        导出
      </button>
    </div>
  );
}

export default function InquiriesPage() {
  return (
    <AppLayout>
      <div className="space-y-3 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[24px] font-bold leading-8 text-textMain">询价与比价管理</h1>
            <p className="mt-1 text-[13px] text-textMuted">集中管理询价任务、供应商响应、报价对比结果与 AI 比价建议。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HeaderActions />
          </div>
        </div>

        <InquiryKpiGrid />
        <FilterBar />
        <BatchToolbar />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,8.2fr)_minmax(320px,2.8fr)]">
          <DataTable
            columns={columns}
            data={inquiryTaskRecords}
            rowKey="id"
            density="compact"
            actions={<ModuleHeader icon={ClipboardList} title="询价任务列表" subtitle="询价主题、响应数量、报价区间、AI建议与风险状态" density="compact" />}
          />
          <RightAiStack />
        </div>

        <BottomStatusAnalysis />
        <FloatingBatchBar />
      </div>
    </AppLayout>
  );
}
