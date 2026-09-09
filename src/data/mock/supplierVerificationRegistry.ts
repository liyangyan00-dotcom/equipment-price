import { importedKanangaSuppliers } from "./importedKanangaSuppliers";
import { p0SupplierDueDiligenceById } from "./p0SupplierDueDiligence";
import { p0SupplierResearchById } from "./p0SupplierResearch";
import { p1SupplierDueDiligenceById } from "./p1SupplierDueDiligence";
import { p1SupplierResearchById } from "./p1SupplierResearch";
import { p2SupplierDueDiligenceById } from "./p2SupplierDueDiligence";
import { p2SupplierResearchById } from "./p2SupplierResearch";

export type SupplierVerificationBatch = "P0" | "P1" | "P2";
export type LegalEntityResolution = "exact" | "candidate" | "channel";
export type LegalEntityReviewStatus =
  | "confirmed_with_public_evidence"
  | "exact_name_pending_registry"
  | "candidate_pending_registry"
  | "unresolved_channel";
export type SupplierHumanReviewStatus = "pending" | "approved" | "rejected";
export type SupplierCrossCheckStatus = "verified" | "partial" | "conflict" | "missing" | "manual_required";

export type SupplierVerificationConflict = {
  field: string;
  originalValue: string;
  candidateValue: string;
  reason: string;
};

export type SupplierVerificationRecord = {
  supplierId: string;
  batch: SupplierVerificationBatch;
  originalName: string;
  candidateLegalEntity: string;
  legalEntityResolution: LegalEntityResolution;
  legalEntityReviewStatus: LegalEntityReviewStatus;
  legalEntityResolutionNote: string;
  queriedAt: string;
  sourceLinks: { title: string; url: string; kind: string; level: string }[];
  crossChecks: {
    phone: SupplierCrossCheckStatus;
    email: SupplierCrossCheckStatus;
    website: SupplierCrossCheckStatus;
    certificate: SupplierCrossCheckStatus;
    operatingStatus: SupplierCrossCheckStatus;
  };
  conflicts: SupplierVerificationConflict[];
  missingFields: string[];
  verificationConfidence: number;
  dataCompleteness: number;
  humanReviewStatus: SupplierHumanReviewStatus;
  inquiryEligible: boolean;
  aiDecisionNote: string;
};

const P0_IDS = new Set(Object.keys(p0SupplierResearchById));
const P1_IDS = new Set(Object.keys(p1SupplierResearchById));

const legalEntityCandidates: Record<string, string> = {
  "SUP-KNG-001": "上海凯士比泵有限公司",
  "SUP-KNG-006": "赛默飞世尔科技（中国）有限公司",
  "SUP-KNG-011": "英格索兰（中国）投资有限公司",
  "SUP-KNG-012": "广州市千叶水设备有限公司",
  "SUP-KNG-015": "卡南加项目当地采购渠道（尚未识别法律主体）",
  "SUP-KNG-017": "霍尼韦尔（中国）有限公司",
  "SUP-KNG-019": "南方中金环境股份有限公司（原南方泵业股份有限公司）",
  "SUP-KNG-022": "西门子（中国）有限公司",
  "SUP-KNG-031": "康明斯（中国）投资有限公司",
  "SUP-KNG-033": "安捷伦科技（中国）有限公司",
};

function hasKnownValue(value?: string) {
  if (!value) return false;
  return !["待补全", "待确认", "待官网表单确认", "待人工核验", "不适用"].some((token) => value.includes(token));
}

function normalizeComparable(value: string) {
  return value.replace(/[（）()·\s]/g, "").replace(/KSB|SIEMENS|Honeywell/gi, "").toLowerCase();
}

function fieldStatus(originalValue: string, candidateValue: string): SupplierCrossCheckStatus {
  const originalKnown = hasKnownValue(originalValue);
  const candidateKnown = hasKnownValue(candidateValue);
  if (!originalKnown && !candidateKnown) return "missing";
  if (!originalKnown || !candidateKnown) return "partial";
  return normalizeComparable(originalValue) === normalizeComparable(candidateValue) ? "verified" : "conflict";
}

function getResearch(id: string) {
  return p0SupplierResearchById[id] ?? p1SupplierResearchById[id] ?? p2SupplierResearchById[id];
}

function getDueDiligence(id: string) {
  return p0SupplierDueDiligenceById[id] ?? p1SupplierDueDiligenceById[id] ?? p2SupplierDueDiligenceById[id];
}

function getBatch(id: string): SupplierVerificationBatch {
  if (P0_IDS.has(id)) return "P0";
  if (P1_IDS.has(id)) return "P1";
  return "P2";
}

export const supplierVerificationRecords: SupplierVerificationRecord[] = importedKanangaSuppliers.map((supplier) => {
  const research = getResearch(supplier.id);
  const dueDiligence = getDueDiligence(supplier.id);
  const batch = getBatch(supplier.id);
  const candidateLegalEntity = legalEntityCandidates[supplier.id] ?? supplier.supplierName;
  const legalEntityResolution: LegalEntityResolution =
    supplier.id === "SUP-KNG-015"
      ? "channel"
      : normalizeComparable(candidateLegalEntity) === normalizeComparable(supplier.supplierName)
        ? "exact"
        : "candidate";
  const legalEntityReviewStatus: LegalEntityReviewStatus =
    legalEntityResolution === "channel"
      ? "unresolved_channel"
      : dueDiligence?.unifiedSocialCreditCode.status === "confirmed"
        ? "confirmed_with_public_evidence"
        : legalEntityResolution === "exact"
          ? "exact_name_pending_registry"
          : "candidate_pending_registry";
  const legalEntityResolutionNote =
    legalEntityReviewStatus === "confirmed_with_public_evidence"
      ? "已取得公开来源中的统一社会信用代码线索，仍需在国家企业信用信息公示系统进行最终人工复核。"
      : legalEntityReviewStatus === "exact_name_pending_registry"
        ? "Excel 名称与当前候选法律主体一致，但尚缺统一社会信用代码或政府登记页复核。"
        : legalEntityReviewStatus === "candidate_pending_registry"
          ? "Excel 使用品牌、简称或历史名称，已给出候选中国法律主体，等待人工确认。"
          : "Excel 记录为采购渠道描述，尚未识别可签约法律主体。";

  const phoneStatus = fieldStatus(supplier.phone, research?.officialPhone ?? "");
  const emailStatus = fieldStatus(supplier.email, research?.officialEmail ?? "");
  const websiteStatus = fieldStatus(supplier.website, research?.officialWebsite ?? "");
  const certificateStatus: SupplierCrossCheckStatus =
    !dueDiligence || dueDiligence.certificates.length === 0
      ? "missing"
      : dueDiligence.certificates.every((item) => item.status === "valid")
        ? "verified"
        : "manual_required";

  const conflicts: SupplierVerificationConflict[] = [];
  if (legalEntityResolution !== "exact") {
    conflicts.push({
      field: "中国法律主体",
      originalValue: supplier.supplierName,
      candidateValue: candidateLegalEntity,
      reason:
        legalEntityResolution === "channel"
          ? "Excel 记录为采购渠道描述，不是可直接签约的法律主体。"
          : "Excel 使用品牌、简称或历史名称，候选主体需在国家企业信用信息公示系统人工确认。",
    });
  }

  const contactCandidates = [
    ["电话", supplier.phone, research?.officialPhone ?? "", phoneStatus],
    ["邮箱", supplier.email, research?.officialEmail ?? "", emailStatus],
    ["官网", supplier.website, research?.officialWebsite ?? "", websiteStatus],
  ] as const;
  contactCandidates.forEach(([field, originalValue, candidateValue, status]) => {
    if (status === "conflict") {
      conflicts.push({
        field,
        originalValue,
        candidateValue,
        reason: "Excel 原值与官网/公开来源候选值不一致，保留双方值并等待人工确认。",
      });
    }
  });

  const missingFields = [
    !hasKnownValue(supplier.contact) ? "联系人" : "",
    phoneStatus === "missing" ? "电话" : "",
    emailStatus === "missing" ? "邮箱" : "",
    websiteStatus === "missing" ? "官网" : "",
    dueDiligence?.unifiedSocialCreditCode.status !== "confirmed" ? "统一社会信用代码" : "",
    dueDiligence?.legalRepresentative.status !== "confirmed" ? "法定代表人" : "",
    dueDiligence?.registeredCapital.status !== "confirmed" ? "注册资本" : "",
    certificateStatus !== "verified" ? "证书编号/有效期" : "",
    "经营状态（国家企业信用信息公示系统）",
    dueDiligence?.judicialRisk.status === "manual_required" ? "司法风险人工核验" : "",
  ].filter(Boolean);

  const sourceLinks = [
    ...(research?.sources ?? []),
    ...[
      dueDiligence?.unifiedSocialCreditCode.source,
      dueDiligence?.legalRepresentative.source,
      dueDiligence?.registeredCapital.source,
      ...(dueDiligence?.certificates.map((item) => item.source) ?? []),
    ].filter((source): source is NonNullable<typeof source> => Boolean(source)),
  ].filter((source, index, sources) => sources.findIndex((item) => item.url === source.url) === index);

  const baseConfidence = research?.sourceConfidence === "A" ? 92 : research?.sourceConfidence === "B" ? 82 : research?.sourceConfidence === "C" ? 68 : 52;
  const verificationConfidence = Math.max(35, baseConfidence - conflicts.length * 5 - missingFields.length * 2);
  const dataCompleteness = Math.max(
    20,
    Math.min(100, Math.round(supplier.dataCompleteness * 0.6 + (10 - Math.min(10, missingFields.length)) * 4)),
  );

  return {
    supplierId: supplier.id,
    batch,
    originalName: supplier.supplierName,
    candidateLegalEntity,
    legalEntityResolution,
    legalEntityReviewStatus,
    legalEntityResolutionNote,
    queriedAt: research?.researchedAt ?? dueDiligence?.checkedAt ?? "2026-07-23",
    sourceLinks,
    crossChecks: {
      phone: phoneStatus,
      email: emailStatus,
      website: websiteStatus,
      certificate: certificateStatus,
      operatingStatus: "manual_required",
    },
    conflicts,
    missingFields,
    verificationConfidence,
    dataCompleteness,
    humanReviewStatus: "pending",
    inquiryEligible: false,
    aiDecisionNote: "AI 仅整理公开线索、冲突和缺失项，不直接确认供应商合格；需人工复核后决定是否准入。",
  };
});

export const supplierVerificationById = Object.fromEntries(
  supplierVerificationRecords.map((record) => [record.supplierId, record]),
) as Record<string, SupplierVerificationRecord>;

export const supplierVerificationSummary = {
  total: supplierVerificationRecords.length,
  p0: supplierVerificationRecords.filter((item) => item.batch === "P0").length,
  p1: supplierVerificationRecords.filter((item) => item.batch === "P1").length,
  p2: supplierVerificationRecords.filter((item) => item.batch === "P2").length,
  conflicts: supplierVerificationRecords.filter((item) => item.conflicts.length > 0).length,
  needsReview: supplierVerificationRecords.filter((item) => item.missingFields.length > 0 || item.conflicts.length > 0).length,
  publicEvidenceConfirmed: supplierVerificationRecords.filter(
    (item) => item.legalEntityReviewStatus === "confirmed_with_public_evidence",
  ).length,
  exactNamePendingRegistry: supplierVerificationRecords.filter(
    (item) => item.legalEntityReviewStatus === "exact_name_pending_registry",
  ).length,
  candidatePendingRegistry: supplierVerificationRecords.filter(
    (item) => item.legalEntityReviewStatus === "candidate_pending_registry",
  ).length,
  unresolvedChannel: supplierVerificationRecords.filter(
    (item) => item.legalEntityReviewStatus === "unresolved_channel",
  ).length,
};

export const supplierDisambiguationLedger = supplierVerificationRecords.map((record) => ({
  supplierId: record.supplierId,
  batch: record.batch,
  originalName: record.originalName,
  candidateLegalEntity: record.candidateLegalEntity,
  reviewStatus: record.legalEntityReviewStatus,
  resolutionNote: record.legalEntityResolutionNote,
  queriedAt: record.queriedAt,
  sourceCount: record.sourceLinks.length,
  conflictCount: record.conflicts.length,
  missingFieldCount: record.missingFields.length,
  verificationConfidence: record.verificationConfidence,
  dataCompleteness: record.dataCompleteness,
  humanReviewStatus: record.humanReviewStatus,
  inquiryEligible: record.inquiryEligible,
}));

export const supplierMissingFieldLedger = Array.from(
  supplierVerificationRecords.reduce((ledger, record) => {
    record.missingFields.forEach((field) => {
      const current = ledger.get(field) ?? {
        field,
        supplierIds: [] as string[],
        p0Count: 0,
        p1Count: 0,
        p2Count: 0,
      };
      current.supplierIds.push(record.supplierId);
      if (record.batch === "P0") current.p0Count += 1;
      if (record.batch === "P1") current.p1Count += 1;
      if (record.batch === "P2") current.p2Count += 1;
      ledger.set(field, current);
    });
    return ledger;
  }, new Map<string, { field: string; supplierIds: string[]; p0Count: number; p1Count: number; p2Count: number }>())
  .values(),
)
  .map((item) => ({ ...item, affectedCount: item.supplierIds.length }))
  .sort((left, right) => right.affectedCount - left.affectedCount);
