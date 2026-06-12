import type { ReactNode } from "react";
import Link from "next/link";
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
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

const detail = {
  materialCode: "MAT-2025-00456",
  materialName: "HRB400 钢筋（Φ16mm）",
  category: "钢材",
  specification: "Φ16mm",
  unit: "吨",
  materialGrade: "HRB400",
  standard: "GB/T 1499.2-2018",
  process: "热轧带肋钢筋",
  scope: "结构主体钢筋",
  confidence: "92%",
  reviewStatus: "已审核",
  riskLevel: "中风险",
  originalPrice: "CDF 7,200.00",
  usdPrice: "USD 1,020.00",
  currency: "CDF",
  exchangeRate: "1 USD = 7,058.82 CDF",
  quoteDate: "2025-05-16",
  validUntil: "2025-06-15",
  transportCondition: "含运费到厂",
  destination: "Kinshasa",
  supplier: "Kinshasa Build Materials",
  sourceType: "供应商报价",
  quoteOwner: "Jean Kabila",
  quoteMethod: "邮箱",
  project: "Kinshasa 水厂扩建项目",
  inputBy: "AI 采集 + 人工确认",
  updatedAt: "2025-05-16 14:32",
};

const statCards = [
  { label: "当前折算美元价", value: "1,020.00", unit: "USD / 吨", icon: LineChart, tone: "purple", note: "近30天均价波动" },
  { label: "原始报价", value: "CDF 7,200.00", unit: "CDF / 吨", icon: WalletCards, tone: "blue", note: "供应商原始报价" },
  { label: "币种 / 汇率", value: "CDF", unit: "1 USD = 7,058.82 CDF", icon: Database, tone: "cyan", note: "按报价日汇率折算" },
  { label: "报价日期", value: "2025-05-16", unit: "有效期 30 天", icon: CalendarDays, tone: "blue", note: "报价记录时间" },
  { label: "运输条件", value: "含运费到厂", unit: "Kinshasa", icon: PackageSearch, tone: "green", note: "到场条件" },
  { label: "数据来源", value: "供应商报价", unit: "人工录入", icon: ShieldCheck, tone: "orange", note: "保留报价依据" },
] as const;

const toneMap = {
  blue: "from-[#2F6BFF] to-[#0EA5E9] text-primary",
  cyan: "from-[#14B8A6] to-[#38BDF8] text-cyan",
  green: "from-[#22C55E] to-[#10B981] text-success",
  orange: "from-[#F59E0B] to-[#F97316] text-warning",
  purple: "from-[#8B5CF6] to-[#6D5DFB] text-ai",
} as const;

const baseInfo = [
  ["材料编号", detail.materialCode],
  ["材料名称", "HRB400 钢筋"],
  ["材料类别", detail.category],
  ["规格型号", detail.specification],
  ["计量单位", detail.unit],
  ["材料材质", detail.materialGrade],
  ["执行标准", detail.standard],
  ["生产工艺", detail.process],
  ["适用范围", detail.scope],
  ["参数完整度", detail.confidence],
];

const sourceInfo = [
  ["原始价格", `${detail.originalPrice} / 吨`],
  ["折算美元价", `${detail.usdPrice} / 吨`],
  ["币种", detail.currency],
  ["汇率", detail.exchangeRate],
  ["报价日期", detail.quoteDate],
  ["有效期", detail.validUntil],
  ["运输条件", detail.transportCondition],
  ["目的地", detail.destination],
  ["供应商", detail.supplier],
  ["来源类型", detail.sourceType],
  ["报价人", detail.quoteOwner],
  ["报价方式", detail.quoteMethod],
  ["关联项目", detail.project],
  ["审核状态", detail.reviewStatus],
  ["录入人", detail.inputBy],
  ["更新时间", detail.updatedAt],
];

const aiInsightItems = [
  { title: "价格波动提醒", desc: "近30天该规格钢筋报价下行 8.6%，建议关注市场波动与锁价窗口。", action: "查看详情", tone: "purple" },
  { title: "缺口提醒", desc: "Kinshasa 区域 Φ20mm 钢筋报价缺口偏大，建议补充同区域采集。", action: "去采集", tone: "orange" },
  { title: "运输成本影响", desc: "柴油价格上行可能影响到场成本，建议同步核验含运费条件。", action: "查看分析", tone: "purple" },
  { title: "替代材料建议", desc: "可补充 HRB400E 同规格报价，形成更完整的套价依据。", action: "查看方案", tone: "green" },
];

const historyRows = [
  ["2025-05-16", "7,200.00", "1,020.00", "含运费到厂", "供应商报价", "AI采集 + 人工", "已审核", "85%"],
  ["2025-05-02", "7,450.00", "1,052.00", "含运费到厂", "供应商报价", "人工录入", "已审核", "82%"],
  ["2025-04-18", "7,650.00", "1,089.00", "含运费到厂", "供应商报价", "人工录入", "已审核", "80%"],
  ["2025-04-06", "7,800.00", "1,108.00", "含运费到厂", "市场调研", "AI采集", "已审核", "78%"],
  ["2025-03-20", "8,100.00", "1,160.00", "含运费到厂", "市场调研", "AI采集", "已审核", "76%"],
];

const actions = [
  ["发起询价任务", "向 3 家供应商发起补充询价"],
  ["补充市场调研", "扩充同地区同规格报价"],
  ["生成价格说明", "生成该条价格依据报告"],
  ["加入项目套价", "添加到 Kinshasa 项目"],
];

const attachments = [
  ["报价单_KBM_20250516.pdf", "PDF · 256 KB · 2025-05-16"],
  ["邮箱报价记录.eml", "EML · 128 KB · 2025-05-16"],
  ["市场调研报告_Φ16.pdf", "PDF · 512 KB · 2025-05-10"],
  ["运输条件说明.pdf", "PDF · 198 KB · 2025-05-10"],
];

const risks = [
  ["价格风险", "当前价格低于市场均价 8.6%，需关注后续价格波动。", "中风险"],
  ["数据风险", "数据来源可靠，供应商报价并附有报价凭证。", "低风险"],
  ["运输风险", "需关注燃油价格波动对到场成本影响。", "中风险"],
  ["有效期风险", "报价有效期剩余 30 天，仍在有效期内。", "低风险"],
  ["参数风险", "材料参数完整，无缺失项。", "低风险"],
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

function TopStats() {
  return (
    <div className="grid min-w-[1180px] grid-cols-6 gap-3">
      {statCards.map((item) => {
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
    <div className={cn("grid border-t border-borderSoft", columns === 5 ? "grid-cols-5" : "grid-cols-4")}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-h-[54px] border-b border-r border-borderSoft px-3 py-2 last:border-r-0">
          <p className="text-[11px] font-semibold text-textMuted">{label}</p>
          {label === "参数完整度" ? (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-ai-soft">
                  <div className="h-full w-[92%] rounded-full bg-ai" />
                </div>
                <span className="text-[11px] font-extrabold text-textMuted">92%</span>
              </div>
            </div>
          ) : (
            <p className="mt-1 truncate text-[13px] font-extrabold text-textMain">{value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function AiInsightPanel() {
  return (
    <SectionCard title="AI 智能洞察" icon={Sparkles} tone="purple" action={<AiBadge label="AI洞察" icon="analysis" className="h-5 text-[11px]" />}>
      <div className="space-y-3 p-3">
        {aiInsightItems.map((item) => (
          <div key={item.title} className={cn("rounded-[10px] border p-3", item.tone === "orange" ? "border-warning/20 bg-warning-soft" : item.tone === "green" ? "border-success/20 bg-success-soft" : "border-ai-border bg-ai-soft")}>
            <div className="mb-1 flex items-center justify-between">
              <h4 className={cn("text-[12px] font-extrabold", item.tone === "orange" ? "text-warning" : item.tone === "green" ? "text-success" : "text-ai")}>{item.title}</h4>
              <button className="text-[11px] font-bold text-primary">{item.action}</button>
            </div>
            <p className="text-[11px] font-medium leading-5 text-textSecondary">{item.desc}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function MiniTrendChart() {
  const points = [
    [22, 116],
    [72, 82],
    [122, 54],
    [172, 65],
    [222, 122],
    [272, 82],
    [322, 68],
    [372, 48],
  ];
  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");

  return (
    <svg viewBox="0 0 400 150" className="h-[118px] w-full">
      {[35, 75, 115].map((y) => (
        <line key={y} x1="18" x2="388" y1={y} y2={y} stroke="#E5EAF3" strokeDasharray="4 4" />
      ))}
      <path d={`${path} L372 132 L22 132 Z`} fill="url(#matTrend)" opacity="0.14" />
      <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#7C3AED" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="matTrend" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="white" stroke="#7C3AED" strokeWidth="2.3" />
      ))}
      <text x="142" y="144" fill="#16A34A" fontSize="12" fontWeight="700">总体呈下降趋势</text>
    </svg>
  );
}

function AnalysisCards() {
  const enhancedCards = [
    {
      title: "AI 价值合理性判断",
      eyebrow: "多源价格校验",
      value: "合理",
      metric: "72/100",
      desc: "结合供应商报价、近30天同规格价格与到场条件，当前价低于均价 8.6%，可进入暂估价。",
      tone: "green",
    },
    {
      title: "AI 区域价差对比",
      eyebrow: "Kinshasa · Φ16mm",
      value: "USD 1,020.00",
      metric: "低于均价 -8.6%",
      desc: "AI 对比 5 个区域与 12 条相似报价，识别本条价格具备阶段性锁价优势。",
      tone: "blue",
    },
    {
      title: "AI 趋势预测",
      eyebrow: "近30天波动模型",
      value: "下降收敛",
      metric: "趋势置信 86%",
      desc: "钢筋价格短期仍偏弱，但柴油与运输成本可能推高到场价，建议持续观察。",
      tone: "purple",
    },
    {
      title: "AI 采购建议",
      eyebrow: "项目套价动作",
      value: "本周锁价",
      metric: "建议发起询价",
      desc: "适合进入项目暂估价；建议同步向 3 家供应商补询，形成可审计价格依据。",
      tone: "orange",
    },
  ];

  return (
    <SectionCard title="AI 价格分析与建议" subtitle="地材价格智能估值、区域对比、趋势预测与采购动作建议" icon={Sparkles} tone="purple" action={<AiBadge label="AI建议" icon="suggestion" className="h-5 text-[11px]" />}>
      <div className="grid grid-cols-4 gap-3 p-3">
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
                {index === 0 ? (
                  <div className="mb-3 flex items-center gap-3">
                    <div className="relative flex size-[76px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#22C55E_0_72%,#E5EAF3_72%_100%)]">
                      <span className="absolute size-[56px] rounded-full bg-white" />
                      <span className="relative text-[15px] font-extrabold text-success">{item.value}</span>
                    </div>
                    <div>
                      <p className="text-[20px] font-extrabold text-success">{item.metric}</p>
                      <p className="mt-1 text-[11px] font-bold text-textMuted">合理度评分</p>
                    </div>
                  </div>
                ) : index === 2 ? (
                  <div className="mb-2">
                    <MiniTrendChart />
                  </div>
                ) : (
                  <div className="mb-3">
                    <p className={cn("text-[22px] font-extrabold", isBlue ? "text-primary" : isOrange ? "text-warning" : "text-ai")}>{item.value}</p>
                    <p className="mt-1 text-[12px] font-extrabold text-textSecondary">{item.metric}</p>
                  </div>
                )}
                <p className="min-h-[48px] text-[12px] font-semibold leading-5 text-textSecondary">{item.desc}</p>
                {index === 3 ? <button className="mt-3 h-8 w-full rounded-md bg-ai text-[12px] font-bold text-white shadow-ai">创建询价任务</button> : null}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function HistoryTable() {
  const headers = ["报价日期", "原始价格（CDF/吨）", "折算美元价（USD/吨）", "运输条件", "来源", "录入人", "审核状态", "可信度"];

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
            {historyRows.map((row) => (
              <tr key={row[0]} className="border-t border-borderSoft">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${index}`} className={cn("h-9 px-3", index === 6 ? "font-bold text-success" : "text-textSecondary")}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-3 text-[12px] text-textMuted">
        <span>共 5 条记录</span>
        <div className="flex items-center gap-2">
          <button className="rounded-md border border-borderSoft px-2 py-1">10 条/页</button>
          <button className="rounded-md bg-ai px-2 py-1 text-white">1</button>
        </div>
      </div>
    </SectionCard>
  );
}

function RightActions() {
  return (
    <SectionCard title="推荐操作" icon={Workflow} tone="purple">
      <div className="space-y-2 p-3">
        {actions.map(([title, desc]) => (
          <button key={title} className="grid w-full grid-cols-[28px_1fr] items-center gap-2 rounded-lg border border-borderSoft bg-white px-3 py-2 text-left hover:border-ai-border hover:bg-ai-soft">
            <span className="flex size-7 items-center justify-center rounded-md bg-ai-soft text-ai"><FileText className="size-4" /></span>
            <span>
              <span className="block text-[12px] font-extrabold text-textMain">{title}</span>
              <span className="block text-[10px] font-medium text-textMuted">{desc}</span>
            </span>
          </button>
        ))}
        <button className="mt-1 h-8 w-full rounded-md border border-borderSoft text-[12px] font-bold text-ai">更多操作 <ChevronDown className="ml-1 inline size-3.5" /></button>
      </div>
    </SectionCard>
  );
}

function AttachmentPanel() {
  return (
    <SectionCard title="关联附件" icon={FileText} tone="blue" action={<button className="text-[11px] font-bold text-primary">全部下载</button>}>
      <div className="space-y-2 p-3">
        {attachments.map(([title, meta]) => (
          <div key={title} className="flex items-center gap-2 rounded-lg border border-borderSoft bg-white p-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-danger-soft text-danger"><FileText className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-textMain">{title}</span>
              <span className="block truncate text-[10px] font-medium text-textMuted">{meta}</span>
            </span>
            <ChevronRight className="size-4 text-textMuted" />
          </div>
        ))}
        <button className="h-8 w-full rounded-md bg-ai-soft text-[12px] font-bold text-ai">查看更多附件（8）</button>
      </div>
    </SectionCard>
  );
}

function RiskPanel() {
  return (
    <SectionCard title="风险与注意事项" icon={AlertTriangle} tone="orange">
      <div className="grid grid-cols-5 gap-3 p-3">
        {risks.map(([title, desc, level]) => (
          <div key={title} className="rounded-[10px] border border-borderSoft bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[12px] font-extrabold text-textMain">
                <AlertTriangle className={cn("size-3.5", level === "中风险" ? "text-warning" : "text-success")} />
                {title}
              </span>
              <RiskBadge level={level === "中风险" ? "medium" : "low"} className="h-5 text-[10px]" />
            </div>
            <p className="text-[11px] font-medium leading-5 text-textSecondary">{desc}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default async function MaterialPriceDetailPage({ params }: PageProps) {
  await params;

  return (
    <AppLayout>
      <main className="space-y-3 p-4">
        <section className="rounded-[14px] border border-borderSoft bg-white/90 px-4 py-3 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <Link href="/material-prices" className="mb-2 inline-flex items-center gap-1 text-[12px] font-bold text-primary">
                <ArrowLeft className="size-4" />
                返回地材价格库
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[26px] font-extrabold text-textMain">{detail.materialName}</h1>
                <Star className="size-4 text-textMuted" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-textMuted">
                <span>材料编号：{detail.materialCode}</span>
                <ConfidenceBadge level="A" className="h-6" />
                <StatusBadge status="confirmed" label={detail.reviewStatus} className="h-6" />
                <RiskBadge level="medium" className="h-6" />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary shadow-sm"><Edit3 className="size-4" />编辑</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary shadow-sm"><Copy className="size-4" />复制记录</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-3 text-[12px] font-bold text-white shadow-ai"><Sparkles className="size-4" />AI 价格分析</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary shadow-sm">更多操作 <ChevronDown className="size-4" /></button>
            </div>
          </div>
          <div className="overflow-x-auto pb-1">
            <TopStats />
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-3">
          <div className="space-y-3">
            <SectionCard title="基础信息" icon={Database} tone="blue">
              <InfoGrid rows={baseInfo} columns={5} />
            </SectionCard>

            <SectionCard title="价格与来源信息" icon={WalletCards} tone="cyan">
              <InfoGrid rows={sourceInfo} columns={4} />
            </SectionCard>

            <AnalysisCards />
            <HistoryTable />
          </div>

          <aside className="space-y-3">
            <AiInsightPanel />
            <RightActions />
            <AttachmentPanel />
          </aside>
        </div>

        <RiskPanel />
      </main>
    </AppLayout>
  );
}
