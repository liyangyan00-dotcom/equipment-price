"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileSearch2, LoaderCircle, MapPin, X } from "lucide-react";
import type { QuoteItemEvidence } from "@/types/quoteRecognition";

export function QuoteEvidenceLocator({
  open,
  documentId,
  fileName,
  mimeType,
  itemName,
  evidence,
  onClose,
}: {
  open: boolean;
  documentId: string;
  fileName: string;
  mimeType: string;
  itemName: string;
  evidence: QuoteItemEvidence | null;
  onClose: () => void;
}) {
  const [source, setSource] = useState<{ documentId: string; url: string; error: string } | null>(null);

  useEffect(() => {
    if (!open || !documentId || !evidence) return;
    let cancelled = false;
    fetch(`/api/quote-recognition/${documentId}/source?mode=preview`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "证据文件访问失败");
        if (!cancelled) setSource({ documentId, url: String(body.data.url), error: "" });
      })
      .catch((reason) => {
        if (!cancelled) setSource({ documentId, url: "", error: reason instanceof Error ? reason.message : "证据文件访问失败" });
      });
    return () => { cancelled = true; };
  }, [documentId, evidence, open]);

  if (!open || !evidence) return null;
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const loading = source?.documentId !== documentId;
  const url = source?.documentId === documentId ? source.url : "";
  const error = source?.documentId === documentId ? source.error : "";
  const pageUrl = `${url}${url.includes("#") ? "&" : "#"}page=${evidence.page_number}`;
  const percent = (value: number) => `${(Number(value) * 100).toFixed(2)}%`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#07152F]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="quote-evidence-title">
      <div className="flex max-h-[94vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-card border border-white/20 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-ai-soft text-ai"><MapPin className="size-4.5" /></span>
            <div className="min-w-0"><h2 id="quote-evidence-title" className="truncate text-[16px] font-semibold text-textMain">行级证据定位 · {itemName}</h2><p className="mt-1 truncate text-[11px] text-textMuted">{fileName} · 第 {evidence.page_number} 页 · {evidence.extraction_method === "openai_responses" ? "视觉识别" : "结构化行"}</p></div>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-page" aria-label="关闭证据定位"><X className="size-4" /></button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-[520px] overflow-auto bg-[#17233A] p-4">
            {loading ? <div className="flex h-full min-h-[500px] items-center justify-center text-white"><LoaderCircle className="mr-2 size-5 animate-spin" />读取私有证据文件...</div> : error ? <div className="flex h-full min-h-[500px] items-center justify-center text-danger">{error}</div> : url && isImage ? (
              <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-md bg-white shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={fileName} className="block max-h-[74vh] max-w-full object-contain" />
                <span className="pointer-events-none absolute border-2 border-danger bg-danger/15 shadow-[0_0_0_9999px_rgba(7,21,47,0.18)]" style={{ left: percent(evidence.bbox_x), top: percent(evidence.bbox_y), width: percent(evidence.bbox_width), height: percent(evidence.bbox_height) }} />
              </div>
            ) : url && isPdf ? <iframe title={`${fileName} 第 ${evidence.page_number} 页`} src={pageUrl} className="h-[74vh] min-h-[520px] w-full rounded-md bg-white" /> : url ? (
              <div className="flex min-h-[520px] items-center justify-center p-8">
                <div className="max-w-lg rounded-card border border-white/15 bg-white/10 p-6 text-center text-white">
                  <FileSearch2 className="mx-auto size-9 text-primary-light" />
                  <p className="mt-3 text-[14px] font-semibold">结构化文件行证据</p>
                  <p className="mt-2 text-[12px] leading-6 text-white/70">浏览器不能稳定内嵌预览 Excel/CSV。右侧已展示该行原始文本，可通过“在新窗口查看原件”打开私有短效链接核对。</p>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 overflow-y-auto border-l border-borderSoft p-4">
            <section className="rounded-card border border-ai-border bg-ai-soft p-3"><div className="flex items-center gap-2 text-ai"><FileSearch2 className="size-4" /><h3 className="text-[12px] font-semibold">原文证据</h3></div><p className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-5 text-textSecondary">{evidence.source_text || "模型未返回原文片段，请直接核对源文件对应区域。"}</p></section>
            <section className="rounded-card border border-borderSoft bg-page p-3"><h3 className="text-[12px] font-semibold text-textMain">定位信息</h3><dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]"><div><dt className="text-textMuted">页码</dt><dd className="font-semibold">{evidence.page_number}</dd></div><div><dt className="text-textMuted">证据置信度</dt><dd className="font-semibold text-ai">{Number(evidence.confidence).toFixed(1)}%</dd></div><div><dt className="text-textMuted">横向位置</dt><dd className="font-mono">{percent(evidence.bbox_x)}</dd></div><div><dt className="text-textMuted">纵向位置</dt><dd className="font-mono">{percent(evidence.bbox_y)}</dd></div><div><dt className="text-textMuted">区域宽度</dt><dd className="font-mono">{percent(evidence.bbox_width)}</dd></div><div><dt className="text-textMuted">区域高度</dt><dd className="font-mono">{percent(evidence.bbox_height)}</dd></div></dl></section>
            <section className="rounded-card border border-warning/20 bg-warning-soft p-3 text-[11px] leading-5 text-textSecondary"><p className="font-semibold text-warning">人工核验边界</p><p className="mt-1">坐标来自文档视觉识别，仅用于快速定位。审核员必须以原始文件内容为准，AI不得直接确认价格或供应商。</p></section>
            <button type="button" disabled={!url} onClick={() => window.open(pageUrl, "_blank", "noopener,noreferrer")} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-[12px] font-semibold text-white disabled:opacity-50"><ExternalLink className="size-4" />在新窗口查看原件</button>
          </aside>
        </div>
      </div>
    </div>
  );
}
