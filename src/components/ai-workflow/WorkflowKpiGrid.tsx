import type { LucideIcon } from "lucide-react";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { cn } from "@/lib/utils";
import type { WorkflowKpi } from "@/data/mock/aiQuoteRecognition";

type WorkflowKpiGridProps = {
  items: WorkflowKpi[];
  icons: LucideIcon[];
  className?: string;
};

const toneClass: Record<IconBoxTone, { text: string; soft: string; card: string; glow: string }> = {
  blue: {
    text: "text-primary",
    soft: "bg-primary-soft",
    card: "from-white via-[#F8FBFF] to-[#EEF6FF] border-primary/10",
    glow: "bg-primary/10",
  },
  cyan: {
    text: "text-[#0EA5B7]",
    soft: "bg-cyan-50",
    card: "from-white via-[#F7FEFF] to-[#EAFBFF] border-cyan-300/20",
    glow: "bg-cyan-400/10",
  },
  purple: {
    text: "text-ai",
    soft: "bg-ai-soft",
    card: "from-white via-[#FBF9FF] to-[#F0EAFF] border-ai/15",
    glow: "bg-ai/12",
  },
  orange: {
    text: "text-warning",
    soft: "bg-warning-soft",
    card: "from-white via-[#FFFCF7] to-[#FFF2DA] border-warning/20",
    glow: "bg-warning/12",
  },
  red: {
    text: "text-danger",
    soft: "bg-danger-soft",
    card: "from-white via-[#FFFAFA] to-[#FFEDED] border-danger/20",
    glow: "bg-danger/12",
  },
  green: {
    text: "text-success",
    soft: "bg-success-soft",
    card: "from-white via-[#F8FFFB] to-[#EAF9F0] border-success/20",
    glow: "bg-success/12",
  },
  slate: {
    text: "text-textSecondary",
    soft: "bg-slate-100",
    card: "from-white via-[#F8FAFC] to-[#EEF3F8] border-slate-200/70",
    glow: "bg-slate-400/10",
  },
};

export function WorkflowKpiGrid({ items, icons, className }: WorkflowKpiGridProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-6", className)}>
      {items.map((item, index) => {
        const Icon = icons[index] ?? icons[0];
        const tone = item.tone ?? "blue";

        return (
          <section
            key={item.label}
            className={cn(
              "relative min-h-[96px] overflow-hidden rounded-card border bg-gradient-to-br px-4 py-3.5 shadow-card",
              "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r",
              toneClass[tone].card,
              tone === "purple" && "before:from-ai/70 before:to-transparent",
              tone === "red" && "before:from-danger/70 before:to-transparent",
              tone === "orange" && "before:from-warning/70 before:to-transparent",
              tone === "green" && "before:from-success/70 before:to-transparent",
              tone === "cyan" && "before:from-cyan-400 before:to-transparent",
              tone === "blue" && "before:from-primary/70 before:to-transparent"
            )}
          >
            <span className={cn("pointer-events-none absolute -right-7 -top-7 size-20 rounded-full blur-2xl", toneClass[tone].glow)} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("truncate text-[13px] font-bold", toneClass[tone].text)}>{item.label}</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className={cn("text-[30px] font-bold leading-8 tracking-normal", toneClass[tone].text)}>{item.value}</span>
                  {item.unit ? <span className="mb-0.5 text-[11px] font-semibold text-textMuted">{item.unit}</span> : null}
                </div>
              </div>
              <IconBox icon={Icon} tone={tone} size="lg" className="size-12 rounded-[16px] shadow-[0_14px_28px_rgba(15,23,42,0.12)] [&_svg]:size-6" />
            </div>
            <div className="relative mt-2 flex min-w-0 items-center gap-1.5">
              {item.trend ? (
                <span className={cn("rounded-pill px-1.5 py-0.5 text-[10px] font-semibold", toneClass[tone].soft, toneClass[tone].text)}>
                  {item.trend}
                </span>
              ) : null}
              <span className="min-w-0 truncate text-[10px] text-textMuted">{item.description}</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
