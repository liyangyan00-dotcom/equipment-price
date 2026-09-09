"use client";

import type { ChangeEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConfirmDialog } from "./ConfirmDialog";
import { ActionMenu, type ActionMenuItem } from "./ActionMenu";
import { AiActionDialog } from "./AiActionDialog";
import { EditDrawer } from "./EditDrawer";
import { MockExportDialog } from "./MockExportDialog";
import { MockUploadDialog } from "./MockUploadDialog";
import { ToastViewport } from "./Toast";
import { appendMockAiWorkflowEvent, inferAiWorkflowTaskType, type AiWorkflowStatus } from "@/hooks/useMockAiWorkflow";
import { emitMockToast, useMockToast } from "@/hooks/useMockToast";
import { appendMockWorkflowEvent } from "@/hooks/useMockWorkflow";
import { getMockWorkflowPatchFromUrl, updateMockWorkflowContext } from "@/hooks/useMockWorkflowContext";
import { allowScopedRouteInference, classifyMockAction, shouldPreferNativeHref } from "@/lib/mockActionRegistry";

type MockInteractionProviderProps = {
  children: ReactNode;
};

type ActionMenuState = {
  open: boolean;
  x: number;
  y: number;
};

type SelectionState = {
  equipmentIds: string[];
  materialIds: string[];
  supplierIds: string[];
  inquiryIds: string[];
  leadIds: string[];
};

type WorkflowContext = SelectionState & {
  source: string;
  currentEquipmentId?: string;
  currentMaterialId?: string;
  currentSupplierId?: string;
  currentInquiryId?: string;
  currentComparisonId?: string;
  currentProjectPricingId?: string;
  currentBoqId?: string;
  currentTaskId?: string;
  currentReportId?: string;
};

type DeclaredMockAction =
  | "ai"
  | "back"
  | "confirm"
  | "edit"
  | "export"
  | "menu"
  | "route"
  | "status"
  | "toast"
  | "upload";

const defaultMenuItems: ActionMenuItem[] = [
  { label: "查看摘要", description: "显示当前记录 mock 摘要反馈", tone: "blue" },
  { label: "AI 分析", description: "模拟 AI 重新分析", tone: "purple" },
  { label: "导出记录", description: "创建前端导出任务", tone: "green" },
  { label: "标记复核", description: "进入人工确认流程", tone: "orange" },
];

const defaultSelection: SelectionState = {
  equipmentIds: [],
  materialIds: [],
  supplierIds: [],
  inquiryIds: [],
  leadIds: [],
};

const fallbackIds = {
  equipment: "EQP-2026-0001",
  material: "MAT-2025-00456",
  supplier: "SUP-202506-001",
  inquiry: "INQ-202506-001",
  comparison: "CMP-202506-001",
  projectPricing: "PRJ-202506-001",
  boq: "BOQ-202506-001",
  lead: "PL250520-0001",
  report: "REP-2025-0008",
  aiTask: "AI-20250521-0001",
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, "");
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isActionElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  return target.closest("button,a,[role='button']") as HTMLElement | null;
}

function getHref(element: HTMLElement) {
  if (element instanceof HTMLAnchorElement) {
    return element.getAttribute("href") ?? "";
  }

  const anchor = element.closest("a");
  return anchor?.getAttribute("href") ?? "";
}

function isNavigableHref(href: string) {
  return href && href !== "#" && !href.startsWith("javascript:");
}

function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:)/.test(href);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function addOrRemove(current: string[], id: string, checked: boolean) {
  const next = new Set(current);
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return Array.from(next);
}

function extractFirst(pattern: RegExp, text: string) {
  return text.match(pattern)?.[0];
}

function extractAll(pattern: RegExp, text: string) {
  return text.match(pattern) ?? [];
}

function routePathId(pathname: string, section: string) {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  return parts[0] === section ? parts[1] : undefined;
}

function getCurrentSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

function splitParam(value: string | null) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function inferIdsFromText(text: string) {
  return {
    equipmentIds: extractAll(/\bEQP-\d{4,6}-\d{3,4}\b/g, text),
    materialIds: extractAll(/\bMAT-\d{4,6}-\d{3,5}\b/g, text),
    supplierIds: extractAll(/\bSUP-\d{4,6}-\d{3}\b/g, text),
    inquiryIds: extractAll(/\bINQ-\d{6}-\d{3}\b/g, text),
    leadIds: extractAll(/\bPL\d{6,8}-\d{4}\b/g, text),
    comparisonId: extractFirst(/\b(?:CMP|INQ)-\d{6}-\d{3}\b/, text),
    boqId: extractFirst(/\bBOQ-\d{4,6}-\d{3,4}\b/, text),
  };
}

function detectSelectionBucket(pathname: string, id: string): keyof SelectionState {
  if (id.startsWith("EQP-")) {
    return "equipmentIds";
  }
  if (id.startsWith("MAT-")) {
    return "materialIds";
  }
  if (id.startsWith("SUP-")) {
    return "supplierIds";
  }
  if (id.startsWith("INQ-")) {
    return "inquiryIds";
  }
  if (id.startsWith("PL")) {
    return "leadIds";
  }

  if (pathname.startsWith("/material-prices")) {
    return "materialIds";
  }
  if (pathname.startsWith("/suppliers")) {
    return "supplierIds";
  }
  if (pathname.startsWith("/inquiries")) {
    return "inquiryIds";
  }
  if (pathname.startsWith("/price-leads")) {
    return "leadIds";
  }
  return "equipmentIds";
}

function inferSelectionFromElement(element: HTMLElement, pathname: string) {
  const container =
    element.closest("tr") ??
    element.closest("[data-row-id]") ??
    element.closest("[data-id]") ??
    element.closest("li") ??
    element.closest("section") ??
    element;
  const text = container.textContent ?? "";
  const ids = inferIdsFromText(text);
  const id =
    ids.equipmentIds[0] ??
    ids.materialIds[0] ??
    ids.supplierIds[0] ??
    ids.inquiryIds[0] ??
    ids.leadIds[0] ??
    (pathname.startsWith("/material-prices")
      ? fallbackIds.material
      : pathname.startsWith("/suppliers")
        ? fallbackIds.supplier
        : pathname.startsWith("/inquiries")
          ? fallbackIds.inquiry
          : pathname.startsWith("/price-leads")
            ? fallbackIds.lead
            : fallbackIds.equipment);

  return {
    id,
    bucket: detectSelectionBucket(pathname, id),
  };
}

function buildQueryPath(basePath: string, values: Record<string, string | string[] | number | undefined>) {
  const url = new URL(basePath, "https://local.mock");

  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) {
        url.searchParams.set(key, value.join(","));
      }
      return;
    }

    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

function getWorkflowContext(pathname: string, selected: SelectionState): WorkflowContext {
  const params = getCurrentSearchParams();
  const equipmentIdFromPath = routePathId(pathname, "equipment-prices");
  const materialIdFromPath = routePathId(pathname, "material-prices");
  const supplierIdFromPath = routePathId(pathname, "suppliers");
  const comparisonIdFromPath = routePathId(pathname, "comparisons");

  const currentEquipmentId = equipmentIdFromPath && equipmentIdFromPath !== "ai-recommendation" ? equipmentIdFromPath : undefined;
  const currentMaterialId = materialIdFromPath && materialIdFromPath !== "manage" ? materialIdFromPath : undefined;
  const currentSupplierId = supplierIdFromPath && supplierIdFromPath !== "manage" ? supplierIdFromPath : undefined;

  return {
    source: params.get("source") ?? params.get("sourcePage") ?? params.get("from") ?? (pathname.replace(/^\//, "") || "dashboard"),
    currentEquipmentId,
    currentMaterialId,
    currentSupplierId,
    currentInquiryId: params.get("inquiryId") ?? params.get("highlight") ?? (pathname === "/inquiries" ? fallbackIds.inquiry : undefined),
    currentComparisonId: params.get("comparisonId") ?? comparisonIdFromPath,
    currentProjectPricingId: params.get("projectPricingId") ?? (pathname === "/project-pricing" ? fallbackIds.projectPricing : undefined),
    currentBoqId: params.get("boqId") ?? (pathname.startsWith("/project-pricing") ? fallbackIds.boq : undefined),
    currentTaskId: params.get("taskId") ?? params.get("aiTaskId") ?? undefined,
    currentReportId: params.get("reportId") ?? routePathId(pathname, "reports"),
    equipmentIds: unique([
      ...selected.equipmentIds,
      ...splitParam(params.get("equipmentIds")),
      ...splitParam(params.get("equipmentId")),
      ...(currentEquipmentId ? [currentEquipmentId] : []),
    ]),
    materialIds: unique([
      ...selected.materialIds,
      ...splitParam(params.get("materialIds")),
      ...splitParam(params.get("materialId")),
      ...(currentMaterialId ? [currentMaterialId] : []),
    ]),
    supplierIds: unique([
      ...selected.supplierIds,
      ...splitParam(params.get("supplierIds")),
      ...splitParam(params.get("supplierId")),
      ...(currentSupplierId ? [currentSupplierId] : []),
    ]),
    inquiryIds: unique([...selected.inquiryIds, ...splitParam(params.get("inquiryIds")), ...splitParam(params.get("inquiryId"))]),
    leadIds: unique([...selected.leadIds, ...splitParam(params.get("leadIds")), ...splitParam(params.get("leadId"))]),
  };
}

function sourceFor(pathname: string) {
  if (pathname.startsWith("/equipment-prices/ai-recommendation")) {
    return "ai-recommendation";
  }
  if (pathname.startsWith("/material-prices/manage")) {
    return "material-manage";
  }
  if (pathname.startsWith("/material-prices")) {
    return "material-prices";
  }
  if (pathname.startsWith("/suppliers")) {
    return "suppliers";
  }
  if (pathname.startsWith("/comparisons")) {
    return "comparison";
  }
  if (pathname.startsWith("/project-pricing")) {
    return "project-pricing";
  }
  if (pathname.startsWith("/price-leads")) {
    return "price-leads";
  }
  return pathname.replace(/^\//, "") || "dashboard";
}

function createInquiryRoute(context: WorkflowContext, pathname: string, extra: Record<string, string | string[] | undefined> = {}) {
  const supplierIds =
    context.supplierIds.length
      ? context.supplierIds
      : context.currentSupplierId
        ? [context.currentSupplierId]
        : pathname === "/equipment-prices/ai-recommendation"
          ? [fallbackIds.supplier]
          : undefined;

  return buildQueryPath("/inquiries/create", {
    source: sourceFor(pathname),
    equipmentIds: context.equipmentIds.length ? context.equipmentIds : context.currentEquipmentId ? [context.currentEquipmentId] : undefined,
    materialIds: context.materialIds.length ? context.materialIds : context.currentMaterialId ? [context.currentMaterialId] : undefined,
    supplierIds,
    leadIds: context.leadIds,
    ...extra,
  });
}

function comparisonRoute(context: WorkflowContext, pathname: string, href?: string) {
  const comparisonId = context.currentComparisonId ?? context.inquiryIds[0]?.replace("INQ-", "CMP-") ?? fallbackIds.comparison;
  const route = href?.startsWith("/comparisons/") ? href : `/comparisons/${comparisonId}`;
  return buildQueryPath(route, {
    from: sourceFor(pathname),
    inquiryId: context.currentInquiryId ?? context.inquiryIds[0],
  });
}

function isAiAction(text: string) {
  if (
    includesAny(text, [
      "AI",
      "智能",
      "识别",
      "采集",
      "推荐",
      "评估",
      "分析",
      "生成",
      "解析",
      "补全",
      "套价",
      "比价",
      "重新",
      "批量审核",
      "自动套价",
    ])
  ) {
    return true;
  }

  if (
    includesAny(text, [
      "AI",
      "智能",
      "识别",
      "采集",
      "推荐",
      "评估",
      "分析",
      "生成",
      "解析",
      "补全",
      "套价",
      "比价",
      "重新",
      "批量审核",
    ])
  ) {
    return true;
  }

  return includesAny(text, [
    "AI",
    "智能",
    "识别",
    "采集",
    "推荐",
    "评估",
    "分析",
    "生成",
    "解析",
    "补全",
    "套价",
    "比价",
    "重新",
    "批量审核",
  ]);
}

function workflowTaskId(context: WorkflowContext, fallback = fallbackIds.aiTask) {
  return context.currentTaskId ?? fallback;
}

function routeForAiWorkflowAction(pathname: string, text: string, context: WorkflowContext, href?: string) {
  const cleanHref = href && !href.startsWith("#") ? href : "";
  const taskId = workflowTaskId(context);

  if (pathname === "/ai-quote-recognition") {
    if (includesAny(text, ["保存到待审核报价池", "生成审核任务", "待审核报价池"])) {
      return buildQueryPath("/pending-quotes", {
        source: "ai-quote-recognition",
        taskId,
        quoteId: "QUOTE-202506-001",
        needsReview: 1,
      });
    }
  }

  if (pathname === "/pending-quotes") {
    if (includesAny(text, ["查看识别结果", "识别结果"])) {
      return buildQueryPath("/ai-quote-recognition", { source: "pending-quotes", taskId });
    }

    if (includesAny(text, ["确认入库", "确认入库", "入库"])) {
      return buildQueryPath("/equipment-prices", {
        source: "pending-quotes",
        taskId,
        quoteId: "QUOTE-202506-001",
        stored: 1,
      });
    }
  }

  if (pathname === "/ai-price-collection") {
    if (includesAny(text, ["生成采集结果", "转入线索池", "线索池", "查看线索"])) {
      return buildQueryPath("/price-leads", {
        source: "ai-price-collection",
        taskId: context.currentTaskId ?? "AI-COLLECT-202506-001",
        materialIds: context.materialIds.length ? context.materialIds : [fallbackIds.material],
      });
    }
  }

  if (pathname === "/price-leads") {
    if (includesAny(text, ["生成询价任务", "创建询价任务", "创建询价", "发起询价"])) {
      return createInquiryRoute(context, pathname, {
        sourceTask: "price-leads",
        leadIds: context.leadIds.length ? context.leadIds : [fallbackIds.lead],
      });
    }

    if (includesAny(text, ["转设备价格库"])) {
      return buildQueryPath("/equipment-prices", {
        source: "price-leads",
        leadIds: context.leadIds.length ? context.leadIds : [fallbackIds.lead],
        stored: 1,
      });
    }

    if (includesAny(text, ["确认入库", "可入库", "转地材价格库", "入库"])) {
      return buildQueryPath("/material-prices", {
        source: "price-leads",
        leadIds: context.leadIds.length ? context.leadIds : [fallbackIds.lead],
        stored: 1,
      });
    }
  }

  if (pathname === "/ai-inquiry-letter") {
    if (includesAny(text, ["创建询价任务", "创建任务", "确认创建", "批量发送"])) {
      return buildQueryPath("/inquiries", {
        created: 1,
        source: "ai-inquiry-letter",
        taskId,
        highlight: "INQ-202506-010",
      });
    }
  }

  if (pathname === "/project-pricing/boq-parse") {
    if (includesAny(text, ["返回项目套价中心", "进入项目套价中心", "项目套价中心"])) {
      return buildQueryPath("/project-pricing", {
        source: "boq-parse",
        boqId: context.currentBoqId ?? fallbackIds.boq,
      });
    }

    if (includesAny(text, ["生成询价任务", "价格缺口", "缺口询价"])) {
      return createInquiryRoute(context, pathname, {
        sourceTask: "boq-parse",
        boqId: context.currentBoqId ?? fallbackIds.boq,
        gapIds: "GAP-202506-001,GAP-202506-002",
      });
    }
  }

  if (pathname === "/ai-workbench") {
    if (includesAny(text, ["报价识别", "设备价格识别", "识别任务"])) {
      return buildQueryPath("/ai-quote-recognition", { source: "ai-workbench", taskId });
    }

    if (includesAny(text, ["待审核报价", "人工复核", "复核任务"])) {
      return buildQueryPath("/pending-quotes", { source: "ai-workbench", taskId });
    }

    if (includesAny(text, ["价格采集", "采集任务"])) {
      return buildQueryPath("/ai-price-collection", { source: "ai-workbench", taskId });
    }

    if (includesAny(text, ["价格线索", "线索池"])) {
      return buildQueryPath("/price-leads", { source: "ai-workbench", taskId });
    }

    if (includesAny(text, ["BOQ", "清单", "解析"])) {
      return buildQueryPath("/project-pricing/boq-parse", { source: "ai-workbench", boqId: fallbackIds.boq, taskId });
    }

    if (includesAny(text, ["询价函"])) {
      return buildQueryPath("/ai-inquiry-letter", { source: "ai-workbench", taskId });
    }

    if (includesAny(text, ["供应商比价", "比价分析", "比价"])) {
      return buildQueryPath(`/comparisons/${fallbackIds.comparison}`, { source: "ai-workbench", taskId });
    }

    if (includesAny(text, ["异常价格", "高风险"])) {
      return buildQueryPath("/pending-quotes", { source: "ai-workbench", taskId, risk: "high" });
    }

    if (includesAny(text, ["查看AI输出", "AI输出", "生成报告", "报告"])) {
      return buildQueryPath("/ai-report-center", { source: "ai-workbench", taskId });
    }
  }

  if (pathname === "/ai-report-center") {
    if (includesAny(text, ["查看报告", "报告预览", "预览报告", "查看全部"])) {
      return cleanHref.startsWith("/reports/") ? cleanHref : `/reports/${context.currentReportId ?? fallbackIds.report}`;
    }

    if (includesAny(text, ["附件", "证据"])) {
      return buildQueryPath("/attachments", { relatedReport: context.currentReportId ?? fallbackIds.report });
    }
  }

  return "";
}

function routeForAction(pathname: string, text: string, context: WorkflowContext, href?: string) {
  const cleanHref = href && !href.startsWith("#") ? href : "";
  const workflowRoute = routeForAiWorkflowAction(pathname, text, context, cleanHref);

  if (workflowRoute) {
    return workflowRoute;
  }

  if (pathname === "/attachments") {
    if (includesAny(text, ["关联设备价格", "设备价格", "EQP", "查看业务对象"])) {
      return `/equipment-prices/${context.currentEquipmentId ?? context.equipmentIds[0] ?? fallbackIds.equipment}`;
    }

    if (includesAny(text, ["关联供应商", "供应商", "Grundfos"])) {
      return `/suppliers/${context.currentSupplierId ?? context.supplierIds[0] ?? fallbackIds.supplier}`;
    }

    if (includesAny(text, ["关联报告", "查看报告", "报告"])) {
      return `/reports/${context.currentReportId ?? fallbackIds.report}`;
    }

    if (includesAny(text, ["关联比价", "比价任务", "比价"])) {
      return `/comparisons/${context.currentComparisonId ?? fallbackIds.comparison}`;
    }

    if (includesAny(text, ["项目套价", "套价"])) {
      return "/project-pricing";
    }
  }

  if (pathname.startsWith("/reports/")) {
    if (includesAny(text, ["返回报告", "报告生成中心", "返回中心"])) {
      return "/ai-report-center";
    }

    if (includesAny(text, ["附件", "证据", "证据链"])) {
      return buildQueryPath("/attachments", { relatedReport: context.currentReportId ?? fallbackIds.report });
    }

    if (includesAny(text, ["项目套价", "套价"])) {
      return "/project-pricing";
    }
  }

  if (pathname === "/analytics") {
    if (includesAny(text, ["设备价格", "设备"])) return "/equipment-prices";
    if (includesAny(text, ["地材价格", "地材"])) return "/material-prices";
    if (includesAny(text, ["供应商"])) return "/suppliers";
    if (includesAny(text, ["AI任务", "AI工作台"])) return "/ai-workbench";
    if (includesAny(text, ["高风险", "风险"])) return buildQueryPath("/analytics", { risk: "high" });
    if (includesAny(text, ["询价"])) return "/inquiries";
    if (includesAny(text, ["项目套价", "套价"])) return "/project-pricing";
  }

  if (pathname === "/settings") {
    if (includesAny(text, ["AI设置", "AI规则", "AI识别参数"])) {
      return "/settings/ai";
    }
  }

  if (pathname === "/settings/ai" && includesAny(text, ["返回系统设置", "系统设置"])) {
    return "/settings";
  }

  if (pathname === "/inquiries/create" && includesAny(text, ["创建任务", "创建询价任务", "确认创建"])) {
    return buildQueryPath("/inquiries", { created: 1, highlight: "INQ-202506-009", source: "inquiry-create" });
  }

  if (includesAny(text, ["创建询价", "发起询价", "生成询价任务", "去询价", "询价任务"])) {
    return createInquiryRoute(context, pathname);
  }

  if (pathname.startsWith("/equipment-prices")) {
    if (includesAny(text, ["AI推荐", "AI分析", "推荐价格", "AI推荐价格"])) {
      return buildQueryPath("/equipment-prices/ai-recommendation", {
        sourcePage: "equipment-prices",
        equipmentId: context.equipmentIds[0] ?? context.currentEquipmentId ?? fallbackIds.equipment,
      });
    }

    if (includesAny(text, ["附件", "证据"]) && !includesAny(text, ["上传", "导出"])) {
      return buildQueryPath("/attachments", { relatedObject: context.currentEquipmentId ?? context.equipmentIds[0] ?? fallbackIds.equipment });
    }

    if (includesAny(text, ["查看", "详情"]) && pathname === "/equipment-prices") {
      return cleanHref.startsWith("/equipment-prices/") ? cleanHref : `/equipment-prices/${context.equipmentIds[0] ?? fallbackIds.equipment}`;
    }
  }

  if (pathname.startsWith("/material-prices")) {
    if (includesAny(text, ["AI采集", "采集线索", "去采集"])) {
      return buildQueryPath("/ai-price-collection", {
        source: sourceFor(pathname),
        materialId: context.materialIds[0] ?? context.currentMaterialId ?? fallbackIds.material,
      });
    }

    if (includesAny(text, ["查看线索", "线索池", "价格线索"])) {
      return buildQueryPath("/price-leads", {
        source: sourceFor(pathname),
        materialId: context.materialIds[0] ?? context.currentMaterialId ?? fallbackIds.material,
      });
    }

    if (includesAny(text, ["查看", "详情"]) && pathname === "/material-prices") {
      return cleanHref.startsWith("/material-prices/") ? cleanHref : `/material-prices/${context.materialIds[0] ?? fallbackIds.material}`;
    }
  }

  if (pathname.startsWith("/suppliers")) {
    if (pathname === "/suppliers" && includesAny(text, ["资料维护", "批量管理", "AI补全资料"])) {
      return "/suppliers/manage";
    }

    if (includesAny(text, ["创建询价", "发起询价", "询价"])) {
      return createInquiryRoute(context, pathname, { supplierIds: context.supplierIds.length ? context.supplierIds : [context.currentSupplierId ?? fallbackIds.supplier] });
    }

    if (includesAny(text, ["报价记录", "历史报价"])) {
      return buildQueryPath("/inquiries", { supplierId: context.supplierIds[0] ?? context.currentSupplierId ?? fallbackIds.supplier });
    }

    if (includesAny(text, ["附件", "证据"]) && !includesAny(text, ["上传", "导出"])) {
      return buildQueryPath("/attachments", { relatedSupplier: context.currentSupplierId ?? context.supplierIds[0] ?? fallbackIds.supplier });
    }

    if (includesAny(text, ["查看", "详情"]) && pathname === "/suppliers") {
      return cleanHref.startsWith("/suppliers/") ? cleanHref : `/suppliers/${context.supplierIds[0] ?? fallbackIds.supplier}`;
    }
  }

  if (pathname === "/inquiries" && includesAny(text, ["查看", "详情"])) {
    return cleanHref.startsWith("/inquiries/") ? cleanHref : `/inquiries/${context.currentInquiryId ?? context.inquiryIds[0] ?? fallbackIds.inquiry}`;
  }

  if (pathname === "/inquiries" && includesAny(text, ["比价", "进入比价"])) {
    return comparisonRoute(context, pathname, cleanHref);
  }

  if (pathname.startsWith("/comparisons")) {
    if (includesAny(text, ["进入项目套价", "项目套价", "采用方案", "选择方案"])) {
      return buildQueryPath("/project-pricing", {
        source: "comparison",
        comparisonId: context.currentComparisonId ?? fallbackIds.comparison,
      });
    }

    if (includesAny(text, ["比价说明", "生成报告", "报告"])) {
      return buildQueryPath("/ai-report-center", {
        source: "comparison",
        comparisonId: context.currentComparisonId ?? fallbackIds.comparison,
      });
    }

    if (includesAny(text, ["附件", "证据"])) {
      return buildQueryPath("/attachments", { relatedComparison: context.currentComparisonId ?? fallbackIds.comparison });
    }
  }

  if (pathname === "/project-pricing") {
    if (includesAny(text, ["BOQ", "解析详情", "解析"])) {
      return buildQueryPath("/project-pricing/boq-parse", { boqId: context.currentBoqId ?? fallbackIds.boq, source: "project-pricing" });
    }

    if (includesAny(text, ["价格缺口", "缺口询价"])) {
      return createInquiryRoute(context, pathname, { gapIds: "GAP-202506-001,GAP-202506-002" });
    }

    if (includesAny(text, ["生成报告", "测算报告"])) {
      return buildQueryPath("/ai-report-center", {
        source: "project-pricing",
        projectPricingId: context.currentProjectPricingId ?? fallbackIds.projectPricing,
      });
    }

    if (text.includes("查看报告")) {
      return `/reports/${fallbackIds.report}`;
    }
  }

  if (pathname === "/price-leads" && includesAny(text, ["生成询价", "创建询价"])) {
    return createInquiryRoute(context, pathname, { leadIds: context.leadIds.length ? context.leadIds : [fallbackIds.lead] });
  }

  if (pathname === "/ai-price-collection" && includesAny(text, ["转入线索池", "线索池", "查看线索", "生成采集结果"])) {
    return buildQueryPath("/price-leads", { source: "ai-price-collection", materialIds: context.materialIds.length ? context.materialIds : [fallbackIds.material] });
  }

  if (pathname === "/price-leads" && includesAny(text, ["确认入库", "可入库", "转地材价格库", "转设备价格库", "入库"])) {
    return buildQueryPath("/material-prices", {
      source: "price-leads",
      leadIds: context.leadIds.length ? context.leadIds : [fallbackIds.lead],
      stored: 1,
    });
  }

  if ((text.includes("BOQ") || text.includes("解析")) && pathname === "/ai-workbench") {
    return buildQueryPath("/project-pricing/boq-parse", { source: "ai-workbench", boqId: fallbackIds.boq });
  }

  if ((text.includes("报告") || text.includes("预览")) && pathname === "/ai-report-center") {
    return cleanHref.startsWith("/reports/") ? cleanHref : `/reports/${fallbackIds.report}`;
  }

  if (text.includes("关联报告") && pathname === "/attachments") {
    return `/reports/${fallbackIds.report}`;
  }

  if (text.includes("AI设置")) {
    return "/settings/ai";
  }

  if (pathname === "/inquiries/create" && includesAny(text, ["创建任务", "创建询价任务", "确认创建"])) {
    return buildQueryPath("/inquiries", { created: 1, highlight: "INQ-202506-009", source: "inquiry-create" });
  }

  if (includesAny(text, ["创建询价", "发起询价", "生成询价任务", "去询价", "询价任务"])) {
    return createInquiryRoute(context, pathname);
  }

  if (pathname.startsWith("/equipment-prices")) {
    if (includesAny(text, ["AI推荐", "AI分析", "推荐价格", "AI推荐价格"])) {
      return buildQueryPath("/equipment-prices/ai-recommendation", {
        sourcePage: "equipment-prices",
        equipmentId: context.equipmentIds[0] ?? context.currentEquipmentId ?? fallbackIds.equipment,
      });
    }

    if (includesAny(text, ["附件", "证据"]) && !includesAny(text, ["上传", "导出"])) {
      return buildQueryPath("/attachments", { relatedObject: context.currentEquipmentId ?? context.equipmentIds[0] ?? fallbackIds.equipment });
    }

    if (includesAny(text, ["查看", "详情"]) && pathname === "/equipment-prices") {
      return cleanHref.startsWith("/equipment-prices/") ? cleanHref : `/equipment-prices/${context.equipmentIds[0] ?? fallbackIds.equipment}`;
    }
  }

  if (pathname.startsWith("/material-prices")) {
    if (includesAny(text, ["AI采集", "采集线索", "去采集"])) {
      return buildQueryPath("/ai-price-collection", {
        source: sourceFor(pathname),
        materialId: context.materialIds[0] ?? context.currentMaterialId ?? fallbackIds.material,
      });
    }

    if (includesAny(text, ["查看线索", "线索池", "价格线索"])) {
      return buildQueryPath("/price-leads", {
        source: sourceFor(pathname),
        materialId: context.materialIds[0] ?? context.currentMaterialId ?? fallbackIds.material,
      });
    }

    if (includesAny(text, ["查看", "详情"]) && pathname === "/material-prices") {
      return cleanHref.startsWith("/material-prices/") ? cleanHref : `/material-prices/${context.materialIds[0] ?? fallbackIds.material}`;
    }
  }

  if (pathname.startsWith("/suppliers")) {
    if (pathname === "/suppliers" && includesAny(text, ["资料维护", "批量管理", "AI补全资料"])) {
      return "/suppliers/manage";
    }

    if (includesAny(text, ["报价记录", "历史报价"])) {
      return buildQueryPath("/inquiries", { supplierId: context.supplierIds[0] ?? context.currentSupplierId ?? fallbackIds.supplier });
    }

    if (includesAny(text, ["附件", "证据"]) && !includesAny(text, ["上传", "导出"])) {
      return buildQueryPath("/attachments", { relatedSupplier: context.currentSupplierId ?? context.supplierIds[0] ?? fallbackIds.supplier });
    }

    if (includesAny(text, ["查看", "详情"]) && pathname === "/suppliers") {
      return cleanHref.startsWith("/suppliers/") ? cleanHref : `/suppliers/${context.supplierIds[0] ?? fallbackIds.supplier}`;
    }
  }

  if (pathname === "/inquiries" && includesAny(text, ["查看", "详情"])) {
    return cleanHref.startsWith("/inquiries/") ? cleanHref : `/inquiries/${context.currentInquiryId ?? context.inquiryIds[0] ?? fallbackIds.inquiry}`;
  }

  if (pathname === "/inquiries" && includesAny(text, ["比价", "进入比价"])) {
    return comparisonRoute(context, pathname, cleanHref);
  }

  if (pathname.startsWith("/comparisons")) {
    if (includesAny(text, ["进入项目套价", "项目套价", "采用方案", "选择方案"])) {
      return buildQueryPath("/project-pricing", {
        source: "comparison",
        comparisonId: context.currentComparisonId ?? fallbackIds.comparison,
      });
    }

    if (includesAny(text, ["比价说明", "生成报告", "报告"])) {
      return buildQueryPath("/ai-report-center", {
        source: "comparison",
        comparisonId: context.currentComparisonId ?? fallbackIds.comparison,
      });
    }

    if (includesAny(text, ["附件", "证据"])) {
      return buildQueryPath("/attachments", { relatedComparison: context.currentComparisonId ?? fallbackIds.comparison });
    }
  }

  if (pathname === "/project-pricing") {
    if (includesAny(text, ["BOQ", "解析详情", "解析"])) {
      return buildQueryPath("/project-pricing/boq-parse", { boqId: context.currentBoqId ?? fallbackIds.boq, source: "project-pricing" });
    }

    if (includesAny(text, ["价格缺口", "缺口询价"])) {
      return createInquiryRoute(context, pathname, { gapIds: "GAP-202506-001,GAP-202506-002" });
    }

    if (includesAny(text, ["生成报告", "测算报告"])) {
      return buildQueryPath("/ai-report-center", {
        source: "project-pricing",
        projectPricingId: context.currentProjectPricingId ?? fallbackIds.projectPricing,
      });
    }

    if (text.includes("查看报告")) {
      return `/reports/${fallbackIds.report}`;
    }
  }

  if (pathname === "/price-leads" && includesAny(text, ["生成询价", "创建询价"])) {
    return createInquiryRoute(context, pathname, { leadIds: context.leadIds.length ? context.leadIds : [fallbackIds.lead] });
  }

  if (pathname === "/ai-price-collection" && includesAny(text, ["转入线索池", "线索池", "查看线索"])) {
    return buildQueryPath("/price-leads", { source: "ai-price-collection", materialIds: context.materialIds });
  }

  if (includesAny(text, ["确认入库", "可入库", "转地材价格库", "转设备价格库"]) && pathname === "/price-leads") {
    return buildQueryPath(context.materialIds.length ? "/material-prices" : "/equipment-prices", {
      source: "price-leads",
      leadIds: context.leadIds.length ? context.leadIds : [fallbackIds.lead],
      stored: 1,
    });
  }

  if ((text.includes("BOQ") || text.includes("解析")) && pathname === "/ai-workbench") {
    return buildQueryPath("/project-pricing/boq-parse", { source: "ai-workbench", boqId: fallbackIds.boq });
  }

  if ((text.includes("报告") || text.includes("预览")) && pathname === "/ai-report-center") {
    return cleanHref.startsWith("/reports/") ? cleanHref : `/reports/${fallbackIds.report}`;
  }

  if (text.includes("关联报告") && pathname === "/attachments") {
    return `/reports/${fallbackIds.report}`;
  }

  if (text.includes("AI设置")) {
    return "/settings/ai";
  }

  if (pathname === "/inquiries/create" && includesAny(text, ["创建任务", "创建询价任务", "确认创建"])) {
    return buildQueryPath("/inquiries", { created: 1, highlight: "INQ-202506-009", source: "inquiry-create" });
  }

  if (includesAny(text, ["创建询价", "发起询价", "生成询价任务", "去询价", "询价任务"])) {
    return createInquiryRoute(context, pathname);
  }

  if (pathname.startsWith("/equipment-prices")) {
    if (includesAny(text, ["AI推荐", "AI分析", "推荐价格", "AI推荐价格"])) {
      return buildQueryPath("/equipment-prices/ai-recommendation", {
        sourcePage: "equipment-prices",
        equipmentId: context.equipmentIds[0] ?? context.currentEquipmentId ?? fallbackIds.equipment,
      });
    }

    if (includesAny(text, ["附件", "证据"]) && !includesAny(text, ["上传", "导出"])) {
      return buildQueryPath("/attachments", { relatedObject: context.currentEquipmentId ?? context.equipmentIds[0] ?? fallbackIds.equipment });
    }

    if ((text.includes("查看") || text.includes("详情")) && pathname === "/equipment-prices") {
      return cleanHref.startsWith("/equipment-prices/") ? cleanHref : `/equipment-prices/${context.equipmentIds[0] ?? fallbackIds.equipment}`;
    }
  }

  if (pathname.startsWith("/material-prices")) {
    if (includesAny(text, ["AI采集", "采集线索", "去采集"])) {
      return buildQueryPath("/ai-price-collection", {
        source: sourceFor(pathname),
        materialId: context.materialIds[0] ?? context.currentMaterialId ?? fallbackIds.material,
      });
    }

    if (includesAny(text, ["查看线索", "线索池", "价格线索"])) {
      return buildQueryPath("/price-leads", {
        source: sourceFor(pathname),
        materialId: context.materialIds[0] ?? context.currentMaterialId ?? fallbackIds.material,
      });
    }

    if ((text.includes("查看") || text.includes("详情")) && pathname === "/material-prices") {
      return cleanHref.startsWith("/material-prices/") ? cleanHref : `/material-prices/${context.materialIds[0] ?? fallbackIds.material}`;
    }
  }

  if (pathname.startsWith("/suppliers")) {
    if (pathname === "/suppliers" && includesAny(text, ["资料维护", "批量管理", "AI补全资料"])) {
      return "/suppliers/manage";
    }

    if (includesAny(text, ["报价记录", "历史报价"])) {
      return buildQueryPath("/inquiries", { supplierId: context.supplierIds[0] ?? context.currentSupplierId ?? fallbackIds.supplier });
    }

    if (includesAny(text, ["附件", "证据"]) && !includesAny(text, ["上传", "导出"])) {
      return buildQueryPath("/attachments", { relatedSupplier: context.currentSupplierId ?? context.supplierIds[0] ?? fallbackIds.supplier });
    }

    if ((text.includes("查看") || text.includes("详情")) && pathname === "/suppliers") {
      return cleanHref.startsWith("/suppliers/") ? cleanHref : `/suppliers/${context.supplierIds[0] ?? fallbackIds.supplier}`;
    }
  }

  if (pathname === "/inquiries" && includesAny(text, ["查看", "详情"])) {
    return cleanHref.startsWith("/inquiries/") ? cleanHref : `/inquiries/${context.currentInquiryId ?? context.inquiryIds[0] ?? fallbackIds.inquiry}`;
  }

  if (pathname === "/inquiries" && includesAny(text, ["比价", "进入比价"])) {
    return comparisonRoute(context, pathname, cleanHref);
  }

  if (pathname.startsWith("/comparisons")) {
    if (includesAny(text, ["进入项目套价", "项目套价", "采用方案"])) {
      return buildQueryPath("/project-pricing", {
        source: "comparison",
        comparisonId: context.currentComparisonId ?? fallbackIds.comparison,
      });
    }

    if (includesAny(text, ["比价说明", "生成报告", "报告"])) {
      return buildQueryPath("/ai-report-center", {
        source: "comparison",
        comparisonId: context.currentComparisonId ?? fallbackIds.comparison,
      });
    }

    if (includesAny(text, ["附件", "证据"])) {
      return buildQueryPath("/attachments", { relatedComparison: context.currentComparisonId ?? fallbackIds.comparison });
    }
  }

  if (pathname === "/project-pricing") {
    if (includesAny(text, ["BOQ", "解析详情", "解析"])) {
      return buildQueryPath("/project-pricing/boq-parse", { boqId: context.currentBoqId ?? fallbackIds.boq, source: "project-pricing" });
    }

    if (includesAny(text, ["价格缺口", "缺口询价"])) {
      return createInquiryRoute(context, pathname, { gapIds: "GAP-202506-001,GAP-202506-002" });
    }

    if (includesAny(text, ["生成报告", "测算报告"])) {
      return buildQueryPath("/ai-report-center", {
        source: "project-pricing",
        projectPricingId: context.currentProjectPricingId ?? fallbackIds.projectPricing,
      });
    }

    if (text.includes("查看报告")) {
      return `/reports/${fallbackIds.report}`;
    }
  }

  if (pathname === "/price-leads" && includesAny(text, ["生成询价", "创建询价"])) {
    return createInquiryRoute(context, pathname, { leadIds: context.leadIds.length ? context.leadIds : [fallbackIds.lead] });
  }

  if (pathname === "/ai-price-collection" && includesAny(text, ["转入线索池", "线索池", "查看线索"])) {
    return buildQueryPath("/price-leads", { source: "ai-price-collection", materialIds: context.materialIds });
  }

  if ((text.includes("BOQ") || text.includes("解析")) && pathname === "/ai-workbench") {
    return buildQueryPath("/project-pricing/boq-parse", { source: "ai-workbench", boqId: fallbackIds.boq });
  }

  if ((text.includes("报告") || text.includes("预览")) && pathname === "/ai-report-center") {
    return cleanHref.startsWith("/reports/") ? cleanHref : `/reports/${fallbackIds.report}`;
  }

  if (text.includes("关联报告") && pathname === "/attachments") {
    return `/reports/${fallbackIds.report}`;
  }

  if (text.includes("AI设置")) {
    return "/settings/ai";
  }

  if (cleanHref === "/inquiries/create") {
    return createInquiryRoute(context, pathname);
  }

  if (cleanHref === "/equipment-prices/ai-recommendation") {
    return buildQueryPath(cleanHref, { equipmentId: context.equipmentIds[0] ?? fallbackIds.equipment, sourcePage: sourceFor(pathname) });
  }

  return "";
}

function mockStatusAction(text: string) {
  if (includesAny(text, ["AI归档识别", "AI自动分类", "推荐关联对象", "补充缺失证据", "检测重复附件"])) {
    return {
      title: "AI归档动作已模拟完成",
      description: "附件分类、证据关联与重复检测状态已进入前端 mock 流程，仍需人工确认。",
      type: "ai" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["标记高风险", "标记风险"])) {
    return {
      title: "已标记风险证据",
      description: "该证据已加入风险提示队列，后续可在报告与价格对象中查看。",
      type: "status" as const,
      status: "needs_review" as const,
    };
  }

  if (includesAny(text, ["标记可信", "设为可信", "mark trusted"])) {
    return {
      title: "已标记为可信证据",
      description: "可信状态仅保存在前端 mock，会等待人工复核后生效。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["保存设置", "保存AI规则", "保存模板", "测试风险规则", "同步数据字典"])) {
    return {
      title: "设置已模拟保存",
      description: "配置已写入本地 mock 状态，未调用真实后台接口。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["恢复默认", "重置模板", "重置设置"])) {
    return {
      title: "已恢复默认配置",
      description: "当前仅恢复前端 mock 配置，不影响真实业务参数。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["查看审计日志", "审计日志"])) {
    return {
      title: "已打开审计日志 mock 明细",
      description: "审计记录来源于前端 mock 数据，可用于后续真实日志页联调。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["采用推荐价", "标记采用", "采用推荐", "确认采用", "选择方案", "采用方案"])) {
    return {
      title: "已采用推荐方案",
      description: "mock 状态已更新为 adopted，后续仍需人工确认。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["人工复核", "标记复核", "进入人工复核", "复核"])) {
    return {
      title: "已进入人工复核",
      description: "mock 状态已更新为 needs_review，等待商务确认。",
      type: "status" as const,
      status: "needs_review" as const,
    };
  }

  if (includesAny(text, ["确认入库", "转设备价格库", "转地材价格库", "可入库", "入库"])) {
    return {
      title: "已模拟确认入库",
      description: "记录已进入价格库链路，当前不写入真实数据库。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["补全字段", "补全资料", "补充字段", "补充资料", "标记需补充", "需补充", "应用建议"])) {
    return {
      title: "缺失字段已模拟补全",
      description: "AI 建议已写入前端 mock 状态，仍需人工确认。",
      type: "status" as const,
      status: "needs_review" as const,
    };
  }

  if (includesAny(text, ["驳回报价", "驳回", "标记作废", "作废"])) {
    return {
      title: "已模拟驳回/作废",
      description: "记录已从当前 AI 工作流中移出，真实数据未被删除。",
      type: "status" as const,
      status: "archived" as const,
    };
  }

  if (includesAny(text, ["保存草稿", "保存模板"])) {
    return {
      title: "草稿已保存",
      description: "已写入本地 mock 流程状态。",
      type: "draft" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["发送提醒", "批量发送"])) {
    return {
      title: "提醒已模拟发送",
      description: "当前仅创建前端提醒任务，不发送真实邮件或消息。",
      type: "status" as const,
      status: "completed" as const,
    };
  }
  if (includesAny(text, ["采用推荐价", "标记采用", "采用推荐", "确认采用", "选择方案", "采用方案"])) {
    return {
      title: "已采用推荐方案",
      description: "mock 状态已更新为 adopted，后续仍需人工确认。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["人工复核", "标记复核", "进入人工复核", "复核"])) {
    return {
      title: "已进入人工复核",
      description: "mock 状态已更新为 needs_review，等待商务确认。",
      type: "status" as const,
      status: "needs_review" as const,
    };
  }

  if (includesAny(text, ["确认入库", "转设备价格库", "转地材价格库", "可入库", "入库"])) {
    return {
      title: "已模拟确认入库",
      description: "记录已进入价格库链路，当前不写入真实数据库。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["保存草稿", "保存模板"])) {
    return {
      title: "草稿已保存",
      description: "已写入本地 mock 流程状态。",
      type: "draft" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["发送提醒", "批量发送"])) {
    return {
      title: "提醒已模拟发送",
      description: "当前仅创建前端提醒任务，不发送真实邮件或消息。",
      type: "status" as const,
      status: "completed" as const,
    };
  }
  if (includesAny(text, ["采用推荐价", "标记采用", "采用推荐", "确认采用"])) {
    return {
      title: "已采用推荐方案",
      description: "mock 状态已更新为 adopted，后续仍需人工确认。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["人工复核", "标记复核", "进入人工复核"])) {
    return {
      title: "已进入人工复核",
      description: "mock 状态已更新为 needs_review，等待商务确认。",
      type: "status" as const,
      status: "needs_review" as const,
    };
  }

  if (includesAny(text, ["确认入库", "转设备价格库", "转地材价格库", "可入库"])) {
    return {
      title: "已模拟确认入库",
      description: "记录已进入价格库链路，当前不写入真实数据库。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["保存草稿", "保存模板"])) {
    return {
      title: "草稿已保存",
      description: "已写入本地 mock 流程状态。",
      type: "draft" as const,
      status: "completed" as const,
    };
  }

  if (includesAny(text, ["发送提醒", "批量发送"])) {
    return {
      title: "提醒已模拟发送",
      description: "当前仅创建前端提醒任务，不发送真实邮件或消息。",
      type: "status" as const,
      status: "completed" as const,
    };
  }

  return null;
}

export function MockInteractionProvider({ children }: MockInteractionProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useMockToast();
  const [selection, setSelection] = useState<SelectionState>(defaultSelection);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTitle, setAiTitle] = useState("AI mock 操作");
  const [menu, setMenu] = useState<ActionMenuState>({ open: false, x: 0, y: 0 });

  useEffect(() => {
    const href = `${pathname}${window.location.search}`;
    const patch = getMockWorkflowPatchFromUrl(href, pathname);
    const hasBusinessContext = Boolean(
      patch.equipmentIds?.length ||
      patch.materialIds?.length ||
      patch.supplierIds?.length ||
      patch.leadIds?.length ||
      patch.gapIds?.length ||
      patch.inquiryId ||
      patch.comparisonId ||
      patch.projectPricingId ||
      patch.boqId ||
      patch.reportId ||
      patch.relatedObject,
    );
    if (hasBusinessContext) {
      updateMockWorkflowContext(patch, { replaceArrays: pathname === "/inquiries/create" });
    }
  }, [pathname]);

  const deferFallback = (callback: () => void, selector = "[data-overlay-root]") => {
    window.setTimeout(() => {
      if (!document.querySelector(selector)) {
        callback();
      }
    }, 60);
  };

  const recordAiWorkflow = (label: string, status: AiWorkflowStatus, route?: string, payload?: Record<string, unknown>) => {
    const context = getWorkflowContext(pathname, selection);
    appendMockAiWorkflowEvent({
      taskType: inferAiWorkflowTaskType(pathname, label),
      taskId: context.currentTaskId ?? fallbackIds.aiTask,
      label,
      from: pathname,
      to: route,
      status,
      payload: payload ?? context,
    });
  };

  const runAiAction = (title: string) => {
    deferFallback(() => {
      setAiTitle(title || "AI mock 操作");
      appendMockWorkflowEvent({
        type: "ai",
        label: title || "AI mock 操作",
        from: pathname,
        status: "running",
      });
      recordAiWorkflow(title || "AI mock 操作", "running");
      setAiOpen(true);
    });
  };

  const handleRoutedAction = (route: string, label: string, context: WorkflowContext) => {
    const routePatch = getMockWorkflowPatchFromUrl(route, pathname);
    updateMockWorkflowContext({
      ...routePatch,
      equipmentIds: routePatch.equipmentIds?.length ? routePatch.equipmentIds : context.equipmentIds,
      materialIds: routePatch.materialIds?.length ? routePatch.materialIds : context.materialIds,
      supplierIds: routePatch.supplierIds?.length ? routePatch.supplierIds : context.supplierIds,
      leadIds: routePatch.leadIds?.length ? routePatch.leadIds : context.leadIds,
      inquiryId: routePatch.inquiryId ?? context.currentInquiryId,
      comparisonId: routePatch.comparisonId ?? context.currentComparisonId,
      projectPricingId: routePatch.projectPricingId ?? context.currentProjectPricingId,
      boqId: routePatch.boqId ?? context.currentBoqId,
      reportId: routePatch.reportId ?? context.currentReportId,
    });
    appendMockWorkflowEvent({
      type: "route",
      label,
      from: pathname,
      to: route,
      status: "completed",
      payload: context,
    });
    appendMockAiWorkflowEvent({
      taskType: inferAiWorkflowTaskType(pathname, label),
      taskId: context.currentTaskId ?? fallbackIds.aiTask,
      label,
      from: pathname,
      to: route,
      status: "completed",
      payload: context,
    });
    toast.info("正在进入业务链路", `${label} → ${route}`);
    router.push(route);
  };

  const handleChangeCapture = (event: ChangeEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox" || target.closest("[data-no-global-interaction]")) {
      return;
    }

    const { id, bucket } = inferSelectionFromElement(target, pathname);
    setSelection((current) => ({
      ...current,
      [bucket]: addOrRemove(current[bucket], id, target.checked),
    }));
  };

  const handleCapture = (event: MouseEvent<HTMLDivElement>) => {
    const element = isActionElement(event.target);
    if (!element || element.closest("[data-mock-internal]") || element.closest("[data-no-global-interaction]")) {
      return;
    }

    const href = getHref(element);
    const text = normalizeText(element.textContent ?? element.getAttribute("aria-label") ?? element.getAttribute("title") ?? "");
    if (!text && !href) {
      return;
    }

    const context = getWorkflowContext(pathname, selection);
    const declaredAction = element.dataset.mockAction as DeclaredMockAction | undefined;
    const declaredTitle = element.dataset.mockTitle || text || "操作已执行";
    const declaredDescription = element.dataset.mockDescription || "已更新当前页面的前端 mock 状态。";
    const declaredRoute = element.dataset.mockRoute;

    if (declaredAction) {
      event.preventDefault();

      if (declaredAction === "route" && declaredRoute) {
        handleRoutedAction(declaredRoute, declaredTitle, context);
        return;
      }
      if (declaredAction === "back") {
        router.back();
        return;
      }
      if (declaredAction === "upload") {
        deferFallback(() => setUploadOpen(true));
        return;
      }
      if (declaredAction === "export") {
        deferFallback(() => setExportOpen(true));
        return;
      }
      if (declaredAction === "edit") {
        deferFallback(() => setEditOpen(true));
        return;
      }
      if (declaredAction === "confirm") {
        deferFallback(() => setConfirmOpen(true));
        return;
      }
      if (declaredAction === "ai") {
        runAiAction(declaredTitle);
        return;
      }
      if (declaredAction === "menu") {
        const rect = element.getBoundingClientRect();
        deferFallback(
          () => setMenu({ open: true, x: Math.max(12, rect.left), y: rect.bottom + 6 }),
          "[role='menu']"
        );
        return;
      }

      appendMockWorkflowEvent({
        type: "status",
        label: declaredTitle,
        from: pathname,
        status: declaredAction === "status" ? "completed" : "needs_review",
        payload: context,
      });
      toast.success(declaredTitle, declaredDescription);
      return;
    }

    const explicitAction = classifyMockAction(text);
    const preferNativeHref = shouldPreferNativeHref(href);
    const scopedContainer = element.closest("tr") ?? element.closest("[data-row-id]") ?? element.closest("[data-id]");
    const scopedText = normalizeText(scopedContainer?.textContent ?? "");
    const route = preferNativeHref
      ? ""
      : routeForAction(pathname, text, context, href) ||
      (!isNavigableHref(href) && scopedText && allowScopedRouteInference(text)
        ? routeForAction(pathname, scopedText, context, href)
        : "");

    if (route) {
      event.preventDefault();
      handleRoutedAction(route, text || href, context);
      return;
    }

    if (preferNativeHref) {
      appendMockWorkflowEvent({
        type: "route",
        label: text || href,
        from: pathname,
        to: href,
        status: "completed",
        payload: context,
      });
      return;
    }

    if (isNavigableHref(href) && !isExternalHref(href)) {
      return;
    }

    if (isExternalHref(href)) {
      return;
    }

    const isBatchAction = text.includes("批量");
    const hasSelection = Object.values(selection).some((ids) => ids.length > 0);
    if (isBatchAction && !hasSelection && !includesAny(text, ["查询", "重置", "导出", "下载"])) {
      event.preventDefault();
      toast.warning("请先勾选记录", "批量操作需要先选择至少一条 mock 数据。");
      return;
    }

    switch (explicitAction) {
      case "back":
        event.preventDefault();
        router.back();
        return;
      case "upload":
        event.preventDefault();
        deferFallback(() => setUploadOpen(true));
        return;
      case "export":
        event.preventDefault();
        deferFallback(() => setExportOpen(true));
        return;
      case "edit":
        event.preventDefault();
        deferFallback(() => setEditOpen(true));
        return;
      case "confirm":
        event.preventDefault();
        deferFallback(() => setConfirmOpen(true));
        return;
      case "menu": {
        event.preventDefault();
        const rect = element.getBoundingClientRect();
        deferFallback(
          () => setMenu({ open: true, x: Math.max(12, rect.left), y: rect.bottom + 6 }),
          "[role='menu']"
        );
        return;
      }
      case "search":
        event.preventDefault();
        toast.info("筛选已执行", "已按当前页面 mock 条件刷新列表。");
        return;
      case "reset":
        event.preventDefault();
        setSelection(defaultSelection);
        toast.info("筛选已重置", "已恢复默认 mock 条件。");
        return;
      case "ai":
        event.preventDefault();
        runAiAction(text);
        return;
      case "detail":
        event.preventDefault();
        appendMockWorkflowEvent({
          type: "status",
          label: text || "查看详情",
          from: pathname,
          status: "completed",
          payload: context,
        });
        toast.info("动作已记录", "该入口尚未配置独立页面或详情面板，已保留为 mock 反馈。");
        return;
      case "pagination":
        event.preventDefault();
        toast.info("分页已切换", "当前为前端 mock 分页效果。");
        return;
      case "none":
        break;
    }

    const statusAction = mockStatusAction(text);
    if (statusAction) {
      event.preventDefault();
      appendMockWorkflowEvent({
        type: statusAction.type,
        label: text,
        from: pathname,
        status: statusAction.status,
        payload: context,
      });
      appendMockAiWorkflowEvent({
        taskType: inferAiWorkflowTaskType(pathname, text),
        taskId: context.currentTaskId ?? fallbackIds.aiTask,
        label: text,
        from: pathname,
        status: statusAction.status as AiWorkflowStatus,
        payload: context,
      });
      toast.success(statusAction.title, statusAction.description);
      return;
    }

    if (text.includes("返回")) {
      event.preventDefault();
      router.back();
      return;
    }

    if (text.includes("上传") || text.includes("导入") || text.includes("选择文件")) {
      event.preventDefault();
      deferFallback(() => setUploadOpen(true));
      return;
    }

    if (includesAny(text, ["导出", "下载"])) {
      event.preventDefault();
      deferFallback(() => setExportOpen(true));
      return;
    }

    if (includesAny(text, ["编辑", "修正", "补充资料", "去重合并"])) {
      event.preventDefault();
      deferFallback(() => setEditOpen(true));
      return;
    }

    if (includesAny(text, ["删除", "作废", "标记作废"])) {
      event.preventDefault();
      deferFallback(() => setConfirmOpen(true));
      return;
    }

    if (text.includes("更多") || text.includes("操作")) {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      deferFallback(
        () => setMenu({ open: true, x: Math.max(12, rect.left), y: rect.bottom + 6 }),
        "[role='menu']"
      );
      return;
    }

    if (text.includes("查询") || text.includes("搜索")) {
      event.preventDefault();
      toast.info("筛选已执行", "已按当前页面 mock 条件刷新列表。");
      return;
    }

    if (text.includes("重置") || text.includes("清空")) {
      event.preventDefault();
      setSelection(defaultSelection);
      toast.info("筛选已重置", "已恢复默认 mock 条件。");
      return;
    }

    if (isAiAction(text)) {
      event.preventDefault();
      runAiAction(text);
      return;
    }

    if (text.includes("查看") || text.includes("详情")) {
      event.preventDefault();
      toast.info("当前为 mock 摘要入口", "该按钮尚未绑定独立详情页，后续可接入 Drawer 或详情路由。");
      return;
    }

    if (/^\d+$/.test(text) || text.includes("上一页") || text.includes("下一页")) {
      event.preventDefault();
      toast.info("分页已切换", "当前为前端 mock 分页效果。");
      return;
    }

    if (element.matches("button,[role='button']")) {
      event.preventDefault();
      appendMockWorkflowEvent({
        type: "status",
        label: text || "页面操作",
        from: pathname,
        status: "completed",
        payload: context,
      });
      toast.info("操作已响应", `${text || "当前操作"}已记录为前端 mock 状态。`);
    }
  };

  return (
    <>
      <div onChangeCapture={handleChangeCapture} onClickCapture={handleCapture}>
        {children}
      </div>
      <ToastViewport />
      <div data-mock-internal>
        <MockUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onConfirm={() => {
            appendMockWorkflowEvent({ type: "upload", label: "mock 上传", from: pathname, status: "completed" });
            setUploadOpen(false);
            toast.success("上传成功", "文件已加入当前页面 mock 列表。");
          }}
        />
        <MockExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          onConfirm={(format) => {
            appendMockWorkflowEvent({ type: "export", label: `导出 ${format}`, from: pathname, status: "completed" });
            setExportOpen(false);
            toast.success("已生成导出任务", `${format} 文件为模拟任务，不会真实下载。`);
          }}
        />
        <EditDrawer
          open={editOpen}
          title="编辑当前记录"
          onClose={() => setEditOpen(false)}
          onSave={() => {
            appendMockWorkflowEvent({ type: "status", label: "保存编辑", from: pathname, status: "completed" });
            setEditOpen(false);
            toast.success("已保存 mock 修改", "修改仅保存在前端模拟状态。");
          }}
        />
        <ConfirmDialog
          open={confirmOpen}
          title="确认执行该操作？"
          description="这是前端 mock 操作，不会删除真实数据。"
          confirmLabel="确认模拟"
          tone="danger"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            appendMockWorkflowEvent({ type: "status", label: "确认危险操作", from: pathname, status: "needs_review" });
            setConfirmOpen(false);
            toast.warning("操作已模拟完成", "该记录状态已在前端流程中标记。");
          }}
        />
        <AiActionDialog
          open={aiOpen}
          title={aiTitle}
          onClose={() => setAiOpen(false)}
          onComplete={() => {
            appendMockWorkflowEvent({ type: "ai", label: aiTitle, from: pathname, status: "completed" });
            recordAiWorkflow(aiTitle, "completed");
            setAiOpen(false);
            emitMockToast({
              tone: "success",
              title: "AI mock 结果已应用",
              description: "结果已进入人工复核或当前页面提示区域。",
            });
          }}
        />
        <ActionMenu
          open={menu.open}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu((value) => ({ ...value, open: false }))}
          items={defaultMenuItems.map((item) => ({
            ...item,
            onClick: () => {
              if (item.label.includes("摘要")) {
                toast.info("当前为 mock 摘要入口", "该菜单项不再打开通用详情抽屉，避免误导操作语义。");
              } else if (item.label.includes("导出")) {
                deferFallback(() => setExportOpen(true));
              } else if (item.label.includes("AI")) {
                runAiAction(item.label);
              } else {
                appendMockWorkflowEvent({ type: "status", label: item.label, from: pathname, status: "needs_review" });
                toast.info(item.label, "已执行前端 mock 操作。");
              }
            },
          }))}
        />
      </div>
    </>
  );
}
