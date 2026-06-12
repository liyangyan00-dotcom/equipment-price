"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FilePlus2,
  Handshake,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  Star,
  Upload,
  UsersRound,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, ModuleHeader, SupplierScoreBadge } from "@/components/common";
import { AiBadge } from "@/components/badges/AiBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { supplierKpis, supplierRecords, type SupplierRecord } from "@/data/mock/suppliers";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";

const countryFlag: Record<string, string> = {
  CN: "🇨🇳",
  CD: "🇨🇩",
  ZA: "🇿🇦",
  DE: "🇩🇪",
  AT: "🇦🇹",
} as const;

const responseClassName = {
  快: "bg-success-soft text-success border-success/20",
  较快: "bg-success-soft text-success border-success/20",
  一般: "bg-warning-soft text-[#B45309] border-warning/20",
  较慢: "bg-danger-soft text-danger border-danger/20",
} as const;

const kpiConfig = [
  {
    icon: UsersRound,
    label: "供应商总数",
    valueClassName: "text-blue-600",
    iconClassName: "from-blue-500 to-blue-600 text-white shadow-blue-500/25",
    waveClassName: "text-blue-400",
  },
  {
    icon: Bot,
    label: "AI推荐供应商",
    valueClassName: "text-violet-600",
    iconClassName: "from-violet-500 to-purple-600 text-white shadow-violet-500/25",
    waveClassName: "text-violet-400",
  },
  {
    icon: FilePlus2,
    label: "待补全供应商资料",
    valueClassName: "text-orange-500",
    iconClassName: "from-amber-400 to-orange-500 text-white shadow-orange-500/25",
    waveClassName: "text-orange-400",
  },
  {
    icon: Star,
    label: "高评分供应商",
    valueClassName: "text-emerald-600",
    iconClassName: "from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25",
    waveClassName: "text-emerald-400",
  },
  {
    icon: ShieldAlert,
    label: "高风险供应商",
    valueClassName: "text-red-500",
    iconClassName: "from-red-400 to-red-600 text-white shadow-red-500/25",
    waveClassName: "text-red-400",
  },
  {
    icon: Sparkles,
    label: "今日新增线索",
    valueClassName: "text-sky-500",
    iconClassName: "from-cyan-400 to-sky-500 text-white shadow-cyan-500/25",
    waveClassName: "text-sky-400",
  },
] as const;

const recommendationItems = [
  { name: "上海凯泉泵业(集团)有限公司", score: 92 },
  { name: "Aqua Congo Services SARL", score: 86 },
  { name: "Xylem Water Solutions SA", score: 84 },
];

const supplementItems = [
  { name: "Aqua Congo Services SARL", missing: "缺少资质证书" },
  { name: "刚果金水务设备有限公司", missing: "缺少经营范围" },
  { name: "DRC Pumps & Valves", missing: "缺少联系方式" },
];

const matchItems = [
  { name: "水泵设备", count: 156, rate: "92%" },
  { name: "阀门配件", count: 132, rate: "88%" },
  { name: "电气设备", count: 98, rate: "85%" },
  { name: "仪表控制", count: 76, rate: "82%" },
];

const priorityContacts = [
  { name: "天津博华泵业有限公司", reason: "近期响应及时，报价有优势" },
  { name: "上海凯泉泵业(集团)有限公司", reason: "历史合作良好，交付稳定" },
  { name: "Kinshasa Water Solutions SARL", reason: "本地服务能力强，配合度高" },
];

const columns: DataTableColumn<SupplierRecord>[] = [
  { key: "supplierCode", header: "供应商编号", className: "min-w-[122px] whitespace-nowrap" },
  {
    key: "supplierName",
    header: "供应商名称",
    className: "min-w-[176px]",
    render: (row) => (
      <div>
        <div className="font-semibold text-textMain">{row.supplierName}</div>
        <div className="mt-0.5 truncate text-[11px] text-textMuted">{row.aiEvaluation}</div>
      </div>
    ),
  },
  {
    key: "countryRegion",
    header: "国家",
    className: "min-w-[78px] whitespace-nowrap",
    render: (row) => (
      <span className="inline-flex items-center gap-1">
        <span>{countryFlag[row.countryCode] ?? "🏳️"}</span>
        {row.countryRegion}
      </span>
    ),
  },
  {
    key: "category",
    header: "类型",
    className: "min-w-[76px] whitespace-nowrap",
    render: (row) => <span className="rounded-pill bg-cyan-soft px-2 py-1 text-[12px] font-medium text-cyan">{row.category}</span>,
  },
  { key: "mainScope", header: "主营产品", className: "min-w-[128px] whitespace-nowrap" },
  { key: "contact", header: "联系人", className: "min-w-[64px] whitespace-nowrap" },
  {
    key: "whatsapp",
    header: "WhatsApp",
    className: "max-w-[118px] min-w-[118px] truncate whitespace-nowrap",
    render: (row) => (
      <span className="inline-flex items-center gap-1 text-textSecondary">
        <MessageCircle className="size-3.5 text-success" aria-hidden="true" />
        <span className="truncate" title={row.whatsapp}>{row.whatsapp}</span>
      </span>
    ),
  },
  {
    key: "email",
    header: "邮箱",
    className: "max-w-[138px] min-w-[138px] truncate whitespace-nowrap",
    render: (row) => (
      <span className="inline-flex items-center gap-1 text-textSecondary">
        <Mail className="size-3.5 text-primary" aria-hidden="true" />
        <span className="truncate" title={row.email}>{row.email}</span>
      </span>
    ),
  },
  {
    key: "aiEvaluation",
    header: "AI观察与建议",
    className: "max-w-[150px] min-w-[150px]",
    render: (row) => (
      <span className={cn("line-clamp-2 rounded-md px-2 py-1 text-[11px] leading-4", row.riskLevel === "high" ? "bg-warning-soft text-[#C2410C]" : "bg-success-soft text-success")}>
        AI建议：{row.aiEvaluation}
      </span>
    ),
  },
  {
    key: "responseSpeed",
    header: "响应速度",
    className: "min-w-[72px] whitespace-nowrap",
    render: (row) => <span className={`inline-flex h-5 items-center rounded-pill border px-2 text-[11px] font-semibold ${responseClassName[row.responseSpeed]}`}>{row.responseSpeed}</span>,
  },
  {
    key: "technicalCapability",
    header: "技术能力",
    align: "center",
    className: "min-w-[78px] whitespace-nowrap",
    render: (row) => (
      <span className="text-primary">
        {"★".repeat(Math.max(3, Math.round(row.technicalCapability / 20)))}
        <span className="text-borderSoft">{"☆".repeat(5 - Math.max(3, Math.round(row.technicalCapability / 20)))}</span>
      </span>
    ),
  },
  {
    key: "deliveryRisk",
    header: "交付风险",
    className: "min-w-[76px] whitespace-nowrap",
    render: (row) => <RiskBadge level={row.deliveryRisk} className="h-5 text-[11px]" />,
  },
  {
    key: "overallScore",
    header: "综合评分",
    className: "min-w-[72px] whitespace-nowrap",
    render: (row) => <SupplierScoreBadge score={row.overallScore} className="h-5 text-[11px]" />,
  },
  {
    key: "actions",
    header: "操作",
    align: "center",
    className: "min-w-[76px] whitespace-nowrap",
    render: (row) => (
      <div className="flex items-center justify-center gap-2 text-primary">
        <Link href={`/suppliers/${row.id}`} aria-label="查看详情"><Eye className="size-4" /></Link>
        <button type="button" aria-label="询价"><ClipboardList className="size-4" /></button>
        <button type="button" aria-label="更多"><MoreHorizontal className="size-4" /></button>
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

function SupplierKpiGrid() {
  return (
    <div className="grid gap-3 xl:grid-cols-6">
      {supplierKpis.map((item, index) => {
        const config = kpiConfig[index];
        const Icon = config.icon;

        return (
          <section key={item.label} className="min-h-[90px] rounded-[10px] border border-borderSoft bg-white px-4 py-3 shadow-card">
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
    <div className={cn("min-w-0", wide ? "xl:col-span-2" : "xl:col-span-1")}>
      <div className="mb-1 text-[12px] font-semibold text-textSecondary">{label}</div>
      <button type="button" className="flex h-9 w-full items-center justify-between rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary">
        <span className="truncate">{wide ? "请输入供应商名称/编号/联系人" : "全部"}</span>
        {wide ? <Search className="size-4 text-textMuted" /> : <ChevronDown className="size-4 text-textMuted" />}
      </button>
    </div>
  );
}

function SupplierFilterPanel() {
  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12">
        <FilterSelect label="供应商搜索" wide />
        <FilterSelect label="国家" />
        <FilterSelect label="类型" />
        <FilterSelect label="主营产品" />
        <FilterSelect label="响应速度" />
        <FilterSelect label="技术能力" />
        <FilterSelect label="交付风险" />
        <FilterSelect label="综合评分" />
        <button type="button" className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-[12px] font-semibold text-white shadow-sm xl:col-span-1">
          <Search className="size-4" />
          搜索
        </button>
        <button type="button" className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] font-semibold text-textSecondary shadow-sm xl:col-span-1">
          <RotateCcw className="size-4" />
          重置
        </button>
        <button type="button" className="inline-flex h-9 items-center justify-center gap-1 text-[12px] font-semibold text-primary xl:col-span-1">
          展开 <ChevronDown className="size-4" />
        </button>
      </div>
    </section>
  );
}

function SupplierActionBar() {
  const actions = [
    { label: "新增供应商", icon: Plus, className: "bg-primary text-white border-primary" },
    { label: "导入供应商", icon: Upload, className: "bg-white text-success border-success/40" },
    { label: "AI推荐供应商", icon: Bot, className: "bg-ai-soft text-ai border-ai-border" },
    { label: "AI补全资料", icon: FilePlus2, className: "bg-white text-[#C2410C] border-warning/30" },
    { label: "创建询价任务", icon: ClipboardList, className: "bg-white text-primary border-primary/20" },
    { label: "导出供应商库", icon: Download, className: "bg-white text-textSecondary border-borderSoft" },
  ];

  return (
    <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
      <div className="grid gap-3 md:grid-cols-6">
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

function SupplierModuleShell({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[10px] border border-borderSoft bg-white p-3 shadow-card", className)}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold leading-5 text-textMain">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-textMuted">{subtitle}</p> : null}
        </div>
        <button className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">
          {action} <ChevronRight className="size-3.5" />
        </button>
      </div>
      {children}
    </section>
  );
}

function SupplierMiniIcon({ tone }: { tone: "blue" | "cyan" | "red" }) {
  const className =
    tone === "blue"
      ? "bg-primary-soft text-primary"
      : tone === "cyan"
        ? "bg-cyan-soft text-cyan"
        : "bg-danger-soft text-danger";

  return (
    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", className)}>
      <UsersRound className="size-3.5" />
    </span>
  );
}

function RecommendationCard() {
  return (
    <SupplierModuleShell title="AI供应商推荐" subtitle="基于项目需求智能推荐" action="更多推荐" className="min-h-[142px]">
      <div className="mt-3 space-y-2">
        {recommendationItems.map((item) => (
          <div key={item.name} className="grid grid-cols-[20px_minmax(0,1fr)_58px] items-center gap-2 border-b border-borderSoft/70 pb-1.5 last:border-b-0 last:pb-0">
            <SupplierMiniIcon tone={item.score > 90 ? "blue" : "cyan"} />
            <span className="truncate text-[12px] font-semibold text-textSecondary">{item.name}</span>
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-center text-[11px] font-bold text-white">{item.score}</span>
            <span className="col-start-3 -mt-2 text-center text-[10px] font-semibold text-textMuted">匹配度</span>
          </div>
        ))}
      </div>
    </SupplierModuleShell>
  );
}

function SupplementCard() {
  return (
    <SupplierModuleShell title="AI资料补全建议" subtitle="24 家供应商资料待补全" action="更多建议" className="min-h-[142px]">
      <div className="mt-3 space-y-2">
        {supplementItems.map((item, index) => (
          <div key={item.name} className="grid grid-cols-[20px_minmax(0,1fr)_84px] items-center gap-2 border-b border-borderSoft/70 pb-1.5 last:border-b-0 last:pb-0">
            <span className={cn("flex size-5 items-center justify-center rounded-md", index === 0 ? "bg-primary-soft text-primary" : index === 1 ? "bg-cyan-soft text-cyan" : "bg-danger-soft text-danger")}>
              <FilePlus2 className="size-3.5" />
            </span>
            <span className="truncate text-[12px] font-semibold text-textSecondary">{item.name}</span>
            <span className={cn("text-right text-[11px] font-semibold", index === 0 ? "text-primary" : index === 1 ? "text-[#EA7A1F]" : "text-danger")}>{item.missing}</span>
          </div>
        ))}
      </div>
    </SupplierModuleShell>
  );
}

function MatchCard() {
  return (
    <SupplierModuleShell title="AI匹配项目需求" subtitle="基于当前项目：金沙萨净水厂扩建项目" action="更多匹配" className="min-h-[300px]">
      <div className="mt-5 space-y-4">
        {matchItems.map((item) => (
          <div key={item.name} className="grid grid-cols-[72px_1fr_44px] items-center gap-3 text-[12px]">
            <span className="font-semibold text-textSecondary">{item.name}</span>
            <div className="min-w-0">
              <div className="mb-1 flex justify-between text-[11px] text-textMuted">
                <span>匹配供应商 {item.count} 家</span>
                <span>匹配度</span>
              </div>
              <span className="block h-2.5 overflow-hidden rounded-full bg-[#EEF3F8]">
                <span className="block h-full rounded-full bg-success" style={{ width: item.rate }} />
              </span>
            </div>
            <span className="text-right font-bold text-textMain">{item.rate}</span>
          </div>
        ))}
      </div>
    </SupplierModuleShell>
  );
}

function DeliveryRiskCard() {
  return (
    <SupplierModuleShell title="AI交付风险分析" subtitle="识别高风险供应商及预警" action="更多分析" className="min-h-[300px]">
      <div className="mt-5 grid grid-cols-[minmax(118px,1fr)_minmax(116px,1fr)] items-center gap-3">
        <div className="relative flex h-[160px] items-center justify-center">
          <div className="size-[142px] rounded-full" style={{ background: "conic-gradient(#EF5A5A 0 6.3%, #F5B84B 6.3% 17.5%, #58C29A 17.5% 100%)" }} />
          <div className="absolute size-[96px] rounded-full border border-borderSoft bg-white" />
          <div className="absolute flex max-w-[72px] flex-col items-center text-center">
            <div className="text-[28px] font-bold leading-8 text-textMain">18</div>
            <div className="mt-0.5 text-[11px] font-semibold leading-3 text-textMuted">
              高风险
              <br />
              供应商
            </div>
          </div>
        </div>
        <div className="space-y-4 text-[13px]">
          <div className="flex items-center gap-2"><span className="size-3 rounded-sm bg-danger" /><span className="font-semibold text-textSecondary">高风险</span><span className="ml-auto font-bold">18 (6.3%)</span></div>
          <div className="flex items-center gap-2"><span className="size-3 rounded-sm bg-warning" /><span className="font-semibold text-textSecondary">中风险</span><span className="ml-auto font-bold">32 (11.2%)</span></div>
          <div className="flex items-center gap-2"><span className="size-3 rounded-sm bg-success" /><span className="font-semibold text-textSecondary">低风险</span><span className="ml-auto font-bold">236 (82.5%)</span></div>
        </div>
      </div>
    </SupplierModuleShell>
  );
}

function ScoreRadarCard() {
  const metrics = [
    { label: "响应速度", value: 85 },
    { label: "技术能力", value: 88 },
    { label: "交付可靠性", value: 82 },
    { label: "价格竞争力", value: 78 },
    { label: "服务质量", value: 84 },
  ];

  return (
    <SupplierModuleShell title="AI综合评分分布" subtitle="基于多维度AI算法评分" action="更多分析" className="min-h-[300px]">
      <div className="mt-4 flex h-[220px] flex-col items-center justify-center">
        <div className="text-center text-[13px] font-bold leading-4 text-textMain">
          {metrics[0].label}
          <div className="text-[16px] leading-5">{metrics[0].value}</div>
        </div>
        <div className="grid w-full max-w-[320px] grid-cols-[72px_1fr_72px] items-center gap-2">
          <div className="text-center text-[13px] font-bold leading-4 text-textMain">
            {metrics[4].label}
            <div className="text-[16px] leading-5">{metrics[4].value}</div>
          </div>
          <svg viewBox="0 0 180 160" className="h-[150px] w-full" aria-label="供应商综合评分雷达图">
            <polygon points="90,14 162,62 134,142 46,142 18,62" fill="none" stroke="#D8E3F0" strokeWidth="2" />
            <polygon points="90,40 128,68 116,116 62,116 48,70" fill="#2F6BFF" fillOpacity="0.22" stroke="#2F6BFF" strokeWidth="3" />
            <polygon points="90,60 112,76 104,100 76,100 68,76" fill="none" stroke="#E5EDF7" />
            <line x1="90" y1="14" x2="90" y2="142" stroke="#E5EDF7" />
            <line x1="18" y1="62" x2="162" y2="62" stroke="#E5EDF7" />
            <line x1="46" y1="142" x2="162" y2="62" stroke="#E5EDF7" />
            <line x1="134" y1="142" x2="18" y2="62" stroke="#E5EDF7" />
            <circle cx="90" cy="40" r="4" fill="#2F6BFF" />
            <circle cx="128" cy="68" r="4" fill="#2F6BFF" />
            <circle cx="116" cy="116" r="4" fill="#2F6BFF" />
            <circle cx="62" cy="116" r="4" fill="#2F6BFF" />
            <circle cx="48" cy="70" r="4" fill="#2F6BFF" />
          </svg>
          <div className="text-center text-[13px] font-bold leading-4 text-textMain">
            {metrics[1].label}
            <div className="text-[16px] leading-5">{metrics[1].value}</div>
          </div>
        </div>
        <div className="grid w-full max-w-[260px] grid-cols-2 gap-10 text-center text-[13px] font-bold leading-4 text-textMain">
          <div>
            {metrics[3].label}
            <div className="text-[16px] leading-5">{metrics[3].value}</div>
          </div>
          <div>
            {metrics[2].label}
            <div className="text-[16px] leading-5">{metrics[2].value}</div>
          </div>
        </div>
      </div>
    </SupplierModuleShell>
  );
}

function PriorityContactCard() {
  return (
    <SupplierModuleShell title="AI优先联系名单" subtitle="今日推荐优先联系的供应商" action="更多名单" className="min-h-[142px]">
      <div className="mt-2 space-y-1.5">
        {priorityContacts.map((item, index) => (
          <div key={item.name} className="grid grid-cols-[22px_minmax(0,1fr)_minmax(0,1.25fr)_48px] items-center gap-2 text-[12px]">
            <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white", index === 0 ? "bg-danger" : index === 1 ? "bg-warning" : "bg-[#F2B54B]")}>{index + 1}</span>
            <span className="truncate font-semibold text-textMain">{item.name}</span>
            <span className="truncate text-[11px] text-textMuted">推荐理由：{item.reason}</span>
            <button className="h-7 rounded-md border border-primary/30 bg-white text-[11px] font-semibold text-primary">联系</button>
          </div>
        ))}
      </div>
    </SupplierModuleShell>
  );
}

export default function SuppliersPage() {
  return (
    <AppLayout>
      <div className="min-w-0 space-y-3 overflow-hidden">
        <PageHeader
          title="供应商库"
          description="集中管理水厂设备、地材、服务类供应商信息、报价记录与 AI 评估。"
          actions={
            <>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm transition hover:border-primary/30 hover:text-primary">
                <Upload className="size-4" aria-hidden="true" />
                导入供应商
              </button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm transition hover:border-ai/40">
                <SearchCheck className="size-4" aria-hidden="true" />
                AI评估
              </button>
              <Link href="/suppliers/manage" className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan/30 bg-cyan-soft px-3 text-[13px] font-semibold text-cyan shadow-sm transition hover:border-cyan/50">
                <UsersRound className="size-4" aria-hidden="true" />
                管理供应商
              </Link>
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90">
                <Plus className="size-4" aria-hidden="true" />
                新增供应商
              </button>
            </>
          }
        />

        <SupplierKpiGrid />
        <SupplierFilterPanel />

        <DataTable
          columns={columns}
          data={supplierRecords}
          rowKey="id"
          density="compact"
          actions={
            <ModuleHeader
              icon={Handshake}
              title="供应商情报明细"
              subtitle="供应商类别、报价记录、响应效率、可信度和风险状态"
              tone="cyan"
              density="compact"
              action={<AiBadge label="AI供应商评估" icon="analysis" className="h-5 text-[11px]" />}
            />
          }
        />

        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-5">
          <div className="grid gap-3 2xl:col-span-2">
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-2">
              <RecommendationCard />
              <SupplementCard />
            </div>
            <PriorityContactCard />
          </div>
          <MatchCard />
          <DeliveryRiskCard />
          <ScoreRadarCard />
        </div>

        <SupplierActionBar />
      </div>
    </AppLayout>
  );
}
