"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gauge,
  LineChart,
  PieChart,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiBadge } from "@/components/badges/AiBadge";
import { EmptyState, KpiGrid, ModuleHeader } from "@/components/common";
import {
  AnalyticsChartCard,
  DonutChart,
  HorizontalBarList,
  MultiLineChart,
} from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsRound8DPanel } from "@/components/round8d/AnalyticsRound8DPanel";
import { useMockToast } from "@/hooks/useMockToast";
import type { AnalyticsPayload } from "@/types/analytics";

const kpiIcons = [BarChart3, CalendarClock, Users, Brain, ShieldAlert, Gauge];
const kpiTones = ["blue", "cyan", "green", "purple", "red", "orange"] as const;

function AnalysisNote({
  insight,
  index,
  busy,
  canManage,
  onDrilldown,
  onManage,
}: {
  insight: AnalyticsPayload["insights"][number];
  index: number;
  busy: boolean;
  canManage: boolean;
  onDrilldown: () => void;
  onManage: () => void;
}) {
  const tones = [
    "border-ai-border bg-ai-soft text-ai",
    "border-primary/15 bg-primary-soft text-primary",
    "border-success/15 bg-success-soft text-success",
    "border-warning/20 bg-warning-soft text-[#B45309]",
  ];

  return (
    <div className={`rounded-[8px] border px-3 py-2 text-[12px] font-medium leading-5 ${tones[index % tones.length]}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1">{insight.text}</span>
        <button type="button" onClick={onDrilldown} className="inline-flex shrink-0 items-center gap-1 pt-0.5 font-bold">
          {insight.action}
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-current/10 pt-1.5 text-[10px] font-semibold opacity-90">
        <span>{insight.priority} · {insight.status}</span>
        <span>责任：{insight.ownerRole}{insight.actionItem ? "" : "（建议）"}</span>
        <span>期限：{insight.actionItem?.dueDate ?? insight.deadline}{insight.actionItem ? "" : "（建议）"}</span>
        <span className="min-w-0 truncate" title={insight.impact}>影响：{insight.impact}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold ${insight.actionItem?.overdue ? "text-danger" : ""}`}>
          {insight.actionItem
            ? `${insight.actionItem.code} · ${insight.actionItem.status === "open" ? "待认领" : insight.actionItem.status === "in_progress" ? "处理中" : "已完成"}${insight.actionItem.overdue ? " · 已逾期" : ""}`
            : "尚未创建整改任务"}
        </span>
        {canManage && insight.status !== "正常" ? (
          <button type="button" disabled={busy} onClick={onManage} className="h-7 shrink-0 rounded-md border border-current/20 bg-white px-2.5 text-[10px] font-bold disabled:opacity-60">
            {busy ? "处理中" : !insight.actionItem || insight.actionItem.status === "resolved" ? "创建整改任务" : insight.actionItem.status === "open" ? "认领处理" : "标记完成"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const toast = useMockToast();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [objectType, setObjectType] = useState<"all" | "equipment" | "material">("all");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [riskFocus, setRiskFocus] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(
    async (requestedRange: 7 | 30 | 90, requestedObjectType: "all" | "equipment" | "material", silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/analytics?range=${requestedRange}&objectType=${requestedObjectType}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: AnalyticsPayload;
          error?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.error || "统计分析数据读取失败");
        setData(payload.data);
        setRange(payload.data.rangeDays);
        setObjectType(payload.data.objectType);
        setError("");
        return payload.data;
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "统计分析数据读取失败",
        );
        return null;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedRange = Number(params.get("range"));
    const initialRange = ([7, 30, 90].includes(requestedRange) ? requestedRange : 30) as 7 | 30 | 90;
    const requestedObject = params.get("objectType");
    const initialObject = requestedObject === "equipment" || requestedObject === "material" ? requestedObject : "all";
    const timer = window.setTimeout(() => void load(initialRange, initialObject), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const syncLocation = (nextRange: 7 | 30 | 90, nextObjectType: "all" | "equipment" | "material") => {
    const params = new URLSearchParams(window.location.search);
    params.set("range", String(nextRange));
    params.set("objectType", nextObjectType);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  const updateRange = (value: 7 | 30 | 90) => {
    setRange(value);
    setRiskFocus(false);
    toast.info("正在更新统计范围", `正在读取近 ${value} 天真实业务数据。`);
    syncLocation(value, objectType);
    void load(value, objectType, true);
  };

  const updateObjectType = (value: "all" | "equipment" | "material") => {
    setObjectType(value);
    setRiskFocus(false);
    syncLocation(range, value);
    toast.info("正在切换分析对象", value === "all" ? "正在汇总设备与地材数据。" : `正在读取${value === "equipment" ? "设备" : "地材"}业务数据。`);
    void load(range, value, true);
  };

  const refreshAnalysis = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    toast.info("正在刷新统计数据", `正在重新聚合近 ${range} 天真实业务数据。`);
    const result = await load(range, objectType, true);
    setAiBusy(false);
    if (result)
      toast.success(
        "统计数据已更新",
        "指标与规则摘要已按统一时间口径重新计算。",
      );
  };

  const exportAnalysis = () => {
    if (!data) return;
    const rows: Array<Array<string | number>> = [
      ["统计范围", `近${data.rangeDays}天`],
      ["生成时间", data.generatedAt],
      ["分析对象", data.objectType === "all" ? "全部" : data.objectType === "equipment" ? "设备" : "地材"],
      ["价格日期范围", `${data.dataBasis.periodStart.slice(0, 10)} 至 ${data.dataBasis.periodEnd.slice(0, 10)}`],
      ["价格日期规则", data.dataBasis.priceDateRule],
      ["标准币种", data.dataBasis.normalizedCurrency],
      ["周期内正式价格", data.dataBasis.periodFormalPriceCount],
      ["有效趋势观测", data.dataBasis.priceSampleCount],
      ["可比价格篮子", data.dataBasis.comparableBasketCount],
      ["缺少价格日期", data.dataBasis.missingPriceDateCount],
      ["决策就绪状态", data.decisionReadiness.label],
      ["决策阻断原因", data.decisionReadiness.reasons.join("；")],
      [],
      ["指标", "数值", "单位", "趋势", "说明"],
      ...data.kpis.map((item) => [
        item.label,
        item.value,
        item.unit,
        item.trend,
        item.description,
      ]),
      [],
      ["风险等级", "数量"],
      ...data.riskDistribution.map((item) => [item.name, item.value]),
      ["待审核线索风险", "总数", "低风险", "中风险", "高风险"],
      ["线索", data.leadRiskSummary.total, data.leadRiskSummary.low, data.leadRiskSummary.medium, data.leadRiskSummary.high],
      [],
      ["价格缺口", "数量", "占比"],
      ...data.priceGapAnalysis.map((item) => [
        item.label,
        item.value,
        item.percent,
      ]),
      [],
      ["供应商响应总览", "数值"],
      ["发送次数", data.supplierResponseSummary.sent],
      ["回复次数", data.supplierResponseSummary.replied],
      ["有效报价", data.supplierResponseSummary.validQuotes],
      ["全量加权响应率", data.supplierResponseSummary.sent ? `${data.supplierResponseSummary.responseRate}%` : "无样本"],
      ["有效报价率", data.supplierResponseSummary.sent ? `${data.supplierResponseSummary.validQuoteRate}%` : "无样本"],
      ["涉及供应商", data.supplierResponseSummary.supplierCount],
      ["未回复供应商", data.supplierResponseSummary.noResponseSupplierCount],
      [],
      ["重点供应商", "响应率", "有效报价", "发送次数"],
      ...data.supplierPerformance.map((item) => [item.name, `${item.response}%`, item.quotes, item.sent]),
      [],
      ["AI流程", "完成率", "任务数", "完成", "失败", "待人工审核"],
      ...data.aiEfficiency.map((item) => [item.label, item.total ? `${item.value}%` : "无任务", item.total, item.completed, item.failed, item.needsReview]),
      [],
      ["经营结论", "优先级", "状态", "责任角色", "完成期限", "预计影响", "整改任务", "任务状态", "处置入口"],
      ...data.insights.map((item) => [item.text, item.priority, item.status, item.ownerRole, item.actionItem?.dueDate ?? item.deadline, item.impact, item.actionItem?.code ?? "未创建", item.actionItem?.status ?? "建议", item.route]),
      [],
      ["运行保障", "状态"],
      ["即时校验", data.operations.status],
      ["后台巡检", data.operations.monitoringEnabled ? "在线" : "未就绪"],
      ["最近巡检", data.operations.lastCheckedAt ?? "无"],
      ["运行信息", data.operations.message],
      ...data.operations.checks.map((item) => [item.label, item.status, item.detail]),
      ...(data.operations.activeIncident ? [["活动事件", data.operations.activeIncident.title, data.operations.activeIncident.message, data.operations.activeIncident.occurrenceCount]] : []),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `统计分析-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(
      "分析数据已导出",
      `已导出近 ${data.rangeDays} 天真实统计数据。`,
    );
  };

  const manageInsight = async (insight: AnalyticsPayload["insights"][number]) => {
    if (!data || actionBusy) return;
    setActionBusy(insight.id);
    try {
      const existing = insight.actionItem;
      const response = await fetch("/api/analytics/actions", {
        method: !existing || existing.status === "resolved" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(!existing || existing.status === "resolved" ? {
          actionKey: insight.id,
          objectType: data.objectType,
          priority: insight.priority,
          title: insight.text,
          ownerRole: insight.ownerRole,
          dueDate: insight.deadline,
          impact: insight.impact,
          remediationHref: insight.route,
          sourceSnapshot: {
            generatedAt: data.generatedAt,
            rangeDays: data.rangeDays,
            decisionReadiness: data.decisionReadiness.status,
          },
        } : {
          id: existing.id,
          status: existing.status === "open" ? "in_progress" : "resolved",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "整改任务操作失败");
      await load(range, objectType, true);
      toast.success("整改任务已更新", !existing || existing.status === "resolved" ? "已生成正式任务，可持续跟踪责任和期限。" : existing.status === "open" ? "任务已认领并进入处理中。" : "整改任务已标记完成。");
    } catch (reason) {
      toast.danger("整改任务更新失败", reason instanceof Error ? reason.message : "请稍后重试。");
    } finally {
      setActionBusy(null);
    }
  };

  const handleDrilldown = (route: string, label: string, extra: Record<string, string> = {}) => {
    if (!data) return;
    if (route.includes("risk=high")) {
      setRiskFocus(true);
      toast.warning(
        "正在打开高风险明细",
        "已带入当前分析对象和价格所属日期。",
      );
      if (route.startsWith("/analytics") && objectType === "all") return;
      extra.risk = "high";
    }
    toast.info("指标钻取", `正在进入${label}对应业务页面。`);
    const [pathname, rawQuery = ""] = route.split("?");
    const params = new URLSearchParams(rawQuery);
    params.set("source", "analytics");
    params.set("dateFrom", data.dataBasis.periodStart.slice(0, 10));
    params.set("dateTo", data.dataBasis.periodEnd.slice(0, 10));
    params.set("objectType", objectType);
    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    if (pathname === "/equipment-prices" && params.has("risk")) {
      params.set("riskLevel", params.get("risk") || "high");
      params.delete("risk");
    }
    if (pathname.startsWith("/inquiries")) {
      params.set("startDate", data.dataBasis.periodStart.slice(0, 10));
      params.set("endDate", data.dataBasis.periodEnd.slice(0, 10));
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  if (loading && !data) {
    return (
      <AppLayout>
        <AnalyticsSkeleton />
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <EmptyState
          title="统计分析数据加载失败"
          description={error || "当前组织没有返回可用的统计数据。"}
          primaryAction={
            <button
              type="button"
              onClick={() => void load(range, objectType)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-white"
            >
              <RefreshCw className="size-4" />
              重新加载
            </button>
          }
        />
      </AppLayout>
    );
  }

  const activeRange = data.rangeDays;
  const trendData = data.priceTrendSeries;
  const trendSummary = data.trendSummary;
  const operations: AnalyticsPayload["operations"] = data.operations ?? {
    status: "unknown",
    monitoringEnabled: false,
    intervalMinutes: 15,
    scopeLabel: "当前对象",
    lastCheckedAt: null,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    message: "等待后台巡检返回运行状态",
    activeIncident: null,
    checks: [],
  };
  const formalRiskSummary = data.formalRiskSummary ?? {
    equipment: { total: 0, high: 0 },
    material: { total: 0, high: 0 },
  };
  const priceRoute = objectType === "equipment" ? "/equipment-prices" : objectType === "material" ? "/material-prices" : "/analytics?focus=prices";
  const riskRoute = objectType === "all" ? "/analytics?risk=high" : `${priceRoute}?risk=high`;
  const kpiRoutes = [priceRoute, priceRoute, "/inquiries", "/ai-workbench", riskRoute, "/price-leads"];
  const kpis = data.kpis.map((item, index) => ({
    ...item,
    icon: kpiIcons[index],
    tone: kpiTones[index],
    onClick: (objectType === "all" && index < 2) || index === 5
      ? undefined
      : () => handleDrilldown(kpiRoutes[index], item.label),
  }));
  const priceSeries = [
    {
      name: "设备可比价格指数",
      color: "#2F6BFF",
      values: trendData.map((item) => item.equipment),
    },
    {
      name: "地材可比价格指数",
      color: "#22A06B",
      values: trendData.map((item) => item.material),
    },
  ];

  return (
    <AppLayout>
      <div
        className="space-y-3"
        data-no-global-interaction
        aria-busy={refreshing}
      >
        <PageHeader
          title="统计分析"
          description={`区分全部库存与近${activeRange}天业务数据，按价格所属日期支持趋势判断与风险复核。`}
          actions={
            <>
              <button
                onClick={exportAnalysis}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[13px] font-semibold text-primary"
                type="button"
              >
                <Download className="size-4" />
                导出分析
              </button>
              <button
                onClick={refreshAnalysis}
                disabled={aiBusy}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-primary disabled:cursor-wait disabled:opacity-70"
                type="button"
              >
                <RefreshCw
                  className={`size-4 ${aiBusy ? "animate-spin" : ""}`}
                />
                {aiBusy ? "数据刷新中…" : "刷新统计数据"}
              </button>
            </>
          }
        />

        {error ? (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-warning/20 bg-warning-soft px-3 py-2 text-[11px] font-semibold text-warning"
            role="status"
          >
            <span className="min-w-0 truncate">
              刷新失败，当前显示上一次成功数据：{error}
            </span>
            <button
              type="button"
              onClick={() => void load(range, objectType, true)}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-warning/25 bg-white px-2"
            >
              <RefreshCw className="size-3.5" />
              重试
            </button>
          </div>
        ) : null}

        <AnalyticsRound8DPanel
          range={range}
          objectType={objectType}
          onRangeChange={updateRange}
          onObjectTypeChange={updateObjectType}
          onDrilldown={handleDrilldown}
        />

        <section className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-primary/15 bg-primary-soft px-3.5 py-2.5 text-[11px] text-textSecondary">
          <span className="inline-flex items-center gap-1.5 font-bold text-primary">
            <CalendarClock className="size-3.5" />
            数据口径
          </span>
          <span>
            价格范围：{data.dataBasis.periodStart.slice(0, 10)} 至{" "}
            {data.dataBasis.periodEnd.slice(0, 10)}
          </span>
          <span>价格日期：{data.dataBasis.priceDateRule}</span>
          <span>分析对象：{objectType === "all" ? "全部" : objectType === "equipment" ? "设备" : "地材"}</span>
          <span>标准币种：{data.dataBasis.normalizedCurrency}</span>
          <span>可比价格篮子：{data.dataBasis.comparableBasketCount} 组</span>
          <span>有效趋势观测：{data.dataBasis.priceSampleCount} 条</span>
          {data.dataBasis.missingPriceDateCount > 0 ? (
            <span className="font-semibold text-warning">
              {data.dataBasis.missingPriceDateCount} 条缺少价格日期，未进入区间与趋势统计
            </span>
          ) : null}
          {data.truncated ? (
            <span className="font-semibold text-danger">
              数据达到查询上限，当前结论可能不完整
            </span>
          ) : null}
        </section>

        <section className={`flex flex-wrap items-center justify-between gap-3 rounded-card border px-4 py-3 shadow-card ${data.decisionReadiness.status === "blocked" ? "border-danger/25 bg-danger-soft" : data.decisionReadiness.status === "warning" ? "border-warning/25 bg-warning-soft" : "border-success/20 bg-success-soft"}`} role="status">
          <div className="flex min-w-0 items-start gap-3">
            {data.decisionReadiness.status === "ready" ? <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" /> : <ShieldAlert className={`mt-0.5 size-5 shrink-0 ${data.decisionReadiness.status === "blocked" ? "text-danger" : "text-warning"}`} />}
            <div className="min-w-0">
              <p className={`text-[14px] font-bold ${data.decisionReadiness.status === "blocked" ? "text-danger" : data.decisionReadiness.status === "warning" ? "text-warning" : "text-success"}`}>{data.decisionReadiness.label}</p>
              <p className="mt-1 text-[11px] leading-5 text-textSecondary">{data.decisionReadiness.reasons.join("；")}</p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-textSecondary">系统口径判断，最终商务结论仍需人工审批</span>
        </section>

        <section className="rounded-card border border-borderSoft bg-white p-3.5 shadow-card">
          <ModuleHeader
            icon={ShieldCheck}
            title="数据运行保障"
            subtitle={`${operations.scopeLabel}即时校验；后台每 ${operations.intervalMinutes} 分钟执行全库巡检`}
            tone={operations.status === "critical" ? "red" : operations.status === "warning" ? "orange" : "green"}
            density="compact"
            action={
              <span className={`inline-flex h-7 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-bold ${operations.status === "healthy" ? "bg-success-soft text-success" : operations.status === "critical" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>
                {operations.status === "healthy" ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                {operations.scopeLabel} · {operations.status === "healthy" ? "运行正常" : operations.status === "critical" ? "严重异常" : operations.status === "warning" ? "需要关注" : "等待巡检"}
              </span>
            }
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {operations.checks.map((check) => (
              <div key={check.key} className={`min-w-0 rounded-[8px] border px-3 py-2 ${check.status === "passed" ? "border-success/15 bg-success-soft/50" : check.status === "failed" ? "border-danger/20 bg-danger-soft/50" : "border-warning/20 bg-warning-soft/50"}`}>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-textMain">
                  {check.status === "passed" ? <CheckCircle2 className="size-3.5 shrink-0 text-success" /> : <AlertTriangle className={`size-3.5 shrink-0 ${check.status === "failed" ? "text-danger" : "text-warning"}`} />}
                  <span className="truncate">{check.label}</span>
                </div>
                <p className="mt-1 truncate text-[10px] text-textSecondary" title={check.detail}>{check.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-borderSoft pt-2.5 text-[11px] text-textSecondary">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />最近巡检：{operations.lastCheckedAt ? new Date(operations.lastCheckedAt).toLocaleString("zh-CN", { hour12: false }) : "等待首次后台巡检"}</span>
              <span>全库连续异常 {operations.consecutiveFailures} 次</span>
              <span>全库连续正常 {operations.consecutiveSuccesses} 次</span>
              <span className={operations.monitoringEnabled ? "font-semibold text-success" : "font-semibold text-warning"}>{operations.monitoringEnabled ? "后台巡检在线" : "后台巡检尚未就绪"}</span>
            </div>
            <button type="button" onClick={() => router.push("/ai-workbench?panel=operations")} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2.5 font-bold text-primary">
              查看运行事件
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
          {operations.activeIncident ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger" role="alert">
              <span><strong>{operations.activeIncident.scopeLabel}事件 · {operations.activeIncident.title}</strong>：{operations.activeIncident.message}（事件累计 {operations.activeIncident.occurrenceCount} 次）</span>
              <button type="button" onClick={() => router.push("/ai-workbench?panel=operations")} className="h-7 rounded-md border border-danger/20 bg-white px-2.5 font-bold">立即处理</button>
            </div>
          ) : null}
        </section>

        <KpiGrid items={kpis} />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
          <AnalyticsChartCard
            icon={LineChart}
            title="同口径可比价格指数"
            subtitle={`近${activeRange}天按名称、规格、单位和地区匹配，基期为 100`}
            tone="blue"
            action={<AiBadge label="真实数据" />}
          >
            {data.dataBasis.comparableBasketCount > 0 ? (
              <MultiLineChart
                labels={trendData.map((item) => item.label)}
                series={priceSeries}
              />
            ) : (
              <div className="flex h-[180px] flex-col items-center justify-center px-6 text-center">
                <LineChart className="size-7 text-primary/45" />
                <p className="mt-2 text-[13px] font-bold text-textMain">暂无可比价格趋势</p>
                <p className="mt-1 max-w-md text-[11px] leading-5 text-textSecondary">
                  同一名称、规格、单位和地区至少需要两个价格日期。缺少价格日期和单期价格不会参与趋势计算。
                </p>
              </div>
            )}
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-[12px] bg-primary-soft px-3 py-2">
                <p className="text-[12px] font-semibold text-primary">
                  设备可比价格变化
                </p>
                <p className="mt-1 text-[20px] font-bold text-primary">
                  {trendSummary.equipment}
                </p>
              </div>
              <div className="rounded-[12px] bg-success-soft px-3 py-2">
                <p className="text-[12px] font-semibold text-success">
                  地材可比价格变化
                </p>
                <p className="mt-1 text-[20px] font-bold text-success">
                  {trendSummary.material}
                </p>
              </div>
              <div className="rounded-[12px] bg-ai-soft px-3 py-2">
                <p className="text-[12px] font-semibold text-ai">
                  可比价格篮子
                </p>
                <p className="mt-1 text-[20px] font-bold text-ai">
                  {data.dataBasis.comparableBasketCount} 组
                </p>
              </div>
            </div>
          </AnalyticsChartCard>

          <section className="rounded-card border border-ai-border bg-gradient-to-br from-white via-white to-ai-soft p-3.5 shadow-card">
            <ModuleHeader
              icon={FileText}
              title="经营决策摘要"
              subtitle="真实业务数据规则聚合，结论需人工复核"
              tone="purple"
              density="compact"
              action={
                <AiBadge
                  label={
                    data.dataBasis.periodFormalPriceCount > 0
                      ? `价格可信度 ${data.analysisConfidence}%`
                      : "价格可信度 暂无样本"
                  }
                />
              }
            />
            <div className="mt-3 grid gap-2">
              {data.insights.map((item, index) => (
                <AnalysisNote
                  key={item.id}
                  insight={item}
                  index={index}
                  busy={actionBusy === item.id}
                  canManage={data.permissions.canManageActions}
                  onDrilldown={() => handleDrilldown(item.route, item.action)}
                  onManage={() => void manageInsight(item)}
                />
              ))}
            </div>
          </section>
        </div>

        <div
          className={`grid gap-3 rounded-card transition ${riskFocus ? "ring-2 ring-danger/25" : ""} xl:grid-cols-3`}
        >
          <AnalyticsChartCard
            icon={PieChart}
            title="正式价格风险分布"
            subtitle={`近${activeRange}天${objectType === "all" ? "设备与地材" : objectType === "equipment" ? "设备" : "地材"}正式价格，不含待审核线索`}
            tone="red"
            action={
              riskFocus ? (
                <button
                  type="button"
                  onClick={() => setRiskFocus(false)}
                  className="text-[12px] font-semibold text-danger"
                >
                  取消聚焦
                </button>
              ) : undefined
            }
          >
            <DonutChart data={data.riskDistribution} totalLabel="正式价格" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["equipment", "material"] as const).map((type) => {
                const summary = formalRiskSummary[type];
                const label = type === "equipment" ? "设备" : "地材";
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleDrilldown(`/${type}-prices?risk=high`, `${label}高风险`)}
                    disabled={summary.high === 0}
                    className="flex h-9 items-center justify-between rounded-md border border-danger/15 bg-danger-soft/40 px-3 text-[11px] font-semibold text-textMain disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span>{label}正式价格</span>
                    <span className="font-bold text-danger">高风险 {summary.high} / {summary.total}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 rounded-[8px] border border-borderSoft bg-page px-3 py-2 text-center text-[10px]">
              <button type="button" onClick={() => handleDrilldown("/price-leads", "待审线索风险")} className="font-semibold text-primary hover:underline">待审线索 <strong>{data.leadRiskSummary.total}</strong></button>
              <span className="text-success">低 <strong>{data.leadRiskSummary.low}</strong></span>
              <span className="text-warning">中 <strong>{data.leadRiskSummary.medium}</strong></span>
              <span className="text-danger">高 <strong>{data.leadRiskSummary.high}</strong></span>
            </div>
          </AnalyticsChartCard>
          <AnalyticsChartCard
            icon={Gauge}
            title="正式价格可信度分布"
            subtitle="仅统计已人工审核入库的正式价格"
            tone="green"
          >
            <DonutChart data={data.confidenceDistribution} totalLabel="价格" />
          </AnalyticsChartCard>
          <section className="rounded-card border border-borderSoft bg-card p-3.5 shadow-card">
            <ModuleHeader
              icon={AlertTriangle}
              title="价格缺口分析"
              subtitle="待补充价格与证据缺口"
              tone="orange"
              density="compact"
            />
            <div className="mt-3 space-y-3">
              {data.priceGapAnalysis.map((item) => (
                <button
                  key={item.label}
                  onClick={() =>
                    handleDrilldown(
                      item.label.includes("地材")
                        ? "/material-prices"
                        : item.label.includes("线索")
                          ? "/price-leads"
                          : item.label.includes("证据")
                            ? "/attachments"
                            : "/equipment-prices",
                      item.label,
                    )
                  }
                  className="grid w-full grid-cols-[108px_minmax(0,1fr)_58px] items-center gap-2 rounded-md px-1 py-1 text-left text-[12px] transition hover:bg-warning-soft/60"
                  type="button"
                >
                  <span className="truncate font-semibold text-textMain">
                    {item.label}
                  </span>
                  <span className="h-2 overflow-hidden rounded-pill bg-[#EEF3F8]">
                    <span
                      className="block h-full rounded-pill bg-warning"
                      style={{ width: item.percent }}
                    />
                  </span>
                  <span className="text-right font-bold text-textMain">
                    {item.value} 项
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <AnalyticsChartCard
            icon={Users}
            title="供应商响应效率"
            subtitle={`近${activeRange}天全量加权口径 · 询价任务环比 ${trendSummary.inquiry}`}
            tone="cyan"
            action={
              <button
                type="button"
                onClick={() => handleDrilldown("/inquiries", "供应商响应")}
                className="text-[12px] font-semibold text-primary"
              >
                查看详情
              </button>
            }
          >
            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[8px] bg-cyan-50 px-2 py-2">
                <p className="text-[10px] text-textMuted">全量响应率</p>
                <p className="mt-1 text-[18px] font-bold text-primary">{data.supplierResponseSummary.sent ? `${data.supplierResponseSummary.responseRate}%` : "无样本"}</p>
              </div>
              <div className="rounded-[8px] bg-success-soft px-2 py-2">
                <p className="text-[10px] text-textMuted">有效报价率</p>
                <p className="mt-1 text-[18px] font-bold text-success">{data.supplierResponseSummary.sent ? `${data.supplierResponseSummary.validQuoteRate}%` : "无样本"}</p>
              </div>
              <div className="rounded-[8px] bg-warning-soft px-2 py-2">
                <p className="text-[10px] text-textMuted">未回复供应商</p>
                <p className="mt-1 text-[18px] font-bold text-warning">{data.supplierResponseSummary.noResponseSupplierCount}</p>
              </div>
            </div>
            {data.supplierPerformance.length ? (
              <HorizontalBarList
                data={data.supplierPerformance.map((item) => ({
                  label: item.name,
                  value: item.response,
                  percent: `${item.response}% · ${item.quotes}/${item.sent}份`,
                }))}
                color="#14B8A6"
              />
            ) : (
              <p className="py-8 text-center text-[12px] text-textMuted">
                近{activeRange}天暂无已发送询价的供应商响应数据
              </p>
            )}
            <div className="mt-4 rounded-[8px] border border-ai-border bg-ai-soft px-3 py-2 text-[12px] leading-5 text-ai">
              数据判断：{data.supplierResponseSummary.sent ? `共向 ${data.supplierResponseSummary.supplierCount} 家供应商发送 ${data.supplierResponseSummary.sent} 次询价，收到 ${data.supplierResponseSummary.validQuotes} 份有效报价；报价有效性仍需人工确认。` : `近${activeRange}天当前分析对象没有已发送询价，响应与有效报价率不参与绩效判断。`}
            </div>
          </AnalyticsChartCard>

          <AnalyticsChartCard
            icon={Brain}
            title="AI任务完成率"
            subtitle={`近${activeRange}天${objectType === "all" ? "全部业务" : objectType === "equipment" ? "设备" : "地材"}真实AI任务执行结果`}
            tone="purple"
          >
            <HorizontalBarList
              data={data.aiEfficiency.map((item) => ({
                label: item.label,
                value: item.value,
                percent: item.total ? `${item.value}% · ${item.completed}/${item.total}` : "无任务",
              }))}
              color="#7C3AED"
            />
          </AnalyticsChartCard>
        </div>
      </div>
    </AppLayout>
  );
}

function AnalyticsSkeleton() {
  return (
    <div
      className="space-y-3 motion-safe:animate-pulse"
      aria-busy="true"
      aria-label="正在汇总真实统计数据"
    >
      <div className="h-20 rounded-card border border-borderSoft bg-white shadow-card" />
      <div className="h-28 rounded-card border border-borderSoft bg-white shadow-card" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-24 rounded-card border border-borderSoft bg-white shadow-card"
          />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="h-80 rounded-card border border-borderSoft bg-white shadow-card" />
        <div className="h-80 rounded-card border border-borderSoft bg-white shadow-card" />
      </div>
    </div>
  );
}
