"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Database,
  Download,
  FileText,
  History,
  Link2,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog, EmptyState, ModuleHeader } from "@/components/common";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { useToast } from "@/hooks/useToast";
import { validateReportCompleteness } from "@/lib/reports/reportValidation";
import {
  buildStructuredReportChapters,
  getReportTemplateSpec,
} from "@/lib/reports/reportTemplates";

type Report = {
  id: string;
  report_code: string;
  title: string;
  report_type: string;
  status: string;
  source_type: string | null;
  source_id: string | null;
  outline: unknown[];
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type EditableChapter = {
  title: string;
  summary: string;
  findings: string;
  evidenceRefs: string;
};

const reviewChecks = [
  ["dataSources", "数据来源已核验"],
  ["confidence", "低置信度记录已复核"],
  ["risks", "高风险结论已确认"],
  ["evidence", "证据附件与引用已检查"],
  ["chapters", "所有章节内容完整"],
] as const;

const statusLabels: Record<string, string> = {
  draft: "草稿",
  pending_review: "待审核",
  approved: "已批准",
  rejected: "已退回",
  archived: "已归档",
};

function contentText(content: unknown, key: string) {
  if (!content || typeof content !== "object" || Array.isArray(content))
    return "";
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      )
    : [];
}

function reportHealth(report: Report) {
  const aiOutput = object(report.content.aiOutput);
  const chapters = Array.isArray(aiOutput.chapters)
    ? aiOutput.chapters.map(object)
    : [];
  const evidence = new Set<string>();
  const chapterStates = (report.outline || []).map((title, index) => {
    const chapter =
      chapters.find((item) => String(item.title) === String(title)) ??
      chapters[index] ??
      {};
    const refs = stringList(chapter.evidenceRefs);
    refs.forEach((item) => evidence.add(item));
    return {
      complete: contentText(chapter, "summary").trim().length >= 10,
      evidenceCount: refs.length,
    };
  });
  const complete = chapterStates.filter((item) => item.complete).length;
  const total = chapterStates.length;
  return {
    chapterStates,
    complete,
    total,
    percent: total ? Math.round((complete / total) * 100) : 0,
    evidenceCount: evidence.size,
  };
}

function formatDate(value: string) {
  return value
    ? new Date(value).toLocaleString("zh-CN", { hour12: false })
    : "未记录";
}

function sourceHref(report: Report) {
  const snapshot = object(report.content.dataSnapshot);
  const linkedContext = object(snapshot.linkedContext);
  const sourceId = report.source_id || contentText(linkedContext, "id");
  const sourceType =
    report.source_type || contentText(linkedContext, "kind").toLowerCase();
  if (!sourceId) return "/ai-report-center";
  if (sourceType?.includes("project")) return `/project-pricing/${sourceId}`;
  if (sourceType?.includes("comparison")) return `/comparisons/${sourceId}`;
  if (sourceType?.includes("inquiry")) return `/inquiries/${sourceId}`;
  return "/ai-report-center";
}

function ReportChapter({
  reportType,
  title,
  index,
  content,
}: {
  reportType: string;
  title: string;
  index: number;
  content: Record<string, unknown>;
}) {
  const aiOutput = object(content.aiOutput);
  const snapshot = object(content.dataSnapshot);
  const chapters = Array.isArray(aiOutput.chapters)
    ? aiOutput.chapters.map(object)
    : [];
  const chapter =
    chapters.find((item) => String(item.title) === title) ??
    chapters[index] ??
    {};
  const chapterSummary = contentText(chapter, "summary");
  const chapterFindings = stringList(chapter.findings);
  const evidenceRefs = stringList(chapter.evidenceRefs);
  const findings = Array.isArray(aiOutput.findings)
    ? aiOutput.findings.map(object)
    : [];
  const kpis = Array.isArray(snapshot.kpis) ? snapshot.kpis.map(object) : [];
  const supplierPerformance = Array.isArray(snapshot.supplierPerformance)
    ? snapshot.supplierPerformance.map(object)
    : [];
  const trendSummary = object(snapshot.trendSummary);
  const isRisk = reportType.includes("风险");
  const isComparison = reportType.includes("对比");
  const isMonthly = reportType.includes("月度");
  const isDecision = reportType.includes("决策");
  const isCost = reportType.includes("成本");
  const recommendation = contentText(aiOutput, "recommendation");
  const fallbackSummary = contentText(aiOutput, "summary");
  const config = object(content.config);
  const structuredChapter =
    buildStructuredReportChapters(reportType, snapshot, aiOutput, {
      project: contentText(content, "project") || "全项目汇总",
      period:
        contentText(config, "startDate") && contentText(config, "endDate")
          ? `${contentText(config, "startDate")} 至 ${contentText(config, "endDate")}`
          : undefined,
      source: contentText(config, "source") || "已保存业务数据快照",
    }).find((item) => item.title === title) ?? null;
  const displaySummary = chapterSummary || structuredChapter?.summary || "";
  const displayFindings = chapterFindings.length
    ? chapterFindings
    : structuredChapter?.findings || [];

  return (
    <section id={`chapter-${index + 1}`} className="scroll-mt-24 py-4">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary-soft text-[12px] font-bold text-primary">
          {index + 1}
        </span>
        <h2 className="text-[15px] font-bold">{title}</h2>
      </div>

      {structuredChapter ? (
        <div className="mt-3 border-l-4 border-ai bg-ai-soft/45 px-4 py-3">
          <p className="text-[10px] font-bold text-ai">领导需要回答</p>
          <p className="mt-1 text-[13px] font-bold leading-6 text-textMain">
            {structuredChapter.leadershipQuestion}
          </p>
        </div>
      ) : null}

      {structuredChapter?.metrics.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {structuredChapter.metrics.map((metric) => (
            <div
              key={metric.label}
              className="min-w-0 border border-borderSoft bg-slate-50 px-3 py-2"
            >
              <p className="truncate text-[10px] text-textMuted">
                {metric.label}
              </p>
              <p className="mt-1 truncate text-[15px] font-bold text-primary">
                {metric.value}
              </p>
              <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-textMuted">
                {metric.interpretation}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {isCost &&
      (title.includes("成本") ||
        title.includes("概况") ||
        title.includes("偏差")) &&
      kpis.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.slice(0, 6).map((item, itemIndex) => (
            <div
              key={`${String(item.label)}-${itemIndex}`}
              className="rounded-md border border-borderSoft bg-slate-50 p-3"
            >
              <p className="text-[10px] text-textMuted">
                {String(item.label ?? "业务指标")}
              </p>
              <p className="mt-1 text-[18px] font-bold text-primary">
                {String(item.value ?? 0)}{" "}
                <span className="text-[10px]">{String(item.unit ?? "")}</span>
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {isComparison &&
      (title.includes("供应商") ||
        title.includes("报价") ||
        title.includes("交付")) ? (
        <div className="mt-3 overflow-hidden rounded-md border border-borderSoft">
          <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] bg-slate-50 px-3 py-2 text-[10px] font-bold text-textMuted">
            <span>供应商</span>
            <span>响应率</span>
            <span>有效回复</span>
          </div>
          {supplierPerformance.length ? (
            supplierPerformance.map((item, itemIndex) => (
              <div
                key={`${String(item.name)}-${itemIndex}`}
                className="grid grid-cols-[minmax(0,1fr)_90px_90px] border-t border-borderSoft px-3 py-2 text-[11px]"
              >
                <span className="truncate font-semibold">
                  {String(item.name ?? "未命名供应商")}
                </span>
                <span>{String(item.response ?? 0)}%</span>
                <span>{String(item.quotes ?? 0)} 次</span>
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-[11px] text-textMuted">
              当前区间暂无供应商回复明细。
            </p>
          )}
        </div>
      ) : null}

      {isMonthly &&
      (title.includes("趋势") ||
        title.includes("指数") ||
        title.includes("波动") ||
        title.includes("展望")) ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["设备价格", trendSummary.equipment],
            ["地材价格", trendSummary.material],
            ["询价任务", trendSummary.inquiry],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-md border border-primary/15 bg-primary-soft/40 p-3"
            >
              <TrendingUp className="size-4 text-primary" />
              <p className="mt-2 text-[10px] text-textMuted">{String(label)}</p>
              <p className="mt-1 text-[14px] font-bold text-primary">
                {String(value ?? "暂无变化")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {isRisk && findings.length ? (
        <div className="mt-3 grid gap-2">
          {findings.slice(0, 6).map((finding, findingIndex) => (
            <div
              key={`${String(finding.code)}-${findingIndex}`}
              className="rounded-md border border-warning/20 bg-warning-soft/45 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-bold text-textMain">
                  {String(finding.title ?? "风险发现")}
                </p>
                <span className="rounded-pill bg-white px-2 py-1 text-[10px] font-bold text-warning">
                  {String(finding.severity ?? "medium")}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-textSecondary">
                {String(finding.detail ?? "")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {isDecision &&
      recommendation &&
      (title.includes("建议") ||
        title.includes("审批") ||
        title.includes("方案")) ? (
        <div className="mt-3 rounded-md border border-ai-border bg-ai-soft p-3">
          <p className="text-[11px] font-bold text-ai">AI 决策建议</p>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-textSecondary">
            {recommendation}
          </p>
        </div>
      ) : null}

      {displaySummary || displayFindings.length ? (
        <div className="mt-3 text-[12px] leading-6 text-textSecondary">
          {displaySummary ? (
            <p className="whitespace-pre-wrap">{displaySummary}</p>
          ) : null}
          {displayFindings.length ? (
            <ul className="mt-3 grid gap-1.5">
              {displayFindings.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[12px] leading-6 text-textSecondary">
          {isDecision &&
          recommendation &&
          (title.includes("建议") || title.includes("审批"))
            ? recommendation
            : index === 0 && fallbackSummary
              ? fallbackSummary
              : "AI 结果未返回本章专属正文，请在人工编辑中补充后再批准。"}
        </p>
      )}

      {structuredChapter?.decisionFocus.length ? (
        <div className="mt-3 border border-warning/20 bg-warning-soft/45 px-3 py-3">
          <p className="text-[11px] font-bold text-warning">本章决策关注</p>
          <ul className="mt-2 grid gap-1.5 text-[11px] leading-5 text-textSecondary">
            {structuredChapter.decisionFocus.map((item) => (
              <li key={item} className="flex gap-2">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {structuredChapter?.actions.length ? (
        <div className="mt-3 overflow-x-auto border border-borderSoft">
          <div className="grid min-w-[620px] grid-cols-[70px_minmax(0,1fr)_120px_110px] bg-slate-50 px-3 py-2 text-[10px] font-bold text-textMuted">
            <span>优先级</span>
            <span>管理动作</span>
            <span>责任角色</span>
            <span>完成时点</span>
          </div>
          {structuredChapter.actions.map((item) => (
            <div
              key={`${item.action}-${item.owner}`}
              className="grid min-w-[620px] grid-cols-[70px_minmax(0,1fr)_120px_110px] border-t border-borderSoft px-3 py-2 text-[11px] leading-5"
            >
              <span
                className={
                  item.priority === "P0"
                    ? "font-bold text-danger"
                    : item.priority === "P1"
                      ? "font-bold text-warning"
                      : "font-bold text-primary"
                }
              >
                {item.priority}
              </span>
              <span className="font-semibold text-textMain">{item.action}</span>
              <span>{item.owner}</span>
              <span>{item.timing}</span>
            </div>
          ))}
        </div>
      ) : null}

      {evidenceRefs.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {evidenceRefs.map((item) => (
            <Link
              key={item}
              href={`/attachments?source=report-detail&keyword=${encodeURIComponent(item)}`}
              className="rounded-pill border border-borderSoft bg-white px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary-soft"
            >
              证据：{item}
            </Link>
          ))}
        </div>
      ) : null}
      {structuredChapter?.dataLinks.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {structuredChapter.dataLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[10px] font-bold text-primary"
            >
              <Link2 className="size-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeEditChapter, setActiveEditChapter] = useState(0);
  const [confirmStatus, setConfirmStatus] = useState<
    "pending_review" | "approved" | "rejected" | "archived" | null
  >(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftOutline, setDraftOutline] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftReviewNotice, setDraftReviewNotice] = useState("");
  const [draftChapters, setDraftChapters] = useState<EditableChapter[]>([]);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewChecklist, setReviewChecklist] = useState<
    Record<string, boolean>
  >({});

  const updateDraftChapter = (
    index: number,
    key: keyof EditableChapter,
    value: string,
  ) => {
    setDraftChapters((current) => {
      const next = [...current];
      next[index] = next[index] ?? {
        title: "",
        summary: "",
        findings: "",
        evidenceRefs: "",
      };
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const applyChapterTemplate = () => {
    if (!report) return;
    const config = object(report.content.config);
    const chapters = buildStructuredReportChapters(
      report.report_type,
      report.content.dataSnapshot,
      report.content.aiOutput,
      {
        project: contentText(report.content, "project") || "全项目汇总",
        period:
          contentText(config, "startDate") && contentText(config, "endDate")
            ? `${contentText(config, "startDate")} 至 ${contentText(config, "endDate")}`
            : undefined,
        source: contentText(config, "source") || "已保存业务数据快照",
        sourceId: report.source_id,
      },
    );
    setDraftOutline(chapters.map((chapter) => chapter.title).join("\n"));
    setDraftChapters(
      chapters.map((chapter) => ({
        title: chapter.title,
        summary: chapter.summary,
        findings: chapter.findings.join("\n"),
        evidenceRefs: chapter.evidenceRefs.join("\n"),
      })),
    );
    if (!draftSummary.trim()) {
      setDraftSummary(
        getReportTemplateSpec(report.report_type).executivePurpose,
      );
    }
    setActiveEditChapter(0);
    setEditing(true);
    toast.success(
      "章节内容模板已应用",
      "已按当前报告类型和业务数据快照补齐内容，请人工核验后保存。",
    );
  };

  const syncDraft = useCallback((next: Report) => {
    setDraftTitle(next.title);
    setDraftOutline((next.outline || []).map(String).join("\n"));
    setDraftSummary(
      contentText(next.content, "manualSummary") ||
        contentText(next.content, "executiveSummary") ||
        contentText(next.content, "summary") ||
        contentText(object(next.content.aiOutput), "summary"),
    );
    setDraftReviewNotice(contentText(next.content, "reviewNotice"));
    const aiOutput = object(next.content.aiOutput);
    const chapters = Array.isArray(aiOutput.chapters)
      ? aiOutput.chapters.map(object)
      : [];
    setDraftChapters(
      (next.outline || []).map((title, index) => {
        const chapter =
          chapters.find((item) => String(item.title) === String(title)) ??
          chapters[index] ??
          {};
        return {
          title: String(title),
          summary: contentText(chapter, "summary"),
          findings: stringList(chapter.findings).join("\n"),
          evidenceRefs: stringList(chapter.evidenceRefs).join("\n"),
        };
      }),
    );
    setReviewNote(contentText(next.content, "reviewNote"));
    setReviewChecklist(
      object(next.content.reviewChecklist) as Record<string, boolean>,
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/reports/${id}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "报告加载失败");
      setReport(payload.data);
      syncDraft(payload.data);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "请稍后重试";
      setLoadError(message);
      toast.warning("报告加载失败", message);
    } finally {
      setLoading(false);
    }
  }, [id, syncDraft, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function patchReport(
    body: Record<string, unknown>,
    successTitle: string,
    successDescription: string,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "报告更新失败");
      setReport(payload.data);
      syncDraft(payload.data);
      setEditing(false);
      setConfirmStatus(null);
      toast.success(successTitle, successDescription);
    } catch (reason) {
      toast.warning(
        "操作失败",
        reason instanceof Error ? reason.message : "请稍后重试",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveContent() {
    if (!report) return;
    const title = draftTitle.trim();
    const outline = draftOutline
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!title) {
      toast.warning("报告名称不能为空", "请填写报告名称后再保存。");
      return;
    }
    if (!outline.length) {
      toast.warning("至少保留一个章节", "请填写章节名称，每行一个章节。");
      return;
    }
    const currentOutput = object(report.content.aiOutput);
    const currentChapters = Array.isArray(currentOutput.chapters)
      ? currentOutput.chapters.map(object)
      : [];
    const config = object(report.content.config);
    const templateChapters = buildStructuredReportChapters(
      report.report_type,
      report.content.dataSnapshot,
      report.content.aiOutput,
      {
        project: contentText(report.content, "project") || "全项目汇总",
        period:
          contentText(config, "startDate") && contentText(config, "endDate")
            ? `${contentText(config, "startDate")} 至 ${contentText(config, "endDate")}`
            : undefined,
        source: contentText(config, "source") || "已保存业务数据快照",
        sourceId: report.source_id,
      },
    );
    const chapters = outline.map((chapterTitle, index) => {
      const currentChapter =
        currentChapters.find(
          (item) => String(item.title) === draftChapters[index]?.title,
        ) ??
        currentChapters[index] ??
        {};
      return {
        ...(templateChapters.find((item) => item.title === chapterTitle) ??
          templateChapters[index] ??
          {}),
        ...currentChapter,
        title: chapterTitle,
        summary: draftChapters[index]?.summary.trim() ?? "",
        findings: (draftChapters[index]?.findings ?? "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        evidenceRefs: (draftChapters[index]?.evidenceRefs ?? "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      };
    });
    const incomplete = chapters.findIndex(
      (chapter) => chapter.summary.length < 10,
    );
    if (incomplete >= 0) {
      toast.warning(
        "章节内容不完整",
        `第 ${incomplete + 1} 章正文至少需要 10 个字符。`,
      );
      return;
    }
    await patchReport(
      {
        title,
        outline,
        content: {
          ...report.content,
          manualSummary: draftSummary.trim(),
          reviewNotice:
            draftReviewNotice.trim() || "AI生成结果必须经人工审核后发布",
          aiOutput: {
            ...object(report.content.aiOutput),
            chapters,
          },
          lastManualEditAt: new Date().toISOString(),
        },
      },
      "报告修改已保存",
      "人工修改已写入报告草稿，可继续编辑或提交审核。",
    );
  }

  async function changeStatus(
    status: "pending_review" | "approved" | "rejected" | "archived",
  ) {
    const descriptions: Record<string, string> = {
      pending_review: "报告已提交人工审核，审核完成前不可继续修改。",
      approved: "报告已由人工批准。",
      rejected: "报告已退回，可修改后重新提交。",
      archived: "报告已归档。",
    };
    await patchReport(
      {
        status,
        ...(status === "approved" || status === "rejected"
          ? { reviewNote, reviewChecklist }
          : {}),
      },
      "报告状态已更新",
      descriptions[status],
    );
  }

  const canEdit = report
    ? ["draft", "rejected"].includes(report.status)
    : false;
  const summary = report
    ? contentText(report.content, "manualSummary") ||
      contentText(report.content, "executiveSummary") ||
      contentText(report.content, "summary") ||
      contentText(object(report.content.aiOutput), "summary")
    : "";
  const riskLevel = String(report?.content?.aiRiskLevel || "medium");
  const health = report ? reportHealth(report) : null;
  const submissionValidation = report
    ? validateReportCompleteness(report.outline, report.content)
    : { valid: false, errors: [] as string[] };
  const draftChapterTitles = draftOutline
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const activeDraftIndex = Math.min(
    activeEditChapter,
    Math.max(0, draftChapterTitles.length - 1),
  );
  const reviewCompleted = reviewChecks.filter(
    ([key]) => reviewChecklist[key] === true,
  ).length;
  const approvalReady =
    reviewNote.trim().length >= 10 && reviewCompleted === reviewChecks.length;
  const workflowSteps = [
    ["draft", "编辑草稿"],
    ["pending_review", "人工审核"],
    ["approved", "正式批准"],
    ["archived", "归档留存"],
  ] as const;
  const currentWorkflowIndex = report
    ? Math.max(
        0,
        workflowSteps.findIndex(([value]) => value === report.status),
      )
    : 0;

  return (
    <AppLayout>
      <div className="space-y-3 pb-6" data-no-global-interaction>
        <PageHeader
          title={report?.title || "报告详情"}
          description="核验章节、业务数据和证据引用，完成人工审核后形成可正式使用的报告档案。"
          actions={
            <>
              <Link
                href="/reports"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold"
              >
                <ArrowLeft className="size-4" />
                报告库
              </Link>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading || busy}
                title="刷新报告数据"
                aria-label="刷新报告数据"
                className="flex size-9 items-center justify-center rounded-md border border-borderSoft bg-white disabled:opacity-50"
              >
                <RefreshCw
                  className={loading ? "size-4 animate-spin" : "size-4"}
                />
              </button>
              {report && canEdit ? (
                <>
                  <button
                    type="button"
                    onClick={applyChapterTemplate}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[13px] font-semibold text-ai"
                  >
                    <Sparkles className="size-4" />
                    应用章节模板
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing((value) => !value)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[13px] font-semibold text-primary"
                  >
                    {editing ? (
                      <X className="size-4" />
                    ) : (
                      <PencilLine className="size-4" />
                    )}
                    {editing ? "退出编辑" : "编辑报告"}
                  </button>
                </>
              ) : null}
              {report ? (
                <a
                  href={`/api/reports/${report.id}/export${["approved", "archived"].includes(report.status) ? "" : "?preview=1"}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-bold text-white"
                >
                  <Download className="size-4" />
                  {["approved", "archived"].includes(report.status)
                    ? "打印/另存PDF"
                    : "水印预览"}
                </a>
              ) : null}
            </>
          }
        />

        {loading ? (
          <section className="flex min-h-72 items-center justify-center rounded-card border border-borderSoft bg-white">
            <LoaderCircle className="size-6 animate-spin text-primary" />
          </section>
        ) : report ? (
          <>
            <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
              <div className="grid grid-cols-2 divide-x divide-y divide-borderSoft lg:grid-cols-4 lg:divide-y-0">
                {workflowSteps.map(([value, label], index) => {
                  const completed = index < currentWorkflowIndex;
                  const active = report.status === value;
                  return (
                    <div
                      key={value}
                      className={`flex min-h-14 items-center gap-2 px-3 ${
                        active
                          ? "bg-primary-soft/60"
                          : completed
                            ? "bg-success-soft/35"
                            : ""
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          completed
                            ? "bg-success text-white"
                            : active
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-textMuted"
                        }`}
                      >
                        {completed ? <Check className="size-3.5" /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] text-textMuted">
                          步骤 {index + 1}
                        </span>
                        <span className="block truncate text-[12px] font-bold">
                          {label}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              {report.status === "rejected" ? (
                <p className="border-t border-danger/15 bg-danger-soft px-3 py-2 text-[11px] font-semibold text-danger">
                  报告已退回修改。请根据审核意见完善章节后重新提交。
                </p>
              ) : null}
            </section>

            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <div>
                  <p className="text-[10px] text-textMuted">报告编号</p>
                  <p
                    className="mt-1 truncate text-[12px] font-bold text-primary"
                    title={report.report_code}
                  >
                    {report.report_code}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">报告类型</p>
                  <p
                    className="mt-1 truncate text-[12px] font-bold"
                    title={report.report_type}
                  >
                    {report.report_type}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">关联项目</p>
                  <p
                    className="mt-1 truncate text-[12px] font-bold"
                    title={
                      contentText(report.content, "project") || "全项目汇总"
                    }
                  >
                    {contentText(report.content, "project") || "全项目汇总"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">报告状态</p>
                  <p className="mt-1 text-[12px] font-bold">
                    {statusLabels[report.status] || report.status}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">章节完整度</p>
                  <p
                    className={`mt-1 text-[12px] font-bold ${health?.percent === 100 ? "text-success" : "text-warning"}`}
                  >
                    {health?.complete}/{health?.total} · {health?.percent}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">AI可信度</p>
                  <p className="mt-1 text-[12px] font-bold text-ai">
                    {Number(report.content?.aiConfidence || 0)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">风险等级</p>
                  <div className="mt-1">
                    <RiskBadge
                      level={
                        (["low", "medium", "high", "critical"].includes(
                          riskLevel,
                        )
                          ? riskLevel
                          : "medium") as "low" | "medium" | "high" | "critical"
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            {editing ? (
              <section className="rounded-card border border-primary/20 bg-white p-4 shadow-card">
                <ModuleHeader
                  icon={PencilLine}
                  title="人工编辑报告"
                  subtitle="修改内容会保留 AI 原始任务与人工编辑时间"
                  tone="blue"
                  density="compact"
                />
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-1 lg:col-span-2">
                    <span className="text-[12px] font-semibold text-textSecondary">
                      报告名称
                    </span>
                    <input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      maxLength={300}
                      className="h-10 rounded-md border border-borderSoft px-3 text-[13px] outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[12px] font-semibold text-textSecondary">
                      章节目录（每行一章）
                    </span>
                    <textarea
                      value={draftOutline}
                      onChange={(event) => setDraftOutline(event.target.value)}
                      className="min-h-40 rounded-md border border-borderSoft p-3 text-[13px] leading-6 outline-none focus:border-primary"
                    />
                  </label>
                  <div className="grid gap-3">
                    <label className="grid gap-1">
                      <span className="text-[12px] font-semibold text-textSecondary">
                        报告摘要 / 人工结论
                      </span>
                      <textarea
                        value={draftSummary}
                        onChange={(event) =>
                          setDraftSummary(event.target.value)
                        }
                        className="min-h-24 rounded-md border border-borderSoft p-3 text-[13px] leading-6 outline-none focus:border-primary"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[12px] font-semibold text-textSecondary">
                        人工复核说明
                      </span>
                      <textarea
                        value={draftReviewNotice}
                        onChange={(event) =>
                          setDraftReviewNotice(event.target.value)
                        }
                        className="min-h-20 rounded-md border border-borderSoft p-3 text-[13px] leading-6 outline-none focus:border-primary"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
                  <nav className="grid content-start gap-1 rounded-md border border-borderSoft bg-slate-50 p-2">
                    <p className="px-2 pb-1 text-[11px] font-bold text-textMuted">
                      逐章人工修改
                    </p>
                    {draftChapterTitles.map((chapterTitle, index) => {
                      const complete =
                        (draftChapters[index]?.summary.trim().length ?? 0) >=
                        10;
                      return (
                        <button
                          key={`${chapterTitle}-${index}`}
                          type="button"
                          onClick={() => setActiveEditChapter(index)}
                          className={`flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-left text-[11px] font-semibold ${
                            activeDraftIndex === index
                              ? "bg-primary text-white"
                              : "text-textSecondary hover:bg-white"
                          }`}
                        >
                          {complete ? (
                            <CheckCircle2 className="size-3.5 shrink-0" />
                          ) : (
                            <CircleAlert className="size-3.5 shrink-0" />
                          )}
                          <span className="truncate">
                            {index + 1}. {chapterTitle}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                  {draftChapterTitles[activeDraftIndex] ? (
                    <div className="min-w-0 rounded-md border border-borderSoft p-3">
                      <p className="text-[12px] font-bold text-primary">
                        {activeDraftIndex + 1}.{" "}
                        {draftChapterTitles[activeDraftIndex]}
                      </p>
                      <label className="mt-3 grid gap-1">
                        <span className="text-[11px] font-semibold text-textSecondary">
                          章节正文
                        </span>
                        <textarea
                          value={draftChapters[activeDraftIndex]?.summary ?? ""}
                          onChange={(event) =>
                            updateDraftChapter(
                              activeDraftIndex,
                              "summary",
                              event.target.value,
                            )
                          }
                          className="min-h-32 rounded-md border border-borderSoft p-3 text-[12px] leading-6 outline-none focus:border-primary"
                        />
                        <span className="text-[10px] text-textMuted">
                          至少 10 个字符，当前{" "}
                          {draftChapters[activeDraftIndex]?.summary.trim()
                            .length ?? 0}{" "}
                          个
                        </span>
                      </label>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <label className="grid gap-1">
                          <span className="text-[11px] font-semibold text-textSecondary">
                            关键结论（每行一项）
                          </span>
                          <textarea
                            value={
                              draftChapters[activeDraftIndex]?.findings ?? ""
                            }
                            onChange={(event) =>
                              updateDraftChapter(
                                activeDraftIndex,
                                "findings",
                                event.target.value,
                              )
                            }
                            className="min-h-24 rounded-md border border-borderSoft p-3 text-[12px] leading-5 outline-none focus:border-primary"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[11px] font-semibold text-textSecondary">
                            证据编号（每行一项）
                          </span>
                          <textarea
                            value={
                              draftChapters[activeDraftIndex]?.evidenceRefs ??
                              ""
                            }
                            onChange={(event) =>
                              updateDraftChapter(
                                activeDraftIndex,
                                "evidenceRefs",
                                event.target.value,
                              )
                            }
                            className="min-h-24 rounded-md border border-borderSoft p-3 text-[12px] leading-5 outline-none focus:border-primary"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-md border border-warning/20 bg-warning-soft p-4 text-[12px] text-warning">
                      请先在章节目录中添加章节。
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-end gap-2 border-t border-borderSoft pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      syncDraft(report);
                      setEditing(false);
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft px-4 text-[12px] font-semibold"
                  >
                    <X className="size-4" />
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveContent()}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    保存修改
                  </button>
                </div>
              </section>
            ) : null}

            <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
                <ModuleHeader
                  icon={FileText}
                  title="报告正文"
                  subtitle={`${report.report_type} · ${health?.complete}/${health?.total} 章内容完整 · ${health?.evidenceCount} 条证据引用`}
                  tone="blue"
                  density="compact"
                />
                {summary ? (
                  <div className="mt-4 border-l-4 border-primary bg-primary-soft/40 px-4 py-3">
                    <p className="text-[11px] font-bold text-primary">
                      报告摘要 / 人工结论
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-textSecondary">
                      {summary}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 border-l-4 border-warning bg-warning-soft px-4 py-3 text-[12px] text-warning">
                    尚未填写报告摘要，提交审核前建议补充人工结论。
                  </p>
                )}
                <div className="mt-3 divide-y divide-borderSoft">
                  {(report.outline || []).map((item, index) => (
                    <ReportChapter
                      key={`${index}-${String(item)}`}
                      reportType={report.report_type}
                      title={String(item)}
                      index={index}
                      content={report.content}
                    />
                  ))}
                </div>
              </section>

              <aside className="space-y-3 xl:sticky xl:top-20">
                <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
                  <ModuleHeader
                    icon={ClipboardCheck}
                    title="章节核验"
                    subtitle={`${health?.complete}/${health?.total} 章完整`}
                    tone="blue"
                    density="compact"
                  />
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        health?.percent === 100
                          ? "h-full bg-success"
                          : "h-full bg-warning"
                      }
                      style={{ width: `${health?.percent ?? 0}%` }}
                    />
                  </div>
                  <nav className="mt-3 grid gap-1">
                    {(report.outline || []).map((item, index) => {
                      const state = health?.chapterStates[index];
                      return (
                        <a
                          key={`${String(item)}-${index}`}
                          href={`#chapter-${index + 1}`}
                          className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold text-textSecondary hover:bg-primary-soft hover:text-primary"
                        >
                          {state?.complete ? (
                            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                          ) : (
                            <CircleAlert className="size-3.5 shrink-0 text-warning" />
                          )}
                          <span className="truncate">
                            {index + 1}. {String(item)}
                          </span>
                          <span className="ml-auto shrink-0 text-[9px] text-textMuted">
                            {state?.evidenceCount ?? 0} 证据
                          </span>
                        </a>
                      );
                    })}
                  </nav>
                </section>

                <section className="rounded-card border border-ai-border bg-white p-3 shadow-card">
                  <ModuleHeader
                    icon={Sparkles}
                    title="AI 判断与来源"
                    subtitle={`置信度 ${Number(report.content?.aiConfidence || 0)}%`}
                    tone="purple"
                    density="compact"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-ai-soft p-2">
                      <p className="text-textMuted">AI可信度</p>
                      <p className="mt-1 text-[17px] font-bold text-ai">
                        {Number(report.content?.aiConfidence || 0)}%
                      </p>
                    </div>
                    <div className="bg-warning-soft p-2">
                      <p className="text-textMuted">证据引用</p>
                      <p className="mt-1 text-[17px] font-bold text-warning">
                        {health?.evidenceCount ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 bg-ai-soft p-3 text-[11px] leading-5 text-textSecondary">
                    {contentText(report.content, "reviewNotice") ||
                      "AI 结果必须经过人工审核，不能直接替代最终商务判断。"}
                  </p>
                  <div className="mt-2 grid gap-2">
                    <Link
                      href={sourceHref(report)}
                      className="flex h-8 items-center justify-center gap-1 rounded-md border border-borderSoft text-[11px] font-bold text-primary"
                    >
                      <Database className="size-3.5" />
                      查看业务来源
                    </Link>
                    {contentText(report.content, "aiTaskId") ? (
                      <Link
                        href={`/ai-workbench?workflow=report_generation&taskId=${encodeURIComponent(contentText(report.content, "aiTaskId"))}`}
                        className="flex h-8 items-center justify-center gap-1 rounded-md border border-ai-border text-[11px] font-bold text-ai"
                      >
                        <Link2 className="size-3.5" />
                        查看 AI 任务 {contentText(report.content, "aiTaskCode")}
                      </Link>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-card border border-warning/20 bg-white p-3 shadow-card">
                  <ModuleHeader
                    icon={ShieldAlert}
                    title="人工审核工作区"
                    subtitle={`当前状态：${statusLabels[report.status] || report.status}`}
                    tone="orange"
                    density="compact"
                  />
                  <div className="mt-3 grid gap-2">
                    {contentText(report.content, "reviewedAt") ? (
                      <div className="bg-slate-50 p-2 text-[10px] leading-5 text-textMuted">
                        <p>
                          审核时间：
                          {formatDate(
                            contentText(report.content, "reviewedAt"),
                          )}
                        </p>
                        <p className="break-words">
                          审核意见：
                          {contentText(report.content, "reviewNote") ||
                            "未填写"}
                        </p>
                      </div>
                    ) : null}
                    {canEdit ? (
                      <>
                        <button
                          disabled={
                            busy || editing || !submissionValidation.valid
                          }
                          onClick={() => setConfirmStatus("pending_review")}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ai text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Send className="size-4" />
                          提交人工审核
                        </button>
                        {!submissionValidation.valid ? (
                          <p className="text-[10px] leading-4 text-warning">
                            暂不能提交：
                            {submissionValidation.errors[0] ||
                              "报告结构尚未完整"}
                          </p>
                        ) : editing ? (
                          <p className="text-[10px] leading-4 text-warning">
                            请先保存或退出编辑，再提交审核。
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {report.status === "pending_review" ? (
                      <>
                        <div className="border border-warning/15 bg-warning-soft/35 p-3">
                          <div className="mb-2 flex items-center justify-between text-[10px] font-bold">
                            <span>审核检查</span>
                            <span
                              className={
                                reviewCompleted === reviewChecks.length
                                  ? "text-success"
                                  : "text-warning"
                              }
                            >
                              {reviewCompleted}/{reviewChecks.length}
                            </span>
                          </div>
                          <div className="grid gap-2">
                            {reviewChecks.map(([key, label]) => (
                              <label
                                key={key}
                                className="flex items-center gap-2 text-[11px] font-semibold text-textSecondary"
                              >
                                <input
                                  type="checkbox"
                                  checked={reviewChecklist[key] === true}
                                  onChange={(event) =>
                                    setReviewChecklist((current) => ({
                                      ...current,
                                      [key]: event.target.checked,
                                    }))
                                  }
                                  className="size-4 accent-success"
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <label className="grid gap-1">
                          <span className="text-[11px] font-semibold text-textSecondary">
                            审核意见 / 退回原因
                          </span>
                          <textarea
                            value={reviewNote}
                            onChange={(event) =>
                              setReviewNote(event.target.value)
                            }
                            placeholder="批准至少填写 10 个字符；退回至少填写 5 个字符"
                            className="min-h-24 rounded-md border border-borderSoft p-3 text-[12px] leading-5 outline-none focus:border-warning"
                          />
                          <span className="text-[10px] text-textMuted">
                            当前 {reviewNote.trim().length} 个字符
                          </span>
                        </label>
                        {!approvalReady ? (
                          <p className="bg-warning-soft px-2 py-1.5 text-[10px] leading-4 text-warning">
                            批准条件：完成全部 {reviewChecks.length}{" "}
                            项检查，并填写至少 10 个字符的审核意见。
                          </p>
                        ) : null}
                        <button
                          disabled={busy || !approvalReady}
                          onClick={() => setConfirmStatus("approved")}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-success text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <CheckCircle2 className="size-4" />
                          批准为正式报告
                        </button>
                        <button
                          disabled={busy || reviewNote.trim().length < 5}
                          onClick={() => setConfirmStatus("rejected")}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-danger/25 bg-danger-soft text-[12px] font-bold text-danger disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <XCircle className="size-4" />
                          退回修改
                        </button>
                      </>
                    ) : null}
                    {report.status === "approved" ? (
                      <button
                        disabled={busy}
                        onClick={() => setConfirmStatus("archived")}
                        className="h-9 rounded-md border border-borderSoft text-[12px] font-bold disabled:opacity-50"
                      >
                        归档报告
                      </button>
                    ) : null}
                    {report.status === "archived" ? (
                      <p className="bg-slate-50 p-3 text-[11px] text-textMuted">
                        已归档报告仅供查阅和正式导出。
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
                  <ModuleHeader
                    icon={History}
                    title="档案记录"
                    subtitle="真实更新时间与审核记录"
                    tone="slate"
                    density="compact"
                  />
                  <dl className="mt-3 grid gap-2 text-[10px]">
                    <div className="flex items-start gap-2">
                      <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-textMuted" />
                      <div>
                        <dt className="text-textMuted">创建时间</dt>
                        <dd className="font-semibold">
                          {formatDate(report.created_at)}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <RefreshCw className="mt-0.5 size-3.5 shrink-0 text-textMuted" />
                      <div>
                        <dt className="text-textMuted">最近更新</dt>
                        <dd className="font-semibold">
                          {formatDate(report.updated_at)}
                        </dd>
                      </div>
                    </div>
                    {contentText(report.content, "lastManualEditAt") ? (
                      <div className="flex items-start gap-2">
                        <PencilLine className="mt-0.5 size-3.5 shrink-0 text-textMuted" />
                        <div>
                          <dt className="text-textMuted">人工修改</dt>
                          <dd className="font-semibold">
                            {formatDate(
                              contentText(report.content, "lastManualEditAt"),
                            )}
                          </dd>
                        </div>
                      </div>
                    ) : null}
                  </dl>
                </section>
              </aside>
            </div>
          </>
        ) : (
          <EmptyState
            title="报告加载失败"
            description={loadError || "报告不存在、已删除或当前账号无权访问。"}
            primaryAction={
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-white"
              >
                重新加载
              </button>
            }
            secondaryAction={
              <Link
                href="/reports"
                className="rounded-md border border-borderSoft bg-white px-4 py-2 text-[12px] font-semibold"
              >
                返回报告库
              </Link>
            }
          />
        )}

        <ConfirmDialog
          open={confirmStatus !== null}
          title={
            confirmStatus === "approved"
              ? "确认批准为正式报告？"
              : confirmStatus === "rejected"
                ? "确认退回报告？"
                : confirmStatus === "archived"
                  ? "确认归档报告？"
                  : "确认提交人工审核？"
          }
          description={
            confirmStatus === "approved"
              ? "批准后报告可正式导出，AI 结论与人工审核记录将共同进入报告档案。"
              : confirmStatus === "rejected"
                ? "报告将返回可编辑状态，退回原因会写入审核记录。"
                : confirmStatus === "archived"
                  ? "归档后报告将转为只读，仍可查阅和导出。"
                  : "提交后报告进入只读审核状态，需审核通过或退回后才能继续流转。"
          }
          confirmLabel={
            confirmStatus === "approved"
              ? "确认批准"
              : confirmStatus === "rejected"
                ? "确认退回"
                : confirmStatus === "archived"
                  ? "确认归档"
                  : "确认提交"
          }
          tone={
            confirmStatus === "rejected"
              ? "danger"
              : confirmStatus === "archived"
                ? "warning"
                : "default"
          }
          onCancel={() => setConfirmStatus(null)}
          onConfirm={() => {
            if (confirmStatus) void changeStatus(confirmStatus);
          }}
        />
      </div>
    </AppLayout>
  );
}
