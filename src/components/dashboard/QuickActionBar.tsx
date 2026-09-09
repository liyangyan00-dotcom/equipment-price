import Link from "next/link";
import { BarChart3, FileCheck2, FilePlus2, PackageCheck, Sparkles, UploadCloud, Zap } from "lucide-react";
import type { QuickAction } from "@/data/mock/dashboard";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

const icons = [FilePlus2, UploadCloud, Sparkles, FileCheck2, PackageCheck, BarChart3];

const toneClass = {
  primary: "border-primary-soft bg-primary-soft text-primary",
  success: "border-success/20 bg-success-soft text-success",
  ai: "border-ai-border bg-ai-soft text-ai",
  warning: "border-warning/20 bg-warning-soft text-warning",
  cyan: "border-[#BAE6FD] bg-[#E0F2FE] text-[#0284C7]",
  slate: "border-borderSoft bg-white text-textSecondary",
};

const textToneClass = {
  primary: "text-primary",
  success: "text-success",
  ai: "text-ai",
  warning: "text-warning",
  cyan: "text-[#0284C7]",
  slate: "text-textSecondary",
};

type QuickActionBarProps = {
  data: QuickAction[];
};

export function QuickActionBar({ data }: QuickActionBarProps) {
  return (
    <section className="rounded-card border border-primary-soft bg-[linear-gradient(135deg,#FFFFFF,#F8FBFF)] p-2 shadow-card">
      <DashboardSectionHeader
        icon={Zap}
        title="工作台快捷操作栏"
        subtitle="从首页直接进入价格录入、AI识别、采集、询价、套价与报告"
        tone="blue"
        className="mb-1.5 px-1"
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {data.map((action, index) => {
          const Icon = icons[index] ?? Sparkles;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="group flex min-h-[58px] min-w-0 items-center gap-2 rounded-[11px] border border-borderSoft bg-white/72 px-2.5 transition hover:-translate-y-0.5 hover:border-primary hover:bg-white hover:shadow-card active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:min-h-[62px] lg:gap-2.5 lg:px-3"
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] border shadow-sm lg:size-9 lg:rounded-[11px] ${toneClass[action.tone]}`}>
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-[13px] font-semibold ${textToneClass[action.tone]}`}>{action.title}</span>
                <span className={`mt-0.5 block truncate text-[10.5px] ${textToneClass[action.tone]}`} title={action.description}>{action.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
