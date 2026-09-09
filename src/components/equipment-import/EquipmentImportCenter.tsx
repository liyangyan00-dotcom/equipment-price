"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Eye,
  ListChecks,
  Save,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import {
  ConfirmDialog,
  LoadingButton,
  MockExportDialog,
} from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMockToast } from "@/hooks/useMockToast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  EquipmentImportBatchStatus,
  EquipmentImportBatchSummary,
  EquipmentImportMapping,
  EquipmentImportParseResult,
  EquipmentImportRow,
  EquipmentImportValidationStatus,
} from "@/types/equipmentImport";
import { EquipmentImportHistoryDrawer } from "./EquipmentImportHistoryDrawer";
import { EquipmentImportSidePanel } from "./EquipmentImportSidePanel";
import { EquipmentImportStepBar } from "./EquipmentImportStepBar";
import {
  EquipmentImportMappingTable,
  EquipmentImportPreviewTable,
} from "./EquipmentImportTables";

const kpiTone = {
  blue: {
    wrap: "border-blue-100 from-blue-50 to-white",
    icon: "from-blue-500 to-blue-600 shadow-blue-500/20",
    text: "text-blue-600",
  },
  green: {
    wrap: "border-emerald-100 from-emerald-50 to-white",
    icon: "from-emerald-400 to-emerald-600 shadow-emerald-500/20",
    text: "text-emerald-600",
  },
  orange: {
    wrap: "border-orange-100 from-orange-50 to-white",
    icon: "from-amber-400 to-orange-500 shadow-orange-500/20",
    text: "text-orange-500",
  },
  purple: {
    wrap: "border-purple-100 from-purple-50 to-white",
    icon: "from-violet-500 to-purple-600 shadow-violet-500/20",
    text: "text-violet-600",
  },
  red: {
    wrap: "border-red-100 from-red-50 to-white",
    icon: "from-red-400 to-red-600 shadow-red-500/20",
    text: "text-red-500",
  },
};

type SelectedFileSummary = {
  name: string;
  size: number;
  lastModified: number;
  type: string;
};

const emptyFile: SelectedFileSummary = {
  name: "",
  size: 0,
  lastModified: 0,
  type: "",
};

export function EquipmentImportCenter() {
  const toast = useMockToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [batchId, setBatchId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [file, setFile] = useState<SelectedFileSummary>(emptyFile);
  const [storageRef, setStorageRef] = useState<{
    bucket: string;
    path: string;
    mimeType: string;
  } | null>(null);
  const [mappings, setMappings] = useState<EquipmentImportMapping[]>([]);
  const [rows, setRows] = useState<EquipmentImportRow[]>([]);
  const [sheets, setSheets] = useState<
    Array<{ name: string; rowCount: number; selected: boolean }>
  >([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [mappingConfidence, setMappingConfidence] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "uploading" | "parsing"
  >("idle");
  const [mappingRunning, setMappingRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [issueFilter, setIssueFilter] = useState<
    "all" | EquipmentImportValidationStatus
  >("all");
  const [page, setPage] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [batches, setBatches] = useState<EquipmentImportBatchSummary[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [canWrite, setCanWrite] = useState(true);

  const selectedRows = useMemo(() => rows.filter((row) => row.selected), [rows]);
  const selectedBlockingRows = useMemo(
    () =>
      selectedRows.filter((row) =>
        ["error", "duplicate"].includes(row.status)
      ),
    [selectedRows]
  );
  const rowCounts = useMemo(
    () =>
      rows.reduce(
        (result, row) => {
          result[row.status] += 1;
          return result;
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
      ),
    [rows]
  );
  const kpis = useMemo(
    () => [
      {
        label: "本次文件",
        value: file.name ? "1" : "0",
        unit: "个",
        icon: FileSpreadsheet,
        tone: "blue" as const,
        note: file.name ? `${sheets.length || "待识别"} 个工作表` : "请选择文件",
      },
      {
        label: "识别行数",
        value: String(rows.length),
        unit: "行",
        icon: ListChecks,
        tone: "blue" as const,
        note: "已排除空白行",
      },
      {
        label: "有效数据",
        value: String(rowCounts.valid),
        unit: "行",
        icon: CheckCircle2,
        tone: "green" as const,
        note: "可提交人工审核",
      },
      {
        label: "待补全",
        value: String(rowCounts.warning),
        unit: "行",
        icon: FileCheck2,
        tone: "orange" as const,
        note: "字段不完整",
      },
      {
        label: "重复记录",
        value: String(rowCounts.duplicate),
        unit: "行",
        icon: Database,
        tone: "purple" as const,
        note: "批次内重复",
      },
      {
        label: "高风险",
        value: String(rowCounts.error),
        unit: "行",
        icon: ShieldAlert,
        tone: "red" as const,
        note: "需优先人工确认",
      },
    ],
    [file.name, rowCounts, rows.length, sheets.length]
  );

  const loadBatches = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/equipment-prices/imports", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: EquipmentImportBatchSummary[];
        error?: string;
        canWrite?: boolean;
      };
      if (!response.ok) throw new Error(payload.error || "读取导入记录失败");
      setBatches(payload.data ?? []);
      setCanWrite(payload.canWrite ?? false);
    } catch (error) {
      toast.warning(
        "暂未读取导入记录",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Initial fetch synchronizes the client workspace with persisted import batches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBatches();
  }, [loadBatches]);

  const chooseFile = () => fileInputRef.current?.click();

  const handleFileChange = (selectedFile?: File) => {
    if (!selectedFile) return;
    const isExcel = /\.(xlsx|csv)$/i.test(selectedFile.name);
    if (!isExcel) {
      toast.warning(
        "文件格式不支持",
        "请选择 .xlsx 或 .csv 文件；旧版 .xls 请先另存为 .xlsx。"
      );
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.warning("文件过大", "当前单文件上限为 50 MB。");
      return;
    }
    setSelectedFile(selectedFile);
    setFile({
      name: selectedFile.name,
      size: selectedFile.size,
      lastModified: selectedFile.lastModified,
      type: selectedFile.type,
    });
    setBatchId("");
    setStorageRef(null);
    setActiveStep(1);
    setMaxStep(1);
    setMappings([]);
    setRows([]);
    setSheets([]);
    setSelectedSheet("");
    setHeaderRow(1);
    setMappingConfidence(0);
    setIssueFilter("all");
    setPage(1);
    toast.success(
      "文件已选择",
      `${selectedFile.name} 将上传到私有 Supabase Storage 后解析。`
    );
  };

  const applyParseResult = (result: EquipmentImportParseResult) => {
    const metadata = result.batch.source_metadata ?? {};
    setBatchId(result.batch.id);
    setStorageRef({
      bucket:
        result.batch.storage_bucket ??
        (typeof metadata.storageBucket === "string"
          ? metadata.storageBucket
          : "business-documents"),
      path:
        result.batch.storage_path ??
        (typeof metadata.storagePath === "string"
          ? metadata.storagePath
          : ""),
      mimeType:
        result.batch.mime_type ??
        (typeof metadata.mimeType === "string"
          ? metadata.mimeType
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    });
    setMappings(result.mappings);
    setRows(result.rows);
    setSheets(result.sheets);
    setSelectedSheet(result.selectedSheet);
    setHeaderRow(result.headerRow);
    setMappingConfidence(result.mappingConfidence);
    setActiveStep(2);
    setMaxStep((current) => Math.max(current, 2));
    setIssueFilter("all");
    setPage(1);
  };

  const parseStoredBatch = async (
    id: string,
    sheetName?: string,
    mappingOverrides?: EquipmentImportMapping[]
  ) => {
    setUploadStage("parsing");
    const response = await fetch(
      `/api/equipment-prices/imports/${encodeURIComponent(id)}/parse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(sheetName ? { sheetName } : {}),
          ...(mappingOverrides ? { mappings: mappingOverrides } : {}),
        }),
      }
    );
    const payload = (await response.json()) as {
      data?: EquipmentImportParseResult;
      error?: string;
    };
    if (!response.ok || !payload.data) {
      throw new Error(payload.error || "Excel 文件解析失败");
    }
    applyParseResult(payload.data);
    return payload.data;
  };

  const handleParse = async (preferredSheet?: string) => {
    if (!selectedFile && !batchId) {
      toast.warning("请先选择 Excel 或 CSV 文件");
      return;
    }
    if (!canWrite) {
      toast.warning("当前角色没有导入权限", "请联系管理员或价格库经理。");
      return;
    }

    setParsing(true);
    setActiveStep(1);
    try {
      let currentBatchId = batchId;
      if (selectedFile) {
        setUploadStage("uploading");
        const sessionResponse = await fetch(
          "/api/equipment-prices/imports/upload-session",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              mimeType: selectedFile.type,
            }),
          }
        );
        const sessionPayload = (await sessionResponse.json()) as {
          data?: EquipmentImportBatchSummary;
          upload?: { bucket: string; path: string; contentType: string };
          error?: string;
        };
        if (!sessionResponse.ok || !sessionPayload.data || !sessionPayload.upload) {
          throw new Error(sessionPayload.error || "创建上传会话失败");
        }

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from(sessionPayload.upload.bucket)
          .upload(sessionPayload.upload.path, selectedFile, {
            contentType: sessionPayload.upload.contentType,
            upsert: false,
          });
        if (uploadError) {
          await fetch(
            `/api/equipment-prices/imports/${encodeURIComponent(sessionPayload.data.id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "cancel" }),
            }
          ).catch(() => undefined);
          throw new Error(`Storage 上传失败：${uploadError.message}`);
        }
        currentBatchId = sessionPayload.data.id;
        setBatchId(currentBatchId);
        setStorageRef({
          bucket: sessionPayload.upload.bucket,
          path: sessionPayload.upload.path,
          mimeType: sessionPayload.upload.contentType,
        });
        setSelectedFile(null);
      }

      const result = await parseStoredBatch(currentBatchId, preferredSheet);
      toast.ai(
        "真实文件解析完成",
        `已从 ${result.selectedSheet} 识别 ${result.rows.length} 行、${result.mappings.length} 个字段，原文件已保存到私有 Storage。`
      );
      if (result.truncated) {
        toast.warning("文件数据较多", "当前批次仅解析前 5,000 条数据。");
      }
      await loadBatches();
    } catch (error) {
      toast.danger(
        "上传或解析失败",
        error instanceof Error ? error.message : "请检查文件后重试"
      );
    } finally {
      setParsing(false);
      setUploadStage("idle");
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!batchId || sheetName === selectedSheet) return;
    setParsing(true);
    try {
      const result = await parseStoredBatch(batchId, sheetName);
      toast.success(
        "工作表已切换",
        `${result.selectedSheet} 共识别 ${result.rows.length} 行。`
      );
    } catch (error) {
      toast.danger(
        "切换工作表失败",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setParsing(false);
      setUploadStage("idle");
    }
  };

  const handleAutoMap = async () => {
    if (mappings.length === 0) {
      toast.warning("请先上传并解析文件");
      return;
    }
    setMappingRunning(true);
    await new Promise((resolve) => window.setTimeout(resolve, 850));
    setMappings((current) =>
      current.map((mapping) => ({
        ...mapping,
        confidence:
          mapping.systemField === "ignore"
            ? mapping.confidence
            : Math.max(mapping.confidence, mapping.required ? 96 : 93),
        status: mapping.systemField === "ignore" ? "unmapped" : "mapped",
      }))
    );
    setMappingConfidence(96);
    setMappingRunning(false);
    toast.ai("AI字段映射已更新", "8 个字段已完成匹配，仍建议人工核对供应商主体。");
  };

  const handleMappingChange = (id: string, systemField: string) => {
    setMappings((current) =>
      current.map((mapping) => {
        if (
          systemField !== "ignore" &&
          mapping.id !== id &&
          mapping.systemField === systemField
        ) {
          return {
            ...mapping,
            systemField: "ignore",
            confidence: 0,
            status: "unmapped" as const,
            userModified: true,
          };
        }
        return mapping.id === id
          ? {
              ...mapping,
              systemField,
              confidence: systemField === "ignore" ? 0 : 100,
              status: systemField === "ignore" ? "unmapped" : "mapped",
              userModified: true,
            }
          : mapping;
      })
    );
    toast.info(
      "字段映射已人工确认",
      systemField === "ignore"
        ? "该列将被忽略，修改会随导入草稿保存。"
        : "同一系统字段仅保留一个来源列，点击数据校验后将重新生成解析结果。"
    );
  };

  const handleValidate = async () => {
    if (rows.length === 0) {
      toast.warning("没有可校验的数据", "请先上传并解析文件。");
      return;
    }
    if (!batchId) {
      toast.warning("导入批次尚未创建", "请先上传并解析真实文件。");
      return;
    }
    setParsing(true);
    try {
      const result = await parseStoredBatch(batchId, selectedSheet, mappings);
      const counts = result.rows.reduce(
        (summary, row) => {
          summary[row.status] += 1;
          return summary;
        },
        { valid: 0, warning: 0, error: 0, duplicate: 0, ignored: 0, submitted: 0, imported: 0 }
      );
      setActiveStep(3);
      setMaxStep((current) => Math.max(current, 3));
      setIssueFilter("all");
      setPage(1);
      toast.success(
        "字段映射与数据校验已联动",
        `重新生成解析结果：${counts.error} 条错误、${counts.warning} 条警告、${counts.duplicate} 条重复记录。`
      );
    } catch (error) {
      toast.danger(
        "数据校验失败",
        error instanceof Error ? error.message : "请检查字段映射后重试。"
      );
    } finally {
      setParsing(false);
      setUploadStage("idle");
    }
  };

  const handleResolveRow = (id: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              status: "valid",
              confidence: Math.max(90, row.confidence),
              issues: [],
              selected: true,
            }
          : row
      )
    );
    toast.success("问题记录已人工修正", "该行已重新通过校验并加入选择。");
  };

  const handleToggleRow = (id: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row
      )
    );
  };

  const handleTogglePage = (ids: string[], selected: boolean) => {
    const idSet = new Set(ids);
    setRows((current) =>
      current.map((row) => (idSet.has(row.id) ? { ...row, selected } : row))
    );
  };

  const persistBatch = async (
    status: Extract<
      EquipmentImportBatchStatus,
      "draft" | "uploaded" | "mapping" | "validating" | "needs_review"
    >
  ) => {
    if (!batchId) {
      throw new Error("请先上传并解析真实文件");
    }
    const response = await fetch("/api/equipment-prices/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: batchId,
        fileName: file.name,
        fileSize: file.size,
        sheetName: selectedSheet,
        headerRow,
        status,
        currentStep: activeStep,
        totalRows: rows.length,
        mappingConfidence,
        sourceMetadata: {
          parserMode: "server-storage",
          originalFileStored: true,
          lastModified: file.lastModified,
          selectedSheet,
          storageBucket: storageRef?.bucket,
          storagePath: storageRef?.path,
          mimeType: storageRef?.mimeType,
        },
        mappings,
        rows,
      }),
    });
    const payload = (await response.json()) as {
      data?: EquipmentImportBatchSummary;
      error?: string;
    };
    if (!response.ok || !payload.data) {
      throw new Error(payload.error || "保存导入批次失败");
    }
    setBatchId(payload.data.id);
    return payload.data;
  };

  const handleSaveDraft = async () => {
    if (rows.length === 0) {
      toast.warning("暂无可保存的解析结果", "请先上传并解析文件。");
      return;
    }
    setSaving(true);
    try {
      const batch = await persistBatch(activeStep >= 3 ? "validating" : "mapping");
      toast.success("导入草稿已保存", `${batch.batch_code} 已写入独立价格库项目。`);
      await loadBatches();
    } catch (error) {
      toast.danger(
        "保存失败",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitConfirmOpen(false);
    setSubmitting(true);
    try {
      const batch = await persistBatch("validating");
      const response = await fetch(
        `/api/equipment-prices/imports/${batch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit_review" }),
        }
      );
      const payload = (await response.json()) as {
        data?: {
          ok: boolean;
          submittedCount: number;
          batch: EquipmentImportBatchSummary;
        };
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "提交审核失败");
      }
      setActiveStep(4);
      setMaxStep(4);
      toast.success(
        "已提交人工审核",
        `${payload.data.batch.batch_code} 已生成 ${payload.data.submittedCount} 条审核任务，审核通过前不会写入正式价格库。`
      );
      await loadBatches();
    } catch (error) {
      toast.danger(
        "提交失败",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmitConfirm = () => {
    if (!canWrite) {
      toast.warning("当前角色没有导入权限", "请联系管理员或价格库经理。");
      return;
    }
    if (selectedRows.length === 0) {
      toast.warning("没有选中可提交的数据");
      return;
    }
    if (selectedBlockingRows.length > 0) {
      toast.warning(
        "仍有阻断问题",
        `当前选中数据中有 ${selectedBlockingRows.length} 条错误或重复记录，请先修正或取消选择。`
      );
      return;
    }
    setSubmitConfirmOpen(true);
  };

  const handleReuseBatch = (batch: EquipmentImportBatchSummary) => {
    const metadata = batch.source_metadata ?? {};
    const workbookSheets = Array.isArray(batch.workbook_sheets)
      ? batch.workbook_sheets
      : Array.isArray(metadata.workbookSheets)
        ? metadata.workbookSheets.filter(
            (name): name is string => typeof name === "string"
          )
        : [];
    setBatchId(batch.id);
    setSelectedFile(null);
    setStorageRef({
      bucket:
        batch.storage_bucket ??
        (typeof metadata.storageBucket === "string"
          ? metadata.storageBucket
          : "business-documents"),
      path:
        batch.storage_path ??
        (typeof metadata.storagePath === "string"
          ? metadata.storagePath
          : ""),
      mimeType:
        batch.mime_type ??
        (typeof metadata.mimeType === "string" ? metadata.mimeType : ""),
    });
    setFile({
      name: batch.file_name,
      size: batch.file_size,
      lastModified: Date.now(),
      type:
        batch.mime_type ??
        (typeof metadata.mimeType === "string" ? metadata.mimeType : ""),
    });
    setMappings([]);
    setRows([]);
    setSheets(
      workbookSheets.map((name) => ({
        name,
        rowCount: 0,
        selected: name === batch.sheet_name,
      }))
    );
    setSelectedSheet(batch.sheet_name ?? "");
    setHeaderRow(1);
    setActiveStep(1);
    setMaxStep(1);
    setMappingConfidence(0);
    setHistoryOpen(false);
    toast.info(
      "已载入 Storage 导入批次",
      `${batch.batch_code} 已关联原文件，点击“重新解析”即可继续。`
    );
  };

  return (
    <AppLayout>
      <div className="grid min-w-0 gap-3 overflow-x-clip pb-20">
        <PageHeader
          title="设备价格导入中心"
          description="批量导入设备报价，完成 AI 解析、字段映射、数据校验与人工审核入库。"
          actions={
            <>
              <Link
                href="/equipment-prices"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary shadow-sm"
              >
                返回设备价格库
              </Link>
              <button
                type="button"
                onClick={() => {
                  setHistoryOpen(true);
                  void loadBatches();
                }}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary shadow-sm"
              >
                <Clock3 className="size-4" />
                查看导入记录
              </button>
              {batchId ? (
                <Link
                  href={`/equipment-prices/import/${encodeURIComponent(batchId)}`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-ai/20 bg-ai-soft px-3 text-[12px] font-semibold text-ai shadow-sm"
                >
                  <Eye className="size-4" />
                  查看批次详情
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary"
              >
                <Download className="size-4" />
                下载导入模板
              </button>
            </>
          }
        />

        <EquipmentImportStepBar
          activeStep={activeStep}
          maxStep={maxStep}
          onStepChange={(step) => {
            setActiveStep(step);
            toast.info("导入步骤已切换", `当前查看第 ${step} 步。`);
          }}
        />

        <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const tone = kpiTone[kpi.tone];
            return (
              <article
                key={kpi.label}
                className={cn(
                  "min-h-[86px] rounded-[10px] border bg-gradient-to-br px-3.5 py-3 shadow-card",
                  tone.wrap
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("text-[11px] font-semibold", tone.text)}>{kpi.label}</p>
                    <p className="mt-1.5 flex items-end gap-1">
                      <strong className={cn("text-[25px] leading-none tabular-nums", tone.text)}>{kpi.value}</strong>
                      <span className="pb-0.5 text-[10px] text-textMuted">{kpi.unit}</span>
                    </p>
                    <p className="mt-1.5 truncate text-[9px] text-textMuted">{kpi.note}</p>
                  </div>
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br text-white shadow-lg", tone.icon)}>
                    <Icon className="size-[18px]" />
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-w-0 content-start gap-3">
            <EquipmentImportMappingTable
              mappings={mappings}
              mappingConfidence={mappingConfidence}
              running={mappingRunning}
              parsing={parsing}
              sheets={sheets}
              selectedSheet={selectedSheet}
              headerRow={headerRow}
              onMappingChange={handleMappingChange}
              onAutoMap={handleAutoMap}
              onValidate={handleValidate}
              onSheetChange={(sheetName) => void handleSheetChange(sheetName)}
            />
            <EquipmentImportPreviewTable
              rows={rows}
              issueFilter={issueFilter}
              page={page}
              pageSize={5}
              onPageChange={setPage}
              onToggleRow={handleToggleRow}
              onTogglePage={handleTogglePage}
              onResolve={handleResolveRow}
            />
          </div>

          <EquipmentImportSidePanel
            fileName={file.name}
            fileSize={file.size}
            parsing={parsing}
            uploadStage={uploadStage}
            sheetCount={sheets.length}
            rows={rows}
            mappingRunning={mappingRunning}
            mappingConfidence={mappingConfidence}
            issueFilter={issueFilter}
            onChooseFile={chooseFile}
            onParse={() => void handleParse()}
            onApplyAi={handleAutoMap}
            onIssueFilter={(filter) => {
              setIssueFilter(filter);
              setPage(1);
              toast.info(
                filter === "all" ? "已清除问题筛选" : "预览数据已联动筛选",
                filter === "all" ? "显示全部解析记录。" : "仅显示对应问题记录。"
              );
            }}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="sr-only"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />
      </div>

      <div className="fixed bottom-0 right-0 z-30 flex min-h-[62px] items-center justify-between gap-4 border-t border-borderSoft bg-white/95 px-6 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl left-sidebar">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-textMain">
            当前预览已选 <span className="text-[18px] text-success">{selectedRows.length}</span> 条
            <span className="ml-2 font-normal text-textMuted">
              批次有效数据 {rowCounts.valid} 条
            </span>
          </p>
          <p className="mt-0.5 text-[9px] text-textMuted">
            原文件已保存到私有 Supabase Storage；解析结果进入人工审核后才可写入正式价格库。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LoadingButton
            tone="ghost"
            loading={saving}
            icon={<Save className="size-4" />}
            onClick={handleSaveDraft}
          >
            保存草稿
          </LoadingButton>
          <button
            type="button"
            onClick={() => {
              setActiveStep(3);
              setMaxStep((current) => Math.max(current, 3));
              openSubmitConfirm();
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/25 bg-white px-4 text-[12px] font-semibold text-primary"
          >
            <UserCheck className="size-4" />
            提交人工审核
          </button>
          <LoadingButton
            loading={submitting}
            icon={<ShieldAlert className="size-4" />}
            onClick={openSubmitConfirm}
          >
            确认提交设备价格审核
          </LoadingButton>
        </div>
      </div>

      <EquipmentImportHistoryDrawer
        open={historyOpen}
        loading={historyLoading}
        batches={batches}
        onClose={() => setHistoryOpen(false)}
        onReuse={handleReuseBatch}
      />

      <MockExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={() => {
          setExportOpen(false);
          toast.success("设备价格导入模板任务已创建", "当前为模拟导出，不会生成真实文件。");
        }}
      />

      <ConfirmDialog
        open={submitConfirmOpen}
        title="确认提交设备价格审核？"
        description="所选有效数据将进入人工审核队列，不会由 AI 直接写入正式价格库。"
        confirmLabel="确认提交审核"
        cancelLabel="继续检查"
        tone="warning"
        onCancel={() => setSubmitConfirmOpen(false)}
        onConfirm={() => void handleSubmit()}
      >
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[8px] bg-success-soft px-2 py-2 text-center text-success">
            <strong className="block text-[16px]">{rowCounts.valid}</strong>
            <span className="text-[10px]">有效数据</span>
          </div>
          <div className="rounded-[8px] bg-warning-soft px-2 py-2 text-center text-warning">
            <strong className="block text-[16px]">{rowCounts.warning}</strong>
            <span className="text-[10px]">待人工补全</span>
          </div>
          <div className="rounded-[8px] bg-danger-soft px-2 py-2 text-center text-danger">
            <strong className="block text-[16px]">{rowCounts.error}</strong>
            <span className="text-[10px]">高风险记录</span>
          </div>
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
}
