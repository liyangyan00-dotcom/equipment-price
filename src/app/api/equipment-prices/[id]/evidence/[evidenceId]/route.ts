import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = {
  params: Promise<{ id: string; evidenceId: string }>;
};

const writableRoles = new Set(["admin", "manager", "editor"]);
const archivableRoles = new Set(["admin", "manager"]);
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

async function resolveEvidence(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  priceId: string,
  evidenceId: string
) {
  return access.supabase
    .from("wpi_attachments")
    .select(
      "id,bucket_id,object_path,original_name,content_type,size_bytes,evidence_type,status,verification_status,description,document_date,valid_until,created_at"
    )
    .eq("organization_id", access.organizationId)
    .eq("related_type", "equipment_price")
    .eq("related_id", priceId)
    .eq("id", evidenceId)
    .maybeSingle();
}

function errorStatus(message: string, fallback = 400) {
  return /frozen while review is active|finalized equipment price evidence/i.test(
    message
  )
    ? 409
    : fallback;
}

export async function GET(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id, evidenceId } = await context.params;
  const { data: price, error: priceError } = await resolvePrice(access, id);
  if (priceError) {
    return NextResponse.json({ error: priceError.message }, { status: 500 });
  }
  if (!price) {
    return NextResponse.json({ error: "设备价格记录不存在" }, { status: 404 });
  }

  const { data: evidence, error } = await resolveEvidence(
    access,
    price.id,
    evidenceId
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!evidence) {
    return NextResponse.json({ error: "证据文件不存在" }, { status: 404 });
  }

  const mode = new URL(request.url).searchParams.get("mode");
  const signed = await access.supabase.storage
    .from(evidence.bucket_id)
    .createSignedUrl(
      evidence.object_path,
      5 * 60,
      mode === "download" ? { download: evidence.original_name } : undefined
    );
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json(
      { error: signed.error?.message || "无法生成文件访问地址" },
      { status: 404 }
    );
  }

  const auditAction = mode === "download" ? "evidence.download" : "evidence.preview";
  const auditResult = await access.supabase.rpc(
    "wpi_record_equipment_access_event",
    {
      target_price_id: price.id,
      event_action: auditAction,
      event_data: {
        evidenceId: evidence.id,
        fileName: evidence.original_name,
        evidenceType: evidence.evidence_type,
      },
    }
  );
  if (auditResult.error) {
    return NextResponse.json(
      { error: `文件访问审计记录失败：${auditResult.error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.data.signedUrl, 307);
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!writableRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有证据编辑权限" }, { status: 403 });
  }

  const { id, evidenceId } = await context.params;
  const { data: price, error: priceError } = await resolvePrice(access, id);
  if (priceError) {
    return NextResponse.json({ error: priceError.message }, { status: 500 });
  }
  if (!price) {
    return NextResponse.json({ error: "设备价格记录不存在" }, { status: 404 });
  }

  const body = (await request.json()) as {
    evidenceType?: string;
    description?: string;
    documentDate?: string;
    validUntil?: string;
  };
  const evidenceType = body.evidenceType?.trim() || "quote_evidence";
  if (!evidenceTypes.has(evidenceType)) {
    return NextResponse.json({ error: "证据分类不受支持" }, { status: 400 });
  }

  const { data, error } = await access.supabase
    .from("wpi_attachments")
    .update({
      evidence_type: evidenceType,
      description: body.description?.trim().slice(0, 500) || null,
      document_date: body.documentDate || null,
      valid_until: body.validUntil || null,
    })
    .eq("organization_id", access.organizationId)
    .eq("related_type", "equipment_price")
    .eq("related_id", price.id)
    .eq("id", evidenceId)
    .eq("status", "active")
    .select(
      "id,bucket_id,object_path,original_name,content_type,size_bytes,evidence_type,status,verification_status,description,document_date,valid_until,created_at"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatus(error.message) }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "证据文件不存在或已作废" }, { status: 404 });
  }

  return NextResponse.json({ data, source: "supabase" });
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!archivableRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有证据作废权限" }, { status: 403 });
  }

  const { id, evidenceId } = await context.params;
  const { data: price, error: priceError } = await resolvePrice(access, id);
  if (priceError) {
    return NextResponse.json({ error: priceError.message }, { status: 500 });
  }
  if (!price) {
    return NextResponse.json({ error: "设备价格记录不存在" }, { status: 404 });
  }

  let reason = "";
  try {
    const body = (await request.json()) as { reason?: unknown };
    reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  } catch {
    return NextResponse.json({ error: "请求数据格式错误" }, { status: 400 });
  }
  if (reason.length < 4) {
    return NextResponse.json({ error: "请填写至少 4 个字的作废原因" }, { status: 400 });
  }

  const archivedAt = new Date().toISOString();
  const { data, error } = await access.supabase
    .from("wpi_attachments")
    .update({
      status: "archived",
      archived_by: access.userId,
      archived_at: archivedAt,
      archive_reason: reason,
    })
    .eq("organization_id", access.organizationId)
    .eq("related_type", "equipment_price")
    .eq("related_id", price.id)
    .eq("id", evidenceId)
    .eq("status", "active")
    .select("id,original_name")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatus(error.message) }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "证据文件不存在或已作废" }, { status: 404 });
  }

  return NextResponse.json({
    data: { id: data.id, name: data.original_name, archivedAt, reason },
    source: "supabase",
  });
}
