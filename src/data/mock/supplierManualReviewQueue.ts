import { importedKanangaSuppliers } from "./importedKanangaSuppliers";
import { p0SupplierVerificationById } from "./p0SupplierVerificationReport";
import { p1SupplierVerificationById } from "./p1SupplierVerificationReport";
import { p2SupplierVerificationById } from "./p2SupplierVerificationReport";
import {
  supplierVerificationRecords,
  type SupplierVerificationBatch,
} from "./supplierVerificationRegistry";

export type SupplierReviewPriority = "critical" | "high" | "medium" | "low";
export type SupplierDuplicateResolution = "not_duplicate" | "consolidated_pending_review";

export type SupplierManualReviewItem = {
  supplierId: string;
  supplierName: string;
  batch: SupplierVerificationBatch;
  priority: SupplierReviewPriority;
  conflictCount: number;
  missingFieldCount: number;
  duplicateSourceRows: number[];
  duplicateResolution: SupplierDuplicateResolution;
  legalEntityBlocked: boolean;
  inquiryBlocked: true;
  blockers: string[];
  recommendedAction: string;
};

function getDomainVerification(supplierId: string) {
  return (
    p0SupplierVerificationById[supplierId] ??
    p1SupplierVerificationById[supplierId] ??
    p2SupplierVerificationById[supplierId]
  );
}

function getPriority({
  legalEntityBlocked,
  conflictCount,
  missingFieldCount,
  duplicateCount,
}: {
  legalEntityBlocked: boolean;
  conflictCount: number;
  missingFieldCount: number;
  duplicateCount: number;
}): SupplierReviewPriority {
  if (legalEntityBlocked) return "critical";
  if (conflictCount >= 3 || missingFieldCount >= 7) return "high";
  if (conflictCount > 0 || missingFieldCount > 0 || duplicateCount > 1) return "medium";
  return "low";
}

export const supplierManualReviewQueue: SupplierManualReviewItem[] = supplierVerificationRecords.map(
  (verification) => {
    const supplier = importedKanangaSuppliers.find((item) => item.id === verification.supplierId);
    const domainVerification = getDomainVerification(verification.supplierId);
    const duplicateSourceRows = supplier?.sourceRows ?? [];
    const legalEntityBlocked = verification.legalEntityReviewStatus === "unresolved_channel";
    const blockers = [
      legalEntityBlocked ? "法律主体未识别" : "",
      verification.conflicts.length > 0 ? `${verification.conflicts.length} 项字段冲突` : "",
      verification.missingFields.length > 0 ? `${verification.missingFields.length} 项资料缺失` : "",
      duplicateSourceRows.length > 1 ? `${duplicateSourceRows.length} 个来源行待归并确认` : "",
      domainVerification?.riskStatus === "manual_required" ? "司法与信用风险待人工查询" : "",
    ].filter(Boolean);
    const priority = getPriority({
      legalEntityBlocked,
      conflictCount: verification.conflicts.length,
      missingFieldCount: verification.missingFields.length,
      duplicateCount: duplicateSourceRows.length,
    });

    return {
      supplierId: verification.supplierId,
      supplierName: supplier?.supplierName ?? verification.originalName,
      batch: verification.batch,
      priority,
      conflictCount: verification.conflicts.length,
      missingFieldCount: verification.missingFields.length,
      duplicateSourceRows,
      duplicateResolution:
        duplicateSourceRows.length > 1 ? "consolidated_pending_review" : "not_duplicate",
      legalEntityBlocked,
      inquiryBlocked: true,
      blockers,
      recommendedAction: legalEntityBlocked
        ? "先识别法律主体并补齐本地供应商实名资料"
        : duplicateSourceRows.length > 1
          ? "确认主档后归并来源行，保留原始 Excel 行号"
          : verification.conflicts.length > 0
            ? "逐项确认原值与候选值，并上传公开证据"
            : "补齐缺失字段后完成人工准入判断",
    };
  },
);

export const supplierManualReviewById = Object.fromEntries(
  supplierManualReviewQueue.map((item) => [item.supplierId, item]),
) as Record<string, SupplierManualReviewItem>;

export const supplierManualReviewSummary = {
  total: supplierManualReviewQueue.length,
  conflictSuppliers: supplierManualReviewQueue.filter((item) => item.conflictCount > 0).length,
  conflictFields: supplierManualReviewQueue.reduce((sum, item) => sum + item.conflictCount, 0),
  duplicateGroups: supplierManualReviewQueue.filter(
    (item) => item.duplicateResolution === "consolidated_pending_review",
  ).length,
  blocked: supplierManualReviewQueue.filter((item) => item.legalEntityBlocked).length,
  critical: supplierManualReviewQueue.filter((item) => item.priority === "critical").length,
  high: supplierManualReviewQueue.filter((item) => item.priority === "high").length,
  medium: supplierManualReviewQueue.filter((item) => item.priority === "medium").length,
  low: supplierManualReviewQueue.filter((item) => item.priority === "low").length,
};
