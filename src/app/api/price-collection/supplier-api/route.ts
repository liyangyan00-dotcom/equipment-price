import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const manageableRoles = new Set(["admin", "manager"]);
const authTypes = new Set(["bearer", "api_key", "basic"]);

function text(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function integrationCode(brand: string) {
  const normalized = brand.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return `SUPPLIER_API_${normalized || "GENERIC"}`;
}

async function canManage(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  if (manageableRoles.has(access.role)) return true;
  const permission = await access.supabase.from("wpi_organization_role_permissions").select("is_enabled")
    .eq("organization_id", access.organizationId).eq("role", access.role).eq("permission", "settings.manage").maybeSingle();
  if (permission.error) throw permission.error;
  return Boolean(permission.data?.is_enabled);
}

async function invokeValidation(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  integrationId: string,
) {
  const invoked = await access.supabase.functions.invoke("wpi-price-collector", {
    body: { action: "validate_api_integration", integrationId },
  });
  if (!invoked.error) return { valid: true, detail: invoked.data };
  let message = invoked.error.message;
  if (invoked.error.context instanceof Response) {
    const payload = await invoked.error.context.clone().json().catch(() => ({})) as { error?: string };
    message = payload.error || message;
  }
  return { valid: false, error: message };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const brand = text(request.nextUrl.searchParams.get("brand"), 100);
  if (!brand) return NextResponse.json({ error: "缺少品牌" }, { status: 400 });
  const code = integrationCode(brand);
  const [integration, source, manageable] = await Promise.all([
    access.supabase.from("wpi_integrations")
      .select("id,integration_code,name,provider,endpoint_url,status,credential_state,credential_hint,config,last_validated_at,last_success_at,last_error")
      .eq("organization_id", access.organizationId).eq("integration_code", code).maybeSingle(),
    access.supabase.from("wpi_price_collection_sources")
      .select("id,name,base_url,is_active,last_checked_at,last_error,api_integration_id,config")
      .eq("organization_id", access.organizationId).eq("source_code", `${code}_SOURCE`).maybeSingle(),
    canManage(access),
  ]);
  const error = integration.error || source.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integration: integration.data, source: source.data, canManage: manageable });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!(await canManage(access))) return NextResponse.json({ error: "当前角色没有维护厂家 API 的权限" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const brand = text(body.brand, 100);
  const endpointUrl = text(body.endpointUrl, 600);
  const authType = text(body.authType, 24).toLowerCase();
  if (!brand || !endpointUrl || !authTypes.has(authType)) return NextResponse.json({ error: "品牌、API 地址和认证方式不能为空" }, { status: 400 });
  let endpoint: URL;
  try {
    endpoint = new URL(endpointUrl);
    if (endpoint.protocol !== "https:") throw new Error("API 地址必须使用 HTTPS");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "API 地址无效" }, { status: 400 });
  }
  const credential = authType === "basic"
    ? { authType, username: text(body.username, 300), password: text(body.password, 2000) }
    : {
      authType,
      value: text(body.credential, 4096),
      headerName: authType === "api_key" ? text(body.headerName, 100) || "X-API-Key" : "Authorization",
      prefix: authType === "bearer" ? text(body.prefix, 40) || "Bearer" : "",
    };
  if (authType === "basic" ? !credential.username || !credential.password : !credential.value) {
    return NextResponse.json({ error: "请填写完整的 API 访问凭据" }, { status: 400 });
  }

  const code = integrationCode(brand);
  const existing = await access.supabase.from("wpi_integrations").select("id")
    .eq("organization_id", access.organizationId).eq("integration_code", code).maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  let integrationId = existing.data?.id as string | undefined;
  const integrationPayload = {
    name: `${brand} 产品 API`, provider: brand,
    description: `${brand} 授权产品数据接口。同步结果必须进入人工审核。`,
    endpoint_url: endpoint.toString(), status: "unconfigured",
    config: { supplierApi: true, brand, authType, headerName: credential.headerName || "Authorization", humanReview: true, aiFinalDecision: false },
    updated_by: access.userId,
  };
  if (integrationId) {
    const updated = await access.supabase.from("wpi_integrations").update(integrationPayload)
      .eq("organization_id", access.organizationId).eq("id", integrationId).select("id").single();
    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
  } else {
    const inserted = await access.supabase.from("wpi_integrations").insert({
      organization_id: access.organizationId, integration_code: code, integration_type: "data_source",
      ...integrationPayload, is_system: false, created_by: access.userId,
    }).select("id").single();
    if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });
    integrationId = inserted.data.id;
  }
  if (!integrationId) return NextResponse.json({ error: "API 集成创建失败" }, { status: 500 });
  const credentialHint = authType === "basic"
    ? `用户 ${String(credential.username || "")}`
    : `••••${String(credential.value || "").slice(-4)}`;

  const stored = await access.supabase.rpc("wpi_set_integration_credential", {
    target_integration_id: integrationId,
    credential_value: JSON.stringify(credential),
    credential_hint: credentialHint,
  });
  if (stored.error) return NextResponse.json({ error: stored.error.message }, { status: 400 });

  const sourceCode = `${code}_SOURCE`;
  const sourceExisting = await access.supabase.from("wpi_price_collection_sources").select("id")
    .eq("organization_id", access.organizationId).eq("source_code", sourceCode).maybeSingle();
  if (sourceExisting.error) return NextResponse.json({ error: sourceExisting.error.message }, { status: 500 });
  const sourcePayload = {
    name: `${brand} 授权产品 API`, source_kind: "api", base_url: endpoint.toString(), allowed_hosts: [endpoint.hostname.toLowerCase()],
    allowed_path_prefixes: [endpoint.pathname || "/"], is_active: false, robots_policy: "manual_only",
    rate_limit_per_minute: 6, default_currency: "CNY", quality_score: 80, extraction_strategy: "json_api",
    api_integration_id: integrationId, discovery_enabled: false, max_discovery_depth: 0,
    config: { targetType: "equipment", catalogSourceType: "api", brand, supplierName: brand, equipmentCategory: "全部设备", requiresHumanReview: true, aiFinalDecision: false },
    last_error: "等待 API 授权验证", updated_by: access.userId,
  };
  let sourceId = sourceExisting.data?.id as string | undefined;
  if (sourceId) {
    const updated = await access.supabase.from("wpi_price_collection_sources").update(sourcePayload)
      .eq("organization_id", access.organizationId).eq("id", sourceId).select("id").single();
    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
  } else {
    const inserted = await access.supabase.from("wpi_price_collection_sources").insert({
      organization_id: access.organizationId, source_code: sourceCode, ...sourcePayload, created_by: access.userId,
    }).select("id").single();
    if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });
    sourceId = inserted.data.id;
  }

  const validation = await invokeValidation(access, integrationId);
  await access.supabase.from("wpi_price_collection_sources").update({
    is_active: validation.valid, last_checked_at: new Date().toISOString(),
    last_error: validation.valid ? null : validation.error || "API 验证失败", updated_by: access.userId,
  }).eq("organization_id", access.organizationId).eq("id", sourceId);
  return NextResponse.json({ ok: true, valid: validation.valid, integrationId, sourceId, error: validation.error }, { status: validation.valid ? 200 : 422 });
}
