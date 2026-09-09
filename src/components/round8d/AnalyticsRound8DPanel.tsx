"use client";

import { BarChart3, Brain, CalendarClock, FileText, Gauge, ShieldAlert, Users } from "lucide-react";
import { IconBox } from "@/components/common";
import { cn } from "@/lib/utils";

const ranges = [
  { label: "近7天", value: 7 },
  { label: "近30天", value: 30 },
  { label: "近90天", value: 90 },
];

const drilldowns = [
  { label: "设备价格", desc: "查看设备价格明细", route: "/equipment-prices", icon: BarChart3, tone: "blue" as const },
  { label: "地材价格", desc: "查看地材价格趋势", route: "/material-prices", icon: Gauge, tone: "cyan" as const },
  { label: "供应商", desc: "查看供应商评分", route: "/suppliers", icon: Users, tone: "green" as const },
  { label: "AI任务", desc: "进入AI工作台", route: "/ai-workbench", icon: Brain, tone: "purple" as const },
  { label: "高风险", desc: "查看风险聚合", route: "/analytics?risk=high", icon: ShieldAlert, tone: "red" as const },
  { label: "询价任务", desc: "进入询价管理", route: "/inquiries", icon: FileText, tone: "orange" as const },
];

type AnalyticsRound8DPanelProps = {
  range: 7 | 30 | 90;
  objectType: "all" | "equipment" | "material";
  onRangeChange: (value: 7 | 30 | 90) => void;
  onObjectTypeChange: (value: "all" | "equipment" | "material") => void;
  onDrilldown: (route: string, label: string) => void;
};

export function AnalyticsRound8DPanel({ range, objectType, onRangeChange, onObjectTypeChange, onDrilldown }: AnalyticsRound8DPanelProps) {
  return (
    <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconBox icon={CalendarClock} tone="blue" size="sm" />
          <div>
            <h2 className="text-[15px] font-black text-textMain">分析范围与业务入口</h2>
            <p className="text-[12px] text-textSecondary">统一统计时间口径，并进入对应业务数据核查。</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 items-center rounded-[8px] border border-borderSoft bg-white p-0.5" aria-label="分析对象">
            {([['全部', 'all'], ['设备', 'equipment'], ['地材', 'material']] as const).map(([label, value]) => (
              <button
                key={value}
                type="button"
                onClick={() => onObjectTypeChange(value)}
                className={cn("h-7 rounded-[6px] px-3 text-[12px] font-bold transition", objectType === value ? "bg-primary text-white" : "text-textSecondary hover:bg-primary-soft")}
              >
                {label}
              </button>
            ))}
          </div>
          {ranges.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onRangeChange(item.value as 7 | 30 | 90)}
              className={cn(
                "h-8 rounded-[8px] border px-3 text-[12px] font-bold transition",
                range === item.value ? "border-primary bg-primary text-white shadow-primary" : "border-borderSoft bg-white text-textSecondary hover:border-primary/40"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {drilldowns.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onDrilldown(item.route, item.label)}
            className="flex items-center gap-2 rounded-[12px] border border-borderSoft bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-ai/40 hover:shadow-card"
          >
            <IconBox icon={item.icon} tone={item.tone} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-black text-textMain">{item.label}</span>
              <span className="block truncate text-[11px] text-textMuted">{item.desc}</span>
            </span>
          </button>
        ))}
      </div>

    </section>
  );
}
