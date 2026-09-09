import type { ConfidenceLevel, RiskLevel } from "@/types/common";
import { importedKanangaSuppliers } from "./importedKanangaSuppliers";
import {
  p0SupplierDueDiligenceById,
  type SupplierDueDiligence,
} from "./p0SupplierDueDiligence";
import { p0SupplierResearchById, type SupplierWebResearch } from "./p0SupplierResearch";
import { p1SupplierDueDiligenceById } from "./p1SupplierDueDiligence";
import { p1SupplierResearchById } from "./p1SupplierResearch";
import { p2SupplierDueDiligenceById } from "./p2SupplierDueDiligence";
import { p2SupplierResearchById } from "./p2SupplierResearch";
import {
  supplierVerificationById,
  type SupplierVerificationRecord,
} from "./supplierVerificationRegistry";

export type SupplierRecord = Record<string, unknown> & {
  id: string;
  supplierCode: string;
  supplierName: string;
  countryCode: string;
  countryRegion: string;
  category: string;
  mainScope: string;
  contact: string;
  whatsapp: string;
  email: string;
  quoteCount: number;
  lastQuoteAt: string;
  responseSpeed: "快" | "较快" | "一般" | "较慢";
  technicalCapability: number;
  deliveryRisk: RiskLevel;
  overallScore: number;
  confidence: ConfidenceLevel;
  aiEvaluation: string;
  riskLevel: RiskLevel;
  status: "活跃" | "待复核" | "暂停";
  englishName?: string;
  phone?: string;
  website?: string;
  dataCompleteness?: number;
  importBatch?: string;
  sourceFile?: string;
  sourceSheet?: string;
  sourceRows?: number[];
  bidPackages?: string[];
  equipmentLists?: string[];
  procurementStrategies?: string[];
  strengths?: string[];
  introductions?: string[];
  mainProducts?: string[];
  addresses?: string[];
  contactDetails?: string;
  notes?: string[];
  webResearch?: SupplierWebResearch;
  dueDiligence?: SupplierDueDiligence;
  verification?: SupplierVerificationRecord;
};

export const supplierRecords: SupplierRecord[] = importedKanangaSuppliers.map((supplier) => {
  const research =
    p0SupplierResearchById[supplier.id] ??
    p1SupplierResearchById[supplier.id] ??
    p2SupplierResearchById[supplier.id];
  const dueDiligence =
    p0SupplierDueDiligenceById[supplier.id] ??
    p1SupplierDueDiligenceById[supplier.id] ??
    p2SupplierDueDiligenceById[supplier.id];
  const verificationBatch = p0SupplierResearchById[supplier.id]
    ? "P0"
    : p1SupplierResearchById[supplier.id]
      ? "P1"
      : p2SupplierResearchById[supplier.id]
        ? "P2"
        : "";
  const officialPhone = research?.officialPhone;
  const officialEmail = research?.officialEmail;
  const officialWebsite = research?.officialWebsite;

  return {
    ...supplier,
    phone: officialPhone && !officialPhone.startsWith("待") ? officialPhone : supplier.phone,
    email: officialEmail && !officialEmail.startsWith("待") ? officialEmail : supplier.email,
    website: officialWebsite && !officialWebsite.startsWith("待") ? officialWebsite : supplier.website,
    aiEvaluation: research
      ? research.verificationStatus === "verified_official"
        ? `已完成 ${verificationBatch} 联网核验（${research.sourceConfidence}级），正式询价前仍需人工确认项目参数与商务条件。`
        : `已完成 ${verificationBatch} 初步检索（${research.sourceConfidence}级），官方主体或联系方式仍需人工补充核验。`
      : supplier.aiEvaluation,
    webResearch: research,
    dueDiligence,
    verification: supplierVerificationById[supplier.id],
  };
});

const pendingCompletionCount = supplierRecords.filter((record) =>
  Boolean(record.verification?.missingFields.length),
).length;
const highScoreCount = supplierRecords.filter((record) => record.overallScore >= 80).length;
const highRiskCount = supplierRecords.filter((record) => record.riskLevel === "high" || record.deliveryRisk === "high").length;
const researchedCount = supplierRecords.filter((record) => Boolean(record.webResearch)).length;

export const supplierKpis = [
  { label: "供应商总数", value: String(supplierRecords.length), unit: "家", trend: "本次导入 +33", description: "卡南加项目供应商池" },
  { label: "AI推荐供应商", value: String(researchedCount), unit: "家", trend: "P0/P1/P2 已覆盖", description: "已完成联网研究整理" },
  { label: "待补全资料", value: String(pendingCompletionCount), unit: "家", trend: "进入人工审核", description: "存在缺失或待核验字段" },
  { label: "高评分供应商", value: String(highScoreCount), unit: "家", trend: "评分 ≥80", description: "建议优先核验" },
  { label: "高风险供应商", value: String(highRiskCount), unit: "家", trend: "风险等级高", description: "需谨慎使用" },
  { label: "新增供应商", value: String(supplierRecords.length), unit: "家", trend: "Excel 导入", description: "营销阶段采购建议" },
];
