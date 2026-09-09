import { Link2 } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { HorizontalBarList } from "@/components/analytics/AnalyticsChartCard";

type EvidenceRelation = {
  label: string;
  value: number;
  percent: string;
};

export function EvidenceRelationPanel({ items }: { items: EvidenceRelation[] }) {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <ModuleHeader icon={Link2} title="证据关联分布" subtitle="附件与业务对象的关联情况" tone="blue" density="compact" />
      <div className="mt-4">
        <HorizontalBarList data={items.map((item) => ({ label: item.label, value: item.value, percent: item.percent }))} />
      </div>
    </section>
  );
}
