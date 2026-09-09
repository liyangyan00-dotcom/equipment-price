import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const integrationTypes = ["collector", "ai_provider", "email", "webhook", "data_source"] as const;
const typeSet = new Set<string>(integrationTypes);
const codePattern = /^[A-Z0-9][A-Z0-9_.-]{0,63}$/;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key) && ["string", "number", "boolean"].includes(typeof item))
    .slice(0, 24);
  return Object.fromEntries(entries);
}

async function canManageSettings(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  if (access.role === "admin") return true;
  const override = await access.supabase
    .from("wpi_organization_role_permissions")
    .select("is_enabled")
    .eq("organization_id", access.organizationId)
    .eq("role", access.role)
    .eq("permission", "settings.manage")
    .maybeSingle();
  if (override.error) throw override.error;
  if (override.data) return Boolean(override.data.is_enabled);

  const fallback = await access.supabase
    .from("wpi_role_permissions")
    .select("permission")
    .eq("role", access.role)
    .eq("permission", "settings.manage")
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return Boolean(fallback.data);
}

function credentialHint(secret: string) {
  const compact = secret.replace(/\s+/g, "");
  return compact.length > 4 ? `••••${compact.slice(-4)}` : "••••已配置";
}

function validateConfiguration(row: {
  integration_type: string;
  endpoint_url: string | null;
  credential_state: string;
  config: Record<string, unknown> | null;
}) {
  const issues: string[] = [];
  const endpoint = row.endpoint_url?.trim() ?? "";
  if (!endpoint) issues.push("未配置服务地址");
  if (endpoint && row.integration_type !== "email" && !endpoint.startsWith("https://")) issues.push("服务地址必须使用 HTTPS");
  if (row.credential_state !== "configured") issues.push("未配置访问凭据");
  if (row.integration_type === "ai_provider" && row.config?.humanReview !== true) issues.push("AI 服务必须启用人工复核");
  if (row.integration_type === "email") {
    if (!cleanText(row.config?.senderAddress, 200)) issues.push("未配置发件邮箱");
    if (!cleanText(row.config?.replyToAddress, 200)) issues.push("未配置供应商回复邮箱");
    const publicAppUrl = cleanText(row.config?.publicAppUrl, 500);
    if (!publicAppUrl.startsWith("https://")) issues.push("系统公开地址必须使用 HTTPS");
    const webhookUrl = cleanText(row.config?.webhookUrl, 500);
    if (!webhookUrl.startsWith("https://")) issues.push("Resend 事件回调地址必须使用 HTTPS");
  }
  return issues;
}

async function edgeFunctionErrorDetail(error: unknown) {
  if (!error || typeof error !== "object") return "AI 网关连通测试失败";
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { detail?: string; error?: string };
      return payload.detail || payload.error || `AI 网关返回 HTTP ${context.status}`;
    } catch {
      return `AI 网关返回 HTTP ${context.status}`;
    }
  }
  return error instanceof Error ? error.message : "AI 网关连通测试失败";
}

function friendlyGatewayIssue(detail: string) {
  if (detail.includes("AI_ENDPOINT_NOT_CONFIGURED")) return "未配置 AI 服务地址";
  if (detail.includes("AI_CREDENTIAL_NOT_CONFIGURED")) return "未配置 AI 服务访问凭据";
  if (detail.includes("AI_MODEL_NOT_CONFIGURED")) return "未配置真实模型标识";
  if (detail.includes("AI_PROVIDER_HTTP_401") || detail.includes("AI_PROVIDER_HTTP_403")) return "AI 服务拒绝凭据，请检查 API Key 权限";
  if (detail.includes("AI_PROVIDER_HTTP_404")) return "AI 服务地址或模型不存在";
  if (detail.includes("AbortError")) return "AI 服务连通测试超时";
  if (detail.includes("EMAIL_INTEGRATION_DISABLED")) return "询价邮件集成已停用";
  if (detail.includes("EMAIL_PROVIDER_UNSUPPORTED")) return "询价邮件服务商必须配置为 Resend";
  if (detail.includes("EMAIL_CREDENTIAL_INCOMPLETE")) return "请同时配置 Resend API Key 和 Webhook 签名密钥";
  if (detail.includes("EMAIL_BUSINESS_CONFIG_INCOMPLETE")) return "请补齐发件邮箱、回复邮箱、HTTPS 公开地址和事件回调地址";
  if (detail.includes("EMAIL_PUBLIC_PORTAL_UNREACHABLE")) return "供应商报价门户无法匿名访问，或公开地址未返回有效健康标识";
  if (detail.includes("EMAIL_SENDER_DOMAIN_NOT_VERIFIED")) return "发件邮箱域名尚未在 Resend 验证，请使用自有域名邮箱";
  if (detail.includes("EMAIL_PROVIDER_HTTP_401") || detail.includes("EMAIL_PROVIDER_HTTP_403")) return "Resend 拒绝访问凭据，请检查 API Key 权限";
  if (detail.includes("EMAIL_PROVIDER_HTTP_")) return `Resend 连通测试失败：${detail}`;
  return detail;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const [integrationsResult, organizationResult, auditsResult, manageable] = await Promise.all([
      access.supabase
        .from("wpi_integrations")
        .select("id, integration_code, integration_type, name, provider, description, endpoint_url, status, credential_state, credential_hint, config, last_validated_at, last_success_at, last_error, is_system, created_at, updated_at")
        .eq("organization_id", access.organizationId)
        .order("is_system", { ascending: false })
        .order("name"),
      access.supabase.from("wpi_organizations").select("id, code, name").eq("id", access.organizationId).maybeSingle(),
      access.supabase
        .from("wpi_audit_logs")
        .select("id, actor_id, action, record_id, old_data, new_data, created_at")
        .eq("organization_id", access.organizationId)
        .eq("table_name", "wpi_integrations")
        .order("created_at", { ascending: false })
        .limit(20),
      canManageSettings(access),
    ]);

    const firstError = integrationsResult.error || organizationResult.error;
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });
    return NextResponse.json({
      organization: organizationResult.data,
      currentRole: access.role,
      canManage: manageable,
      integrations: integrationsResult.data ?? [],
      audits: auditsResult.error ? [] : auditsResult.data ?? [],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取外部集成失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    if (!(await canManageSettings(access))) return NextResponse.json({ error: "当前角色没有维护外部集成的权限" }, { status: 403 });
    const body = await request.json();
    const action = cleanText(body.action, 32);

    if (action === "set_credential") {
      const id = cleanText(body.id, 80);
      const secret = cleanText(body.credential, 4096);
      if (!id || secret.length < 6) return NextResponse.json({ error: "凭据至少需要 6 个字符" }, { status: 400 });
      const integration = await access.supabase
        .from("wpi_integrations")
        .select("integration_type")
        .eq("organization_id", access.organizationId)
        .eq("id", id)
        .maybeSingle();
      if (integration.error) return NextResponse.json({ error: integration.error.message }, { status: 500 });
      if (!integration.data) return NextResponse.json({ error: "集成不存在" }, { status: 404 });
      if (integration.data.integration_type === "email") {
        try {
          const parsed = JSON.parse(secret) as { apiKey?: string; webhookSecret?: string };
          if (!parsed.apiKey?.trim() || !parsed.webhookSecret?.trim()) {
            return NextResponse.json({ error: "Resend API Key 和 Webhook 签名密钥必须同时填写" }, { status: 400 });
          }
        } catch {
          return NextResponse.json({ error: "邮件凭据格式无效，请重新填写 API Key 和 Webhook 签名密钥" }, { status: 400 });
        }
      }
      const result = await access.supabase.rpc("wpi_set_integration_credential", {
        target_integration_id: id,
        credential_value: secret,
        credential_hint: credentialHint(secret),
      });
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "clear_credential") {
      const id = cleanText(body.id, 80);
      if (!id) return NextResponse.json({ error: "缺少集成 ID" }, { status: 400 });
      const result = await access.supabase.rpc("wpi_clear_integration_credential", { target_integration_id: id });
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "validate") {
      const id = cleanText(body.id, 80);
      const existing = await access.supabase
        .from("wpi_integrations")
        .select("integration_type, endpoint_url, credential_state, config")
        .eq("organization_id", access.organizationId)
        .eq("id", id)
        .maybeSingle();
      if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
      if (!existing.data) return NextResponse.json({ error: "集成不存在或无权验证" }, { status: 404 });
      const issues = validateConfiguration(existing.data);
      let gatewayResult: { model?: string; latencyMs?: number; requestId?: string } | null = null;
      if (issues.length === 0 && existing.data.integration_type === "ai_provider") {
        const invoked = await access.supabase.functions.invoke("wpi-ai-gateway", {
          body: {
            action: "validate_integration",
            organizationId: access.organizationId,
            integrationId: id,
          },
        });
        if (invoked.error) issues.push(friendlyGatewayIssue(await edgeFunctionErrorDetail(invoked.error)));
        else gatewayResult = invoked.data as typeof gatewayResult;
      }
      if (issues.length === 0 && existing.data.integration_type === "email") {
        const invoked = await access.supabase.functions.invoke("wpi-inquiry-mailer", {
          body: { action: "validate", organizationId: access.organizationId },
        });
        if (invoked.error) issues.push(await edgeFunctionErrorDetail(invoked.error));
      }
      const now = new Date().toISOString();
      const update = await access.supabase
        .from("wpi_integrations")
        .update({
          status: issues.length ? "error" : "active",
          last_validated_at: now,
          last_success_at: issues.length ? null : now,
          last_error: issues.length ? issues.join("；") : null,
          updated_by: access.userId,
        })
        .eq("organization_id", access.organizationId)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
      return NextResponse.json({
        ok: true,
        valid: issues.length === 0,
        issues,
        gateway: gatewayResult,
      });
    }

    const integrationType = cleanText(body.integrationType, 40);
    const integrationCode = cleanText(body.integrationCode, 64).toUpperCase();
    const name = cleanText(body.name, 100);
    const provider = cleanText(body.provider, 100);
    if (!typeSet.has(integrationType)) return NextResponse.json({ error: "集成类型无效" }, { status: 400 });
    if (!codePattern.test(integrationCode)) return NextResponse.json({ error: "集成编码格式无效" }, { status: 400 });
    if (!name || !provider) return NextResponse.json({ error: "名称和服务商不能为空" }, { status: 400 });

    const result = await access.supabase
      .from("wpi_integrations")
      .insert({
        organization_id: access.organizationId,
        integration_code: integrationCode,
        integration_type: integrationType,
        name,
        provider,
        description: cleanText(body.description, 500) || null,
        endpoint_url: cleanText(body.endpointUrl, 500) || null,
        config: cleanConfig(body.config),
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select("id")
      .single();
    if (result.error) {
      const duplicated = result.error.code === "23505";
      return NextResponse.json({ error: duplicated ? "当前组织已存在相同集成编码" : result.error.message }, { status: duplicated ? 409 : 500 });
    }
    return NextResponse.json({ ok: true, id: result.data.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "外部集成操作失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    if (!(await canManageSettings(access))) return NextResponse.json({ error: "当前角色没有维护外部集成的权限" }, { status: 403 });
    const body = await request.json();
    const id = cleanText(body.id, 80);
    if (!id) return NextResponse.json({ error: "缺少集成 ID" }, { status: 400 });
    const updates: Record<string, unknown> = { updated_by: access.userId };
    if (body.name !== undefined) updates.name = cleanText(body.name, 100);
    if (body.provider !== undefined) updates.provider = cleanText(body.provider, 100);
    if (body.description !== undefined) updates.description = cleanText(body.description, 500) || null;
    if (body.endpointUrl !== undefined) updates.endpoint_url = cleanText(body.endpointUrl, 500) || null;
    if (body.config !== undefined) updates.config = cleanConfig(body.config);
    if (body.status !== undefined) {
      const status = cleanText(body.status, 24);
      if (!new Set(["unconfigured", "active", "disabled", "error"]).has(status)) return NextResponse.json({ error: "集成状态无效" }, { status: 400 });
      updates.status = status;
    }
    const result = await access.supabase
      .from("wpi_integrations")
      .update(updates)
      .eq("organization_id", access.organizationId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    if (!result.data) return NextResponse.json({ error: "集成不存在或无权修改" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新外部集成失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    if (!(await canManageSettings(access))) return NextResponse.json({ error: "当前角色没有维护外部集成的权限" }, { status: 403 });
    const id = cleanText(request.nextUrl.searchParams.get("id"), 80);
    const existing = await access.supabase
      .from("wpi_integrations")
      .select("id, is_system, credential_state")
      .eq("organization_id", access.organizationId)
      .eq("id", id)
      .maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
    if (!existing.data) return NextResponse.json({ error: "集成不存在" }, { status: 404 });
    if (existing.data.is_system) return NextResponse.json({ error: "系统预置集成不能删除，可停用" }, { status: 409 });
    if (existing.data.credential_state !== "missing") {
      const cleared = await access.supabase.rpc("wpi_clear_integration_credential", { target_integration_id: id });
      if (cleared.error) return NextResponse.json({ error: cleared.error.message }, { status: 500 });
    }
    const result = await access.supabase.from("wpi_integrations").delete().eq("organization_id", access.organizationId).eq("id", id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除外部集成失败" }, { status: 500 });
  }
}
