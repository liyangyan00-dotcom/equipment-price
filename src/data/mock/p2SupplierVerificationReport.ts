import { importedKanangaSuppliers } from "./importedKanangaSuppliers";
import type {
  P0SupplierVerificationItem,
  P0VerificationStatus,
} from "./p0SupplierVerificationReport";
import { p2SupplierDueDiligenceById } from "./p2SupplierDueDiligence";
import { p2SupplierResearch } from "./p2SupplierResearch";
import { supplierVerificationById } from "./supplierVerificationRegistry";

export type P2SupplierVerificationItem = P0SupplierVerificationItem;
export type P2VerificationStatus = P0VerificationStatus;

function getBusinessStatus(statuses: string[]): P2VerificationStatus {
  if (statuses.every((status) => status === "confirmed")) return "verified";
  if (statuses.some((status) => status === "confirmed" || status === "lead_only" || status === "needs_review")) {
    return "partial";
  }
  return "manual_required";
}

function getContactStatus(status: string): P2VerificationStatus {
  if (status === "verified_official") return "verified";
  if (status === "partially_verified") return "partial";
  return "manual_required";
}

function getQualificationStatus(
  certificates: Array<{ status: "valid" | "historical" | "expired" | "needs_review" }>,
): P2VerificationStatus {
  if (certificates.length === 0) return "missing";
  if (certificates.every((certificate) => certificate.status === "valid")) return "verified";
  return "partial";
}

function getRiskStatus(status: string): P2VerificationStatus {
  if (status === "risk_found") return "risk_found";
  if (status === "checked_no_public_hit") return "verified";
  return "manual_required";
}

export const p2SupplierVerificationReport: P2SupplierVerificationItem[] = p2SupplierResearch.map(
  (research) => {
    const supplier = importedKanangaSuppliers.find((item) => item.id === research.supplierId);
    const dueDiligence = p2SupplierDueDiligenceById[research.supplierId];
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
        ? "确认品牌、贸易公司、制造公司或本地采购渠道中的实际签约主体"
        : "",
      businessStatus !== "verified"
        ? "复核统一社会信用代码、法定代表人、注册资本和当前经营状态"
        : "",
      contactStatus !== "verified"
        ? "使用企业官网、官方服务热线或项目部本地供应商名册交叉确认联系方式"
        : "",
      qualificationStatus !== "verified"
        ? "按具体型号索取计量校准、质量体系、放射源、压力设备或目的国准入文件"
        : "",
      riskStatus !== "verified"
        ? "使用企业全称和统一社会信用代码完成司法、执行与信用平台人工查询"
        : "",
      "人工确认仪器耗材、校准服务、备件供应、安装调试和海外售后能力",
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

export const p2SupplierVerificationById = Object.fromEntries(
  p2SupplierVerificationReport.map((item) => [item.supplierId, item]),
) as Record<string, P2SupplierVerificationItem>;

function countStatus(
  field: keyof Pick<
    P2SupplierVerificationItem,
    "businessStatus" | "contactStatus" | "qualificationStatus" | "riskStatus"
  >,
) {
  return p2SupplierVerificationReport.reduce<Record<P2VerificationStatus, number>>(
    (summary, item) => {
      summary[item[field]] += 1;
      return summary;
    },
    { verified: 0, partial: 0, missing: 0, manual_required: 0, risk_found: 0 },
  );
}

export const p2SupplierVerificationSummary = {
  total: p2SupplierVerificationReport.length,
  business: countStatus("businessStatus"),
  contact: countStatus("contactStatus"),
  qualification: countStatus("qualificationStatus"),
  risk: countStatus("riskStatus"),
  readyForHumanReview: p2SupplierVerificationReport.filter(
    (item) => item.businessStatus === "verified" && item.contactStatus === "verified",
  ).length,
  inquiryEligible: 0,
};
