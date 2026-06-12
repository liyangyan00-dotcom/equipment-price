import { ClipboardCheck } from "lucide-react";
import { ModuleHeader } from "@/components/common";

type BatchReviewPanelProps = {
  title?: string;
  subtitle?: string;
  items: { label: string; value: number; action: string }[];
};

export function BatchReviewPanel({ title = "批量审核与处理", subtitle = "异常、过期、缺失字段集中处理", items }: BatchReviewPanelProps) {
  return (
    <section className="rounded-card border border-borderSoft bg-card shadow-card">
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader icon={ClipboardCheck} title={title} subtitle={subtitle} tone="orange" density="compact" />
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-[10px] border border-borderSoft bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-textSecondary">{item.label}</span>
              <span className="text-[20px] font-bold text-textMain">{item.value}</span>
            </div>
            <button className="mt-2 h-7 rounded-md border border-primary/20 bg-primary-soft px-2 text-[12px] font-semibold text-primary">{item.action}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
