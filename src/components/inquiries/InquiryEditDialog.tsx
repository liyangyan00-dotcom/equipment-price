"use client";

import { useId, useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";
import type { InquiryDetail } from "@/data/mock/inquiryDetails";

type Props = {
  open: boolean;
  inquiryId: string;
  detail: InquiryDetail;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
  onNotice: (tone: "success" | "danger" | "warning", title: string, detail: string) => void;
};

function toLocalDateTime(value: string) {
  const normalized = value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
}

export function InquiryEditDialog({ open, inquiryId, detail, onClose, onChanged, onNotice }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [subject, setSubject] = useState(detail.projectName);
  const [deadline, setDeadline] = useState(() => toLocalDateTime(detail.deadline));
  const [riskLevel, setRiskLevel] = useState(detail.riskLevel);
  const [letterContent, setLetterContent] = useState(detail.letter.rawContent || detail.letter.projectBackground);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!subject.trim()) {
      onNotice("warning", "主题不能为空", "请填写询价主题后再保存。 ");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          deadline: deadline ? new Date(deadline).toISOString() : "",
          riskLevel,
          letterContent,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "询价任务保存失败");
      await onChanged();
      onNotice("success", "询价任务已更新", "主题、截止时间、风险等级和询价函正文已写入 Supabase，并记录审计事件。 ");
      onClose();
    } catch (error) {
      onNotice("danger", "保存失败", error instanceof Error ? error.message : "请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="drawer" panelClassName="overflow-y-auto" labelledBy={titleId} describedBy={descriptionId}>
      <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
        <div>
          <h2 id={titleId} className="text-[16px] font-bold text-textMain">编辑询价任务</h2>
          <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">修改真实询价主档；保存后同步刷新详情与操作记录。</p>
        </div>
        <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-surfaceSoft"><X className="size-4" /></button>
      </div>
      <div className="space-y-4 p-5">
        <label className="block text-[12px] font-semibold text-textSecondary">询价主题
          <input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-borderSoft px-3 text-[13px] outline-none focus:border-primary" />
        </label>
        <label className="block text-[12px] font-semibold text-textSecondary">报价截止时间
          <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-borderSoft px-3 text-[13px] outline-none focus:border-primary" />
        </label>
        <label className="block text-[12px] font-semibold text-textSecondary">风险等级
          <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as InquiryDetail["riskLevel"])} className="mt-1.5 h-10 w-full rounded-lg border border-borderSoft bg-white px-3 text-[13px]">
            <option value="low">低风险</option><option value="medium">中风险</option><option value="high">高风险</option><option value="critical">严重风险</option>
          </select>
        </label>
        <label className="block text-[12px] font-semibold text-textSecondary">询价函正文
          <textarea value={letterContent} onChange={(event) => setLetterContent(event.target.value)} rows={14} className="mt-1.5 w-full resize-y rounded-lg border border-borderSoft p-3 text-[12px] leading-6 outline-none focus:border-primary" />
        </label>
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-borderSoft bg-white px-5 py-4">
        <button type="button" onClick={onClose} className="h-9 rounded-lg border border-borderSoft px-4 text-[12px] font-semibold text-textSecondary">取消</button>
        <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-60">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{busy ? "保存中" : "保存修改"}
        </button>
      </div>
    </OverlayShell>
  );
}
