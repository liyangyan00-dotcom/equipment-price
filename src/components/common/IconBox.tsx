import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconBoxTone = "blue" | "cyan" | "purple" | "orange" | "red" | "green" | "slate";
export type IconBoxSize = "sm" | "md" | "lg";

type IconBoxProps = {
  icon: LucideIcon;
  tone?: IconBoxTone;
  size?: IconBoxSize;
  className?: string;
};

const toneClass: Record<IconBoxTone, string> = {
  blue: "bg-gradient-to-br from-[#EFF6FF] via-white to-[#DCEBFF] text-primary ring-1 ring-primary/10 shadow-[0_8px_18px_rgba(47,107,255,0.14)]",
  cyan: "bg-gradient-to-br from-[#ECFEFF] via-white to-[#D7F7FB] text-[#00A6B8] ring-1 ring-cyan-300/20 shadow-[0_8px_18px_rgba(0,166,184,0.14)]",
  purple: "bg-gradient-to-br from-[#F4F0FF] via-white to-[#E8DEFF] text-ai ring-1 ring-ai/15 shadow-[0_8px_18px_rgba(119,84,246,0.16)]",
  orange: "bg-gradient-to-br from-[#FFF7ED] via-white to-[#FFE7BA] text-warning ring-1 ring-warning/15 shadow-[0_8px_18px_rgba(245,158,11,0.15)]",
  red: "bg-gradient-to-br from-[#FFF1F2] via-white to-[#FFD8D8] text-danger ring-1 ring-danger/15 shadow-[0_8px_18px_rgba(239,68,68,0.15)]",
  green: "bg-gradient-to-br from-[#ECFDF5] via-white to-[#D7F7E5] text-success ring-1 ring-success/15 shadow-[0_8px_18px_rgba(34,197,94,0.14)]",
  slate: "bg-gradient-to-br from-white via-[#F8FAFC] to-[#EEF3F8] text-textSecondary ring-1 ring-slate-200/70 shadow-[0_8px_18px_rgba(15,23,42,0.08)]",
};

const sizeClass: Record<IconBoxSize, { box: string; icon: string }> = {
  sm: { box: "size-8 rounded-[10px]", icon: "size-4" },
  md: { box: "size-9 rounded-[12px]", icon: "size-[18px]" },
  lg: { box: "size-10 rounded-[12px]", icon: "size-5" },
};

export function IconBox({ icon: Icon, tone = "blue", size = "md", className }: IconBoxProps) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden", toneClass[tone], sizeClass[size].box, className)}>
      <span className="pointer-events-none absolute left-1 top-1 size-2 rounded-full bg-white/80 blur-[1px]" />
      <Icon className={sizeClass[size].icon} aria-hidden="true" />
    </span>
  );
}
