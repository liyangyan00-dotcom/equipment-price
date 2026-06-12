import { FileText } from "lucide-react";
import { ConfidenceBadge } from "@/components/badges";
import { ModuleHeader } from "@/components/common";
import type { ConfidenceLevel } from "@/types/common";

type EvidencePanelProps = {
  items: { name: string; type: string; uploadedAt?: string; date?: string; confidence: ConfidenceLevel }[];
};

export function EvidencePanel({ items }: EvidencePanelProps) {
  return (
    <section className="rounded-card border border-borderSoft bg-card shadow-card">
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader icon={FileText} title="证据与附件" subtitle="报价单、邮件、聊天记录与资质文件 mock 展示" tone="slate" density="compact" />
      </div>
      <div className="divide-y divide-borderSoft">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-textMain">{item.name}</p>
              <p className="text-[11px] text-textMuted">{item.type} · {item.uploadedAt ?? item.date}</p>
            </div>
            <ConfidenceBadge level={item.confidence} className="h-5 text-[11px]" />
          </div>
        ))}
      </div>
    </section>
  );
}
