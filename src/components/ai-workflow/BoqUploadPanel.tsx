import { CloudUpload, FileSpreadsheet } from "lucide-react";
import { WorkflowCard } from "./WorkflowPanels";

type BoqUploadPanelProps = {
  projectInfo: Array<{ label: string; value: string }>;
};

export function BoqUploadPanel({ projectInfo }: BoqUploadPanelProps) {
  return (
    <WorkflowCard icon={CloudUpload} title="项目BOQ上传与项目信息" subtitle="当前仅模拟文件上传与项目参数读取" tone="blue">
      <div className="grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[16px] border border-dashed border-primary/35 bg-gradient-to-br from-primary-soft via-white to-cyan-50 p-5 text-center">
          <CloudUpload className="size-12 text-primary" aria-hidden="true" />
          <div className="mt-3 text-[18px] font-bold text-primary">上传 BOQ 文件</div>
          <p className="mt-1 text-[12px] text-textMuted">支持 .xlsx / .xls / .csv / .xml，当前为前端模拟。</p>
          <button className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-semibold text-white shadow-sm" type="button">
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            点击上传
          </button>
        </div>
        <div className="rounded-[14px] border border-borderSoft bg-white">
          {projectInfo.map((item) => (
            <div key={item.label} className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-borderSoft last:border-0">
              <div className="px-3 py-3 text-[12px] font-semibold text-textSecondary">{item.label}</div>
              <div className="px-3 py-3 text-[13px] font-bold text-textMain">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </WorkflowCard>
  );
}
