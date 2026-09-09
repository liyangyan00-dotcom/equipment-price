"use client";
import { useVisiblePolling } from "@/hooks/useVisiblePolling";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  LoaderCircle,
  History,
  MapPin,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { IconBox } from "@/components/common/IconBox";
import { EmptyState } from "@/components/common/EmptyState";
import { AiBadge } from "@/components/badges/AiBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { QuoteEvidenceLocator } from "@/components/quote-recognition/QuoteEvidenceLocator";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type {
  QuoteRecognitionDocument,
  QuoteRecognitionItem,
  QuoteRecognitionListResponse,
} from "@/types/quoteRecognition";
import type { AiTaskStatus, ReviewStatus } from "@/types/common";

const buttonBase = "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

function formatMoney(value: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);
}

function documentStatus(status: QuoteRecognitionDocument["status"]): { status: ReviewStatus | AiTaskStatus; label: string } {
  const map: Record<QuoteRecognitionDocument["status"], { status: ReviewStatus | AiTaskStatus; label: string }> = {
    uploaded: { status: "created", label: "待解析" },
    parsing: { status: "running", label: "解析中" },
    needs_review: { status: "needs_review", label: "待人工审核" },
    partially_imported: { status: "needs_review", label: "部分入库" },
    imported: { status: "confirmed", label: "已入库" },
    voided: { status: "voided", label: "已作废" },
    failed: { status: "rejected", label: "解析失败" },
  };
  return map[status];
}

function itemStatus(status: QuoteRecognitionItem["review_status"]): { status: ReviewStatus | AiTaskStatus; label: string } {
  const map: Record<QuoteRecognitionItem["review_status"], { status: ReviewStatus | AiTaskStatus; label: string }> = {
    pending_review: { status: "pending", label: "待审核" },
    needs_info: { status: "need_info", label: "需补全" },
    approved: { status: "confirmed", label: "已批准" },
    imported: { status: "confirmed", label: "已入库" },
    rejected: { status: "rejected", label: "已驳回" },
    voided: { status: "voided", label: "已作废" },
  };
  return map[status];
}

const eventLabels: Record<string, string> = {
  "quote.uploaded": "创建上传会话",
  "quote.upload_failed": "源文件上传失败",
  "quote.source_previewed": "查看源文件",
  "quote.source_downloaded": "下载源文件",
  "quote.parse_started": "开始结构化解析",
  "quote.parse_completed": "结构化解析完成",
  "quote.parse_failed": "结构化解析失败",
  "quote.ai_review_queued": "AI辅助复核已排队",
  "quote.ai_review_unavailable": "AI辅助复核不可用",
  "quote.fields_saved": "人工修正已保存",
  "quote.needs_info": "退回补充资料",
  "quote.rejected": "人工驳回报价",
  "quote.voided": "报价已作废",
  "quote.imported": "人工确认入库",
};

function KpiCard({ title, value, note, tone, icon: Icon }: { title: string; value: string | number; note: string; tone: "blue" | "purple" | "orange" | "red" | "green"; icon: typeof Database }) {
  const colors = {
    blue: "border-primary/15 bg-gradient-to-br from-white to-primary-soft/70 text-primary",
    purple: "border-ai/15 bg-gradient-to-br from-white to-ai-soft text-ai",
    orange: "border-warning/15 bg-gradient-to-br from-white to-warning-soft text-warning",
    red: "border-danger/15 bg-gradient-to-br from-white to-danger-soft text-danger",
    green: "border-success/15 bg-gradient-to-br from-white to-success-soft text-success",
  };
  return (
    <article className={cn("flex h-[92px] min-w-0 items-center gap-3 rounded-card border px-4 shadow-card", colors[tone])}>
      <IconBox icon={Icon} tone={tone === "purple" ? "purple" : tone === "orange" ? "orange" : tone === "red" ? "red" : tone === "green" ? "green" : "blue"} size="lg" />
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-textMuted">{title}</p>
        <p className="mt-0.5 text-[24px] font-bold leading-7 text-current">{value}</p>
        <p className="truncate text-[11px] text-textMuted">{note}</p>
      </div>
    </article>
  );
}

export function QuoteRecognitionWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<QuoteRecognitionListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("documentId"));
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [evidenceItem, setEvidenceItem] = useState<QuoteRecognitionItem | null>(null);

  const load = useCallback(async (preferredId?: string | null, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/quote-recognition?limit=30", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "读取报价识别记录失败");
      const next = body as QuoteRecognitionListResponse;
      setPayload(next);
      setSelectedId((current) => {
        const candidate = preferredId || current;
        return candidate && next.data.some((item) => item.id === candidate) ? candidate : next.data[0]?.id ?? null;
      });
    } catch (error) {
      toast.danger("读取失败", error instanceof Error ? error.message : "无法读取报价识别记录");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(searchParams.get("documentId")), 0);
    return () => window.clearTimeout(timer);
  }, [load, searchParams]);

  const selected = useMemo(
    () => payload?.data.find((document) => document.id === selectedId) ?? null,
    [payload, selectedId],
  );

  const resultSyncId = useRef<string | null>(null);
  const activeDocumentId = selected && (selected.status === "parsing" || ["created", "queued", "running"].includes(selected.ai_task?.status ?? "")) ? selected.id : "";
  const quotePoller = useVisiblePolling(async (signal) => {
    const id = resultSyncId.current || activeDocumentId;
    if (!id) return false;
    try {
      if (!resultSyncId.current) {
        const response = await fetch(`/api/quote-recognition?view=progress&id=${encodeURIComponent(id)}`, { cache: "no-store", signal });
        const body = await response.json();
        if (!response.ok) throw Object.assign(new Error(body.error || "读取识别状态失败"), { status: response.status });
        if (signal.aborted) return false;
        const active = body.data.status === "parsing" || ["created", "queued", "running"].includes(body.data.ai_task?.status ?? "");
        setPayload((current) => current ? { ...current, data: current.data.map((document) => document.id === id ? { ...document, ...body.data } : document) } : current);
        if (active) return true;
        resultSyncId.current = id;
      }
      const response = await fetch(`/api/quote-recognition?id=${encodeURIComponent(id)}`, { cache: "no-store", signal });
      const body = await response.json() as QuoteRecognitionListResponse & { error?: string };
      if (!response.ok) throw Object.assign(new Error(body.error || "同步识别结果失败"), { status: response.status });
      if (signal.aborted) return false;
      setPayload((current) => current ? {
        ...current,
        counts: { ...body.counts, documents: current.counts.documents },
        data: current.data.map((document) => document.id === id ? body.data[0] ?? document : document),
      } : current);
      resultSyncId.current = null;
      return false;
    } catch (error) {
      if (!signal.aborted) toast.warning("识别状态同步失败", error instanceof Error ? error.message : "请稍后刷新");
      throw error;
    }
  }, 30_000, activeDocumentId);

  const uploadFile = async (file: File) => {
    setUploading(true);
    let createdDocumentId: string | null = null;
    const visualDocument = file.type === "application/pdf" || file.type.startsWith("image/") || /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
    try {
      const sessionResponse = await fetch("/api/quote-recognition/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type }),
      });
      const sessionBody = await sessionResponse.json();
      if (!sessionResponse.ok) throw new Error(sessionBody.error || "创建上传会话失败");
      createdDocumentId = sessionBody.data.id;
      const upload = await createClient().storage.from(sessionBody.upload.bucket).upload(sessionBody.upload.path, file, {
        contentType: sessionBody.upload.contentType,
        upsert: false,
      });
      if (upload.error) throw upload.error;
      toast.success("文件已上传", visualDocument ? "文件已保存到私有 Storage，视觉模型正在提取报价行与页面坐标。" : "文件已保存到私有 Storage，正在进行确定性表格解析。");
      setParsingId(sessionBody.data.id);
      const parseResponse = await fetch(`/api/quote-recognition/${sessionBody.data.id}/parse`, { method: "POST" });
      const parseBody = await parseResponse.json();
      if (!parseResponse.ok) throw new Error(parseBody.error || "报价解析失败");
      await load(sessionBody.data.id);
      if (parseBody.aiQueueError) {
        toast.warning("结构化解析完成", "AI复核任务暂未执行，报价明细仍可进入人工审核。");
      } else {
        toast.ai("识别任务已创建", "结构化明细已生成，AI风险复核正在后台执行。");
      }
    } catch (error) {
      if (createdDocumentId) {
        await fetch(`/api/quote-recognition/${createdDocumentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "upload_failed", error: error instanceof Error ? error.message : "文件上传失败" }),
        }).catch(() => undefined);
      }
      toast.danger("上传或解析失败", error instanceof Error ? error.message : "请检查文件格式后重试");
      await load(null, true);
    } finally {
      setUploading(false);
      setParsingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const parseAgain = async () => {
    if (!selected) return;
    setParsingId(selected.id);
    try {
      const response = await fetch(`/api/quote-recognition/${selected.id}/parse`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "重新识别失败");
      await load(selected.id);
      toast.success("重新识别完成", `已生成 ${body.data.items?.length ?? 0} 条报价明细。`);
    } catch (error) {
      toast.danger("重新识别失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setParsingId(null);
    }
  };

  const openSourceFile = async (mode: "preview" | "download" = "preview") => {
    if (!selected) return;
    try {
      const response = await fetch(`/api/quote-recognition/${selected.id}/source?mode=${mode}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "源文件访问失败");
      window.open(body.data.url, "_blank", "noopener,noreferrer");
      toast.success(mode === "download" ? "下载链接已生成" : "源文件已打开", "本次访问已写入真实审计链，链接将在 2 分钟后失效。");
      await load(selected.id, true);
    } catch (error) {
      toast.danger("文件访问失败", error instanceof Error ? error.message : "请稍后重试");
    }
  };

  const counts = payload?.counts ?? { documents: 0, pendingItems: 0, needsInfoItems: 0, highRiskItems: 0, importedItems: 0 };
  const currentStatus = selected ? documentStatus(selected.status) : null;
  const items = selected?.items ?? [];

  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader
          title="AI报价识别中心"
          description="真实上传报价文件、结构化解析、AI风险复核并进入人工审核，AI结果不会直接入库。"
          actions={
            <>
              <button type="button" title="刷新识别记录" aria-label="刷新识别记录" className={cn(buttonBase, "border border-borderSoft bg-white text-primary")} onClick={async () => { await load(selectedId, true); quotePoller.current?.refresh(); }}><RefreshCw className="size-4" /></button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
              }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || !payload?.permissions.canWrite} className={cn(buttonBase, "bg-primary text-white hover:bg-primary-hover")}>
                {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
                {uploading ? "上传解析中" : "上传报价文件"}
              </button>
              <button type="button" onClick={() => router.push(selected ? `/pending-quotes?documentId=${selected.id}` : "/pending-quotes")} className={cn(buttonBase, "border border-ai-border bg-ai-soft text-ai hover:bg-ai/10")}>
                <SearchCheck className="size-4" />进入人工审核
              </button>
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="报价文件" value={counts.documents} note="Supabase真实记录" tone="blue" icon={FileSpreadsheet} />
          <KpiCard title="待人工审核" value={counts.pendingItems} note="AI不得直接确认" tone="purple" icon={Bot} />
          <KpiCard title="待补全字段" value={counts.needsInfoItems} note="需人工修正" tone="orange" icon={AlertTriangle} />
          <KpiCard title="高风险明细" value={counts.highRiskItems} note="必须重点复核" tone="red" icon={ShieldCheck} />
          <KpiCard title="已确认入库" value={counts.importedItems} note="设备与地材价格" tone="green" icon={Database} />
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
            <div className="border-b border-borderSoft px-4 py-3">
              <div className="flex items-center gap-2"><IconBox icon={FileSpreadsheet} tone="blue" size="sm" /><div><h2 className="text-[14px] font-semibold">报价文件记录</h2><p className="text-[11px] text-textMuted">点击切换识别上下文</p></div></div>
            </div>
            <div className="max-h-[460px] space-y-2 overflow-y-auto p-3">
              {loading ? <p className="py-8 text-center text-[13px] text-textMuted">正在读取真实数据...</p> : payload?.data.length ? payload.data.map((document) => {
                const status = documentStatus(document.status);
                return (
                  <button key={document.id} type="button" onClick={() => setSelectedId(document.id)} className={cn("w-full rounded-md border p-3 text-left transition", selectedId === document.id ? "border-primary bg-primary-soft/70" : "border-borderSoft bg-white hover:border-primary/30")}>
                    <div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate text-[13px] font-semibold text-textMain" title={document.file_name}>{document.file_name}</p><StatusBadge status={status.status} label={status.label} className="h-5 px-1.5 text-[10px]" /></div>
                    <p className="mt-1 text-[11px] text-textMuted">{document.document_code}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-textSecondary"><span>{document.items?.length ?? 0} 条明细</span><span>{document.overall_confidence ?? 0}%</span></div>
                  </button>
                );
              }) : <EmptyState className="border-0 py-8 shadow-none" title="暂无报价文件" description="上传 Excel、CSV、PDF 或报价图片后开始真实识别。" />}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSoft px-4 py-3">
              <div className="flex min-w-0 items-center gap-2"><IconBox icon={SearchCheck} tone="purple" size="sm" /><div className="min-w-0"><h2 className="truncate text-[14px] font-semibold">结构化识别结果</h2><p className="truncate text-[11px] text-textMuted">{selected?.supplier_name || "尚未识别供应商"} · {selected?.currency || "CNY"}</p></div></div>
              <div className="flex items-center gap-2">
                {currentStatus ? <StatusBadge status={currentStatus.status} label={currentStatus.label} /> : null}
                <button type="button" onClick={() => void parseAgain()} disabled={!selected || Boolean(parsingId) || !payload?.permissions.canWrite} className={cn(buttonBase, "border border-borderSoft bg-white text-textSecondary hover:bg-page")}>
                  <RefreshCw className={cn("size-4", parsingId === selected?.id && "animate-spin")} />重新识别
                </button>
              </div>
            </div>
            {selected ? (
              <>
                <div className="grid gap-2 border-b border-borderSoft bg-page/60 p-3 sm:grid-cols-4">
                  <div className="rounded-md bg-white p-2"><p className="text-[10px] text-textMuted">整体置信度</p><p className="mt-1 text-[18px] font-bold text-primary">{selected.overall_confidence ?? 0}%</p></div>
                  <div className="rounded-md bg-white p-2"><p className="text-[10px] text-textMuted">报价总额</p><p className="mt-1 truncate text-[15px] font-bold text-textMain">{formatMoney(selected.total_amount, selected.currency)}</p></div>
                  <div className="rounded-md bg-white p-2"><p className="text-[10px] text-textMuted">缺失字段</p><p className="mt-1 text-[18px] font-bold text-warning">{selected.missing_fields.length}</p></div>
                  <div className="rounded-md bg-white p-2"><p className="text-[10px] text-textMuted">AI任务</p><p className="mt-1 truncate text-[13px] font-semibold text-ai">{selected.ai_task ? `${selected.ai_task.stage} ${selected.ai_task.progress}%` : "未排队"}</p></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[1080px] w-full text-[12px]">
                    <thead className="h-10 bg-[#F7F9FC] text-left text-textMuted"><tr><th className="px-3">行</th><th className="px-3">类型</th><th className="px-3">名称</th><th className="px-3">品牌/规格</th><th className="px-3 text-right">数量</th><th className="px-3 text-right">单价</th><th className="px-3">置信度</th><th className="px-3">风险</th><th className="px-3">状态</th><th className="px-3">证据</th></tr></thead>
                    <tbody>{items.map((item) => {
                      const status = itemStatus(item.review_status);
                      const evidence = item.evidence?.find((entry) => entry.is_primary) ?? item.evidence?.[0] ?? null;
                      return <tr key={item.id} className="h-11 border-t border-borderSoft hover:bg-primary-soft/30"><td className="px-3 text-textMuted">{item.line_number}</td><td className="px-3"><span className={cn("rounded px-1.5 py-1 text-[10px] font-medium", item.item_type === "equipment" ? "bg-primary-soft text-primary" : "bg-success-soft text-success")}>{item.item_type === "equipment" ? "设备" : "地材"}</span></td><td className="max-w-[180px] truncate px-3 font-medium" title={item.item_name}>{item.item_name}</td><td className="max-w-[200px] truncate px-3 text-textSecondary" title={`${item.brand || ""} ${item.specification || ""}`}>{item.brand || "-"} · {item.specification || "-"}</td><td className="px-3 text-right">{item.quantity} {item.unit || ""}</td><td className="px-3 text-right font-semibold">{formatMoney(item.unit_price, item.currency)}</td><td className="px-3"><span className="font-semibold text-primary">{item.confidence}%</span></td><td className="px-3"><RiskBadge level={item.risk_level} className="h-5 px-1.5 text-[10px]" /></td><td className="px-3"><StatusBadge status={status.status} label={status.label} className="h-5 px-1.5 text-[10px]" /></td><td className="px-3">{evidence ? <button type="button" onClick={() => setEvidenceItem(item)} className="inline-flex h-7 items-center gap-1 rounded border border-ai-border bg-ai-soft px-2 text-[10px] font-medium text-ai hover:bg-ai/10"><MapPin className="size-3" />第 {evidence.page_number} 页</button> : <span className="text-[10px] text-textMuted">待生成</span>}</td></tr>;
                    })}</tbody>
                  </table>
                </div>
                {!items.length ? <EmptyState className="m-4 py-8 shadow-none" title="尚未生成明细" description="点击重新识别或上传新的结构化报价文件。" /> : null}
              </>
            ) : <EmptyState className="m-4" title="请选择报价文件" description="选择左侧记录查看结构化解析结果。" />}
          </section>

          <aside className="space-y-3">
            <section className="rounded-card border border-ai-border bg-gradient-to-br from-white to-ai-soft p-4 shadow-card">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><IconBox icon={Bot} tone="purple" size="sm" /><h2 className="text-[14px] font-semibold">AI风险复核</h2></div><AiBadge label="辅助判断" /></div>
              <p className="mt-3 text-[12px] leading-5 text-textSecondary">AI仅检查字段一致性、价格异常和缺失信息，最终入库必须由有审核权限的人员确认。</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-md border border-ai-border bg-white/80 p-3"><p className="text-[11px] text-textMuted">任务状态</p><p className="mt-1 text-[13px] font-semibold text-ai">{selected?.ai_task ? `${selected.ai_task.status} · ${selected.ai_task.progress}%` : "等待真实AI任务"}</p>{selected?.ai_task?.error_message ? <p className="mt-1 text-[11px] text-danger">{selected.ai_task.error_message}</p> : null}</div>
                <div className="rounded-md border border-warning/20 bg-warning-soft p-3"><p className="text-[11px] font-semibold text-warning">人工复核要求</p><p className="mt-1 text-[11px] leading-5 text-textSecondary">补齐名称、单价及地材单位；高风险记录需填写审核说明。</p></div>
              </div>
            </section>
            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <h2 className="text-[14px] font-semibold">当前文件</h2>
              <dl className="mt-3 space-y-2 text-[12px]"><div className="flex justify-between gap-3"><dt className="text-textMuted">文件</dt><dd className="max-w-[180px] truncate font-medium" title={selected?.file_name}>{selected?.file_name || "-"}</dd></div><div className="flex justify-between"><dt className="text-textMuted">供应商</dt><dd className="font-medium">{selected?.supplier_name || "待识别"}</dd></div><div className="flex justify-between gap-3"><dt className="text-textMuted">识别方式</dt><dd className="max-w-[180px] truncate font-medium text-ai" title={`${selected?.recognition_provider || ""} ${selected?.recognition_model || ""}`}>{selected?.recognition_method?.startsWith("openai") ? `视觉模型 · ${selected.page_count || 1}页` : selected?.recognition_method === "spreadsheet" ? "结构化表格" : "待识别"}</dd></div><div className="flex justify-between"><dt className="text-textMuted">风险等级</dt><dd>{selected ? <RiskBadge level={selected.risk_level} className="h-5 px-1.5 text-[10px]" /> : "-"}</dd></div></dl>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void openSourceFile("preview")} disabled={!selected} className={cn(buttonBase, "border border-borderSoft bg-white text-primary hover:bg-primary-soft")}><ExternalLink className="size-4" />查看源文件</button>
                <button type="button" onClick={() => void openSourceFile("download")} disabled={!selected} className={cn(buttonBase, "border border-borderSoft bg-white text-textSecondary hover:bg-page")}><Download className="size-4" />下载</button>
                <button type="button" onClick={() => router.push(selected ? `/pending-quotes?documentId=${selected.id}` : "/pending-quotes")} disabled={!selected || !items.length} className={cn(buttonBase, "col-span-2 bg-ai text-white hover:bg-ai/90")}><CheckCircle2 className="size-4" />进入人工审核</button>
              </div>
            </section>
            <section className="rounded-card border border-borderSoft bg-card p-4 shadow-card">
              <div className="flex items-center gap-2"><IconBox icon={History} tone="blue" size="sm" /><div><h2 className="text-[14px] font-semibold">处理轨迹</h2><p className="text-[11px] text-textMuted">真实审计事件</p></div></div>
              <div className="mt-3 space-y-2">
                {selected?.events?.length ? selected.events.slice(0, 6).map((event) => (
                  <div key={event.id} className="border-l-2 border-primary/20 pl-3">
                    <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-semibold text-textMain">{eventLabels[event.action] || event.action}</p><time className="shrink-0 text-[10px] text-textMuted">{new Date(event.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></div>
                    {event.note ? <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-textMuted">{event.note}</p> : null}
                  </div>
                )) : <p className="rounded-md bg-page px-3 py-4 text-center text-[11px] text-textMuted">暂无可见审计事件</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
      <QuoteEvidenceLocator open={Boolean(evidenceItem && selected)} documentId={selected?.id ?? ""} fileName={selected?.file_name ?? ""} mimeType={selected?.mime_type ?? ""} itemName={evidenceItem?.item_name ?? ""} evidence={evidenceItem?.evidence?.find((entry) => entry.is_primary) ?? evidenceItem?.evidence?.[0] ?? null} onClose={() => setEvidenceItem(null)} />
    </AppLayout>
  );
}
