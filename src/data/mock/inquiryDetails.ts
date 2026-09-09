import type { AiTaskStatus, ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";
import { inquiryTaskRecords, type InquiryTaskRecord } from "./inquiries";
import { equipmentPriceRecords } from "./equipmentPrices";
import { materialPriceRecords } from "./materialPrices";
import { supplierRecords } from "./suppliers";

export type InquiryItemType = "equipment" | "material";

export type SupplierResponseStatus = "sent" | "viewed" | "responded" | "overdue" | "draft";

export type InquiryLifecycleStage = "local_draft" | "server_draft" | "letter_review" | "ready_to_send" | "sent";

export type InquiryDetailItem = {
  id: string;
  targetId: string;
  targetType: InquiryItemType;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  referencePrice: number;
  currency: CurrencyCode;
  source: string;
  confidenceLevel: ConfidenceLevel;
  riskLevel: RiskLevel;
  evidenceId: string;
};

export type InquirySupplierResponse = {
  supplierId: string;
  supplierName: string;
  region: string;
  contact: string;
  whatsapp: string;
  email: string;
  sendStatus: SupplierResponseStatus;
  responseStatus: SupplierResponseStatus;
  quoteAmount: number;
  currency: CurrencyCode;
  responseTime: string;
  responseSpeed: "fast" | "normal" | "slow";
  deliveryScore: number;
  riskLevel: RiskLevel;
  selected?: boolean;
  assignedItemIds?: string[];
  admissionStatus?: string;
};

export type InquiryAttachment = {
  id: string;
  name: string;
  type: "PDF" | "XLSX" | "DOCX" | "EML";
  size: string;
  linkedObject: string;
  uploadedAt: string;
  aiArchived: boolean;
};

export type InquiryRiskAction = {
  riskType: string;
  impactObject: string;
  level: RiskLevel;
  aiJudgement: string;
  suggestedAction: string;
  actionLabel: string;
};

export type InquiryOperation = {
  time: string;
  operator: string;
  action: string;
  result: string;
};

export type InquiryDetail = {
  id: string;
  title: string;
  projectName: string;
  inquiryType: string;
  status: AiTaskStatus;
  statusLabel?: string;
  createdAt: string;
  deadline: string;
  owner: string;
  supplierCount: number;
  respondedCount: number;
  riskLevel: RiskLevel;
  aiSuggestionStatus: AiTaskStatus;
  aiConfidence: number;
  lowestQuote: number;
  lowestQuoteCurrency?: CurrencyCode;
  remainingTime: string;
  isOverdue?: boolean;
  lifecycleStage?: InquiryLifecycleStage;
  items: InquiryDetailItem[];
  suppliers: InquirySupplierResponse[];
  letter: {
    version: string;
    language: string;
    recipients: string;
    projectBackground: string;
    technicalRequirements: string[];
    quoteRequirements: string[];
    deadlineText: string;
    attachments: string[];
    contact: string;
    aiNote: string;
    rawContent?: string;
  };
  aiAnalysis: {
    completeness: number;
    coverage: number;
    responseRisk: string;
    quoteAbnormal: string;
    nextActions: string[];
    confidence: number;
    evidence?: {
      model: string;
      analyzedAt: string;
      sources: string[];
    };
  };
  timeline: Array<{
    label: string;
    time: string;
    status: "done" | "running" | "pending";
  }>;
  risks: InquiryRiskAction[];
  attachments: InquiryAttachment[];
  operations: InquiryOperation[];
};

export const inquiryDetails: InquiryDetail[] = [
  {
    id: "INQ-202506-001",
    title: "取水泵采购询价",
    projectName: "Kinshasa 水厂扩建项目",
    inquiryType: "设备与地材联合询价",
    status: "running",
    createdAt: "2025-06-10 09:20",
    deadline: "2025-06-18 17:00",
    owner: "张工",
    supplierCount: 12,
    respondedCount: 9,
    riskLevel: "medium",
    aiSuggestionStatus: "needs_review",
    aiConfidence: 91,
    lowestQuote: 256000,
    remainingTime: "2 天 6 小时",
    items: [
      {
        id: "ITM-001",
        targetId: "EQP-202506-001",
        targetType: "equipment",
        name: "立式离心泵",
        specification: "DN300 PN16 Q=450m3/h",
        unit: "台",
        quantity: 2,
        referencePrice: 35500,
        currency: "USD",
        source: "设备价格库",
        confidenceLevel: "A",
        riskLevel: "low",
        evidenceId: "ATT-202506-001",
      },
      {
        id: "ITM-002",
        targetId: "EQP-202506-003",
        targetType: "equipment",
        name: "电动蝶阀",
        specification: "DN600 PN10 防爆型",
        unit: "台",
        quantity: 4,
        referencePrice: 4800,
        currency: "USD",
        source: "AI推荐价格",
        confidenceLevel: "B",
        riskLevel: "medium",
        evidenceId: "ATT-202506-003",
      },
      {
        id: "ITM-003",
        targetId: "MAT-2025-00456",
        targetType: "material",
        name: "HRB400 螺纹钢",
        specification: "Φ20mm",
        unit: "吨",
        quantity: 120,
        referencePrice: 3650,
        currency: "CNY",
        source: "地材价格库",
        confidenceLevel: "B",
        riskLevel: "low",
        evidenceId: "ATT-202506-011",
      },
      {
        id: "ITM-004",
        targetId: "MAT-2025-00457",
        targetType: "material",
        name: "普通硅酸盐水泥",
        specification: "42.5R",
        unit: "吨",
        quantity: 400,
        referencePrice: 420,
        currency: "CNY",
        source: "供应商报价单",
        confidenceLevel: "C",
        riskLevel: "medium",
        evidenceId: "ATT-202506-012",
      },
    ],
    suppliers: [
      {
        supplierId: "SUP-202506-001",
        supplierName: "Kinshasa Water Solutions SARL",
        region: "刚果（金）/ Kinshasa",
        contact: "Jean M.",
        whatsapp: "+243 81 234 5678",
        email: "jean@kws.cd",
        sendStatus: "sent",
        responseStatus: "responded",
        quoteAmount: 256000,
        currency: "CDF",
        responseTime: "10 小时",
        responseSpeed: "fast",
        deliveryScore: 92,
        riskLevel: "low",
        selected: true,
      },
      {
        supplierId: "SUP-202506-002",
        supplierName: "Aqua Congo Services SARL",
        region: "刚果（金）/ Kinshasa",
        contact: "Patrick K.",
        whatsapp: "+243 89 876 4321",
        email: "patrick@aquacongo.cd",
        sendStatus: "sent",
        responseStatus: "responded",
        quoteAmount: 282000,
        currency: "CDF",
        responseTime: "14 小时",
        responseSpeed: "normal",
        deliveryScore: 86,
        riskLevel: "low",
        selected: true,
      },
      {
        supplierId: "SUP-202506-003",
        supplierName: "Grundfos South Africa (Pty)Ltd",
        region: "南非 / Johannesburg",
        contact: "Thabo N.",
        whatsapp: "+27 71 123 4567",
        email: "thabo@grundfos.com",
        sendStatus: "viewed",
        responseStatus: "viewed",
        quoteAmount: 0,
        currency: "CDF",
        responseTime: "已查看未报价",
        responseSpeed: "slow",
        deliveryScore: 85,
        riskLevel: "medium",
      },
      {
        supplierId: "SUP-202506-004",
        supplierName: "Tshisekedi Building Materials",
        region: "刚果（金）/ Matadi",
        contact: "Claude T.",
        whatsapp: "+243 90 222 6888",
        email: "sales@tbm.cd",
        sendStatus: "sent",
        responseStatus: "overdue",
        quoteAmount: 0,
        currency: "CDF",
        responseTime: "逾期 1 天",
        responseSpeed: "slow",
        deliveryScore: 68,
        riskLevel: "high",
      },
    ],
    letter: {
      version: "v1.3",
      language: "中文 / 英文",
      recipients: "已选择 12 家供应商",
      projectBackground: "江北水厂提标改造项目正在执行设备与地材采购询价，需要供应商补充含税、交期、质保和付款条件。",
      technicalRequirements: [
        "泵类设备须提供完整流量、扬程、功率、材质和防护等级。",
        "阀门与执行器需明确压力等级、驱动方式、密封材质和安装接口。",
        "地材报价需注明产地、运输条件和报价有效期。",
      ],
      quoteRequirements: [
        "报价需包含税费、运输、装卸和现场交付条件。",
        "请在截止时间前提交电子报价单和技术资料。",
        "缺少关键参数的报价将进入人工复核流程。",
      ],
      deadlineText: "2025-06-18 17:00 前回复",
      attachments: ["设备清单.xlsx", "地材清单.xlsx", "技术规格书.pdf", "付款条款.docx"],
      contact: "张工 / +86 138 1234 5678",
      aiNote: "AI已根据询价对象、供应商区域和历史响应质量生成询价函草稿，建议人工确认付款与交期条款。",
    },
    aiAnalysis: {
      completeness: 88,
      coverage: 75,
      responseRisk: "已有 3 家供应商未响应，其中 1 家高风险供应商逾期。",
      quoteAbnormal: "最低报价较历史均值低 18.6%，建议进入比价前人工复核。",
      nextActions: ["提醒未响应供应商", "补充电动蝶阀执行器参数", "对低价报价发起二次确认"],
      confidence: 91,
    },
    timeline: [
      { label: "创建询价任务", time: "06-10 09:20", status: "done" },
      { label: "AI生成询价函", time: "06-10 09:26", status: "done" },
      { label: "批量发送供应商", time: "06-10 10:12", status: "done" },
      { label: "供应商陆续响应", time: "06-11 至今", status: "running" },
      { label: "进入比价决策", time: "待响应完成", status: "pending" },
    ],
    risks: [
      {
        riskType: "低价异常",
        impactObject: "Kinshasa Water Solutions SARL",
        level: "medium",
        aiJudgement: "最低报价低于历史均值 18.6%，可能存在漏项或交付条件差异。",
        suggestedAction: "进入比价前要求供应商补充价格构成说明。",
        actionLabel: "要求说明",
      },
      {
        riskType: "参数缺失",
        impactObject: "DN600 电动蝶阀",
        level: "medium",
        aiJudgement: "缺少执行器扭矩、防护等级和密封材质，可能影响比价准确性。",
        suggestedAction: "补全参数后再进入比价。",
        actionLabel: "补全参数",
      },
      {
        riskType: "响应逾期",
        impactObject: "Tshisekedi Building Materials",
        level: "high",
        aiJudgement: "供应商已逾期 1 天，且交付评分偏低。",
        suggestedAction: "发送提醒或更换候选供应商。",
        actionLabel: "发送提醒",
      },
    ],
    attachments: [
      { id: "ATT-202506-001", name: "询价清单_设备地材.xlsx", type: "XLSX", size: "420 KB", linkedObject: "询价对象清单", uploadedAt: "2025-06-10", aiArchived: true },
      { id: "ATT-202506-002", name: "AI询价函_v1.3.docx", type: "DOCX", size: "188 KB", linkedObject: "询价函草稿", uploadedAt: "2025-06-10", aiArchived: true },
      { id: "ATT-202506-003", name: "供应商报价回执.eml", type: "EML", size: "96 KB", linkedObject: "供应商响应", uploadedAt: "2025-06-12", aiArchived: true },
      { id: "ATT-202506-004", name: "低价异常说明.pdf", type: "PDF", size: "1.1 MB", linkedObject: "风险证据", uploadedAt: "2025-06-13", aiArchived: false },
    ],
    operations: [
      { time: "2025-06-10 09:20", operator: "张工", action: "创建询价任务", result: "已生成询价编号 INQ-202506-001" },
      { time: "2025-06-10 09:26", operator: "AI助手", action: "生成询价函", result: "生成中英双语询价函草稿" },
      { time: "2025-06-10 10:12", operator: "张工", action: "批量发送", result: "发送至 12 家供应商" },
      { time: "2025-06-12 15:40", operator: "AI助手", action: "风险识别", result: "发现 3 项需复核风险" },
    ],
  },
];

function buildInquiryDetailFromTask(task: InquiryTaskRecord): InquiryDetail {
  const base = inquiryDetails[0];
  const suffix = task.inquiryCode.split("-").at(-1) ?? "001";
  const coverage = task.supplierCount > 0 ? Math.round((task.respondedCount / task.supplierCount) * 100) : 0;
  const confidence = task.riskLevel === "high" ? 76 : task.riskLevel === "medium" ? 86 : 93;
  const targetType: InquiryItemType = task.relatedItem.includes("钢") || task.relatedItem.includes("滤料") || task.relatedItem.includes("PAM")
    ? "material"
    : "equipment";
  const targetId = targetType === "material" ? `MAT-2025-${String(455 + Number(suffix)).padStart(5, "0")}` : `EQP-2026-${suffix.padStart(4, "0")}`;

  return {
    ...base,
    id: task.inquiryCode,
    title: task.subject,
    projectName: `${task.relatedItem}采购项目`,
    status: task.status,
    deadline: `${task.deadline} 17:00`,
    supplierCount: task.supplierCount,
    respondedCount: task.respondedCount,
    riskLevel: task.riskLevel,
    aiSuggestionStatus: task.status === "completed" ? "completed" : task.riskLevel === "low" ? "completed" : "needs_review",
    aiConfidence: confidence,
    lowestQuote: task.lowestQuote,
    remainingTime: task.age,
    items: base.items.map((item, index) => index === 0
      ? {
          ...item,
          id: `ITM-${suffix}-01`,
          targetId,
          targetType,
          name: task.relatedItem,
          specification: task.subject,
          referencePrice: task.lowestQuote,
          currency: task.currency,
          riskLevel: task.riskLevel,
          evidenceId: `ATT-${task.inquiryCode.replace("INQ-", "")}-001`,
        }
      : {
          ...item,
          id: `ITM-${suffix}-${String(index + 1).padStart(2, "0")}`,
          evidenceId: `ATT-${task.inquiryCode.replace("INQ-", "")}-${String(index + 1).padStart(3, "0")}`,
        }),
    suppliers: base.suppliers.map((supplier, index) => ({
      ...supplier,
      quoteAmount: index === 0 ? task.lowestQuote : Math.round(task.lowestQuote * (1 + index * 0.12)),
      currency: task.currency,
      responseStatus: index < task.respondedCount ? "responded" : index === task.respondedCount ? "viewed" : "sent",
      sendStatus: index < task.respondedCount ? "sent" : "viewed",
      riskLevel: index === 0 ? task.riskLevel : supplier.riskLevel,
    })),
    letter: {
      ...base.letter,
      recipients: `已选择 ${task.supplierCount} 家供应商`,
      projectBackground: `${task.subject}正在开展采购询价，询价对象为${task.relatedItem}，需要供应商补充完整价格、交期、质保与付款条件。`,
      deadlineText: `${task.deadline} 17:00 前回复`,
      aiNote: `AI 已结合 ${task.relatedItem} 的历史价格和 ${task.supplierCount} 家候选供应商生成草稿，当前置信度 ${confidence}%，仍需人工确认。`,
    },
    aiAnalysis: {
      ...base.aiAnalysis,
      completeness: Math.min(96, 78 + task.respondedCount),
      coverage,
      responseRisk: `已收到 ${task.respondedCount}/${task.supplierCount} 家供应商响应，未响应对象需继续催办。`,
      quoteAbnormal: `当前最低报价 ${task.lowestQuote.toLocaleString("zh-CN")} ${task.currency}，最高报价 ${task.highestQuote.toLocaleString("zh-CN")} ${task.currency}，差异 ${task.differenceRate}%。`,
      nextActions: [`复核${task.relatedItem}报价口径`, "提醒未响应供应商", `按${task.aiPlan}进入比价决策`],
      confidence,
    },
    timeline: base.timeline.map((item, index) => index === 0
      ? { ...item, label: `创建询价任务 ${task.inquiryCode}`, time: task.deadline.slice(5) }
      : item),
    risks: base.risks.map((risk, index) => index === 0
      ? {
          ...risk,
          impactObject: task.relatedItem,
          level: task.riskLevel,
          aiJudgement: `报价差异达到 ${task.differenceRate}%，最低报价来自 ${task.lowestSupplier}，需核对范围与交付条件。`,
        }
      : risk),
    attachments: base.attachments.map((attachment, index) => ({
      ...attachment,
      id: `ATT-${task.inquiryCode.replace("INQ-", "")}-${String(index + 1).padStart(3, "0")}`,
      name: index === 0 ? `${task.inquiryCode}_${task.relatedItem}_询价清单.xlsx` : attachment.name,
    })),
    operations: base.operations.map((operation, index) => index === 0
      ? { ...operation, result: `已生成询价编号 ${task.inquiryCode}` }
      : operation),
  };
}

type WorkflowInquiryInput = {
  id: string;
  comparisonId: string;
  title: string;
  itemIds: string[];
  supplierIds: string[];
  status: "draft" | "created";
  createdAt: string;
};

function buildInquiryDetailFromWorkflow(workflow: WorkflowInquiryInput): InquiryDetail {
  const itemRecords = workflow.itemIds.map((id, index): InquiryDetailItem => {
    const equipment = equipmentPriceRecords.find((item) => item.id === id || item.equipmentCode === id);
    if (equipment) {
      return {
        id: `ITM-${workflow.id}-${index + 1}`,
        targetId: equipment.id,
        targetType: "equipment",
        name: equipment.equipmentName,
        specification: equipment.specification,
        unit: equipment.unit,
        quantity: 1,
        referencePrice: equipment.originalPrice,
        currency: equipment.currency,
        source: equipment.priceSource,
        confidenceLevel: equipment.confidence,
        riskLevel: equipment.riskLevel,
        evidenceId: `ATT-${workflow.id}-${index + 1}`,
      };
    }

    const material = materialPriceRecords.find((item) => item.id === id || item.materialCode === id);
    if (material) {
      return {
        id: `ITM-${workflow.id}-${index + 1}`,
        targetId: material.id,
        targetType: "material",
        name: material.materialName,
        specification: material.specification,
        unit: material.unit,
        quantity: 1,
        referencePrice: material.originalPrice,
        currency: material.currency,
        source: material.source,
        confidenceLevel: material.confidence,
        riskLevel: material.riskLevel,
        evidenceId: `ATT-${workflow.id}-${index + 1}`,
      };
    }

    return {
      ...inquiryDetails[0].items[0],
      id: `ITM-${workflow.id}-${index + 1}`,
      targetId: id,
      name: id,
      evidenceId: `ATT-${workflow.id}-${index + 1}`,
    };
  });
  const supplierResponses = workflow.supplierIds.map((id, index): InquirySupplierResponse => {
    const supplier = supplierRecords.find((item) => item.id === id || item.supplierCode === id || item.supplierName === id);
    if (!supplier) {
      return {
        ...inquiryDetails[0].suppliers[index % inquiryDetails[0].suppliers.length],
        supplierId: id,
        supplierName: id,
        quoteAmount: 0,
        sendStatus: "draft",
        responseStatus: "draft",
      };
    }

    return {
      supplierId: supplier.id,
      supplierName: supplier.supplierName,
      region: supplier.countryRegion,
      contact: supplier.contact,
      whatsapp: supplier.whatsapp,
      email: supplier.email,
      sendStatus: "draft",
      responseStatus: "draft",
      quoteAmount: 0,
      currency: "USD",
      responseTime: "待发送",
      responseSpeed: supplier.responseSpeed === "快" || supplier.responseSpeed === "较快" ? "fast" : supplier.responseSpeed === "较慢" ? "slow" : "normal",
      deliveryScore: supplier.technicalCapability,
      riskLevel: supplier.riskLevel,
      selected: true,
    };
  });
  const base = buildInquiryDetailFromTask({
    ...inquiryTaskRecords[0],
    id: workflow.id,
    inquiryCode: workflow.id,
    comparisonId: workflow.comparisonId,
    subject: workflow.title,
    relatedItem: itemRecords.map((item) => item.name).slice(0, 2).join("、") || "待补充询价对象",
    supplierCount: supplierResponses.length,
    respondedCount: 0,
    lowestQuote: 0,
    highestQuote: 0,
    differenceRate: 0,
    status: "created",
    riskLevel: itemRecords.some((item) => item.riskLevel === "high") ? "high" : "low",
    age: "刚刚",
  });

  return {
    ...base,
    createdAt: new Date(workflow.createdAt).toLocaleString("zh-CN", { hour12: false }),
    items: itemRecords.length ? itemRecords : base.items,
    suppliers: supplierResponses.length ? supplierResponses : base.suppliers,
    letter: {
      ...base.letter,
      recipients: `已选择 ${supplierResponses.length} 家供应商`,
    },
  };
}

export function getInquiryDetail(id?: string, workflow?: WorkflowInquiryInput) {
  const key = decodeURIComponent(id ?? "").trim().toLowerCase();
  if (workflow && workflow.id.toLowerCase() === key) {
    return buildInquiryDetailFromWorkflow(workflow);
  }
  const explicit = inquiryDetails.find((detail) => detail.id.toLowerCase() === key);
  if (explicit) return explicit;

  const task = inquiryTaskRecords.find((item) =>
    [item.id, item.inquiryCode].some((value) => value.toLowerCase() === key),
  );

  return task ? buildInquiryDetailFromTask(task) : buildInquiryDetailFromTask({
    ...inquiryTaskRecords[0],
    id: id || inquiryTaskRecords[0].id,
    inquiryCode: id || inquiryTaskRecords[0].inquiryCode,
    subject: `询价任务 ${id || inquiryTaskRecords[0].inquiryCode}`,
  });
}
