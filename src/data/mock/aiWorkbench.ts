import type { AiTaskStatus, ConfidenceLevel, RiskLevel } from "@/types/common";
import type { WorkflowKpi } from "./aiQuoteRecognition";

export type AiWorkbenchTask = Record<string, unknown> & {
  taskCode: string;
  taskType: string;
  taskName: string;
  source: string;
  objectName: string;
  status: AiTaskStatus;
  progress: number;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  createdAt: string;
  completedAt?: string;
  recommendedAction: string;
};

export const aiWorkbenchKpis: WorkflowKpi[] = [
  { label: "今日AI任务", value: 86, unit: "条", trend: "较昨日 ↑ 18.6%", description: "任务中心新增与流转", tone: "blue" },
  { label: "AI已完成", value: 62, unit: "条", trend: "完成率 72.1%", description: "已形成可复核输出", tone: "green" },
  { label: "待人工复核", value: 18, unit: "条", trend: "较昨日 ↑ 6", description: "需人工确认后入库", tone: "orange" },
  { label: "高风险AI结果", value: 7, unit: "条", trend: "较昨日 ↑ 2", description: "风险输出需优先处理", tone: "red" },
  { label: "AI套价缺口", value: "3.28", unit: "百万元", trend: "较昨日 ↓ 0.58", description: "待确认成本缺口", tone: "cyan" },
  { label: "AI生成报告", value: 12, unit: "份", trend: "较昨日 ↑ 3", description: "已生成报告草稿", tone: "purple" },
];

export const aiWorkbenchTabs = ["全部", "报价识别", "价格采集", "BOQ解析", "询价函生成", "项目套价", "报告生成", "人工复核"];

export const aiWorkbenchTasks: AiWorkbenchTask[] = [
  { taskCode: "AI-2025-05-21-0001", taskType: "设备价格识别", taskName: "设备价格识别", source: "DN1200 PN16 设备清单.pdf", objectName: "阀门清单", status: "completed", progress: 96, confidence: "A", riskLevel: "low", createdAt: "09:30", recommendedAction: "查看AI输出" },
  { taskCode: "AI-2025-05-21-0002", taskType: "清单智能套价", taskName: "清单智能套价", source: "电气清单_控制系统.xlsx", objectName: "控制柜清单", status: "needs_review", progress: 88, confidence: "B", riskLevel: "medium", createdAt: "10:12", recommendedAction: "人工复核" },
  { taskCode: "AI-2025-05-21-0003", taskType: "地材价格分析", taskName: "地材价格分析", source: "混凝土及钢材报价单.pdf", objectName: "地材报价", status: "running", progress: 74, confidence: "C", riskLevel: "low", createdAt: "10:25", recommendedAction: "等待分析" },
  { taskCode: "AI-2025-05-21-0004", taskType: "供应商比价分析", taskName: "供应商比价分析", source: "供应商报价_20250520.xlsx", objectName: "供应商报价", status: "needs_review", progress: 91, confidence: "A", riskLevel: "medium", createdAt: "09:42", recommendedAction: "查看比价" },
  { taskCode: "AI-2025-05-21-0005", taskType: "异常价格检测", taskName: "异常价格检测", source: "采购明细_钢材部分.pdf", objectName: "钢材报价", status: "completed", progress: 83, confidence: "B", riskLevel: "high", createdAt: "09:18", recommendedAction: "风险处理" },
  { taskCode: "AI-2025-05-21-0006", taskType: "市场趋势分析", taskName: "市场趋势分析", source: "阀门市场数据_2025Q2.xlsx", objectName: "阀门趋势", status: "completed", progress: 89, confidence: "B", riskLevel: "low", createdAt: "08:56", recommendedAction: "生成报告" },
  { taskCode: "AI-2025-05-21-0007", taskType: "AI价格采集", taskName: "区域价格线索采集", source: "钢材采集任务_华东区.json", objectName: "钢材线索", status: "running", progress: 68, confidence: "B", riskLevel: "medium", createdAt: "08:42", recommendedAction: "查看采集进度" },
  { taskCode: "AI-2025-05-21-0008", taskType: "BOQ解析", taskName: "扩建项目BOQ解析", source: "金沙萨水厂扩建_BOQ.xlsx", objectName: "项目BOQ", status: "needs_review", progress: 82, confidence: "B", riskLevel: "high", createdAt: "08:28", recommendedAction: "修正无匹配项" },
  { taskCode: "AI-2025-05-21-0009", taskType: "询价函生成", taskName: "泵阀设备询价函生成", source: "询价设备清单_泵阀.xlsx", objectName: "询价函草稿", status: "created", progress: 36, confidence: "C", riskLevel: "low", createdAt: "08:15", recommendedAction: "继续生成" },
  { taskCode: "AI-2025-05-21-0010", taskType: "报告生成", taskName: "设备价格月度报告", source: "设备价格数据_2025Q2.xlsx", objectName: "价格分析报告", status: "completed", progress: 100, confidence: "A", riskLevel: "low", createdAt: "08:02", recommendedAction: "查看报告" },
];

export const aiWorkbenchReviewItems = [
  { code: "AI-2025-05-21-0002", title: "清单智能套价", file: "电气清单_控制系统.xlsx", owner: "李工", time: "10:25", riskLevel: "medium" as RiskLevel },
  { code: "AI-2025-05-21-0004", title: "供应商比价分析", file: "供应商报价_20250520.xlsx", owner: "赵工", time: "09:42", riskLevel: "medium" as RiskLevel },
  { code: "AI-2025-05-21-0008", title: "异常价格检测", file: "水泵设备报价单.pdf", owner: "陈工", time: "09:18", riskLevel: "high" as RiskLevel },
  { code: "AI-2025-05-21-0011", title: "地材价格分析", file: "钢材市场询价单.xlsx", owner: "王工", time: "08:56", riskLevel: "medium" as RiskLevel },
  { code: "AI-2025-05-21-0013", title: "设备价格识别", file: "阀门清单_202505.xlsx", owner: "张工", time: "08:33", riskLevel: "low" as RiskLevel },
];

export const aiWorkbenchRiskItems = [
  { title: "价格明显低于市场价（>30%）", level: "high" as RiskLevel, count: 3 },
  { title: "疑似重复计量或虚高报价", level: "high" as RiskLevel, count: 2 },
  { title: "关联供应商报价异常波动", level: "medium" as RiskLevel, count: 1 },
  { title: "套价偏离市场均价（>15%）", level: "medium" as RiskLevel, count: 1 },
  { title: "缺少关键参数或规格不完整", level: "low" as RiskLevel, count: 0 },
];

export const aiWorkbenchSuggestions = [
  { title: "建议更新 DN600 PN16 球阀参考价", tag: "AI建议", date: "今天" },
  { title: "建议核对电缆型号规格一致性", tag: "AI建议", date: "今天" },
  { title: "建议补充钢材质证扫描附件", tag: "AI建议", date: "昨天" },
  { title: "建议关注304不锈钢价格上涨趋势", tag: "AI建议", date: "前天" },
  { title: "建议对供应商A进行资质二次审核", tag: "AI建议", date: "前天" },
];

export const aiWorkbenchActivities = [
  { time: "10:25", status: "completed" as AiTaskStatus, label: "完成", text: "清单智能套价任务 AI-2025-05-21-0002" },
  { time: "10:12", status: "needs_review" as AiTaskStatus, label: "发现", text: "高风险异常 任务 AI-2025-05-21-0008" },
  { time: "09:58", status: "created" as AiTaskStatus, label: "生成", text: "报价对比报告（12项差异）" },
  { time: "09:41", status: "running" as AiTaskStatus, label: "开始", text: "供应商比价分析任务 AI-2025-05-21-0004" },
  { time: "09:30", status: "completed" as AiTaskStatus, label: "完成", text: "设备价格识别任务 AI-2025-05-21-0001" },
];

export const aiWorkbenchDetail = {
  taskCode: "AI-202506-003",
  title: "金沙萨水厂扩建 BOQ解析",
  model: "AI BOQ Parser v2.1",
  output: "已识别 156 项 BOQ，其中精准匹配 82 项，相似匹配 36 项，无匹配 17 项。",
  currentStep: "价格库相似项召回与缺口归因",
  progress: [
    { label: "文件结构识别", status: "completed" as AiTaskStatus, value: 100 },
    { label: "字段抽取", status: "completed" as AiTaskStatus, value: 100 },
    { label: "价格库匹配", status: "running" as AiTaskStatus, value: 82 },
    { label: "风险归因", status: "needs_review" as AiTaskStatus, value: 64 },
  ],
  missingFields: ["上回阀规格疑似 OCR 错误", "控制柜品牌缺失", "部分非标支架缺少材质"],
  risks: [
    { title: "无匹配项成本估算偏差", description: "17 项无匹配价格，建议生成询价任务确认。", level: "high" as RiskLevel },
    { title: "参数缺失影响匹配准确率", description: "部分设备规格不完整，可能误判相似价格。", level: "medium" as RiskLevel },
  ],
  recommendedAction: "优先处理无匹配项和高风险项，再进入项目套价中心。",
  jumpLabel: "进入 BOQ 解析详情",
  jumpHref: "/project-pricing/boq-parse",
};

export type AiWorkbenchDetail = typeof aiWorkbenchDetail;
