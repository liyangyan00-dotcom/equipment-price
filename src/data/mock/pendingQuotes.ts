import type { AiTaskStatus, ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";
import type { WorkflowKpi, WorkflowTone } from "./aiQuoteRecognition";

export type PendingQuoteRecord = Record<string, unknown> & {
  quoteCode: string;
  quoteObject: string;
  quoteType: "设备" | "地材" | "服务";
  specification: string;
  originalPrice: number;
  usdPrice: number;
  currency: CurrencyCode;
  supplier: string;
  sourceFile: string;
  confidence: ConfidenceLevel;
  missingFields: string[];
  riskLevel: RiskLevel;
  status: AiTaskStatus;
  targetLibrary: "设备价格库" | "地材价格库" | "供应商库";
};

export const pendingQuoteKpis: WorkflowKpi[] = [
  { label: "待审核报价", value: 48, unit: "份", trend: "较昨日 -12.5%", description: "AI识别后待确认", tone: "blue" },
  { label: "今日新增", value: 8, unit: "份", trend: "较昨日 +14.3%", description: "新进入复核池", tone: "green" },
  { label: "缺失字段", value: 15, unit: "项", trend: "占比 31.3%", description: "需补充资料", tone: "orange" },
  { label: "高风险报价", value: 7, unit: "份", trend: "占比 14.6%", description: "价格波动异常", tone: "red" },
  { label: "可直接入库", value: 26, unit: "份", trend: "可信度 A/B", description: "字段完整", tone: "cyan" },
  { label: "已驳回", value: 5, unit: "份", trend: "本周累计", description: "无效或重复报价", tone: "purple" },
];

export const pendingQuotes: PendingQuoteRecord[] = [
  {
    quoteCode: "PQ-202506-001",
    quoteObject: "DN1000 电动蝶阀",
    quoteType: "设备",
    specification: "DN1000 PN16",
    originalPrice: 8600,
    usdPrice: 8600,
    currency: "CNY",
    supplier: "上海良工阀门厂",
    sourceFile: "DN1000电动蝶阀报价单.pdf",
    confidence: "A",
    missingFields: ["品牌"],
    riskLevel: "high",
    status: "needs_review",
    targetLibrary: "设备价格库",
  },
  {
    quoteCode: "PQ-202506-002",
    quoteObject: "304不锈钢管",
    quoteType: "地材",
    specification: "Φ48×2.0",
    originalPrice: 160,
    usdPrice: 22.3,
    currency: "CNY",
    supplier: "浙江立奇特材",
    sourceFile: "304不锈钢管报价.xlsx",
    confidence: "B",
    missingFields: ["税率"],
    riskLevel: "medium",
    status: "needs_info",
    targetLibrary: "地材价格库",
  },
  {
    quoteCode: "PQ-202506-003",
    quoteObject: "PLC控制柜",
    quoteType: "设备",
    specification: "S7-1500 双电源冗余",
    originalPrice: 18200,
    usdPrice: 18200,
    currency: "USD",
    supplier: "西门子系统集成商",
    sourceFile: "PLC控制柜报价.pdf",
    confidence: "A",
    missingFields: [],
    riskLevel: "low",
    status: "completed",
    targetLibrary: "设备价格库",
  },
  {
    quoteCode: "PQ-202506-004",
    quoteObject: "水泥 CEM II 42.5R",
    quoteType: "地材",
    specification: "袋装 50kg",
    originalPrice: 420,
    usdPrice: 58.5,
    currency: "CNY",
    supplier: "海螺水泥",
    sourceFile: "水泥报价邮件.eml",
    confidence: "C",
    missingFields: ["有效期", "运输条件"],
    riskLevel: "medium",
    status: "needs_review",
    targetLibrary: "地材价格库",
  },
  {
    quoteCode: "PQ-202506-005",
    quoteObject: "低压配电柜",
    quoteType: "设备",
    specification: "MNS 4000A IP42",
    originalPrice: 12600,
    usdPrice: 12600,
    currency: "USD",
    supplier: "施耐德授权商",
    sourceFile: "低压柜报价单.pdf",
    confidence: "C",
    missingFields: ["付款条件", "交货期"],
    riskLevel: "critical",
    status: "needs_review",
    targetLibrary: "设备价格库",
  },
  {
    quoteCode: "PQ-202506-006",
    quoteObject: "Kinshasa 本地运输",
    quoteType: "服务",
    specification: "市内短驳",
    originalPrice: 320,
    usdPrice: 320,
    currency: "USD",
    supplier: "Kinshasa Logistics",
    sourceFile: "运输服务报价.docx",
    confidence: "C",
    missingFields: ["保险条款"],
    riskLevel: "medium",
    status: "needs_review",
    targetLibrary: "供应商库",
  },
];

export const reviewPanel = {
  selectedQuote: pendingQuotes[0],
  aiFields: [
    { label: "识别对象", value: "DN1000 电动蝶阀" },
    { label: "规格型号", value: "DN1000 PN16" },
    { label: "含税单价", value: "CNY 8,600.00" },
    { label: "交货期", value: "25 天" },
  ],
  recommendedActions: ["确认入库", "补充品牌字段", "发起同规格比价"],
};

export const pendingRiskQuotes = [
  { quoteCode: "PQ-202506-005", title: "低压配电柜报价低于历史均价 18.7%", level: "critical" as const },
  { quoteCode: "PQ-202506-001", title: "交货期较同类产品延长 8 天", level: "high" as const },
  { quoteCode: "PQ-202506-004", title: "运输条件不清晰，影响到岸成本", level: "medium" as const },
];

export const missingFieldSummary = [
  { label: "税率/含税说明", value: 6, tone: "orange" as WorkflowTone },
  { label: "有效期", value: 5, tone: "purple" as WorkflowTone },
  { label: "运输条件", value: 4, tone: "orange" as WorkflowTone },
  { label: "品牌/授权关系", value: 3, tone: "red" as WorkflowTone },
];
