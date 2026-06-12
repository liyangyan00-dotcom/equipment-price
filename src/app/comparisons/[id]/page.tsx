"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BellRing,
  Bot,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  GitCompareArrows,
  Lightbulb,
  PieChart as PieChartIcon,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { StatusBadge } from "@/components/badges";
import { DataTable, ModuleHeader, TableActionGroup } from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  autoAnalysisRank,
  businessRiskItems,
  comparisonDecisionOptions,
  comparisonFindings,
  comparisonPreviewRows,
  comparisonSummary,
  comparisonTasks,
  followUpSuggestions,
  generatedFiles,
  insightSummary,
  negotiationSuggestions,
  techDeviationItems,
  type ComparisonTaskRecord,
} from "@/data/mock/comparisons";
import { cn } from "@/lib/utils";
import type { AiTaskStatus, DataTableColumn, ReviewStatus } from "@/types/common";

const toneStyles = {
  blue: {
    card: "from-white to-primary-soft/70",
    icon: "from-primary to-[#67A5FF]",
    text: "text-primary",
    soft: "bg-primary-soft text-primary border-primary/15",
  },
  green: {
    card: "from-white to-success-soft/70",
    icon: "from-success to-[#7DDAA2]",
    text: "text-success",
    soft: "bg-success-soft text-success border-success/15",
  },
  orange: {
    card: "from-white to-warning-soft/70",
    icon: "from-warning to-[#FFD37A]",
    text: "text-warning",
    soft: "bg-warning-soft text-warning border-warning/20",
  },
  red: {
    card: "from-white to-danger-soft/70",
    icon: "from-danger to-[#FF8A8A]",
    text: "text-danger",
    soft: "bg-danger-soft text-danger border-danger/20",
  },
  purple: {
    card: "from-white to-ai-soft/70",
    icon: "from-ai to-[#A78BFA]",
    text: "text-ai",
    soft: "bg-ai-soft text-ai border-ai-border",
  },
} as const;

const kpiIcons = [GitCompareArrows, Send, ClipboardCheck, Bot, ShieldAlert, Star] as const;

const comparisonStatusVariants: Record<ComparisonTaskRecord["status"], ReviewStatus | AiTaskStatus> = {
  报价中: "running",
  询价中: "running",
  已回收: "confirmed",
  AI分析中: "running",
  已发送: "completed",
};

const semanticStatusVariants: Record<string, ReviewStatus | AiTaskStatus> = {
  推荐: "confirmed",
  备选: "needs_review",
  谨慎: "need_info",
  低: "confirmed",
  中: "needs_review",
  高: "rejected",
};

const premiumIconStyles = {
  blue: "from-primary to-[#6EA8FF] text-white shadow-[0_10px_24px_rgba(47,107,255,0.22)] ring-primary/15",
  green: "from-success to-[#7DDAA2] text-white shadow-[0_10px_24px_rgba(34,197,94,0.20)] ring-success/15",
  orange: "from-warning to-[#FFD37A] text-white shadow-[0_10px_24px_rgba(245,158,11,0.20)] ring-warning/20",
  red: "from-danger to-[#FF8A8A] text-white shadow-[0_10px_24px_rgba(239,68,68,0.20)] ring-danger/20",
  purple: "from-ai to-[#A78BFA] text-white shadow-[0_10px_24px_rgba(119,84,246,0.22)] ring-ai/15",
  slate: "from-slate-500 to-slate-300 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-slate-300/40",
} as const;

const premiumIconSizes = {
  xs: { box: "size-6 rounded-lg", icon: "size-3.5" },
  sm: { box: "size-8 rounded-[10px]", icon: "size-4" },
  md: { box: "size-10 rounded-[13px]", icon: "size-5" },
  lg: { box: "size-12 rounded-[16px]", icon: "size-6" },
} as const;

const recommendationPieData = [
  { name: "方案 A", value: 19, percent: "61.3%", color: "#2F6BFF" },
  { name: "方案 B", value: 10, percent: "32.3%", color: "#24A15C" },
  { name: "需人工评估", value: 2, percent: "6.5%", color: "#64748B" },
];

const columns: DataTableColumn<ComparisonTaskRecord>[] = [
  {
    key: "id",
    header: "询价编号",
    className: "min-w-[126px]",
    render: (row) => <span className="font-bold text-primary">{row.id}</span>,
  },
  { key: "name", header: "任务名称", className: "min-w-[138px]" },
  { key: "project", header: "项目名称", className: "min-w-[138px]" },
  {
    key: "equipmentCount",
    header: "设备数量",
    align: "center",
    className: "min-w-[72px]",
    render: (row) => <span className="font-bold text-textMain">{row.equipmentCount}</span>,
  },
  {
    key: "invitedSuppliers",
    header: "邀请供应商数",
    align: "center",
    className: "min-w-[96px]",
  },
  {
    key: "receivedQuotes",
    header: "已回收报价",
    align: "center",
    className: "min-w-[92px]",
    render: (row) => (
      <span>
        <span className="font-bold text-textMain">{row.receivedQuotes}</span>
        <span className="ml-1 text-success">({Math.round((row.receivedQuotes / row.invitedSuppliers) * 100)}%)</span>
      </span>
    ),
  },
  { key: "deadline", header: "截止日期", className: "min-w-[94px]" },
  {
    key: "status",
    header: "状态",
    className: "min-w-[86px]",
    render: (row) => <StatusPill label={row.status} status={comparisonStatusVariants[row.status]} />,
  },
  { key: "owner", header: "负责人", className: "min-w-[70px]" },
  {
    key: "actions",
    header: "操作",
    align: "right",
    className: "min-w-[118px]",
    render: () => (
      <TableActionGroup
        actions={[
          { label: "查看", icon: Search, tone: "default" },
          { label: "编辑", icon: FileText, tone: "default" },
          { label: "更多", icon: Filter, tone: "primary" },
        ]}
      />
    ),
  },
];

function StatusPill({ label, status, className }: { label: string; status?: ReviewStatus | AiTaskStatus; className?: string }) {
  return (
    <StatusBadge
      status={status ?? semanticStatusVariants[label] ?? "needs_review"}
      label={label}
      className={cn("h-6 shrink-0 justify-center px-2 text-[11px] font-bold", className)}
    />
  );
}

function PremiumIcon({
  icon: Icon,
  tone = "blue",
  size = "sm",
  className,
}: {
  icon: LucideIcon;
  tone?: keyof typeof premiumIconStyles;
  size?: keyof typeof premiumIconSizes;
  className?: string;
}) {
  const dimensions = premiumIconSizes[size];

  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ring-1", premiumIconStyles[tone], dimensions.box, className)}>
      <span className="pointer-events-none absolute left-1.5 top-1.5 size-2 rounded-full bg-white/80 blur-[1px]" />
      <span className="pointer-events-none absolute inset-x-1 bottom-1 h-1/3 rounded-full bg-white/10 blur-sm" />
      <Icon className={dimensions.icon} aria-hidden="true" />
    </span>
  );
}

function SummaryCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {comparisonSummary.map((item, index) => {
        const Icon = kpiIcons[index];
        const tone = toneStyles[item.tone];

        return (
          <section key={item.label} className={cn("min-h-[92px] rounded-card border border-borderSoft bg-gradient-to-br px-3 py-3 shadow-card", tone.card)}>
            <div className="flex items-center gap-3">
              <PremiumIcon icon={Icon} tone={item.tone} size="lg" />
              <div className="min-w-0">
                <p className={cn("truncate text-[12px] font-bold", tone.text)}>{item.label}</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className={cn("text-[25px] font-bold leading-7", tone.text)}>{item.value}</span>
                  <span className="mb-0.5 text-[11px] font-bold text-textMuted">{item.unit}</span>
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

function FilterBar() {
  const filters = ["任务名称", "项目名称", "设备类别", "负责人", "任务状态"];

  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <div className="grid items-end gap-2 xl:grid-cols-[minmax(160px,1.1fr)_repeat(5,minmax(128px,0.85fr))_minmax(180px,1.1fr)_70px_70px_88px]">
        <FilterField label="询价编号">
          <input className="h-9 w-full rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-3 text-[12px] outline-none" placeholder="请输入询价编号" />
        </FilterField>
        {filters.map((item) => (
          <FilterField key={item} label={item}>
            <button className="flex h-9 w-full items-center justify-between rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary" type="button">
              请选择{item}
              <ChevronDown className="size-3.5 text-textMuted" />
            </button>
          </FilterField>
        ))}
        <FilterField label="创建日期">
          <button className="flex h-9 w-full items-center justify-between rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary" type="button">
            开始日期　至　结束日期
            <CalendarDays className="size-3.5 text-primary" />
          </button>
        </FilterField>
        <button className="h-9 rounded-md bg-primary px-3 text-[12px] font-bold text-white shadow-sm" type="button">查询</button>
        <button className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary shadow-sm" type="button">重置</button>
        <button className="h-9 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-bold text-primary" type="button">展开筛选</button>
      </div>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[11px] font-bold text-textSecondary">{label}</span>
      {children}
    </label>
  );
}

function ActionToolbar() {
  const actions = [
    { label: "创建询价任务", icon: Plus, tone: "blue", className: "bg-primary text-white border-primary" },
    { label: "上传报价单", icon: UploadCloud, tone: "green", className: "bg-success text-white border-success" },
    { label: "AI生成询价函", icon: Bot, tone: "purple", className: "bg-ai-soft text-ai border-ai-border" },
    { label: "AI自动比价", icon: GitCompareArrows, tone: "blue", className: "bg-primary-soft text-primary border-primary/20" },
    { label: "导出比价表", icon: Download, tone: "green", className: "bg-white text-success border-success/25" },
    { label: "生成比价报告", icon: FileText, tone: "orange", className: "bg-warning-soft text-warning border-warning/25" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.label} className={cn("inline-flex h-9 items-center gap-2 rounded-md border px-4 text-[13px] font-bold shadow-sm", item.className)} type="button">
            <PremiumIcon icon={Icon} tone={item.tone as keyof typeof premiumIconStyles} size="xs" className={cn(item.className.includes("text-white") && "shadow-none ring-white/25")} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function AiInquiryAdvice() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={BrainCircuit} title="AI询价建议" tone="purple" density="compact" action={<button className="text-[11px] font-bold text-primary">更多</button>} />
      <div className="mt-3 space-y-2">
        {comparisonFindings.map((item, index) => {
          const Icon = index === 0 ? UsersRound : index === 1 ? Target : Sparkles;
          return (
            <div key={item.title} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-xl border border-borderSoft bg-[var(--color-bg-muted)] p-3">
              <PremiumIcon icon={Icon} tone={item.tone} size="md" />
              <div className="min-w-0">
                <div className="font-bold text-textMain">{item.title}</div>
                <p className="mt-0.5 truncate text-[11px] text-textMuted">{item.description}</p>
              </div>
              <button className="rounded-md border border-primary/20 bg-white px-3 py-1 text-[11px] font-bold text-primary" type="button">
                {item.action}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MainTable() {
  return (
    <DataTable
      columns={columns}
      data={comparisonTasks}
      rowKey="id"
      density="compact"
      actions={<ModuleHeader icon={GitCompareArrows} title="询价任务列表" tone="blue" density="compact" />}
      className="min-h-[316px]"
    />
  );
}

function AutoAnalysisPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader
        icon={Bot}
        title="AI自动比价分析"
        subtitle="综合评分结果（满分100分）"
        tone="purple"
        density="compact"
        action={<button className="inline-flex items-center gap-1 text-[11px] font-bold text-primary" type="button">更多 <ChevronRight className="size-3.5" /></button>}
      />
      <div className="mt-3 space-y-1.5">
        {autoAnalysisRank.map((item) => (
          <div key={item.supplier} className="grid grid-cols-[24px_1fr_42px_42px] items-center gap-2 rounded-lg border border-borderSoft px-2 py-1.5 text-[12px]">
            <span className={cn("flex size-5 items-center justify-center rounded text-[11px] font-bold", item.rank === 1 ? "bg-warning text-white" : "bg-slate-200 text-slate-600")}>{item.rank}</span>
            <span className="truncate font-semibold text-textMain">{item.supplier}</span>
            <span className="font-bold text-primary">{item.score}分</span>
            <StatusPill label={item.tag} status={semanticStatusVariants[item.tag]} />
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-[var(--color-bg-muted)] px-2.5 py-2 text-[12px] leading-5 text-textSecondary">
        <span className="font-bold text-textMain">推荐理由：</span>
        综合价格、交期、质量、服务与风险评估，东成机电综合表现最优。
      </p>
      <button className="mt-3 h-8 w-full rounded-md border border-primary/20 bg-primary-soft text-[12px] font-bold text-primary" type="button">查看完整分析</button>
    </section>
  );
}

function ComparisonPreviewPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={ClipboardCheck} title="比价预览" subtitle="示例：潜水排污泵 DN150 Q=200m3/h H=15m" tone="blue" density="compact" action={<button className="text-[11px] font-bold text-primary">更多</button>} />
      <div className="mt-3 overflow-hidden rounded-xl border border-borderSoft">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--color-bg-muted)] text-textSecondary">
            <tr>
              <th className="px-2 py-2 text-left">供应商</th>
              <th className="px-2 py-2 text-right">含税单价</th>
              <th className="px-2 py-2 text-center">交货期</th>
              <th className="px-2 py-2 text-center">质保期</th>
              <th className="px-2 py-2 text-center">综合评分</th>
              <th className="px-2 py-2 text-center">风险</th>
            </tr>
          </thead>
          <tbody>
            {comparisonPreviewRows.map((item, index) => (
              <tr key={item.supplier} className={cn("border-t border-borderSoft", index === 0 && "bg-success-soft/60")}>
                <td className="px-2 py-2 font-semibold text-textMain">{item.supplier}</td>
                <td className="px-2 py-2 text-right font-bold text-success">{item.price.toLocaleString("en-US")}.00</td>
                <td className="px-2 py-2 text-center">{item.delivery}</td>
                <td className="px-2 py-2 text-center">{item.warranty}</td>
                <td className="px-2 py-2 text-center text-warning">{item.score}</td>
                <td className="px-2 py-2 text-center"><StatusPill label={item.risk} status={semanticStatusVariants[item.risk]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-textMuted">
        <span>价格区间：3,520.00 - 4,200.00 USD</span>
        <span>均价：3,887.50 USD</span>
      </div>
    </section>
  );
}

function DeviationPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={AlertTriangle} title="AI技术偏差识别" tone="blue" density="compact" action={<button className="text-[11px] font-bold text-primary">更多</button>} />
      <p className="mt-2 text-[13px] font-bold text-textMain">发现 3 项技术偏差</p>
      <ul className="mt-3 space-y-2 text-[12px] leading-5 text-textSecondary">
        {techDeviationItems.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button className="mt-3 h-8 w-full rounded-md border border-primary/20 bg-primary-soft text-[12px] font-bold text-primary" type="button">查看偏差详情</button>
    </section>
  );
}

function BusinessRiskPanel() {
  return (
    <section className="rounded-card border border-danger/20 bg-danger-soft/30 p-3 shadow-card">
      <ModuleHeader icon={ShieldAlert} title="AI商务风险提示" tone="red" density="compact" action={<button className="text-[11px] font-bold text-primary">更多</button>} />
      <p className="mt-2 text-[13px] font-bold text-danger">检测到 2 项商务风险</p>
      <div className="mt-3 space-y-2">
        {businessRiskItems.map((item) => (
          <div key={item.code} className="grid grid-cols-[24px_1fr_46px] items-center gap-2 text-[12px]">
            <span className="flex size-5 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-white">{item.code}</span>
            <span className="truncate text-textMain">{item.text}</span>
            <StatusPill label={item.level} status={semanticStatusVariants[item.level]} />
          </div>
        ))}
      </div>
      <button className="mt-3 h-8 w-full rounded-md border border-primary/20 bg-white text-[12px] font-bold text-primary" type="button">查看风险详情</button>
    </section>
  );
}

function NegotiationPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={Lightbulb} title="AI谈判建议" tone="purple" density="compact" action={<button className="inline-flex items-center gap-1 text-[11px] font-bold text-primary" type="button">更多 <ChevronRight className="size-3.5" /></button>} />
      <div className="mt-3 rounded-xl border border-borderSoft bg-white px-3 py-2.5">
        <p className="mb-2 text-[12px] font-bold text-textSecondary">基于市场数据与历史谈判记录，AI 建议：</p>
        <ul className="space-y-2 text-[12px] leading-5 text-textSecondary">
          {negotiationSuggestions.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex justify-center">
        <button className="h-8 rounded-md border border-primary/20 bg-primary-soft px-8 text-[12px] font-bold text-primary" type="button">查看谈判话术</button>
      </div>
    </section>
  );
}

function FollowUpPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={BellRing} title="AI催报价建议" tone="purple" density="compact" action={<button className="text-[11px] font-bold text-primary">更多</button>} />
      <div className="mt-3 space-y-2">
        {followUpSuggestions.map((item, index) => (
          <div key={item.supplier} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 rounded-lg border border-borderSoft px-2 py-1.5 text-[12px]">
            <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px] font-bold", index === 1 ? "bg-primary-soft text-primary" : "bg-danger-soft text-danger")}>{index + 1}</span>
            <span className="truncate font-semibold text-textMain">{item.supplier}</span>
            <span className={cn("font-bold", item.deadline.includes("逾期") ? "text-danger" : "text-textSecondary")}>{item.deadline}</span>
          </div>
        ))}
      </div>
      <button className="mt-3 h-8 w-full rounded-md border border-primary/20 bg-primary-soft text-[12px] font-bold text-primary" type="button">一键发送提醒</button>
    </section>
  );
}

function GeneratedFilesPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={FileSpreadsheet} title="AI生成文件" tone="purple" density="compact" />
      <div className="mt-3 space-y-2">
        {generatedFiles.map((item) => (
          <div key={item.name} className="grid grid-cols-[28px_1fr_70px] items-center gap-2 rounded-lg border border-borderSoft px-2 py-1.5 text-[12px]">
            <PremiumIcon
              icon={FileText}
              tone={item.type === "excel" ? "green" : item.type === "pdf" ? "red" : "purple"}
              size="xs"
            />
            <span className="truncate font-semibold text-textMain">{item.name}</span>
            <button className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-primary/20 bg-primary-soft text-[11px] font-bold text-primary" type="button">
              生成
              <ChevronDown className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function InsightSummaryPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
      <ModuleHeader icon={BrainCircuit} title="AI洞察总结" tone="blue" density="compact" action={<button className="inline-flex items-center gap-1 text-[11px] font-bold text-primary" type="button">更多 <ChevronRight className="size-3.5" /></button>} />
      <div className="mt-3 overflow-hidden rounded-xl border border-borderSoft bg-white">
        {insightSummary.map((item, index) => {
          const iconConfig = [
            { Icon: BarChart3 },
            { Icon: Bot },
            { Icon: CheckCircle2 },
            { Icon: Sparkles },
          ][index] ?? { Icon: Sparkles };
          const Icon = iconConfig.Icon;
          return (
            <div key={item} className="grid grid-cols-[28px_1fr] items-center gap-2 border-b border-borderSoft px-3 py-2.5 text-[12px] last:border-b-0">
              <PremiumIcon
                icon={Icon}
                tone={index === 0 ? "blue" : index === 1 ? "purple" : index === 2 ? "green" : "orange"}
                size="xs"
              />
              <span className="leading-5 text-textSecondary">{item}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecommendationChartPanel() {
  return (
    <section className="relative overflow-hidden rounded-card border border-ai-border bg-gradient-to-br from-white via-white to-ai-soft/70 p-3 shadow-card">
      <div className="pointer-events-none absolute right-0 top-0 size-28 rounded-full bg-ai/10 blur-2xl" />
      <ModuleHeader icon={PieChartIcon} title="推荐采用方案" subtitle="AI按报价、交期、风险和历史履约给出采用概率" tone="purple" density="compact" action={<button className="inline-flex items-center gap-1 text-[11px] font-bold text-primary" type="button">查看全部建议 <ChevronRight className="size-3.5" /></button>} />
      <div className="relative mt-3 grid grid-cols-[156px_1fr] items-center gap-4">
        <div className="rounded-2xl border border-ai-border bg-white/80 p-2 shadow-[0_12px_28px_rgba(119,84,246,0.10)]">
          <div className="relative h-[142px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={recommendationPieData} dataKey="value" innerRadius={45} outerRadius={65} paddingAngle={1} stroke="#fff" strokeWidth={2}>
                  {recommendationPieData.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[24px] font-black text-textMain">31</span>
              <span className="text-[10px] font-semibold text-textMuted">个AI建议</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-[12px]">
          {comparisonDecisionOptions.map((item, index) => (
            <div key={item.label} className="rounded-xl border border-borderSoft bg-white/85 px-3 py-2 shadow-[0_8px_18px_rgba(30,68,120,0.05)]">
              <div className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: recommendationPieData[index]?.color }} />
                <span className="font-bold text-textSecondary">{item.label}</span>
                <span className="font-black text-textMain">{item.count}</span>
                <span className="text-textMuted">({item.percent})</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                <div className="h-full rounded-full" style={{ width: item.percent, backgroundColor: recommendationPieData[index]?.color }} />
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-ai-border bg-white/90 px-3 py-2 text-[11px] leading-5 text-textSecondary">
            <div className="flex flex-wrap gap-1.5 pb-1">
              {["优先商务确认", "二轮澄清", "人工复核兜底"].map((tag) => (
                <span key={tag} className="rounded-full bg-ai-soft px-2 py-0.5 text-[10px] font-bold text-ai">{tag}</span>
              ))}
            </div>
            <span className="font-bold text-ai">AI采用判断：</span>
            方案 A 在综合成本、交付周期和供应商履约稳定性上得分最高，建议先进入商务确认，同时保留方案 B 作为谈判锚点。
          </div>
        </div>
      </div>
    </section>
  );
}

function SupplierResponsePanel() {
  const metrics = [
    { label: "响应及时率", value: "82%", trend: "较上月 +6.1%", Icon: CheckCircle2, tone: "text-success", bg: "bg-success-soft", bar: "bg-success", width: "82%" },
    { label: "未响应供应商", value: "12 家", trend: "占比 18%", Icon: BellRing, tone: "text-warning", bg: "bg-warning-soft", bar: "bg-warning", width: "18%" },
    { label: "需跟进供应商", value: "8 家", trend: "较上周 -2 家", Icon: Target, tone: "text-primary", bg: "bg-primary-soft", bar: "bg-primary", width: "36%" },
  ];
  const actions = [
    { label: "优先催办", value: "4 家", desc: "高价值设备报价缺口", tone: "text-primary", bg: "bg-primary-soft" },
    { label: "建议延期", value: "2 项", desc: "报价不足且供应商未响应", tone: "text-warning", bg: "bg-warning-soft" },
    { label: "自动提醒", value: "8 家", desc: "48小时内建议再次触达", tone: "text-ai", bg: "bg-ai-soft" },
  ];
  return (
    <section className="relative overflow-hidden rounded-card border border-primary/15 bg-gradient-to-br from-white via-white to-primary-soft/70 p-3 shadow-card">
      <div className="pointer-events-none absolute -left-8 top-4 size-28 rounded-full bg-primary/10 blur-2xl" />
      <ModuleHeader icon={ShieldAlert} title="供应商响应监测" subtitle="AI识别响应效率、报价缺口和催办优先级" tone="purple" density="compact" action={<button className="inline-flex items-center gap-1 text-[11px] font-bold text-primary" type="button">发送提醒 <ChevronRight className="size-3.5" /></button>} />
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        {metrics.map(({ Icon, ...item }) => (
          <div key={item.label} className="rounded-xl border border-borderSoft bg-white/85 px-3 py-2 shadow-[0_8px_18px_rgba(30,68,120,0.05)]">
            <div className="flex items-center gap-2">
              <PremiumIcon
                icon={Icon}
                tone={item.tone.includes("success") ? "green" : item.tone.includes("warning") ? "orange" : "blue"}
                size="sm"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-textSecondary">{item.label}</div>
                <div className="text-[20px] font-black leading-6 text-textMain">{item.value}</div>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <div className={cn("h-full rounded-full", item.bar)} style={{ width: item.width }} />
            </div>
            <div className={cn("mt-1 text-[10px] font-bold", item.tone)}>{item.trend}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {actions.map((item) => (
          <div key={item.label} className={cn("rounded-xl border border-white/80 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]", item.bg)}>
            <div className={cn("text-[11px] font-bold", item.tone)}>{item.label}</div>
            <div className="mt-1 text-[18px] font-black text-textMain">{item.value}</div>
            <div className="mt-0.5 truncate text-[10px] text-textMuted">{item.desc}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-ai-border bg-white/90 px-3 py-2">
        <div className="flex items-start gap-2">
          <PremiumIcon icon={BrainCircuit} tone="purple" size="xs" className="mt-0.5" />
          <p className="text-[12px] leading-5 text-textSecondary">
            <span className="font-bold text-ai">AI专业判断：</span>
            当前响应不足集中在高差异报价任务，优先催办 4 家关键供应商；若 24 小时内未补齐报价，建议自动生成二轮询价说明并保留谈判证据。
          </p>
        </div>
      </div>
    </section>
  );
}

export default function ComparisonDetailPage() {
  return (
    <AppLayout>
      <div className="space-y-3 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/inquiries" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
              <ArrowLeft className="size-3.5" />
              返回询价与比价管理
            </Link>
            <h1 className="mt-2 text-[24px] font-bold leading-8 text-textMain">比价详情（AI比价分析）</h1>
            <p className="mt-1 text-[13px] text-textMuted">集中管理询价任务、供应商响应、报价对比结果与 AI 比价建议。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/inquiries/create" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm">
              <PremiumIcon icon={Plus} tone="blue" size="xs" className="shadow-none ring-white/25" />
              新建询价任务
            </Link>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm" type="button">
              <PremiumIcon icon={Download} tone="slate" size="xs" />
              导出比价
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm" type="button">
              <PremiumIcon icon={Sparkles} tone="purple" size="xs" />
              AI比价建议
            </button>
          </div>
        </div>

        <SummaryCards />
        <FilterBar />
        <ActionToolbar />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,7.2fr)_minmax(330px,2.8fr)]">
          <MainTable />
          <AiInquiryAdvice />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,2fr)_minmax(420px,3fr)_minmax(260px,2fr)_minmax(260px,2fr)]">
          <AutoAnalysisPanel />
          <ComparisonPreviewPanel />
          <DeviationPanel />
          <BusinessRiskPanel />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,2.1fr)_minmax(260px,2.1fr)_minmax(260px,2.1fr)_minmax(320px,2.7fr)]">
          <NegotiationPanel />
          <FollowUpPanel />
          <GeneratedFilesPanel />
          <InsightSummaryPanel />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(320px,1.15fr)_minmax(320px,1fr)]">
          <SupplierResponsePanel />
          <RecommendationChartPanel />
        </div>

        <div className="sticky bottom-3 z-20 mx-auto flex w-fit items-center gap-3 rounded-card border border-borderSoft bg-white/95 px-5 py-2 shadow-[0_12px_36px_rgba(15,23,42,0.18)] backdrop-blur">
          <span className="text-[12px] font-semibold text-textSecondary">已选择 0 项询价任务</span>
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-semibold text-white" type="button">
            <PremiumIcon icon={Send} tone="blue" size="xs" className="shadow-none ring-white/25" />
            批量发送
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-warning px-4 text-[13px] font-semibold text-white" type="button">
            <PremiumIcon icon={GitCompareArrows} tone="orange" size="xs" className="shadow-none ring-white/25" />
            进入比价
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-4 text-[13px] font-semibold text-white" type="button">
            <PremiumIcon icon={Sparkles} tone="purple" size="xs" className="shadow-none ring-white/25" />
            AI生成说明
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary" type="button">
            <PremiumIcon icon={Download} tone="slate" size="xs" />
            导出
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
