"use client";

import { useEffect, useId, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, UploadCloud, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";
import { createClient } from "@/lib/supabase/client";

export type InquiryAttachment = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  evidenceType: string;
  verificationStatus: string;
  createdAt: string;
};

type Props = {
  open: boolean;
  inquiryId: string | null;
  onClose: () => void;
  onChanged: (items: InquiryAttachment[]) => void;
  onNotice: (tone: "success" | "danger" | "warning", title: string, detail: string) => void;
};

const evidenceOptions = [
  ["technical_spec", "技术规范书"],
  ["supplier_qualification", "供应商资质"],
  ["delivery_terms", "交货与商务条款"],
  ["correspondence", "往来函件"],
  ["other", "其他附件"],
] as const;

export function InquiryAttachmentDialog({ open, inquiryId, onClose, onChanged, onNotice }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [items, setItems] = useState<InquiryAttachment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState("technical_spec");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !inquiryId) return;
    let active = true;
    fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/attachments`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: InquiryAttachment[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "附件读取失败");
        if (active) setItems(payload.data ?? []);
      })
      .catch((error) => onNotice("danger", "附件读取失败", error instanceof Error ? error.message : "请稍后重试"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [inquiryId, onNotice, open]);

  const upload = async () => {
    if (!inquiryId) {
      onNotice("warning", "请先保存草稿", "询价任务入库后才能上传并归档附件。");
      return;
    }
    if (!file) {
      onNotice("warning", "请选择文件", "支持 PDF、Word、Excel 和常用图片格式。");
      return;
    }
    setLoading(true);
    try {
      const sessionResponse = await fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/attachments/upload-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, contentType: file.type }),
      });
      const session = (await sessionResponse.json()) as { upload?: { bucket: string; path: string; contentType: string }; error?: string };
      if (!sessionResponse.ok || !session.upload) throw new Error(session.error || "无法创建上传会话");

      const storage = createClient().storage.from(session.upload.bucket);
      const uploaded = await storage.upload(session.upload.path, file, { contentType: session.upload.contentType, upsert: false });
      if (uploaded.error) throw uploaded.error;

      const registerResponse = await fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: session.upload.bucket,
          path: session.upload.path,
          name: file.name,
          contentType: file.type,
          size: file.size,
          evidenceType,
        }),
      });
      const registered = (await registerResponse.json()) as { data?: InquiryAttachment; error?: string };
      if (!registerResponse.ok || !registered.data) {
        await storage.remove([session.upload.path]);
        throw new Error(registered.error || "附件登记失败");
      }
      const next = [registered.data, ...items];
      setItems(next);
      setFile(null);
      onChanged(next);
      onNotice("success", "附件已真实归档", "文件已写入 Supabase Storage，并进入询价证据链待核验。 ");
    } catch (error) {
      onNotice("danger", "附件上传失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} labelledBy={titleId} describedBy={descriptionId}>
      <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
        <div>
          <h2 id={titleId} className="text-[16px] font-bold text-textMain">询价附件与证据</h2>
          <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">真实上传至 Supabase Storage，归档后自动写入审计链。</p>
        </div>
        <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]"><X className="size-4" /></button>
      </div>
      <div className="space-y-4 p-5">
        <label className="flex min-h-[128px] cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-primary/35 bg-primary-soft/55 p-4 text-center">
          <UploadCloud className="size-9 text-primary" />
          <span className="mt-2 max-w-full truncate text-[13px] font-semibold text-primary">{file?.name || "选择询价附件"}</span>
          <span className="mt-1 text-[11px] text-textMuted">PDF / Word / Excel / JPG / PNG，标准上传单文件不超过 6 MB</span>
          <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="block text-[12px] font-semibold text-textSecondary">
          证据分类
          <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px]">
            {evidenceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="button" disabled={loading || !file || !inquiryId} onClick={() => void upload()} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          {loading ? "正在上传并登记" : inquiryId ? "上传并归档" : "请先保存询价草稿"}
        </button>
        <div className="rounded-card border border-borderSoft">
          <div className="border-b border-borderSoft px-3 py-2 text-[12px] font-bold text-textMain">已归档附件（{items.length}）</div>
          <div className="max-h-48 overflow-y-auto p-2">
            {items.length ? items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-[var(--color-muted-soft)]">
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-textSecondary" title={item.name}>{item.name}</span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] text-success"><CheckCircle2 className="size-3" />已入库</span>
              </div>
            )) : <p className="px-2 py-5 text-center text-[12px] text-textMuted">暂无已归档附件</p>}
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}
