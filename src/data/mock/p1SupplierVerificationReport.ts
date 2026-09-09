import { importedKanangaSuppliers } from "./importedKanangaSuppliers";
import { p1SupplierDueDiligenceById } from "./p1SupplierDueDiligence";
import { p1SupplierResearch } from "./p1SupplierResearch";
import type {
  P0SupplierVerificationItem,
  P0VerificationStatus,
} from "./p0SupplierVerificationReport";
import { supplierVerificationById } from "./supplierVerificationRegistry";

export type P1SupplierVerificationItem = P0SupplierVerificationItem;
export type P1VerificationStatus = P0VerificationStatus;

function getBusinessStatus(statuses: string[]): P1VerificationStatus {
  if (statuses.every((status) => status === "confirmed")) return "verified";
  if (statuses.some((status) => status === "confirmed" || status === "lead_only" || status === "needs_review")) {
    return "partial";
  }
  return "manual_required";
}

function getContactStatus(status: string): P1VerificationStatus {
  if (status === "verified_official") return "verified";
  if (status === "partially_verified") return "partial";
  return "manual_required";
}

function getQualificationStatus(
  certificates: Array<{ status: "valid" | "historical" | "expired" | "needs_review" }>,
): P1VerificationStatus {
  if (certificates.length === 0) return "missing";
  if (certificates.every((certificate) => certificate.status === "valid")) return "verified";
  return "partial";
}

function getRiskStatus(status: string): P1VerificationStatus {
  if (status === "risk_found") return "risk_found";
  if (status === "checked_no_public_hit") return "verified";
  return "manual_required";
}

export const p1SupplierVerificationReport: P1SupplierVerificationItem[] = p1SupplierResearch.map(
  (research) => {
    const supplier = importedKanangaSuppliers.find((item) => item.id === research.supplierId);
    const dueDiligence = p1SupplierDueDiligenceById[research.supplierId];
    const verification = supplierVerificationById[research.supplierId];
    const businessStatus = getBusinessStatus([
      dueDiligence.unifiedSocialCreditCode.status,
      dueDiligence.legalRepresentative.status,
      dueDiligence.registeredCapital.status,
    ]);
    const contactStatus = getContactStatus(research.verificationStatus);
    const qualificationStatus = getQualificationStatus(dueDiligence.certificates);
    const riskStatus = getRiskStatus(dueDiligence.judicialRisk.status);
    const nextActions = [
      verification.legalEntityReviewStatus !== "confirmed_with_public_evidence"
        ? "确认品牌记录对应的中国签约法人和合同抬头"
        : "",
      businessStatus !== "verified"
        ? "在国家企业信用信息公示系统复核统一社会信用代码、法定代表人与注册资本"
        : "",
      contactStatus !== "verified" ? "使用中国官网、官方服务热线和销售入口交叉确认联系方式" : "",
      qualificationStatus !== "verified"
        ? "按 PLC、DCS、变频器、配电、网络或发电机组具体型号索取证书与授权文件"
        : "",
      riskStatus !== "verified"
        ? "使用企业全称和统一社会信用代码完成司法、执行与信用平台人工查询"
        : "",
      "人工确认海外供货主体、渠道授权、售后承诺和目的国准入要求",
    ].filter(Boolean);

    return {
      supplierId: research.supplierId,
      supplierName: supplier?.supplierName ?? verification.originalName,
      candidateLegalEntity: verification.candidateLegalEntity,
      reviewedAt: "2026-07-24",
      businessStatus,
      contactStatus,
      qualificationStatus,
      riskStatus,
      sourceCount: verification.sourceLinks.length,
      conflictCount: verification.conflicts.length,
      missingFields: verification.missingFields,
      nextActions,
      humanReviewStatus: "pending",
      inquiryEligible: false,
    };
  },
);

export const p1SupplierVerificationById = Object.fromEntries(
  p1SupplierVerificationReport.map((item) => [item.supplierId, item]),
) as Record<string, P1SupplierVerificationItem>;

function countStatus(
  field: keyof Pick<
    P1SupplierVerificationItem,
    "businessStatus" | "contactStatus" | "qualificationStatus" | "riskStatus"
  >,
) {
  return p1SupplierVerificationReport.reduce<Record<P1VerificationStatus, number>>(
    (summary, item) => {
      summary[item[field]] += 1;
      return summary;
    },
    { verified: 0, partial: 0, missing: 0, manual_required: 0, risk_found: 0 },
  );
}

export const p1SupplierVerificationSummary = {
  total: p1SupplierVerificationReport.length,
  business: countStatus("businessStatus"),
  contact: countStatus("contactStatus"),
  qualification: countStatus("qualificationStatus"),
  risk: countStatus("riskStatus"),
  readyForHumanReview: p1SupplierVerificationReport.filter(
    (item) => item.businessStatus === "verified" && item.contactStatus === "verified",
  ).length,
  inquiryEligible: 0,
};
