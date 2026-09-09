"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import { ModuleHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import { equipmentImportSystemFields } from "@/data/mock/equipmentImports";
import type {
  EquipmentImportMapping,
  EquipmentImportRow,
  EquipmentImportValidationStatus,
} from "@/types/equipmentImport";

const mappingStatusClass = {
  mapped: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  unmapped: "border-danger/20 bg-danger-soft text-danger",
};

const validationStatusConfig: Record<
  EquipmentImportValidationStatus,
  { label: string; className: string }
> = {
  valid: { label: "通过", className: "border-success/20 bg-success-soft text-success" },
  warning: { label: "待补全", className: "border-warning/25 bg-warning-soft text-warning" },
  error: { label: "错误", className: "border-danger/20 bg-danger-soft text-danger" },
  duplicate: { label: "重复", className: "border-ai/20 bg-ai-soft text-ai" },
  ignored: { label: "已忽略", className: "border-slate-200 bg-slate-100 text-slate-500" },
  submitted: { label: "已提交", className: "border-primary/20 bg-primary-soft text-primary" },
  imported: { label: "已入库", className: "border-success/20 bg-success-soft text-success" },
};

export function EquipmentImportMappingTable({
  mappings,
  mappingConfidence,
  running,
  parsing,
  sheets,
  selectedSheet,
  headerRow,
  onMappingChange,
  onAutoMap,
  onValidate,
  onSheetChange,
}: {
  mappings: EquipmentImportMapping[];
  mappingConfidence: number;
  running: boolean;
  parsing: boolean;
  sheets: Array<{ name: string; rowCount: number; selected: boolean }>;
  selectedSheet: string;
  headerRow: number;
  onMappingChange: (id: string, systemField: string) => void;
  onAutoMap: () => void;
  onValidate: () => void;
  onSheetChange: (sheetName: string) => void;
}) {
  const requiredMappings = mappings.filter((mapping) => mapping.required);
  const mappedRequired = requiredMappings.filter(
    (mapping) => mapping.status !== "unmapped"
  ).length;

  return (
    <section className="min-w-0 overflow-hidden rounded-[12px] border border-borderSoft bg-white shadow-card">
      <div className="border-b border-borderSoft px-4 py-3">
        <ModuleHeader
          icon={Sparkles}
          tone="purple"
          density="compact"
          title="字段映射与解析预览"
          subtitle="AI识别 Excel 列，并映射到设备价格字段"
          action={
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-textMuted md:inline">
                映射置信度
                <strong className="ml-1 text-[15px] text-ai">{mappingConfidence}%</strong>
              </span>
              <button
                type="button"
                onClick={onAutoMap}
                disabled={running}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ai px-3 text-[11px] font-semibold text-white shadow-ai transition hover:bg-ai/90 disabled:opacity-60"
              >
                <Sparkles className={cn("size-3.5", running && "animate-pulse")} />
                {running ? "AI映射中" : "AI自动映射"}
              </button>
              <button
                type="button"
                onClick={onValidate}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-3 text-[11px] font-semibold text-primary"
              >
                开始校验
              </button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-borderSoft bg-slate-50/70 px-4 py-2 lg:grid-cols-4">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold text-textMuted">来源工作表</span>
          <select
            value={selectedSheet}
            disabled={parsing || sheets.length === 0}
            onChange={(event) => onSheetChange(event.target.value)}
            className="h-8 w-full rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textSecondary outline-none disabled:bg-slate-100"
          >
            {sheets.length === 0 ? (
              <option value="">解析后显示工作表</option>
            ) : (
              sheets.map((sheet) => (
                <option key={sheet.name} value={sheet.name}>
                  {sheet.name}（{sheet.rowCount} 行）
                </option>
              ))
            )}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold text-textMuted">表头所在行</span>
          <div className="flex h-8 items-center rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textSecondary">
            {mappings.length > 0 ? `自动识别为第 ${headerRow} 行` : "等待解析"}
          </div>
        </label>
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold text-textMuted">必填字段</span>
          <div className="flex h-8 items-center rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textSecondary">
            已识别 {mappedRequired} / {requiredMappings.length || 0} 个
          </div>
        </div>
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold text-textMuted">人工修正</span>
          <div className="flex h-8 items-center rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textSecondary">
            {mappings.filter((mapping) => mapping.userModified).length} 个字段
          </div>
        </div>
      </div>

      <div className="max-h-[330px] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-[11px]">
          <thead className="sticky top-0 z-10 bg-[#F4F7FB] text-left text-textSecondary">
            <tr>
              <th className="h-9 border-b border-borderSoft px-3 font-semibold">Excel原字段</th>
              <th className="h-9 border-b border-borderSoft px-3 font-semibold">系统字段</th>
              <th className="h-9 border-b border-borderSoft px-3 font-semibold">示例值</th>
              <th className="h-9 border-b border-borderSoft px-3 text-center font-semibold">映射置信度</th>
              <th className="h-9 border-b border-borderSoft px-3 text-center font-semibold">校验状态</th>
              <th className="h-9 border-b border-borderSoft px-3 text-center font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-24 px-4 text-center text-[11px] text-textMuted">
                  上传并解析真实 Excel 后，这里将显示字段映射结果。
                </td>
              </tr>
            ) : mappings.map((mapping) => (
              <tr key={mapping.id} className="border-b border-borderSoft/80 transition hover:bg-primary-soft/25">
                <td className="h-10 px-3 font-medium text-textMain">
                  {mapping.sourceField}
                  {mapping.required ? <span className="ml-1 text-danger">*</span> : null}
                </td>
                <td className="h-10 px-3">
                  <select
                    value={mapping.systemField}
                    onChange={(event) => onMappingChange(mapping.id, event.target.value)}
                    className="h-7 w-full min-w-[150px] rounded-md border border-borderSoft bg-white px-2 text-[11px] text-textSecondary outline-none focus:border-primary/40"
                  >
                    {equipmentImportSystemFields.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="h-10 max-w-[210px] truncate px-3 text-textSecondary" title={mapping.sampleValue}>
                  {mapping.sampleValue}
                </td>
                <td className="h-10 px-3 text-center">
                  <span className={cn(
                    "inline-flex min-w-12 justify-center rounded-full border px-2 py-0.5 font-semibold",
                    mapping.confidence >= 90
                      ? "border-success/20 bg-success-soft text-success"
                      : "border-warning/25 bg-warning-soft text-warning"
                  )}>
                    {mapping.confidence}%
                  </span>
                </td>
                <td className="h-10 px-3 text-center">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
                    mappingStatusClass[mapping.status]
                  )}>
                    {mapping.status === "mapped" ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <AlertCircle className="size-3" />
                    )}
                    {mapping.status === "mapped" ? "通过" : mapping.status === "warning" ? "需确认" : "未映射"}
                  </span>
                </td>
                <td className="h-10 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => onMappingChange(mapping.id, mapping.systemField)}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-primary hover:bg-primary-soft"
                  >
                    <Edit3 className="size-3.5" />
                    修正
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function EquipmentImportPreviewTable({
  rows,
  issueFilter,
  page,
  pageSize,
  onPageChange,
  onToggleRow,
  onTogglePage,
  onResolve,
}: {
  rows: EquipmentImportRow[];
  issueFilter: "all" | EquipmentImportValidationStatus;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onToggleRow: (id: string) => void;
  onTogglePage: (ids: string[], selected: boolean) => void;
  onResolve: (id: string) => void;
}) {
  const filteredRows =
    issueFilter === "all" ? rows : rows.filter((row) => row.status === issueFilter);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => row.selected);

  return (
    <section className="min-w-0 overflow-hidden rounded-[12px] border border-borderSoft bg-white shadow-card">
      <div className="border-b border-borderSoft px-4 py-3">
        <ModuleHeader
          icon={FileCheck2}
          tone="cyan"
          density="compact"
          title="导入数据预览"
          subtitle={`展示 ${rows.length} 条真实解析记录`}
          action={
            issueFilter !== "all" ? (
              <span className="rounded-full border border-warning/20 bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                当前筛选：{validationStatusConfig[issueFilter].label}
              </span>
            ) : null
          }
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-[11px]">
          <thead className="bg-[#F4F7FB] text-left text-textSecondary">
            <tr>
              <th className="h-9 w-10 border-b border-borderSoft px-3 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => onTogglePage(visibleRows.map((row) => row.id), event.target.checked)}
                  className="size-3.5 accent-primary"
                  aria-label="全选当前页"
                />
              </th>
              {["行号", "设备名称", "规格型号", "品牌", "设备类别", "原始价格", "币种", "供应商名称", "报价日期", "置信度", "校验状态", "操作"].map((header) => (
                <th key={header} className={cn(
                  "h-9 border-b border-borderSoft px-3 font-semibold",
                  header === "原始价格" && "text-right",
                  ["置信度", "校验状态", "操作"].includes(header) && "text-center"
                )}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="h-28 px-4 text-center text-[11px] text-textMuted">
                  {rows.length === 0
                    ? "请选择并解析文件，真实数据会显示在这里。"
                    : "当前筛选条件下没有记录。"}
                </td>
              </tr>
            ) : visibleRows.map((row) => {
              const status = validationStatusConfig[row.status];
              return (
                <tr key={row.id} className="border-b border-borderSoft/80 transition hover:bg-primary-soft/25">
                  <td className="h-10 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => onToggleRow(row.id)}
                      className="size-3.5 accent-primary"
                      aria-label={`选择第 ${row.rowNumber} 行`}
                    />
                  </td>
                  <td className="h-10 px-3 text-textMuted">{row.rowNumber}</td>
                  <td className="h-10 max-w-[150px] truncate px-3 font-semibold text-textMain" title={row.equipmentName}>{row.equipmentName}</td>
                  <td className="h-10 max-w-[130px] truncate px-3 text-textSecondary" title={row.model}>{row.model}</td>
                  <td className="h-10 max-w-[110px] truncate px-3 text-textSecondary" title={row.brand}>{row.brand}</td>
                  <td className="h-10 max-w-[120px] truncate px-3 text-textSecondary" title={row.category}>{row.category}</td>
                  <td className="h-10 px-3 text-right font-semibold tabular-nums text-textMain">{row.originalPrice.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</td>
                  <td className="h-10 px-3 text-textSecondary">{row.currency || "—"}</td>
                  <td className="h-10 max-w-[170px] truncate px-3 text-textSecondary" title={row.supplier}>{row.supplier}</td>
                  <td className="h-10 px-3 text-textSecondary">{row.quoteDate}</td>
                  <td className="h-10 px-3 text-center font-semibold text-primary">{row.confidence}%</td>
                  <td className="h-10 px-3 text-center">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 font-semibold", status.className)} title={row.issues.join("；")}>
                      {status.label}
                    </span>
                  </td>
                  <td className="h-10 px-3 text-center">
                    {["warning", "error", "duplicate"].includes(row.status) ? (
                      <button
                        type="button"
                        onClick={() => onResolve(row.id)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-warning/20 bg-warning-soft px-2 text-[11px] font-semibold text-warning"
                      >
                        <Edit3 className="size-3.5" />
                        修正
                      </button>
                    ) : (
                      <span className="text-[10px] text-textMuted">无需处理</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-borderSoft px-4 py-2.5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
        <span className="text-textMuted">
          共 {filteredRows.length} 条预览记录，当前第 {safePage} / {pageCount} 页
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            className="flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary disabled:opacity-40"
            aria-label="上一页"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border text-[11px] font-semibold",
                pageNumber === safePage
                  ? "border-primary bg-primary text-white"
                  : "border-borderSoft bg-white text-textSecondary"
              )}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={safePage === pageCount}
            onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
            className="flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary disabled:opacity-40"
            aria-label="下一页"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
