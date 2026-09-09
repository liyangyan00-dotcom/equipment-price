import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleHeader } from "@/components/common/ModuleHeader";

type AnalyticsChartCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "blue" | "cyan" | "purple" | "orange" | "red" | "green" | "slate";
};

export function AnalyticsChartCard({
  icon,
  title,
  subtitle,
  action,
  children,
  className,
  tone = "blue",
}: AnalyticsChartCardProps) {
  return (
    <section
      className={cn(
        "rounded-card border border-borderSoft bg-card p-3.5 shadow-card",
        className,
      )}
    >
      <ModuleHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        tone={tone}
        density="compact"
        action={action}
      />
      <div className="mt-3">{children}</div>
    </section>
  );
}

export type DonutDatum = {
  name: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: DonutDatum[];
  totalLabel?: string;
  className?: string;
};

export function DonutChart({
  data,
  totalLabel = "总数",
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = data.reduce<
    Array<{
      name: string;
      value: number;
      color: string;
      length: number;
      offset: number;
    }>
  >((acc, item) => {
    const length = total > 0 ? (item.value / total) * circumference : 0;
    const offset = acc.length
      ? acc[acc.length - 1].offset + acc[acc.length - 1].length
      : 0;

    return [...acc, { ...item, length, offset }];
  }, []);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg
        viewBox="0 0 120 120"
        className="size-32 shrink-0"
        role="img"
        aria-label={totalLabel}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#E8EEF6"
          strokeWidth="16"
        />
        {segments.map((item) => (
          <circle
            key={item.name}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth="16"
            strokeDasharray={`${item.length} ${circumference - item.length}`}
            strokeDashoffset={-item.offset}
            strokeLinecap="butt"
            transform="rotate(-90 60 60)"
          />
        ))}
        <text
          x="60"
          y="55"
          textAnchor="middle"
          className="fill-textMain text-[18px] font-bold"
        >
          {total.toLocaleString("zh-CN")}
        </text>
        <text
          x="60"
          y="73"
          textAnchor="middle"
          className="fill-textMuted text-[10px] font-medium"
        >
          {totalLabel}
        </text>
      </svg>
      <div className="min-w-0 flex-1 space-y-2">
        {data.map((item) => (
          <div
            key={item.name}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[12px]"
          >
            <span className="flex min-w-0 items-center gap-2 text-textSecondary">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="font-semibold text-textMain">
              {item.value.toLocaleString("zh-CN")}{" "}
              <span className="text-textMuted">
                ({total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0}
                %)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type BarDatum = {
  label: string;
  value: number;
  percent?: string;
};

export function HorizontalBarList({
  data,
  color = "#2F6BFF",
}: {
  data: BarDatum[];
  color?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div
          key={item.label}
          className="grid grid-cols-[90px_minmax(0,1fr)_56px] items-center gap-3 text-[12px]"
        >
          <span className="truncate font-medium text-textSecondary">
            {item.label}
          </span>
          <span className="h-2 overflow-hidden rounded-pill bg-[#EEF3F8]">
            <span
              className="block h-full rounded-pill"
              style={{
                width:
                  item.value > 0
                    ? `${Math.max((item.value / max) * 100, 8)}%`
                    : "0%",
                backgroundColor: index === 0 ? color : "#7AA7FF",
              }}
            />
          </span>
          <span className="text-right font-semibold text-textMain">
            {item.percent ?? item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

type LineSeries = {
  name: string;
  color: string;
  values: Array<number | null>;
};

export function MultiLineChart({
  labels,
  series,
}: {
  labels: string[];
  series: LineSeries[];
}) {
  const allValues = series
    .flatMap((item) => item.values)
    .filter((value): value is number => value !== null);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const width = 520;
  const height = 180;
  const xStep = width / Math.max(labels.length - 1, 1);
  const y = (value: number) =>
    height - 18 - ((value - min) / Math.max(max - min, 1)) * 130;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[180px] w-full">
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1="0"
            x2={width}
            y1={30 + line * 36}
            y2={30 + line * 36}
            stroke="#E5EDF6"
            strokeDasharray="4 4"
          />
        ))}
        {series.map((item) => {
          return (
            <g key={item.name}>
              {item.values.slice(0, -1).map((value, index) => {
                const next = item.values[index + 1];
                return value !== null && next !== null ? (
                  <line
                    key={`${item.name}-line-${index}`}
                    x1={index * xStep}
                    y1={y(value)}
                    x2={(index + 1) * xStep}
                    y2={y(next)}
                    stroke={item.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                ) : null;
              })}
              {item.values.map((value, index) =>
                value !== null ? (
                  <circle
                    key={`${item.name}-${index}`}
                    cx={index * xStep}
                    cy={y(value)}
                    r="3.5"
                    fill="white"
                    stroke={item.color}
                    strokeWidth="2"
                  />
                ) : null,
              )}
            </g>
          );
        })}
        {labels.map((label, index) => (
          <text
            key={label}
            x={index * xStep}
            y={height - 2}
            textAnchor={
              index === 0
                ? "start"
                : index === labels.length - 1
                  ? "end"
                  : "middle"
            }
            className="fill-textMuted text-[11px]"
          >
            {label}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex justify-center gap-4">
        {series.map((item) => (
          <span
            key={item.name}
            className="flex items-center gap-1.5 text-[12px] font-medium text-textSecondary"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}
