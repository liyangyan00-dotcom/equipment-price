import { Activity } from "lucide-react";
import { AiBadge, ConfidenceBadge } from "@/components/badges";
import { DataTable } from "@/components/common";
import type { LatestPriceUpdate } from "@/data/mock/dashboard";
import { formatCurrency } from "@/lib/formatters";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

const itemTypeLabel = {
  equipment: "设备",
  material: "地材",
  supplier_quote: "报价",
  service: "服务",
};

const itemTypeClass = {
  equipment: "bg-primary-soft text-primary",
  material: "bg-success-soft text-success",
  supplier_quote: "bg-warning-soft text-warning",
  service: "bg-ai-soft text-ai",
};

const sourceLabel = {
  ai_quote_recognition: "AI识别",
  supplier_email: "供应商邮件",
  ai_price_collection: "AI采集",
  manual: "人工录入",
};

const columns = [
  {
    key: "itemName",
    header: "价格对象",
    render: (row: LatestPriceUpdate) => (
      <div className="flex items-center gap-2">
        <span className={`rounded-pill px-2 py-1 text-[11px] font-semibold ${itemTypeClass[row.itemType]}`}>
          {itemTypeLabel[row.itemType]}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-textMain">{row.itemName}</p>
          <p className="mt-0.5 truncate text-caption text-textMuted">{row.source}</p>
        </div>
      </div>
    ),
  },
  {
    key: "sourceType",
    header: "来源 / 时间",
    render: (row: LatestPriceUpdate) => (
      <div className="flex flex-col gap-1">
        {row.aiTagged ? (
          <AiBadge label={sourceLabel[row.sourceType]} className="w-fit" />
        ) : (
          <span className="text-caption font-medium text-textSecondary">{sourceLabel[row.sourceType]}</span>
        )}
        <span className="text-[11px] text-textMuted">{row.updatedAtLabel}</span>
      </div>
    ),
  },
  {
    key: "price",
    header: "价格 / 可信度",
    align: "right" as const,
    render: (row: LatestPriceUpdate) => (
      <div className="flex flex-col items-end gap-1">
        <span className="font-semibold text-textMain">
          {formatCurrency(row.price, row.currency)}
          {row.unit ? <span className="ml-1 text-caption font-normal text-textMuted">/{row.unit}</span> : null}
        </span>
        <ConfidenceBadge level={row.confidenceLevel} />
      </div>
    ),
  },
];

type LatestPriceUpdatesProps = {
  data: LatestPriceUpdate[];
};

export function LatestPriceUpdates({ data }: LatestPriceUpdatesProps) {
  return (
    <DataTable<LatestPriceUpdate>
      columns={columns}
      data={data}
      rowKey="id"
      className="[&_td]:py-2 [&_tr]:h-[50px]"
      actions={
        <DashboardSectionHeader
          icon={Activity}
          title="最新价格动态"
          subtitle="类型、来源、价格、AI 标签与可信度"
          tone="blue"
          action={<span className="text-caption font-semibold text-primary">查看全部</span>}
        />
      }
    />
  );
}
