"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { FileText, LoaderCircle, Save, Trash2, X } from "lucide-react";
import { OverlayShell } from "@/components/common/OverlayShell";

export type InquiryTemplate = {
  id: string;
  template_code: string;
  name: string;
  language: string;
  config: Record<string, unknown>;
  content: string;
  updated_at: string;
};

type Props = {
  open: boolean;
  defaultName: string;
  language: string;
  config: Record<string, unknown>;
  content: string;
  onClose: () => void;
  onApply: (template: InquiryTemplate) => void;
  onNotice: (tone: "success" | "danger" | "warning", title: string, detail: string) => void;
};

export function InquiryTemplateDialog({ open, defaultName, language, config, content, onClose, onApply, onNotice }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [templates, setTemplates] = useState<InquiryTemplate[]>([]);
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/inquiries/templates", { cache: "no-store" });
      const payload = (await response.json()) as { data?: InquiryTemplate[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "模板读取失败");
      setTemplates(payload.data ?? []);
    } catch (error) {
      onNotice("danger", "模板读取失败", error instanceof Error ? error.message : "请稍后重试");
    } finally { setLoading(false); }
  }, [onNotice]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, open]);

  const save = async () => {
    if (!name.trim() || !content.trim()) {
      onNotice("warning", "模板信息不完整", "请填写模板名称，并先生成询价函正文。");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/inquiries/templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), language, config, content }),
      });
      const payload = (await response.json()) as { data?: InquiryTemplate; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "模板保存失败");
      setTemplates((current) => [payload.data!, ...current]);
      onNotice("success", "模板已保存到 Supabase", "同一组织成员可在后续询价中复用该模板。 ");
    } catch (error) { onNotice("danger", "模板保存失败", error instanceof Error ? error.message : "请稍后重试"); }
    finally { setLoading(false); }
  };

  const archive = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inquiries/templates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "模板归档失败");
      setTemplates((current) => current.filter((item) => item.id !== id));
      onNotice("success", "模板已归档", "模板不会再出现在可用模板列表中。 ");
    } catch (error) { onNotice("danger", "模板归档失败", error instanceof Error ? error.message : "请稍后重试"); }
    finally { setLoading(false); }
  };

  return (
    <OverlayShell open={open} onClose={onClose} labelledBy={titleId} describedBy={descriptionId}>
      <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
        <div><h2 id={titleId} className="text-[16px] font-bold text-textMain">组织询价函模板库</h2><p id={descriptionId} className="mt-1 text-[12px] text-textMuted">模板配置与正文持久化到 Supabase，并保留审计记录。</p></div>
        <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]"><X className="size-4" /></button>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-card border border-borderSoft bg-[var(--color-muted-soft)] p-3">
          <label className="text-[12px] font-semibold text-textSecondary">模板名称<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px]" /></label>
          <button type="button" disabled={loading || !content.trim()} onClick={() => void save()} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-warning px-4 text-[12px] font-bold text-white disabled:opacity-45">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}保存当前版本为组织模板</button>
        </div>
        <div className="rounded-card border border-borderSoft">
          <div className="border-b border-borderSoft px-3 py-2 text-[12px] font-bold text-textMain">可用模板（{templates.length}）</div>
          <div className="max-h-72 overflow-y-auto p-2">
            {templates.length ? templates.map((template) => (
              <div key={template.id} className="flex items-center gap-2 rounded-md border-b border-borderSoft px-2 py-2 last:border-0">
                <FileText className="size-4 shrink-0 text-ai" />
                <button type="button" onClick={() => onApply(template)} className="min-w-0 flex-1 text-left"><span className="block truncate text-[12px] font-semibold text-textMain">{template.name}</span><span className="text-[10px] text-textMuted">{template.template_code} · {template.language}</span></button>
                <button type="button" onClick={() => void archive(template.id)} title="归档模板" className="flex size-7 items-center justify-center rounded-md text-danger hover:bg-danger-soft"><Trash2 className="size-3.5" /></button>
              </div>
            )) : <p className="px-2 py-6 text-center text-[12px] text-textMuted">暂无组织模板，可先保存当前版本</p>}
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}
