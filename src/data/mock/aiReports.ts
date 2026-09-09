import type { AiTaskStatus, ConfidenceLevel, RiskLevel } from "@/types/common";
import type { WorkflowKpi } from "./aiQuoteRecognition";

export type AiReportType = {
  id: string;
  name: string;
  description: string;
  tone: "blue" | "cyan" | "green" | "orange" | "red" | "purple";
  selected?: boolean;
};

export type AiReportTask = Record<string, unknown> & {
  reportCode: string;
  reportType: string;
  projectName: string;
  sourceCount: number;
  status: AiTaskStatus;
  confidence: ConfidenceLevel;
  missingFields: number;
  riskLevel: RiskLevel;
  createdAt: string;
};

export const aiReportKpis: WorkflowKpi[] = [
  { label: "报告草稿", value: 24, unit: "份", trend: "本月生成", description: "均需人工确认", tone: "purple" },
  { label: "可用数据源", value: 8, unit: "类", trend: "价格/供应商/询价", description: "跨模块证据汇总", tone: "blue" },
  { label: "待补充证据", value: 17, unit: "项", trend: "影响报告完整度", description: "报价、附件、风险说明", tone: "orange" },
  { label: "高风险结论", value: 6, unit: "项", trend: "需商务复核", description: "不可自动发布", tone: "red" },
  { label: "平均置信度", value: "88.6", unit: "%", trend: "较上周 +2.1%", description: "报告要点可信度", tone: "green" },
  { label: "节省整理时间", value: 45.5, unit: "h", trend: "本月累计", description: "自动生成结构草稿", tone: "cyan" },
];

export const aiReportTypes: AiReportType[] = [
  { id: "price-library", name: "价格库分析报告", description: "设备、地材、供应商价格变化与风险", tone: "blue", selected: true },
  { id: "comparison", name: "供应商比价报告", description: "询价结果、报价差异与推荐方案", tone: "purple" },
  { id: "project-pricing", name: "项目套价说明", description: "BOQ匹配、无匹配项与成本风险", tone: "green" },
  { id: "inquiry", name: "询价结果报告", description: "询价进展、响应状态与商务建议", tone: "cyan" },
  { id: "risk", name: "价格风险报告", description: "异常价格、供应风险与人工复核项", tone: "red" },
  { id: "weekly", name: "AI价格情报周报", description: "跨模块价格情报与AI建议汇总", tone: "orange" },
];

export const aiReportSources = [
  { name: "设备价格库", count: 12568, status: "confirmed" as AiTaskStatus, confidence: "A" as ConfidenceLevel },
  { name: "地材价格库", count: 8942, status: "confirmed" as AiTaskStatus, confidence: "A" as ConfidenceLevel },
  { name: "供应商库", count: 2346, status: "needs_review" as AiTaskStatus, confidence: "B" as ConfidenceLevel },
  { name: "询价与比价", count: 128, status: "running" as AiTaskStatus, confidence: "B" as ConfidenceLevel },
  { name: "项目套价", count: 36, status: "needs_info" as AiTaskStatus, confidence: "C" as ConfidenceLevel },
  { name: "附件证据", count: 612, status: "confirmed" as AiTaskStatus, confidence: "B" as ConfidenceLevel },
];

export const aiReportOutline = {
  title: "水厂项目价格情报与风险分析报告",
  model: "AI Report Composer v1.8",
  confidence: "B" as ConfidenceLevel,
  sections: [
    { title: "1. 核心价格变化摘要", points: ["设备价格较上月上涨 12.4%", "地材价格波动集中在钢筋与水泥", "AI线索采集覆盖率提升 18.6%"] },
    { title: "2. 供应商与报价响应", points: ["高可信供应商 905 家", "询价响应率 82%", "高差异报价集中在阀门与管件采购"] },
    { title: "3. 项目套价风险", points: ["BOQ 无匹配项 17 项", "未匹配费用预估 USD 100,000", "建议对非标设备单独询价"] },
    { title: "4. AI建议与人工复核", points: ["高风险价格不得自动入库", "供应商缺失字段需补全", "报告发布前需商务经理确认"] },
  ],
  missingData: ["部分供应商附件证据缺失", "部分价格来源未有报价有效期", "BOQ 非标项缺少品牌与材质"],
  conclusion: "建议优先复核钢筋、阀门与非标控制柜价格，并以 A/B 级供应商报价作为项目套价主依据。",
};

export type AiReportOutline = typeof aiReportOutline;

export const aiReportTasks: AiReportTask[] = [
  { reportCode: "RPT-202506-001", reportType: "价格库分析报告", projectName: "金沙萨水厂扩建", sourceCount: 6, status: "needs_review", confidence: "B", missingFields: 3, riskLevel: "medium", createdAt: "2026-06-14 09:30" },
  { reportCode: "RPT-202506-002", reportType: "供应商比价报告", projectName: "取水泵采购询价", sourceCount: 4, status: "completed", confidence: "A", missingFields: 0, riskLevel: "low", createdAt: "2026-06-13 18:20" },
  { reportCode: "RPT-202506-003", reportType: "项目套价说明", projectName: "Matadi 供水改造", sourceCount: 5, status: "needs_info", confidence: "C", missingFields: 7, riskLevel: "high", createdAt: "2026-06-13 15:42" },
  { reportCode: "RPT-202506-004", reportType: "价格风险报告", projectName: "本周价格风险", sourceCount: 7, status: "running", confidence: "B", missingFields: 2, riskLevel: "high", createdAt: "2026-06-14 10:18" },
];
