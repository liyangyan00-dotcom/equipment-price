import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";
import { resolveAttachmentDetail } from "@/data/mock/attachments";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor"]);

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)").replace(/[^\x20-\x7E]/g, "?");
}

function migrationPdf(lines: string[]) {
  const stream = `BT\n/F1 12 Tf\n72 730 Td\n${lines.map((line, index) => `${index ? "0 -20 Td\n" : ""}(${escapePdfText(line)}) Tj`).join("\n")}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(output).length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = new TextEncoder().encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(output);
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function resolveRelation(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  priceId: string,
) {
  if (!priceId || priceId === "-") return { relatedType: null, relatedId: null };
  for (const target of [
    { table: "wpi_equipment_prices", type: "equipment_price" },
    { table: "wpi_material_prices", type: "material_price" },
  ] as const) {
    let query = await access.supabase.from(target.table).select("id").eq("organization_id", access.organizationId).eq("price_code", priceId).maybeSingle();
    if (!query.data && !query.error) query = await access.supabase.from(target.table).select("id").eq("organization_id", access.organizationId).eq("legacy_id", priceId).maybeSingle();
    if (query.data) return { relatedType: target.type, relatedId: query.data.id as string };
  }
  return { relatedType: null, relatedId: null };
}

export async function POST(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有旧附件迁移权限" }, { status: 403 });

  const { id: rawId } = await context.params;
  const id = decodeURIComponent(rawId);
  const existing = await findAttachment(access, id);
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (existing.data) return NextResponse.json({ data: await readAttachmentDetail(access, existing.data), source: "supabase" });

  const legacy = resolveAttachmentDetail(id);
  if (!legacy || !/^ATT-/i.test(id)) return NextResponse.json({ error: "没有可迁移的旧附件记录" }, { status: 404 });

  const fileName = `migration-manifest-${id}.pdf`;
  const bytes = migrationPdf([
    "WPI LEGACY ATTACHMENT MIGRATION MANIFEST",
    `Attachment code: ${id}`,
    `Legacy file name: ${legacy.name}`,
    `Related object: ${legacy.object}`,
    `Imported at: ${new Date().toISOString()}`,
    "The original business file was not present in the legacy mock dataset.",
    "This manifest is not the original source document and requires human review.",
  ]);
  const objectPath = `${access.organizationId}/attachment-evidence/${id}/${crypto.randomUUID()}-${fileName}`;
  const uploaded = await access.supabase.storage.from("business-documents").upload(objectPath, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploaded.error) return NextResponse.json({ error: `Storage 迁移失败：${uploaded.error.message}` }, { status: 500 });

  const relation = await resolveRelation(access, legacy.priceId);
  const metadata = {
    migrated_from: "legacy-mock",
    legacy_original_name: legacy.name,
    object_label: legacy.object,
    price_code: legacy.priceId,
    supplier_name: legacy.supplier,
    source_label: legacy.source,
    migration_notice: "原始业务文件不在旧 Mock 数据中，Storage 内保存的是迁移说明文件，必须补传原件后人工确认。",
    ai_result: {
      confidence: legacy.confidence === "A" ? 65 : legacy.confidence === "B" ? 58 : 50,
      risk_level: "high",
      summary: "旧 Mock 元数据已迁移，但缺少原始业务文件，当前记录不得作为最终价格证据。",
      recommended_action: "补传原始文件，核验来源、有效期与关联对象后再提交人工确认",
      extracted_fields: legacy.extractedFields,
    },
  };
  const inserted = await access.supabase.from("wpi_attachments").insert({
    organization_id: access.organizationId,
    attachment_code: id,
    bucket_id: "business-documents",
    object_path: objectPath,
    original_name: fileName,
    content_type: "application/pdf",
    size_bytes: bytes.byteLength,
    related_type: relation.relatedType,
    related_id: relation.relatedId,
    evidence_type: "other",
    checksum: await sha256(bytes),
    uploaded_by: access.userId,
    status: "active",
    verification_status: "pending",
    description: `旧附件 ${legacy.name} 的迁移说明`,
    document_date: legacy.documentDate,
    valid_until: null,
    metadata,
  }).select("id").single();

  if (inserted.error || !inserted.data) {
    await access.supabase.storage.from("business-documents").remove([objectPath]);
    return NextResponse.json({ error: inserted.error?.message ?? "附件迁移记录创建失败" }, { status: 500 });
  }

  const attachmentId = inserted.data.id as string;
  const tags = Array.from(new Set([...legacy.archiveTags, "旧Mock迁移", "待补原件"]));
  const tagResult = await access.supabase.from("wpi_attachment_tags").insert(tags.map((name) => ({
    organization_id: access.organizationId,
    attachment_id: attachmentId,
    name,
    created_by: access.userId,
  })));
  const issueRows = [
    ...legacy.issues.map((issue) => ({ label: issue.label, severity: issue.severity })),
    { label: "缺少旧系统原始业务文件，当前仅保存迁移说明", severity: "high" },
  ];
  const issueResult = await access.supabase.from("wpi_attachment_issues").insert(issueRows.map((issue) => ({
    organization_id: access.organizationId,
    attachment_id: attachmentId,
    label: issue.label,
    severity: ["low", "medium", "high", "critical"].includes(issue.severity) ? issue.severity : "medium",
    created_by: access.userId,
  })));
  if (tagResult.error || issueResult.error) {
    return NextResponse.json({ error: tagResult.error?.message ?? issueResult.error?.message ?? "附件治理数据迁移失败" }, { status: 500 });
  }

  const refreshed = await findAttachment(access, attachmentId);
  if (!refreshed.data) return NextResponse.json({ error: "迁移后附件读取失败" }, { status: 500 });
  return NextResponse.json({ data: await readAttachmentDetail(access, refreshed.data), source: "supabase", migrated: true });
}
