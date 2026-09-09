import type { EquipmentCatalogRecord } from "@/types/equipmentCatalog";

type MatchableItem = {
  item_name: string;
  specification: string;
  category: string;
};

export function normalizeCatalogText(value: string) {
  return value
    .toLowerCase()
    .replace(/[（）()\[\]【】,，;；:：/\\\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string) {
  return normalizeCatalogText(value).replaceAll(" ", "");
}

function tokens(value: string) {
  return new Set(
    normalizeCatalogText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

function overlapScore(left: string, right: string) {
  const leftCompact = compact(left);
  const rightCompact = compact(right);
  if (!leftCompact || !rightCompact) return 0;
  if (leftCompact === rightCompact) return 100;
  if (leftCompact.includes(rightCompact) || rightCompact.includes(leftCompact)) return 88;
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return Math.round((intersection / Math.max(leftTokens.size, rightTokens.size)) * 100);
}

function difference(
  field: string,
  requirement: string,
  candidate: string,
) {
  const score = overlapScore(requirement, candidate);
  return {
    field,
    requirement: requirement || "未提供",
    candidate: candidate || "资料库未提供",
    status: (!requirement || !candidate ? "missing" : score >= 80 ? "matched" : "different") as
      | "matched"
      | "missing"
      | "different",
  };
}

export function scoreCatalogCandidate(item: MatchableItem, catalog: EquipmentCatalogRecord) {
  const nameScore = overlapScore(item.item_name, `${catalog.equipment_name} ${catalog.normalized_name} ${catalog.equipment_type}`);
  const modelScore = overlapScore(item.specification, `${catalog.model} ${catalog.product_series}`);
  const parameterScore = overlapScore(item.specification, catalog.specification);
  const categoryScore = item.category === "equipment" && catalog.equipment_category ? 100 : 60;
  const overallScore = Math.round(
    (nameScore * 0.5 + modelScore * 0.2 + parameterScore * 0.25 + categoryScore * 0.05) * 10,
  ) / 10;
  const differences = [
    difference("设备名称", item.item_name, catalog.equipment_name),
    difference("型号/系列", item.specification, [catalog.model, catalog.product_series].filter(Boolean).join(" / ")),
    difference("规格参数", item.specification, catalog.specification),
  ];
  const matchedSignals = differences.filter((entry) => entry.status === "matched").map((entry) => entry.field);
  const missingSignals = differences.filter((entry) => entry.status !== "matched").map((entry) => entry.field);

  return {
    nameScore,
    modelScore,
    parameterScore,
    overallScore,
    confidence: Math.min(98, Math.max(35, Math.round(overallScore * 0.92 + catalog.ai_confidence * 0.08))),
    matchReason: {
      summary: matchedSignals.length
        ? `${matchedSignals.join("、")}与资料库候选一致，${missingSignals.length ? `${missingSignals.join("、")}仍需人工确认` : "可进入人工确认"}。`
        : "名称或规格相似度较低，仅作为候选线索展示。",
      signals: [
        `名称相似度 ${nameScore}%`,
        `型号相似度 ${modelScore}%`,
        `参数相似度 ${parameterScore}%`,
      ],
    },
    differences,
  };
}
