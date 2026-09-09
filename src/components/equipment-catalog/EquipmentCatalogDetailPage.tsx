"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  Bot,
  Building2,
  Cable,
  CheckCircle2,
  CircleAlert,
  CircleGauge,
  ClipboardCheck,
  ClipboardList,
  Database,
  ExternalLink,
  FileImage,
  FileSearch,
  FileText,
  Gauge,
  History,
  Link2,
  LoaderCircle,
  Maximize2,
  ImageIcon,
  PackageSearch,
  Ruler,
  RefreshCcw,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Wrench,
  UploadCloud,
  WandSparkles,
  Workflow,
  X,
  XCircle,
} from "lucide-react";
import { ConfidenceBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { EmptyState, ModuleHeader } from "@/components/common";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { emitMockToast } from "@/hooks/useMockToast";
import { createClient } from "@/lib/supabase/client";
import {
  evaluateEquipmentCatalogQuality,
  groupEquipmentParameters,
  PARAMETER_GROUP_LABELS,
  type EquipmentParameterGroupKey,
} from "@/lib/equipmentCatalog/quality";
import type { ConfidenceLevel, ReviewStatus } from "@/types/common";
import type {
  EquipmentCatalogDetail,
  EquipmentCatalogImage,
  EquipmentCatalogReviewStatus,
} from "@/types/equipmentCatalog";

function uiStatus(status: EquipmentCatalogReviewStatus): ReviewStatus {
  return {
    draft: "need_info",
    pending_review: "pending",
    approved: "confirmed",
    rejected: "rejected",
    archived: "voided",
  }[status] as ReviewStatus;
}

function confidenceLevel(value: number): ConfidenceLevel {
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  if (value >= 60) return "D";
  return "E";
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function relationSupplierName(
  value: EquipmentCatalogDetail["suppliers"][number]["supplier"],
) {
  if (Array.isArray(value)) return value[0]?.name ?? "供应商待核验";
  return value?.name ?? "供应商待核验";
}

const riskLabels = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
} as const;

const parameterGroupIcons: Record<EquipmentParameterGroupKey, typeof Gauge> = {
  performance: Gauge,
  construction: Wrench,
  materials: PackageSearch,
  electrical: Cable,
  dimensions: Ruler,
  documents: BookOpenCheck,
  other: SlidersHorizontal,
};

export function EquipmentCatalogDetailPage({ id }: { id: string }) {
  const [record, setRecord] = useState<EquipmentCatalogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewing, setReviewing] =
    useState<EquipmentCatalogReviewStatus | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSourceUrl, setImageSourceUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualFieldKey, setManualFieldKey] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [manualUnit, setManualUnit] = useState("");
  const [manualSourceUrl, setManualSourceUrl] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [documentParsing, setDocumentParsing] = useState(false);
  const [documentDiscovering, setDocumentDiscovering] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentUploadProgress, setDocumentUploadProgress] = useState({ current: 0, total: 0 });
  const [pdfDiscoveryFailed, setPdfDiscoveryFailed] = useState(false);
  const [candidateReviewing, setCandidateReviewing] = useState<string | null>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/equipment-catalog/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        data?: EquipmentCatalogDetail;
        error?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "设备资料加载失败");
      setRecord(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "设备资料加载失败",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const keyParameters = useMemo(
    () => record?.parameters.filter((parameter) => parameter.is_key) ?? [],
    [record],
  );
  const primaryImage = record?.images[0] ?? null;
  const capturedImageUrl = useMemo(() => {
    const values = record?.metadata?.imageUrls;
    if (!Array.isArray(values)) return "";
    return values.find((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value)) ?? "";
  }, [record]);
  const displayImageUrl = primaryImage?.url || record?.thumbnail_url || capturedImageUrl;
  const imageEvidenceUrl = primaryImage?.sourceUrl || capturedImageUrl || primaryImage?.url || "";
  const quality = useMemo(
    () =>
      record
        ? record.quality_evaluation ??
          evaluateEquipmentCatalogQuality(record, record.parameters, record.sources)
        : null,
    [record],
  );
  const parameterGroups = useMemo(
    () => groupEquipmentParameters(record?.parameters ?? []),
    [record],
  );
  const parameterDisplayGroups = useMemo(() => {
    const existingGroups = new Map(
      parameterGroups.map((group) => [group.key, group.parameters]),
    );
    const missingGroups = new Map<
      EquipmentParameterGroupKey,
      NonNullable<typeof quality>["missingFields"]
    >();

    quality?.missingFields.forEach((field) => {
      if (field.group === "identity" || field.group === "evidence") return;
      const fields = missingGroups.get(field.group) ?? [];
      fields.push(field);
      missingGroups.set(field.group, fields);
    });

    return (Object.keys(PARAMETER_GROUP_LABELS) as EquipmentParameterGroupKey[])
      .map((key) => ({
        key,
        parameters: existingGroups.get(key) ?? [],
        missingFields: missingGroups.get(key) ?? [],
      }))
      .filter(
        (group) => group.parameters.length > 0 || group.missingFields.length > 0,
      );
  }, [parameterGroups, quality]);
  const criticalMissing = quality?.missingFields.filter((field) => field.critical) ?? [];
  const manualField = quality?.missingFields.find((field) => field.key === manualFieldKey) ?? null;
  const latestDocumentJob = record?.document_jobs?.[0] ?? null;
  const documentCandidates = useMemo(() => {
    const candidates = record?.parameter_candidates ?? [];
    const scoped = latestDocumentJob
      ? candidates.filter((candidate) => candidate.job_id === latestDocumentJob.id)
      : candidates;
    return [...scoped].sort((left, right) => {
      if (left.review_decision === right.review_decision) return right.confidence - left.confidence;
      return left.review_decision === "pending" ? -1 : 1;
    });
  }, [latestDocumentJob, record?.parameter_candidates]);
  const pendingDocumentCandidates = documentCandidates.filter((candidate) => candidate.review_decision === "pending");
  const primaryPdfSource = record
    ? record.sources.find((source) => source.source_url && (source.source_type === "pdf" || /\.pdf(?:$|[?#])/i.test(source.source_url)))
    : undefined;
  const primaryPdfUrl = record?.datasheet_url || primaryPdfSource?.source_url || "";
  const missingReason = useMemo(() => {
    if (!primaryPdfUrl && (record?.unmatched_pdf_discoveries ?? 0) > 0) {
      return { code: "source_unmatched", label: "发现来源待匹配", tone: "bg-warning-soft text-warning" };
    }
    if (!primaryPdfUrl) return { code: "source_missing", label: "未发现来源", tone: "bg-danger-soft text-danger" };
    if (latestDocumentJob?.status === "queued" || latestDocumentJob?.status === "running") {
      return { code: "parsing", label: "等待解析", tone: "bg-primary-soft text-primary" };
    }
    if (latestDocumentJob?.status === "failed") {
      return { code: "parse_failed", label: "解析失败", tone: "bg-danger-soft text-danger" };
    }
    if (latestDocumentJob?.status === "needs_review" || pendingDocumentCandidates.length > 0) {
      return { code: "review_pending", label: "待人工确认", tone: "bg-warning-soft text-warning" };
    }
    return { code: "not_in_document", label: "文档未识别", tone: "bg-slate-100 text-textMuted" };
  }, [latestDocumentJob?.status, pendingDocumentCandidates.length, primaryPdfUrl, record?.unmatched_pdf_discoveries]);

  async function runAiCompletion() {
    if (!record) return;
    setAiRunning(true);
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowKey: "equipment_price_pre_review",
          title: `${record.equipment_name}设备资料补全`,
          sourceLabel: "设备资料档案",
          businessObjectType: "equipment_catalog",
          businessObjectId: record.id,
          businessHref: `/equipment-catalog/${record.id}`,
          idempotencyKey: `catalog-detail-completion-${record.id}-${new Date().toISOString().slice(0, 13)}`,
          input: {
            catalogId: record.id,
            name: record.equipment_name,
            category: record.equipment_category,
            equipmentType: record.equipment_type,
            brand: record.brand,
            model: record.model,
            specification: record.specification,
            completeness: quality?.score ?? record.parameter_completeness,
            missingFields: quality?.missingFields.map((field) => field.label) ?? [],
            webSourceUrls: [record.source_url, record.catalog_url]
              .filter((value): value is string => Boolean(value)),
            documentUrls: [
              record.datasheet_url,
              ...record.sources
                .filter((source) => source.source_type === "pdf" || /\.pdf(?:$|\?)/i.test(source.source_url || ""))
                .map((source) => source.source_url),
            ].filter((value): value is string => Boolean(value)),
            supplierRelations: record.suppliers.map((relation) => ({
              supplier: relationSupplierName(relation.supplier),
              supplyType: relation.supply_type,
              confidence: relation.confidence,
              reviewStatus: relation.review_status,
            })),
            linkedPriceFacts: record.prices.map((price) => ({
              priceCode: price.price_code,
              amount: price.original_price,
              currency: price.original_currency,
              confidence: price.confidence,
              reviewStatus: price.review_status,
            })),
            requirement:
              "优先核对网页与PDF证据中的缺失参数，输出字段值、单位、原文定位、供应商映射和价格关联建议；不得直接覆盖主数据，全部结果进入人工复核",
          },
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "AI任务创建失败");
      emitMockToast({
        title: "AI资料补全任务已创建",
        description:
          "任务已进入 AI 工作台，生成结果需人工审核后才能写入设备主数据。",
        tone: "success",
      });
    } catch (aiError) {
      emitMockToast({
        title: "AI资料补全未启动",
        description:
          aiError instanceof Error
            ? aiError.message
            : "请检查 AI Provider 配置",
        tone: "danger",
      });
    } finally {
      setAiRunning(false);
    }
  }

  async function reconcileSupplyAndPrices() {
    if (!record) return;
    setReconciling(true);
    try {
      const response = await fetch(
        `/api/equipment-catalog/${encodeURIComponent(record.id)}/reconcile`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        data?: {
          supplierCandidates: number;
          supplierLinked: boolean;
          exactPricesLinked: number;
          compatiblePriceCandidates: number;
          requiresHumanReview: boolean;
        };
        error?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "供应与价格匹配失败");
      emitMockToast({
        title: "供应与价格匹配已完成",
        description: payload.data.supplierLinked
          ? `已关联唯一法律主体，新增 ${payload.data.exactPricesLinked} 条精确型号价格；${payload.data.compatiblePriceCandidates} 条兼容候选保留人工确认。`
          : `发现 ${payload.data.supplierCandidates} 个供应商候选和 ${payload.data.compatiblePriceCandidates} 条兼容价格，未自动确认。`,
        tone: payload.data.requiresHumanReview ? "warning" : "success",
      });
      await load();
    } catch (reconcileError) {
      emitMockToast({
        title: "供应与价格匹配失败",
        description:
          reconcileError instanceof Error ? reconcileError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setReconciling(false);
    }
  }

  async function parsePdfDocument(sourceId?: string, sourceUrl?: string) {
    if (!record || documentParsing) return;
    setDocumentParsing(true);
    try {
      const response = await fetch(
        `/api/equipment-catalog/${encodeURIComponent(record.id)}/documents/parse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, sourceUrl }),
        },
      );
      const payload = (await response.json()) as {
        data?: { parameterCount: number; pendingCount: number };
        error?: string;
      };
      if (!response.ok || !payload.data) throw new Error(payload.error || "PDF 参数解析失败");
      emitMockToast({
        title: "PDF 参数证据已生成",
        description: `识别 ${payload.data.parameterCount} 项参数，其中 ${payload.data.pendingCount} 项差异等待人工确认。`,
        tone: payload.data.pendingCount ? "warning" : "success",
      });
      await load();
      window.setTimeout(() => document.getElementById("document-differences")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (parseError) {
      emitMockToast({
        title: "PDF 参数解析失败",
        description: parseError instanceof Error ? parseError.message : "请检查 PDF 地址与 AI Provider 配置",
        tone: "danger",
      });
    } finally {
      setDocumentParsing(false);
    }
  }

  async function uploadAuthenticatedPdfs(files: File[]) {
    if (!record || documentUploading || !files.length) return;
    const pdfFiles = files
      .filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
      .slice(0, 20);
    if (!pdfFiles.length) {
      emitMockToast({ title: "未找到 PDF", description: "请选择从厂家门户下载的 PDF 技术文档。", tone: "warning" });
      return;
    }
    setDocumentUploading(true);
    setDocumentUploadProgress({ current: 0, total: pdfFiles.length });
    let succeeded = 0;
    let failed = 0;
    let parameterCount = 0;
    let pendingCount = 0;
    try {
      for (const [index, file] of pdfFiles.entries()) {
        setDocumentUploadProgress({ current: index + 1, total: pdfFiles.length });
        try {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch(
            `/api/equipment-catalog/${encodeURIComponent(record.id)}/documents/upload`,
            { method: "POST", body },
          );
          const payload = (await response.json()) as {
            data?: { parameterCount: number; pendingCount: number };
            error?: string;
          };
          if (!response.ok || !payload.data) throw new Error(payload.error || `${file.name} 上传解析失败`);
          succeeded += 1;
          parameterCount += payload.data.parameterCount;
          pendingCount += payload.data.pendingCount;
        } catch {
          failed += 1;
        }
      }
      emitMockToast({
        title: failed ? "PDF 批量导入已完成，部分文件失败" : "PDF 批量导入完成",
        description: `成功 ${succeeded} 份，失败 ${failed} 份；真实识别 ${parameterCount} 项参数，${pendingCount} 项等待人工确认。`,
        tone: failed ? "warning" : pendingCount ? "warning" : "success",
      });
      await load();
      window.setTimeout(() => document.getElementById("document-differences")?.scrollIntoView({ behavior: "smooth" }), 80);
    } finally {
      setDocumentUploading(false);
      setDocumentUploadProgress({ current: 0, total: 0 });
      if (documentFileRef.current) documentFileRef.current.value = "";
    }
  }

  async function discoverAndParsePdf(forceRefresh = false) {
    if (!record || documentDiscovering || documentParsing) return;
    setDocumentDiscovering(true);
    setPdfDiscoveryFailed(false);
    try {
      const response = await fetch(
        `/api/equipment-catalog/${encodeURIComponent(record.id)}/documents/discover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceRefresh }),
        },
      );
      const payload = (await response.json()) as {
        data?: { source: { id: string; url: string; title: string }; discovered: number; matched?: number; reused: boolean; incremental?: boolean };
        error?: string;
      };
      if (!response.ok || !payload.data?.source) throw new Error(payload.error || "官网 PDF 自动发现失败");
      emitMockToast({
        title: forceRefresh
          ? payload.data.discovered
            ? "增量补抓完成"
            : "官网来源已是最新"
          : payload.data.reused
            ? "已找到已登记的 PDF"
            : "官网 PDF 已自动发现",
        description: payload.data.reused
          ? `已核验 ${payload.data.matched ?? 1} 份匹配文档，正在继续执行参数识别。`
          : `新增归档 ${payload.data.discovered} 份官方技术文档，正在解析首选文档。`,
        tone: "success",
      });
      await load();
      await parsePdfDocument(payload.data.source.id, payload.data.source.url);
    } catch (discoverError) {
      setPdfDiscoveryFailed(true);
      emitMockToast({
        title: "未自动发现 PDF",
        description: discoverError instanceof Error ? discoverError.message : "可改用人工登记官网文档地址",
        tone: "warning",
      });
    } finally {
      setDocumentDiscovering(false);
    }
  }

  async function reviewDocumentCandidate(candidateId: string, decision: "accepted" | "rejected") {
    if (!record || candidateReviewing) return;
    setCandidateReviewing(candidateId);
    try {
      const response = await fetch(
        `/api/equipment-catalog/${encodeURIComponent(record.id)}/documents/candidates/${encodeURIComponent(candidateId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "参数差异审核失败");
      emitMockToast({
        title: decision === "accepted" ? "PDF 参数候选已接受" : "PDF 参数候选已拒绝",
        description: decision === "accepted"
          ? "参数与页码、原文坐标已写入正式参数，设备档案仍需最终人工审核。"
          : "候选值已保留在解析记录中，不会覆盖正式参数。",
        tone: decision === "accepted" ? "success" : "warning",
      });
      await load();
    } catch (candidateError) {
      emitMockToast({
        title: "参数差异审核失败",
        description: candidateError instanceof Error ? candidateError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setCandidateReviewing(null);
    }
  }

  async function uploadImage() {
    if (!imageFile) {
      emitMockToast({ title: "请选择设备图片", tone: "warning" });
      return;
    }
    setUploadingImage(true);
    let uploaded: { bucket: string; path: string } | null = null;
    try {
      const sessionResponse = await fetch(
        `/api/equipment-catalog/${encodeURIComponent(id)}/images/upload-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: imageFile.name,
            fileSize: imageFile.size,
            contentType: imageFile.type,
          }),
        },
      );
      const session = (await sessionResponse.json()) as {
        upload?: { bucket: string; path: string; contentType: string };
        error?: string;
      };
      if (!sessionResponse.ok || !session.upload) {
        throw new Error(session.error || "无法创建图片上传会话");
      }

      const storage = createClient().storage.from(session.upload.bucket);
      const storageResult = await storage.upload(
        session.upload.path,
        imageFile,
        {
          contentType: session.upload.contentType,
          upsert: false,
        },
      );
      if (storageResult.error) throw storageResult.error;
      uploaded = session.upload;

      const registerResponse = await fetch(
        `/api/equipment-catalog/${encodeURIComponent(id)}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: session.upload.bucket,
            path: session.upload.path,
            name: imageFile.name,
            contentType: imageFile.type,
            size: imageFile.size,
            sourceUrl: imageSourceUrl,
          }),
        },
      );
      const registered = (await registerResponse.json()) as {
        data?: EquipmentCatalogImage;
        error?: string;
      };
      if (!registerResponse.ok || !registered.data) {
        await storage.remove([session.upload.path]);
        throw new Error(registered.error || "设备图片登记失败");
      }

      setImageDialogOpen(false);
      setImageFile(null);
      setImageSourceUrl("");
      emitMockToast({
        title: "设备图片已归档",
        description: "图片已写入 Supabase Storage，并作为待核验产品图显示。",
        tone: "success",
      });
      await load();
    } catch (uploadError) {
      if (uploaded) {
        await createClient()
          .storage.from(uploaded.bucket)
          .remove([uploaded.path]);
      }
      emitMockToast({
        title: "设备图片上传失败",
        description:
          uploadError instanceof Error ? uploadError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function review(decision: "approved" | "rejected" | "pending_review") {
    if (decision === "rejected" && !notes.trim()) {
      emitMockToast({ title: "请填写退回原因", tone: "warning" });
      return;
    }
    setReviewing(decision);
    try {
      const response = await fetch(
        `/api/equipment-catalog/${encodeURIComponent(id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, notes }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "审核提交失败");
      emitMockToast({
        title:
          decision === "approved"
            ? "设备资料已确认"
            : decision === "rejected"
              ? "设备资料已退回"
              : "已提交人工复核",
        description: "审核记录已写入 Supabase 审计链。",
        tone: decision === "rejected" ? "warning" : "success",
      });
      setNotes("");
      await load();
    } catch (reviewError) {
      emitMockToast({
        title: "审核失败",
        description:
          reviewError instanceof Error ? reviewError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setReviewing(null);
    }
  }

  function openManualCorrection(fieldKey?: string) {
    const selected = quality?.missingFields.find((field) => field.key === fieldKey) ?? quality?.missingFields[0];
    setManualFieldKey(selected?.key ?? "");
    setManualValue("");
    setManualUnit("");
    setManualSourceUrl(record?.source_url ?? "");
    setManualDialogOpen(true);
  }

  async function saveManualCorrection() {
    if (!record || !quality) return;
    const field = quality.missingFields.find((item) => item.key === manualFieldKey);
    if (!field || !manualValue.trim()) {
      emitMockToast({ title: "请选择字段并填写修正值", tone: "warning" });
      return;
    }
    const identityField = field.group === "identity";
    const evidenceField = field.group === "evidence";
    const responseField = evidenceField
      ? field.key === "document"
        ? "datasheet_url"
        : "source_url"
      : field.key;
    setManualSaving(true);
    try {
      const response = await fetch(`/api/equipment-catalog/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: identityField || evidenceField ? "catalog_field" : "parameter",
          field: responseField,
          label: field.label,
          value: manualValue,
          unit: manualUnit,
          sourceUrl: manualSourceUrl,
          parameterGroup: field.group,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "资料修正失败");
      setManualDialogOpen(false);
      emitMockToast({
        title: "资料修正已保存",
        description: "修正值已写入 Supabase，并重新进入人工审核。",
        tone: "success",
      });
      await load();
    } catch (saveError) {
      emitMockToast({
        title: "资料修正失败",
        description: saveError instanceof Error ? saveError.message : "请稍后重试",
        tone: "danger",
      });
    } finally {
      setManualSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[70vh] items-center justify-center gap-2 text-[13px] text-textMuted">
          <LoaderCircle className="size-5 animate-spin text-primary" />
          正在读取设备主数据档案
        </div>
      </AppLayout>
    );
  }

  if (error || !record) {
    return (
      <AppLayout>
        <EmptyState
          title="设备资料无法打开"
          description={error || "记录不存在或无权访问。"}
          className="min-h-[65vh]"
          primaryAction={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-white"
            >
              <RefreshCcw className="size-4" />
              重新加载
            </button>
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-3" data-no-global-interaction>
        <PageHeader
          title={`${record.equipment_name} · 设备资料档案`}
          description={`${record.catalog_code} · ${record.brand || "品牌待补充"} · ${record.model || "型号待补充"}`}
          actions={
            <>
              <Link
                href="/equipment-catalog"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"
              >
                <ArrowLeft className="size-4" />
                返回资料库
              </Link>
              <button
                type="button"
                disabled={documentDiscovering || documentParsing}
                onClick={() => void discoverAndParsePdf(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/25 bg-primary-soft px-3 text-[12px] font-semibold text-primary disabled:opacity-60"
                title="重新检查当前设备官网与产品页，仅补充新增网页和 PDF，保留既有证据与审核记录"
              >
                {documentDiscovering ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                {documentDiscovering ? "补抓中" : "增量补抓"}
              </button>
              <button
                type="button"
                disabled={aiRunning}
                onClick={() => void runAiCompletion()}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-semibold text-ai disabled:opacity-60"
              >
                {aiRunning ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <WandSparkles className="size-4" />
                )}
                {aiRunning ? "AI分析中" : "AI补全资料"}
              </button>
              <Link
                href={`/inquiries/create?catalogId=${encodeURIComponent(record.id)}&equipmentName=${encodeURIComponent(record.equipment_name)}`}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-semibold text-ai"
              >
                <Send className="size-4" />
                创建询价
              </Link>
            </>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            {
              label: "审核状态",
              value:
                record.review_status === "approved"
                  ? "已确认"
                  : record.review_status === "rejected"
                    ? "已退回"
                    : "待人工审核",
              detail: quality?.approvalReady ? "已满足准入规则" : "尚未满足准入规则",
              Icon: ClipboardCheck,
              tone: "text-warning",
              surface: "bg-warning-soft/55",
            },
            {
              label: "资料完整度",
              value: `${quality?.score ?? 0}%`,
              detail: `${quality?.templateLabel ?? "通用设备"}模板实时评估`,
              Icon: CircleGauge,
              tone: quality && quality.score >= 70 ? "text-success" : "text-warning",
              surface: quality && quality.score >= 70 ? "bg-success-soft/55" : "bg-warning-soft/55",
            },
            {
              label: "参数覆盖",
              value: `${quality?.matchedParameterCount ?? 0}/${quality?.requiredParameterCount ?? 0}`,
              detail: `${keyParameters.length} 项已标记关键参数`,
              Icon: SlidersHorizontal,
              tone: "text-primary",
              surface: "bg-primary-soft/55",
            },
            {
              label: "AI可信度",
              value: `${Math.round(record.ai_confidence)}%`,
              detail: record.ai_extracted ? "采集器结构化识别" : "人工建立或历史数据",
              Icon: Bot,
              tone: "text-ai",
              surface: "bg-ai-soft/60",
            },
            {
              label: "来源证据",
              value: `${record.sources.length + record.images.length} 项`,
              detail: record.datasheet_url || record.catalog_url ? "含产品目录或技术样本" : "技术文档待补充",
              Icon: FileSearch,
              tone: "text-cyan-700",
              surface: "bg-cyan-50",
            },
            {
              label: "风险等级",
              value: riskLabels[record.risk_level],
              detail: criticalMissing.length ? `${criticalMissing.length} 项关键缺失` : "无关键字段缺失",
              Icon: ShieldAlert,
              tone: record.risk_level === "low" ? "text-success" : "text-danger",
              surface: record.risk_level === "low" ? "bg-success-soft/55" : "bg-danger-soft/55",
            },
          ].map(({ label, value, detail, Icon, tone, surface }) => (
            <article key={label} className="rounded-card border border-borderSoft bg-white p-3 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-textMuted">{label}</p>
                  <p className={`mt-1 text-[18px] font-bold ${tone}`}>{value}</p>
                  <p className="mt-1 truncate text-[10px] text-textMuted" title={detail}>{detail}</p>
                </div>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${surface} ${tone}`}>
                  <Icon className="size-4.5" />
                </span>
              </div>
            </article>
          ))}
        </section>

        <nav
          aria-label="设备资料档案页内导航"
          className="sticky top-0 z-20 flex min-w-0 items-center gap-1 overflow-x-auto rounded-card border border-borderSoft bg-white/95 p-1.5 shadow-card backdrop-blur"
        >
          {[
            ["设备档案", "#catalog-profile"],
            ["技术参数", "#technical-parameters"],
            ["文档证据", "#documents-evidence"],
            ["PDF差异", "#document-differences"],
            ["供应与价格", "#supply-pricing"],
            ["人工审核", "#human-review"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="inline-flex h-8 shrink-0 items-center rounded-md px-3 text-[12px] font-semibold text-textSecondary transition hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              {label}
            </a>
          ))}
        </nav>

        <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-3">
            <section id="catalog-profile" className="scroll-mt-14 rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <ModuleHeader
                icon={PackageSearch}
                title="设备身份档案"
                subtitle="统一型号身份、产品定位与应用边界，供 BOQ、询价和价格事实共同引用"
                density="compact"
              />
              <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                <div className="min-w-0">
                  <div
                    role={displayImageUrl ? "img" : undefined}
                    aria-label={
                      displayImageUrl
                        ? `${record.equipment_name}产品图片`
                        : undefined
                    }
                    className="relative flex aspect-[4/3] min-h-[280px] w-full items-center justify-center overflow-hidden rounded-lg border border-borderSoft bg-gradient-to-br from-primary-soft to-white bg-center bg-no-repeat"
                    style={
                      displayImageUrl
                        ? {
                            backgroundImage: `url(${displayImageUrl})`,
                            backgroundSize: capturedImageUrl && !primaryImage ? "220% auto" : "contain",
                          }
                        : undefined
                    }
                  >
                    {displayImageUrl ? null : (
                      <ImageIcon className="size-12 text-primary/35" />
                    )}
                    {displayImageUrl ? (
                      <button
                        type="button"
                        onClick={() => setImagePreviewOpen(true)}
                        className="absolute bottom-3 right-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-white/80 bg-white/90 px-2.5 text-[10px] font-semibold text-primary shadow-card backdrop-blur transition hover:bg-white"
                      >
                        <Maximize2 className="size-3.5" />
                        放大查看
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-textSecondary">
                        {primaryImage?.name || (capturedImageUrl ? "官网自动抓取图片" : "暂无产品主图")}
                      </p>
                      <p className="mt-0.5 text-[9px] text-textMuted">
                        {primaryImage
                          ? `核验状态：${primaryImage.verificationStatus}`
                          : capturedImageUrl
                            ? "来源：厂家官网 · 待人工核验"
                            : "上传后进入证据核验"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageDialogOpen(true)}
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-primary/20 bg-primary-soft px-2 text-[10px] font-semibold text-primary"
                    >
                      <UploadCloud className="size-3.5" />
                      {displayImageUrl ? "更新" : "上传"}
                    </button>
                  </div>
                </div>
                <div className="min-w-0 space-y-3">
                  <div className="grid min-w-0 overflow-hidden rounded-lg border border-borderSoft sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      ["设备名称", record.equipment_name],
                      ["标准编号", record.catalog_code],
                      ["设备类别", record.equipment_category || "待分类"],
                      ["细分类型", record.equipment_type || "待补充"],
                      ["品牌", record.brand || "待补充"],
                      ["制造商", record.manufacturer || "待核验"],
                      ["产品系列", record.product_series || "待补充"],
                      ["型号", record.model || "待补充"],
                      ["技术标准", record.technical_standard || "待补充"],
                      ["原产国 / 地区", record.country_code || "待核验"],
                      ["资料语言", record.language || "待核验"],
                      ["来源类型", record.source_type || "待核验"],
                    ].map(([label, value], index) => (
                      <dl key={label} className={`min-w-0 px-3 py-2.5 ${index % 2 ? "bg-white" : "bg-surfaceSubtle/60"}`}>
                        <dt className="text-[10px] font-semibold text-textMuted">{label}</dt>
                        <dd className="mt-1 break-words text-[12px] font-semibold leading-5 text-textMain">{value}</dd>
                      </dl>
                    ))}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
                    <div className="rounded-lg bg-surfaceSubtle p-3">
                      <p className="text-[10px] font-semibold text-textMuted">规格摘要</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-textMain">
                        {record.specification || "待从产品参数表或技术样本中补充。"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary-soft/45 p-3">
                      <p className="text-[10px] font-semibold text-primary">适用场景</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-textMain">
                        {record.application || "待从产品页、技术样本或人工复核中补充。"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="technical-parameters" className="scroll-mt-14 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
              <div className="border-b border-borderSoft px-4 py-3">
                <ModuleHeader
                  icon={SlidersHorizontal}
                  title="分类技术参数"
                  subtitle={`${quality?.templateLabel ?? "通用设备"}模板：已覆盖 ${quality?.matchedParameterCount ?? 0}/${quality?.requiredParameterCount ?? 0} 项必需参数`}
                  density="compact"
                  action={
                    <ConfidenceBadge
                      level={confidenceLevel(record.ai_confidence)}
                      label={`AI ${Math.round(record.ai_confidence)}%`}
                    />
                  }
                />
              </div>
              {record.parameters.length ? (
                <div className="space-y-3 p-4">
                  {parameterDisplayGroups.map((group) => {
                    const GroupIcon = parameterGroupIcons[group.key];
                    return (
                      <section key={group.key} className="overflow-hidden rounded-lg border border-borderSoft">
                        <div className="flex items-center justify-between bg-surfaceSubtle px-3 py-2">
                          <div className="flex items-center gap-2">
                            <GroupIcon className="size-4 text-primary" />
                            <h3 className="text-[12px] font-semibold text-textMain">{PARAMETER_GROUP_LABELS[group.key]}</h3>
                          </div>
                          <span className="text-[10px] text-textMuted">
                            已识别 {group.parameters.length} · 待补 {group.missingFields.length}
                          </span>
                        </div>
                        <div className="grid sm:grid-cols-2">
                          {group.parameters.map((parameter) => {
                            const evidenceUrl = typeof parameter.source_evidence?.sourceUrl === "string" ? parameter.source_evidence.sourceUrl : "";
                            return (
                              <article key={parameter.id} className="min-w-0 border-t border-borderSoft p-3 sm:odd:border-r">
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-textSecondary">
                                      {parameter.parameter_name}
                                      {parameter.is_key ? <span className="rounded-pill bg-ai-soft px-1.5 py-0.5 text-[9px] text-ai">关键</span> : null}
                                    </p>
                                    <p className="mt-1 break-words text-[15px] font-bold text-primary">
                                      {parameter.normalized_value || parameter.raw_value || "待标准化"}
                                      {parameter.unit ? <span className="ml-1 text-[11px] font-semibold text-textMuted">{parameter.unit}</span> : null}
                                    </p>
                                    {parameter.raw_value && parameter.raw_value !== parameter.normalized_value ? (
                                      <p className="mt-1 break-words text-[10px] text-textMuted">原始值：{parameter.raw_value}</p>
                                    ) : null}
                                  </div>
                                  <ConfidenceBadge level={confidenceLevel(parameter.confidence)} label={`${Math.round(parameter.confidence)}%`} />
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <StatusBadge status={uiStatus(parameter.review_status)} />
                                  {evidenceUrl ? (
                                    <a href={evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                                      查看原文 <ExternalLink className="size-3" />
                                    </a>
                                  ) : parameter.source_page ? (
                                    <span className="text-[10px] text-textMuted">第 {parameter.source_page} 页</span>
                                  ) : (
                                    <span className="text-[10px] text-warning">证据待定位</span>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                          {group.missingFields.map((field) => (
                            <button
                              key={`missing-${group.key}-${field.key}`}
                              type="button"
                              onClick={() => openManualCorrection(field.key)}
                              className="min-w-0 border-t border-borderSoft bg-warning-soft/25 p-3 text-left transition hover:bg-warning-soft/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25 sm:odd:border-r"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold text-textSecondary">{field.label}</p>
                                  <p className="mt-1 text-[13px] font-bold text-warning">待补充</p>
                                  <p className="mt-1 text-[10px] leading-4 text-textMuted">
                                    当前来源尚未识别该字段，点击可人工补录并登记证据。
                                  </p>
                                </div>
                                <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[9px] font-semibold ${field.critical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>
                                  {field.critical ? "关键必填" : "建议补充"}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="暂无结构化参数"
                  description="可从说明书、报价附件或人工录入中补充标准参数。"
                  className="m-4 min-h-[180px] shadow-none"
                />
              )}
            </section>

            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <section id="supply-pricing" className="scroll-mt-14 rounded-card border border-borderSoft bg-white p-4 shadow-card">
                <ModuleHeader
                  icon={Building2}
                  title="供应商能力关系"
                  subtitle="仅表示可供能力，不等于供应商已合格"
                  density="compact"
                  action={
                    <button
                      type="button"
                      disabled={reconciling}
                      onClick={() => void reconcileSupplyAndPrices()}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-2.5 text-[10px] font-semibold text-primary disabled:opacity-60"
                    >
                      <RefreshCcw className={`size-3.5 ${reconciling ? "animate-spin" : ""}`} />
                      {reconciling ? "匹配中" : "刷新关联"}
                    </button>
                  }
                />
                <div className="mt-3 space-y-2">
                  {record.suppliers.length ? (
                    record.suppliers.map((relation) => (
                      <article
                        key={relation.id}
                        className="rounded-lg border border-borderSoft p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold">
                              {relationSupplierName(relation.supplier)}
                            </p>
                            <p className="mt-1 text-[10px] text-textMuted">
                              {relation.supply_type} · 授权状态{" "}
                              {relation.authorized_status}
                            </p>
                          </div>
                          <ConfidenceBadge
                            level={confidenceLevel(relation.confidence)}
                            label={`${Math.round(relation.confidence)}%`}
                          />
                        </div>
                        {relation.supplier &&
                        !Array.isArray(relation.supplier) ? (
                          <Link
                            href={`/suppliers/${relation.supplier.id}`}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                          >
                            查看供应商
                            <ExternalLink className="size-3" />
                          </Link>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="rounded-lg bg-surfaceSubtle p-4 text-[12px] text-textMuted">
                      尚未建立供应商能力关系。
                    </p>
                  )}
                </div>
              </section>
              <section id="documents-evidence" className="scroll-mt-14 rounded-card border border-borderSoft bg-white p-4 shadow-card">
                <ModuleHeader
                  icon={FileSearch}
                  title="文档与来源证据"
                  subtitle="产品页、目录、样本、图片与字段证据统一归档"
                  density="compact"
                  action={(
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <input
                        ref={documentFileRef}
                        type="file"
                        multiple
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          if (files.length) void uploadAuthenticatedPdfs(files);
                        }}
                      />
                      <button
                        type="button"
                        disabled={documentUploading || documentDiscovering || documentParsing}
                        onClick={() => documentFileRef.current?.click()}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[10px] font-semibold text-white shadow-sm disabled:opacity-60"
                        title="批量上传从需登录的厂家门户下载的 PDF，最多 20 份"
                      >
                        {documentUploading ? <LoaderCircle className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                        {documentUploading
                          ? `导入 ${documentUploadProgress.current}/${documentUploadProgress.total}`
                          : "批量导入PDF"}
                      </button>
                      {primaryPdfUrl ? (
                        <>
                      <button
                        type="button"
                        disabled={documentDiscovering || documentParsing}
                        onClick={() => void discoverAndParsePdf(true)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-primary-soft px-2.5 text-[10px] font-semibold text-primary disabled:opacity-60"
                      >
                        {documentDiscovering ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                        {documentDiscovering ? "补抓中" : "增量补抓"}
                      </button>
                      <button
                        type="button"
                        disabled={documentParsing || documentDiscovering}
                        onClick={() => void parsePdfDocument(primaryPdfSource?.id, primaryPdfUrl)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ai-border bg-ai-soft px-2.5 text-[10px] font-semibold text-ai disabled:opacity-60"
                      >
                        {documentParsing ? <LoaderCircle className="size-3.5 animate-spin" /> : <WandSparkles className="size-3.5" />}
                        {documentParsing ? "解析中" : "解析PDF参数"}
                      </button>
                        </>
                      ) : quality?.missingFields.some((field) => field.key === "document") ? (
                        <>
                      <button
                        type="button"
                        disabled={documentDiscovering || documentParsing}
                        onClick={() => void discoverAndParsePdf()}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ai-border bg-ai-soft px-2.5 text-[10px] font-semibold text-ai disabled:opacity-60"
                      >
                        {documentDiscovering ? <LoaderCircle className="size-3.5 animate-spin" /> : <FileSearch className="size-3.5" />}
                        {documentDiscovering ? "追踪官网文档" : "自动发现并解析PDF"}
                      </button>
                      {pdfDiscoveryFailed ? (
                        <button
                          type="button"
                          onClick={() => openManualCorrection("document")}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-white px-2.5 text-[10px] font-semibold text-primary"
                        >
                          <Link2 className="size-3.5" />
                          人工补录PDF
                        </button>
                      ) : null}
                        </>
                      ) : null}
                    </div>
                  )}
                />
                <div className="mt-3 space-y-2">
                  {!primaryPdfUrl && record.unmatched_pdf_discoveries > 0 ? (
                    <div className="rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-[11px] text-warning">
                      采集任务已发现 {record.unmatched_pdf_discoveries} 份官网 PDF，但文档元数据尚未明确命中当前型号，暂不自动写入本档案。
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { label: "产品目录", href: record.catalog_url, Icon: BookOpenCheck },
                      { label: "技术样本", href: record.datasheet_url, Icon: FileText },
                      { label: "原始产品页", href: record.source_url, Icon: ExternalLink },
                      { label: "产品图片", href: imageEvidenceUrl, Icon: FileImage },
                    ].map(({ label, href, Icon }) =>
                      typeof href === "string" && href ? (
                        <a key={label} href={href} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-primary/15 bg-primary-soft/45 px-3 py-2 text-[11px] font-semibold text-primary">
                          <span className="flex min-w-0 items-center gap-2"><Icon className="size-3.5 shrink-0" /><span className="truncate">{label}</span></span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      ) : null,
                    )}
                  </div>
                  {record.sources.length ? (
                    record.sources.map((source) => (
                      <article
                        key={source.id}
                        className="rounded-lg border border-borderSoft p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold">
                              {source.source_title || source.source_type}
                            </p>
                            <p className="mt-1 text-[10px] text-textMuted">
                              {source.source_type} ·{" "}
                              {source.source_page
                                ? `第 ${source.source_page} 页`
                                : "整份来源"}
                            </p>
                          </div>
                          <StatusBadge
                            status={uiStatus(source.review_status)}
                          />
                        </div>
                        {source.source_url ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <a
                              href={source.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                            >
                              打开来源
                              <ExternalLink className="size-3" />
                            </a>
                            {(source.source_type === "pdf" || /\.pdf(?:$|[?#])/i.test(source.source_url)) ? (
                              <button
                                type="button"
                                disabled={documentParsing}
                                onClick={() => void parsePdfDocument(source.id, source.source_url ?? undefined)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-ai-border bg-ai-soft px-2 text-[10px] font-semibold text-ai disabled:opacity-60"
                              >
                                <FileText className="size-3" />
                                参数识别
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-2 text-[10px] text-warning">
                            来源链接待补充
                          </p>
                        )}
                      </article>
                    ))
                  ) : (
                    <p className="rounded-lg bg-surfaceSubtle p-4 text-[12px] text-textMuted">
                      暂无独立来源证据。
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section id="document-differences" className="scroll-mt-14 overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
              <div className="border-b border-borderSoft px-4 py-3">
                <ModuleHeader
                  icon={ClipboardCheck}
                  title="PDF 参数差异审核"
                  subtitle="AI 候选值与正式参数隔离保存，人工确认后才写入设备档案"
                  density="compact"
                  action={latestDocumentJob ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge status={latestDocumentJob.status === "completed" ? "confirmed" : latestDocumentJob.status === "failed" ? "rejected" : "pending"} />
                      <span className="text-[10px] text-textMuted">{pendingDocumentCandidates.length} 项待确认</span>
                    </div>
                  ) : null}
                />
              </div>
              {latestDocumentJob ? (
                <div className="space-y-3 p-4">
                  <div className="grid gap-2 rounded-lg border border-borderSoft bg-surfaceSubtle p-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      ["解析文档", latestDocumentJob.file_name || "PDF 技术文档"],
                      ["页数", latestDocumentJob.page_count ? `${latestDocumentJob.page_count} 页` : "识别中"],
                      ["候选参数", `${latestDocumentJob.parameter_count} 项`],
                      ["模型", latestDocumentJob.model || "等待执行"],
                      ["完成时间", latestDocumentJob.completed_at ? new Date(latestDocumentJob.completed_at).toLocaleString("zh-CN") : `${latestDocumentJob.progress}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <p className="text-[10px] text-textMuted">{label}</p>
                        <p className="mt-1 truncate text-[11px] font-semibold text-textMain" title={value}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {latestDocumentJob.error_message ? (
                    <p className="rounded-lg border border-danger/20 bg-danger-soft p-3 text-[11px] text-danger">{latestDocumentJob.error_message}</p>
                  ) : null}
                  {documentCandidates.length ? (
                    <div className="grid gap-3 xl:grid-cols-2">
                      {documentCandidates.map((candidate) => {
                        const sourceBase = candidate.source_url.startsWith("storage://")
                          ? `/api/equipment-catalog/${encodeURIComponent(record.id)}/documents/${encodeURIComponent(candidate.job_id)}/file`
                          : candidate.source_url;
                        const sourceHref = `${sourceBase}${sourceBase.includes("#") ? "&" : "#"}page=${candidate.source_page}`;
                        return (
                          <article key={candidate.id} className={`min-w-0 rounded-lg border p-3 ${candidate.review_decision === "pending" ? "border-warning/30 bg-warning-soft/20" : candidate.review_decision === "accepted" ? "border-success/25 bg-success-soft/20" : "border-borderSoft bg-surfaceSubtle/55"}`}>
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <h3 className="text-[12px] font-semibold text-textMain">{candidate.parameter_name}</h3>
                                  <span className="rounded-pill bg-ai-soft px-1.5 py-0.5 text-[9px] font-semibold text-ai">{candidate.difference_type === "new" ? "新增" : candidate.difference_type === "changed" ? "有差异" : candidate.difference_type === "conflict" ? "冲突" : "一致"}</span>
                                </div>
                                <p className="mt-1 text-[10px] text-textMuted">{candidate.parameter_group} · 第 {candidate.source_page} 页</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <ConfidenceBadge level={confidenceLevel(candidate.confidence)} label={`${Math.round(candidate.confidence)}%`} />
                                <RiskBadge level={candidate.risk_level} />
                              </div>
                            </div>
                            <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-2">
                              <div className="min-w-0 rounded-md border border-borderSoft bg-white p-2">
                                <p className="text-[9px] text-textMuted">当前正式值</p>
                                <p className="mt-1 break-words text-[12px] font-semibold text-textSecondary">{candidate.current_value || "尚未建立"}{candidate.current_unit ? ` ${candidate.current_unit}` : ""}</p>
                              </div>
                              <span className="text-center text-[12px] font-bold text-ai">→</span>
                              <div className="min-w-0 rounded-md border border-ai-border bg-ai-soft/55 p-2">
                                <p className="text-[9px] text-ai">PDF 候选值</p>
                                <p className="mt-1 break-words text-[12px] font-bold text-ai">{candidate.proposed_value}{candidate.proposed_unit ? ` ${candidate.proposed_unit}` : ""}</p>
                              </div>
                            </div>
                            <div className="mt-2 rounded-md border border-borderSoft bg-white p-2.5">
                              <p className="text-[9px] font-semibold text-textMuted">原文证据</p>
                              <p className="mt-1 line-clamp-3 break-words text-[10px] leading-4 text-textSecondary">{candidate.source_text || "PDF 原文片段待模型返回"}</p>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <a href={sourceHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                                  定位第 {candidate.source_page} 页 <ExternalLink className="size-3" />
                                </a>
                                <span className="text-[9px] text-textMuted">坐标 {Math.round(Number(candidate.bounding_box?.x ?? 0) * 100)}%, {Math.round(Number(candidate.bounding_box?.y ?? 0) * 100)}%</span>
                              </div>
                            </div>
                            {candidate.review_decision === "pending" ? (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button type="button" disabled={Boolean(candidateReviewing)} onClick={() => void reviewDocumentCandidate(candidate.id, "rejected")} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-danger/25 bg-white text-[10px] font-semibold text-danger disabled:opacity-50">
                                  <XCircle className="size-3.5" /> 拒绝候选
                                </button>
                                <button type="button" disabled={Boolean(candidateReviewing)} onClick={() => void reviewDocumentCandidate(candidate.id, "accepted")} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-success text-[10px] font-semibold text-white disabled:opacity-50">
                                  {candidateReviewing === candidate.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} 接受并写入
                                </button>
                              </div>
                            ) : (
                              <p className={`mt-3 rounded-md px-2.5 py-2 text-[10px] font-semibold ${candidate.review_decision === "accepted" ? "bg-success-soft text-success" : "bg-surfaceSubtle text-textMuted"}`}>
                                {candidate.review_decision === "accepted" ? "已由人工接受并写入正式参数" : "已由人工拒绝，正式参数未变更"}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState title="尚无可审核参数" description="解析完成后，带页码和原文坐标的参数候选会显示在这里。" className="min-h-[150px] shadow-none" />
                  )}
                </div>
              ) : (
                <EmptyState
                  title="尚未解析 PDF 技术文档"
                  description="在“文档与来源证据”中选择技术样本并启动参数识别，结果不会直接覆盖设备主数据。"
                  className="m-4 min-h-[160px] shadow-none"
                />
              )}
            </section>

            <section className="overflow-hidden rounded-card border border-borderSoft bg-white shadow-card">
              <div className="border-b border-borderSoft px-4 py-3">
                <ModuleHeader
                  icon={Database}
                  title="关联价格事实"
                  subtitle="主数据描述设备，价格事实继续保留来源、日期与币种"
                  density="compact"
                />
              </div>
              {record.prices.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-left text-[12px]">
                    <thead className="h-10 bg-surfaceSubtle text-textMuted">
                      <tr>
                        <th className="px-3">价格编号</th>
                        <th className="px-3">供应商</th>
                        <th className="px-3 text-right">原始价格</th>
                        <th className="px-3">价格条件</th>
                        <th className="px-3">可信度</th>
                        <th className="px-3">风险</th>
                        <th className="px-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.prices.map((price) => (
                        <tr
                          key={price.id}
                          className="h-11 border-t border-borderSoft"
                        >
                          <td className="px-3 font-semibold text-primary">
                            {price.price_code}
                          </td>
                          <td className="px-3">
                            {Array.isArray(price.supplier)
                              ? price.supplier[0]?.name
                              : price.supplier?.name || "待核验"}
                          </td>
                          <td className="px-3 text-right font-bold">
                            {formatMoney(
                              price.original_price,
                              price.original_currency,
                            )}
                          </td>
                          <td className="px-3">{price.price_term || "-"}</td>
                          <td className="px-3">
                            <ConfidenceBadge
                              level={confidenceLevel(
                                Number(price.confidence || 0),
                              )}
                              label={`${Math.round(Number(price.confidence || 0))}%`}
                            />
                          </td>
                          <td className="px-3">
                            <RiskBadge level={price.risk_level} />
                          </td>
                          <td className="px-3">
                            <Link
                              href={`/equipment-prices/${price.id}`}
                              className="font-semibold text-primary"
                            >
                              查看价格
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="暂无关联价格"
                  description="该型号可先用于 BOQ 需求匹配，再通过询价形成价格事实。"
                  className="m-4 min-h-[170px] shadow-none"
                />
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-3">
            <section className="rounded-card border border-warning/25 bg-white p-4 shadow-card">
              <ModuleHeader
                icon={ClipboardList}
                title="审核前资料缺口"
                subtitle={`${quality?.templateLabel ?? "通用设备"}准入规则实时校验`}
                tone="orange"
                density="compact"
                action={quality?.approvalReady ? <StatusBadge status="confirmed" label="可审核通过" /> : <StatusBadge status="need_info" label="需补充" />}
              />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["身份档案", quality?.identityScore ?? 0, 35],
                  ["技术参数", quality?.parameterScore ?? 0, 50],
                  ["证据文档", quality?.evidenceScore ?? 0, 15],
                ].map(([label, value, total]) => (
                  <div key={String(label)} className="rounded-lg bg-surfaceSubtle p-2.5 text-center">
                    <p className="text-[10px] text-textMuted">{label}</p>
                    <p className="mt-1 text-[15px] font-bold text-textMain">{String(value)}<span className="text-[10px] font-medium text-textMuted">/{String(total)}</span></p>
                  </div>
                ))}
              </div>
              {quality?.missingFields.length ? (
                <div className="mt-3 space-y-1.5">
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-borderSoft bg-surfaceSubtle px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-textMuted">当前缺失原因</p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-textMain">
                        {missingReason.code === "source_missing" ? "尚未发现可核验PDF或目录" : missingReason.code === "parsing" ? "官方文档已归档，解析任务正在处理" : missingReason.code === "parse_failed" ? latestDocumentJob?.error_message || "文档解析失败，可修复配置后重试" : missingReason.code === "review_pending" ? `${pendingDocumentCandidates.length} 项PDF参数差异等待确认` : "已完成文档解析，但原文没有识别出这些字段"}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-pill px-2 py-1 text-[9px] font-semibold ${missingReason.tone}`}>{missingReason.label}</span>
                  </div>
                  {quality.missingFields.slice(0, 7).map((field) => (
                    <button type="button" onClick={() => openManualCorrection(field.key)} key={`${field.group}-${field.key}`} className="flex min-h-8 w-full items-center justify-between gap-2 rounded-md border border-borderSoft px-2.5 py-1.5 text-left transition hover:border-primary/30 hover:bg-primary-soft/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25">
                      <span className="min-w-0 truncate text-[11px] font-medium text-textSecondary">{field.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className={`rounded-pill px-2 py-0.5 text-[9px] font-semibold ${missingReason.tone}`}>{missingReason.label}</span>
                        <span className={`rounded-pill px-2 py-0.5 text-[9px] font-semibold ${field.critical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{field.critical ? "关键必填" : "建议补充"}</span>
                      </span>
                    </button>
                  ))}
                  {quality.missingFields.length > 7 ? <p className="pt-1 text-center text-[10px] text-textMuted">另有 {quality.missingFields.length - 7} 项待补充</p> : null}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-soft p-3 text-[11px] font-semibold text-success">
                  <CheckCircle2 className="size-4" />
                  当前资料已满足人工审核准入规则
                </div>
              )}
              {record.duplicate_candidates?.length ? (
                <div className="mt-3 rounded-lg border border-warning/25 bg-warning-soft p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-warning">
                    <CircleAlert className="size-4" />
                    发现 {record.duplicate_candidates.length} 条同型号候选
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {record.duplicate_candidates.slice(0, 3).map((candidate) => (
                      <Link key={candidate.id} href={`/equipment-catalog/${candidate.id}`} className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-2 text-[10px] text-textSecondary hover:text-primary">
                        <span className="min-w-0 truncate">{candidate.catalog_code} · {candidate.equipment_name}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {!quality?.approvalReady ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openManualCorrection()} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary-soft text-[11px] font-semibold text-primary">
                    <SlidersHorizontal className="size-4" />
                    人工补充
                  </button>
                  <button type="button" disabled={aiRunning} onClick={() => void runAiCompletion()} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-ai-border bg-ai-soft text-[11px] font-semibold text-ai disabled:opacity-60">
                    {aiRunning ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                    AI补全建议
                  </button>
                </div>
              ) : null}
            </section>

            <section className="rounded-card border border-ai-border bg-ai-soft/55 p-4 shadow-card">
              <ModuleHeader
                icon={Bot}
                title="AI资料质量判断"
                subtitle="AI只辅助判断，最终由人工审核"
                tone="purple"
                density="compact"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-[10px] text-textMuted">AI置信度</p>
                  <p className="mt-1 text-[20px] font-bold text-ai">
                    {Math.round(record.ai_confidence)}%
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-[10px] text-textMuted">资料完整度</p>
                  <p className="mt-1 text-[20px] font-bold text-success">
                    {quality?.score ?? 0}%
                  </p>
                </div>
              </div>
              <p className="mt-3 rounded-lg border border-ai-border bg-white p-3 text-[12px] leading-5 text-textSecondary">
                {quality?.approvalReady
                  ? "型号与参数资料较完整，可进入 BOQ 候选召回；兼容性与供应商准入仍需人工确认。"
                  : "来源或关键参数仍不完整，建议补证后再用于自动套价。"}
              </p>
            </section>

            <section className="rounded-card border border-primary/15 bg-white p-4 shadow-card">
              <ModuleHeader
                icon={Workflow}
                title="采集与识别追溯"
                subtitle="候选资料、运行批次与原始来源保持可追溯"
                density="compact"
              />
              <div className="mt-3 space-y-2 text-[11px]">
                {[
                  [
                    "资料形成方式",
                    record.ai_extracted
                      ? "采集器结构化识别"
                      : "人工建立 / 历史数据",
                  ],
                  [
                    "识别时间",
                    record.extracted_at
                      ? new Date(record.extracted_at).toLocaleString("zh-CN")
                      : "--",
                  ],
                  ["采集任务", record.collection_task_id ? "已关联" : "未关联"],
                  ["运行批次", record.collection_run_id ? "已记录" : "未记录"],
                ].map(([label, value]) => (
                  <p
                    key={label}
                    className="flex items-start justify-between gap-3 border-b border-borderSoft pb-2 last:border-0"
                  >
                    <span className="shrink-0 text-textMuted">{label}</span>
                    <strong className="break-all text-right text-textMain">
                      {value}
                    </strong>
                  </p>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                {record.collection_task_id ? (
                  <Link
                    href={`/equipment-catalog/collection/tasks/${encodeURIComponent(record.collection_task_id)}`}
                    className="flex h-9 items-center justify-between rounded-md border border-primary/20 bg-primary-soft px-3 text-[12px] font-semibold text-primary"
                  >
                    查看采集任务
                    <ExternalLink className="size-3.5" />
                  </Link>
                ) : null}
                {record.source_url ? (
                  <a
                    href={record.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-9 items-center justify-between gap-2 rounded-md border border-borderSoft px-3 py-2 text-[12px] font-semibold text-textSecondary"
                  >
                    <span className="min-w-0 truncate">打开原始产品页</span>
                    <ExternalLink className="size-3.5 shrink-0" />
                  </a>
                ) : null}
              </div>
              <p className="mt-3 rounded-lg bg-surfaceSubtle p-3 text-[10px] leading-4 text-textMuted">
                原始值、标准化值、单位、置信度和审核状态按参数逐项保存，因此泵、阀门、仪表、电气及水处理设备可复用同一详情页。
              </p>
            </section>

            <section
              id="human-review"
              className="scroll-mt-20 rounded-card border border-warning/25 bg-white p-4 shadow-card"
            >
              <ModuleHeader
                icon={ClipboardCheck}
                title="人工审核"
                subtitle="审核决定将写入真实记录与审计日志"
                tone="orange"
                density="compact"
                action={<StatusBadge status={uiStatus(record.review_status)} />}
              />
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="填写审核意见、退回原因或需补充的证据……"
                className="mt-3 min-h-28 w-full resize-y rounded-md border border-borderSoft p-3 text-[12px] outline-none focus:border-primary"
              />
              {!quality?.approvalReady ? (
                <div className="mt-2 rounded-md border border-warning/25 bg-warning-soft p-2.5 text-[10px] leading-4 text-textSecondary">
                  当前完整度 {quality?.score ?? 0}%，且仍有 {criticalMissing.length} 项关键字段缺失。请先补充资料或提交复核，审核通过按钮将在满足准入规则后启用。
                </div>
              ) : null}
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  disabled={Boolean(reviewing) || !quality?.approvalReady}
                  title={quality?.approvalReady ? "确认设备资料并写入审核记录" : "资料尚未满足审核准入规则"}
                  onClick={() => void review("approved")}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-success px-3 text-[12px] font-semibold text-white disabled:opacity-60"
                >
                  {reviewing === "approved" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  审核通过
                </button>
                <button
                  type="button"
                  disabled={Boolean(reviewing)}
                  onClick={() => void review("pending_review")}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 text-[12px] font-semibold text-warning disabled:opacity-60"
                >
                  <CircleAlert className="size-4" />
                  提交复核
                </button>
                <button
                  type="button"
                  disabled={Boolean(reviewing)}
                  onClick={() => void review("rejected")}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-danger/25 bg-danger-soft px-3 text-[12px] font-semibold text-danger disabled:opacity-60"
                >
                  <XCircle className="size-4" />
                  退回补充
                </button>
              </div>
            </section>

            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <ModuleHeader
                icon={History}
                title="审核记录"
                subtitle={`最近 ${record.reviews.length} 条人工决定`}
                density="compact"
              />
              <div className="mt-3 space-y-2">
                {record.reviews.length ? (
                  record.reviews.slice(0, 8).map((reviewItem) => (
                    <article
                      key={reviewItem.id}
                      className="border-l-2 border-primary/30 pl-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={uiStatus(reviewItem.decision)} />
                        <time className="text-[10px] text-textMuted">
                          {new Date(reviewItem.reviewed_at).toLocaleString(
                            "zh-CN",
                          )}
                        </time>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-textSecondary">
                        {reviewItem.notes || "未填写审核备注"}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg bg-surfaceSubtle p-3 text-[12px] text-textMuted">
                    暂无人工审核记录。
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-card border border-borderSoft bg-white p-4 shadow-card">
              <ModuleHeader
                icon={Link2}
                title="后续业务"
                subtitle="目录不是价格，必须继续进入业务流程"
                density="compact"
              />
              <div className="mt-3 space-y-2">
                <Link
                  href={`/equipment-prices?catalogId=${record.id}`}
                  className="flex h-9 items-center justify-between rounded-md border border-borderSoft px-3 text-[12px] font-semibold text-primary"
                >
                  查看型号价格
                  <ExternalLink className="size-3.5" />
                </Link>
                <Link
                  href={`/inquiries/create?catalogId=${record.id}`}
                  className="flex h-9 items-center justify-between rounded-md border border-ai-border bg-ai-soft px-3 text-[12px] font-semibold text-ai"
                >
                  发起供应商询价
                  <ExternalLink className="size-3.5" />
                </Link>
                <Link
                  href={`/project-pricing/boq-parse?source=equipment-catalog&catalogId=${record.id}`}
                  className="flex h-9 items-center justify-between rounded-md border border-borderSoft bg-white px-3 text-[12px] font-semibold text-textSecondary"
                >
                  BOQ 智能匹配
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
      {manualDialogOpen && quality ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="人工修正设备资料">
          <section className="w-full max-w-xl overflow-hidden rounded-card border border-borderSoft bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><SlidersHorizontal className="size-5" /></span>
                <div>
                  <h2 className="text-[16px] font-bold text-textMain">人工补充与修正资料</h2>
                  <p className="mt-1 text-[11px] text-textMuted">修正值写入真实设备档案，并自动重新计算完整度。</p>
                </div>
              </div>
              <button type="button" onClick={() => setManualDialogOpen(false)} className="inline-flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-surfaceSubtle" title="关闭"><X className="size-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="text-[11px] font-semibold text-textSecondary">待补字段</span>
                <select value={manualFieldKey} onChange={(event) => setManualFieldKey(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft bg-white px-3 text-[12px] outline-none focus:border-primary">
                  {quality.missingFields.map((field) => <option key={`${field.group}-${field.key}`} value={field.key}>{field.label}{field.critical ? "（关键必填）" : ""}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                <label className="block">
                  <span className="text-[11px] font-semibold text-textSecondary">修正值</span>
                  <input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder={manualField?.group === "evidence" ? "请输入完整 https:// 来源地址" : `请输入${manualField?.label ?? "字段"}`} className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-textSecondary">单位</span>
                  <input value={manualUnit} onChange={(event) => setManualUnit(event.target.value)} disabled={manualField?.group === "identity" || manualField?.group === "evidence"} placeholder="如 m3/h" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary disabled:bg-surfaceSubtle disabled:text-textMuted" />
                </label>
              </div>
              {manualField?.group !== "identity" && manualField?.group !== "evidence" ? (
                <label className="block">
                  <span className="text-[11px] font-semibold text-textSecondary">字段证据网址</span>
                  <input value={manualSourceUrl} onChange={(event) => setManualSourceUrl(event.target.value)} placeholder="产品页、技术样本或原始附件地址" className="mt-1.5 h-10 w-full rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary" />
                </label>
              ) : null}
              <div className="rounded-lg border border-warning/25 bg-warning-soft p-3 text-[11px] leading-5 text-textSecondary">
                人工修正不会直接将资料标记为合格；保存后状态回到待审核，审核通过仍受类别参数和来源证据准入规则约束。
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-borderSoft px-5 py-4">
              <button type="button" onClick={() => setManualDialogOpen(false)} className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold text-textSecondary">取消</button>
              <button type="button" disabled={manualSaving || !manualValue.trim()} onClick={() => void saveManualCorrection()} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-white disabled:opacity-50">
                {manualSaving ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                保存并重新评估
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {imagePreviewOpen && displayImageUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${record.equipment_name}产品图片大图预览`}
          onClick={() => setImagePreviewOpen(false)}
        >
          <div
            className="relative h-[82vh] w-[min(92vw,1180px)] overflow-hidden rounded-card border border-white/20 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              role="img"
              aria-label={`${record.equipment_name}产品图片大图`}
              className="h-full w-full bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${displayImageUrl})`,
                backgroundSize: capturedImageUrl && !primaryImage ? "165% auto" : "contain",
              }}
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-slate-950/70 to-transparent px-4 py-3 text-white">
              <div>
                <p className="text-sm font-semibold">{record.equipment_name}</p>
                <p className="mt-0.5 text-[11px] text-white/75">{record.brand} · {record.model}</p>
              </div>
              <button type="button" onClick={() => setImagePreviewOpen(false)} className="flex size-9 items-center justify-center rounded-md border border-white/25 bg-slate-950/30" aria-label="关闭图片预览">
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {imageDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="上传设备产品图片"
        >
          <section className="w-full max-w-lg overflow-hidden rounded-card border border-borderSoft bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-borderSoft px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <FileImage className="size-5" />
                </span>
                <div>
                  <h2 className="text-[16px] font-bold text-textMain">
                    上传设备产品图片
                  </h2>
                  <p className="mt-1 text-[11px] text-textMuted">
                    真实写入 Supabase Storage，上传后仍需人工核验来源与型号。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImageDialogOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-md text-textMuted hover:bg-surfaceSubtle"
                title="关闭"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary/35 bg-primary-soft/45 p-4 text-center">
                <UploadCloud className="size-9 text-primary" />
                <span className="mt-2 max-w-full truncate text-[13px] font-semibold text-primary">
                  {imageFile?.name || "选择 JPG、PNG 或 WEBP 图片"}
                </span>
                <span className="mt-1 text-[10px] text-textMuted">
                  单张不超过 8 MB，建议使用白底正视产品图
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-textSecondary">
                  图片来源网址（建议填写）
                </span>
                <input
                  value={imageSourceUrl}
                  onChange={(event) => setImageSourceUrl(event.target.value)}
                  placeholder="厂商官网、产品目录或供应商文件来源"
                  className="mt-1.5 h-9 w-full rounded-md border border-borderSoft px-3 text-[12px] outline-none focus:border-primary"
                />
              </label>
              <div className="rounded-lg border border-warning/25 bg-warning-soft p-3 text-[11px] leading-5 text-textSecondary">
                <strong className="text-warning">证据规则：</strong>
                网络图片必须保留来源；AI生成图只能标记为示意图，不能作为型号、品牌或供应能力的确认依据。
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-borderSoft px-5 py-4">
              <button
                type="button"
                onClick={() => setImageDialogOpen(false)}
                className="h-9 rounded-md border border-borderSoft px-4 text-[12px] font-semibold text-textSecondary"
              >
                取消
              </button>
              <button
                type="button"
                disabled={uploadingImage || !imageFile}
                onClick={() => void uploadImage()}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {uploadingImage ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <UploadCloud className="size-4" />
                )}
                {uploadingImage ? "上传并登记中" : "上传并归档"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </AppLayout>
  );
}
