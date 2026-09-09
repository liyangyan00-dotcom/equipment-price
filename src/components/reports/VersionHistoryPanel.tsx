import { History } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";

type VersionItem = {
  version: string;
  time: string;
  status: string;
  author: string;
};

export function VersionHistoryPanel({ versions }: { versions: VersionItem[] }) {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <ModuleHeader icon={History} title="版本记录" subtitle="报告草稿与人工调整记录" tone="slate" density="compact" />
      <div className="mt-3 space-y-2">
        {versions.map((item) => (
          <div key={item.version} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 rounded-[10px] border border-borderSoft px-3 py-2 text-[12px]">
            <span className="font-bold text-primary">{item.version}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-textMain">{item.status}</span>
              <span className="text-textMuted">{item.time} · {item.author}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
