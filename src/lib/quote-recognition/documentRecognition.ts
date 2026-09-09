import "server-only";

import type { ParsedQuoteItem } from "@/lib/imports/quoteRecognitionParser";
import type { QuoteItemType, QuoteRiskLevel } from "@/types/quoteRecognition";

type VisualEvidence = Omit<ParsedQuoteItem["evidence"], "sourceKind" | "extractionMethod"> & {
  sourceKind: "pdf_page" | "image";
  extractionMethod: "openai_responses";
};

export type VisualParsedQuoteItem = Omit<ParsedQuoteItem, "evidence"> & { evidence: VisualEvidence };

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function string(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function risk(value: unknown): QuoteRiskLevel {
  return ["low", "medium", "high", "critical"].includes(String(value))
    ? String(value) as QuoteRiskLevel
    : "medium";
}

function coordinate(value: unknown, fallback: number) {
  return Math.max(0, Math.min(1, number(value, fallback)));
}

export function parseVisualRecognitionPayload(payload: unknown, mimeType: string) {
  const root = object(payload);
  const result = object(root.data);
  const document = object(result.document);
  const rawItems = Array.isArray(result.items) ? result.items : [];
  if (!rawItems.length) throw new Error("视觉模型未返回可审核的报价行项目");

  const items: VisualParsedQuoteItem[] = rawItems.slice(0, 500).map((candidate, index) => {
    const item = object(candidate);
    const source = object(item.source);
    const bbox = object(source.bbox);
    const x = coordinate(bbox.x, 0);
    const y = coordinate(bbox.y, 0);
    const width = Math.max(0.001, Math.min(1 - x, coordinate(bbox.width, 1 - x)));
    const height = Math.max(0.001, Math.min(1 - y, coordinate(bbox.height, 0.05)));
    const confidence = Math.max(0, Math.min(100, number(item.confidence, 0)));
    const quantity = Math.max(0.0001, number(item.quantity, 1));
    const unitPrice = Math.max(0, number(item.unitPrice));
    const totalPrice = Math.max(0, number(item.totalPrice, unitPrice * quantity));
    const itemName = string(item.itemName, 200);
    if (!itemName) throw new Error(`视觉识别第 ${index + 1} 行缺少项目名称`);
    const missingFields = Array.isArray(item.missingFields)
      ? item.missingFields.flatMap((entry) => typeof entry === "string" ? [entry.slice(0, 100)] : []).slice(0, 30)
      : [];
    const itemType: QuoteItemType = item.itemType === "material" ? "material" : "equipment";

    return {
      lineNumber: index + 1,
      itemType,
      itemCode: string(item.itemCode, 80),
      itemName,
      brand: string(item.brand, 120),
      specification: string(item.specification, 200),
      category: string(item.category, 100),
      unit: string(item.unit, 40),
      quantity,
      unitPrice,
      totalPrice,
      currency: string(item.currency, 12).toUpperCase() || string(document.currency, 12).toUpperCase() || "CNY",
      region: string(item.region, 100),
      priceCondition: string(item.priceCondition, 80),
      supplierName: string(item.supplierName, 160) || string(document.supplierName, 160),
      confidence,
      riskLevel: risk(item.riskLevel),
      missingFields,
      rawData: item,
      evidence: {
        pageNumber: Math.max(1, Math.round(number(source.pageNumber, 1))),
        sourceKind: mimeType === "application/pdf" ? "pdf_page" : "image",
        extractionMethod: "openai_responses",
        sourceText: string(source.text, 4000),
        confidence: Math.max(0, Math.min(100, number(source.confidence, confidence))),
        bbox: { x, y, width, height },
      },
    };
  });

  return {
    items,
    document: {
      supplierName: string(document.supplierName, 160),
      quoteNumber: string(document.quoteNumber, 100),
      quoteDate: string(document.quoteDate, 10) || null,
      validUntil: string(document.validUntil, 10) || null,
      currency: string(document.currency, 12).toUpperCase() || items[0]?.currency || "CNY",
      totalAmount: Math.max(0, number(document.totalAmount, items.reduce((sum, item) => sum + item.totalPrice, 0))),
      pageCount: Math.max(1, Math.round(number(document.pageCount, Math.max(...items.map((item) => item.evidence.pageNumber))))),
    },
    summary: {
      rowCount: items.length,
      totalAmount: Math.max(0, number(document.totalAmount, items.reduce((sum, item) => sum + item.totalPrice, 0))),
      overallConfidence: Math.max(0, Math.min(100, number(result.overallConfidence, items.reduce((sum, item) => sum + item.confidence, 0) / items.length))),
      missingFields: Array.isArray(result.missingFields)
        ? result.missingFields.flatMap((entry) => typeof entry === "string" ? [entry.slice(0, 100)] : []).slice(0, 50)
        : [...new Set(items.flatMap((item) => item.missingFields))],
      riskLevel: risk(result.riskLevel),
      provider: string(root.provider, 100),
      model: string(root.model, 100),
      gatewayRunId: string(root.gatewayRunId, 100),
    },
  };
}
