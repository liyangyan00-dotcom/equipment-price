import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  JapaneseYen,
  LineChart,
  MoreHorizontal,
  PackageCheck,
  Printer,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";

import { AiBadge, ConfidenceBadge, StatusBadge } from "@/components/badges";
import { ModuleHeader } from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import { getEquipmentPriceDetail } from "@/data/mock/equipmentPriceDetails";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

const topCards = [
  { label: "设备名称", value: "立式离心泵（单级单吸）", desc: "", icon: PackageCheck, tone: "blue" },
  { label: "规格型号", value: "CDL32-40-2", desc: "流量 32m3/h  |  扬程 40m", icon: Wrench, tone: "green" },
  { label: "当前价格（含税）", value: "¥ 18,600.00", desc: "含税单价 / 台", icon: JapaneseYen, tone: "orange" },
  { label: "价格可信度", value: "92.6%", desc: "高可信度", icon: Sparkles, tone: "purple" },
  { label: "审核状态", value: "已审核通过", desc: "复核无需关注", icon: CheckCircle2, tone: "green" },
] as const;

const toneMap = {
  blue: { icon: "from-[#2F6BFF] to-[#0EA5E9] shadow-[#2F6BFF]/25", text: "text-primary" },
  green: { icon: "from-[#22C55E] to-[#10B981] shadow-[#10B981]/25", text: "text-success" },
  orange: { icon: "from-[#F59E0B] to-[#F97316] shadow-[#F97316]/25", text: "text-warning" },
  purple: { icon: "from-[#8B5CF6] to-[#6D5DFB] shadow-[#7C3AED]/25", text: "text-ai" },
} as const;

const techParams = [
  ["流量（Q）", "32 m3/h"],
  ["扬程（H）", "40 m"],
  ["功率（P）", "5.5 kW"],
  ["转速（n）", "2900 r/min"],
  ["效率（η）", "72.0%"],
  ["必需汽蚀余量（NPSHr）", "2.5 m"],
  ["进出口径（DN）", "DN65 / DN50"],
  ["泵送液体", "清水（0-80°C）"],
  ["材质", "泵体：不锈钢 304 / 叶轮：不锈钢 304"],
  ["密封形式", "机械密封（硬化硅/碳化硅）"],
  ["安装方式", "立式法兰安装"],
  ["执行标准", "GB/T 5657-2013"],
];

const quoteRows = [
  ["含税单价（台）", "¥ 18,600.00"],
  ["未税单价（台）", "¥ 16,460.18"],
  ["税率", "13%"],
  ["含税总价（数量：4 台）", "¥ 74,400.00"],
  ["报价单位", "浙江南方泵业股份有限公司"],
  ["报价联系人", "张工 / 138 1234 5678"],
  ["交货周期", "15 天"],
  ["质保期", "18 个月"],
  ["付款条件", "合同生效后 30% 预付款，发货前 60%，验收后 10%"],
  ["备注", "含随机备件及安装技术资料"],
];

const supplierRows = [
  ["供应商编码", "SUP-2023-0007"],
  ["供应商等级", "A 级"],
  ["综合评分", "91.2 分"],
  ["主营设备", "泵类、阀门、控制设备"],
  ["注册资本", "5,000 万元"],
  ["成立年份", "1991 年"],
  ["所在地区", "浙江省 杭州市"],
  ["联系人", "张工 / 138 1234 5678"],
];

const versionRows = [
  ["V1.5", "2025-06-19", "18,600.00", "4", "浙江南方泵业股份有限公司", "已审核通过", "92.6%", "admin"],
  ["V1.4", "2025-05-20", "18,920.00", "4", "浙江南方泵业股份有限公司", "已审核通过", "90.3%", "admin"],
  ["V1.3", "2025-04-21", "19,500.00", "4", "浙江南方泵业股份有限公司", "已审核通过", "88.7%", "admin"],
  ["V1.2", "2025-03-18", "19,800.00", "4", "浙江南方泵业股份有限公司", "已审核通过", "87.1%", "admin"],
  ["V1.1", "2025-02-15", "20,300.00", "4", "浙江南方泵业股份有限公司", "已审核通过", "85.2%", "admin"],
];

const attachmentRows = [
  ["南方泵业报价单.pdf", "1.25 MB", "PDF"],
  ["CDL32-40-2 技术样本.pdf", "3.48 MB", "AI"],
  ["产品合格证.jpg", "0.95 MB", "IMG"],
  ["检测报告.pdf", "2.36 MB", "PDF"],
  ["供货合同.pdf", "1.86 MB", "AI"],
];

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  icon = Sparkles,
  tone = "blue",
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

function TopMetricCards() {
  return (
    <div className="grid min-w-[1080px] grid-cols-5 gap-3">
      {topCards.map((item) => {
        const Icon = item.icon;
        const tone = toneMap[item.tone];

        return (
          <section key={item.label} className="rounded-[10px] border border-borderSoft bg-white px-4 py-3 shadow-card">
            <div className="flex items-center gap-3">
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br text-white shadow-lg", tone.icon)}>
                <Icon className="size-7" strokeWidth={2.35} />
              </span>
              <div className="min-w-0">
                <p className={cn("text-[12px] font-extrabold", tone.text)}>{item.label}</p>
                <p className={cn("mt-1 truncate text-[20px] font-extrabold", tone.text)}>{item.value}</p>
                {item.desc ? <p className="mt-1 text-[11px] font-medium text-textMuted">{item.desc}</p> : null}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PumpArtwork({ small = false }: { small?: boolean }) {
  return (
    <div className={cn("relative mx-auto", small ? "h-8 w-5" : "h-[250px] w-[138px]")}>
      <div className={cn("absolute rounded-t-full bg-gradient-to-r from-[#0B55B7] via-[#1F8CF5] to-[#073A8A] shadow-xl", small ? "left-[7px] top-0 h-5 w-5" : "left-[45px] top-0 h-[58px] w-[58px]")} />
      <div className={cn("absolute rounded-[14px] bg-gradient-to-r from-[#093D8B] via-[#166CD4] to-[#082D73]", small ? "left-[5px] top-3 h-5 w-7" : "left-[36px] top-[48px] h-[58px] w-[78px]")} />
      <div className={cn("absolute rounded-[18px] bg-gradient-to-r from-[#0B63CE] via-[#169BFF] to-[#083A8C] shadow-xl", small ? "left-[8px] top-5 h-8 w-4" : "left-[52px] top-[100px] h-[98px] w-[34px]")} />
      <div className={cn("absolute rounded-[12px] bg-gradient-to-r from-[#F97316] to-[#FDBA74]", small ? "left-[10px] top-6 h-7 w-2" : "left-[63px] top-[106px] h-[94px] w-[12px]")} />
      <div className={cn("absolute rounded-full bg-gradient-to-r from-[#0B63CE] to-[#169BFF]", small ? "left-[3px] top-12 h-5 w-8" : "left-[18px] top-[176px] h-[50px] w-[104px]")} />
      <div className={cn("absolute border-[#0B63CE] bg-[#E2F6FF]", small ? "left-0 top-14 h-5 w-9 rounded-[8px] border-2" : "left-[4px] top-[182px] h-[56px] w-[112px] rounded-[20px] border-[6px]")} />
      <div className={cn("absolute rounded-r-full bg-[#1D4ED8]", small ? "left-[28px] top-[58px] h-2 w-5" : "left-[95px] top-[198px] h-[16px] w-[44px]")} />
      <div className={cn("absolute rounded-r-full bg-[#1D4ED8]", small ? "left-[28px] top-[64px] h-2 w-4" : "left-[95px] top-[218px] h-[14px] w-[38px]")} />
      <div className={cn("absolute rounded-[10px] bg-gradient-to-r from-[#0B63CE] to-[#0EA5E9]", small ? "left-[1px] top-[74px] h-3 w-10" : "left-[0px] top-[235px] h-[24px] w-[120px]")} />
      {!small ? <div className="absolute left-[35px] top-[259px] h-[12px] w-[54px] rounded-b-[12px] bg-[#0758B7]" /> : null}
    </div>
  );
}

function EquipmentIllustration() {
  return (
    <div className="relative h-[388px] bg-gradient-to-b from-[#FAFCFF] to-white px-4 pb-3 pt-3">
      <button className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-primary shadow-sm">
        <Search className="size-4" />
      </button>
      <button className="absolute left-4 top-[178px] z-10 flex size-8 items-center justify-center rounded-full border border-borderSoft bg-white text-primary">
        <ChevronLeft className="size-5" />
      </button>
      <button className="absolute right-4 top-[178px] z-10 flex size-8 items-center justify-center rounded-full border border-borderSoft bg-white text-primary">
        <ChevronRight className="size-5" />
      </button>
      <div className="flex h-[300px] items-center justify-center">
        <PumpArtwork />
      </div>
      <div className="grid grid-cols-[repeat(4,1fr)_18px] gap-2">
        {[0, 1, 2].map((item) => (
          <span key={item} className={cn("flex h-[54px] items-center justify-center rounded-lg border bg-white", item === 0 ? "border-primary ring-2 ring-primary/10" : "border-borderSoft")}>
            <PumpArtwork small />
          </span>
        ))}
        <span className="flex h-[54px] items-center justify-center rounded-lg border border-borderSoft bg-white text-[10px] font-bold text-textMuted">图纸</span>
        <span className="flex h-[54px] items-center justify-center rounded-lg border border-borderSoft bg-white text-primary">
          <ChevronRight className="size-4" />
        </span>
      </div>
    </div>
  );
}

function KeyValueTable({ rows }: { rows: string[][] }) {
  return (
    <div className="divide-y divide-borderSoft px-3 py-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[96px_1fr] items-center gap-2 py-[7px] text-[12px]">
          <span className="font-semibold text-textMuted">{label}</span>
          <span className="text-right font-bold leading-snug text-textMain">{value}</span>
        </div>
      ))}
    </div>
  );
}

function SupplierInfoCard() {
  return (
    <div className="px-3 py-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="max-w-[150px] text-[13px] font-extrabold leading-6 text-textMain">浙江南方泵业股份有限公司</h4>
        <span className="shrink-0 rounded-md bg-success-soft px-2 py-1 text-[12px] font-extrabold text-success">优质供应商</span>
      </div>
      <div className="divide-y divide-borderSoft">
        {supplierRows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[80px_1fr] items-center gap-2 py-[8px] text-[12px]">
            <span className="font-semibold text-textMuted">{label}</span>
            <span className="text-right font-bold text-textMain">
              {label === "供应商等级" ? <span className="rounded-md bg-primary px-2 py-0.5 text-white">{value}</span> : label === "综合评分" ? <span>{value} <span className="ml-1 inline-flex text-warning">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-3 fill-current" />)}</span></span> : value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-5 border-t border-borderSoft pt-3">
        <button className="inline-flex items-center gap-1 text-[12px] font-extrabold text-primary">查看供应商详情 <ChevronRight className="size-3.5" /></button>
        <button className="inline-flex items-center gap-1 text-[12px] font-extrabold text-primary">历史合作记录 <ChevronRight className="size-3.5" /></button>
      </div>
    </div>
  );
}

function TrendChart() {
  const points = [
    [56, 135],
    [112, 122],
    [168, 122],
    [224, 148],
    [280, 170],
    [336, 178],
    [392, 176],
    [448, 162],
    [504, 138],
  ];
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");

  return (
    <div className="px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-bold text-textMuted">价格（元/台）</span>
        <button className="inline-flex items-center gap-1 text-[12px] font-extrabold text-primary">更多趋势 <ChevronRight className="size-4" /></button>
      </div>
      <svg viewBox="0 0 560 275" className="h-[292px] w-full">
        {[44, 92, 140, 188, 236].map((y, index) => (
          <g key={y}>
            <line x1="54" x2="536" y1={y} y2={y} stroke="#E5EAF3" strokeWidth="1" />
            <text x="10" y={y + 4} fill="#64748B" fontSize="13" fontWeight="600">
              {["24,000", "21,000", "18,000", "15,000", "12,000"][index]}
            </text>
          </g>
        ))}
        <line x1="54" x2="54" y1="42" y2="236" stroke="#E5EAF3" />
        <line x1="54" x2="536" y1="236" y2="236" stroke="#E5EAF3" />
        <path d={`${path} L504 236 L56 236 Z`} fill="url(#trendArea)" opacity="0.14" />
        <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#2F6BFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#2F6BFF" />
            <stop offset="1" stopColor="#2F6BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.map(([x, y], index) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={index === 8 ? 6 : 5} fill={index === 8 ? "#2F6BFF" : "white"} stroke="#2F6BFF" strokeWidth="3" />
        ))}
        <foreignObject x="310" y="72" width="158" height="92">
          <div className="rounded-lg border border-borderSoft bg-white/95 p-3 text-[12px] font-bold text-textSecondary shadow-card">
            <p className="mb-1 text-textMuted">2025-06</p>
            <p>当前价：18,600 元/台</p>
            <p className="mt-1 text-success">同比：↓ 6.2%</p>
            <p className="mt-1 text-success">环比：↓ 1.7%</p>
          </div>
        </foreignObject>
        {["2024-07", "2024-09", "2024-11", "2025-01", "2025-03", "2025-05"].map((label, index) => (
          <text key={label} x={58 + index * 88} y="264" fill="#64748B" fontSize="13" fontWeight="600">
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function AttachmentCard() {
  return (
    <SectionCard title="附件与依据（共 6 项）" icon={FileText} tone="blue" action={<button className="inline-flex items-center gap-1 text-[12px] font-bold text-primary"><Upload className="size-3.5" />上传附件</button>}>
      <div className="grid grid-cols-3 gap-3 p-3">
        {attachmentRows.map(([name, size, type]) => (
          <div key={name} className="relative rounded-[10px] border border-borderSoft bg-white p-2 text-center shadow-sm">
            {type === "AI" ? <AiBadge label="AI" className="absolute right-2 top-2 h-5 px-1.5 text-[10px]" /> : null}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--color-bg-muted)] text-primary">
              <FileText className={cn("size-8", type === "PDF" ? "text-danger" : "text-primary")} />
            </div>
            <p className="mt-2 truncate text-[11px] font-bold text-textMain">{name}</p>
            <p className="text-[10px] font-semibold text-textMuted">{size}</p>
          </div>
        ))}
        <button className="flex min-h-[118px] flex-col items-center justify-center rounded-[10px] border border-dashed border-primary bg-primary-soft text-primary">
          <Upload className="size-8" />
          <span className="mt-2 text-[12px] font-extrabold">点击或拖拽上传</span>
          <span className="mt-1 text-[10px] font-semibold">支持 pdf / doc / xls / jpg / png</span>
        </button>
      </div>
    </SectionCard>
  );
}

function AiSidePanel() {
  return (
    <aside className="space-y-3">
      <SectionCard
        title="AI 推荐与分析"
        icon={Sparkles}
        tone="purple"
        action={
          <Link href="/equipment-prices/ai-recommendation" className="text-[12px] font-bold text-primary">
            进入AI推荐
          </Link>
        }
      >
        <div className="space-y-3 p-3">
          <AiList
            title="相似设备推荐"
            action="更多"
            items={[
              ["CDL32-40-2（同系列）", "18,600 元/台", "完全匹配"],
              ["CDL32-40（不锈钢泵）", "17,800 元/台", "高匹配"],
              ["CDLF32-40（不锈钢多级泵）", "22,300 元/台", "中等匹配"],
            ]}
          />
          <AiList
            title="替代型号建议"
            action="更多"
            items={[
              ["CHL32-40（轻型立式泵）", "16,900 元/台", "推荐替代"],
              ["ISG32-40（单级清水泵）", "15,800 元/台", "可替代"],
            ]}
          />
          <div className="rounded-[10px] border border-danger/20 bg-danger-soft p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-extrabold text-danger">
                <AlertTriangle className="size-4" />
                AI 风险提示
              </span>
              <span className="text-[12px] font-bold text-danger">2 项风险提示</span>
            </div>
            <ul className="space-y-1.5 text-[12px] font-medium text-danger">
              <li>近 3 个月价格波动较大，建议关注市场趋势。</li>
              <li>供应商交货周期较长（&gt;15 天），请确认项目进度影响。</li>
            </ul>
          </div>
          <ReasonScore />
        </div>
      </SectionCard>
    </aside>
  );
}

function AiList({ title, action, items }: { title: string; action: string; items: string[][] }) {
  return (
    <div className="rounded-[10px] border border-borderSoft bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[13px] font-extrabold text-textMain">{title}</h4>
        <button className="text-[12px] font-bold text-primary">{action}</button>
      </div>
      <div className="space-y-2">
        {items.map(([name, price, tag], index) => (
          <div key={name} className="grid grid-cols-[18px_minmax(0,1fr)_86px_62px] items-center gap-2 text-[12px]">
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{index + 1}</span>
            <span className="truncate font-semibold text-textSecondary">{name}</span>
            <span className="text-right font-bold text-textMain">{price}</span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-center text-[11px] font-bold",
                tag.includes("完全") || tag.includes("推荐") ? "bg-success-soft text-success" : tag.includes("高") ? "bg-primary-soft text-primary" : "bg-warning-soft text-warning",
              )}
            >
              {tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReasonScore() {
  const rows = [
    ["市场价格对比", "94 分"],
    ["历史价格趋势", "91 分"],
    ["供应商竞争力", "92 分"],
    ["价格波动风险", "86 分"],
  ];

  return (
    <div className="rounded-[10px] border border-borderSoft bg-white p-3">
      <h4 className="mb-3 text-[13px] font-extrabold text-textMain">价格合理性评分</h4>
      <div className="grid grid-cols-[82px_1fr] items-center gap-3">
        <div className="relative flex size-[74px] items-center justify-center rounded-full bg-[conic-gradient(#2F6BFF_0_82%,#E5EAF3_82%_100%)]">
          <span className="absolute size-[54px] rounded-full bg-white" />
          <span className="relative text-center text-[20px] font-extrabold text-primary">92</span>
        </div>
        <div className="space-y-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between text-[12px]">
              <span className="font-medium text-textSecondary">{label}</span>
              <span className="font-extrabold text-success">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function EquipmentPriceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = getEquipmentPriceDetail(id);

  return (
    <AppLayout>
      <div className="min-w-0 space-y-3 overflow-x-auto overflow-y-hidden">
        <div className="flex min-w-[1440px] items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-extrabold text-textMain">设备价格详情（AI推荐替代）</h1>
            <p className="mt-1 text-[12px] font-medium text-textMuted">{detail.equipmentCode} · 浙江南方泵业股份有限公司 · 报价版本 V1.5</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/equipment-prices" className="inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary">
              <ArrowLeft className="size-4" />
              返回设备列表
            </Link>
            <Link href="/equipment-prices/ai-recommendation" className="inline-flex h-8 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-bold text-ai">
              <Sparkles className="size-4" />
              AI推荐分析
            </Link>
            <button className="inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary">
              <Printer className="size-4" />
              打印
            </button>
            <button className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary">
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid min-w-[1440px] grid-cols-[minmax(0,1fr)_240px] gap-3">
          <TopMetricCards />
          <button className="flex h-full min-h-[78px] items-center justify-center gap-2 rounded-[10px] border border-borderSoft bg-white text-[18px] font-extrabold text-primary shadow-card">
            <CalendarDays className="size-7" />
            报价日期原则
            <ChevronDown className="size-5" />
          </button>
        </div>

        <div className="grid min-w-[1440px] grid-cols-[minmax(0,1fr)_460px] gap-3">
          <main className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <SectionCard title="设备外观" icon={PackageCheck} tone="blue">
                <EquipmentIllustration />
              </SectionCard>
              <SectionCard title="技术参数" icon={Wrench} tone="green">
                <KeyValueTable rows={techParams} />
              </SectionCard>
              <SectionCard title="报价信息" icon={JapaneseYen} tone="orange">
                <KeyValueTable rows={quoteRows} />
              </SectionCard>
              <SectionCard title="供应商信息" icon={PackageCheck} tone="cyan">
                <SupplierInfoCard />
              </SectionCard>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_390px] gap-3">
              <SectionCard title="历史价格版本" subtitle="近 12 个月" icon={CalendarDays} tone="blue" action={<button className="text-[12px] font-bold text-primary">更多报价</button>}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-[12px]">
                    <thead className="bg-[var(--color-bg-muted)] text-textSecondary">
                      <tr>
                        {["版本号", "报价日期", "含税单价（元/台）", "数量（台）", "报价单位", "审核状态", "可信度", "操作人", "操作"].map((header) => (
                          <th key={header} className="h-9 px-3 text-left font-bold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {versionRows.map((row) => (
                        <tr key={row[0]} className="border-t border-borderSoft">
                          {row.map((cell, index) => (
                            <td key={`${row[0]}-${index}`} className="h-10 px-3 text-textSecondary">
                              {index === 5 ? (
                                <StatusBadge status="confirmed" label={cell} className="h-5 text-[11px]" />
                              ) : index === 6 ? (
                                <ConfidenceBadge level={Number.parseFloat(cell) >= 90 ? "A" : "B"} className="h-5 text-[11px]" />
                              ) : (
                                cell
                              )}
                            </td>
                          ))}
                          <td className="px-3 text-primary">查看 详情</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <AttachmentCard />
            </div>
          </main>

          <aside className="space-y-3">
            <SectionCard title="价格趋势（近 12 个月）" icon={LineChart} tone="blue">
              <TrendChart />
            </SectionCard>
            <AiSidePanel />
          </aside>
        </div>

        <div className="grid min-w-[1440px] grid-cols-6 gap-6 rounded-[10px] border border-borderSoft bg-white px-8 py-3 shadow-card">
          {[
            { label: "编辑价格", icon: Wrench, className: "bg-primary text-white" },
            { label: "上传附件", icon: Upload, className: "border-success text-success" },
            { label: "AI推荐分析", icon: Sparkles, className: "border-ai-border text-ai", href: "/equipment-prices/ai-recommendation" },
            { label: "加入比价", icon: Send, className: "border-warning text-warning" },
            { label: "导出价格依据表", icon: Download, className: "border-primary text-primary" },
            { label: "删除本条价格", icon: Trash2, className: "border-danger text-danger" },
          ].map((item) => {
            const IconComp = item.icon;
            const className = cn("inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-extrabold", item.className);

            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className={className}>
                  <IconComp className="size-4" />
                  {item.label}
                </Link>
              );
            }

            return (
              <button key={item.label} className={className}>
                <IconComp className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
