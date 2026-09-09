import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";

type RouteContext = { params: Promise<{ id: string }> };

const writableRoles = new Set(["admin", "manager", "editor"]);

function failure(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return failure(access.error, access.status);

  const { id } = await context.params;
  const result = await findAttachment(access, decodeURIComponent(id));
  if (result.error) return failure(result.error.message);
  if (!result.data) {
    return NextResponse.json(
      { error: "附件证据尚未迁移到业务库", code: "ATTACHMENT_NOT_FOUND", canMigrate: /^ATT-/i.test(id) },
      { status: 404 },
    );
  }

  try {
    return NextResponse.json({ data: await readAttachmentDetail(access, result.data), source: "supabase" });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "附件详情读取失败");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return failure(access.error, access.status);
  if (!writableRoles.has(access.role)) return failure("当前角色没有附件字段编辑权限", 403);

  const { id } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (found.error) return failure(found.error.message);
  if (!found.data) return failure("附件证据不存在", 404);

  let body: { extractedFields?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return failure("请求数据格式错误", 400);
  }
  if (!body || !Array.isArray(body.extractedFields) || body.extractedFields.length > 50) {
    return failure("抽取字段格式不正确", 400);
  }
  const extractedFields = body.extractedFields.map((item) => {
    const field = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      label: String(field.label ?? "").trim().slice(0, 80),
      value: String(field.value ?? "").trim().slice(0, 500),
      confidence: Math.max(0, Math.min(100, Number(field.confidence) || 0)),
    };
  }).filter((field) => field.label);

  const metadata = found.data.metadata && typeof found.data.metadata === "object" ? found.data.metadata : {};
  const previousAi = metadata.ai_result && typeof metadata.ai_result === "object"
    ? metadata.ai_result as Record<string, unknown>
    : {};
  const { data, error } = await access.supabase
    .from("wpi_attachments")
    .update({
      metadata: {
        ...metadata,
        ai_result: { ...previousAi, extracted_fields: extractedFields },
        manually_corrected_at: new Date().toISOString(),
        manually_corrected_by: access.userId,
      },
      verification_status: "pending",
      verified_by: null,
      verified_at: null,
    })
    .eq("organization_id", access.organizationId)
    .eq("id", found.data.id)
    .eq("updated_at", found.data.updated_at)
    .select("id")
    .maybeSingle();
  if (error) return failure(error.message, /frozen|finalized/i.test(error.message) ? 409 : 500);
  if (!data) return failure("附件已被其他操作更新，请刷新后重试", 409);

  const refreshed = await findAttachment(access, found.data.id);
  if (!refreshed.data) return failure("附件更新后读取失败", 500);
  return NextResponse.json({ data: await readAttachmentDetail(access, refreshed.data), source: "supabase" });
}
