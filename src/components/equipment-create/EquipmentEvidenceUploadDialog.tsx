"use client";

import { useId, useState } from "react";
import { FileCheck2, FileUp, UploadCloud, X } from "lucide-react";
import { LoadingButton } from "@/components/common/LoadingButton";
import { OverlayShell } from "@/components/common/OverlayShell";
import { useMockToast } from "@/hooks/useMockToast";
import { createClient } from "@/lib/supabase/client";
import type { EquipmentEvidenceInput } from "@/types/equipmentPriceCreate";

type EquipmentEvidenceUploadDialogProps = {
  open: boolean;
  equipmentPriceId: string;
  onClose: () => void;
  onUploaded: (evidence: EquipmentEvidenceInput) => void;
};

const allowedPattern = /\.(pdf|xlsx|docx|jpe?g|png)$/i;
const maxFileSize = 20 * 1024 * 1024;
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

export function EquipmentEvidenceUploadDialog({
  open,
  equipmentPriceId,
  onClose,
  onUploaded,
}: EquipmentEvidenceUploadDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const toast = useMockToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [evidenceType, setEvidenceType] = useState("quote_evidence");
  const [description, setDescription] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const closeDialog = () => {
    setFile(null);
    setEvidenceType("quote_evidence");
    setDescription("");
    setDocumentDate("");
    setValidUntil("");
    onClose();
  };

  const selectFile = (nextFile?: File) => {
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!allowedPattern.test(nextFile.name)) {
      toast.warning("文件格式不支持", "仅支持 PDF、XLSX、DOCX、JPG、JPEG 和 PNG。");
      return;
    }
    if (nextFile.size <= 0 || nextFile.size > maxFileSize) {
      toast.warning("文件大小不符合要求", "单个证据文件必须小于 20 MB。");
      return;
    }
    setFile(nextFile);
  };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const sessionResponse = await fetch(
        "/api/equipment-prices/evidence/upload-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            equipmentPriceId,
          }),
        }
      );
      const session = (await sessionResponse.json()) as {
        upload?: { bucket: string; path: string; contentType: string };
        error?: string;
      };
      if (!sessionResponse.ok || !session.upload) {
        throw new Error(session.error || "创建附件上传会话失败");
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(session.upload.bucket)
        .upload(session.upload.path, file, {
          contentType: session.upload.contentType,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const registerResponse = await fetch(
        `/api/equipment-prices/${encodeURIComponent(equipmentPriceId)}/evidence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: session.upload.bucket,
            path: session.upload.path,
            name: file.name,
            contentType: file.type || session.upload.contentType,
            size: file.size,
            evidenceType,
            description,
            documentDate,
            validUntil,
          }),
        }
      );
      const registration = (await registerResponse.json()) as {
        data?: EquipmentEvidenceInput;
        error?: string;
      };
      if (!registerResponse.ok || !registration.data) {
        await supabase.storage
          .from(session.upload.bucket)
          .remove([session.upload.path]);
        throw new Error(registration.error || "附件登记失败");
      }

      onUploaded(registration.data);
      toast.success(
        "证据已上传",
        `${file.name} 已写入 Supabase Storage 并关联当前设备价格。`
      );
      closeDialog();
    } catch (error) {
      toast.danger(
        "证据上传失败",
        error instanceof Error ? error.message : "请稍后重试"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <OverlayShell
      open={open}
      onClose={closeDialog}
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-card bg-primary-soft text-primary">
            <UploadCloud className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id={titleId} className="text-[16px] font-semibold text-textMain">
              上传设备价格证据
            </h2>
            <p id={descriptionId} className="mt-1 text-[12px] text-textMuted">
              文件将存入当前价格库项目的私有 Supabase Storage。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeDialog}
          className="flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-[var(--color-muted-soft)]"
          aria-label="关闭"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-primary/35 bg-primary-soft/70 p-5 text-center">
          {file ? (
            <FileCheck2 className="size-10 text-success" aria-hidden="true" />
          ) : (
            <FileUp className="size-10 text-primary" aria-hidden="true" />
          )}
          <span className="mt-3 max-w-full truncate text-[14px] font-semibold text-primary">
            {file?.name || "选择证据文件"}
          </span>
          <span className="mt-1 text-[12px] text-textMuted">
            PDF / Excel / Word / JPG / PNG，单文件不超过 20 MB
          </span>
          <input
            type="file"
            className="sr-only"
            data-overlay-autofocus
            accept=".pdf,.xlsx,.docx,.jpg,.jpeg,.png"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">证据分类</span>
            <select
              value={evidenceType}
              onChange={(event) => setEvidenceType(event.target.value)}
              className="h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] text-textMain outline-none focus:border-primary"
            >
              {evidenceTypeOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">单据日期</span>
            <input
              type="date"
              value={documentDate}
              onChange={(event) => setDocumentDate(event.target.value)}
              className="h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] text-textMain outline-none focus:border-primary"
            />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">有效期至</span>
            <input
              type="date"
              value={validUntil}
              min={documentDate || undefined}
              onChange={(event) => setValidUntil(event.target.value)}
              className="h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] text-textMain outline-none focus:border-primary"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-[12px] font-semibold text-textSecondary">证据说明</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 500))}
              rows={2}
              placeholder="说明文件来源、报价边界或需要审核人关注的内容"
              className="w-full resize-none rounded-md border border-borderSoft bg-white px-3 py-2 text-[12px] text-textMain outline-none focus:border-primary"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-borderSoft px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          className="h-9 rounded-md border border-borderSoft bg-white px-4 text-[13px] font-semibold text-textSecondary disabled:opacity-60"
        >
          取消
        </button>
        <LoadingButton
          loading={uploading}
          disabled={!file}
          icon={<UploadCloud className="size-4" aria-hidden="true" />}
          onClick={() => void upload()}
        >
          上传并关联
        </LoadingButton>
      </div>
    </OverlayShell>
  );
}
