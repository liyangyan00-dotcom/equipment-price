import { Quote } from "lucide-react";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import type { ConfidenceLevel } from "@/types/common";

type Citation = {
  title: string;
  source: string;
  confidence: string;
};

export function EvidenceCitationPanel({ citations }: { citations: Citation[] }) {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <ModuleHeader icon={Quote} title="附件证据引用" subtitle="报告结论引用的证据链" tone="green" density="compact" />
      <div className="mt-3 space-y-2">
        {citations.map((item) => (
          <div key={item.title} className="rounded-[10px] border border-borderSoft bg-[#FAFCFF] px-3 py-2">
            <p className="truncate text-[13px] font-semibold text-textMain">{item.title}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[12px] text-textMuted">{item.source}</span>
              <ConfidenceBadge level={item.confidence as ConfidenceLevel} className="h-5 text-[11px]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
