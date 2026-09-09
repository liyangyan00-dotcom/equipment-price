"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileBadge2,
  FileSpreadsheet,
  FileText,
  Gavel,
  Globe2,
  Handshake,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Package,
  Phone,
  Radar,
  Send,
  SearchCheck,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Star,
  UserRound,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { AiBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { ModuleHeader, PriceCell, TableActionGroup } from "@/components/common";
import type { DueDiligenceStatus } from "@/data/mock/p0SupplierDueDiligence";
import {
  p0SupplierVerificationById,
  type P0VerificationStatus,
} from "@/data/mock/p0SupplierVerificationReport";
import { p1SupplierVerificationById } from "@/data/mock/p1SupplierVerificationReport";
import { p2SupplierVerificationById } from "@/data/mock/p2SupplierVerificationReport";
import type { SupplierDetail } from "@/data/mock/supplierDetails";
import { emitMockToast } from "@/hooks/useMockToast";
import { useSupplierVerification } from "@/hooks/useSupplierVerification";
import { cn } from "@/lib/utils";

type SupplierDetailViewProps = {
  detail: SupplierDetail;
};

type SupplierToastTone = "success" | "info" | "warning" | "danger" | "ai";

function emitSupplierToast(title: string, description?: string, tone: SupplierToastTone = "info") {
  emitMockToast({ title, description, tone });
}

function createSupplierAction(title: string, description?: string, tone: SupplierToastTone = "info") {
  return () => emitSupplierToast(title, description, tone);
}

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
  return <section className={cn("min-w-0 rounded-[10px] border border-borderSoft bg-white shadow-card", className)}>{children}</section>;
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
              <button
                data-no-global-interaction
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
                type="button"
                onClick={createSupplierAction(`${action}已打开`, "当前为供应商档案 mock 操作。")}
              >
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

function ImportedSupplierProfile({ detail }: { detail: SupplierDetail }) {
  const profile = detail.importedProfile;
  if (!profile) return null;

  const renderParagraphs = (values: string[], fallback: string) => (
    <div className="space-y-2 text-[12px] leading-5 text-textSecondary">
      {values.length > 0
        ? values.map((item) => <p key={item} className="whitespace-pre-line break-words">{item}</p>)
        : <p className="text-textMuted">{fallback}</p>}
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <SectionHeader title="厂商资料与产品能力" action="Excel 导入资料" icon={FileSpreadsheet} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-borderSoft bg-primary-soft/35 px-4 py-2 text-[11px] text-textSecondary">
        <span className="max-w-full truncate font-semibold text-primary" title={profile.sourceFile}>{profile.sourceFile}</span>
        <span>工作表：{profile.sourceSheet}</span>
        <span>原始行：{profile.sourceRows.join("、")}</span>
        <span>导入批次：{profile.importBatch}</span>
        <span className="rounded-pill border border-primary/15 bg-white px-2 py-0.5 font-semibold text-primary">
          资料完整度 {profile.dataCompleteness}%
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid items-stretch gap-3 xl:grid-cols-[1.45fr_1fr]">
          <div className="rounded-[10px] border border-primary/15 bg-gradient-to-br from-primary-soft/65 via-white to-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-primary text-white shadow-sm">
                <Building2 className="size-5" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-textMain">厂家介绍</h3>
                <p className="mt-0.5 text-[11px] text-textMuted">企业概况、发展历程与综合能力</p>
              </div>
            </div>
            {renderParagraphs(profile.introductions, "Excel 未提供厂家介绍，待人工补全。")}
          </div>

          <div className="rounded-[10px] border border-success/15 bg-gradient-to-br from-success-soft/60 via-white to-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-success text-white shadow-sm">
                <Award className="size-5" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-textMain">厂家优势</h3>
                <p className="mt-0.5 text-[11px] text-textMuted">产品、交付与项目适配优势</p>
              </div>
            </div>
            {renderParagraphs(profile.strengths, "Excel 未提供厂家优势，待人工核验。")}
          </div>
        </div>

        <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[10px] border border-cyan/15 bg-cyan-soft/30 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-cyan text-white shadow-sm">
                <Package className="size-5" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-textMain">主营产品</h3>
                <p className="mt-0.5 text-[11px] text-textMuted">已导入产品与业务范围</p>
              </div>
            </div>
            {renderParagraphs(profile.mainProducts, "Excel 未提供主营产品，待人工补全。")}
          </div>

          <div className="rounded-[10px] border border-warning/15 bg-warning-soft/25 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-warning text-white shadow-sm">
                <MapPin className="size-5" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-textMain">厂家地址</h3>
                <p className="mt-0.5 text-[11px] text-textMuted">总部及主要生产基地</p>
              </div>
            </div>
            {renderParagraphs(profile.addresses, "Excel 未提供厂家地址，待人工补全。")}
          </div>

          <div className="rounded-[10px] border border-ai-border bg-gradient-to-br from-ai-soft/60 via-white to-white p-4 md:col-span-2 xl:col-span-1">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-ai text-white shadow-sm">
                <Phone className="size-5" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-textMain">联系方式</h3>
                <p className="mt-0.5 text-[11px] text-textMuted">Excel 原始联系信息</p>
              </div>
            </div>
            <p className="whitespace-pre-line break-words text-[12px] leading-5 text-textSecondary">
              {profile.contactDetails || "Excel 未提供联系方式，待人工补全。"}
            </p>
            {profile.website ? (
              <a href={profile.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-ai-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ai transition hover:bg-ai-soft">
                <Webhook className="size-3.5" />
                访问官网
              </a>
            ) : null}
          </div>
        </div>

        {profile.notes.length > 0 ? (
          <div className="flex gap-3 rounded-[10px] border border-borderSoft bg-[var(--color-bg-muted)] p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-borderSoft bg-white text-primary">
              <ClipboardCheck className="size-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[12px] font-bold text-textMain">导入备注</h3>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] leading-5 text-textSecondary">
                {profile.notes.map((item) => <span key={item} className="break-words">{item}</span>)}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function WebResearchProfile({ detail }: { detail: SupplierDetail }) {
  const research = detail.webResearch;
  if (!research) return null;

  const statusLabel = {
    verified_official: "官网已核验",
    partially_verified: "部分核验",
    needs_manual: "待人工核验",
  }[research.verificationStatus];

  return (
    <Card className="overflow-hidden">
      <SectionHeader title="联网核验信息" action={`${research.sourceConfidence}级来源`} icon={SearchCheck} />
      <div className="grid gap-3 p-4 xl:grid-cols-[1fr_1.15fr_1.15fr]">
        <div className="rounded-[8px] border border-primary/15 bg-primary-soft/40 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-primary">{statusLabel}</span>
            <span className="rounded-pill border border-primary/20 bg-white px-2 py-0.5 text-[11px] font-bold text-primary">
              {research.researchedAt}
            </span>
          </div>
          <div className="space-y-2 text-[12px] leading-5 text-textSecondary">
            <p><span className="font-semibold text-textMain">官网：</span>{research.officialWebsite}</p>
            <p><span className="font-semibold text-textMain">电话：</span>{research.officialPhone}</p>
            <p><span className="font-semibold text-textMain">邮箱：</span>{research.officialEmail}</p>
            <p><span className="font-semibold text-textMain">地址：</span>{research.officialAddress}</p>
          </div>
          <div className="mt-3 space-y-1.5">
            {research.sources.length > 0 ? research.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-md border border-borderSoft bg-white px-2.5 py-2 text-[11px] font-semibold text-primary transition hover:border-primary/30"
              >
                <span className="truncate">{source.title}</span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  {source.level}级
                  <ExternalLink className="size-3" />
                </span>
              </a>
            )) : (
              <div className="rounded-md border border-warning/20 bg-warning-soft p-2 text-[11px] font-semibold text-warning">
                未找到稳定官方来源，必须人工核验。
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[8px] border border-borderSoft bg-white p-3">
            <h3 className="text-[13px] font-bold text-textMain">已验证产品</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {research.verifiedProducts.length > 0 ? research.verifiedProducts.map((item) => (
                <span key={item} className="rounded-pill bg-cyan-soft px-2 py-1 text-[11px] font-semibold text-cyan">{item}</span>
              )) : <span className="text-[12px] text-textMuted">暂无可确认产品信息</span>}
            </div>
          </div>
          <div className="rounded-[8px] border border-borderSoft bg-white p-3">
            <h3 className="text-[13px] font-bold text-textMain">已验证能力</h3>
            <ul className="mt-2 space-y-1.5 text-[12px] text-textSecondary">
              {research.verifiedCapabilities.map((item) => (
                <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />{item}</li>
              ))}
            </ul>
          </div>
          {research.credentials.length > 0 ? (
            <div className="rounded-[8px] border border-success/15 bg-success-soft/45 p-3">
              <h3 className="text-[13px] font-bold text-success">资质与主体线索</h3>
              <ul className="mt-2 space-y-1.5 text-[12px] text-textSecondary">
                {research.credentials.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-[8px] border border-warning/20 bg-warning-soft/60 p-3">
          <h3 className="text-[13px] font-bold text-warning">采购核验风险</h3>
          <div className="mt-3 space-y-2">
            {research.risks.map((risk, index) => (
              <div key={risk} className="flex gap-2 rounded-md border border-warning/15 bg-white/80 p-2.5 text-[12px] leading-5 text-textSecondary">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-warning text-[11px] font-bold text-white">{index + 1}</span>
                <span>{risk}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-no-global-interaction
            onClick={createSupplierAction("已加入人工复核队列", "联网核验结果和风险项已发送至供应商资料维护。", "warning")}
            className="mt-3 h-8 w-full rounded-md bg-warning px-3 text-[12px] font-bold text-white"
          >
            进入人工复核
          </button>
        </div>
      </div>
    </Card>
  );
}

const dueDiligenceStatusStyle: Record<DueDiligenceStatus, { label: string; className: string }> = {
  confirmed: { label: "官方已核验", className: "border-success/20 bg-success-soft text-success" },
  lead_only: { label: "仅线索", className: "border-warning/20 bg-warning-soft text-warning" },
  needs_review: { label: "主体待确认", className: "border-danger/20 bg-danger-soft text-danger" },
  not_found: { label: "待补充", className: "border-borderSoft bg-bgPage text-textMuted" },
};

function DueDiligenceField({
  label,
  field,
  icon: Icon,
}: {
  label: string;
  field: NonNullable<SupplierDetail["dueDiligence"]>["unifiedSocialCreditCode"];
  icon: LucideIcon;
}) {
  const style = dueDiligenceStatusStyle[field.status];

  return (
    <div className="rounded-[8px] border border-borderSoft bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-primary/15 bg-primary-soft text-primary">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-textMuted">{label}</p>
            <p className="mt-0.5 break-words text-[13px] font-bold text-textMain">{field.value}</p>
          </div>
        </div>
        <span className={cn("shrink-0 rounded-pill border px-2 py-0.5 text-[10px] font-bold", style.className)}>
          {style.label}
        </span>
      </div>
      {field.note ? <p className="mt-2 text-[11px] leading-4 text-textSecondary">{field.note}</p> : null}
      {field.source ? (
        <a
          href={field.source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1 text-[11px] font-semibold text-primary"
        >
          <span className="truncate">{field.source.title}</span>
          <ExternalLink className="size-3 shrink-0" />
        </a>
      ) : null}
    </div>
  );
}

function DueDiligenceProfile({ detail }: { detail: SupplierDetail }) {
  const dueDiligence = detail.dueDiligence;
  if (!dueDiligence) {
    return (
      <Card className="overflow-hidden">
        <SectionHeader title="工商与合规尽调" action="待首次核验" icon={Landmark} />
        <div className="grid gap-3 p-4 lg:grid-cols-3">
          <div className="rounded-[10px] border border-borderSoft bg-[var(--color-bg-muted)] p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-primary/15 bg-white text-primary">
                <IdCard className="size-5" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-textMain">工商主体信息</h3>
                <p className="text-[11px] text-textMuted">统一社会信用代码、法人、注册资本</p>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-5 text-textSecondary">
              当前供应商尚未完成官方工商主体核验，所有字段保持待核验状态。
            </p>
          </div>

          <div className="rounded-[10px] border border-warning/20 bg-warning-soft/45 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-warning text-white">
                <Gavel className="size-5" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-warning">司法风险核验</h3>
                <p className="text-[11px] text-textMuted">执行、失信与裁判文书查询</p>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-5 text-textSecondary">
              尚未取得可确认的司法风险结果，正式采购前必须完成人工查询。
            </p>
          </div>

          <div className="rounded-[10px] border border-ai-border bg-ai-soft/35 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-ai text-white">
                <BadgeCheck className="size-5" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-ai">证书与许可编号</h3>
                <p className="text-[11px] text-textMuted">ISO、行业许可与产品认证</p>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-5 text-textSecondary">
              暂无可公开核验的证书编号，宣传资料不视为已核验证书。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borderSoft bg-bgPage/60 px-4 py-3">
          <p className="text-[11px] text-textMuted">核验结果必须经人工确认后才能用于供应商准入和商务判断。</p>
          <button
            type="button"
            data-no-global-interaction
            onClick={createSupplierAction("已创建工商与合规核验任务", `${detail.supplierName} 已加入人工核验队列。`, "warning")}
            className="h-8 rounded-md bg-warning px-3 text-[12px] font-bold text-white"
          >
            发起人工核验
          </button>
        </div>
      </Card>
    );
  }

  const certificateStatus = {
    valid: { label: "有效/待复核有效期", className: "bg-success-soft text-success" },
    historical: { label: "历史记录", className: "bg-primary-soft text-primary" },
    expired: { label: "已过期", className: "bg-danger-soft text-danger" },
    needs_review: { label: "待核验", className: "bg-warning-soft text-warning" },
  } as const;

  return (
    <Card className="overflow-hidden">
      <SectionHeader title="工商与合规尽调" action={`核验日期 ${dueDiligence.checkedAt}`} icon={Landmark} />
      <div className="grid gap-3 p-4 xl:grid-cols-[1.25fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <DueDiligenceField label="统一社会信用代码" field={dueDiligence.unifiedSocialCreditCode} icon={IdCard} />
            <DueDiligenceField label="法定代表人" field={dueDiligence.legalRepresentative} icon={UserRound} />
            <DueDiligenceField label="注册资本" field={dueDiligence.registeredCapital} icon={BriefcaseBusiness} />
          </div>
        </div>

        <div className="rounded-[8px] border border-warning/20 bg-warning-soft/45 p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-warning text-white">
              <Gavel className="size-4" />
            </span>
            <div>
              <h3 className="text-[13px] font-bold text-warning">司法风险核验</h3>
              <p className="text-[11px] font-semibold text-textMuted">{dueDiligence.judicialRisk.summary}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-textSecondary">{dueDiligence.judicialRisk.note}</p>
          <div className="mt-3 space-y-1.5">
            {dueDiligence.judicialRisk.platforms.map((platform) => (
              <a
                key={platform.url}
                href={platform.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-md border border-warning/15 bg-white px-2.5 py-2 text-[11px] font-semibold text-warning"
              >
                {platform.title}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
          <button
            type="button"
            data-no-global-interaction
            onClick={createSupplierAction("已创建司法风险人工核验任务", "请使用企业全称与统一社会信用代码在三个官方平台逐项查询并上传截图。", "warning")}
            className="mt-3 h-8 w-full rounded-md bg-warning px-3 text-[12px] font-bold text-white"
          >
            发起司法风险核验
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-[8px] border border-ai-border bg-ai-soft/35 p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-[8px] bg-ai text-white">
                <BadgeCheck className="size-4" />
              </span>
              <div>
                <h3 className="text-[13px] font-bold text-ai">证书与许可编号</h3>
                <p className="text-[11px] font-semibold text-textMuted">仅展示取得公开编号的记录</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {dueDiligence.certificates.length > 0 ? dueDiligence.certificates.map((certificate) => {
                const status = certificateStatus[certificate.status];
                return (
                  <div key={`${certificate.name}-${certificate.number}`} className="rounded-md border border-ai-border bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-textMain">{certificate.name}</p>
                        <p className="mt-1 break-all font-mono text-[11px] font-semibold text-ai">{certificate.number}</p>
                      </div>
                      <span className={cn("shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold", status.className)}>
                        {status.label}
                      </span>
                    </div>
                    {certificate.validUntil ? <p className="mt-1 text-[10px] text-textMuted">有效期至：{certificate.validUntil}</p> : null}
                    {certificate.note ? <p className="mt-1 text-[10px] leading-4 text-textSecondary">{certificate.note}</p> : null}
                    <a
                      href={certificate.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-primary"
                    >
                      查看公开依据 <ExternalLink className="size-3" />
                    </a>
                  </div>
                );
              }) : (
                <div className="rounded-md border border-warning/20 bg-white p-3 text-[11px] leading-5 text-textSecondary">
                  未取得可公开核验的证书编号。官网宣传或 Excel 中的“通过 ISO”描述不视为已核验证书。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[8px] border border-danger/15 bg-danger-soft/35 p-3">
            <div className="flex items-center gap-2 text-danger">
              <CircleAlert className="size-4" />
              <h3 className="text-[12px] font-bold">人工复核事项</h3>
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-textSecondary">
              {dueDiligence.reviewNotes.map((note) => <li key={note}>• {note}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

function VerificationAuditProfile({ detail }: { detail: SupplierDetail }) {
  const verification = detail.verification;
  const supplierVerification = useSupplierVerification();
  if (!verification) return null;

  const domainVerification =
    p0SupplierVerificationById[detail.id] ??
    p1SupplierVerificationById[detail.id] ??
    p2SupplierVerificationById[detail.id];
  const reviewStatus = supplierVerification.getReviewStatus(detail.id);
  const statusLabel = reviewStatus === "approved" ? "人工已通过" : reviewStatus === "rejected" ? "人工已驳回" : "待人工复核";
  const legalEntityStatusLabel = {
    confirmed_with_public_evidence: "公开证据已确认",
    exact_name_pending_registry: "同名待公示复核",
    candidate_pending_registry: "候选主体待复核",
    unresolved_channel: "渠道主体未识别",
  }[verification.legalEntityReviewStatus];
  const verificationStatusMap: Record<
    P0VerificationStatus,
    { label: string; className: string }
  > = {
    verified: { label: "已核验", className: "border-success/20 bg-success-soft text-success" },
    partial: { label: "部分核验", className: "border-primary/20 bg-primary-soft text-primary" },
    missing: { label: "资料缺失", className: "border-warning/20 bg-warning-soft text-warning" },
    manual_required: { label: "需人工查询", className: "border-warning/20 bg-warning-soft text-warning" },
    risk_found: { label: "发现风险", className: "border-danger/20 bg-danger-soft text-danger" },
  };
  const domainVerificationItems = domainVerification
    ? [
        ["工商主体", domainVerification.businessStatus],
        ["联系方式", domainVerification.contactStatus],
        ["资质证书", domainVerification.qualificationStatus],
        ["司法风险", domainVerification.riskStatus],
      ] as const
    : [];

  return (
    <Card className="overflow-hidden">
      <SectionHeader title="主体消歧与交叉验证台账" action={`${verification.batch} · 查询日期 ${verification.queriedAt}`} icon={SearchCheck} />
      {domainVerification ? (
        <div className="grid gap-2 border-b border-borderSoft bg-[var(--color-bg-muted)]/70 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
          {domainVerificationItems.map(([label, status]) => {
            const config = verificationStatusMap[status];
            return (
              <div
                key={label}
                className="flex min-w-0 items-center justify-between gap-2 rounded-[8px] border border-borderSoft bg-white px-3 py-2"
              >
                <span className="truncate text-[11px] font-bold text-textSecondary">{label}</span>
                <span className={cn("shrink-0 rounded-pill border px-2 py-0.5 text-[10px] font-bold", config.className)}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="grid gap-3 p-4 xl:grid-cols-[1.15fr_1fr_1fr]">
        <div className="rounded-[8px] border border-primary/15 bg-primary-soft/35 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold text-primary">中国法律主体候选</h3>
            <StatusBadge status={reviewStatus === "approved" ? "confirmed" : reviewStatus === "rejected" ? "rejected" : "pending"} label={statusLabel} className="h-5 text-[11px]" />
          </div>
          <dl className="mt-3 space-y-2 text-[11px]">
            <div>
              <dt className="font-semibold text-textMuted">Excel 原值</dt>
              <dd className="mt-0.5 font-bold text-textMain">{verification.originalName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-textMuted">候选法律主体</dt>
              <dd className="mt-0.5 font-bold text-primary">{verification.candidateLegalEntity}</dd>
            </div>
            <div>
              <dt className="font-semibold text-textMuted">主体消歧状态</dt>
              <dd className="mt-0.5 font-bold text-ai">{legalEntityStatusLabel}</dd>
              <dd className="mt-1 leading-4 text-textMuted">{verification.legalEntityResolutionNote}</dd>
            </div>
          </dl>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-white bg-white p-2">
              <p className="text-[10px] font-semibold text-textMuted">核验可信度</p>
              <p className="mt-1 text-[18px] font-extrabold text-ai">{verification.verificationConfidence}%</p>
            </div>
            <div className="rounded-md border border-white bg-white p-2">
              <p className="text-[10px] font-semibold text-textMuted">资料完整度</p>
              <p className="mt-1 text-[18px] font-extrabold text-primary">{verification.dataCompleteness}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] border border-danger/15 bg-danger-soft/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold text-danger">冲突与缺失</h3>
            <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] font-bold text-danger">
              {verification.conflicts.length} 冲突 / {verification.missingFields.length} 缺失
            </span>
          </div>
          <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1">
            {verification.conflicts.map((conflict) => (
              <div key={`${conflict.field}-${conflict.originalValue}`} className="rounded-md border border-danger/10 bg-white p-2 text-[10px] leading-4">
                <p className="font-bold text-danger">{conflict.field}</p>
                <p className="mt-1 text-textSecondary">原值：{conflict.originalValue}</p>
                <p className="text-textSecondary">候选值：{conflict.candidateValue}</p>
                <p className="mt-1 text-textMuted">{conflict.reason}</p>
              </div>
            ))}
            {verification.missingFields.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {verification.missingFields.map((field) => (
                  <span key={field} className="rounded-md bg-warning-soft px-2 py-1 text-[10px] font-semibold text-warning">{field}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[8px] border border-ai-border bg-ai-soft/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold text-ai">来源与人工判断</h3>
            <AiBadge label="AI仅辅助" icon="analysis" className="h-5 text-[10px]" />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-textSecondary">{verification.aiDecisionNote}</p>
          <div className="mt-3 max-h-[150px] space-y-1.5 overflow-y-auto pr-1">
            {verification.sourceLinks.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-md border border-ai-border bg-white px-2.5 py-2 text-[10px] font-semibold text-primary">
                <span className="truncate">{source.title}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            ))}
          </div>
          <Link
            href={`/suppliers/manage?tab=pending&keyword=${encodeURIComponent(detail.supplierName)}`}
            className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-md bg-ai px-3 text-[11px] font-bold text-white"
          >
            进入人工审核队列 <ChevronRight className="size-3.5" />
          </Link>
          {domainVerification ? (
            <p className="mt-2 text-[10px] leading-4 text-textMuted">
              {verification.batch} 四域核验日期：{domainVerification.reviewedAt}。当前仍需人工复核，未自动开放创建询价。
            </p>
          ) : null}
        </div>
      </div>
    </Card>
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
  const score = Math.max(0, Math.min(100, detail.overallScore));

  return (
    <Card>
      <SectionHeader title="AI 综合评估" action="AI" icon={Sparkles} />
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-[150px_1fr]">
        <div className="flex flex-col items-center">
          <div
            className="relative flex size-[120px] items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#2F6BFF 0 ${score}%, #E5EDF7 ${score}% 100%)` }}
          >
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
          <p><span className="font-semibold text-textMain">评估时间：</span>{detail.updatedAt}</p>
          <p><span className="font-semibold text-textMain">评估维度：</span>6 大维度 32 项指标</p>
          <button
            data-no-global-interaction
            className="mt-2 h-8 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary"
            type="button"
            onClick={createSupplierAction("已打开 AI 评估详情", "当前为供应商六维评分和模型依据 mock 预览。", "ai")}
          >
            查看评估详情
          </button>
        </div>
      </div>
    </Card>
  );
}

function RecommendedScenes({ detail }: { detail: SupplierDetail }) {
  const scenes = detail.projectMatches.length > 0
    ? detail.projectMatches.slice(0, 3).map((item) => ({
        name: item.category || item.project,
        match: `${item.match}%`,
        stars: Math.max(1, Math.min(5, Math.round(item.match / 20))),
      }))
    : recommendedScenes;

  return (
    <Card>
      <SectionHeader title="推荐采购场景" icon={Package} />
      <div className="space-y-2 px-4 py-3">
        {scenes.map((scene) => (
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

function RiskTips({ detail }: { detail: SupplierDetail }) {
  const risks = detail.risks.length > 0
    ? detail.risks.slice(0, 3).map((risk) => ({ text: risk.description, level: risk.level }))
    : riskTips;

  return (
    <Card>
      <SectionHeader title="风险提示" icon={ShieldPlus} />
      <div className="space-y-2 px-4 py-3">
        {risks.map((risk, index) => (
          <div key={risk.text} className="grid grid-cols-[20px_1fr_62px] items-center gap-2 text-[12px]">
            <span className="flex size-5 items-center justify-center rounded-full bg-danger-soft text-danger">{index + 1}</span>
            <span className="text-textSecondary">{risk.text}</span>
            <RiskBadge level={risk.level} className="h-5 justify-center whitespace-nowrap text-[11px]" />
          </div>
        ))}
        <button
          data-no-global-interaction
          className="mt-2 inline-flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-primary"
          type="button"
          onClick={createSupplierAction("风险报告已打开", "当前为供应商交付风险、报价波动和资料风险 mock 预览。", "warning")}
        >
          查看完整风险报告 <ChevronRight className="size-3.5" />
        </button>
      </div>
    </Card>
  );
}

function BusinessAdvice({ detail }: { detail: SupplierDetail }) {
  const advice = detail.ai.actions.length > 0 ? detail.ai.actions.slice(0, 4) : businessAdvice;

  return (
    <Card>
      <SectionHeader title="商务建议" icon={Award} />
      <div className="space-y-3 px-4 py-3">
        {advice.map((item) => (
          <div key={item} className="flex gap-2 text-[12px] text-textSecondary">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </div>
        ))}
        <button
          data-no-global-interaction
          className="mt-2 inline-flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-primary"
          type="button"
          onClick={createSupplierAction("AI 商务建议已生成", "已基于报价历史、交付风险和项目匹配生成 mock 建议草稿。", "ai")}
        >
          生成 AI 商务建议书 <ChevronRight className="size-3.5" />
        </button>
      </div>
    </Card>
  );
}

export function SupplierDetailView({ detail }: SupplierDetailViewProps) {
  const router = useRouter();
  const supplierVerification = useSupplierVerification();

  function handleCreateInquiry() {
    if (!supplierVerification.canCreateInquiry(detail.id)) {
      const verification = detail.verification;
      const reviewStatus = supplierVerification.getReviewStatus(detail.id);
      const message = verification?.legalEntityReviewStatus === "unresolved_channel"
        ? "该供应商法律主体尚未识别。"
        : reviewStatus === "rejected"
          ? "该供应商人工复核已退回。"
          : `该 ${verification?.batch ?? "供应商"} 记录尚未通过统一人工复核。`;
      emitSupplierToast("询价准入被拦截", `${message} 已进入供应商资料维护队列。`, "warning");
      router.push(`/suppliers/manage?tab=pending&keyword=${encodeURIComponent(detail.supplierName)}`);
      return;
    }
    router.push(`/inquiries/create?supplierId=${detail.id}&source=supplier-detail`);
  }

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <div className="flex items-center justify-between rounded-[10px] border border-borderSoft bg-white px-4 py-3 shadow-card">
        <div className="min-w-0">
          <Link href="/suppliers" className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-primary" data-no-global-interaction>
            <ArrowLeft className="size-3.5" />
            返回供应商库
          </Link>
          <h1 className="truncate text-[22px] font-bold text-textMain">供应商详情（AI评估）</h1>
        </div>
        <TableActionGroup
          actions={[
            { label: "创建询价", icon: Send, tone: "primary", onClick: handleCreateInquiry },
            { label: "AI复评", icon: Sparkles, tone: "ai", onClick: createSupplierAction("AI 复评已启动", "将重新评估供应商综合评分、交付风险与项目匹配度。", "ai") },
            { label: "导出档案", icon: Download, onClick: createSupplierAction("导出任务已创建", "供应商档案将以 mock 文件形式加入导出队列。", "success") },
          ]}
        />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[1.65fr_1fr_1fr_1.55fr_1fr_1fr_1fr]">
        <OverviewCard icon={Building2} label="供应商名称" value={detail.supplierName} description={`${detail.supplierCode}（内部编码）`} tone="blue">
          <span className={cn(
            "mt-1 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold",
            detail.status === "待复核" ? "border-warning/20 bg-warning-soft text-warning" : "border-success/20 bg-success-soft text-success",
          )}>
            {detail.status}
          </span>
        </OverviewCard>
        <OverviewCard icon={Globe2} label="国家/地区" value={detail.countryRegion} description={detail.importedProfile?.englishName || detail.language} tone="cyan" />
        <OverviewCard icon={FileBadge2} label="供应商类型" value={detail.category} description={detail.importedProfile ? "卡南加项目推荐供应商" : "供应商分类"} tone="purple" />
        <OverviewCard icon={Package} label="主营产品" value={detail.mainScope} description={detail.importedProfile?.bidPackages.join("、") || "系统主营范围"} tone="blue" />
        <OverviewCard icon={Star} label="综合评分" value={<>{detail.overallScore}<span className="ml-1 text-[12px] font-bold text-textMuted">/100</span></>} tone="blue">
          <div className="mt-2 flex items-center gap-1">
            {[0, 1, 2, 3].map((item) => <Star key={item} className="size-3.5 fill-warning text-warning" />)}
            <Star className="size-3.5 fill-borderSoft text-borderSoft" />
            <span className="ml-1 rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary">优秀</span>
          </div>
        </OverviewCard>
        <OverviewCard
          icon={ShieldCheck}
          label="交付风险"
          value={detail.deliveryRisk === "high" ? "高风险" : detail.deliveryRisk === "medium" ? "中风险" : "低风险"}
          description={detail.importedProfile ? "导入后待人工复核" : "系统综合判断"}
          tone="orange"
        />
        <OverviewCard icon={ClipboardCheck} label="报价次数" value={`${detail.quoteCount} 次`} description="近12个月报价次数" tone="green" />
      </div>

      <div className="grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-3">
          <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-[1.05fr_1.15fr_1.1fr]">
            <Card>
              <SectionHeader title="基础信息" icon={Building2} />
              <div className="space-y-3 px-4 py-3">
                {detail.importedProfile ? (
                  <>
                    <InfoRow
                      icon={IdCard}
                      label="统一社会信用代码"
                      value={detail.dueDiligence?.unifiedSocialCreditCode.value ?? "待官方平台核验"}
                    />
                    <InfoRow
                      icon={UserRound}
                      label="法定代表人"
                      value={detail.dueDiligence?.legalRepresentative.value ?? "待官方平台核验"}
                    />
                    <InfoRow
                      icon={BriefcaseBusiness}
                      label="注册资本"
                      value={detail.dueDiligence?.registeredCapital.value ?? "待官方平台核验"}
                    />
                    <InfoRow icon={CheckCircle2} label="企业性质" value={detail.category} />
                    <InfoRow icon={CheckCircle2} label="资料完整度" value={`${detail.importedProfile.dataCompleteness}%（待人工复核）`} />
                    <InfoRow icon={MapPin} label="厂家地址" value={<span className="whitespace-pre-line">{detail.address}</span>} />
                    <InfoRow icon={Package} label="经营范围" value={detail.mainScope} />
                  </>
                ) : (
                  <>
                    <InfoRow icon={CalendarDays} label="成立时间" value="2005-03-18（19年）" />
                    <InfoRow icon={UserRound} label="公司规模" value="201-500人" />
                    <InfoRow icon={BriefcaseBusiness} label="注册资本" value="ZAR 8,500,000" />
                    <InfoRow icon={CheckCircle2} label="企业性质" value="股份有限公司" />
                    <InfoRow icon={FileBadge2} label="ISO认证" value="ISO 9001:2015" />
                    <InfoRow icon={MapPin} label="注册地址" value={detail.address} />
                    <InfoRow icon={Package} label="经营范围" value={detail.mainScope} />
                  </>
                )}
              </div>
            </Card>

            <Card>
              <SectionHeader title="联系人信息" action="更多联系人" icon={UserRound} />
              <div className="space-y-3 px-4 py-3">
                {detail.importedProfile ? (
                  <>
                    <ContactCard title="Excel 来源联系人" name={detail.contact} role="待核验" phone={detail.phone} email={detail.email} />
                    <ContactCard
                      title="官网公开联系渠道"
                      name={detail.webResearch ? "官方客户服务" : "待补全"}
                      role="官网 / 公开来源"
                      phone={detail.webResearch?.officialPhone ?? "待补全"}
                      email={detail.webResearch?.officialEmail ?? "待补全"}
                    />
                  </>
                ) : (
                  <>
                    <ContactCard title="主要联系人" name={detail.contact} role="采购经理" phone={detail.phone} email={detail.email} />
                    <ContactCard title="备用联系人" name="Lindiwe Mokoena" role="销售经理" phone="+27 11 987 6543" email="lindiwe.mokoena@aquapump.co.za" />
                  </>
                )}
              </div>
            </Card>

            <CapabilityRadar />
          </div>

          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
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
                    {detail.quoteHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="h-20 text-center text-[12px] text-textMuted">
                          暂无历史报价。该供应商刚从采购建议表导入，完成首次询价后将在此形成报价记录。
                        </td>
                      </tr>
                    ) : null}
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
                {(detail.importedProfile
                  ? [
                      ["首次合作时间", "待首次询价"],
                      ["合作项目数", "0 个"],
                      ["累计采购金额", "0.00 USD"],
                      ["准时交货率", "待首次履约"],
                      ["质量合格率", "待首次验收"],
                      ["售后服务满意度", "待评价"],
                    ]
                  : [
                      ["首次合作时间", "2022-06-15"],
                      ["合作项目数", "8 个"],
                      ["累计采购金额", "1,256,800.00 USD"],
                      ["准时交货率", "94.2%"],
                      ["质量合格率", "98.6%"],
                      ["售后服务满意度", "4.6 / 5"],
                    ]
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-textMuted">{label}</span>
                    <span className="font-semibold text-textMain">{value}</span>
                  </div>
                ))}
                <div className="pt-1 text-right">
                  <span className={cn(
                    "rounded-md px-2 py-1 text-[12px] font-semibold",
                    detail.importedProfile ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
                  )}>
                    {detail.importedProfile ? "待建立合作" : "正常合作"}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <SectionHeader
              title={detail.importedProfile ? `来源与附件（${detail.notes.length}）` : "资质文件（8）"}
              action={detail.importedProfile ? "查看来源" : "全部下载"}
              icon={FileBadge2}
            />
            <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              {(detail.importedProfile
                ? detail.notes.map((note) => ({ name: note.name, date: note.date, size: "Excel 来源" }))
                : qualificationFiles
              ).map((file) => (
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

        <div className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-1">
          <AiScorePanel detail={detail} />
          <RecommendedScenes detail={detail} />
          <RiskTips detail={detail} />
          <BusinessAdvice detail={detail} />
        </div>
      </div>

      <DueDiligenceProfile detail={detail} />
      <VerificationAuditProfile detail={detail} />
      <ImportedSupplierProfile detail={detail} />
      <WebResearchProfile detail={detail} />
    </div>
  );
}
