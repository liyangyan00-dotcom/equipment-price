"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { BarChart3, MapPin, PieChart as PieChartIcon } from "lucide-react";
import { ChartCard } from "@/components/common";
import type { DistributionAnalysis, DistributionDatum } from "@/data/mock/dashboard";
import { dashboardConfidenceColors, dashboardDistributionColors } from "@/lib/dashboardChartConfig";

type DistributionAnalysisGridProps = {
  data: DistributionAnalysis[];
};

const iconMap = {
  blue: PieChartIcon,
  cyan: MapPin,
  purple: BarChart3,
};

export function DistributionAnalysisGrid({ data }: DistributionAnalysisGridProps) {
  return (
    <section className="grid items-start gap-3 xl:grid-cols-3">
      {data.map((item) => {
        const Icon = iconMap[item.tone];
        const colors = item.tone === "purple" ? dashboardConfidenceColors : dashboardDistributionColors;

        return (
          <ChartCard
            key={item.title}
            title={item.title}
            description={item.description}
            icon={Icon}
            tone={item.tone}
            compact
            className="[&>div:last-child]:h-[196px] [&>div:last-child]:p-3"
          >
            <DonutChart
              data={item.data}
              centerValue={item.centerValue ?? String(item.data.reduce((sum, row) => sum + row.value, 0))}
              colors={colors}
            />
          </ChartCard>
        );
      })}
    </section>
  );
}

type DonutChartProps = {
  data: DistributionDatum[];
  centerValue: string;
  colors: readonly string[];
};

function DonutChart({ data, centerValue, colors }: DonutChartProps) {
  const mounted = useMounted();

  return (
    <div className="grid h-full min-w-0 gap-3 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
      <div className="flex h-[172px] w-full items-center justify-center">
        <div className="relative h-[172px] w-[190px] shrink-0">
        {mounted ? (
          <div className="absolute inset-0">
            <PieChart width={190} height={172}>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={2} cx={95} cy={86}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </div>
        ) : (
          <div className="h-full rounded-card bg-[var(--color-bg-muted)]" />
        )}
          <div className="pointer-events-none absolute left-[95px] top-[86px] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <p className="whitespace-nowrap text-[20px] font-semibold leading-none text-textMain">{centerValue}</p>
            <p className="mt-1 whitespace-nowrap text-[11px] leading-none text-textMuted">总计</p>
          </div>
        </div>
      </div>
      <div className="min-w-0 space-y-2 overflow-hidden">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-2 text-[10.5px]">
            <span className="flex min-w-0 items-center gap-2 text-textSecondary">
              <span className="size-2.5 shrink-0 rounded-pill" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="shrink-0 font-semibold text-textMain">
              {item.percent}% <span className="text-textMuted">({item.value.toLocaleString("zh-CN")})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return mounted;
}
