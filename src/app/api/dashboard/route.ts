import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  AiInsightCardData,
  BusinessFlowOverview,
  DashboardPayload,
  DashboardRiskAlert,
  DashboardStat,
  DistributionAnalysis,
  LatestPriceUpdate,
  PendingReviewTask,
  PriceTrendPoint,
  QuickAction,
  TrendSummary,
} from "@/data/mock/dashboard";
import type { ConfidenceLevel, RiskLevel } from "@/types/common";

type CountResult = { count: number | null; error: { message: string } | null };
type TimestampRow = { created_at: string };

const pendingStatuses = ["pending_review"];
const activeTaskStatuses = ["created", "queued", "running", "processing", "collecting", "retrying"];

function countOf(result: CountResult) {
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

function confidenceLevel(value: unknown): ConfidenceLevel {
  const score = Number(value) || 0;
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

function riskLevel(value: unknown): RiskLevel {
  const risk = String(value || "medium");
  return (["low", "medium", "high", "critical"] as const).includes(risk as RiskLevel)
    ? risk as RiskLevel
    : "medium";
}

function sourceType(value: unknown): LatestPriceUpdate["sourceType"] {
  const source = String(value || "").toLowerCase();
  if (source.includes("ai") || source.includes("采集")) return "ai_price_collection";
  if (source.includes("邮件") || source.includes("供应商")) return "supplier_email";
  return "manual";
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

function percentage(value: number, total: number) {
  return total ? Number(((value / total) * 100).toFixed(1)) : 0;
}

function distribution(rows: string[], fallback: string, limit = 6) {
  const counts = new Map<string, number>();
  rows.forEach((value) => {
    const key = value.trim() || fallback;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const total = rows.length;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value, percent: percentage(value, total) }));
}

function trendChange(current: number, previous: number) {
  if (previous === 0) return current ? `新增 ${current}` : "暂无新增";
  const rate = ((current - previous) / previous) * 100;
  return `${rate >= 0 ? "+" : ""}${rate.toFixed(1)}%`;
}

function buildTrend(rows: { equipment: TimestampRow[]; material: TimestampRow[]; leads: TimestampRow[] }, now: Date, rangeDays: number) {
  const points: PriceTrendPoint[] = [];
  const windowStart = new Date(now);
  windowStart.setUTCHours(0, 0, 0, 0);
  windowStart.setUTCDate(windowStart.getUTCDate() - (rangeDays - 1));
  for (let bucket = 0; bucket < 6; bucket += 1) {
    const start = new Date(windowStart);
    start.setUTCDate(start.getUTCDate() + Math.floor((rangeDays * bucket) / 6));
    const end = new Date(windowStart);
    end.setUTCDate(end.getUTCDate() + Math.floor((rangeDays * (bucket + 1)) / 6));
    const inBucket = (item: TimestampRow) => {
      const date = new Date(item.created_at);
      return date >= start && date < end;
    };
    points.push({
      date: start.toISOString().slice(5, 10),
      equipment: rows.equipment.filter(inBucket).length,
      material: rows.material.filter(inBucket).length,
      aiLeads: rows.leads.filter(inBucket).length,
    });
  }
  return points;
}

const quickActions: QuickAction[] = [
  { title: "新增价格", description: "手工录价", href: "/equipment-prices/create", tone: "primary" },
  { title: "上传报价", description: "AI识别", href: "/ai-quote-recognition", tone: "success" },
  { title: "AI采集线索", description: "自动采集", href: "/ai-price-collection", tone: "ai" },
  { title: "创建询价", description: "供应商询价", href: "/inquiries/create", tone: "warning" },
  { title: "AI自动套价", description: "智能套价", href: "/project-pricing", tone: "ai" },
  { title: "生成报告", description: "分析输出", href: "/ai-report-center", tone: "slate" },
];

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { supabase, organizationId } = access;
  const requestedRange = Number(request.nextUrl.searchParams.get("range"));
  const rangeDays = ([7, 30, 90].includes(requestedRange) ? requestedRange : 30) as 7 | 30 | 90;
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const currentPeriodStart = new Date(today);
  currentPeriodStart.setUTCDate(currentPeriodStart.getUTCDate() - (rangeDays - 1));
  const historyStart = new Date(currentPeriodStart);
  historyStart.setUTCDate(historyStart.getUTCDate() - rangeDays);
  const activeInquiryStatuses = ["draft", "pending_review"];

  try {
    const counts = await Promise.all([
      supabase.from("wpi_equipment_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("deleted_at", null),
      supabase.from("wpi_material_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
      supabase.from("wpi_suppliers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
      supabase.from("wpi_equipment_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("deleted_at", null).in("review_status", pendingStatuses),
      supabase.from("wpi_material_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("review_status", pendingStatuses),
      supabase.from("wpi_suppliers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("review_status", pendingStatuses),
      supabase.from("wpi_price_collection_leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["pending_review", "ready", "needs_info"]),
      supabase.from("wpi_inquiries").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "pending_review"),
      supabase.from("wpi_ai_execution_tasks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", activeTaskStatuses),
      supabase.from("wpi_price_collection_tasks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", activeTaskStatuses),
      supabase.from("wpi_ai_execution_tasks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "failed"),
      supabase.from("wpi_price_collection_tasks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "failed"),
      supabase.from("wpi_equipment_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("deleted_at", null).in("risk_level", ["high", "critical"]),
      supabase.from("wpi_material_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("risk_level", ["high", "critical"]),
      supabase.from("wpi_suppliers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("risk_level", ["high", "critical"]),
      supabase.from("wpi_price_collection_leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("risk_level", ["high", "critical"]),
      supabase.from("wpi_inquiries").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", activeInquiryStatuses).lt("deadline", now.toISOString()),
      supabase.from("wpi_equipment_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("deleted_at", null).gte("created_at", today.toISOString()),
      supabase.from("wpi_material_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", today.toISOString()),
      supabase.from("wpi_price_collection_leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", today.toISOString()),
      supabase.from("wpi_ai_execution_tasks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", today.toISOString()),
      supabase.from("wpi_ai_execution_tasks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "completed"),
      supabase.from("wpi_equipment_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("deleted_at", null).lt("valid_until", today.toISOString().slice(0, 10)),
      supabase.from("wpi_material_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).lt("valid_until", today.toISOString().slice(0, 10)),
      supabase.from("wpi_price_collection_leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
      supabase.from("wpi_price_collection_leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "pending_review"),
      supabase.from("wpi_price_collection_leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "ready"),
      supabase.from("wpi_price_collection_leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "transferred"),
      supabase.from("wpi_equipment_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("deleted_at", null).eq("review_status", "approved"),
      supabase.from("wpi_material_prices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("review_status", "approved"),
    ]);
    const values = counts.map((result) => countOf(result as CountResult));
    const [equipmentCount, materialCount, supplierCount, pendingEquipment, pendingMaterial, pendingSuppliers, pendingLeads, pendingInquiries, runningAi, runningCollection, failedAi, failedCollection, highRiskEquipment, highRiskMaterial, highRiskSuppliers, highRiskLeads, overdueInquiries, todayEquipment, todayMaterial, todayLeads, todayAiTasks, completedAi, expiredEquipment, expiredMaterial, totalCollectedLeads, pendingCollectionLeads, readyCollectionLeads, transferredCollectionLeads, approvedEquipment, approvedMaterial] = values;
    const pendingReviewCount = pendingEquipment + pendingMaterial + pendingSuppliers + pendingLeads + pendingInquiries;
    const runningCount = runningAi + runningCollection;
    const failedCount = failedAi + failedCollection;
    const highRiskCount = highRiskEquipment + highRiskMaterial + highRiskSuppliers + highRiskLeads;
    const todayInbound = todayEquipment + todayMaterial + todayLeads;

    const [equipmentRows, materialRows, leadRows, pendingSupplierRows, pendingInquiryRows, trendEquipment, trendMaterial, trendLeads, categoryRows, supplierRegionRows, confidenceEquipment, confidenceMaterial, aiRows] = await Promise.all([
      supabase.from("wpi_equipment_prices").select("id,price_code,equipment_name,category,original_price,original_currency,source_type,confidence,risk_level,review_status,valid_until,created_at,updated_at").eq("organization_id", organizationId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(8),
      supabase.from("wpi_material_prices").select("id,price_code,material_name,category,unit,price,currency,source_type,confidence,risk_level,review_status,valid_until,created_at,updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(8),
      supabase.from("wpi_price_collection_leads").select("id,lead_code,name,confidence,risk_level,status,created_at,updated_at,price_validation_reasons").eq("organization_id", organizationId).in("status", ["pending_review", "ready", "needs_info"]).order("updated_at", { ascending: false }).limit(1000),
      supabase.from("wpi_suppliers").select("id,supplier_code,name,confidence,risk_level,review_status,created_at,updated_at").eq("organization_id", organizationId).in("review_status", pendingStatuses).order("updated_at", { ascending: false }).limit(50),
      supabase.from("wpi_inquiries").select("id,inquiry_code,subject,ai_confidence,risk_level,status,created_at,updated_at").eq("organization_id", organizationId).eq("status", "pending_review").order("updated_at", { ascending: false }).limit(50),
      supabase.from("wpi_equipment_prices").select("created_at").eq("organization_id", organizationId).is("deleted_at", null).gte("created_at", historyStart.toISOString()).limit(1000),
      supabase.from("wpi_material_prices").select("created_at").eq("organization_id", organizationId).gte("created_at", historyStart.toISOString()).limit(1000),
      supabase.from("wpi_price_collection_leads").select("created_at").eq("organization_id", organizationId).gte("created_at", historyStart.toISOString()).limit(1000),
      supabase.from("wpi_equipment_prices").select("category").eq("organization_id", organizationId).is("deleted_at", null).limit(1000),
      supabase.from("wpi_suppliers").select("region").eq("organization_id", organizationId).limit(1000),
      supabase.from("wpi_equipment_prices").select("confidence").eq("organization_id", organizationId).is("deleted_at", null).limit(1000),
      supabase.from("wpi_material_prices").select("confidence").eq("organization_id", organizationId).limit(1000),
      supabase.from("wpi_ai_execution_tasks").select("title,status,confidence,risk_level,created_at,updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(100),
    ]);
    const queryResults = [equipmentRows, materialRows, leadRows, pendingSupplierRows, pendingInquiryRows, trendEquipment, trendMaterial, trendLeads, categoryRows, supplierRegionRows, confidenceEquipment, confidenceMaterial, aiRows];
    const queryError = queryResults.find((result) => result.error)?.error;
    if (queryError) throw new Error(queryError.message);

    const latestPriceUpdates: LatestPriceUpdate[] = [
      ...(equipmentRows.data || []).map((row) => ({
        id: String(row.id), itemType: "equipment" as const, itemName: String(row.equipment_name), updatedAtLabel: timeLabel(String(row.updated_at)), updatedAt: String(row.updated_at), price: Number(row.original_price) || 0, currency: String(row.original_currency || "USD"), source: String(row.source_type || "未标记来源"), sourceType: sourceType(row.source_type), confidenceLevel: confidenceLevel(row.confidence), aiTagged: sourceType(row.source_type) === "ai_price_collection", href: `/equipment-prices/${row.id}`,
      })),
      ...(materialRows.data || []).map((row) => ({
        id: String(row.id), itemType: "material" as const, itemName: String(row.material_name), updatedAtLabel: timeLabel(String(row.updated_at)), updatedAt: String(row.updated_at), price: Number(row.price) || 0, currency: String(row.currency || "USD"), unit: String(row.unit || ""), source: String(row.source_type || "未标记来源"), sourceType: sourceType(row.source_type), confidenceLevel: confidenceLevel(row.confidence), aiTagged: sourceType(row.source_type) === "ai_price_collection", href: `/material-prices/${row.id}`,
      })),
    ].sort((a, b) => new Date(String(b.updatedAt)).getTime() - new Date(String(a.updatedAt)).getTime()).slice(0, 5);

    const pendingReviewTasks: PendingReviewTask[] = [
      ...(leadRows.data || []).map((row) => ({ id: String(row.id), fileType: "email" as const, fileName: `${row.lead_code} · ${row.name}`, taskType: "price_collection" as const, aiConfidence: Number(row.confidence) || 0, confidenceLevel: confidenceLevel(row.confidence), missingFields: Array.isArray(row.price_validation_reasons) ? row.price_validation_reasons.map(String) : [], missingFieldCount: Array.isArray(row.price_validation_reasons) ? row.price_validation_reasons.length : 0, riskLevel: riskLevel(row.risk_level), status: row.status === "needs_info" ? "needs_info" as const : "needs_review" as const, createdAtLabel: timeLabel(String(row.created_at)), updatedAt: String(row.updated_at), actions: ["查看", row.status === "needs_info" ? "补充资料" : "复核"], href: `/price-leads?leadId=${encodeURIComponent(String(row.id))}` })),
      ...(equipmentRows.data || []).filter((row) => pendingStatuses.includes(String(row.review_status))).map((row) => ({ id: String(row.id), fileType: sourceType(row.source_type) === "supplier_email" ? "email" as const : "pdf" as const, fileName: `${row.price_code} · ${row.equipment_name}`, taskType: "quote_recognition" as const, aiConfidence: Number(row.confidence) || 0, confidenceLevel: confidenceLevel(row.confidence), missingFields: [], missingFieldCount: 0, riskLevel: riskLevel(row.risk_level), status: "needs_review" as const, createdAtLabel: timeLabel(String(row.created_at)), updatedAt: String(row.updated_at), actions: ["查看", "复核"], href: `/equipment-prices/${row.id}` })),
      ...(materialRows.data || []).filter((row) => pendingStatuses.includes(String(row.review_status))).map((row) => ({ id: String(row.id), fileType: sourceType(row.source_type) === "supplier_email" ? "email" as const : "pdf" as const, fileName: `${row.price_code} · ${row.material_name}`, taskType: "price_collection" as const, aiConfidence: Number(row.confidence) || 0, confidenceLevel: confidenceLevel(row.confidence), missingFields: [], missingFieldCount: 0, riskLevel: riskLevel(row.risk_level), status: "needs_review" as const, createdAtLabel: timeLabel(String(row.created_at)), updatedAt: String(row.updated_at), actions: ["查看", "复核"], href: `/material-prices/${row.id}` })),
      ...(pendingSupplierRows.data || []).map((row) => ({ id: String(row.id), fileType: "email" as const, fileName: `${row.supplier_code} · ${row.name}`, taskType: "supplier_match" as const, aiConfidence: Number(row.confidence) || 0, confidenceLevel: confidenceLevel(row.confidence), missingFields: [], missingFieldCount: 0, riskLevel: riskLevel(row.risk_level), status: "needs_review" as const, createdAtLabel: timeLabel(String(row.created_at)), updatedAt: String(row.updated_at), actions: ["查看", "复核"], href: `/suppliers/${row.id}` })),
      ...(pendingInquiryRows.data || []).map((row) => ({ id: String(row.id), fileType: "email" as const, fileName: `${row.inquiry_code} · ${row.subject}`, taskType: "quote_recognition" as const, aiConfidence: Number(row.ai_confidence) || 0, confidenceLevel: confidenceLevel(row.ai_confidence), missingFields: [], missingFieldCount: 0, riskLevel: riskLevel(row.risk_level), status: "needs_review" as const, createdAtLabel: timeLabel(String(row.created_at)), updatedAt: String(row.updated_at), actions: ["查看", "复核"], href: `/inquiries/${row.id}` })),
    ].sort((a, b) => new Date(String(b.updatedAt)).getTime() - new Date(String(a.updatedAt)).getTime()).slice(0, 5);

    const trendRows = {
      equipment: (trendEquipment.data || []) as TimestampRow[],
      material: (trendMaterial.data || []) as TimestampRow[],
      leads: (trendLeads.data || []) as TimestampRow[],
    };
    const priceTrendData = buildTrend(trendRows, now, rangeDays);
    const splitPeriod = (rows: TimestampRow[]) => ({ current: rows.filter((row) => new Date(row.created_at) >= currentPeriodStart).length, previous: rows.filter((row) => new Date(row.created_at) < currentPeriodStart).length });
    const equipmentPeriod = splitPeriod(trendRows.equipment);
    const materialPeriod = splitPeriod(trendRows.material);
    const leadPeriod = splitPeriod(trendRows.leads);
    const trendSummaries: TrendSummary[] = [
      { label: "设备价格新增", value: trendChange(equipmentPeriod.current, equipmentPeriod.previous), description: `近${rangeDays}天新增 ${equipmentPeriod.current} 条`, tone: "blue" },
      { label: "地材价格新增", value: trendChange(materialPeriod.current, materialPeriod.previous), description: `近${rangeDays}天新增 ${materialPeriod.current} 条`, tone: "green" },
      { label: "AI线索新增", value: trendChange(leadPeriod.current, leadPeriod.previous), description: `近${rangeDays}天新增 ${leadPeriod.current} 条`, tone: "purple" },
    ];

    const confidenceValues = [...(confidenceEquipment.data || []), ...(confidenceMaterial.data || [])].map((row) => Number(row.confidence) || 0);
    const confidenceGroups = [
      { name: "高置信度 ≥90%", value: confidenceValues.filter((value) => value >= 90).length },
      { name: "中置信度 70-90%", value: confidenceValues.filter((value) => value >= 70 && value < 90).length },
      { name: "低置信度 <70%", value: confidenceValues.filter((value) => value < 70).length },
    ].map((item) => ({ ...item, percent: percentage(item.value, confidenceValues.length) }));
    const distributionAnalyses: DistributionAnalysis[] = [
      { title: "设备分类分布", description: "按真实设备价格条目统计", conclusion: "用于识别价格覆盖集中度。", centerValue: equipmentCount.toLocaleString("zh-CN"), data: distribution((categoryRows.data || []).map((row) => String(row.category || "")), "未分类"), type: "donut", tone: "blue" },
      { title: "供应商区域分布", description: "按真实供应商档案统计", conclusion: "用于识别区域供应资源缺口。", centerValue: supplierCount.toLocaleString("zh-CN"), data: distribution((supplierRegionRows.data || []).map((row) => String(row.region || "")), "地区待补充"), type: "donut", tone: "cyan" },
      { title: "价格可信度分布", description: "设备与地材真实置信度", conclusion: "中低置信度价格需优先人工复核。", centerValue: (equipmentCount + materialCount).toLocaleString("zh-CN"), data: confidenceGroups, type: "donut", tone: "purple" },
    ];

    const expiredCount = expiredEquipment + expiredMaterial;
    const needInfoCount = (leadRows.data || []).filter((row) => Array.isArray(row.price_validation_reasons) && row.price_validation_reasons.length > 0).length;
    const riskAlerts: DashboardRiskAlert[] = [
      { id: "expired", title: "价格已过期", count: expiredCount, riskType: "expired_price", target: `${expiredCount} 条设备与地材价格`, riskLevel: expiredCount ? "high" : "low", suggestedAction: "重新询价并刷新价格依据。", actionLabel: "查看过期价格", aiAdvice: "过期价格不应直接进入项目套价。", recommendedOperation: "重新询价", href: "/material-prices?validity=expired" },
      { id: "high-risk", title: "高风险业务记录", count: highRiskCount, riskType: "low_price_outlier", target: `${highRiskCount} 条价格、线索或供应商记录`, riskLevel: highRiskCount ? "high" : "low", suggestedAction: "核对来源、商务条件和履约能力。", actionLabel: "进入风险复核", aiAdvice: "高风险记录必须保留人工最终判断。", recommendedOperation: "人工复核", href: "/pending-quotes?risk=high" },
      { id: "missing", title: "资料需要补充", count: needInfoCount, riskType: "missing_parameters", target: `${needInfoCount} 条价格记录`, riskLevel: needInfoCount ? "medium" : "low", suggestedAction: "补充规格、单位、币种、地区和有效期。", actionLabel: "补充资料", aiAdvice: "字段不完整会降低比价和套价可用性。", recommendedOperation: "补充资料", href: "/pending-quotes?status=need_info" },
      { id: "failed", title: "自动任务执行失败", count: failedCount, riskType: "volatile_price", target: `${failedCount} 个 AI 或采集任务`, riskLevel: failedCount ? "high" : "low", suggestedAction: "查看错误原因并决定重试或终止。", actionLabel: "查看失败任务", aiAdvice: "失败任务应先排除配置与数据源问题。", recommendedOperation: "查看日志", href: "/ai-workbench?status=failed" },
    ];

    const aiTaskRows = aiRows.data || [];
    const averageConfidence = aiTaskRows.length ? Math.round(aiTaskRows.reduce((sum, row) => sum + (Number(row.confidence) || 0), 0) / aiTaskRows.length) : 0;
    const totalAiOutcome = completedAi + failedAi;
    const recognitionRate = totalAiOutcome ? Number(((completedAi / totalAiOutcome) * 100).toFixed(1)) : 0;
    const latestAi = aiTaskRows[0];
    const stats: DashboardStat[] = [
      { key: "pending", title: "待人工复核", value: pendingReviewCount.toLocaleString("zh-CN"), description: "价格、线索、供应商与询价", trendLabel: "当前积压", trendDirection: pendingReviewCount ? "up" : "flat", href: "/dashboard#pending-review" },
      { key: "running", title: "采集运行中", value: runningCount.toLocaleString("zh-CN"), description: "AI任务与价格采集队列", trendLabel: runningCount ? "正在执行" : "当前空闲", trendDirection: "flat", href: "/ai-price-collection" },
      { key: "failed", title: "执行失败", value: failedCount.toLocaleString("zh-CN"), description: "AI任务与价格采集异常", trendLabel: failedCount ? "需要处理" : "运行正常", trendDirection: failedCount ? "up" : "down", href: "/ai-workbench?status=failed" },
      { key: "risk", title: "高风险记录", value: highRiskCount.toLocaleString("zh-CN"), description: "价格、线索与供应商", trendLabel: highRiskCount ? "必须复核" : "暂无高风险", trendDirection: highRiskCount ? "up" : "down", href: "/dashboard#risk-review" },
      { key: "overdue", title: "询价已超期", value: overdueInquiries.toLocaleString("zh-CN"), description: "未完成且超过截止时间", trendLabel: overdueInquiries ? "需要跟进" : "暂无超期", trendDirection: overdueInquiries ? "up" : "down", href: "/inquiries?overdue=true" },
      { key: "today", title: "今日新增入库", value: todayInbound.toLocaleString("zh-CN"), description: "设备、地材与价格线索", trendLabel: `设备 ${todayEquipment} · 地材 ${todayMaterial} · 线索 ${todayLeads}`, trendDirection: todayInbound ? "up" : "flat", href: "/dashboard#latest-updates" },
    ];
    const aiInsightCards: AiInsightCardData[] = [
      { id: "lead", title: "线索发现", value: pendingLeads, unit: "条", judgment: "真实采集线索等待审核后进入价格库。", action: "进入线索池", tone: "info", breakdown: [["待复核线索", `${pendingLeads} 条`], ["今日新增", `${todayLeads} 条`]], changeLabel: "Supabase 实时统计" },
      { id: "gap", title: "风险与缺口", value: highRiskCount + needInfoCount, unit: "项", judgment: "高风险和资料缺失记录会影响比价与项目套价。", action: "处理缺口", tone: "warning", breakdown: [["高风险", `${highRiskCount} 项`], ["需补资料", `${needInfoCount} 项`]], changeLabel: "按当前待办统计" },
      { id: "inquiry", title: "建议询价任务", value: highRiskCount + expiredCount, unit: "项", judgment: "建议对高风险和过期价格发起二次询价。", action: "创建询价任务", tone: "ai", breakdown: [["高风险价格", `${highRiskEquipment + highRiskMaterial} 项`], ["过期价格", `${expiredCount} 项`]], changeLabel: "需人工确认后创建" },
    ];
    const usablePriceCount = approvedEquipment + approvedMaterial;
    const flowConversionRate = percentage(transferredCollectionLeads, totalCollectedLeads);
    const businessFlow: BusinessFlowOverview = {
      stages: [
        { key: "collected", title: "已采集线索", value: totalCollectedLeads, description: "进入候选线索池", href: "/price-leads", tone: "blue" },
        { key: "pending", title: "待人工审核", value: pendingCollectionLeads, description: "核验来源与字段", href: "/price-leads?status=待确认", tone: "orange" },
        { key: "ready", title: "可入库", value: readyCollectionLeads, description: "已通过人工确认", href: "/price-leads?status=可入库", tone: "green" },
        { key: "transferred", title: "已入库", value: transferredCollectionLeads, description: "已写入正式价格库", href: "/price-leads?status=已入库", tone: "purple" },
        { key: "usable", title: "可用价格", value: usablePriceCount, description: "设备与地材已审批", href: "/material-prices", tone: "cyan" },
      ],
      conversionRate: flowConversionRate,
      aiSummary: pendingCollectionLeads > 0
        ? `当前主要阻塞在人工审核阶段，仍有 ${pendingCollectionLeads} 条线索待核验。`
        : readyCollectionLeads > 0
          ? `已有 ${readyCollectionLeads} 条线索满足入库条件，可安排人工确认后入库。`
          : totalCollectedLeads > 0
            ? "当前线索均已完成阶段处理，请继续关注正式价格的有效期和置信度。"
            : "当前尚未形成价格线索，建议先启动受控采集任务。",
      recommendedAction: pendingCollectionLeads > 0 ? "处理待审核线索" : readyCollectionLeads > 0 ? "确认并入库" : "启动价格采集",
      actionHref: pendingCollectionLeads > 0 ? "/price-leads?status=待确认" : readyCollectionLeads > 0 ? "/price-leads?status=可入库" : "/ai-price-collection",
      attention: pendingCollectionLeads > 0 ? "warning" : "success",
    };

    const payload: DashboardPayload = {
      hero: { aiTaskStatus: `${runningCount} 运行 · ${pendingReviewCount} 待复核`, updatedAt: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Shanghai" }).format(now) },
      stats,
      aiWorkbenchOverview: { todayTaskCount: todayAiTasks, recognitionRate, riskResultCount: highRiskCount, suggestedActionCount: highRiskCount + failedCount + overdueInquiries, pendingReviewCount, currentTaskName: latestAi ? String(latestAi.title) : "当前没有 AI 执行任务", recommendedAction: failedCount ? "处理失败任务" : pendingReviewCount ? "发起复核" : "暂无待办", latestSuggestion: highRiskCount ? `优先复核 ${highRiskCount} 条高风险记录，确认来源和商务条件后再进入套价。` : "当前未发现高风险记录，继续关注价格有效期和资料完整性。", extractionRate: averageConfidence },
      priceTrendData,
      trendSummaries,
      latestPriceUpdates,
      pendingReviewTasks,
      aiInsightCards,
      distributionAnalyses,
      riskAlerts,
      quickActions,
      businessFlow,
      rangeDays,
      source: "supabase",
      generatedAt: now.toISOString(),
    };
    return NextResponse.json({ data: payload });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "首页数据聚合失败" }, { status: 500 });
  }
}
