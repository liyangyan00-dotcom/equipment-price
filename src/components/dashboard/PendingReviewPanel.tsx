import { ClipboardCheck, FileImage, FileSpreadsheet, FileText, Mail } from "lucide-react";
import { ConfidenceBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { DataTable } from "@/components/common";
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

const columns = [
  {
    key: "fileName",
    header: "任务对象",
    render: (row: PendingReviewTask) => {
      const Icon = fileIcon[row.fileType];
      return (
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-textMain">{row.fileName}</p>
            <p className="mt-0.5 text-caption text-textMuted">{taskTypeLabel[row.taskType]}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "missingFieldCount",
    header: "缺失 / 状态",
    render: (row: PendingReviewTask) => (
      <div className="flex flex-col gap-1">
        <span className={row.missingFieldCount > 0 ? "text-caption font-semibold text-warning" : "text-caption font-semibold text-success"}>
          缺失 {row.missingFieldCount}
        </span>
        <StatusBadge status={row.status} />
      </div>
    ),
  },
  {
    key: "confidenceLevel",
    header: "置信度 / 风险",
    render: (row: PendingReviewTask) => (
      <div className="flex flex-col gap-1">
        <ConfidenceBadge level={row.confidenceLevel} />
        <RiskBadge level={row.riskLevel} />
      </div>
    ),
  },
  {
    key: "createdAtLabel",
    header: "入口",
    align: "right" as const,
    render: (row: PendingReviewTask) => (
      <div className="flex flex-col items-end gap-1">
        <span className="text-caption text-textMuted">{row.createdAtLabel}</span>
        <span className="text-caption font-semibold text-primary">{row.actions[1]}</span>
      </div>
    ),
  },
];

type PendingReviewPanelProps = {
  data: PendingReviewTask[];
};

export function PendingReviewPanel({ data }: PendingReviewPanelProps) {
  return (
    <DataTable<PendingReviewTask>
      columns={columns}
      data={data}
      rowKey="id"
      className="[&_td]:py-2 [&_tr]:h-[50px]"
      actions={
        <DashboardSectionHeader
          icon={ClipboardCheck}
          title="AI 待人工复核"
          subtitle="文件类型、缺失字段、风险等级与处理入口"
          tone="orange"
          action={<span className="text-caption font-semibold text-primary">更多任务</span>}
        />
      }
    />
  );
}
