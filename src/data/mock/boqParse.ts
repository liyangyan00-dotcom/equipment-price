import type { AiTaskStatus, ConfidenceLevel, RiskLevel } from "@/types/common";
import type { WorkflowKpi } from "./aiQuoteRecognition";

export type ParsedBoqRow = Record<string, unknown> & {
  boqCode: string;
  projectName: string;
  itemName: string;
  category: "设备" | "地材" | "人工" | "机械" | "运输";
  specification: string;
  unit: string;
  quantity: number;
  aiCategory: string;
  matchedPrice: number | null;
  source: string;
  confidence: ConfidenceLevel;
  gapStatus: AiTaskStatus;
  riskLevel: RiskLevel;
};

export const boqParseKpis: WorkflowKpi[] = [
  { label: "当前BOQ项数", value: 156, unit: "项", trend: "全部 BOQ 项", description: "已完成结构化解析", tone: "blue" },
  { label: "AI精准匹配", value: 82, unit: "项", trend: "占比 52.6%", description: "可直接进入套价", tone: "green" },
  { label: "AI相似匹配", value: 36, unit: "项", trend: "占比 23.1%", description: "需人工确认参数", tone: "purple" },
  { label: "无匹配项", value: 17, unit: "项", trend: "占比 10.9%", description: "建议生成询价任务", tone: "orange" },
  { label: "AI推荐总价", value: "2,860,000", unit: "USD", trend: "含税预估总价", description: "基于匹配价格库", tone: "purple" },
  { label: "高风险套价项", value: 12, unit: "项", trend: "需重点关注", description: "成本与参数风险", tone: "red" },
];

export const boqProjectInfo = [
  { label: "项目名称", value: "金沙萨水厂扩建项目" },
  { label: "项目阶段", value: "设计预算" },
  { label: "币种", value: "USD" },
  { label: "价格条件", value: "CIF Kinshasa Port, DRC" },
  { label: "有效期", value: "30 天（2026-06-19 前有效）" },
  { label: "汇率", value: "USD/CNY 7.18" },
];

export const boqMatchDistribution = [
  { label: "精准匹配", value: 82, percent: 52.6, color: "#22A861" },
  { label: "相似匹配", value: 36, percent: 23.1, color: "#2F6BFF" },
  { label: "无匹配", value: 17, percent: 10.9, color: "#F59E0B" },
  { label: "待人工复核", value: 5, percent: 3.2, color: "#FB6B4B" },
  { label: "识别风险项", value: 12, percent: 7.7, color: "#EF4444" },
];

export const parsedBoqRows: ParsedBoqRow[] = [
  { boqCode: "BOQ-2026-0001", projectName: "金沙萨水厂扩建项目", itemName: "潜水排污泵", category: "设备", specification: "DN300 PN16", unit: "台", quantity: 2, aiCategory: "水泵设备", matchedPrice: 4800, source: "供应商报价", confidence: "A", gapStatus: "confirmed", riskLevel: "low" },
  { boqCode: "BOQ-2026-0002", projectName: "金沙萨水厂扩建项目", itemName: "电动蝶阀", category: "设备", specification: "DN600 PN10", unit: "台", quantity: 2, aiCategory: "阀门设备", matchedPrice: 1250, source: "供应商报价", confidence: "A", gapStatus: "confirmed", riskLevel: "low" },
  { boqCode: "BOQ-2026-0003", projectName: "金沙萨水厂扩建项目", itemName: "钢管（焊接）", category: "地材", specification: "DN200 SCH40", unit: "m", quantity: 120, aiCategory: "管材", matchedPrice: 85, source: "地材价格", confidence: "B", gapStatus: "needs_review", riskLevel: "medium" },
  { boqCode: "BOQ-2026-0004", projectName: "金沙萨水厂扩建项目", itemName: "电缆", category: "地材", specification: "3×95mm²", unit: "m", quantity: 1000, aiCategory: "电气材料", matchedPrice: 12.6, source: "地材价格", confidence: "B", gapStatus: "needs_review", riskLevel: "medium" },
  { boqCode: "BOQ-2026-0005", projectName: "金沙萨水厂扩建项目", itemName: "闸阀", category: "设备", specification: "DN150 PN16", unit: "台", quantity: 6, aiCategory: "阀门设备", matchedPrice: 980, source: "模型价格", confidence: "C", gapStatus: "needs_info", riskLevel: "medium" },
  { boqCode: "BOQ-2026-0006", projectName: "金沙萨水厂扩建项目", itemName: "水泵支架", category: "设备", specification: "Q235", unit: "套", quantity: 12, aiCategory: "支架附件", matchedPrice: 320, source: "地材价格", confidence: "C", gapStatus: "needs_info", riskLevel: "high" },
  { boqCode: "BOQ-2026-0007", projectName: "金沙萨水厂扩建项目", itemName: "控制柜", category: "设备", specification: "800×600×2200", unit: "台", quantity: 3, aiCategory: "电控设备", matchedPrice: 2150, source: "模型价格", confidence: "C", gapStatus: "needs_info", riskLevel: "high" },
  { boqCode: "BOQ-2026-0008", projectName: "金沙萨水厂扩建项目", itemName: "上回阀", category: "设备", specification: "DN100 PN16", unit: "台", quantity: 4, aiCategory: "阀门设备", matchedPrice: null, source: "-", confidence: "D", gapStatus: "needs_info", riskLevel: "high" },
];

export const boqCostSummary = [
  { label: "设备费", value: 1420000, color: "#2F6BFF" },
  { label: "地材费", value: 760000, color: "#22A861" },
  { label: "人工费", value: 280000, color: "#19A7A5" },
  { label: "机械费", value: 180000, color: "#F97316" },
  { label: "运输费", value: 120000, color: "#4F7DF3" },
  { label: "未匹配费用预估", value: 100000, color: "#EF4444" },
];

export const boqSuggestions = [
  { title: "设备型号未识别", count: 7, percent: 41.2, action: "补充型号或品牌" },
  { title: "规格/参数缺失", count: 6, percent: 35.3, action: "补充技术参数" },
  { title: "新设备/非标设备", count: 4, percent: 23.5, action: "发起询价任务" },
];
