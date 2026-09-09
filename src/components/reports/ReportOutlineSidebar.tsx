import { ListTree } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";

export function ReportOutlineSidebar({ items }: { items: string[] }) {
  return (
    <aside className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <ModuleHeader icon={ListTree} title="报告大纲" subtitle="AI生成的章节结构" tone="blue" density="compact" />
      <div className="mt-3 space-y-1.5">
        {items.map((item, index) => (
          <button
            key={item}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-textSecondary transition hover:bg-primary-soft hover:text-primary"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] text-primary">{index + 1}</span>
            <span className="truncate">{item.replace(/^.+、/, "")}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
