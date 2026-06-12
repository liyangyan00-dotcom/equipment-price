import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type DetailHeaderProps = {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function DetailHeader({ backHref, backLabel, title, subtitle, meta, actions }: DetailHeaderProps) {
  return (
    <section className="rounded-card border border-borderSoft bg-card px-4 py-3 shadow-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
          <h1 className="truncate text-[24px] font-bold tracking-normal text-textMain">{title}</h1>
          <p className="mt-1 text-[13px] text-textSecondary">{subtitle}</p>
          {meta ? <div className="mt-2 flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

type SummaryCardGridProps = {
  items: {
    label: string;
    value: ReactNode;
    description?: string;
    tone?: "blue" | "cyan" | "purple" | "green" | "orange" | "red";
  }[];
  className?: string;
};

const toneClassName = {
  blue: "text-primary bg-primary-soft",
  cyan: "text-cyan bg-cyan-soft",
  purple: "text-ai bg-ai-soft",
  green: "text-success bg-success-soft",
  orange: "text-[#B45309] bg-warning-soft",
  red: "text-danger bg-danger-soft",
} as const;

export function SummaryCardGrid({ items, className }: SummaryCardGridProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-6", className)}>
      {items.map((item) => (
        <section key={item.label} className="rounded-card border border-borderSoft bg-card px-3 py-2.5 shadow-card">
          <p className="text-[12px] font-semibold text-textSecondary">{item.label}</p>
          <div className={cn("mt-1 inline-flex min-h-8 items-center rounded-md px-2 text-[22px] font-bold leading-8", toneClassName[item.tone ?? "blue"])}>
            {item.value}
          </div>
          {item.description ? <p className="mt-1.5 truncate text-[11px] text-textMuted">{item.description}</p> : null}
        </section>
      ))}
    </div>
  );
}
