import type { ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";
import type { WorkflowKpi } from "./aiQuoteRecognition";

export type PriceLeadRecord = Record<string, unknown> & {
  leadCode: string;
  leadName: string;
  leadType: "设备" | "地材" | "服务";
  sourcePlatform: string;
  region: string;
  originalPrice: number;
  usdPrice: number;
  currency: CurrencyCode;
  supplier: string;
  matchedObject: string;
  confidence: ConfidenceLevel;
  credibility: "高" | "中" | "低";
  riskLevel: RiskLevel;
  recommendedAction: string;
  status: "待确认" | "可入库" | "已入库" | "已作废";
};

export const priceLeadKpis: WorkflowKpi[] = [
  { label: "线索总数", value: 2468, unit: "条", trend: "较上月 +18.6%", description: "AI采集累计", tone: "blue" },
  { label: "今日新增", value: 386, unit: "条", trend: "较昨日 +12.3%", description: "待确认线索", tone: "orange" },
  { label: "可入库线索", value: 1326, unit: "条", trend: "较上月 +22.7%", description: "可信度达标", tone: "green" },
  { label: "待确认线索", value: 386, unit: "条", trend: "需人工判断", description: "来源需核验", tone: "purple" },
  { label: "高风险线索", value: 34, unit: "条", trend: "较上月 +55.6%", description: "价格异常", tone: "red" },
  { label: "已归档线索", value: 110, unit: "条", trend: "较上月 +8.2%", description: "无效或重复", tone: "cyan" },
];

export const priceLeads: PriceLeadRecord[] = [
  {
    leadCode: "PL250520-0001",
    leadName: "潜水排污泵",
    leadType: "设备",
    sourcePlatform: "某电商平台",
    region: "江苏南京",
    originalPrice: 18600,
    usdPrice: 2590,
    currency: "CNY",
    supplier: "江苏泵业",
    matchedObject: "设备：潜水排污泵",
    confidence: "A",
    credibility: "高",
    riskLevel: "low",
    recommendedAction: "确认入库",
    status: "可入库",
  },
  {
    leadCode: "PL250520-0002",
    leadName: "离心鼓风机",
    leadType: "设备",
    sourcePlatform: "厂家官网",
    region: "山东济南",
    originalPrice: 12800,
    usdPrice: 1782,
    currency: "CNY",
    supplier: "章丘风机",
    matchedObject: "设备：鼓风机",
    confidence: "B",
    credibility: "高",
    riskLevel: "low",
    recommendedAction: "转设备价格库",
    status: "可入库",
  },
  {
    leadCode: "PL250520-0003",
    leadName: "电动蝶阀",
    leadType: "设备",
    sourcePlatform: "招标文件",
    region: "广东广州",
    originalPrice: 1450,
    usdPrice: 1450,
    currency: "USD",
    supplier: "AVK代理商",
    matchedObject: "设备：DN300 蝶阀",
    confidence: "B",
    credibility: "中",
    riskLevel: "medium",
    recommendedAction: "生成询价",
    status: "待确认",
  },
  {
    leadCode: "PL250520-0004",
    leadName: "304不锈钢管",
    leadType: "地材",
    sourcePlatform: "市场报价单",
    region: "浙江杭州",
    originalPrice: 160,
    usdPrice: 22.3,
    currency: "CNY",
    supplier: "浙江特材",
    matchedObject: "地材：不锈钢管",
    confidence: "C",
    credibility: "中",
    riskLevel: "medium",
    recommendedAction: "补充资料",
    status: "待确认",
  },
  {
    leadCode: "PL250520-0005",
    leadName: "PAC加药装置",
    leadType: "设备",
    sourcePlatform: "电商平台",
    region: "上海",
    originalPrice: 2150,
    usdPrice: 299,
    currency: "CNY",
    supplier: "水处理设备平台",
    matchedObject: "设备：加药系统",
    confidence: "C",
    credibility: "中",
    riskLevel: "high",
    recommendedAction: "人工复核",
    status: "待确认",
  },
  {
    leadCode: "PL250520-0006",
    leadName: "HDPE给水管",
    leadType: "地材",
    sourcePlatform: "政府采购网",
    region: "湖北武汉",
    originalPrice: 320,
    usdPrice: 44.6,
    currency: "CNY",
    supplier: "联塑管道",
    matchedObject: "地材：HDPE管",
    confidence: "B",
    credibility: "高",
    riskLevel: "low",
    recommendedAction: "转地材价格库",
    status: "已入库",
  },
];

export const leadEvaluation = {
  selected: priceLeads[0],
  sourceReliability: 92,
  priceDeviation: "-6.4%",
  matchConfidence: 94,
  recommendedActions: ["确认入库", "转设备价格库", "生成询价任务"],
};

export const leadInsightCards = [
  { title: "线索来源分布", value: "1,048", description: "AI解析文件占比 42.5%，供应商报价单占比 28.9%。" },
  { title: "高价值线索", value: "286", description: "可直接支撑设备/地材价格补全，建议优先入库。" },
  { title: "价格缺口补充", value: "73", description: "DN600 阀门、钢筋、运输服务仍缺近 30 天报价。" },
  { title: "风险线索提醒", value: "34", description: "来源可信度低或价格偏离超过 30%，需人工确认。" },
];
