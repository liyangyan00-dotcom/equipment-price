"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileBarChart2,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleHeader } from "@/components/common";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ReportStatus =
  "draft" | "pending_review" | "approved" | "rejected" | "archived";
type Report = {
  id: string;
  report_code: string;
  title: string;
  report_type: string;
  status: ReportStatus;
  source_type: string | null;
  outline: unknown[];
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
type Summary = {
  total: number;
  draft: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  archived: number;
  highRisk: number;
};
type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};
type Facets = { types: string[]; projects: string[] };

const statusLabel: Record<ReportStatus, string> = {
  draft: "草稿",
  pending_review: "待审核",
  approved: "已批准",
  rejected: "已退回",
  archived: "已归档",
};
const statusStyle: Record<ReportStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_review: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  archived: "bg-primary-soft text-primary",
};

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function chapterHealth(report: Report) {
  const output = object(report.content?.aiOutput);
  const chapters = Array.isArray(output.chapters)
    ? output.chapters.map(object)
    : [];
  const complete = (report.outline || []).filter((title, index) => {
    const chapter =
      chapters.find((item) => String(item.title) === String(title)) ??
      chapters[index];
    return (
      chapter &&
      typeof chapter.summary === "string" &&
      chapter.summary.trim().length >= 10
    );
  }).length;
  const total = report.outline?.length || 0;
  return {
    complete,
    total,
    percent: total ? Math.round((complete / total) * 100) : 0,
  };
}

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const now = new Date();
  const monthPreset = searchParams.get("period") === "month";
  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    draft: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
    highRisk: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    pageCount: 1,
  });
  const [facets, setFacets] = useState<Facets>({ types: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [type, setType] = useState("all");
  const [project, setProject] = useState("all");
  const [risk, setRisk] = useState(searchParams.get("risk") || "all");
  const [dateFrom, setDateFrom] = useState(
    monthPreset
      ? new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .slice(0, 10)
      : "",
  );
  const [dateTo, setDateTo] = useState(
    monthPreset ? now.toISOString().slice(0, 10) : "",
  );
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: "10",
        });
        if (debouncedKeyword) query.set("keyword", debouncedKeyword);
        if (status !== "all") query.set("status", status);
        if (type !== "all") query.set("type", type);
        if (project !== "all") query.set("project", project);
        if (risk !== "all") query.set("risk", risk);
        if (dateFrom) query.set("dateFrom", dateFrom);
        if (dateTo) query.set("dateTo", dateTo);
        const response = await fetch(`/api/reports?${query}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "报告库加载失败");
        if (cancelled) return;
        setError("");
        setReports(payload.data ?? []);
        setSummary(payload.summary);
        setPagination(payload.pagination);
        setFacets(payload.facets ?? { types: [], projects: [] });
        setLastUpdated(new Date());
        setSelectedId((current) =>
          (payload.data ?? []).some((item: Report) => item.id === current)
            ? current
            : payload.data?.[0]?.id || "",
        );
      } catch (reason) {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : "请稍后重试";
        setError(message);
        toast.warning("报告库加载失败", message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    dateFrom,
    dateTo,
    debouncedKeyword,
    page,
    project,
    reloadNonce,
    risk,
    status,
    toast,
    type,
  ]);

  useEffect(() => {
    const supabase = createClient();
    let timer = 0;
    const channel = supabase
      .channel("reports-library-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wpi_reports" },
        () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(
            () => setReloadNonce((current) => current + 1),
            500,
          );
        },
      )
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  const requestReload = () => {
    setLoading(true);
    setError("");
    setReloadNonce((current) => current + 1);
  };

  const selected =
    reports.find((report) => report.id === selectedId) ?? reports[0];
  const selectedHealth = selected ? chapterHealth(selected) : null;
  const kpis = useMemo(
    () => [
      {
        label: "全部报告",
        value: summary.total,
        icon: FileText,
        tone: "text-primary",
        status: "all",
        risk: "all",
      },
      {
        label: "待人工审核",
        value: summary.pendingReview,
        icon: ShieldAlert,
        tone: "text-warning",
        status: "pending_review",
        risk: "all",
      },
      {
        label: "高风险报告",
        value: summary.highRisk,
        icon: CircleAlert,
        tone: "text-danger",
        status: "all",
        risk: "highRisk",
      },
      {
        label: "已退回",
        value: summary.rejected,
        icon: FileBarChart2,
        tone: "text-danger",
        status: "rejected",
        risk: "all",
      },
      {
        label: "已批准",
        value: summary.approved,
        icon: CheckCircle2,
        tone: "text-success",
        status: "approved",
        risk: "all",
      },
      {
        label: "已归档",
        value: summary.archived,
        icon: Archive,
        tone: "text-ai",
        status: "archived",
        risk: "all",
      },
    ],
    [summary],
  );
  const resetFilters = () => {
    setKeyword("");
    setStatus("all");
    setType("all");
    setProject("all");
    setRisk("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };
  const activeFilters = [
    debouncedKeyword ? `关键词：${debouncedKeyword}` : "",
    status !== "all" ? `状态：${statusLabel[status as ReportStatus]}` : "",
    type !== "all" ? `类型：${type}` : "",
    project !== "all" ? `项目：${project}` : "",
    risk !== "all" ? `风险：${risk === "highRisk" ? "高及严重" : risk}` : "",
    dateFrom || dateTo
      ? `日期：${dateFrom || "不限"} 至 ${dateTo || "不限"}`
      : "",
  ].filter(Boolean);
  const selectedAction =
    selected?.status === "pending_review"
      ? "进入人工审核"
      : selected?.status === "approved" || selected?.status === "archived"
        ? "查看正式报告"
        : "继续完善报告";

  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader
          title="AI 报告库"
          description="优先处理待审核与高风险报告，按项目、模板和状态追踪报告全生命周期。"
          actions={
            <>
              <span className="hidden text-[11px] text-textMuted xl:inline">
                实时联动
                {lastUpdated
                  ? ` · ${lastUpdated.toLocaleTimeString("zh-CN", { hour12: false })}`
                  : ""}
              </span>
              <Link
                href="/ai-report-center"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-ai px-3 text-[13px] font-bold text-white"
              >
                <Sparkles className="size-4" />
                生成报告
              </Link>
            </>
          }
        />
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((item) => {
            const KpiIcon = item.icon;
            const active = status === item.status && risk === item.risk;
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  setStatus(item.status);
                  setRisk(item.risk);
                  setPage(1);
                }}
                className={cn(
                  "flex min-h-20 items-center gap-3 rounded-card border border-borderSoft bg-white p-3 text-left transition hover:border-primary/30",
                  active && "border-primary bg-primary-soft/30",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-50",
                    item.tone,
                  )}
                >
                  <KpiIcon className="size-5" />
                </span>
                <span>
                  <span className="block text-[11px] font-semibold text-textMuted">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-[22px] font-bold tabular-nums text-textMain">
                    {item.value}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
        <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
          <div className="grid gap-2 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(130px,1fr))]">
            <label className="flex h-9 items-center gap-2 rounded-md border border-borderSoft px-3">
              <Search className="size-4 text-textMuted" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="报告名称或编号"
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
              />
            </label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
            >
              <option value="all">全部状态</option>
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
            >
              <option value="all">全部报告类型</option>
              {facets.types.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={project}
              onChange={(event) => {
                setProject(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
            >
              <option value="all">全部项目</option>
              {facets.projects.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={risk}
              onChange={(event) => {
                setRisk(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
            >
              <option value="all">全部风险</option>
              <option value="highRisk">高及严重风险</option>
              <option value="low">低风险</option>
              <option value="medium">中风险</option>
              <option value="high">高风险</option>
              <option value="critical">严重风险</option>
            </select>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-textSecondary">
              更新时间
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="h-8 rounded-md border border-borderSoft px-2 text-[11px]"
            />
            <span className="text-[11px] text-textMuted">至</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="h-8 rounded-md border border-borderSoft px-2 text-[11px]"
            />
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 rounded-md border border-borderSoft px-3 text-[11px] font-semibold"
            >
              重置
            </button>
            <button
              type="button"
              onClick={requestReload}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[11px] font-bold text-primary"
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
              />
              刷新
            </button>
          </div>
          {activeFilters.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-borderSoft pt-2">
              <span className="text-[10px] font-bold text-textMuted">
                当前条件
              </span>
              {activeFilters.map((item) => (
                <span
                  key={item}
                  className="max-w-56 truncate rounded-pill bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary"
                  title={item}
                >
                  {item}
                </span>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className="text-[10px] font-bold text-danger"
              >
                清除全部
              </button>
            </div>
          ) : null}
        </section>
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="border-b border-borderSoft p-3">
              <ModuleHeader
                icon={FileText}
                title="报告列表"
                subtitle={`筛选结果 ${pagination.total} 条 · 第 ${pagination.page}/${pagination.pageCount} 页`}
                tone="blue"
                density="compact"
              />
            </div>
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="h-11 animate-pulse rounded-md bg-slate-100"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
                <ShieldAlert className="size-8 text-danger" />
                <p className="mt-3 text-[13px] font-bold">报告数据加载失败</p>
                <p className="mt-1 text-[11px] text-textMuted">{error}</p>
                <button
                  type="button"
                  onClick={requestReload}
                  className="mt-3 h-8 rounded-md bg-primary px-3 text-[11px] font-bold text-white"
                >
                  重新加载
                </button>
              </div>
            ) : reports.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-[12px]">
                  <thead className="h-10 bg-slate-50 text-textSecondary">
                    <tr>
                      <th className="px-3">报告编号</th>
                      <th className="px-3">报告名称</th>
                      <th className="px-3">类型</th>
                      <th className="px-3">项目</th>
                      <th className="px-3">章节完整度</th>
                      <th className="px-3">状态</th>
                      <th className="px-3">更新时间</th>
                      <th className="px-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => {
                      const health = chapterHealth(report);
                      return (
                        <tr
                          key={report.id}
                          onClick={() => setSelectedId(report.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedId(report.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "h-12 cursor-pointer border-t border-borderSoft outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                            selected?.id === report.id && "bg-primary-soft/50",
                          )}
                        >
                          <td className="whitespace-nowrap px-3 font-bold text-primary">
                            {report.report_code}
                          </td>
                          <td
                            className="max-w-64 truncate px-3 font-semibold"
                            title={report.title}
                          >
                            {report.title}
                          </td>
                          <td
                            className="max-w-44 truncate px-3"
                            title={report.report_type}
                          >
                            {report.report_type}
                          </td>
                          <td
                            className="max-w-36 truncate px-3"
                            title={String(
                              report.content?.project || "全项目汇总",
                            )}
                          >
                            {String(report.content?.project || "全项目汇总")}
                          </td>
                          <td className="px-3">
                            <div className="flex min-w-24 items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={cn(
                                    "h-full",
                                    health.percent === 100
                                      ? "bg-success"
                                      : "bg-warning",
                                  )}
                                  style={{ width: `${health.percent}%` }}
                                />
                              </div>
                              <span
                                className={cn(
                                  "whitespace-nowrap text-[10px] font-bold",
                                  health.percent === 100
                                    ? "text-success"
                                    : "text-warning",
                                )}
                              >
                                {health.complete}/{health.total}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 text-right">
                            <span
                              className={cn(
                                "whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold",
                                statusStyle[report.status],
                              )}
                            >
                              {statusLabel[report.status]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 text-textMuted">
                            {new Date(report.updated_at).toLocaleString(
                              "zh-CN",
                              {
                                hour12: false,
                              },
                            )}
                          </td>
                          <td className="px-3">
                            <Link
                              href={`/reports/${report.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="font-bold text-primary"
                            >
                              查看
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <FileText className="size-9 text-textMuted" />
                <p className="mt-3 text-[14px] font-bold">没有符合条件的报告</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 text-[12px] font-bold text-primary"
                >
                  清除筛选条件
                </button>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-borderSoft px-3 py-2">
              <span className="text-[11px] text-textMuted">
                共 {pagination.total} 条
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="min-w-12 text-center text-[11px] font-bold">
                  {page}/{pagination.pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.pageCount}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.pageCount, current + 1),
                    )
                  }
                  className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </section>
          <aside className="rounded-card border border-ai-border bg-white p-3 shadow-card xl:sticky xl:top-20">
            <ModuleHeader
              icon={Sparkles}
              title="报告审核摘要"
              subtitle="AI 生成内容必须经人工确认"
              tone="purple"
              density="compact"
            />
            {selected ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="truncate font-bold" title={selected.title}>
                    {selected.title}
                  </p>
                  <p className="mt-1 text-[11px] text-textMuted">
                    {selected.report_code}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-ai-soft p-2">
                    <p className="text-[10px] text-textMuted">AI可信度</p>
                    <p className="mt-1 text-[20px] font-bold text-ai">
                      {Number(selected.content?.aiConfidence || 0)}%
                    </p>
                  </div>
                  <div className="rounded-md bg-warning-soft p-2">
                    <p className="text-[10px] text-textMuted">AI风险</p>
                    <p className="mt-1 truncate text-[14px] font-bold text-warning">
                      {String(selected.content?.aiRiskLevel || "待核验")}
                    </p>
                  </div>
                </div>
                <p className="rounded-md border border-ai-border bg-ai-soft/50 p-3 text-[11px] leading-5 text-textSecondary">
                  当前状态为“{statusLabel[selected.status]}
                  ”。AI结论必须结合原始证据与人工判断使用。
                </p>
                <div className="rounded-md border border-borderSoft bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-textSecondary">
                      章节完整度
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        selectedHealth?.percent === 100
                          ? "text-success"
                          : "text-warning",
                      )}
                    >
                      {selectedHealth?.complete}/{selectedHealth?.total} ·{" "}
                      {selectedHealth?.percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className={cn(
                        "h-full",
                        selectedHealth?.percent === 100
                          ? "bg-success"
                          : "bg-warning",
                      )}
                      style={{ width: `${selectedHealth?.percent ?? 0}%` }}
                    />
                  </div>
                  <dl className="mt-3 grid gap-1.5 text-[10px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-textMuted">项目</dt>
                      <dd
                        className="max-w-48 truncate font-semibold"
                        title={String(
                          selected.content?.project || "全项目汇总",
                        )}
                      >
                        {String(selected.content?.project || "全项目汇总")}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-textMuted">数据时间</dt>
                      <dd className="font-semibold">
                        {new Date(selected.updated_at).toLocaleString("zh-CN", {
                          hour12: false,
                        })}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-textMuted">AI任务</dt>
                      <dd className="max-w-40 truncate font-semibold">
                        {String(selected.content?.aiTaskCode || "未关联")}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/reports/${selected.id}`}
                    className="flex h-9 items-center justify-center rounded-md bg-primary text-[12px] font-bold text-white"
                  >
                    {selectedAction}
                  </Link>
                  <a
                    href={`/api/reports/${selected.id}/export${["approved", "archived"].includes(selected.status) ? "" : "?preview=1"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 items-center justify-center gap-2 rounded-md border border-borderSoft text-center text-[11px] font-bold"
                  >
                    <Download className="size-4" />
                    {["approved", "archived"].includes(selected.status)
                      ? "打印/另存PDF"
                      : "水印预览"}
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-textMuted">请选择报告。</p>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsPageContent />
    </Suspense>
  );
}
