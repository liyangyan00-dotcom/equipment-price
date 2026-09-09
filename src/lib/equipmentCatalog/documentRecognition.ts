import "server-only";

type Json = Record<string, unknown>;

function object(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function text(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coordinate(value: unknown, fallback: number) {
  return Math.max(0, Math.min(1, number(value, fallback)));
}

function stableCode(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function parseEquipmentDocumentPayload(payload: unknown) {
  const root = object(payload);
  const data = object(root.data);
  const document = object(data.document);
  const rawParameters = Array.isArray(data.parameters) ? data.parameters : [];
  if (!rawParameters.length) throw new Error("视觉模型未返回可审核的设备参数");

  const parameters = rawParameters.slice(0, 300).map((candidate, index) => {
    const parameter = object(candidate);
    const source = object(parameter.source);
    const bbox = object(source.bbox);
    const name = text(parameter.name, 180);
    const value = text(parameter.value, 1000);
    if (!name || !value) throw new Error(`第 ${index + 1} 个参数缺少名称或值`);
    const x = coordinate(bbox.x, 0);
    const y = coordinate(bbox.y, 0);
    return {
      code: text(parameter.code, 100) || `PDF_${stableCode(name)}`,
      name,
      group: text(parameter.group, 80) || "other",
      value,
      normalizedValue: text(parameter.normalizedValue, 1000) || value,
      unit: text(parameter.unit, 40),
      confidence: Math.max(0, Math.min(100, number(parameter.confidence))),
      riskLevel: ["low", "medium", "high", "critical"].includes(String(parameter.riskLevel))
        ? String(parameter.riskLevel) as "low" | "medium" | "high" | "critical"
        : "medium" as const,
      evidence: {
        pageNumber: Math.max(1, Math.round(number(source.pageNumber, 1))),
        text: text(source.text, 4000),
        confidence: Math.max(0, Math.min(100, number(source.confidence, number(parameter.confidence)))),
        bbox: {
          x,
          y,
          width: Math.max(0.001, Math.min(1 - x, coordinate(bbox.width, 1 - x))),
          height: Math.max(0.001, Math.min(1 - y, coordinate(bbox.height, 0.05))),
        },
      },
    };
  });

  return {
    parameters,
    document: {
      title: text(document.title, 300),
      pageCount: Math.max(1, Math.round(number(document.pageCount, Math.max(...parameters.map((item) => item.evidence.pageNumber))))),
      equipmentName: text(document.equipmentName, 180),
      brand: text(document.brand, 120),
      model: text(document.model, 120),
    },
    summary: {
      confidence: Math.max(0, Math.min(100, number(data.overallConfidence))),
      riskLevel: ["low", "medium", "high", "critical"].includes(String(data.riskLevel))
        ? String(data.riskLevel)
        : "medium",
      warnings: Array.isArray(data.warnings)
        ? data.warnings.flatMap((entry) => typeof entry === "string" ? [entry.slice(0, 300)] : []).slice(0, 50)
        : [],
      provider: text(root.provider, 100),
      model: text(root.model, 100),
      gatewayRunId: text(root.gatewayRunId, 100),
    },
  };
}
