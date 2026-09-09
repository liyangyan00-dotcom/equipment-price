"use client";

import { useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "water-price-workflow-context-v1";
const CHANGE_EVENT = "water-price:workflow-context";
const EMPTY_CONTEXT_JSON = JSON.stringify({
  equipmentIds: [],
  materialIds: [],
  supplierIds: [],
  leadIds: [],
  gapIds: [],
  recommendedPriceIds: [],
});

export type CreatedInquiryContext = {
  id: string;
  comparisonId: string;
  title: string;
  itemIds: string[];
  supplierIds: string[];
  supplierAdmissionSnapshot?: Array<{
    supplierId: string;
    level: "allowed" | "needs_review" | "blocked";
    checkedAt: string;
    warnings: string[];
  }>;
  status: "draft" | "created";
  createdAt: string;
};

export type MockWorkflowContext = {
  source?: string;
  equipmentIds: string[];
  materialIds: string[];
  supplierIds: string[];
  leadIds: string[];
  gapIds: string[];
  recommendedPriceIds: string[];
  inquiryId?: string;
  comparisonId?: string;
  projectPricingId?: string;
  boqId?: string;
  reportId?: string;
  relatedObject?: string;
  createdInquiry?: CreatedInquiryContext;
  comparisonDecision?: {
    comparisonId: string;
    inquiryId?: string;
    plan: string;
    selectedAt: string;
  };
  projectPricing?: {
    id: string;
    comparisonId?: string;
    boqId?: string;
    status: "draft" | "priced" | "needs_review" | "completed";
    updatedAt: string;
  };
  reportTask?: {
    id: string;
    sourceId?: string;
    reportType?: string;
    status: "draft" | "running" | "completed" | "needs_review";
    updatedAt: string;
  };
  pendingQuote?: {
    id: string;
    fileName: string;
    fileType: "pdf" | "xlsx";
    quoteType: "设备" | "材料";
    supplier: string;
    quoteDate: string;
    currency: "CNY" | "USD";
    itemCount: number;
    confidence: number;
    missingCount: number;
    risk: "高风险" | "中风险" | "低风险";
    status: "待审核" | "需补充资料" | "已入库" | "已作废";
    uploadedAt: string;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
    deliveryDays: number;
    warrantyMonths: number;
    model: string;
    material: string;
    missingFields: string[];
  };
  collectedLead?: {
    id: string;
    type: "设备" | "地材";
    name: string;
    spec: string;
    source: string;
    sourceDetail: string;
    price: number;
    currency: "CNY" | "USD";
    region: string;
    aiMatch: number;
    confidence: "高" | "中" | "低";
    status: "待确认" | "可入库" | "入库中" | "已入库" | "已作废";
    supplier: string;
    risk: "低风险" | "中风险" | "高风险";
    createdAt: string;
    missingFields: string[];
  };
  updatedAt?: string;
};

export type MockWorkflowContextPatch = Partial<Omit<MockWorkflowContext, "updatedAt">>;

const arrayKeys = [
  "equipmentIds",
  "materialIds",
  "supplierIds",
  "leadIds",
  "gapIds",
  "recommendedPriceIds",
] as const;

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function splitIds(value: string | null | undefined) {
  return unique((value ?? "").split(","));
}

function normalizeContext(value?: Partial<MockWorkflowContext> | null): MockWorkflowContext {
  return {
    ...value,
    equipmentIds: unique(value?.equipmentIds ?? []),
    materialIds: unique(value?.materialIds ?? []),
    supplierIds: unique(value?.supplierIds ?? []),
    leadIds: unique(value?.leadIds ?? []),
    gapIds: unique(value?.gapIds ?? []),
    recommendedPriceIds: unique(value?.recommendedPriceIds ?? []),
  };
}

function parseContext(raw: string | null): MockWorkflowContext {
  if (!raw) return normalizeContext();

  try {
    return normalizeContext(JSON.parse(raw) as Partial<MockWorkflowContext>);
  } catch {
    return normalizeContext();
  }
}

export function readMockWorkflowContext(): MockWorkflowContext {
  if (typeof window === "undefined") return normalizeContext();
  return parseContext(window.localStorage.getItem(STORAGE_KEY));
}

export function updateMockWorkflowContext(
  patch: MockWorkflowContextPatch,
  options: { replaceArrays?: boolean } = {},
) {
  if (typeof window === "undefined") return normalizeContext(patch);

  const current = readMockWorkflowContext();
  const next = normalizeContext({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  for (const key of arrayKeys) {
    const patchValue = patch[key];
    if (!patchValue) continue;
    next[key] = options.replaceArrays ? unique(patchValue) : unique([...current[key], ...patchValue]);
  }

  const serialized = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  return next;
}

export function clearMockWorkflowContext() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function firstValue(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function getMockWorkflowPatchFromUrl(href: string, source?: string): MockWorkflowContextPatch {
  const url = new URL(href, "http://mock.local");
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const [section, id] = parts;
  const params = url.searchParams;
  const equipmentIds = unique([
    ...splitIds(params.get("equipmentIds")),
    ...splitIds(params.get("equipmentId")),
    ...(section === "equipment-prices" && id && id !== "ai-recommendation" ? [id] : []),
  ]);
  const materialIds = unique([
    ...splitIds(params.get("materialIds")),
    ...splitIds(params.get("materialId")),
    ...(section === "material-prices" && id && id !== "manage" ? [id] : []),
  ]);
  const supplierIds = unique([
    ...splitIds(params.get("supplierIds")),
    ...splitIds(params.get("supplierId")),
    ...splitIds(params.get("supplier")),
    ...(section === "suppliers" && id && id !== "manage" ? [id] : []),
  ]);

  return {
    source: firstValue(params.get("source"), params.get("from"), source),
    equipmentIds,
    materialIds,
    supplierIds,
    leadIds: unique([...splitIds(params.get("leadIds")), ...splitIds(params.get("leadId"))]),
    gapIds: unique([
      ...splitIds(params.get("gapIds")),
      ...splitIds(params.get("gapId")),
      ...splitIds(params.get("unmatched")),
    ]),
    recommendedPriceIds: unique([
      ...splitIds(params.get("recommendedPriceIds")),
      ...splitIds(params.get("recommendedPriceId")),
    ]),
    inquiryId: firstValue(params.get("inquiryId"), section === "inquiries" && id !== "create" ? id : undefined),
    comparisonId: firstValue(params.get("comparisonId"), section === "comparisons" ? id : undefined),
    projectPricingId: firstValue(params.get("projectPricingId"), params.get("pricingId"), section === "project-pricing" && id !== "boq-parse" ? id : undefined),
    boqId: firstValue(params.get("boqId"), params.get("boqItem")),
    reportId: firstValue(params.get("reportId"), section === "reports" ? id : undefined),
    relatedObject: firstValue(params.get("relatedObject"), params.get("relatedReport")),
  };
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_CONTEXT_JSON;
}

function getServerSnapshot() {
  return EMPTY_CONTEXT_JSON;
}

export function useMockWorkflowContext() {
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const context = useMemo(() => parseContext(serialized), [serialized]);

  return {
    context,
    update: updateMockWorkflowContext,
    clear: clearMockWorkflowContext,
  };
}
