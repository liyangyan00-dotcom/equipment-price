import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDot,
  FileSearch,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { IconBox, type IconBoxTone } from "@/components/common/IconBox";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { cn } from "@/lib/utils";
import type { AiTaskStatus, ConfidenceLevel, RiskLevel } from "@/types/common";

type WorkflowCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: IconBoxTone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function WorkflowCard({
  icon,
  title,
  subtitle,
  tone = "blue",
  action,
  children,
  className,
  bodyClassName,
}: WorkflowCardProps) {
  return (
    <section className={cn("rounded-card border border-borderSoft bg-card shadow-card", className)}>
      <div className="border-b border-borderSoft px-3.5 py-3">
        <ModuleHeader icon={icon} title={title} subtitle={subtitle} tone={tone} action={action} density="compact" />
      </div>
      <div className={cn("p-3.5", bodyClassName)}>{children}</div>
    </section>
  );
}

type UploadPanelProps = {
  files: Array<{ name: string; type: string; status: AiTaskStatus; confidence: ConfidenceLevel; risk: RiskLevel }>;
};

export function AiUploadPanel({ files }: UploadPanelProps) {
  return (
    <WorkflowCard icon={UploadCloud} title="报价文件上传与识别" subtitle="支持报价单、邮件截图与表格文件模拟识别" tone="blue">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-[190px] flex-col items-center justify-center rounded-[16px] border border-dashed border-primary/30 bg-gradient-to-br from-primary-soft via-white to-cyan-50 p-5 text-center">
          <IconBox icon={UploadCloud} tone="blue" size="lg" className="size-12" />
          <div className="mt-3 text-[17px] font-bold text-primary">上传报价文件</div>
          <p className="mt-1 text-[12px] text-textMuted">支持 pdf / xlsx / doc / jpg / png，当前仅做 mock 展示。</p>
          <button className="mt-4 inline-flex h-8 items-center rounded-md bg-primary px-4 text-[12px] font-semibold text-white shadow-sm" type="button">
            选择文件
          </button>
        </div>
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.name} className="flex items-center gap-3 rounded-[12px] border border-borderSoft bg-white px-3 py-2.5">
              <IconBox icon={FileSearch} tone={file.type === "邮件附件" ? "cyan" : "purple"} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-textMain">{file.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <AiBadge label={file.type} />
                  <StatusBadge status={file.status} />
                  <ConfidenceBadge level={file.confidence} />
                  <RiskBadge level={file.risk} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkflowCard>
  );
}

type ProgressPanelProps = {
  title?: string;
  items: Array<{ label: string; value: number; tone?: IconBoxTone }>;
};

const progressColor: Record<IconBoxTone, string> = {
  blue: "bg-primary",
  cyan: "bg-cyan-500",
  purple: "bg-ai",
  orange: "bg-warning",
  red: "bg-danger",
  green: "bg-success",
  slate: "bg-slate-500",
};

export function AiProgressPanel({ title = "AI处理进度", items }: ProgressPanelProps) {
  return (
    <div className="rounded-[14px] border border-ai-border bg-gradient-to-br from-ai-soft via-white to-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ai">
          <Bot className="size-4" />
          {title}
        </div>
        <AiBadge label="AI运行中" />
      </div>
      <div className="space-y-2.5">
        {items.map((item) => {
          const tone = item.tone ?? "purple";

          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-textSecondary">{item.label}</span>
                <span className="font-semibold text-textMain">{item.value}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full", progressColor[tone])} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type InsightListProps = {
  title: string;
  subtitle?: string;
  items: Array<{ title: string; description: string; tone?: IconBoxTone; meta?: string }>;
  actionLabel?: string;
};

export function AiInsightList({ title, subtitle, items, actionLabel = "查看详情" }: InsightListProps) {
  return (
    <WorkflowCard icon={Bot} title={title} subtitle={subtitle} tone="purple" action={<AiBadge label="AI建议" />}>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.title} className="flex gap-2 rounded-[12px] border border-ai-border/80 bg-ai-soft/60 p-2.5">
            <IconBox icon={CircleDot} tone={item.tone ?? "purple"} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[13px] font-semibold text-textMain">{item.title}</div>
                {item.meta ? <span className="shrink-0 text-[11px] font-semibold text-ai">{item.meta}</span> : null}
              </div>
              <p className="mt-0.5 text-[12px] leading-5 text-textSecondary">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-ai-border bg-white text-[12px] font-semibold text-ai" type="button">
        {actionLabel}
        <ArrowRight className="size-3.5" />
      </button>
    </WorkflowCard>
  );
}

type RiskListProps = {
  title: string;
  subtitle?: string;
  items: Array<{ title: string; description: string; level: RiskLevel }>;
};

export function RiskDetectionPanel({ title, subtitle, items }: RiskListProps) {
  return (
    <WorkflowCard icon={AlertTriangle} title={title} subtitle={subtitle} tone="red">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.title} className="flex items-center gap-2 rounded-[12px] border border-danger/10 bg-danger-soft/60 px-3 py-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-[12px] font-bold text-danger">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-textMain">{item.title}</div>
              <div className="truncate text-[11px] text-textMuted">{item.description}</div>
            </div>
            <RiskBadge level={item.level} />
          </div>
        ))}
      </div>
    </WorkflowCard>
  );
}

type ReviewDecisionPanelProps = {
  decisions: Array<{ label: string; value: string; tone: IconBoxTone }>;
  recommendation: string;
};

export function ReviewDecisionPanel({ decisions, recommendation }: ReviewDecisionPanelProps) {
  return (
    <WorkflowCard icon={CheckCircle2} title="人工复核决策" subtitle="AI建议必须进入人工确认流程" tone="green">
      <div className="grid grid-cols-2 gap-2">
        {decisions.map((item) => (
          <div key={item.label} className="rounded-[12px] border border-borderSoft bg-[var(--color-bg-muted)] p-2.5">
            <div className="text-[11px] font-semibold text-textMuted">{item.label}</div>
            <div className="mt-1 flex items-center gap-2">
              <IconBox icon={CheckCircle2} tone={item.tone} size="sm" />
              <span className="text-[18px] font-bold text-textMain">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-[12px] border border-ai-border bg-ai-soft p-3 text-[12px] leading-5 text-textSecondary">
        <span className="font-semibold text-ai">AI复核建议：</span>
        {recommendation}
      </div>
    </WorkflowCard>
  );
}

type SourcePanelProps = {
  sources: Array<{ name: string; type: string; successRate: number; taskCount: number; status: AiTaskStatus }>;
};

export function CollectionSourcePanel({ sources }: SourcePanelProps) {
  return (
    <WorkflowCard icon={RefreshCw} title="采集源状态" subtitle="当前仅模拟采集队列与来源健康度" tone="cyan">
      <div className="space-y-2">
        {sources.map((source) => (
          <div key={source.name} className="rounded-[12px] border border-borderSoft bg-white p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-textMain">{source.name}</div>
                <div className="mt-0.5 text-[11px] text-textMuted">{source.type} / {source.taskCount} 个任务</div>
              </div>
              <StatusBadge status={source.status} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${source.successRate}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-cyan-700">{source.successRate}%</span>
            </div>
          </div>
        ))}
      </div>
    </WorkflowCard>
  );
}

type LeadEvaluationPanelProps = {
  score: number;
  items: Array<{ label: string; value: string; tone: IconBoxTone }>;
  conclusion: string;
};

export function LeadEvaluationPanel({ score, items, conclusion }: LeadEvaluationPanelProps) {
  return (
    <WorkflowCard icon={Bot} title="AI线索评估" subtitle="从可信度、缺口价值与风险综合判断" tone="purple">
      <div className="rounded-[16px] border border-ai-border bg-gradient-to-br from-ai-soft to-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold text-textMuted">综合可入库分</div>
            <div className="mt-1 text-[32px] font-bold leading-none text-ai">{score}</div>
          </div>
          <AiBadge label="AI可信评估" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-[12px] bg-white/85 p-2">
              <div className="text-[11px] text-textMuted">{item.label}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <IconBox icon={CircleDot} tone={item.tone} size="sm" className="size-6" />
                <span className="text-[13px] font-bold text-textMain">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 rounded-[12px] border border-borderSoft bg-white px-3 py-2 text-[12px] leading-5 text-textSecondary">
        <span className="font-semibold text-ai">AI判断：</span>
        {conclusion}
      </p>
    </WorkflowCard>
  );
}
