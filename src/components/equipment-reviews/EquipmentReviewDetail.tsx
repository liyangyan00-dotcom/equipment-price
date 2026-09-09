"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleDashed,
  ClipboardSignature,
  Download,
  ExternalLink,
  FileText,
  FileSearch,
  History,
  ListChecks,
  Loader2,
  RotateCcw,
  Save,
  Scale,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import { ModuleHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import type {
  EquipmentReviewDecision,
  EquipmentReviewEvidenceState,
  EquipmentReviewProgress,
  EquipmentReviewTask,
} from "@/types/equipmentReview";
import {
  formatReviewPrice,
  ReviewConfidenceBadge,
  ReviewRiskBadge,
  ReviewStatusBadge,
} from "./reviewUtils";
import { EquipmentReviewAuditTrail } from "./EquipmentReviewAuditTrail";
import { EquipmentAiReviewPanel } from "./EquipmentAiReviewPanel";
import type { EquipmentAiReviewOutput } from "@/types/equipmentAiReview";

type EquipmentReviewDetailProps = {
  task: EquipmentReviewTask | null;
  comment: string;
  busyDecision: EquipmentReviewDecision | null;
  savingProgress: boolean;
  canReview: boolean;
  canRunAiReview: boolean;
  canReadFullAudit: boolean;
  userRole: string;
  currentUserId: string;
  dirty: boolean;
  onCommentChange: (value: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onDecision: (
    decision: EquipmentReviewDecision,
    progress: EquipmentReviewProgress
  ) => void;
  onSaveProgress: (progress: EquipmentReviewProgress) => void;
  onAiCompleted: () => void;
};

const commentTemplates = [
  "信息完整，来源与价格边界已核验，建议通过。",
  "请补充价格有效期，并重新提交审核。",
  "请补充供应商原始报价文件及可追溯来源。",
  "当前报价偏差较大，请重新核验价格条件和技术参数。",
];

const evidenceTypeLabels: Record<string, string> = {
  quote_evidence: "供应商报价单",
  technical_spec: "技术规格书",
  supplier_qualification: "供应商资质",
  delivery_terms: "交付条款",
  payment_terms: "付款条款",
  inspection_certificate: "检验/合格证",
  contract: "合同或订单",
  correspondence: "邮件与往来记录",
  other: "其他证据",
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function MetricBar({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "purple" | "green" | "orange";
}) {
  const color = {
    blue: "bg-primary",
    purple: "bg-ai",
    green: "bg-success",
    orange: "bg-warning",
  }[tone];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-textSecondary">{label}</span>
        <span className="font-bold tabular-nums text-textMain">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function EquipmentReviewDetail({
  task,
  comment,
  busyDecision,
  savingProgress,
  canReview,
  canRunAiReview,
  canReadFullAudit,
  userRole,
  currentUserId,
  dirty,
  onCommentChange,
  onDirtyChange,
  onDecision,
  onSaveProgress,
  onAiCompleted,
}: EquipmentReviewDetailProps) {
  const [evidenceStates, setEvidenceStates] = useState<
    Record<string, EquipmentReviewEvidenceState>
  >(
    () => ({
      price_source:
        task?.evidence_states?.price_source ??
        (task?.evidence_checks.price_source ? "verified" : "missing"),
      supplier:
        task?.evidence_states?.supplier ??
        (task?.evidence_checks.supplier ? "verified" : "missing"),
      technical_parameters:
        task?.evidence_states?.technical_parameters ??
        (task?.evidence_checks.technical_parameters ? "verified" : "missing"),
      validity:
        task?.evidence_states?.validity ??
        (task?.evidence_checks.validity ? "verified" : "missing"),
    })
  );
  const [resolvedIssues, setResolvedIssues] = useState<string[]>([]);

  if (!task) {
    return (
      <aside className="flex min-h-[520px] items-center justify-center rounded-card border border-borderSoft bg-card p-6 shadow-card">
        <div className="text-center">
          <CircleDashed className="mx-auto size-9 text-textMuted" />
          <p className="mt-3 text-[14px] font-bold text-textMain">请选择审核任务</p>
          <p className="mt-1 text-[12px] text-textMuted">右侧将显示 AI 预审、证据和人工审核操作。</p>
        </div>
      </aside>
    );
  }

  const price = task.wpi_equipment_prices;
  const evidenceFiles = task.evidence_files ?? [];
  const finalStatus = ["approved", "rejected", "archived"].includes(task.status);
  const claimedByMe = Boolean(
    task.assigned_to && task.assigned_to === currentUserId
  );
  const claimedByOther = Boolean(
    task.assigned_to && task.assigned_to !== currentUserId
  );
  const canEditReview =
    canReview && claimedByMe && task.status === "in_review" && !finalStatus;
  const canStartReview =
    canReview &&
    !claimedByOther &&
    !finalStatus &&
    ["pending", "need_info"].includes(task.status);
  const evidenceEntries = [
    ["price_source", "价格来源"],
    ["supplier", "供应商主体"],
    ["technical_parameters", "技术参数"],
    ["validity", "有效期"],
  ] as const;
  const issues = [
    ...task.matched_rules.map((label) => ({
      id: `rule:${label}`,
      label,
      severity: "高" as const,
      type: "规则命中",
    })),
    ...task.missing_fields.map((label) => ({
      id: `missing:${label}`,
      label: `缺失：${label}`,
      severity: "中" as const,
      type: "资料缺失",
    })),
  ];
  const hasSourceEvidence =
    task.source_kind === "import"
      ? Boolean(task.import_batch_id)
      : evidenceFiles.length > 0 || Boolean(price.source_url);
  const evidenceReady =
    hasSourceEvidence &&
    evidenceEntries.every(([key]) => evidenceStates[key] === "verified");
  const unresolvedIssues = issues.filter(
    (issue) => !resolvedIssues.includes(issue.id)
  );
  const canApprove =
    canReview &&
    claimedByMe &&
    task.status === "in_review" &&
    !finalStatus &&
    busyDecision === null &&
    evidenceReady &&
    unresolvedIssues.length === 0 &&
    Boolean(comment.trim());
  const referenceDeviation =
    task.risk_level === "critical"
      ? 24.8
      : task.risk_level === "high"
        ? 18.6
        : task.risk_level === "medium"
          ? 9.4
          : 3.2;
  const progress: EquipmentReviewProgress = {
    evidenceStates,
    resolvedIssueIds: resolvedIssues,
  };
  const applyAiSuggestion = (output: EquipmentAiReviewOutput | null = null) => {
    const nextComment = [
      output?.judgment || task.ai_judgment,
      output?.recommendation || task.ai_recommendation
        ? `处理建议：${output?.recommendation || task.ai_recommendation}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    onCommentChange(nextComment || "已参考 AI 预审建议，请结合真实证据完成核验。");
    onDirtyChange(true);
  };

  const markEvidenceVerified = () => {
    setEvidenceStates({
      price_source: hasSourceEvidence ? "verified" : "missing",
      supplier: "verified",
      technical_parameters: "verified",
      validity: "verified",
    });
    onDirtyChange(true);
  };
  const reviewSteps = [
    {
      label: "任务认领",
      complete: Boolean(task.assigned_to) || finalStatus,
    },
    {
      label: "证据核验",
      complete: evidenceReady,
    },
    {
      label: "问题处理",
      complete: unresolvedIssues.length === 0,
    },
    {
      label: "提交结论",
      complete: finalStatus,
    },
  ];
  const submittedPrice = Number(price.original_price);
  const usdPrice = price.usd_price ? Number(price.usd_price) : null;
  const supplierName = price.wpi_suppliers?.name || "供应商待核验";
  const submittedAt = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(task.submitted_at));

  return (
    <aside className="overflow-hidden rounded-card border border-ai-border/70 bg-card shadow-card xl:sticky xl:top-[62px] xl:max-h-[calc(100vh-74px)] xl:overflow-y-auto">
      <div className="border-b border-ai-border bg-gradient-to-r from-ai-soft via-white to-primary-soft px-3 py-2.5">
        <ModuleHeader
          icon={ClipboardSignature}
          title="人工审核工作区"
          subtitle="AI 仅提供预审建议，最终结论由审核人员确认"
          tone="purple"
          density="compact"
          action={
            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-ai-border bg-white px-2 py-0.5 text-[9px] font-bold text-ai">
                {userRole === "admin"
                  ? "管理员"
                  : userRole === "manager"
                    ? "审核经理"
                    : userRole === "reviewer"
                      ? "审核员"
                      : userRole === "editor"
                        ? "资料编辑"
                        : "只读"}
              </span>
              <ReviewStatusBadge status={task.status} className="h-6" />
            </div>
          }
        />
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-textMain">{price.equipment_name}</p>
            <p className="mt-0.5 truncate text-[11px] text-textMuted">
              {price.price_code} · {price.brand || "品牌待补充"} · {price.model || "规格待补充"}
            </p>
          </div>
          <div className="text-right">
            <p className="whitespace-nowrap text-[17px] font-extrabold tabular-nums text-primary">
              {formatReviewPrice(task)}
            </p>
            <p className="text-[10px] text-textMuted">{price.price_term || "价格条件待核验"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-primary/10 bg-primary-soft/60 px-2 py-2">
            <p className="text-[10px] text-textMuted">AI置信度</p>
            <div className="mt-1">
              <ReviewConfidenceBadge value={task.confidence} className="h-5 px-1.5 text-[11px]" />
            </div>
          </div>
          <div className="rounded-md border border-cyan-200/60 bg-cyan-50/60 px-2 py-2">
            <p className="text-[10px] text-textMuted">资料完整度</p>
            <p className="mt-1 text-[14px] font-extrabold tabular-nums text-cyan-700">
              {Math.round(task.completeness ?? 0)}%
            </p>
          </div>
          <div className="rounded-md border border-warning/15 bg-warning-soft/60 px-2 py-2">
            <p className="text-[10px] text-textMuted">风险结论</p>
            <div className="mt-1">
              <ReviewRiskBadge task={task} className="h-5 px-1.5 text-[11px]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] p-2.5 text-[11px]">
          <div>
            <p className="text-textMuted">AI参考偏差</p>
            <p
              className={cn(
                "mt-0.5 text-[14px] font-extrabold tabular-nums",
                referenceDeviation >= 15 ? "text-danger" : "text-primary"
              )}
            >
              {referenceDeviation.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-textMuted">当前审核人</p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-[12px] font-bold text-textMain">
                {claimedByMe
                  ? "当前账号"
                  : claimedByOther
                    ? "其他审核员"
                    : "尚未认领"}
              </p>
              {canReview &&
              !finalStatus &&
              ["pending", "need_info"].includes(task.status) &&
              !claimedByOther ? (
                <button
                  type="button"
                  onClick={() => onDecision("start", progress)}
                  className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-1.5 font-bold text-primary"
                >
                  <UserRoundCheck className="size-3" />
                  {claimedByMe ? "开始审核" : "认领并开始"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] p-2.5">
          <MetricBar label="来源可信度" value={task.confidence ?? 0} tone="purple" />
          <MetricBar label="资料完整度" value={task.completeness ?? 0} tone="blue" />
        </div>

        <div className="rounded-md border border-borderSoft bg-white p-2.5">
          <div className="mb-2 flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h3 className="text-[12px] font-bold text-textMain">审核进度</h3>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {reviewSteps.map((step, index) => (
              <div key={step.label} className="min-w-0 text-center">
                <div className="flex items-center">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                      step.complete
                        ? "border-success bg-success text-white"
                        : "border-borderSoft bg-white text-textMuted"
                    )}
                  >
                    {step.complete ? <Check className="size-3" /> : index + 1}
                  </span>
                  {index < reviewSteps.length - 1 ? (
                    <span
                      className={cn(
                        "h-px flex-1",
                        step.complete ? "bg-success/50" : "bg-borderSoft"
                      )}
                    />
                  ) : null}
                </div>
                <p
                  className={cn(
                    "mt-1 truncate text-[9px] font-semibold",
                    step.complete ? "text-success" : "text-textMuted"
                  )}
                  title={step.label}
                >
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {canStartReview ? (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-gradient-to-r from-primary-soft to-ai-soft px-3 py-2.5"
            aria-live="polite"
          >
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-primary">审核控件尚未解锁</p>
              <p className="mt-0.5 text-[10px] leading-4 text-textSecondary">
                点击开始后，可核验证据、处理问题、填写意见并提交人工结论。
              </p>
            </div>
            <button
              type="button"
              disabled={busyDecision !== null}
              onClick={() => onDecision("start", progress)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-bold text-white shadow-sm disabled:opacity-60"
            >
              {busyDecision === "start" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserRoundCheck className="size-3.5" />
              )}
              {claimedByMe ? "开始审核" : "认领并开始"}
            </button>
          </div>
        ) : null}

        <div className="border-t border-borderSoft pt-3">
          <div className="mb-2 flex items-center gap-2">
            <Scale className="size-4 text-cyan-600" />
            <h3 className="text-[12px] font-bold text-textMain">价格审核上下文</h3>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="rounded-md border border-primary/10 bg-primary-soft/50 px-2 py-1.5">
              <p className="text-textMuted">申报原价</p>
              <p className="mt-0.5 truncate text-[12px] font-extrabold text-primary">
                {formatReviewPrice(task)}
              </p>
            </div>
            <div className="rounded-md border border-cyan-200/60 bg-cyan-50/60 px-2 py-1.5">
              <p className="text-textMuted">折算美元价</p>
              <p className="mt-0.5 truncate text-[12px] font-extrabold text-cyan-700">
                {usdPrice
                  ? new Intl.NumberFormat("zh-CN", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(usdPrice)
                  : "待折算"}
              </p>
            </div>
            <div className="rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-2 py-1.5">
              <p className="text-textMuted">报价来源</p>
              <p className="mt-0.5 truncate font-bold text-textMain" title={price.source_type || ""}>
                {price.source_type || "来源待核验"}
              </p>
            </div>
            <div className="rounded-md border border-borderSoft bg-[var(--color-bg-muted)] px-2 py-1.5">
              <p className="text-textMuted">供应商</p>
              <p className="mt-0.5 truncate font-bold text-textMain" title={supplierName}>
                {supplierName}
              </p>
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between rounded-md border border-borderSoft bg-white px-2 py-1.5 text-[10px]">
            <span className="text-textMuted">价格有效期</span>
            <span
              className={cn(
                "font-bold",
                price.valid_until ? "text-textMain" : "text-warning"
              )}
            >
              {price.valid_until || "待补充"}
            </span>
          </div>
          <p className="mt-1.5 text-[9px] leading-4 text-textMuted">
            当前申报价 {submittedPrice.toLocaleString("zh-CN")}，偏差结论仅作审核参考，仍需结合报价边界与证据链判断。
          </p>
        </div>

        <div className="border-t border-borderSoft pt-3">
          <div className="mb-2 flex items-center gap-2">
            <FileSearch className="size-4 text-primary" />
            <h3 className="text-[12px] font-bold text-textMain">证据链核验</h3>
            <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
              {task.source_kind === "import"
                ? "导入原文件"
                : `真实文件 ${evidenceFiles.length} 份`}
            </span>
          </div>

          {evidenceFiles.length > 0 ? (
            <div className="mb-2 space-y-1.5">
              {evidenceFiles.map((file) => {
                const priceId = task.equipment_price_id ?? price.id;
                const endpoint = `/api/equipment-prices/${encodeURIComponent(priceId)}/evidence/${encodeURIComponent(file.id)}`;
                return (
                  <div
                    key={file.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-primary/10 bg-primary-soft/35 px-2 py-1.5"
                  >
                    <span className="flex size-7 items-center justify-center rounded-md bg-white text-primary shadow-sm">
                      <FileText className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-textMain" title={file.name}>
                        {file.name}
                      </p>
                      <p className="truncate text-[9px] text-textMuted">
                        {evidenceTypeLabels[file.evidence_type] ?? "其他证据"} · {formatFileSize(file.size_bytes)}
                        {file.document_date ? ` · ${file.document_date}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`${endpoint}?mode=preview`}
                        target="_blank"
                        rel="noreferrer"
                        title="安全预览"
                        className="flex size-7 items-center justify-center rounded-md border border-primary/15 bg-white text-primary hover:bg-primary-soft"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <a
                        href={`${endpoint}?mode=download`}
                        title="下载原文件"
                        className="flex size-7 items-center justify-center rounded-md border border-borderSoft bg-white text-textSecondary hover:text-primary"
                      >
                        <Download className="size-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : task.source_kind === "import" && task.import_batch_id ? (
            <Link
              href={`/equipment-prices/import/${task.import_batch_id}`}
              className="mb-2 flex items-center justify-between rounded-md border border-primary/15 bg-primary-soft/45 px-2.5 py-2 text-[11px] font-semibold text-primary"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0" />
                <span className="truncate">导入批次原文件：{task.import_batch_code || task.import_batch_id}</span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0" />
            </Link>
          ) : price.source_url ? (
            <a
              href={price.source_url}
              target="_blank"
              rel="noreferrer"
              className="mb-2 flex items-center justify-between rounded-md border border-primary/15 bg-primary-soft/45 px-2.5 py-2 text-[11px] font-semibold text-primary"
            >
              <span className="truncate">外部来源链接</span>
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
          ) : (
            <div className="mb-2 rounded-md border border-warning/20 bg-warning-soft px-2.5 py-2 text-[10px] leading-4 text-warning">
              尚未上传真实来源证据。当前任务不能审核通过，请先退回补充报价单或来源文件。
            </div>
          )}

          <div className="space-y-1.5">
            {evidenceEntries.map(([key, label]) => {
              const state = evidenceStates[key];
              return (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px] font-medium",
                  state === "verified"
                    ? "border-success/15 bg-success-soft"
                    : state === "problem"
                      ? "border-danger/15 bg-danger-soft"
                      : "border-warning/20 bg-warning-soft"
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-2",
                    state === "verified"
                      ? "text-success"
                      : state === "problem"
                        ? "text-danger"
                        : "text-warning"
                  )}
                >
                  {state === "verified" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : state === "problem" ? (
                    <X className="size-3.5" />
                  ) : (
                    <AlertTriangle className="size-3.5" />
                  )}
                  {label}
                </span>
                <select
                  value={state}
                  onChange={(event) => {
                    setEvidenceStates((current) => ({
                      ...current,
                      [key]: event.target.value as EquipmentReviewEvidenceState,
                    }));
                    onDirtyChange(true);
                  }}
                  disabled={!canEditReview}
                  aria-label={`${label}核验状态`}
                  className="h-6 rounded-md border border-white/80 bg-white px-1.5 text-[10px] font-semibold text-textSecondary outline-none disabled:opacity-60"
                >
                  <option value="verified">已核验</option>
                  <option value="problem">存在问题</option>
                  <option value="missing">暂缺</option>
                </select>
              </div>
              );
            })}
          </div>
          {canEditReview ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={markEvidenceVerified}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-success/20 bg-success-soft px-2 text-[10px] font-bold text-success"
              >
                <CheckCircle2 className="size-3" />
                核验可用项
              </button>
              <button
                type="button"
                onClick={() => {
                  setEvidenceStates({
                    price_source: "missing",
                    supplier: "missing",
                    technical_parameters: "missing",
                    validity: "missing",
                  });
                  onDirtyChange(true);
                }}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[10px] font-bold text-textSecondary"
              >
                <RotateCcw className="size-3" />
                重置核验
              </button>
            </div>
          ) : null}
          <div className="mt-2 flex gap-2">
            <Link
              href={`/equipment-prices/${task.equipment_price_id ?? price.id}#evidence-chain`}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[11px] font-semibold text-primary hover:bg-primary-soft"
            >
              管理证据 <ExternalLink className="size-3" />
            </Link>
            <Link
              href={
                task.source_kind === "import" && !task.equipment_price_id
                  ? `/equipment-prices/import/${task.import_batch_id ?? ""}`
                  : `/equipment-prices/${task.equipment_price_id ?? price.id}`
              }
              className="inline-flex h-7 items-center gap-1 rounded-md border border-borderSoft bg-white px-2 text-[11px] font-semibold text-textSecondary hover:text-primary"
            >
              {task.source_kind === "import" && !task.equipment_price_id
                ? "导入批次"
                : "设备档案"} <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>

        <EquipmentAiReviewPanel
          reviewId={task.id}
          fallbackJudgment={task.ai_judgment}
          fallbackRecommendation={task.ai_recommendation}
          canRun={
            canRunAiReview &&
            !claimedByOther &&
            !finalStatus &&
            !dirty
          }
          canApplySuggestion={canEditReview}
          hasUnsavedChanges={dirty}
          onApplySuggestion={applyAiSuggestion}
          onCompleted={onAiCompleted}
        />

        <div className="border-t border-borderSoft pt-3">
          <div className="mb-2 flex items-center gap-2">
            <ListChecks className="size-4 text-warning" />
            <h3 className="text-[12px] font-bold text-textMain">问题与规则</h3>
          </div>
          <div className="space-y-1.5">
            {issues.length === 0 ? (
              <span className="text-[11px] text-success">未发现阻断性问题</span>
            ) : null}
            {issues.map((issue) => {
              const resolved = resolvedIssues.includes(issue.id);
              return (
                <div
                  key={issue.id}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border px-2 py-1.5 text-[10px]",
                    resolved
                      ? "border-success/15 bg-success-soft"
                      : issue.severity === "高"
                        ? "border-danger/15 bg-danger-soft"
                        : "border-warning/20 bg-warning-soft"
                  )}
                >
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-bold",
                      resolved
                        ? "bg-success text-white"
                        : issue.severity === "高"
                          ? "bg-danger text-white"
                          : "bg-warning text-white"
                    )}
                  >
                    {resolved ? "已解决" : `${issue.severity}风险`}
                  </span>
                  <span
                    className={cn(
                      "truncate font-semibold",
                      resolved ? "text-success" : "text-textSecondary"
                    )}
                    title={`${issue.type}：${issue.label}`}
                  >
                    {issue.label}
                  </span>
                  <button
                    type="button"
                    disabled={!canEditReview}
                    onClick={() =>
                      setResolvedIssues((current) => {
                        onDirtyChange(true);
                        return resolved
                          ? current.filter((item) => item !== issue.id)
                          : [...current, issue.id];
                      })
                    }
                    className="h-6 rounded-md border border-white/80 bg-white px-1.5 font-bold text-primary disabled:opacity-60"
                  >
                    {resolved ? "撤销" : "标记解决"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-borderSoft pt-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="review-comment" className="text-[12px] font-bold text-textMain">
              人工审核意见
            </label>
            <div className="flex items-center gap-2">
              {dirty ? (
                <span className="inline-flex h-6 items-center rounded-full bg-warning-soft px-2 text-[9px] font-bold text-warning">
                  有未保存修改
                </span>
              ) : (
                <span className="inline-flex h-6 items-center rounded-full bg-success-soft px-2 text-[9px] font-bold text-success">
                  已同步
                </span>
              )}
              <button
                type="button"
                disabled={!canEditReview || savingProgress || busyDecision !== null || !dirty}
                onClick={() => onSaveProgress(progress)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-[10px] font-bold text-primary disabled:cursor-not-allowed disabled:opacity-45"
              >
                {savingProgress ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Save className="size-3" />
                )}
                保存进度
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {commentTemplates.map((template) => (
              <button
                key={template}
                type="button"
                disabled={!canEditReview}
                onClick={() => {
                  onCommentChange(template);
                  onDirtyChange(true);
                }}
                className="rounded-md border border-primary/15 bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary transition hover:border-primary/35 disabled:opacity-60"
              >
                {template.slice(0, 8)}
              </button>
            ))}
          </div>
          <textarea
            id="review-comment"
            value={comment}
            disabled={!canEditReview}
            onChange={(event) => {
              onCommentChange(event.target.value);
              onDirtyChange(true);
            }}
            placeholder="填写人工核验结论；通过、补资料或驳回时均为必填"
            className="mt-2 min-h-20 w-full resize-y rounded-md border border-borderSoft bg-white px-3 py-2 text-[12px] leading-5 text-textMain outline-none transition placeholder:text-textMuted focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
          {task.review_comment ? (
            <p className="mt-1 text-[11px] text-textMuted">上次意见：{task.review_comment}</p>
          ) : null}
        </div>

        {!claimedByMe || task.status !== "in_review" ? (
          <div className="flex items-start gap-2 rounded-md border border-primary/15 bg-primary-soft px-2.5 py-2 text-[10px] leading-4 text-primary">
            <UserRoundCheck className="mt-0.5 size-3.5 shrink-0" />
            {claimedByOther
              ? "该任务已由其他审核员认领，当前账号只能查看。"
              : "请先认领任务进入审核中状态，再核验证据并提交人工结论。"}
          </div>
        ) : !evidenceReady || unresolvedIssues.length > 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning-soft px-2.5 py-2 text-[10px] leading-4 text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            审核通过前需完成全部证据核验，并处理 {unresolvedIssues.length} 项未解决问题。
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 rounded-md border border-borderSoft bg-[var(--color-bg-muted)] p-2.5 text-[10px]">
          <div>
            <p className="text-textMuted">任务提交</p>
            <p className="mt-0.5 font-bold text-textMain">{submittedAt}</p>
          </div>
          <div>
            <p className="text-textMuted">当前状态</p>
            <div className="mt-0.5">
              <ReviewStatusBadge status={task.status} className="h-5 text-[10px]" />
            </div>
          </div>
          <div>
            <p className="text-textMuted">最近更新</p>
            <p className="mt-0.5 font-bold text-textMain">
              {new Intl.DateTimeFormat("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(new Date(task.updated_at))}
            </p>
          </div>
          <div>
            <p className="text-textMuted">最终审核</p>
            <p className="mt-0.5 font-bold text-textMain">
              {task.reviewed_at
                ? new Intl.DateTimeFormat("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }).format(new Date(task.reviewed_at))
                : "待提交结论"}
            </p>
          </div>
        </div>

        <EquipmentReviewAuditTrail
          reviewId={task.id}
          revision={task.updated_at}
          canReadFullAudit={canReadFullAudit}
        />

        <div className="sticky bottom-0 z-10 -mx-3 grid grid-cols-3 gap-2 border-t border-borderSoft bg-white/95 px-3 pb-1 pt-3 backdrop-blur">
          <button
            type="button"
            disabled={!canApprove}
            onClick={() => onDecision("approve", progress)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-success px-2 text-[12px] font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busyDecision === "approve" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            审核通过
          </button>
          <button
            type="button"
            disabled={!canEditReview || busyDecision !== null || !comment.trim()}
            onClick={() => onDecision("need_info", progress)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-warning/25 bg-warning-soft px-2 text-[12px] font-bold text-warning disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busyDecision === "need_info" ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            补充资料
          </button>
          <button
            type="button"
            disabled={!canEditReview || busyDecision !== null || !comment.trim()}
            onClick={() => onDecision("reject", progress)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-danger/20 bg-danger-soft px-2 text-[12px] font-bold text-danger disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busyDecision === "reject" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            驳回
          </button>
        </div>

        {!canReview ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning-soft px-3 py-2 text-[11px] leading-5 text-warning">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            当前账户仅可查看审核记录，需 reviewer、manager 或 admin 角色才能提交结论。
          </div>
        ) : null}
      </div>
    </aside>
  );
}
