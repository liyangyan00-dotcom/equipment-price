import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const writableRoles = new Set(["admin", "manager", "editor"]);
const evidenceTypes = new Set([
  "quote_evidence",
  "technical_spec",
  "supplier_qualification",
  "delivery_terms",
  "payment_terms",
  "inspection_certificate",
  "contract",
  "correspondence",
  "other",
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function resolvePrice(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  id: string
) {
  const query = () =>
    access.supabase
      .from("wpi_equipment_prices")
      .select("id,price_code")
      .eq("organization_id", access.organizationId)
      .is("deleted_at", null);
  let result = isUuid(id)
    ? await query().eq("id", id).maybeSingle()
    : await query().eq("legacy_id", id).maybeSingle();
  if (!result.data && !result.error) {
    result = await query().eq("price_code", id).maybeSingle();
  }
  return result;
}

function evidenceResponse(item: Record<string, unknown>) {
  return {
    id: String(item.id),
    bucket: String(item.bucket_id),
    path: String(item.object_path),
    name: String(item.original_name),
    contentType: String(item.content_type ?? ""),
    size: Number(item.size_bytes ?? 0),
    evidenceType: String(item.evidence_type ?? "quote_evidence"),
    status: String(item.status ?? "active"),
    verificationStatus: String(item.verification_status ?? "pending"),
    description: String(item.description ?? ""),
    documentDate: String(item.document_date ?? ""),
    validUntil: String(item.valid_until ?? ""),
    createdAt: String(item.created_at ?? ""),
  };
}

async function readReviewStatus(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  priceId: string
) {
  return access.supabase
    .from("wpi_equipment_price_reviews")
    .select("id,status")
    .eq("organization_id", access.organizationId)
    .eq("equipment_price_id", priceId)
    .maybeSingle();
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const { data: price, error: priceError } = await resolvePrice(access, id);
  if (priceError) {
    return NextResponse.json({ error: priceError.message }, { status: 500 });
  }
  if (!price) {
    return NextResponse.json({ error: "设备价格记录不存在" }, { status: 404 });
  }

  const { data, error } = await access.supabase
    .from("wpi_attachments")
    .select(
      "id,bucket_id,object_path,original_name,content_type,size_bytes,evidence_type,status,verification_status,description,document_date,valid_until,created_at"
    )
    .eq("organization_id", access.organizationId)
    .eq("related_type", "equipment_price")
    .eq("related_id", price.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: (data ?? []).map((item) => evidenceResponse(item)),
    source: "supabase",
  });
}

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!writableRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有附件登记权限" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const { data: price, error: priceError } = await resolvePrice(access, id);
  if (priceError) {
    return NextResponse.json(
      { error: "暂时无法读取设备价格，请稍后重试" },
      { status: 500 }
    );
  }
  if (!price) {
    return NextResponse.json({ error: "设备价格记录不存在" }, { status: 404 });
  }

  const body = (await request.json()) as {
    bucket?: string;
    path?: string;
    name?: string;
    contentType?: string;
    size?: number;
    evidenceType?: string;
    description?: string;
    documentDate?: string;
    validUntil?: string;
  };
  if (
    body.bucket !== "business-documents" ||
    !body.path?.trim() ||
    !body.name?.trim()
  ) {
    return NextResponse.json({ error: "附件存储信息不完整" }, { status: 400 });
  }

  const evidenceType = body.evidenceType?.trim() || "quote_evidence";
  if (!evidenceTypes.has(evidenceType)) {
    return NextResponse.json({ error: "证据分类不受支持" }, { status: 400 });
  }

  const { data: review, error: reviewError } = await readReviewStatus(
    access,
    price.id
  );
  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }
  if (review && ["pending", "in_review"].includes(review.status)) {
    return NextResponse.json(
      { error: "该价格正在审核中，证据链已冻结；如需补充请先退回补正" },
      { status: 409 }
    );
  }
  if (review && ["approved", "rejected", "archived"].includes(review.status)) {
    return NextResponse.json(
      { error: "该价格已形成终审结论，请创建价格新版本后补充证据" },
      { status: 409 }
    );
  }

  // buildBusinessObjectPath sanitizes the category into one path segment.
  const expectedPrefix = `${access.organizationId}/equipment-price-evidence-${price.id}/`;
  if (!body.path.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: "附件路径未绑定当前设备价格" },
      { status: 400 }
    );
  }

  const storageCheck = await access.supabase.storage
    .from(body.bucket)
    .createSignedUrl(body.path, 60);
  if (storageCheck.error) {
    return NextResponse.json(
      { error: "Storage 中未找到待登记文件，请重新上传" },
      { status: 400 }
    );
  }

  const { data, error } = await access.supabase
    .from("wpi_attachments")
    .upsert(
      {
        organization_id: access.organizationId,
        bucket_id: body.bucket,
        object_path: body.path,
        original_name: body.name.trim(),
        content_type: body.contentType?.trim() || null,
        size_bytes: Math.max(0, Math.round(Number(body.size) || 0)),
        related_type: "equipment_price",
        related_id: price.id,
        evidence_type: evidenceType,
        status: "active",
        verification_status: "pending",
        description: body.description?.trim().slice(0, 500) || null,
        document_date: body.documentDate || null,
        valid_until: body.validUntil || null,
        uploaded_by: access.userId,
      },
      { onConflict: "bucket_id,object_path" }
    )
    .select(
      "id,bucket_id,object_path,original_name,content_type,size_bytes,evidence_type,status,verification_status,description,document_date,valid_until,created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    data: evidenceResponse(data),
    source: "supabase",
  });
}
