"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMockWorkflowContext } from "@/hooks/useMockWorkflowContext";

export type RouteContext = {
  pathname: string;
  source: string;
  catalogIds: string[];
  equipmentIds: string[];
  materialIds: string[];
  supplierIds: string[];
  leadIds: string[];
  gapIds: string[];
  recommendedPriceId?: string;
  inquiryId?: string;
  comparisonId?: string;
  projectPricingId?: string;
  boqId?: string;
  reportId?: string;
  relatedObject?: string;
  relatedSupplier?: string;
  relatedComparison?: string;
  dateFrom?: string;
  dateTo?: string;
  objectType?: string;
  risk?: string;
  hasContext: boolean;
  summary: string[];
};

type SearchParamReader = Pick<URLSearchParams, "get">;

function splitIds(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstValue(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim())?.trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function currentPathContext(pathname: string) {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const [section, id] = parts;

  if (section === "equipment-prices" && id && id !== "ai-recommendation") {
    return { equipmentIds: [id] };
  }

  if (section === "material-prices" && id && id !== "manage") {
    return { materialIds: [id] };
  }

  if (section === "suppliers" && id && id !== "manage") {
    return { supplierIds: [id] };
  }

  if (section === "comparisons" && id) {
    return { comparisonId: id };
  }

  if (section === "inquiries" && id && id !== "create") {
    return { inquiryId: id };
  }

  if (section === "project-pricing" && id && id !== "boq-parse") {
    return { projectPricingId: id };
  }

  if (section === "reports" && id) {
    return { reportId: id };
  }

  return {};
}

export function getRouteContext(pathname: string, params: SearchParamReader): RouteContext {
  const pathContext = currentPathContext(pathname);
  const equipmentIds = unique([
    ...splitIds(params.get("equipmentIds")),
    ...splitIds(params.get("equipmentId")),
    ...(pathContext.equipmentIds ?? []),
  ]);
  const catalogIds = unique([
    ...splitIds(params.get("catalogIds")),
    ...splitIds(params.get("catalogId")),
  ]);
  const materialIds = unique([
    ...splitIds(params.get("materialIds")),
    ...splitIds(params.get("materialId")),
    ...(pathContext.materialIds ?? []),
  ]);
  const supplierIds = unique([
    ...splitIds(params.get("supplierIds")),
    ...splitIds(params.get("supplierId")),
    ...splitIds(params.get("supplier")),
    ...(pathContext.supplierIds ?? []),
  ]);
  const leadIds = unique([...splitIds(params.get("leadIds")), ...splitIds(params.get("leadId"))]);
  const gapIds = unique([
    ...splitIds(params.get("gapIds")),
    ...splitIds(params.get("gapId")),
    ...splitIds(params.get("unmatched")),
  ]);
  const comparisonId = firstValue(params.get("comparisonId"), pathContext.comparisonId);
  const reportId = firstValue(params.get("reportId"), pathContext.reportId);

  const summary = [
    catalogIds.length ? `设备资料 ${catalogIds.length} 项` : "",
    equipmentIds.length ? `设备 ${equipmentIds.length} 项` : "",
    materialIds.length ? `地材 ${materialIds.length} 项` : "",
    supplierIds.length ? `供应商 ${supplierIds.length} 家` : "",
    leadIds.length ? `线索 ${leadIds.length} 条` : "",
    gapIds.length ? `缺口 ${gapIds.length} 项` : "",
    comparisonId ? `比价 ${comparisonId}` : "",
    params.get("boqId") ? `BOQ ${params.get("boqId")}` : "",
    params.get("objectType") === "equipment" ? "对象：设备" : params.get("objectType") === "material" ? "对象：地材" : "",
    params.get("dateFrom") || params.get("startDate") ? `日期：${params.get("dateFrom") || params.get("startDate")} 至 ${params.get("dateTo") || params.get("endDate") || "今天"}` : "",
    params.get("risk") ? `风险：${params.get("risk")}` : "",
  ].filter(Boolean);

  return {
    pathname,
    source: firstValue(params.get("source"), params.get("sourcePage"), params.get("from")) ?? pathname.replace(/^\//, ""),
    catalogIds,
    equipmentIds,
    materialIds,
    supplierIds,
    leadIds,
    gapIds,
    recommendedPriceId: firstValue(params.get("recommendedPriceId")),
    inquiryId: firstValue(params.get("inquiryId"), params.get("highlight"), pathContext.inquiryId),
    comparisonId,
    projectPricingId: firstValue(params.get("projectPricingId"), params.get("pricingId"), pathContext.projectPricingId),
    boqId: firstValue(params.get("boqId"), params.get("boqItem")),
    reportId,
    relatedObject: firstValue(params.get("relatedObject")),
    relatedSupplier: firstValue(params.get("relatedSupplier")),
    relatedComparison: firstValue(params.get("relatedComparison")),
    dateFrom: firstValue(params.get("dateFrom"), params.get("startDate")),
    dateTo: firstValue(params.get("dateTo"), params.get("endDate")),
    objectType: firstValue(params.get("objectType"), params.get("type")),
    risk: firstValue(params.get("risk"), params.get("riskLevel")),
    hasContext: summary.length > 0,
    summary,
  };
}

export function useRouteContext() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { context: workflowContext } = useMockWorkflowContext();

  return useMemo(() => {
    const route = getRouteContext(pathname, searchParams);
    const hasExplicitSelection = Boolean(
      route.equipmentIds.length ||
      route.catalogIds.length ||
      route.materialIds.length ||
      route.supplierIds.length ||
      route.leadIds.length ||
      route.gapIds.length ||
      route.boqId,
    );
    const equipmentIds = hasExplicitSelection ? route.equipmentIds : workflowContext.equipmentIds;
    const materialIds = hasExplicitSelection ? route.materialIds : workflowContext.materialIds;
    const supplierIds = hasExplicitSelection ? route.supplierIds : workflowContext.supplierIds;
    const leadIds = hasExplicitSelection ? route.leadIds : workflowContext.leadIds;
    const gapIds = hasExplicitSelection ? route.gapIds : workflowContext.gapIds;
    const inquiryId = route.inquiryId ?? workflowContext.inquiryId;
    const comparisonId = route.comparisonId ?? workflowContext.comparisonId;
    const projectPricingId = route.projectPricingId ?? workflowContext.projectPricingId;
    const boqId = route.boqId ?? workflowContext.boqId;
    const reportId = route.reportId ?? workflowContext.reportId;
    const summary = [
      route.catalogIds.length ? `设备资料 ${route.catalogIds.length} 项` : "",
      equipmentIds.length ? `设备 ${equipmentIds.length} 项` : "",
      materialIds.length ? `地材 ${materialIds.length} 项` : "",
      supplierIds.length ? `供应商 ${supplierIds.length} 家` : "",
      leadIds.length ? `线索 ${leadIds.length} 条` : "",
      gapIds.length ? `缺口 ${gapIds.length} 项` : "",
      inquiryId ? `询价 ${inquiryId}` : "",
      comparisonId ? `比价 ${comparisonId}` : "",
      projectPricingId ? `套价 ${projectPricingId}` : "",
      boqId ? `BOQ ${boqId}` : "",
      reportId ? `报告 ${reportId}` : "",
      route.objectType === "equipment" ? "对象：设备" : route.objectType === "material" ? "对象：地材" : "",
      route.dateFrom ? `日期：${route.dateFrom} 至 ${route.dateTo || "今天"}` : "",
      route.risk ? `风险：${route.risk}` : "",
    ].filter(Boolean);

    return {
      ...route,
      source: route.source || workflowContext.source || pathname.replace(/^\//, ""),
      equipmentIds,
      materialIds,
      supplierIds,
      leadIds,
      gapIds,
      inquiryId,
      comparisonId,
      projectPricingId,
      boqId,
      reportId,
      relatedObject: route.relatedObject ?? workflowContext.relatedObject,
      hasContext: summary.length > 0,
      summary,
    };
  }, [pathname, searchParams, workflowContext]);
}
