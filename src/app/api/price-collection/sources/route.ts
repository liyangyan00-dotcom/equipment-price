import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { verifyCollectionSource } from "@/lib/priceCollection/sourceValidator";

const manageableRoles = new Set(["admin", "manager"]);
const sourceKinds = new Set(["web", "api"]);
const extractionStrategies = new Set(["structured_data", "html_table", "json_api"]);

function text(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function number(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function canManageSources(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
) {
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const result = await access.supabase
    .from("wpi_price_collection_sources")
    .select("*")
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: false });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ sources: result.data ?? [], canManage: await canManageSources(access) });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!(await canManageSources(access))) return NextResponse.json({ error: "当前角色没有维护采集来源的权限" }, { status: 403 });

  const body = (await request.json()) as Record<string, unknown>;
  const sourceKind = text(body.sourceKind, 12);
  const sourceCode = text(body.sourceCode, 64).toUpperCase();
  const name = text(body.name, 120);
  const baseUrl = text(body.baseUrl, 600);
  if (!sourceKinds.has(sourceKind)) return NextResponse.json({ error: "采集来源类型无效" }, { status: 400 });
  if (!/^[A-Z0-9][A-Z0-9_.-]{1,63}$/.test(sourceCode)) return NextResponse.json({ error: "来源编码格式无效" }, { status: 400 });
  if (!name || !baseUrl) return NextResponse.json({ error: "来源名称和采集地址不能为空" }, { status: 400 });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
    if (parsedUrl.protocol !== "https:") throw new Error("采集地址必须使用 HTTPS");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "采集地址无效" }, { status: 400 });
  }
  const extractionStrategy = text(body.extractionStrategy, 32) || (sourceKind === "api" ? "json_api" : "structured_data");
  if (!extractionStrategies.has(extractionStrategy)) return NextResponse.json({ error: "解析策略无效" }, { status: 400 });
  const allowedPathPrefixes = Array.isArray(body.allowedPathPrefixes)
    ? body.allowedPathPrefixes.map((item) => text(item, 180)).filter((item) => item.startsWith("/")).slice(0, 20)
    : ["/"];
  const apiIntegrationId = text(body.apiIntegrationId, 80) || null;
  if (sourceKind === "api") {
    if (!apiIntegrationId) return NextResponse.json({ error: "API 数据源必须关联已配置的授权凭证" }, { status: 400 });
    const integration = await access.supabase
      .from("wpi_integrations")
      .select("id, integration_type, config")
      .eq("organization_id", access.organizationId)
      .eq("id", apiIntegrationId)
      .maybeSingle();
    if (integration.error) return NextResponse.json({ error: integration.error.message }, { status: 500 });
    if (!integration.data || integration.data.integration_type !== "data_source" || integration.data.config?.supplierApi !== true) {
      return NextResponse.json({ error: "关联的厂家 API 集成无效" }, { status: 400 });
    }
  }

  const result = await access.supabase
    .from("wpi_price_collection_sources")
    .insert({
      organization_id: access.organizationId,
      source_code: sourceCode,
      name,
      source_kind: sourceKind,
      base_url: parsedUrl.toString(),
      allowed_hosts: [parsedUrl.hostname.toLowerCase()],
      allowed_path_prefixes: allowedPathPrefixes.length ? allowedPathPrefixes : ["/"],
      is_active: false,
      robots_policy: body.robotsPolicy === "manual_only" ? "manual_only" : "respect",
      rate_limit_per_minute: Math.min(60, Math.max(1, Math.round(number(body.rateLimitPerMinute, 6)))),
      default_currency: text(body.defaultCurrency, 8) || "CNY",
      default_region: text(body.defaultRegion, 100) || null,
      quality_score: Math.min(100, Math.max(0, number(body.qualityScore, 60))),
      extraction_strategy: extractionStrategy,
      api_integration_id: apiIntegrationId,
      discovery_enabled: sourceKind === "web" ? body.discoveryEnabled !== false : false,
      max_discovery_depth: Math.min(5, Math.max(0, Math.round(number(body.maxDiscoveryDepth, 2)))),
      config: {
        targetType: text(body.targetType, 20) || "all",
        catalogSourceType: text(body.catalogSourceType, 40) || (sourceKind === "api" ? "api" : "manufacturer_site"),
        brand: text(body.brand, 120) || null,
        supplierName: text(body.supplierName, 160) || null,
        sourceOwnerType: text(body.sourceOwnerType, 20) || null,
        sourceOwnerId: text(body.sourceOwnerId, 80) || null,
        sourceOwnerName: text(body.sourceOwnerName, 160) || null,
        canonicalBrand: text(body.canonicalBrand, 120) || text(body.brand, 120) || null,
        equipmentCategory: text(body.equipmentCategory, 120) || null,
        requiresHumanReview: true,
        aiFinalDecision: false,
        authorizationNote: text(body.authorizationNote, 500),
      },
      last_error: "等待来源验证",
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select("*")
    .single();
  if (result.error) {
    const duplicate = result.error.code === "23505";
    return NextResponse.json({ error: duplicate ? "来源编码或采集地址已存在" : result.error.message }, { status: duplicate ? 409 : 500 });
  }
  return NextResponse.json({ source: result.data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!(await canManageSources(access))) return NextResponse.json({ error: "当前角色没有维护采集来源的权限" }, { status: 403 });

  const body = (await request.json()) as Record<string, unknown>;
  const id = text(body.id, 80);
  const action = text(body.action, 24);
  if (!id) return NextResponse.json({ error: "缺少采集来源 ID" }, { status: 400 });
  const existing = await access.supabase
    .from("wpi_price_collection_sources")
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: "采集来源不存在" }, { status: 404 });

  if (action === "validate") {
    const now = new Date().toISOString();
    try {
      if (existing.data.source_kind === "api") {
        if (!existing.data.api_integration_id) throw new Error("API 数据源尚未关联凭证");
        const invoked = await access.supabase.functions.invoke("wpi-price-collector", {
          body: { action: "validate_api_integration", integrationId: existing.data.api_integration_id },
        });
        if (invoked.error) {
          let message = invoked.error.message;
          if (invoked.error.context instanceof Response) {
            const detail = await invoked.error.context.clone().json().catch(() => ({})) as { error?: string };
            message = detail.error || message;
          }
          throw new Error(message);
        }
      } else {
        await verifyCollectionSource(existing.data.base_url, existing.data.allowed_hosts ?? []);
      }
      const updated = await access.supabase
        .from("wpi_price_collection_sources")
        .update({ is_active: true, last_checked_at: now, last_error: null, updated_by: access.userId })
        .eq("organization_id", access.organizationId)
        .eq("id", id)
        .select("*")
        .single();
      if (updated.error) throw updated.error;
      return NextResponse.json({ valid: true, source: updated.data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "来源验证失败";
      await access.supabase
        .from("wpi_price_collection_sources")
        .update({ is_active: false, last_checked_at: now, last_error: message, updated_by: access.userId })
        .eq("organization_id", access.organizationId)
        .eq("id", id);
      return NextResponse.json({ valid: false, error: message }, { status: 422 });
    }
  }

  if (action === "toggle") {
    const nextActive = Boolean(body.isActive);
    const updated = await access.supabase
      .from("wpi_price_collection_sources")
      .update({ is_active: nextActive, updated_by: access.userId })
      .eq("organization_id", access.organizationId)
      .eq("id", id)
      .select("*")
      .single();
    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
    return NextResponse.json({ source: updated.data });
  }

  if (action === "bind_subject") {
    const sourceOwnerType = text(body.sourceOwnerType, 20);
    const sourceOwnerId = text(body.sourceOwnerId, 80);
    const sourceOwnerName = text(body.sourceOwnerName, 160);
    const canonicalBrand = text(body.canonicalBrand, 120);
    if (!new Set(["manufacturer", "supplier"]).has(sourceOwnerType) || !sourceOwnerId || !sourceOwnerName) {
      return NextResponse.json({ error: "采集主体信息不完整" }, { status: 400 });
    }
    const updated = await access.supabase
      .from("wpi_price_collection_sources")
      .update({
        config: {
          ...(existing.data.config ?? {}),
          sourceOwnerType,
          sourceOwnerId,
          sourceOwnerName,
          canonicalBrand: canonicalBrand || existing.data.config?.brand || null,
        },
        updated_by: access.userId,
      })
      .eq("organization_id", access.organizationId)
      .eq("id", id)
      .select("*")
      .single();
    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
    return NextResponse.json({ source: updated.data });
  }

  return NextResponse.json({ error: "不支持的来源操作" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!(await canManageSources(access))) return NextResponse.json({ error: "当前角色没有删除采集来源的权限" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = text(body.id, 80);
  if (!id) return NextResponse.json({ error: "缺少采集来源 ID" }, { status: 400 });

  const existing = await access.supabase
    .from("wpi_price_collection_sources")
    .select("id, name, source_code")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: "采集来源不存在" }, { status: 404 });

  const deleted = await access.supabase
    .from("wpi_price_collection_sources")
    .delete()
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (deleted.error) return NextResponse.json({ error: deleted.error.message }, { status: 500 });
  if (!deleted.data) return NextResponse.json({ error: "来源删除失败或没有删除权限" }, { status: 403 });

  return NextResponse.json({ deleted: true, id, name: existing.data.name });
}
