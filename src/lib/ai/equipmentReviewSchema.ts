import type {
  EquipmentAiReviewOutput,
  EquipmentAiEvidenceFinding,
} from "@/types/equipmentAiReview";
import type { RiskLevel } from "@/types/common";

const riskLevels = new Set<RiskLevel>(["low", "medium", "high", "critical"]);
const evidenceStates = new Set(["verified", "problem", "missing"]);
const suggestedDecisions = new Set(["review", "request_info", "reject_candidate"]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isEvidenceFinding(value: unknown): value is EquipmentAiEvidenceFinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const finding = value as Record<string, unknown>;
  return (
    typeof finding.key === "string" &&
    typeof finding.status === "string" &&
    evidenceStates.has(finding.status) &&
    typeof finding.reason === "string"
  );
}

export function validateEquipmentAiReviewOutput(
  value: unknown
): EquipmentAiReviewOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI_OUTPUT_NOT_OBJECT");
  }

  const output = value as Record<string, unknown>;
  if (output.schemaVersion !== "1.0") throw new Error("AI_OUTPUT_SCHEMA_VERSION");
  if (typeof output.judgment !== "string" || !output.judgment.trim()) {
    throw new Error("AI_OUTPUT_JUDGMENT_REQUIRED");
  }
  if (typeof output.recommendation !== "string" || !output.recommendation.trim()) {
    throw new Error("AI_OUTPUT_RECOMMENDATION_REQUIRED");
  }
  if (
    typeof output.confidence !== "number" ||
    !Number.isFinite(output.confidence) ||
    output.confidence < 0 ||
    output.confidence > 100
  ) {
    throw new Error("AI_OUTPUT_CONFIDENCE_RANGE");
  }
  if (typeof output.riskLevel !== "string" || !riskLevels.has(output.riskLevel as RiskLevel)) {
    throw new Error("AI_OUTPUT_RISK_LEVEL");
  }
  if (output.requiresHumanReview !== true) {
    throw new Error("AI_OUTPUT_HUMAN_REVIEW_REQUIRED");
  }
  if (!isStringArray(output.missingFields)) throw new Error("AI_OUTPUT_MISSING_FIELDS");
  if (!isStringArray(output.matchedRules)) throw new Error("AI_OUTPUT_MATCHED_RULES");
  if (!isStringArray(output.reasonCodes)) throw new Error("AI_OUTPUT_REASON_CODES");
  if (
    !Array.isArray(output.evidenceFindings) ||
    !output.evidenceFindings.every(isEvidenceFinding)
  ) {
    throw new Error("AI_OUTPUT_EVIDENCE_FINDINGS");
  }
  if (
    typeof output.suggestedDecision !== "string" ||
    !suggestedDecisions.has(output.suggestedDecision)
  ) {
    throw new Error("AI_OUTPUT_SUGGESTED_DECISION");
  }
  if (
    typeof output.generatedAt !== "string" ||
    Number.isNaN(Date.parse(output.generatedAt))
  ) {
    throw new Error("AI_OUTPUT_GENERATED_AT");
  }

  return output as unknown as EquipmentAiReviewOutput;
}
