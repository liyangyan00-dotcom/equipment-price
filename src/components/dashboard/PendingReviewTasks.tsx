import Link from "next/link";
import { ClipboardCheck, FileImage, FileSpreadsheet, FileText, Mail } from "lucide-react";
import { ConfidenceBadge, RiskBadge } from "@/components/badges";
import { BaseCard } from "@/components/common";
import type { PendingReviewTask } from "@/data/mock/dashboard";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

const fileIcon = {
  pdf: FileText,
  excel: FileSpreadsheet,
  image: FileImage,
  email: Mail,
};

const taskTypeLabel = {
  quote_recognition: "报价识别",
  price_collection: "价格采集",
  boq_parse: "BOQ解析",
  supplier_match: "供应商匹配",
};

type PendingReviewTasksProps = {
  data: PendingReviewTask[];
};

export function PendingReviewTasks({ data }: PendingReviewTasksProps) {
  return (
    <BaseCard contentClassName="p-0">
      <div className="border-b border-borderSoft px-3 py-2">
        <DashboardSectionHeader
          icon={ClipboardCheck}
          title="待复核任务"
          subtitle="跨价格、线索、供应商与询价的最新人工待办"
          tone="orange"
          action={
            <Link href="/pending-quotes" className="text-[12px] font-semibold text-primary transition hover:text-primary-hover">
              报价审核
            </Link>
          }
        />
      </div>

      <div className="divide-y divide-borderSoft">
        {data.length ? data.map((task) => {
          const Icon = fileIcon[task.fileType];
          return (
            <div key={task.id} className="grid min-h-[42px] gap-2 px-3 py-1.5 transition hover:bg-warning-soft/25 lg:grid-cols-[1.05fr_0.95fr_auto] lg:items-center">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-primary">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-textMain" title={task.fileName}>{task.fileName}</p>
                  <p className="text-[10.5px] text-textMuted">{taskTypeLabel[task.taskType]}</p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-pill bg-ai-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-ai">AI {task.aiConfidence}%</span>
                  <ConfidenceBadge level={task.confidenceLevel} />
                </div>
                <p className="mt-0.5 truncate text-[10.5px] font-medium text-warning">
                  缺失字段：{task.missingFields.length ? task.missingFields.join("、") : "无"}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 lg:justify-end">
                <RiskBadge level={task.riskLevel} />
                <Link href={task.href || "/pending-quotes"} className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-primary-hover active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35">
                  {task.actions[1]}
                </Link>
              </div>
            </div>
          );
        }) : <div className="flex min-h-36 items-center justify-center px-4 text-center text-[12px] text-textMuted">当前没有待人工复核任务</div>}
      </div>
    </BaseCard>
  );
}
