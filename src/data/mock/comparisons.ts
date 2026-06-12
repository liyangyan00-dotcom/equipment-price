import type { AiTaskStatus, ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";

export type SupplierQuoteRecord = {
  id: string;
  supplier: string;
  country: string;
  quoteAmount: number;
  currency: CurrencyCode;
  deliveryCycle: string;
  paymentTerms: string;
  technicalResponse: string;
  businessResponse: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  aiScore: number;
  aiAdvice: "推荐采用" | "备选方案" | "需澄清" | "不建议采用";
  status: AiTaskStatus;
};

export type ComparisonTaskRecord = {
  id: string;
  name: string;
  project: string;
  equipmentCount: number;
  invitedSuppliers: number;
  receivedQuotes: number;
  deadline: string;
  status: "报价中" | "询价中" | "已回收" | "AI分析中" | "已发送";
  owner: string;
};

export type ComparisonFinding = {
  title: string;
  description: string;
  tone: "purple" | "blue" | "green" | "orange" | "red";
  action: string;
};

export const comparisonSummary = [
  { label: "询价任务总数", value: 36, unit: "项", trend: "较上月 ↑ 12.5%", description: "集中管理询价任务", tone: "blue" as const },
  { label: "AI建议询价", value: 12, unit: "项", trend: "本月新增 8 项", description: "建议补充询价", tone: "green" as const },
  { label: "已回收报价", value: 28, unit: "项", trend: "回收率 77.8%", description: "供应商已响应", tone: "purple" as const },
  { label: "待AI分析报价", value: 8, unit: "项", trend: "较昨日 -2", description: "等待比价分析", tone: "blue" as const },
  { label: "高风险比价项", value: 5, unit: "项", trend: "较昨日 +1", description: "需重点复核", tone: "red" as const },
  { label: "推荐供应商", value: 9, unit: "家", trend: "综合推荐优先级", description: "可优先采用", tone: "green" as const },
];

export const comparisonTasks: ComparisonTaskRecord[] = [
  { id: "INQ-202506-001", name: "加药系统设备询价", project: "Kinshasa 污水处理厂", equipmentCount: 28, invitedSuppliers: 15, receivedQuotes: 9, deadline: "2025-06-10", status: "报价中", owner: "张伟" },
  { id: "INQ-202506-002", name: "鼓风机采购询价", project: "Matadi 供水项目", equipmentCount: 6, invitedSuppliers: 10, receivedQuotes: 6, deadline: "2025-06-05", status: "已回收", owner: "李娜" },
  { id: "INQ-202506-003", name: "电气控制柜询价", project: "Kinshasa 供水二期", equipmentCount: 15, invitedSuppliers: 12, receivedQuotes: 12, deadline: "2025-06-02", status: "AI分析中", owner: "王强" },
  { id: "INQ-202506-004", name: "污泥脱水设备询价", project: "Lubumbashi 污水厂", equipmentCount: 10, invitedSuppliers: 9, receivedQuotes: 4, deadline: "2025-06-08", status: "已发送", owner: "刘洋" },
  { id: "INQ-202506-005", name: "水泵及阀门询价", project: "Pointe-Noire 供水", equipmentCount: 34, invitedSuppliers: 18, receivedQuotes: 14, deadline: "2025-05-30", status: "已回收", owner: "陈晨" },
];

export const supplierQuotes: SupplierQuoteRecord[] = [
  {
    id: "Q-KWS-001",
    supplier: "东成机电设备有限公司",
    country: "中国 / 华东",
    quoteAmount: 3520,
    currency: "USD",
    deliveryCycle: "25 天",
    paymentTerms: "30%预付，70%验收",
    technicalResponse: "完全响应",
    businessResponse: "含运输与税费",
    confidence: "A",
    riskLevel: "low",
    aiScore: 92,
    aiAdvice: "推荐采用",
    status: "confirmed",
  },
  {
    id: "Q-AQC-002",
    supplier: "环亚流体控制（上海）",
    country: "中国 / 华北",
    quoteAmount: 3980,
    currency: "USD",
    deliveryCycle: "28 天",
    paymentTerms: "40%预付，60%到货",
    technicalResponse: "主要参数响应",
    businessResponse: "质保需补充",
    confidence: "B",
    riskLevel: "low",
    aiScore: 88,
    aiAdvice: "备选方案",
    status: "needs_review",
  },
  {
    id: "Q-GSA-003",
    supplier: "金海泵业有限公司",
    country: "中国 / 华南",
    quoteAmount: 3850,
    currency: "USD",
    deliveryCycle: "30 天",
    paymentTerms: "30%预付，70%发货",
    technicalResponse: "响应完整",
    businessResponse: "交付周期稳定",
    confidence: "B",
    riskLevel: "medium",
    aiScore: 86,
    aiAdvice: "备选方案",
    status: "needs_info",
  },
  {
    id: "Q-TBM-004",
    supplier: "安泰工业设备有限公司",
    country: "中国 / 西南",
    quoteAmount: 4200,
    currency: "USD",
    deliveryCycle: "45 天",
    paymentTerms: "全额预付",
    technicalResponse: "部分偏差",
    businessResponse: "付款风险较高",
    confidence: "C",
    riskLevel: "high",
    aiScore: 62,
    aiAdvice: "不建议采用",
    status: "needs_review",
  },
];

export const comparisonPreviewRows = [
  { supplier: "东成机电设备有限公司", price: 3520, delivery: "25 天", warranty: "12 个月", score: "★★★★★", risk: "低" },
  { supplier: "环亚流体控制（上海）", price: 3980, delivery: "28 天", warranty: "12 个月", score: "★★★★☆", risk: "低" },
  { supplier: "金海泵业有限公司", price: 3850, delivery: "30 天", warranty: "12 个月", score: "★★★★☆", risk: "中" },
  { supplier: "安泰工业设备有限公司", price: 4200, delivery: "45 天", warranty: "18 个月", score: "★★★☆☆", risk: "高" },
];

export const quoteSpreadTrend = [
  { label: "东成机电", amount: 3520, aiScore: 92 },
  { label: "环亚流体", amount: 3980, aiScore: 88 },
  { label: "金海泵业", amount: 3850, aiScore: 86 },
  { label: "安泰工业", amount: 4200, aiScore: 62 },
];

export const comparisonFindings: ComparisonFinding[] = [
  {
    title: "相似项目推荐",
    description: "基于历史项目匹配到 3 个相似项目，建议参考同设备规格与报价区间。",
    tone: "blue",
    action: "查看详情",
  },
  {
    title: "设备规格优化建议",
    description: "检测到 2 项设备存在规格冗余或缺项，优化后预计可降本 8.6%。",
    tone: "green",
    action: "查看详情",
  },
  {
    title: "供应商邀请建议",
    description: "根据设备类别与地域，推荐新增 3 家优质供应商参与询价。",
    tone: "orange",
    action: "查看详情",
  },
];

export const autoAnalysisRank = [
  { rank: 1, supplier: "东成机电设备有限公司", score: 92, tag: "推荐" },
  { rank: 2, supplier: "环亚流体控制（上海）", score: 78, tag: "备选" },
  { rank: 3, supplier: "金海泵业有限公司", score: 86, tag: "备选" },
  { rank: 4, supplier: "安泰工业设备有限公司", score: 62, tag: "谨慎" },
];

export const techDeviationItems = [
  "供应商 B 的扬程范围低于技术要求",
  "供应商 C 的防护等级不满足 IP68 要求",
  "供应商 D 的电机效率低于能效标准",
];

export const businessRiskItems = [
  { code: "1", text: "供应商 D 交货周期较长，可能影响项目进度", level: "高" },
  { code: "2", text: "供应商 C 付款条件较严，存在资金占用风险", level: "中" },
];

export const negotiationSuggestions = [
  "目标降价空间：3% - 8%",
  "建议谈判重点：交货期缩短、质保延长、付款方式优化",
  "参考策略：可采用“阶梯降价 + 延长质保”组合策略",
];

export const followUpSuggestions = [
  { supplier: "东方泵业有限公司", deadline: "已逾期 3 天" },
  { supplier: "华控阀门制造有限公司", deadline: "今日截止" },
  { supplier: "瑞德电气设备有限公司", deadline: "已逾期 1 天" },
];

export const generatedFiles = [
  { name: "询价函（含技术规格）", type: "doc" },
  { name: "报价汇总模板（Excel）", type: "excel" },
  { name: "比价报告（PDF）", type: "pdf" },
];

export const insightSummary = [
  "本月询价任务数上升 18.6%，整体询价效率提升 14%",
  "AI 自动识别并纠偏潜在成本约 12.8 万 USD",
  "供应商响应率最高的品类：水泵、阀门、电气控制设备",
  "建议重点关注交期与付款条件的风险控制",
];

export const comparisonDecisionOptions = [
  { label: "方案 A", supplier: "东成机电设备有限公司", count: 19, percent: "61.3%" },
  { label: "方案 B", supplier: "环亚流体控制（上海）", count: 10, percent: "32.3%" },
  { label: "需人工评估", supplier: "安泰工业设备有限公司", count: 2, percent: "6.5%" },
];
