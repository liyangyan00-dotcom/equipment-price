"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PriceTrendPoint } from "@/data/mock/dashboard";
import { dashboardTrendLines } from "@/lib/dashboardChartConfig";

type PriceTrendChartProps = {
  data: PriceTrendPoint[];
  height?: number;
};

export function PriceTrendChart({ data, height = 196 }: PriceTrendChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!mounted) {
    return <div className="rounded-card bg-[var(--color-bg-muted)]" style={{ height }} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height} minWidth={1} minHeight={1}>
      <LineChart data={data} margin={{ top: 4, right: 14, left: -18, bottom: -4 }} accessibilityLayer>
        <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "#64748B", fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ stroke: "#CBD5E1", strokeWidth: 1 }}
          contentStyle={{
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            boxShadow: "0 12px 28px rgba(15,23,42,0.10)",
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ color: "#475569", fontSize: 12, paddingTop: 8 }} />
        {dashboardTrendLines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={3}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
