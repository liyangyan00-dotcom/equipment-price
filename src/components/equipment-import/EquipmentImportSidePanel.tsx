"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileSpreadsheet,
  FileWarning,
  Layers3,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { ModuleHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import type {
  EquipmentImportRow,
  EquipmentImportValidationStatus,
} from "@/types/equipmentImport";

function formatFileSize(size: number) {
  if (!size) return "尚未选择文件";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function EquipmentImportSidePanel({
  fileName,
  fileSize,
  parsing,
  uploadStage,
  sheetCount,
  rows,
  mappingRunning,
  mappingConfidence,
  issueFilter,
  onChooseFile,
  onParse,
  onApplyAi,
  onIssueFilter,
}: {
  fileName: string;
  fileSize: number;
  parsing: boolean;
  uploadStage: "idle" | "uploading" | "parsing";
  sheetCount: number;
  rows: EquipmentImportRow[];
  mappingRunning: boolean;
  mappingConfidence: number;
  issueFilter: "all" | EquipmentImportValidationStatus;
  onChooseFile: () => void;
  onParse: () => void;
  onApplyAi: () => void;
  onIssueFilter: (filter: "all" | EquipmentImportValidationStatus) => void;
}) {
  const issueCounts = rows.reduce(
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
  const issues = [
    { filter: "error" as const, icon: FileWarning, label: "错误（必填项缺失 / 格式错误）", count: issueCounts.error, tone: "text-danger bg-danger-soft border-danger/15" },
    { filter: "warning" as const, icon: AlertTriangle, label: "警告（字段不完整 / 异常值）", count: issueCounts.warning, tone: "text-warning bg-warning-soft border-warning/15" },
    { filter: "duplicate" as const, icon: Layers3, label: "重复（批次内相同记录）", count: issueCounts.duplicate, tone: "text-ai bg-ai-soft border-ai/15" },
  ];
  const parseLabel =
    uploadStage === "uploading"
      ? "上传 Storage 中"
      : uploadStage === "parsing"
        ? "服务端解析中"
        : rows.length > 0
          ? "重新解析"
          : "上传并解析";

  return (
    <aside className="grid min-w-0 content-start gap-3">
      <section className="rounded-[12px] border border-borderSoft bg-white p-4 shadow-card">
        <ModuleHeader
          icon={UploadCloud}
          tone="blue"
          density="compact"
          title="上传文件"
          subtitle="原文件加密保存到私有 Supabase Storage"
        />
        <button
          type="button"
          onClick={onChooseFile}
          className="mt-3 flex min-h-[112px] w-full items-center gap-3 rounded-[10px] border border-dashed border-primary/30 bg-primary-soft/50 p-3 text-left transition hover:border-primary/50 hover:bg-primary-soft"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-white text-success shadow-card">
            <FileSpreadsheet className="size-7" />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[13px] text-textMain" title={fileName || "请选择文件"}>
              {fileName || "选择 .xlsx 文件"}
            </strong>
            <span className="mt-1 block text-[11px] text-textMuted">
              {formatFileSize(fileSize)}
              {sheetCount > 0 ? ` · ${sheetCount} 个工作表` : ""}
            </span>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-success">
              <CheckCircle2 className="size-3.5" />
              {rows.length > 0 ? "Storage 已保存，解析完成" : fileName ? "文件已就绪" : "等待选择文件"}
            </span>
          </span>
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onChooseFile}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-borderSoft bg-white text-[11px] font-semibold text-textSecondary"
          >
            <RefreshCw className="size-3.5" />
            重新选择
          </button>
          <button
            type="button"
            disabled={parsing}
            onClick={() => onParse()}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(11,92,173,0.18)] disabled:opacity-60"
          >
            {parsing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {parseLabel}
          </button>
        </div>
      </section>

      <section className="rounded-[12px] border border-ai/20 bg-gradient-to-br from-ai-soft/80 via-white to-white p-4 shadow-ai">
        <ModuleHeader
          icon={Bot}
          tone="purple"
          density="compact"
          title="AI解析助手"
          subtitle="映射、补全与重复数据检测"
          action={<span className="rounded-full border border-ai/20 bg-white px-2 py-0.5 text-[10px] font-semibold text-ai">AI</span>}
        />
        <div className="mt-3 flex items-end justify-between">
          <span className="text-[11px] font-semibold text-textSecondary">处理进度</span>
          <span className="text-[18px] font-bold text-ai">{mappingRunning ? 78 : mappingConfidence}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ai/10">
          <div
            className="h-full rounded-full bg-ai transition-all duration-500"
            style={{ width: `${mappingRunning ? 78 : mappingConfidence}%` }}
          />
        </div>
        <div className="mt-3 space-y-2 text-[11px]">
          <div className="flex justify-between gap-3 border-b border-ai/10 pb-2">
            <span className="font-semibold text-textMain">当前任务</span>
            <span className="truncate text-right text-textMuted">{mappingRunning ? "正在识别字段与数据类型" : "字段映射已完成"}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-ai/10 pb-2">
            <span className="font-semibold text-textMain">映射建议</span>
            <span className="text-right text-textMuted">
              识别 {rows.length > 0 ? "真实字段" : "0 个字段"}，请人工确认
            </span>
          </div>
          <div className="flex justify-between gap-3 border-b border-ai/10 pb-2">
            <span className="font-semibold text-textMain">缺失字段</span>
            <span className="text-right text-warning">
              {issueCounts.warning + issueCounts.error} 条记录待补全
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-semibold text-textMain">重复检测</span>
            <span className="text-right text-danger">发现 {issueCounts.duplicate} 条重复记录</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onApplyAi}
          disabled={mappingRunning}
          className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-ai text-[11px] font-semibold text-white shadow-ai disabled:opacity-60"
        >
          <Sparkles className="size-3.5" />
          应用AI建议
        </button>
        <p className="mt-2 text-[10px] leading-4 text-textMuted">
          AI仅提供字段映射与风险提示，最终结果必须人工确认。
        </p>
      </section>

      <section className="overflow-hidden rounded-[12px] border border-borderSoft bg-white shadow-card">
        <div className="border-b border-borderSoft px-4 py-3">
          <ModuleHeader
            icon={AlertTriangle}
            tone="orange"
            density="compact"
            title="校验问题汇总"
            subtitle="点击问题类型联动筛选预览数据"
            action={
              issueFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => onIssueFilter("all")}
                  className="text-[10px] font-semibold text-primary"
                >
                  清除筛选
                </button>
              ) : null
            }
          />
        </div>
        <div className="space-y-2 p-3">
          {issues.map((issue) => {
            const Icon = issue.icon;
            const active = issueFilter === issue.filter;
            return (
              <button
                type="button"
                key={issue.filter}
                onClick={() => onIssueFilter(active ? "all" : issue.filter)}
                className={cn(
                  "flex min-h-10 w-full items-center justify-between gap-3 rounded-[8px] border px-3 text-left transition",
                  issue.tone,
                  active ? "ring-2 ring-primary/15" : "hover:-translate-y-px"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate text-[11px] font-semibold">{issue.label}</span>
                </span>
                <strong className="shrink-0 text-[15px]">{issue.count}</strong>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onIssueFilter("warning")}
            className={cn(
              "flex min-h-10 w-full items-center justify-between gap-3 rounded-[8px] border border-primary/15 bg-primary-soft px-3 text-left text-primary transition",
              issueFilter === "warning" && "ring-2 ring-primary/15"
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Bot className="size-4 shrink-0" />
              <span className="truncate text-[11px] font-semibold">需人工复核</span>
            </span>
            <strong className="shrink-0 text-[15px]">
              {issueCounts.warning + issueCounts.error + issueCounts.duplicate}
            </strong>
          </button>
        </div>
      </section>
    </aside>
  );
}
