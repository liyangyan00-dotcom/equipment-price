import { CheckCircle2, RefreshCw } from "lucide-react";
import { WorkflowCard } from "./WorkflowPanels";

type DistributionItem = {
  label: string;
  value: number;
  percent: number;
  color: string;
};

function Donut({ items }: { items: DistributionItem[] }) {
  const circumference = 100;
  const segments = items.reduce<Array<DistributionItem & { offset: number }>>((acc, item) => {
    const previousOffset = acc.length ? acc[acc.length - 1].offset - acc[acc.length - 1].percent : 25;
    acc.push({ ...item, offset: previousOffset });
    return acc;
  }, []);

  return (
    <div className="relative size-[168px] shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="#EEF3F8" strokeWidth="5" />
        {segments.map((item) => {
          const dash = item.percent;
          return (
            <circle
              key={item.label}
              cx="21"
              cy="21"
              r="15.915"
              fill="none"
              stroke={item.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={item.offset}
              strokeWidth="5"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[30px] font-bold leading-none text-textMain">156</div>
        <div className="mt-1 text-[12px] font-semibold text-textMuted">总项数</div>
      </div>
    </div>
  );
}

export function BoqParseProgress({ items }: { items: DistributionItem[] }) {
  return (
    <WorkflowCard
      icon={RefreshCw}
      title="AI解析BOQ"
      subtitle="精准匹配、相似匹配与待复核项分布"
      tone="green"
      action={<span className="inline-flex h-6 items-center gap-1 rounded-pill bg-success-soft px-2 text-[12px] font-semibold text-success"><CheckCircle2 className="size-3.5" />解析完成</span>}
    >
      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <Donut items={items} />
        <div className="space-y-2 self-center">
          {items.map((item) => (
            <div key={item.label} className="grid grid-cols-[14px_minmax(0,1fr)_56px_54px] items-center gap-2 text-[13px]">
              <span className="size-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-textSecondary">{item.label}</span>
              <span className="text-right font-bold text-textMain">{item.value}</span>
              <span className="text-right text-textMuted">{item.percent}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-borderSoft pt-3 text-[12px] text-textMuted">
        <span>识别文件：机电设备清单_20250520.xlsx</span>
        <span>解析时间：2026-05-20 14:30</span>
        <span>耗时：18s</span>
        <button className="inline-flex h-7 items-center rounded-md border border-primary/20 bg-primary-soft px-2 text-[12px] font-semibold text-primary" type="button">
          重新解析
        </button>
      </div>
    </WorkflowCard>
  );
}
