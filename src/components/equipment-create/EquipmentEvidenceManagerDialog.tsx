"use client";

import { useId, useState } from "react";
import {
  Archive,
  Download,
  ExternalLink,
  FileCheck2,
  Save,
  X,
} from "lucide-react";
import { LoadingButton } from "@/components/common/LoadingButton";
import { OverlayShell } from "@/components/common/OverlayShell";
import { useMockToast } from "@/hooks/useMockToast";
import type { EquipmentEvidenceInput } from "@/types/equipmentPriceCreate";

type Props = {
  open: boolean;
  equipmentPriceId: string;
  evidence: EquipmentEvidenceInput | null;
  onClose: () => void;
  onChanged: (evidence: EquipmentEvidenceInput) => void;
  onArchived: (id: string) => void;
};

type ActiveEvidence = EquipmentEvidenceInput & { id: string };
type ContentProps = Omit<Props, "evidence"> & { evidence: ActiveEvidence };

const evidenceTypeOptions = [
  ["quote_evidence", "供应商报价单"],
  ["technical_spec", "技术规格书"],
  ["supplier_qualification", "供应商资质"],
  ["delivery_terms", "交付条款"],
  ["payment_terms", "付款条款"],
  ["inspection_certificate", "检测/合格证"],
  ["contract", "合同或订单"],
  ["correspondence", "邮件与往来记录"],
  ["other", "其他证据"],
] as const;

export const evidenceTypeLabels = Object.fromEntries(evidenceTypeOptions) as Record<
  string,
  string
>;

export function EquipmentEvidenceManagerDialog(props: Props) {
  if (!props.open || !props.evidence?.id) return null;

  return (
    <EquipmentEvidenceManagerDialogContent
      key={props.evidence.id}
      {...props}
      evidence={props.evidence as ActiveEvidence}
    />
  );
}

function EquipmentEvidenceManagerDialogContent({
  open,
  equipmentPriceId,
  evidence,
  onClose,
  onChanged,
  onArchived,
}: ContentProps) {
  const titleId = useId();
  const descriptionId = useId();
  const toast = useMockToast();
  const [evidenceType, setEvidenceType] = useState(
    evidence.evidenceType || "quote_evidence"
  );
  const [description, setDescription] = useState(evidence.description || "");
  const [documentDate, setDocumentDate] = useState(
    evidence.documentDate || ""
  );
  const [validUntil, setValidUntil] = useState(evidence.validUntil || "");
  const [archiveReason, setArchiveReason] = useState("");
  const [busy, setBusy] = useState<"save" | "archive" | "">("");

  const evidenceId = evidence.id;
  const endpoint = `/api/equipment-prices/${encodeURIComponent(equipmentPriceId)}/evidence/${encodeURIComponent(evidenceId)}`;

  const save = async () => {
    if (busy) return;
    setBusy("save");
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceType,
          description,
          documentDate,
          validUntil,
        }),
      });
      const payload = (await response.json()) as {
        data?: Record<string, unknown>;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "证据信息保存失败");
      }
      onChanged({
        ...evidence,
        evidenceType,
        description,
        documentDate,
        validUntil,
      });
      toast.success("证据档案已更新", "分类、日期和说明已写入真实附件记录。");
      onClose();
    } catch (error) {
      toast.danger(
        "保存失败",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setBusy("");
    }
  };

  const archive = async () => {
    if (busy) return;
    if (archiveReason.trim().length < 4) {
      toast.warning("请填写作废原因", "作废原因至少需要 4 个字，并会保留在审计记录中。");
      return;
    }
    setBusy("archive");
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: archiveReason.trim() }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "证据作废失败");
      onArchived(evidenceId);
      toast.success("证据已作废", "文件仍保留在私有存储中供审计追溯，不再作为当前价格依据。");
      onClose();
    } catch (error) {
      toast.danger(
        "作废失败",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setBusy("");
    }
  };

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-card bg-primary-soft text-primary">
            <FileCheck2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-[16px] font-semibold text-textMain">
              证据文件管理
            </h2>
            <p id={descriptionId} className="mt-1 truncate text-[12px] text-textMuted">
              {evidence.name}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-slate-100" aria-label="关闭">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2">
          <a href={`${endpoint}?mode=preview`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary-soft text-[12px] font-semibold text-primary">
            <ExternalLink className="size-4" />
            安全预览
          </a>
          <a href={`${endpoint}?mode=download`} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-borderSoft bg-white text-[12px] font-semibold text-textSecondary">
            <Download className="size-4" />
            下载原文件
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">证据分类</span>
            <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className="h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary">
              {evidenceTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">单据日期</span>
            <input type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} className="h-9 w-full rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">有效期至</span>
            <input type="date" value={validUntil} min={documentDate || undefined} onChange={(event) => setValidUntil(event.target.value)} className="h-9 w-full rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">证据说明</span>
            <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value.slice(0, 500))} className="w-full resize-none rounded-md border border-borderSoft px-3 py-2 text-[12px] outline-none focus:border-primary" />
          </label>
        </div>

        <div className="rounded-card border border-danger/15 bg-danger-soft/45 p-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-danger">
            <Archive className="size-4" />
            作废并保留审计证据
          </div>
          <textarea rows={2} value={archiveReason} onChange={(event) => setArchiveReason(event.target.value.slice(0, 500))} placeholder="填写作废原因，例如：供应商已提供替代报价单" className="mt-2 w-full resize-none rounded-md border border-danger/15 bg-white px-3 py-2 text-[12px] outline-none" />
          <button type="button" disabled={Boolean(busy)} onClick={() => void archive()} className="mt-2 inline-flex h-8 items-center gap-1 rounded-md border border-danger/20 bg-white px-3 text-[12px] font-semibold text-danger disabled:opacity-60">
            <Archive className="size-3.5" />
            {busy === "archive" ? "正在作废..." : "作废此证据"}
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-borderSoft px-5 py-4">
        <button type="button" onClick={onClose} disabled={Boolean(busy)} className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary disabled:opacity-60">取消</button>
        <LoadingButton loading={busy === "save"} disabled={Boolean(busy)} icon={<Save className="size-4" />} onClick={() => void save()}>
          保存证据信息
        </LoadingButton>
      </div>
    </OverlayShell>
  );
}
