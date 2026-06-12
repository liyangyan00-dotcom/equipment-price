import type { ConfidenceLevel, RiskLevel, ReviewStatus } from "@/types/common";
import { supplierRecords } from "./suppliers";

export type SupplierDetail = {
  id: string;
  supplierCode: string;
  supplierName: string;
  countryRegion: string;
  category: string;
  mainScope: string;
  contact: string;
  whatsapp: string;
  email: string;
  phone: string;
  address: string;
  language: string;
  serviceRegion: string;
  paymentTerms: string;
  status: "活跃" | "待复核" | "暂停";
  firstRecordedAt: string;
  updatedAt: string;
  quoteCount: number;
  lastQuoteAt: string;
  responseSpeed: string;
  technicalCapability: number;
  deliveryRisk: RiskLevel;
  overallScore: number;
  confidence: ConfidenceLevel;
  ai: {
    summary: string;
    response: string;
    technical: string;
    delivery: string;
    stability: string;
    actions: string[];
  };
  quoteHistory: {
    quoteCode: string;
    itemName: string;
    amount: number;
    currency: string;
    quoteDate: string;
    confidence: ConfidenceLevel;
    status: ReviewStatus;
    risk: RiskLevel;
  }[];
  projectMatches: { category: string; project: string; reason: string; action: string; match: number }[];
  risks: { type: string; description: string; level: RiskLevel; action: string }[];
  notes: { name: string; type: string; date: string; confidence: ConfidenceLevel }[];
};

const base = supplierRecords[0];

export const supplierDetails: SupplierDetail[] = [
  {
    id: base.id,
    supplierCode: base.supplierCode,
    supplierName: base.supplierName,
    countryRegion: `${base.countryRegion} / 华东`,
    category: base.category,
    mainScope: base.mainScope,
    contact: base.contact,
    whatsapp: base.whatsapp,
    email: base.email,
    phone: "+86 021 5789 2100",
    address: "上海市嘉定区曹安公路 4255 号",
    language: "中文 / 英文",
    serviceRegion: "中国、东南亚、非洲项目供货",
    paymentTerms: "预付款 30%，发货前 70%",
    status: base.status,
    firstRecordedAt: "2025-09-18",
    updatedAt: "2026-05-20",
    quoteCount: base.quoteCount,
    lastQuoteAt: base.lastQuoteAt,
    responseSpeed: base.responseSpeed,
    technicalCapability: base.technicalCapability,
    deliveryRisk: base.deliveryRisk,
    overallScore: base.overallScore,
    confidence: base.confidence,
    ai: {
      summary: "该供应商对水泵及成套供水设备响应较快，历史报价稳定，可作为核心询价对象，但大口径泵组仍需复核交期。",
      response: "近 180 天平均响应 6.5 小时，邮件与 WhatsApp 均可触达。",
      technical: "水泵设备参数完整度高，成套供水设备需补充控制柜配置。",
      delivery: "国内交付风险低，非洲项目需确认海运周期。",
      stability: "历史报价波动在 6% 以内，稳定性较好。",
      actions: ["创建询价任务", "补充非洲项目交付周期", "纳入优先联系名单"],
    },
    quoteHistory: [
      { quoteCode: "Q-202605-001", itemName: "卧式离心泵", amount: 88000, currency: "CNY", quoteDate: "2026-05-20", confidence: "A", status: "confirmed", risk: "low" },
      { quoteCode: "Q-202604-022", itemName: "潜水排污泵", amount: 35500, currency: "CNY", quoteDate: "2026-04-28", confidence: "B", status: "confirmed", risk: "low" },
      { quoteCode: "Q-202603-018", itemName: "成套供水设备", amount: 186000, currency: "CNY", quoteDate: "2026-03-16", confidence: "B", status: "need_info", risk: "medium" },
    ],
    projectMatches: [
      { category: "水泵设备", project: "金沙萨净水厂扩建项目", reason: "同类泵组报价完整，匹配度高。", action: "发起询价", match: 92 },
      { category: "成套供水", project: "Matadi 加压泵站", reason: "供货经验匹配，但需确认交期。", action: "补充交期", match: 86 },
    ],
    risks: [
      { type: "交付周期", description: "非洲项目海运周期需单独确认。", level: "medium", action: "补充交期" },
      { type: "文件资料", description: "部分成套设备缺少最新授权证明。", level: "low", action: "补全资料" },
    ],
    notes: [
      { name: "营业执照与 ISO 证书.pdf", type: "资质文件", date: "2026-05-12", confidence: "A" },
      { name: "历史合作评价.docx", type: "商务记录", date: "2026-05-18", confidence: "B" },
    ],
  },
];

export function getSupplierDetail(id: string) {
  return supplierDetails.find((item) => item.id === id) ?? supplierDetails[0];
}
