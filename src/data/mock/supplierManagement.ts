import { importedKanangaSuppliers } from "./importedKanangaSuppliers";
import { p0SupplierDueDiligenceById } from "./p0SupplierDueDiligence";
import { p0SupplierResearchById } from "./p0SupplierResearch";
import { p1SupplierDueDiligenceById } from "./p1SupplierDueDiligence";
import { p1SupplierResearchById } from "./p1SupplierResearch";
import { p2SupplierDueDiligenceById } from "./p2SupplierDueDiligence";
import { p2SupplierResearchById } from "./p2SupplierResearch";
import {
  p0SupplierVerificationById,
  type P0VerificationStatus,
} from "./p0SupplierVerificationReport";
import { p1SupplierVerificationById } from "./p1SupplierVerificationReport";
import { p2SupplierVerificationById } from "./p2SupplierVerificationReport";
import {
  supplierManualReviewById,
  type SupplierReviewPriority,
} from "./supplierManualReviewQueue";
import {
  supplierVerificationById,
  type LegalEntityReviewStatus,
  type SupplierVerificationBatch,
} from "./supplierVerificationRegistry";

export type SupplierGovernanceRow = {
  id: string;
  supplierCode: string;
  supplierName: string;
  completeness: number;
  missingFields: string[];
  duplicateRisk: "high" | "medium" | "low";
  contactStatus: "complete" | "missing" | "invalid";
  whatsappStatus: "complete" | "missing" | "invalid";
  emailStatus: "complete" | "missing" | "invalid";
  scopeStatus: "complete" | "missing" | "pending";
  importBatch: string;
  reviewStatus: "pending" | "need_info" | "confirmed" | "rejected";
  aiSuggestion: string;
  supplierId?: string;
  verificationBatch?: SupplierVerificationBatch;
  conflictCount?: number;
  verificationConfidence?: number;
  candidateLegalEntity?: string;
  legalEntityReviewStatus?: LegalEntityReviewStatus;
  businessVerificationStatus?: P0VerificationStatus;
  contactVerificationStatus?: P0VerificationStatus;
  qualificationVerificationStatus?: P0VerificationStatus;
  riskVerificationStatus?: P0VerificationStatus;
  domainVerificationReviewedAt?: string;
  reviewPriority?: SupplierReviewPriority;
  duplicateSourceRows?: number[];
  reviewBlockers?: string[];
  reviewRecommendation?: string;
  legalEntityBlocked?: boolean;
};

export const supplierGovernanceKpis = [
  { label: "待补全资料", value: String(importedKanangaSuppliers.filter((item) => item.contact === "待补全" || item.email === "待补全").length), unit: "家", trend: "卡南加项目导入", description: "联系人或直联方式缺失", tone: "orange" as const },
  { label: "待审核供应商", value: String(importedKanangaSuppliers.filter((item) => item.status === "待复核").length), unit: "家", trend: `本次导入 +${importedKanangaSuppliers.length}`, description: "Excel 导入后等待人工确认", tone: "blue" as const },
  { label: "重复记录", value: String(importedKanangaSuppliers.filter((item) => item.sourceRows.length > 1).length), unit: "组", trend: "跨包推荐待核验", description: "同一厂家关联多个招标包", tone: "red" as const },
  { label: "联系方式缺失", value: String(importedKanangaSuppliers.filter((item) => item.contact === "待补全" || item.whatsapp === "待补全" || item.email === "待补全").length), unit: "家", trend: "进入补全队列", description: "影响正式询价触达", tone: "orange" as const },
  { label: "AI已整理", value: String(importedKanangaSuppliers.length), unit: "条", trend: "P0/P1/P2 已整理", description: "字段已整理并等待复核", tone: "purple" as const },
  { label: "异常供应商", value: String(importedKanangaSuppliers.filter((item) => item.riskLevel === "high").length), unit: "家", trend: "高风险待复核", description: "不得直接进入询价", tone: "red" as const },
];

const importedKanangaGovernanceRows: SupplierGovernanceRow[] = importedKanangaSuppliers.map((supplier) => {
  const research =
    p0SupplierResearchById[supplier.id] ??
    p1SupplierResearchById[supplier.id] ??
    p2SupplierResearchById[supplier.id];
  const dueDiligence =
    p0SupplierDueDiligenceById[supplier.id] ??
    p1SupplierDueDiligenceById[supplier.id] ??
    p2SupplierDueDiligenceById[supplier.id];
  const verification = supplierVerificationById[supplier.id];
  const domainVerification =
    p0SupplierVerificationById[supplier.id] ??
    p1SupplierVerificationById[supplier.id] ??
    p2SupplierVerificationById[supplier.id];
  const manualReview = supplierManualReviewById[supplier.id];
  const verifiedEmail = Boolean(research?.officialEmail && !research.officialEmail.startsWith("待"));
  const confirmedBusinessFields = dueDiligence
    ? [
        dueDiligence.unifiedSocialCreditCode,
        dueDiligence.legalRepresentative,
        dueDiligence.registeredCapital,
      ].filter((field) => field.status === "confirmed").length
    : 0;
  const missingFields = [
    supplier.contact === "待补全" ? "联系人" : "",
    supplier.whatsapp === "待补全" ? "WhatsApp" : "",
    supplier.email === "待补全" && !verifiedEmail ? "邮箱" : "",
    supplier.mainScope === "待分类" ? "主营范围" : "",
    research?.verificationStatus === "needs_manual" ? "官方主体核验" : "",
    dueDiligence?.unifiedSocialCreditCode.status !== "confirmed" ? "统一社会信用代码" : "",
    dueDiligence?.legalRepresentative.status !== "confirmed" ? "法定代表人" : "",
    dueDiligence?.registeredCapital.status !== "confirmed" ? "注册资本" : "",
    dueDiligence?.judicialRisk.status === "manual_required" ? "司法风险核验" : "",
  ].filter(Boolean);

  return {
    id: `GOV-${supplier.id}`,
    supplierId: supplier.id,
    supplierCode: supplier.supplierCode,
    supplierName: supplier.supplierName,
    completeness: verification?.dataCompleteness ?? Math.min(
      100,
      supplier.dataCompleteness
        + (research?.verificationStatus === "verified_official" ? 5 : research ? 2 : 0)
        + confirmedBusinessFields * 2,
    ),
    missingFields: verification?.missingFields ?? missingFields,
    duplicateRisk: supplier.sourceRows.length > 1 ? "medium" : "low",
    contactStatus: supplier.contact === "待补全" ? "missing" : "complete",
    whatsappStatus: supplier.whatsapp === "待补全" ? "missing" : "complete",
    emailStatus: supplier.email === "待补全" && !verifiedEmail ? "missing" : "complete",
    scopeStatus: supplier.mainScope === "待分类" ? "missing" : "complete",
    importBatch: supplier.importBatch,
    reviewStatus: "pending",
    verificationBatch: verification?.batch,
    conflictCount: verification?.conflicts.length ?? 0,
    verificationConfidence: verification?.verificationConfidence,
    candidateLegalEntity: verification?.candidateLegalEntity,
    legalEntityReviewStatus: verification?.legalEntityReviewStatus,
    businessVerificationStatus: domainVerification?.businessStatus,
    contactVerificationStatus: domainVerification?.contactStatus,
    qualificationVerificationStatus: domainVerification?.qualificationStatus,
    riskVerificationStatus: domainVerification?.riskStatus,
    domainVerificationReviewedAt: domainVerification?.reviewedAt,
    reviewPriority: manualReview?.priority,
    duplicateSourceRows: manualReview?.duplicateSourceRows,
    reviewBlockers: manualReview?.blockers,
    reviewRecommendation: manualReview?.recommendedAction,
    legalEntityBlocked: manualReview?.legalEntityBlocked,
    aiSuggestion: research
      ? dueDiligence?.judicialRisk.status === "manual_required"
        ? `已补工商与证书线索，司法风险仍需官方平台人工核验`
        : research.verificationStatus === "verified_official"
          ? `已完成 ${research.sourceConfidence} 级联网核验，建议人工确认项目参数后入库`
          : `联网检索仅达到 ${research.sourceConfidence} 级，需继续核验法律主体和联系方式`
      : supplier.aiEvaluation,
  };
});

export const supplierGovernanceRows: SupplierGovernanceRow[] = importedKanangaGovernanceRows;

export const supplierCompletionSuggestions = [
  { label: "缺失联系人", value: supplierGovernanceRows.filter((item) => item.contactStatus !== "complete").length, action: "AI从报价单提取联系人" },
  { label: "缺失 WhatsApp", value: supplierGovernanceRows.filter((item) => item.whatsappStatus !== "complete").length, action: "从历史邮件签名补全" },
  { label: "缺失邮箱", value: supplierGovernanceRows.filter((item) => item.emailStatus !== "complete").length, action: "匹配官网公开邮箱" },
  { label: "主营范围待分类", value: supplierGovernanceRows.filter((item) => item.scopeStatus !== "complete").length, action: "AI生成供应商标签" },
];

export const duplicateSupplierGroups = importedKanangaSuppliers
  .filter((item) => item.sourceRows.length > 1)
  .slice(0, 3)
  .map((item) => ({
    label: item.supplierName,
    value: item.sourceRows.length,
    action: "核验跨包推荐",
  }));

export const missingDataItems = [
  { label: "证照或工商字段缺失", value: supplierGovernanceRows.filter((item) => item.missingFields.some((field) => ["统一社会信用代码", "法定代表人", "注册资本"].includes(field))).length, action: "批量催补" },
  { label: "联系人缺失", value: supplierGovernanceRows.filter((item) => item.contactStatus !== "complete").length, action: "AI提取" },
  { label: "主营范围未分类", value: supplierGovernanceRows.filter((item) => item.scopeStatus !== "complete").length, action: "生成标签" },
];

export const importLogs = [
  {
    label: importedKanangaSuppliers[0]?.importBatch ?? "IMP-KNG-20260723",
    value: importedKanangaSuppliers.length,
    action: `${supplierGovernanceRows.filter((item) => item.reviewStatus === "pending").length} 条待审核`,
  },
];
