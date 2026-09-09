import type { EquipmentReviewAiProvider } from "./equipmentReviewProvider";
import type {
  EquipmentAiEvidenceState,
  EquipmentAiReviewInput,
  EquipmentAiReviewOutput,
} from "@/types/equipmentAiReview";
import type { RiskLevel } from "@/types/common";

const evidenceLabels: Record<string, string> = {
  price_source: "价格来源",
  supplier: "供应商主体",
  technical_parameters: "技术参数",
  validity: "有效期",
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function strongestRisk(current: RiskLevel, hasEvidenceProblem: boolean): RiskLevel {
  if (current === "critical" || current === "high") return current;
  if (hasEvidenceProblem) return "high";
  return current;
}

function findingReason(key: string, state: EquipmentAiEvidenceState) {
  const label = evidenceLabels[key] ?? key;
  if (state === "verified") return `${label}已存在可核验记录。`;
  if (state === "problem") return `${label}存在冲突或异常，需要人工确认。`;
  return `${label}缺少可追溯证据。`;
}

export class DeterministicEquipmentReviewProvider
  implements EquipmentReviewAiProvider
{
  readonly metadata = {
    provider: "deterministic",
    model: "equipment-review-rules-v1",
    promptKey: "equipment-price-pre-review",
    promptVersion: "2026-08-13.p1",
    schemaVersion: "1.0" as const,
  };

  async analyze(input: EquipmentAiReviewInput): Promise<EquipmentAiReviewOutput> {
    const states = input.reviewContext.evidenceStates;
    const evidenceFindings = Object.entries(states).map(([key, status]) => ({
      key,
      status,
      reason: findingReason(key, status),
    }));
    const unresolvedEvidence = evidenceFindings.filter(
      (item) => item.status !== "verified"
    );
    const hasEvidenceProblem = evidenceFindings.some(
      (item) => item.status === "problem"
    );
    const missingFields = [...new Set(input.reviewContext.missingFields)];
    const matchedRules = [...new Set(input.reviewContext.matchedRules)];
    const riskLevel = strongestRisk(
      input.reviewContext.riskLevel,
      hasEvidenceProblem
    );
    const confidence = clamp(
      input.reviewContext.confidence * 0.55 +
        input.reviewContext.completeness * 0.35 +
        (unresolvedEvidence.length === 0 ? 10 : 0) -
        missingFields.length * 4 -
        matchedRules.length * 2
    );
    const reasonCodes = [
      ...(missingFields.length ? ["MISSING_REQUIRED_FIELDS"] : []),
      ...(unresolvedEvidence.length ? ["EVIDENCE_REQUIRES_REVIEW"] : []),
      ...(matchedRules.length ? ["BUSINESS_RULES_MATCHED"] : []),
      ...(riskLevel === "critical" || riskLevel === "high"
        ? ["ELEVATED_PRICE_RISK"]
        : []),
      ...(confidence < 70 ? ["LOW_AI_CONFIDENCE"] : []),
    ];
    const suggestedDecision =
      riskLevel === "critical"
        ? "reject_candidate"
        : missingFields.length > 0 || unresolvedEvidence.length > 0
          ? "request_info"
          : "review";

    const issueSummary = [
      missingFields.length ? `缺少 ${missingFields.join("、")}` : "必填字段基本完整",
      unresolvedEvidence.length
        ? `${unresolvedEvidence.length} 项证据仍需人工核验`
        : "证据项已具备核验基础",
      matchedRules.length ? `命中 ${matchedRules.length} 条业务规则` : "未命中额外规则",
    ].join("；");

    return {
      schemaVersion: "1.0",
      judgment: `${input.equipment.name}预审完成：${issueSummary}。AI 仅提供辅助判断，不构成审核结论。`,
      recommendation:
        suggestedDecision === "reject_candidate"
          ? "当前风险较高，建议核对价格来源、供应商主体和参数口径后再决定是否驳回。"
          : suggestedDecision === "request_info"
            ? "建议先补齐缺失字段与证据，再由已认领的审核员提交人工结论。"
            : "建议审核员复核价格边界与有效期后提交人工结论。",
      confidence,
      riskLevel,
      requiresHumanReview: true,
      missingFields,
      matchedRules,
      evidenceFindings,
      reasonCodes,
      suggestedDecision,
      generatedAt: new Date().toISOString(),
    };
  }
}
