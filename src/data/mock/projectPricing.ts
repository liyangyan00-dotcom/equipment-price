import type { ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";

export type ProjectPricingRow = {
  id: string;
  boqCode: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  matchedPrice: number | null;
  currency: CurrencyCode;
  priceSource: string;
  supplier: string;
  confidence: ConfidenceLevel;
  matchLevel: "精准匹配" | "相似匹配" | "类型匹配" | "无匹配";
  needsInquiry: boolean;
  riskLevel: RiskLevel;
};

export const projectPricingKpis = [
  { label: "当前BOQ项数", value: 156, unit: "项", trend: "全部 BOQ 项", tone: "blue" as const },
  { label: "AI精准匹配", value: 82, unit: "项", trend: "占比 52.6%", tone: "green" as const },
  { label: "AI相似匹配", value: 36, unit: "项", trend: "占比 23.1%", tone: "blue" as const },
  { label: "无匹配项", value: 17, unit: "项", trend: "占比 10.9%", tone: "orange" as const },
  { label: "AI推荐总价", value: "2,860,000", unit: "USD", trend: "含税预估总价", tone: "purple" as const },
  { label: "高风险套价项", value: 12, unit: "项", trend: "需重点关注", tone: "red" as const },
];

export const projectInfo = [
  { label: "项目名称", value: "金沙萨水厂扩建项目" },
  { label: "项目阶段", value: "设计预算" },
  { label: "币种", value: "USD" },
  { label: "价格条件", value: "CIF Kinshasa Port, DRC" },
  { label: "有效期", value: "30 天（2026-06-19 前有效）" },
  { label: "汇率", value: "USD/CNY 7.18" },
];

export const boqParseDistribution = [
  { name: "精准匹配", value: 82, percent: "52.6%", color: "#23B26D" },
  { name: "相似匹配", value: 36, percent: "23.1%", color: "#2F6BFF" },
  { name: "无匹配", value: 17, percent: "10.9%", color: "#FF6B4A" },
  { name: "待人工复核", value: 5, percent: "3.2%", color: "#F59E0B" },
  { name: "识别风险项", value: 12, percent: "7.7%", color: "#EF4444" },
];

export const feeSummary = [
  { label: "设备费", value: 1420000, color: "#2F6BFF" },
  { label: "地材费", value: 760000, color: "#23B26D" },
  { label: "人工费", value: 280000, color: "#14B8A6" },
  { label: "机械费", value: 180000, color: "#F97316" },
  { label: "运输费", value: 120000, color: "#3B82F6" },
  { label: "未匹配费用预估", value: 100000, color: "#EF4444" },
];

export const projectPricingRows: ProjectPricingRow[] = [
  {
    id: "BOQ-2026-0001",
    boqCode: "BOQ-2026-0001",
    itemName: "潜水排污泵",
    specification: "DN300 PN16",
    quantity: 2,
    unit: "台",
    matchedPrice: 4800,
    currency: "USD",
    priceSource: "供应商报价",
    supplier: "Grundfos South Africa",
    confidence: "A",
    matchLevel: "精准匹配",
    needsInquiry: false,
    riskLevel: "low",
  },
  {
    id: "BOQ-2026-0002",
    boqCode: "BOQ-2026-0002",
    itemName: "电动蝶阀",
    specification: "DN600 PN10",
    quantity: 2,
    unit: "台",
    matchedPrice: 1250,
    currency: "USD",
    priceSource: "供应商报价",
    supplier: "Kinshasa Cement SA",
    confidence: "A",
    matchLevel: "精准匹配",
    needsInquiry: false,
    riskLevel: "low",
  },
  {
    id: "BOQ-2026-0003",
    boqCode: "BOQ-2026-0003",
    itemName: "钢管（埋地）",
    specification: "DN200 SCH40",
    quantity: 120,
    unit: "m",
    matchedPrice: 85,
    currency: "USD",
    priceSource: "地材价格",
    supplier: "Matadi Metals",
    confidence: "B",
    matchLevel: "相似匹配",
    needsInquiry: false,
    riskLevel: "medium",
  },
  {
    id: "BOQ-2026-0004",
    boqCode: "BOQ-2026-0004",
    itemName: "电缆",
    specification: "3x95mm2",
    quantity: 1000,
    unit: "m",
    matchedPrice: 12.6,
    currency: "USD",
    priceSource: "地材价格",
    supplier: "Kinshasa Hardware",
    confidence: "B",
    matchLevel: "相似匹配",
    needsInquiry: false,
    riskLevel: "medium",
  },
  {
    id: "BOQ-2026-0005",
    boqCode: "BOQ-2026-0005",
    itemName: "闸阀",
    specification: "DN150 PN16",
    quantity: 6,
    unit: "台",
    matchedPrice: 980,
    currency: "USD",
    priceSource: "模型价格",
    supplier: "-",
    confidence: "C",
    matchLevel: "类型匹配",
    needsInquiry: true,
    riskLevel: "medium",
  },
  {
    id: "BOQ-2026-0006",
    boqCode: "BOQ-2026-0006",
    itemName: "水泵支架",
    specification: "Q235",
    quantity: 12,
    unit: "套",
    matchedPrice: 320,
    currency: "USD",
    priceSource: "地材价格",
    supplier: "GCC SASA",
    confidence: "C",
    matchLevel: "类型匹配",
    needsInquiry: true,
    riskLevel: "medium",
  },
  {
    id: "BOQ-2026-0007",
    boqCode: "BOQ-2026-0007",
    itemName: "控制柜",
    specification: "800x600x2200",
    quantity: 3,
    unit: "台",
    matchedPrice: 2150,
    currency: "USD",
    priceSource: "模型价格",
    supplier: "-",
    confidence: "C",
    matchLevel: "类型匹配",
    needsInquiry: true,
    riskLevel: "medium",
  },
  {
    id: "BOQ-2026-0008",
    boqCode: "BOQ-2026-0008",
    itemName: "止回阀",
    specification: "DN100 PN16",
    quantity: 4,
    unit: "台",
    matchedPrice: null,
    currency: "USD",
    priceSource: "-",
    supplier: "-",
    confidence: "D",
    matchLevel: "无匹配",
    needsInquiry: true,
    riskLevel: "high",
  },
];

export const recommendedPriceSources = [
  { label: "供应商报价（历史成交）", value: 68, percent: "43.6%", color: "#2F6BFF" },
  { label: "地材价格库", value: 46, percent: "29.5%", color: "#23B26D" },
  { label: "模型价格", value: 22, percent: "14.1%", color: "#7C3AED" },
  { label: "厂家官网报价", value: 12, percent: "7.7%", color: "#F59E0B" },
  { label: "公开市场参考价", value: 8, percent: "5.1%", color: "#64748B" },
];

export const unmatchedReasons = [
  { label: "设备型号未识别", value: 7, percent: "41.2%" },
  { label: "规格/参数缺失", value: 6, percent: "35.3%" },
  { label: "新设备/非标设备", value: 4, percent: "23.5%" },
];

export const costRiskSummary = [
  { label: "高风险", value: 5, tone: "red" as const },
  { label: "中风险", value: 4, tone: "orange" as const },
  { label: "低风险", value: 3, tone: "green" as const },
];

