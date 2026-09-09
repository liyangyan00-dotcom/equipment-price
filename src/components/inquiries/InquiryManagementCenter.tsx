"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  GitCompareArrows,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  IconBox,
  ModuleHeader,
  PriceCell,
  TableActionGroup,
} from "@/components/common";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import type { InquiryTaskRecord } from "@/data/mock/inquiries";
import { emitMockToast } from "@/hooks/useMockToast";
import {
  mapInquiryRow,
  type InquiryDatabaseRow,
} from "@/lib/data/priceInquiryMapper";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { InquiryOperationsDialog } from "@/components/inquiries/InquiryOperationsDialog";

type InquirySupplierRow = NonNullable<
  InquiryDatabaseRow["wpi_inquiry_suppliers"]
>[number];
type InquiryRecord = InquiryTaskRecord & {
  databaseId: string;
  databaseStatus: string;
  aiConfidence: number | null;
  createdAt: string;
  updatedAt: string;
  supplierNames: string[];
  responses: InquirySupplierRow[];
};

type Filters = {
  keyword: string;
  objectType: "all" | "equipment" | "material";
  status: string;
  risk: string;
  supplier: string;
  startDate: string;
  endDate: string;
  highSpreadOnly: boolean;
  respondedOnly: boolean;
  aiPlan: string;
  sort: "updated_desc" | "created_desc" | "deadline_asc" | "risk_desc";
};

type EmailGatewayState = {
  ready: boolean;
  provider: string;
  status: string;
  issues: string[];
  webhookUrl: string | null;
  lastValidatedAt: string | null;
  lastError: string | null;
};

const EMPTY_FILTERS: Filters = {
  keyword: "",
  objectType: "all",
  status: "all",
  risk: "all",
  supplier: "all",
  startDate: "",
  endDate: "",
  highSpreadOnly: false,
  respondedOnly: false,
  aiPlan: "all",
  sort: "updated_desc",
};

const STATUS_LABEL: Record<InquiryTaskRecord["status"], string> = {
  created: "草稿",
  running: "询价中",
  completed: "已完成",
  needs_review: "待审核",
  needs_info: "需补充",
  confirmed: "已确认",
  rejected: "已退回",
  voided: "已归档",
};

const AI_PLAN_DEFINITIONS = [
  {
    value: "方案 A",
    label: "AI优先推荐（A）",
    tableLabel: "优先推荐 A",
    description: "价格、技术、交付与供应商风险综合表现较优，建议优先人工确认。",
    barClassName: "bg-primary",
  },
  {
    value: "方案 B",
    label: "AI备选方案（B）",
    tableLabel: "备选方案 B",
    description: "具备可采用条件，但仍有价格、交期或风险项需要谈判与复核。",
    barClassName: "bg-success",
  },
  {
    value: "需人工评估",
    label: "暂无明确建议",
    tableLabel: "需人工评估",
    description: "报价不足、参数缺失或差异过大，AI暂不建议自动选择。",
    barClassName: "bg-warning",
  },
] as const;

function getAiPlanDefinition(value: string) {
  return AI_PLAN_DEFINITIONS.find((item) => item.value === value) ?? AI_PLAN_DEFINITIONS[2];
}

const KPI_TONES = {
  blue: "border-primary/15 bg-primary-soft text-primary",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-danger",
  purple: "border-ai-border bg-ai-soft text-ai",
} as const;

function toRecord(row: InquiryDatabaseRow): InquiryRecord {
  const mapped = mapInquiryRow(row);
  const responses = row.wpi_inquiry_suppliers ?? [];
  return {
    ...mapped,
    databaseId: row.id,
    databaseStatus: row.status,
    aiConfidence: row.ai_confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    supplierNames: [
      ...new Set(
        responses
          .map((item) => item.wpi_suppliers?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ],
    responses,
  };
}

function responseRate(row: InquiryRecord) {
  return row.supplierCount
    ? Math.round((row.respondedCount / row.supplierCount) * 100)
    : 0;
}

function errorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as { error?: string; issues?: string[] };
  return value.issues?.length
    ? `${value.error ?? fallback}：${value.issues.join("、")}`
    : (value.error ?? fallback);
}

export function InquiryManagementCenter() {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<InquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState("");
  const [page, setPage] = useState(1);
  const [busyAction, setBusyAction] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pageCount: 1 });
  const [summary, setSummary] = useState({
    tasks: 0,
    drafts: 0,
    responses: 0,
    responseRate: 0,
    review: 0,
    highRisk: 0,
    aiReady: 0,
  });
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [permissions, setPermissions] = useState({
    canWrite: false,
    canReview: false,
  });
  const [emailGateway, setEmailGateway] = useState<EmailGatewayState>({
    ready: false,
    provider: "Resend",
    status: "loading",
    issues: ["正在检查邮件网关"],
    webhookUrl: null,
    lastValidatedAt: null,
    lastError: null,
  });
  const [operation, setOperation] = useState<"quote" | "timeline" | null>(null);
  const pageSize = 10;

  useEffect(() => {
    const risk = searchParams.get("risk");
    const next: Filters = {
      ...EMPTY_FILTERS,
      objectType: searchParams.get("objectType") === "equipment" || searchParams.get("objectType") === "material"
        ? searchParams.get("objectType") as "equipment" | "material"
        : "all",
      startDate: searchParams.get("startDate") || searchParams.get("dateFrom") || "",
      endDate: searchParams.get("endDate") || searchParams.get("dateTo") || "",
      risk: risk === "high" ? "high_or_critical" : risk || "all",
    };
    if (!next.startDate && !next.endDate && next.risk === "all" && next.objectType === "all") return;
    const timer = window.setTimeout(() => {
      setDraftFilters(next);
      setFilters(next);
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filters.keyword) search.set("keyword", filters.keyword);
      if (filters.objectType !== "all") search.set("objectType", filters.objectType);
      if (filters.status !== "all") search.set("status", filters.status);
      if (filters.risk !== "all") search.set("risk", filters.risk);
      if (filters.supplier !== "all") search.set("supplier", filters.supplier);
      if (filters.startDate) search.set("startDate", filters.startDate);
      if (filters.endDate) search.set("endDate", filters.endDate);
      if (filters.highSpreadOnly) search.set("highSpreadOnly", "true");
      if (filters.respondedOnly) search.set("respondedOnly", "true");
      if (filters.aiPlan !== "all") search.set("aiPlan", filters.aiPlan);
      if (searchParams.get("overdue") === "true") search.set("overdue", "true");
      search.set("sort", filters.sort);
      const response = await fetch(`/api/inquiries?${search.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: InquiryDatabaseRow[];
        pagination?: { total: number; pageCount: number };
        summary?: typeof summary;
        filterOptions?: { suppliers?: string[] };
        permissions?: { canWrite?: boolean; canReview?: boolean };
        emailGateway?: EmailGatewayState;
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "询价任务加载失败");
      const next = (payload?.data ?? []).map(toRecord);
      setRecords(next);
      setPagination(
        payload?.pagination ?? { total: next.length, pageCount: 1 },
      );
      if (payload?.summary) setSummary(payload.summary);
      setSupplierOptions(payload?.filterOptions?.suppliers ?? []);
      setPermissions({
        canWrite: payload?.permissions?.canWrite === true,
        canReview: payload?.permissions?.canReview === true,
      });
      if (payload?.emailGateway) setEmailGateway(payload.emailGateway);
      setActiveId((current) =>
        next.some((item) => item.databaseId === current)
          ? current
          : (next[0]?.databaseId ?? ""),
      );
      setSelectedIds((current) =>
        current.filter((id) => next.some((item) => item.databaseId === id)),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "询价任务加载失败");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  useEffect(() => {
    const supabase = createClient();
    let timer = 0;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void loadRecords(), 350);
    };
    const channel = supabase
      .channel("inquiry-management-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wpi_inquiries" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wpi_inquiry_suppliers" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wpi_comparisons" },
        refresh,
      )
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadRecords]);

  const pageCount = pagination.pageCount;
  const safePage = Math.min(page, pageCount);
  const pageRows = records;
  const active =
    records.find((row) => row.databaseId === activeId) ?? pageRows[0] ?? null;

  const totals = summary;

  const kpis = [
    {
      label: "询价任务",
      value: totals.tasks,
      unit: "个",
      note: "Supabase 当前记录",
      icon: ClipboardList,
      tone: "blue" as const,
      onClick: () => applyKpiFilter({}, "已显示全部询价任务"),
    },
    {
      label: "草稿待提交",
      value: totals.drafts,
      unit: "个",
      note: "需完成发送前校验",
      icon: Send,
      tone: "cyan" as const,
      onClick: () =>
        applyKpiFilter({ status: "draft" }, "已筛选草稿任务"),
    },
    {
      label: "真实响应",
      value: totals.responses,
      unit: "条",
      note: `响应率 ${totals.responseRate}%`,
      icon: CheckCircle2,
      tone: "green" as const,
      onClick: () =>
        applyKpiFilter(
          { respondedOnly: true },
          "已筛选存在真实响应的询价任务",
        ),
    },
    {
      label: "待人工审核",
      value: totals.review,
      unit: "个",
      note: "提交后进入复核",
      icon: GitCompareArrows,
      tone: "orange" as const,
      onClick: () =>
        applyKpiFilter(
          { status: "pending_review" },
          "已筛选待人工审核任务",
        ),
    },
    {
      label: "高风险任务",
      value: totals.highRisk,
      unit: "个",
      note: "高风险及严重风险",
      icon: ShieldAlert,
      tone: "red" as const,
      onClick: () =>
        applyKpiFilter(
          { risk: "high_or_critical" },
          "已筛选高风险询价任务",
        ),
    },
    {
      label: "AI已有建议",
      value: totals.aiReady,
      unit: "个",
      note: "最终仍需人工确认",
      icon: Sparkles,
      tone: "purple" as const,
      onClick: () => void runAiComparison(),
    },
  ];

  function applyFilters(next = draftFilters) {
    setFilters(next);
    setPage(1);
    emitMockToast({
      title: "正在执行服务端查询",
      description: "筛选条件已提交到 Supabase。",
      tone: "info",
    });
  }

  function resetFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    emitMockToast({
      title: "筛选已重置",
      description: "已恢复全部 Supabase 询价任务。",
      tone: "info",
    });
  }

  function applyKpiFilter(patch: Partial<Filters>, title: string) {
    const next = { ...EMPTY_FILTERS, ...patch };
    setDraftFilters(next);
    setFilters(next);
    setPage(1);
    emitMockToast({
      title,
      description: "已按真实询价状态重新查询 Supabase。",
      tone: "info",
    });
  }

  const handleOperationNotice = useCallback(
    (tone: "info" | "success" | "warning" | "danger", title: string, detail?: string) => {
      emitMockToast({ title, description: detail, tone });
    },
    [],
  );

  function toggleSelection(id: string) {
    setSelectedIds((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  }

  async function runAction(
    action: "send_reminder" | "record_export",
    target = selectedIds,
  ) {
    if (!target.length) {
      emitMockToast({
        title: "请先选择询价任务",
        description: "该操作至少需要选择一条真实任务。",
        tone: "warning",
      });
      return false;
    }
    if (action === "send_reminder" && !emailGateway.ready) {
      emitMockToast({
        title: "邮件网关尚未就绪",
        description:
          emailGateway.issues.join("；") ||
          "请先在外部集成管理中完成 Resend 配置和验证。",
        tone: "warning",
      });
      return false;
    }
    setBusyAction(action);
    try {
      if (action === "send_reminder") {
        const failures: string[] = [];
        let succeeded = 0;
        for (const inquiryId of target) {
          const response = await fetch(
            `/api/inquiries/${encodeURIComponent(inquiryId)}/send`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ retry: true, mode: "reminder" }),
            },
          );
          const payload = (await response.json().catch(() => null)) as {
            data?: { succeeded?: number };
            error?: string;
          } | null;
          if (!response.ok) failures.push(payload?.error ?? "真实发送失败");
          else succeeded += payload?.data?.succeeded ?? 0;
        }
        if (failures.length)
          throw new Error(
            `${failures[0]}${failures.length > 1 ? `；另有 ${failures.length - 1} 个任务失败` : ""}`,
          );
        emitMockToast({
          title: "真实催办邮件已发送",
          description: `已向 ${succeeded} 家供应商发送催办，事件与最近催办时间已写入询价时间线。`,
          tone: "success",
        });
        await loadRecords();
        return true;
      }
      const response = await fetch("/api/inquiries/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, inquiryIds: target }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: { inquiryCount?: number; supplierCount?: number };
        error?: string;
      } | null;
      if (!response.ok) throw new Error(errorMessage(payload, "操作失败"));
      await loadRecords();
      return true;
    } catch (error) {
      emitMockToast({
        title: "操作未完成",
        description: error instanceof Error ? error.message : "请稍后重试。",
        tone: "danger",
      });
      return false;
    } finally {
      setBusyAction("");
    }
  }

  async function exportCsv(targetRecords = records) {
    if (!targetRecords.length) {
      emitMockToast({ title: "没有可导出的任务", tone: "warning" });
      return;
    }
    const ids = targetRecords.map((item) => item.databaseId);
    setBusyAction("export");
    await runAction("record_export", ids);
    const header = [
      "询价编号",
      "主题",
      "关联对象",
      "供应商数",
      "真实响应数",
      "最低报价",
      "最高报价",
      "币种",
      "风险",
      "状态",
    ];
    const rows = targetRecords.map((item) => [
      item.inquiryCode,
      item.subject,
      item.relatedItem,
      item.supplierCount,
      item.respondedCount,
      item.lowestQuote || "",
      item.highestQuote || "",
      item.currency,
      item.riskLevel,
      item.databaseStatus,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    anchor.download = `询价任务-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    setBusyAction("");
    emitMockToast({
      title: "询价任务已导出",
      description: `已导出 ${targetRecords.length} 条真实记录。`,
      tone: "success",
    });
  }

  async function submitForReview() {
    if (!permissions.canReview) {
      emitMockToast({
        title: "当前角色不可提交审核",
        description: "请联系管理员授予询价审核权限。",
        tone: "warning",
      });
      return;
    }
    const targets = records.filter((item) =>
      selectedIds.includes(item.databaseId),
    );
    if (!targets.length) {
      emitMockToast({
        title: "请先选择任务",
        description: "批量提交审核前请勾选询价任务。",
        tone: "warning",
      });
      return;
    }
    setBusyAction("review");
    const failures: string[] = [];
    for (const item of targets) {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(item.databaseId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pending_review" }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        failures.push(
          `${item.inquiryCode}：${errorMessage(payload, "校验失败")}`,
        );
      }
    }
    setBusyAction("");
    if (failures.length) {
      emitMockToast({
        title: "部分任务未通过发送前校验",
        description: failures.slice(0, 2).join("；"),
        tone: "warning",
        duration: 8000,
      });
    } else {
      emitMockToast({
        title: "已提交人工审核",
        description: `${targets.length} 个任务已进入审核队列。`,
        tone: "success",
      });
      setSelectedIds([]);
    }
    await loadRecords();
  }

  async function runAiComparison(
    target = active ? [active] : records.slice(0, 5),
  ) {
    if (!target.length) {
      emitMockToast({ title: "暂无可分析任务", tone: "warning" });
      return;
    }
    setBusyAction("ai");
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "comparison_analysis",
          title: `${target[0].inquiryCode} AI比价分析`,
          sourceLabel: "询价与比价管理",
          businessObjectType: "inquiry",
          businessObjectId: target[0].databaseId,
          businessHref: `/inquiries/${target[0].inquiryCode}`,
          idempotencyKey: `comparison:${target[0].databaseId}:${target[0].updatedAt}`,
          input: {
            inquiryCode: target[0].inquiryCode,
            subject: target[0].subject,
            supplierCount: target[0].supplierCount,
            respondedCount: target[0].respondedCount,
            quotes: target[0].responses.filter(
              (item) => Number(item.quoted_amount ?? 0) > 0,
            ),
            instruction:
              "分析真实供应商响应和报价差异，输出建议与风险；不得替代人工商务判断。",
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(errorMessage(payload, "AI任务创建失败"));
      emitMockToast({
        title: "真实 AI 比价任务已入队",
        description: "可在 AI 工作台查看执行进度与人工复核状态。",
        tone: "ai",
      });
    } catch (error) {
      emitMockToast({
        title: "AI 比价未执行",
        description:
          error instanceof Error ? error.message : "请检查 AI Provider。",
        tone: "danger",
      });
    } finally {
      setBusyAction("");
    }
  }

  async function generateComparison(row: InquiryRecord) {
    setBusyAction("comparison");
    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(row.databaseId)}/comparison`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        data?: { comparison_code?: string; comparisonCode?: string };
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "真实比价生成失败");
      const code =
        payload?.data?.comparison_code ?? payload?.data?.comparisonCode;
      if (!code) throw new Error("比价结果编号缺失");
      emitMockToast({
        title: "真实比价已生成",
        description: "供应商报价已归一计算，等待人工选择采用方案。",
        tone: "success",
      });
      window.location.assign(
        `/comparisons/${encodeURIComponent(code)}?from=inquiry&inquiryId=${encodeURIComponent(row.inquiryCode)}`,
      );
    } catch (error) {
      emitMockToast({
        title: "暂不能生成比价",
        description:
          error instanceof Error ? error.message : "请先回填至少两家真实报价。",
        tone: "warning",
      });
    } finally {
      setBusyAction("");
    }
  }

  const highSpread = records
    .filter((item) => item.differenceRate >= 30)
    .sort((a, b) => b.differenceRate - a.differenceRate);
  const planCounts = records.reduce(
    (result, item) => {
      result[item.aiPlan] = (result[item.aiPlan] ?? 0) + 1;
      return result;
    },
    {} as Record<string, number>,
  );
  const supplierRanking = [
    ...new Set(
      records.flatMap((item) =>
        item.responses
          .map((response) => response.wpi_suppliers?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ),
  ]
    .map((name) => ({
      name,
      count: records.reduce(
        (sum, row) =>
          sum +
          row.responses.filter(
            (response) =>
              response.wpi_suppliers?.name === name &&
              ["responded", "quoted", "completed"].includes(
                response.response_status,
              ),
          ).length,
        0,
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-3 pb-6" data-no-global-interaction>
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-bold leading-8 text-textMain">
                询价与比价管理
              </h1>
              <span className="rounded-pill border border-success/20 bg-success-soft px-2 py-1 text-[10px] font-bold text-success">
                Supabase 真实数据
              </span>
            </div>
            <p className="mt-1 text-[13px] text-textMuted">
              集中管理询价任务、真实供应商响应、报价差异与 AI 辅助判断。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/inquiries/create"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[12px] font-bold text-white"
            >
              <Plus className="size-4" />
              新建询价任务
            </Link>
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={busyAction !== ""}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary disabled:opacity-50"
            >
              <Download className="size-4" />
              导出任务
            </button>
            <button
              type="button"
              onClick={() => void runAiComparison()}
              disabled={busyAction !== ""}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-bold text-ai disabled:opacity-50"
            >
              {busyAction === "ai" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              AI比价建议
            </button>
          </div>
        </header>

        {loadError ? (
          <section className="flex items-center justify-between rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-[12px] text-danger">
            <span>真实数据加载失败：{loadError}</span>
            <button
              type="button"
              onClick={() => void loadRecords()}
              className="font-bold underline"
            >
              重新加载
            </button>
          </section>
        ) : null}

        {!loadError && !emailGateway.ready ? (
          <section className="flex flex-col gap-2 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="font-bold">真实邮件发送尚未就绪</p>
                <p className="mt-0.5 break-words text-[11px] text-amber-800">
                  {emailGateway.issues.join("；")}
                </p>
              </div>
            </div>
            <Link
              href="/settings/integrations"
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-amber-300 bg-white px-3 font-bold text-amber-800 transition hover:bg-amber-100"
            >
              配置 Resend 邮件网关
            </Link>
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  "min-h-[92px] rounded-card border p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  KPI_TONES[item.tone],
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold">{item.label}</p>
                    <p className="mt-1 text-[26px] font-bold leading-8">
                      {item.value}
                      <span className="ml-1 text-[11px]">{item.unit}</span>
                    </p>
                  </div>
                  <IconBox
                    icon={Icon}
                    tone={
                      item.tone === "purple"
                        ? "purple"
                        : item.tone === "red"
                          ? "red"
                          : item.tone === "orange"
                            ? "orange"
                            : "blue"
                    }
                    size="md"
                  />
                </div>
                <p className="mt-1 truncate text-[10px] opacity-75">
                  {item.note}
                </p>
              </button>
            );
          })}
        </div>

        <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
          <div className="grid gap-2 xl:grid-cols-[minmax(180px,1.4fr)_120px_130px_130px_160px_minmax(220px,1.1fr)_140px_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-textMuted" />
              <input
                value={draftFilters.keyword}
                onChange={(event) =>
                  setDraftFilters((value) => ({
                    ...value,
                    keyword: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters();
                }}
                placeholder="询价编号、主题、对象或供应商"
                className="h-9 w-full rounded-md border border-borderSoft pl-9 pr-3 text-[12px] outline-none focus:border-primary"
              />
            </label>
            <select
              value={draftFilters.objectType}
              onChange={(event) =>
                setDraftFilters((value) => ({
                  ...value,
                  objectType: event.target.value as Filters["objectType"],
                }))
              }
              className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px]"
              aria-label="询价对象"
            >
              <option value="all">全部对象</option>
              <option value="equipment">设备</option>
              <option value="material">地材</option>
            </select>
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((value) => ({
                  ...value,
                  status: event.target.value,
                }))
              }
              className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px]"
            >
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="pending_review">待审核</option>
              <option value="approved">已批准</option>
              <option value="rejected">已退回</option>
            </select>
            <select
              value={draftFilters.risk}
              onChange={(event) =>
                setDraftFilters((value) => ({
                  ...value,
                  risk: event.target.value,
                }))
              }
              className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px]"
            >
              <option value="all">全部风险</option>
              <option value="low">低风险</option>
              <option value="medium">中风险</option>
              <option value="high_or_critical">高风险及严重风险</option>
              <option value="high">高风险</option>
              <option value="critical">严重风险</option>
            </select>
            <select
              value={draftFilters.supplier}
              onChange={(event) =>
                setDraftFilters((value) => ({
                  ...value,
                  supplier: event.target.value,
                }))
              }
              className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px]"
            >
              <option value="all">全部供应商</option>
              {supplierOptions.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-md border border-borderSoft px-2">
              <input
                type="date"
                value={draftFilters.startDate}
                onChange={(event) =>
                  setDraftFilters((value) => ({
                    ...value,
                    startDate: event.target.value,
                  }))
                }
                className="h-8 min-w-0 bg-transparent text-[11px] outline-none"
              />
              <span className="text-textMuted">至</span>
              <input
                type="date"
                value={draftFilters.endDate}
                onChange={(event) =>
                  setDraftFilters((value) => ({
                    ...value,
                    endDate: event.target.value,
                  }))
                }
                className="h-8 min-w-0 bg-transparent text-[11px] outline-none"
              />
            </div>
            <select
              value={draftFilters.sort}
              onChange={(event) =>
                setDraftFilters((value) => ({
                  ...value,
                  sort: event.target.value as Filters["sort"],
                }))
              }
              aria-label="询价任务排序"
              className="h-9 min-w-0 rounded-md border border-borderSoft bg-white px-3 text-[12px]"
            >
              <option value="updated_desc">最近更新</option>
              <option value="created_desc">最近创建</option>
              <option value="deadline_asc">截止日期优先</option>
              <option value="risk_desc">风险等级优先</option>
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyFilters()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[12px] font-bold text-white"
              >
                <Search className="size-4" />
                查询
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary"
              >
                重置
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-borderSoft bg-white px-3 py-2 shadow-card">
          <div className="flex items-center gap-3 text-[12px]">
            <b>共 {pagination.total} 条</b>
            <span className="text-textMuted">
              当前页 {records.length} 条 · 已选择 {selectedIds.length} 条
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitForReview}
              disabled={busyAction !== "" || !permissions.canReview}
              className="h-8 rounded-md border border-primary/20 bg-primary-soft px-3 text-[11px] font-bold text-primary disabled:opacity-50"
            >
              批量提交审核
            </button>
            <button
              type="button"
              onClick={() => void runAction("send_reminder")}
              disabled={busyAction !== "" || !permissions.canWrite}
              className="h-8 rounded-md border border-success/20 bg-success-soft px-3 text-[11px] font-bold text-success disabled:opacity-50"
            >
              发送真实催办
            </button>
            <button
              type="button"
              onClick={() =>
                void exportCsv(
                  records.filter((item) =>
                    selectedIds.includes(item.databaseId),
                  ),
                )
              }
              disabled={busyAction !== ""}
              className="h-8 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-bold text-textSecondary disabled:opacity-50"
            >
              导出所选
            </button>
            <button
              type="button"
              onClick={() => void loadRecords()}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-bold text-textSecondary"
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
              />
              刷新
            </button>
          </div>
        </section>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,8fr)_minmax(300px,2.7fr)]">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="border-b border-borderSoft px-3 py-2.5">
              <ModuleHeader
                icon={ClipboardList}
                title="询价任务列表"
                subtitle="金额与响应均来自供应商关系表；无真实报价时明确显示待响应"
                density="compact"
              />
            </div>
            {loading ? (
              <div className="flex min-h-[340px] items-center justify-center gap-2 text-[13px] text-textMuted">
                <LoaderCircle className="size-5 animate-spin text-primary" />
                正在读取 Supabase 询价任务
              </div>
            ) : pageRows.length === 0 ? (
              <EmptyState
                title="没有匹配的询价任务"
                description="请调整筛选条件，或创建新的询价任务。"
                className="m-3 min-h-[300px] shadow-none"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1320px] w-full border-collapse text-[12px]">
                  <thead className="bg-slate-50 text-textSecondary">
                    <tr className="h-9 border-b border-borderSoft">
                      <th className="w-10 px-2">
                        <input
                          type="checkbox"
                          checked={
                            pageRows.length > 0 &&
                            pageRows.every((item) =>
                              selectedIds.includes(item.databaseId),
                            )
                          }
                          onChange={() => {
                            const ids = pageRows.map((item) => item.databaseId);
                            setSelectedIds((items) =>
                              ids.every((id) => items.includes(id))
                                ? items.filter((id) => !ids.includes(id))
                                : [...new Set([...items, ...ids])],
                            );
                          }}
                          className="accent-primary"
                        />
                      </th>
                      {[
                        "询价编号",
                        "询价主题",
                        "关联对象",
                        "供应商",
                        "已响应",
                        "最低报价",
                        "最高报价",
                        "价差",
                        "AI建议",
                        "状态",
                        "风险",
                        "操作",
                      ].map((label) => (
                        <th
                          key={label}
                          className="whitespace-nowrap px-2 text-left"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr
                        key={row.databaseId}
                        onClick={() => setActiveId(row.databaseId)}
                        className={cn(
                          "h-11 cursor-pointer border-b border-borderSoft hover:bg-slate-50",
                          active?.databaseId === row.databaseId &&
                            "bg-primary-soft/50",
                        )}
                      >
                        <td
                          className="px-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.databaseId)}
                            onChange={() => toggleSelection(row.databaseId)}
                            className="accent-primary"
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 font-bold text-primary">
                          <Link
                            href={`/inquiries/${row.inquiryCode}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {row.inquiryCode}
                          </Link>
                        </td>
                        <td className="max-w-[190px] px-2">
                          <div
                            className="truncate font-semibold"
                            title={row.subject}
                          >
                            {row.subject}
                          </div>
                        </td>
                        <td className="max-w-[170px] px-2">
                          <div
                            className="truncate text-textSecondary"
                            title={row.relatedItem}
                          >
                            {row.relatedItem}
                          </div>
                        </td>
                        <td className="px-2 text-center font-bold">
                          {row.supplierCount}
                        </td>
                        <td className="px-2 text-center">
                          <b
                            className={
                              row.respondedCount
                                ? "text-success"
                                : "text-textMuted"
                            }
                          >
                            {row.respondedCount}
                          </b>
                          <span className="text-[10px] text-textMuted">
                            {" "}
                            ({responseRate(row)}%)
                          </span>
                        </td>
                        <td className="px-2">
                          {row.lowestQuote > 0 ? (
                            <PriceCell
                              value={row.lowestQuote}
                              currency={row.currency}
                              className="whitespace-nowrap"
                            />
                          ) : (
                            <span className="whitespace-nowrap text-textMuted">
                              待供应商响应
                            </span>
                          )}
                        </td>
                        <td className="px-2">
                          {row.highestQuote > 0 ? (
                            <PriceCell
                              value={row.highestQuote}
                              currency={row.currency}
                              className="whitespace-nowrap"
                            />
                          ) : (
                            <span className="whitespace-nowrap text-textMuted">
                              待供应商响应
                            </span>
                          )}
                        </td>
                        <td className="px-2 text-right font-bold tabular-nums">
                          {row.differenceRate > 0 ? (
                            <span
                              className={
                                row.differenceRate >= 30
                                  ? "text-danger"
                                  : "text-warning"
                              }
                            >
                              +{row.differenceRate}%
                            </span>
                          ) : (
                            <span className="text-textMuted">-</span>
                          )}
                        </td>
                        <td className="px-2">
                          <span
                            title={`${getAiPlanDefinition(row.aiPlan).label}：${getAiPlanDefinition(row.aiPlan).description}`}
                            className={cn(
                              "inline-flex whitespace-nowrap rounded-pill border px-2 py-1 text-[10px] font-bold",
                              row.aiPlan === "需人工评估"
                                ? "border-warning/20 bg-warning-soft text-warning"
                                : "border-ai-border bg-ai-soft text-ai",
                            )}
                          >
                            {getAiPlanDefinition(row.aiPlan).tableLabel}
                          </span>
                        </td>
                        <td className="min-w-[88px] px-2">
                          <StatusBadge
                            status={row.status}
                            label={STATUS_LABEL[row.status]}
                            className="h-5 whitespace-nowrap text-[10px]"
                          />
                        </td>
                        <td className="px-2">
                          <RiskBadge
                            level={row.riskLevel}
                            className="h-5 text-[10px]"
                          />
                        </td>
                        <td
                          className="px-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <TableActionGroup
                            actions={[
                              {
                                label: "查看",
                                icon: ClipboardList,
                                href: `/inquiries/${row.inquiryCode}`,
                              },
                              {
                                label: "生成供应商报价链接",
                                icon: Link2,
                                tone: "primary",
                                onClick: () => {
                                  if (!permissions.canWrite) {
                                    emitMockToast({
                                      title: "当前角色不可生成报价链接",
                                      description: "请联系管理员授予询价写入权限。",
                                      tone: "warning",
                                    });
                                    return;
                                  }
                                  setActiveId(row.databaseId);
                                  setOperation("quote");
                                },
                              },
                              row.respondedCount >= 2 && row.lowestQuote > 0
                                ? {
                                    label: "生成比价",
                                    icon: GitCompareArrows,
                                    tone: "ai",
                                    onClick: () => void generateComparison(row),
                                  }
                                : {
                                    label: "回填报价",
                                    icon: Send,
                                    tone: "default",
                                    onClick: () => {
                                      if (!permissions.canWrite) {
                                        emitMockToast({
                                          title: "当前角色不可回填报价",
                                          tone: "warning",
                                        });
                                        return;
                                      }
                                      setActiveId(row.databaseId);
                                      setOperation("quote");
                                    },
                                  },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-borderSoft px-3 py-2.5 text-[11px] text-textMuted">
              <span>
                共 {pagination.total} 条，当前第 {safePage} / {pageCount} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={safePage === 1}
                  className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPage(value)}
                      className={cn(
                        "size-8 rounded-md border text-[11px] font-bold",
                        safePage === value
                          ? "border-primary bg-primary text-white"
                          : "border-borderSoft bg-white text-textSecondary",
                      )}
                    >
                      {value}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                  disabled={safePage === pageCount}
                  className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </section>

          <div className="space-y-3">
            {active ? (
              <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-3 shadow-card">
                <ModuleHeader
                  icon={Bot}
                  title="询价执行与 AI 比价"
                  subtitle={`当前任务：${active.inquiryCode}`}
                  tone="purple"
                  density="compact"
                  action={
                    <Link
                      href={`/inquiries/${active.inquiryCode}`}
                      className="text-[11px] font-bold text-ai"
                    >
                      任务详情
                    </Link>
                  }
                />
                <div className="mt-3 rounded-md border border-ai-border bg-white/80 p-3">
                  <p className="font-bold text-textMain">{active.subject}</p>
                  <p className="mt-1 text-[11px] text-textMuted">
                    {active.relatedItem}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-primary-soft p-2">
                      <b className="block text-primary">
                        {active.supplierCount}
                      </b>
                      <span className="text-[10px]">供应商</span>
                    </div>
                    <div className="rounded-md bg-success-soft p-2">
                      <b className="block text-success">
                        {active.respondedCount}
                      </b>
                      <span className="text-[10px]">真实响应</span>
                    </div>
                    <div className="rounded-md bg-warning-soft p-2">
                      <b className="block text-warning">
                        {active.differenceRate || 0}%
                      </b>
                      <span className="text-[10px]">报价差异</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-md border-l-4 border-ai bg-white p-3 text-[11px] leading-5 text-textSecondary">
                  {active.respondedCount < 2
                    ? "当前真实报价不足 2 份。可先真实发送询价函，并在收到供应商文件后回填报价与证据。"
                    : `已获得 ${active.respondedCount} 份真实响应，可以生成持久化比价结果；AI判断仍需人工确认。`}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOperation("quote")}
                    disabled={!permissions.canWrite}
                    className="h-8 rounded-md bg-primary text-[11px] font-bold text-white disabled:opacity-40"
                  >
                    回填报价
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void runAction("send_reminder", [active.databaseId])
                    }
                    disabled={busyAction !== "" || !permissions.canWrite}
                    className="h-8 rounded-md border border-success/20 bg-success-soft text-[11px] font-bold text-success disabled:opacity-45"
                  >
                    发送真实催办
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperation("timeline")}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-borderSoft bg-white text-[11px] font-bold text-textSecondary"
                  >
                    <Clock3 className="size-3.5" />
                    执行时间线
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateComparison(active)}
                    disabled={busyAction !== "" || active.respondedCount < 2}
                    className="h-8 rounded-md bg-ai text-[11px] font-bold text-white disabled:opacity-40"
                  >
                    生成真实比价
                  </button>
                </div>
              </section>
            ) : null}
            <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
              <ModuleHeader
                icon={AlertTriangle}
                title="高价差提醒"
                tone="red"
                density="compact"
                action={
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...draftFilters, highSpreadOnly: true };
                      setDraftFilters(next);
                      applyFilters(next);
                    }}
                    className="text-[11px] font-bold text-primary"
                  >
                    筛选全部 {highSpread.length} 条
                  </button>
                }
              />
              <div className="mt-3 space-y-2">
                {highSpread.length ? (
                  highSpread.slice(0, 4).map((item) => (
                    <button
                      key={item.databaseId}
                      type="button"
                      onClick={() => setActiveId(item.databaseId)}
                      className="grid w-full grid-cols-[1fr_auto] gap-2 rounded-md border border-borderSoft p-2 text-left"
                    >
                      <span className="min-w-0">
                        <b className="block truncate text-[11px]">
                          {item.inquiryCode}
                        </b>
                        <span className="block truncate text-[10px] text-textMuted">
                          {item.subject}
                        </span>
                      </span>
                      <span className="text-[11px] font-bold text-danger">
                        +{item.differenceRate}%
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-md bg-success-soft p-3 text-[11px] text-success">
                    当前真实报价中暂无高价差任务。
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
              <ModuleHeader
                icon={Sparkles}
                title="建议分布"
                subtitle="点击方案筛选询价任务"
                tone="purple"
                density="compact"
              />
              <div className="mt-3 space-y-2">
                {AI_PLAN_DEFINITIONS.map((plan) => {
                  const count = planCounts[plan.value] ?? 0;
                  const percent = records.length
                    ? Math.round((count / records.length) * 100)
                    : 0;
                  const activePlan = filters.aiPlan === plan.value;
                  return (
                    <button
                      key={plan.value}
                      type="button"
                      aria-pressed={activePlan}
                      onClick={() => {
                        const nextPlan = activePlan ? "all" : plan.value;
                        const next = { ...draftFilters, aiPlan: nextPlan };
                        setDraftFilters(next);
                        applyFilters(next);
                        emitMockToast({
                          title: activePlan
                            ? "已清除 AI 建议筛选"
                            : `已筛选：${plan.label}`,
                          description: activePlan
                            ? "询价列表已恢复当前其他筛选条件。"
                            : "仅筛选 AI 建议相符的真实询价任务，采用方案仍需人工确认。",
                          tone: "info",
                        });
                      }}
                      className={cn(
                        "block w-full rounded-md border p-2 text-left transition",
                        activePlan
                          ? "border-ai bg-ai-soft shadow-sm"
                          : "border-transparent hover:border-ai-border hover:bg-ai-soft/40",
                      )}
                    >
                      <div className="flex justify-between text-[11px]">
                        <span className={cn("font-bold", activePlan && "text-ai")}>{plan.label}</span>
                        <b>
                          {count} ({percent}%)
                        </b>
                      </div>
                      <p className="mt-1 text-[10px] leading-4 text-textMuted">
                        {plan.description}
                      </p>
                      <div className="mt-1 h-2 overflow-hidden rounded-pill bg-slate-100">
                        <div
                          className={cn("h-full rounded-pill", plan.barClassName)}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
            <ModuleHeader
              icon={UsersRound}
              title="真实供应商响应"
              subtitle="按已写入响应关系统计"
              density="compact"
            />
            <div className="mt-3 space-y-2">
              {supplierRanking.some((item) => item.count > 0) ? (
                supplierRanking.map((item) => (
                  <div
                    key={item.name}
                    className="grid grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-2 text-[11px]"
                  >
                    <span className="truncate">{item.name}</span>
                    <div className="h-2 overflow-hidden rounded-pill bg-slate-100">
                      <div
                        className="h-full rounded-pill bg-primary"
                        style={{ width: `${Math.min(100, item.count * 20)}%` }}
                      />
                    </div>
                    <b>{item.count}</b>
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 p-3 text-[11px] text-textMuted">
                  数据库中尚无供应商正式响应，建议先完成发送与催办。
                </p>
              )}
            </div>
          </section>
          <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
            <ModuleHeader
              icon={Send}
              title="待处理任务"
              subtitle="基于当前真实状态生成"
              tone="orange"
              density="compact"
            />
            <div className="mt-3 space-y-2">
              {records
                .filter(
                  (item) =>
                    item.databaseStatus === "draft" ||
                    item.databaseStatus === "pending_review",
                )
                .slice(0, 4)
                .map((item) => (
                  <button
                    key={item.databaseId}
                    type="button"
                    onClick={() => setActiveId(item.databaseId)}
                    className="flex w-full items-center justify-between rounded-md border border-borderSoft p-2 text-left text-[11px]"
                  >
                    <span className="min-w-0">
                      <b className="block truncate">{item.inquiryCode}</b>
                      <span className="block truncate text-textMuted">
                        {item.subject}
                      </span>
                    </span>
                    <StatusBadge
                      status={item.status}
                      label={STATUS_LABEL[item.status]}
                      className="h-5 text-[10px]"
                    />
                  </button>
                ))}
            </div>
          </section>
          <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
            <ModuleHeader
              icon={ShieldAlert}
              title="风险报价关注"
              subtitle="只统计当前数据库风险等级"
              tone="red"
              density="compact"
            />
            <div className="mt-3 space-y-2">
              {records
                .filter((item) => item.riskLevel !== "low")
                .slice(0, 4)
                .map((item) => (
                  <button
                    key={item.databaseId}
                    type="button"
                    onClick={() => setActiveId(item.databaseId)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-borderSoft p-2 text-left"
                  >
                    <span className="min-w-0">
                      <b className="block truncate text-[11px]">
                        {item.inquiryCode}
                      </b>
                      <span className="block truncate text-[10px] text-textMuted">
                        {item.subject}
                      </span>
                    </span>
                    <RiskBadge
                      level={item.riskLevel}
                      className="h-5 text-[10px]"
                    />
                  </button>
                ))}
            </div>
          </section>
        </div>
        {active ? (
          <InquiryOperationsDialog
            open={operation !== null}
            mode={operation ?? "quote"}
            inquiryId={active.databaseId}
            inquiryCode={active.inquiryCode}
            onClose={() => setOperation(null)}
            onChanged={() => void loadRecords()}
            onNotice={handleOperationNotice}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
