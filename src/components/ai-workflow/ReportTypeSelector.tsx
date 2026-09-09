import type { LucideIcon } from "lucide-react";
import { BarChart3, FileText, Handshake, LineChart, ShieldAlert, Sparkles } from "lucide-react";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { cn } from "@/lib/utils";
import type { AiReportType } from "@/data/mock/aiReports";

const reportIcons: Record<string, LucideIcon> = {
  "price-library": BarChart3,
  comparison: Handshake,
  "project-pricing": LineChart,
  inquiry: FileText,
  risk: ShieldAlert,
  weekly: Sparkles,
};

export function ReportTypeSelector({ types }: { types: AiReportType[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {types.map((type) => {
        const Icon = reportIcons[type.id] ?? FileText;
        const tone = type.tone as IconBoxTone;

        return (
          <button
            key={type.id}
            className={cn(
              "flex min-h-[82px] items-start gap-3 rounded-[14px] border bg-white p-3 text-left shadow-card transition hover:-translate-y-0.5",
              type.selected ? "border-ai bg-ai-soft/45 ring-1 ring-ai/15" : "border-borderSoft",
            )}
            type="button"
          >
            <IconBox icon={Icon} tone={tone} size="md" />
            <span className="min-w-0">
              <span className={cn("block text-[14px] font-bold", type.selected ? "text-ai" : "text-textMain")}>{type.name}</span>
              <span className="mt-1 block text-[12px] leading-5 text-textMuted">{type.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
