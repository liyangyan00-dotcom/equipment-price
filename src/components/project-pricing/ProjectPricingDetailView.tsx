"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Eye,
  FileDown,
  FileText,
  GitCompareArrows,
  History,
  Link2,
  PackageCheck,
  Send,
  ShieldAlert,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import {
  AiBadge,
  ConfidenceBadge,
  RiskBadge,
  StatusBadge,
} from "@/components/badges";
import { LoadingButton, ModuleHeader } from "@/components/common";
import type {
  ProjectPricingDetail,
  ProjectPricingDetailBoqRow,
  ProjectPricingRiskAction,
  ProjectPricingSourceEvidence,
  ProjectPricingVersion,
} from "@/data/mock/projectPricingDetails";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useMockToast } from "@/hooks/useMockToast";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

type ProjectPricingDetailViewProps = {
  detail: ProjectPricingDetail;
  initialBoqId?: string;
};

const toneClassName = {
  blue: {
    card: "from-white to-primary-soft/70",
    icon: "from-primary to-[#67A5FF] text-white shadow-[0_14px_28px_rgba(47,107,255,0.22)]",
    text: "text-primary",
  },
  green: {
    card: "from-white to-success-soft/70",
    icon: "from-success to-[#7DDAA2] text-white shadow-[0_14px_28px_rgba(31,165,85,0.22)]",
    text: "text-success",
  },
  purple: {
    card: "from-white to-ai-soft/70",
    icon: "from-ai to-[#A78BFA] text-white shadow-ai",
    text: "text-ai",
  },
  orange: {
    card: "from-white to-warning-soft/70",
    icon: "from-warning to-[#FFD37A] text-white shadow-[0_14px_28px_rgba(245,158,11,0.22)]",
    text: "text-warning",
  },
  red: {
    card: "from-white to-danger-soft/70",
    icon: "from-danger to-[#FF8A8A] text-white shadow-[0_14px_28px_rgba(239,68,68,0.22)]",
    text: "text-danger",
  },
} as const;

const matchClassName = {
  exact: "bg-success-soft text-success border-success/20",
  similar: "bg-primary-soft text-primary border-primary/20",
  model: "bg-warning-soft text-[#B45309] border-warning/20",
  gap: "bg-danger-soft text-danger border-danger/20",
} as const;

const categoryClassName = {
  设备: "bg-primary-soft text-primary",
  地材: "bg-success-soft text-success",
  服务: "bg-ai-soft text-ai",
} as const;

function formatAmount(value: number | null, currency = "USD") {
  if (value === null) {
    return "-";
  }

  return formatCurrency(value, currency);
}

function sourceRecordHref(sourceType: string, sourceRecordId: string) {
  if (!sourceRecordId || sourceRecordId === "-") return "";
  if (sourceType === "equipment_price")
    return `/equipment-prices/${sourceRecordId}`;
  if (sourceType === "material_price")
    return `/material-prices/${sourceRecordId}`;
  return "";
}

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "equipment_price") return "设备价格库";
  if (sourceType === "material_price") return "地材价格库";
  if (sourceType === "inquiry_quote") return "询价回填";
  if (sourceType === "manual") return "人工选价";
  return sourceType || "待补充";
}

function DetailShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-borderSoft bg-card p-3 shadow-card",
        className,
      )}
    >
      {children}
    </section>
  );
}

function ProjectPricingDetailHeader({
  detail,
  onEdit,
  onAiReprice,
  aiRunning,
  onExport,
}: {
  detail: ProjectPricingDetail;
  onEdit: () => void;
  onAiReprice: () => void;
  aiRunning: boolean;
  onExport: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
        <div className="min-w-0">
          <Link
            data-no-global-interaction
            href="/project-pricing"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:text-primaryDark"
          >
            <ArrowLeft className="size-3.5" />
            项目套价中心
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="max-w-[760px] text-[22px] font-bold leading-8 text-textMain">
              {detail.projectName}
            </h1>
            <StatusBadge
              status={detail.status}
              label="待人工确认"
              className="h-6 text-[11px]"
            />
            <AiBadge label={`${detail.aiConfidence}% AI置信度`} />
          </div>
          <p
            className="mt-1 truncate text-[12px] text-textMuted"
            title={detail.id}
          >
            方案 {detail.relatedBoqId} · {detail.version} · 数据仅供商务复核
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Link
            data-no-global-interaction
            aria-disabled={!detail.gapCount}
            href={`/inquiries/create?source=project-pricing&pricingId=${detail.id}`}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-bold text-white shadow-primary",
              !detail.gapCount && "pointer-events-none opacity-50",
            )}
          >
            <Send className="size-4" />
            处理 {detail.gapCount} 项缺口
          </Link>
          <LoadingButton
            loading={aiRunning}
            icon={<Sparkles className="size-4" />}
            tone="ai"
            onClick={onAiReprice}
          >
            重新套价
          </LoadingButton>
          <button
            data-no-global-interaction
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary transition hover:border-primary/30 hover:text-primary"
            type="button"
            onClick={onEdit}
          >
            <Wrench className="size-4" /> 编辑条件
          </button>
          <button
            data-no-global-interaction
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary transition hover:border-primary/30 hover:text-primary"
            type="button"
            onClick={onExport}
          >
            <FileDown className="size-4" /> 导出
          </button>
        </div>
      </div>

      <div className="grid border-t border-borderSoft bg-[var(--color-bg-muted)] sm:grid-cols-2 lg:grid-cols-5">
        <HeaderFact label="项目阶段" value={detail.projectStage} />
        <HeaderFact label="价格条件" value={detail.priceCondition} />
        <HeaderFact label="汇率口径" value={detail.exchangeRate} />
        <HeaderFact label="负责人" value={detail.owner} />
        <HeaderFact label="最后更新" value={detail.lastUpdatedAt} />
      </div>
    </section>
  );
}

function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-borderSoft px-4 py-2.5 last:border-b-0 sm:border-r lg:border-b-0">
      <p className="text-[10px] font-semibold text-textMuted">{label}</p>
      <p
        className="mt-0.5 truncate text-[12px] font-bold text-textMain"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function PricingSummaryCards({ detail }: { detail: ProjectPricingDetail }) {
  const coverage = detail.boqItemCount
    ? Math.round((detail.matchedPriceCount / detail.boqItemCount) * 100)
    : 0;
  const estimatedAmount = detail.estimatedAmount ?? detail.totalAmount;
  const pendingReviewCount = detail.pendingReviewCount ?? detail.highRiskCount;
  const metrics = [
    {
      label: "当前估算金额",
      value: `USD ${estimatedAmount.toLocaleString("en-US")}`,
      note: "包含尚未确认的 AI 推荐",
      icon: CircleDollarSign,
      tone: "text-ai bg-ai-soft",
    },
    {
      label: "已确认金额",
      value: `USD ${detail.totalAmount.toLocaleString("en-US")}`,
      note: `${detail.confirmedItemCount ?? 0}/${detail.boqItemCount} 项已由人工确认`,
      icon: PackageCheck,
      tone: "text-primary bg-primary-soft",
    },
    {
      label: "价格覆盖率",
      value: `${coverage}%`,
      note: `${detail.matchedPriceCount}/${detail.boqItemCount} 项已有来源`,
      icon: CheckCircle2,
      tone: "text-success bg-success-soft",
    },
    {
      label: "待人工确认",
      value: `${pendingReviewCount} 项`,
      note: "AI 推荐不得直接形成正式金额",
      icon: ClipboardCheck,
      tone: "text-warning bg-warning-soft",
    },
    {
      label: "缺口 / 高风险",
      value: `${detail.gapCount} / ${detail.highRiskCount} 项`,
      note: "需询价、补证或人工处理",
      icon: AlertTriangle,
      tone: "text-danger bg-danger-soft",
    },
  ];

  return (
    <div className="grid overflow-hidden rounded-card border border-borderSoft bg-card shadow-card sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="flex min-w-0 items-center gap-3 border-b border-borderSoft px-4 py-3 last:border-b-0 sm:border-r xl:border-b-0"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md",
                metric.tone,
              )}
            >
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-textMuted">
                {metric.label}
              </p>
              <p className="mt-0.5 truncate text-[19px] font-bold leading-6 text-textMain">
                {metric.value}
              </p>
              <p className="truncate text-[10px] text-textMuted">
                {metric.note}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoqPricingResultTable({
  detailId,
  rows,
  selectedRowId,
  onSelectRow,
  onCreateInquiry,
  onRefresh,
  refreshing,
}: {
  detailId: string;
  rows: ProjectPricingDetailBoqRow[];
  selectedRowId: string;
  onSelectRow: (id: string) => void;
  onCreateInquiry: (ids: string[]) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = selectedIds.length === rows.length;

  function toggleAll() {
    setSelectedIds(allSelected ? [] : rows.map((row) => row.id));
  }

  function toggleRow(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <DetailShell className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-3 py-3">
        <ModuleHeader
          icon={ClipboardCheck}
          title="BOQ套价明细"
          subtitle={`${rows.length} 行 · ${rows.filter((row) => row.matchStatus !== "gap").length} 行已匹配 · ${rows.filter((row) => row.matchStatus === "gap").length} 行待处理`}
          tone="blue"
          density="compact"
        />
        <div className="flex items-center gap-2">
          <button
            data-no-global-interaction
            disabled={!selectedIds.length}
            className="min-h-11 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-bold text-ai disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            onClick={() => onCreateInquiry(selectedIds)}
          >
            选中项询价
          </button>
          <button
            data-no-global-interaction
            disabled={refreshing}
            className="min-h-11 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary disabled:opacity-50"
            type="button"
            onClick={onRefresh}
          >
            {refreshing ? "重新匹配中" : "重新匹配"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0 text-[12px]">
          <thead>
            <tr className="h-10 bg-[var(--color-bg-muted)] text-left text-textSecondary">
              <th className="w-10 border-b border-borderSoft px-2">
                <input
                  checked={allSelected}
                  className="size-4 rounded border-borderSoft"
                  type="checkbox"
                  onChange={toggleAll}
                />
              </th>
              <th className="w-[105px] border-b border-borderSoft px-2 font-bold">
                BOQ编号
              </th>
              <th className="w-[190px] border-b border-borderSoft px-2 font-bold">
                项目与规格
              </th>
              <th className="w-[66px] border-b border-borderSoft px-2 font-bold">
                类型
              </th>
              <th className="w-[76px] border-b border-borderSoft px-2 text-right font-bold">
                数量
              </th>
              <th className="w-[120px] border-b border-borderSoft px-2 text-right font-bold">
                推荐单价
              </th>
              <th className="w-[126px] border-b border-borderSoft px-2 text-right font-bold">
                小计
              </th>
              <th className="w-[160px] border-b border-borderSoft px-2 font-bold">
                来源与供应商
              </th>
              <th className="w-[82px] border-b border-borderSoft px-2 font-bold">
                可信度
              </th>
              <th className="w-[82px] border-b border-borderSoft px-2 font-bold">
                风险
              </th>
              <th className="w-[94px] border-b border-borderSoft px-2 font-bold">
                匹配
              </th>
              <th className="w-[76px] border-b border-borderSoft px-2 text-right font-bold">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "h-[54px] border-b border-borderSoft transition hover:bg-primary-soft/30",
                  selectedRowId === row.id ? "bg-primary-soft/40" : "bg-white",
                )}
                onClick={() => onSelectRow(row.id)}
              >
                <td className="border-b border-borderSoft px-2">
                  <input
                    checked={selectedIds.includes(row.id)}
                    className="size-4 rounded border-borderSoft"
                    type="checkbox"
                    onChange={() => toggleRow(row.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </td>
                <td
                  className="truncate border-b border-borderSoft px-2 font-bold text-primary"
                  title={row.boqCode}
                >
                  {row.boqCode}
                </td>
                <td className="border-b border-borderSoft px-2">
                  <p
                    className="truncate font-bold text-textMain"
                    title={row.itemName}
                  >
                    {row.itemName}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[10px] text-textMuted"
                    title={row.specification}
                  >
                    {row.specification || "未填写规格"}
                  </p>
                </td>
                <td className="border-b border-borderSoft px-2">
                  <span
                    className={cn(
                      "inline-flex max-w-full truncate rounded-pill px-2 py-1 text-[10px] font-bold",
                      categoryClassName[row.category],
                    )}
                  >
                    {row.category}
                  </span>
                </td>
                <td className="border-b border-borderSoft px-2 text-right font-semibold tabular-nums">
                  <span className="whitespace-nowrap">
                    {row.quantity.toLocaleString("en-US")} {row.unit}
                  </span>
                </td>
                <td className="border-b border-borderSoft px-2 text-right font-bold tabular-nums text-textMain">
                  <span className="whitespace-nowrap">
                    {formatAmount(row.recommendedUnitPrice, row.currency)}
                  </span>
                </td>
                <td className="border-b border-borderSoft px-2 text-right font-bold tabular-nums text-textMain">
                  <span className="whitespace-nowrap">
                    {formatAmount(row.subtotal, row.currency)}
                  </span>
                </td>
                <td className="border-b border-borderSoft px-2">
                  <p
                    className="truncate text-[11px] font-semibold text-textSecondary"
                    title={row.priceSource}
                  >
                    {sourceTypeLabel(row.priceSource)}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[10px] text-textMuted"
                    title={row.supplierName}
                  >
                    {row.supplierName}
                  </p>
                  {row.conversionStatus === "manual_rate_required" ? (
                    <p className="mt-0.5 truncate text-[10px] font-bold text-warning">
                      汇率待确认
                    </p>
                  ) : null}
                </td>
                <td className="border-b border-borderSoft px-2">
                  <ConfidenceBadge
                    level={row.confidence}
                    showPrefix={false}
                    className="h-5 text-[10px]"
                  />
                </td>
                <td className="border-b border-borderSoft px-2">
                  <RiskBadge
                    level={row.riskLevel}
                    className="h-5 text-[10px]"
                  />
                </td>
                <td className="border-b border-borderSoft px-2">
                  <span
                    className={cn(
                      "inline-flex max-w-full truncate rounded-pill border px-2 py-1 text-[10px] font-bold",
                      matchClassName[row.matchStatus],
                    )}
                  >
                    {row.matchLabel}
                  </span>
                </td>
                <td className="border-b border-borderSoft px-2">
                  <div className="flex justify-end gap-1 whitespace-nowrap">
                    <Link
                      data-no-global-interaction
                      href={
                        sourceRecordHref(row.priceSource, row.sourceRecordId) ||
                        `/attachments?relatedProjectPricing=${detailId}&boqItem=${row.id}`
                      }
                      aria-label={`查看 ${row.itemName} 价格来源`}
                      title={
                        sourceRecordHref(row.priceSource, row.sourceRecordId)
                          ? "打开价格库原始记录"
                          : "查看价格来源证据"
                      }
                      className="inline-flex size-11 items-center justify-center rounded-md border border-primary/20 bg-primary-soft text-primary"
                    >
                      <Eye className="size-3.5" />
                    </Link>
                    {row.supplierId ? (
                      <Link
                        data-no-global-interaction
                        href={`/suppliers/${row.supplierId}`}
                        aria-label={`查看 ${row.itemName} 供应商`}
                        title="查看供应商"
                        className="inline-flex size-11 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary"
                      >
                        <Link2 className="size-3.5" />
                      </Link>
                    ) : null}
                    {row.matchStatus === "gap" ? (
                      <Link
                        data-no-global-interaction
                        href={`/inquiries/create?source=project-pricing&pricingId=${detailId}&boqItemIds=${row.id}`}
                        aria-label={`为 ${row.itemName} 创建询价`}
                        title="创建询价"
                        className="inline-flex size-11 items-center justify-center rounded-md border border-ai-border bg-ai-soft text-ai"
                      >
                        <Send className="size-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DetailShell>
  );
}

function PriceSourceEvidencePanel({
  detailId,
  sources,
  relatedAttachmentId,
}: {
  detailId: string;
  sources: ProjectPricingSourceEvidence[];
  relatedAttachmentId: string;
}) {
  return (
    <DetailShell>
      <ModuleHeader
        icon={Archive}
        title="价格证据链"
        subtitle="价格来源、附件与供应商记录"
        tone="green"
        density="compact"
        action={
          <Link
            data-no-global-interaction
            href={`/attachments?relatedProjectPricing=${detailId}`}
            className="text-[12px] font-bold text-primary"
          >
            查看全部证据 ›
          </Link>
        }
      />
      <div className="mt-3 grid gap-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="rounded-xl border border-borderSoft bg-[var(--color-bg-muted)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {sourceRecordHref(source.sourceType, source.sourceRecordId) ? (
                  <Link
                    data-no-global-interaction
                    href={sourceRecordHref(
                      source.sourceType,
                      source.sourceRecordId,
                    )}
                    className="block truncate text-[13px] font-bold text-primary hover:underline"
                  >
                    {source.title}
                  </Link>
                ) : (
                  <p className="truncate text-[13px] font-bold text-textMain">
                    {source.title}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-textMuted">
                  {sourceTypeLabel(source.sourceType)} / {source.sourceRecordId}
                </p>
              </div>
              <ConfidenceBadge
                level={source.confidence}
                showPrefix={false}
                className="h-5 text-[11px]"
              />
            </div>
            <div className="mt-2 grid gap-1.5 text-[12px] text-textSecondary sm:grid-cols-2">
              <span>
                供应商：
                {source.supplierId ? (
                  <Link
                    data-no-global-interaction
                    className="font-bold text-primary"
                    href={`/suppliers/${source.supplierId}`}
                  >
                    {source.supplierName}
                  </Link>
                ) : (
                  <strong>{source.supplierName}</strong>
                )}
              </span>
              <span>报价日期：{source.quoteDate}</span>
              <span>有效期至：{source.validUntil}</span>
              <span>
                附件：
                <Link
                  data-no-global-interaction
                  className="font-bold text-primary"
                  href={
                    relatedAttachmentId
                      ? `/attachments/${relatedAttachmentId}`
                      : `/attachments?relatedProjectPricing=${detailId}`
                  }
                >
                  {source.attachmentCount} 份
                </Link>
              </span>
            </div>
            <p className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[11px] leading-5 text-textSecondary">
              {source.note}
            </p>
          </div>
        ))}
      </div>
    </DetailShell>
  );
}

function AiPricingDecisionPanel({
  detail,
  selectedRow,
}: {
  detail: ProjectPricingDetail;
  selectedRow: ProjectPricingDetailBoqRow;
}) {
  return (
    <DetailShell className="border-ai-border bg-ai-soft/35">
      <ModuleHeader
        icon={Bot}
        title="选中项复核"
        subtitle="AI 给出建议，最终价格由人工确认"
        tone="purple"
        density="compact"
        action={<AiBadge label={`${detail.aiConfidence}% 综合置信度`} />}
      />
      <div className="mt-3 border-y border-ai-border/70 bg-white px-1 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="truncate text-[15px] font-bold text-textMain"
              title={selectedRow.itemName}
            >
              {selectedRow.itemName}
            </p>
            <p
              className="mt-1 truncate text-[11px] text-textMuted"
              title={selectedRow.specification}
            >
              {selectedRow.boqCode} · {selectedRow.specification}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-pill border px-2 py-1 text-[10px] font-bold",
              matchClassName[selectedRow.matchStatus],
            )}
          >
            {selectedRow.matchLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
          <SelectedFact
            label="推荐单价"
            value={formatAmount(
              selectedRow.recommendedUnitPrice,
              selectedRow.currency,
            )}
          />
          <SelectedFact label="供应商" value={selectedRow.supplierName} />
          <SelectedFact label="可信度" value={`${selectedRow.confidence} 级`} />
          <SelectedFact
            label="风险"
            value={
              selectedRow.conversionStatus === "manual_rate_required"
                ? "汇率待确认"
                : selectedRow.riskLevel === "low"
                  ? "低风险"
                  : "需人工复核"
            }
          />
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-md bg-white px-3 py-2.5 text-[12px] leading-5 text-textSecondary">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" />
        <p>
          {selectedRow.matchStatus === "gap"
            ? "当前行未达到 75% 自动套价准入线，建议创建询价任务。"
            : selectedRow.conversionStatus === "manual_rate_required"
              ? "价格来源匹配可靠，但缺少 CDF/USD 有效汇率，确认汇率前不计入 USD 总价。"
              : "价格与规格匹配通过，仍需商务人员核验证据、税费和运输条件。"}
        </p>
      </div>
    </DetailShell>
  );
}

function SelectedFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-textMuted">{label}</p>
      <p className="mt-0.5 truncate font-bold text-textMain" title={value}>
        {value}
      </p>
    </div>
  );
}

function GapAndRiskPanel({
  actions,
  onAction,
}: {
  actions: ProjectPricingRiskAction[];
  onAction: (action: ProjectPricingRiskAction) => void;
}) {
  return (
    <DetailShell>
      <ModuleHeader
        icon={ShieldAlert}
        title="缺口与风险处理"
        subtitle="每条风险对应明确处理入口"
        tone="red"
        density="compact"
      />
      <div className="mt-3 divide-y divide-borderSoft border-y border-borderSoft">
        {actions.map((action) => (
          <div key={action.id} className="bg-white px-1 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p
                  className="truncate text-[12px] font-bold text-textMain"
                  title={action.objectName}
                >
                  {action.objectName}
                </p>
                <p
                  className="mt-0.5 truncate text-[10px] text-textMuted"
                  title={action.reason}
                >
                  {action.riskType} · {action.reason}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <RiskBadge level={action.level} className="h-5 text-[10px]" />
                <button
                  data-no-global-interaction
                  className="min-h-11 rounded-md border border-primary/20 bg-primary-soft px-2 text-[10px] font-bold text-primary"
                  type="button"
                  onClick={() => onAction(action)}
                >
                  {action.actionLabel}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DetailShell>
  );
}

function VersionHistoryPanel({
  versions,
}: {
  versions: ProjectPricingVersion[];
}) {
  return (
    <DetailShell>
      <ModuleHeader
        icon={History}
        title="版本历史"
        subtitle="查看历史套价版本与变更记录"
        tone="blue"
        density="compact"
      />
      <div className="mt-3 overflow-hidden rounded-xl border border-borderSoft">
        {versions.map((version) => (
          <div
            key={version.id}
            className="grid gap-2 border-b border-borderSoft bg-white p-3 last:border-b-0 md:grid-cols-[80px_1fr_110px_86px]"
          >
            <span className="text-left text-[13px] font-bold text-primary">
              {version.version}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-textMain">
                {version.changeSummary}
              </p>
              <p className="mt-0.5 text-[11px] text-textMuted">
                {version.createdAt} / {version.operator}
              </p>
            </div>
            <span className="text-[12px] font-bold text-textMain">
              {formatCurrency(version.totalAmount, "USD")}
            </span>
            <span className="text-[12px] font-bold text-danger">
              {version.riskCount} 风险
            </span>
          </div>
        ))}
      </div>
    </DetailShell>
  );
}

function ReportAndExportPanel({
  detail,
  onExport,
}: {
  detail: ProjectPricingDetail;
  onExport: () => void;
}) {
  return (
    <DetailShell>
      <ModuleHeader
        icon={FileText}
        title="报告与导出"
        subtitle="套价说明、证据清单和项目报告"
        tone="purple"
        density="compact"
      />
      <div className="mt-3 grid gap-2">
        <Link
          data-no-global-interaction
          href={`/ai-report-center?source=project-pricing&projectPricingId=${detail.id}`}
          className="flex items-center justify-between rounded-xl border border-ai-border bg-ai-soft px-3 py-2.5 text-ai"
        >
          <span className="flex items-center gap-2 text-[13px] font-bold">
            <Sparkles className="size-4" /> 进入项目报告中心
          </span>
          <span className="text-[12px] font-bold">继续 ›</span>
        </Link>
        {detail.relatedReportId ? (
          <Link
            data-no-global-interaction
            href={`/reports/${detail.relatedReportId}`}
            className="flex items-center justify-between rounded-xl border border-borderSoft bg-white px-3 py-2.5 text-textSecondary"
          >
            <span className="flex items-center gap-2 text-[13px] font-bold text-textMain">
              <FileText className="size-4 text-primary" /> 查看已有报告
            </span>
            <span className="text-[12px] font-bold text-primary">
              {detail.relatedReportId} ›
            </span>
          </Link>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-borderSoft bg-[var(--color-bg-muted)] px-3 py-2.5 text-textMuted">
            <span className="flex items-center gap-2 text-[13px] font-bold">
              <FileText className="size-4" /> 暂无已生成报告
            </span>
            <span className="text-[11px]">请先进入报告中心生成</span>
          </div>
        )}
        <button
          data-no-global-interaction
          className="flex min-h-11 items-center justify-between rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"
          type="button"
          onClick={onExport}
        >
          <span className="flex items-center gap-2">
            <FileDown className="size-4 text-primary" /> 导出套价明细 CSV
          </span>
          <DownloadState />
        </button>
        <Link
          data-no-global-interaction
          href={`/attachments?relatedProjectPricing=${detail.id}`}
          className="flex min-h-11 items-center justify-between rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"
        >
          <span className="flex items-center gap-2">
            <Archive className="size-4 text-primary" /> 查看证据清单
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      </div>
    </DetailShell>
  );
}

function DownloadState() {
  return <span className="text-[10px] font-bold text-success">真实下载</span>;
}

function RelatedPanel({ detail }: { detail: ProjectPricingDetail }) {
  return (
    <DetailShell>
      <ModuleHeader
        icon={GitCompareArrows}
        title="关联询价、比价与证据"
        subtitle="从项目套价回溯业务来源"
        tone="green"
        density="compact"
      />
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {detail.relatedRecords.map((record) => {
          const tone = toneClassName[record.tone];

          return (
            <Link
              data-no-global-interaction
              key={record.label}
              href={record.href}
              className={cn(
                "rounded-xl border border-borderSoft bg-gradient-to-br p-3 transition hover:-translate-y-0.5 hover:shadow-card",
                tone.card,
              )}
            >
              <p className={cn("text-[12px] font-bold", tone.text)}>
                {record.label}
              </p>
              <p className="mt-1 truncate text-[14px] font-bold text-textMain">
                {record.value}
              </p>
              <p className="mt-2 text-[11px] font-bold text-primary">
                查看关联 ›
              </p>
            </Link>
          );
        })}
      </div>
    </DetailShell>
  );
}

function OperationHistory({ detail }: { detail: ProjectPricingDetail }) {
  return (
    <DetailShell>
      <ModuleHeader
        icon={PackageCheck}
        title="操作历史"
        subtitle="记录 AI 与人工处理过程"
        tone="blue"
        density="compact"
      />
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {detail.operationHistory.map((item) => (
          <div
            key={`${item.time}-${item.action}`}
            className="rounded-xl border border-borderSoft bg-[var(--color-bg-muted)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-bold text-textMain">
                {item.action}
              </span>
              <span className="text-[11px] text-textMuted">{item.time}</span>
            </div>
            <p className="mt-1 text-[11px] text-textMuted">
              操作人：{item.operator}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-textSecondary">
              {item.result}
            </p>
          </div>
        ))}
      </div>
    </DetailShell>
  );
}

function ProjectEditDialog({
  detail,
  onClose,
  onSaved,
}: {
  detail: ProjectPricingDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialogRef = useDialogFocusTrap<HTMLDivElement>(onClose);
  const stageMap: Record<string, string> = {
    预算测算: "budgeting",
    投标报价: "bidding",
    采购执行: "procurement",
    结算复核: "settlement",
  };
  const [name, setName] = useState(detail.projectName);
  const [stage, setStage] = useState(
    stageMap[detail.projectStage] || detail.projectStage,
  );
  const [currency, setCurrency] = useState(detail.currency);
  const [priceTerm, setPriceTerm] = useState(detail.priceCondition);
  const [exchangeRate, setExchangeRate] = useState(
    detail.exchangeRate.match(/[\d.]+$/)?.[0] || "1",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldClass =
    "mt-1 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary";

  async function save() {
    if (
      !name.trim() ||
      !Number.isFinite(Number(exchangeRate)) ||
      Number(exchangeRate) <= 0
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/project-pricing/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          projectStage: stage,
          baseCurrency: currency,
          priceTerm,
          exchangeRate: Number(exchangeRate),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "项目条件保存失败");
      onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "项目条件保存失败",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-pricing-edit-title"
      aria-describedby="project-pricing-edit-description"
    >
      <section className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-borderSoft p-5">
          <div>
            <h2
              id="project-pricing-edit-title"
              className="text-[17px] font-bold text-textMain"
            >
              编辑项目套价条件
            </h2>
            <p
              id="project-pricing-edit-description"
              className="mt-1 text-[11px] text-textMuted"
            >
              保存后写入项目档案，重新套价时沿用。
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-md hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block text-[12px] font-bold text-textSecondary">
            项目名称
            <input
              data-dialog-initial-focus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-[12px] font-bold text-textSecondary">
            项目阶段
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className={fieldClass}
            >
              <option value="budgeting">预算测算</option>
              <option value="bidding">投标报价</option>
              <option value="procurement">采购执行</option>
              <option value="settlement">结算复核</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12px] font-bold text-textSecondary">
              基准币种
              <select
                value={currency}
                onChange={(event) =>
                  setCurrency(
                    event.target.value as ProjectPricingDetail["currency"],
                  )
                }
                className={fieldClass}
              >
                <option>USD</option>
                <option>CNY</option>
                <option>CDF</option>
                <option>EUR</option>
              </select>
            </label>
            <label className="block text-[12px] font-bold text-textSecondary">
              贸易条件
              <select
                value={priceTerm}
                onChange={(event) => setPriceTerm(event.target.value)}
                className={fieldClass}
              >
                <option>EXW</option>
                <option>FOB</option>
                <option>CFR</option>
                <option>CIF</option>
                <option>DDP</option>
              </select>
            </label>
          </div>
          <label className="block text-[12px] font-bold text-textSecondary">
            折算汇率（对 CNY）
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              value={exchangeRate}
              onChange={(event) => setExchangeRate(event.target.value)}
              className={fieldClass}
            />
          </label>
          {error ? (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-[11px] font-semibold text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-borderSoft p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-borderSoft px-4 text-[12px] font-semibold"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy || !name.trim() || Number(exchangeRate) <= 0}
            onClick={save}
            className="min-h-11 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-50"
          >
            {busy ? "保存中" : "保存条件"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function ProjectPricingDetailView({
  detail,
  initialBoqId,
}: ProjectPricingDetailViewProps) {
  const router = useRouter();
  const toast = useMockToast();
  const initialSelectedRowId =
    detail.boqRows.find(
      (row) => row.id === initialBoqId || row.boqCode === initialBoqId,
    )?.id ??
    detail.boqRows[0]?.id ??
    "";
  const [selectedRowId, setSelectedRowId] = useState(initialSelectedRowId);
  const [editOpen, setEditOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);

  const selectedRow = useMemo(
    () =>
      detail.boqRows.find((row) => row.id === selectedRowId) ??
      detail.boqRows[0],
    [detail.boqRows, selectedRowId],
  );

  function exportCsv() {
    const rows = [
      [
        "BOQ编号",
        "项目名称",
        "规格",
        "类型",
        "数量",
        "单位",
        "推荐单价",
        "币种",
        "小计",
        "价格来源",
        "供应商",
        "可信度",
        "风险",
        "匹配状态",
      ],
      ...detail.boqRows.map((row) => [
        row.boqCode,
        row.itemName,
        row.specification,
        row.category,
        row.quantity,
        row.unit,
        row.recommendedUnitPrice ?? "",
        row.currency,
        row.subtotal ?? "",
        row.priceSource,
        row.supplierName,
        row.confidence,
        row.riskLevel,
        row.matchLabel,
      ]),
    ];
    const csv = `\ufeff${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${detail.relatedBoqId || detail.id}-pricing.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("套价明细已导出", "CSV 文件已下载到本机。");
  }

  async function handleAiReprice() {
    setAiRunning(true);
    toast.ai("AI重新套价已启动", "正在基于最新证据和比价结果重新计算。");
    try {
      const response = await fetch(
        `/api/project-pricing/${detail.id}/auto-price`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        error?: string;
        data?: { summary?: { totalItems?: number; gapItems?: number } };
      };
      if (!response.ok) throw new Error(payload.error || "自动套价失败");
      toast.success(
        "AI重新套价完成",
        `已处理 ${payload.data?.summary?.totalItems ?? detail.boqItemCount} 项，${payload.data?.summary?.gapItems ?? detail.gapCount} 项仍需人工处理。`,
      );
      router.refresh();
    } catch (error) {
      toast.warning(
        "AI重新套价失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setAiRunning(false);
    }
  }

  function handleRiskAction(action: ProjectPricingRiskAction) {
    const itemId = action.id.replace(/^RISK-/, "");
    if (action.actionType === "inquiry") {
      toast.ai("正在创建询价任务", action.objectName);
      router.push(
        `/inquiries/create?source=project-pricing&pricingId=${detail.id}&boqItemIds=${itemId}`,
      );
      return;
    }

    if (action.actionType === "collection") {
      toast.ai("已进入 AI 采集线索", action.objectName);
      router.push(
        `/ai-price-collection?source=project-pricing&pricingId=${detail.id}`,
      );
      return;
    }

    if (action.actionType === "attachment") {
      router.push(`/attachments?relatedProjectPricing=${detail.id}`);
      return;
    }

    router.push(`/project-pricing?projectId=${detail.id}&boqId=${itemId}`);
  }

  function createInquiry(ids: string[]) {
    if (!ids.length) return;
    router.push(
      `/inquiries/create?source=project-pricing&pricingId=${detail.id}&boqItemIds=${ids.join(",")}`,
    );
  }

  return (
    <div className="space-y-3">
      <ProjectPricingDetailHeader
        detail={detail}
        onEdit={() => setEditOpen(true)}
        onAiReprice={handleAiReprice}
        aiRunning={aiRunning}
        onExport={exportCsv}
      />
      <PricingSummaryCards detail={detail} />

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
        <div className="space-y-3">
          <BoqPricingResultTable
            detailId={detail.id}
            rows={detail.boqRows}
            selectedRowId={selectedRowId}
            onSelectRow={setSelectedRowId}
            onCreateInquiry={createInquiry}
            onRefresh={handleAiReprice}
            refreshing={aiRunning}
          />
          <PriceSourceEvidencePanel
            detailId={detail.id}
            sources={detail.priceSources}
            relatedAttachmentId={detail.relatedAttachmentId}
          />
        </div>
        <div className="space-y-3 xl:sticky xl:top-3">
          <AiPricingDecisionPanel detail={detail} selectedRow={selectedRow} />
          <GapAndRiskPanel
            actions={detail.riskActions}
            onAction={handleRiskAction}
          />
          <ReportAndExportPanel detail={detail} onExport={exportCsv} />
        </div>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-2">
        <VersionHistoryPanel versions={detail.versions} />
        <OperationHistory detail={detail} />
      </div>
      <RelatedPanel detail={detail} />

      {editOpen ? (
        <ProjectEditDialog
          detail={detail}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            toast.success("项目条件已保存", "已写入项目档案。");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
