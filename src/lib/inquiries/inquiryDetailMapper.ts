import type {
  InquiryAttachment,
  InquiryDetail,
  InquiryDetailItem,
  InquiryOperation,
  InquiryRiskAction,
  InquirySupplierResponse,
  SupplierResponseStatus,
} from "@/data/mock/inquiryDetails";
import type { AiTaskStatus, ConfidenceLevel, CurrencyCode, RiskLevel } from "@/types/common";

type JsonRecord = Record<string, unknown>;

const eventLabels: Record<string, string> = {
  created: "创建询价任务",
  submitted: "提交人工审核",
  approved: "审核通过",
  rejected: "审核驳回",
  sent: "发送询价函",
  delivered: "供应商已收件",
  opened: "供应商已查看",
  replied: "供应商已回复",
  reminded: "发送催办提醒",
  send_failed: "发送失败",
  bounced: "邮件退回",
  quote_recorded: "回填供应商报价",
  quote_attachment_added: "归档报价附件",
  comparison_generated: "生成比价结果",
  comparison_decided: "确认比价方案",
  retry_requested: "重新执行发送",
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array<T = JsonRecord>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function risk(value: unknown): RiskLevel {
  return ["low", "medium", "high", "critical"].includes(String(value))
    ? String(value) as RiskLevel
    : "medium";
}

function confidence(value: unknown): ConfidenceLevel {
  return ["A", "B", "C", "D", "E"].includes(String(value))
    ? String(value) as ConfidenceLevel
    : "C";
}

function formatDate(value: unknown) {
  if (!value) return "未设置";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replaceAll("/", "-");
}

function relativeDeadline(value: unknown) {
  if (!value) return { label: "未设置", overdue: false };
  const deadline = new Date(String(value));
  if (Number.isNaN(deadline.getTime())) return { label: "时间无效", overdue: true };
  const diff = deadline.getTime() - Date.now();
  const overdue = diff < 0;
  const minutes = Math.max(1, Math.ceil(Math.abs(diff) / 60_000));
  const label = minutes >= 1440
    ? `${Math.ceil(minutes / 1440)} 天`
    : minutes >= 60
      ? `${Math.ceil(minutes / 60)} 小时`
      : `${minutes} 分钟`;
  return { label: overdue ? `已逾期 ${label}` : `剩余 ${label}`, overdue };
}

function status(value: unknown, overdue: boolean): { value: AiTaskStatus; label: string } {
  const raw = String(value ?? "draft");
  if (raw === "approved" || raw === "completed") return { value: "completed", label: "已完成" };
  if (raw === "rejected") return { value: "rejected", label: "已驳回" };
  if (raw === "archived" || raw === "voided") return { value: "voided", label: "已归档" };
  if (overdue) return { value: "needs_review", label: "已逾期" };
  if (raw === "pending_review" || raw === "needs_review") return { value: "needs_review", label: "待复核" };
  if (raw === "draft" || raw === "created") return { value: "created", label: "草稿" };
  return { value: "running", label: "询价中" };
}

function supplierJoin(value: unknown): JsonRecord {
  if (Array.isArray(value)) return record(value[0]);
  return record(value);
}

function mapResponseStatus(row: JsonRecord, deadlineOverdue: boolean): SupplierResponseStatus {
  const response = text(row.response_status).toLowerCase();
  const delivery = text(row.delivery_status).toLowerCase();
  if (["responded", "quoted", "completed", "replied"].includes(response) || row.responded_at || row.replied_at) return "responded";
  if (deadlineOverdue && !["responded", "quoted", "completed"].includes(response)) return "overdue";
  if (delivery === "opened") return "viewed";
  if (["sent", "delivered"].includes(delivery) || row.sent_at) return "sent";
  return "draft";
}

function fileType(name: string): InquiryAttachment["type"] {
  const extension = name.split(".").pop()?.toUpperCase();
  if (extension === "PDF" || extension === "XLSX" || extension === "DOCX" || extension === "EML") return extension;
  return "PDF";
}

function fileSize(value: unknown) {
  const bytes = number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type InquiryDetailSource = JsonRecord & {
  wpi_inquiry_items?: JsonRecord[];
  wpi_inquiry_suppliers?: JsonRecord[];
};

export function mapInquiryDetail(
  inquiry: InquiryDetailSource,
  attachments: JsonRecord[],
  events: JsonRecord[],
  ownerName?: string | null,
): InquiryDetail {
  const metadata = record(inquiry.metadata);
  const legacyDetail = record(metadata.detail);
  const deadlineState = relativeDeadline(inquiry.deadline);
  const inquiryStatus = status(inquiry.status, deadlineState.overdue);
  const rawItems = array<JsonRecord>(inquiry.wpi_inquiry_items);
  const rawSuppliers = array<JsonRecord>(inquiry.wpi_inquiry_suppliers);
  const supplierMapping = array<JsonRecord>(metadata.supplierMapping);
  const code = text(inquiry.inquiry_code, text(inquiry.legacy_id, text(inquiry.id)));

  const items: InquiryDetailItem[] = rawItems.map((row, index) => {
    const itemMetadata = record(row.metadata);
    return {
      id: text(row.id, `${code}-ITEM-${index + 1}`),
      targetId: text(itemMetadata.sourceLegacyId, text(row.source_id, text(row.legacy_id, text(row.id)))),
      targetType: row.item_type === "material" ? "material" : "equipment",
      name: text(row.item_name, "待补全询价对象"),
      specification: text(row.specification, "参数待补全"),
      unit: text(row.unit, "项"),
      quantity: number(row.quantity, 1),
      referencePrice: number(row.target_price),
      currency: text(itemMetadata.currency, text(metadata.currency, text(inquiry.base_currency, "CNY"))) as CurrencyCode,
      source: text(itemMetadata.source, itemMetadata.sourceLegacyId ? "价格库" : "询价任务"),
      confidenceLevel: confidence(itemMetadata.confidenceLevel),
      riskLevel: risk(itemMetadata.riskLevel ?? inquiry.risk_level),
      evidenceId: text(itemMetadata.evidenceId, "待归档"),
    };
  });

  const itemAliasSets = rawItems.map((row, index) => {
    const itemMetadata = record(row.metadata);
    const legacyId = text(row.legacy_id);
    return new Set([
      items[index]?.id,
      items[index]?.targetId,
      text(row.id),
      text(row.source_id),
      text(itemMetadata.id),
      text(itemMetadata.sourceId),
      text(itemMetadata.sourceLegacyId),
      itemMetadata.sourceLegacyId ? `ITEM-${text(itemMetadata.sourceLegacyId)}` : "",
      row.source_id ? `ITEM-${text(row.source_id)}` : "",
      legacyId,
      legacyId.split(":").at(-1),
    ].filter((value): value is string => Boolean(value)));
  });

  const suppliers: InquirySupplierResponse[] = rawSuppliers.map((row) => {
    const supplier = supplierJoin(row.wpi_suppliers);
    const rowMetadata = record(row.metadata);
    const contacts = array<JsonRecord>(supplier.wpi_supplier_contacts);
    const primary = contacts.find((contact) => contact.is_primary === true) ?? contacts[0] ?? {};
    const responseStatus = mapResponseStatus(row, deadlineState.overdue);
    const respondedAt = row.responded_at ?? row.replied_at;
    const sentAt = row.sent_at;
    const responseHours = respondedAt && sentAt
      ? (new Date(String(respondedAt)).getTime() - new Date(String(sentAt)).getTime()) / 3_600_000
      : null;
    const supplierAliases = new Set([
      text(row.supplier_id),
      text(supplier.id),
      text(supplier.legacy_id),
      text(rowMetadata.sourceLegacyId),
    ].filter(Boolean));
    const assignedKeys = new Set(array<unknown>(rowMetadata.assignedItemIds).map((value) => text(value)).filter(Boolean));
    const mappedKeys = new Set(
      supplierMapping
        .filter((mapping) => array<unknown>(mapping.supplierIds).some((supplierId) => supplierAliases.has(text(supplierId))))
        .flatMap((mapping) => [text(mapping.code), text(mapping.itemId)])
        .filter(Boolean),
    );
    const assignedItemIds = rowMetadata.assignmentMode === "all_items_legacy" && assignedKeys.size === 0 && mappedKeys.size === 0
      ? items.map((item) => item.targetId)
      : items
          .filter((_item, index) => Array.from(itemAliasSets[index]).some((alias) => assignedKeys.has(alias) || mappedKeys.has(alias)))
          .map((item) => item.targetId);
    return {
      supplierId: text(supplier.legacy_id, text(supplier.id, text(row.supplier_id))),
      supplierName: text(supplier.name, "未命名供应商"),
      region: text(supplier.region, "地区待补全"),
      contact: text(primary.name, "联系人待补全"),
      whatsapp: text(primary.whatsapp, text(primary.phone, "待补全")),
      email: text(primary.email, "待补全"),
      sendStatus: mapResponseStatus({ ...row, responded_at: null, replied_at: null }, false),
      responseStatus,
      quoteAmount: number(row.quoted_amount),
      currency: text(row.currency, text(inquiry.base_currency, "CNY")) as CurrencyCode,
      responseTime: respondedAt ? formatDate(respondedAt) : responseStatus === "overdue" ? deadlineState.label : "等待响应",
      responseSpeed: responseHours === null ? "normal" : responseHours <= 24 ? "fast" : responseHours <= 72 ? "normal" : "slow",
      deliveryScore: clamp(number(record(row.metadata).deliveryScore, responseStatus === "responded" ? 86 : 70)),
      riskLevel: risk(row.risk_level),
      selected: rowMetadata.selected === true,
      assignedItemIds,
      admissionStatus: text(rowMetadata.admissionStatus, text(supplier.review_status, "pending")),
    };
  });

  const responded = suppliers.filter((supplier) => supplier.responseStatus === "responded");
  const quotes = responded.filter((supplier) => supplier.quoteAmount > 0);
  const missingSpecifications = items.filter((item) => !item.specification || item.specification === "参数待补全");
  const overdueSuppliers = suppliers.filter((supplier) => supplier.responseStatus === "overdue");
  const highRiskSuppliers = suppliers.filter((supplier) => ["high", "critical"].includes(supplier.riskLevel));
  const completeness = clamp(number(inquiry.ai_confidence, number(metadata.completeness, 0)) || (items.length ? ((items.length - missingSpecifications.length) / items.length) * 100 : 0));
  const coverage = suppliers.length ? clamp((responded.length / suppliers.length) * 100) : 0;
  const aiConfidence = clamp(number(inquiry.ai_confidence, number(metadata.aiConfidence, completeness)));
  const lowestQuote = quotes.length ? Math.min(...quotes.map((supplier) => supplier.quoteAmount)) : 0;
  const lowestQuoteCurrency = quotes.find((supplier) => supplier.quoteAmount === lowestQuote)?.currency ?? text(inquiry.base_currency, "CNY");

  const risks: InquiryRiskAction[] = [];
  if (overdueSuppliers.length) risks.push({
    riskType: "供应商响应逾期",
    impactObject: overdueSuppliers.map((supplier) => supplier.supplierName).slice(0, 3).join("、"),
    level: "high",
    aiJudgement: `${overdueSuppliers.length} 家供应商超过截止时间仍未形成有效报价，可能影响比价覆盖度。`,
    suggestedAction: "核验联系方式并执行真实催办，必要时补充备选供应商。",
    actionLabel: "发送提醒",
  });
  if (missingSpecifications.length) risks.push({
    riskType: "询价参数缺失",
    impactObject: missingSpecifications.map((item) => item.name).slice(0, 3).join("、"),
    level: "medium",
    aiJudgement: `${missingSpecifications.length} 项询价对象缺少完整规格，供应商报价口径可能不一致。`,
    suggestedAction: "补全参数后重新确认询价函版本。",
    actionLabel: "补全参数",
  });
  if (highRiskSuppliers.length) risks.push({
    riskType: "供应商交付风险",
    impactObject: highRiskSuppliers.map((supplier) => supplier.supplierName).slice(0, 3).join("、"),
    level: "high",
    aiJudgement: `${highRiskSuppliers.length} 家供应商当前风险等级较高，不建议未经人工确认直接采用。`,
    suggestedAction: "进入供应商档案核验风险证据并记录处理结论。",
    actionLabel: "处理风险",
  });
  if (!risks.length) risks.push({
    riskType: "当前未发现阻断风险",
    impactObject: code,
    level: "low",
    aiJudgement: "当前响应、参数和供应商风险均未达到阻断阈值。",
    suggestedAction: "人工复核后可进入比价。",
    actionLabel: "记录复核",
  });

  const mappedAttachments: InquiryAttachment[] = attachments.map((row) => {
    const name = text(row.original_name, "未命名附件");
    return {
      id: text(row.id),
      name,
      type: fileType(name),
      size: fileSize(row.size_bytes),
      linkedObject: text(row.evidence_type, "询价证据"),
      uploadedAt: formatDate(row.created_at),
      aiArchived: row.verification_status === "verified",
    };
  });

  const sortedEvents = [...events].sort((a, b) => new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime());
  const timeline = sortedEvents.slice(-5).map((event) => ({
    label: eventLabels[text(event.event_type)] ?? text(record(event.payload).actionLabel, text(event.event_type, "业务事件")),
    time: formatDate(event.created_at),
    status: event.event_status === "failed" ? "pending" as const : event.event_status === "running" ? "running" as const : "done" as const,
  }));
  if (!timeline.length) timeline.push({ label: "创建询价任务", time: formatDate(inquiry.created_at), status: "done" });

  const operations: InquiryOperation[] = [...sortedEvents].reverse().map((event) => {
    const payload = record(event.payload);
    const supplier = supplierJoin(event.wpi_suppliers);
    return {
      time: formatDate(event.created_at),
      operator: text(payload.actorName, event.actor_id ? `用户 ${String(event.actor_id).slice(0, 8)}` : text(event.provider, "系统")),
      action: eventLabels[text(event.event_type)] ?? text(payload.actionLabel, text(event.event_type, "业务事件")),
      result: event.event_status === "failed"
        ? text(event.error_message, "执行失败")
        : text(payload.note, supplier.name ? `关联供应商：${supplier.name}` : "已写入真实事件日志"),
    };
  });

  const letterContent = text(inquiry.letter_content);
  const legacyLetter = record(legacyDetail.letter);
  const technicalRequirements = items.map((item) => `${item.name}：${item.specification}，数量 ${item.quantity} ${item.unit}`);
  const aiModel = text(metadata.aiModel, text(record(metadata.aiExecution).model, "规则引擎 + 人工复核"));
  const analyzedAt = text(metadata.aiAnalyzedAt, text(record(metadata.aiExecution).completedAt, text(inquiry.updated_at, inquiry.created_at ? String(inquiry.created_at) : "")));
  const hasSentSupplier = rawSuppliers.some((row) => Boolean(row.sent_at) || ["sent", "delivered", "opened", "replied"].includes(text(row.delivery_status)));
  const aiApproved = metadata.aiApprovalStatus === "approved" && metadata.aiApprovalInvalidated !== true;
  const lifecycleStage = hasSentSupplier
    ? "sent" as const
    : aiApproved && Boolean(metadata.sendPreflightPassedAt)
      ? "ready_to_send" as const
      : String(inquiry.status) === "pending_review" || Boolean(metadata.aiTaskId)
        ? "letter_review" as const
        : "server_draft" as const;

  return {
    id: code,
    title: `询价任务 ${code}`,
    projectName: text(metadata.projectName, text(metadata.project, text(inquiry.subject, "未命名询价任务"))),
    inquiryType: text(metadata.inquiryType, items.some((item) => item.targetType === "material") && items.some((item) => item.targetType === "equipment") ? "设备与地材联合询价" : items[0]?.targetType === "material" ? "地材询价" : "设备询价"),
    status: inquiryStatus.value,
    statusLabel: inquiryStatus.label,
    createdAt: formatDate(inquiry.created_at),
    deadline: formatDate(inquiry.deadline),
    owner: ownerName?.trim() || text(metadata.ownerName, "当前业务负责人"),
    supplierCount: suppliers.length,
    respondedCount: responded.length,
    riskLevel: risk(inquiry.risk_level),
    aiSuggestionStatus: metadata.aiApprovalStatus === "approved" ? "confirmed" : "needs_review",
    aiConfidence,
    lowestQuote,
    lowestQuoteCurrency,
    remainingTime: deadlineState.label,
    isOverdue: deadlineState.overdue,
    lifecycleStage,
    items,
    suppliers,
    letter: {
      version: text(metadata.letterVersion, "当前版本"),
      language: text(metadata.language, "中文"),
      recipients: `${suppliers.length} 家供应商`,
      projectBackground: letterContent || text(legacyLetter.projectBackground, `关于“${text(inquiry.subject)}”的询价任务，请供应商按清单提交完整报价与技术响应。`),
      technicalRequirements: technicalRequirements.length ? technicalRequirements : ["技术要求待补全"],
      quoteRequirements: array<string>(legacyLetter.quoteRequirements).length ? array<string>(legacyLetter.quoteRequirements) : ["报价应包含币种、税费、运输、交付周期和质保条件。"],
      deadlineText: inquiry.deadline ? `${formatDate(inquiry.deadline)} 前回复` : "回复截止时间待设置",
      attachments: mappedAttachments.length ? mappedAttachments.map((file) => file.name) : ["暂无归档附件"],
      contact: ownerName?.trim() || text(metadata.contact, "当前业务负责人"),
      aiNote: "AI内容仅供辅助，发送前必须由人工复核。",
      rawContent: letterContent,
    },
    aiAnalysis: {
      completeness,
      coverage,
      responseRisk: overdueSuppliers.length ? `${overdueSuppliers.length} 家供应商已逾期未响应。` : `${suppliers.length - responded.length} 家供应商尚未形成有效报价。`,
      quoteAbnormal: quotes.length >= 2
        ? `当前有效报价区间为 ${Math.min(...quotes.map((item) => item.quoteAmount)).toLocaleString()} - ${Math.max(...quotes.map((item) => item.quoteAmount)).toLocaleString()} ${lowestQuoteCurrency}，需结合币种和商务条件比价。`
        : "有效报价不足 2 份，暂不能形成稳定的价格差异判断。",
      nextActions: risks.map((item) => item.suggestedAction),
      confidence: aiConfidence,
      evidence: {
        model: aiModel,
        analyzedAt: formatDate(analyzedAt),
        sources: [`${items.length} 项询价对象`, `${suppliers.length} 家供应商`, `${responded.length} 份响应`, `${mappedAttachments.length} 份附件`, `${events.length} 条事件`],
      },
    },
    timeline,
    risks,
    attachments: mappedAttachments,
    operations,
  };
}
