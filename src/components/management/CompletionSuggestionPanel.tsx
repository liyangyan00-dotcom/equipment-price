import { Sparkles } from "lucide-react";
import { ModuleHeader } from "@/components/common";

type CompletionSuggestionPanelProps = {
  title: string;
  subtitle: string;
  items: { label?: string; name?: string; value?: number; region?: string; source?: string; gap?: string; action: string }[];
};

export function CompletionSuggestionPanel({ title, subtitle, items }: CompletionSuggestionPanelProps) {
  return (
    <section className="rounded-card border border-ai-border bg-card shadow-card">
      <div className="border-b border-borderSoft px-3 py-2.5">
        <ModuleHeader icon={Sparkles} title={title} subtitle={subtitle} tone="purple" density="compact" />
      </div>
      <div className="space-y-2 p-3">
        {items.map((item, index) => (
          <div key={`${item.label ?? item.name}-${index}`} className="rounded-[10px] border border-borderSoft bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-textMain">{item.label ?? item.name}</p>
                <p className="mt-1 text-[11px] text-textMuted">{item.region ?? item.source ?? (item.value ? `${item.value} 条待处理` : "AI建议补全")}</p>
              </div>
              <button className="h-7 rounded-md border border-ai-border bg-ai-soft px-2 text-[12px] font-semibold text-ai">{item.action}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
