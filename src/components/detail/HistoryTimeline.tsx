import { Clock3 } from "lucide-react";
import { RiskBadge, StatusBadge } from "@/components/badges";
import { ModuleHeader } from "@/components/common";
import type { RiskLevel, ReviewStatus } from "@/types/common";

type HistoryTimelineProps = {
  items: { date: string; title: string; source: string; reviewer?: string; status: ReviewStatus; risk: RiskLevel; price?: string }[];
};

export function HistoryTimeline({ items }: HistoryTimelineProps) {
  return (
    <section className="rounded-card border border-borderSoft bg-card shadow-card">
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader icon={Clock3} title="历史记录" subtitle="价格、审核、风险变化时间线" tone="blue" density="compact" />
      </div>
      <div className="space-y-3 p-3">
        {items.map((item) => (
          <div key={`${item.date}-${item.title}`} className="grid grid-cols-[84px_1fr] gap-3">
            <div className="text-[12px] font-semibold text-textMuted">{item.date}</div>
            <div className="rounded-[10px] border border-borderSoft bg-white px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-textMain">{item.title}</p>
                <div className="flex gap-1.5">
                  <StatusBadge status={item.status} className="h-5 text-[11px]" />
                  <RiskBadge level={item.risk} className="h-5 text-[11px]" />
                </div>
              </div>
              <p className="mt-1 text-[12px] text-textMuted">{item.source} · {item.reviewer ?? "系统"} {item.price ? `· ${item.price}` : ""}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
