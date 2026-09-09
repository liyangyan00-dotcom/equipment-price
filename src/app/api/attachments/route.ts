import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { attachmentReviewers } from "@/lib/auth/attachmentReviewAccess";

const writeRoles = new Set(["admin", "manager", "editor"]);

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanSearch(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function formatBytes(value: number | null) {
  if (!value) return "0 KB";
  return value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(value / 1024))} KB`;
}

function fileKind(contentType: string | null, name: string) {
  const value = `${contentType ?? ""} ${name}`.toLowerCase();
  if (value.includes("spreadsheet") || /\.xlsx?$/.test(value)) return "sheet";
  if (value.includes("message/") || value.endsWith(".eml")) return "mail";
  if (value.includes("image/") || /\.(png|jpe?g|webp)$/.test(value)) return "image";
  return "pdf";
}

function rowView(
  row: Record<string, unknown>,
  userId: string,
  assigneeNames: Map<string, string>,
  issueCounts: Map<string, number>,
) {
  const metadata = row.metadata && typeof row.metadata === "object"
    ? row.metadata as Record<string, unknown>
    : {};
  const name = String(row.original_name ?? "未命名附件");
  const kind = fileKind(row.content_type as string | null, name);
  const relatedId = typeof row.related_id === "string" ? row.related_id : null;
  const dueAt = typeof row.review_due_at === "string" ? row.review_due_at : null;
  const reviewState = String(row.review_state ?? "pending_ai");
  const assignedId = typeof row.assigned_reviewer_id === "string" ? row.assigned_reviewer_id : null;
  return {
    id: String(row.attachment_code || row.id),
    databaseId: String(row.id),
    name,
    size: formatBytes(Number(row.size_bytes) || null),
    type: kind === "sheet" ? "价格明细 (XLSX)" : kind === "mail" ? "邮件记录 (EML)" : kind === "image" ? "图片证据" : "报价证据 (PDF)",
    object: String(metadata.object_label || "待确认业务对象"),
    priceId: String(metadata.price_code || "-"),
    supplier: String(metadata.supplier_name || "待核验供应商"),
    source: String(metadata.source_label || row.description || "系统上传"),
    uploader: row.uploaded_by === userId ? "当前用户" : "组织成员",
    uploadedAt: String(row.created_at),
    documentDate: row.document_date ? String(row.document_date) : null,
    status: reviewState === "confirmed" ? "linked" : row.status === "archived" ? "unlinked" : "pending",
    reviewState,
    relationStatus: relatedId ? "linked" : "unlinked",
    relatedType: row.related_type ? String(row.related_type) : null,
    relatedId,
    aiStatus: String(row.ai_status ?? "not_run"),
    confidenceScore: row.ai_confidence === null || row.ai_confidence === undefined ? null : Number(row.ai_confidence),
    risk: row.ai_risk_level ? String(row.ai_risk_level) : null,
    aiAnalyzedAt: row.ai_analyzed_at ? String(row.ai_analyzed_at) : null,
    assignedReviewerId: assignedId,
    assignedReviewer: assignedId ? assigneeNames.get(assignedId) ?? "组织审核员" : null,
    reviewDueAt: dueAt,
    overdue: Boolean(dueAt && !["confirmed", "rejected", "voided"].includes(reviewState) && Date.parse(dueAt) < Date.now()),
    duplicateOfAttachmentId: row.duplicate_of_attachment_id ? String(row.duplicate_of_attachment_id) : null,
    governanceFlags: Array.isArray(row.governance_flags) ? row.governance_flags.map(String) : [],
    openIssueCount: issueCounts.get(String(row.id)) ?? 0,
    fileKind: kind,
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let eligibleReviewers;
  try { eligibleReviewers = await attachmentReviewers(access); } catch {
    return NextResponse.json({ error: "附件审核权限读取失败" }, { status: 503 });
  }
  const canReview = eligibleReviewers.some((member) => member.user_id === access.userId);

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(10, Number(params.get("pageSize")) || 20));
  const keyword = cleanSearch(params.get("q") ?? "");
  const reviewState = clean(params.get("status"), 40);
  const kind = clean(params.get("kind"), 20);
  const risk = clean(params.get("risk"), 20);
  const assignee = clean(params.get("assignee"), 80);
  const issue = clean(params.get("issue"), 40);
  const relatedType = clean(params.get("relatedType"), 80);
  const relatedId = clean(params.get("relatedId"), 80);

  let query = access.supabase.from("wpi_attachments").select([
    "id", "attachment_code", "original_name", "content_type", "size_bytes", "related_type", "related_id",
    "description", "document_date", "metadata", "uploaded_by", "created_at", "status", "review_state",
    "ai_status", "ai_confidence", "ai_risk_level", "ai_analyzed_at", "assigned_reviewer_id", "review_due_at",
    "duplicate_of_attachment_id", "governance_flags",
  ].join(","), { count: "exact" })
    .eq("organization_id", access.organizationId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (keyword) query = query.or(`attachment_code.ilike.%${keyword}%,original_name.ilike.%${keyword}%,description.ilike.%${keyword}%`);
  if (reviewState && reviewState !== "all") query = query.eq("review_state", reviewState);
  if (risk && risk !== "all") query = query.eq("ai_risk_level", risk);
  if (relatedType) query = query.eq("related_type", relatedType);
  if (relatedId && /^[0-9a-f-]{36}$/i.test(relatedId)) query = query.eq("related_id", relatedId);
  if (assignee === "me") query = query.eq("assigned_reviewer_id", access.userId);
  else if (assignee === "unassigned") query = query.is("assigned_reviewer_id", null);
  else if (/^[0-9a-f-]{36}$/i.test(assignee)) query = query.eq("assigned_reviewer_id", assignee);
  if (issue && issue !== "all") query = query.contains("governance_flags", [issue]);
  if (kind === "pdf") query = query.or("content_type.ilike.%pdf%,original_name.ilike.%.pdf");
  if (kind === "sheet") query = query.or("content_type.ilike.%spreadsheet%,original_name.ilike.%.xlsx,original_name.ilike.%.xls");
  if (kind === "mail") query = query.or("content_type.ilike.%message/%,original_name.ilike.%.eml");
  if (kind === "image") query = query.or("content_type.ilike.image/%,original_name.ilike.%.png,original_name.ilike.%.jpg,original_name.ilike.%.jpeg,original_name.ilike.%.webp");

  const result = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  const rawRows = (result.data ?? []) as unknown as Record<string, unknown>[];
  const rowIds = rawRows.map((row) => String(row.id));
  const assigneeIds = Array.from(new Set(rawRows
    .map((row) => typeof row.assigned_reviewer_id === "string" ? row.assigned_reviewer_id : null)
    .filter((value): value is string => Boolean(value))));
  const baseCount = () => access.supabase.from("wpi_attachments").select("id", { count: "exact", head: true })
    .eq("organization_id", access.organizationId).eq("status", "active");
  const [profiles, issues, members, total, pendingAi, pendingReview, needInfo, confirmed, overdue, highRisk, unlinked] = await Promise.all([
    assigneeIds.length ? access.supabase.from("wpi_profiles").select("id,display_name").in("id", assigneeIds) : Promise.resolve({ data: [], error: null }),
    rowIds.length ? access.supabase.from("wpi_attachment_issues").select("attachment_id").in("attachment_id", rowIds).eq("status", "open") : Promise.resolve({ data: [], error: null }),
    Promise.resolve({ data: eligibleReviewers, error: null }),
    baseCount(),
    baseCount().eq("review_state", "pending_ai"),
    baseCount().eq("review_state", "pending_review"),
    baseCount().eq("review_state", "need_info"),
    baseCount().eq("review_state", "confirmed"),
    baseCount().lt("review_due_at", new Date().toISOString()).not("review_state", "in", "(confirmed,rejected,voided)"),
    baseCount().in("ai_risk_level", ["high", "critical"]),
    baseCount().is("related_id", null),
  ]);
  const secondaryError = profiles.error || issues.error || members.error || total.error || pendingAi.error || pendingReview.error || needInfo.error || confirmed.error || overdue.error || highRisk.error || unlinked.error;
  if (secondaryError) return NextResponse.json({ error: secondaryError.message }, { status: 500 });

  const assigneeNames = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.display_name || "未命名成员"]));
  const issueCounts = new Map<string, number>();
  for (const item of issues.data ?? []) issueCounts.set(item.attachment_id, (issueCounts.get(item.attachment_id) ?? 0) + 1);
  const memberIds = (members.data ?? []).map((member) => member.user_id);
  const memberProfiles = memberIds.length
    ? await access.supabase.from("wpi_profiles").select("id,display_name").in("id", memberIds)
    : { data: [], error: null };
  if (memberProfiles.error) return NextResponse.json({ error: memberProfiles.error.message }, { status: 500 });
  const memberNameMap = new Map((memberProfiles.data ?? []).map((profile) => [profile.id, profile.display_name || "未命名成员"]));

  return NextResponse.json({
    data: rawRows.map((row) => rowView(row, access.userId, assigneeNames, issueCounts)),
    pagination: { page, pageSize, total: result.count ?? 0, totalPages: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)) },
    summary: {
      total: total.count ?? 0,
      pendingAi: pendingAi.count ?? 0,
      pendingReview: pendingReview.count ?? 0,
      needInfo: needInfo.count ?? 0,
      confirmed: confirmed.count ?? 0,
      overdue: overdue.count ?? 0,
      highRisk: highRisk.count ?? 0,
      unlinked: unlinked.count ?? 0,
    },
    reviewers: (members.data ?? []).filter((member) => ["admin", "manager", "reviewer"].includes(member.role)).map((member) => ({
      id: member.user_id,
      name: memberNameMap.get(member.user_id) ?? "组织审核员",
      role: member.role,
    })),
    permissions: { canWrite: writeRoles.has(access.role), canReview, canAssign: canReview },
    source: "supabase",
  });
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有附件上传权限" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const originalName = clean(body.originalName);
  const bucketId = clean(body.bucketId, 100);
  const objectPath = clean(body.objectPath, 800);
  const checksum = clean(body.checksum, 128).toLowerCase();
  if (!originalName || !bucketId || !objectPath) return NextResponse.json({ error: "附件上传信息不完整" }, { status: 400 });

  if (checksum) {
    const duplicate = await access.supabase.from("wpi_attachments").select("attachment_code")
      .eq("organization_id", access.organizationId).eq("checksum", checksum).eq("status", "active").limit(1).maybeSingle();
    if (duplicate.error) return NextResponse.json({ error: duplicate.error.message }, { status: 500 });
    if (duplicate.data) return NextResponse.json({ error: `相同文件已存在：${duplicate.data.attachment_code}` }, { status: 409 });
  }

  const attachmentCode = `ATT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const relatedId = clean(body.relatedId, 80);
  const inserted = await access.supabase.from("wpi_attachments").insert({
    organization_id: access.organizationId,
    attachment_code: attachmentCode,
    bucket_id: bucketId,
    object_path: objectPath,
    original_name: originalName,
    content_type: clean(body.contentType, 120) || null,
    size_bytes: Math.max(0, Number(body.sizeBytes) || 0),
    checksum: checksum || null,
    related_type: clean(body.relatedType, 80) || null,
    related_id: /^[0-9a-f-]{36}$/i.test(relatedId) ? relatedId : null,
    evidence_type: clean(body.evidenceType, 80) || "quote_evidence",
    status: "active",
    verification_status: "pending",
    review_state: "pending_ai",
    ai_status: "not_run",
    review_due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    description: clean(body.description, 500) || "人工上传，等待 AI 预审和人工关联",
    metadata: {
      object_label: clean(body.objectLabel, 200) || "待确认业务对象",
      price_code: clean(body.priceCode, 100) || "-",
      supplier_name: clean(body.supplierName, 200) || "待核验供应商",
      source_label: "人工上传",
    },
    uploaded_by: access.userId,
  }).select().single();
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });
  return NextResponse.json({ data: rowView(inserted.data, access.userId, new Map(), new Map()), source: "supabase" }, { status: 201 });
}
