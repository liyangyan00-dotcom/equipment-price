import type { ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";
import type { WorkflowKpi } from "./aiQuoteRecognition";

export type CollectionSource = {
  label: string;
  value: number;
  percent: string;
};

export type CollectedLeadRecord = Record<string, unknown> & {
  leadCode: string;
  leadName: string;
  leadType: "设备" | "地材" | "服务";
  source: string;
  region: string;
  originalPrice: number;
  usdPrice: number;
  currency: CurrencyCode;
  supplier: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  recommendedAction: string;
};

export const collectionKpis: WorkflowKpi[] = [
  { label: "采集任务总数", value: 128, unit: "个", trend: "较昨日 +12", description: "运行中 18 个", tone: "blue" },
  { label: "今日采集", value: 356, unit: "条", trend: "较昨日 +28", description: "多来源扫描", tone: "cyan" },
  { label: "新增线索", value: 128, unit: "条", trend: "待确认", description: "进入线索池", tone: "orange" },
  { label: "可入库线索", value: 624, unit: "条", trend: "较昨日 +36", description: "可信度达标", tone: "green" },
  { label: "高风险线索", value: 48, unit: "条", trend: "较昨日 +6", description: "需人工判断", tone: "red" },
  { label: "覆盖地区", value: 36, unit: "个", trend: "新增 5 个", description: "非洲/华东/华南", tone: "purple" },
];

export const collectionSources: CollectionSource[] = [
  { label: "制造商官网", value: 362, percent: "28.1%" },
  { label: "供应商报价单", value: 478, percent: "37.2%" },
  { label: "电商平台", value: 298, percent: "23.2%" },
  { label: "政府采购价", value: 148, percent: "11.5%" },
];

export const collectedLeadRecords: CollectedLeadRecord[] = [
  {
    leadCode: "LS202505200001",
    leadName: "潜水排污泵",
    leadType: "设备",
    source: "制造商官网",
    region: "江苏南京",
    originalPrice: 18600,
    usdPrice: 2590,
    currency: "CNY",
    supplier: "格兰富官网",
    confidence: "A",
    riskLevel: "low",
    recommendedAction: "确认入库",
  },
  {
    leadCode: "LS202505200002",
    leadName: "离心鼓风机",
    leadType: "设备",
    source: "厂家报价",
    region: "山东济南",
    originalPrice: 12800,
    usdPrice: 1782,
    currency: "CNY",
    supplier: "章丘鼓风机厂",
    confidence: "B",
    riskLevel: "low",
    recommendedAction: "进入比价",
  },
  {
    leadCode: "LS202505200003",
    leadName: "钢筋 HRB400",
    leadType: "地材",
    source: "本地市场",
    region: "Kinshasa",
    originalPrice: 3850,
    usdPrice: 536,
    currency: "CNY",
    supplier: "Kinshasa Metals",
    confidence: "B",
    riskLevel: "medium",
    recommendedAction: "补充来源",
  },
  {
    leadCode: "LS202505200004",
    leadName: "PAC加药装置",
    leadType: "设备",
    source: "电商平台",
    region: "上海",
    originalPrice: 25800,
    usdPrice: 3593,
    currency: "CNY",
    supplier: "水处理设备平台",
    confidence: "C",
    riskLevel: "medium",
    recommendedAction: "人工复核",
  },
  {
    leadCode: "LS202505200005",
    leadName: "普通硅酸盐水泥",
    leadType: "地材",
    source: "报价邮件",
    region: "Matadi",
    originalPrice: 420,
    usdPrice: 58.5,
    currency: "CNY",
    supplier: "海螺水泥",
    confidence: "B",
    riskLevel: "low",
    recommendedAction: "转入地材库",
  },
];

export const collectionProgress = [
  { label: "官网检索", value: 94 },
  { label: "报价单解析", value: 88 },
  { label: "供应商匹配", value: 84 },
  { label: "风险过滤", value: 79 },
];

export const collectionInsights = [
  { title: "建议按厂家官网报价", description: "发现 18 条设备来源来自第三方平台，建议到厂家官网校验真实性。", action: "去核验" },
  { title: "建议补充运输条件", description: "共发现 26 条线索未包含运费及安装条件，可能影响价格准确性。", action: "去补充" },
  { title: "建议接入设备价格库", description: "已有 62 条线索匹配度超过 90%，建议转入设备价格库用于比价。", action: "去转入" },
];
