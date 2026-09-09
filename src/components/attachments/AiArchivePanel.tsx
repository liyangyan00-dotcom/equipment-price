import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { IconBox } from "@/components/common/IconBox";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { cn } from "@/lib/utils";

type Suggestion = {
  title: string;
  description: string;
  tone: string;
};

const toneClass: Record<string, string> = {
  green: "border-success/15 bg-success-soft text-success",
  orange: "border-warning/20 bg-warning-soft text-warning",
  red: "border-danger/20 bg-danger-soft text-danger",
};

export function AiArchivePanel({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <section className="rounded-card border border-ai-border bg-gradient-to-br from-white via-[#FBFAFF] to-[#F4F0FF] p-3.5 shadow-card">
      <ModuleHeader
        icon={Sparkles}
        title="AI证据归档助手"
        subtitle="分类、可信度、缺失证据与推荐关联"
        tone="purple"
        density="compact"
        action={<AiBadge label="AI归档中" />}
      />
      <div className="mt-3 space-y-2.5">
        {suggestions.map((item, index) => (
          <div key={item.title} className={cn("rounded-[12px] border px-3 py-2.5", toneClass[item.tone] ?? toneClass.green)}>
            <div className="flex items-start gap-2">
              <IconBox icon={index === 0 ? CheckCircle2 : AlertTriangle} tone={item.tone === "green" ? "green" : item.tone === "red" ? "red" : "orange"} size="sm" />
              <div>
                <p className="text-[13px] font-semibold text-textMain">{item.title}</p>
                <p className="mt-1 text-[12px] leading-5 text-textSecondary">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 h-9 w-full rounded-md border border-ai-border bg-ai-soft text-[13px] font-semibold text-ai" type="button">
        一键生成证据归档建议
      </button>
    </section>
  );
}
