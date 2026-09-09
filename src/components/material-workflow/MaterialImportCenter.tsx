"use client";

import Link from "next/link";
import { readSheet } from "read-excel-file/browser";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  ListChecks,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { ConfirmDialog, LoadingButton, ModuleHeader } from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type { MaterialPricePayload } from "@/types/materialPriceWorkflow";

type ImportRow = MaterialPricePayload & {
  rowNumber: number;
  errors: string[];
  selected: boolean;
};

const headerAliases: Record<keyof Omit<MaterialPricePayload, "action" | "supplierId" | "aiSuggestion" | "notes">, string[]> = {
  materialName: ["材料名称", "地材名称", "名称", "material name"],
  category: ["材料类别", "类别", "category"],
  specification: ["规格型号", "规格", "型号", "specification"],
  unit: ["单位", "计量单位", "unit"],
  price: ["价格", "原始价格", "单价", "price"],
  usdPrice: ["美元价", "折算美元价", "usd price"],
  currency: ["币种", "currency"],
  region: ["地区", "区域", "region"],
  supplierName: ["供应商", "供应商名称", "supplier"],
  sourceType: ["来源", "来源类型", "source"],
  sourceNote: ["来源说明", "来源备注", "source note"],
  sourceUrl: ["来源链接", "网址", "url"],
  quoteDate: ["报价日期", "价格日期", "quote date"],
  validUntil: ["有效期", "有效截止日", "valid until"],
  transportCondition: ["运输条件", "价格条件", "transport"],
  confidence: ["可信度", "置信度", "confidence"],
  riskLevel: ["风险等级", "风险", "risk"],
};

function cellText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeHeader(value: unknown) {
  return cellText(value).toLowerCase().replace(/[\s_\-（）()]/g, "");
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[,，￥$¥]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function findColumn(headers: unknown[], aliases: string[]) {
  const normalized = headers.map(normalizeHeader);
  return normalized.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias)));
}

function readCell(row: unknown[], headers: unknown[], key: keyof typeof headerAliases) {
  const index = findColumn(headers, headerAliases[key]);
  return index >= 0 ? row[index] : "";
}

function parseRows(rows: unknown[][]): ImportRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row, index) => {
    const materialName = cellText(readCell(row, headers, "materialName"));
    const unit = cellText(readCell(row, headers, "unit"));
    const price = numberValue(readCell(row, headers, "price"));
    const errors = [
      !materialName ? "缺少材料名称" : "",
      !unit ? "缺少计量单位" : "",
      price <= 0 ? "价格无效" : "",
    ].filter(Boolean);
    const riskText = cellText(readCell(row, headers, "riskLevel")).toLowerCase();
    const riskLevel = (["low", "medium", "high", "critical"].includes(riskText) ? riskText : "medium") as MaterialPricePayload["riskLevel"];
    return {
      action: "submit_review" as const,
      rowNumber: index + 2,
      selected: errors.length === 0,
      errors,
      materialName,
      category: cellText(readCell(row, headers, "category")) || "其他",
      specification: cellText(readCell(row, headers, "specification")),
      unit,
      price,
      usdPrice: numberValue(readCell(row, headers, "usdPrice")),
      currency: cellText(readCell(row, headers, "currency")) || "CNY",
      region: cellText(readCell(row, headers, "region")),
      supplierName: cellText(readCell(row, headers, "supplierName")),
      sourceType: cellText(readCell(row, headers, "sourceType")) || "Excel导入",
      sourceNote: cellText(readCell(row, headers, "sourceNote")),
      sourceUrl: cellText(readCell(row, headers, "sourceUrl")),
      quoteDate: cellText(readCell(row, headers, "quoteDate")),
      validUntil: cellText(readCell(row, headers, "validUntil")),
      transportCondition: cellText(readCell(row, headers, "transportCondition")),
      confidence: Math.max(0, Math.min(100, numberValue(readCell(row, headers, "confidence")) || 70)),
      riskLevel,
      aiSuggestion: "Excel 导入记录已完成字段校验，等待人工审核确认。",
      notes: `导入行号：${index + 2}`,
    };
  }).filter((row) => row.materialName || row.price > 0 || row.unit);
}

export function MaterialImportCenter() {
  const toast = useMockToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imported, setImported] = useState(0);

  const validRows = useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);
  const selectedRows = useMemo(() => validRows.filter((row) => row.selected), [validRows]);
  const invalidRows = rows.length - validRows.length;
  const step = imported > 0 ? 4 : rows.length ? 3 : fileName ? 2 : 1;

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    setImported(0);
    setParsing(true);
    try {
      const workbookRows = await readSheet(file);
      const parsed = parseRows(workbookRows as unknown as unknown[][]);
      setRows(parsed);
      toast.success("Excel 解析完成", `读取 ${parsed.length} 行，其中 ${parsed.filter((row) => row.errors.length === 0).length} 行通过校验。`);
    } catch (error) {
      toast.danger("Excel 解析失败", error instanceof Error ? error.message : "请检查文件格式。");
    } finally {
      setParsing(false);
    }
  };

  const reset = () => {
    setFileName("");
    setRows([]);
    setImported(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submitImport = async () => {
    setConfirmOpen(false);
    if (!selectedRows.length) {
      toast.warning("没有可导入记录", "请至少选择一条校验通过的数据。");
      return;
    }
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const row of selectedRows) {
      try {
        const payload: MaterialPricePayload = {
          action: row.action,
          materialName: row.materialName,
          category: row.category,
          specification: row.specification,
          unit: row.unit,
          price: row.price,
          usdPrice: row.usdPrice,
          currency: row.currency,
          region: row.region,
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          sourceType: row.sourceType,
          sourceNote: row.sourceNote,
          sourceUrl: row.sourceUrl,
          quoteDate: row.quoteDate,
          validUntil: row.validUntil,
          transportCondition: row.transportCondition,
          confidence: row.confidence,
          riskLevel: row.riskLevel,
          aiSuggestion: row.aiSuggestion,
          notes: row.notes,
        };
        const response = await fetch("/api/material-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error();
        success += 1;
      } catch {
        failed += 1;
      }
    }
    setImported(success);
    setImporting(false);
    if (success) toast.success("导入任务完成", `${success} 条已写入待审核队列${failed ? `，${failed} 条失败` : ""}。`);
    else toast.danger("导入失败", "没有记录成功写入，请检查权限或数据冲突。");
  };

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <PageHeader
          title="地材价格导入中心"
          description="批量解析 Excel、校验字段并提交人工审核；校验失败记录不会直接写入价格库。"
          actions={<><Link href="/material-prices" className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary"><ArrowLeft className="size-4" />返回价格库</Link><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-semibold text-white"><UploadCloud className="size-4" />选择 Excel</button></>}
        />

        <section className="rounded-card border border-borderSoft bg-card p-3 shadow-card">
          <div className="grid gap-2 md:grid-cols-4">
            {["上传文件", "解析与映射", "校验与修正", "提交审核"].map((label, index) => {
              const current = index + 1;
              return <div key={label} className={cn("flex h-14 items-center gap-3 rounded-md border px-3", current === step ? "border-primary bg-primary-soft" : current < step ? "border-emerald-100 bg-emerald-50" : "border-borderSoft bg-slate-50")}><span className={cn("flex size-7 items-center justify-center rounded-full text-[12px] font-bold", current <= step ? "bg-primary text-white" : "bg-slate-200 text-slate-500")}>{current}</span><span className="text-[12px] font-bold text-textMain">{label}</span></div>;
            })}
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0 space-y-3">
            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={FileSpreadsheet} title="Excel 文件与字段识别" subtitle="支持 .xlsx / .xls，首行为字段标题" density="compact" />
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={(event) => void chooseFile(event)} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 flex min-h-32 w-full flex-col items-center justify-center rounded-md border border-dashed border-primary/30 bg-primary-soft/40 px-6 text-center hover:border-primary">
                <UploadCloud className="size-9 text-primary" />
                <p className="mt-2 text-[14px] font-bold text-textMain">{parsing ? "正在解析 Excel..." : fileName || "点击选择地材价格 Excel"}</p>
                <p className="mt-1 text-[11px] text-textMuted">{parsing ? "正在读取首行字段并校验数据，请稍候" : "系统自动识别材料名称、规格、单位、价格、地区、来源和有效期"}</p>
              </button>
            </section>

            <section className="overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
              <div className="border-b border-borderSoft px-4 py-3"><ModuleHeader icon={ListChecks} title="导入数据预览" subtitle={`共 ${rows.length} 行，通过 ${validRows.length} 行，异常 ${invalidRows} 行`} density="compact" /></div>
              <div className="max-h-[430px] overflow-auto">
                <table className="min-w-[1120px] w-full text-[12px]">
                  <thead className="sticky top-0 bg-slate-50 text-textSecondary"><tr>{["选择", "行号", "材料名称", "类别", "规格", "单位", "价格", "币种", "地区", "供应商", "可信度", "校验结果"].map((item) => <th key={item} className="h-9 border-b border-borderSoft px-3 text-left font-semibold">{item}</th>)}</tr></thead>
                  <tbody>{rows.length ? rows.map((row) => <tr key={row.rowNumber} className={cn("border-b border-borderSoft", row.errors.length ? "bg-red-50/40" : "hover:bg-blue-50/40")}><td className="px-3 py-2"><input type="checkbox" disabled={row.errors.length > 0} checked={row.selected} onChange={() => setRows((items) => items.map((item) => item.rowNumber === row.rowNumber ? { ...item, selected: !item.selected } : item))} /></td><td className="px-3 py-2 text-textMuted">{row.rowNumber}</td><td className="px-3 py-2 font-bold text-textMain">{row.materialName}</td><td className="px-3 py-2">{row.category}</td><td className="px-3 py-2">{row.specification || "-"}</td><td className="px-3 py-2">{row.unit}</td><td className="px-3 py-2 font-bold">{row.price.toLocaleString()}</td><td className="px-3 py-2">{row.currency}</td><td className="px-3 py-2">{row.region || "-"}</td><td className="px-3 py-2">{row.supplierName || "-"}</td><td className="px-3 py-2">{row.confidence}%</td><td className="px-3 py-2"><span className={cn("rounded-full px-2 py-1 font-bold", row.errors.length ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700")}>{row.errors.join("、") || "通过"}</span></td></tr>) : <tr><td colSpan={12} className="h-40 text-center text-textMuted">选择 Excel 后在此显示解析结果</td></tr>}</tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-card border border-ai/20 bg-gradient-to-br from-violet-50 to-white p-4 shadow-card">
              <ModuleHeader icon={Sparkles} title="AI 字段映射" subtitle="识别常见中英文表头" density="compact" tone="purple" />
              <div className="mt-3 space-y-2 text-[12px]">{["材料名称 / 地材名称", "规格型号 / 规格", "原始价格 / 单价", "地区 / 区域", "来源类型 / 来源", "有效期 / 截止日期"].map((item) => <div key={item} className="flex items-center gap-2 rounded-md border border-violet-100 bg-white px-3 py-2"><CheckCircle2 className="size-4 text-ai" /><span>{item}</span></div>)}</div>
            </section>
            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={ShieldCheck} title="导入质量" subtitle="写入前校验结果" density="compact" tone="green" />
              <div className="mt-3 grid grid-cols-2 gap-2">{[["总行数", rows.length, "text-primary"], ["有效", validRows.length, "text-success"], ["异常", invalidRows, "text-danger"], ["已导入", imported, "text-ai"]].map(([label, value, color]) => <div key={String(label)} className="rounded-md border border-borderSoft bg-slate-50 p-3"><p className="text-[11px] text-textMuted">{label}</p><p className={cn("mt-1 text-xl font-bold", color)}>{value}</p></div>)}</div>
              {invalidRows ? <div className="mt-3 flex gap-2 rounded-md border border-amber-100 bg-amber-50 p-3 text-[11px] leading-5 text-amber-700"><AlertTriangle className="mt-0.5 size-4 shrink-0" />异常行不会提交，可修正 Excel 后重新解析。</div> : null}
            </section>
            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <ModuleHeader icon={Database} title="入库策略" subtitle="默认进入待审核队列" density="compact" />
              <p className="mt-3 text-[12px] leading-5 text-textSecondary">本次选中 {selectedRows.length} 条。导入后不会直接成为有效价格，审核人员确认来源、地区和有效期后才能正式使用。</p>
              <LoadingButton className="mt-3 w-full" tone="success" icon={<Save className="size-4" />} loading={importing} disabled={!selectedRows.length} onClick={() => setConfirmOpen(true)}>提交待审核队列</LoadingButton>
              <LoadingButton className="mt-2 w-full" tone="ghost" icon={<RotateCcw className="size-4" />} onClick={reset}>重新开始</LoadingButton>
            </section>
          </aside>
        </div>

        <ConfirmDialog open={confirmOpen} title="确认导入地材价格" description={`将 ${selectedRows.length} 条校验通过记录写入待审核队列。`} confirmLabel="确认导入" onCancel={() => setConfirmOpen(false)} onConfirm={() => void submitImport()}>
          AI 映射结果仅供辅助，导入后仍需人工复核来源与价格有效性。
        </ConfirmDialog>
      </div>
    </AppLayout>
  );
}
