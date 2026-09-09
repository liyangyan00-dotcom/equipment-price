import { CheckCircle2, Clock3 } from "lucide-react";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { cn } from "@/lib/utils";
import type { AiTaskStatus } from "@/types/common";

type TimelineItem = {
  label: string;
  status: AiTaskStatus;
  value: number;
};

export function AiTaskTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const done = item.status === "completed";
        const Icon = done ? CheckCircle2 : Clock3;

        return (
          <div key={item.label} className="relative flex gap-3">
            {index < items.length - 1 ? <span className="absolute left-4 top-8 h-[calc(100%-16px)] w-px bg-borderSoft" /> : null}
            <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full", done ? "bg-success-soft text-success" : "bg-ai-soft text-ai")}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 rounded-[12px] border border-borderSoft bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-semibold text-textMain">{item.label}</div>
                <StatusBadge status={item.status} className="h-5 text-[11px]" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full", done ? "bg-success" : "bg-ai")} style={{ width: `${item.value}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-textSecondary">{item.value}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
