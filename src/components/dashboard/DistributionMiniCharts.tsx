"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, MapPin, PieChart as PieChartIcon } from "lucide-react";
import { ChartCard } from "@/components/common";
import type { DistributionDatum } from "@/data/mock/dashboard";
import { dashboardConfidenceColors, dashboardDistributionColors } from "@/lib/dashboardChartConfig";

type DistributionMiniChartsProps = {
  equipmentData: DistributionDatum[];
  supplierData: DistributionDatum[];
  confidenceData: DistributionDatum[];
};

export function DistributionMiniCharts({
  equipmentData,
  supplierData,
  confidenceData,
}: DistributionMiniChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="grid gap-card-gap xl:grid-cols-3">
      <ChartCard title="设备分类分布" description="按条目数统计" icon={PieChartIcon} tone="blue" compact>
        <DonutChart data={equipmentData} centerValue="12,568" />
      </ChartCard>
      <ChartCard title="供应商区域分布" description="按数量统计" icon={MapPin} tone="cyan" compact>
        <DonutChart data={supplierData} centerValue="2,346" />
      </ChartCard>
      <ChartCard title="价格置信度分布" description="按条目数统计" icon={BarChart3} tone="purple" compact>
        {mounted ? (
          <ResponsiveContainer width="100%" height={210} minWidth={1} minHeight={1}>
            <BarChart data={confidenceData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
              <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {confidenceData.map((entry, index) => (
                  <Cell key={entry.name} fill={dashboardConfidenceColors[index] ?? dashboardDistributionColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[210px] rounded-card bg-[var(--color-bg-muted)]" />
        )}
      </ChartCard>
    </section>
  );
}

type DonutChartProps = {
  data: DistributionDatum[];
  centerValue: string;
};

function DonutChart({ data, centerValue }: DonutChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="grid min-h-[210px] gap-3 sm:grid-cols-[0.8fr_1fr] sm:items-center">
      <div className="relative h-[178px]">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <PieChart>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={dashboardDistributionColors[index % dashboardDistributionColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-card bg-[var(--color-bg-muted)]" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[22px] font-semibold text-textMain">{centerValue}</p>
          <p className="text-caption text-textMuted">总计</p>
        </div>
      </div>
      <div className="space-y-2">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-2 text-caption">
            <span className="flex min-w-0 items-center gap-2 text-textSecondary">
              <span
                className="size-2.5 shrink-0 rounded-pill"
                style={{ backgroundColor: dashboardDistributionColors[index % dashboardDistributionColors.length] }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="font-medium text-textMain">{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
