"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Copy,
  FileText,
  GitCompareArrows,
  Link2,
  MailCheck,
  PackageSearch,
  Paperclip,
  PenLine,
  ShieldAlert,
  Sparkles,
  Timer,
  Upload,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { PriceCell } from "@/components/common/PriceCell";
import type {
  InquiryAttachment,
  InquiryDetail,
  InquiryDetailItem,
  InquiryRiskAction,
  InquirySupplierResponse,
  SupplierResponseStatus,
} from "@/data/mock/inquiryDetails";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useMockToast } from "@/hooks/useMockToast";
import { InquiryOperationsDialog } from "@/components/inquiries/InquiryOperationsDialog";
import { InquiryAttachmentDialog } from "@/components/inquiries/InquiryAttachmentDialog";
import { InquiryEditDialog } from "@/components/inquiries/InquiryEditDialog";
import { InquiryLifecycleStrip } from "@/components/inquiries/InquiryLifecycleStrip";

type InquiryDetailViewProps = {
  detail: InquiryDetail;
  onRefresh?: () => void | Promise<void>;
};

function getComparisonHref(inquiryId: string) {
  const comparisonId = inquiryId.startsWith("INQ-") ? inquiryId.replace("INQ-", "CMP-") : "CMP-202506-001";
  return `/comparisons/${comparisonId}?from=inquiry&inquiryId=${inquiryId}`;
}

const responseStatusMap: Record<SupplierResponseStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "border-slate-200 bg-slate-50 text-slate-600" },
  sent: { label: "已发送", className: "border-blue-200 bg-blue-50 text-blue-700" },
  viewed: { label: "已查看", className: "border-purple-200 bg-purple-50 text-purple-700" },
  responded: { label: "已响应", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  overdue: { label: "逾期", className: "border-red-200 bg-red-50 text-red-700" },
};

const speedLabel = {
  fast: "快",
  normal: "中",
  slow: "慢",
} as const;

function ActionButton({
  children,
  href,
  onClick,
  tone = "default",
  disabled = false,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "primary" | "ai" | "success" | "warning" | "danger";
  disabled?: boolean;
}) {
  const className = cn(
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition",
    tone === "default" && "border-borderSoft bg-white text-textSecondary hover:border-primary/30 hover:text-primary",
    tone === "primary" && "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)] hover:bg-primary-dark",
    tone === "ai" && "border-ai bg-ai text-white shadow-[0_8px_18px_rgba(124,58,237,0.22)] hover:bg-ai-dark",
    tone === "success" && "border-success bg-success text-white hover:bg-success-dark",
    tone === "warning" && "border-warning bg-warning text-white hover:bg-warning-dark",
    tone === "danger" && "border-danger bg-danger text-white hover:bg-danger-dark",
    disabled && "pointer-events-none opacity-60"
  );

  if (href) {
    return (
      <Link href={href} data-no-global-interaction className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" data-no-global-interaction className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-semibold", className)}>
      {children}
    </span>
  );
}

function ResponseStatusPill({ status }: { status: SupplierResponseStatus }) {
  const item = responseStatusMap[status];

  return <Pill className={item.className}>{item.label}</Pill>;
}

function InquiryDetailHeader({
  detail,
  onEdit,
  onReminder,
  onOpenSupplierPortal,
}: {
  detail: InquiryDetail;
  onEdit: () => void;
  onReminder: () => void;
  onOpenSupplierPortal: () => void;
}) {
  return (
    <section className="rounded-[18px] border border-borderSoft bg-white px-4 py-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/inquiries" data-no-global-interaction className="mb-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary-dark">
            <ArrowLeft className="size-3.5" />
            返回询价管理
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold leading-7 text-textMain">{detail.title}</h1>
            <StatusBadge status={detail.status} label={detail.statusLabel || "询价中"} />
            <AiBadge label={detail.aiSuggestionStatus === "confirmed" ? "AI建议已确认" : "AI建议待复核"} />
          </div>
          <p className="mt-1 text-[13px] text-textSecondary">
            {detail.id} · {detail.projectName} · {detail.inquiryType}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ActionButton onClick={onOpenSupplierPortal} tone="primary">
            <Link2 className="size-3.5" />
            生成供应商报价链接
          </ActionButton>
          <ActionButton onClick={onEdit}>
            <PenLine className="size-3.5" />
            编辑询价
          </ActionButton>
          <ActionButton onClick={onReminder} tone="warning">
            <BellRing className="size-3.5" />
            发送提醒
          </ActionButton>
          <ActionButton href={getComparisonHref(detail.id)} tone="primary">
            <GitCompareArrows className="size-3.5" />
            进入比价
          </ActionButton>
          <ActionButton href={`/ai-inquiry-letter?inquiryId=${encodeURIComponent(detail.id)}`} tone="ai">
            <Sparkles className="size-3.5" />
            询价函工作台
          </ActionButton>
          <ActionButton href={`/attachments?relatedInquiry=${detail.id}`}>
            <Paperclip className="size-3.5" />
            查看附件
          </ActionButton>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-[12px] text-textSecondary md:grid-cols-4 xl:grid-cols-8">
        <MetaItem label="创建时间" value={detail.createdAt} />
        <MetaItem label="截止时间" value={detail.deadline} />
        <MetaItem label="供应商" value={`${detail.supplierCount} 家`} />
        <MetaItem label="已响应" value={`${detail.respondedCount} 家`} />
        <MetaItem label="负责人" value={detail.owner} />
        <MetaItem label="最低报价" value={detail.lowestQuote ? formatCurrency(detail.lowestQuote, detail.lowestQuoteCurrency || "CNY") : "待供应商响应"} />
        <MetaItem label="风险等级" value={<RiskBadge level={detail.riskLevel} />} />
        <MetaItem label="AI置信度" value={`${detail.aiConfidence}%`} />
      </div>
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-borderSoft bg-surfaceSoft px-3 py-2">
      <div className="text-[11px] text-textMuted">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-semibold text-textMain">{value}</div>
    </div>
  );
}

function SummaryCards({ detail }: { detail: InquiryDetail }) {
  const cards: Array<{ label: string; value: ReactNode; hint: string; icon: typeof ClipboardList; tone: IconBoxTone }> = [
    { label: "询价对象", value: `${detail.items.length} 项`, hint: "设备与地材已纳入", icon: ClipboardList, tone: "blue" },
    { label: "供应商数量", value: `${detail.supplierCount} 家`, hint: "覆盖本地与区域供应商", icon: UsersRound, tone: "cyan" },
    { label: "已响应", value: `${detail.respondedCount} 家`, hint: `响应率 ${detail.supplierCount ? Math.round((detail.respondedCount / detail.supplierCount) * 100) : 0}%`, icon: MailCheck, tone: "green" },
    { label: "最低报价", value: detail.lowestQuote ? formatCurrency(detail.lowestQuote, detail.lowestQuoteCurrency || "CNY") : "待报价", hint: "进入比价前需复核", icon: WalletCards, tone: "orange" },
    { label: "剩余时间", value: detail.remainingTime, hint: "逾期供应商需提醒", icon: Timer, tone: "purple" },
    { label: "风险状态", value: <RiskBadge level={detail.riskLevel} />, hint: "AI已发现需处理项", icon: ShieldAlert, tone: "red" },
  ];

  return (
    <section className="grid gap-2 md:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[16px] border border-borderSoft bg-white p-3 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-textSecondary">{card.label}</div>
              <div className="mt-1 text-[22px] font-bold text-textMain">{card.value}</div>
            </div>
            <IconBox icon={card.icon} tone={card.tone} size="md" />
          </div>
          <div className="mt-2 text-[11px] font-medium text-textMuted">{card.hint}</div>
        </div>
      ))}
    </section>
  );
}

function InquiryItemPanel({ items }: { items: InquiryDetailItem[] }) {
  return (
    <Panel>
      <ModuleHeader icon={PackageSearch} title="询价对象清单" subtitle="设备、地材与来源证据" tone="blue" density="compact" />
      <div className="mt-3 overflow-hidden rounded-xl border border-borderSoft">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-tableHeader text-textSecondary">
            <tr>
              <th className="px-3 py-2 font-semibold">对象</th>
              <th className="px-3 py-2 font-semibold">规格</th>
              <th className="px-3 py-2 text-right font-semibold">数量</th>
              <th className="px-3 py-2 text-right font-semibold">参考价</th>
              <th className="px-3 py-2 font-semibold">可信度</th>
              <th className="px-3 py-2 font-semibold">风险</th>
              <th className="px-3 py-2 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderSoft">
            {items.map((item) => (
              <tr key={item.id} className="bg-white">
                <td className="px-3 py-2">
                  <div className="font-semibold text-textMain">{item.name}</div>
                  <div className="text-[11px] text-textMuted">{item.targetId} · {item.targetType === "equipment" ? "设备" : "地材"}</div>
                </td>
                <td className="max-w-[190px] truncate px-3 py-2 text-textSecondary" title={item.specification}>{item.specification}</td>
                <td className="px-3 py-2 text-right font-semibold">{item.quantity} {item.unit}</td>
                <td className="px-3 py-2 text-right"><PriceCell value={item.referencePrice} currency={item.currency} /></td>
                <td className="px-3 py-2"><ConfidenceBadge level={item.confidenceLevel} /></td>
                <td className="px-3 py-2"><RiskBadge level={item.riskLevel} /></td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1.5">
                    <ActionButton href={item.targetType === "equipment" ? `/equipment-prices/${item.targetId}` : `/material-prices/${item.targetId}`}>
                      查看
                    </ActionButton>
                    <ActionButton href={`/attachments?relatedObject=${item.targetId}&evidenceId=${item.evidenceId}`}>
                      证据
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SupplierCoverageMatrix({ items, suppliers }: { items: InquiryDetailItem[]; suppliers: InquirySupplierResponse[] }) {
  const itemMap = new Map(items.map((item) => [item.targetId, item]));

  return (
    <Panel>
      <ModuleHeader icon={ClipboardCheck} title="供应商覆盖矩阵" subtitle="发送前复核每家供应商收到的询价对象与准入状态" tone="green" density="compact" />
      <div className="mt-3 overflow-hidden rounded-lg border border-borderSoft">
        <div className="grid grid-cols-[minmax(150px,0.8fr)_96px_minmax(0,2fr)_64px] gap-3 bg-tableHeader px-3 py-2 text-[11px] font-semibold text-textSecondary">
          <span>供应商</span><span>准入状态</span><span>覆盖对象</span><span className="text-right">数量</span>
        </div>
        <div className="divide-y divide-borderSoft bg-white">
          {suppliers.map((supplier) => {
            const assignedItems = (supplier.assignedItemIds ?? []).map((itemId) => itemMap.get(itemId)).filter((item): item is InquiryDetailItem => Boolean(item));
            const approved = supplier.admissionStatus === "approved";
            return (
              <div key={supplier.supplierId} className="grid grid-cols-[minmax(150px,0.8fr)_96px_minmax(0,2fr)_64px] items-center gap-3 px-3 py-2.5 text-[11px]">
                <div className="min-w-0"><div className="truncate font-semibold text-textMain" title={supplier.supplierName}>{supplier.supplierName}</div><div className="truncate text-[10px] text-textMuted">{supplier.supplierId}</div></div>
                <span className={cn("inline-flex w-fit rounded-full border px-2 py-1 font-semibold", approved ? "border-success/20 bg-success-soft text-success" : "border-warning/25 bg-warning-soft text-warning")}>{approved ? "已准入" : "待核验"}</span>
                <div className="flex min-w-0 flex-wrap gap-1">
                  {assignedItems.map((item) => <span key={item.id} title={`${item.name} · ${item.specification}`} className="max-w-[190px] truncate rounded-md border border-primary/15 bg-primary-soft px-2 py-1 font-semibold text-primary">{item.name}</span>)}
                  {!assignedItems.length ? <span className="font-semibold text-danger">未找到已保存的覆盖范围，请在询价函工作台补充分配</span> : null}
                </div>
                <span className={cn("text-right font-bold", assignedItems.length ? "text-textMain" : "text-danger")}>{assignedItems.length}/{items.length}</span>
              </div>
            );
          })}
          {!suppliers.length ? <div className="px-3 py-8 text-center text-[12px] text-textMuted">尚未关联供应商</div> : null}
        </div>
      </div>
    </Panel>
  );
}

function SupplierResponsePanel({
  suppliers,
  selectedSupplierId,
  onSelect,
  onMarkResponded,
  onReminder,
}: {
  suppliers: InquirySupplierResponse[];
  selectedSupplierId: string;
  onSelect: (supplierId: string) => void;
  onMarkResponded: (supplierId: string) => void;
  onReminder: (supplierId: string) => void;
}) {
  return (
    <Panel>
      <ModuleHeader icon={UsersRound} title="供应商响应" subtitle="报价、交期、响应速度与风险" tone="cyan" density="compact" />
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {suppliers.map((supplier) => {
          const selected = supplier.supplierId === selectedSupplierId;

          return (
            <div key={supplier.supplierId} className={cn("rounded-xl border p-3 transition", selected ? "border-primary/35 bg-primary-soft/70" : "border-borderSoft bg-white")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-textMain">{supplier.supplierName}</div>
                  <div className="mt-0.5 text-[11px] text-textMuted">{supplier.region}</div>
                </div>
                <button type="button" data-no-global-interaction onClick={() => onSelect(supplier.supplierId)} className="rounded-md border border-borderSoft bg-white px-2 py-1 text-[11px] font-semibold text-primary">
                  {selected ? "已选" : "选择"}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-textSecondary">
                <span>联系人：{supplier.contact}</span>
                <span>响应：{speedLabel[supplier.responseSpeed]}</span>
                <span>WhatsApp：{supplier.whatsapp}</span>
                <span>交付评分：{supplier.deliveryScore}%</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ResponseStatusPill status={supplier.responseStatus} />
                <RiskBadge level={supplier.riskLevel} />
                {supplier.quoteAmount > 0 ? <PriceCell value={supplier.quoteAmount} currency={supplier.currency} /> : <span className="text-[12px] font-semibold text-warning">未报价</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ActionButton href={`/suppliers/${supplier.supplierId}`}>供应商详情</ActionButton>
                <ActionButton onClick={() => onReminder(supplier.supplierId)} tone="warning">提醒</ActionButton>
                {supplier.responseStatus !== "responded" ? (
                  <ActionButton onClick={() => onMarkResponded(supplier.supplierId)} tone="success">标记响应</ActionButton>
                ) : null}
              </div>
            </div>
          );
        })}
        {!suppliers.length ? (
          <div className="rounded-xl border border-dashed border-borderSoft px-3 py-8 text-center text-[12px] text-textMuted">
            暂无受邀供应商，请先编辑询价任务并补充供应商。
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function InquiryLetterPanel({
  detail,
  onEdit,
  onCopy,
  onSave,
}: {
  detail: InquiryDetail;
  onEdit: () => void;
  onCopy: () => void;
  onSave: () => void;
}) {
  return (
    <Panel>
      <ModuleHeader
        icon={FileText}
        title="AI询价函草稿"
        subtitle={`${detail.letter.version} · ${detail.letter.language} · ${detail.letter.recipients}`}
        tone="purple"
        density="compact"
        action={
          <>
            <ActionButton onClick={onEdit}>
              <PenLine className="size-3.5" />
              编辑
            </ActionButton>
            <ActionButton href={`/ai-inquiry-letter?inquiryId=${encodeURIComponent(detail.id)}`} tone="ai">
              <Sparkles className="size-3.5" />
              重新生成
            </ActionButton>
          </>
        }
      />
      <div className="mt-3 rounded-xl border border-ai-border bg-ai-soft/60 p-3 text-[12px] leading-6 text-textSecondary">
        <p className="font-semibold text-textMain">项目背景</p>
        <p>{detail.letter.projectBackground}</p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <LetterList title="技术要求" items={detail.letter.technicalRequirements} />
          <LetterList title="报价要求" items={detail.letter.quoteRequirements} />
        </div>
        <div className="mt-3 grid gap-2 rounded-lg bg-white p-3 md:grid-cols-2">
          <InfoLine label="回复截止" value={detail.letter.deadlineText} />
          <InfoLine label="联系人" value={detail.letter.contact} />
          <InfoLine label="附件清单" value={detail.letter.attachments.join("、")} />
          <InfoLine label="AI提示" value={detail.letter.aiNote} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton onClick={onCopy}>
            <Copy className="size-3.5" />
            复制内容
          </ActionButton>
          <ActionButton onClick={onSave} tone="primary">
            <ClipboardCheck className="size-3.5" />
            保存草稿
          </ActionButton>
        </div>
      </div>
    </Panel>
  );
}

function LetterList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-semibold text-textMain">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ai" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-textMuted">{label}</div>
      <div className="mt-0.5 font-semibold text-textMain">{value}</div>
    </div>
  );
}

function TimelinePanel({ detail }: { detail: InquiryDetail }) {
  return (
    <Panel>
      <ModuleHeader icon={CalendarClock} title="发送与提醒时间线" subtitle="任务节点与下一步动作" tone="blue" density="compact" />
      <div className="mt-3 grid gap-2 md:grid-cols-5">
        {detail.timeline.map((step, index) => (
          <div key={step.label} className="relative rounded-xl border border-borderSoft bg-surfaceSoft p-3">
            <div className={cn("flex size-7 items-center justify-center rounded-full text-white", step.status === "done" ? "bg-success" : step.status === "running" ? "bg-ai" : "bg-slate-300")}>
              {step.status === "done" ? <CheckCircle2 className="size-4" /> : index + 1}
            </div>
            <div className="mt-2 text-[12px] font-semibold text-textMain">{step.label}</div>
            <div className="mt-1 text-[11px] text-textMuted">{step.time}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AiInquiryAnalysisPanel({ detail, selectedSupplier }: { detail: InquiryDetail; selectedSupplier?: InquirySupplierResponse }) {
  return (
    <Panel className="border-ai-border bg-gradient-to-br from-white via-white to-ai-soft/75">
      <ModuleHeader icon={Bot} title="AI询价分析" subtitle="覆盖度、风险与下一步建议" tone="purple" density="compact" action={<AiBadge label="AI分析" />} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricBox label="字段完整度" value={`${detail.aiAnalysis.completeness}%`} tone="green" />
        <MetricBox label="供应商覆盖" value={`${detail.aiAnalysis.coverage}%`} tone="blue" />
        <MetricBox label="AI置信度" value={`${detail.aiAnalysis.confidence}%`} tone="purple" />
        <MetricBox label="当前关注供应商" value={selectedSupplier?.supplierName || "尚未关联供应商"} tone="orange" small />
      </div>
      <div className="mt-3 space-y-2">
        <AiNote tone="warning" title="响应风险" body={detail.aiAnalysis.responseRisk} />
        <AiNote tone="danger" title="报价异常" body={detail.aiAnalysis.quoteAbnormal} />
        <AiNote tone="ai" title="AI建议动作" body={detail.aiAnalysis.nextActions.join("；")} />
      </div>
      {detail.aiAnalysis.evidence ? (
        <div className="mt-3 rounded-xl border border-ai-border bg-white p-3">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-ai">AI判断证据</span>
            <span className="text-textMuted">{detail.aiAnalysis.evidence.analyzedAt}</span>
          </div>
          <div className="mt-1 text-[11px] text-textSecondary">模型：{detail.aiAnalysis.evidence.model}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detail.aiAnalysis.evidence.sources.map((source) => <Pill key={source} className="border-ai-border bg-ai-soft text-ai">{source}</Pill>)}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function MetricBox({ label, value, tone, small = false }: { label: string; value: ReactNode; tone: "blue" | "green" | "purple" | "orange"; small?: boolean }) {
  const toneClassName = {
    blue: "bg-primary-soft text-primary",
    green: "bg-success-soft text-success",
    purple: "bg-ai-soft text-ai",
    orange: "bg-warning-soft text-warning",
  } as const;

  return (
    <div className="rounded-xl border border-borderSoft bg-white p-3">
      <div className="text-[11px] text-textMuted">{label}</div>
      <div className={cn("mt-1 truncate rounded-lg px-2 py-1 font-bold", small ? "text-[12px]" : "text-[20px]", toneClassName[tone])}>{value}</div>
    </div>
  );
}

function AiNote({ tone, title, body }: { tone: "ai" | "warning" | "danger"; title: string; body: string }) {
  const toneClassName = {
    ai: "border-ai-border bg-ai-soft/80 text-ai",
    warning: "border-warning/20 bg-warning-soft text-[#B45309]",
    danger: "border-danger/20 bg-danger-soft text-danger",
  } as const;

  return (
    <div className={cn("rounded-xl border p-3", toneClassName[tone])}>
      <div className="text-[12px] font-bold">{title}</div>
      <p className="mt-1 text-[12px] leading-5 text-textSecondary">{body}</p>
    </div>
  );
}

function RiskAndActionPanel({ risks, onAction, busyKey }: { risks: InquiryRiskAction[]; onAction: (risk: InquiryRiskAction) => void; busyKey?: string | null }) {
  return (
    <Panel>
      <ModuleHeader icon={AlertTriangle} title="风险处理建议" subtitle="风险项与业务化处理动作" tone="red" density="compact" />
      <div className="mt-3 space-y-2">
        {risks.map((risk) => (
          <div key={`${risk.riskType}-${risk.impactObject}`} className="rounded-xl border border-borderSoft bg-surfaceSoft p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-bold text-textMain">{risk.riskType}</div>
                <div className="mt-0.5 text-[11px] text-textMuted">{risk.impactObject}</div>
              </div>
              <RiskBadge level={risk.level} />
            </div>
            <p className="mt-2 text-[12px] leading-5 text-textSecondary">{risk.aiJudgement}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-ai">{risk.suggestedAction}</span>
              <ActionButton onClick={() => onAction(risk)} tone={risk.level === "high" ? "danger" : "warning"} disabled={busyKey === `${risk.riskType}-${risk.actionLabel}`}>
                {busyKey === `${risk.riskType}-${risk.actionLabel}` ? "处理中..." : risk.actionLabel}
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function EvidenceAttachmentPanel({
  detail,
  onUpload,
}: {
  detail: InquiryDetail;
  onUpload: () => void;
}) {
  return (
    <Panel>
      <ModuleHeader
        icon={Paperclip}
        title="附件证据链"
        subtitle="询价清单、回执与风险证据"
        tone="green"
        density="compact"
        action={
          <ActionButton onClick={onUpload} tone="ai">
            <Upload className="size-3.5" />
            上传并归档
          </ActionButton>
        }
      />
      <div className="mt-3 space-y-2">
        {detail.attachments.map((file) => (
          <AttachmentRow key={file.id} file={file} inquiryId={detail.id} />
        ))}
        {!detail.attachments.length ? <div className="rounded-xl border border-dashed border-borderSoft px-3 py-6 text-center text-[12px] text-textMuted">暂无询价附件，上传后将进入真实证据链。</div> : null}
      </div>
      <Link href={`/attachments?relatedInquiry=${detail.id}`} data-no-global-interaction className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-[12px] font-semibold text-primary">
        查看完整证据链
        <ChevronRight className="size-3.5" />
      </Link>
    </Panel>
  );
}

function AttachmentRow({ file, inquiryId }: { file: InquiryAttachment; inquiryId: string }) {
  return (
    <Link href={`/attachments/${file.id}?relatedInquiry=${encodeURIComponent(inquiryId)}`} data-no-global-interaction className="flex items-center justify-between gap-3 rounded-xl border border-borderSoft bg-white p-3 hover:border-primary/30">
      <div className="flex min-w-0 items-center gap-3">
        <IconBox icon={FileText} tone={file.type === "PDF" ? "red" : file.type === "XLSX" ? "green" : "blue"} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-textMain">{file.name}</div>
          <div className="mt-0.5 text-[11px] text-textMuted">{file.type} · {file.size} · {file.linkedObject}</div>
        </div>
      </div>
      {file.aiArchived ? <AiBadge label="已归档" /> : <Pill className="border-warning/20 bg-warning-soft text-warning">待归档</Pill>}
    </Link>
  );
}

function SupplierResponseTable({ suppliers, onReminder }: { suppliers: InquirySupplierResponse[]; onReminder: (supplierId: string) => void }) {
  return (
    <Panel>
      <ModuleHeader icon={ClipboardCheck} title="供应商响应明细" subtitle="报价金额、响应状态、风险和操作" tone="blue" density="compact" />
      <div className="mt-3 overflow-x-auto rounded-xl border border-borderSoft">
        <table className="min-w-[980px] w-full text-left text-[12px]">
          <thead className="bg-tableHeader text-textSecondary">
            <tr>
              <th className="px-3 py-2 font-semibold">供应商</th>
              <th className="px-3 py-2 font-semibold">联系人</th>
              <th className="px-3 py-2 font-semibold">发送状态</th>
              <th className="px-3 py-2 font-semibold">响应状态</th>
              <th className="px-3 py-2 text-right font-semibold">报价金额</th>
              <th className="px-3 py-2 font-semibold">响应时间</th>
              <th className="px-3 py-2 font-semibold">交付评分</th>
              <th className="px-3 py-2 font-semibold">风险</th>
              <th className="px-3 py-2 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderSoft bg-white">
            {suppliers.map((supplier) => (
              <tr key={supplier.supplierId}>
                <td className="px-3 py-2">
                  <Link href={`/suppliers/${supplier.supplierId}`} data-no-global-interaction className="font-semibold text-primary">{supplier.supplierName}</Link>
                  <div className="text-[11px] text-textMuted">{supplier.region}</div>
                </td>
                <td className="px-3 py-2 text-textSecondary">{supplier.contact}</td>
                <td className="px-3 py-2"><ResponseStatusPill status={supplier.sendStatus} /></td>
                <td className="px-3 py-2"><ResponseStatusPill status={supplier.responseStatus} /></td>
                <td className="px-3 py-2 text-right">{supplier.quoteAmount ? <PriceCell value={supplier.quoteAmount} currency={supplier.currency} /> : "-"}</td>
                <td className="px-3 py-2 text-textSecondary">{supplier.responseTime}</td>
                <td className="px-3 py-2 font-semibold text-success">{supplier.deliveryScore}%</td>
                <td className="px-3 py-2"><RiskBadge level={supplier.riskLevel} /></td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1.5">
                    <ActionButton href={`/suppliers/${supplier.supplierId}`}>查看</ActionButton>
                    <ActionButton onClick={() => onReminder(supplier.supplierId)} tone="warning">提醒</ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function OperationHistory({ operations }: { operations: InquiryDetail["operations"] }) {
  return (
    <Panel>
      <ModuleHeader icon={ClipboardList} title="操作记录" subtitle="人工与 AI 处理痕迹" tone="slate" density="compact" />
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {operations.map((operation) => (
          <div key={`${operation.time}-${operation.action}`} className="rounded-xl border border-borderSoft bg-surfaceSoft p-3">
            <div className="text-[12px] font-semibold text-textMain">{operation.action}</div>
            <div className="mt-1 text-[11px] text-textMuted">{operation.time} · {operation.operator}</div>
            <p className="mt-2 text-[12px] leading-5 text-textSecondary">{operation.result}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BottomActionBar({
  detail,
  onReminder,
  onOpenSupplierPortal,
}: {
  detail: InquiryDetail;
  onReminder: () => void;
  onOpenSupplierPortal: () => void;
}) {
  return (
    <section className="sticky bottom-3 z-10 rounded-[16px] border border-borderSoft bg-white/95 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] font-medium text-textSecondary">
          当前询价：<b className="text-textMain">{detail.id}</b> · 已响应 <b className="text-success">{detail.respondedCount}</b> / {detail.supplierCount} 家 · AI置信度 <b className="text-ai">{detail.aiConfidence}%</b>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={onOpenSupplierPortal} tone="primary">
            <Link2 className="size-3.5" />
            生成供应商报价链接
          </ActionButton>
          <ActionButton href={`/ai-inquiry-letter?inquiryId=${encodeURIComponent(detail.id)}`} tone="ai">
            <Sparkles className="size-3.5" />
            询价函工作台
          </ActionButton>
          <ActionButton href={getComparisonHref(detail.id)} tone="primary">
            <GitCompareArrows className="size-3.5" />
            进入比价
          </ActionButton>
          <ActionButton onClick={onReminder} tone="warning">
            <BellRing className="size-3.5" />
            批量提醒
          </ActionButton>
          <ActionButton href={`/ai-report-center?source=inquiry&inquiryId=${detail.id}`}>
            <FileText className="size-3.5" />
            生成报告任务
          </ActionButton>
        </div>
      </div>
    </section>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[16px] border border-borderSoft bg-white p-3 shadow-card", className)}>{children}</section>;
}

export function InquiryDetailView({ detail, onRefresh }: InquiryDetailViewProps) {
  const toast = useMockToast();
  const suppliers = detail.suppliers;
  const [selectedSupplierId, setSelectedSupplierId] = useState(detail.suppliers[0]?.supplierId ?? "");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [operations, setOperations] = useState<{ open: boolean; mode: "quote" | "timeline"; supplierId?: string }>({ open: false, mode: "quote" });
  const [riskBusyKey, setRiskBusyKey] = useState<string | null>(null);

  const handleOperationNotice = useCallback(
    (
      tone: "success" | "danger" | "warning" | "info",
      title: string,
      description: string,
    ) => {
      toast[tone](title, description);
    },
    [toast],
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.supplierId === selectedSupplierId) ?? suppliers[0],
    [selectedSupplierId, suppliers]
  );

  const refresh = useCallback(async () => { await onRefresh?.(); }, [onRefresh]);

  const openQuote = (supplierId?: string) => setOperations({ open: true, mode: "quote", supplierId });
  const openReminder = (supplierId?: string) => setOperations({ open: true, mode: "timeline", supplierId });

  const copyLetter = async () => {
    const content = detail.letter.rawContent || detail.letter.projectBackground;
    try {
      await navigator.clipboard.writeText(content);
      toast.success("询价函内容已复制", "已复制当前数据库版本的询价函正文。 ");
    } catch {
      toast.warning("复制失败", "浏览器未授予剪贴板权限，请使用编辑功能查看正文。 ");
    }
  };

  const saveLetter = async () => {
    try {
      const response = await fetch(`/api/inquiries/${encodeURIComponent(detail.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letterContent: detail.letter.rawContent || detail.letter.projectBackground }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "保存失败");
      await refresh();
      toast.success("询价函草稿已保存", "当前正文已写入 Supabase，并新增操作记录。 ");
    } catch (error) {
      toast.danger("询价函保存失败", error instanceof Error ? error.message : "请稍后重试");
    }
  };

  const handleRiskAction = async (risk: InquiryRiskAction) => {
    if (risk.actionLabel === "发送提醒") {
      openReminder();
      return;
    }
    const key = `${risk.riskType}-${risk.actionLabel}`;
    setRiskBusyKey(key);
    try {
      const response = await fetch(`/api/inquiries/${encodeURIComponent(detail.id)}/risk-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(risk),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "风险动作记录失败");
      await refresh();
      toast.success("风险处理动作已记录", "处理结论已写入询价元数据与真实审计时间线，风险等级未被 AI 自动下调。 ");
    } catch (error) {
      toast.danger("风险处理失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setRiskBusyKey(null);
    }
  };

  return (
    <div className="space-y-3 pb-24">
      <InquiryDetailHeader
        detail={detail}
        onEdit={() => setEditDialogOpen(true)}
        onReminder={() => openReminder()}
        onOpenSupplierPortal={() => openQuote()}
      />
      <InquiryLifecycleStrip currentStage={detail.lifecycleStage ?? "server_draft"} />
      <SummaryCards detail={detail} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(360px,5fr)]">
        <div className="space-y-3">
          <InquiryItemPanel items={detail.items} />
          <SupplierCoverageMatrix items={detail.items} suppliers={suppliers} />
          <SupplierResponsePanel
            suppliers={suppliers}
            selectedSupplierId={selectedSupplier?.supplierId ?? ""}
            onSelect={setSelectedSupplierId}
            onMarkResponded={openQuote}
            onReminder={openReminder}
          />
          <InquiryLetterPanel
            detail={detail}
            onEdit={() => setEditDialogOpen(true)}
            onCopy={() => void copyLetter()}
            onSave={() => void saveLetter()}
          />
          <TimelinePanel detail={detail} />
        </div>
        <div className="space-y-3">
          <AiInquiryAnalysisPanel detail={detail} selectedSupplier={selectedSupplier} />
          <RiskAndActionPanel risks={detail.risks} onAction={(risk) => void handleRiskAction(risk)} busyKey={riskBusyKey} />
          <EvidenceAttachmentPanel detail={detail} onUpload={() => setUploadDialogOpen(true)} />
          <Panel className="border-primary/20 bg-primary-soft/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-textMain">补充附件证据</div>
                <p className="mt-1 text-[11px] text-textMuted">文件将上传至 Supabase Storage，并写入询价证据链与审计记录。</p>
              </div>
              <ActionButton onClick={() => setUploadDialogOpen(true)} tone="primary">
                <Upload className="size-3.5" />
                上传附件
              </ActionButton>
            </div>
          </Panel>
        </div>
      </div>

      <SupplierResponseTable suppliers={suppliers} onReminder={openReminder} />
      <OperationHistory operations={detail.operations} />
      <BottomActionBar
        detail={detail}
        onReminder={() => openReminder()}
        onOpenSupplierPortal={() => openQuote()}
      />
      <InquiryOperationsDialog
        open={operations.open}
        mode={operations.mode}
        inquiryId={detail.id}
        inquiryCode={detail.id}
        initialSupplierId={operations.supplierId}
        onClose={() => setOperations((current) => ({ ...current, open: false }))}
        onChanged={() => void refresh()}
        onNotice={handleOperationNotice}
      />
      {editDialogOpen ? (
        <InquiryEditDialog
          open
          inquiryId={detail.id}
          detail={detail}
          onClose={() => setEditDialogOpen(false)}
          onChanged={refresh}
          onNotice={handleOperationNotice}
        />
      ) : null}
      <InquiryAttachmentDialog
        open={uploadDialogOpen}
        inquiryId={detail.id}
        onClose={() => setUploadDialogOpen(false)}
        onChanged={() => void refresh()}
        onNotice={handleOperationNotice}
      />
    </div>
  );
}
