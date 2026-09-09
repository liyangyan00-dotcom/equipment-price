export type GapPlanCategory = "equipment" | "material" | "service";

export type GapPlanItem = {
  id: string;
  item_name: string;
  specification: string | null;
  category: GapPlanCategory;
  risk_level: "low" | "medium" | "high" | "critical";
  needs_inquiry: boolean;
  match_level: string;
  metadata: Record<string, unknown> | null;
};

export type GapPlanSupplier = {
  legacy_id: string | null;
  supplier_code: string;
  name: string;
  category: string | null;
  business_scope: string | null;
  region: string | null;
  confidence: number | null;
  risk_level: "low" | "medium" | "high" | "critical";
  review_status: string;
};

export type GapSupplierRecommendation = {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  region: string;
  confidence: number;
  riskLevel: GapPlanSupplier["risk_level"];
  reason: string;
};

export type GapInquiryPackage = {
  id: GapPlanCategory;
  label: string;
  packageName: string;
  itemIds: string[];
  itemCount: number;
  highRiskCount: number;
  responseDays: number;
  suppliers: GapSupplierRecommendation[];
  requiresHumanReview: true;
};

const categoryConfig: Record<GapPlanCategory, { label: string; terms: string[] }> = {
  equipment: { label: "设备", terms: ["设备", "机电", "泵", "阀", "仪表", "机械", "电气"] },
  material: { label: "地材", terms: ["地材", "材料", "建材", "水泥", "钢筋", "砂", "石", "管材"] },
  service: { label: "服务", terms: ["服务", "安装", "调试", "运维", "检测", "咨询"] },
};

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function itemTerms(items: GapPlanItem[], category: GapPlanCategory) {
  const terms = new Set(categoryConfig[category].terms.map(normalize));
  for (const item of items) {
    for (const part of normalize(`${item.item_name} ${item.specification ?? ""}`).split(" ")) {
      if (part.length >= 2) terms.add(part);
    }
  }
  return [...terms].slice(0, 30);
}

function recommendationFor(supplier: GapPlanSupplier, terms: string[], category: GapPlanCategory) {
  const haystack = normalize(`${supplier.category ?? ""} ${supplier.business_scope ?? ""}`);
  const categoryMatches = categoryConfig[category].terms.filter((term) => haystack.includes(normalize(term)));
  const keywordMatches = terms.filter((term) => haystack.includes(term));
  const riskAdjustment = supplier.risk_level === "low" ? 6 : supplier.risk_level === "medium" ? 0 : -12;
  const score = Math.max(0, Math.min(98,
    Math.round((supplier.confidence ?? 0) * 0.35 + Math.min(32, categoryMatches.length * 8) + Math.min(36, keywordMatches.length * 6) + riskAdjustment),
  ));
  const matched = [...new Set([...categoryMatches, ...keywordMatches])].slice(0, 3);
  return {
    supplierId: supplier.legacy_id ?? supplier.supplier_code,
    supplierCode: supplier.supplier_code,
    supplierName: supplier.name,
    region: supplier.region ?? "地区待核验",
    confidence: score,
    riskLevel: supplier.risk_level,
    reason: matched.length ? `业务范围匹配：${matched.join("、")}` : "已通过供应商准入，业务范围需人工复核",
  } satisfies GapSupplierRecommendation;
}

export function buildGapInquiryPlan(projectCode: string, items: GapPlanItem[], suppliers: GapPlanSupplier[]) {
  const eligibleItems = items.filter((item) => {
    const metadata = item.metadata ?? {};
    const linked = typeof metadata.inquiryId === "string" || typeof metadata.inquiryCode === "string";
    return !linked && (item.needs_inquiry || item.match_level === "unmatched");
  });
  const admittedSuppliers = suppliers.filter((supplier) => supplier.review_status === "approved" && supplier.legacy_id);

  const packages = (Object.keys(categoryConfig) as GapPlanCategory[]).flatMap((category) => {
    const categoryItems = eligibleItems.filter((item) => item.category === category);
    if (!categoryItems.length) return [];
    const terms = itemTerms(categoryItems, category);
    const recommendations = admittedSuppliers
      .map((supplier) => recommendationFor(supplier, terms, category))
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, 3);
    const highestRisk = categoryItems.some((item) => item.risk_level === "critical" || item.risk_level === "high");
    const mediumRisk = categoryItems.some((item) => item.risk_level === "medium");
    return [{
      id: category,
      label: categoryConfig[category].label,
      packageName: `${projectCode}-${categoryConfig[category].label}缺口询价`,
      itemIds: categoryItems.map((item) => item.id),
      itemCount: categoryItems.length,
      highRiskCount: categoryItems.filter((item) => item.risk_level === "critical" || item.risk_level === "high").length,
      responseDays: highestRisk ? 3 : mediumRisk ? 5 : 7,
      suppliers: recommendations,
      requiresHumanReview: true as const,
    }];
  });

  return {
    packages,
    summary: {
      eligibleItemCount: eligibleItems.length,
      packageCount: packages.length,
      supplierCandidateCount: new Set(packages.flatMap((group) => group.suppliers.map((supplier) => supplier.supplierId))).size,
      unassignedPackageCount: packages.filter((group) => group.suppliers.length === 0).length,
    },
    generatedAt: new Date().toISOString(),
    requiresHumanReview: true as const,
  };
}
