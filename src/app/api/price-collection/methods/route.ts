import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type { EquipmentCollectionMethodRecord } from "@/types/priceCollection";

const manageableRoles = new Set(["admin", "manager"]);
const parseTargets = new Set(["webpage", "pdf", "excel", "manual", "mixed"]);

function text(value: unknown, maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function mapMethod(row: Record<string, unknown>): EquipmentCollectionMethodRecord {
  return {
    id: String(row.id),
    methodCode: text(row.method_code),
    name: text(row.name),
    applicableSourceTypes: Array.isArray(row.applicable_source_types) ? row.applicable_source_types.map(String) : [],
    parseTarget: (text(row.parse_target) || "webpage") as EquipmentCollectionMethodRecord["parseTarget"],
    aiEnabled: Boolean(row.ai_enabled),
    dedupeEnabled: Boolean(row.dedupe_enabled),
    standardizationEnabled: Boolean(row.standardization_enabled),
    retryEnabled: Boolean(row.retry_enabled),
    maxRetry: Number(row.max_retry ?? 3),
    reviewRequired: Boolean(row.review_required),
    scheduled: Boolean(row.scheduled),
    isActive: Boolean(row.is_active),
    config: row.config && typeof row.config === "object" ? row.config as Record<string, unknown> : {},
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

async function canManage(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  if (manageableRoles.has(access.role)) return true;
  const override = await access.supabase
    .from("wpi_organization_role_permissions")
    .select("is_enabled")
    .eq("organization_id", access.organizationId)
    .eq("role", access.role)
    .eq("permission", "settings.manage")
    .maybeSingle();
  if (override.error) throw override.error;
  return Boolean(override.data?.is_enabled);
}

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const result = await access.supabase
    .from("wpi_equipment_collection_methods")
    .select("*")
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: true });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ methods: (result.data ?? []).map((row) => mapMethod(row)), canManage: await canManage(access) });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!(await canManage(access))) return NextResponse.json({ error: "当前角色没有维护采集方式的权限" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const name = text(body.name);
  const parseTarget = text(body.parseTarget, 24) || "webpage";
  if (!name) return NextResponse.json({ error: "采集方式名称不能为空" }, { status: 400 });
  if (!parseTargets.has(parseTarget)) return NextResponse.json({ error: "解析目标无效" }, { status: 400 });
  const sourceTypes = Array.isArray(body.applicableSourceTypes)
    ? body.applicableSourceTypes.map((item) => text(item, 40)).filter(Boolean).slice(0, 20)
    : [];
  const result = await access.supabase
    .from("wpi_equipment_collection_methods")
    .insert({
      organization_id: access.organizationId,
      method_code: text(body.methodCode, 64).toUpperCase() || `MTH-${Date.now().toString(36).toUpperCase()}`,
      name,
      applicable_source_types: sourceTypes,
      parse_target: parseTarget,
      ai_enabled: body.aiEnabled !== false,
      dedupe_enabled: body.dedupeEnabled !== false,
      standardization_enabled: body.standardizationEnabled !== false,
      retry_enabled: body.retryEnabled !== false,
      max_retry: Math.min(10, Math.max(0, Number(body.maxRetry ?? 3))),
      review_required: body.reviewRequired !== false,
      scheduled: body.scheduled !== false,
      is_active: true,
      config: { requiresHumanReview: true, aiFinalDecision: false },
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select("*")
    .single();
  if (result.error) return NextResponse.json({ error: result.error.code === "23505" ? "采集方式名称或编码已存在" : result.error.message }, { status: result.error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ method: mapMethod(result.data) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!(await canManage(access))) return NextResponse.json({ error: "当前角色没有维护采集方式的权限" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const id = text(body.id, 80);
  if (!id) return NextResponse.json({ error: "缺少采集方式 ID" }, { status: 400 });
  const result = await access.supabase
    .from("wpi_equipment_collection_methods")
    .update({ is_active: Boolean(body.isActive), updated_by: access.userId })
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .select("*")
    .single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ method: mapMethod(result.data) });
}
