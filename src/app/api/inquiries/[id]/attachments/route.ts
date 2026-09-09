import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor"]);
const evidenceTypes = new Set(["technical_spec", "supplier_qualification", "delivery_terms", "correspondence", "other"]);

async function resolveInquiry(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, id: string) {
  const query = () => access.supabase.from("wpi_inquiries").select("id,inquiry_code").eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await query().eq("id", id).maybeSingle();
  return result;
}

function serialize(item: Record<string, unknown>) {
  return {
    id: String(item.id),
    name: String(item.original_name),
    contentType: String(item.content_type ?? ""),
    size: Number(item.size_bytes ?? 0),
    evidenceType: String(item.evidence_type ?? "other"),
    verificationStatus: String(item.verification_status ?? "pending"),
    createdAt: String(item.created_at ?? ""),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const inquiry = await resolveInquiry(access, id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });

  const { data, error } = await access.supabase
    .from("wpi_attachments")
    .select("id,original_name,content_type,size_bytes,evidence_type,verification_status,created_at")
    .eq("organization_id", access.organizationId)
    .eq("related_type", "inquiry")
    .eq("related_id", inquiry.data.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []).map((item) => serialize(item)), source: "supabase" });
}

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有附件登记权限" }, { status: 403 });
  const { id } = await context.params;
  const inquiry = await resolveInquiry(access, id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });

  const body = (await request.json()) as { bucket?: string; path?: string; name?: string; contentType?: string; size?: number; evidenceType?: string };
  const evidenceType = body.evidenceType?.trim() || "other";
  if (body.bucket !== "business-documents" || !body.path?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "附件存储信息不完整" }, { status: 400 });
  }
  if (!evidenceTypes.has(evidenceType)) return NextResponse.json({ error: "附件分类不受支持" }, { status: 400 });
  const expectedPrefix = `${access.organizationId}/inquiry-attachments-${inquiry.data.id}/`;
  if (!body.path.startsWith(expectedPrefix)) return NextResponse.json({ error: "附件路径未绑定当前询价任务" }, { status: 400 });

  const storageCheck = await access.supabase.storage.from("business-documents").createSignedUrl(body.path, 60);
  if (storageCheck.error) return NextResponse.json({ error: "Storage 中未找到待登记文件" }, { status: 400 });

  const { data, error } = await access.supabase.from("wpi_attachments").insert({
    organization_id: access.organizationId,
    bucket_id: "business-documents",
    object_path: body.path,
    original_name: body.name.trim(),
    content_type: body.contentType?.trim() || null,
    size_bytes: Math.max(0, Math.round(Number(body.size) || 0)),
    related_type: "inquiry",
    related_id: inquiry.data.id,
    evidence_type: evidenceType,
    status: "active",
    verification_status: "pending",
    metadata: { inquiryCode: inquiry.data.inquiry_code, source: "ai-inquiry-letter" },
    uploaded_by: access.userId,
  }).select("id,original_name,content_type,size_bytes,evidence_type,verification_status,created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: serialize(data), source: "supabase" }, { status: 201 });
}
