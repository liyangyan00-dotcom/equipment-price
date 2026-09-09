import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type WorkflowAction =
  | "request_review"
  | "record_confirmation"
  | "adopt_ai_recommendation"
  | "complete_parameters";

type ParameterInput = {
  name?: string;
  value?: string;
  unit?: string;
};

const writableRoles = new Set(["admin", "manager", "editor"]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function resolvePrice(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  id: string
) {
  const query = () =>
    access.supabase
      .from("wpi_equipment_prices")
      .select("*")
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

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!writableRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有设备价格工作流写入权限" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: WorkflowAction;
    recommendedUsdPrice?: number;
    aiReason?: string;
    comment?: string;
    parameters?: ParameterInput[];
  };
  const action = body.action;
  if (
    !action ||
    ![
      "request_review",
      "record_confirmation",
      "adopt_ai_recommendation",
      "complete_parameters",
    ].includes(action)
  ) {
    return NextResponse.json({ error: "无效的设备价格工作流动作" }, { status: 400 });
  }

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

  const [{ data: currentReview, error: reviewReadError }, attachmentsResult] =
    await Promise.all([
      access.supabase
        .from("wpi_equipment_price_reviews")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("equipment_price_id", price.id)
        .maybeSingle(),
      access.supabase
        .from("wpi_attachments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", access.organizationId)
        .eq("related_type", "equipment_price")
        .eq("related_id", price.id),
    ]);

  if (reviewReadError || attachmentsResult.error) {
    return NextResponse.json(
      { error: "暂时无法读取价格审核上下文，请稍后重试" },
      { status: 500 }
    );
  }

  if (currentReview && ["pending", "in_review"].includes(currentReview.status)) {
    if (action === "request_review") {
      return NextResponse.json({
        data: {
          price,
          review: currentReview,
          action,
          alreadyQueued: true,
        },
        source: "supabase",
      });
    }
    return NextResponse.json(
      { error: "该设备价格正在审核中，当前不能修改价格或参数" },
      { status: 409 }
    );
  }
  if (
    currentReview &&
    ["approved", "rejected", "archived"].includes(currentReview.status)
  ) {
    return NextResponse.json(
      { error: "该审核记录已形成终态，请创建价格修订版本后重新提交" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const metadata = objectValue(price.metadata);
  const technical = objectValue(price.technical_parameters);
  const existingItems = Array.isArray(technical.items)
    ? technical.items
        .map((item) => objectValue(item))
        .filter((item) => typeof item.name === "string")
    : [];
  const suppliedParameters = (body.parameters ?? [])
    .map((item) => ({
      name: item.name?.trim() ?? "",
      value: item.value?.trim() ?? "",
      unit: item.unit?.trim() ?? "",
    }))
    .filter((item) => item.name && item.value);

  let nextItems = existingItems;
  if (action === "complete_parameters") {
    const suppliedByName = new Map(
      suppliedParameters.map((item) => [item.name, item])
    );
    nextItems = existingItems.map((item) => {
      const name = String(item.name);
      const supplied = suppliedByName.get(name);
      if (!supplied) return item;
      suppliedByName.delete(name);
      return {
        ...item,
        value: supplied.value,
        unit: supplied.unit || item.unit || "",
      };
    });
    nextItems.push(
      ...Array.from(suppliedByName.values()).map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        value: item.value,
        unit: item.unit,
        required: false,
      }))
    );
  }

  const existingMissingFields = stringArray(currentReview?.missing_fields);
  const completedNames = new Set(suppliedParameters.map((item) => item.name));
  const missingFields = existingMissingFields.filter(
    (field) => !completedNames.has(field)
  );
  const existingMatchedRules = stringArray(currentReview?.matched_rules);
  const actionRule =
    action === "adopt_ai_recommendation"
      ? "AI推荐价格待人工确认"
      : action === "record_confirmation"
        ? "业务确认记录待审核"
        : "";
  const matchedRules = Array.from(
    new Set([...existingMatchedRules, actionRule].filter(Boolean))
  );

  const recommendedUsdPrice = Number(body.recommendedUsdPrice);
  if (
    action === "adopt_ai_recommendation" &&
    (!Number.isFinite(recommendedUsdPrice) || recommendedUsdPrice <= 0)
  ) {
    return NextResponse.json({ error: "AI推荐价格必须大于 0" }, { status: 400 });
  }
  if (action === "complete_parameters" && suppliedParameters.length === 0) {
    return NextResponse.json(
      { error: "请至少填写一项需要补全的技术参数" },
      { status: 400 }
    );
  }

  const nextConfidence =
    action === "complete_parameters"
      ? Math.max(Number(price.confidence ?? 0), 85)
      : Number(price.confidence ?? 60);
  const completeness = Math.max(
    40,
    Math.min(
      100,
      Number(currentReview?.completeness ?? nextConfidence) +
        (action === "complete_parameters" ? suppliedParameters.length * 4 : 0)
    )
  );

  const pricePatch: Record<string, unknown> = {
    review_status: "pending_review",
    updated_by: access.userId,
    confidence: nextConfidence,
    metadata: {
      ...metadata,
      aiWorkflowAction: action,
      aiWorkflowUpdatedAt: now,
      aiReason: body.aiReason?.trim() || metadata.aiReason || null,
      manualConfirmation:
        action === "record_confirmation"
          ? {
              confirmedBy: access.userId,
              confirmedAt: now,
              comment: body.comment?.trim() || "业务侧已记录确认，等待审核人终审。",
            }
          : metadata.manualConfirmation || null,
      aiRecommendation:
        action === "adopt_ai_recommendation"
          ? {
              previousUsdPrice: Number(price.usd_price ?? 0),
              recommendedUsdPrice,
              adoptedBy: access.userId,
              adoptedAt: now,
              reason: body.aiReason?.trim() || null,
              finalDecision: "pending_review",
            }
          : metadata.aiRecommendation || null,
    },
  };

  if (action === "adopt_ai_recommendation") {
    pricePatch.usd_price = recommendedUsdPrice;
  }
  if (action === "complete_parameters") {
    pricePatch.technical_parameters = {
      ...technical,
      items: nextItems,
      completeness,
    };
  }

  const { data: updatedPrice, error: updateError } = await access.supabase
    .from("wpi_equipment_prices")
    .update(pricePatch)
    .eq("organization_id", access.organizationId)
    .eq("id", price.id)
    .select("*")
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const existingChecks = objectValue(currentReview?.evidence_checks);
  const priceSourceReady = Boolean(
    price.source_type && (price.source_url || (attachmentsResult.count ?? 0) > 0)
  );
  const technicalReady = nextItems.length > 0 || Boolean(technical.specification);
  const evidenceChecks = {
    ...existingChecks,
    price_source: priceSourceReady,
    supplier: Boolean(price.supplier_id),
    technical_parameters: technicalReady,
    validity: Boolean(price.valid_until),
    attachment_count: attachmentsResult.count ?? 0,
    _states: {
      price_source: priceSourceReady ? "verified" : "missing",
      supplier: price.supplier_id ? "verified" : "missing",
      technical_parameters: technicalReady ? "verified" : "missing",
      validity: price.valid_until ? "verified" : "missing",
    },
    _updated_at: now,
  };
  if (action === "complete_parameters") {
    evidenceChecks.technical_parameters = true;
  }

  const reviewPayload = {
    confidence: nextConfidence,
    completeness,
    riskLevel: price.risk_level,
    matchedRules,
    missingFields,
    evidenceChecks,
    aiJudgment:
      body.aiReason?.trim() ||
      currentReview?.ai_judgment ||
      "设备价格工作流已更新，等待人工复核。",
    aiRecommendation:
      action === "adopt_ai_recommendation"
        ? `建议采用 ${recommendedUsdPrice.toLocaleString("en-US")} USD，需人工审核后生效。`
        : currentReview?.ai_recommendation || "请完成证据核验后提交最终结论。",
  };

  const { data: reviewResult, error: reviewError } = await access.supabase.rpc(
    "wpi_queue_equipment_price_review",
    {
      target_price_id: price.id,
      review_payload: reviewPayload,
    }
  );
  if (reviewError) {
    const status = /already under review|finalized equipment price review/i.test(
      reviewError.message
    )
      ? 409
      : 400;
    return NextResponse.json({ error: reviewError.message }, { status });
  }
  const review = (reviewResult as { review?: Record<string, unknown> } | null)
    ?.review;

  return NextResponse.json({
    data: {
      price: updatedPrice,
      review,
      action,
    },
    source: "supabase",
  });
}
