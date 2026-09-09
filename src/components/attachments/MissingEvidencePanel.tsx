import { ClipboardList } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";

type MissingEvidenceItem = {
  title: string;
  count: number;
  action: string;
};

export function MissingEvidencePanel({ items }: { items: MissingEvidenceItem[] }) {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <ModuleHeader icon={ClipboardList} title="缺失证据清单" subtitle="AI建议优先补齐的证据项" tone="orange" density="compact" />
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.title} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[10px] border border-borderSoft bg-[#FAFCFF] px-3 py-2 text-[12px]">
            <span className="truncate font-semibold text-textMain">{item.title}</span>
            <span className="rounded-pill bg-warning-soft px-2 py-0.5 font-semibold text-warning">{item.count} 项</span>
            <button className="text-primary" type="button">{item.action}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
