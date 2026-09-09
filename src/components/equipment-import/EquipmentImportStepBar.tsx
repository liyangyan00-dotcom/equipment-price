"use client";

import {
  ArrowRight,
  Bot,
  Database,
  FileCheck2,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: 1,
    title: "上传文件",
    subtitle: "选择 Excel 报价文件",
    icon: UploadCloud,
  },
  {
    id: 2,
    title: "AI解析与字段映射",
    subtitle: "识别列与映射系统字段",
    icon: Bot,
  },
  {
    id: 3,
    title: "数据校验与人工修正",
    subtitle: "校验数据并修正问题",
    icon: FileCheck2,
  },
  {
    id: 4,
    title: "提交审核与入库",
    subtitle: "审核通过后进入价格库",
    icon: Database,
  },
] as const;

export function EquipmentImportStepBar({
  activeStep,
  maxStep,
  onStepChange,
}: {
  activeStep: number;
  maxStep: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <section className="rounded-[12px] border border-borderSoft bg-white px-4 py-3 shadow-card">
      <ol className="grid items-center gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = activeStep === step.id;
          const complete = activeStep > step.id;
          const available = step.id <= maxStep;

          return (
            <div key={step.id} className="contents">
              <li>
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => onStepChange(step.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[10px] border px-3 py-2 text-left transition",
                    active
                      ? "border-primary/25 bg-primary-soft shadow-[0_8px_20px_rgba(11,92,173,0.1)]"
                      : complete
                        ? "border-success/15 bg-success-soft/40"
                        : "border-transparent bg-white hover:border-borderSoft hover:bg-slate-50",
                    !available && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-[11px] border",
                      active
                        ? "border-primary/20 bg-white text-primary"
                        : complete
                          ? "border-success/20 bg-white text-success"
                          : "border-borderSoft bg-slate-50 text-textMuted"
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-[13px] font-semibold",
                        active ? "text-primary" : "text-textMain"
                      )}
                    >
                      {step.id}. {step.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-textMuted">
                      {step.subtitle}
                    </span>
                  </span>
                </button>
              </li>
              {index < steps.length - 1 ? (
                <ArrowRight
                  className={cn(
                    "mx-1 hidden size-4 lg:block",
                    activeStep > step.id ? "text-success" : "text-borderStrong"
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
        })}
      </ol>
    </section>
  );
}
