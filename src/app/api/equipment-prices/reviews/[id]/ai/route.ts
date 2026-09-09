import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { validateEquipmentAiReviewOutput } from "@/lib/ai/equipmentReviewSchema";
import type {
  EquipmentAiEvidenceState,
  EquipmentAiReviewInput,
  EquipmentAiReviewRun,
} from "@/types/equipmentAiReview";
import type { RiskLevel } from "@/types/common";

type JsonRecord = Record<string, unknown>;

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function evidenceStates(value: unknown) {
  const checks = asObject(value);
  const storedStates = asObject(checks._states);
  const keys = ["price_source", "supplier", "technical_parameters", "validity"];
  return Object.fromEntries(
    keys.map((key) => {
      const stored = storedStates[key];
      const state: EquipmentAiEvidenceState =
        stored === "verified" || stored === "problem" || stored === "missing"
          ? stored
          : checks[key] === true
            ? "verified"
            : "missing";
      return [key, state];
    })
  );
}

async function loadGatewayMetadata(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>
) {
  const [modelResult, promptResult] = await Promise.all([
    access.supabase
      .from("wpi_ai_model_configs")
      .select("provider, model, is_enabled")
      .eq("organization_id", access.organizationId)
      .eq("workflow_key", "comparison_advice")
      .maybeSingle(),
    access.supabase
      .from("wpi_ai_prompt_templates")
      .select("template_key, version, is_enabled")
      .eq("organization_id", access.organizationId)
      .eq("template_key", "risk_assessment")
      .maybeSingle(),
  ]);
  const error = modelResult.error || promptResult.error;
  if (error) throw new Error(error.message);
  if (!modelResult.data?.is_enabled) throw new Error("AI_MODEL_WORKFLOW_DISABLED");
  if (!promptResult.data?.is_enabled) throw new Error("AI_PROMPT_DISABLED");
  if (!modelResult.data.provider || modelResult.data.provider === "unconfigured") {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  }
  if (!modelResult.data.model || modelResult.data.model === "unconfigured") {
    throw new Error("AI_MODEL_NOT_CONFIGURED");
  }
  return {
    provider: modelResult.data.provider,
    model: modelResult.data.model,
    promptKey: promptResult.data.template_key,
    promptVersion: promptResult.data.version,
    schemaVersion: "1.0",
  };
}

async function edgeFunctionErrorDetail(error: unknown) {
  if (!error || typeof error !== "object") return "AI_GATEWAY_INVOCATION_FAILED";
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { detail?: string; error?: string };
      return payload.detail || payload.error || "AI_GATEWAY_INVOCATION_FAILED";
    } catch {
      return `AI_GATEWAY_HTTP_${context.status}`;
    }
  }
  return error instanceof Error ? error.message : "AI_GATEWAY_INVOCATION_FAILED";
}

function gatewayUserMessage(detail: string) {
  if (detail.includes("AI_PROVIDER_NOT_CONFIGURED") || detail.includes("AI_MODEL_NOT_CONFIGURED")) {
    return "请先在系统设置 > AI设置中为价格分析选择已配置的模型供应商";
  }
  if (detail.includes("AI_ENDPOINT_NOT_CONFIGURED") || detail.includes("AI_CREDENTIAL_NOT_CONFIGURED")) {
    return "请先在系统设置 > 外部集成中配置 AI 服务地址和 Vault 凭据";
  }
  if (detail.includes("AI_INTEGRATION_NOT_VALIDATED")) {
    return "AI 服务尚未通过真实连通测试，请先在外部集成页面完成验证";
  }
  if (detail.includes("AI_MODEL_WORKFLOW_DISABLED") || detail.includes("AI_PROMPT_DISABLED")) {
    return "当前 AI 工作流或提示词已停用，请联系 AI 管理员";
  }
  return "AI 执行网关调用失败，已保留原人工审核数据";
}

async function loadReviewInput(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  reviewId: string
) {
  const result = await access.supabase
    .from("wpi_equipment_price_reviews")
    .select(
      `
        id, organization_id, equipment_price_id, source_kind, status,
        assigned_to, confidence, completeness, risk_level, matched_rules,
        missing_fields, evidence_checks,
        wpi_equipment_prices (
          id, price_code, equipment_name, brand, model, category,
          original_price, original_currency, usd_price, price_term,
          source_type, valid_until, wpi_suppliers (name)
        ),
        wpi_equipment_import_rows (
          id, row_number, normalized_data,
          wpi_equipment_import_batches (batch_code)
        )
      `
    )
    .eq("id", reviewId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();

  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;

  const row = result.data as unknown as JsonRecord;
  const price = asObject(row.wpi_equipment_prices);
  const supplier = asObject(price.wpi_suppliers);
  const importRow = asObject(row.wpi_equipment_import_rows);
  const batch = asObject(importRow.wpi_equipment_import_batches);
  const normalized = asObject(importRow.normalized_data);
  const isImport = row.source_kind === "import";

  const input: EquipmentAiReviewInput = {
    reviewId,
    equipmentPriceId: typeof row.equipment_price_id === "string" ? row.equipment_price_id : null,
    sourceKind: isImport ? "import" : "price",
    equipment: {
      code: isImport
        ? `${asString(batch.batch_code, "IMP-EQP")}-R${asNumber(importRow.row_number)}`
        : asString(price.price_code),
      name: isImport
        ? asString(normalized.equipment_name, "待补全设备名称")
        : asString(price.equipment_name, "待补全设备名称"),
      brand: asString(isImport ? normalized.brand : price.brand) || null,
      model: asString(isImport ? normalized.model : price.model) || null,
      category: asString(isImport ? normalized.category : price.category) || null,
      supplierName:
        asString(isImport ? normalized.supplier_name : supplier.name) || null,
      originalPrice: asNumber(
        isImport ? normalized.original_price : price.original_price
      ),
      originalCurrency: asString(
        isImport ? normalized.original_currency : price.original_currency,
        "CNY"
      ).toUpperCase(),
      usdPrice: isImport ? null : asNumber(price.usd_price) || null,
      priceTerm: asString(isImport ? normalized.price_term : price.price_term) || null,
      sourceType: isImport ? "Excel导入" : asString(price.source_type) || null,
      validUntil: isImport ? null : asString(price.valid_until) || null,
    },
    reviewContext: {
      confidence: asNumber(row.confidence),
      completeness: asNumber(row.completeness),
      riskLevel: asString(row.risk_level, "low") as RiskLevel,
      matchedRules: asStringArray(row.matched_rules),
      missingFields: asStringArray(row.missing_fields),
      evidenceStates: evidenceStates(row.evidence_checks),
      evidenceFileCount: 0,
    },
  };

  if (input.equipmentPriceId) {
    const evidenceResult = await access.supabase
      .from("wpi_attachments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("related_type", "equipment_price")
      .eq("related_id", input.equipmentPriceId)
      .eq("status", "active");
    if (evidenceResult.error) throw new Error(evidenceResult.error.message);
    input.reviewContext.evidenceFileCount = evidenceResult.count ?? 0;
  }

  return { input, row };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const review = await access.supabase
    .from("wpi_equipment_price_reviews")
    .select("id")
    .eq("id", id)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (review.error) return NextResponse.json({ error: review.error.message }, { status: 500 });
  if (!review.data) return NextResponse.json({ error: "审核任务不存在" }, { status: 404 });

  const runs = await access.supabase
    .from("wpi_equipment_ai_review_runs")
    .select(
      "id,review_id,equipment_price_id,status,provider,model,prompt_key,prompt_version,schema_version,output_payload,confidence,risk_level,requires_human_review,error_code,error_message,started_at,completed_at,created_at"
    )
    .eq("organization_id", access.organizationId)
    .eq("review_id", id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (runs.error) return NextResponse.json({ error: runs.error.message }, { status: 500 });

  return NextResponse.json({
    data: (runs.data ?? []) as unknown as EquipmentAiReviewRun[],
    source: "supabase",
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!["admin", "manager", "reviewer"].includes(access.role)) {
    return NextResponse.json({ error: "当前角色没有运行 AI 预审的权限" }, { status: 403 });
  }

  const { id } = await context.params;
  let startedRunId: string | null = null;

  try {
    const loaded = await loadReviewInput(access, id);
    if (!loaded) return NextResponse.json({ error: "审核任务不存在" }, { status: 404 });

    const metadata = await loadGatewayMetadata(access);
    const startResult = await access.supabase.rpc("wpi_start_equipment_ai_review", {
      target_review_id: id,
      run_provider: metadata.provider,
      run_model: metadata.model,
      run_prompt_key: metadata.promptKey,
      run_prompt_version: metadata.promptVersion,
      run_schema_version: metadata.schemaVersion,
      run_input_snapshot: loaded.input,
    });
    if (startResult.error) {
      return NextResponse.json({ error: startResult.error.message }, { status: 403 });
    }

    const startedRun = startResult.data as unknown as EquipmentAiReviewRun;
    startedRunId = startedRun.id;
    const gatewayResult = await access.supabase.functions.invoke("wpi-ai-gateway", {
      body: {
        action: "execute_equipment_review",
        organizationId: access.organizationId,
        businessRunId: startedRun.id,
        input: loaded.input,
      },
    });
    if (gatewayResult.error) {
      throw new Error(await edgeFunctionErrorDetail(gatewayResult.error));
    }
    const gatewayData = asObject(gatewayResult.data);
    const output = validateEquipmentAiReviewOutput(gatewayData.output);
    const finishResult = await access.supabase.rpc("wpi_finish_equipment_ai_review", {
      target_run_id: startedRun.id,
      final_status: "needs_review",
      final_output: output,
      final_confidence: output.confidence,
      final_risk_level: output.riskLevel,
      final_error_code: null,
      final_error_message: null,
    });
    if (finishResult.error) throw new Error(finishResult.error.message);

    return NextResponse.json({
      data: finishResult.data as unknown as EquipmentAiReviewRun,
      output,
      source: asString(gatewayData.provider, metadata.provider),
      gatewayRequestId: asString(gatewayData.requestId) || null,
      gatewayRunId: asString(gatewayData.gatewayRunId) || null,
      latencyMs: asNumber(gatewayData.latencyMs) || null,
      message: "AI 预审已完成，结果必须由人工审核员确认",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI_PRE_REVIEW_FAILED";
    if (startedRunId) {
      await access.supabase.rpc("wpi_finish_equipment_ai_review", {
        target_run_id: startedRunId,
        final_status: "failed",
        final_output: null,
        final_confidence: null,
        final_risk_level: null,
        final_error_code: message.split(":")[0],
        final_error_message: message,
      });
    }
    const configurationIssue = /NOT_CONFIGURED|NOT_VALIDATED|DISABLED|REQUIRED/.test(message);
    return NextResponse.json(
      { error: gatewayUserMessage(message), detail: message },
      { status: configurationIssue ? 409 : 500 }
    );
  }
}
