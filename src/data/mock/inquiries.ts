import type { AiTaskStatus, CurrencyCode, RiskLevel } from "@/types/common";

export type InquiryTaskRecord = Record<string, unknown> & {
  id: string;
  inquiryCode: string;
  comparisonId: string;
  subject: string;
  relatedItem: string;
  supplierCount: number;
  respondedCount: number;
  lowestQuote: number;
  highestQuote: number;
  lowestSupplier: string;
  highestSupplier: string;
  currency: CurrencyCode;
  differenceRate: number;
  aiPlan: "方案 A" | "方案 B" | "需人工评估";
  status: AiTaskStatus;
  riskLevel: RiskLevel;
  deadline: string;
  age: string;
};

export const inquiryKpis = [
  { label: "询价任务总数", value: "128", unit: "个", trend: "+12.4%", description: "较上月", tone: "blue" as const },
  { label: "待发送", value: "18", unit: "个", trend: "-5.3%", description: "较上月", tone: "cyan" as const },
  { label: "已响应", value: "72", unit: "个", trend: "56.3%", description: "响应率", tone: "blue" as const },
  { label: "待比价", value: "26", unit: "个", trend: "+21.2%", description: "较上月", tone: "orange" as const },
  { label: "高风险报价", value: "9", unit: "个", trend: "12.5%", description: "占比", tone: "red" as const },
  { label: "AI建议采用", value: "31", unit: "个", trend: "43.1%", description: "采用率", tone: "purple" as const },
];

export const inquiryTaskRecords: InquiryTaskRecord[] = [
  {
    id: "INQ-001",
    inquiryCode: "INQ-202506-001",
    comparisonId: "CMP-202506-001",
    subject: "取水泵采购询价",
    relatedItem: "立式轴流泵 1200kW",
    supplierCount: 12,
    respondedCount: 9,
    lowestQuote: 256000,
    highestQuote: 382000,
    lowestSupplier: "Kinshasa",
    highestSupplier: "Aqua Congo",
    currency: "CDF",
    differenceRate: 49.2,
    aiPlan: "方案 A",
    status: "running",
    riskLevel: "medium",
    deadline: "2025-06-18",
    age: "2小时",
  },
  {
    id: "INQ-002",
    inquiryCode: "INQ-202506-002",
    comparisonId: "CMP-202506-002",
    subject: "PAC加药系统设备",
    relatedItem: "PAC加药装置",
    supplierCount: 8,
    respondedCount: 6,
    lowestQuote: 48500,
    highestQuote: 72800,
    lowestSupplier: "Grundfos",
    highestSupplier: "Kinshasa",
    currency: "CDF",
    differenceRate: 50.1,
    aiPlan: "方案 B",
    status: "needs_review",
    riskLevel: "medium",
    deadline: "2025-06-19",
    age: "4小时",
  },
  {
    id: "INQ-003",
    inquiryCode: "INQ-202506-003",
    comparisonId: "CMP-202506-003",
    subject: "紫外消毒系统采购",
    relatedItem: "紫外消毒器 300m³/h",
    supplierCount: 10,
    respondedCount: 8,
    lowestQuote: 32800,
    highestQuote: 51600,
    lowestSupplier: "Matadi",
    highestSupplier: "Aqua Congo",
    currency: "CDF",
    differenceRate: 57.3,
    aiPlan: "方案 A",
    status: "running",
    riskLevel: "low",
    deadline: "2025-06-20",
    age: "6小时",
  },
  {
    id: "INQ-004",
    inquiryCode: "INQ-202506-004",
    comparisonId: "CMP-202506-004",
    subject: "阀门与管件采购",
    relatedItem: "DN300蝶阀",
    supplierCount: 15,
    respondedCount: 12,
    lowestQuote: 18900,
    highestQuote: 31200,
    lowestSupplier: "Kinshasa",
    highestSupplier: "Grundfos",
    currency: "CDF",
    differenceRate: 65.1,
    aiPlan: "方案 A",
    status: "needs_review",
    riskLevel: "medium",
    deadline: "2025-06-17",
    age: "2小时",
  },
  {
    id: "INQ-005",
    inquiryCode: "INQ-202506-005",
    comparisonId: "CMP-202506-005",
    subject: "絮凝剂（PAM）采购",
    relatedItem: "PAM阳离子 25kg/袋",
    supplierCount: 6,
    respondedCount: 4,
    lowestQuote: 4850,
    highestQuote: 6900,
    lowestSupplier: "Matadi",
    highestSupplier: "Kinshasa",
    currency: "CDF",
    differenceRate: 42.3,
    aiPlan: "方案 B",
    status: "created",
    riskLevel: "low",
    deadline: "2025-06-22",
    age: "12小时",
  },
  {
    id: "INQ-006",
    inquiryCode: "INQ-202506-006",
    comparisonId: "CMP-202506-006",
    subject: "低压配电柜采购",
    relatedItem: "低压配电柜 400A",
    supplierCount: 9,
    respondedCount: 7,
    lowestQuote: 26800,
    highestQuote: 39500,
    lowestSupplier: "Aqua Congo",
    highestSupplier: "Kinshasa",
    currency: "CDF",
    differenceRate: 47.4,
    aiPlan: "方案 A",
    status: "running",
    riskLevel: "low",
    deadline: "2025-06-21",
    age: "8小时",
  },
  {
    id: "INQ-007",
    inquiryCode: "INQ-202506-007",
    comparisonId: "CMP-202506-007",
    subject: "活性炭滤料采购",
    relatedItem: "活性炭滤料 10-24目",
    supplierCount: 7,
    respondedCount: 5,
    lowestQuote: 9600,
    highestQuote: 14800,
    lowestSupplier: "Grundfos",
    highestSupplier: "Matadi",
    currency: "CDF",
    differenceRate: 54.2,
    aiPlan: "方案 B",
    status: "needs_review",
    riskLevel: "medium",
    deadline: "2025-06-23",
    age: "6小时",
  },
  {
    id: "INQ-008",
    inquiryCode: "INQ-202506-008",
    comparisonId: "CMP-202506-008",
    subject: "加压泵站设备一批",
    relatedItem: "卧式离心泵 75kW",
    supplierCount: 11,
    respondedCount: 11,
    lowestQuote: 83000,
    highestQuote: 121000,
    lowestSupplier: "Aqua Congo",
    highestSupplier: "Kinshasa",
    currency: "CDF",
    differenceRate: 45.8,
    aiPlan: "方案 A",
    status: "completed",
    riskLevel: "low",
    deadline: "2025-06-16",
    age: "已完成",
  },
];

export const supplierResponseRanking = [
  { name: "Aqua Congo Services SARL", count: 11, percent: 100 },
  { name: "Kinshasa Water Solutions", count: 9, percent: 81.8 },
  { name: "Grundfos South Africa", count: 7, percent: 63.6 },
  { name: "Matadi Industrial", count: 5, percent: 45.5 },
  { name: "Kinshasa Logistics", count: 4, percent: 36.4 },
];

export const pendingTasks = [
  { code: "INQ-202506-001", title: "取水泵采购询价", status: "待发送", age: "2小时" },
  { code: "INQ-202506-004", title: "阀门与管件采购", status: "待比价", age: "4小时" },
  { code: "INQ-202506-007", title: "活性炭滤料采购", status: "待比价", age: "6小时" },
  { code: "INQ-202506-002", title: "PAC加药系统设备", status: "需跟进", age: "12小时" },
];

export const highSpreadAlerts = [
  { code: "INQ-202506-004", title: "阀门与管件采购", rate: "+65.1%" },
  { code: "INQ-202506-003", title: "紫外消毒系统采购", rate: "+57.3%" },
  { code: "INQ-202506-002", title: "PAC加药系统设备", rate: "+50.1%" },
];

export const adoptionPlanData = [
  { label: "方案 A", value: 19, percent: "61.3%", color: "#2F6BFF" },
  { label: "方案 B", value: 10, percent: "32.3%", color: "#20A96B" },
  { label: "需人工评估", value: 2, percent: "6.5%", color: "#64748B" },
];

export const inquiryStatusAnalysis = [
  { label: "待发送", value: 18, color: "#F5B84B" },
  { label: "询价中", value: 45, color: "#7C3AED" },
  { label: "已响应", value: 72, color: "#58C29A" },
  { label: "待比价", value: 26, color: "#2F6BFF" },
  { label: "已完成", value: 31, color: "#94A3B8" },
];
