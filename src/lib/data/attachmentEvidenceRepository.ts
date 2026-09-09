import type { getApiAccess } from "@/lib/auth/apiAccess";
import type { AttachmentEvidenceDetail } from "@/types/attachmentEvidence";
import type { RiskLevel } from "@/types/common";

type ApiAccess = Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>;

export type AttachmentDatabaseRow = {
  id: string;
  attachment_code: string | null;
  organization_id: string;
  bucket_id: string;
  object_path: string;
  original_name: string;
  content_type: string | null;
  size_bytes: number | null;
  related_type: string | null;
  related_id: string | null;
  evidence_type: string;
  checksum: string | null;
  evidence_version: number;
  status: string;
  verification_status: string;
  review_state: "pending_ai" | "pending_review" | "need_info" | "confirmed" | "rejected" | "voided";
  ai_status: "not_run" | "running" | "needs_review" | "completed" | "failed";
  ai_confidence: number | null;
  ai_risk_level: RiskLevel | null;
  ai_analyzed_at: string | null;
  assigned_reviewer_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  review_due_at: string | null;
  duplicate_of_attachment_id: string | null;
  governance_flags: string[];
  description: string | null;
  document_date: string | null;
  valid_until: string | null;
  metadata: Record<string, unknown> | null;
  uploaded_by: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export const attachmentSelect = [
  "id",
  "attachment_code",
  "organization_id",
  "bucket_id",
  "object_path",
  "original_name",
  "content_type",
  "size_bytes",
  "related_type",
  "related_id",
  "evidence_type",
  "checksum",
  "evidence_version",
  "status",
  "verification_status",
  "review_state",
  "ai_status",
  "ai_confidence",
  "ai_risk_level",
  "ai_analyzed_at",
  "assigned_reviewer_id",
  "assigned_by",
  "assigned_at",
  "review_due_at",
  "duplicate_of_attachment_id",
  "governance_flags",
  "description",
  "document_date",
  "valid_until",
  "metadata",
  "uploaded_by",
  "verified_by",
  "verified_at",
  "created_at",
  "updated_at",
].join(",");

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatBytes(value: number | null) {
  if (!value) return "0 KB";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function fileKind(contentType: string | null, name: string) {
  const value = `${contentType ?? ""} ${name}`.toLowerCase();
  if (value.includes("spreadsheet") || value.endsWith(".xlsx") || value.endsWith(".xls")) return "sheet";
  if (value.includes("message/") || value.endsWith(".eml")) return "mail";
  if (value.includes("image/") || /\.(png|jpe?g|webp)$/i.test(name)) return "image";
  return "pdf";
}

function fileTypeLabel(contentType: string | null, name: string) {
  const kind = fileKind(contentType, name);
  if (kind === "sheet") return "价格明细 (XLSX)";
  if (kind === "mail") return "邮件记录 (EML)";
  if (kind === "image") return "图片证据";
  if ((contentType ?? "").includes("text/plain")) return "迁移说明 (TXT)";
  return "报价证据 (PDF)";
}

function confidenceLevel(score: number) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

function riskLevel(value: unknown): RiskLevel {
  return value === "low" || value === "medium" || value === "high" || value === "critical" ? value : "medium";
}

function reviewStatus(row: AttachmentDatabaseRow) {
  if (row.review_state === "confirmed") return "confirmed";
  if (row.review_state === "rejected") return "rejected";
  if (row.review_state === "voided") return "voided";
  if (row.review_state === "need_info") return "need_info";
  return "pending";
}

function auditLabel(action: string) {
  const labels: Record<string, string> = {
    insert: "创建证据记录",
    update: "更新证据记录",
    delete: "删除证据记录",
    "evidence.preview": "预览原始文件",
    "evidence.download": "下载原始文件",
    "evidence.export": "导出证据清单",
  };
  return labels[action] ?? action;
}

export async function findAttachment(access: ApiAccess, id: string) {
  const query = () => access.supabase
    .from("wpi_attachments")
    .select(attachmentSelect)
    .eq("organization_id", access.organizationId);

  const result = isUuid(id)
    ? await query().eq("id", id).maybeSingle()
    : await query().eq("attachment_code", id).maybeSingle();

  return {
    data: result.data as AttachmentDatabaseRow | null,
    error: result.error,
  };
}

async function relationDetails(access: ApiAccess, row: AttachmentDatabaseRow) {
  const metadata = objectValue(row.metadata);
  const fallbackObject = stringValue(metadata.object_label, "待确认业务对象");
  const fallbackCode = stringValue(metadata.price_code, "-");
  if (!row.related_id || !row.related_type) return { object: fallbackObject, code: fallbackCode, href: undefined as string | undefined };

  if (row.related_type === "equipment_price") {
    const result = await access.supabase.from("wpi_equipment_prices")
      .select("price_code,equipment_name")
      .eq("organization_id", access.organizationId)
      .eq("id", row.related_id)
      .maybeSingle();
    if (result.data) return { object: result.data.equipment_name, code: result.data.price_code, href: `/equipment-prices/${result.data.price_code}` };
  }
  if (row.related_type === "material_price") {
    const result = await access.supabase.from("wpi_material_prices")
      .select("price_code,material_name")
      .eq("organization_id", access.organizationId)
      .eq("id", row.related_id)
      .maybeSingle();
    if (result.data) return { object: result.data.material_name, code: result.data.price_code, href: `/material-prices/${result.data.price_code}` };
  }
  if (row.related_type === "inquiry") {
    const result = await access.supabase.from("wpi_inquiries")
      .select("inquiry_code,subject").eq("organization_id", access.organizationId).eq("id", row.related_id).maybeSingle();
    if (result.data) return { object: result.data.subject, code: result.data.inquiry_code, href: `/inquiries/${row.related_id}` };
  }
  if (row.related_type === "project") {
    const result = await access.supabase.from("wpi_projects")
      .select("project_code,name").eq("organization_id", access.organizationId).eq("id", row.related_id).maybeSingle();
    if (result.data) return { object: result.data.name, code: result.data.project_code, href: `/project-pricing/${row.related_id}` };
  }
  if (row.related_type === "report") {
    const result = await access.supabase.from("wpi_reports")
      .select("report_code,title").eq("organization_id", access.organizationId).eq("id", row.related_id).maybeSingle();
    if (result.data) return { object: result.data.title, code: result.data.report_code, href: `/reports/${row.related_id}` };
  }
  return { object: fallbackObject, code: fallbackCode, href: undefined as string | undefined };
}

export async function readAttachmentDetail(access: ApiAccess, row: AttachmentDatabaseRow): Promise<AttachmentEvidenceDetail> {
  const [tagsResult, issuesResult, reviewsResult, aiRunsResult, auditsResult, relation] = await Promise.all([
    access.supabase.from("wpi_attachment_tags").select("id,name,created_at").eq("attachment_id", row.id).order("created_at"),
    access.supabase.from("wpi_attachment_issues").select("id,label,severity,status,resolution_notes,resolved_at,created_at").eq("attachment_id", row.id).order("created_at"),
    access.supabase.from("wpi_attachment_reviews").select("id,decision,notes,reviewer_id,created_at").eq("attachment_id", row.id).order("created_at", { ascending: false }).limit(20),
    access.supabase.from("wpi_attachment_ai_runs").select("id,status,provider,model,output_payload,confidence,risk_level,created_at,completed_at").eq("attachment_id", row.id).order("created_at", { ascending: false }).limit(10),
    access.supabase.from("wpi_audit_logs").select("id,actor_id,action,table_name,record_id,old_data,new_data,created_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
    relationDetails(access, row),
  ]);

  const fatalError = tagsResult.error || issuesResult.error || reviewsResult.error || aiRunsResult.error;
  if (fatalError) throw new Error(fatalError.message);

  const metadata = objectValue(row.metadata);
  const latestAi = aiRunsResult.data?.[0];
  const aiOutput = objectValue(latestAi?.output_payload ?? metadata.ai_result);
  const confidenceScore = numberValue(latestAi?.confidence ?? aiOutput.confidence, row.verification_status === "verified" ? 96 : 76);
  const risk = riskLevel(latestAi?.risk_level ?? aiOutput.risk_level ?? (row.verification_status === "rejected" ? "high" : "medium"));
  const extracted = Array.isArray(aiOutput.extracted_fields)
    ? aiOutput.extracted_fields.map((field) => {
        const item = objectValue(field);
        return { label: stringValue(item.label, "未命名字段"), value: stringValue(item.value, "-"), confidence: numberValue(item.confidence, 50) };
      })
    : [
        { label: "证据对象", value: relation.object, confidence: confidenceScore },
        { label: "供应商", value: stringValue(metadata.supplier_name, "待核验供应商"), confidence: Math.max(45, confidenceScore - 5) },
        { label: "来源类型", value: stringValue(metadata.source_label, row.description ?? "Storage 上传"), confidence: Math.max(50, confidenceScore - 2) },
        { label: "关联价格编号", value: relation.code, confidence: relation.code === "-" ? 35 : 96 },
        { label: "文件日期", value: row.document_date ?? row.created_at.slice(0, 10), confidence: 99 },
      ];

  const childIds = new Set<string>([
    row.id,
    ...(tagsResult.data ?? []).map((item) => item.id),
    ...(issuesResult.data ?? []).map((item) => item.id),
    ...(reviewsResult.data ?? []).map((item) => item.id),
    ...(aiRunsResult.data ?? []).map((item) => item.id),
  ]);
  const auditRows = auditsResult.error ? [] : (auditsResult.data ?? []).filter((item) => {
    if (item.record_id && childIds.has(item.record_id)) return true;
    const newData = objectValue(item.new_data);
    const oldData = objectValue(item.old_data);
    return newData.attachment_id === row.id || oldData.attachment_id === row.id;
  });

  const auditTrail = [
    ...auditRows.map((item) => ({
      time: item.created_at,
      actor: item.actor_id === access.userId ? "当前用户" : "组织成员",
      action: auditLabel(item.action),
      detail: item.table_name === "wpi_attachments" ? row.original_name : `证据治理记录：${item.table_name}`,
    })),
    ...(reviewsResult.data ?? []).map((item) => ({
      time: item.created_at,
      actor: item.reviewer_id === access.userId ? "当前用户" : "审核员",
      action: `人工审核：${item.decision}`,
      detail: item.notes || "未填写审核意见",
    })),
  ].sort((left, right) => Date.parse(right.time) - Date.parse(left.time));

  return {
    id: row.attachment_code ?? row.id,
    databaseId: row.id,
    name: row.original_name,
    size: formatBytes(row.size_bytes),
    type: fileTypeLabel(row.content_type, row.original_name),
    object: relation.object,
    priceId: relation.code,
    supplier: stringValue(metadata.supplier_name, "待核验供应商"),
    source: stringValue(metadata.source_label, row.description ?? "Supabase Storage"),
    uploader: row.uploaded_by === access.userId ? "当前用户" : "组织成员",
    uploadedAt: row.created_at,
    status: row.status === "archived" ? "unlinked" : row.verification_status === "verified" ? "linked" : "pending",
    fileKind: fileKind(row.content_type, row.original_name) as AttachmentEvidenceDetail["fileKind"],
    mimeType: row.content_type ?? "application/octet-stream",
    checksum: row.checksum ?? "等待校验",
    storageBucket: row.bucket_id,
    objectPath: row.object_path,
    documentDate: row.document_date ?? row.created_at.slice(0, 10),
    validUntil: row.valid_until ?? "待补充",
    confidence: confidenceLevel(confidenceScore),
    confidenceScore,
    risk,
    reviewStatus: reviewStatus(row) as AttachmentEvidenceDetail["reviewStatus"],
    aiSummary: stringValue(aiOutput.summary, "尚未执行证据预审，请运行 AI 证据分析并由人工确认。"),
    recommendedAction: stringValue(aiOutput.recommended_action, "运行证据预审并核对来源、关联对象和有效期"),
    archiveTags: (tagsResult.data ?? []).map((item) => ({ id: item.id, name: item.name })),
    extractedFields: extracted,
    issues: (issuesResult.data ?? []).map((item) => ({ id: item.id, label: item.label, severity: item.severity, status: item.status, resolutionNotes: item.resolution_notes })),
    relations: [
      { label: "关联业务对象", value: relation.object, href: relation.href },
      { label: "关联价格编号", value: relation.code, href: relation.href },
      { label: "关联供应商", value: stringValue(metadata.supplier_name, "待核验供应商") },
      { label: "Storage 对象", value: `${row.bucket_id}/${row.object_path}` },
    ],
    auditTrail,
    aiRuns: aiRunsResult.data ?? [],
    reviews: reviewsResult.data ?? [],
    sourceSystem: "supabase",
  };
}

export async function getAttachmentDetail(access: ApiAccess, id: string) {
  const result = await findAttachment(access, id);
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;
  return readAttachmentDetail(access, result.data);
}
