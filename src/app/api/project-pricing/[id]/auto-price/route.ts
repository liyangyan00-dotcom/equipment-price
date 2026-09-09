import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import {
  loadProjectPricing,
  pricingSummary,
  projectPricingWriteRoles,
  type ProjectPricingItemRecord,
} from "@/lib/projectPricing/server";

type Candidate = {
  id: string;
  code: string;
  name: string;
  specification: string;
  category: string;
  price: number;
  currency: string;
  usdPrice: number | null;
  unit: string;
  region: string;
  priceTerm: string;
  validUntil: string;
  quoteDate: string;
  sourceConfidence: number;
  supplierId: string | null;
  supplierName: string;
  sourceType: "equipment_price" | "material_price";
};

const approvedReviewStatus = "approved";
const lockedDecisionStatuses = new Set(["confirmed", "manual_selected"]);

function normalized(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeToUsd(
  price: number,
  currency: string,
  cnyPerUsd: number,
  storedUsdPrice?: number | null,
) {
  if (Number.isFinite(Number(storedUsdPrice)) && Number(storedUsdPrice) > 0)
    return Number(storedUsdPrice);
  const code = String(currency || "")
    .trim()
    .toUpperCase();
  if (code === "USD") return price;
  if (code === "CNY" && Number.isFinite(cnyPerUsd) && cnyPerUsd > 0)
    return price / cnyPerUsd;
  return null;
}

function score(item: ProjectPricingItemRecord, candidate: Candidate) {
  const expectedSource =
    item.category === "equipment"
      ? "equipment_price"
      : item.category === "material"
        ? "material_price"
        : null;
  if (!expectedSource || candidate.sourceType !== expectedSource)
    return { value: 0, level: "unmatched" as const, reasons: ["品类不兼容"] };
  if (
    item.category === "material" &&
    normalized(item.unit) &&
    normalized(candidate.unit) &&
    normalized(item.unit) !== normalized(candidate.unit)
  ) {
    return {
      value: 0,
      level: "unmatched" as const,
      reasons: ["计量单位不一致"],
    };
  }
  const itemName = normalized(item.item_name);
  const candidateName = normalized(candidate.name);
  const itemSpec = normalized(item.specification);
  const candidateSpec = normalized(candidate.specification);
  if (
    itemName &&
    itemName === candidateName &&
    itemSpec &&
    itemSpec === candidateSpec
  )
    return {
      value: Math.round(98 * 0.85 + candidate.sourceConfidence * 0.15),
      level: "exact" as const,
      reasons: ["名称一致", "规格一致", "业务条件通过"],
    };
  if (
    itemName &&
    (itemName === candidateName ||
      itemName.includes(candidateName) ||
      candidateName.includes(itemName))
  ) {
    return {
      value: Math.round(
        (itemSpec &&
        candidateSpec &&
        (itemSpec.includes(candidateSpec) || candidateSpec.includes(itemSpec))
          ? 92
          : 86) *
          0.85 +
          candidate.sourceConfidence * 0.15,
      ),
      level: "similar" as const,
      reasons:
        itemSpec && candidateSpec
          ? ["名称一致或相近", "规格相近", "业务条件通过"]
          : ["名称一致或相近", "业务条件通过"],
    };
  }
  if (
    itemSpec &&
    candidateSpec &&
    (itemSpec.includes(candidateSpec) || candidateSpec.includes(itemSpec))
  )
    return {
      value: Math.round(78 * 0.85 + candidate.sourceConfidence * 0.15),
      level: "model" as const,
      reasons: ["规格相近", "业务条件通过"],
    };
  if (normalized(item.category) === normalized(candidate.category))
    return {
      value: Math.round(68 * 0.85 + candidate.sourceConfidence * 0.15),
      level: "type" as const,
      reasons: ["仅品类相同"],
    };
  return {
    value: 0,
    level: "unmatched" as const,
    reasons: ["名称和规格均不匹配"],
  };
}

function alternative(entry: {
  candidate: Candidate;
  score: ReturnType<typeof score>;
}) {
  return {
    id: entry.candidate.id,
    code: entry.candidate.code,
    name: entry.candidate.name,
    specification: entry.candidate.specification,
    score: entry.score.value,
    reasons: entry.score.reasons,
    price: entry.candidate.price,
    currency: entry.candidate.currency,
    usdPrice: entry.candidate.usdPrice,
    supplierName: entry.candidate.supplierName,
    supplierId: entry.candidate.supplierId,
    sourceType: entry.candidate.sourceType,
    validUntil: entry.candidate.validUntil,
    quoteDate: entry.candidate.quoteDate,
    priceTerm: entry.candidate.priceTerm,
    region: entry.candidate.region,
  };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  if (!projectPricingWriteRoles.has(access.role))
    return NextResponse.json(
      { error: "当前角色没有自动套价权限" },
      { status: 403 },
    );
  const { id } = await context.params;
  const current = await loadProjectPricing(
    access.supabase,
    access.organizationId,
    id,
  );
  if (!current)
    return NextResponse.json({ error: "项目套价方案不存在" }, { status: 404 });
  if (!current.items.length)
    return NextResponse.json({ error: "请先上传并解析 BOQ" }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const projectPriceTerm = String(current.project.price_term || "")
    .trim()
    .toUpperCase();
  const targetRegion = String(
    current.project.metadata?.targetRegion ||
      current.project.metadata?.country ||
      "",
  ).trim();
  let equipmentQuery = access.supabase
    .from("wpi_equipment_prices")
    .select(
      "id, price_code, equipment_name, model, category, original_price, original_currency, usd_price, price_term, valid_until, confidence, risk_level, technical_parameters, supplier_id, supplier:wpi_suppliers!inner(name,review_status,region)",
    )
    .eq("organization_id", access.organizationId)
    .eq("review_status", approvedReviewStatus)
    .eq("supplier.review_status", approvedReviewStatus)
    .in("risk_level", ["low", "medium"])
    .gte("valid_until", today)
    .is("deleted_at", null)
    .limit(1000);
  if (projectPriceTerm)
    equipmentQuery = equipmentQuery.eq("price_term", projectPriceTerm);

  let materialQuery = access.supabase
    .from("wpi_material_prices")
    .select(
      "id, price_code, material_name, specification, category, unit, price, currency, region, valid_until, confidence, risk_level, metadata, supplier_id, supplier:wpi_suppliers!inner(name,review_status,region)",
    )
    .eq("organization_id", access.organizationId)
    .eq("review_status", approvedReviewStatus)
    .eq("supplier.review_status", approvedReviewStatus)
    .in("risk_level", ["low", "medium"])
    .gte("valid_until", today)
    .limit(1000);
  if (targetRegion) materialQuery = materialQuery.ilike("region", targetRegion);

  const [equipmentResult, materialResult] = await Promise.all([
    equipmentQuery,
    materialQuery,
  ]);
  const sourceError = equipmentResult.error || materialResult.error;
  if (sourceError)
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  const exchangeRate = Number(current.project.exchange_rate || 7.18);
  const candidates: Candidate[] = [
    ...(equipmentResult.data ?? []).map((row) => ({
      id: row.id,
      code: row.price_code,
      name: row.equipment_name,
      specification: row.model || "",
      category: row.category || "equipment",
      price: Number(row.original_price),
      currency: row.original_currency,
      usdPrice: normalizeToUsd(
        Number(row.original_price),
        row.original_currency,
        exchangeRate,
        Number(row.usd_price) || null,
      ),
      unit: "",
      region: String(
        (row.supplier as unknown as { region?: string } | null)?.region || "",
      ),
      priceTerm: String(row.price_term || ""),
      validUntil: String(row.valid_until || ""),
      quoteDate: String(
        (row.technical_parameters as Record<string, unknown> | null)
          ?.quoteDate || "",
      ),
      sourceConfidence: Number(row.confidence || 75),
      supplierId: row.supplier_id,
      supplierName:
        (row.supplier as unknown as { name?: string } | null)?.name ||
        "未指定供应商",
      sourceType: "equipment_price" as const,
    })),
    ...(materialResult.data ?? []).map((row) => ({
      id: row.id,
      code: row.price_code,
      name: row.material_name,
      specification: row.specification || "",
      category: row.category || "material",
      price: Number(row.price),
      currency: row.currency,
      usdPrice: normalizeToUsd(Number(row.price), row.currency, exchangeRate),
      unit: String(row.unit || ""),
      region: String(row.region || ""),
      priceTerm: "",
      validUntil: String(row.valid_until || ""),
      quoteDate: String(
        (row.metadata as Record<string, unknown> | null)?.quoteDate || "",
      ),
      sourceConfidence: Number(row.confidence || 75),
      supplierId: row.supplier_id,
      supplierName:
        (row.supplier as unknown as { name?: string } | null)?.name ||
        "未指定供应商",
      sourceType: "material_price" as const,
    })),
  ];

  const updates = current.items.map((item) => {
    if (lockedDecisionStatuses.has(item.decision_status)) return item;
    const ranked = candidates
      .map((candidate) => ({ candidate, score: score(item, candidate) }))
      .sort((a, b) => b.score.value - a.score.value);
    const best = ranked[0];
    if (!best || best.score.value < 75)
      return {
        ...item,
        confidence: best?.score.value ?? 0,
        match_level: "unmatched" as const,
        risk_level: "high" as const,
        needs_inquiry: true,
        decision_status: "gap" as const,
        price_source_type: "unmatched",
        source_record_id: null,
        source_legacy_id: null,
        supplier_id: null,
        matched_unit_price: null,
        normalized_usd_price: null,
        evidence_count: 0,
        metadata: {
          ...item.metadata,
          currencyConversionStatus: "not_applicable",
          matchingAudit: {
            algorithmVersion: "business-rules-v2",
            threshold: 75,
            candidatePoolSize: candidates.length,
            projectPriceTerm,
            targetRegion,
            checkedAt: new Date().toISOString(),
          },
          alternatives: ranked
            .slice(0, 3)
            .filter((entry) => entry.score.value >= 60)
            .map(alternative),
        },
      };
    const conversionMissing = best.candidate.usdPrice === null;
    const risk = conversionMissing
      ? "high"
      : best.score.value >= 85
        ? "low"
        : best.score.value >= 70
          ? "medium"
          : "high";
    return {
      ...item,
      confidence: best.score.value,
      match_level: best.score.level,
      risk_level: risk as "low" | "medium" | "high",
      needs_inquiry: best.score.value < 75,
      decision_status: "ai_recommended" as const,
      price_source_type: best.candidate.sourceType,
      source_record_id: best.candidate.id,
      source_legacy_id: best.candidate.code,
      supplier_id: best.candidate.supplierId,
      matched_unit_price: best.candidate.price,
      currency: best.candidate.currency,
      normalized_usd_price: best.candidate.usdPrice,
      evidence_count: Math.min(
        3,
        ranked.filter((entry) => entry.score.value >= 60).length,
      ),
      metadata: {
        ...item.metadata,
        supplierName: best.candidate.supplierName,
        selectedCandidateReasons: best.score.reasons,
        selectedCandidateValidUntil: best.candidate.validUntil,
        selectedCandidateQuoteDate: best.candidate.quoteDate,
        selectedCandidatePriceTerm: best.candidate.priceTerm,
        selectedCandidateRegion: best.candidate.region,
        matchingAudit: {
          algorithmVersion: "business-rules-v2",
          threshold: 75,
          candidatePoolSize: candidates.length,
          projectPriceTerm,
          targetRegion,
          checkedAt: new Date().toISOString(),
        },
        currencyConversionStatus: conversionMissing
          ? "manual_rate_required"
          : "converted",
        alternatives: ranked
          .slice(0, 3)
          .filter((entry) => entry.score.value >= 60)
          .map(alternative),
      },
    };
  });

  const mutableUpdates = updates.filter(
    (item) => !lockedDecisionStatuses.has(item.decision_status),
  );
  for (const item of mutableUpdates) {
    const updated = await access.supabase
      .from("wpi_project_pricing_items")
      .update({
        matched_unit_price: item.matched_unit_price,
        currency: item.currency,
        normalized_usd_price: item.normalized_usd_price,
        price_source_type: item.price_source_type,
        source_record_id: item.source_record_id,
        source_legacy_id: item.source_legacy_id,
        supplier_id: item.supplier_id,
        confidence: item.confidence,
        match_level: item.match_level,
        risk_level: item.risk_level,
        needs_inquiry: item.needs_inquiry,
        decision_status: item.decision_status,
        evidence_count: item.evidence_count,
        metadata: item.metadata,
        updated_by: access.userId,
      })
      .eq("organization_id", access.organizationId)
      .eq("project_id", id)
      .eq("id", item.id);
    if (updated.error)
      return NextResponse.json(
        { error: updated.error.message },
        { status: 400 },
      );
  }
  const summary = pricingSummary(updates);
  const projectUpdate = await access.supabase
    .from("wpi_projects")
    .update({
      pricing_result: {
        ...summary,
        pricedAt: new Date().toISOString(),
        requiresHumanReview: true,
      },
      status: "pending_review",
      risk_level: summary.highRiskItems
        ? "high"
        : summary.gapItems
          ? "medium"
          : "low",
      updated_by: access.userId,
    })
    .eq("organization_id", access.organizationId)
    .eq("id", id);
  if (projectUpdate.error)
    return NextResponse.json(
      { error: projectUpdate.error.message },
      { status: 400 },
    );
  const data = await loadProjectPricing(
    access.supabase,
    access.organizationId,
    id,
  );
  return NextResponse.json({
    data,
    source: "supabase",
    requiresHumanReview: true,
    lockedItemCount: current.items.length - mutableUpdates.length,
  });
}
