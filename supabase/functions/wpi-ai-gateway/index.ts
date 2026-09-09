import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractTextItems, getDocumentProxy } from "npm:unpdf@1.8.1";
import { strFromU8, unzipSync } from "npm:fflate@0.8.2";
import { XMLParser } from "npm:fast-xml-parser@5.2.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GatewayBody = {
  action?:
    | "execute_equipment_review"
    | "recognize_quote_document"
    | "recognize_caid_price_report"
    | "recognize_equipment_document"
    | "translate_price_leads"
    | "validate_integration"
    | "enqueue_task"
    | "retry_task"
    | "cancel_task"
    | "review_task";
  organizationId?: string;
  integrationId?: string;
  businessRunId?: string;
  executionTaskId?: string;
  workflowKey?: AiWorkflowKey;
  title?: string;
  sourceLabel?: string;
  businessObjectType?: string;
  businessObjectId?: string;
  businessHref?: string;
  idempotencyKey?: string;
  decision?: "approved" | "request_changes" | "rejected";
  reviewNote?: string;
  input?: Record<string, unknown>;
  sourceUrl?: string;
  fileName?: string;
  mimeType?: string;
  requestedBy?: string;
  taskId?: string;
  leadIds?: string[];
};

type PdfEvidenceItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfEvidencePage = {
  pageNumber: number;
  text: string;
  items: PdfEvidenceItem[];
};

type AiWorkflowKey =
  | "equipment_price_pre_review"
  | "quote_recognition"
  | "price_collection"
  | "comparison_analysis"
  | "boq_parsing"
  | "inquiry_letter"
  | "report_generation";

type PersistedTask = {
  id: string;
  task_code: string;
  organization_id: string;
  workflow_key: AiWorkflowKey;
  title: string;
  source_label: string;
  business_object_type: string;
  business_object_id: string | null;
  business_href: string | null;
  status: "queued" | "running" | "needs_review" | "completed" | "failed" | "cancelled";
  stage: string;
  progress: number;
  input_payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
  requested_by: string;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

const workflowRuntime: Record<AiWorkflowKey, {
  modelKey: string;
  promptKey: string;
  executePermission: string;
  reviewPermission: string;
}> = {
  equipment_price_pre_review: {
    modelKey: "comparison_advice",
    promptKey: "risk_assessment",
    executePermission: "price.review",
    reviewPermission: "price.review",
  },
  quote_recognition: {
    modelKey: "quote_recognition",
    promptKey: "quote_recognition",
    executePermission: "price.write",
    reviewPermission: "price.review",
  },
  price_collection: {
    modelKey: "comparison_advice",
    promptKey: "risk_assessment",
    executePermission: "price.write",
    reviewPermission: "price.review",
  },
  comparison_analysis: {
    modelKey: "comparison_advice",
    promptKey: "risk_assessment",
    executePermission: "inquiry.write",
    reviewPermission: "inquiry.approve",
  },
  boq_parsing: {
    modelKey: "boq_parsing",
    promptKey: "quote_recognition",
    executePermission: "project.write",
    reviewPermission: "project.write",
  },
  inquiry_letter: {
    modelKey: "comparison_advice",
    promptKey: "inquiry_letter",
    executePermission: "inquiry.write",
    reviewPermission: "inquiry.approve",
  },
  report_generation: {
    modelKey: "report_generation",
    promptKey: "report_conclusion",
    executePermission: "report.write",
    reviewPermission: "report.write",
  },
};

type RuntimeIntegration = {
  integration_id: string;
  integration_code: string;
  provider: string;
  endpoint_url: string | null;
  status: string;
  credential_state: string;
  config: Record<string, unknown> | null;
  credential_secret: string | null;
};

function readNamedKey(jsonName: string, fallbackName: string) {
  const raw = Deno.env.get(jsonName);
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      if (keys.default) return keys.default;
    } catch {
      // Fall through to the legacy key while projects migrate key formats.
    }
  }
  return Deno.env.get(fallbackName) ?? "";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value: unknown, fallback = 0) {
  return Math.max(0, Math.round(numeric(value, fallback)));
}

function normalizeChatEndpoint(endpoint: string) {
  const clean = endpoint.trim().replace(/\/+$/, "");
  return /\/chat\/completions$/i.test(clean) ? clean : `${clean}/chat/completions`;
}

function normalizeResponsesEndpoint(endpoint: string) {
  const clean = endpoint.trim().replace(/\/+$/, "");
  return /\/responses$/i.test(clean) ? clean : `${clean}/responses`;
}

function stripJsonFence(content: string) {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function validateEquipmentReviewOutput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI_OUTPUT_NOT_OBJECT");
  }
  const output = value as Record<string, unknown>;
  const stringArrays = ["missingFields", "matchedRules", "reasonCodes"];
  if (output.schemaVersion !== "1.0") throw new Error("AI_OUTPUT_SCHEMA_VERSION");
  if (typeof output.judgment !== "string" || !output.judgment.trim()) throw new Error("AI_OUTPUT_JUDGMENT_REQUIRED");
  if (typeof output.recommendation !== "string" || !output.recommendation.trim()) throw new Error("AI_OUTPUT_RECOMMENDATION_REQUIRED");
  const confidence = numeric(output.confidence, -1);
  if (confidence < 0 || confidence > 100) throw new Error("AI_OUTPUT_CONFIDENCE_RANGE");
  if (!["low", "medium", "high", "critical"].includes(String(output.riskLevel))) throw new Error("AI_OUTPUT_RISK_LEVEL");
  for (const key of stringArrays) {
    if (!Array.isArray(output[key]) || !(output[key] as unknown[]).every((item) => typeof item === "string")) {
      throw new Error(`AI_OUTPUT_${key.toUpperCase()}`);
    }
  }
  if (!Array.isArray(output.evidenceFindings) || !output.evidenceFindings.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const finding = item as Record<string, unknown>;
    return typeof finding.key === "string"
      && ["verified", "problem", "missing"].includes(String(finding.status))
      && typeof finding.reason === "string";
  })) throw new Error("AI_OUTPUT_EVIDENCE_FINDINGS");
  if (!["review", "request_info", "reject_candidate"].includes(String(output.suggestedDecision))) {
    throw new Error("AI_OUTPUT_SUGGESTED_DECISION");
  }
  output.confidence = confidence;
  output.requiresHumanReview = true;
  output.generatedAt = new Date().toISOString();
  return output;
}

function validateGenericTaskOutput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI_OUTPUT_NOT_OBJECT");
  }
  const output = value as Record<string, unknown>;
  if (output.schemaVersion !== "1.0") throw new Error("AI_OUTPUT_SCHEMA_VERSION");
  if (typeof output.summary !== "string" || !output.summary.trim()) {
    throw new Error("AI_OUTPUT_SUMMARY_REQUIRED");
  }
  if (typeof output.recommendation !== "string" || !output.recommendation.trim()) {
    throw new Error("AI_OUTPUT_RECOMMENDATION_REQUIRED");
  }
  const confidence = numeric(output.confidence, -1);
  if (confidence < 0 || confidence > 100) throw new Error("AI_OUTPUT_CONFIDENCE_RANGE");
  if (!["low", "medium", "high", "critical"].includes(String(output.riskLevel))) {
    throw new Error("AI_OUTPUT_RISK_LEVEL");
  }
  if (!Array.isArray(output.reasonCodes) || !output.reasonCodes.every((item) => typeof item === "string")) {
    throw new Error("AI_OUTPUT_REASON_CODES");
  }
  if (!Array.isArray(output.findings) || !output.findings.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const finding = item as Record<string, unknown>;
    return typeof finding.code === "string"
      && typeof finding.title === "string"
      && typeof finding.detail === "string"
      && ["info", "low", "medium", "high", "critical"].includes(String(finding.severity));
  })) throw new Error("AI_OUTPUT_FINDINGS");
  if (!["review", "request_info", "retry", "reject_candidate"].includes(String(output.suggestedAction))) {
    throw new Error("AI_OUTPUT_SUGGESTED_ACTION");
  }
  output.confidence = confidence;
  output.requiresHumanReview = true;
  output.generatedAt = new Date().toISOString();
  return output;
}

function validateReportGenerationOutput(value: unknown, expectedOutline: unknown) {
  const output = validateGenericTaskOutput(value);
  const outline = Array.isArray(expectedOutline)
    ? expectedOutline.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
  if (!outline.length) throw new Error("AI_REPORT_OUTLINE_REQUIRED");
  if (!Array.isArray(output.chapters) || output.chapters.length !== outline.length) {
    throw new Error("AI_REPORT_CHAPTER_COUNT");
  }
  output.chapters = output.chapters.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`AI_REPORT_CHAPTER_${index + 1}_INVALID`);
    }
    const chapter = value as Record<string, unknown>;
    const title = String(chapter.title ?? "").trim();
    const summary = String(chapter.summary ?? "").trim();
    if (title !== outline[index]) throw new Error(`AI_REPORT_CHAPTER_${index + 1}_TITLE`);
    if (summary.length < 10) throw new Error(`AI_REPORT_CHAPTER_${index + 1}_SUMMARY`);
    for (const key of ["findings", "evidenceRefs"]) {
      if (!Array.isArray(chapter[key]) || !(chapter[key] as unknown[]).every((item) => typeof item === "string")) {
        throw new Error(`AI_REPORT_CHAPTER_${index + 1}_${key.toUpperCase()}`);
      }
    }
    return {
      title,
      summary,
      findings: chapter.findings,
      evidenceRefs: chapter.evidenceRefs,
    };
  });
  return output;
}

function validateInquiryLetterOutput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI_OUTPUT_NOT_OBJECT");
  }
  const output = value as Record<string, unknown>;
  if (output.schemaVersion !== "1.0") throw new Error("AI_OUTPUT_SCHEMA_VERSION");
  if (typeof output.subject !== "string" || !output.subject.trim()) {
    throw new Error("AI_OUTPUT_SUBJECT_REQUIRED");
  }
  if (typeof output.body !== "string" || output.body.trim().length < 80) {
    throw new Error("AI_OUTPUT_LETTER_BODY_REQUIRED");
  }
  if (typeof output.summary !== "string" || !output.summary.trim()) {
    throw new Error("AI_OUTPUT_SUMMARY_REQUIRED");
  }
  const confidence = numeric(output.confidence, -1);
  if (confidence < 0 || confidence > 100) throw new Error("AI_OUTPUT_CONFIDENCE_RANGE");
  if (!["low", "medium", "high", "critical"].includes(String(output.riskLevel))) {
    throw new Error("AI_OUTPUT_RISK_LEVEL");
  }
  for (const key of ["warnings", "missingFields", "reasonCodes"]) {
    if (!Array.isArray(output[key]) || !(output[key] as unknown[]).every((item) => typeof item === "string")) {
      throw new Error(`AI_OUTPUT_${key.toUpperCase()}`);
    }
  }
  if (!["review", "request_info"].includes(String(output.suggestedAction))) {
    throw new Error("AI_OUTPUT_SUGGESTED_ACTION");
  }
  output.subject = output.subject.trim();
  output.body = output.body.trim();
  output.confidence = confidence;
  output.requiresHumanReview = true;
  output.generatedAt = new Date().toISOString();
  return output;
}

function normalizedCoordinate(value: unknown, fallback: number) {
  return Math.max(0, Math.min(1, numeric(value, fallback)));
}

function validateQuoteDocumentOutput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AI_OUTPUT_NOT_OBJECT");
  const output = value as Record<string, unknown>;
  if (output.schemaVersion !== "2.0") throw new Error("AI_OUTPUT_SCHEMA_VERSION");
  if (!output.document || typeof output.document !== "object" || Array.isArray(output.document)) {
    throw new Error("AI_OUTPUT_DOCUMENT_REQUIRED");
  }
  if (!Array.isArray(output.items) || output.items.length === 0 || output.items.length > 500) {
    throw new Error("AI_OUTPUT_ITEMS_RANGE");
  }
  const items = output.items.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error(`AI_OUTPUT_ITEM_${index + 1}`);
    }
    const item = candidate as Record<string, unknown>;
    const source = item.source && typeof item.source === "object" && !Array.isArray(item.source)
      ? item.source as Record<string, unknown>
      : null;
    const bbox = source?.bbox && typeof source.bbox === "object" && !Array.isArray(source.bbox)
      ? source.bbox as Record<string, unknown>
      : null;
    const itemName = String(item.itemName ?? "").trim();
    if (!itemName) throw new Error(`AI_OUTPUT_ITEM_NAME_${index + 1}`);
    if (!source || !bbox) throw new Error(`AI_OUTPUT_ITEM_EVIDENCE_${index + 1}`);
    const x = normalizedCoordinate(bbox.x, 0);
    const y = normalizedCoordinate(bbox.y, 0);
    const width = Math.max(0.001, Math.min(1 - x, normalizedCoordinate(bbox.width, 1 - x)));
    const height = Math.max(0.001, Math.min(1 - y, normalizedCoordinate(bbox.height, 0.05)));
    const confidence = Math.max(0, Math.min(100, numeric(item.confidence, 0)));
    const evidenceConfidence = Math.max(0, Math.min(100, numeric(source.confidence, confidence)));
    const riskLevel = String(item.riskLevel ?? "medium");
    if (!["low", "medium", "high", "critical"].includes(riskLevel)) {
      throw new Error(`AI_OUTPUT_ITEM_RISK_${index + 1}`);
    }
    return {
      ...item,
      lineNumber: Math.max(1, integer(item.lineNumber, index + 1)),
      itemType: String(item.itemType) === "material" ? "material" : "equipment",
      itemName: itemName.slice(0, 200),
      quantity: Math.max(0.0001, numeric(item.quantity, 1)),
      unitPrice: Math.max(0, numeric(item.unitPrice)),
      totalPrice: Math.max(0, numeric(item.totalPrice)),
      confidence,
      riskLevel,
      missingFields: Array.isArray(item.missingFields)
        ? item.missingFields.filter((entry) => typeof entry === "string").slice(0, 30)
        : [],
      source: {
        pageNumber: Math.max(1, integer(source.pageNumber, 1)),
        text: String(source.text ?? "").trim().slice(0, 4000),
        confidence: evidenceConfidence,
        bbox: { x, y, width, height },
      },
    };
  });
  const confidence = Math.max(0, Math.min(100, numeric(output.overallConfidence, 0)));
  const riskLevel = String(output.riskLevel ?? "medium");
  if (!["low", "medium", "high", "critical"].includes(riskLevel)) throw new Error("AI_OUTPUT_RISK_LEVEL");
  return {
    ...output,
    schemaVersion: "2.0",
    items,
    overallConfidence: confidence,
    riskLevel,
    missingFields: Array.isArray(output.missingFields)
      ? output.missingFields.filter((entry) => typeof entry === "string").slice(0, 50)
      : [],
    requiresHumanReview: true,
    generatedAt: new Date().toISOString(),
  };
}

function validateEquipmentDocumentOutput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AI_OUTPUT_NOT_OBJECT");
  const output = value as Record<string, unknown>;
  if (output.schemaVersion !== "1.0") throw new Error("AI_OUTPUT_SCHEMA_VERSION");
  if (!Array.isArray(output.parameters) || output.parameters.length === 0 || output.parameters.length > 300) {
    throw new Error("AI_OUTPUT_PARAMETERS_RANGE");
  }
  const parameters = output.parameters.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error(`AI_OUTPUT_PARAMETER_${index + 1}`);
    }
    const parameter = candidate as Record<string, unknown>;
    const source = parameter.source && typeof parameter.source === "object" && !Array.isArray(parameter.source)
      ? parameter.source as Record<string, unknown>
      : null;
    const bbox = source?.bbox && typeof source.bbox === "object" && !Array.isArray(source.bbox)
      ? source.bbox as Record<string, unknown>
      : null;
    const name = String(parameter.name ?? "").trim().slice(0, 180);
    const valueText = String(parameter.value ?? "").trim().slice(0, 1000);
    if (!name || !valueText || !source || !bbox) throw new Error(`AI_OUTPUT_PARAMETER_EVIDENCE_${index + 1}`);
    const x = normalizedCoordinate(bbox.x, 0);
    const y = normalizedCoordinate(bbox.y, 0);
    const width = Math.max(0.001, Math.min(1 - x, normalizedCoordinate(bbox.width, 1 - x)));
    const height = Math.max(0.001, Math.min(1 - y, normalizedCoordinate(bbox.height, 0.05)));
    const confidence = Math.max(0, Math.min(100, numeric(parameter.confidence, 0)));
    const riskLevel = String(parameter.riskLevel ?? "medium");
    if (!["low", "medium", "high", "critical"].includes(riskLevel)) {
      throw new Error(`AI_OUTPUT_PARAMETER_RISK_${index + 1}`);
    }
    return {
      code: String(parameter.code ?? "").trim().slice(0, 100),
      name,
      group: String(parameter.group ?? "other").trim().slice(0, 80) || "other",
      value: valueText,
      normalizedValue: String(parameter.normalizedValue ?? valueText).trim().slice(0, 1000),
      unit: String(parameter.unit ?? "").trim().slice(0, 40),
      confidence,
      riskLevel,
      source: {
        pageNumber: Math.max(1, integer(source.pageNumber, 1)),
        text: String(source.text ?? "").trim().slice(0, 4000),
        confidence: Math.max(0, Math.min(100, numeric(source.confidence, confidence))),
        bbox: { x, y, width, height },
      },
    };
  });
  return {
    schemaVersion: "1.0",
    document: output.document && typeof output.document === "object" && !Array.isArray(output.document)
      ? output.document as Record<string, unknown>
      : {},
    parameters,
    overallConfidence: Math.max(0, Math.min(100, numeric(output.overallConfidence, 0))),
    riskLevel: ["low", "medium", "high", "critical"].includes(String(output.riskLevel))
      ? String(output.riskLevel)
      : "medium",
    warnings: Array.isArray(output.warnings)
      ? output.warnings.filter((entry) => typeof entry === "string").slice(0, 50)
      : [],
    requiresHumanReview: true,
    generatedAt: new Date().toISOString(),
  };
}

function compactEvidenceText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9\u4e00-\u9fff.+%°℃/\-]/g, "");
}

function evidenceBox(page: PdfEvidencePage | undefined, quote: string) {
  if (!page) return { x: 0, y: 0, width: 1, height: 1, precision: "page" };
  const target = compactEvidenceText(quote);
  const matched = page.items.filter((item) => {
    const candidate = compactEvidenceText(item.text);
    return candidate.length >= 2 && (target.includes(candidate) || candidate.includes(target));
  }).slice(0, 20);
  if (!matched.length) return { x: 0, y: 0, width: 1, height: 1, precision: "page" };
  const x = Math.min(...matched.map((item) => item.x));
  const y = Math.min(...matched.map((item) => item.y));
  const right = Math.max(...matched.map((item) => item.x + item.width));
  const bottom = Math.max(...matched.map((item) => item.y + item.height));
  return {
    x,
    y,
    width: Math.max(0.001, Math.min(1 - x, right - x)),
    height: Math.max(0.001, Math.min(1 - y, bottom - y)),
    precision: "text_item",
  };
}

async function extractPdfEvidence(sourceUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(sourceUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`PDF_FETCH_HTTP_${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 25 * 1024 * 1024) throw new Error("PDF_FILE_TOO_LARGE");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 25 * 1024 * 1024) throw new Error("PDF_FILE_TOO_LARGE");
    const pdf = await getDocumentProxy(bytes, { maxImageSize: 16_777_216 });
    if (pdf.numPages > 1000) throw new Error("PDF_PAGE_LIMIT_EXCEEDED");
    const extracted = await extractTextItems(pdf);
    const pages: PdfEvidencePage[] = [];
    let totalCharacters = 0;
    for (let pageIndex = 0; pageIndex < extracted.items.length; pageIndex += 1) {
      const pageNumber = pageIndex + 1;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const items: PdfEvidenceItem[] = [];
      const parts: string[] = [];
      for (const item of extracted.items[pageIndex]) {
        const value = String(item.str || "").trim();
        if (!value) continue;
        const x = Math.max(0, Math.min(1, item.x / viewport.width));
        const y = Math.max(0, Math.min(1, (viewport.height - item.y - item.height) / viewport.height));
        items.push({
          text: value,
          x,
          y,
          width: Math.max(0.001, Math.min(1 - x, item.width / viewport.width)),
          height: Math.max(0.001, Math.min(1 - y, item.height / viewport.height)),
        });
        parts.push(value, item.hasEOL ? "\n" : " ");
      }
      const pageText = parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (pageText) {
        totalCharacters += pageText.length;
        pages.push({ pageNumber, text: pageText, items });
      }
      if (totalCharacters >= 24_000 || pages.length >= 20) break;
    }
    const textLength = pages.reduce((sum, page) => sum + page.text.length, 0);
    if (textLength < 80) throw new Error("PDF_OCR_REQUIRED");
    return { totalPages: extracted.totalPages, pages, truncated: pages.length < extracted.totalPages };
  } finally {
    clearTimeout(timeout);
  }
}

function attachPdfEvidence(value: unknown, pdf: Awaited<ReturnType<typeof extractPdfEvidence>>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const output = value as Record<string, unknown>;
  const document = output.document && typeof output.document === "object" && !Array.isArray(output.document)
    ? output.document as Record<string, unknown>
    : {};
  const parameters = Array.isArray(output.parameters) ? output.parameters : [];
  return {
    ...output,
    document: { ...document, pageCount: pdf.totalPages },
    parameters: parameters.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
      const parameter = entry as Record<string, unknown>;
      const source = parameter.source && typeof parameter.source === "object" && !Array.isArray(parameter.source)
        ? parameter.source as Record<string, unknown>
        : {};
      const pageNumber = Math.max(1, integer(source.pageNumber, 1));
      const quote = String(source.text ?? "").trim();
      return {
        ...parameter,
        source: {
          ...source,
          pageNumber,
          text: quote,
          bbox: evidenceBox(pdf.pages.find((page) => page.pageNumber === pageNumber), quote),
        },
      };
    }),
    warnings: [
      ...(Array.isArray(output.warnings) ? output.warnings : []),
      ...(pdf.truncated ? ["文档超过单次解析上限，本次仅处理前 20 个含文本页面"] : []),
    ],
  };
}

function attachQuotePdfEvidence(value: unknown, pdf: Awaited<ReturnType<typeof extractPdfEvidence>>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const output = value as Record<string, unknown>;
  const document = output.document && typeof output.document === "object" && !Array.isArray(output.document)
    ? output.document as Record<string, unknown>
    : {};
  const items = Array.isArray(output.items) ? output.items : [];
  return {
    ...output,
    document: { ...document, pageCount: pdf.totalPages },
    items: items.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
      const item = entry as Record<string, unknown>;
      const source = item.source && typeof item.source === "object" && !Array.isArray(item.source)
        ? item.source as Record<string, unknown>
        : {};
      const pageNumber = Math.max(1, integer(source.pageNumber, 1));
      const quote = String(source.text ?? "").trim();
      return {
        ...item,
        source: {
          ...source,
          pageNumber,
          text: quote,
          bbox: evidenceBox(pdf.pages.find((page) => page.pageNumber === pageNumber), quote),
        },
      };
    }),
    missingFields: [
      ...(Array.isArray(output.missingFields) ? output.missingFields : []),
      ...(pdf.truncated ? ["document_truncated_after_20_text_pages"] : []),
    ],
  };
}

async function extractSpreadsheetText(sourceUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(sourceUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`SPREADSHEET_FETCH_HTTP_${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 25 * 1024 * 1024) throw new Error("SPREADSHEET_FILE_TOO_LARGE");
    const files = unzipSync(bytes);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      removeNSPrefix: true,
      parseTagValue: false,
      trimValues: false,
    });
    const list = <T>(value: T | T[] | undefined): T[] =>
      value === undefined ? [] : Array.isArray(value) ? value : [value];
    const nodeText = (value: unknown): string => {
      if (typeof value === "string" || typeof value === "number") return String(value);
      if (!value || typeof value !== "object" || Array.isArray(value)) return "";
      const record = value as Record<string, unknown>;
      return nodeText(record["#text"] ?? record.t ?? "");
    };
    const sharedXml = files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : "";
    const sharedDocument = sharedXml ? object(parser.parse(sharedXml)) : {};
    const sharedRoot = object(sharedDocument.sst);
    const sharedStrings = list(sharedRoot.si).map((entry) => {
      const item = object(entry);
      if (item.t !== undefined) return nodeText(item.t);
      return list(item.r).map((run) => nodeText(object(run).t)).join("");
    });
    const allSheetEntries = Object.entries(files)
      .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));
    const sheetEntries = allSheetEntries.slice(0, 12);
    const sheets = sheetEntries.map(([sheetName, sheetBytes]) => {
      const document = object(parser.parse(strFromU8(sheetBytes)));
      const worksheet = object(document.worksheet);
      const sheetData = object(worksheet.sheetData);
      const rows = list(sheetData.row).slice(0, 5000).map((rowValue) =>
        list(object(rowValue).c).map((cellValue) => {
          const cell = object(cellValue);
          const type = typeof cell["@_t"] === "string" ? cell["@_t"] : "";
          const inline = object(cell.is);
          const raw = nodeText(cell.v ?? inline.t ?? "");
          const value = type === "s" ? sharedStrings[Number(raw)] || "" : raw;
          return value.replace(/[\r\n,]+/g, " ").trim();
        }).join(","))
        .filter(Boolean);
      return `### SHEET: ${sheetName}\n${rows.join("\n")}`;
    });
    const joined = sheets.join("\n\n");
    const content = joined.slice(0, 80_000);
    if (content.length < 40) throw new Error("SPREADSHEET_EMPTY");
    return {
      content,
      sheetCount: sheetEntries.length,
      truncated: joined.length > 80_000 || allSheetEntries.length > 12,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function filterCaidSpreadsheetText(content: string, keyword: unknown) {
  const target = String(keyword ?? "").toLowerCase();
  const aliases = /钢筋|rebar|barre|acier|fer/.test(target)
    ? ["barre", "fer", "acier"]
    : /水泥|cement|ciment/.test(target)
      ? ["ciment", "cement"]
      : target.split(/[、,，;；|\s]+/).filter((value) => value.length >= 3);
  const output: string[] = [];
  let headerBudget = 12;
  for (const line of content.split("\n")) {
    if (line.startsWith("### SHEET:")) {
      output.push(line);
      headerBudget = 12;
      continue;
    }
    const normalized = line.toLowerCase();
    if (headerBudget > 0 || aliases.some((alias) => normalized.includes(alias))) {
      output.push(line);
    }
    headerBudget -= 1;
    if (output.join("\n").length >= 30_000) break;
  }
  return output.join("\n");
}

function isWorkflowKey(value: unknown): value is AiWorkflowKey {
  return typeof value === "string" && Object.hasOwn(workflowRuntime, value);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function estimatedCost(config: Record<string, unknown>, promptTokens: number, completionTokens: number) {
  const inputRate = numeric(config.inputCostPerMillion);
  const outputRate = numeric(config.outputCostPerMillion);
  if (inputRate <= 0 && outputRate <= 0) return null;
  return (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
}

async function hasPermission(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  role: string,
  permission: string
) {
  if (role === "admin") return true;
  const override = await adminClient
    .from("wpi_organization_role_permissions")
    .select("is_enabled")
    .eq("organization_id", organizationId)
    .eq("role", role)
    .eq("permission", permission)
    .maybeSingle();
  if (override.error) throw override.error;
  if (override.data) return Boolean(override.data.is_enabled);
  const fallback = await adminClient
    .from("wpi_role_permissions")
    .select("permission")
    .eq("role", role)
    .eq("permission", permission)
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return Boolean(fallback.data);
}

async function loadRuntime(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  integrationId: string | null,
  integrationCode: string | null
) {
  const result = await adminClient.rpc("wpi_get_ai_runtime_integration", {
    target_organization_id: organizationId,
    target_integration_id: integrationId,
    target_integration_code: integrationCode,
  });
  if (result.error) throw new Error(`AI_RUNTIME_LOOKUP_FAILED:${result.error.message}`);
  const runtime = (Array.isArray(result.data) ? result.data[0] : result.data) as RuntimeIntegration | null;
  if (!runtime) throw new Error("AI_INTEGRATION_NOT_FOUND");
  if (!runtime.endpoint_url) throw new Error("AI_ENDPOINT_NOT_CONFIGURED");
  if (runtime.credential_state !== "configured" || !runtime.credential_secret) {
    throw new Error("AI_CREDENTIAL_NOT_CONFIGURED");
  }
  return runtime;
}

async function assertWorkflowReady(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  workflowKey: AiWorkflowKey,
) {
  const mapping = workflowRuntime[workflowKey];
  const [settingsResult, modelResult, promptResult] = await Promise.all([
    adminClient
      .from("wpi_ai_settings")
      .select("mandatory_human_review")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    adminClient
      .from("wpi_ai_model_configs")
      .select("provider,model,is_enabled")
      .eq("organization_id", organizationId)
      .eq("workflow_key", mapping.modelKey)
      .maybeSingle(),
    adminClient
      .from("wpi_ai_prompt_templates")
      .select("template_key,is_enabled")
      .eq("organization_id", organizationId)
      .eq("template_key", mapping.promptKey)
      .maybeSingle(),
  ]);
  const configError = settingsResult.error || modelResult.error || promptResult.error;
  if (configError) throw configError;
  if (!settingsResult.data?.mandatory_human_review) throw new Error("AI_HUMAN_REVIEW_POLICY_REQUIRED");
  if (!modelResult.data?.is_enabled) throw new Error("AI_MODEL_WORKFLOW_DISABLED");
  if (!promptResult.data?.is_enabled) throw new Error("AI_PROMPT_DISABLED");
  if (!modelResult.data.provider || modelResult.data.provider === "unconfigured") {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  }
  if (!modelResult.data.model || modelResult.data.model === "unconfigured") {
    throw new Error("AI_MODEL_NOT_CONFIGURED");
  }

  const runtime = await loadRuntime(adminClient, organizationId, null, modelResult.data.provider);
  if (runtime.status !== "active") throw new Error("AI_INTEGRATION_NOT_VALIDATED");
}

async function callOpenAiCompatible(args: {
  runtime: RuntimeIntegration;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonMode: boolean;
}) {
  const config = args.runtime.config ?? {};
  const timeoutSeconds = Math.max(5, Math.min(120, integer(config.timeoutSeconds, 60)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  const started = Date.now();
  try {
    const requestBody: Record<string, unknown> = {
      model: args.model,
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.userPrompt },
      ],
      temperature: 0,
      max_tokens: Math.max(256, Math.min(8000, integer(config.maxOutputTokens, 6000))),
    };
    if (/deepseek/i.test(args.runtime.provider) || /deepseek/i.test(args.runtime.integration_code)) {
      requestBody.thinking = {
        type: config.thinkingMode === "enabled" ? "enabled" : "disabled",
      };
    }
    if (args.jsonMode && config.jsonMode !== false) {
      requestBody.response_format = { type: "json_object" };
    }
    const response = await fetch(normalizeChatEndpoint(args.runtime.endpoint_url ?? ""), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.runtime.credential_secret}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const raw = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      payload = { raw: raw.slice(0, 4000) };
    }
    if (!response.ok) {
      const providerError = payload.error && typeof payload.error === "object"
        ? (payload.error as Record<string, unknown>).message
        : null;
      throw new Error(`AI_PROVIDER_HTTP_${response.status}:${String(providerError ?? raw).slice(0, 1000)}`);
    }
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const first = choices[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : {};
    const message = first.message && typeof first.message === "object" ? first.message as Record<string, unknown> : {};
    const content = typeof message.content === "string" ? message.content : "";
    if (!content) throw new Error("AI_PROVIDER_EMPTY_OUTPUT");
    const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as Record<string, unknown> : {};
    return {
      content,
      latencyMs: Date.now() - started,
      httpStatus: response.status,
      promptTokens: integer(usage.prompt_tokens),
      completionTokens: integer(usage.completion_tokens),
      totalTokens: integer(usage.total_tokens),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiDocumentRecognition(args: {
  runtime: RuntimeIntegration;
  model: string;
  fileName: string;
  mimeType: string;
  sourceUrl: string;
  prompt: string;
}) {
  const config = args.runtime.config ?? {};
  const timeoutSeconds = Math.max(20, Math.min(140, integer(config.timeoutSeconds, 120)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  const started = Date.now();
  try {
    const media = args.mimeType.startsWith("image/")
      ? { type: "input_image", image_url: args.sourceUrl, detail: "high" }
      : { type: "input_file", file_url: args.sourceUrl };
    const response = await fetch(normalizeResponsesEndpoint(args.runtime.endpoint_url ?? ""), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.runtime.credential_secret}`,
      },
      body: JSON.stringify({
        model: args.model,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: args.prompt },
            media,
          ],
        }],
        max_output_tokens: 16000,
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(raw) as Record<string, unknown>; }
    catch { payload = { raw: raw.slice(0, 4000) }; }
    if (!response.ok) {
      const providerError = payload.error && typeof payload.error === "object"
        ? (payload.error as Record<string, unknown>).message
        : null;
      throw new Error(`AI_PROVIDER_HTTP_${response.status}:${String(providerError ?? raw).slice(0, 1000)}`);
    }
    const output = Array.isArray(payload.output) ? payload.output : [];
    const content = output.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const blocks = Array.isArray((entry as Record<string, unknown>).content)
        ? (entry as Record<string, unknown>).content as unknown[]
        : [];
      return blocks.flatMap((block) => {
        if (!block || typeof block !== "object") return [];
        const text = (block as Record<string, unknown>).text;
        return typeof text === "string" ? [text] : [];
      });
    }).join("\n");
    if (!content) throw new Error("AI_PROVIDER_EMPTY_OUTPUT");
    const usage = payload.usage && typeof payload.usage === "object"
      ? payload.usage as Record<string, unknown>
      : {};
    return {
      content,
      latencyMs: Date.now() - started,
      httpStatus: response.status,
      promptTokens: integer(usage.input_tokens),
      completionTokens: integer(usage.output_tokens),
      totalTokens: integer(usage.total_tokens),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function appendTaskEvent(
  adminClient: ReturnType<typeof createClient>,
  task: Pick<PersistedTask, "id" | "organization_id">,
  event: {
    eventType: string;
    status: string;
    stage: string;
    progress: number;
    message: string;
    payload?: Record<string, unknown>;
    actorType?: "user" | "gateway" | "system";
    actorUserId?: string | null;
  },
) {
  const result = await adminClient.from("wpi_ai_execution_events").insert({
    organization_id: task.organization_id,
    task_id: task.id,
    event_type: event.eventType,
    status: event.status,
    stage: event.stage,
    progress: event.progress,
    message: event.message,
    payload: event.payload ?? {},
    actor_type: event.actorType ?? "gateway",
    actor_user_id: event.actorUserId ?? null,
  });
  if (result.error) throw result.error;
}

async function updateTaskProgress(
  adminClient: ReturnType<typeof createClient>,
  task: PersistedTask,
  update: Record<string, unknown> & { status: string; stage: string; progress: number },
  eventType: string,
  message: string,
  payload: Record<string, unknown> = {},
) {
  const result = await adminClient
    .from("wpi_ai_execution_tasks")
    .update(update)
    .eq("id", task.id)
    .eq("organization_id", task.organization_id)
    .neq("status", "cancelled")
    .select("id")
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("AI_TASK_CANCELLED");
  await appendTaskEvent(adminClient, task, {
    eventType,
    status: update.status,
    stage: update.stage,
    progress: update.progress,
    message,
    payload,
  });
}

async function processPersistedTask(
  adminClient: ReturnType<typeof createClient>,
  taskId: string,
) {
  let task: PersistedTask | null = null;
  let gatewayRunId: string | null = null;
  try {
    const taskResult = await adminClient
      .from("wpi_ai_execution_tasks")
      .select("id,task_code,organization_id,workflow_key,title,source_label,business_object_type,business_object_id,business_href,status,stage,progress,input_payload,attempt_count,max_attempts,requested_by")
      .eq("id", taskId)
      .maybeSingle();
    if (taskResult.error) throw taskResult.error;
    task = taskResult.data as PersistedTask | null;
    if (!task) throw new Error("AI_TASK_NOT_FOUND");
    if (task.status === "cancelled") return;
    if (task.attempt_count >= task.max_attempts) throw new Error("AI_TASK_MAX_ATTEMPTS_REACHED");

    await updateTaskProgress(adminClient, task, {
      status: "running",
      stage: "loading_config",
      progress: 10,
      attempt_count: task.attempt_count + 1,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_code: null,
      error_message: null,
    }, "started", "AI执行网关已接收任务，正在加载组织级模型与提示词配置");

    const mapping = workflowRuntime[task.workflow_key];
    const [settingsResult, modelResult, promptResult] = await Promise.all([
      adminClient.from("wpi_ai_settings").select("mandatory_human_review").eq("organization_id", task.organization_id).maybeSingle(),
      adminClient.from("wpi_ai_model_configs").select("provider,model,is_enabled").eq("organization_id", task.organization_id).eq("workflow_key", mapping.modelKey).maybeSingle(),
      adminClient.from("wpi_ai_prompt_templates").select("template_key,version,content,is_enabled").eq("organization_id", task.organization_id).eq("template_key", mapping.promptKey).maybeSingle(),
    ]);
    const configError = settingsResult.error || modelResult.error || promptResult.error;
    if (configError) throw configError;
    if (!settingsResult.data?.mandatory_human_review) throw new Error("AI_HUMAN_REVIEW_POLICY_REQUIRED");
    if (!modelResult.data?.is_enabled) throw new Error("AI_MODEL_WORKFLOW_DISABLED");
    if (!promptResult.data?.is_enabled) throw new Error("AI_PROMPT_DISABLED");
    if (!modelResult.data.provider || modelResult.data.provider === "unconfigured") throw new Error("AI_PROVIDER_NOT_CONFIGURED");
    if (!modelResult.data.model || modelResult.data.model === "unconfigured") throw new Error("AI_MODEL_NOT_CONFIGURED");

    const runtime = await loadRuntime(adminClient, task.organization_id, null, modelResult.data.provider);
    if (runtime.status !== "active") throw new Error("AI_INTEGRATION_NOT_VALIDATED");
    const serializedInput = JSON.stringify(task.input_payload);
    if (serializedInput.length > 100_000) throw new Error("AI_TASK_INPUT_TOO_LARGE");

    await updateTaskProgress(adminClient, task, {
      status: "running",
      stage: "calling_provider",
      progress: 35,
    }, "progress", `正在调用 ${runtime.provider} / ${modelResult.data.model}`);

    const runResult = await adminClient.from("wpi_ai_gateway_runs").insert({
      organization_id: task.organization_id,
      integration_id: runtime.integration_id,
      execution_task_id: task.id,
      action: "execute",
      workflow_key: task.workflow_key,
      business_object_type: task.business_object_type || null,
      status: "running",
      provider: runtime.provider,
      model: modelResult.data.model,
      prompt_key: promptResult.data.template_key,
      prompt_version: promptResult.data.version,
      schema_version: "1.0",
      input_hash: await sha256(serializedInput),
      input_snapshot: task.input_payload,
      requires_human_review: true,
      requested_by: task.requested_by,
    }).select("id,request_id").single();
    if (runResult.error) throw runResult.error;
    gatewayRunId = String(runResult.data.id);

    const genericSchemaInstruction = `Return only one JSON object with this exact shape:
{"schemaVersion":"1.0","summary":"string","findings":[{"code":"string","title":"string","detail":"string","severity":"info|low|medium|high|critical"}],"recommendation":"string","confidence":0,"riskLevel":"low|medium|high|critical","requiresHumanReview":true,"reasonCodes":["string"],"suggestedAction":"review|request_info|retry|reject_candidate","generatedAt":"ISO-8601"}.
Never approve a price, supplier, inquiry, project cost or report. requiresHumanReview must be true. confidence must be 0-100.`;
    const inquiryLetterSchemaInstruction = `Return only one JSON object with this exact shape:
{"schemaVersion":"1.0","subject":"string","body":"complete inquiry letter body with paragraphs and line breaks","summary":"string","warnings":["string"],"missingFields":["string"],"confidence":0,"riskLevel":"low|medium|high|critical","requiresHumanReview":true,"reasonCodes":["string"],"suggestedAction":"review|request_info","generatedAt":"ISO-8601"}.
Write the complete professional inquiry letter in the requested language. Use only supplied facts; mark missing facts for manual completion. Do not claim the letter was sent and do not approve any supplier. requiresHumanReview must be true. confidence must be 0-100.`;
    const taskTemplate = task.input_payload.template && typeof task.input_payload.template === "object" && !Array.isArray(task.input_payload.template)
      ? task.input_payload.template as Record<string, unknown>
      : {};
    const reportOutline = Array.isArray(taskTemplate.outline)
      ? taskTemplate.outline.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
    const reportSchemaInstruction = `Return only one JSON object with this exact shape:
{"schemaVersion":"1.0","summary":"string","findings":[{"code":"string","title":"string","detail":"string","severity":"info|low|medium|high|critical"}],"recommendation":"string","confidence":0,"riskLevel":"low|medium|high|critical","requiresHumanReview":true,"reasonCodes":["string"],"suggestedAction":"review|request_info|retry|reject_candidate","chapters":[{"title":"exact template chapter title","summary":"chapter body, at least 10 characters","findings":["string"],"evidenceRefs":["business record identifier"]}],"generatedAt":"ISO-8601"}.
The chapters array must contain exactly ${reportOutline.length} chapters in this exact order: ${JSON.stringify(reportOutline)}. Never invent evidence identifiers. Use an empty evidenceRefs array when no source record supports a statement. Never approve or publish the report. requiresHumanReview must be true.`;
    const schemaInstruction = task.workflow_key === "inquiry_letter"
      ? inquiryLetterSchemaInstruction
      : task.workflow_key === "report_generation"
        ? reportSchemaInstruction
        : genericSchemaInstruction;
    const response = await callOpenAiCompatible({
      runtime,
      model: modelResult.data.model,
      systemPrompt: `${promptResult.data.content}\n\n${schemaInstruction}`,
      userPrompt: `Execute workflow ${task.workflow_key} for ${task.title}. Analyze only the supplied structured business input:\n${serializedInput}`,
      jsonMode: true,
    });

    await updateTaskProgress(adminClient, task, {
      status: "running",
      stage: "validating_output",
      progress: 75,
    }, "provider_completed", "模型响应已返回，正在校验结构、置信度和风险字段", {
      latencyMs: response.latencyMs,
      totalTokens: response.totalTokens,
    });

    let parsedOutput: Record<string, unknown>;
    try {
      parsedOutput = JSON.parse(stripJsonFence(response.content)) as Record<string, unknown>;
    } catch {
      throw new Error("AI_OUTPUT_INVALID_JSON");
    }
    const output = task.workflow_key === "inquiry_letter"
      ? validateInquiryLetterOutput(parsedOutput)
      : task.workflow_key === "report_generation"
        ? validateReportGenerationOutput(parsedOutput, reportOutline)
        : validateGenericTaskOutput(parsedOutput);
    const confidence = numeric(output.confidence);
    const riskLevel = String(output.riskLevel);

    await updateTaskProgress(adminClient, task, {
      status: "running",
      stage: "persisting_result",
      progress: 92,
    }, "output_validated", "结构化结果校验通过，正在写入任务账本和人工复核队列");

    const runUpdate = await adminClient.from("wpi_ai_gateway_runs").update({
      status: "needs_review",
      output_payload: output,
      confidence,
      risk_level: riskLevel,
      prompt_tokens: response.promptTokens,
      completion_tokens: response.completionTokens,
      total_tokens: response.totalTokens,
      estimated_cost_usd: estimatedCost(runtime.config ?? {}, response.promptTokens, response.completionTokens),
      latency_ms: response.latencyMs,
      http_status: response.httpStatus,
      completed_at: new Date().toISOString(),
    }).eq("id", gatewayRunId);
    if (runUpdate.error) throw runUpdate.error;

    await updateTaskProgress(adminClient, task, {
      status: "needs_review",
      stage: "awaiting_review",
      progress: 100,
      output_payload: output,
      confidence,
      risk_level: riskLevel,
      requires_human_review: true,
      completed_at: new Date().toISOString(),
    }, "needs_review", "AI任务已完成，必须由具备权限的人员确认后才能进入业务流程", {
      gatewayRunId,
      requestId: runResult.data.request_id,
    });

    await adminClient.from("wpi_notifications").upsert({
      organization_id: task.organization_id,
      recipient_id: task.requested_by,
      dedupe_key: `ai-task-review-${task.id}`,
      category: "ai",
      title: "AI任务等待人工复核",
      message: `${task.task_code} ${task.title} 已形成结构化结果，请完成复核。`,
      href: `/ai-workbench?task=${task.id}`,
      metadata: { taskId: task.id, workflowKey: task.workflow_key, riskLevel, confidence },
      created_by: task.requested_by,
    }, { onConflict: "organization_id,recipient_id,dedupe_key" });
  } catch (error) {
    const message = errorMessage(error);
    if (gatewayRunId) {
      await adminClient.from("wpi_ai_gateway_runs").update({
        status: "failed",
        error_code: message.split(":")[0].slice(0, 120),
        error_message: message.slice(0, 2000),
        completed_at: new Date().toISOString(),
      }).eq("id", gatewayRunId);
    }
    if (task && message !== "AI_TASK_CANCELLED") {
      await adminClient.from("wpi_ai_execution_tasks").update({
        status: "failed",
        stage: "failed",
        error_code: message.split(":")[0].slice(0, 120),
        error_message: message.slice(0, 4000),
        completed_at: new Date().toISOString(),
      }).eq("id", task.id).neq("status", "cancelled");
      await appendTaskEvent(adminClient, task, {
        eventType: "failed",
        status: "failed",
        stage: "failed",
        progress: task.progress,
        message: "AI执行失败，错误已留痕，可在配置修复后重试",
        payload: { errorCode: message.split(":")[0] },
      }).catch(() => undefined);
    }
  }
}

function schedulePersistedTask(
  adminClient: ReturnType<typeof createClient>,
  taskId: string,
) {
  const promise = processPersistedTask(adminClient, taskId);
  const runtime = (globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
  }).EdgeRuntime;
  if (runtime) runtime.waitUntil(promise);
  else void promise;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let gatewayRunId: string | null = null;
  let executionTask: PersistedTask | null = null;
  let adminClient: ReturnType<typeof createClient> | null = null;
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey = readNamedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const secretKey = readNamedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!url || !publishableKey || !secretKey || !token) return json({ error: "AI 网关服务配置不完整" }, 500);

    const body = await request.json().catch(() => ({})) as GatewayBody;
    const internalRequest = token === secretKey && (
      body.action === "recognize_equipment_document" ||
      body.action === "recognize_caid_price_report" ||
      body.action === "translate_price_leads"
    );

    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    adminClient = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = internalRequest
      ? { data: { user: null }, error: null }
      : await userClient.auth.getUser(token);
    if (!internalRequest && (authError || !authData.user)) return json({ error: "登录状态已失效" }, 401);
    const requesterId = internalRequest ? body.requestedBy?.trim() ?? "" : authData.user?.id ?? "";
    if (!requesterId) return json({ error: "缺少可信执行人" }, 401);
    const organizationId = body.organizationId?.trim() ?? "";
    const action = body.action ?? "execute_equipment_review";
    const membership = await adminClient
      .from("wpi_organization_members")
      .select("organization_id, role, is_active")
      .eq("organization_id", organizationId)
      .eq("user_id", requesterId)
      .eq("is_active", true)
      .maybeSingle();
    if (membership.error || !membership.data) return json({ error: "当前账号无权访问该组织" }, 403);
    const role = String(membership.data.role);

    if (action === "translate_price_leads") {
      if (!(await hasPermission(adminClient, organizationId, role, "price.write"))) {
        return json({ error: "当前角色没有价格名称翻译权限" }, 403);
      }
      const requestedLeadIds = Array.isArray(body.leadIds)
        ? body.leadIds.filter((id): id is string => typeof id === "string").slice(0, 20)
        : [];
      let leadQuery = adminClient
        .from("wpi_price_collection_leads")
        .select("id,name,specification,region,currency,supplier_name")
        .eq("organization_id", organizationId)
        .neq("price_validity_status", "invalid")
        .in("translation_status", ["queued", "failed"])
        .order("created_at", { ascending: true })
        .limit(20);
      if (body.taskId?.trim()) leadQuery = leadQuery.eq("task_id", body.taskId.trim());
      if (requestedLeadIds.length) leadQuery = leadQuery.in("id", requestedLeadIds);
      const leadResult = await leadQuery;
      if (leadResult.error) throw leadResult.error;
      const leads = leadResult.data ?? [];
      if (!leads.length) return json({ data: { translated: 0, items: [] } });

      const modelResult = await adminClient
        .from("wpi_ai_model_configs")
        .select("provider,model,is_enabled")
        .eq("organization_id", organizationId)
        .eq("workflow_key", "price_name_translation")
        .maybeSingle();
      if (modelResult.error) throw modelResult.error;
      if (!modelResult.data?.is_enabled || !modelResult.data.provider || modelResult.data.provider === "unconfigured") {
        return json({ error: "DeepSeek 翻译模型尚未启用" }, 409);
      }
      const runtime = await loadRuntime(adminClient, organizationId, null, modelResult.data.provider);
      if (runtime.status !== "active") return json({ error: "DeepSeek Provider 尚未通过连接验证" }, 409);

      const leadIds = leads.map((lead) => lead.id);
      await adminClient.from("wpi_price_collection_leads").update({
        translation_status: "running",
        translation_provider: runtime.provider,
        translation_model: modelResult.data.model,
      }).in("id", leadIds);

      try {
        const aiResult = await callOpenAiCompatible({
          runtime,
          model: modelResult.data.model,
          jsonMode: true,
          systemPrompt: `你是工程采购价格库的中英法名称与规格标准化助手。把设备或地材名称和规格准确翻译为简体中文，品牌、型号、牌号、标准号、计量单位不得改写，不得补造原文没有的信息。强制工程材料术语规则：BARRE DE FER 翻译为“钢筋”；PIECE BARRE DE N、BARRE DE N 或 FER DE N 中的 N 表示钢筋直径 N mm，规格统一写作“钢筋 · ΦN mm · 按根”，绝不解释为长度 N m；原文含“省级均价”时保留该口径。仅当原文明示 mètre、m 或 longueur 时才可翻译长度，未提供长度或钢筋牌号时必须分别在 warnings 标注“长度未注明”“钢筋牌号未注明”。每条必须给出 0-100 置信度、low/medium/high/critical 风险和简短风险提示。所有结果都必须进入人工审核，不得替代最终商务判断。仅返回 JSON 对象：{"items":[{"id":"原ID","translatedName":"中文名称","translatedSpecification":"中文规格","confidence":0,"riskLevel":"low|medium|high|critical","warnings":[""]}]}`,
          userPrompt: JSON.stringify({ items: leads }),
        });
        const parsed = JSON.parse(stripJsonFence(aiResult.content)) as Record<string, unknown>;
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const byId = new Map(items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)).map((item) => [String(item.id), item]));
        const updated: Array<Record<string, unknown>> = [];
        for (const lead of leads) {
          const item = byId.get(lead.id);
          const translatedName = typeof item?.translatedName === "string" ? item.translatedName.trim() : "";
          const translatedSpecification = typeof item?.translatedSpecification === "string" ? item.translatedSpecification.trim() : "";
          const confidence = Math.max(0, Math.min(100, numeric(item?.confidence, 0)));
          const riskLevel = ["low", "medium", "high", "critical"].includes(String(item?.riskLevel))
            ? String(item?.riskLevel)
            : confidence >= 85 ? "low" : confidence >= 70 ? "medium" : "high";
          const warnings = Array.isArray(item?.warnings)
            ? item.warnings.filter((warning): warning is string => typeof warning === "string").slice(0, 5)
            : [];
          const valid = Boolean(translatedName);
          const translationStatus = valid && confidence >= 85 && riskLevel === "low" ? "completed" : valid ? "needs_review" : "failed";
          const payload = {
            original_name: lead.name,
            original_specification: lead.specification,
            translated_name: translatedName || null,
            translated_specification: translatedSpecification || null,
            translation_status: translationStatus,
            translation_confidence: confidence,
            translation_risk_level: riskLevel,
            translation_review_status: "pending_review",
            translation_metadata: {
              warnings,
              requiresHumanReview: true,
              latencyMs: aiResult.latencyMs,
              totalTokens: aiResult.totalTokens,
            },
          };
          const updateResult = await adminClient.from("wpi_price_collection_leads").update(payload).eq("id", lead.id);
          if (updateResult.error) throw updateResult.error;
          updated.push({ id: lead.id, ...payload });
        }
        return json({ data: { translated: updated.length, items: updated } });
      } catch (error) {
        await adminClient.from("wpi_price_collection_leads").update({
          translation_status: "failed",
          translation_risk_level: "high",
          translation_metadata: { error: errorMessage(error), requiresHumanReview: true },
        }).in("id", leadIds);
        throw error;
      }
    }

    if (action === "recognize_equipment_document") {
      if (!(await hasPermission(adminClient, organizationId, role, "price.write"))) {
        return json({ error: "当前角色没有设备文档识别权限" }, 403);
      }
      const sourceUrl = body.sourceUrl?.trim() ?? "";
      const fileName = body.fileName?.trim().slice(0, 300) ?? "";
      const mimeType = body.mimeType?.trim().toLowerCase() ?? "";
      if (!sourceUrl.startsWith("https://") || !fileName) return json({ error: "设备文档参数不完整" }, 400);
      if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
        return json({ error: "设备资料识别仅支持 PDF、PNG、JPEG 或 WEBP" }, 400);
      }

      const modelResult = await adminClient.from("wpi_ai_model_configs")
        .select("provider,model,is_enabled")
        .eq("organization_id", organizationId)
        .eq("workflow_key", "quote_recognition")
        .maybeSingle();
      if (modelResult.error) throw modelResult.error;
      if (!modelResult.data?.is_enabled) return json({ error: "文档视觉模型已停用" }, 409);
      if (!modelResult.data.provider || modelResult.data.provider === "unconfigured") {
        return json({ error: "请先配置具备 PDF 视觉能力的 Provider" }, 409);
      }
      const runtime = await loadRuntime(adminClient, organizationId, null, modelResult.data.provider);
      if (runtime.status !== "active") return json({ error: "文档识别 Provider 尚未通过连接验证" }, 409);
      if (!runtime.endpoint_url) return json({ error: "文档识别 Provider 缺少 API 端点" }, 409);
      const endpointHost = new URL(runtime.endpoint_url).hostname.toLowerCase();
      const supportsOpenAiVision = runtime.provider.toLowerCase() === "openai" || endpointHost.endsWith("openai.com");
      if (mimeType !== "application/pdf" && !supportsOpenAiVision) {
        return json({ error: "图片或扫描件需要配置视觉/OCR Provider", code: "AI_PROVIDER_CAPABILITY_MISSING" }, 409);
      }

      const schemaPrompt = `你是水厂工程设备技术资料解析器。读取文件 ${fileName}，提取设备身份、性能、结构、材质密封、电气驱动、尺寸和文档标准参数。不得猜测不可见内容。
仅返回 JSON 对象：
{"schemaVersion":"1.0","document":{"title":"","pageCount":1,"equipmentName":"","brand":"","model":""},"parameters":[{"code":"","name":"参数中文名称","group":"performance|construction|materials|electrical|dimensions|documents|other","value":"原始值","normalizedValue":"标准化值","unit":"","confidence":0,"riskLevel":"low|medium|high|critical","source":{"pageNumber":1,"text":"包含参数和值的原文","confidence":0,"bbox":{"x":0,"y":0,"width":1,"height":0.05}}}],"overallConfidence":0,"riskLevel":"low|medium|high|critical","warnings":[]}。
bbox 使用页面左上角为原点的 0..1 坐标，必须覆盖参数原文。PDF 使用真实页码。相同参数只保留最明确的一条；型号变体参数不得混入当前型号。所有候选必须人工审核，不得直接写入正式设备参数。`;
      const pdfSchemaPrompt = `${schemaPrompt}
当前输入是已抽取的 PDF 页级文本。最多返回 30 条对当前型号最重要、证据最明确的参数；source.text 必须是同页不超过 120 个字符的原文片段。bbox 可省略，系统会依据原文在页面文本中的位置补齐。`;

      const runResult = await adminClient.from("wpi_ai_gateway_runs").insert({
        organization_id: organizationId,
        integration_id: runtime.integration_id,
        action: "recognize_equipment_document",
        workflow_key: "quote_recognition",
        business_object_type: "equipment_catalog_document",
        business_object_id: body.businessObjectId?.trim() || null,
        status: "running",
        provider: runtime.provider,
        model: modelResult.data.model,
        prompt_key: "equipment_document_vision_v1",
        prompt_version: "1.0",
        schema_version: "1.0",
        input_hash: await sha256(JSON.stringify({ fileName, mimeType, businessObjectId: body.businessObjectId })),
        input_snapshot: { fileName, mimeType, businessObjectId: body.businessObjectId ?? null },
        requires_human_review: true,
        requested_by: requesterId,
        started_at: new Date().toISOString(),
      }).select("id,request_id").single();
      if (runResult.error) throw runResult.error;
      gatewayRunId = String(runResult.data.id);
      try {
        const pdfEvidence = mimeType === "application/pdf" && !supportsOpenAiVision
          ? await extractPdfEvidence(sourceUrl)
          : null;
        const providerResponse = pdfEvidence
          ? await callOpenAiCompatible({
              runtime,
              model: modelResult.data.model,
              systemPrompt: pdfSchemaPrompt,
              userPrompt: `请从以下 PDF 页级文本中提取参数。source.pageNumber 必须使用页码，source.text 必须逐字引用同页原文，不得改写。\n\n${pdfEvidence.pages.map((page) => `--- 第 ${page.pageNumber} 页 ---\n${page.text}`).join("\n\n").slice(0, 24_000)}`,
              jsonMode: true,
            })
          : await callOpenAiDocumentRecognition({
              runtime,
              model: modelResult.data.model,
              fileName,
              mimeType,
              sourceUrl,
              prompt: schemaPrompt,
            });
        const rawOutput = JSON.parse(stripJsonFence(providerResponse.content));
        const output = validateEquipmentDocumentOutput(pdfEvidence ? attachPdfEvidence(rawOutput, pdfEvidence) : rawOutput);
        const updateResult = await adminClient.from("wpi_ai_gateway_runs").update({
          status: "needs_review",
          output_payload: output,
          confidence: output.overallConfidence,
          risk_level: output.riskLevel,
          prompt_tokens: providerResponse.promptTokens,
          completion_tokens: providerResponse.completionTokens,
          total_tokens: providerResponse.totalTokens,
          estimated_cost_usd: estimatedCost(runtime.config ?? {}, providerResponse.promptTokens, providerResponse.completionTokens),
          latency_ms: providerResponse.latencyMs,
          http_status: providerResponse.httpStatus,
          completed_at: new Date().toISOString(),
        }).eq("id", gatewayRunId);
        if (updateResult.error) throw updateResult.error;
        return json({ data: output, provider: runtime.provider, model: modelResult.data.model, gatewayRunId, requestId: runResult.data.request_id });
      } catch (error) {
        const message = errorMessage(error);
        await adminClient.from("wpi_ai_gateway_runs").update({
          status: "failed", error_code: message.split(":")[0].slice(0, 120),
          error_message: message.slice(0, 2000), completed_at: new Date().toISOString(),
        }).eq("id", gatewayRunId);
        gatewayRunId = null;
        throw error;
      }
    }

    if (action === "recognize_quote_document" || action === "recognize_caid_price_report") {
      const isCaidReport = action === "recognize_caid_price_report";
      if (!(await hasPermission(adminClient, organizationId, role, "price.write"))) {
        return json({ error: isCaidReport ? "当前角色没有价格月报识别权限" : "当前角色没有报价文档识别权限" }, 403);
      }
      const sourceUrl = body.sourceUrl?.trim() ?? "";
      const fileName = body.fileName?.trim().slice(0, 300) ?? "";
      const mimeType = body.mimeType?.trim().toLowerCase() ?? "";
      if (!sourceUrl.startsWith("https://") || !fileName) return json({ error: "报价源文件参数不完整" }, 400);
      const supportedMimeTypes = isCaidReport
        ? [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
          ]
        : ["application/pdf", "image/png", "image/jpeg", "image/webp"];
      if (!supportedMimeTypes.includes(mimeType)) {
        return json({ error: isCaidReport ? "CAID 月报解析仅支持 PDF、XLS 或 XLSX" : "该识别动作仅支持 PDF、PNG、JPEG 或 WEBP" }, 400);
      }

      const modelResult = await adminClient
        .from("wpi_ai_model_configs")
        .select("provider,model,is_enabled")
        .eq("organization_id", organizationId)
        .eq("workflow_key", "quote_recognition")
        .maybeSingle();
      if (modelResult.error) throw modelResult.error;
      if (!modelResult.data?.is_enabled) return json({ error: "报价识别模型已停用" }, 409);
      if (!modelResult.data.provider || modelResult.data.provider === "unconfigured") {
        return json({ error: "请先配置报价识别 Provider" }, 409);
      }
      const runtime = await loadRuntime(adminClient, organizationId, null, modelResult.data.provider);
      if (runtime.status !== "active") return json({ error: "报价识别 Provider 尚未通过连接验证" }, 409);
      if (!runtime.endpoint_url) return json({ error: "报价识别 Provider 缺少 API 端点" }, 409);
      const endpointHost = new URL(runtime.endpoint_url).hostname.toLowerCase();
      const supportsOpenAiDocumentInput = runtime.provider.toLowerCase() === "openai" || endpointHost.endsWith("openai.com");
      if (!isCaidReport && !supportsOpenAiDocumentInput) {
        return json({
          error: `当前 ${runtime.provider} 集成未声明 PDF/图片视觉能力，请为报价识别工作流选择 OpenAI 视觉模型`,
          code: "AI_PROVIDER_CAPABILITY_MISSING",
        }, 409);
      }

      const caidInput = body.input && typeof body.input === "object" ? body.input : {};
      const schemaPrompt = isCaidReport
        ? `你是刚果（金）CAID LOKOLE 官方月度价格报告解析器。读取文件 ${fileName}，只提取真实可见、带数值价格的工程地材行，不得猜测、插值或把指数当成价格。

本次采集范围：品类关键词=${String(caidInput.keyword ?? "全部地材")}；规格要求=${String(caidInput.specification ?? "未限定")}；目标地区=${String(caidInput.region ?? "DRC")}。只返回与品类关键词同义的项目，例如钢筋对应 BARRE DE FER、FER A BETON、ACIER；水泥对应 CIMENT。若报告同时列出多个省份、规格或月份，每个“品名+规格+地区+月份”必须单独一行，不得合并为均价。

日期规则：document.quoteDate 和每条 item.quoteDate 必须表示该价格所属统计月份，统一为 YYYY-MM-01；不能使用网页发布时间、采集时间或文件下载时间替代。无法确认所属月份时留空，并在 missingFields 写 quoteDate。币种和单位必须按原文保留；价格为数值，千位分隔符不得当作小数点。

名称与规格规则：itemName 保留报告原文名称；specification 保留直径、强度等级、包装、厚度等原始规格。BARRE DE FER / FER A BETON 的数字若表示直径，规格写作 ΦN mm；没有明示长度、牌号或标准时不得补造。

仅返回 JSON 对象，不要 Markdown。结构必须为：

{"schemaVersion":"2.0","document":{"supplierName":"CAID LOKOLE","quoteNumber":"","quoteDate":"YYYY-MM-01","validUntil":"","currency":"CDF","totalAmount":0,"pageCount":1,"reportTitle":"","reportPeriod":"YYYY-MM"},"items":[{"lineNumber":1,"itemType":"material","itemCode":"","itemName":"原文名称","brand":"","specification":"原文规格","category":"","unit":"原文单位","quantity":1,"unitPrice":0,"totalPrice":0,"currency":"CDF","region":"省/城市","quoteDate":"YYYY-MM-01","priceCondition":"月度市场价格","supplierName":"CAID LOKOLE","confidence":0,"riskLevel":"low|medium|high|critical","missingFields":["field"],"source":{"pageNumber":1,"text":"包含品名、规格、地区、月份、价格和单位的原文行","confidence":0,"bbox":{"x":0,"y":0,"width":1,"height":0.05}}}],"overallConfidence":0,"riskLevel":"low|medium|high|critical","missingFields":["field"]}。

bbox 使用页面左上角为原点的 0..1 归一化坐标；Excel 可用整行近似框。所有结果必须进入人工审核，AI 不得直接批准或正式入库。`
        : `你是水厂工程报价文档识别器。读取文件 ${fileName}，提取真实可见的报价行项目，不得猜测不可见字段。\n
仅返回 JSON 对象，不要 Markdown。结构必须为：\n
{"schemaVersion":"2.0","document":{"supplierName":"","quoteNumber":"","quoteDate":"","validUntil":"","currency":"CNY","totalAmount":0,"pageCount":1},"items":[{"lineNumber":1,"itemType":"equipment|material","itemCode":"","itemName":"","brand":"","specification":"","category":"","unit":"","quantity":1,"unitPrice":0,"totalPrice":0,"currency":"CNY","region":"","priceCondition":"","supplierName":"","confidence":0,"riskLevel":"low|medium|high|critical","missingFields":["field"],"source":{"pageNumber":1,"text":"原文行","confidence":0,"bbox":{"x":0,"y":0,"width":1,"height":0.05}}}],"overallConfidence":0,"riskLevel":"low|medium|high|critical","missingFields":["field"]}.\n
bbox 使用页面左上角为原点的 0..1 归一化坐标，必须覆盖该行原文。图片 pageNumber 固定为 1；PDF 使用真实页码。每个项目必须保留 source.text、pageNumber、bbox 和证据置信度。材料包括钢筋、水泥、砂石、管材、电缆等，其余默认设备。所有结果必须人工复核，AI不得直接批准或入库。`;

      const startedAt = new Date().toISOString();
      const runResult = await adminClient.from("wpi_ai_gateway_runs").insert({
        organization_id: organizationId,
        integration_id: runtime.integration_id,
        action: "recognize_quote_document",
        workflow_key: "quote_recognition",
        business_object_type: isCaidReport ? "caid_price_report" : "quote_document",
        business_object_id: body.businessObjectId?.trim() || null,
        status: "running",
        provider: runtime.provider,
        model: modelResult.data.model,
        prompt_key: isCaidReport ? "caid_price_report_v1" : "quote_document_vision_v2",
        prompt_version: "2.0",
        schema_version: "2.0",
        input_hash: await sha256(JSON.stringify({ fileName, mimeType, businessObjectId: body.businessObjectId })),
        input_snapshot: { fileName, mimeType, businessObjectId: body.businessObjectId ?? null },
        requires_human_review: true,
        requested_by: requesterId,
        started_at: startedAt,
      }).select("id,request_id").single();
      if (runResult.error) throw runResult.error;
      gatewayRunId = String(runResult.data.id);
      try {
        const pdfEvidence = isCaidReport && !supportsOpenAiDocumentInput && mimeType === "application/pdf"
          ? await extractPdfEvidence(sourceUrl)
          : null;
        const spreadsheet = isCaidReport && !supportsOpenAiDocumentInput && mimeType !== "application/pdf"
          ? await extractSpreadsheetText(sourceUrl)
          : null;
        const providerResponse = pdfEvidence || spreadsheet
          ? await callOpenAiCompatible({
              runtime,
              model: modelResult.data.model,
              jsonMode: true,
              systemPrompt: schemaPrompt,
              userPrompt: pdfEvidence
                ? pdfEvidence.pages.map((page) => `### PAGE ${page.pageNumber}\n${page.text}`).join("\n\n")
                : filterCaidSpreadsheetText(spreadsheet?.content || "", caidInput.keyword),
            })
          : await callOpenAiDocumentRecognition({
              runtime,
              model: modelResult.data.model,
              fileName,
              mimeType,
              sourceUrl,
              prompt: schemaPrompt,
            });
        const parsed = JSON.parse(stripJsonFence(providerResponse.content)) as Record<string, unknown>;
        const evidenced = (pdfEvidence ? attachQuotePdfEvidence(parsed, pdfEvidence) : parsed) as Record<string, unknown>;
        if (spreadsheet?.truncated) {
          const missing = Array.isArray(evidenced.missingFields) ? evidenced.missingFields : [];
          evidenced.missingFields = [...missing, "spreadsheet_truncated"];
        }
        const output = validateQuoteDocumentOutput(evidenced);
        const updateResult = await adminClient.from("wpi_ai_gateway_runs").update({
          status: "needs_review",
          output_payload: output,
          confidence: output.overallConfidence,
          risk_level: output.riskLevel,
          prompt_tokens: providerResponse.promptTokens,
          completion_tokens: providerResponse.completionTokens,
          total_tokens: providerResponse.totalTokens,
          estimated_cost_usd: estimatedCost(runtime.config ?? {}, providerResponse.promptTokens, providerResponse.completionTokens),
          latency_ms: providerResponse.latencyMs,
          http_status: providerResponse.httpStatus,
          completed_at: new Date().toISOString(),
        }).eq("id", gatewayRunId);
        if (updateResult.error) throw updateResult.error;
        return json({
          data: output,
          provider: runtime.provider,
          model: modelResult.data.model,
          gatewayRunId,
          requestId: runResult.data.request_id,
          usage: {
            promptTokens: providerResponse.promptTokens,
            completionTokens: providerResponse.completionTokens,
            totalTokens: providerResponse.totalTokens,
          },
        });
      } catch (error) {
        const message = errorMessage(error);
        await adminClient.from("wpi_ai_gateway_runs").update({
          status: "failed",
          error_code: message.split(":")[0].slice(0, 120),
          error_message: message.slice(0, 2000),
          completed_at: new Date().toISOString(),
        }).eq("id", gatewayRunId);
        gatewayRunId = null;
        throw error;
      }
    }

    if (action === "enqueue_task") {
      if (!isWorkflowKey(body.workflowKey)) return json({ error: "不支持的 AI 工作流" }, 400);
      const mapping = workflowRuntime[body.workflowKey];
      if (!(await hasPermission(adminClient, organizationId, role, mapping.executePermission))) {
        return json({ error: "当前角色没有创建该 AI 任务的权限" }, 403);
      }
      if (!body.title?.trim() || body.title.trim().length > 160) {
        return json({ error: "任务标题不能为空且不能超过 160 个字符" }, 400);
      }
      if (!body.input || typeof body.input !== "object" || Array.isArray(body.input)) {
        return json({ error: "AI任务必须包含结构化输入" }, 400);
      }
      if (JSON.stringify(body.input).length > 100_000) return json({ error: "AI任务输入超过 100KB 限制" }, 413);
      if (body.businessHref && !body.businessHref.startsWith("/")) {
        return json({ error: "业务跳转地址必须是系统内部路径" }, 400);
      }
      try {
        await assertWorkflowReady(adminClient, organizationId, body.workflowKey);
      } catch (error) {
        return json({
          error: "当前 AI 工作流尚未通过运行校验，请先检查模型、提示词和 Provider 配置",
          code: errorMessage(error).split(":")[0],
        }, 409);
      }
      if (body.idempotencyKey) {
        const existing = await adminClient
          .from("wpi_ai_execution_tasks")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("idempotency_key", body.idempotencyKey)
          .maybeSingle();
        if (existing.error) throw existing.error;
        if (existing.data) return json({ data: existing.data, reused: true }, 200);
      }
      const created = await adminClient.from("wpi_ai_execution_tasks").insert({
        organization_id: organizationId,
        workflow_key: body.workflowKey,
        title: body.title.trim(),
        source_label: body.sourceLabel?.trim().slice(0, 300) ?? "",
        business_object_type: body.businessObjectType?.trim().slice(0, 80) ?? "",
        business_object_id: body.businessObjectId?.trim() || null,
        business_href: body.businessHref?.trim() || null,
        input_payload: body.input,
        idempotency_key: body.idempotencyKey?.trim() || null,
        requested_by: requesterId,
        requires_human_review: true,
      }).select("*").single();
      if (created.error) throw created.error;
      const task = created.data as PersistedTask;
      await appendTaskEvent(adminClient, task, {
        eventType: "created",
        status: "queued",
        stage: "accepted",
        progress: 0,
        message: "任务已进入 AI 执行网关队列",
        actorType: "user",
        actorUserId: requesterId,
      });
      schedulePersistedTask(adminClient, task.id);
      return json({ data: created.data, queued: true }, 202);
    }

    if (action === "retry_task" || action === "cancel_task" || action === "review_task") {
      if (!body.executionTaskId) return json({ error: "缺少 AI 任务 ID" }, 400);
      const taskResult = await adminClient
        .from("wpi_ai_execution_tasks")
        .select("*")
        .eq("id", body.executionTaskId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (taskResult.error) throw taskResult.error;
      const task = taskResult.data as PersistedTask | null;
      if (!task) return json({ error: "AI任务不存在" }, 404);
      const mapping = workflowRuntime[task.workflow_key];
      const permission = action === "review_task" ? mapping.reviewPermission : mapping.executePermission;
      if (!(await hasPermission(adminClient, organizationId, role, permission))) {
        return json({ error: action === "review_task" ? "当前角色没有复核该 AI 任务的权限" : "当前角色没有操作该 AI 任务的权限" }, 403);
      }

      if (action === "retry_task") {
        if (task.status !== "failed") return json({ error: "只有失败任务可以重新执行" }, 409);
        if (task.attempt_count >= task.max_attempts) return json({ error: "任务已达到最大重试次数" }, 409);
        const retried = await adminClient.from("wpi_ai_execution_tasks").update({
          status: "queued",
          stage: "accepted",
          progress: 0,
          output_payload: null,
          confidence: null,
          risk_level: null,
          error_code: null,
          error_message: null,
          completed_at: null,
        }).eq("id", task.id).select("*").single();
        if (retried.error) throw retried.error;
        await appendTaskEvent(adminClient, task, {
          eventType: "retry_queued",
          status: "queued",
          stage: "accepted",
          progress: 0,
          message: `人工发起第 ${task.attempt_count + 1} 次执行`,
          actorType: "user",
          actorUserId: requesterId,
        });
        schedulePersistedTask(adminClient, task.id);
        return json({ data: retried.data, queued: true }, 202);
      }

      if (action === "cancel_task") {
        if (!["queued", "running", "failed"].includes(task.status)) {
          return json({ error: "当前任务状态不能取消" }, 409);
        }
        const cancelled = await adminClient.from("wpi_ai_execution_tasks").update({
          status: "cancelled",
          stage: "cancelled",
          completed_at: new Date().toISOString(),
        }).eq("id", task.id).select("*").single();
        if (cancelled.error) throw cancelled.error;
        await appendTaskEvent(adminClient, task, {
          eventType: "cancelled",
          status: "cancelled",
          stage: "cancelled",
          progress: task.progress,
          message: "任务已由人工取消",
          actorType: "user",
          actorUserId: requesterId,
        });
        return json({ data: cancelled.data });
      }

      if (task.status !== "needs_review") return json({ error: "只有待人工复核任务可以提交结论" }, 409);
      if (!body.decision || !["approved", "request_changes", "rejected"].includes(body.decision)) {
        return json({ error: "请选择有效的人工复核结论" }, 400);
      }
      const note = body.reviewNote?.trim() ?? "";
      if (body.decision !== "approved" && note.length < 5) {
        return json({ error: "要求修改或驳回时，请填写至少 5 个字符的复核意见" }, 400);
      }
      const nextStatus = body.decision === "approved" ? "completed" : body.decision === "rejected" ? "cancelled" : "queued";
      const nextStage = body.decision === "approved" ? "completed" : body.decision === "rejected" ? "cancelled" : "accepted";
      const nextProgress = body.decision === "request_changes" ? 0 : 100;
      const reviewed = await adminClient.from("wpi_ai_execution_tasks").update({
        status: nextStatus,
        stage: nextStage,
        progress: nextProgress,
        review_decision: body.decision,
        review_note: note || "人工确认 AI 输出可进入下一步业务判断",
        reviewed_by: requesterId,
        reviewed_at: new Date().toISOString(),
        completed_at: body.decision === "request_changes" ? null : new Date().toISOString(),
        error_code: null,
        error_message: null,
      }).eq("id", task.id).select("*").single();
      if (reviewed.error) throw reviewed.error;
      await appendTaskEvent(adminClient, task, {
        eventType: "reviewed",
        status: nextStatus,
        stage: nextStage,
        progress: nextProgress,
        message: body.decision === "approved" ? "人工已确认 AI 输出" : body.decision === "rejected" ? "人工已驳回 AI 输出" : "人工要求修改，任务已重新排队",
        payload: { decision: body.decision, note },
        actorType: "user",
        actorUserId: requesterId,
      });
      await adminClient.from("wpi_notifications").update({ is_read: true, read_at: new Date().toISOString() })
        .eq("organization_id", organizationId)
        .eq("recipient_id", task.requested_by)
        .eq("dedupe_key", `ai-task-review-${task.id}`);
      if (body.decision === "request_changes") schedulePersistedTask(adminClient, task.id);
      return json({ data: reviewed.data, queued: body.decision === "request_changes" }, body.decision === "request_changes" ? 202 : 200);
    }

    const requiredPermission = action === "validate_integration" ? "settings.manage" : "price.review";
    if (!(await hasPermission(adminClient, organizationId, role, requiredPermission))) {
      return json({ error: "当前角色没有执行该 AI 操作的权限" }, 403);
    }

    if (action === "validate_integration") {
      if (!body.integrationId) return json({ error: "缺少 AI 集成 ID" }, 400);
      const runtime = await loadRuntime(adminClient, organizationId, body.integrationId, null);
      const model = typeof runtime.config?.model === "string" ? runtime.config.model : "";
      if (!model) throw new Error("AI_MODEL_NOT_CONFIGURED");
      const run = await adminClient.from("wpi_ai_gateway_runs").insert({
        organization_id: organizationId,
        integration_id: runtime.integration_id,
        action: "validate",
        workflow_key: "provider_connection_test",
        status: "running",
        provider: runtime.provider,
        model,
        input_snapshot: { integrationCode: runtime.integration_code },
        requires_human_review: false,
        requested_by: requesterId,
      }).select("id, request_id").single();
      if (run.error) throw run.error;
      gatewayRunId = String(run.data.id);
      const response = await callOpenAiCompatible({
        runtime,
        model,
        systemPrompt: "You are a connectivity probe. Follow the user instruction exactly.",
        userPrompt: "Reply with exactly: WPI_AI_GATEWAY_OK",
        jsonMode: false,
      });
      const ok = response.content.trim().includes("WPI_AI_GATEWAY_OK");
      if (!ok) throw new Error("AI_PROVIDER_UNEXPECTED_VALIDATION_OUTPUT");
      await adminClient.from("wpi_ai_gateway_runs").update({
        status: "completed",
        output_payload: { validated: true },
        prompt_tokens: response.promptTokens,
        completion_tokens: response.completionTokens,
        total_tokens: response.totalTokens,
        estimated_cost_usd: estimatedCost(runtime.config ?? {}, response.promptTokens, response.completionTokens),
        latency_ms: response.latencyMs,
        http_status: response.httpStatus,
        completed_at: new Date().toISOString(),
      }).eq("id", gatewayRunId);
      return json({ ok: true, requestId: run.data.request_id, latencyMs: response.latencyMs, model });
    }

    if (!body.businessRunId || !body.input || typeof body.input !== "object") {
      return json({ error: "AI 审核请求缺少业务运行 ID 或结构化输入" }, 400);
    }
    const serializedInput = JSON.stringify(body.input);
    if (serializedInput.length > 100_000) return json({ error: "AI 审核输入超过 100KB 限制" }, 413);

    if (body.executionTaskId) {
      const taskResult = await adminClient.from("wpi_ai_execution_tasks").select("*")
        .eq("organization_id", organizationId).eq("id", body.executionTaskId).maybeSingle();
      if (taskResult.error) throw taskResult.error;
      executionTask = taskResult.data as PersistedTask | null;
    }
    if (!executionTask) {
      const equipment = body.input.equipment && typeof body.input.equipment === "object"
        ? body.input.equipment as Record<string, unknown>
        : {};
      const reviewId = typeof body.input.reviewId === "string" ? body.input.reviewId : null;
      const createdTask = await adminClient.from("wpi_ai_execution_tasks").insert({
        organization_id: organizationId,
        workflow_key: "equipment_price_pre_review",
        title: `${typeof equipment.name === "string" ? equipment.name : "设备价格"} AI预审`,
        source_label: typeof equipment.code === "string" ? equipment.code : "设备审核队列",
        business_object_type: "equipment_review",
        business_object_id: reviewId,
        business_href: reviewId ? `/equipment-prices/reviews#task=${encodeURIComponent(reviewId)}` : "/equipment-prices/reviews",
        input_payload: body.input,
        idempotency_key: `equipment-review-run-${body.businessRunId}`,
        requested_by: requesterId,
        requires_human_review: true,
      }).select("*").single();
      if (createdTask.error) throw createdTask.error;
      executionTask = createdTask.data as PersistedTask;
      await appendTaskEvent(adminClient, executionTask, {
        eventType: "created",
        status: "queued",
        stage: "accepted",
        progress: 0,
        message: "设备价格预审任务已进入 AI 执行网关",
        actorType: "user",
        actorUserId: requesterId,
      });
    }
    await updateTaskProgress(adminClient, executionTask, {
      status: "running",
      stage: "loading_config",
      progress: 15,
      attempt_count: executionTask.attempt_count + 1,
      started_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    }, "started", "正在加载设备价格预审模型、提示词和人工复核规则");

    const [settingsResult, modelResult, promptResult] = await Promise.all([
      adminClient.from("wpi_ai_settings").select("mandatory_human_review").eq("organization_id", organizationId).maybeSingle(),
      adminClient.from("wpi_ai_model_configs").select("provider, model, threshold, is_enabled").eq("organization_id", organizationId).eq("workflow_key", "comparison_advice").maybeSingle(),
      adminClient.from("wpi_ai_prompt_templates").select("template_key, version, content, is_enabled").eq("organization_id", organizationId).eq("template_key", "risk_assessment").maybeSingle(),
    ]);
    const configError = settingsResult.error || modelResult.error || promptResult.error;
    if (configError) throw configError;
    if (!settingsResult.data?.mandatory_human_review) throw new Error("AI_HUMAN_REVIEW_POLICY_REQUIRED");
    if (!modelResult.data?.is_enabled) throw new Error("AI_MODEL_WORKFLOW_DISABLED");
    if (!promptResult.data?.is_enabled) throw new Error("AI_PROMPT_DISABLED");
    if (!modelResult.data.provider || modelResult.data.provider === "unconfigured") throw new Error("AI_PROVIDER_NOT_CONFIGURED");
    if (!modelResult.data.model || modelResult.data.model === "unconfigured") throw new Error("AI_MODEL_NOT_CONFIGURED");

    const runtime = await loadRuntime(adminClient, organizationId, null, modelResult.data.provider);
    if (runtime.status !== "active") throw new Error("AI_INTEGRATION_NOT_VALIDATED");
    const inputHash = await sha256(serializedInput);
    await updateTaskProgress(adminClient, executionTask, {
      status: "running",
      stage: "calling_provider",
      progress: 35,
    }, "progress", `正在调用 ${runtime.provider} / ${modelResult.data.model}`);
    const run = await adminClient.from("wpi_ai_gateway_runs").insert({
      organization_id: organizationId,
      integration_id: runtime.integration_id,
      execution_task_id: executionTask.id,
      action: "execute",
      workflow_key: "equipment_price_pre_review",
      business_object_type: "equipment_review",
      business_object_id: typeof body.input.reviewId === "string" ? body.input.reviewId : null,
      business_run_id: body.businessRunId,
      status: "running",
      provider: runtime.provider,
      model: modelResult.data.model,
      prompt_key: promptResult.data.template_key,
      prompt_version: promptResult.data.version,
      schema_version: "1.0",
      input_hash: inputHash,
      input_snapshot: body.input,
      requires_human_review: true,
      requested_by: requesterId,
    }).select("id, request_id").single();
    if (run.error) throw run.error;
    gatewayRunId = String(run.data.id);

    const schemaInstruction = `Return only one JSON object with this exact shape:
{"schemaVersion":"1.0","judgment":"string","recommendation":"string","confidence":0,"riskLevel":"low|medium|high|critical","requiresHumanReview":true,"missingFields":["string"],"matchedRules":["string"],"evidenceFindings":[{"key":"string","status":"verified|problem|missing","reason":"string"}],"reasonCodes":["string"],"suggestedDecision":"review|request_info|reject_candidate","generatedAt":"ISO-8601"}.
Never approve a price. requiresHumanReview must be true. confidence must be 0-100.`;
    const response = await callOpenAiCompatible({
      runtime,
      model: modelResult.data.model,
      systemPrompt: `${promptResult.data.content}\n\n${schemaInstruction}`,
      userPrompt: `Analyze this equipment price review input:\n${serializedInput}`,
      jsonMode: true,
    });
    await updateTaskProgress(adminClient, executionTask, {
      status: "running",
      stage: "validating_output",
      progress: 78,
    }, "provider_completed", "模型响应已返回，正在校验设备审核结构和风险结论", {
      latencyMs: response.latencyMs,
      totalTokens: response.totalTokens,
    });
    let parsedOutput: Record<string, unknown>;
    try {
      parsedOutput = JSON.parse(stripJsonFence(response.content)) as Record<string, unknown>;
    } catch {
      throw new Error("AI_OUTPUT_INVALID_JSON");
    }
    const output = validateEquipmentReviewOutput(parsedOutput);
    const confidence = numeric(output.confidence);
    const risk = typeof output.riskLevel === "string" ? output.riskLevel : null;
    await adminClient.from("wpi_ai_gateway_runs").update({
      status: "needs_review",
      output_payload: output,
      confidence,
      risk_level: risk,
      prompt_tokens: response.promptTokens,
      completion_tokens: response.completionTokens,
      total_tokens: response.totalTokens,
      estimated_cost_usd: estimatedCost(runtime.config ?? {}, response.promptTokens, response.completionTokens),
      latency_ms: response.latencyMs,
      http_status: response.httpStatus,
      completed_at: new Date().toISOString(),
    }).eq("id", gatewayRunId);
    await updateTaskProgress(adminClient, executionTask, {
      status: "needs_review",
      stage: "awaiting_review",
      progress: 100,
      output_payload: output,
      confidence,
      risk_level: risk,
      requires_human_review: true,
      completed_at: new Date().toISOString(),
    }, "needs_review", "设备价格 AI 预审已完成，等待审核员确认", { gatewayRunId });
    return json({
      ok: true,
      output,
      requestId: run.data.request_id,
      gatewayRunId,
      executionTaskId: executionTask.id,
      provider: runtime.provider,
      model: modelResult.data.model,
      promptKey: promptResult.data.template_key,
      promptVersion: promptResult.data.version,
      latencyMs: response.latencyMs,
      usage: {
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        totalTokens: response.totalTokens,
      },
    });
  } catch (error) {
    const message = errorMessage(error);
    console.error("wpi-ai-gateway", {
      errorCode: message.split(":")[0].slice(0, 120),
      detail: message.slice(0, 2000),
      gatewayRunId,
    });
    if (gatewayRunId && adminClient) {
      await adminClient.from("wpi_ai_gateway_runs").update({
        status: "failed",
        error_code: message.split(":")[0].slice(0, 120),
        error_message: message.slice(0, 2000),
        completed_at: new Date().toISOString(),
      }).eq("id", gatewayRunId);
    }
    if (executionTask && adminClient) {
      await adminClient.from("wpi_ai_execution_tasks").update({
        status: "failed",
        stage: "failed",
        error_code: message.split(":")[0].slice(0, 120),
        error_message: message.slice(0, 4000),
        completed_at: new Date().toISOString(),
      }).eq("id", executionTask.id).neq("status", "cancelled");
      await appendTaskEvent(adminClient, executionTask, {
        eventType: "failed",
        status: "failed",
        stage: "failed",
        progress: executionTask.progress,
        message: "设备价格 AI 预审执行失败，错误已留痕",
        payload: { errorCode: message.split(":")[0] },
      }).catch(() => undefined);
    }
    const expected = /NOT_CONFIGURED|NOT_VALIDATED|DISABLED|REQUIRED|NOT_FOUND/.test(message);
    return json({ error: "AI 执行网关调用失败", detail: message, gatewayRunId }, expected ? 409 : 502);
  }
});
