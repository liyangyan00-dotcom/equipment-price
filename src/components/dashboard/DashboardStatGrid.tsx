import type { LucideIcon } from "lucide-react";
import {
  ChartNoAxesColumnIncreasing,
  FileText,
  Layers3,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Box,
} from "lucide-react";
import type { DashboardStat } from "@/data/mock/dashboard";
import { cn } from "@/lib/utils";

const statMeta: Record<DashboardStat["key"], { icon: LucideIcon; tone: "blue" | "green" | "purple" | "orange" | "cyan" | "red"; unit: string }> = {
  equipment: { icon: Box, tone: "blue", unit: "项" },
  material: { icon: Layers3, tone: "green", unit: "项" },
  supplier: { icon: UsersRound, tone: "purple", unit: "家" },
  pending: { icon: FileText, tone: "orange", unit: "项" },
  lead: { icon: ChartNoAxesColumnIncreasing, tone: "cyan", unit: "条" },
  risk: { icon: ShieldAlert, tone: "red", unit: "条" },
};

const toneClass = {
  blue: {
    card: "border-[#BFDBFE] bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,0.13),transparent_34%),linear-gradient(135deg,#FFFFFF,#F8FBFF)]",
    icon: "from-[#60A5FA] to-[#2563EB] text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)]",
    title: "text-[#2563EB]",
    value: "text-[#2563EB]",
  },
  green: {
    card: "border-[#BBF7D0] bg-[radial-gradient(circle_at_18%_20%,rgba(16,185,129,0.13),transparent_34%),linear-gradient(135deg,#FFFFFF,#F7FFFB)]",
    icon: "from-[#6EE7B7] to-[#059669] text-white shadow-[0_12px_22px_rgba(5,150,105,0.25)]",
    title: "text-[#059669]",
    value: "text-[#059669]",
  },
  purple: {
    card: "border-ai-border bg-[radial-gradient(circle_at_18%_20%,rgba(124,58,237,0.12),transparent_34%),linear-gradient(135deg,#FFFFFF,#F8F5FF)]",
    icon: "from-[#A78BFA] to-[#6D5DFB] text-white shadow-[0_12px_22px_rgba(109,93,251,0.27)]",
    title: "text-ai",
    value: "text-ai",
  },
  orange: {
    card: "border-warning/25 bg-[radial-gradient(circle_at_18%_20%,rgba(245,158,11,0.14),transparent_34%),linear-gradient(135deg,#FFFFFF,#FFF8ED)]",
    icon: "from-[#FDBA74] to-[#F97316] text-white shadow-[0_12px_22px_rgba(249,115,22,0.25)]",
    title: "text-warning",
    value: "text-warning",
  },
  cyan: {
    card: "border-[#BAE6FD] bg-[radial-gradient(circle_at_18%_20%,rgba(14,165,233,0.13),transparent_34%),linear-gradient(135deg,#FFFFFF,#F0FBFF)]",
    icon: "from-[#67E8F9] to-[#0EA5E9] text-white shadow-[0_12px_22px_rgba(14,165,233,0.25)]",
    title: "text-[#0284C7]",
    value: "text-[#0284C7]",
  },
  red: {
    card: "border-danger/20 bg-[radial-gradient(circle_at_18%_20%,rgba(239,68,68,0.13),transparent_34%),linear-gradient(135deg,#FFFFFF,#FFF7F7)]",
    icon: "from-[#F87171] to-[#EF4444] text-white shadow-[0_12px_22px_rgba(239,68,68,0.25)]",
    title: "text-danger",
    value: "text-danger",
  },
};

type DashboardStatGridProps = {
  data: DashboardStat[];
};

export function DashboardStatGrid({ data }: DashboardStatGridProps) {
  return (
    <section className="grid gap-2.5 md:grid-cols-3 lg:grid-cols-6">
      {data.map((stat) => {
        const meta = statMeta[stat.key];
        const Icon = meta.icon;
        const TrendIcon = stat.trendDirection === "down" ? TrendingDown : TrendingUp;

        return (
          <article
            key={stat.key}
            className={cn(
              "flex h-[110px] flex-col justify-between overflow-hidden rounded-card border px-3 py-2.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover",
              toneClass[meta.tone].card
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={cn("truncate text-[12px] font-semibold", toneClass[meta.tone].title)}>{stat.title}</p>
              <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br", toneClass[meta.tone].icon)}>
                <span className="absolute inset-x-1 bottom-0 h-2 rounded-full bg-white/20 blur-[2px]" />
                <Icon className="relative size-[22px] drop-shadow-[0_2px_2px_rgba(15,23,42,0.20)]" aria-hidden="true" />
              </span>
            </div>
            <p className={cn("text-[25px] font-semibold leading-none tracking-normal", toneClass[meta.tone].value)}>
              {stat.value}
              <span className="ml-1 text-[11px] font-semibold text-textMuted">{meta.unit}</span>
            </p>
            <div className="flex min-w-0 items-center gap-1.5 text-[10.5px] leading-4">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-pill bg-white/72 px-1.5 py-0.5 font-semibold shadow-sm",
                  stat.trendDirection === "down" ? "text-success" : stat.key === "risk" ? "text-warning" : "text-success"
                )}
              >
                <TrendIcon className="size-3.5" aria-hidden="true" />
                {stat.trendLabel}
              </span>
              <span className="truncate text-textMuted">{stat.description}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
