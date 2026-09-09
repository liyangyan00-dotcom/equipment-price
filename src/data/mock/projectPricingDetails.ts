import type {
  AiTaskStatus,
  ConfidenceLevel,
  CurrencyCode,
  RiskLevel,
  ReviewStatus,
} from "@/types/common";

export type ProjectPricingDetailBoqRow = {
  id: string;
  boqCode: string;
  itemName: string;
  category: "设备" | "地材" | "服务";
  specification: string;
  unit: string;
  quantity: number;
  recommendedUnitPrice: number | null;
  subtotal: number | null;
  currency: CurrencyCode;
  priceSource: string;
  sourceRecordId: string;
  supplierId: string;
  supplierName: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  matchStatus: "exact" | "similar" | "model" | "gap";
  matchLabel: string;
  conversionStatus?: "converted" | "manual_rate_required" | "not_applicable";
};

export type ProjectPricingSourceEvidence = {
  id: string;
  title: string;
  sourceType: string;
  sourceRecordId: string;
  supplierId: string;
  supplierName: string;
  quoteDate: string;
  validUntil: string;
  attachmentCount: number;
  confidence: ConfidenceLevel;
  note: string;
};

export type ProjectPricingRiskAction = {
  id: string;
  riskType: string;
  objectName: string;
  level: RiskLevel;
  reason: string;
  actionLabel: string;
  actionType: "inquiry" | "collection" | "review" | "supplier" | "attachment";
};

export type ProjectPricingVersion = {
  id: string;
  version: string;
  createdAt: string;
  operator: string;
  changeSummary: string;
  totalAmount: number;
  riskCount: number;
  status: ReviewStatus | AiTaskStatus;
};

export type ProjectPricingDetail = {
  id: string;
  projectName: string;
  projectStage: string;
  version: string;
  status: ReviewStatus | AiTaskStatus;
  currency: CurrencyCode;
  priceCondition: string;
  exchangeRate: string;
  totalAmount: number;
  estimatedAmount?: number;
  confirmedItemCount?: number;
  pendingReviewCount?: number;
  boqItemCount: number;
  matchedPriceCount: number;
  gapCount: number;
  highRiskCount: number;
  aiPricingStatus: AiTaskStatus;
  aiConfidence: number;
  lastUpdatedAt: string;
  owner: string;
  relatedBoqId: string;
  relatedInquiryId: string;
  relatedComparisonId: string;
  relatedReportId: string;
  relatedAttachmentId: string;
  summaryCards: Array<{
    label: string;
    value: string;
    description: string;
    tone: "blue" | "green" | "purple" | "orange" | "red";
  }>;
  boqRows: ProjectPricingDetailBoqRow[];
  priceSources: ProjectPricingSourceEvidence[];
  aiJudgment: {
    quality: string;
    summary: string;
    confidence: number;
    matchQuality: string;
    gapJudgment: string;
    highRiskJudgment: string;
    recommendedActions: string[];
  };
  riskActions: ProjectPricingRiskAction[];
  versions: ProjectPricingVersion[];
  relatedRecords: Array<{
    label: string;
    value: string;
    href: string;
    tone: "blue" | "purple" | "green" | "orange";
  }>;
  operationHistory: Array<{
    time: string;
    operator: string;
    action: string;
    result: string;
  }>;
};

export const projectPricingDetails: ProjectPricingDetail[] = [
  {
    id: "PRJ-202506-001",
    projectName: "金沙萨水厂扩建项目",
    projectStage: "设计预算",
    version: "V1.5",
    status: "needs_review",
    currency: "USD",
    priceCondition: "CIF Kinshasa Port, DRC",
    exchangeRate: "USD/CNY 7.18",
    totalAmount: 2860000,
    boqItemCount: 156,
    matchedPriceCount: 118,
    gapCount: 17,
    highRiskCount: 12,
    aiPricingStatus: "completed",
    aiConfidence: 89,
    lastUpdatedAt: "2026-06-20 14:30",
    owner: "张工",
    relatedBoqId: "BOQ-202506-001",
    relatedInquiryId: "INQ-202506-001",
    relatedComparisonId: "CMP-202506-001",
    relatedReportId: "REP-2025-0008",
    relatedAttachmentId: "ATT-202506-001",
    summaryCards: [
      {
        label: "套价总金额",
        value: "USD 2,860,000",
        description: "含税预估总价",
        tone: "purple",
      },
      {
        label: "BOQ项目数",
        value: "156 项",
        description: "来自解析清单",
        tone: "blue",
      },
      {
        label: "已匹配价格",
        value: "118 项",
        description: "精准和相似匹配",
        tone: "green",
      },
      {
        label: "缺口价格",
        value: "17 项",
        description: "需采集或询价",
        tone: "orange",
      },
      {
        label: "高风险价格",
        value: "12 项",
        description: "需人工复核",
        tone: "red",
      },
      {
        label: "当前版本",
        value: "V1.5",
        description: "最近更新 2026-06-20",
        tone: "purple",
      },
    ],
    boqRows: [
      {
        id: "BOQ-2026-0001",
        boqCode: "BOQ-2026-0001",
        itemName: "潜水排污泵",
        category: "设备",
        specification: "DN300 PN16",
        unit: "台",
        quantity: 2,
        recommendedUnitPrice: 4800,
        subtotal: 9600,
        currency: "USD",
        priceSource: "供应商报价",
        sourceRecordId: "EQP-2026-0001",
        supplierId: "SUP-202506-001",
        supplierName: "Grundfos South Africa",
        confidence: "A",
        riskLevel: "low",
        matchStatus: "exact",
        matchLabel: "精准匹配",
      },
      {
        id: "BOQ-2026-0002",
        boqCode: "BOQ-2026-0002",
        itemName: "电动蝶阀",
        category: "设备",
        specification: "DN600 PN10",
        unit: "台",
        quantity: 2,
        recommendedUnitPrice: 1250,
        subtotal: 2500,
        currency: "USD",
        priceSource: "供应商报价",
        sourceRecordId: "EQP-2026-0007",
        supplierId: "SUP-202506-002",
        supplierName: "Kinshasa Water Solutions",
        confidence: "A",
        riskLevel: "low",
        matchStatus: "exact",
        matchLabel: "精准匹配",
      },
      {
        id: "BOQ-2026-0003",
        boqCode: "BOQ-2026-0003",
        itemName: "钢管（埋地）",
        category: "地材",
        specification: "DN200 SCH40",
        unit: "m",
        quantity: 120,
        recommendedUnitPrice: 85,
        subtotal: 10200,
        currency: "USD",
        priceSource: "地材价格库",
        sourceRecordId: "MAT-2026-0003",
        supplierId: "SUP-202506-003",
        supplierName: "Matadi Metals",
        confidence: "B",
        riskLevel: "medium",
        matchStatus: "similar",
        matchLabel: "相似匹配",
      },
      {
        id: "BOQ-2026-0004",
        boqCode: "BOQ-2026-0004",
        itemName: "电缆",
        category: "地材",
        specification: "3x95mm2",
        unit: "m",
        quantity: 1000,
        recommendedUnitPrice: 12.6,
        subtotal: 12600,
        currency: "USD",
        priceSource: "地材价格库",
        sourceRecordId: "MAT-2026-0011",
        supplierId: "SUP-202506-004",
        supplierName: "Kinshasa Hardware",
        confidence: "B",
        riskLevel: "medium",
        matchStatus: "similar",
        matchLabel: "相似匹配",
      },
      {
        id: "BOQ-2026-0005",
        boqCode: "BOQ-2026-0005",
        itemName: "闸阀",
        category: "设备",
        specification: "DN150 PN16",
        unit: "台",
        quantity: 6,
        recommendedUnitPrice: 980,
        subtotal: 5880,
        currency: "USD",
        priceSource: "模型估算",
        sourceRecordId: "MODEL-VALVE-0150",
        supplierId: "SUP-202506-005",
        supplierName: "Aqua Congo Services",
        confidence: "C",
        riskLevel: "medium",
        matchStatus: "model",
        matchLabel: "类型匹配",
      },
      {
        id: "BOQ-2026-0006",
        boqCode: "BOQ-2026-0006",
        itemName: "水泵支架",
        category: "地材",
        specification: "Q235",
        unit: "套",
        quantity: 12,
        recommendedUnitPrice: 320,
        subtotal: 3840,
        currency: "USD",
        priceSource: "地材价格库",
        sourceRecordId: "MAT-2026-0018",
        supplierId: "SUP-202506-006",
        supplierName: "GCC SASA",
        confidence: "C",
        riskLevel: "medium",
        matchStatus: "model",
        matchLabel: "类型匹配",
      },
      {
        id: "BOQ-2026-0007",
        boqCode: "BOQ-2026-0007",
        itemName: "控制柜",
        category: "设备",
        specification: "800x600x2200",
        unit: "台",
        quantity: 3,
        recommendedUnitPrice: 2150,
        subtotal: 6450,
        currency: "USD",
        priceSource: "模型估算",
        sourceRecordId: "MODEL-CABINET-0800",
        supplierId: "SUP-202506-007",
        supplierName: "Schneider 施耐德",
        confidence: "C",
        riskLevel: "medium",
        matchStatus: "model",
        matchLabel: "类型匹配",
      },
      {
        id: "BOQ-2026-0008",
        boqCode: "BOQ-2026-0008",
        itemName: "止回阀",
        category: "设备",
        specification: "DN100 PN16",
        unit: "台",
        quantity: 4,
        recommendedUnitPrice: null,
        subtotal: null,
        currency: "USD",
        priceSource: "无匹配",
        sourceRecordId: "-",
        supplierId: "SUP-202506-008",
        supplierName: "-",
        confidence: "D",
        riskLevel: "high",
        matchStatus: "gap",
        matchLabel: "无匹配",
      },
    ],
    priceSources: [
      {
        id: "SRC-202506-001",
        title: "DN300 泵类正式报价单",
        sourceType: "供应商正式报价单",
        sourceRecordId: "EQP-2026-0001",
        supplierId: "SUP-202506-001",
        supplierName: "Grundfos South Africa",
        quoteDate: "2026-06-19",
        validUntil: "2026-07-19",
        attachmentCount: 6,
        confidence: "A",
        note: "包含技术参数、交货期、质保期和付款条件，可作为本次套价主要依据。",
      },
      {
        id: "SRC-202506-002",
        title: "HRB400 与钢管地材调研表",
        sourceType: "地材市场调研",
        sourceRecordId: "MAT-2026-0003",
        supplierId: "SUP-202506-003",
        supplierName: "Matadi Metals",
        quoteDate: "2026-06-18",
        validUntil: "2026-07-02",
        attachmentCount: 3,
        confidence: "B",
        note: "地区价格波动较快，建议对高用量地材在提交前再次确认。",
      },
      {
        id: "SRC-202506-003",
        title: "非标控制柜模型估算",
        sourceType: "AI模型估算",
        sourceRecordId: "MODEL-CABINET-0800",
        supplierId: "SUP-202506-007",
        supplierName: "Schneider 施耐德",
        quoteDate: "2026-06-17",
        validUntil: "2026-06-30",
        attachmentCount: 2,
        confidence: "C",
        note: "缺少防护等级和元件品牌，不能直接作为最终商务报价。",
      },
    ],
    aiJudgment: {
      quality: "可进入人工复核",
      summary:
        "AI 已完成 156 条 BOQ 的自动套价，其中 118 条可作为预算基础，17 条建议生成询价任务补齐。",
      confidence: 89,
      matchQuality: "精准与相似匹配占 75.7%，主要设备价格来源稳定。",
      gapJudgment: "止回阀、非标控制柜和部分支架缺少有效近期报价。",
      highRiskJudgment: "12 条价格存在低价异常、证据不完整或有效期临近风险。",
      recommendedActions: [
        "优先对 17 条缺口项创建询价任务",
        "对 12 条高风险价格进行人工复核",
        "导出证据清单并同步到报告中心",
      ],
    },
    riskActions: [
      {
        id: "RISK-001",
        riskType: "缺少有效报价",
        objectName: "止回阀 DN100 PN16",
        level: "high",
        reason: "无近 30 天供应商报价，模型无法给出稳定价格。",
        actionLabel: "创建询价任务",
        actionType: "inquiry",
      },
      {
        id: "RISK-002",
        riskType: "地区价格缺口",
        objectName: "水泵支架 Q235",
        level: "medium",
        reason: "刚果金地区地材价格样本不足，建议补采集。",
        actionLabel: "AI采集线索",
        actionType: "collection",
      },
      {
        id: "RISK-003",
        riskType: "低价异常",
        objectName: "控制柜 800x600x2200",
        level: "high",
        reason: "当前估算价低于历史均值 18.6%，需人工复核。",
        actionLabel: "人工复核",
        actionType: "review",
      },
      {
        id: "RISK-004",
        riskType: "证据不完整",
        objectName: "电缆 3x95mm2",
        level: "medium",
        reason: "附件缺少付款条款页，影响报价依据闭环。",
        actionLabel: "查看附件证据",
        actionType: "attachment",
      },
    ],
    versions: [
      {
        id: "VER-001",
        version: "V1.5",
        createdAt: "2026-06-20 14:30",
        operator: "张工",
        changeSummary: "重新解析 BOQ 并补充 6 条地材价格证据",
        totalAmount: 2860000,
        riskCount: 12,
        status: "needs_review",
      },
      {
        id: "VER-002",
        version: "V1.4",
        createdAt: "2026-06-18 10:20",
        operator: "李工",
        changeSummary: "接入询价结果，替换阀门类相似价格",
        totalAmount: 2798000,
        riskCount: 16,
        status: "completed",
      },
      {
        id: "VER-003",
        version: "V1.3",
        createdAt: "2026-06-15 17:12",
        operator: "王工",
        changeSummary: "初次 AI 自动套价，待人工补充证据",
        totalAmount: 2924000,
        riskCount: 24,
        status: "completed",
      },
    ],
    relatedRecords: [
      {
        label: "BOQ解析结果",
        value: "BOQ-202506-001",
        href: "/project-pricing/boq-parse?boqId=BOQ-202506-001",
        tone: "purple",
      },
      {
        label: "关联询价任务",
        value: "INQ-202506-001",
        href: "/inquiries/INQ-202506-001",
        tone: "blue",
      },
      {
        label: "比价分析结果",
        value: "CMP-202506-001",
        href: "/comparisons/CMP-202506-001",
        tone: "green",
      },
      {
        label: "附件证据链",
        value: "8 份附件",
        href: "/attachments?relatedProjectPricing=PRJ-202506-001",
        tone: "orange",
      },
    ],
    operationHistory: [
      {
        time: "2026-06-20 14:30",
        operator: "张工",
        action: "AI重新套价",
        result: "生成 V1.5 方案，新增 6 条证据",
      },
      {
        time: "2026-06-20 14:12",
        operator: "AI助手",
        action: "风险扫描",
        result: "识别 12 条高风险价格",
      },
      {
        time: "2026-06-19 17:40",
        operator: "李工",
        action: "创建询价任务",
        result: "为 17 条缺口项创建询价草稿",
      },
      {
        time: "2026-06-18 10:20",
        operator: "李工",
        action: "导入比价结果",
        result: "更新阀门类推荐价格",
      },
    ],
  },
];

export function getProjectPricingDetail(id: string): ProjectPricingDetail {
  const decodedId = decodeURIComponent(id).trim();
  const explicit = projectPricingDetails.find((item) => item.id === decodedId);
  if (explicit) return explicit;

  const base = projectPricingDetails[0];
  const numericSuffix = Number(decodedId.match(/(\d+)$/)?.[1] ?? 1);
  const variantIndex = Number.isFinite(numericSuffix) ? numericSuffix : 1;
  const projectNames = [
    "金沙萨水厂扩建项目",
    "Matadi 供水管网项目",
    "Lubumbashi 污水处理厂",
    "Pointe-Noire 加压泵站",
  ];
  const projectName = projectNames[(variantIndex - 1) % projectNames.length];
  const amountFactor = 0.82 + ((variantIndex - 1) % 5) * 0.09;
  const totalAmount = Math.round(base.totalAmount * amountFactor);
  const inquiryId = `INQ-202506-${String(((variantIndex - 1) % 8) + 1).padStart(3, "0")}`;
  const comparisonId = inquiryId.replace("INQ-", "CMP-");
  const reportId = `REP-2025-${String(9 - (((variantIndex - 1) % 6) + 1)).padStart(4, "0")}`;

  return {
    ...base,
    id: decodedId,
    projectName,
    version: `V1.${Math.max(1, variantIndex)}`,
    totalAmount,
    relatedInquiryId: inquiryId,
    relatedComparisonId: comparisonId,
    relatedReportId: reportId,
    relatedAttachmentId: `ATT-${decodedId.replace("PRJ-", "")}-001`,
    summaryCards: base.summaryCards.map((card, index) =>
      index === 0
        ? {
            ...card,
            value: `${(totalAmount / 1_000_000).toFixed(2)}M USD`,
            description: projectName,
          }
        : card,
    ),
    boqRows: base.boqRows.map((row, index) => ({
      ...row,
      id: `${decodedId}-BOQ-${String(index + 1).padStart(3, "0")}`,
      boqCode: `${decodedId}-BOQ-${String(index + 1).padStart(3, "0")}`,
    })),
    priceSources: base.priceSources.map((source, index) => ({
      ...source,
      id: `${decodedId}-SRC-${String(index + 1).padStart(3, "0")}`,
    })),
    riskActions: base.riskActions.map((risk, index) => ({
      ...risk,
      id: `${decodedId}-RISK-${String(index + 1).padStart(3, "0")}`,
    })),
    versions: base.versions.map((version, index) => ({
      ...version,
      id: `${decodedId}-VER-${String(index + 1).padStart(3, "0")}`,
      totalAmount: Math.round(version.totalAmount * amountFactor),
    })),
    relatedRecords: [
      {
        label: "关联询价任务",
        value: inquiryId,
        href: `/inquiries/${inquiryId}`,
        tone: "blue",
      },
      {
        label: "比价分析结果",
        value: comparisonId,
        href: `/comparisons/${comparisonId}`,
        tone: "green",
      },
      {
        label: "附件证据链",
        value: `${base.priceSources.reduce((sum, source) => sum + source.attachmentCount, 0)} 份附件`,
        href: `/attachments?relatedProjectPricing=${decodedId}`,
        tone: "orange",
      },
    ],
    operationHistory: base.operationHistory.map((operation, index) =>
      index === 0
        ? {
            ...operation,
            result: `${projectName}已生成 ${decodedId} 最新套价方案`,
          }
        : operation,
    ),
  };
}
