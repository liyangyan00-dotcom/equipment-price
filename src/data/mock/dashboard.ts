import type { AiTaskStatus, ConfidenceLevel, CurrencyCode, RiskLevel, TrendDirection } from "@/types/common";

export type DashboardHeroData = {
  aiTaskStatus: string;
  updatedAt: string;
};

export type DashboardStat = {
  key: "equipment" | "material" | "supplier" | "pending" | "lead" | "risk";
  title: string;
  value: string;
  description: string;
  trendLabel: string;
  trendDirection: TrendDirection;
};

export type AiWorkbenchOverview = {
  todayTaskCount: number;
  recognitionRate: number;
  riskResultCount: number;
  suggestedActionCount: number;
  pendingReviewCount: number;
  currentTaskName: string;
  recommendedAction: string;
  latestSuggestion: string;
  extractionRate: number;
};

export type PriceTrendPoint = {
  date: string;
  equipment: number;
  material: number;
  aiLeads: number;
};

export type TrendSummary = {
  label: string;
  value: string;
  description: string;
  tone: "blue" | "green" | "purple";
};

export type LatestPriceUpdate = Record<string, unknown> & {
  id: string;
  itemType: "equipment" | "material" | "supplier_quote" | "service";
  itemName: string;
  updatedAtLabel: string;
  price: number;
  currency: CurrencyCode;
  unit?: string;
  source: string;
  sourceType: "ai_quote_recognition" | "supplier_email" | "ai_price_collection" | "manual";
  confidenceLevel: ConfidenceLevel;
  aiTagged?: boolean;
};

export type PendingReviewTask = Record<string, unknown> & {
  id: string;
  fileType: "pdf" | "excel" | "image" | "email";
  fileName: string;
  taskType: "quote_recognition" | "price_collection" | "boq_parse" | "supplier_match";
  aiConfidence: number;
  confidenceLevel: ConfidenceLevel;
  missingFields: string[];
  missingFieldCount: number;
  riskLevel: RiskLevel;
  status: AiTaskStatus;
  createdAtLabel: string;
  actions: string[];
};

export type AiInsightCardData = {
  id: "lead" | "gap" | "inquiry";
  title: string;
  value: number;
  unit: string;
  judgment: string;
  action: string;
  tone: "info" | "warning" | "ai";
};

export type DistributionDatum = {
  name: string;
  value: number;
  percent?: number;
};

export type DistributionAnalysis = {
  title: string;
  description: string;
  conclusion: string;
  centerValue?: string;
  data: DistributionDatum[];
  type: "donut";
  tone: "blue" | "cyan" | "purple";
};

export type DashboardRiskAlert = Record<string, unknown> & {
  id: string;
  title: string;
  riskType:
    | "expired_price"
    | "low_price_outlier"
    | "missing_parameters"
    | "slow_supplier_response"
    | "volatile_price"
    | "priority_supplier";
  target: string;
  riskLevel: RiskLevel;
  suggestedAction: string;
  actionLabel: string;
  aiAdvice: string;
  recommendedOperation: string;
};

export type QuickAction = {
  title: string;
  description: string;
  href: string;
  tone: "primary" | "success" | "ai" | "warning" | "cyan" | "slate";
};

export const dashboardHero: DashboardHeroData = {
  aiTaskStatus: "156运行 · 68待复核",
  updatedAt: "10:30",
};

export const dashboardStats: DashboardStat[] = [
  {
    key: "equipment",
    title: "设备价格数",
    value: "12,568",
    description: "覆盖泵、阀门、电气、自控等设备",
    trendLabel: "较上月 +8.6%",
    trendDirection: "up",
  },
  {
    key: "material",
    title: "地材价格数",
    value: "8,942",
    description: "覆盖钢材、水泥、砂石和运输",
    trendLabel: "较上月 +6.3%",
    trendDirection: "up",
  },
  {
    key: "supplier",
    title: "供应商数量",
    value: "2,346",
    description: "含设备商、地材商与物流方",
    trendLabel: "新增 126 家",
    trendDirection: "up",
  },
  {
    key: "pending",
    title: "AI待复核",
    value: "68",
    description: "识别结果需进入人工确认",
    trendLabel: "较昨日 -12",
    trendDirection: "down",
  },
  {
    key: "lead",
    title: "今日价格线索",
    value: "128",
    description: "AI采集与人工新增线索",
    trendLabel: "较昨日 +15%",
    trendDirection: "up",
  },
  {
    key: "risk",
    title: "高风险价格",
    value: "48",
    description: "过期、异常、缺参数或低置信度",
    trendLabel: "较昨日 +6",
    trendDirection: "up",
  },
];

export const aiWorkbenchOverview: AiWorkbenchOverview = {
  todayTaskCount: 156,
  recognitionRate: 92.6,
  riskResultCount: 48,
  suggestedActionCount: 64,
  pendingReviewCount: 68,
  currentTaskName: "报价单字段识别与风险归因",
  recommendedAction: "发起复核",
  latestSuggestion: "优先复核 DN300 潜水排污泵与 HRB400 钢筋线索，低价异常和缺参数记录不得直接进入套价。",
  extractionRate: 91.3,
};

export const priceTrendData: PriceTrendPoint[] = [
  { date: "04-21", equipment: 172, material: 68, aiLeads: 48 },
  { date: "04-27", equipment: 185, material: 79, aiLeads: 56 },
  { date: "05-03", equipment: 198, material: 85, aiLeads: 74 },
  { date: "05-09", equipment: 204, material: 88, aiLeads: 81 },
  { date: "05-15", equipment: 226, material: 112, aiLeads: 96 },
  { date: "05-20", equipment: 258, material: 132, aiLeads: 128 },
];

export const trendSummaries: TrendSummary[] = [
  { label: "设备价格变化", value: "+12.4%", description: "泵阀类报价上涨最明显", tone: "blue" },
  { label: "地材价格变化", value: "+8.7%", description: "钢材与砂石带动波动", tone: "green" },
  { label: "AI线索变化", value: "+31.5%", description: "邮件与公开渠道贡献提升", tone: "purple" },
];

export const latestPriceUpdates: LatestPriceUpdate[] = [
  {
    id: "price-001",
    itemType: "equipment",
    itemName: "潜水排污泵 DN300 PN16",
    updatedAtLabel: "10:25",
    price: 35500,
    currency: "CNY",
    unit: "台",
    source: "格兰富水泵（上海）",
    sourceType: "ai_quote_recognition",
    confidenceLevel: "A",
    aiTagged: true,
  },
  {
    id: "price-002",
    itemType: "material",
    itemName: "HRB400 螺纹钢 Φ20mm",
    updatedAtLabel: "09:48",
    price: 3650,
    currency: "CNY",
    unit: "吨",
    source: "沙钢集团",
    sourceType: "ai_price_collection",
    confidenceLevel: "B",
    aiTagged: true,
  },
  {
    id: "price-003",
    itemType: "material",
    itemName: "普通硅酸盐水泥 42.5R",
    updatedAtLabel: "09:15",
    price: 420,
    currency: "CNY",
    unit: "吨",
    source: "海螺水泥",
    sourceType: "manual",
    confidenceLevel: "C",
  },
  {
    id: "price-004",
    itemType: "equipment",
    itemName: "电动蝶阀 DN600 PN10",
    updatedAtLabel: "08:52",
    price: 4800,
    currency: "USD",
    unit: "台",
    source: "天津伯纳德阀门",
    sourceType: "supplier_email",
    confidenceLevel: "B",
  },
  {
    id: "price-005",
    itemType: "service",
    itemName: "Kinshasa 本地运输",
    updatedAtLabel: "08:30",
    price: 320,
    currency: "USD",
    unit: "车",
    source: "本地物流供应商",
    sourceType: "supplier_email",
    confidenceLevel: "C",
  },
];

export const pendingReviewTasks: PendingReviewTask[] = [
  {
    id: "task-001",
    fileType: "pdf",
    fileName: "某泵业公司报价单.pdf",
    taskType: "quote_recognition",
    aiConfidence: 89,
    confidenceLevel: "B",
    missingFields: ["税率", "有效期"],
    missingFieldCount: 2,
    riskLevel: "medium",
    status: "needs_review",
    createdAtLabel: "10:25",
    actions: ["查看", "复核"],
  },
  {
    id: "task-002",
    fileType: "excel",
    fileName: "阀门报价单.xlsx",
    taskType: "quote_recognition",
    aiConfidence: 93,
    confidenceLevel: "A",
    missingFields: [],
    missingFieldCount: 0,
    riskLevel: "low",
    status: "needs_review",
    createdAtLabel: "09:48",
    actions: ["查看", "复核"],
  },
  {
    id: "task-003",
    fileType: "pdf",
    fileName: "电缆桥架报价.pdf",
    taskType: "price_collection",
    aiConfidence: 76,
    confidenceLevel: "C",
    missingFields: ["规格", "材质", "运输条件", "有效期"],
    missingFieldCount: 4,
    riskLevel: "high",
    status: "needs_info",
    createdAtLabel: "09:15",
    actions: ["查看", "补充资料"],
  },
  {
    id: "task-004",
    fileType: "image",
    fileName: "砂石价格单.jpg",
    taskType: "price_collection",
    aiConfidence: 90,
    confidenceLevel: "B",
    missingFields: ["产地"],
    missingFieldCount: 1,
    riskLevel: "medium",
    status: "needs_review",
    createdAtLabel: "08:52",
    actions: ["查看", "复核"],
  },
];

export const aiInsightCards: AiInsightCardData[] = [
  {
    id: "lead",
    title: "线索发现",
    value: 128,
    unit: "条",
    judgment: "其中 36 条与机电设备高度相关，建议优先进入线索池。",
    action: "进入线索池",
    tone: "info",
  },
  {
    id: "gap",
    title: "价格缺口",
    value: 86,
    unit: "项",
    judgment: "泵阀、钢筋和运输费缺口集中，影响近期项目套价。",
    action: "补齐缺口",
    tone: "warning",
  },
  {
    id: "inquiry",
    title: "建议询价任务",
    value: 24,
    unit: "项",
    judgment: "AI 建议对高风险和低置信度价格发起二次询价。",
    action: "创建询价任务",
    tone: "ai",
  },
];

export const equipmentCategoryDistribution: DistributionDatum[] = [
  { name: "水泵设备", value: 3214, percent: 25.6 },
  { name: "阀门设备", value: 2298, percent: 18.3 },
  { name: "电气设备", value: 2149, percent: 17.1 },
  { name: "自控仪表", value: 1606, percent: 12.8 },
  { name: "加药消毒", value: 1117, percent: 8.9 },
  { name: "其他设备", value: 2174, percent: 17.3 },
];

export const supplierRegionDistribution: DistributionDatum[] = [
  { name: "华东地区", value: 905, percent: 38.6 },
  { name: "华北地区", value: 525, percent: 22.4 },
  { name: "华南地区", value: 438, percent: 18.7 },
  { name: "华中地区", value: 263, percent: 11.2 },
  { name: "西部地区", value: 215, percent: 9.1 },
];

export const confidenceDistribution: DistributionDatum[] = [
  { name: "高置信度 ≥90%", value: 4447, percent: 35.4 },
  { name: "中置信度 70-90%", value: 5735, percent: 45.6 },
  { name: "低置信度 <70%", value: 2386, percent: 19 },
];

export const distributionAnalyses: DistributionAnalysis[] = [
  {
    title: "设备分类分布",
    description: "按设备条目数统计",
    conclusion: "AI结论：水泵设备占比最高，建议优先补充近30天报价。",
    centerValue: "12,568",
    data: equipmentCategoryDistribution,
    type: "donut",
    tone: "blue",
  },
  {
    title: "供应商区域分布",
    description: "按供应商数量统计",
    conclusion: "AI结论：华东供应商覆盖充足，西部区域需补充本地资源。",
    centerValue: "2,346",
    data: supplierRegionDistribution,
    type: "donut",
    tone: "cyan",
  },
  {
    title: "价格可信度分布",
    description: "按价格条目数统计",
    conclusion: "AI结论：中低置信度仍占 64.6%，需优先人工复核。",
    centerValue: "12,568",
    data: confidenceDistribution,
    type: "donut",
    tone: "purple",
  },
];

export const riskAlerts: DashboardRiskAlert[] = [
  {
    id: "risk-001",
    title: "价格已过期",
    riskType: "expired_price",
    target: "32 条设备与地材价格",
    riskLevel: "high",
    suggestedAction: "重新询价并刷新价格依据。",
    actionLabel: "重新询价",
    aiAdvice: "对应价格超过有效期，且被 3 个项目引用。",
    recommendedOperation: "重新询价",
  },
  {
    id: "risk-002",
    title: "低价异常",
    riskType: "low_price_outlier",
    target: "18 条供应商报价",
    riskLevel: "medium",
    suggestedAction: "核对运输条件、税费口径与供货范围。",
    actionLabel: "核对条件",
    aiAdvice: "报价低于区域中位价 18%，需排除漏项。",
    recommendedOperation: "补充报价来源",
  },
  {
    id: "risk-003",
    title: "参数信息缺失",
    riskType: "missing_parameters",
    target: "12 条价格记录",
    riskLevel: "medium",
    suggestedAction: "补充型号、材质、压力等级等关键字段。",
    actionLabel: "补充资料",
    aiAdvice: "缺参数会影响同类比价和项目套价匹配。",
    recommendedOperation: "补充资料",
  },
  {
    id: "risk-004",
    title: "可优先联系供应商",
    riskType: "priority_supplier",
    target: "26 家近30日活跃供应商",
    riskLevel: "low",
    suggestedAction: "优先联系响应快、置信度高的供应商。",
    actionLabel: "查看供应商",
    aiAdvice: "该批供应商近期报价完整，可用于快速校准价格。",
    recommendedOperation: "进入线索池",
  },
];

export const quickActions: QuickAction[] = [
  { title: "新增价格", description: "手工录价", href: "/equipment-prices", tone: "primary" },
  { title: "上传报价", description: "AI识别", href: "/ai-quote-recognition", tone: "success" },
  { title: "AI采集线索", description: "自动采集", href: "/ai-price-collection", tone: "ai" },
  { title: "创建询价", description: "供应商询价", href: "/inquiries", tone: "warning" },
  { title: "AI自动套价", description: "智能套价", href: "/project-pricing", tone: "ai" },
  { title: "生成报告", description: "分析输出", href: "/ai-report-center", tone: "slate" },
];
