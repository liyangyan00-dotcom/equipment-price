import Link from "next/link";
import { ArrowRight, BrainCircuit, SearchCheck, TriangleAlert, Users } from "lucide-react";
import { AiBadge } from "@/components/badges";
import { BaseCard } from "@/components/common";
import type { AiInsightCardData } from "@/data/mock/dashboard";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

const cardMeta = {
  lead: {
    icon: SearchCheck,
    title: "价格线索发现",
    metricClass: "text-primary",
    iconClass: "bg-primary-soft text-primary",
    rows: [
      ["设备线索", "56 条"],
      ["地材线索", "72 条"],
    ],
  },
  gap: {
    icon: TriangleAlert,
    title: "价格缺口预警",
    metricClass: "text-success",
    iconClass: "bg-success-soft text-success",
    rows: [
      ["设备缺口", "34 项"],
      ["地材缺口", "52 项"],
    ],
  },
  inquiry: {
    icon: Users,
    title: "建议询价任务",
    metricClass: "text-ai",
    iconClass: "bg-ai-soft text-ai",
    rows: [
      ["高优先级", "12 项"],
      ["中优先级", "12 项"],
    ],
  },
} satisfies Record<AiInsightCardData["id"], {
  icon: typeof SearchCheck;
  title: string;
  metricClass: string;
  iconClass: string;
  rows: [string, string][];
}>;

const actionHref = {
  lead: "/price-leads",
  gap: "/ai-price-collection",
  inquiry: "/inquiries/create",
} satisfies Record<AiInsightCardData["id"], string>;

type DashboardInsightCardsProps = {
  data: AiInsightCardData[];
};

export function DashboardInsightCards({ data }: DashboardInsightCardsProps) {
  return (
    <BaseCard contentClassName="space-y-3 p-3.5">
      <DashboardSectionHeader
        icon={BrainCircuit}
        title="AI价格情报洞察"
        subtitle="线索发现、缺口预警与建议询价任务"
        tone="purple"
        action={<AiBadge label="AI洞察" icon="analysis" />}
      />

      <section className="grid gap-2.5 md:grid-cols-3">
        {data.map((item) => {
          const meta = cardMeta[item.id];
          const Icon = meta.icon;

          return (
            <article
              key={item.id}
              className="rounded-[12px] border border-borderSoft bg-[linear-gradient(180deg,#FFFFFF,#F8FBFF)] p-3 shadow-sm transition hover:border-ai-border hover:shadow-card"
            >
              <div className="flex items-center justify-center">
                <span className={`flex size-9 items-center justify-center rounded-[12px] ${meta.iconClass}`}>
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-2 text-center text-[13px] font-semibold text-primary">{meta.title}</h3>

              <div className="mt-2 flex items-end justify-center gap-1">
                <p className={`text-[30px] font-semibold leading-none ${meta.metricClass}`}>{item.value}</p>
                <span className="pb-1 text-[12px] font-semibold text-textMuted">{item.unit}</span>
              </div>
              <p className="mt-1 text-center text-[11px] font-semibold text-success">{item.changeLabel || "来自实时业务数据"}</p>

              <div className="mt-3 space-y-1.5 border-t border-borderSoft pt-2.5">
                {(item.breakdown || meta.rows).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-textSecondary">{label}</span>
                    <span className="font-semibold text-textMain">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-center">
                <Link
                  href={actionHref[item.id]}
                  className="inline-flex items-center gap-1 rounded-pill bg-primary-soft px-3 py-1.5 text-[12px] font-semibold text-primary transition hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label={item.action}
                >
                  {item.action}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </BaseCard>
  );
}
