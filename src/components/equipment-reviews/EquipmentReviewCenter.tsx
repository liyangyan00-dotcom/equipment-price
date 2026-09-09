"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileQuestion,
  Filter,
  ListChecks,
  Loader2,
  LocateFixed,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Upload,
  UserCheck,
} from "lucide-react";
import {
  ConfirmDialog,
  MockExportDialog,
  ModuleHeader,
} from "@/components/common";
import { IconBox } from "@/components/common/IconBox";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type {
  EquipmentReviewDecision,
  EquipmentReviewPermissions,
  EquipmentReviewProgress,
  EquipmentReviewTask,
  EquipmentReviewTaskStatus,
} from "@/types/equipmentReview";
import { EquipmentReviewAnalytics } from "./EquipmentReviewAnalytics";
import { EquipmentReviewDetail } from "./EquipmentReviewDetail";
import { EquipmentReviewQueue } from "./EquipmentReviewQueue";
import { formatReviewPrice } from "./reviewUtils";

type ReviewFilters = {
  keyword: string;
  status: "all" | EquipmentReviewTaskStatus;
  risk: "all" | "low" | "medium" | "high" | "critical";
  category: string;
  source: string;
};

const defaultFilters: ReviewFilters = {
  keyword: "",
  status: "all",
  risk: "all",
  category: "all",
  source: "all",
};

function matchesReviewFilters(
  task: EquipmentReviewTask,
  filters: ReviewFilters,
  ruleFilter = ""
) {
  const price = task.wpi_equipment_prices;
  const keyword = filters.keyword.trim().toLowerCase();
  const searchText = [
    price.price_code,
    price.equipment_name,
    price.brand,
    price.model,
    price.wpi_suppliers?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (keyword && !searchText.includes(keyword)) return false;
  if (filters.status !== "all" && task.status !== filters.status) return false;
  if (filters.risk !== "all" && task.risk_level !== filters.risk) return false;
  if (filters.category !== "all" && price.category !== filters.category) return false;
  if (filters.source !== "all" && price.source_type !== filters.source) return false;
  if (ruleFilter === "__missing__") return task.missing_fields.length > 0;
  if (ruleFilter === "__source__") return !task.evidence_checks.price_source;
  if (ruleFilter && !task.matched_rules.includes(ruleFilter)) return false;
  return true;
}

const kpiConfig = [
  {
    key: "pending",
    label: "待审核价格",
    icon: ClipboardCheck,
    tone: "blue" as const,
    text: "text-blue-600",
    border: "border-blue-100",
    bg: "from-blue-50 to-white",
  },
  {
    key: "risk",
    label: "高风险价格",
    icon: ShieldAlert,
    tone: "red" as const,
    text: "text-danger",
    border: "border-red-100",
    bg: "from-red-50 to-white",
  },
  {
    key: "missing",
    label: "参数待补全",
    icon: FileQuestion,
    tone: "orange" as const,
    text: "text-warning",
    border: "border-orange-100",
    bg: "from-orange-50 to-white",
  },
  {
    key: "source",
    label: "来源待核验",
    icon: Bot,
    tone: "purple" as const,
    text: "text-ai",
    border: "border-purple-100",
    bg: "from-purple-50 to-white",
  },
  {
    key: "approved",
    label: "今日已审核",
    icon: CheckCircle2,
    tone: "green" as const,
    text: "text-success",
    border: "border-green-100",
    bg: "from-green-50 to-white",
  },
] as const;

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] font-semibold text-textMuted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-borderSoft bg-white px-2 text-[12px] text-textSecondary outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
      >
        {children}
      </select>
    </label>
  );
}

export function EquipmentReviewCenter() {
  const searchParams = useSearchParams();
  const requestedPriceId =
    searchParams.get("priceId") ?? searchParams.get("equipmentId") ?? "";
  const toast = useMockToast();
  const [tasks, setTasks] = useState<EquipmentReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [permissions, setPermissions] =
    useState<EquipmentReviewPermissions | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [filters, setFilters] = useState<ReviewFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReviewFilters>(defaultFilters);
  const [ruleFilter, setRuleFilter] = useState("");
  const [activeId, setActiveId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [comment, setComment] = useState("");
  const [reviewDirty, setReviewDirty] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState("");
  const [busyDecision, setBusyDecision] = useState<EquipmentReviewDecision | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [confirmDecision, setConfirmDecision] = useState<EquipmentReviewDecision | null>(null);
  const [confirmBatchDecision, setConfirmBatchDecision] =
    useState<EquipmentReviewDecision | null>(null);
  const [batchComment, setBatchComment] = useState("");
  const [pendingProgress, setPendingProgress] =
    useState<EquipmentReviewProgress | null>(null);
  const [focusMessage, setFocusMessage] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [reviewUrlReady, setReviewUrlReady] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const pageSize = 10;

  const loadTasks = useCallback(async (
    preserveSelection = false,
    preferredActiveId = ""
  ) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/equipment-prices/reviews", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: EquipmentReviewTask[];
        error?: string;
        canReview?: boolean;
        permissions?: EquipmentReviewPermissions;
        currentUserId?: string;
      };
      if (!response.ok) throw new Error(payload.error || "读取审核任务失败");

      const nextTasks = payload.data ?? [];
      setTasks(nextTasks);
      setCanReview(Boolean(payload.canReview));
      setPermissions(payload.permissions ?? null);
      setCurrentUserId(payload.currentUserId ?? "");

      if (preferredActiveId && nextTasks.some((task) => task.id === preferredActiveId)) {
        const preferredIndex = nextTasks.findIndex(
          (task) => task.id === preferredActiveId
        );
        const preferredTask = nextTasks[preferredIndex];
        setActiveId(preferredTask.id);
        setComment(preferredTask.review_comment ?? "");
        setReviewDirty(false);
        setPage(Math.floor(preferredIndex / pageSize) + 1);
      } else if (!preserveSelection) {
        const matched = nextTasks.find((task) => {
          const price = task.wpi_equipment_prices;
          return (
            task.equipment_price_id === requestedPriceId ||
            task.import_row_id === requestedPriceId ||
            price.id === requestedPriceId ||
            price.legacy_id === requestedPriceId ||
            price.price_code === requestedPriceId
          );
        });
        const matchedIndex = matched
          ? nextTasks.findIndex((task) => task.id === matched.id)
          : -1;
        setActiveId(
          matched?.id ?? (requestedPriceId ? "" : nextTasks[0]?.id ?? "")
        );
        setComment(matched?.review_comment ?? "");
        setReviewDirty(false);
        setPage(matchedIndex >= 0 ? Math.floor(matchedIndex / pageSize) + 1 : 1);
        if (requestedPriceId) {
          setFilters(defaultFilters);
          setAppliedFilters(defaultFilters);
          setRuleFilter("");
          setFocusMessage(
            matched
              ? `已定位 ${matched.wpi_equipment_prices.price_code} ${matched.wpi_equipment_prices.equipment_name}，请在右侧完成本条价格审核。`
              : `未找到 ${requestedPriceId} 对应的审核任务，该价格可能尚未提交审核或任务已被归档。`
          );
        }
      } else {
        setActiveId((current) =>
          nextTasks.some((task) => task.id === current)
            ? current
            : nextTasks[0]?.id ?? ""
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取审核任务失败");
    } finally {
      setLoading(false);
    }
  }, [requestedPriceId]);

  useEffect(() => {
    // Initial fetch synchronizes this client surface with the authenticated Supabase session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!reviewDirty) return;
    const protectUnsavedReview = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnsavedReview);
    return () => window.removeEventListener("beforeunload", protectUnsavedReview);
  }, [reviewDirty]);

  useEffect(() => {
    if (loading || reviewUrlReady) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const restoredTaskId = params.get("task");
      const restoredPage = Number(params.get("page"));
      const status = params.get("status");
      const risk = params.get("risk");
      const restoredFilters: ReviewFilters = {
        keyword: params.get("q") ?? "",
        status:
          status && ["pending", "in_review", "need_info", "approved", "rejected"].includes(status)
            ? (status as EquipmentReviewTaskStatus)
            : "all",
        risk:
          risk && ["low", "medium", "high", "critical"].includes(risk)
            ? (risk as ReviewFilters["risk"])
            : "all",
        category: params.get("category") ?? "all",
        source: params.get("source") ?? "all",
      };
      setFilters(restoredFilters);
      setAppliedFilters(restoredFilters);
      setRuleFilter(params.get("rule") ?? "");
      if (Number.isInteger(restoredPage) && restoredPage > 0) setPage(restoredPage);
      if (restoredTaskId && tasks.some((task) => task.id === restoredTaskId)) {
        const restoredTask = tasks.find((task) => task.id === restoredTaskId);
        setActiveId(restoredTaskId);
        setComment(restoredTask?.review_comment ?? "");
        setReviewDirty(false);
        if (restoredTask && requestedPriceId) {
          setFocusMessage(
            `当前审核任务：${restoredTask.wpi_equipment_prices.price_code} ${restoredTask.wpi_equipment_prices.equipment_name}。`
          );
        }
      }
      setReviewUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loading, requestedPriceId, reviewUrlReady, tasks]);

  const categories = useMemo(
    () =>
      [...new Set(tasks.map((task) => task.wpi_equipment_prices.category).filter(Boolean))].sort() as string[],
    [tasks]
  );
  const sources = useMemo(
    () =>
      [...new Set(tasks.map((task) => task.wpi_equipment_prices.source_type).filter(Boolean))].sort() as string[],
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) =>
      matchesReviewFilters(task, appliedFilters, ruleFilter)
    );
  }, [appliedFilters, ruleFilter, tasks]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      pending: tasks.filter((task) =>
        ["pending", "in_review", "need_info"].includes(task.status)
      ).length,
      risk: tasks.filter((task) =>
        ["high", "critical"].includes(task.risk_level)
      ).length,
      missing: tasks.filter((task) => task.missing_fields.length > 0).length,
      source: tasks.filter((task) => !task.evidence_checks.price_source).length,
      approved: tasks.filter(
        (task) =>
          task.status === "approved" &&
          task.reviewed_at &&
          new Date(task.reviewed_at).toDateString() === today
      ).length,
    };
  }, [tasks]);

  const applyKpiFilter = (key: (typeof kpiConfig)[number]["key"]) => {
    if (reviewDirty) {
      toast.warning("请先保存审核进度", "当前任务有未保存修改，保存后再切换运营筛选。");
      return;
    }
    const next: ReviewFilters = {
      ...defaultFilters,
      status:
        key === "pending"
          ? "pending"
          : key === "approved"
            ? "approved"
            : "all",
      risk: key === "risk" ? "high" : "all",
    };
    const nextRule =
      key === "missing"
        ? "__missing__"
        : key === "source"
          ? "__source__"
          : "";

    setRuleFilter(nextRule);
    setFilters(next);
    setAppliedFilters(next);
    setSelectedIds([]);
    setPage(1);

    const firstMatch = tasks.find((task) => {
      if (nextRule === "__missing__") return task.missing_fields.length > 0;
      if (nextRule === "__source__") return !task.evidence_checks.price_source;
      if (next.status !== "all") return task.status === next.status;
      if (next.risk !== "all") return task.risk_level === next.risk;
      return true;
    });
    if (firstMatch) {
      setActiveId(firstMatch.id);
      setComment(firstMatch.review_comment ?? "");
    }
  };

  const kpiFilteredTasks = useMemo(() => {
    if (ruleFilter === "__missing__") {
      return tasks.filter((task) => task.missing_fields.length > 0);
    }
    if (ruleFilter === "__source__") {
      return tasks.filter((task) => !task.evidence_checks.price_source);
    }
    return null;
  }, [ruleFilter, tasks]);

  const visibleTasks = kpiFilteredTasks ?? filteredTasks;
  const activeTask =
    visibleTasks.find((task) => task.id === activeId) ??
    (requestedPriceId ? null : visibleTasks[0] ?? null);
  const focusedArchiveHref = activeTask
    ? activeTask.source_kind === "import" && activeTask.import_batch_id
      ? `/equipment-prices/import/${encodeURIComponent(activeTask.import_batch_id)}`
      : activeTask.equipment_price_id
        ? `/equipment-prices/${encodeURIComponent(activeTask.equipment_price_id)}`
        : "/equipment-prices"
    : "/equipment-prices";
  const visiblePageCount = Math.max(1, Math.ceil(visibleTasks.length / pageSize));
  const visiblePage = Math.min(page, visiblePageCount);
  const visiblePagedTasks = visibleTasks.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize
  );

  useEffect(() => {
    if (!reviewUrlReady) return;
    const params = new URLSearchParams();
    if (activeId) params.set("task", activeId);
    if (visiblePage > 1) params.set("page", String(visiblePage));
    if (appliedFilters.keyword) params.set("q", appliedFilters.keyword);
    if (appliedFilters.status !== "all") params.set("status", appliedFilters.status);
    if (appliedFilters.risk !== "all") params.set("risk", appliedFilters.risk);
    if (appliedFilters.category !== "all") params.set("category", appliedFilters.category);
    if (appliedFilters.source !== "all") params.set("source", appliedFilters.source);
    if (ruleFilter) params.set("rule", ruleFilter);
    const hash = params.toString();
    const nextUrl = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [activeId, appliedFilters, reviewUrlReady, ruleFilter, visiblePage]);

  const selectedTasks = tasks.filter((task) => selectedIds.includes(task.id));
  const batchClaimableCount = selectedTasks.filter(
    (task) =>
      ["pending", "need_info"].includes(task.status) &&
      (!task.assigned_to || task.assigned_to === currentUserId)
  ).length;
  const batchApprovableCount = selectedTasks.filter(
    (task) =>
      task.status === "in_review" &&
      task.assigned_to === currentUserId &&
      task.risk_level === "low" &&
      (task.confidence ?? 0) >= 80 &&
      ["price_source", "supplier", "technical_parameters", "validity"].every(
        (key) => task.evidence_checks[key] === true
      ) &&
      task.matched_rules.length === 0 &&
      task.missing_fields.length === 0
  ).length;
  const batchReturnableCount = selectedTasks.filter(
    (task) =>
      task.status === "in_review" && task.assigned_to === currentUserId
  ).length;

  const patchReview = async (
    reviewId: string,
    decision: EquipmentReviewDecision,
    decisionComment?: string,
    progress?: EquipmentReviewProgress | null
  ) => {
    const response = await fetch(`/api/equipment-prices/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        comment: decisionComment,
        evidenceStates: progress?.evidenceStates,
        resolvedIssueIds: progress?.resolvedIssueIds,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "审核操作失败");
  };

  const executeDecision = async (decision: EquipmentReviewDecision) => {
    if (!activeTask) return;
    if (
      ["approve", "reject", "need_info"].includes(decision) &&
      !comment.trim()
    ) {
      toast.warning("请填写审核意见", "提交人工审核结论前必须填写核验意见。");
      return;
    }

    setBusyDecision(decision);
    try {
      if (decision === "start") {
        await patchReview(activeTask.id, decision, comment);
        toast.success(
          "已认领并开始审核",
          `${activeTask.wpi_equipment_prices.equipment_name} 已保留在当前人工审核工作区。`
        );
        await loadTasks(true, activeTask.id);
        setReviewDirty(false);
        setFocusMessage(
          `${activeTask.wpi_equipment_prices.price_code} 已认领，可继续完成证据核验与人工结论。`
        );
        setConfirmDecision(null);
        return;
      }

      const activeIndex = visibleTasks.findIndex(
        (task) => task.id === activeTask.id
      );
      const actionableTasks = visibleTasks.filter(
        (task) =>
          task.id !== activeTask.id &&
          ["pending", "in_review", "need_info"].includes(task.status)
      );
      const nextTask =
        actionableTasks.find(
          (task) =>
            visibleTasks.findIndex((item) => item.id === task.id) > activeIndex
        ) ?? actionableTasks[0];

      await patchReview(activeTask.id, decision, comment, pendingProgress);
      const message = {
        approve: "设备价格已人工审核通过",
        reject: "设备价格已驳回",
        need_info: "已退回补充资料",
      }[decision];
      toast.success(message, `${activeTask.wpi_equipment_prices.equipment_name} 的价格库状态已同步更新。`);
      await loadTasks(true, nextTask?.id);
      setReviewDirty(false);
      setFocusMessage(
        nextTask
          ? `${activeTask.wpi_equipment_prices.price_code} 已处理，已自动切换到下一条待审核价格。`
          : `${activeTask.wpi_equipment_prices.price_code} 已处理，当前筛选范围内没有其他待审核价格。`
      );
      setConfirmDecision(null);
      setPendingProgress(null);
    } catch (decisionError) {
      toast.danger(
        "审核操作失败",
        decisionError instanceof Error ? decisionError.message : "请稍后重试。"
      );
    } finally {
      setBusyDecision(null);
    }
  };

  const requestDecision = (
    decision: EquipmentReviewDecision,
    progress: EquipmentReviewProgress
  ) => {
    if (
      ["approve", "reject", "need_info"].includes(decision) &&
      !comment.trim()
    ) {
      toast.warning("请填写审核意见", "提交人工审核结论前必须填写核验意见。");
      return;
    }
    setPendingProgress(progress);
    setConfirmDecision(decision);
  };

  const saveReviewProgress = async (progress: EquipmentReviewProgress) => {
    if (!activeTask) return;
    setSavingProgress(true);
    try {
      const response = await fetch(
        `/api/equipment-prices/reviews/${activeTask.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment,
            evidenceStates: progress.evidenceStates,
            resolvedIssueIds: progress.resolvedIssueIds,
          }),
        }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "保存审核进度失败");
      toast.success(
        "审核进度已保存",
        `${activeTask.wpi_equipment_prices.equipment_name} 的证据核验、问题处理和人工意见已同步。`
      );
      await loadTasks(true, activeTask.id);
      setReviewDirty(false);
    } catch (saveError) {
      toast.danger(
        "保存审核进度失败",
        saveError instanceof Error ? saveError.message : "请稍后重试。"
      );
    } finally {
      setSavingProgress(false);
    }
  };

  const runBatch = async (decision: EquipmentReviewDecision) => {
    if (!selectedIds.length) {
      toast.warning("请先选择审核任务", "批量操作不会自动作用于全部记录。");
      return;
    }

    const selected = tasks.filter((task) => selectedIds.includes(task.id));
    const eligible =
      decision === "approve"
        ? selected.filter(
            (task) =>
              task.status === "in_review" &&
              task.assigned_to === currentUserId &&
              task.risk_level === "low" &&
              (task.confidence ?? 0) >= 80 &&
              ["price_source", "supplier", "technical_parameters", "validity"].every(
                (key) => task.evidence_checks[key] === true
              ) &&
              task.matched_rules.length === 0 &&
              task.missing_fields.length === 0
          )
        : decision === "start"
          ? selected.filter(
              (task) =>
                ["pending", "need_info"].includes(task.status) &&
                (!task.assigned_to || task.assigned_to === currentUserId)
            )
          : selected.filter(
              (task) =>
                task.status === "in_review" &&
                task.assigned_to === currentUserId
            );

    if (!eligible.length) {
      toast.warning(
        "没有可处理的记录",
        decision === "approve"
          ? "批量通过仅适用于当前账号已认领、低风险、证据完整的记录。"
          : decision === "start"
            ? "所选任务已结束或已被其他审核员认领。"
            : "仅可退回当前账号已认领且处于审核中的任务。"
      );
      return;
    }

    if (["approve", "need_info"].includes(decision) && !batchComment.trim()) {
      toast.warning("请填写批量审核意见", "批量提交人工结论时必须说明核验结果或补充要求。");
      return;
    }

    setBusyDecision(decision);
    try {
      const response = await fetch("/api/equipment-prices/reviews/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewIds: eligible.map((task) => task.id),
          action: decision,
          comment: batchComment.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as {
        data?: { processedCount?: number };
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "批量审核失败");
      const succeeded = payload.data?.processedCount ?? eligible.length;
      toast.success(
        "批量审核已完成",
        `事务内成功处理 ${succeeded} 条记录；${selected.length - eligible.length} 条不符合当前动作规则，未提交。`
      );
      setSelectedIds([]);
      setBatchComment("");
      await loadTasks(true);
    } catch (batchError) {
      toast.danger(
        "批量审核失败",
        batchError instanceof Error ? batchError.message : "请稍后重试。"
      );
    } finally {
      setBusyDecision(null);
      setConfirmBatchDecision(null);
    }
  };

  const requestBatch = (decision: EquipmentReviewDecision) => {
    if (!permissions?.canBatchReview) {
      toast.warning(
        "当前角色不能执行批量审核",
        "审核员可处理单条任务；批量认领、批量通过和批量退回仅限审核经理或管理员。"
      );
      return;
    }
    if (!selectedIds.length) {
      toast.warning("请先选择审核任务", "批量操作不会自动作用于全部记录。");
      return;
    }
    if (reviewDirty) {
      toast.warning("请先保存审核进度", "当前人工审核工作区有未保存修改。");
      return;
    }
    if (decision === "approve" && batchApprovableCount === 0) {
      toast.warning(
        "没有可批量通过的记录",
        "所选记录需同时满足低风险、置信度不低于 80%、证据完整且无未解决问题。"
      );
      return;
    }
    if (decision === "start" && batchClaimableCount === 0) {
      toast.warning("没有可认领的任务", "所选任务已结束或已由其他审核员认领。");
      return;
    }
    if (decision === "need_info" && batchReturnableCount === 0) {
      toast.warning("没有可退回的任务", "请先认领任务并进入审核中状态。");
      return;
    }
    setBatchComment(
      decision === "approve"
        ? "已核验价格来源、供应商主体、技术参数和有效期，同意低风险价格入库。"
        : decision === "need_info"
          ? "请补充缺失字段、有效期及可追溯价格来源后重新提交。"
          : ""
    );
    setConfirmBatchDecision(decision);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setRuleFilter("");
    setSelectedIds([]);
    setPage(1);
  };

  const applyTaskFilters = async () => {
    if (reviewDirty) {
      toast.warning("请先保存审核进度", "当前任务有未保存修改，保存后再执行查询。");
      return;
    }

    setFiltering(true);
    await new Promise((resolve) => window.setTimeout(resolve, 180));

    const nextMatches = tasks.filter((task) =>
      matchesReviewFilters(task, filters)
    );
    setAppliedFilters(filters);
    setRuleFilter("");
    setSelectedIds([]);
    setPage(1);

    if (nextMatches[0]) {
      selectTask(nextMatches[0].id);
      setFocusMessage(
        `筛选已应用，共找到 ${nextMatches.length} 条审核任务；已定位第一条匹配记录。`
      );
      toast.success(
        "审核任务筛选完成",
        `当前条件匹配 ${nextMatches.length} 条记录。`
      );
    } else {
      setActiveId("");
      setComment("");
      setReviewDirty(false);
      setFocusMessage("当前筛选条件没有匹配的审核任务，请调整条件后重新查询。");
      toast.warning("没有匹配的审核任务", "请调整关键词、状态、风险、类别或来源条件。 ");
    }

    setFiltering(false);
  };

  const selectTask = (id: string) => {
    const nextTask = tasks.find((task) => task.id === id);
    setActiveId(id);
    setComment(nextTask?.review_comment ?? "");
    setReviewDirty(false);
    if (nextTask && requestedPriceId) {
      setFocusMessage(
        `当前审核任务：${nextTask.wpi_equipment_prices.price_code} ${nextTask.wpi_equipment_prices.equipment_name}。`
      );
    }
  };

  const requestTaskSelection = (id: string) => {
    if (id === activeTask?.id) return;
    if (reviewDirty) {
      setPendingTaskId(id);
      return;
    }
    selectTask(id);
  };

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title="设备价格审核中心"
          description="集中处理设备价格来源、参数、可信度与风险复核；AI 预审不替代人工商务判断。"
          actions={
            <>
              <Link
                href="/equipment-prices"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold text-textSecondary shadow-sm hover:border-primary/30 hover:text-primary"
              >
                返回价格库
              </Link>
              <Link
                href="/equipment-prices/import"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-ai/20 bg-ai-soft px-3 text-[13px] font-semibold text-ai shadow-sm hover:border-ai/35"
              >
                <Upload className="size-4" />
                设备价格导入
              </Link>
              <button
                type="button"
                onClick={() => {
                  void loadTasks(true);
                  toast.info("正在刷新审核队列", "将重新读取 Supabase 审核状态。");
                }}
                disabled={loading}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-white shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                刷新数据
              </button>
            </>
          }
        />

        {requestedPriceId && focusMessage ? (
          <section
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-card border px-4 py-2.5 shadow-card",
              activeTask
                ? "border-primary/20 bg-primary-soft"
                : "border-warning/25 bg-warning-soft"
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <LocateFixed
                className={cn(
                  "size-4 shrink-0",
                  activeTask ? "text-primary" : "text-warning"
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[12px] font-bold",
                    activeTask ? "text-primary" : "text-warning"
                  )}
                >
                  {activeTask ? "已进入当前价格的聚焦审核" : "审核任务未定位"}
                </p>
                <p className="truncate text-[11px] text-textSecondary">
                  {focusMessage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={focusedArchiveHref}
                className="inline-flex h-7 items-center rounded-md border border-borderSoft bg-white px-2.5 text-[11px] font-bold text-textSecondary"
              >
                {activeTask?.source_kind === "import"
                  ? "查看导入批次"
                  : "查看价格档案"}
              </Link>
              <Link
                href="/equipment-prices/reviews"
                className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-[11px] font-bold text-white"
              >
                查看全部队列
              </Link>
            </div>
          </section>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          {kpiConfig.map((item) => {
            const Icon = item.icon;
            const value = stats[item.key];
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => applyKpiFilter(item.key)}
                className={cn(
                  "group flex h-[92px] items-center justify-between overflow-hidden rounded-card border bg-gradient-to-br p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover",
                  item.border,
                  item.bg
                )}
              >
                <div>
                  <p className={cn("text-[12px] font-bold", item.text)}>{item.label}</p>
                  <p className={cn("mt-1 text-[25px] font-extrabold tabular-nums", item.text)}>
                    {value}
                    <span className="ml-1 text-[11px] font-semibold">条</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-textMuted">
                    {item.key === "approved" ? "人工审核完成" : "点击快速筛选"}
                  </p>
                </div>
                <IconBox icon={Icon} tone={item.tone} size="lg" className="size-11 group-hover:scale-105" />
              </button>
            );
          })}
        </div>

        <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
          <ModuleHeader
            icon={Filter}
            title="审核任务筛选"
            subtitle="筛选条件与左侧审核队列实时联动"
            tone="cyan"
            density="compact"
          />
          <div className="mt-2.5 grid min-w-0 items-end gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(210px,1.5fr)_repeat(4,minmax(110px,0.75fr))_auto_auto]">
            <label className="min-w-0 sm:col-span-2 lg:col-span-2 2xl:col-span-1">
              <span className="mb-1 block text-[10px] font-semibold text-textMuted">搜索任务</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-textMuted" />
                <input
                  value={filters.keyword}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, keyword: event.target.value }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void applyTaskFilters();
                    }
                  }}
                  placeholder="设备、编号、品牌、供应商"
                  className="h-8 w-full rounded-md border border-borderSoft bg-white pl-8 pr-2 text-[12px] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </label>
            <SelectField
              label="审核状态"
              value={filters.status}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  status: value as ReviewFilters["status"],
                }))
              }
            >
              <option value="all">全部状态</option>
              <option value="pending">待审核</option>
              <option value="in_review">审核中</option>
              <option value="need_info">待补充</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
            </SelectField>
            <SelectField
              label="风险等级"
              value={filters.risk}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  risk: value as ReviewFilters["risk"],
                }))
              }
            >
              <option value="all">全部风险</option>
              <option value="critical">严重风险</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </SelectField>
            <SelectField
              label="设备类别"
              value={filters.category}
              onChange={(value) =>
                setFilters((current) => ({ ...current, category: value }))
              }
            >
              <option value="all">全部类别</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="来源类型"
              value={filters.source}
              onChange={(value) =>
                setFilters((current) => ({ ...current, source: value }))
              }
            >
              <option value="all">全部来源</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </SelectField>
            <button
              type="button"
              onClick={() => void applyTaskFilters()}
              disabled={filtering}
              className="inline-flex h-8 min-w-[70px] items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-primary/90 active:translate-y-px disabled:cursor-wait disabled:opacity-70"
            >
              {filtering ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              {filtering ? "筛选中" : "查询"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (reviewDirty) {
                  toast.warning("请先保存审核进度", "当前任务有未保存修改，保存后再重置筛选。");
                  return;
                }
                resetFilters();
                if (tasks[0]) {
                  selectTask(tasks[0].id);
                } else {
                  setActiveId("");
                  setComment("");
                }
                setFocusMessage(`筛选条件已重置，当前显示全部 ${tasks.length} 条审核任务。`);
                toast.info("筛选条件已重置", `已恢复全部 ${tasks.length} 条审核任务。`);
              }}
              disabled={filtering}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary transition hover:border-primary/30 hover:text-primary active:translate-y-px disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
              重置
            </button>
          </div>
          {ruleFilter ? (
            <div className="mt-2 flex items-center justify-between rounded-md border border-ai-border bg-ai-soft px-2.5 py-1.5 text-[11px] text-ai">
              <span>
                当前附加筛选：
                {ruleFilter === "__missing__"
                  ? "存在缺失字段"
                  : ruleFilter === "__source__"
                    ? "来源证据待核验"
                    : `命中规则“${ruleFilter}”`}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (reviewDirty) {
                    toast.warning("请先保存审核进度", "当前任务有未保存修改。");
                    return;
                  }
                  setRuleFilter("");
                  setSelectedIds([]);
                  setPage(1);
                }}
                className="font-bold"
              >
                清除
              </button>
            </div>
          ) : null}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-borderSoft bg-card px-3 py-2 shadow-card">
          <div className="flex items-center gap-2 text-[12px] text-textSecondary">
            <ListChecks className="size-4 text-primary" />
            <span>
              当前 <b className="text-textMain">{visibleTasks.length}</b> 条
            </span>
            <span className="h-4 w-px bg-borderSoft" />
            <span>
              已选 <b className="text-primary">{selectedIds.length}</b> 条
            </span>
            {selectedIds.length === 0 ? (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                请先勾选任务
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busyDecision !== null}
              onClick={() => requestBatch("start")}
              title="将所选任务标记为审核中，并记录当前审核人员"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-bold text-primary disabled:opacity-50"
            >
              <UserCheck className="size-3.5" />
              认领审核
            </button>
            <button
              type="button"
              disabled={busyDecision !== null}
              onClick={() => requestBatch("approve")}
              title="仅通过所选低风险且 AI 置信度不低于 80% 的任务"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-success/20 bg-success-soft px-3 text-[12px] font-bold text-success disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" />
              批量通过低风险
            </button>
            <button
              type="button"
              disabled={busyDecision !== null}
              onClick={() => requestBatch("need_info")}
              title="将所选任务退回资料补充队列"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-warning/20 bg-warning-soft px-3 text-[12px] font-bold text-warning disabled:opacity-50"
            >
              <AlertTriangle className="size-3.5" />
              批量补充资料
            </button>
            <button
              type="button"
              onClick={() => {
                if (!permissions?.canExportReviewList) {
                  toast.warning(
                    "当前角色不能导出审核清单",
                    "导出审核清单包含组织级审核信息，仅限审核经理或管理员。"
                  );
                  return;
                }
                setExportOpen(true);
              }}
              title="按当前筛选条件导出审核清单"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-bold text-textSecondary disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download className="size-3.5" />
              导出清单
            </button>
          </div>
        </section>

        {error ? (
          <section className="rounded-card border border-danger/20 bg-danger-soft p-5 text-center shadow-card">
            <p className="text-[14px] font-bold text-danger">审核中心读取失败</p>
            <p className="mt-1 text-[12px] text-textSecondary">{error}</p>
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-danger px-3 text-[12px] font-bold text-white"
            >
              <RefreshCw className="size-3.5" />
              重试
            </button>
          </section>
        ) : loading && tasks.length === 0 ? (
          <section className="flex min-h-[420px] items-center justify-center rounded-card border border-borderSoft bg-card shadow-card">
            <div className="text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-[13px] font-semibold text-textSecondary">正在读取设备价格审核任务</p>
            </div>
          </section>
        ) : (
          <>
            <div className="grid min-w-0 items-start gap-3 2xl:grid-cols-[minmax(0,8fr)_minmax(340px,4fr)]">
              <EquipmentReviewQueue
                tasks={visiblePagedTasks}
                total={visibleTasks.length}
                page={visiblePage}
                pageCount={visiblePageCount}
                activeId={activeTask?.id}
                selectedIds={selectedIds}
                onSelectTask={requestTaskSelection}
                onToggleTask={(id) =>
                  setSelectedIds((current) =>
                    current.includes(id)
                      ? current.filter((item) => item !== id)
                      : [...current, id]
                  )
                }
                onToggleVisible={() => {
                  const visibleIds = visiblePagedTasks.map((task) => task.id);
                  const allSelected = visibleIds.every((id) => selectedIds.includes(id));
                  setSelectedIds((current) =>
                    allSelected
                      ? current.filter((id) => !visibleIds.includes(id))
                      : [...new Set([...current, ...visibleIds])]
                  );
                }}
                onPageChange={setPage}
                onMore={(task) => {
                  requestTaskSelection(task.id);
                }}
              />
              <EquipmentReviewDetail
                key={activeTask?.id ?? "empty-review-task"}
                task={activeTask}
                comment={comment}
                busyDecision={busyDecision}
                savingProgress={savingProgress}
                canReview={canReview}
                canRunAiReview={Boolean(permissions?.canRunAiReview)}
                canReadFullAudit={Boolean(permissions?.canReadFullAudit)}
                userRole={permissions?.role ?? "viewer"}
                currentUserId={currentUserId}
                dirty={reviewDirty}
                onCommentChange={setComment}
                onDirtyChange={setReviewDirty}
                onDecision={requestDecision}
                onSaveProgress={(progress) => {
                  void saveReviewProgress(progress);
                }}
                onAiCompleted={() => {
                  void loadTasks(true, activeTask?.id ?? "");
                }}
              />
            </div>
            <EquipmentReviewAnalytics
              tasks={tasks}
              onRuleClick={(rule) => {
                if (reviewDirty) {
                  toast.warning("请先保存审核进度", "当前任务有未保存修改，保存后再切换规则筛选。");
                  return;
                }
                setRuleFilter(rule);
                setAppliedFilters(defaultFilters);
                setFilters(defaultFilters);
                setSelectedIds([]);
                setPage(1);
                const firstMatch = tasks.find((task) => task.matched_rules.includes(rule));
                if (firstMatch) selectTask(firstMatch.id);
              }}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDecision !== null}
        title={
          confirmDecision === "start"
            ? "确认认领审核任务"
            : confirmDecision === "approve"
            ? "确认通过设备价格"
            : confirmDecision === "reject"
              ? "确认驳回设备价格"
              : "确认退回补充资料"
        }
        description={
          activeTask
            ? `将对 ${activeTask.wpi_equipment_prices.price_code} ${activeTask.wpi_equipment_prices.equipment_name}（${formatReviewPrice(activeTask)}）执行审核动作。`
            : undefined
        }
        confirmLabel={
          confirmDecision === "start"
            ? "确认认领"
            : confirmDecision === "approve"
            ? "确认通过"
            : confirmDecision === "reject"
              ? "确认驳回"
              : "确认退回"
        }
        tone={
          confirmDecision === "reject"
            ? "danger"
            : confirmDecision === "need_info"
              ? "warning"
              : "default"
        }
        onCancel={() => {
          setConfirmDecision(null);
          setPendingProgress(null);
        }}
        onConfirm={() => {
          if (confirmDecision) void executeDecision(confirmDecision);
        }}
      >
        <div className="space-y-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-textMuted">风险等级</span>
            <span className="font-bold text-textMain">
              {activeTask?.risk_level === "critical"
                ? "严重"
                : activeTask?.risk_level === "high"
                  ? "高风险"
                  : activeTask?.risk_level === "medium"
                    ? "中风险"
                    : "低风险"}
            </span>
          </div>
          <p className="leading-5">
            {comment.trim() ? `人工意见：${comment.trim()}` : "尚未填写人工意见。"}
          </p>
          <p className="text-[11px] text-textMuted">
            确认后将同步更新审核任务与价格库状态，并写入审计日志。
          </p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmBatchDecision !== null}
        title={
          confirmBatchDecision === "approve"
            ? "确认批量通过低风险价格"
            : confirmBatchDecision === "need_info"
              ? "确认批量退回补充资料"
              : "确认批量认领审核任务"
        }
        description={`当前已选择 ${selectedTasks.length} 条设备价格，符合当前动作的记录将在一个数据库事务中处理。`}
        confirmLabel={
          confirmBatchDecision === "approve"
            ? `通过 ${batchApprovableCount} 条`
            : confirmBatchDecision === "need_info"
              ? "确认退回"
              : "确认认领"
        }
        tone={confirmBatchDecision === "need_info" ? "warning" : "default"}
        onCancel={() => {
          setConfirmBatchDecision(null);
          setBatchComment("");
        }}
        onConfirm={() => {
          if (confirmBatchDecision) void runBatch(confirmBatchDecision);
        }}
      >
        <div className="space-y-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] p-3">
          {confirmBatchDecision === "approve" ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-textMuted">满足自动通过条件</span>
                <b className="text-success">{batchApprovableCount} 条</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textMuted">转人工逐条处理</span>
                <b className="text-warning">
                  {selectedTasks.length - batchApprovableCount} 条
                </b>
              </div>
              <p className="text-[11px] leading-5 text-textMuted">
                仅当前账号已认领、低风险、AI 置信度不低于 80%、证据完整且无未解决问题的记录可以批量通过。AI 只负责筛选，最终结论由人工提交。
              </p>
            </>
          ) : (
            <p className="text-[11px] leading-5 text-textSecondary">
              操作后会同步更新审核任务、设备价格状态和审计日志；已完成的任务将自动跳过。
            </p>
          )}
          {confirmBatchDecision !== "start" ? (
            <label className="block pt-1">
              <span className="mb-1 block text-[11px] font-bold text-textMain">
                批量人工审核意见 <span className="text-danger">*</span>
              </span>
              <textarea
                value={batchComment}
                onChange={(event) => setBatchComment(event.target.value)}
                className="min-h-20 w-full resize-y rounded-md border border-borderSoft bg-white px-3 py-2 text-[12px] leading-5 text-textMain outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                placeholder="填写本次批量核验结论或资料补充要求"
              />
            </label>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(pendingTaskId)}
        title="切换审核任务"
        description="当前人工审核工作区存在未保存修改，直接切换会丢失本次证据核验、问题处理和审核意见。"
        confirmLabel="放弃修改并切换"
        tone="warning"
        onCancel={() => setPendingTaskId("")}
        onConfirm={() => {
          const nextId = pendingTaskId;
          setPendingTaskId("");
          setReviewDirty(false);
          if (nextId) selectTask(nextId);
        }}
      >
        <p className="rounded-md border border-warning/20 bg-warning-soft p-3 text-[11px] leading-5 text-warning">
          建议先点击右侧“保存进度”。放弃修改不会改变 Supabase 中已保存的审核记录。
        </p>
      </ConfirmDialog>

      <MockExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(format) => {
          setExportOpen(false);
          toast.success(
            "审核清单导出任务已创建",
            `已按当前筛选条件模拟生成 ${format} 审核清单，共 ${visibleTasks.length} 条。`
          );
        }}
      />
    </AppLayout>
  );
}
