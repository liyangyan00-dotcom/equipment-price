import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileBadge2,
  FileText,
  Globe2,
  Handshake,
  Mail,
  MapPin,
  Package,
  Phone,
  Radar,
  Send,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AiBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { ModuleHeader, PriceCell, TableActionGroup } from "@/components/common";
import type { SupplierDetail } from "@/data/mock/supplierDetails";
import { cn } from "@/lib/utils";

type SupplierDetailViewProps = {
  detail: SupplierDetail;
};

const radarMetrics = [
  { label: "价格竞争力", value: 82, x: 110, y: 28 },
  { label: "技术匹配度", value: 88, x: 194, y: 78 },
  { label: "报价响应速度", value: 90, x: 170, y: 174 },
  { label: "非洲项目经验", value: 85, x: 52, y: 174 },
  { label: "资料完整度", value: 78, x: 26, y: 78 },
  { label: "交付能力", value: 86, x: 110, y: 218 },
] as const;

const qualificationFiles = [
  { name: "营业执照.pdf", date: "2024-06-01", size: "1.2 MB" },
  { name: "ISO9001证书.pdf", date: "2024-06-01", size: "1.8 MB" },
  { name: "税务登记证明.pdf", date: "2024-06-01", size: "1.1 MB" },
  { name: "银行资信证明.pdf", date: "2024-06-01", size: "0.9 MB" },
  { name: "产品目录.pdf", date: "2024-06-01", size: "3.4 MB" },
  { name: "工厂照片.jpg", date: "2024-06-01", size: "2.6 MB" },
  { name: "质保承诺书.pdf", date: "2024-06-01", size: "0.8 MB" },
  { name: "出口许可证.pdf", date: "2024-06-01", size: "1.3 MB" },
];

const recommendedScenes = [
  { name: "大型供水泵站项目", match: "92%", stars: 4 },
  { name: "污水处理厂设备采购", match: "88%", stars: 4 },
  { name: "高扬程泵井采购", match: "85%", stars: 4 },
];

const riskTips = [
  { text: "近6个月报价波动较大", level: "medium" as const },
  { text: "交货周期受港口拥堵影响", level: "low" as const },
  { text: "原材料价格上涨压力", level: "medium" as const },
];

const businessAdvice = [
  "建议锁定当前价格，尽快签订供货合同",
  "可要求提供延长质保期作为谈判条件",
  "建议分批交货以降低物流延迟风险",
  "可考虑年度框架协议以获得更优价格",
];

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[10px] border border-borderSoft bg-white shadow-card", className)}>{children}</section>;
}

function SectionHeader({
  title,
  action,
  icon: Icon,
}: {
  title: string;
  action?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="border-b border-borderSoft px-4 py-3">
      <ModuleHeader
        icon={Icon ?? Sparkles}
        title={title}
        tone={title.includes("AI") ? "purple" : title.includes("风险") ? "orange" : "blue"}
        density="compact"
        headingLevel={3}
        action={
          action ? (
            action === "AI" ? (
              <AiBadge label="AI" icon="analysis" className="h-5 text-[11px]" />
            ) : (
              <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                {action}
                <ChevronRight className="size-3.5" />
              </button>
            )
          ) : null
        }
      />
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "blue",
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: ReactNode;
  description?: string;
  tone?: "blue" | "cyan" | "purple" | "green" | "orange";
  children?: React.ReactNode;
}) {
  const toneConfig = {
    blue: {
      icon: "from-blue-500 to-blue-600 text-white shadow-blue-500/25",
      label: "text-blue-600",
      value: "text-blue-700",
      glow: "bg-blue-500/10",
    },
    cyan: {
      icon: "from-sky-400 to-cyan-500 text-white shadow-cyan-500/25",
      label: "text-cyan",
      value: "text-sky-700",
      glow: "bg-cyan/10",
    },
    purple: {
      icon: "from-violet-500 to-purple-600 text-white shadow-violet-500/25",
      label: "text-ai",
      value: "text-violet-700",
      glow: "bg-ai/10",
    },
    green: {
      icon: "from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25",
      label: "text-success",
      value: "text-emerald-700",
      glow: "bg-success/10",
    },
    orange: {
      icon: "from-amber-400 to-orange-500 text-white shadow-orange-500/25",
      label: "text-warning",
      value: "text-orange-700",
      glow: "bg-warning/10",
    },
  }[tone];

  return (
    <Card className="min-h-[104px] overflow-hidden px-4 py-3">
      <div className="flex h-full items-center gap-3">
        <span className="relative flex size-14 shrink-0 items-center justify-center">
          <span className={cn("absolute inset-1 rounded-[16px] blur-md", toneConfig.glow)} />
          <span className={cn("relative flex size-12 items-center justify-center rounded-[14px] bg-gradient-to-br shadow-lg", toneConfig.icon)}>
            <Icon className="size-7 drop-shadow-sm" strokeWidth={2.3} />
          </span>
        </span>
        <div className="min-w-0">
          <div className={cn("text-[13px] font-bold", toneConfig.label)}>{label}</div>
          <div className={cn("mt-1 line-clamp-2 break-words text-[20px] font-extrabold leading-6", toneConfig.value)}>{value}</div>
          {description ? <div className="mt-1 truncate text-[12px] font-medium text-textMuted">{description}</div> : null}
          {children}
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-[13px]">
      <span className="inline-flex items-center gap-2 font-semibold text-textSecondary">
        <Icon className="size-4 text-primary" />
        {label}
      </span>
      <span className="text-textMain">{value}</span>
    </div>
  );
}

function ContactCard({ title, name, role, phone, email }: { title: string; name: string; role: string; phone: string; email: string }) {
  return (
    <div className="rounded-[10px] border border-borderSoft bg-[var(--color-bg-muted)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-bold text-textMain">{title}</span>
        <span className="rounded-pill bg-ai-soft px-2 py-0.5 text-[11px] font-semibold text-ai">{role}</span>
      </div>
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-textMuted">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0 space-y-1 text-[12px] text-textSecondary">
          <div className="font-bold text-textMain">{name}</div>
          <div className="inline-flex items-center gap-1"><Phone className="size-3.5 text-primary" />{phone}</div>
          <div className="truncate"><Mail className="mr-1 inline size-3.5 text-primary" />{email}</div>
        </div>
      </div>
    </div>
  );
}

function CapabilityRadar() {
  return (
    <Card>
      <SectionHeader title="供应商能力雷达图" action="更多维度" icon={Radar} />
      <div className="px-4 py-3">
        <svg viewBox="0 0 220 230" className="mx-auto h-[220px] max-w-full" aria-label="供应商能力雷达图">
          <polygon points="110,34 182,76 164,160 56,160 38,76" fill="none" stroke="#D8E3F0" strokeWidth="2" />
          <polygon points="110,62 152,86 142,138 78,138 68,88" fill="none" stroke="#E5EDF7" />
          <polygon points="110,56 164,84 148,148 72,148 58,88" fill="#2F6BFF" fillOpacity="0.22" stroke="#2F6BFF" strokeWidth="3" />
          <line x1="110" y1="34" x2="110" y2="160" stroke="#E5EDF7" />
          <line x1="38" y1="76" x2="182" y2="76" stroke="#E5EDF7" />
          <line x1="56" y1="160" x2="182" y2="76" stroke="#E5EDF7" />
          <line x1="164" y1="160" x2="38" y2="76" stroke="#E5EDF7" />
          {radarMetrics.slice(0, 5).map((item) => (
            <g key={item.label}>
              <text x={item.x} y={item.y} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1E2A44">{item.label}</text>
              <text x={item.x} y={item.y + 13} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1E2A44">{item.value}</text>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

function AiScorePanel({ detail }: { detail: SupplierDetail }) {
  return (
    <Card>
      <SectionHeader title="AI 综合评估" action="AI" icon={Sparkles} />
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-[150px_1fr]">
        <div className="flex flex-col items-center">
          <div className="relative flex size-[120px] items-center justify-center rounded-full" style={{ background: "conic-gradient(#2F6BFF 0 87.6%, #E5EDF7 87.6% 100%)" }}>
            <div className="absolute size-[86px] rounded-full bg-white" />
            <div className="relative text-center">
              <div className="text-[26px] font-bold text-textMain">{detail.overallScore}</div>
              <div className="text-[11px] font-semibold text-textMuted">综合评分</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-warning">
            {[0, 1, 2, 3].map((item) => <Star key={item} className="size-4 fill-current" />)}
            <Star className="size-4 text-borderSoft" />
          </div>
        </div>
        <div className="space-y-2 text-[12px] text-textSecondary">
          <p><span className="font-semibold text-textMain">评估模型：</span>AI供应商评估模型 v2.1</p>
          <p><span className="font-semibold text-textMain">评估时间：</span>2025-05-20 14:30</p>
          <p><span className="font-semibold text-textMain">评估维度：</span>6 大维度 32 项指标</p>
          <button className="mt-2 h-8 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary">查看评估详情</button>
        </div>
      </div>
    </Card>
  );
}

function RecommendedScenes() {
  return (
    <Card>
      <SectionHeader title="推荐采购场景" icon={Package} />
      <div className="space-y-2 px-4 py-3">
        {recommendedScenes.map((scene) => (
          <div key={scene.name} className="grid grid-cols-[1fr_78px_48px] items-center gap-2 text-[12px]">
            <span className="truncate font-semibold text-textSecondary">{scene.name}</span>
            <span className="text-warning">{"★".repeat(scene.stars)}<span className="text-borderSoft">★</span></span>
            <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-center text-[11px] font-semibold text-success">{scene.match}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RiskTips() {
  return (
    <Card>
      <SectionHeader title="风险提示" icon={ShieldPlus} />
      <div className="space-y-2 px-4 py-3">
        {riskTips.map((risk, index) => (
          <div key={risk.text} className="grid grid-cols-[20px_1fr_62px] items-center gap-2 text-[12px]">
            <span className="flex size-5 items-center justify-center rounded-full bg-danger-soft text-danger">{index + 1}</span>
            <span className="text-textSecondary">{risk.text}</span>
            <RiskBadge level={risk.level} className="h-5 justify-center whitespace-nowrap text-[11px]" />
          </div>
        ))}
        <button className="mt-2 inline-flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-primary">
          查看完整风险报告 <ChevronRight className="size-3.5" />
        </button>
      </div>
    </Card>
  );
}

function BusinessAdvice() {
  return (
    <Card>
      <SectionHeader title="商务建议" icon={Award} />
      <div className="space-y-3 px-4 py-3">
        {businessAdvice.map((item) => (
          <div key={item} className="flex gap-2 text-[12px] text-textSecondary">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </div>
        ))}
        <button className="mt-2 inline-flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-primary">
          生成 AI 商务建议书 <ChevronRight className="size-3.5" />
        </button>
      </div>
    </Card>
  );
}

export function SupplierDetailView({ detail }: SupplierDetailViewProps) {
  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <div className="flex items-center justify-between rounded-[10px] border border-borderSoft bg-white px-4 py-3 shadow-card">
        <div className="min-w-0">
          <Link href="/suppliers" className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
            <ArrowLeft className="size-3.5" />
            返回供应商库
          </Link>
          <h1 className="truncate text-[22px] font-bold text-textMain">供应商详情（AI评估）</h1>
        </div>
        <TableActionGroup actions={[{ label: "创建询价", icon: Send, tone: "primary" }, { label: "AI复评", icon: Sparkles, tone: "ai" }, { label: "导出档案", icon: Download }]} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.65fr_1fr_1fr_1.55fr_1fr_1fr_1fr]">
        <OverviewCard icon={Building2} label="供应商名称" value={detail.supplierName} description={`${detail.supplierCode}（内部编码）`} tone="blue">
          <span className="mt-1 inline-flex rounded-md border border-success/20 bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">已认证</span>
        </OverviewCard>
        <OverviewCard icon={Globe2} label="国家/地区" value="南非" description="South Africa" tone="cyan" />
        <OverviewCard icon={FileBadge2} label="供应商类型" value={detail.category} description="泵类设备制造商" tone="purple" />
        <OverviewCard icon={Package} label="主营产品" value="水泵、阀门、管件、控制系统" description="泵井泵、污水泵、阀门及配件" tone="blue" />
        <OverviewCard icon={Star} label="综合评分" value={<>{detail.overallScore}<span className="ml-1 text-[12px] font-bold text-textMuted">/100</span></>} tone="blue">
          <div className="mt-2 flex items-center gap-1">
            {[0, 1, 2, 3].map((item) => <Star key={item} className="size-3.5 fill-warning text-warning" />)}
            <Star className="size-3.5 fill-borderSoft text-borderSoft" />
            <span className="ml-1 rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary">优秀</span>
          </div>
        </OverviewCard>
        <OverviewCard icon={ShieldCheck} label="交付风险" value="低风险" description="风险维度 18/100" tone="orange" />
        <OverviewCard icon={ClipboardCheck} label="报价次数" value={`${detail.quoteCount} 次`} description="近12个月报价次数" tone="green" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[1.05fr_1.15fr_1.1fr]">
            <Card>
              <SectionHeader title="基础信息" icon={Building2} />
              <div className="space-y-3 px-4 py-3">
                <InfoRow icon={CalendarDays} label="成立时间" value="2005-03-18（19年）" />
                <InfoRow icon={UserRound} label="公司规模" value="201-500人" />
                <InfoRow icon={BriefcaseBusiness} label="注册资本" value="ZAR 8,500,000" />
                <InfoRow icon={CheckCircle2} label="企业性质" value="股份有限公司" />
                <InfoRow icon={FileBadge2} label="ISO认证" value="ISO 9001:2015" />
                <InfoRow icon={MapPin} label="注册地址" value="15 Electron Ave, Isando, Johannesburg, 南非" />
                <InfoRow icon={Package} label="经营范围" value="水泵及流体设备研发、生产与销售，提供水处理解决方案" />
              </div>
            </Card>

            <Card>
              <SectionHeader title="联系人信息" action="更多联系人" icon={UserRound} />
              <div className="space-y-3 px-4 py-3">
                <ContactCard title="主要联系人" name="Thabo Nkosi" role="采购经理" phone="+27 11 123 4567" email="thabo.nkosi@aquapump.co.za" />
                <ContactCard title="备用联系人" name="Lindiwe Mokoena" role="销售经理" phone="+27 11 987 6543" email="lindiwe.mokoena@aquapump.co.za" />
              </div>
            </Card>

            <CapabilityRadar />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
            <Card>
              <SectionHeader title="历史报价记录（近12个月）" action="更多报价" icon={FileText} />
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full min-w-[840px] table-fixed text-left text-[12px]">
                  <thead className="text-textMuted">
                    <tr className="border-b border-borderSoft">
                      <th className="w-[130px] py-2 font-semibold">报价编号</th>
                      <th className="w-[150px] py-2 font-semibold">项目名称</th>
                      <th className="w-[140px] py-2 font-semibold">报价产品</th>
                      <th className="w-[132px] py-2 pr-4 text-right font-semibold">报价金额（USD）</th>
                      <th className="w-[110px] py-2 pl-4 font-semibold">报价日期</th>
                      <th className="w-[76px] py-2 font-semibold">有效期</th>
                      <th className="w-[96px] py-2 font-semibold">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.quoteHistory.map((quote, index) => (
                      <tr key={quote.quoteCode} className="border-b border-borderSoft/70 last:border-0">
                        <td className="py-2 font-semibold text-primary">{quote.quoteCode}</td>
                        <td className="py-2">Water Project {index + 1}</td>
                        <td className="py-2">{quote.itemName}</td>
                        <td className="py-2 pr-4 text-right"><PriceCell value={quote.amount} currency={quote.currency} /></td>
                        <td className="py-2 pl-4">{quote.quoteDate}</td>
                        <td className="py-2">30天</td>
                        <td className="py-2"><StatusBadge status={quote.status} className="h-5 text-[11px]" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <SectionHeader title="合作记录" action="更多记录" icon={Handshake} />
              <div className="space-y-3 px-4 py-3 text-[13px]">
                {[
                  ["首次合作时间", "2022-06-15"],
                  ["合作项目数", "8 个"],
                  ["累计采购金额", "1,256,800.00 USD"],
                  ["准时交货率", "94.2%"],
                  ["质量合格率", "98.6%"],
                  ["售后服务满意度", "4.6 / 5"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-textMuted">{label}</span>
                    <span className="font-semibold text-textMain">{value}</span>
                  </div>
                ))}
                <div className="pt-1 text-right"><span className="rounded-md bg-success-soft px-2 py-1 text-[12px] font-semibold text-success">正常合作</span></div>
              </div>
            </Card>
          </div>

          <Card>
            <SectionHeader title="资质文件（8）" action="全部下载" icon={FileBadge2} />
            <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              {qualificationFiles.map((file) => (
                <div key={file.name} className="rounded-[8px] border border-borderSoft bg-white p-2 shadow-sm">
                  <div className="flex h-[72px] items-center justify-center rounded-md bg-[var(--color-bg-muted)] text-danger">
                    <FileText className="size-7" />
                  </div>
                  <div className="mt-2 truncate text-[12px] font-semibold text-textMain">{file.name}</div>
                  <div className="mt-1 text-[11px] text-textMuted">{file.date}</div>
                  <div className="text-[11px] text-primary">{file.size}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <AiScorePanel detail={detail} />
          <RecommendedScenes />
          <RiskTips />
          <BusinessAdvice />
        </div>
      </div>
    </div>
  );
}
