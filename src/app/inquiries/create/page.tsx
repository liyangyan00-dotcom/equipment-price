"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Import,
  PackagePlus,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Truck,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  aiInquiryLetterDraft,
  inquiryCreateSteps,
  inquiryItemCandidates,
  inquiryOverview,
  inquirySupplierCandidates,
  type InquirySupplierCandidate,
} from "@/data/mock/inquiryCreate";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/common";

const riskLabel: Record<RiskLevel, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};

const riskClassName: Record<RiskLevel, string> = {
  low: "bg-success-soft text-success border-success/20",
  medium: "bg-warning-soft text-warning border-warning/20",
  high: "bg-danger-soft text-danger border-danger/20",
  critical: "bg-danger text-white border-danger",
};

function formatCdf(value: number) {
  return `CDF ${value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

function PrettyIcon({
  icon: Icon,
  tone = "ai",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: "blue" | "cyan" | "green" | "orange" | "red" | "ai";
  size?: "sm" | "md" | "lg";
}) {
  const toneClass = {
    blue: "from-primary/95 to-[#5aa7ff] text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]",
    cyan: "from-[#20b8d8] to-[#62d2ee] text-white shadow-[0_12px_24px_rgba(32,184,216,0.22)]",
    green: "from-success to-[#72d99a] text-white shadow-[0_12px_24px_rgba(31,165,85,0.22)]",
    orange: "from-warning to-[#ffbe67] text-white shadow-[0_12px_24px_rgba(245,158,11,0.24)]",
    red: "from-danger to-[#ff7a7a] text-white shadow-[0_12px_24px_rgba(239,68,68,0.22)]",
    ai: "from-ai to-[#9c6bff] text-white shadow-ai",
  }[tone];

  const sizeClass = {
    sm: "size-8 rounded-[10px]",
    md: "size-10 rounded-[13px]",
    lg: "size-12 rounded-[16px]",
  }[size];

  const iconSize = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-4";

  return (
    <span className={cn("relative flex shrink-0 items-center justify-center bg-gradient-to-br", sizeClass, toneClass)}>
      <span className="absolute inset-1 rounded-[inherit] bg-white/10" />
      <Icon className={cn("relative", iconSize)} />
    </span>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "ai";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold shadow-sm transition",
        tone === "primary" && "border-primary bg-primary text-white hover:bg-primary/90",
        tone === "ai" && "border-ai-border bg-ai text-white hover:bg-ai/90",
        tone === "default" && "border-borderSoft bg-white text-textSecondary hover:border-primary/30 hover:text-primary",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function CreatePageHeader() {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[24px] font-bold leading-8 text-textMain">创建询价任务</h1>
        <p className="mt-1 text-[13px] text-textMuted">选择询价对象与供应商，使用 AI 生成询价函并创建询价任务</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton label="保存草稿" icon={Save} />
        <ActionButton label="AI 生成询价函" icon={WandSparkles} tone="ai" />
        <ActionButton label="创建任务" icon={CheckCircle2} tone="primary" />
      </div>
    </div>
  );
}

function StepIndicator() {
  return (
    <section className="rounded-card border border-borderSoft bg-white px-4 py-3 shadow-card">
      <div className="grid gap-3 lg:grid-cols-4">
        {inquiryCreateSteps.map((step, index) => (
          <div key={step.label} className="relative flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "z-10 flex size-9 shrink-0 items-center justify-center rounded-full border text-[14px] font-bold",
                step.status === "active" && "border-ai bg-ai text-white shadow-ai",
                step.status === "done" && "border-ai/30 bg-white text-ai",
                step.status === "pending" && "border-borderSoft bg-[var(--color-bg-muted)] text-textMuted",
              )}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-textMain">{step.label}</div>
              <div className="truncate text-[11px] text-textMuted">{step.description}</div>
            </div>
            {index < inquiryCreateSteps.length - 1 ? (
              <span className="absolute left-[142px] right-4 top-4 hidden h-0.5 bg-ai/70 lg:block" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionShell({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-borderSoft bg-white shadow-card", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-borderSoft px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <PrettyIcon icon={Icon} size="sm" /> : null}
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold text-textMain">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-[11px] text-textMuted">{subtitle}</p> : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function TinyButton({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  return (
    <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 text-[12px] font-semibold text-textSecondary">
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
    </button>
  );
}

function RiskPill({ level }: { level: RiskLevel }) {
  return <span className={cn("inline-flex h-5 min-w-6 items-center justify-center rounded-pill border px-2 text-[11px] font-semibold", riskClassName[level])}>{riskLabel[level]}</span>;
}

function InquiryItemsPanel() {
  const selectedCount = inquiryItemCandidates.filter((item) => item.selected).length;
  const total = inquiryItemCandidates.reduce((sum, item) => sum + item.targetPrice, 0);

  return (
    <SectionShell
      title="询价对象清单"
      subtitle={`共 ${inquiryItemCandidates.length} 条`}
      action={
        <>
          <TinyButton label="添加设备/材料" icon={PackagePlus} />
          <TinyButton label="批量导入" icon={Download} />
          <TinyButton label="从项目导入" icon={Import} />
        </>
      }
    >
      <div className="overflow-x-auto px-3 py-3">
        <table className="w-full min-w-[760px] border-collapse text-[12px]">
          <thead>
            <tr className="h-9 bg-[var(--color-bg-muted)] text-left text-[11px] font-semibold text-textSecondary">
              <th className="w-8 rounded-l-md px-2">
                <input checked readOnly type="checkbox" className="accent-ai" />
              </th>
              <th className="px-2">序号</th>
              <th className="px-2">编码</th>
              <th className="px-2">名称 / 规格型号</th>
              <th className="px-2">单位</th>
              <th className="px-2 text-right">数量</th>
              <th className="px-2 text-right">目标单价（CDF）</th>
              <th className="px-2 text-center">风险</th>
              <th className="rounded-r-md px-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {inquiryItemCandidates.map((item, index) => (
              <tr key={item.id} className={cn("h-[43px] border-b border-borderSoft last:border-0", item.selected && "bg-ai-soft/45")}>
                <td className="px-2">
                  <input checked={item.selected} readOnly type="checkbox" className="accent-ai" />
                </td>
                <td className="px-2 text-textSecondary">{index + 1}</td>
                <td className="px-2 font-medium text-textMain">{item.itemCode}</td>
                <td className="px-2">
                  <div className="font-semibold text-textMain">{item.name}</div>
                  <div className="text-[11px] text-textMuted">{item.specification}</div>
                </td>
                <td className="px-2 text-textSecondary">{item.unit}</td>
                <td className="px-2 text-right font-semibold tabular-nums text-textMain">{item.quantity.toLocaleString("zh-CN")}</td>
                <td className="px-2 text-right font-semibold tabular-nums text-textMain">{item.targetPrice.toLocaleString("zh-CN")}</td>
                <td className="px-2 text-center">
                  <RiskPill level={item.riskLevel} />
                </td>
                <td className="px-2">
                  <div className="flex justify-center gap-2 text-textMuted">
                    <button type="button" aria-label="编辑">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" aria-label="删除">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mx-3 mb-3 flex items-center justify-between rounded-lg border border-borderSoft bg-white px-3 py-2 text-[12px]">
        <div className="text-textMuted">
          已选择 <span className="font-bold text-primary">{selectedCount}</span> 项
          <button type="button" className="ml-3 font-semibold text-ai">清空选择</button>
        </div>
        <div className="font-semibold text-textMain">
          目标金额合计：<span className="ml-2 text-[15px]">{formatCdf(total)}</span>
        </div>
      </div>
    </SectionShell>
  );
}

function SupplierLogo({ supplier }: { supplier: InquirySupplierCandidate }) {
  const iconMap: Record<string, LucideIcon> = {
    KW: Sparkles,
    AC: ShieldCheck,
    GS: WandSparkles,
    TB: Building2,
    KL: Truck,
  };
  const Icon = iconMap[supplier.logoText] ?? Building2;
  const tone = supplier.selected ? "blue" : "cyan";

  return <PrettyIcon icon={Icon} tone={tone} size="lg" />;
}

function SupplierCard({ supplier }: { supplier: InquirySupplierCandidate }) {
  return (
    <div className={cn("rounded-xl border px-2.5 py-2 shadow-sm", supplier.selected ? "border-ai-border bg-ai-soft/30" : "border-borderSoft bg-white")}>
      <div className="flex items-start gap-2">
        <SupplierLogo supplier={supplier} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-textMain">{supplier.supplierName}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {supplier.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-md bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-[10px] font-medium text-textMuted">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <input checked={supplier.selected} readOnly type="checkbox" className="mt-1 size-4 accent-ai" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-medium text-textSecondary">
            <div>
              响应速度：
              <span
                className={cn(
                  "ml-1 rounded-pill px-1.5 py-0.5 font-bold",
                  supplier.responseSpeed === "快" && "bg-success-soft text-success",
                  supplier.responseSpeed === "中" && "bg-warning-soft text-warning",
                  supplier.responseSpeed === "慢" && "bg-danger-soft text-danger",
                )}
              >
                {supplier.responseSpeed}
              </span>
            </div>
            <div>
              交付评分：
              <span className={cn("ml-1 rounded-pill px-1.5 py-0.5 font-bold", supplier.deliveryScore >= 85 ? "bg-success-soft text-success" : supplier.deliveryScore >= 74 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger")}>
                {supplier.deliveryScore}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuppliersPanel() {
  return (
    <SectionShell
      title="已选供应商"
      subtitle="5 / 10"
      action={
        <>
          <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-textMuted" type="button">
            <UsersRound className="size-3.5" />
            智能推荐
          </button>
          <button className="text-[11px] font-semibold text-ai" type="button">更多供应商</button>
        </>
      }
    >
      <div className="space-y-2 p-3">
        {inquirySupplierCandidates.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))}
      </div>
    </SectionShell>
  );
}

function AiSmartAdvicePanel() {
  return (
    <SectionShell title="AI 智能建议" subtitle="推荐策略、竞争度与价格预测" icon={Bot} className="overflow-hidden">
      <div className="relative p-3">
        <div className="pointer-events-none absolute right-3 top-3 size-20 rounded-full bg-ai/15 blur-xl" />
        <div className="relative rounded-xl border border-ai-border bg-gradient-to-br from-ai-soft via-white to-white p-3">
          <div className="mb-3 flex justify-end">
            <span className="flex size-16 items-center justify-center rounded-full bg-ai text-[18px] font-bold text-white shadow-ai ring-8 ring-ai/10">AI</span>
          </div>
          <div className="space-y-3 text-[12px] leading-5">
            <div>
              <div className="font-bold text-textMain">推荐策略</div>
              <p className="mt-1 text-textSecondary">已为您选择 5 家优质供应商，覆盖本地与区域优质资源，建议保留当前选择。</p>
            </div>
            <div className="border-t border-borderSoft pt-2">
              <div className="font-bold text-textMain">预计竞争度</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-warning">★★★★☆</span>
                <span className="text-textMuted">较高（5家供应商）</span>
              </div>
            </div>
            <div className="border-t border-borderSoft pt-2">
              <div className="font-bold text-textMain">价格波动预测</div>
              <div className="mt-1 flex items-center gap-2 text-success">
                <span className="text-[18px] font-bold leading-5">↓ 下降 8.6%</span>
                <span className="text-textMuted">未来 30 天预计下降</span>
              </div>
            </div>
            <div className="border-t border-borderSoft pt-2">
              <div className="font-bold text-textMain">风险提示</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-bold text-danger">2 项高风险材料</span>
                <span className="text-textMuted">建议重点关注钢筋价格波动</span>
              </div>
            </div>
          </div>
          <button type="button" className="mt-3 h-8 w-full rounded-md border border-ai-border bg-white text-[12px] font-semibold text-ai">查看 AI 分析详情</button>
        </div>
      </div>
    </SectionShell>
  );
}

function AiRiskPanel() {
  const risks = [
    { title: "钢筋价格波动风险", level: "高" },
    { title: "市场供应紧张", level: "中" },
  ];

  return (
    <SectionShell title="AI 风险检测" subtitle="检测到 2 项潜在风险" icon={Sparkles}>
      <div className="space-y-3 p-4">
        {risks.map((risk, index) => (
          <div key={risk.title} className="flex items-center justify-between gap-3 rounded-xl border border-borderSoft bg-[var(--color-bg-muted)] px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-danger-soft text-[13px] font-bold text-danger">{index + 1}</span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-bold text-textMain">{risk.title}</div>
                <div className="mt-0.5 text-[12px] text-textMuted">风险等级：{risk.level}</div>
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="h-9 w-full rounded-md border border-ai-border bg-ai-soft text-[13px] font-semibold text-ai">查看风险详情</button>
      </div>
    </SectionShell>
  );
}

function LetterPreviewPanel() {
  return (
    <SectionShell title="AI 生成询价函（预览）" subtitle="AI 根据您的选择自动生成询价函内容，可手动编辑" icon={Sparkles} action={<><TinyButton label="重新生成" icon={RefreshCw} /><TinyButton label="切换模板" icon={FileText} /><TinyButton label="编辑内容" icon={Pencil} /></>}>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)]">
        <div className="text-[12px] leading-6 text-textSecondary">
          {aiInquiryLetterDraft.body.map((line) => <p key={line}>{line}</p>)}
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>含税单价（CDF）</li>
            <li>交货周期和方式</li>
            <li>付款条件</li>
            <li>质保及售后服务</li>
            <li>其他商务条款</li>
          </ol>
          <p className="mt-3">请于 {aiInquiryLetterDraft.deadline}（当地时间）前回复报价。</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-borderSoft">
          <table className="w-full text-[11px]">
            <thead className="bg-ai-soft text-textSecondary">
              <tr className="h-8">
                <th className="px-2 text-left">序号</th>
                <th className="px-2 text-left">物资名称 / 规格型号</th>
                <th className="px-2 text-center">单位</th>
                <th className="px-2 text-right">数量</th>
                <th className="px-2 text-left">备注</th>
              </tr>
            </thead>
            <tbody>
              {inquiryItemCandidates.map((item, index) => (
                <tr key={item.id} className="h-9 border-t border-borderSoft">
                  <td className="px-2">{index + 1}</td>
                  <td className="px-2 font-semibold text-textMain">{item.name}</td>
                  <td className="px-2 text-center">{item.unit}</td>
                  <td className="px-2 text-right tabular-nums">{item.quantity.toLocaleString("zh-CN")}</td>
                  <td className="px-2 text-textMuted">{item.remark ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionShell>
  );
}

function TaskSettingsPanel() {
  const fieldClass = "h-8 rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textMain";

  return (
    <SectionShell title="任务设置" subtitle="询价任务名称、截止时间与商务条件" icon={FileText}>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">任务名称 *</span>
          <input className={cn(fieldClass, "w-full")} defaultValue="水厂建设项目 - 主要材料询价" />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">询价截止时间 *</span>
          <input className={cn(fieldClass, "w-full")} defaultValue={aiInquiryLetterDraft.deadline} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">交货地点</span>
          <input className={cn(fieldClass, "w-full")} defaultValue={aiInquiryLetterDraft.location} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">币种</span>
          <input className={cn(fieldClass, "w-full")} defaultValue={aiInquiryLetterDraft.currency} />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">付款条件</span>
          <input className={cn(fieldClass, "w-full")} defaultValue={aiInquiryLetterDraft.paymentTerms} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[12px] font-semibold text-textSecondary">备注</span>
          <textarea className="h-[74px] w-full resize-none rounded-md border border-borderSoft bg-white px-2 py-2 text-[12px] text-textMain" defaultValue={aiInquiryLetterDraft.note} />
          <span className="mt-1 block text-right text-[11px] text-textMuted">0/200</span>
        </label>
      </div>
    </SectionShell>
  );
}

function OverviewCard({ item, index }: { item: (typeof inquiryOverview)[number]; index: number }) {
  const configs = [
    { icon: UsersRound, tone: "blue" as const, text: "text-primary", bg: "from-white to-primary-soft/50" },
    { icon: PackagePlus, tone: "green" as const, text: "text-success", bg: "from-white to-success-soft/50" },
    { icon: ShieldCheck, tone: "orange" as const, text: "text-warning", bg: "from-white to-warning-soft/50" },
    { icon: Star, tone: "ai" as const, text: "text-ai", bg: "from-white to-ai-soft/60" },
    { icon: Clock3, tone: "orange" as const, text: "text-warning", bg: "from-white to-warning-soft/50" },
    { icon: Bot, tone: "ai" as const, text: "text-ai", bg: "from-white to-ai-soft/60" },
  ];
  const config = configs[index];

  return (
    <div className={cn("flex min-w-0 items-center gap-3 rounded-xl border border-borderSoft bg-gradient-to-br p-3 shadow-sm", config.bg)}>
      <PrettyIcon icon={config.icon} tone={config.tone} size="md" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-textMuted">{item.label}</div>
        <div className={cn("mt-0.5 truncate text-[22px] font-bold leading-7", config.text)}>
          {item.value} {item.unit ? <span className="text-[11px] font-semibold text-textMuted">{item.unit}</span> : null}
        </div>
        <div className="truncate text-[11px] text-textMuted">{item.description}</div>
      </div>
    </div>
  );
}

function InquiryOverviewPanel() {
  return (
    <SectionShell title="询价概览" subtitle="生成任务前的关键摘要">
      <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
        {inquiryOverview.map((item, index) => <OverviewCard key={item.label} item={item} index={index} />)}
      </div>
    </SectionShell>
  );
}

export default function InquiryCreatePage() {
  return (
    <AppLayout>
      <div className="space-y-3">
        <CreatePageHeader />
        <StepIndicator />

        <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.8fr)_minmax(270px,0.64fr)]">
          <InquiryItemsPanel />
          <SuppliersPanel />
          <AiSmartAdvicePanel />
        </div>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.78fr)_minmax(270px,0.64fr)]">
          <LetterPreviewPanel />
          <TaskSettingsPanel />
          <AiRiskPanel />
        </div>

        <InquiryOverviewPanel />
      </div>
    </AppLayout>
  );
}
