import { CheckCircle2, Circle, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InquiryLifecycleStage } from "@/data/mock/inquiryDetails";

const stages: Array<{ key: InquiryLifecycleStage; label: string; description: string }> = [
  { key: "local_draft", label: "本机草稿", description: "浏览器自动保存" },
  { key: "server_draft", label: "已创建待审核", description: "任务已写入系统" },
  { key: "letter_review", label: "函件待审批", description: "人工复核 AI 初稿" },
  { key: "ready_to_send", label: "可发送", description: "准入与校验已通过" },
  { key: "sent", label: "已发送", description: "等待供应商响应" },
];

export function InquiryLifecycleStrip({ currentStage }: { currentStage: InquiryLifecycleStage }) {
  const currentIndex = Math.max(0, stages.findIndex((stage) => stage.key === currentStage));

  return (
    <section className="rounded-lg border border-borderSoft bg-white px-4 py-3 shadow-card" aria-label="询价任务状态流程">
      <div className="grid gap-2 md:grid-cols-5">
        {stages.map((stage, index) => {
          const completed = index < currentIndex;
          const active = index === currentIndex;
          const Icon = completed ? CheckCircle2 : active ? CircleDashed : Circle;
          return (
            <div key={stage.key} className="relative flex min-w-0 items-center gap-2.5 py-1 md:flex-col md:text-center">
              <span className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-white",
                completed && "border-success/30 text-success",
                active && "border-primary bg-primary text-white",
                !completed && !active && "border-borderSoft text-textMuted",
              )}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 md:w-full">
                <div className={cn("truncate text-[12px] font-bold", active ? "text-primary" : completed ? "text-success" : "text-textMuted")}>{stage.label}</div>
                <div className="truncate text-[10px] text-textMuted">{stage.description}</div>
              </div>
              {index < stages.length - 1 ? <span className={cn("absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-[14px] hidden h-px md:block", index < currentIndex ? "bg-success/35" : "bg-borderSoft")} /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
