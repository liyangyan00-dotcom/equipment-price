import { importedKanangaSuppliers } from "./importedKanangaSuppliers";
import { p0SupplierDueDiligenceById } from "./p0SupplierDueDiligence";
import { p0SupplierResearch } from "./p0SupplierResearch";
import { supplierVerificationById } from "./supplierVerificationRegistry";

export type P0VerificationStatus =
  | "verified"
  | "partial"
  | "missing"
  | "manual_required"
  | "risk_found";

export type P0SupplierVerificationItem = {
  supplierId: string;
  supplierName: string;
  candidateLegalEntity: string;
  reviewedAt: string;
  businessStatus: P0VerificationStatus;
  contactStatus: P0VerificationStatus;
  qualificationStatus: P0VerificationStatus;
  riskStatus: P0VerificationStatus;
  sourceCount: number;
  conflictCount: number;
  missingFields: string[];
  nextActions: string[];
  humanReviewStatus: "pending";
  inquiryEligible: false;
};

function getBusinessStatus(statuses: string[]): P0VerificationStatus {
  if (statuses.every((status) => status === "confirmed")) return "verified";
  if (statuses.some((status) => status === "confirmed" || status === "lead_only" || status === "needs_review")) {
    return "partial";
  }
  return "manual_required";
}

function getContactStatus(status: string): P0VerificationStatus {
  if (status === "verified_official") return "verified";
  if (status === "partially_verified") return "partial";
  return "manual_required";
}

function getQualificationStatus(
  certificates: Array<{ status: "valid" | "historical" | "expired" | "needs_review" }>,
): P0VerificationStatus {
  if (certificates.length === 0) return "missing";
  if (certificates.every((certificate) => certificate.status === "valid")) return "verified";
  return "partial";
}

function getRiskStatus(status: string): P0VerificationStatus {
  if (status === "risk_found") return "risk_found";
  if (status === "checked_no_public_hit") return "verified";
  return "manual_required";
}

export const p0SupplierVerificationReport: P0SupplierVerificationItem[] = p0SupplierResearch.map(
  (research) => {
    const supplier = importedKanangaSuppliers.find((item) => item.id === research.supplierId);
    const dueDiligence = p0SupplierDueDiligenceById[research.supplierId];
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
      businessStatus !== "verified"
        ? "在国家企业信用信息公示系统核对主体、经营状态和统一社会信用代码"
        : "",
      contactStatus !== "verified" ? "使用企业官网和官方电话交叉确认直联方式" : "",
      qualificationStatus !== "verified"
        ? "补齐证书编号、发证机构和有效期，并在认监委平台复核"
        : "",
      riskStatus !== "verified"
        ? "使用企业全称和统一社会信用代码完成司法与信用平台人工查询"
        : "",
      "人工确认产品范围、项目适配性和商务准入结论",
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

export const p0SupplierVerificationById = Object.fromEntries(
  p0SupplierVerificationReport.map((item) => [item.supplierId, item]),
) as Record<string, P0SupplierVerificationItem>;

function countStatus(
  field: keyof Pick<
    P0SupplierVerificationItem,
    "businessStatus" | "contactStatus" | "qualificationStatus" | "riskStatus"
  >,
) {
  return p0SupplierVerificationReport.reduce<Record<P0VerificationStatus, number>>(
    (summary, item) => {
      summary[item[field]] += 1;
      return summary;
    },
    { verified: 0, partial: 0, missing: 0, manual_required: 0, risk_found: 0 },
  );
}

export const p0SupplierVerificationSummary = {
  total: p0SupplierVerificationReport.length,
  business: countStatus("businessStatus"),
  contact: countStatus("contactStatus"),
  qualification: countStatus("qualificationStatus"),
  risk: countStatus("riskStatus"),
  readyForHumanReview: p0SupplierVerificationReport.filter(
    (item) => item.businessStatus === "verified" && item.contactStatus === "verified",
  ).length,
  inquiryEligible: 0,
};
