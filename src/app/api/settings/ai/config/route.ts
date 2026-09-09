import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  AiModelConfig,
  AiOperationMode,
  AiPromptConfig,
  AiReviewPolicyConfig,
  AiRiskRuleConfig,
  AiSettingsPayload,
  AiTaskConfig,
} from "@/types/aiSettingsConfig";

const modes = new Set<AiOperationMode>(["conservative", "balanced", "aggressive"]);
const severities = new Set(["low", "medium", "high", "critical"]);
const keyPattern = /^[a-z][a-z0-9_]{1,63}$/;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
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

function list<T>(value: unknown, name: string, mapper: (item: Record<string, unknown>, index: number) => T) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) throw new Error(`${name}配置不能为空或数量超限`);
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${name}配置格式错误`);
    return mapper(item as Record<string, unknown>, index);
  });
}

function key(value: unknown, name: string) {
  const result = text(value, 64);
  if (!keyPattern.test(result)) throw new Error(`${name}编码格式错误`);
  return result;
}

function parsePayload(value: unknown): AiSettingsPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AI配置请求格式错误");
  const input = value as Record<string, unknown>;
  const rawSettings = input.settings && typeof input.settings === "object" && !Array.isArray(input.settings)
    ? input.settings as Record<string, unknown>
    : {};
  const operationMode = modes.has(rawSettings.operationMode as AiOperationMode)
    ? rawSettings.operationMode as AiOperationMode
    : "balanced";
  const autoApproveThreshold = integer(rawSettings.autoApproveThreshold, 55, 99, 92);
  const humanReviewThreshold = integer(rawSettings.humanReviewThreshold, 1, 98, 80);
  if (humanReviewThreshold > autoApproveThreshold) throw new Error("人工复核阈值不能高于自动通过阈值");

  const models = list<AiModelConfig>(input.models, "模型", (item, index) => ({
    key: key(item.key, "模型"),
    name: text(item.name, 100) || "未命名模型",
    provider: text(item.provider, 100) || "unconfigured",
    model: text(item.model, 120) || "unconfigured",
    mode: text(item.mode, 40) || "稳健模式",
    threshold: integer(item.threshold, 1, 99, 80),
    description: text(item.description, 500),
    enabled: item.enabled !== false,
    sortOrder: integer(item.sortOrder, 0, 9999, (index + 1) * 10),
  }));
  const riskRules = list<AiRiskRuleConfig>(input.riskRules, "风险规则", (item, index) => ({
    key: key(item.key, "风险规则"),
    title: text(item.title, 100) || "未命名风险规则",
    condition: text(item.condition, 500),
    action: text(item.action, 500),
    severity: severities.has(String(item.severity)) ? item.severity as AiRiskRuleConfig["severity"] : "high",
    enabled: item.enabled !== false,
    sortOrder: integer(item.sortOrder, 0, 9999, (index + 1) * 10),
  }));
  if (riskRules.some((item) => !item.condition || !item.action)) throw new Error("风险规则必须包含触发条件和处理动作");
  const reviewPolicies = list<AiReviewPolicyConfig>(input.reviewPolicies, "人工复核规则", (item, index) => ({
    key: key(item.key, "人工复核规则"),
    title: text(item.title, 500),
    required: item.required !== false,
    enabled: item.enabled !== false,
    sortOrder: integer(item.sortOrder, 0, 9999, (index + 1) * 10),
  }));
  if (reviewPolicies.some((item) => !item.title)) throw new Error("人工复核规则内容不能为空");
  const prompts = list<AiPromptConfig>(input.prompts, "提示词", (item, index) => ({
    key: key(item.key, "提示词"),
    name: text(item.name, 100) || "未命名提示词",
    version: text(item.version, 30) || "v1.0",
    scope: text(item.scope, 300),
    content: text(item.content, 12000),
    enabled: item.enabled !== false,
    sortOrder: integer(item.sortOrder, 0, 9999, (index + 1) * 10),
  }));
  if (prompts.some((item) => item.content.length < 20 || !item.scope)) throw new Error("提示词适用范围不能为空，正文至少20个字符");
  const tasks = list<AiTaskConfig>(input.tasks, "AI任务", (item, index) => ({
    key: key(item.key, "AI任务"),
    name: text(item.name, 100) || "未命名任务",
    owner: text(item.owner, 100) || "AI管理员",
    enabled: item.enabled !== false,
    sortOrder: integer(item.sortOrder, 0, 9999, (index + 1) * 10),
  }));

  return {
    settings: {
      operationMode,
      autoApproveThreshold,
      humanReviewThreshold,
      priceDeviationThreshold: integer(rawSettings.priceDeviationThreshold, 0, 100, 15),
      boqMatchThreshold: integer(rawSettings.boqMatchThreshold, 1, 99, 86),
      riskAlertEnabled: rawSettings.riskAlertEnabled !== false,
      mandatoryHumanReview: rawSettings.mandatoryHumanReview !== false,
      configVersion: integer(rawSettings.configVersion, 1, 999999, 1),
      updatedAt: typeof rawSettings.updatedAt === "string" ? rawSettings.updatedAt : null,
    },
    models,
    riskRules,
    reviewPolicies,
    prompts,
    tasks,
  };
}

async function readConfig(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  const [settings, models, risks, reviews, prompts, tasks, organization, providers, manageable] = await Promise.all([
    access.supabase.from("wpi_ai_settings").select("operation_mode, auto_approve_threshold, human_review_threshold, price_deviation_threshold, boq_match_threshold, risk_alert_enabled, mandatory_human_review, config_version, updated_at").eq("organization_id", access.organizationId).maybeSingle(),
    access.supabase.from("wpi_ai_model_configs").select("workflow_key, name, provider, model, mode, threshold, description, is_enabled, sort_order").eq("organization_id", access.organizationId).order("sort_order"),
    access.supabase.from("wpi_ai_risk_rules").select("rule_key, title, condition_text, action_text, severity, is_enabled, sort_order").eq("organization_id", access.organizationId).order("sort_order"),
    access.supabase.from("wpi_ai_review_policies").select("policy_key, title, is_required, is_enabled, sort_order").eq("organization_id", access.organizationId).order("sort_order"),
    access.supabase.from("wpi_ai_prompt_templates").select("template_key, name, version, scope, content, is_enabled, sort_order").eq("organization_id", access.organizationId).order("sort_order"),
    access.supabase.from("wpi_ai_task_configs").select("task_key, name, owner_name, is_enabled, sort_order").eq("organization_id", access.organizationId).order("sort_order"),
    access.supabase.from("wpi_organizations").select("id, name").eq("id", access.organizationId).maybeSingle(),
    access.supabase.from("wpi_integrations").select("integration_code, name, provider, status, credential_state").eq("organization_id", access.organizationId).eq("integration_type", "ai_provider").order("name"),
    canManageSettings(access),
  ]);
  const error = settings.error || models.error || risks.error || reviews.error || prompts.error || tasks.error || organization.error || providers.error;
  if (error) throw error;
  if (!settings.data) throw new Error("当前组织尚未初始化AI配置");
  return {
    organization: organization.data,
    canManage: manageable,
    currentRole: access.role,
    settings: {
      operationMode: settings.data.operation_mode,
      autoApproveThreshold: settings.data.auto_approve_threshold,
      humanReviewThreshold: settings.data.human_review_threshold,
      priceDeviationThreshold: Number(settings.data.price_deviation_threshold),
      boqMatchThreshold: settings.data.boq_match_threshold,
      riskAlertEnabled: settings.data.risk_alert_enabled,
      mandatoryHumanReview: settings.data.mandatory_human_review,
      configVersion: settings.data.config_version,
      updatedAt: settings.data.updated_at,
    },
    models: (models.data ?? []).map((item) => ({ key: item.workflow_key, name: item.name, provider: item.provider, model: item.model, mode: item.mode, threshold: item.threshold, description: item.description, enabled: item.is_enabled, sortOrder: item.sort_order })),
    riskRules: (risks.data ?? []).map((item) => ({ key: item.rule_key, title: item.title, condition: item.condition_text, action: item.action_text, severity: item.severity, enabled: item.is_enabled, sortOrder: item.sort_order })),
    reviewPolicies: (reviews.data ?? []).map((item) => ({ key: item.policy_key, title: item.title, required: item.is_required, enabled: item.is_enabled, sortOrder: item.sort_order })),
    prompts: (prompts.data ?? []).map((item) => ({ key: item.template_key, name: item.name, version: item.version, scope: item.scope, content: item.content, enabled: item.is_enabled, sortOrder: item.sort_order })),
    tasks: (tasks.data ?? []).map((item) => ({ key: item.task_key, name: item.name, owner: item.owner_name, enabled: item.is_enabled, sortOrder: item.sort_order })),
    providers: (providers.data ?? []).map((item) => ({ code: item.integration_code, name: item.name, provider: item.provider, status: item.status, credentialState: item.credential_state })),
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    return NextResponse.json(await readConfig(access));
  } catch (error) {
    if (error instanceof Error && error.message === "当前组织尚未初始化AI配置" && await canManageSettings(access)) {
      const initialized = await access.supabase.rpc("wpi_reset_ai_settings", {
        target_organization_id: access.organizationId,
      });
      if (!initialized.error) return NextResponse.json(await readConfig(access));
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取AI配置失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    if (!(await canManageSettings(access))) return NextResponse.json({ error: "当前角色没有维护AI配置的权限" }, { status: 403 });
    const payload = parsePayload(await request.json());
    const rpcPayload = {
      settings: {
        operation_mode: payload.settings.operationMode,
        auto_approve_threshold: payload.settings.autoApproveThreshold,
        human_review_threshold: payload.settings.humanReviewThreshold,
        price_deviation_threshold: payload.settings.priceDeviationThreshold,
        boq_match_threshold: payload.settings.boqMatchThreshold,
        risk_alert_enabled: payload.settings.riskAlertEnabled,
        mandatory_human_review: payload.settings.mandatoryHumanReview,
      },
      models: payload.models.map((item) => ({ ...item, sort_order: item.sortOrder })),
      risk_rules: payload.riskRules.map((item) => ({ ...item, sort_order: item.sortOrder })),
      review_policies: payload.reviewPolicies.map((item) => ({ ...item, sort_order: item.sortOrder })),
      prompts: payload.prompts.map((item) => ({ ...item, sort_order: item.sortOrder })),
      tasks: payload.tasks.map((item) => ({ ...item, sort_order: item.sortOrder })),
    };
    const result = await access.supabase.rpc("wpi_save_ai_settings", { target_organization_id: access.organizationId, settings_payload: rpcPayload });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, version: result.data, data: await readConfig(access) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存AI配置失败" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    if (!(await canManageSettings(access))) return NextResponse.json({ error: "当前角色没有恢复AI默认配置的权限" }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    if (body.action !== "reset") return NextResponse.json({ error: "不支持的配置操作" }, { status: 400 });
    const result = await access.supabase.rpc("wpi_reset_ai_settings", { target_organization_id: access.organizationId });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, version: result.data, data: await readConfig(access) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "恢复AI默认配置失败" }, { status: 500 });
  }
}
