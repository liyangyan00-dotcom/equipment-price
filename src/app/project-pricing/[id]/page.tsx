import { AppLayout } from "@/components/layout/AppLayout";
import { notFound } from "next/navigation";
import { ProjectPricingDetailView } from "@/components/project-pricing/ProjectPricingDetailView";
import {
  getProjectPricingDetail,
  type ProjectPricingDetail,
} from "@/data/mock/projectPricingDetails";
import { getApiAccess } from "@/lib/auth/apiAccess";
import {
  loadProjectPricing,
  type ProjectPricingItemRecord,
} from "@/lib/projectPricing/server";
import type { ConfidenceLevel, RiskLevel } from "@/types/common";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ boqId?: string }>;
};

function confidence(value: number): ConfidenceLevel {
  if (value >= 90) return "A";
  if (value >= 75) return "B";
  if (value >= 60) return "C";
  if (value >= 40) return "D";
  return "E";
}

function category(
  value: ProjectPricingItemRecord["category"],
): "设备" | "地材" | "服务" {
  return value === "material" ? "地材" : value === "service" ? "服务" : "设备";
}

function matchStatus(
  value: ProjectPricingItemRecord["match_level"],
): "exact" | "similar" | "model" | "gap" {
  if (value === "exact" || value === "similar") return value;
  return value === "unmatched" ? "gap" : "model";
}

function risk(value: unknown): RiskLevel {
  return value === "critical" || value === "high" || value === "medium"
    ? value
    : "low";
}

function projectStage(value: unknown) {
  const labels: Record<string, string> = {
    budgeting: "预算测算",
    bidding: "投标报价",
    procurement: "采购执行",
    settlement: "结算复核",
  };
  const key = String(value ?? "budgeting");
  return labels[key] ?? key;
}

function toRealDetail(
  data: Awaited<ReturnType<typeof loadProjectPricing>>,
): ProjectPricingDetail | null {
  if (!data) return null;
  const { project, items, summary } = data;
  const updatedAt = String(project.updated_at ?? new Date().toISOString())
    .replace("T", " ")
    .slice(0, 16);
  const sourceRows = items.filter(
    (item) => item.source_record_id || item.source_legacy_id,
  );
  const riskRows = items.filter(
    (item) =>
      item.needs_inquiry ||
      item.risk_level === "high" ||
      item.risk_level === "critical",
  );
  const attachmentId = String(project.boq_attachment_id ?? "");

  return {
    id: String(project.id),
    projectName: String(project.name),
    projectStage: projectStage(project.project_stage),
    version: String(project.metadata?.version ?? "V1.0"),
    status: project.status === "confirmed" ? "confirmed" : "needs_review",
    currency: String(project.base_currency ?? "USD"),
    priceCondition: String(project.price_term ?? "待设置"),
    exchangeRate: `${String(project.base_currency ?? "USD")}/CNY ${Number(project.exchange_rate ?? 1)}`,
    totalAmount: summary.confirmedUsd,
    estimatedAmount: summary.totalUsd,
    confirmedItemCount: items.filter(
      (item) => item.decision_status === "confirmed",
    ).length,
    pendingReviewCount: items.filter(
      (item) =>
        item.decision_status === "ai_recommended" ||
        item.decision_status === "manual_selected",
    ).length,
    boqItemCount: summary.totalItems,
    matchedPriceCount: summary.matchedItems,
    gapCount: summary.gapItems,
    highRiskCount: summary.highRiskItems,
    aiPricingStatus:
      project.status === "pricing_completed" ? "completed" : "needs_review",
    aiConfidence: summary.averageConfidence,
    lastUpdatedAt: updatedAt,
    owner: "当前项目成员",
    relatedBoqId: String(project.project_code),
    relatedInquiryId: String(project.source_inquiry_id ?? ""),
    relatedComparisonId: "",
    relatedReportId: "",
    relatedAttachmentId: attachmentId,
    summaryCards: [
      {
        label: "当前估算金额",
        value: `USD ${summary.totalUsd.toLocaleString("en-US")}`,
        description: `其中已确认 USD ${summary.confirmedUsd.toLocaleString("en-US")}`,
        tone: "purple",
      },
      {
        label: "BOQ项目数",
        value: `${summary.totalItems} 项`,
        description: "来自归档源文件",
        tone: "blue",
      },
      {
        label: "已匹配价格",
        value: `${summary.matchedItems} 项`,
        description: "含 AI 推荐与人工选价",
        tone: "green",
      },
      {
        label: "价格缺口",
        value: `${summary.gapItems} 项`,
        description: "需询价或人工补价",
        tone: "orange",
      },
      {
        label: "高风险价格",
        value: `${summary.highRiskItems} 项`,
        description: "禁止自动确认",
        tone: "red",
      },
      {
        label: "平均可信度",
        value: `${summary.averageConfidence}%`,
        description: "AI 结果待人工确认",
        tone: "purple",
      },
    ],
    boqRows: items.map((item) => ({
      id: item.id,
      boqCode: item.boq_code,
      itemName: item.item_name,
      category: category(item.category),
      specification: item.specification,
      unit: item.unit,
      quantity: Number(item.quantity),
      recommendedUnitPrice: item.matched_unit_price,
      subtotal:
        item.matched_unit_price === null
          ? null
          : Number(item.matched_unit_price) * Number(item.quantity),
      currency: item.currency,
      priceSource: item.price_source_type || "无匹配",
      sourceRecordId: item.source_record_id || item.source_legacy_id || "-",
      supplierId: item.supplier_id || "",
      supplierName:
        item.supplier?.name || String(item.metadata?.supplierName ?? "-"),
      confidence: confidence(Number(item.confidence)),
      riskLevel: risk(item.risk_level),
      matchStatus: matchStatus(item.match_level),
      matchLabel:
        item.match_level === "exact"
          ? "精准匹配"
          : item.match_level === "similar"
            ? "相似匹配"
            : item.match_level === "unmatched"
              ? "价格缺口"
              : "模型匹配",
      conversionStatus:
        item.metadata?.currencyConversionStatus === "manual_rate_required"
          ? "manual_rate_required"
          : item.metadata?.currencyConversionStatus === "not_applicable"
            ? "not_applicable"
            : "converted",
    })),
    priceSources: sourceRows.slice(0, 12).map((item) => ({
      id: `SRC-${item.id}`,
      title: `${item.item_name}价格依据`,
      sourceType: item.price_source_type,
      sourceRecordId: item.source_record_id || item.source_legacy_id || "-",
      supplierId: item.supplier_id || "",
      supplierName:
        item.supplier?.name || String(item.metadata?.supplierName ?? "-"),
      quoteDate: String(
        item.metadata?.selectedCandidateQuoteDate ??
          item.metadata?.quoteDate ??
          updatedAt.slice(0, 10),
      ),
      validUntil: String(
        item.metadata?.selectedCandidateValidUntil ??
          item.metadata?.validUntil ??
          project.valid_until ??
          "待核验",
      ),
      attachmentCount: Number(item.evidence_count),
      confidence: confidence(Number(item.confidence)),
      note: item.notes || "价格来源已进入项目套价证据链。",
    })),
    aiJudgment: {
      quality:
        summary.gapItems === 0 && summary.highRiskItems === 0
          ? "可进入人工确认"
          : "需人工复核",
      summary: `已完成 ${summary.totalItems} 项真实 BOQ 套价，${summary.matchedItems} 项有价格来源，${summary.gapItems} 项仍存在缺口。`,
      confidence: summary.averageConfidence,
      matchQuality: `匹配覆盖率 ${summary.totalItems ? Math.round((summary.matchedItems / summary.totalItems) * 100) : 0}%`,
      gapJudgment: `${summary.gapItems} 项需发起询价或人工选价`,
      highRiskJudgment: `${summary.highRiskItems} 项高风险价格不得自动确认`,
      recommendedActions: [
        "优先处理价格缺口",
        "核验高风险来源证据",
        "由商务人员确认最终价格",
      ],
    },
    riskActions: riskRows.slice(0, 12).map((item) => ({
      id: `RISK-${item.id}`,
      riskType: item.needs_inquiry
        ? "价格缺口"
        : item.metadata?.currencyConversionStatus === "manual_rate_required"
          ? "汇率待确认"
          : "高风险价格",
      objectName: item.item_name,
      level: risk(item.risk_level),
      reason:
        item.metadata?.currencyConversionStatus === "manual_rate_required"
          ? `已匹配 ${item.currency} 原币价格，缺少有效 USD 换算依据`
          : item.notes ||
            (item.needs_inquiry
              ? "未找到满足阈值的可核验价格来源"
              : "价格或来源风险超过自动确认阈值"),
      actionLabel: item.needs_inquiry ? "创建询价" : "人工复核",
      actionType: item.needs_inquiry ? "inquiry" : "review",
    })),
    versions: [
      {
        id: `VER-${project.id}`,
        version: String(project.metadata?.version ?? "V1.0"),
        createdAt: updatedAt,
        operator: "当前项目成员",
        changeSummary: "当前 Supabase 持久化套价方案",
        totalAmount: summary.totalUsd,
        riskCount: summary.highRiskItems,
        status: "needs_review",
      },
    ],
    relatedRecords: [
      {
        label: "BOQ源文件与证据",
        value: attachmentId ? "查看已归档附件" : "暂无附件",
        href: attachmentId
          ? `/attachments/${attachmentId}`
          : `/attachments?relatedProjectPricing=${project.id}`,
        tone: "orange",
      },
      {
        label: "价格缺口询价",
        value: `${summary.gapItems} 项待处理`,
        href: `/inquiries/create?source=project-pricing&pricingId=${project.id}`,
        tone: "blue",
      },
      {
        label: "项目套价工作台",
        value: String(project.project_code),
        href: `/project-pricing?projectId=${project.id}`,
        tone: "purple",
      },
    ],
    operationHistory: [
      {
        time: updatedAt,
        operator: "当前项目成员",
        action: "更新项目套价方案",
        result: `${summary.totalItems} 项已持久化，${summary.gapItems} 项待处理`,
      },
    ],
  };
}

export default async function ProjectPricingDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  let detail: ProjectPricingDetail | null = null;
  const access = await getApiAccess();
  if (access.ok) {
    try {
      detail = toRealDetail(
        await loadProjectPricing(access.supabase, access.organizationId, id),
      );
    } catch {
      detail = null;
    }
  }
  if (!detail && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();
  if (!detail) detail = getProjectPricingDetail(id);
  return (
    <AppLayout>
      <ProjectPricingDetailView detail={detail} initialBoqId={query.boqId} />
    </AppLayout>
  );
}
