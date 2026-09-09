import type { AiTaskStatus, ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";

export type WorkflowTone = "blue" | "cyan" | "green" | "orange" | "red" | "purple";

export type WorkflowKpi = {
  label: string;
  value: string | number;
  unit?: string;
  trend: string;
  description: string;
  tone: WorkflowTone;
};

export type QuoteFile = {
  fileName: string;
  source: string;
  uploadedAt: string;
  status: AiTaskStatus;
  confidence: number;
};

export type RecognitionResult = Record<string, unknown> & {
  fileName: string;
  quoteObject: string;
  quoteType: "设备" | "地材" | "服务";
  specification: string;
  originalPrice: number;
  usdPrice: number;
  currency: CurrencyCode;
  supplier: string;
  confidence: ConfidenceLevel;
  missingFields: string[];
  riskLevel: RiskLevel;
  status: AiTaskStatus;
};

export const recognitionKpis: WorkflowKpi[] = [
  { label: "今日识别任务", value: 36, unit: "份", trend: "较昨日 +12", description: "报价单与邮件记录", tone: "blue" },
  { label: "已完成识别", value: 28, unit: "份", trend: "成功率 77.8%", description: "字段已完成抽取", tone: "green" },
  { label: "待人工复核", value: 8, unit: "份", trend: "较昨日 +2", description: "需商务确认", tone: "orange" },
  { label: "缺失字段", value: 23, unit: "项", trend: "4 类字段", description: "规格/税率/有效期", tone: "purple" },
  { label: "高风险报价", value: 15, unit: "项", trend: "较昨日 +4", description: "价格或条款异常", tone: "red" },
  { label: "可入库报价", value: 21, unit: "条", trend: "可信度 A/B", description: "待生成审核任务", tone: "cyan" },
];

export const quoteFiles: QuoteFile[] = [
  { fileName: "格兰富水泵_潜水排污泵报价单.pdf", source: "供应商邮件", uploadedAt: "2025-05-20 09:32", status: "completed", confidence: 95 },
  { fileName: "南方泵业_蝶阀报价单.xlsx", source: "历史记录", uploadedAt: "2025-05-20 08:41", status: "needs_review", confidence: 88 },
  { fileName: "浙江立奇_304不锈钢报价.pdf", source: "WhatsApp", uploadedAt: "2025-05-19 16:18", status: "needs_info", confidence: 76 },
];

export const recognitionResults: RecognitionResult[] = [
  {
    fileName: "格兰富水泵_潜水排污泵报价单.pdf",
    quoteObject: "潜水排污泵",
    quoteType: "设备",
    specification: "SEV.100.80.22.2.50B",
    originalPrice: 18600,
    usdPrice: 2590,
    currency: "CNY",
    supplier: "格兰富水泵（上海）",
    confidence: "A",
    missingFields: [],
    riskLevel: "low",
    status: "completed",
  },
  {
    fileName: "南方泵业_蝶阀报价单.xlsx",
    quoteObject: "电动蝶阀",
    quoteType: "设备",
    specification: "DN600 PN10",
    originalPrice: 4800,
    usdPrice: 4800,
    currency: "USD",
    supplier: "天津伯纳德阀门",
    confidence: "B",
    missingFields: ["质保期"],
    riskLevel: "medium",
    status: "needs_review",
  },
  {
    fileName: "浙江立奇_304不锈钢报价.pdf",
    quoteObject: "304不锈钢管",
    quoteType: "地材",
    specification: "Φ48×2.0",
    originalPrice: 160,
    usdPrice: 22.3,
    currency: "CNY",
    supplier: "浙江立奇特材科技",
    confidence: "B",
    missingFields: ["税率", "运输条件"],
    riskLevel: "medium",
    status: "needs_info",
  },
  {
    fileName: "低压配电柜报价.pdf",
    quoteObject: "低压配电柜",
    quoteType: "设备",
    specification: "MNS 4000A IP42",
    originalPrice: 12600,
    usdPrice: 12600,
    currency: "USD",
    supplier: "施耐德授权商",
    confidence: "C",
    missingFields: ["付款条件", "交货期"],
    riskLevel: "high",
    status: "needs_review",
  },
  {
    fileName: "砂石骨料报价截图.png",
    quoteObject: "机制砂",
    quoteType: "地材",
    specification: "中砂",
    originalPrice: 128,
    usdPrice: 17.8,
    currency: "CNY",
    supplier: "本地砂石厂",
    confidence: "B",
    missingFields: ["有效期"],
    riskLevel: "low",
    status: "completed",
  },
  {
    fileName: "运输服务报价.docx",
    quoteObject: "Kinshasa 本地运输",
    quoteType: "服务",
    specification: "市内短驳",
    originalPrice: 320,
    usdPrice: 320,
    currency: "USD",
    supplier: "Kinshasa Logistics",
    confidence: "C",
    missingFields: ["保险条款"],
    riskLevel: "medium",
    status: "needs_review",
  },
];

export const recognitionRiskItems = [
  { title: "缺失增值税税率或含税说明", count: 6, confidence: 95, tone: "red" as const },
  { title: "运费条款不明确", count: 4, confidence: 88, tone: "orange" as const },
  { title: "质保期表达不完整", count: 3, confidence: 76, tone: "orange" as const },
  { title: "部分技术参数未识别", count: 2, confidence: 72, tone: "blue" as const },
];

export const recognitionQuality = [
  { label: "字段识别完整度", value: 92 },
  { label: "价格字段准确率", value: 95 },
  { label: "供应商匹配率", value: 88 },
  { label: "风险识别覆盖", value: 84 },
];
