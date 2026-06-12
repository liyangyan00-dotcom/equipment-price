"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  Mail,
  Merge,
  MoreHorizontal,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { AiBadge, StatusBadge } from "@/components/badges";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable, ModuleHeader } from "@/components/common";
import { supplierGovernanceRows, type SupplierGovernanceRow } from "@/data/mock/supplierManagement";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/common";

type SupplierMaintainRow = Record<string, unknown> &
  SupplierGovernanceRow & {
    country: string;
    countryCode: string;
    scope: string;
    contact: string;
    missingSummary: string;
    lastImport: string;
    aiAction: string;
  };

const rowExtras = [
  ["中国", "CN", "水泵/阀门", "张伟", "无", "IMP-202506-01", "资料完整"],
  ["德国", "DE", "阀门/执行器", "Anna Muller", "主营范围", "IMP-202506-01", "建议补全主营范围"],
  ["肯尼亚", "KE", "钢材", "John Mwangi", "邮箱、WhatsApp", "IMP-202506-02", "建议补全联系方式"],
  ["刚果(金)", "CD", "水处理设备", "Jean Kabila", "无", "IMP-202506-01", "资料完整"],
  ["南非", "ZA", "水泵/机电设备", "Thabo Dlamini", "主营范围、电话", "IMP-202506-01", "建议补全主营范围"],
  ["中国", "CN", "机电设备", "李强", "无", "IMP-202506-03", "资料完整"],
] as const;

const rows: SupplierMaintainRow[] = supplierGovernanceRows.map((item, index) => {
  const extra =
    rowExtras[index] ??
    (["中国", "CN", "管材/辅件", "王晶", "WhatsApp、邮箱、电话", "IMP-202506-04", "建议补全联系方式"] as const);

  return {
    ...item,
    country: extra[0],
    countryCode: extra[1],
    scope: extra[2],
    contact: extra[3],
    missingSummary: extra[4],
    lastImport: extra[5],
    aiAction: extra[6],
  };
});

const kpis = [
  { label: "待补全资料", value: "24", trend: "占比 16.8%", icon: UsersRound, tone: "purple" },
  { label: "待审核供应商", value: "38", trend: "占比 26.6%", icon: FileCheck2, tone: "orange" },
  { label: "重复记录", value: "11", trend: "占比 7.7%", icon: Merge, tone: "red" },
  { label: "联系方式缺失", value: "16", trend: "占比 11.2%", icon: Phone, tone: "green" },
  { label: "AI 已补全", value: "216", trend: "本月补全 45", icon: Sparkles, tone: "purple" },
] as const;

const tabs = ["全部供应商", "资料待补全", "待审核", "重复记录", "异常供应商", "已禁用"];

const toneMap = {
  purple: {
    icon: "from-[#8B5CF6] to-[#6D5DFB] text-white shadow-[#7C3AED]/25",
    soft: "bg-ai-soft",
    label: "text-ai",
    value: "text-ai",
    wave: "text-ai",
  },
  orange: {
    icon: "from-[#FDBA3B] to-[#F97316] text-white shadow-[#F97316]/25",
    soft: "bg-warning-soft",
    label: "text-warning",
    value: "text-warning",
    wave: "text-warning",
  },
  red: {
    icon: "from-[#FB7185] to-[#EF4444] text-white shadow-[#EF4444]/25",
    soft: "bg-danger-soft",
    label: "text-danger",
    value: "text-danger",
    wave: "text-danger",
  },
  green: {
    icon: "from-[#34D399] to-[#16A34A] text-white shadow-[#16A34A]/25",
    soft: "bg-success-soft",
    label: "text-success",
    value: "text-success",
    wave: "text-success",
  },
} as const;

const auditText = {
  confirmed: "已审核",
  pending: "待审核",
  need_info: "待补全",
  rejected: "已退回",
} as const;

function MiniWave({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-14", className)} viewBox="0 0 60 20" fill="none" aria-hidden="true">
      <path
        d="M2 14 C8 14 10 7 16 7 C22 7 23 15 30 15 C36 15 38 5 44 5 C50 5 51 12 58 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("flex size-7 items-center justify-center rounded-[9px] bg-ai-soft text-ai", className)}>
      {children}
    </span>
  );
}

function SectionHeader({ title, subtitle, action, icon: Icon = Sparkles }: { title: string; subtitle?: string; action?: string; icon?: LucideIcon }) {
  return (
    <ModuleHeader
      icon={Icon}
      title={title}
      subtitle={subtitle}
      tone={title.includes("AI") ? "purple" : title.includes("风险") || title.includes("重复") ? "orange" : "blue"}
      headingLevel={3}
      action={
        action ? (
          <button className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-primary">
            {action}
            <ChevronRight className="size-3.5" />
          </button>
        ) : null
      }
    />
  );
}

function KpiCards() {
  return (
    <div className="grid min-w-[980px] grid-cols-5 gap-3">
      {kpis.map((item) => {
        const Icon = item.icon;
        const tone = toneMap[item.tone];
        return (
          <section key={item.label} className="rounded-[10px] border border-borderSoft bg-white px-5 py-4 shadow-card">
            <div className="flex items-center gap-4">
              <span className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-[17px]", tone.soft)}>
                <span className={cn("absolute inset-1 rounded-[14px] blur-md", tone.soft)} />
                <span className={cn("relative flex size-12 items-center justify-center rounded-[15px] bg-gradient-to-br shadow-lg", tone.icon)}>
                  <Icon className="size-7 drop-shadow-sm" strokeWidth={2.35} />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn("text-[13px] font-extrabold", tone.label)}>{item.label}</div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className={cn("text-[30px] font-extrabold leading-8 tabular-nums", tone.value)}>{item.value}</span>
                  <MiniWave className={tone.wave} />
                </div>
                <div className="mt-1 text-[12px] font-semibold text-textMuted">{item.trend}</div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FilterBlock() {
  const filters = ["国家/地区", "主营范围", "供应商类别", "审核状态", "资料完整度"];
  return (
    <section className="rounded-[10px] border border-borderSoft bg-white shadow-card">
      <div className="flex border-b border-borderSoft px-4">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={cn(
              "h-10 border-b-2 px-5 text-[13px] font-bold",
              index === 0 ? "border-primary text-primary" : "border-transparent text-textSecondary"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="grid min-w-[980px] grid-cols-[repeat(5,minmax(120px,1fr))_minmax(240px,2fr)_72px_92px] items-end gap-2 px-4 py-3">
        {filters.map((filter) => (
          <label key={filter} className="min-w-0">
            <button className="flex h-9 w-full items-center justify-between rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary">
              {filter} 全部 <ChevronDown className="size-3.5 text-textMuted" />
            </button>
          </label>
        ))}
        <span className="flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textMuted">
          <Search className="size-4" />
          <span className="truncate">搜索供应商名称/联系人/WhatsApp/邮箱</span>
        </span>
        <button className="h-9 rounded-md border border-borderSoft bg-white text-[12px] font-bold text-textSecondary">重置</button>
        <button className="h-9 rounded-md bg-primary text-[12px] font-bold text-white">高级筛选</button>
      </div>
    </section>
  );
}

function Toolbar() {
  const actions = [
    ["已选择 0 项", CheckCircle2, "bg-white text-textSecondary border-borderSoft"],
    ["批量补全", WandSparkles, "bg-primary-soft text-primary border-primary/20"],
    ["批量审核", ClipboardCheck, "bg-primary-soft text-primary border-primary/20"],
    ["标记异常", AlertTriangle, "bg-danger-soft text-danger border-danger/20"],
    ["导出数据", Download, "bg-white text-textSecondary border-borderSoft"],
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-borderSoft bg-white px-3 py-2 shadow-card">
      <div className="flex flex-wrap gap-2">
        {actions.map(([label, Icon, className]) => (
          <button key={label} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-bold", className)}>
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {[RefreshCw, ShieldCheck, MoreHorizontal].map((Icon, index) => (
          <button key={index} className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary">
            <Icon className="size-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

const columns: DataTableColumn<SupplierMaintainRow>[] = [
  { key: "select", header: "□", className: "min-w-[32px]", render: () => <span className="block size-3.5 rounded border border-borderSoft" /> },
  { key: "supplierCode", header: "供应商编号", className: "min-w-[118px] text-[11px] text-textSecondary" },
  { key: "supplierName", header: "供应商名称", className: "min-w-[168px] font-semibold" },
  {
    key: "countryDisplay",
    header: "国家/地区",
    className: "min-w-[88px]",
    render: (row) => (
      <span>
        {row.countryCode === "CN" ? "中国" : row.countryCode === "DE" ? "德国" : row.countryCode === "KE" ? "肯尼亚" : row.countryCode === "ZA" ? "南非" : "刚果(金)"}
      </span>
    ),
  },
  {
    key: "completeness",
    header: "资料完整度",
    className: "min-w-[112px]",
    render: (row) => (
      <div className="flex items-center gap-2">
        <span>{row.completeness}%</span>
        <span className="h-1.5 w-12 rounded-full bg-borderSoft">
          <span
            className={cn("block h-full rounded-full", row.completeness >= 80 ? "bg-success" : row.completeness >= 60 ? "bg-warning" : "bg-danger")}
            style={{ width: `${row.completeness}%` }}
          />
        </span>
      </div>
    ),
  },
  {
    key: "missingSummary",
    header: "缺失字段",
    className: "min-w-[112px]",
    render: (row) => (
      <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", row.missingSummary === "无" ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
        {row.missingSummary}
      </span>
    ),
  },
  { key: "contact", header: "联系人", className: "min-w-[74px]" },
  { key: "whatsappStatus", header: "WhatsApp", className: "min-w-[74px]", render: (row) => (row.whatsappStatus === "complete" ? <Phone className="size-4 text-success" /> : <Phone className="size-4 text-danger" />) },
  { key: "emailStatus", header: "邮箱", className: "min-w-[58px]", render: (row) => (row.emailStatus === "complete" ? <Mail className="size-4 text-success" /> : <Mail className="size-4 text-danger" />) },
  { key: "scope", header: "主营范围", className: "min-w-[104px]" },
  { key: "lastImport", header: "最近导入批次", className: "min-w-[112px]" },
  { key: "reviewStatus", header: "审核状态", className: "min-w-[82px]", render: (row) => <StatusBadge status={row.reviewStatus} label={auditText[row.reviewStatus]} className="h-5 text-[11px]" /> },
  { key: "aiAction", header: "AI补全建议", className: "min-w-[150px]", render: (row) => <span className="text-[12px] text-textSecondary">{row.aiAction}</span> },
  { key: "actions", header: "操作", className: "min-w-[88px]", render: () => <div className="flex items-center gap-2 text-primary"><Eye className="size-4" /><Pencil className="size-4" /><MoreHorizontal className="size-4" /></div> },
];

function AiSuggestionPanel() {
  const suggestions = [
    ["SinoFlow Pumps Co., Ltd.", "建议补全", "建议补充公司成立年限、认证资质等信息", "green"],
    ["EastAfrica Steel Ltd.", "建议补全", "建议补充WhatsApp、邮箱联系方式", "green"],
    ["Grundfos South Africa (Pty)Ltd", "建议补全", "建议补充主营范围、联系方式", "orange"],
  ] as const;

  return (
    <section className="rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="AI 智能补全建议" subtitle="共 24 条待补全建议" action="查看全部" icon={Sparkles} />
      <div className="-mt-1 mb-2">
        <AiBadge label="AI补全" icon="suggestion" className="h-5 text-[11px]" />
      </div>
      <div className="space-y-2.5">
        {suggestions.map(([name, tag, desc, tone]) => (
          <div key={name} className="rounded-lg border border-borderSoft bg-white px-3 py-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-extrabold text-textMain">{name}</span>
              <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", tone === "green" ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>{tag}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="line-clamp-2 text-[12px] leading-5 text-textSecondary">{desc}</p>
              <button className="h-8 shrink-0 rounded-md border border-ai/30 bg-ai-soft px-3 text-[12px] font-extrabold text-ai">立即补全</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompletenessPanel() {
  const items = [
    ["完整（90-100%）", "56 (25.9%)", "bg-success"],
    ["较完整（70-89%）", "92 (42.6%)", "bg-primary"],
    ["一般（50-69%）", "48 (22.2%)", "bg-warning"],
    ["缺失较多（<50%）", "20 (9.3%)", "bg-danger"],
  ] as const;

  return (
    <section className="rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="资料完整度分布" action="查看详情" icon={WandSparkles} />
      <div className="grid grid-cols-[118px_minmax(0,1fr)] items-center gap-3">
        <DonutGraphic
          size={116}
          inner={72}
          centerTop="216"
          centerBottom="供应商总数"
          gradient="conic-gradient(#22C55E 0 25.9%, #2F6BFF 25.9% 68.5%, #F59E0B 68.5% 90.7%, #EF4444 90.7% 100%)"
        />
        <div className="space-y-2">
          {items.map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between gap-2 text-[12px] font-semibold text-textSecondary">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", color)} />
                <span className="truncate">{label}</span>
              </span>
              <span className="shrink-0 text-textMain">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickActionsPanel() {
  const actions = [
    ["批量补全资料", "AI自动补全缺失信息", WandSparkles],
    ["去重合并", "合并重复供应商记录", Merge],
    ["导入记录", "查看历史导入日志", Upload],
    ["资料导出", "导出供应商资料", Download],
  ] as const;

  return (
    <section className="rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="快捷操作" icon={ClipboardCheck} />
      <div className="grid grid-cols-2 gap-2">
        {actions.map(([label, desc, Icon]) => (
          <button key={label} className="flex min-h-[54px] items-center gap-2 rounded-lg border border-borderSoft bg-white px-2.5 text-left transition hover:border-ai/40 hover:bg-ai-soft/40">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-ai-soft text-ai">
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-extrabold text-textMain">{label}</span>
              <span className="mt-0.5 block truncate text-[10px] font-medium text-textMuted">{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RightPanel() {
  return (
    <aside className="space-y-3">
      <AiSuggestionPanel />
      <CompletenessPanel />
      <QuickActionsPanel />
    </aside>
  );
}

function DuplicatePanel() {
  const items = [
    ["SinoFlow Pumps Co., Ltd.", "3 条记录"],
    ["Aqua Congo Services SARL", "2 条记录"],
    ["Hebei Pipe Industry", "2 条记录"],
  ];

  return (
    <section className="flex h-[210px] flex-col rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <IconBox>
            <Merge className="size-4" />
          </IconBox>
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-extrabold leading-5 text-textMain">重复供应商检测</h3>
            <p className="mt-1 text-[12px] font-medium text-textMuted">发现 11 组重复记录</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-danger-soft px-2 py-1 text-[11px] font-bold text-danger">高风险重复</span>
      </div>
      <div className="space-y-1.5">
        {items.map(([name, count]) => (
          <div key={name} className="grid h-8 grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-2 rounded-lg border border-borderSoft px-2 text-[12px]">
            <span className="truncate font-bold text-textSecondary">{name}</span>
            <span className="whitespace-nowrap rounded bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-center font-semibold text-textSecondary">{count}</span>
            <span className="whitespace-nowrap rounded bg-success-soft px-1.5 py-0.5 text-center font-bold text-success">合并建议</span>
          </div>
        ))}
      </div>
      <button className="mx-auto mt-3 flex h-8 shrink-0 items-center justify-center rounded-md border border-ai/25 bg-ai-soft px-4 text-[12px] font-extrabold text-ai">
        查看全部重复记录
      </button>
    </section>
  );
}

function MissingStatsPanel() {
  const items = [
    ["WhatsApp 缺失", "16", "占比 25.4%"],
    ["邮箱缺失", "15", "占比 23.8%"],
    ["主营范围缺失", "14", "占比 22.2%"],
    ["联系人缺失", "10", "占比 15.9%"],
    ["公司资质缺失", "8", "占比 12.7%"],
  ];

  return (
    <section className="h-[210px] rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="资料缺失统计" subtitle="共发现 63 条采购缺失" icon={FileCheck2} />
      <div className="space-y-2.5 pt-1">
        {items.map(([label, value, percent]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_32px_70px] items-center gap-2 text-[12px]">
            <span className="truncate font-semibold text-textSecondary">{label}</span>
            <span className="text-right font-extrabold text-textMain">{value}</span>
            <span className="text-right font-semibold text-textSecondary">{percent}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BarPanel() {
  const values = [28, 36, 42, 38, 32, 40];
  return (
    <section className="h-[210px] rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="导入批次分布" subtitle="近 6 个月导入情况" icon={Upload} />
      <div className="flex h-[126px] items-end justify-around gap-4 px-1">
        {values.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[12px] font-extrabold text-textMain">{value}</span>
            <span
              className="w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-[#7C3AED] to-[#A78BFA] shadow-[0_8px_18px_rgba(124,58,237,0.18)]"
              style={{ height: `${value * 1.55}px` }}
            />
            <span className="text-[11px] font-semibold text-textMuted">{index + 1}月</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DonutGraphic({
  size,
  inner,
  centerTop,
  centerBottom,
  gradient,
}: {
  size: number;
  inner: number;
  centerTop: string;
  centerBottom: string;
  gradient: string;
}) {
  return (
    <div className="relative flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: gradient }}>
      <div className="absolute rounded-full bg-white" style={{ width: inner, height: inner }} />
      <div className="relative flex w-[62px] flex-col items-center justify-center text-center leading-none">
        <div className="text-[22px] font-extrabold tabular-nums text-textMain">{centerTop}</div>
        <div className="mt-1 text-[11px] font-semibold leading-4 text-textMuted">{centerBottom}</div>
      </div>
    </div>
  );
}

function AuditStatusPanel() {
  const items = [
    ["已审核", "146 (67.6%)", "bg-success"],
    ["待审核", "38 (17.6%)", "bg-warning"],
    ["待补全", "24 (11.1%)", "bg-ai"],
    ["已禁用", "8 (3.7%)", "bg-slate-500"],
  ] as const;

  return (
    <section className="h-[210px] rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="审核状态分布" subtitle="供应商审核状态统计" icon={ShieldCheck} />
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
        <DonutGraphic
          size={112}
          inner={70}
          centerTop="216"
          centerBottom="总数"
          gradient="conic-gradient(#22C55E 0 67.6%, #F59E0B 67.6% 85.2%, #7C3AED 85.2% 96.3%, #64748B 96.3% 100%)"
        />
        <div className="space-y-2">
          {items.map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between gap-2 text-[12px] font-semibold text-textSecondary">
              <span className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", color)} />
                {label}
              </span>
              <span className="text-textMain">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EffectPanel() {
  const metrics = [
    ["补全总数", "45", ShieldCheck, "text-primary"],
    ["补全准确率", "92.6%", CheckCircle2, "text-success"],
    ["节省时间", "32.5 h", RefreshCw, "text-primary"],
    ["本月处理", "18 供应商", ClipboardCheck, "text-primary"],
  ] as const;

  return (
    <section className="h-[210px] rounded-[10px] border border-borderSoft bg-white p-3 shadow-card">
      <SectionHeader title="AI 补全效果" subtitle="本月 AI 补全效果累计" icon={Sparkles} />
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(([label, value, Icon, color]) => (
          <div key={label} className="flex h-[58px] items-center gap-2 rounded-lg bg-[var(--color-bg-muted)] px-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-ai-soft text-ai">
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-textSecondary">{label}</span>
            <span className={cn("mt-0.5 block whitespace-nowrap text-[17px] font-extrabold tabular-nums", color)}>{value}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomPanels() {
  return (
    <div className="grid min-w-[1280px] grid-cols-[1.25fr_1.05fr_1.2fr_1.25fr_1.25fr] gap-3">
      <DuplicatePanel />
      <MissingStatsPanel />
      <BarPanel />
      <AuditStatusPanel />
      <EffectPanel />
    </div>
  );
}

export default function SupplierManagePage() {
  return (
    <AppLayout>
      <div className="min-w-0 space-y-3 overflow-x-auto overflow-y-hidden">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-textMain">
              供应商资料维护 <ShieldCheck className="ml-2 inline size-5 text-ai" />
            </h1>
            <p className="mt-1 text-[13px] text-textSecondary">集中管理供应商基础资料，AI智能补全与去重合并，确保资料准确完整</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["导入供应商", Upload, "primary"],
              ["AI 智能补全", Sparkles, "ai"],
              ["去重合并", Merge, "default"],
              ["批量审核", ClipboardCheck, "default"],
              ["更多操作", MoreHorizontal, "default"],
            ].map(([label, Icon, tone]) => {
              const IconComponent = Icon as typeof Upload;
              return (
                <button
                  key={label as string}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-bold shadow-sm",
                    tone === "primary"
                      ? "border-primary bg-primary text-white"
                      : tone === "ai"
                        ? "border-ai-border bg-ai-soft text-ai"
                        : "border-borderSoft bg-white text-textSecondary"
                  )}
                >
                  <IconComponent className="size-4" />
                  {label as string}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-w-[1322px] grid-cols-[minmax(980px,1fr)_330px] gap-3">
          <div className="space-y-3">
            <KpiCards />
            <FilterBlock />
            <Toolbar />
            <DataTable columns={columns} data={rows} rowKey="id" density="compact" />
          </div>
          <RightPanel />
        </div>

        <BottomPanels />
      </div>
    </AppLayout>
  );
}
