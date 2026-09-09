import type { AiTaskStatus, ConfidenceLevel, RiskLevel } from "@/types/common";
import type { WorkflowKpi } from "./aiQuoteRecognition";

export type InquiryLetterItem = {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  targetPrice: number;
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
};

export type InquiryLetterSupplier = {
  id: string;
  name: string;
  region: string;
  category: string;
  email: string;
  responseSpeed: "快" | "中" | "慢";
  deliveryScore: number;
  selected: boolean;
};

export type InquiryLetterDraft = {
  title: string;
  recipient: string;
  projectName: string;
  tone: string;
  deadline: string;
  contact: string;
  status: AiTaskStatus;
  confidence: ConfidenceLevel;
  sections: Array<{ title: string; content: string }>;
};

export const inquiryLetterKpis: WorkflowKpi[] = [
  { label: "待生成询价函", value: 18, unit: "封", trend: "较昨日 +4", description: "来自价格缺口与询价任务", tone: "purple" },
  { label: "已生成草稿", value: 42, unit: "封", trend: "采纳率 76%", description: "需人工确认后发送", tone: "blue" },
  { label: "待补充字段", value: 16, unit: "项", trend: "集中在交期/邮箱", description: "影响询价函完整度", tone: "orange" },
  { label: "供应商覆盖", value: 86, unit: "%", trend: "较上周 +5.8%", description: "优先覆盖 A/B 级供应商", tone: "green" },
  { label: "高风险对象", value: 5, unit: "项", trend: "需商务确认", description: "价格波动或参数缺失", tone: "red" },
  { label: "预计节省时间", value: 32.5, unit: "h", trend: "本月累计", description: "AI草稿与条款复用", tone: "cyan" },
];

export const inquiryLetterItems: InquiryLetterItem[] = [
  { id: "item-1", code: "MAT-2025-0001", name: "CEM I 42.5R 水泥", specification: "袋装 50kg", unit: "吨", quantity: 400, targetPrice: 26500, riskLevel: "low", confidence: "A" },
  { id: "item-2", code: "MAT-2025-0002", name: "HRB400 钢筋 Φ16mm", specification: "GB/T 1499.2-2018", unit: "吨", quantity: 120, targetPrice: 1020000, riskLevel: "medium", confidence: "B" },
  { id: "item-3", code: "MAT-2025-0003", name: "HRB400 钢筋 Φ25mm", specification: "热轧带肋钢筋", unit: "吨", quantity: 80, targetPrice: 1080000, riskLevel: "high", confidence: "C" },
  { id: "item-4", code: "MAT-2025-0004", name: "砂石 20-31.5mm", specification: "碎石粗骨料", unit: "立方米", quantity: 1200, targetPrice: 48000, riskLevel: "low", confidence: "A" },
  { id: "item-5", code: "MAT-2025-0005", name: "砂石 10-20mm", specification: "中碎石", unit: "立方米", quantity: 900, targetPrice: 42000, riskLevel: "medium", confidence: "B" },
];

export const inquiryLetterSuppliers: InquiryLetterSupplier[] = [
  { id: "sup-1", name: "Kinshasa Water Solutions SARL", region: "刚果（金）", category: "本地优质", email: "bid@kws.cd", responseSpeed: "快", deliveryScore: 92, selected: true },
  { id: "sup-2", name: "Aqua Congo Services SARL", region: "刚果（布）", category: "特色圆满丰富", email: "sales@aqua.cd", responseSpeed: "中", deliveryScore: 86, selected: true },
  { id: "sup-3", name: "Grundfos South Africa (Pty)Ltd", region: "南非", category: "价格优势", email: "rfq@grundfos.co.za", responseSpeed: "快", deliveryScore: 85, selected: true },
  { id: "sup-4", name: "Tshisekedi Building Materials", region: "刚果（金）", category: "土建材料", email: "", responseSpeed: "慢", deliveryScore: 68, selected: false },
  { id: "sup-5", name: "Kinshasa Logistics", region: "刚果（金）", category: "物流优势", email: "ops@kinlog.cd", responseSpeed: "中", deliveryScore: 74, selected: false },
];

export const inquiryLetterDraft: InquiryLetterDraft = {
  title: "水厂建设项目主要材料询价函",
  recipient: "Kinshasa Water Solutions SARL 等 5 家供应商",
  projectName: "金沙萨水厂扩建项目",
  tone: "正式、清晰、强调报价边界与交付风险",
  deadline: "2025-05-23 17:00",
  contact: "商务预算组 / procurement@water-ai.local",
  status: "needs_review",
  confidence: "A",
  sections: [
    { title: "询价背景", content: "我方因项目建设需要，现就主要材料进行询价，请按附件清单提供含税、含运至 Kinshasa 指定地点的报价。" },
    { title: "技术与商务要求", content: "报价需包含规格型号、执行标准、品牌产地、交货周期、付款条件、质保条款及有效期。" },
    { title: "附件要求", content: "请同步提供报价单、产品参数表、资质证明及可追溯的价格来源说明。" },
  ],
};

export const inquiryLetterMissingFields = [
  { field: "Tshisekedi Building Materials 邮箱", description: "缺少正式收件邮箱，可能影响询价函发送闭环。", action: "补全邮箱", status: "needs_info" as AiTaskStatus },
  { field: "HRB400 Φ25mm 执行标准", description: "规格描述未包含完整标准版本，建议从材料库补齐。", action: "补全参数", status: "needs_info" as AiTaskStatus },
  { field: "交货地点验收联系人", description: "当前仅有项目地点，缺少现场验收联系人。", action: "补充联系人", status: "needs_review" as AiTaskStatus },
];

export const inquiryLetterRisks = [
  { title: "钢筋价格波动风险", description: "近 30 天钢筋价格波动大，建议询价函要求报价有效期不少于 7 天。", level: "high" as RiskLevel },
  { title: "市场供应紧张", description: "部分规格本地供应商较少，建议保留区域供应商参与。", level: "medium" as RiskLevel },
  { title: "供应商邮箱缺失", description: "1 家候选供应商缺少邮箱，需要人工补充后再发送。", level: "medium" as RiskLevel },
];

export const inquiryLetterOverview = [
  { label: "询价对象数量", value: "5", unit: "项", description: "设备/材料已纳入", tone: "blue" as const },
  { label: "总数量", value: "2,700", unit: "吨/立方米", description: "对象合计数量", tone: "green" as const },
  { label: "目标金额", value: "CDF 2,094,500", unit: "", description: "预估总金额", tone: "orange" as const },
  { label: "供应商数量", value: "5", unit: "家", description: "已选择", tone: "purple" as const },
  { label: "预计响应率", value: "78%", unit: "", description: "基于历史数据", tone: "cyan" as const },
  { label: "预计报价数量", value: "12 - 18", unit: "份", description: "基于供应商历史数据", tone: "purple" as const },
];
