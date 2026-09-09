import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  EquipmentPriceCreatePayload,
  EquipmentPriceCreateResponse,
} from "@/types/equipmentPriceCreate";

const writableRoles = new Set(["admin", "manager", "editor"]);
const riskLevels = new Set(["low", "medium", "high", "critical"]);
const sortColumns: Record<string, string> = {
  equipmentCode: "price_code",
  equipmentName: "equipment_name",
  brand: "brand",
  category: "category",
  originalPrice: "original_price",
  usdPrice: "usd_price",
  confidence: "confidence",
  riskLevel: "risk_level",
  updatedAt: "updated_at",
};

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateValue(value: unknown) {
  const date = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function buildPriceCode() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `EQP-${date}-${suffix}`;
}

function normalizePayload(raw: EquipmentPriceCreatePayload) {
  const action = raw.action === "submit_review" ? "submit_review" : "draft";
  const parameters = Array.isArray(raw.technicalParameters)
    ? raw.technicalParameters
        .map((item) => ({
          id: cleanText(item.id, 80) || crypto.randomUUID(),
          name: cleanText(item.name, 80),
          value: cleanText(item.value, 240),
          unit: cleanText(item.unit, 40),
          required: Boolean(item.required),
        }))
        .filter((item) => item.name)
    : [];
  const evidence = Array.isArray(raw.evidence)
    ? raw.evidence
        .map((item) => ({
          bucket: cleanText(item.bucket, 100),
          path: cleanText(item.path, 800),
          name: cleanText(item.name, 260),
          contentType: cleanText(item.contentType, 160),
          size: Math.max(0, numberValue(item.size)),
          evidenceType: cleanText(item.evidenceType, 80) || "quote_evidence",
        }))
        .filter((item) => item.bucket && item.path && item.name)
    : [];
  const riskLevel = riskLevels.has(raw.riskLevel) ? raw.riskLevel : "medium";

  return {
    id: cleanText(raw.id, 80),
    action,
    equipmentName: cleanText(raw.equipmentName, 180),
    brand: cleanText(raw.brand, 120),
    model: cleanText(raw.model, 160),
    category: cleanText(raw.category, 120),
    unit: cleanText(raw.unit, 40) || "台",
    originalPrice: Math.max(0, numberValue(raw.originalPrice)),
    originalCurrency: cleanText(raw.originalCurrency, 12) || "CNY",
    exchangeRate: Math.max(0, numberValue(raw.exchangeRate, 7.18)),
    usdPrice: Math.max(0, numberValue(raw.usdPrice)),
    priceTerm: cleanText(raw.priceTerm, 80),
    quoteDate: dateValue(raw.quoteDate),
    validUntil: dateValue(raw.validUntil),
    taxStatus: cleanText(raw.taxStatus, 80),
    deliveryCycle: cleanText(raw.deliveryCycle, 120),
    priceBoundary: cleanText(raw.priceBoundary, 500),
    supplierId: cleanText(raw.supplierId, 80),
    sourceType: cleanText(raw.sourceType, 80),
    sourceUrl: cleanText(raw.sourceUrl, 1000),
    inquiryCode: cleanText(raw.inquiryCode, 120),
    parameters,
    confidence: Math.min(100, Math.max(0, numberValue(raw.confidence, 60))),
    riskLevel,
    aiJudgment: cleanText(raw.aiJudgment, 2000),
    aiRecommendation: cleanText(raw.aiRecommendation, 2000),
    evidence,
  };
}

function searchValue(value: string | null) {
  return cleanText(value, 120).replace(/[%_(),]/g, " ").trim();
}

export async function GET(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const keyword = searchValue(params.get("keyword"));
  const category = cleanText(params.get("category"), 120);
  const specification = cleanText(params.get("specification"), 160);
  const supplier = cleanText(params.get("supplier"), 180);
  const sourceType = cleanText(params.get("sourceType"), 80);
  const confidence = cleanText(params.get("confidence"), 4);
  const riskLevel = cleanText(params.get("riskLevel"), 20);
  const reviewStatus = cleanText(params.get("reviewStatus"), 24);
  const validity = cleanText(params.get("validity"), 24);
  const quick = cleanText(params.get("quick"), 24);
  const dateFrom = cleanText(params.get("dateFrom"), 10);
  const dateTo = cleanText(params.get("dateTo"), 10);
  const sort = sortColumns[cleanText(params.get("sort"), 40)] ?? "updated_at";
  const ascending = params.get("direction") === "asc";

  let supplierIds: string[] | null = null;
  if (supplier && supplier !== "all") {
    const { data: supplierRows, error: supplierError } = await access.supabase
      .from("wpi_suppliers")
      .select("id")
      .eq("organization_id", access.organizationId)
      .eq("name", supplier);
    if (supplierError) {
      return NextResponse.json({ error: supplierError.message }, { status: 500 });
    }
    supplierIds = (supplierRows ?? []).map((row) => row.id);
  }

  let query = access.supabase
    .from("wpi_equipment_prices")
    .select("*, wpi_suppliers(id, legacy_id, name)", { count: "exact" })
    .eq("organization_id", access.organizationId)
    .is("deleted_at", null);

  if (keyword) {
    query = query.or(
      `price_code.ilike.%${keyword}%,equipment_name.ilike.%${keyword}%,brand.ilike.%${keyword}%,model.ilike.%${keyword}%`
    );
  }
  if (category && category !== "all") query = query.eq("category", category);
  if (specification && specification !== "all") query = query.eq("model", specification);
  if (supplierIds) {
    if (!supplierIds.length) {
      return NextResponse.json({
        data: [],
        source: "supabase",
        pagination: { page: 1, pageSize, total: 0, pageCount: 1 },
      });
    }
    query = query.in("supplier_id", supplierIds);
  }
  if (sourceType && sourceType !== "all") query = query.eq("source_type", sourceType);
  if (riskLevel && riskLevel !== "all") query = query.eq("risk_level", riskLevel);
  if (reviewStatus && reviewStatus !== "all") {
    const reviewMap: Record<string, string> = {
      confirmed: "approved",
      pending: "pending_review",
      need_info: "draft",
      rejected: "rejected",
      voided: "archived",
    };
    query = query.eq("review_status", reviewMap[reviewStatus] ?? reviewStatus);
  }
  if (confidence === "A") query = query.gte("confidence", 90);
  if (confidence === "B") query = query.gte("confidence", 80).lt("confidence", 90);
  if (confidence === "C") query = query.gte("confidence", 70).lt("confidence", 80);
  if (confidence === "DE") query = query.lt("confidence", 70);
  if (validity === "valid30") {
    const boundary = new Date();
    boundary.setDate(boundary.getDate() + 30);
    query = query.gte("valid_until", new Date().toISOString().slice(0, 10)).lte(
      "valid_until",
      boundary.toISOString().slice(0, 10)
    );
  }
  if (validity === "expired") {
    query = query.lt("valid_until", new Date().toISOString().slice(0, 10));
  }
  if (quick === "confirmed") query = query.eq("review_status", "approved");
  if (quick === "ai") query = query.contains("metadata", { aiRecommended: true });
  if (quick === "review") query = query.in("review_status", ["draft", "pending_review"]);
  if (quick === "risk") query = query.in("risk_level", ["high", "critical"]);
  if (quick === "month") {
    const now = new Date();
    query = query.gte(
      "updated_at",
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    );
  }
  if (dateFrom) query = query.gte("metadata->>quoteDate", dateFrom);
  if (dateTo) query = query.lte("metadata->>quoteDate", dateTo);

  const [listResult, facetResult] = await Promise.all([
    query.order(sort, { ascending, nullsFirst: false }).range(from, to),
    access.supabase
      .from("wpi_equipment_prices")
      .select(
        "category,model,source_type,review_status,risk_level,updated_at,metadata,wpi_suppliers(name)"
      )
      .eq("organization_id", access.organizationId)
      .is("deleted_at", null)
      .limit(5000),
  ]);
  const { data, error, count } = listResult;

  if (error || facetResult.error) {
    return NextResponse.json(
      { error: error?.message || facetResult.error?.message },
      { status: 500 }
    );
  }
  const total = count ?? 0;
  const unique = (values: Array<string | null | undefined>) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(
      (left, right) => left.localeCompare(right, "zh-CN", { numeric: true })
    );
  const facetRows = facetResult.data ?? [];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const summary = facetRows.reduce(
    (result, row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      result.total += 1;
      if (row.review_status === "approved") result.confirmed += 1;
      if (metadata.aiRecommended === true || Boolean(metadata.aiRecommendation)) {
        result.aiRecommended += 1;
      }
      if (["draft", "pending_review"].includes(row.review_status)) result.pending += 1;
      if (["high", "critical"].includes(row.risk_level)) result.highRisk += 1;
      if (new Date(row.updated_at).getTime() >= startOfMonth.getTime()) result.updatedThisMonth += 1;
      return result;
    },
    { total: 0, confirmed: 0, aiRecommended: 0, pending: 0, highRisk: 0, updatedThisMonth: 0 }
  );
  return NextResponse.json({
    data,
    source: "supabase",
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
    facets: {
      categories: unique(facetRows.map((row) => row.category)),
      specifications: unique(facetRows.map((row) => row.model)),
      sourceTypes: unique(facetRows.map((row) => row.source_type)),
      suppliers: unique(
        facetRows.map((row) => {
          const supplier = Array.isArray(row.wpi_suppliers)
            ? row.wpi_suppliers[0]
            : row.wpi_suppliers;
          return supplier?.name;
        })
      ),
    },
    summary,
    permissions: {
      canVoid: ["admin", "manager"].includes(access.role),
    },
  });
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!writableRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有设备价格写入权限" }, { status: 403 });
  }

  let raw: EquipmentPriceCreatePayload;
  try {
    raw = (await request.json()) as EquipmentPriceCreatePayload;
  } catch {
    return NextResponse.json({ error: "请求数据格式错误" }, { status: 400 });
  }

  const payload = normalizePayload(raw);
  if (!payload.equipmentName) {
    return NextResponse.json({ error: "设备名称不能为空" }, { status: 400 });
  }
  if (payload.action === "submit_review" && payload.originalPrice <= 0) {
    return NextResponse.json({ error: "提交审核前必须填写有效价格" }, { status: 400 });
  }

  const missingFields = [
    !payload.brand ? "品牌" : "",
    !payload.model ? "规格型号" : "",
    !payload.category ? "设备类别" : "",
    !payload.supplierId ? "供应商" : "",
    !payload.sourceType ? "价格来源" : "",
    !payload.validUntil ? "有效期" : "",
    ...payload.parameters
      .filter((item) => item.required && !item.value)
      .map((item) => item.name),
  ].filter(Boolean);
  const completeness = Math.max(
    40,
    Math.min(100, Math.round(100 - missingFields.length * 7.5))
  );

  let priceId = payload.id;
  let priceCode = "";
  let revisionSourceId = "";
  let revisionSourceCode = "";
  let existingMetadata: Record<string, unknown> = {};
  let existingReviewStatus = "";
  let existingReviewTaskStatus = "";

  if (priceId) {
    const { data: existing, error: existingError } = await access.supabase
      .from("wpi_equipment_prices")
      .select("id, price_code, review_status, metadata")
      .eq("organization_id", access.organizationId)
      .eq("id", priceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "设备价格草稿不存在" }, { status: 404 });
    }
    existingMetadata =
      existing.metadata &&
      typeof existing.metadata === "object" &&
      !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};
    existingReviewStatus = existing.review_status;
    const { data: currentReview, error: currentReviewError } =
      await access.supabase
        .from("wpi_equipment_price_reviews")
        .select("status")
        .eq("organization_id", access.organizationId)
        .eq("equipment_price_id", existing.id)
        .maybeSingle();
    if (currentReviewError) {
      return NextResponse.json({ error: currentReviewError.message }, { status: 500 });
    }
    existingReviewTaskStatus = currentReview?.status ?? "";
    if (["pending", "in_review"].includes(existingReviewTaskStatus)) {
      return NextResponse.json(
        { error: "该设备价格正在审核中，请等待审核结论后再修改" },
        { status: 409 }
      );
    }
    if (
      ["approved", "rejected", "archived"].includes(existing.review_status) ||
      ["approved", "rejected", "archived"].includes(existingReviewTaskStatus)
    ) {
      revisionSourceId = existing.id;
      revisionSourceCode = existing.price_code;
      priceId = "";
      priceCode = buildPriceCode();
    } else {
      priceCode = existing.price_code;
    }
  } else {
    priceCode = buildPriceCode();
  }

  const priceRow = {
    organization_id: access.organizationId,
    price_code: priceCode,
    equipment_name: payload.equipmentName,
    brand: payload.brand || null,
    model: payload.model || null,
    category: payload.category || null,
    original_price: payload.originalPrice,
    original_currency: payload.originalCurrency,
    usd_price: payload.usdPrice || null,
    price_term: payload.priceTerm || null,
    supplier_id: payload.supplierId || null,
    source_type: payload.sourceType || null,
    source_url: payload.sourceUrl || null,
    valid_until: payload.validUntil,
    confidence: payload.confidence,
    risk_level: payload.riskLevel,
    review_status:
      payload.action === "draft" && existingReviewStatus === "pending_review"
        ? "pending_review"
        : "draft",
    technical_parameters: {
      items: payload.parameters,
      specification: payload.model,
      unit: payload.unit,
      completeness,
    },
    metadata: {
      ...existingMetadata,
      unit: payload.unit,
      exchangeRate: payload.exchangeRate,
      quoteDate: payload.quoteDate,
      taxStatus: payload.taxStatus,
      deliveryCycle: payload.deliveryCycle,
      priceBoundary: payload.priceBoundary,
      inquiryCode: payload.inquiryCode,
      aiJudgment: payload.aiJudgment,
      aiRecommendation: payload.aiRecommendation,
      entryMode: revisionSourceId
        ? "manual_revision"
        : payload.id
          ? "manual_edit"
          : "manual_create",
      revisionOf: revisionSourceId || existingMetadata.revisionOf || null,
      previousPriceCode:
        revisionSourceCode || existingMetadata.previousPriceCode || null,
    },
    updated_by: access.userId,
  };

  if (priceId) {
    const { error } = await access.supabase
      .from("wpi_equipment_prices")
      .update(priceRow)
      .eq("organization_id", access.organizationId)
      .eq("id", priceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { data, error } = await access.supabase
      .from("wpi_equipment_prices")
      .insert({ ...priceRow, created_by: access.userId })
      .select("id, price_code")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    priceId = data.id;
    priceCode = data.price_code;
  }

  if (!priceId) {
    return NextResponse.json({ error: "设备价格保存失败" }, { status: 500 });
  }

  if (payload.evidence.length) {
    let evidenceToAttach = payload.evidence;
    if (revisionSourceId) {
      const { data: inheritedEvidence, error: inheritedError } =
        await access.supabase
          .from("wpi_attachments")
          .select("bucket_id,object_path")
          .eq("organization_id", access.organizationId)
          .eq("related_type", "equipment_price")
          .eq("related_id", revisionSourceId);
      if (inheritedError) {
        return NextResponse.json(
          { error: inheritedError.message },
          { status: 500 }
        );
      }
      const inheritedPaths = new Set(
        (inheritedEvidence ?? []).map(
          (item) => `${item.bucket_id}:${item.object_path}`
        )
      );
      evidenceToAttach = payload.evidence.filter(
        (item) => !inheritedPaths.has(`${item.bucket}:${item.path}`)
      );
    }

    const attachmentRows = evidenceToAttach.map((item) => ({
      organization_id: access.organizationId,
      bucket_id: item.bucket,
      object_path: item.path,
      original_name: item.name,
      content_type: item.contentType || null,
      size_bytes: item.size,
      related_type: "equipment_price",
      related_id: priceId,
      evidence_type: item.evidenceType,
      uploaded_by: access.userId,
    }));
    if (attachmentRows.length) {
      const { error: attachmentError } = await access.supabase
        .from("wpi_attachments")
        .upsert(attachmentRows, { onConflict: "bucket_id,object_path" });
      if (attachmentError) {
        return NextResponse.json(
          { error: attachmentError.message },
          { status: 500 }
        );
      }
    }
  }

  let reviewId: string | undefined;
  let reviewStatus =
    payload.action === "draft" && existingReviewStatus === "pending_review"
      ? "pending_review"
      : "draft";
  if (payload.action === "submit_review") {
    const technicalReady =
      Boolean(payload.model) &&
      !payload.parameters.some((item) => item.required && !item.value);
    const priceSourceReady = Boolean(
      payload.sourceType && (payload.sourceUrl || payload.evidence.length > 0)
    );
    const evidenceStates = {
      price_source: priceSourceReady ? "verified" : "missing",
      supplier: payload.supplierId ? "verified" : "missing",
      technical_parameters: technicalReady ? "verified" : "missing",
      validity: payload.validUntil ? "verified" : "missing",
    };
    const matchedRules = [
      ["high", "critical"].includes(payload.riskLevel)
        ? "高风险价格需重点复核"
        : "",
      payload.confidence < 70 ? "AI置信度低于70%" : "",
      payload.sourceType.includes("AI") && !priceSourceReady
        ? "AI采集来源待核验"
        : "",
    ].filter(Boolean);

    const { data: reviewResult, error: reviewError } = await access.supabase.rpc(
      "wpi_queue_equipment_price_review",
      {
        target_price_id: priceId,
        review_payload: {
          confidence: payload.confidence,
          completeness,
          riskLevel: payload.riskLevel,
          matchedRules,
          missingFields,
          evidenceChecks: {
            price_source: priceSourceReady,
            supplier: Boolean(payload.supplierId),
            technical_parameters: technicalReady,
            validity: Boolean(payload.validUntil),
            attachment_count: payload.evidence.length,
            has_source_url: Boolean(payload.sourceUrl),
            _states: evidenceStates,
            _updated_at: new Date().toISOString(),
          },
          aiJudgment: payload.aiJudgment || null,
          aiRecommendation: payload.aiRecommendation || null,
        },
      }
    );
    if (reviewError) {
      const status = /already under review|finalized equipment price review/i.test(
        reviewError.message
      )
        ? 409
        : 500;
      return NextResponse.json({ error: reviewError.message }, { status });
    }

    reviewId = (reviewResult as { review?: { id?: string } } | null)?.review?.id;
    reviewStatus = "pending_review";
  }

  const response: EquipmentPriceCreateResponse = {
    data: {
      id: priceId,
      priceCode,
      reviewStatus,
      reviewId,
    },
    source: "supabase",
  };
  return NextResponse.json(response, {
    status: payload.id && !revisionSourceId ? 200 : 201,
  });
}
