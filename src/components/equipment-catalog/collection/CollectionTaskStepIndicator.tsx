"use client";

import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const collectionTaskSteps = [
  "基本信息",
  "数据源选择",
  "采集方式配置",
  "采集范围与规则",
  "高级设置",
  "确认与创建",
] as const;

export function CollectionTaskStepIndicator({
  currentStep,
  completedSteps,
  invalidSteps,
  onChange,
}: {
  currentStep: number;
  completedSteps: number[];
  invalidSteps: number[];
  onChange: (step: number) => void;
}) {
  return (
    <nav aria-label="采集任务创建步骤" className="overflow-x-auto border-b border-borderSoft px-3 py-4">
      <ol className="grid min-w-[900px] grid-cols-6">
        {collectionTaskSteps.map((label, index) => {
          const step = index + 1;
          const active = step === currentStep;
          const completed = completedSteps.includes(step);
          const invalid = invalidSteps.includes(step);
          return (
            <li key={label} className="relative min-w-0 px-2">
              {index ? <span className={cn("absolute right-1/2 top-3.5 h-px w-full", completed || active ? "bg-primary/45" : "bg-borderSoft")} /> : null}
              <button type="button" onClick={() => onChange(step)} className="relative z-10 flex w-full flex-col items-center text-center">
                <span className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-[11px] font-bold shadow-sm transition",
                  active ? "border-primary bg-primary text-white ring-4 ring-primary/10" : completed ? "border-success bg-success text-white" : invalid ? "border-warning bg-warning-soft text-warning" : "border-borderSoft bg-white text-textMuted"
                )}>
                  {completed ? <Check className="size-4" /> : invalid ? <CircleAlert className="size-4" /> : step}
                </span>
                <span className={cn("mt-2 truncate text-[11px] font-semibold", active ? "text-primary" : completed ? "text-success" : invalid ? "text-warning" : "text-textMuted")}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
