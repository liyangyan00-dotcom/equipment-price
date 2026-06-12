import { chartColors } from "@/lib/chartColors";

export const dashboardTrendLines = [
  { dataKey: "equipment", name: "设备价格", color: chartColors.blue },
  { dataKey: "material", name: "地材价格", color: chartColors.green },
  { dataKey: "aiLeads", name: "AI线索", color: chartColors.purple },
] as const;

export const dashboardDistributionColors = [
  chartColors.blue,
  chartColors.cyan,
  chartColors.purple,
  chartColors.orange,
  chartColors.green,
  chartColors.red,
] as const;

export const dashboardConfidenceColors = [chartColors.blue, chartColors.green, chartColors.red] as const;
