"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- API links return downloadable files. */

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  UserRoundCheck,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuleHeader } from "@/components/common";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type FileKind = "pdf" | "mail" | "sheet" | "image";
type ReviewState =
  | "pending_ai"
  | "pending_review"
  | "need_info"
  | "confirmed"
  | "rejected"
  | "voided";
type EvidenceRow = {
  id: string;
  databaseId: string;
  name: string;
  size: string;
  type: string;
  object: string;
  priceId: string;
  supplier: string;
  source: string;
  uploader: string;
  uploadedAt: string;
  documentDate: string | null;
  reviewState: ReviewState;
  relationStatus: "linked" | "unlinked";
  relatedType: string | null;
  relatedId: string | null;
  aiStatus: string;
  confidenceScore: number | null;
  risk: string | null;
  aiAnalyzedAt: string | null;
  assignedReviewerId: string | null;
  assignedReviewer: string | null;
  reviewDueAt: string | null;
  overdue: boolean;
  duplicateOfAttachmentId: string | null;
  governanceFlags: string[];
  openIssueCount: number;
  fileKind: FileKind;
};
type Summary = {
  total: number;
  pendingAi: number;
  pendingReview: number;
  needInfo: number;
  confirmed: number;
  overdue: number;
  highRisk: number;
  unlinked: number;
};
type Reviewer = { id: string; name: string; role: string };
type Permissions = {
  canWrite: boolean;
  canReview: boolean;
  canAssign: boolean;
};
type RelationOption = {
  id: string;
  type: string;
  label: string;
  code: string;
  detail: string;
};

const emptySummary: Summary = {
  total: 0,
  pendingAi: 0,
  pendingReview: 0,
  needInfo: 0,
  confirmed: 0,
  overdue: 0,
  highRisk: 0,
  unlinked: 0,
};
const reviewMeta: Record<ReviewState, { label: string; className: string }> = {
  pending_ai: { label: "待 AI 预审", className: "bg-ai-soft text-ai" },
  pending_review: {
    label: "待人工审核",
    className: "bg-warning-soft text-warning",
  },
  need_info: { label: "待补资料", className: "bg-danger-soft text-danger" },
  confirmed: { label: "已人工确认", className: "bg-success-soft text-success" },
  rejected: { label: "已驳回", className: "bg-danger-soft text-danger" },
  voided: { label: "已作废", className: "bg-slate-100 text-textMuted" },
};
const kindIcon = {
  pdf: FileText,
  mail: Mail,
  sheet: FileSpreadsheet,
  image: ImageIcon,
};
const riskLabel: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};
const relationTypeLabel: Record<string, string> = {
  equipment_price: "设备价格",
  material_price: "地材价格",
  inquiry: "询价",
  project: "项目",
  report: "报告",
};

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function UploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const params = useSearchParams();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [objectLabel, setObjectLabel] = useState(
    params.get("objectLabel") || params.get("relatedObject") || "",
  );
  const [supplierName, setSupplierName] = useState("");
  if (!open) return null;
  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    let uploadedObject: { bucket: string; path: string } | null = null;
    try {
      const checksum = await sha256(file);
      const sessionResponse = await fetch("/api/attachments/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }),
      });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok)
        throw new Error(session.error || "无法创建上传会话");
      const storage = await createClient()
        .storage.from(session.upload.bucket)
        .upload(session.upload.path, file, {
          contentType: session.upload.contentType,
          upsert: false,
        });
      if (storage.error) throw storage.error;
      uploadedObject = {
        bucket: session.upload.bucket,
        path: session.upload.path,
      };
      const response = await fetch("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalName: file.name,
          bucketId: session.upload.bucket,
          objectPath: session.upload.path,
          contentType: file.type,
          sizeBytes: file.size,
          checksum,
          relatedType: params.get("relatedType") || null,
          relatedId: params.get("relatedId") || null,
          objectLabel: objectLabel || "待确认业务对象",
          supplierName: supplierName || "待核验供应商",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "附件登记失败");
      setFile(null);
      onClose();
      onUploaded();
      toast.success(
        "附件已进入审核队列",
        "系统已校验重复文件，下一步请执行 AI 预审。 ",
      );
    } catch (reason) {
      if (uploadedObject)
        await createClient()
          .storage.from(uploadedObject.bucket)
          .remove([uploadedObject.path])
          .catch(() => undefined);
      toast.warning(
        "附件上传失败",
        reason instanceof Error ? reason.message : "请稍后重试",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="上传价格证据"
    >
      <section className="w-full max-w-xl overflow-hidden rounded-card border border-borderSoft bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-borderSoft p-4">
          <div>
            <h2 className="text-[16px] font-bold">上传价格证据</h2>
            <p className="mt-1 text-[12px] text-textMuted">
              上传时自动计算文件指纹，重复文件不会进入审核队列。
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="space-y-3 p-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex min-h-32 w-full flex-col items-center justify-center rounded-card border border-dashed border-primary/40 bg-primary-soft/45"
          >
            <UploadCloud className="size-8 text-primary" />
            <span className="mt-2 max-w-full truncate px-4 text-[13px] font-bold text-primary">
              {file?.name || "选择 PDF、表格、邮件或图片"}
            </span>
            <span className="mt-1 text-[11px] text-textMuted">最大 50 MB</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.eml,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-semibold">
              对象描述
              <input
                value={objectLabel}
                onChange={(event) => setObjectLabel(event.target.value)}
                placeholder="后续仍需关联真实对象"
                className="mt-1 h-9 w-full rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary"
              />
            </label>
            <label className="text-[12px] font-semibold">
              供应商
              <input
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                placeholder="可留空，后续识别"
                className="mt-1 h-9 w-full rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary"
              />
            </label>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-borderSoft p-4">
          <button
            onClick={onClose}
            className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold"
          >
            取消
          </button>
          <button
            onClick={() => void upload()}
            disabled={!file || busy}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            上传并登记
          </button>
        </footer>
      </section>
    </div>
  );
}

function RelationDialog({
  row,
  onClose,
  onSaved,
}: {
  row: EvidenceRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("all");
  const [options, setOptions] = useState<RelationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const search = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ q: keyword, type });
      const response = await fetch(
        `/api/attachments/relation-options?${query}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "业务对象加载失败");
      setOptions(payload.data ?? []);
    } catch (error) {
      toast.warning(
        "业务对象加载失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, toast, type]);
  useEffect(() => {
    const timer = window.setTimeout(() => void search(), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  async function save(option: RelationOption) {
    setSavingId(option.id);
    try {
      const response = await fetch(
        `/api/attachments/${row.databaseId}/relation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            relatedType: option.type,
            relatedId: option.id,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "关联失败");
      toast.success("业务对象已关联", `${option.code} · ${option.label}`);
      onSaved();
      onClose();
    } catch (error) {
      toast.warning(
        "关联失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setSavingId("");
    }
  }
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="关联业务对象"
    >
      <section className="w-full max-w-2xl overflow-hidden rounded-card border border-borderSoft bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-borderSoft p-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold">关联真实业务对象</h2>
            <p className="mt-1 truncate text-[12px] text-textMuted">
              {row.id} · {row.name}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="grid grid-cols-[150px_1fr] gap-2 border-b border-borderSoft p-4">
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
          >
            <option value="all">全部对象</option>
            <option value="equipment_price">设备价格</option>
            <option value="material_price">地材价格</option>
            <option value="inquiry">询价</option>
            <option value="project">项目</option>
            <option value="report">报告</option>
          </select>
          <label className="flex h-9 items-center gap-2 rounded-md border border-borderSoft px-3">
            <Search className="size-4 text-textMuted" />
            <input
              autoFocus
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索名称、编号或规格"
              className="min-w-0 flex-1 text-[12px] outline-none"
            />
          </label>
        </div>
        <div className="max-h-[430px] overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <LoaderCircle className="size-5 animate-spin text-primary" />
            </div>
          ) : options.length ? (
            <div className="divide-y divide-borderSoft rounded-md border border-borderSoft">
              {options.map((option) => (
                <button
                  key={`${option.type}-${option.id}`}
                  onClick={() => void save(option)}
                  disabled={Boolean(savingId)}
                  className="grid w-full grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left hover:bg-primary-soft/40 disabled:opacity-50"
                >
                  <span className="truncate text-[11px] font-semibold text-textMuted">
                    {relationTypeLabel[option.type]}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-[12px]">
                      {option.label}
                    </strong>
                    <span className="mt-0.5 block truncate text-[11px] text-textMuted">
                      {option.code} · {option.detail || "无补充信息"}
                    </span>
                  </span>
                  {savingId === option.id ? (
                    <LoaderCircle className="size-4 animate-spin text-primary" />
                  ) : (
                    <ChevronRight className="size-4 text-textMuted" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-[12px] text-textMuted">
              没有匹配的业务对象
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReviewDialog({
  row,
  onClose,
  onSaved,
}: {
  row: EvidenceRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [decision, setDecision] = useState<
    "confirmed" | "need_info" | "rejected"
  >("confirmed");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const blockers = [
    !row.relatedId ? "尚未关联真实业务对象" : null,
    !["needs_review", "completed"].includes(row.aiStatus)
      ? "尚未完成 AI 预审"
      : null,
    row.openIssueCount > 0 ? `仍有 ${row.openIssueCount} 个准入问题` : null,
    row.duplicateOfAttachmentId ? "文件指纹与现有附件重复" : null,
  ].filter(Boolean) as string[];
  const highRisk = ["high", "critical"].includes(row.risk ?? "");
  const noteMinimum = decision === "confirmed" && highRisk ? 20 : 5;
  const canSubmit =
    notes.trim().length >= noteMinimum &&
    (decision !== "confirmed" || blockers.length === 0);
  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/attachments/${row.databaseId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, notes }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "审核提交失败");
      toast.success("审核结论已保存", "结论、说明与操作人已写入证据链。 ");
      onSaved();
      onClose();
    } catch (error) {
      toast.warning(
        "审核提交失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="提交人工审核"
    >
      <section className="w-full max-w-lg overflow-hidden rounded-card border border-borderSoft bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-borderSoft p-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold">提交人工审核</h2>
            <p className="mt-1 truncate text-[12px] text-textMuted">
              {row.id} · {row.name}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["confirmed", "确认有效"],
              ["need_info", "补充资料"],
              ["rejected", "驳回"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setDecision(value as typeof decision)}
                className={cn(
                  "h-9 rounded-md border text-[12px] font-semibold",
                  decision === value
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-borderSoft",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {decision === "confirmed" && blockers.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning-soft p-3">
              <p className="flex items-center gap-2 text-[12px] font-bold text-warning">
                <ShieldAlert className="size-4" />
                确认门禁尚未通过
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-textSecondary">
                {blockers.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          )}
          <label className="block text-[12px] font-semibold">
            审核说明
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder={
                decision === "confirmed"
                  ? "说明来源、关联对象与价格依据的核验结论"
                  : "说明需要补充或驳回的原因"
              }
              className="mt-1 w-full resize-none rounded-md border border-borderSoft p-3 text-[12px] font-normal outline-none focus:border-primary"
            />
          </label>
          <p
            className={cn(
              "text-right text-[11px]",
              notes.trim().length < noteMinimum
                ? "text-warning"
                : "text-success",
            )}
          >
            至少 {noteMinimum} 个字 · 当前 {notes.trim().length}
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-borderSoft p-4">
          <button
            onClick={onClose}
            className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold"
          >
            取消
          </button>
          <button
            onClick={() => void submit()}
            disabled={!canSubmit || busy}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-bold text-white disabled:opacity-45"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            提交结论
          </button>
        </footer>
      </section>
    </div>
  );
}

function AttachmentsContent() {
  const toast = useToast();
  const params = useSearchParams();
  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [permissions, setPermissions] = useState<Permissions>({
    canWrite: false,
    canReview: false,
    canAssign: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [risk, setRisk] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [issue, setIssue] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeId, setActiveId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [relationRow, setRelationRow] = useState<EvidenceRow | null>(null);
  const [reviewRow, setReviewRow] = useState<EvidenceRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: keyword,
        status,
        kind,
        risk,
        assignee,
        issue,
      });
      const relatedType = params.get("relatedType");
      const relatedId = params.get("relatedId");
      if (relatedType) query.set("relatedType", relatedType);
      if (relatedId) query.set("relatedId", relatedId);
      const response = await fetch(`/api/attachments?${query}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "附件队列加载失败");
      const nextRows = payload.data ?? [];
      setRows(nextRows);
      setSummary(payload.summary ?? emptySummary);
      setReviewers(payload.reviewers ?? []);
      setPermissions(
        payload.permissions ?? {
          canWrite: false,
          canReview: false,
          canAssign: false,
        },
      );
      setTotal(payload.pagination?.total ?? 0);
      setTotalPages(payload.pagination?.totalPages ?? 1);
      const requestedAttachment = params.get("attachmentId");
      setActiveId((current) => {
        const requestedRow = nextRows.find(
          (row: EvidenceRow) =>
            row.id === requestedAttachment ||
            row.databaseId === requestedAttachment,
        );
        if (requestedRow) return requestedRow.id;
        return nextRows.some((row: EvidenceRow) => row.id === current)
          ? current
          : nextRows[0]?.id || "";
      });
      setSelected((current) =>
        current.filter((id) =>
          nextRows.some((row: EvidenceRow) => row.databaseId === id),
        ),
      );
    } catch (error) {
      toast.warning(
        "附件队列加载失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setLoading(false);
    }
  }, [
    assignee,
    issue,
    keyword,
    kind,
    page,
    pageSize,
    params,
    risk,
    status,
    toast,
  ]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), keyword ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, keyword]);
  const active = useMemo(
    () => rows.find((row) => row.id === activeId) ?? rows[0] ?? null,
    [activeId, rows],
  );
  const allSelected =
    rows.length > 0 && rows.every((row) => selected.includes(row.databaseId));

  async function runAi(ids: string[]) {
    if (!ids.length || busy) return;
    setBusy(true);
    try {
      const response =
        ids.length === 1
          ? await fetch(`/api/attachments/${ids[0]}/ai-analysis`, {
              method: "POST",
            })
          : await fetch("/api/attachments/actions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "ai_review", ids }),
            });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI 预审失败");
      toast.success(
        "AI 预审已完成",
        ids.length === 1
          ? "附件已进入人工审核阶段。"
          : `成功 ${payload.data.succeeded} 条，失败 ${payload.data.failed} 条。`,
      );
      setSelected([]);
      await load();
    } catch (error) {
      toast.warning(
        "AI 预审失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setBusy(false);
    }
  }
  async function assignSelected(reviewerId: string) {
    if (!selected.length || !reviewerId || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/attachments/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", ids: selected, reviewerId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "分派失败");
      toast.success(
        "审核任务已分派",
        `已更新 ${payload.data.affected} 条附件。`,
      );
      setSelected([]);
      await load();
    } catch (error) {
      toast.warning(
        "分派失败",
        error instanceof Error ? error.message : "请稍后重试",
      );
    } finally {
      setBusy(false);
    }
  }
  const statusViews = [
    ["all", "全部", summary.total],
    ["pending_ai", "待 AI 预审", summary.pendingAi],
    ["pending_review", "待人工审核", summary.pendingReview],
    ["need_info", "待补资料", summary.needInfo],
    ["confirmed", "已确认", summary.confirmed],
  ];

  return (
    <AppLayout>
      <div className="space-y-3">
        <PageHeader
          title="价格依据与附件库"
          description="管理报价单、邮件、调研表和图片证据，形成可追溯的 AI 预审与人工确认链路。"
          actions={
            <>
              <a
                href="/api/attachments/export"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[13px] font-semibold"
              >
                <Download className="size-4" />
                导出清单
              </a>
              <button
                onClick={() => setUploadOpen(true)}
                disabled={!permissions.canWrite}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-bold text-white disabled:opacity-45"
              >
                <UploadCloud className="size-4" />
                上传附件
              </button>
            </>
          }
        />
        <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
          <div className="grid grid-cols-2 divide-x divide-borderSoft md:grid-cols-5">
            {statusViews.map(([value, label, count]) => (
              <button
                key={String(value)}
                onClick={() => {
                  setStatus(String(value));
                  setPage(1);
                }}
                className={cn(
                  "h-16 px-3 text-left hover:bg-slate-50",
                  status === value && "bg-primary-soft/60 text-primary",
                )}
              >
                <span className="block text-[11px] font-semibold">
                  {String(label)}
                </span>
                <strong className="mt-1 block text-[20px] tabular-nums">
                  {String(count)}
                </strong>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-borderSoft bg-slate-50 px-3 py-2 text-[11px]">
            <span
              className={
                summary.overdue ? "font-bold text-danger" : "text-textMuted"
              }
            >
              <CalendarClock className="mr-1 inline size-3.5" />
              超时 {summary.overdue}
            </span>
            <span
              className={
                summary.highRisk ? "font-bold text-danger" : "text-textMuted"
              }
            >
              <AlertTriangle className="mr-1 inline size-3.5" />
              高风险 {summary.highRisk}
            </span>
            <span
              className={
                summary.unlinked ? "font-bold text-warning" : "text-textMuted"
              }
            >
              <Link2 className="mr-1 inline size-3.5" />
              未关联 {summary.unlinked}
            </span>
          </div>
        </section>
        <section className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-[minmax(220px,1fr)_130px_130px_170px_150px_auto]">
            <label className="flex h-9 items-center gap-2 rounded-md border border-borderSoft px-3">
              <Search className="size-4 text-textMuted" />
              <input
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(1);
                }}
                placeholder="文件、对象、供应商或编号"
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
              />
            </label>
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
            >
              <option value="all">全部类型</option>
              <option value="pdf">PDF</option>
              <option value="sheet">表格</option>
              <option value="mail">邮件</option>
              <option value="image">图片</option>
            </select>
            <select
              value={risk}
              onChange={(event) => {
                setRisk(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
            >
              <option value="all">全部风险</option>
              <option value="low">低风险</option>
              <option value="medium">中风险</option>
              <option value="high">高风险</option>
              <option value="critical">严重风险</option>
            </select>
            <select
              value={assignee}
              onChange={(event) => {
                setAssignee(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
            >
              <option value="all">全部负责人</option>
              <option value="me">分派给我</option>
              <option value="unassigned">未分派</option>
              {reviewers.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id}>
                  {reviewer.name}
                </option>
              ))}
            </select>
            <select
              value={issue}
              onChange={(event) => {
                setIssue(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-borderSoft px-3 text-[12px]"
            >
              <option value="all">全部治理状态</option>
              <option value="unlinked">未关联</option>
              <option value="ai_pending">AI 待处理</option>
              <option value="overdue_review">审核超时</option>
              <option value="expired">证据过期</option>
              <option value="duplicate_checksum">重复文件</option>
              <option value="ai_failed">AI 失败</option>
            </select>
            <button
              onClick={() => void load()}
              aria-label="刷新队列"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-borderSoft px-3 text-[12px] font-semibold"
            >
              <RefreshCw className="size-4" />
              刷新
            </button>
          </div>
        </section>
        {selected.length > 0 && (
          <section className="flex flex-wrap items-center gap-2 rounded-card border border-primary/25 bg-primary-soft/40 px-3 py-2 shadow-card">
            <span className="mr-auto text-[12px] font-bold text-primary">
              已选 {selected.length} 条
            </span>
            <button
              onClick={() => void runAi(selected)}
              disabled={busy}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-ai px-3 text-[11px] font-bold text-white disabled:opacity-45"
            >
              <Bot className="size-4" />
              批量 AI 预审
            </button>
            {permissions.canAssign && (
              <select
                defaultValue=""
                onChange={(event) => {
                  void assignSelected(event.target.value);
                  event.currentTarget.value = "";
                }}
                className="h-8 rounded-md border border-borderSoft bg-white px-3 text-[11px]"
              >
                <option value="" disabled>
                  分派审核负责人
                </option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.name}
                  </option>
                ))}
              </select>
            )}
            <a
              href={`/api/attachments/export?ids=${selected.join(",")}`}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[11px] font-semibold"
            >
              <Download className="size-4" />
              导出所选
            </a>
            <button
              onClick={() => setSelected([])}
              aria-label="清除选择"
              className="flex size-8 items-center justify-center rounded-md border border-borderSoft bg-white"
            >
              <X className="size-4" />
            </button>
          </section>
        )}
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-borderSoft p-3">
              <ModuleHeader
                icon={FileArchive}
                title="附件审核队列"
                subtitle={`当前 ${rows.length} 条 · 共 ${total} 条`}
                tone="blue"
                density="compact"
              />
              <span className="text-[11px] text-textMuted">按上传时间倒序</span>
            </div>
            {loading ? (
              <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="size-5 animate-spin text-primary" />
              </div>
            ) : rows.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[940px] table-fixed text-left text-[12px]">
                    <colgroup>
                      <col className="w-10" />
                      <col className="w-[240px]" />
                      <col className="w-[190px]" />
                      <col className="w-[150px]" />
                      <col className="w-[130px]" />
                      <col className="w-[150px]" />
                      <col className="w-[100px]" />
                    </colgroup>
                    <thead className="h-10 bg-slate-50 text-textSecondary">
                      <tr>
                        <th className="px-3">
                          <input
                            type="checkbox"
                            aria-label="选择当前页全部附件"
                            checked={allSelected}
                            onChange={(event) =>
                              setSelected(
                                event.target.checked
                                  ? rows.map((row) => row.databaseId)
                                  : [],
                              )
                            }
                          />
                        </th>
                        <th className="px-3">文件 / 编号</th>
                        <th className="px-3">业务关联</th>
                        <th className="px-3">AI 预审</th>
                        <th className="px-3">审核状态</th>
                        <th className="px-3">负责人 / SLA</th>
                        <th className="px-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const KindIcon = kindIcon[row.fileKind];
                        const meta =
                          reviewMeta[row.reviewState] ?? reviewMeta.pending_ai;
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              "h-16 border-t border-borderSoft",
                              active?.id === row.id && "bg-primary-soft/45",
                            )}
                          >
                            <td className="px-3">
                              <input
                                type="checkbox"
                                aria-label={`选择 ${row.id}`}
                                checked={selected.includes(row.databaseId)}
                                onChange={(event) =>
                                  setSelected((current) =>
                                    event.target.checked
                                      ? [...current, row.databaseId]
                                      : current.filter(
                                          (id) => id !== row.databaseId,
                                        ),
                                  )
                                }
                              />
                            </td>
                            <td className="min-w-0 px-3">
                              <button
                                onClick={() => setActiveId(row.id)}
                                className="block w-full min-w-0 text-left"
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <KindIcon className="size-4 shrink-0 text-primary" />
                                  <strong className="truncate" title={row.name}>
                                    {row.name}
                                  </strong>
                                </span>
                                <span className="mt-1 block truncate text-[10px] font-semibold text-primary">
                                  {row.id} · {row.size}
                                </span>
                              </button>
                            </td>
                            <td className="min-w-0 px-3">
                              <button
                                onClick={() => setRelationRow(row)}
                                className="block w-full min-w-0 text-left"
                              >
                                <span
                                  className={cn(
                                    "block truncate font-semibold",
                                    row.relatedId
                                      ? "text-success"
                                      : "text-warning",
                                  )}
                                >
                                  {row.relatedId
                                    ? relationTypeLabel[
                                        row.relatedType ?? ""
                                      ] || "已关联"
                                    : "待关联"}
                                </span>
                                <span
                                  className="mt-1 block truncate text-[10px] text-textMuted"
                                  title={row.object}
                                >
                                  {row.object}
                                </span>
                              </button>
                            </td>
                            <td className="min-w-0 px-3">
                              <span className="block truncate font-semibold">
                                {row.aiStatus === "not_run"
                                  ? "未运行"
                                  : row.aiStatus === "running"
                                    ? "分析中"
                                    : row.aiStatus === "failed"
                                      ? "运行失败"
                                      : "已完成"}
                                {row.confidenceScore !== null
                                  ? ` · ${row.confidenceScore}%`
                                  : ""}
                              </span>
                              <span
                                className={cn(
                                  "mt-1 block truncate text-[10px]",
                                  ["high", "critical"].includes(row.risk ?? "")
                                    ? "font-bold text-danger"
                                    : "text-textMuted",
                                )}
                              >
                                {row.risk
                                  ? riskLabel[row.risk] || row.risk
                                  : "暂无风险结论"}
                              </span>
                            </td>
                            <td className="px-3">
                              <span
                                className={cn(
                                  "inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold",
                                  meta.className,
                                )}
                              >
                                {meta.label}
                              </span>
                              {row.openIssueCount > 0 && (
                                <span className="mt-1 block text-[10px] font-semibold text-danger">
                                  {row.openIssueCount} 个问题
                                </span>
                              )}
                            </td>
                            <td className="min-w-0 px-3">
                              <span className="block truncate font-semibold">
                                {row.assignedReviewer || "未分派"}
                              </span>
                              <span
                                className={cn(
                                  "mt-1 block truncate text-[10px]",
                                  row.overdue
                                    ? "font-bold text-danger"
                                    : "text-textMuted",
                                )}
                              >
                                {row.overdue ? "已超时 · " : "截止 · "}
                                {formatTime(row.reviewDueAt)}
                              </span>
                            </td>
                            <td className="px-3">
                              <button
                                onClick={() => {
                                  setActiveId(row.id);
                                  setReviewRow(row);
                                  window.history.replaceState(
                                    null,
                                    "",
                                    `/attachments?attachmentId=${encodeURIComponent(row.id)}`,
                                  );
                                }}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-primary px-2 text-[11px] font-semibold text-primary"
                              >
                                <UserRoundCheck className="size-3.5" />
                                审核
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <footer className="flex flex-wrap items-center gap-2 border-t border-borderSoft px-3 py-2">
                  <span className="mr-auto text-[11px] text-textMuted">
                    第 {page} / {totalPages} 页 · 共 {total} 条
                  </span>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded-md border border-borderSoft px-2 text-[11px]"
                  >
                    <option value="10">10 条/页</option>
                    <option value="20">20 条/页</option>
                    <option value="50">50 条/页</option>
                  </select>
                  <button
                    aria-label="上一页"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1}
                    className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-35"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    aria-label="下一页"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={page >= totalPages}
                    className="flex size-8 items-center justify-center rounded-md border border-borderSoft disabled:opacity-35"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </footer>
              </>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <FileArchive className="size-10 text-textMuted" />
                <p className="mt-3 text-[14px] font-bold">当前条件下没有附件</p>
                <p className="mt-1 text-[11px] text-textMuted">
                  可调整筛选条件或上传新的价格证据。
                </p>
              </div>
            )}
          </section>
          <aside className="rounded-card border border-ai-border bg-white p-3 shadow-card">
            <ModuleHeader
              icon={Sparkles}
              title="证据审核工作区"
              subtitle="AI 预审与人工结论分离"
              tone="purple"
              density="compact"
            />
            {active ? (
              <div className="mt-3 space-y-3">
                <div className="min-w-0">
                  <p className="truncate font-bold" title={active.name}>
                    {active.name}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-textMuted">
                    {active.id} · {active.type}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-borderSoft bg-slate-50 p-2">
                    <p className="text-[10px] text-textMuted">业务关联</p>
                    <p
                      className={cn(
                        "mt-1 truncate text-[12px] font-bold",
                        active.relatedId ? "text-success" : "text-warning",
                      )}
                    >
                      {active.relatedId ? "已关联" : "待关联"}
                    </p>
                  </div>
                  <div className="rounded-md border border-borderSoft bg-slate-50 p-2">
                    <p className="text-[10px] text-textMuted">AI 预审</p>
                    <p className="mt-1 truncate text-[12px] font-bold">
                      {active.confidenceScore !== null
                        ? `${active.confidenceScore}% · ${riskLabel[active.risk ?? ""] || "待判定"}`
                        : "未完成"}
                    </p>
                  </div>
                </div>
                {(active.governanceFlags.length > 0 ||
                  active.openIssueCount > 0) && (
                  <div className="rounded-md border border-warning/30 bg-warning-soft p-3">
                    <p className="text-[11px] font-bold text-warning">需处理</p>
                    <p className="mt-1 text-[11px] leading-5 text-textSecondary">
                      {active.openIssueCount > 0
                        ? `${active.openIssueCount} 个准入问题`
                        : ""}
                      {active.openIssueCount > 0 &&
                      active.governanceFlags.length > 0
                        ? " · "
                        : ""}
                      {active.governanceFlags
                        .map(
                          (flag) =>
                            ({
                              unlinked: "未关联",
                              ai_pending: "AI 待处理",
                              overdue_review: "审核超时",
                              expired: "证据过期",
                              duplicate_checksum: "重复文件",
                              ai_failed: "AI 失败",
                            })[flag] || flag,
                        )
                        .join(" · ")}
                    </p>
                  </div>
                )}
                <div className="space-y-1 rounded-md border border-borderSoft bg-slate-50 p-3 text-[11px] text-textSecondary">
                  <p className="truncate">对象：{active.object}</p>
                  <p className="truncate">供应商：{active.supplier}</p>
                  <p className="truncate">
                    负责人：{active.assignedReviewer || "未分派"}
                  </p>
                  <p className={active.overdue ? "font-bold text-danger" : ""}>
                    审核截止：{formatTime(active.reviewDueAt)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/attachments/${active.databaseId}`}
                    className="flex h-9 items-center justify-center gap-2 rounded-md border border-borderSoft text-[12px] font-bold"
                  >
                    <Eye className="size-4" />
                    查看证据
                  </Link>
                  <button
                    onClick={() => void runAi([active.databaseId])}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ai text-[12px] font-bold text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Bot className="size-4" />
                    )}
                    AI 预审
                  </button>
                </div>
                <button
                  onClick={() => setRelationRow(active)}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-primary text-[12px] font-bold text-primary"
                >
                  <Link2 className="size-4" />
                  {active.relatedId ? "调整业务关联" : "关联业务对象"}
                </button>
                <button
                  onClick={() => setReviewRow(active)}
                  disabled={!permissions.canReview}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-success text-[12px] font-bold text-white disabled:opacity-45"
                >
                  <UserRoundCheck className="size-4" />
                  提交人工审核
                </button>
                {active.reviewState === "confirmed" && (
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-success">
                    <CheckCircle2 className="size-4" />
                    已完成 AI 预审与人工确认
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <ShieldAlert className="size-9 text-textMuted" />
                <p className="mt-3 text-[12px] text-textMuted">
                  请选择一条附件进入审核工作区
                </p>
              </div>
            )}
          </aside>
        </div>
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => void load()}
        />
        {relationRow && (
          <RelationDialog
            row={relationRow}
            onClose={() => setRelationRow(null)}
            onSaved={() => void load()}
          />
        )}
        {reviewRow && (
          <ReviewDialog
            row={reviewRow}
            onClose={() => setReviewRow(null)}
            onSaved={() => void load()}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default function AttachmentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <AttachmentsContent />
    </Suspense>
  );
}
