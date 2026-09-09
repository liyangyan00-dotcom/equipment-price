import { importedKanangaSupplierById } from "@/data/mock/importedKanangaSuppliers";
import { supplierManualReviewById } from "@/data/mock/supplierManualReviewQueue";
import {
  supplierVerificationById,
  type SupplierHumanReviewStatus,
} from "@/data/mock/supplierVerificationRegistry";

export type SupplierInquiryAdmissionLevel = "allowed" | "needs_review" | "blocked";

export type SupplierInquiryAdmissionDecision = {
  supplierId: string;
  level: SupplierInquiryAdmissionLevel;
  allowed: boolean;
  blockers: string[];
  warnings: string[];
  checkedAt: string;
};

export function evaluateSupplierInquiryAdmission({
  supplierId,
  reviewStatus,
  duplicateResolved,
  checkedAt = new Date().toISOString(),
}: {
  supplierId: string;
  reviewStatus: SupplierHumanReviewStatus;
  duplicateResolved: boolean;
  checkedAt?: string;
}): SupplierInquiryAdmissionDecision {
  const verification = supplierVerificationById[supplierId];
  const supplier = importedKanangaSupplierById[supplierId];
  const manualReview = supplierManualReviewById[supplierId];

  // Legacy demo suppliers predate the imported governance ledger. Keep them
  // available for existing mock flows, while making the missing ledger visible.
  if (!verification && !supplierId.startsWith("SUP-KNG-")) {
    return {
      supplierId,
      level: "needs_review",
      allowed: true,
      blockers: [],
      warnings: ["历史 Mock 供应商未纳入本次 33 家治理总账，正式发送前仍需人工确认。"],
      checkedAt,
    };
  }

  if (!verification || !supplier) {
    return {
      supplierId,
      level: "blocked",
      allowed: false,
      blockers: ["供应商不在系统主档或统一核验总账中。"],
      warnings: [],
      checkedAt,
    };
  }

  const blockers = [
    verification.legalEntityReviewStatus === "unresolved_channel"
      ? "法律主体尚未识别。"
      : "",
    reviewStatus === "rejected" ? "人工复核已退回。" : "",
    manualReview?.duplicateSourceRows.length && manualReview.duplicateSourceRows.length > 1 && !duplicateResolved
      ? "重复来源记录尚未归并确认。"
      : "",
  ].filter(Boolean);

  const contactAvailable = [supplier.contact, supplier.whatsapp, supplier.email]
    .some((value) => value && value !== "待补全");
  const warnings = [
    reviewStatus === "pending" ? "尚未完成人工复核，仅允许创建草稿任务，正式发送前必须审核通过。" : "",
    verification.conflicts.length > 0
      ? `${verification.conflicts.length} 项字段冲突已由人工复核确认，原值和候选值继续保留。`
      : "",
    verification.missingFields.length > 0
      ? `${verification.missingFields.length} 项资料仍不完整，询价发送前应补齐。`
      : "",
    !contactAvailable ? "缺少可用联系人、WhatsApp 或邮箱，当前只能创建询价草稿。" : "",
    supplier.riskLevel === "high" ? "供应商风险等级较高，询价任务必须保留人工复核节点。" : "",
  ].filter(Boolean);

  return {
    supplierId,
    level: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "needs_review" : "allowed",
    allowed: blockers.length === 0,
    blockers,
    warnings,
    checkedAt,
  };
}
