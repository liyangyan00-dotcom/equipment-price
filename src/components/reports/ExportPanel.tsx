import { Download } from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";

type ExportOption = {
  label: string;
  description: string;
};

export function ExportPanel({ options }: { options: ExportOption[] }) {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <ModuleHeader icon={Download} title="导出设置" subtitle="当前阶段为模拟导出入口" tone="blue" density="compact" />
      <div className="mt-3 space-y-2">
        {options.map((item) => (
          <button key={item.label} type="button" className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-borderSoft bg-white px-3 py-2 text-left hover:border-primary/30">
            <span>
              <span className="block text-[13px] font-semibold text-textMain">{item.label}</span>
              <span className="text-[12px] text-textMuted">{item.description}</span>
            </span>
            <Download className="size-4 text-primary" />
          </button>
        ))}
      </div>
    </section>
  );
}
