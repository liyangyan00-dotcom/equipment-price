import type { ConfidenceLevel, RiskLevel } from "@/types/common";

export type InquiryItemCandidate = Record<string, unknown> & {
  id: string;
  itemCode: string;
  name: string;
  category: "设备" | "地材";
  specification: string;
  quantity: number;
  unit: string;
  targetPrice: number;
  currency: "CDF" | "USD";
  riskLevel: RiskLevel;
  selected: boolean;
  remark?: string;
};

export type InquirySupplierCandidate = Record<string, unknown> & {
  id: string;
  supplierName: string;
  logoText: string;
  category: string;
  tags: string[];
  matchRate: number;
  deliveryScore: number;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  responseSpeed: "快" | "中" | "慢";
  selected: boolean;
};

export const inquiryCreateSteps = [
  { label: "选择询价对象", description: "选择设备/材料及规格", status: "done" },
  { label: "选择供应商", description: "选择合适的供应商", status: "done" },
  { label: "AI 生成询价函", description: "智能生成询价内容", status: "active" },
  { label: "预览并创建任务", description: "确认并创建询价任务", status: "pending" },
] as const;

export const inquiryItemCandidates: InquiryItemCandidate[] = [
  {
    id: "ITEM-001",
    itemCode: "MAT-2025-0001",
    name: "CEM I 42.5R 水泥",
    category: "地材",
    specification: "袋装 50kg",
    quantity: 400,
    unit: "吨",
    targetPrice: 26500,
    currency: "CDF",
    riskLevel: "low",
    selected: true,
    remark: "品牌：Dangote",
  },
  {
    id: "ITEM-002",
    itemCode: "MAT-2025-0002",
    name: "HRB400 钢筋 Φ16mm",
    category: "地材",
    specification: "Φ16mm",
    quantity: 120,
    unit: "吨",
    targetPrice: 1020000,
    currency: "CDF",
    riskLevel: "medium",
    selected: true,
    remark: "执行标准：GB/T 1499.2-2018",
  },
  {
    id: "ITEM-003",
    itemCode: "MAT-2025-0003",
    name: "HRB400 钢筋 Φ25mm",
    category: "地材",
    specification: "Φ25mm",
    quantity: 80,
    unit: "吨",
    targetPrice: 1080000,
    currency: "CDF",
    riskLevel: "high",
    selected: false,
    remark: "执行标准：GB/T 1499.2-2018",
  },
  {
    id: "ITEM-004",
    itemCode: "MAT-2025-0004",
    name: "砂石 20-31.5mm",
    category: "地材",
    specification: "20-31.5mm",
    quantity: 1200,
    unit: "立方米",
    targetPrice: 48000,
    currency: "CDF",
    riskLevel: "low",
    selected: false,
    remark: "-",
  },
  {
    id: "ITEM-005",
    itemCode: "MAT-2025-0005",
    name: "砂石 10-20mm",
    category: "地材",
    specification: "10-20mm",
    quantity: 900,
    unit: "立方米",
    targetPrice: 42000,
    currency: "CDF",
    riskLevel: "medium",
    selected: false,
    remark: "-",
  },
];

export const inquirySupplierCandidates: InquirySupplierCandidate[] = [
  {
    id: "SUP-001",
    supplierName: "Kinshasa Water Solutions SARL",
    logoText: "KW",
    category: "本地供应",
    tags: ["刚果（金）", "主营供应", "合作良好"],
    matchRate: 92,
    deliveryScore: 92,
    confidence: "A",
    riskLevel: "low",
    responseSpeed: "快",
    selected: true,
  },
  {
    id: "SUP-002",
    supplierName: "Aqua Congo Services SARL",
    logoText: "AC",
    category: "贸易供应",
    tags: ["刚果（布）", "特色固材丰富", "报价积极"],
    matchRate: 86,
    deliveryScore: 86,
    confidence: "B",
    riskLevel: "low",
    responseSpeed: "中",
    selected: true,
  },
  {
    id: "SUP-003",
    supplierName: "Grundfos South Africa (Pty)Ltd",
    logoText: "GS",
    category: "制造供应",
    tags: ["南非", "价格优势", "技术可靠"],
    matchRate: 85,
    deliveryScore: 85,
    confidence: "B",
    riskLevel: "low",
    responseSpeed: "快",
    selected: true,
  },
  {
    id: "SUP-004",
    supplierName: "Tshisekedi Building Materials",
    logoText: "TB",
    category: "地材供应",
    tags: ["刚果（金）", "主营建材", "报价缓慢"],
    matchRate: 68,
    deliveryScore: 68,
    confidence: "C",
    riskLevel: "medium",
    responseSpeed: "慢",
    selected: false,
  },
  {
    id: "SUP-005",
    supplierName: "Kinshasa Logistics",
    logoText: "KL",
    category: "物流优势",
    tags: ["刚果（金）", "本地服务", "物流优势"],
    matchRate: 74,
    deliveryScore: 74,
    confidence: "B",
    riskLevel: "medium",
    responseSpeed: "中",
    selected: false,
  },
];

export const aiInquiryLetterDraft = {
  subject: "水厂建设项目 - 主要材料询价",
  deadline: "2025-05-23 17:00",
  location: "Kinshasa, RDC",
  currency: "CDF（刚果法郎）",
  paymentTerms: "30% 预付款，70% 到货后支付",
  note: "请提供详细报价单及相关附件。",
  body: [
    "尊敬的供应商：",
    "我方因项目建设需要，现就以下物资向贵公司询价，请按表格列明含税到场价。",
    "请贵公司提供含税单价、交货周期、付款条件、质保期及报价有效期。",
    "如部分材料存在替代品牌或规格，请在备注中说明价格差异及适用范围。",
  ],
  riskNotes: [
    "钢筋价格波动风险：建议关注近期钢材价格波动。",
    "市场供应紧张：部分材料可能存在供货周期延长。",
  ],
};

export const inquiryOverview = [
  { label: "询价对象数量", value: "5", unit: "项", description: "设备/材料已纳入" },
  { label: "总数量", value: "2,700", unit: "吨/立方米", description: "对象合计数量" },
  { label: "目标金额", value: "CDF 2,094,500", unit: "", description: "预估总金额" },
  { label: "供应商数量", value: "5", unit: "家", description: "已选择" },
  { label: "预计响应率", value: "78%", unit: "", description: "基于历史数据" },
  { label: "预计报价数量", value: "12 - 18", unit: "份", description: "基于供应商历史数据" },
];
