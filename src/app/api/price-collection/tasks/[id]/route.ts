import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  EquipmentCollectionDiscoveryRecord,
  PriceCollectionEvidenceRecord,
  PriceCollectionLeadRecord,
  PriceCollectionRunRecord,
  PriceCollectionSourceRunRecord,
  PriceCollectionSourceQualityRecord,
  PriceCollectionSourceRecord,
  PriceCollectionTaskAuditRecord,
  PriceCollectionTaskDetail,
  PriceCollectionTaskRecord,
} from "@/types/priceCollection";

const writableRoles = new Set(["admin", "manager", "editor"]);
const reviewRoles = new Set(["admin", "manager", "reviewer"]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapTask(row: Record<string, unknown>): PriceCollectionTaskRecord {
  return {
    id: String(row.id),
    taskCode: text(row.task_code),
    targetType: row.target_type === "material" ? "material" : "equipment",
    keyword: text(row.keyword),
    specification: text(row.specification),
    region: text(row.region),
    currency: text(row.currency) || "CNY",
    sourceType: text(row.source_type),
    frequency: text(row.frequency),
    provider: text(row.provider),
    collectionMode: (["web", "quote_upload", "manual", "api"].includes(
      text(row.collection_mode),
    )
      ? text(row.collection_mode)
      : "web") as PriceCollectionTaskRecord["collectionMode"],
    scheduleEnabled: Boolean(row.schedule_enabled),
    scheduleCategory: text(row.schedule_category),
    scheduleExpression: text(row.schedule_expression),
    nextRunAt: text(row.next_run_at),
    lastRunAt: text(row.last_run_at),
    retryCount: number(row.retry_count),
    maxRetries: number(row.max_retries, 3),
    status: (text(row.status) ||
      "queued") as PriceCollectionTaskRecord["status"],
    progress: number(row.progress),
    currentSource: text(row.current_source),
    successCount: number(row.success_count),
    failedCount: number(row.failed_count),
    outcomeStatus: (["pending", "qualified", "partial", "no_price", "blocked"].includes(
      text(row.outcome_status),
    ) ? text(row.outcome_status) : "pending") as PriceCollectionTaskRecord["outcomeStatus"],
    qualifiedLeadCount: number(row.qualified_lead_count ?? row.success_count),
    catalogCandidateCount: number(row.catalog_candidate_count),
    evidenceCount: number(row.evidence_count),
    config: object(row.config),
    lastError: text(row.last_error),
    startedAt: text(row.started_at),
    finishedAt: text(row.finished_at),
    createdAt: text(row.created_at),
    archivedAt: text(row.archived_at),
    archivedBy: row.archived_by ? String(row.archived_by) : null,
  };
}

function mapLead(row: Record<string, unknown>): PriceCollectionLeadRecord {
  return {
    id: String(row.id),
    taskId: row.task_id ? String(row.task_id) : null,
    runId: row.run_id ? String(row.run_id) : null,
    sourceId: row.source_id ? String(row.source_id) : null,
    quoteDocumentId: row.quote_document_id ? String(row.quote_document_id) : null,
    leadCode: text(row.lead_code),
    targetType: row.target_type === "material" ? "material" : "equipment",
    name: text(row.name),
    specification: text(row.specification),
    originalName: text(row.original_name) || text(row.name),
    translatedName: text(row.translated_name),
    originalSpecification: text(row.original_specification) || text(row.specification),
    translatedSpecification: text(row.translated_specification),
    translationStatus: (text(row.translation_status) || "queued") as PriceCollectionLeadRecord["translationStatus"],
    translationConfidence: row.translation_confidence == null ? null : number(row.translation_confidence),
    translationRiskLevel: row.translation_risk_level ? text(row.translation_risk_level) as PriceCollectionLeadRecord["translationRiskLevel"] : null,
    translationReviewStatus: (text(row.translation_review_status) || "pending_review") as PriceCollectionLeadRecord["translationReviewStatus"],
    translationReviewNote: text(row.translation_review_note),
    sourceType: text(row.source_type),
    sourceUrl: text(row.source_url),
    sourceCheckedAt: text(row.source_checked_at),
    quoteDate: text(row.quote_date),
    pricePeriodGranularity: (["day", "month"].includes(text(row.price_period_granularity)) ? text(row.price_period_granularity) : "unknown") as PriceCollectionLeadRecord["pricePeriodGranularity"],
    evidenceCode: text(row.evidence_code),
    region: text(row.region),
    price: number(row.price),
    currency: text(row.currency) || "CNY",
    normalizedPrice: number(row.normalized_price ?? row.price),
    normalizedPriceCny: row.normalized_price_cny == null ? null : number(row.normalized_price_cny),
    exchangeRate: row.exchange_rate == null ? null : number(row.exchange_rate),
    originalUnit: text(row.original_unit),
    priceValidityStatus: (["valid", "needs_review", "invalid"].includes(text(row.price_validity_status)) ? text(row.price_validity_status) : "needs_review") as PriceCollectionLeadRecord["priceValidityStatus"],
    priceValidationReasons: Array.isArray(row.price_validation_reasons) ? row.price_validation_reasons.filter((item): item is string => typeof item === "string") : [],
    priceOriginalText: text(row.price_original_text),
    priceContextExcerpt: text(row.price_context_excerpt),
    isComparable: Boolean(row.is_comparable),
    comparisonKey: text(row.comparison_key),
    fxStatus: (["verified", "missing_rate", "pending"].includes(text(row.fx_status)) ? text(row.fx_status) : "pending") as PriceCollectionLeadRecord["fxStatus"],
    fxRateDate: text(row.fx_rate_date),
    fxSource: text(row.fx_source),
    supplierName: text(row.supplier_name),
    matchTarget: text(row.match_target),
    aiMatchScore: number(row.ai_match_score),
    confidence: number(row.confidence),
    riskLevel: (text(row.risk_level) || "medium") as PriceCollectionLeadRecord["riskLevel"],
    duplicateStatus: row.duplicate_status === "suspected_duplicate" ? "suspected_duplicate" : "unique",
    duplicateScore: number(row.duplicate_score),
    observationCount: number(row.observation_count, 1),
    status: (text(row.status) || "pending_review") as PriceCollectionLeadRecord["status"],
    reviewNotes: text(row.review_notes),
    reviewedAt: text(row.reviewed_at),
    transferredAt: text(row.transferred_at),
    assignedReviewerId: row.assigned_reviewer_id ? String(row.assigned_reviewer_id) : null,
    assignedAt: text(row.assigned_at),
    assignedBy: row.assigned_by ? String(row.assigned_by) : null,
    assignmentNote: text(row.assignment_note),
    reviewDueAt: text(row.review_due_at),
    createdAt: text(row.created_at),
  };
}

function mapRun(row: Record<string, unknown>): PriceCollectionRunRecord {
  const metrics = object(row.metrics);
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    runKind: (text(row.run_kind) || "parent") as PriceCollectionRunRecord["runKind"],
    parentRunId: text(row.parent_run_id),
    sourceRunId: text(row.source_run_id),
    runCode: text(row.run_code),
    triggerType: (text(row.trigger_type) ||
      "manual") as PriceCollectionRunRecord["triggerType"],
    attempt: number(row.attempt, 1),
    status: (text(row.status) ||
      "queued") as PriceCollectionRunRecord["status"],
    progress: number(row.progress),
    fetchedCount: number(row.fetched_count),
    evidenceCount: number(row.evidence_count ?? metrics.evidenceCount),
    createdLeadCount: number(row.created_lead_count),
    updatedLeadCount: number(row.updated_lead_count),
    duplicateCount: number(row.duplicate_count),
    failedSourceCount: number(row.failed_source_count),
    metrics,
    currentSource: text(row.current_source),
    errorMessage: text(row.error_message),
    startedAt: text(row.started_at),
    finishedAt: text(row.finished_at),
    createdAt: text(row.created_at),
  };
}

function mapSourceRun(row: Record<string, unknown>): PriceCollectionSourceRunRecord {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    parentRunId: String(row.parent_run_id),
    sourceId: String(row.source_id),
    sourceName: text(row.source_name),
    sourceHost: text(row.source_host),
    status: (text(row.status) || "queued") as PriceCollectionSourceRunRecord["status"],
    progress: number(row.progress),
    pageBudget: number(row.page_budget),
    pagesUsed: number(row.pages_used),
    fetchedCount: number(row.fetched_count),
    evidenceCount: number(row.evidence_count),
    createdLeadCount: number(row.created_lead_count),
    updatedLeadCount: number(row.updated_lead_count),
    duplicateCount: number(row.duplicate_count),
    failedCount: number(row.failed_count),
    attempt: number(row.attempt),
    maxRetries: number(row.max_retries),
    currentResource: text(row.current_resource),
    errorMessage: text(row.error_message),
    startedAt: text(row.started_at),
    finishedAt: text(row.finished_at),
  };
}

function mapSourceQuality(row: Record<string, unknown>): PriceCollectionSourceQualityRecord {
  return {
    sourceId: String(row.source_id),
    sourceName: text(row.source_name),
    runCount: number(row.run_count),
    failedRunCount: number(row.failed_run_count),
    newCount: number(row.new_count),
    updatedCount: number(row.updated_count),
    duplicateCount: number(row.duplicate_count),
    retainedLeadCount: number(row.retained_lead_count),
    validPriceCount: number(row.valid_price_count),
    newRate: number(row.new_rate),
    updateRate: number(row.update_rate),
    duplicateRate: number(row.duplicate_rate),
    validPriceRate: number(row.valid_price_rate),
    lastRunAt: text(row.last_run_at),
  };
}

function mapEvidence(
  row: Record<string, unknown>,
): PriceCollectionEvidenceRecord {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    runId: row.run_id ? String(row.run_id) : null,
    leadId: row.lead_id ? String(row.lead_id) : null,
    sourceId: row.source_id ? String(row.source_id) : null,
    evidenceCode: text(row.evidence_code),
    sourceUrl: text(row.source_url),
    pageTitle: text(row.page_title),
    excerpt: text(row.excerpt),
    httpStatus: number(row.http_status),
    mimeType: text(row.mime_type),
    fetchedAt: text(row.fetched_at),
    firstSeenAt: text(row.first_seen_at),
    lastSeenAt: text(row.last_seen_at),
    observationCount: number(row.observation_count, 1),
    snapshotKind: (["collector", "manual_review", "quote_document"].includes(
      text(row.snapshot_kind),
    )
      ? text(row.snapshot_kind)
      : "collector") as PriceCollectionEvidenceRecord["snapshotKind"],
    snapshotPayload: object(row.snapshot_payload),
    capturedBy: row.captured_by ? String(row.captured_by) : null,
    capturedAt: text(row.captured_at),
  };
}

function mapDiscovery(
  row: Record<string, unknown>,
): EquipmentCollectionDiscoveryRecord {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    runId: row.run_id ? String(row.run_id) : null,
    sourceId: String(row.source_id),
    resourceUrl: text(row.resource_url),
    parentUrl: text(row.parent_url),
    resourceType: (text(row.resource_type) ||
      "page") as EquipmentCollectionDiscoveryRecord["resourceType"],
    depth: number(row.depth),
    status: (text(row.status) ||
      "queued") as EquipmentCollectionDiscoveryRecord["status"],
    pageTitle: text(row.page_title),
    mimeType: text(row.mime_type),
    httpStatus: row.http_status == null ? null : number(row.http_status),
    errorMessage: text(row.error_message),
    metadata: object(row.metadata),
    discoveredAt: text(row.discovered_at),
    fetchedAt: text(row.fetched_at),
  };
}

function mapSource(row: Record<string, unknown>): PriceCollectionSourceRecord {
  return {
    id: String(row.id),
    sourceCode: text(row.source_code),
    name: text(row.name),
    sourceKind: row.source_kind === "api" ? "api" : "web",
    baseUrl: text(row.base_url),
    isActive: row.is_active !== false,
    defaultCurrency: text(row.default_currency) || "CNY",
    defaultRegion: text(row.default_region),
    qualityScore: number(row.quality_score),
    extractionStrategy: (text(row.extraction_strategy) ||
      "structured_data") as PriceCollectionSourceRecord["extractionStrategy"],
    config: object(row.config) as PriceCollectionSourceRecord["config"],
    lastCheckedAt: text(row.last_checked_at),
    lastError: text(row.last_error),
  };
}

function mapAudit(
  row: Record<string, unknown>,
): PriceCollectionTaskAuditRecord {
  const oldData = object(row.old_data);
  const newData = object(row.new_data);
  return {
    id: String(row.id),
    action: text(row.action),
    actorId: text(row.actor_id),
    createdAt: text(row.created_at),
    oldStatus: text(oldData.status),
    newStatus: text(newData.status),
    progress: newData.progress == null ? null : number(newData.progress),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const { id } = await context.params;
  const decodedId = decodeURIComponent(id);
  let taskQuery = access.supabase
    .from("wpi_price_collection_tasks")
    .select("*")
    .eq("organization_id", access.organizationId);
  taskQuery = uuidPattern.test(decodedId)
    ? taskQuery.eq("id", decodedId)
    : taskQuery.eq("task_code", decodedId);

  const { data: taskRow, error: taskError } = await taskQuery.maybeSingle();
  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 503 });
  }
  if (!taskRow) {
    return NextResponse.json(
      { error: "采集任务不存在或无权访问" },
      { status: 404 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedView = searchParams.get("view");
  const view = (
    ["candidates", "discoveries", "evidence", "runs"].includes(
      requestedView || "",
    )
      ? requestedView
      : "candidates"
  ) as PriceCollectionTaskDetail["pagination"]["view"];
  const requestedPageSize = Number(searchParams.get("pageSize"));
  const pageSize = (
    [10, 20, 30].includes(requestedPageSize) ? requestedPageSize : 10
  ) as 10 | 20 | 30;
  const requestedPage = Math.max(1, number(searchParams.get("page"), 1));
  const requestedLeadPageSize = Number(searchParams.get("leadPageSize"));
  const leadPageSize = (
    [10, 20, 30].includes(requestedLeadPageSize) ? requestedLeadPageSize : 10
  ) as 10 | 20 | 30;
  const requestedLeadPage = Math.max(1, number(searchParams.get("leadPage"), 1));
  const leadRangeFrom = (requestedLeadPage - 1) * leadPageSize;
  const leadRangeTo = leadRangeFrom + leadPageSize - 1;
  const statusFilter = text(searchParams.get("status"));
  const resourceTypeFilter = text(searchParams.get("resourceType"));
  const reviewStatusFilter = text(searchParams.get("reviewStatus"));
  const discoveryStatuses = new Set([
    "queued",
    "fetching",
    "fetched",
    "tracked",
    "blocked",
    "failed",
    "skipped",
  ]);
  const runStatuses = new Set([
    "queued",
    "running",
    "completed",
    "partial",
    "failed",
    "cancelled",
  ]);
  const resourceTypes = new Set([
    "seed",
    "page",
    "product",
    "catalog",
    "pdf",
    "api",
  ]);
  const reviewStatuses = new Set(["pending_review", "approved", "rejected"]);

  let runCountQuery = access.supabase
    .from("wpi_price_collection_runs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organizationId)
    .eq("task_id", taskRow.id)
    .eq("run_kind", "parent");
  if (runStatuses.has(statusFilter))
    runCountQuery = runCountQuery.eq("status", statusFilter);

  let discoveryCountQuery = access.supabase
    .from("wpi_equipment_collection_discoveries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organizationId)
    .eq("task_id", taskRow.id);
  if (discoveryStatuses.has(statusFilter))
    discoveryCountQuery = discoveryCountQuery.eq("status", statusFilter);
  if (resourceTypes.has(resourceTypeFilter))
    discoveryCountQuery = discoveryCountQuery.eq(
      "resource_type",
      resourceTypeFilter,
    );

  let candidateCountQuery = access.supabase
    .from("wpi_equipment_catalog")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organizationId)
    .eq("collection_task_id", taskRow.id);
  if (reviewStatuses.has(reviewStatusFilter))
    candidateCountQuery = candidateCountQuery.eq(
      "review_status",
      reviewStatusFilter,
    );

  const [
    auditResult,
    filteredRunCount,
    filteredEvidenceCount,
    filteredDiscoveryCount,
    filteredCandidateCount,
    discoveryTotal,
    productTotal,
    fetchedTotal,
    queuedTotal,
    failedTotal,
    candidateTotal,
    pendingReviewTotal,
    evidenceTotal,
    runTotal,
  ] = await Promise.all([
    access.supabase
      .from("wpi_audit_logs")
      .select("id,actor_id,action,old_data,new_data,created_at")
      .eq("organization_id", access.organizationId)
      .eq("table_name", "wpi_price_collection_tasks")
      .eq("record_id", String(taskRow.id))
      .order("created_at", { ascending: false })
      .limit(50),
    runCountQuery,
    access.supabase
      .from("wpi_price_collection_evidence")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id),
    discoveryCountQuery,
    candidateCountQuery,
    access.supabase
      .from("wpi_equipment_collection_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id),
    access.supabase
      .from("wpi_equipment_collection_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id)
      .eq("resource_type", "product"),
    access.supabase
      .from("wpi_equipment_collection_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id)
      .in("status", ["fetched", "tracked"]),
    access.supabase
      .from("wpi_equipment_collection_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id)
      .in("status", ["queued", "fetching"]),
    access.supabase
      .from("wpi_equipment_collection_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id)
      .in("status", ["failed", "blocked"]),
    access.supabase
      .from("wpi_equipment_catalog")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("collection_task_id", taskRow.id),
    access.supabase
      .from("wpi_equipment_catalog")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("collection_task_id", taskRow.id)
      .eq("review_status", "pending_review"),
    access.supabase
      .from("wpi_price_collection_evidence")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id),
    access.supabase
      .from("wpi_price_collection_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id)
      .eq("run_kind", "parent"),
  ]);

  const filteredTotals = {
    candidates: filteredCandidateCount.count ?? 0,
    discoveries: filteredDiscoveryCount.count ?? 0,
    evidence: filteredEvidenceCount.count ?? 0,
    runs: filteredRunCount.count ?? 0,
  };
  const filteredTotal = filteredTotals[view];
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  let runQuery = access.supabase
    .from("wpi_price_collection_runs")
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("task_id", taskRow.id)
    .eq("run_kind", "parent");
  if (runStatuses.has(statusFilter))
    runQuery = runQuery.eq("status", statusFilter);

  let discoveryQuery = access.supabase
    .from("wpi_equipment_collection_discoveries")
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("task_id", taskRow.id);
  if (discoveryStatuses.has(statusFilter))
    discoveryQuery = discoveryQuery.eq("status", statusFilter);
  if (resourceTypes.has(resourceTypeFilter))
    discoveryQuery = discoveryQuery.eq("resource_type", resourceTypeFilter);

  let candidateQuery = access.supabase
    .from("wpi_equipment_catalog")
    .select(
      "id,catalog_code,equipment_name,equipment_category,equipment_type,brand,product_series,model,specification,parameter_completeness,ai_confidence,review_status,risk_level,source_url,extracted_at",
    )
    .eq("organization_id", access.organizationId)
    .eq("collection_task_id", taskRow.id);
  if (reviewStatuses.has(reviewStatusFilter))
    candidateQuery = candidateQuery.eq("review_status", reviewStatusFilter);

  const [runResult, sourceRunResult, evidenceResult, discoveryResult, catalogCandidateResult] =
    await Promise.all([
      runQuery
        .order("created_at", { ascending: false })
        .range(rangeFrom, rangeTo),
      access.supabase
        .from("wpi_price_collection_source_runs")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("task_id", taskRow.id)
        .order("created_at", { ascending: false })
        .limit(200),
      access.supabase
        .from("wpi_price_collection_evidence")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("task_id", taskRow.id)
        .order("fetched_at", { ascending: false })
        .range(rangeFrom, rangeTo),
      discoveryQuery
        .order("discovered_at", { ascending: false })
        .range(rangeFrom, rangeTo),
      candidateQuery
        .order("extracted_at", { ascending: false })
        .range(rangeFrom, rangeTo),
    ]);

  const taskConfig = object(taskRow.config);
  const configuredSourceIds = Array.isArray(taskConfig.sourceIds)
    ? taskConfig.sourceIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const sourceIds = Array.from(
    new Set([
      ...configuredSourceIds,
      ...(evidenceResult.data ?? [])
        .map((row) => row.source_id)
        .filter((value): value is string => Boolean(value)),
    ]),
  );
  const sourceResult = sourceIds.length
    ? await access.supabase
        .from("wpi_price_collection_sources")
        .select("*")
        .eq("organization_id", access.organizationId)
        .in("id", sourceIds)
    : { data: [], error: null };
  const sourceQualityResult = sourceIds.length
    ? await access.supabase
        .from("wpi_price_collection_source_quality_metrics")
        .select("*")
        .eq("organization_id", access.organizationId)
        .in("source_id", sourceIds)
        .order("last_run_at", { ascending: false })
    : { data: [], error: null };
  const [leadResult, totalLeadResult, pendingLeadResult, highRiskLeadResult] = await Promise.all([
    access.supabase
      .from("wpi_price_collection_leads")
      .select("*")
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id)
      .order("created_at", { ascending: false })
      .range(leadRangeFrom, leadRangeTo),
    access.supabase
      .from("wpi_price_collection_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id),
    access.supabase
      .from("wpi_price_collection_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id)
      .eq("status", "pending_review"),
    access.supabase
      .from("wpi_price_collection_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskRow.id)
      .in("risk_level", ["high", "critical"]),
  ]);
  const totalLeads = totalLeadResult.count ?? 0;
  const leadPageCount = Math.max(1, Math.ceil(totalLeads / leadPageSize));
  const payload: PriceCollectionTaskDetail = {
    mode: "supabase",
    role: access.role,
    permissions: {
      canWrite: writableRoles.has(access.role),
      canReview: reviewRoles.has(access.role),
    },
    task: mapTask(taskRow as Record<string, unknown>),
    leads: leadResult.error
      ? []
      : (leadResult.data ?? []).map((row) => mapLead(row as Record<string, unknown>)),
    runs: runResult.error
      ? []
      : (runResult.data ?? []).map((row) =>
          mapRun(row as Record<string, unknown>),
        ),
    sourceRuns: sourceRunResult.error
      ? []
      : (sourceRunResult.data ?? []).map((row) =>
          mapSourceRun(row as Record<string, unknown>),
        ),
    sourceQuality: sourceQualityResult.error
      ? []
      : (sourceQualityResult.data ?? []).map((row) =>
          mapSourceQuality(row as Record<string, unknown>),
        ),
    evidence: evidenceResult.error
      ? []
      : (evidenceResult.data ?? []).map((row) =>
          mapEvidence(row as Record<string, unknown>),
        ),
    discoveries: discoveryResult.error
      ? []
      : (discoveryResult.data ?? []).map((row) =>
          mapDiscovery(row as Record<string, unknown>),
        ),
    catalogCandidates: catalogCandidateResult.error
      ? []
      : (catalogCandidateResult.data ?? []).map((row) => ({
          id: String(row.id),
          catalogCode: text(row.catalog_code),
          equipmentName: text(row.equipment_name),
          equipmentCategory: text(row.equipment_category),
          equipmentType: text(row.equipment_type),
          brand: text(row.brand),
          productSeries: text(row.product_series),
          model: text(row.model),
          specification: text(row.specification),
          completeness: number(row.parameter_completeness),
          aiConfidence: number(row.ai_confidence),
          reviewStatus: text(row.review_status),
          riskLevel: text(row.risk_level),
          sourceUrl: text(row.source_url),
          extractedAt: text(row.extracted_at),
        })),
    sources: sourceResult.error
      ? []
      : (sourceResult.data ?? []).map((row) =>
          mapSource(row as Record<string, unknown>),
        ),
    auditLogs: auditResult.error
      ? []
      : (auditResult.data ?? []).map((row) =>
          mapAudit(row as Record<string, unknown>),
        ),
    summary: {
      discoveries: discoveryTotal.count ?? 0,
      products: productTotal.count ?? 0,
      fetched: fetchedTotal.count ?? 0,
      queued: queuedTotal.count ?? 0,
      failed: failedTotal.count ?? 0,
      candidates: candidateTotal.count ?? 0,
      pendingReview: pendingReviewTotal.count ?? 0,
      evidence: evidenceTotal.count ?? 0,
      runs: runTotal.count ?? 0,
      totalLeads,
      pendingLeads: pendingLeadResult.count ?? 0,
      highRiskLeads: highRiskLeadResult.count ?? 0,
    },
    pagination: { view, page, pageSize, total: filteredTotal, pageCount },
    leadPagination: {
      page: Math.min(requestedLeadPage, leadPageCount),
      pageSize: leadPageSize,
      total: totalLeads,
      pageCount: leadPageCount,
    },
  };

  return NextResponse.json(payload);
}
