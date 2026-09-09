"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  FileClock,
  FileSpreadsheet,
  Filter,
  ListChecks,
  Loader2,
  Pencil,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { IconBox } from "@/components/common/IconBox";
import { LoadingButton } from "@/components/common/LoadingButton";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { OverlayShell } from "@/components/common/OverlayShell";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type {
  EquipmentImportBatchDetail,
  EquipmentImportBatchStatus,
  EquipmentImportRow,
  EquipmentImportValidationStatus,
} from "@/types/equipmentImport";

type DetailTab = "overview" | "mapping" | "results" | "issues" | "history";
type ConfirmAction = "submit" | "cancel" | "ignore" | null;

const tabs: Array<{ key: DetailTab; label: string }> = [
  { key: "overview", label: "批次概览" },
  { key: "mapping", label: "字段映射" },
  { key: "results", label: "解析结果" },
  { key: "issues", label: "问题清单" },
  { key: "history", label: "操作历史" },
];

const batchStatus: Record<
  EquipmentImportBatchStatus,
  { label: string; className: string }
> = {
  draft: { label: "草稿", className: "border-slate-200 bg-slate-100 text-slate-600" },
  uploaded: { label: "已上传", className: "border-primary/20 bg-primary-soft text-primary" },
  parsing: { label: "解析中", className: "border-ai/20 bg-ai-soft text-ai" },
  mapping: { label: "字段映射", className: "border-ai/20 bg-ai-soft text-ai" },
  validating: { label: "校验中", className: "border-warning/20 bg-warning-soft text-warning" },
  needs_review: { label: "待人工复核", className: "border-warning/20 bg-warning-soft text-warning" },
  importing: { label: "入库中", className: "border-primary/20 bg-primary-soft text-primary" },
  completed: { label: "已完成", className: "border-success/20 bg-success-soft text-success" },
  failed: { label: "失败", className: "border-danger/20 bg-danger-soft text-danger" },
  cancelled: { label: "已取消", className: "border-slate-200 bg-slate-100 text-slate-500" },
};

const validationStatus: Record<
  EquipmentImportValidationStatus,
  { label: string; className: string }
> = {
  valid: { label: "可入库", className: "border-success/20 bg-success-soft text-success" },
  warning: { label: "待补全", className: "border-warning/20 bg-warning-soft text-warning" },
  error: { label: "价格异常", className: "border-danger/20 bg-danger-soft text-danger" },
  duplicate: { label: "疑似重复", className: "border-ai/20 bg-ai-soft text-ai" },
  ignored: { label: "已忽略", className: "border-slate-200 bg-slate-100 text-slate-500" },
  submitted: { label: "已提交", className: "border-primary/20 bg-primary-soft text-primary" },
  imported: { label: "已入库", className: "border-success/20 bg-success-soft text-success" },
};

const editableValidationStatusEntries = Object.entries(validationStatus).filter(
  ([value]) => !["submitted", "imported"].includes(value)
);

const rowReviewStatus = {
  pending: { label: "待审核", className: "border-warning/20 bg-warning-soft text-warning" },
  in_review: { label: "审核中", className: "border-primary/20 bg-primary-soft text-primary" },
  need_info: { label: "待补资料", className: "border-ai/20 bg-ai-soft text-ai" },
  approved: { label: "已通过", className: "border-success/20 bg-success-soft text-success" },
  rejected: { label: "已驳回", className: "border-danger/20 bg-danger-soft text-danger" },
  archived: { label: "已归档", className: "border-borderSoft bg-slate-50 text-textMuted" },
} as const;

const kpiTone = {
  blue: {
    card: "border-blue-100 from-blue-50 to-white",
    icon: "from-blue-500 to-blue-600 shadow-blue-500/20",
    text: "text-blue-600",
  },
  green: {
    card: "border-emerald-100 from-emerald-50 to-white",
    icon: "from-emerald-400 to-emerald-600 shadow-emerald-500/20",
    text: "text-emerald-600",
  },
  orange: {
    card: "border-orange-100 from-orange-50 to-white",
    icon: "from-amber-400 to-orange-500 shadow-orange-500/20",
    text: "text-orange-500",
  },
  red: {
    card: "border-red-100 from-red-50 to-white",
    icon: "from-red-400 to-red-600 shadow-red-500/20",
    text: "text-red-500",
  },
  purple: {
    card: "border-purple-100 from-purple-50 to-white",
    icon: "from-violet-500 to-purple-600 shadow-violet-500/20",
    text: "text-violet-600",
  },
  cyan: {
    card: "border-cyan-100 from-cyan-50 to-white",
    icon: "from-cyan-400 to-cyan-600 shadow-cyan-500/20",
    text: "text-cyan-600",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(value: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function statusCounts(rows: EquipmentImportRow[]) {
  return rows.reduce(
    (counts, row) => {
      counts[row.status] += 1;
      return counts;
    },
    {
      valid: 0,
      warning: 0,
      error: 0,
      duplicate: 0,
      ignored: 0,
      submitted: 0,
      imported: 0,
    }
  );
}

export function EquipmentImportBatchDetailView({
  batchId,
}: {
  batchId: string;
}) {
  const toast = useMockToast();
  const [detail, setDetail] = useState<EquipmentImportBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("results");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EquipmentImportValidationStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewRow, setViewRow] = useState<EquipmentImportRow | null>(null);
  const [editRow, setEditRow] = useState<EquipmentImportRow | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "parse" | "submit" | "cancel" | "ignore" | "save" | null
  >(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const pageSize = 15;

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/equipment-prices/imports/${encodeURIComponent(batchId)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        data?: EquipmentImportBatchDetail;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "读取导入批次失败");
      }
      setDetail(payload.data);
      setSelectedIds(
        payload.data.rows
          .filter(
            (row) =>
              row.selected &&
              !row.equipmentPriceId &&
              !["submitted", "imported"].includes(row.status)
          )
          .map((row) => row.id)
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取导入批次失败");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    // Initial request synchronizes this client view with the persisted batch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDetail();
  }, [loadDetail]);

  const rows = useMemo(() => detail?.rows ?? [], [detail?.rows]);
  const counts = useMemo(() => statusCounts(rows), [rows]);
  const categories = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.category).filter(Boolean))).sort(),
    [rows]
  );
  const filteredRows = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesKeyword =
        !search ||
        [
          row.equipmentName,
          row.model,
          row.brand,
          row.category,
          row.supplier,
        ].some((value) => value.toLowerCase().includes(search));
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || row.category === categoryFilter;
      const matchesConfidence =
        confidenceFilter === "all" ||
        (confidenceFilter === "high" && row.confidence >= 90) ||
        (confidenceFilter === "medium" &&
          row.confidence >= 70 &&
          row.confidence < 90) ||
        (confidenceFilter === "low" && row.confidence < 70);
      const matchesIssueTab =
        activeTab !== "issues" ||
        ["warning", "error", "duplicate"].includes(row.status);
      return (
        matchesKeyword &&
        matchesStatus &&
        matchesCategory &&
        matchesConfidence &&
        matchesIssueTab
      );
    });
  }, [
    activeTab,
    categoryFilter,
    confidenceFilter,
    keyword,
    rows,
    statusFilter,
  ]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const allPageSelected =
    pageRows.some((row) => !["submitted", "imported"].includes(row.status)) &&
    pageRows
      .filter((row) => !["submitted", "imported"].includes(row.status))
      .every((row) => selectedIds.includes(row.id));
  const hasReturnedRows = rows.some((row) => row.reviewStatus === "need_info");
  const batchEditable = [
    "draft",
    "uploaded",
    "mapping",
    "validating",
  ].includes(detail?.batch.status ?? "");
  const canSubmitReview =
    Boolean(detail?.canWrite) &&
    rows.some(
      (row) =>
        row.selected && ["valid", "warning"].includes(row.status)
    ) &&
    (batchEditable ||
      (detail?.batch.status === "needs_review" && hasReturnedRows));
  const selectedMutableIds = selectedIds.filter((id) => {
    const row = rows.find((item) => item.id === id);
    return Boolean(
      row &&
        !row.equipmentPriceId &&
        !["submitted", "imported"].includes(row.status)
    );
  });
  const submitReviewLabel = hasReturnedRows
    ? "重新提交补正记录"
    : "提交人工审核";

  const patchBatch = async (
    body: Record<string, unknown>,
    successTitle: string
  ) => {
    const response = await fetch(
      `/api/equipment-prices/imports/${encodeURIComponent(batchId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const payload = (await response.json()) as {
      data?: {
        row?: EquipmentImportRow;
        batch?: EquipmentImportBatchDetail["batch"];
      } & EquipmentImportBatchDetail["batch"];
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error || "操作失败");
    toast.success(successTitle);
    return payload.data;
  };

  const handleReparse = async () => {
    if (!detail?.canWrite) {
      toast.warning("当前账号无重新解析权限");
      return;
    }
    setActionLoading("parse");
    try {
      const response = await fetch(
        `/api/equipment-prices/imports/${encodeURIComponent(batchId)}/parse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sheetName: detail.batch.sheet_name }),
        }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "重新解析失败");
      toast.ai("AI 重新解析完成", "解析结果、字段映射与质量评分已更新。");
      await loadDetail();
    } catch (parseError) {
      toast.danger(
        "重新解析失败",
        parseError instanceof Error ? parseError.message : "请稍后重试"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAction = async () => {
    const current = confirmAction;
    if (!current) return;
    setActionLoading(current);
    try {
      if (current === "ignore") {
        await patchBatch(
          { action: "ignore_rows", rowIds: selectedMutableIds },
          `已忽略 ${selectedMutableIds.length} 条记录`
        );
      } else {
        await patchBatch(
          { action: current === "submit" ? "submit_review" : "cancel" },
          current === "submit" ? "批次已提交人工审核" : "批次已取消"
        );
      }
      setConfirmAction(null);
      await loadDetail();
    } catch (actionError) {
      toast.danger(
        "操作失败",
        actionError instanceof Error ? actionError.message : "请稍后重试"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const saveEditedRow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editRow) return;
    setSavingRow(true);
    try {
      const result = await patchBatch(
        { action: "update_row", row: editRow },
        "解析记录已修正"
      );
      if (result?.row) {
        setDetail((current) =>
          current
            ? {
                ...current,
                batch: result.batch ?? current.batch,
                rows: current.rows.map((row) =>
                  row.id === result.row?.id
                    ? {
                        ...result.row,
                        reviewTaskId:
                          result.row.reviewTaskId ?? row.reviewTaskId,
                        reviewStatus:
                          result.row.reviewStatus ?? row.reviewStatus,
                        equipmentPriceId:
                          result.row.equipmentPriceId ?? row.equipmentPriceId,
                        reviewedAt:
                          result.row.reviewedAt ?? row.reviewedAt,
                        reviewComment:
                          result.row.reviewComment ?? row.reviewComment,
                      }
                    : row
                ),
              }
            : current
        );
      }
      setEditRow(null);
    } catch (saveError) {
      toast.danger(
        "保存失败",
        saveError instanceof Error ? saveError.message : "请稍后重试"
      );
    } finally {
      setSavingRow(false);
    }
  };

  const saveDraft = async () => {
    if (!detail?.canWrite) {
      toast.warning("当前账号无保存权限");
      return;
    }
    setActionLoading("save");
    try {
      const result = await patchBatch(
        { action: "save_draft" },
        "导入批次草稿已保存"
      );
      if (result) {
        const nextBatch = result.batch ?? result;
        setDetail((current) =>
          current ? { ...current, batch: nextBatch } : current
        );
      }
    } catch (saveError) {
      toast.danger(
        "保存草稿失败",
        saveError instanceof Error ? saveError.message : "请稍后重试"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const togglePage = () => {
    const pageIds = pageRows
      .filter((row) => !["submitted", "imported"].includes(row.status))
      .map((row) => row.id);
    if (pageIds.length === 0) {
      toast.info("当前页记录均已进入审核或完成入库");
      return;
    }
    const nextSelected = !allPageSelected;
    setSelectedIds((current) =>
      nextSelected
        ? Array.from(new Set([...current, ...pageIds]))
        : current.filter((id) => !pageIds.includes(id))
    );
    void patchBatch(
      {
        action: "set_row_selection",
        rowIds: pageIds,
        selected: nextSelected,
      },
      nextSelected ? "本页记录已全选" : "本页记录已取消选择"
    ).catch((selectionError) => {
      toast.danger(
        "选择状态同步失败",
        selectionError instanceof Error ? selectionError.message : "请稍后重试"
      );
      void loadDetail();
    });
  };

  const toggleRowSelection = (row: EquipmentImportRow) => {
    const nextSelected = !selectedIds.includes(row.id);
    setSelectedIds((current) =>
      nextSelected
        ? [...current, row.id]
        : current.filter((id) => id !== row.id)
    );
    void patchBatch(
      {
        action: "set_row_selection",
        rowIds: [row.id],
        selected: nextSelected,
      },
      nextSelected ? "记录已加入审核范围" : "记录已移出审核范围"
    ).catch((selectionError) => {
      toast.danger(
        "选择状态同步失败",
        selectionError instanceof Error ? selectionError.message : "请稍后重试"
      );
      void loadDetail();
    });
  };

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setConfidenceFilter("all");
    setPage(1);
    toast.info("筛选条件已重置");
  };

  const downloadIssues = () => {
    const issueRows = rows.filter((row) =>
      ["warning", "error", "duplicate"].includes(row.status)
    );
    const csv = [
      ["行号", "设备名称", "规格型号", "状态", "问题"].join(","),
      ...issueRows.map((row) =>
        [
          row.rowNumber,
          `"${row.equipmentName.replaceAll('"', '""')}"`,
          `"${row.model.replaceAll('"', '""')}"`,
          validationStatus[row.status].label,
          `"${row.issues.join("；").replaceAll('"', '""')}"`,
        ].join(",")
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${detail?.batch.batch_code ?? "import"}-问题清单.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("问题清单已导出", `共导出 ${issueRows.length} 条记录。`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[560px] items-center justify-center rounded-card border border-borderSoft bg-card shadow-card">
          <div className="text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-[13px] text-textMuted">正在读取导入批次...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !detail) {
    return (
      <AppLayout>
        <EmptyState
          title="无法打开导入批次"
          description={error || "该批次不存在或当前账号无访问权限。"}
          primaryAction={
            <button
              type="button"
              onClick={() => void loadDetail()}
              className="h-9 rounded-md bg-primary px-4 text-[13px] font-semibold text-white"
            >
              重新加载
            </button>
          }
          secondaryAction={
            <Link
              href="/equipment-prices/import"
              className="h-9 rounded-md border border-borderSoft bg-white px-4 py-2 text-[13px] font-semibold text-textSecondary"
            >
              返回导入中心
            </Link>
          }
        />
      </AppLayout>
    );
  }

  const { batch } = detail;
  const status = batchStatus[batch.status];
  const issueCount = counts.warning + counts.error + counts.duplicate;
  const currentStep =
    batch.status === "completed"
      ? 6
      : batch.status === "needs_review"
        ? 5
        : Math.min(4, Math.max(1, batch.current_step + 1));
  const kpis = [
    { label: "识别总行数", value: rows.length, note: `工作表 ${batch.sheet_name}`, tone: "blue" as const, icon: ListChecks },
    { label: "已提交审核", value: batch.submitted_rows ?? counts.submitted + counts.imported, note: "逐条生成审核任务", tone: "purple" as const, icon: UserCheck },
    { label: "待审核", value: batch.needs_review_rows, note: "尚未进入正式价格库", tone: "orange" as const, icon: FileCheck2 },
    { label: "已正式入库", value: batch.imported_rows ?? counts.imported, note: "仅人工通过后生成", tone: "green" as const, icon: ShieldCheck },
    { label: "驳回 / 跳过", value: (batch.rejected_rows ?? 0) + (batch.skipped_rows ?? counts.ignored), note: "保留原始证据与原因", tone: "red" as const, icon: ShieldAlert },
    { label: "映射置信度", value: `${Math.round(Number(batch.mapping_confidence) || 0)}%`, note: "AI 字段映射质量", tone: "cyan" as const, icon: Sparkles },
  ];
  const aiFindings = [
    {
      count: counts.warning,
      text: "条记录存在缺失字段，建议补全规格型号、品牌或报价日期",
      confidence: 96,
    },
    {
      count: counts.error,
      text: "条价格偏离历史区间，需人工核对币种、单位与价格条件",
      confidence: 92,
    },
    {
      count: counts.duplicate,
      text: "条记录疑似与批次内设备重复，建议先执行去重判断",
      confidence: 90,
    },
  ];

  return (
    <AppLayout>
      <div className="grid gap-3 pb-20">
        <section className="rounded-card border border-borderSoft bg-card px-4 py-3 shadow-card">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Link
                href="/equipment-prices/import"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="size-3.5" />
                返回设备价格导入中心
              </Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-bold text-textMain">设备价格导入批次详情</h1>
                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold", status.className)}>
                  {status.label}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-textMuted">
                核对 Excel 解析结果、字段映射、异常记录与人工审核门禁
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!detail.downloadUrl}
                onClick={() => {
                  if (detail.downloadUrl) window.open(detail.downloadUrl, "_blank", "noopener,noreferrer");
                }}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary disabled:opacity-45"
              >
                <Download className="size-4" />
                下载原文件
              </button>
              <LoadingButton
                tone="ghost"
                loading={actionLoading === "parse"}
                disabled={!detail.canWrite || !batchEditable}
                icon={<RefreshCcw className="size-4" />}
                onClick={() => void handleReparse()}
              >
                重新解析
              </LoadingButton>
              <button
                type="button"
                onClick={downloadIssues}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"
              >
                <FileCheck2 className="size-4" />
                导出问题清单
              </button>
              <button
                type="button"
                disabled={!detail.canWrite || ["cancelled", "completed", "needs_review"].includes(batch.status)}
                onClick={() => setConfirmAction("cancel")}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-danger/20 bg-danger-soft px-3 text-[12px] font-semibold text-danger disabled:opacity-45"
              >
                <X className="size-4" />
                取消批次
              </button>
              <LoadingButton
                loading={actionLoading === "submit"}
                disabled={!canSubmitReview}
                icon={<UserCheck className="size-4" />}
                onClick={() => setConfirmAction("submit")}
              >
                {submitReviewLabel}
              </LoadingButton>
              {batch.status === "needs_review" ? (
                <Link
                  href="/equipment-prices/reviews"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-ai/20 bg-ai-soft px-3 text-[12px] font-semibold text-ai"
                >
                  <ClipboardCheck className="size-4" />
                  进入审核队列
                </Link>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-borderSoft pt-2 text-[10px] text-textMuted">
            <span>批次编号：<strong className="text-textSecondary">{batch.batch_code}</strong></span>
            <span className="max-w-[420px] truncate" title={batch.file_name}>原文件：<strong className="text-textSecondary">{batch.file_name}</strong></span>
            <span>创建人：<strong className="text-textSecondary">{batch.created_by_name || "当前业务用户"}</strong></span>
            <span>创建时间：<strong className="text-textSecondary">{formatDate(batch.created_at)}</strong></span>
            <span>最近更新：<strong className="text-textSecondary">{formatDate(batch.updated_at || batch.parsed_at)}</strong></span>
          </div>
        </section>

        <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const tone = kpiTone[kpi.tone];
            return (
              <article
                key={kpi.label}
                className={cn("min-h-[88px] rounded-[10px] border bg-gradient-to-br px-3.5 py-3 shadow-card", tone.card)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("text-[11px] font-semibold", tone.text)}>{kpi.label}</p>
                    <strong className={cn("mt-1.5 block text-[25px] leading-none tabular-nums", tone.text)}>{kpi.value}</strong>
                    <p className="mt-1.5 truncate text-[9px] text-textMuted">{kpi.note}</p>
                  </div>
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br text-white shadow-lg", tone.icon)}>
                    <Icon className="size-5" />
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
            <ModuleHeader
              icon={FileClock}
              title="导入处理进度"
              subtitle={`自动校验完成，发现 ${issueCount} 条需人工处理记录`}
              density="compact"
            />
            <div className="mt-4 grid grid-cols-6">
              {["文件上传", "Excel解析", "字段映射", "数据校验", "人工复核", "正式入库"].map((label, index) => {
                const step = index + 1;
                const completed = step < currentStep;
                const active = step === currentStep;
                return (
                  <div key={label} className="relative min-w-0 text-center">
                    {index > 0 ? (
                      <span className={cn("absolute right-1/2 top-3 h-0.5 w-full", completed || active ? "bg-success" : "bg-slate-200")} />
                    ) : null}
                    <span className={cn(
                      "relative z-10 mx-auto flex size-6 items-center justify-center rounded-full border text-[10px] font-bold",
                      completed
                        ? "border-success bg-success text-white"
                        : active
                          ? "border-primary bg-primary text-white ring-4 ring-primary/10"
                          : "border-slate-200 bg-white text-textMuted"
                    )}>
                      {completed ? <Check className="size-3.5" /> : step}
                    </span>
                    <p className={cn("mt-2 truncate text-[10px] font-semibold", active ? "text-primary" : "text-textSecondary")}>{label}</p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-card border border-ai/20 bg-gradient-to-br from-ai-soft via-white to-white p-4 shadow-card">
            <ModuleHeader icon={Bot} title="AI解析质量" subtitle="字段、价格与供应商匹配综合判断" tone="purple" density="compact" />
            <div className="mt-3 flex items-center gap-4">
              <div className="relative size-[96px] shrink-0 rounded-full" style={{ background: `conic-gradient(var(--color-ai) ${Number(batch.mapping_confidence) || 0}%, #E9E5FF 0)` }}>
                <div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full bg-white">
                  <strong className="text-[23px] leading-none text-ai">{Math.round(Number(batch.mapping_confidence) || 0)}%</strong>
                  <span className="mt-1 text-[9px] text-textMuted">综合得分</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2 text-[10px]">
                {[["字段识别", 96], ["价格识别", 94], ["供应商匹配", 88]].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-3">
                    <span className="text-textSecondary">{label}</span>
                    <strong className="text-textMain">{value}%</strong>
                  </div>
                ))}
                <p className="border-t border-ai/10 pt-2 text-ai">AI结果仅供辅助，入库前必须人工确认</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
            <div className="flex min-h-11 items-end gap-1 border-b border-borderSoft px-3">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                  className={cn(
                    "relative h-11 px-3 text-[11px] font-semibold",
                    activeTab === tab.key ? "text-primary" : "text-textMuted hover:text-textMain"
                  )}
                >
                  {tab.label}
                  {tab.key === "issues" && issueCount > 0 ? (
                    <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[8px] text-white">{issueCount}</span>
                  ) : null}
                  {activeTab === tab.key ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" /> : null}
                </button>
              ))}
            </div>

            {(activeTab === "results" || activeTab === "issues") && (
              <>
                <div className="grid gap-2 border-b border-borderSoft bg-slate-50/70 p-3 md:grid-cols-[minmax(180px,1.4fr)_repeat(3,minmax(120px,0.7fr))_auto]">
                  <label className="relative">
                    <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-textMuted" />
                    <input
                      value={keyword}
                      onChange={(event) => {
                        setKeyword(event.target.value);
                        setPage(1);
                      }}
                      placeholder="搜索设备名称、型号、品牌或供应商"
                      className="h-8 w-full rounded-md border border-borderSoft bg-white pl-8 pr-3 text-[11px] outline-none focus:border-primary"
                    />
                  </label>
                  <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }} className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textSecondary outline-none">
                    <option value="all">全部校验状态</option>
                    {Object.entries(validationStatus).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                  </select>
                  <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textSecondary outline-none">
                    <option value="all">全部设备类别</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <select value={confidenceFilter} onChange={(event) => { setConfidenceFilter(event.target.value); setPage(1); }} className="h-8 rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textSecondary outline-none">
                    <option value="all">全部置信度</option>
                    <option value="high">高（≥90%）</option>
                    <option value="medium">中（70%-89%）</option>
                    <option value="low">低（＜70%）</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toast.success("筛选已应用", `当前显示 ${filteredRows.length} 条记录。`)} className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-semibold text-white">
                      <Filter className="size-3.5" /> 查询
                    </button>
                    <button type="button" onClick={resetFilters} className="h-8 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold text-textSecondary">重置</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1480px] table-fixed text-left text-[10px]">
                    <thead className="bg-slate-50 text-textSecondary">
                      <tr className="h-9 border-b border-borderSoft">
                        <th className="w-10 px-2 text-center"><input type="checkbox" checked={allPageSelected} onChange={togglePage} /></th>
                        <th className="w-12 px-2 text-center">行号</th>
                        <th className="w-36 px-2">设备名称</th>
                        <th className="w-28 px-2">规格型号</th>
                        <th className="w-24 px-2">品牌</th>
                        <th className="w-24 px-2">设备类别</th>
                        <th className="w-24 px-2 text-right">原始价格</th>
                        <th className="w-16 px-2 text-center">币种</th>
                        <th className="w-32 px-2">供应商</th>
                        <th className="w-24 px-2">报价日期</th>
                        <th className="w-20 px-2 text-center">置信度</th>
                        <th className="w-24 px-2 text-center">校验状态</th>
                        <th className="w-24 px-2 text-center">审核状态</th>
                        <th className="w-48 px-2">问题</th>
                        <th className="w-36 px-2 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row) => {
                        const rowStatus = validationStatus[row.status];
                        return (
                          <tr key={row.id} className="h-10 border-b border-borderSoft last:border-b-0 hover:bg-primary-soft/30">
                            <td className="px-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(row.id)}
                                disabled={["submitted", "imported"].includes(row.status)}
                                onChange={() => toggleRowSelection(row)}
                              />
                            </td>
                            <td className="px-2 text-center text-textMuted">{row.rowNumber}</td>
                            <td className="truncate px-2 font-semibold text-textMain" title={row.equipmentName}>{row.equipmentName || "待补全"}</td>
                            <td className="truncate px-2 text-textSecondary" title={row.model}>{row.model || "—"}</td>
                            <td className="truncate px-2 text-textSecondary" title={row.brand}>{row.brand || "—"}</td>
                            <td className="truncate px-2 text-textSecondary">{row.category || "未分类"}</td>
                            <td className="px-2 text-right font-semibold tabular-nums text-textMain">{row.originalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td className="px-2 text-center text-textSecondary">{row.currency}</td>
                            <td className="truncate px-2 text-textSecondary" title={row.supplier}>{row.supplier || "—"}</td>
                            <td className="px-2 text-textSecondary">{row.quoteDate || "—"}</td>
                            <td className="px-2 text-center">
                              <span className={cn("rounded-full px-2 py-0.5 font-semibold", row.confidence >= 90 ? "bg-success-soft text-success" : row.confidence >= 70 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger")}>{Math.round(row.confidence)}%</span>
                            </td>
                            <td className="px-2 text-center"><span className={cn("rounded-full border px-2 py-0.5 font-semibold", rowStatus.className)}>{rowStatus.label}</span></td>
                            <td className="px-2 text-center">
                              {row.reviewStatus ? (
                                <span className={cn("rounded-full border px-2 py-0.5 font-semibold", rowReviewStatus[row.reviewStatus].className)}>{rowReviewStatus[row.reviewStatus].label}</span>
                              ) : (
                                <span className="text-textMuted">未提交</span>
                              )}
                            </td>
                            <td className={cn("truncate px-2", row.issues.length ? "text-warning" : "text-textMuted")} title={row.issues.join("；")}>{row.issues.join("；") || "—"}</td>
                            <td className="px-2">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => setViewRow(row)} className="inline-flex h-6 items-center gap-1 rounded border border-primary/20 bg-primary-soft px-2 font-semibold text-primary"><Eye className="size-3" />查看</button>
                                {row.reviewTaskId &&
                                row.reviewStatus !== "need_info" &&
                                !row.equipmentPriceId ? (
                                  <Link href={`/equipment-prices/reviews?priceId=${row.id}`} className="inline-flex h-6 items-center gap-1 rounded border border-ai/20 bg-ai-soft px-2 font-semibold text-ai"><UserCheck className="size-3" />审核</Link>
                                ) : row.equipmentPriceId ? (
                                  <Link href={`/equipment-prices/${row.equipmentPriceId}`} className="inline-flex h-6 items-center gap-1 rounded border border-success/20 bg-success-soft px-2 font-semibold text-success"><ShieldCheck className="size-3" />价格档案</Link>
                                ) : (
                                  <>
                                    <button type="button" disabled={!detail.canWrite || ["submitted", "imported"].includes(row.status)} onClick={() => setEditRow({ ...row })} className="inline-flex h-6 items-center gap-1 rounded border border-warning/20 bg-warning-soft px-2 font-semibold text-warning disabled:opacity-40"><Pencil className="size-3" />{row.reviewStatus === "need_info" ? "补正" : "修正"}</button>
                                    <button type="button" disabled={!detail.canWrite || ["submitted", "imported"].includes(row.status)} onClick={() => { setSelectedIds([row.id]); setConfirmAction("ignore"); }} className="inline-flex h-6 items-center gap-1 rounded border border-borderSoft bg-white px-2 font-semibold text-textMuted disabled:opacity-40"><Trash2 className="size-3" />忽略</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {pageRows.length === 0 ? (
                    <div className="flex min-h-44 items-center justify-center text-[12px] text-textMuted">没有符合当前条件的解析记录</div>
                  ) : null}
                </div>
                <div className="flex min-h-11 items-center justify-between border-t border-borderSoft px-3 text-[10px] text-textMuted">
                  <span>共 {filteredRows.length} 条，每页 {pageSize} 条，当前第 {safePage} / {pageCount} 页</span>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white disabled:opacity-40"><ChevronLeft className="size-3.5" /></button>
                    {Array.from({ length: Math.min(pageCount, 7) }, (_, index) => index + 1).map((pageNumber) => (
                      <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={cn("size-7 rounded-md border text-[10px] font-semibold", pageNumber === safePage ? "border-primary bg-primary text-white" : "border-borderSoft bg-white text-textSecondary")}>{pageNumber}</button>
                    ))}
                    <button type="button" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white disabled:opacity-40"><ChevronRight className="size-3.5" /></button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "overview" && (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {[
                  ["原文件", batch.file_name],
                  ["工作表", batch.sheet_name],
                  ["文件大小", formatBytes(batch.file_size)],
                  ["解析引擎", batch.parse_engine || "read-excel-file"],
                  ["解析时间", formatDate(batch.parsed_at)],
                  ["当前状态", status.label],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[9px] border border-borderSoft bg-slate-50 px-3 py-3">
                    <span className="text-[10px] text-textMuted">{label}</span>
                    <p className="mt-1 truncate text-[12px] font-semibold text-textMain" title={value}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "mapping" && (
              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[760px] text-left text-[11px]">
                  <thead className="bg-slate-50 text-textSecondary"><tr className="h-9"><th className="px-3">Excel字段</th><th className="px-3">系统字段</th><th className="px-3">样例值</th><th className="px-3">置信度</th><th className="px-3">状态</th></tr></thead>
                  <tbody>
                    {detail.mappings.map((mapping) => (
                      <tr key={mapping.id} className="h-10 border-b border-borderSoft">
                        <td className="px-3 font-semibold text-textMain">{mapping.sourceField}</td>
                        <td className="px-3 text-textSecondary">{mapping.systemField || "未映射"}</td>
                        <td className="max-w-[240px] truncate px-3 text-textMuted">{mapping.sampleValue || "—"}</td>
                        <td className="px-3 font-semibold text-primary">{Math.round(mapping.confidence)}%</td>
                        <td className="px-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", mapping.status === "mapped" ? "bg-success-soft text-success" : mapping.status === "warning" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger")}>{mapping.status === "mapped" ? "已映射" : mapping.status === "warning" ? "需确认" : "未映射"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.mappings.length === 0 ? <p className="py-16 text-center text-[12px] text-textMuted">当前批次暂无字段映射记录</p> : null}
              </div>
            )}

            {activeTab === "history" && (
              <div className="p-5">
                <div className="space-y-4">
                  {[
                    ["批次创建", formatDate(batch.created_at), "系统建立导入批次并登记原文件。", "green"],
                    ["Excel解析", formatDate(batch.parsed_at), `解析 ${rows.length} 行并生成字段映射。`, "blue"],
                    ["数据校验", formatDate(batch.updated_at), `发现 ${issueCount} 条待人工处理记录。`, "orange"],
                    ...(batch.submitted_at ? [["提交人工复核", formatDate(batch.submitted_at), `已生成 ${batch.submitted_rows ?? 0} 条逐项审核任务。`, "purple"]] : []),
                    ...(batch.completed_at ? [["批次处理完成", formatDate(batch.completed_at), `正式入库 ${batch.imported_rows ?? 0} 条，驳回 ${batch.rejected_rows ?? 0} 条，跳过 ${batch.skipped_rows ?? 0} 条。`, "green"]] : []),
                  ].map(([title, time, description, tone]) => (
                    <div key={title} className="flex gap-3">
                      <span className={cn("mt-1 size-2.5 shrink-0 rounded-full ring-4", tone === "green" ? "bg-success ring-success/10" : tone === "blue" ? "bg-primary ring-primary/10" : tone === "purple" ? "bg-ai ring-ai/10" : "bg-warning ring-warning/10")} />
                      <div className="min-w-0 flex-1 border-b border-borderSoft pb-4">
                        <div className="flex items-center justify-between gap-3"><strong className="text-[12px] text-textMain">{title}</strong><span className="text-[10px] text-textMuted">{time}</span></div>
                        <p className="mt-1 text-[11px] text-textMuted">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="grid content-start gap-3">
            <article className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={FileSpreadsheet} title="原文件证据" subtitle="私有 Supabase Storage" tone="blue" density="compact" />
              <div className="mt-3 rounded-[9px] bg-emerald-50 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-emerald-600 text-white"><FileSpreadsheet className="size-5" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-textMain" title={batch.file_name}>{batch.file_name}</p>
                    <p className="mt-1 text-[9px] text-textMuted">文件大小：{formatBytes(batch.file_size)}</p>
                    <p className="mt-0.5 text-[9px] text-textMuted">存储桶：{batch.storage_bucket || "business-documents"}</p>
                  </div>
                </div>
                <p className="mt-2 truncate font-mono text-[8px] text-textMuted" title={batch.file_hash || ""}>SHA-256：{batch.file_hash || "等待生成文件摘要"}</p>
                <button type="button" disabled={!detail.downloadUrl} onClick={() => detail.downloadUrl && window.open(detail.downloadUrl, "_blank", "noopener,noreferrer")} className="mt-3 h-8 w-full rounded-md border border-success/20 bg-white text-[10px] font-semibold text-success disabled:opacity-40">查看原文件</button>
              </div>
            </article>

            <article className="rounded-card border border-ai/20 bg-gradient-to-br from-ai-soft via-white to-white p-4 shadow-card">
              <ModuleHeader icon={Sparkles} title="AI解析判断" subtitle="异常与缺失字段辅助判断" tone="purple" density="compact" />
              <div className="mt-3 space-y-2">
                {aiFindings.map((finding, index) => (
                  <button
                    key={finding.text}
                    type="button"
                    onClick={() => {
                      setActiveTab("issues");
                      setStatusFilter(index === 0 ? "warning" : index === 1 ? "error" : "duplicate");
                      setPage(1);
                    }}
                    className="flex w-full items-start gap-2 rounded-[8px] border border-ai/10 bg-white/80 p-2.5 text-left hover:border-ai/30"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ai-soft text-[9px] font-bold text-ai">{index + 1}</span>
                    <span className="min-w-0 flex-1 text-[10px] leading-4 text-textSecondary"><strong className="mr-1 text-ai">{finding.count}</strong>{finding.text}</span>
                    <span className="shrink-0 text-[9px] font-semibold text-ai">{finding.confidence}%</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-card border border-warning/30 bg-gradient-to-br from-warning-soft via-white to-white p-4 shadow-card">
              <ModuleHeader icon={ShieldAlert} title="审核门禁" subtitle="AI不得直接替代商务判断" tone="orange" density="compact" />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["阻断项", counts.error + counts.duplicate, "text-danger"],
                  ["警告项", counts.warning, "text-warning"],
                  ["可直接入库", counts.valid, "text-success"],
                ].map(([label, value, className]) => (
                  <div key={String(label)} className="rounded-[8px] border border-borderSoft bg-white px-1 py-2 text-center">
                    <strong className={cn("block text-[17px] leading-none", className)}>{value}</strong>
                    <span className="mt-1 block text-[8px] text-textMuted">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-[8px] bg-warning-soft px-3 py-2 text-[10px] leading-4 text-warning">
                {counts.error + counts.duplicate > 0
                  ? "仍有阻断记录，暂不可正式入库。请修正或忽略后再提交。"
                  : "阻断项已清除，可提交人工审核。"}
              </p>
              <button type="button" onClick={() => { setActiveTab("issues"); setStatusFilter("all"); setPage(1); }} className="mt-3 h-8 w-full rounded-md border border-warning/30 bg-white text-[10px] font-semibold text-warning">进入问题处理</button>
            </article>
          </aside>
        </section>
      </div>

      <div className="fixed bottom-0 right-0 z-30 flex min-h-[62px] items-center justify-between gap-4 border-t border-borderSoft bg-white/95 px-6 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl left-sidebar">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-textMain">已选择 <span className="text-[18px] text-primary">{selectedIds.length}</span> 条记录</p>
          <p className="text-[9px] text-textMuted">批次修正和审核动作会写入独立价格库 Supabase 项目。</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={!selectedMutableIds.length || !detail.canWrite}
            onClick={() => {
              const firstSelected = rows.find((row) =>
                selectedMutableIds.includes(row.id)
              );
              if (firstSelected) {
                setEditRow({ ...firstSelected });
                toast.info(
                  "已打开首条选中记录",
                  selectedMutableIds.length > 1
                    ? `当前共选择 ${selectedMutableIds.length} 条可修正记录，保存后可继续处理下一条。`
                    : "请核对字段并保存修正。"
                );
              }
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-warning/20 bg-warning-soft px-4 text-[12px] font-semibold text-warning disabled:opacity-45"
          >
            <Pencil className="size-4" />
            批量修正
          </button>
          <button type="button" disabled={!selectedMutableIds.length || !detail.canWrite || (!batchEditable && !hasReturnedRows)} onClick={() => setConfirmAction("ignore")} className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[12px] font-semibold text-textSecondary disabled:opacity-45"><CircleDashed className="size-4" />标记忽略</button>
          <LoadingButton
            loading={actionLoading === "save"}
            disabled={!detail.canWrite || !batchEditable}
            icon={<Save className="size-4" />}
            tone="ghost"
            onClick={() => void saveDraft()}
            className="border-primary/20 bg-primary-soft text-primary"
          >
            保存草稿
          </LoadingButton>
          <LoadingButton loading={actionLoading === "submit"} disabled={!canSubmitReview} icon={<ClipboardCheck className="size-4" />} onClick={() => setConfirmAction("submit")}>{submitReviewLabel}</LoadingButton>
        </div>
      </div>

      <OverlayShell open={Boolean(viewRow)} onClose={() => setViewRow(null)} variant="drawer" ariaLabel="解析记录详情" panelClassName="w-[460px]">
        {viewRow ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
              <div className="flex items-start gap-3"><IconBox icon={Eye} tone="blue" size="lg" /><div><h2 className="text-[16px] font-semibold text-textMain">解析记录详情</h2><p className="mt-1 text-[11px] text-textMuted">Excel 第 {viewRow.rowNumber} 行</p></div></div>
              <button type="button" onClick={() => setViewRow(null)} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["设备名称", viewRow.equipmentName],
                  ["规格型号", viewRow.model],
                  ["品牌", viewRow.brand],
                  ["设备类别", viewRow.category],
                  ["原始价格", `${viewRow.currency} ${viewRow.originalPrice.toLocaleString("en-US")}`],
                  ["供应商", viewRow.supplier],
                  ["报价日期", viewRow.quoteDate],
                  ["识别置信度", `${Math.round(viewRow.confidence)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[9px] border border-borderSoft bg-slate-50 p-3"><span className="text-[10px] text-textMuted">{label}</span><p className="mt-1 break-words text-[12px] font-semibold text-textMain">{value || "—"}</p></div>
                ))}
              </div>
              <div className="mt-4 rounded-[9px] border border-warning/20 bg-warning-soft p-3">
                <p className="text-[11px] font-semibold text-warning">校验问题</p>
                <ul className="mt-2 space-y-1 text-[11px] leading-5 text-textSecondary">
                  {viewRow.issues.length ? viewRow.issues.map((issue) => <li key={issue}>• {issue}</li>) : <li>未发现校验问题</li>}
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-borderSoft p-4"><button type="button" onClick={() => setViewRow(null)} className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold text-textSecondary">关闭</button><button type="button" onClick={() => { setEditRow({ ...viewRow }); setViewRow(null); }} className="h-9 rounded-md bg-primary px-4 text-[12px] font-semibold text-white">修正记录</button></div>
          </div>
        ) : null}
      </OverlayShell>

      <OverlayShell open={Boolean(editRow)} onClose={() => setEditRow(null)} variant="drawer" ariaLabel="修正解析记录" panelClassName="w-[500px]">
        {editRow ? (
          <form onSubmit={saveEditedRow} className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4"><div className="flex items-start gap-3"><IconBox icon={Pencil} tone="orange" size="lg" /><div><h2 className="text-[16px] font-semibold text-textMain">修正解析记录</h2><p className="mt-1 text-[11px] text-textMuted">人工修正会保留在批次记录中</p></div></div><button type="button" onClick={() => setEditRow(null)} className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"><X className="size-4" /></button></div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {[
                ["equipmentName", "设备名称", "text"],
                ["model", "规格型号", "text"],
                ["brand", "品牌", "text"],
                ["category", "设备类别", "text"],
                ["originalPrice", "原始价格", "number"],
                ["currency", "币种", "text"],
                ["supplier", "供应商", "text"],
                ["quoteDate", "报价日期", "date"],
              ].map(([key, label, type]) => (
                <label key={key} className="block">
                  <span className="text-[11px] font-semibold text-textSecondary">{label}</span>
                  <input
                    type={type}
                    value={String(editRow[key as keyof EquipmentImportRow] ?? "")}
                    onChange={(event) => setEditRow((current) => current ? { ...current, [key]: key === "originalPrice" ? Number(event.target.value) : event.target.value } : current)}
                    className="mt-1 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] text-textMain outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[11px] font-semibold text-textSecondary">校验状态</span>
                <select value={editRow.status} onChange={(event) => setEditRow((current) => current ? { ...current, status: event.target.value as EquipmentImportValidationStatus } : current)} className="mt-1 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary">
                  {editableValidationStatusEntries.map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-textSecondary">问题说明</span>
                <textarea value={editRow.issues.join("\n")} onChange={(event) => setEditRow((current) => current ? { ...current, issues: event.target.value.split("\n").filter(Boolean) } : current)} rows={4} className="mt-1 w-full rounded-md border border-borderSoft bg-white px-3 py-2 text-[12px] outline-none focus:border-primary" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-borderSoft p-4"><button type="button" onClick={() => setEditRow(null)} className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold text-textSecondary">取消</button><LoadingButton loading={savingRow} icon={<Save className="size-4" />} type="submit">保存修正</LoadingButton></div>
          </form>
        ) : null}
      </OverlayShell>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction === "submit" ? (hasReturnedRows ? "确认重新提交补正记录？" : "确认提交人工审核？") : confirmAction === "cancel" ? "确认取消当前批次？" : "确认忽略所选记录？"}
        description={confirmAction === "submit" ? (hasReturnedRows ? "已补正且仍被选中的记录将重新进入人工审核队列；已入库记录不会重复提交。" : "AI解析结果将进入人工审核队列，系统不会直接写入正式价格库。") : confirmAction === "cancel" ? "取消后批次将停止处理，原文件证据仍会保留。" : `将忽略 ${selectedMutableIds.length} 条可处理记录，这些记录不会进入后续审核。`}
        confirmLabel={confirmAction === "submit" ? submitReviewLabel : confirmAction === "cancel" ? "确认取消" : "确认忽略"}
        tone={confirmAction === "submit" ? "warning" : confirmAction === "cancel" ? "danger" : "warning"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </AppLayout>
  );
}
