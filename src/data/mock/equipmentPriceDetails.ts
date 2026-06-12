import type { ConfidenceLevel, CurrencyCode, PriceCondition, RiskLevel, ReviewStatus } from "@/types/common";
import { equipmentPriceRecords } from "./equipmentPrices";

export type EquipmentPriceDetail = {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  brand: string;
  specification: string;
  category: string;
  status: ReviewStatus;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  originalPrice: number;
  usdPrice: number;
  currency: CurrencyCode;
  exchangeRate: string;
  unit: string;
  priceCondition: PriceCondition;
  supplier: string;
  supplierCount: number;
  quoteDate: string;
  validUntil: string;
  sourceType: string;
  updatedAt: string;
  processStage: string;
  parameterCompleteness: number;
  keyParameters: { label: string; value: string }[];
  ai: {
    confidence: number;
    summary: string;
    similarPrice: string;
    reasonableness: string;
    missingParams: string[];
    recommendedActions: string[];
  };
  evidence: { name: string; type: string; uploadedAt: string; confidence: ConfidenceLevel }[];
  history: { date: string; title: string; source: string; reviewer: string; status: ReviewStatus; risk: RiskLevel; price: string }[];
  risks: { type: string; description: string; level: RiskLevel; action: string }[];
};

const base = equipmentPriceRecords[2] ?? equipmentPriceRecords[0];

export const equipmentPriceDetails: EquipmentPriceDetail[] = [
  {
    id: base.id,
    equipmentCode: base.equipmentCode,
    equipmentName: base.equipmentName,
    brand: base.brand,
    specification: base.specification,
    category: base.category,
    status: base.reviewStatus,
    confidence: base.confidence,
    riskLevel: base.riskLevel,
    originalPrice: base.originalPrice,
    usdPrice: base.usdPrice,
    currency: base.currency,
    exchangeRate: base.currency === "USD" ? "1.0000" : "7.18",
    unit: base.unit,
    priceCondition: base.priceCondition,
    supplier: base.supplier,
    supplierCount: 4,
    quoteDate: "2026-05-19",
    validUntil: "2026-06-18",
    sourceType: base.sourceType,
    updatedAt: base.updatedAt,
    processStage: "预处理及二沉池",
    parameterCompleteness: 82,
    keyParameters: [
      { label: "公称直径", value: "DN600" },
      { label: "压力等级", value: "PN10" },
      { label: "连接方式", value: "法兰连接" },
      { label: "执行机构", value: "电动执行器，扭矩待补充" },
      { label: "阀体材质", value: "球墨铸铁 / 环氧喷涂" },
      { label: "密封材质", value: "EPDM" },
    ],
    ai: {
      confidence: 89,
      summary:
        "当前 DN600 电动蝶阀报价低于历史均值 18.6%，且缺少执行器扭矩参数，建议人工复核并补充参数后再进入项目套价。",
      similarPrice: "匹配到 3 条历史相似价格，区间 USD 4,600 - 5,350 / 台。",
      reasonableness: "报价处于合理偏低区间，需确认是否包含执行机构和防护等级。",
      missingParams: ["执行器扭矩", "防护等级", "供电电压"],
      recommendedActions: ["补充参数", "发起询价", "人工复核", "生成说明"],
    },
    evidence: [
      { name: "天津伯纳德阀门_DN600报价单.pdf", type: "报价单", uploadedAt: "2026-05-19 09:40", confidence: "B" },
      { name: "供应商邮件记录.eml", type: "邮件", uploadedAt: "2026-05-19 10:12", confidence: "A" },
      { name: "WhatsApp参数确认截图.png", type: "聊天记录", uploadedAt: "2026-05-20 08:55", confidence: "C" },
    ],
    history: [
      { date: "2026-05-20", title: "AI标记参数缺失", source: "AI复核", reviewer: "系统", status: "need_info", risk: "medium", price: "USD 4,800" },
      { date: "2026-05-19", title: "供应商邮件报价录入", source: "邮件报价", reviewer: "商务预算组", status: "confirmed", risk: "medium", price: "USD 4,800" },
      { date: "2026-04-28", title: "历史相似价格匹配", source: "历史库", reviewer: "AI价格助手", status: "confirmed", risk: "low", price: "USD 5,120" },
    ],
    risks: [
      { type: "参数缺失", description: "执行器扭矩与防护等级未确认。", level: "medium", action: "补充参数" },
      { type: "低价异常", description: "低于近 90 天相似均价 18.6%。", level: "medium", action: "人工复核" },
      { type: "有效期临近", description: "报价有效期剩余 7 天。", level: "low", action: "发起询价" },
    ],
  },
];

export function getEquipmentPriceDetail(id: string) {
  return equipmentPriceDetails.find((item) => item.id === id) ?? equipmentPriceDetails[0];
}
