import { AlertTriangle } from "lucide-react";
import { RiskBadge } from "@/components/badges";
import { ModuleHeader } from "@/components/common";
import type { RiskLevel } from "@/types/common";

type RiskActionPanelProps = {
  items: { type: string; description: string; level: RiskLevel; action: string }[];
};

export function RiskActionPanel({ items }: RiskActionPanelProps) {
  return (
    <section className="rounded-card border border-warning/20 bg-card shadow-card">
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader icon={AlertTriangle} title="风险与推荐动作" subtitle="风险必须进入人工确认流程" tone="orange" density="compact" />
      </div>
      <div className="divide-y divide-borderSoft">
        {items.map((item) => (
          <div key={item.type} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[120px_1fr_88px_88px] sm:items-center">
            <p className="font-semibold text-textMain">{item.type}</p>
            <p className="text-[12px] text-textSecondary">{item.description}</p>
            <RiskBadge level={item.level} className="h-5 justify-center text-[11px]" />
            <button className="h-7 rounded-md border border-warning/30 bg-warning-soft px-2 text-[12px] font-semibold text-[#B45309]">{item.action}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
