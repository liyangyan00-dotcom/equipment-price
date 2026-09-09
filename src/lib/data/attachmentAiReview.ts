import type { getApiAccess } from "@/lib/auth/apiAccess";
import type { AttachmentDatabaseRow } from "@/lib/data/attachmentEvidenceRepository";

type ApiAccess = Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>;

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function runAttachmentAiReview(access: ApiAccess, row: AttachmentDatabaseRow) {
  const metadata = objectValue(row.metadata);
  const legacyMigration = metadata.migrated_from === "legacy-mock";
  const confidence = legacyMigration ? 58 : row.checksum ? 88 : 72;
  const riskLevel = legacyMigration || !row.related_id ? "high" : row.valid_until ? "low" : "medium";
  const now = new Date().toISOString();
  const output = {
    confidence,
    risk_level: riskLevel,
    summary: legacyMigration
      ? "规则引擎确认该记录来自旧数据迁移，当前文件不能替代原始业务证据。"
      : "规则引擎已核验文件指纹、业务关联和有效期，结果等待人工审核。",
    recommended_action: legacyMigration
      ? "补传原始文件、完成业务关联并重新预审"
      : "复核业务对象、来源、文件日期和有效期后提交人工审核",
    extracted_fields: objectValue(metadata.ai_result).extracted_fields ?? [],
  };

  const run = await access.supabase.from("wpi_attachment_ai_runs").insert({
    organization_id: access.organizationId,
    attachment_id: row.id,
    status: "needs_review",
    provider: "rules-engine",
    model: "attachment-evidence-v2",
    input_snapshot: {
      evidenceVersion: row.evidence_version,
      contentType: row.content_type,
      hasChecksum: Boolean(row.checksum),
      hasRelation: Boolean(row.related_id),
      legacyMigration,
    },
    output_payload: output,
    confidence,
    risk_level: riskLevel,
    requires_human_review: true,
    requested_by: access.userId,
    started_at: now,
    completed_at: now,
  }).select("id").single();
  if (run.error) throw new Error(run.error.message);

  const updated = await access.supabase.from("wpi_attachments").update({
    ai_status: "needs_review",
    ai_confidence: confidence,
    ai_risk_level: riskLevel,
    ai_analyzed_at: now,
    review_state: "pending_review",
    verification_status: "pending",
    verified_by: null,
    verified_at: null,
    review_due_at: row.review_due_at ?? new Date(Date.now() + 2 * 86400000).toISOString(),
    updated_at: now,
  }).eq("organization_id", access.organizationId).eq("id", row.id).eq("evidence_version", row.evidence_version).select("id").single();
  if (updated.error) throw new Error(updated.error.message);

  const issueLabels = [
    !row.related_id ? { label: "尚未关联业务对象", severity: "high" } : null,
    !row.checksum ? { label: "缺少文件完整性指纹", severity: "medium" } : null,
    legacyMigration ? { label: "旧数据迁移记录缺少原始文件", severity: "high" } : null,
  ].filter((item): item is { label: string; severity: string } => Boolean(item));

  if (issueLabels.length) {
    const existing = await access.supabase.from("wpi_attachment_issues")
      .select("label")
      .eq("organization_id", access.organizationId)
      .eq("attachment_id", row.id)
      .eq("status", "open");
    if (existing.error) throw new Error(existing.error.message);
    const existingLabels = new Set((existing.data ?? []).map((issue) => issue.label));
    const missing = issueLabels.filter((issue) => !existingLabels.has(issue.label));
    if (missing.length) {
      const inserted = await access.supabase.from("wpi_attachment_issues").insert(missing.map((issue) => ({
        organization_id: access.organizationId,
        attachment_id: row.id,
        label: issue.label,
        severity: issue.severity,
        status: "open",
        created_by: access.userId,
      })));
      if (inserted.error) throw new Error(inserted.error.message);
    }
  }

  return { confidence, riskLevel, output, runId: run.data.id };
}
