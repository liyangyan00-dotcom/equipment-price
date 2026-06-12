import { Activity, ArrowRight } from "lucide-react";
import { AiBadge, ConfidenceBadge } from "@/components/badges";
import { BaseCard } from "@/components/common";
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

type LatestPriceFeedProps = {
  data: LatestPriceUpdate[];
};

export function LatestPriceFeed({ data }: LatestPriceFeedProps) {
  return (
    <BaseCard contentClassName="p-0">
      <div className="border-b border-borderSoft px-3 py-2">
        <DashboardSectionHeader
          icon={Activity}
          title="最新价格动态"
          subtitle="类型、来源、价格、可信度与AI标签"
          tone="blue"
          action={<span className="text-[12px] font-semibold text-primary">查看全部</span>}
        />
      </div>

      <div className="divide-y divide-borderSoft">
        {data.map((item) => (
          <div key={item.id} className="grid min-h-[42px] gap-2 px-3 py-1.5 md:grid-cols-[1.35fr_0.8fr_auto] md:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`rounded-pill px-1.5 py-0.5 text-[10.5px] font-semibold ${itemTypeClass[item.itemType]}`}>
                {itemTypeLabel[item.itemType]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-textMain">{item.itemName}</p>
                <p className="truncate text-[10.5px] text-textMuted">{item.source}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10.5px] text-textMuted md:justify-center">
              {item.aiTagged ? <AiBadge label={sourceLabel[item.sourceType]} className="shrink-0" /> : <span>{sourceLabel[item.sourceType]}</span>}
              <span>{item.updatedAtLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-2 md:justify-end">
              <div className="text-right">
                <p className="text-[12px] font-bold tabular-nums text-textMain">
                  {formatCurrency(item.price, item.currency)}
                  {item.unit ? <span className="ml-1 text-[11px] font-normal text-textMuted">/{item.unit}</span> : null}
                </p>
                <ConfidenceBadge level={item.confidenceLevel} />
              </div>
              <ArrowRight className="size-3.5 text-primary" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
    </BaseCard>
  );
}
