"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, CircleDot, ClipboardCheck, FileSearch, FileUp, ListChecks, MapPin, MessageSquareQuote, Search, Sparkles } from "lucide-react";
import { IconBox, ModuleHeader } from "@/components/common";
import { getProjectPricingWorkflow, type ProjectPricingWorkflowInput, type ProjectPricingWorkflowStatus } from "@/lib/projectPricing/workflow";
import { cn } from "@/lib/utils";

export type ProjectPricingListItem = {
  id: string;
  project_code: string;
  name: string;
  status: string;
  project_stage: string;
  base_currency: string;
  price_term: string;
  exchange_rate: number;
  valid_until: string | null;
  risk_level: "low" | "medium" | "high" | "critical";
  updated_at: string;
  metadata: Record<string, unknown>;
  summary: {
    totalItems: number;
    matchedItems: number;
    gapItems: number;
    highRiskItems: number;
    totalUsd: number;
    averageConfidence: number;
    inquiryLinkedItems: number;
    inquiryQuoteItems: number;
    confirmedItems: number;
  };
};

type WorkflowState = ProjectPricingWorkflowInput;

function projectOperationalStatus(project: ProjectPricingListItem) {
  const pendingConfirmation = Math.max(0, project.summary.matchedItems - project.summary.confirmedItems);
  const pendingInquiry = Math.max(0, project.summary.gapItems - project.summary.inquiryLinkedItems);
  const pendingBackfill = Math.max(0, project.summary.gapItems - project.summary.inquiryQuoteItems);

  if (!project.summary.totalItems) return { key: "upload", label: "待上传 BOQ", className: "bg-slate-100 text-textSecondary", view: "workspace" as const, action: "上传 BOQ" };
  if (pendingConfirmation) return { key: "review", label: `待确认 ${pendingConfirmation}`, className: "bg-primary-soft text-primary", view: "review" as const, action: "处理确认" };
  if (pendingInquiry) return { key: "inquiry", label: `待询价 ${pendingInquiry}`, className: "bg-warning-soft text-warning", view: "gaps" as const, action: "发起询价" };
  if (pendingBackfill) return { key: "backfill", label: `待回填 ${pendingBackfill}`, className: "bg-ai-soft text-ai", view: "gaps" as const, action: "跟进回填" };
  return { key: "ready", label: "可输出", className: "bg-success-soft text-success", view: "reports" as const, action: "查看成果" };
}

export function ProjectPricingWorkflow({ state }: { state: WorkflowState }) {
  const workflow = getProjectPricingWorkflow(state);
  const steps: Array<{ title: string; description: string; icon: LucideIcon; status: ProjectPricingWorkflowStatus }> = [
    { title: "创建项目", description: "明确套价条件", icon: BriefcaseBusiness, status: workflow.project },
    { title: "上传 BOQ", description: "归档源文件", icon: FileUp, status: workflow.upload },
    { title: "解析核对", description: `${state.totalItems} 项已解析`, icon: FileSearch, status: workflow.parse },
    { title: "AI 匹配", description: state.matchingCompleted ? `${state.matchedItems} 项推荐 · ${state.gapItems} 项缺口` : "等待执行匹配", icon: Sparkles, status: workflow.matching },
    { title: "人工确认", description: `${Math.min(state.confirmedItems, state.matchedItems)} / ${state.matchedItems} 项`, icon: ClipboardCheck, status: workflow.review },
    { title: "缺口询价", description: `${Math.min(state.inquiryLinkedItems, state.gapItems)} / ${state.gapItems} 项`, icon: MessageSquareQuote, status: workflow.inquiry },
    { title: "报价回填", description: `${Math.min(state.inquiryQuoteItems, state.gapItems)} / ${state.gapItems} 项`, icon: BadgeCheck, status: workflow.backfill },
  ];

  return (
    <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card" aria-label="项目套价业务流程">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const done = step.status === "done";
          const active = step.status === "active";
          return (
            <div key={step.title} className={cn("relative flex min-h-[68px] min-w-0 items-center gap-2 border-b border-r border-borderSoft px-3 py-2 xl:border-b-0", done && "bg-success-soft/45", active && "bg-primary-soft/55")}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[8px] border", done ? "border-success/20 bg-white text-success" : active ? "border-primary/20 bg-white text-primary" : "border-borderSoft bg-slate-50 text-textMuted")}>
                {done ? <CheckCircle2 className="size-4" /> : active ? <CircleDot className="size-4" /> : <Icon className="size-4" />}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[11px] text-textMain">{index + 1}. {step.title}</strong>
                <span className="mt-0.5 block truncate text-[9.5px] text-textMuted">{step.description}</span>
              </span>
              {index < steps.length - 1 ? <ArrowRight className="absolute -right-2 top-1/2 z-10 hidden size-3.5 -translate-y-1/2 text-textMuted xl:block" /> : null}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-ai-border bg-ai-soft/55 px-3 py-1.5 text-[10.5px] text-ai">
        <Sparkles className="size-3.5 shrink-0" />
        AI 只生成匹配建议；价格来源、商务条件和最终套价必须经过人工确认。
      </div>
    </section>
  );
}

export function ProjectPricingEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="grid overflow-hidden rounded-card border border-borderSoft bg-white shadow-card lg:grid-cols-[1.2fr_0.8fr]">
      <div className="flex min-h-60 flex-col justify-center border-b border-borderSoft px-6 py-7 lg:border-b-0 lg:border-r">
        <IconBox icon={FileUp} tone="blue" size="lg" />
        <h2 className="mt-4 text-[18px] font-bold text-textMain">新建项目套价方案</h2>
        <p className="mt-1 max-w-xl text-[12px] leading-5 text-textMuted">先明确地区、币种、贸易条件、汇率和有效期，再上传 BOQ。系统会归档源文件、解析真实行项目并进入 AI 匹配与人工确认流程。</p>
        <button type="button" onClick={onCreate} className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35">
          <FileUp className="size-4" />新建项目并上传 BOQ
        </button>
      </div>
      <div className="bg-slate-50/70 px-5 py-6">
        <ModuleHeader icon={ListChecks} title="创建前准备" subtitle="以下条件将进入套价证据链" tone="green" density="compact" />
        <div className="mt-4 space-y-2">
          {["项目名称、编号与目标地区", "基准币种、汇率及汇率日期", "贸易条件、税费和运费口径", "价格有效期与 BOQ 源文件"].map((item, index) => (
            <div key={item} className="flex items-center gap-2 rounded-[8px] border border-borderSoft bg-white px-3 py-2 text-[11px] font-semibold text-textSecondary">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-[10px] font-bold text-success">{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-warning/20 bg-warning-soft/70 p-2.5 text-[10.5px] leading-4 text-warning">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          地区、币种或价格口径缺失时，不允许直接生成最终套价。
        </div>
      </div>
    </section>
  );
}

export function ProjectPricingList({ projects, currentId, view }: { projects: ProjectPricingListItem[]; currentId?: string; view?: "workspace" | "review" | "gaps" | "reports" }) {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const projectRows = useMemo(() => projects.map((project) => ({ project, operationalStatus: projectOperationalStatus(project) })), [projects]);
  const filteredProjects = useMemo(() => projectRows.filter(({ project, operationalStatus }) => {
    const matchesKeyword = !keyword.trim() || `${project.name} ${project.project_code} ${project.metadata.targetRegion || ""} ${project.metadata.country || ""}`.toLowerCase().includes(keyword.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || operationalStatus.key === statusFilter || statusFilter === "pending" && operationalStatus.key !== "ready";
    return matchesKeyword && matchesStatus;
  }), [keyword, projectRows, statusFilter]);
  const portfolio = useMemo(() => projects.reduce((summary, project) => {
    const status = projectOperationalStatus(project);
    summary.boq += project.summary.totalItems;
    summary.pending += status.key === "ready" ? 0 : 1;
    summary.ready += status.key === "ready" ? 1 : 0;
    return summary;
  }, { boq: 0, pending: 0, ready: 0 }), [projects]);
  if (!projects.length) return null;
  return (
    <section className="overflow-hidden rounded-card border border-borderSoft bg-white">
      <div className="flex flex-col gap-3 border-b border-borderSoft px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <ModuleHeader icon={BriefcaseBusiness} title="项目套价方案" subtitle="聚焦当前待办，完成确认、询价与成果输出" tone="blue" density="compact" />
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-textMuted">
          <div><dt className="inline">项目 </dt><dd className="inline font-bold tabular-nums text-textMain">{projects.length}</dd></div>
          <div><dt className="inline">BOQ </dt><dd className="inline font-bold tabular-nums text-textMain">{portfolio.boq}</dd></div>
          <div><dt className="inline">待处理 </dt><dd className="inline font-bold tabular-nums text-warning">{portfolio.pending}</dd></div>
          <div><dt className="inline">可输出 </dt><dd className="inline font-bold tabular-nums text-success">{portfolio.ready}</dd></div>
        </dl>
      </div>
      <div className="flex flex-col gap-2 border-b border-borderSoft bg-[var(--color-bg-muted)] px-3 py-2.5 md:flex-row md:items-center">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 focus-within:border-primary"><Search className="size-4 text-textMuted" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索项目名称、编号或地区" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none" /></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="筛选项目状态" className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary md:w-40"><option value="all">全部状态</option><option value="pending">全部待处理</option><option value="review">待确认</option><option value="inquiry">待询价</option><option value="backfill">待回填</option><option value="ready">可输出</option></select>
        {(keyword || statusFilter !== "all") ? <button type="button" onClick={() => { setKeyword(""); setStatusFilter("all"); }} className="min-h-9 rounded-md px-3 text-[11px] font-bold text-primary hover:bg-primary-soft">清除筛选</button> : null}
      </div>
      <div className="divide-y divide-borderSoft">{filteredProjects.map(({ project, operationalStatus }) => {
        const active = project.id === currentId;
        const params = new URLSearchParams({ projectId: project.id });
        params.set("view", operationalStatus.view || view || "workspace");
        const completedItems = Math.min(project.summary.totalItems, project.summary.confirmedItems + project.summary.inquiryQuoteItems);
        const completionRate = project.summary.totalItems ? Math.round(completedItems / project.summary.totalItems * 100) : 0;
        return <article key={project.id} className={cn("grid min-w-0 gap-4 px-4 py-4 transition-colors hover:bg-primary-soft/20 xl:grid-cols-[minmax(260px,1.15fr)_minmax(360px,1.35fr)_190px] xl:items-center", active && "bg-primary-soft/30")}>
          <div className="min-w-0"><div className="flex items-center gap-2"><span className={cn("size-2 shrink-0 rounded-full", operationalStatus.key === "ready" ? "bg-success" : operationalStatus.key === "inquiry" ? "bg-warning" : "bg-primary")} /><h3 className="truncate text-[13px] font-bold text-textMain" title={project.name}>{project.name}</h3></div><p className="mt-1.5 truncate pl-4 text-[10.5px] font-semibold text-primary">{project.project_code}</p><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-4 text-[10px] text-textMuted"><span className="inline-flex items-center gap-1"><MapPin className="size-3" />{String(project.metadata.targetRegion || project.metadata.country || "地区待补充")}</span><span>{project.base_currency} · {project.price_term}</span><span>更新 {new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(project.updated_at))}</span></div></div>
          <div className="min-w-0"><div className="grid grid-cols-4 gap-3"><div><p className="text-[9.5px] text-textMuted">BOQ</p><p className="mt-1 text-[15px] font-bold tabular-nums text-textMain">{project.summary.totalItems}</p></div><div><p className="text-[9.5px] text-textMuted">已匹配</p><p className="mt-1 text-[15px] font-bold tabular-nums text-success">{project.summary.matchedItems}</p></div><div><p className="text-[9.5px] text-textMuted">价格缺口</p><p className="mt-1 text-[15px] font-bold tabular-nums text-warning">{project.summary.gapItems}</p></div><div><p className="text-[9.5px] text-textMuted">询价回填</p><p className="mt-1 text-[15px] font-bold tabular-nums text-ai">{project.summary.inquiryQuoteItems}<span className="text-[9px] text-textMuted"> / {project.summary.gapItems}</span></p></div></div><div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`${project.name} 闭环进度`} aria-valuenow={completionRate} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${completionRate}%` }} /></div><span className="w-8 text-right text-[10px] font-bold tabular-nums text-textSecondary">{completionRate}%</span></div></div>
          <div className="flex items-center justify-between gap-3 xl:justify-end"><div className="min-w-0 xl:text-right"><span className={cn("inline-flex whitespace-nowrap rounded px-2 py-1 text-[10px] font-bold", operationalStatus.className)}>{operationalStatus.label}</span><p className="mt-1.5 text-[9.5px] text-textMuted">下一步业务动作</p></div><Link href={`/project-pricing?${params.toString()}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3.5 text-[11px] font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">{operationalStatus.action}<ArrowRight className="size-3.5" /></Link></div>
        </article>;
      })}</div>
      {!filteredProjects.length ? <div className="flex min-h-40 flex-col items-center justify-center border-t border-borderSoft text-center"><Search className="size-7 text-textMuted" /><p className="mt-2 text-[12px] font-bold text-textMain">没有符合条件的套价项目</p><button type="button" onClick={() => { setKeyword(""); setStatusFilter("all"); }} className="mt-2 text-[11px] font-bold text-primary">清除筛选</button></div> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borderSoft px-4 py-2 text-[10px] text-textMuted"><span>显示 {filteredProjects.length} / {projects.length} 个项目</span><span>闭环进度按已确认价格与已回填报价计算</span></div>
    </section>
  );
}
