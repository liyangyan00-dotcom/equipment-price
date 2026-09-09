"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  FolderLock,
  History,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { AiBadge } from "@/components/badges/AiBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { RiskBadge } from "@/components/badges/RiskBadge";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { IconBox } from "@/components/common/IconBox";
import { LoadingButton } from "@/components/common/LoadingButton";
import { ModuleHeader } from "@/components/common/ModuleHeader";
import { AppLayout } from "@/components/layout/AppLayout";
import { useMockToast } from "@/hooks/useMockToast";
import { cn } from "@/lib/utils";
import type { AttachmentEvidenceDetail } from "@/types/attachmentEvidence";
import type { ReviewStatus } from "@/types/common";

type DetailTab = "preview" | "extraction" | "metadata";

const reviewLabels: Record<ReviewStatus, string> = {
  pending: "待人工审核",
  need_info: "待补充资料",
  confirmed: "已确认归档",
  rejected: "已驳回",
  voided: "已作废",
};

function DetailCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-borderSoft bg-white shadow-card",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  tone: "blue" | "cyan" | "green" | "purple";
}) {
  return (
    <div className="flex min-h-[82px] items-center gap-3 rounded-card border border-borderSoft bg-white px-4 py-3 shadow-card">
      <IconBox icon={icon} tone={tone} size="lg" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-textMuted">{label}</p>
        <p
          className="mt-1 truncate text-[14px] font-bold text-textMain"
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function FilePreview({
  detail,
  signedUrl,
  loading,
  onLoad,
}: {
  detail: AttachmentEvidenceDetail;
  signedUrl: string | null;
  loading: boolean;
  onLoad: () => void;
}) {
  if (signedUrl) {
    if (detail.fileKind === "image") {
      return (
        <div className="flex min-h-[430px] items-center justify-center rounded-card border border-borderSoft bg-white p-3">
          <object
            data={signedUrl}
            type={detail.mimeType}
            aria-label={detail.name}
            className="h-[560px] max-h-[620px] w-full object-contain"
          >
            <p className="text-[12px] text-textMuted">
              浏览器无法直接预览该图片，请使用“下载原件”。
            </p>
          </object>
        </div>
      );
    }
    return (
      <iframe
        src={signedUrl}
        title={detail.name}
        className="h-[560px] w-full rounded-card border border-borderSoft bg-white"
      />
    );
  }
  const PreviewIcon =
    detail.fileKind === "sheet"
      ? FileSpreadsheet
      : detail.fileKind === "image"
        ? FileImage
        : FileText;
  return (
    <div className="flex min-h-[430px] flex-col items-center justify-center rounded-card border border-dashed border-primary/25 bg-gradient-to-br from-primary-soft via-white to-cyan-50 p-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-[20px] bg-white text-primary shadow-panel">
        <PreviewIcon className="size-10" />
      </div>
      <p className="mt-5 text-[16px] font-bold text-textMain">
        私有 Storage 原件
      </p>
      <p className="mt-2 max-w-lg text-[12px] leading-6 text-textMuted">
        {detail.name}
        <br />
        点击后生成 5 分钟有效的签名地址，并把预览行为写入真实审计日志。
      </p>
      <LoadingButton
        loading={loading}
        onClick={onLoad}
        className="mt-5"
        icon={<FolderLock className="size-4" />}
      >
        {loading ? "生成签名地址" : "加载原件预览"}
      </LoadingButton>
    </div>
  );
}

type ExtractedField = AttachmentEvidenceDetail["extractedFields"][number];

function ExtractionPanel({
  fields,
  editing,
  onChange,
}: {
  fields: ExtractedField[];
  editing: boolean;
  onChange: (index: number, value: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field, index) => (
        <div
          key={field.label}
          className={cn(
            "rounded-card border bg-white p-3 transition",
            editing ? "border-primary/30 shadow-sm" : "border-borderSoft",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-textMuted">
              {field.label}
            </p>
            <span
              className={cn(
                "text-[11px] font-bold",
                field.confidence >= 90
                  ? "text-success"
                  : field.confidence >= 70
                    ? "text-warning"
                    : "text-danger",
              )}
            >
              {field.confidence}%
            </span>
          </div>
          {editing ? (
            <input
              value={field.value}
              onChange={(event) => onChange(index, event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textMain outline-none transition focus:border-primary"
              aria-label={`修正${field.label}`}
            />
          ) : (
            <p className="mt-2 break-words text-[13px] font-bold text-textMain">
              {field.value}
            </p>
          )}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-ai"
              style={{ width: `${field.confidence}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetadataPanel({ detail }: { detail: AttachmentEvidenceDetail }) {
  const items = [
    ["附件编号", detail.id],
    ["文件名称", detail.name],
    ["MIME 类型", detail.mimeType],
    ["文件大小", detail.size],
    ["Storage Bucket", detail.storageBucket],
    ["对象路径", detail.objectPath],
    ["SHA256", detail.checksum],
    ["上传人", detail.uploader],
    ["上传时间", detail.uploadedAt],
    ["文件日期", detail.documentDate],
    ["有效期", detail.validUntil],
    ["原始来源", detail.source],
  ];
  return (
    <div className="grid gap-x-6 gap-y-1 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-borderSoft py-2.5 text-[12px]"
        >
          <span className="text-textMuted">{label}</span>
          <span className="break-all font-semibold text-textMain">{value}</span>
        </div>
      ))}
    </div>
  );
}

function AttachmentDetailContent({
  initialDetail,
}: {
  initialDetail: AttachmentEvidenceDetail;
}) {
  const toast = useMockToast();
  const [detail, setDetail] = useState(initialDetail);
  const [tab, setTab] = useState<DetailTab>("preview");
  const [extractedFields, setExtractedFields] = useState(
    initialDetail.extractedFields,
  );
  const [editingExtraction, setEditingExtraction] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function applyDetail(next: AttachmentEvidenceDetail) {
    setDetail(next);
    setExtractedFields(next.extractedFields);
  }

  async function requestData(path: string, init?: RequestInit) {
    const response = await fetch(path, init);
    const payload = (await response.json().catch(() => ({}))) as {
      data?: AttachmentEvidenceDetail;
      error?: string;
    };
    if (!response.ok)
      throw new Error(payload.error || `请求失败（${response.status}）`);
    return payload;
  }

  async function loadPreview() {
    setPreviewBusy(true);
    try {
      const response = await fetch(
        `/api/attachments/${encodeURIComponent(detail.id)}/file?mode=preview`,
      );
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !payload.url)
        throw new Error(payload.error || "无法生成预览地址");
      setSignedUrl(payload.url);
      toast.success(
        "已加载私有原件",
        "签名地址 5 分钟内有效，预览行为已进入审计日志。 ",
      );
    } catch (error) {
      toast.danger(
        "原件预览失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setPreviewBusy(false);
    }
  }

  async function startDownload() {
    setDownloadBusy(true);
    try {
      const response = await fetch(
        `/api/attachments/${encodeURIComponent(detail.id)}/file?mode=download`,
      );
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !payload.url)
        throw new Error(payload.error || "无法生成下载地址");
      window.open(payload.url, "_blank", "noopener,noreferrer");
      toast.success("安全下载已启动", "下载地址 5 分钟内有效，操作已记录。 ");
    } catch (error) {
      toast.danger(
        "下载失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setDownloadBusy(false);
    }
  }

  async function exportManifest() {
    setExportBusy(true);
    try {
      const response = await fetch(
        `/api/attachments/${encodeURIComponent(detail.id)}/export`,
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "证据清单导出失败");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${detail.id}-evidence-manifest.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(
        "证据清单已导出",
        "真实 Supabase 数据已生成 JSON 清单，导出动作已审计。 ",
      );
    } catch (error) {
      toast.danger(
        "导出失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setExportBusy(false);
    }
  }

  async function rerunAi() {
    setAiBusy(true);
    toast.ai(
      "证据预审已启动",
      "规则引擎正在核验哈希、关联对象与有效期，结果仍需人工确认。 ",
    );
    try {
      const payload = await requestData(
        `/api/attachments/${encodeURIComponent(detail.id)}/ai-analysis`,
        { method: "POST" },
      );
      if (payload.data) applyDetail(payload.data);
      toast.success("证据预审完成", "结果已持久化并进入人工复核。 ");
    } catch (error) {
      toast.danger(
        "证据预审失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function toggleExtractionEdit() {
    if (!editingExtraction) {
      setTab("extraction");
      setEditingExtraction(true);
      return;
    }
    setSaveBusy(true);
    try {
      const payload = await requestData(
        `/api/attachments/${encodeURIComponent(detail.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extractedFields }),
        },
      );
      if (payload.data) applyDetail(payload.data);
      setEditingExtraction(false);
      toast.success(
        "字段修正已保存",
        "修正值已写入 Supabase，审核状态已回到待确认。 ",
      );
    } catch (error) {
      toast.danger(
        "字段保存失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setSaveBusy(false);
    }
  }

  async function resolveIssue(issueId: string, label: string) {
    try {
      const payload = await requestData(
        `/api/attachments/${encodeURIComponent(detail.id)}/issues/${issueId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolutionNotes: `已在附件详情页核验：${label}`,
          }),
        },
      );
      if (payload.data) applyDetail(payload.data);
      toast.success("问题已处理", label);
    } catch (error) {
      toast.danger(
        "问题处理失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    }
  }

  async function addTag() {
    const name = newTag.trim();
    if (!name) return toast.warning("请输入标签名称", "标签不能为空。 ");
    try {
      const payload = await requestData(
        `/api/attachments/${encodeURIComponent(detail.id)}/tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      if (payload.data) applyDetail(payload.data);
      setNewTag("");
      setTagEditorOpen(false);
      toast.success("标签已添加", name);
    } catch (error) {
      toast.danger(
        "标签添加失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    }
  }

  async function removeTag(tagId: string, name: string) {
    try {
      const payload = await requestData(
        `/api/attachments/${encodeURIComponent(detail.id)}/tags/${tagId}`,
        { method: "DELETE" },
      );
      if (payload.data) applyDetail(payload.data);
      toast.info("标签已移除", name);
    } catch (error) {
      toast.danger(
        "标签移除失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    }
  }

  async function confirmReview() {
    setConfirmBusy(true);
    try {
      const payload = await requestData(
        `/api/attachments/${encodeURIComponent(detail.id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: "confirmed",
            notes: "附件详情页人工核验通过",
          }),
        },
      );
      if (payload.data) applyDetail(payload.data);
      setConfirmOpen(false);
      toast.success(
        "附件证据已确认",
        "人工审核结论已写入不可覆盖的审核记录。 ",
      );
    } catch (error) {
      toast.danger(
        "审核提交失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setConfirmBusy(false);
    }
  }

  const openIssueCount = detail.issues.filter(
    (issue) => issue.status === "open",
  ).length;

  return (
    <AppLayout>
      <div className="space-y-3" data-no-global-interaction>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-borderSoft bg-white px-5 py-4 shadow-card">
          <div className="min-w-0">
            <Link
              href={`/attachments?attachmentId=${encodeURIComponent(detail.id)}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary"
            >
              <ArrowLeft className="size-4" /> 返回附件证据库
            </Link>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <h1
                className="max-w-4xl truncate text-[21px] font-bold text-textMain"
                title={detail.name}
              >
                {detail.name}
              </h1>
              <StatusBadge
                status={detail.reviewStatus}
                label={reviewLabels[detail.reviewStatus]}
              />
            </div>
            <p className="mt-1 text-[12px] text-textMuted">
              {detail.id} · {detail.type} · 只读证据档案
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LoadingButton
              loading={downloadBusy}
              onClick={startDownload}
              tone="ghost"
              icon={<Download className="size-4" />}
            >
              {downloadBusy ? "准备中" : "下载原件"}
            </LoadingButton>
            <LoadingButton
              loading={exportBusy}
              onClick={exportManifest}
              tone="ghost"
              icon={<Archive className="size-4" />}
            >
              {exportBusy ? "导出中" : "导出证据清单"}
            </LoadingButton>
            <button
              type="button"
              disabled={detail.reviewStatus === "confirmed" || confirmBusy}
              onClick={() => {
                if (openIssueCount > 0) {
                  toast.warning(
                    "仍有未处理问题",
                    `请先处理 ${openIssueCount} 项证据问题，再提交人工确认。`,
                  );
                  return;
                }
                setConfirmOpen(true);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-success"
            >
              <ClipboardCheck className="size-4" />{" "}
              {detail.reviewStatus === "confirmed"
                ? "已确认归档"
                : "提交人工确认"}
            </button>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem
            icon={FileText}
            label="文件类型 / 大小"
            value={`${detail.type} · ${detail.size}`}
            tone="blue"
          />
          <SummaryItem
            icon={Database}
            label="归档状态"
            value={reviewLabels[detail.reviewStatus]}
            tone="green"
          />
          <SummaryItem
            icon={Fingerprint}
            label="完整性校验"
            value={
              detail.checksum === "等待校验" ? "等待哈希校验" : "SHA256 已校验"
            }
            tone="cyan"
          />
          <SummaryItem
            icon={FolderLock}
            label="存储权限"
            value="私有 Bucket · RLS"
            tone="purple"
          />
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-3">
            <DetailCard>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSoft px-4 py-3">
                <ModuleHeader
                  icon={FileText}
                  title="证据文件与识别结果"
                  subtitle="预览、字段抽取和元数据分区展示"
                  tone="blue"
                  density="compact"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {tab === "extraction" ? (
                    <button
                      type="button"
                      disabled={saveBusy}
                      onClick={() => void toggleExtractionEdit()}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-semibold disabled:opacity-60",
                        editingExtraction
                          ? "bg-success text-white"
                          : "border border-primary/20 bg-primary-soft text-primary",
                      )}
                    >
                      {saveBusy ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : editingExtraction ? (
                        <Save className="size-3.5" />
                      ) : (
                        <Pencil className="size-3.5" />
                      )}
                      {saveBusy
                        ? "保存中"
                        : editingExtraction
                          ? "保存修正"
                          : "人工修正"}
                    </button>
                  ) : null}
                  <div className="flex rounded-lg bg-[var(--color-muted-soft)] p-1">
                    {(
                      [
                        ["preview", "文件预览"],
                        ["extraction", "AI抽取"],
                        ["metadata", "元数据"],
                      ] as Array<[DetailTab, string]>
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTab(value)}
                        className={cn(
                          "h-7 rounded-md px-3 text-[11px] font-semibold",
                          tab === value
                            ? "bg-white text-primary shadow-sm"
                            : "text-textMuted",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="min-h-[470px] bg-[var(--color-muted-soft)] p-4">
                {tab === "preview" ? (
                  <FilePreview
                    detail={detail}
                    signedUrl={signedUrl}
                    loading={previewBusy}
                    onLoad={() => void loadPreview()}
                  />
                ) : tab === "extraction" ? (
                  <ExtractionPanel
                    fields={extractedFields}
                    editing={editingExtraction}
                    onChange={(index, value) =>
                      setExtractedFields((current) =>
                        current.map((field, fieldIndex) =>
                          fieldIndex === index ? { ...field, value } : field,
                        ),
                      )
                    }
                  />
                ) : (
                  <MetadataPanel detail={detail} />
                )}
              </div>
            </DetailCard>

            <DetailCard>
              <div className="border-b border-borderSoft px-4 py-3">
                <ModuleHeader
                  icon={Link2}
                  title="业务关联链"
                  subtitle="从原始文件追溯至价格、供应商和报告"
                  tone="cyan"
                  density="compact"
                />
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                {detail.relations.map((relation, index) => (
                  <div
                    key={relation.label}
                    className="relative rounded-card border border-borderSoft bg-white p-3"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-[11px] text-textMuted">
                      {relation.label}
                    </p>
                    <p className="mt-1 min-h-10 text-[12px] font-bold leading-5 text-textMain">
                      {relation.value}
                    </p>
                    {relation.href ? (
                      <Link
                        href={relation.href}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary"
                      >
                        打开关联对象 <ExternalLink className="size-3" />
                      </Link>
                    ) : (
                      <span className="mt-2 block text-[11px] text-textMuted">
                        暂无可跳转对象
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </DetailCard>
          </div>

          <aside className="space-y-3">
            <DetailCard className="overflow-hidden border-ai/15">
              <div className="border-b border-ai/10 bg-gradient-to-r from-ai-soft via-white to-primary-soft px-4 py-3">
                <ModuleHeader
                  icon={Bot}
                  title="AI 证据判断"
                  subtitle="AI 仅提供建议，需人工确认"
                  tone="purple"
                  density="compact"
                  action={<AiBadge label="AI已分析" />}
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  <ConfidenceBadge level={detail.confidence} />
                  <RiskBadge level={detail.risk} />
                </div>
                <p className="text-[10px] font-semibold text-ai">
                  已持久化 {detail.aiRuns.length} 次预审记录 · 结果必须人工确认
                </p>
                <p className="rounded-lg border border-ai/15 bg-ai-soft p-3 text-[12px] leading-6 text-textSecondary">
                  {detail.aiSummary}
                </p>
                <div className="rounded-lg border border-primary/15 bg-primary-soft p-3">
                  <p className="text-[11px] font-bold text-primary">推荐动作</p>
                  <p className="mt-1 text-[12px] leading-5 text-textSecondary">
                    {detail.recommendedAction}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={() => void rerunAi()}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-ai text-[12px] font-semibold text-white disabled:opacity-70"
                >
                  <RefreshCw
                    className={cn("size-4", aiBusy && "animate-spin")}
                  />
                  {aiBusy ? "预审中…" : "运行证据预审"}
                </button>
              </div>
            </DetailCard>

            <DetailCard>
              <div className="border-b border-borderSoft px-4 py-3">
                <ModuleHeader
                  icon={ShieldAlert}
                  title="风险与缺失项"
                  tone="orange"
                  density="compact"
                />
              </div>
              <div className="space-y-2 p-4">
                {detail.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={cn(
                      "rounded-lg border px-3 py-2.5",
                      issue.status === "resolved"
                        ? "border-success/15 bg-success-soft"
                        : issue.severity === "high"
                          ? "border-danger/15 bg-danger-soft"
                          : "border-warning/20 bg-warning-soft",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5">
                          {issue.status === "resolved" ? (
                            <CheckCircle2 className="size-4 text-success" />
                          ) : (
                            <ShieldAlert
                              className={cn(
                                "size-4",
                                issue.severity === "high"
                                  ? "text-danger"
                                  : "text-warning",
                              )}
                            />
                          )}
                        </span>
                        <div>
                          <p className="text-[12px] font-bold text-textMain">
                            {issue.label}
                          </p>
                          <p className="mt-1 text-[10px] text-textMuted">
                            {issue.status === "resolved"
                              ? "已完成核验"
                              : "等待人工处理"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={issue.status === "resolved"}
                        onClick={() => void resolveIssue(issue.id, issue.label)}
                        className="shrink-0 rounded-md border border-success/20 bg-white px-2 py-1 text-[10px] font-bold text-success disabled:opacity-50"
                      >
                        {issue.status === "resolved" ? "已处理" : "标记处理"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </DetailCard>

            <DetailCard>
              <div className="border-b border-borderSoft px-4 py-3">
                <ModuleHeader
                  icon={Tag}
                  title="归档标签"
                  tone="green"
                  density="compact"
                />
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {detail.archiveTags.map((tag) => (
                    <button
                      type="button"
                      onClick={() => void removeTag(tag.id, tag.name)}
                      title="点击移除标签"
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-md border border-primary/15 bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary"
                    >
                      {tag.name}
                      <X className="size-3" />
                    </button>
                  ))}
                </div>
                {tagEditorOpen ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      autoFocus
                      value={newTag}
                      onChange={(event) => setNewTag(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void addTag();
                        if (event.key === "Escape") setTagEditorOpen(false);
                      }}
                      placeholder="输入归档标签"
                      className="h-8 min-w-0 flex-1 rounded-md border border-borderSoft px-2.5 text-[11px] outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => void addTag()}
                      className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-white"
                      aria-label="保存标签"
                    >
                      <Save className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTagEditorOpen(false);
                        setNewTag("");
                      }}
                      className="inline-flex size-8 items-center justify-center rounded-md border border-borderSoft text-textMuted"
                      aria-label="取消添加标签"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTagEditorOpen(true)}
                    className="mt-3 inline-flex h-8 items-center gap-1 rounded-md border border-borderSoft px-3 text-[11px] font-semibold text-primary"
                  >
                    <Plus className="size-3.5" /> 添加标签
                  </button>
                )}
              </div>
            </DetailCard>
          </aside>
        </section>

        <DetailCard>
          <div className="border-b border-borderSoft px-4 py-3">
            <ModuleHeader
              icon={History}
              title="证据审计时间线"
              subtitle="记录上传、AI识别、人工确认和业务引用"
              tone="green"
              density="compact"
            />
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-3">
            {detail.auditTrail.map((event, index) => (
              <div
                key={`${event.time}-${event.action}-${index}`}
                className="relative rounded-card border border-borderSoft bg-white p-3 pl-11"
              >
                <span className="absolute left-3 top-3 flex size-7 items-center justify-center rounded-full bg-success-soft text-success">
                  <Clock3 className="size-3.5" />
                </span>
                <p className="text-[12px] font-bold text-textMain">
                  {event.action}
                </p>
                <p className="mt-1 text-[11px] text-textMuted">
                  {event.time} · {event.actor}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-textSecondary">
                  {event.detail}
                </p>
                {index === 0 ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <UserRound className="size-3" /> 最新操作
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </DetailCard>

        <ConfirmDialog
          open={confirmOpen}
          title="确认提交附件证据？"
          description="提交后将通过受权限控制的审核 RPC 写入人工审核记录，并更新附件核验状态。该结论会进入真实审计链。"
          confirmLabel="确认归档"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void confirmReview()}
        />
      </div>
    </AppLayout>
  );
}

export default function AttachmentEvidenceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params?.id ?? "");
  const [detail, setDetail] = useState<AttachmentEvidenceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const migrationStarted = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        let response = await fetch(
          `/api/attachments/${encodeURIComponent(id)}`,
          { cache: "no-store" },
        );
        let payload = (await response.json().catch(() => ({}))) as {
          data?: AttachmentEvidenceDetail;
          error?: string;
          canMigrate?: boolean;
        };
        if (
          response.status === 404 &&
          payload.canMigrate &&
          !migrationStarted.current
        ) {
          migrationStarted.current = true;
          response = await fetch(
            `/api/attachments/${encodeURIComponent(id)}/migrate`,
            { method: "POST" },
          );
          payload = (await response.json().catch(() => ({}))) as typeof payload;
        }
        if (!response.ok || !payload.data)
          throw new Error(payload.error || "附件详情读取失败");
        if (!cancelled) setDetail(payload.data);
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error ? reason.message : "附件详情读取失败",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[560px] flex-col items-center justify-center rounded-card border border-borderSoft bg-white shadow-card">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="mt-4 text-[13px] font-semibold text-textSecondary">
            正在读取 Supabase 附件、Storage 元数据与审计链…
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!detail || error) {
    return (
      <AppLayout>
        <EmptyState
          title="附件证据读取失败"
          description={
            error ||
            `未找到编号为 ${id || "未知"} 的附件，请返回证据库重新选择。`
          }
          primaryAction={
            <Link
              href="/attachments"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-[12px] font-semibold text-white"
            >
              返回附件证据库
            </Link>
          }
          secondaryAction={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center rounded-md border border-borderSoft bg-white px-4 text-[12px] font-semibold text-primary"
            >
              重新加载
            </button>
          }
        />
      </AppLayout>
    );
  }

  return (
    <AttachmentDetailContent key={detail.databaseId} initialDetail={detail} />
  );
}
