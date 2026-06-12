import type { ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";

export type AiRecommendationRecord = Record<string, unknown> & {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  brand: string;
  specification: string;
  currentPrice: number;
  recommendedPrice: number;
  currency: CurrencyCode;
  differenceRate: number;
  similarCount: number;
  supplier: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  action: "create_inquiry" | "adopt" | "review" | "complete_params";
  reason: string;
  missingParams: string[];
};

export const recommendationKpis = [
  { label: "AI推荐价格", value: "214", unit: "条", trend: "+17.1%", description: "可进入人工复核", tone: "purple" as const },
  { label: "可直接采用", value: "86", unit: "条", trend: "+8.4%", description: "高置信低风险", tone: "green" as const },
  { label: "需补参数", value: "42", unit: "条", trend: "-6", description: "规格缺失或口径不全", tone: "orange" as const },
  { label: "建议询价", value: "68", unit: "项", trend: "+12", description: "价格偏离或来源不足", tone: "blue" as const },
  { label: "高风险推荐", value: "18", unit: "条", trend: "+4", description: "不得直接套价", tone: "red" as const },
  { label: "平均置信度", value: "91.6", unit: "%", trend: "+2.8%", description: "相似样本增强", tone: "cyan" as const },
];

export const aiRecommendationRecords: AiRecommendationRecord[] = [
  {
    id: "REC-001",
    equipmentCode: "EQP-2026-0007",
    equipmentName: "电磁流量计",
    brand: "Endress+Hauser",
    specification: "DN300 / 一体型 / 4-20mA",
    currentPrice: 3950,
    recommendedPrice: 4280,
    currency: "USD",
    differenceRate: 8.4,
    similarCount: 9,
    supplier: "Endress+Hauser 中国",
    confidence: "A",
    riskLevel: "medium",
    action: "complete_params",
    reason: "历史相似规格集中在 4,100-4,350 USD，当前报价缺少输出信号与电源电压。",
    missingParams: ["精度等级", "输出信号", "电源电压"],
  },
  {
    id: "REC-002",
    equipmentCode: "EQP-2026-0008",
    equipmentName: "投加加药装置",
    brand: "ProMinent",
    specification: "PAC 200L/h / 双泵",
    currentPrice: 5358,
    recommendedPrice: 4860,
    currency: "USD",
    differenceRate: -9.3,
    similarCount: 12,
    supplier: "普罗名特流体控制",
    confidence: "B",
    riskLevel: "high",
    action: "create_inquiry",
    reason: "当前报价高于近 30 天相似设备中位价，建议至少补充 3 家供应商询价。",
    missingParams: ["药箱材质", "计量泵品牌"],
  },
  {
    id: "REC-003",
    equipmentCode: "EQP-2026-0003",
    equipmentName: "电动蝶阀",
    brand: "AVK",
    specification: "DN600 PN10 / 防爆型",
    currentPrice: 4800,
    recommendedPrice: 4620,
    currency: "USD",
    differenceRate: -3.8,
    similarCount: 15,
    supplier: "天津伯纳德阀门",
    confidence: "A",
    riskLevel: "low",
    action: "adopt",
    reason: "同口径阀门报价区间稳定，供应商历史交付风险低，可作为套价参考。",
    missingParams: [],
  },
  {
    id: "REC-004",
    equipmentCode: "EQP-2026-0010",
    equipmentName: "鼓风机",
    brand: "Aerzen",
    specification: "Q=30m3/min / 55kW",
    currentPrice: 7801,
    recommendedPrice: 6980,
    currency: "USD",
    differenceRate: -10.5,
    similarCount: 6,
    supplier: "山东龙铁风机",
    confidence: "C",
    riskLevel: "critical",
    action: "create_inquiry",
    reason: "历史价格过期且偏离市场区间，AI 不建议直接采用，需重新询价。",
    missingParams: ["噪声等级", "效率曲线", "质保期"],
  },
  {
    id: "REC-005",
    equipmentCode: "EQP-2026-0005",
    equipmentName: "低压配电柜",
    brand: "Schneider",
    specification: "GGD 630A / IP42",
    currentPrice: 2589,
    recommendedPrice: 2660,
    currency: "USD",
    differenceRate: 2.7,
    similarCount: 18,
    supplier: "正泰电气股份有限公司",
    confidence: "B",
    riskLevel: "low",
    action: "review",
    reason: "报价接近历史成交价，建议人工确认铜排规格后采用。",
    missingParams: ["铜排规格"],
  },
];

export const recommendationInsights = [
  { title: "中风险条目提醒", description: "当前样本中 2 条设备存在供应商报价离散，建议补充区域供应商报价。", tone: "warning" as const },
  { title: "采用建议", description: "相似价格样本稳定，推荐价格预计可优化 5.1%，优先进入人工复核。", tone: "success" as const },
  { title: "市场趋势", description: "近 30 天同类设备均价回落 2.8%，建议分批询价锁定报价窗口。", tone: "blue" as const },
];

export const aiRecommendationReasons = [
  "同规格价格样本覆盖 5 个品牌、近 12 个月 42 条有效报价。",
  "当前推荐价格已排除过期报价和低可信来源，保留人工复核流程。",
  "参数缺失项会影响套价精度，建议先补全关键规格再进入询价。",
];

export const similarPriceMatches = [
  { code: "EQP-2025-0412", name: "电磁流量计", spec: "DN300 / 4-20mA", price: 4150, supplier: "E+H 华东代理", similarity: "94%" },
  { code: "EQP-2025-0321", name: "电磁流量计", spec: "DN300 / 防护 IP67", price: 4360, supplier: "西门子渠道商", similarity: "91%" },
  { code: "EQP-2025-0188", name: "电磁流量计", spec: "DN250 / 一体型", price: 3980, supplier: "科隆仪表", similarity: "88%" },
];

export const recommendedSuppliers = [
  { name: "Endress+Hauser 中国", category: "仪表设备", score: 92, response: "快", risk: "low" as RiskLevel },
  { name: "科隆测量仪器", category: "流量仪表", score: 88, response: "较快", risk: "low" as RiskLevel },
  { name: "西门子系统集成商", category: "电气仪表", score: 84, response: "一般", risk: "medium" as RiskLevel },
];
