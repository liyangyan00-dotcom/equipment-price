import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { verifyCollectionSource } from "@/lib/priceCollection/sourceValidator";
import type {
  PriceCollectionBootstrap,
  PriceCollectionEvidenceRecord,
  PriceCollectionHistoryMatchRecord,
  PriceCollectionLeadDetailResponse,
  PriceCollectionLeadPoolResponse,
  PriceCollectionLeadRecord,
  PriceCollectionReviewerRecord,
  PriceCollectionRunRecord,
  PriceCollectionSourceRunRecord,
  PriceCollectionSchedulePolicyRecord,
  PriceCollectionSourceRecord,
  PriceCollectionTaskRecord,
} from "@/types/priceCollection";

const writableRoles = new Set(["admin", "manager", "editor"]);
const reviewRoles = new Set(["admin", "manager", "reviewer"]);

type ApiAccess = Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>;

type AdmissionSourceLead = {
  id: string;
  source_id: string | null;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
};

async function verifyAdmissionSource(access: ApiAccess, lead: AdmissionSourceLead) {
  const checkedAt = new Date().toISOString();
  const sourceResult = lead.source_id
    ? await access.supabase
        .from("wpi_price_collection_sources")
        .select("id,source_kind,base_url,allowed_hosts,api_integration_id")
        .eq("organization_id", access.organizationId)
        .eq("id", lead.source_id)
        .maybeSingle()
    : { data: null, error: null };
  if (sourceResult.error) throw new Error(sourceResult.error.message);

  const source = sourceResult.data;
  if (source?.source_kind === "api") {
    if (!source.api_integration_id) throw new Error("API 来源尚未关联授权凭证");
    const invoked = await access.supabase.functions.invoke("wpi-price-collector", {
      body: {
        action: "validate_api_integration",
        integrationId: source.api_integration_id,
      },
    });
    if (invoked.error || invoked.data?.error) {
      let message = invoked.error?.message || String(invoked.data?.error || "API 来源验证失败");
      if (invoked.error?.context instanceof Response) {
        const detail = await invoked.error.context.clone().json().catch(() => ({})) as { error?: string };
        message = detail.error || message;
      }
      throw new Error(message);
    }
    return {
      checkedAt,
      result: {
        status: "passed",
        kind: "api",
        sourceId: source.id,
        checkedAt,
      },
    };
  }

  const rawUrl = asText(lead.source_url) || asText(source?.base_url);
  if (!rawUrl) throw new Error("线索没有可访问的网页或 API 来源");
  let fallbackHost = "";
  try {
    fallbackHost = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    throw new Error("线索来源地址无效");
  }
  const allowedHosts = Array.isArray(source?.allowed_hosts)
    ? source.allowed_hosts.filter((value): value is string => typeof value === "string")
    : [fallbackHost];
  const verification = await verifyCollectionSource(rawUrl, allowedHosts);
  return {
    checkedAt,
    result: {
      status: "passed",
      kind: "web",
      sourceId: source?.id ?? null,
      checkedAt,
      validatedUrl: verification.url,
      httpStatus: verification.status,
      contentType: verification.contentType,
    },
  };
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function scheduleSettings(rawFrequency: unknown, enabled = true) {
  const requested = asText(rawFrequency);
  const frequency = requested === "每小时" || requested === "hourly"
    ? "每小时"
    : requested === "每月" || requested === "monthly"
      ? "每月"
    : requested === "每周" || requested === "weekly"
      ? "每周"
      : "每天";
  const scheduleExpression = frequency === "每小时"
    ? "0 * * * *"
    : frequency === "每月"
      ? "0 2 1 * *"
    : frequency === "每周"
      ? "0 2 * * 1"
      : "0 2 * * *";
  const nextRun = new Date();
  if (frequency === "每小时") {
    nextRun.setUTCMinutes(0, 0, 0);
    nextRun.setUTCHours(nextRun.getUTCHours() + 1);
  } else if (frequency === "每月") {
    nextRun.setUTCHours(2, 0, 0, 0);
    nextRun.setUTCMonth(nextRun.getUTCMonth() + 1, 1);
  } else if (frequency === "每周") {
    nextRun.setUTCHours(2, 0, 0, 0);
    const daysUntilMonday = (1 - nextRun.getUTCDay() + 7) % 7;
    nextRun.setUTCDate(nextRun.getUTCDate() + daysUntilMonday);
    if (nextRun.getTime() <= Date.now()) nextRun.setUTCDate(nextRun.getUTCDate() + 7);
  } else {
    nextRun.setUTCHours(2, 0, 0, 0);
    if (nextRun.getTime() <= Date.now()) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }
  return {
    frequency: enabled ? frequency : "仅本次",
    scheduleEnabled: enabled,
    scheduleExpression: enabled ? scheduleExpression : null,
    nextRunAt: enabled ? nextRun.toISOString() : null,
  };
}

function mapSchedulePolicy(row: Record<string, unknown>): PriceCollectionSchedulePolicyRecord {
  return {
    id: String(row.id),
    categoryKey: asText(row.category_key),
    categoryLabel: asText(row.category_label),
    targetType: row.target_type === "material" ? "material" : "equipment",
    frequency: asText(row.frequency) as PriceCollectionSchedulePolicyRecord["frequency"],
    scheduleExpression: asText(row.schedule_expression),
    timezone: asText(row.timezone) || "Asia/Shanghai",
    isActive: row.is_active !== false,
    lastAppliedAt: asText(row.last_applied_at),
  };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function mapTask(row: Record<string, unknown>): PriceCollectionTaskRecord {
  return {
    id: String(row.id),
    taskCode: asText(row.task_code),
    targetType: row.target_type === "material" ? "material" : "equipment",
    keyword: asText(row.keyword),
    specification: asText(row.specification),
    region: asText(row.region),
    currency: asText(row.currency) || "CNY",
    sourceType: asText(row.source_type),
    frequency: asText(row.frequency),
    provider: asText(row.provider),
    collectionMode: (["web", "quote_upload", "manual", "api"].includes(
      asText(row.collection_mode),
    )
      ? asText(row.collection_mode)
      : "web") as PriceCollectionTaskRecord["collectionMode"],
    scheduleEnabled: Boolean(row.schedule_enabled),
    scheduleCategory: asText(row.schedule_category),
    scheduleExpression: asText(row.schedule_expression),
    nextRunAt: asText(row.next_run_at),
    lastRunAt: asText(row.last_run_at),
    retryCount: asNumber(row.retry_count),
    maxRetries: asNumber(row.max_retries, 3),
    status: (asText(row.status) ||
      "queued") as PriceCollectionTaskRecord["status"],
    progress: asNumber(row.progress),
    currentSource: asText(row.current_source),
    successCount: asNumber(row.success_count),
    failedCount: asNumber(row.failed_count),
    outcomeStatus: (["pending", "qualified", "partial", "no_price", "blocked"].includes(
      asText(row.outcome_status),
    )
      ? asText(row.outcome_status)
      : "pending") as PriceCollectionTaskRecord["outcomeStatus"],
    qualifiedLeadCount: asNumber(row.qualified_lead_count ?? row.success_count),
    catalogCandidateCount: asNumber(row.catalog_candidate_count),
    evidenceCount: asNumber(row.evidence_count),
    config:
      row.config && typeof row.config === "object"
        ? (row.config as Record<string, unknown>)
        : {},
    lastError: asText(row.last_error),
    startedAt: asText(row.started_at),
    finishedAt: asText(row.finished_at),
    createdAt: asText(row.created_at),
    archivedAt: asText(row.archived_at),
    archivedBy: row.archived_by ? String(row.archived_by) : null,
  };
}

function mapLead(row: Record<string, unknown>): PriceCollectionLeadRecord {
  return {
    id: String(row.id),
    taskId: row.task_id ? String(row.task_id) : null,
    runId: row.run_id ? String(row.run_id) : null,
    sourceId: row.source_id ? String(row.source_id) : null,
    quoteDocumentId: row.quote_document_id
      ? String(row.quote_document_id)
      : null,
    leadCode: asText(row.lead_code),
    targetType: row.target_type === "material" ? "material" : "equipment",
    name: asText(row.name),
    specification: asText(row.specification),
    originalName: asText(row.original_name) || asText(row.name),
    translatedName: asText(row.translated_name),
    originalSpecification: asText(row.original_specification) || asText(row.specification),
    translatedSpecification: asText(row.translated_specification),
    translationStatus: (asText(row.translation_status) || "queued") as PriceCollectionLeadRecord["translationStatus"],
    translationConfidence: row.translation_confidence == null ? null : asNumber(row.translation_confidence),
    translationRiskLevel: row.translation_risk_level
      ? asText(row.translation_risk_level) as PriceCollectionLeadRecord["translationRiskLevel"]
      : null,
    translationReviewStatus: (asText(row.translation_review_status) || "pending_review") as PriceCollectionLeadRecord["translationReviewStatus"],
    translationReviewNote: asText(row.translation_review_note),
    sourceType: asText(row.source_type),
    sourceUrl: asText(row.source_url),
    sourceCheckedAt: asText(row.source_checked_at),
    quoteDate: asText(row.quote_date),
    pricePeriodGranularity: (["day", "month"].includes(asText(row.price_period_granularity))
      ? asText(row.price_period_granularity)
      : "unknown") as PriceCollectionLeadRecord["pricePeriodGranularity"],
    evidenceCode: asText(row.evidence_code),
    region: asText(row.region),
    price: asNumber(row.price),
    currency: asText(row.currency) || "CNY",
    normalizedPrice: asNumber(row.normalized_price ?? row.price),
    normalizedPriceCny: row.normalized_price_cny == null
      ? null
      : asNumber(row.normalized_price_cny),
    exchangeRate: row.exchange_rate == null ? null : asNumber(row.exchange_rate),
    originalUnit: asText(row.original_unit),
    priceValidityStatus: (["valid", "needs_review", "invalid"].includes(asText(row.price_validity_status))
      ? asText(row.price_validity_status)
      : "needs_review") as PriceCollectionLeadRecord["priceValidityStatus"],
    priceValidationReasons: Array.isArray(row.price_validation_reasons)
      ? row.price_validation_reasons.filter((item): item is string => typeof item === "string")
      : [],
    priceOriginalText: asText(row.price_original_text),
    priceContextExcerpt: asText(row.price_context_excerpt),
    isComparable: Boolean(row.is_comparable),
    comparisonKey: asText(row.comparison_key),
    fxStatus: (["verified", "missing_rate", "pending"].includes(asText(row.fx_status))
      ? asText(row.fx_status)
      : "pending") as PriceCollectionLeadRecord["fxStatus"],
    fxRateDate: asText(row.fx_rate_date),
    fxSource: asText(row.fx_source),
    supplierName: asText(row.supplier_name),
    matchTarget: asText(row.match_target),
    aiMatchScore: asNumber(row.ai_match_score),
    confidence: asNumber(row.confidence),
    riskLevel: (asText(row.risk_level) ||
      "medium") as PriceCollectionLeadRecord["riskLevel"],
    duplicateStatus:
      row.duplicate_status === "suspected_duplicate"
        ? "suspected_duplicate"
        : "unique",
    duplicateScore: asNumber(row.duplicate_score),
    observationCount: asNumber(row.observation_count, 1),
    status: (asText(row.status) ||
      "pending_review") as PriceCollectionLeadRecord["status"],
    reviewNotes: asText(row.review_notes),
    reviewedAt: asText(row.reviewed_at),
    transferredAt: asText(row.transferred_at),
    assignedReviewerId: row.assigned_reviewer_id
      ? String(row.assigned_reviewer_id)
      : null,
    assignedAt: asText(row.assigned_at),
    assignedBy: row.assigned_by ? String(row.assigned_by) : null,
    assignmentNote: asText(row.assignment_note),
    reviewDueAt: asText(row.review_due_at),
    createdAt: asText(row.created_at),
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
    evidenceCode: asText(row.evidence_code),
    sourceUrl: asText(row.source_url),
    pageTitle: asText(row.page_title),
    excerpt: asText(row.excerpt),
    httpStatus: asNumber(row.http_status),
    mimeType: asText(row.mime_type),
    fetchedAt: asText(row.fetched_at),
    firstSeenAt: asText(row.first_seen_at),
    lastSeenAt: asText(row.last_seen_at),
    observationCount: asNumber(row.observation_count, 1),
    snapshotKind: (["collector", "manual_review", "quote_document"].includes(
      asText(row.snapshot_kind),
    )
      ? asText(row.snapshot_kind)
      : "collector") as PriceCollectionEvidenceRecord["snapshotKind"],
    snapshotPayload:
      row.snapshot_payload && typeof row.snapshot_payload === "object"
        ? (row.snapshot_payload as Record<string, unknown>)
        : {},
    capturedBy: row.captured_by ? String(row.captured_by) : null,
    capturedAt: asText(row.captured_at),
  };
}

function mapReviewer(
  row: Record<string, unknown>,
): PriceCollectionReviewerRecord {
  return {
    userId: String(row.user_id),
    displayName: asText(row.display_name) || "审核成员",
    role: asText(row.role),
    isCurrentUser: Boolean(row.is_current_user),
  };
}

function mapHistoryMatch(
  row: Record<string, unknown>,
): PriceCollectionHistoryMatchRecord {
  return {
    recordId: String(row.record_id),
    recordCode: asText(row.record_code),
    targetType: row.target_type === "material" ? "material" : "equipment",
    recordName: asText(row.record_name),
    recordSpecification: asText(row.record_specification),
    recordPrice: asNumber(row.record_price),
    recordCurrency: asText(row.record_currency) || "CNY",
    sourceType: asText(row.source_type),
    recordedAt: asText(row.recorded_at),
    matchScore: asNumber(row.match_score),
    priceDeltaPct:
      row.price_delta_pct == null ? null : asNumber(row.price_delta_pct),
  };
}

function mapSource(row: Record<string, unknown>): PriceCollectionSourceRecord {
  return {
    id: String(row.id),
    sourceCode: asText(row.source_code),
    name: asText(row.name),
    sourceKind: row.source_kind === "api" ? "api" : "web",
    baseUrl: asText(row.base_url),
    isActive: row.is_active !== false,
    defaultCurrency: asText(row.default_currency) || "CNY",
    defaultRegion: asText(row.default_region),
    qualityScore: asNumber(row.quality_score),
    extractionStrategy: (["structured_data", "html_table", "json_api"].includes(
      asText(row.extraction_strategy),
    )
      ? asText(row.extraction_strategy)
      : "structured_data") as PriceCollectionSourceRecord["extractionStrategy"],
    config: (row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? row.config
      : {}) as PriceCollectionSourceRecord["config"],
    lastCheckedAt: asText(row.last_checked_at),
    lastError: asText(row.last_error),
  };
}

function mapRun(row: Record<string, unknown>): PriceCollectionRunRecord {
  const metrics = row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics)
    ? (row.metrics as Record<string, unknown>)
    : {};
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    runKind: (asText(row.run_kind) || "parent") as PriceCollectionRunRecord["runKind"],
    parentRunId: asText(row.parent_run_id),
    sourceRunId: asText(row.source_run_id),
    runCode: asText(row.run_code),
    triggerType: (asText(row.trigger_type) ||
      "manual") as PriceCollectionRunRecord["triggerType"],
    attempt: asNumber(row.attempt, 1),
    status: (asText(row.status) ||
      "queued") as PriceCollectionRunRecord["status"],
    progress: asNumber(row.progress),
    fetchedCount: asNumber(row.fetched_count),
    evidenceCount: asNumber(row.evidence_count ?? metrics.evidenceCount),
    createdLeadCount: asNumber(row.created_lead_count),
    updatedLeadCount: asNumber(row.updated_lead_count),
    duplicateCount: asNumber(row.duplicate_count),
    failedSourceCount: asNumber(row.failed_source_count),
    metrics,
    currentSource: asText(row.current_source),
    errorMessage: asText(row.error_message),
    startedAt: asText(row.started_at),
    finishedAt: asText(row.finished_at),
    createdAt: asText(row.created_at),
  };
}

function mapSourceRun(row: Record<string, unknown>): PriceCollectionSourceRunRecord {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    parentRunId: String(row.parent_run_id),
    sourceId: String(row.source_id),
    sourceName: asText(row.source_name),
    sourceHost: asText(row.source_host),
    status: (asText(row.status) || "queued") as PriceCollectionSourceRunRecord["status"],
    progress: asNumber(row.progress),
    pageBudget: asNumber(row.page_budget),
    pagesUsed: asNumber(row.pages_used),
    fetchedCount: asNumber(row.fetched_count),
    evidenceCount: asNumber(row.evidence_count),
    createdLeadCount: asNumber(row.created_lead_count),
    updatedLeadCount: asNumber(row.updated_lead_count),
    duplicateCount: asNumber(row.duplicate_count),
    failedCount: asNumber(row.failed_count),
    attempt: asNumber(row.attempt),
    maxRetries: asNumber(row.max_retries),
    currentResource: asText(row.current_resource),
    errorMessage: asText(row.error_message),
    startedAt: asText(row.started_at),
    finishedAt: asText(row.finished_at),
  };
}

export async function GET(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const view = searchParams.get("view") || "bootstrap";

  if (view === "equipment_progress") {
    const ids = [...new Set((searchParams.get("taskIds") || "").split(",").filter(Boolean))];
    if (!ids.length || ids.length > 100 || ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      return NextResponse.json({ error: "Invalid task IDs" }, { status: 400 });
    }
    const result = await access.supabase
      .from("wpi_price_collection_tasks")
      .select("id,status,progress,current_source,success_count,failed_count,last_run_at,next_run_at")
      .eq("organization_id", access.organizationId)
      .eq("target_type", "equipment")
      .in("id", ids)
      .limit(100);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 503 });
    return NextResponse.json({ tasks: result.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (view === "schedule_policies") {
    const result = await access.supabase
      .from("wpi_price_collection_schedule_policies")
      .select("*")
      .eq("organization_id", access.organizationId)
      .order("target_type")
      .order("category_label");
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
    return NextResponse.json({
      policies: (result.data ?? []).map((row) => mapSchedulePolicy(row as Record<string, unknown>)),
      canWrite: writableRoles.has(access.role),
    });
  }

  if (view === "task_status") {
    const taskId = asText(searchParams.get("taskId"));
    if (!taskId) {
      return NextResponse.json({ error: "采集任务 ID 不能为空" }, { status: 400 });
    }
    const [taskResult, runResult, sourceRunResult, evidenceResult, leadResult] = await Promise.all([
      access.supabase
        .from("wpi_price_collection_tasks")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("id", taskId)
        .maybeSingle(),
      access.supabase
        .from("wpi_price_collection_runs")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("task_id", taskId)
        .eq("run_kind", "parent")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      access.supabase
        .from("wpi_price_collection_source_runs")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(100),
      access.supabase
        .from("wpi_price_collection_evidence")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", access.organizationId)
        .eq("task_id", taskId),
      access.supabase
        .from("wpi_price_collection_leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", access.organizationId)
        .eq("task_id", taskId),
    ]);
    const error = taskResult.error ?? runResult.error ?? sourceRunResult.error ?? evidenceResult.error ?? leadResult.error;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!taskResult.data) return NextResponse.json({ error: "采集任务不存在" }, { status: 404 });
    return NextResponse.json({
      task: mapTask(taskResult.data as Record<string, unknown>),
      run: runResult.data
        ? mapRun({
            ...runResult.data,
            evidence_count: evidenceResult.count ?? 0,
            created_lead_count: leadResult.count ?? runResult.data.created_lead_count,
          })
        : null,
      sourceRuns: (sourceRunResult.data ?? [])
        .filter((row) => !runResult.data || String(row.parent_run_id) === String(runResult.data.id))
        .map((row) => mapSourceRun(row)),
      evidenceCount: evidenceResult.count ?? 0,
      leadCount: leadResult.count ?? 0,
    });
  }

  if (view === "lead_detail") {
    const leadId = asText(searchParams.get("leadId"));
    if (!leadId) {
      return NextResponse.json(
        { error: "价格线索 ID 不能为空" },
        { status: 400 },
      );
    }
    let leadQuery = access.supabase
      .from("wpi_price_collection_leads")
      .select("*")
      .eq("organization_id", access.organizationId);
    leadQuery = /^[0-9a-f-]{36}$/i.test(leadId)
      ? leadQuery.eq("id", leadId)
      : leadQuery.eq("lead_code", leadId);
    const leadResult = await leadQuery.maybeSingle();
    if (leadResult.error) {
      return NextResponse.json(
        { error: leadResult.error.message },
        { status: 400 },
      );
    }
    if (!leadResult.data) {
      return NextResponse.json({ error: "价格线索不存在" }, { status: 404 });
    }
    const mappedLead = mapLead(leadResult.data as Record<string, unknown>);
    let trendQuery = access.supabase
      .from("wpi_price_collection_leads")
      .select("quote_date, price")
      .eq("organization_id", access.organizationId)
      .eq("target_type", mappedLead.targetType)
      .eq("currency", mappedLead.currency)
      .not("quote_date", "is", null)
      .limit(1000);
    if (mappedLead.targetType === "material" && mappedLead.originalUnit) {
      trendQuery = trendQuery
        .eq("name", mappedLead.name)
        .eq("original_unit", mappedLead.originalUnit);
    } else if (mappedLead.comparisonKey) {
      trendQuery = trendQuery.eq("comparison_key", mappedLead.comparisonKey);
    } else {
      trendQuery = trendQuery
        .eq("name", mappedLead.name)
        .eq("specification", mappedLead.specification);
    }
    if (mappedLead.region) trendQuery = trendQuery.eq("region", mappedLead.region);
    const [evidenceResult, matchResult, trendResult] = await Promise.all([
      access.supabase
        .from("wpi_price_collection_evidence")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("lead_id", leadResult.data.id)
        .order("captured_at", { ascending: false })
        .limit(20),
      mappedLead.isComparable
        ? access.supabase.rpc("wpi_find_price_collection_history_matches", {
            target_lead_id: leadResult.data.id,
            match_limit: 8,
          })
        : Promise.resolve({ data: [], error: null }),
      trendQuery,
    ]);
    const detailError = evidenceResult.error ?? matchResult.error ?? trendResult.error;
    if (detailError) {
      return NextResponse.json({ error: detailError.message }, { status: 400 });
    }
    const monthlyBuckets = new Map<string, number[]>();
    ((trendResult.data ?? []) as Array<Record<string, unknown>>).forEach((row) => {
      const month = asText(row.quote_date).slice(0, 7);
      const price = asNumber(row.price);
      if (!/^\d{4}-\d{2}$/.test(month) || price <= 0) return;
      monthlyBuckets.set(month, [...(monthlyBuckets.get(month) ?? []), price]);
    });
    let previousAverage: number | null = null;
    const monthlyTrend = Array.from(monthlyBuckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, prices]) => {
        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const monthOverMonthPct = previousAverage && previousAverage > 0
          ? (averagePrice - previousAverage) / previousAverage * 100
          : null;
        previousAverage = averagePrice;
        return {
          month,
          averagePrice,
          minimumPrice: Math.min(...prices),
          maximumPrice: Math.max(...prices),
          sampleCount: prices.length,
          monthOverMonthPct,
        };
      });
    const response: PriceCollectionLeadDetailResponse = {
      lead: mappedLead,
      evidence: (evidenceResult.data ?? []).map((row) =>
        mapEvidence(row as Record<string, unknown>),
      ),
      historyMatches: (
        (matchResult.data ?? []) as Array<Record<string, unknown>>
      ).map((row) => mapHistoryMatch(row)),
      monthlyTrend,
    };
    return NextResponse.json(response);
  }

  if (view === "lead_pool") {
    const page = Math.max(1, asNumber(searchParams.get("page"), 1));
    const pageSize = Math.max(
      1,
      Math.min(100, asNumber(searchParams.get("pageSize"), 10)),
    );
    const typeMap: Record<string, string> = {
      设备: "equipment",
      地材: "material",
    };
    const statusMap: Record<string, string> = {
      待确认: "pending_review",
      可入库: "ready",
      已入库: "transferred",
      已作废: "rejected",
    };
    const riskMap: Record<string, string> = {
      低风险: "low",
      中风险: "medium",
      高风险: "high",
      严重风险: "critical",
    };
    const rawType = asText(searchParams.get("type"));
    const rawStatus = asText(searchParams.get("status"));
    const rawRisk = asText(searchParams.get("risk"));
    const rawSource = asText(searchParams.get("source"));
    const rawRegion = asText(searchParams.get("region"));
    const rawAssignee = asText(searchParams.get("assignee"));
    const rawTaskId = asText(searchParams.get("taskId"));
    const rawIssue = asText(searchParams.get("issue"));
    const rawValidity = asText(searchParams.get("validity")) || "all";
    const minConfidence = searchParams.get("minConfidence");
    const maxConfidence = searchParams.get("maxConfidence");
    const requestedLeadId = asText(searchParams.get("leadId"));
    const rpcFilters = {
      search_keyword: asText(searchParams.get("keyword")) || null,
      filter_task_id: /^[0-9a-f-]{36}$/i.test(rawTaskId) ? rawTaskId : null,
      filter_target_type: typeMap[rawType] || rawType || null,
      filter_source_type: rawSource || null,
      filter_region: rawRegion || null,
      filter_status: statusMap[rawStatus] || rawStatus || null,
      filter_risk_level: riskMap[rawRisk] || rawRisk || null,
      filter_min_match: searchParams.get("minMatch") || null,
      filter_max_match: searchParams.get("maxMatch") || null,
      filter_min_confidence: minConfidence || null,
      filter_max_confidence: maxConfidence || null,
      filter_date_from: searchParams.get("dateFrom") || null,
      filter_date_to: searchParams.get("dateTo") || null,
      filter_assignee: rawAssignee || null,
    };
    const [searchResult, issueCountResult, reviewerResult, sourceResult, regionResult] =
      await Promise.all([
        access.supabase.rpc("wpi_search_price_collection_leads_v4", {
          ...rpcFilters,
          filter_validity_status: rawValidity === "all" ? null : rawValidity,
          filter_issue: rawIssue || null,
          page_number: page,
          page_size: pageSize,
        }),
        access.supabase.rpc("wpi_search_price_collection_leads_v4", {
          ...rpcFilters,
          filter_validity_status: null,
          filter_issue: null,
          page_number: 1,
          page_size: 1,
        }),
        access.supabase.rpc("wpi_list_price_reviewers"),
        access.supabase
          .from("wpi_price_collection_leads")
          .select("source_type")
          .eq("organization_id", access.organizationId)
          .limit(1000),
        access.supabase
          .from("wpi_price_collection_leads")
          .select("region")
          .eq("organization_id", access.organizationId)
          .not("region", "is", null)
          .limit(1000),
      ]);
    const queryError =
      searchResult.error ??
      issueCountResult.error ??
      reviewerResult.error ??
      sourceResult.error ??
      regionResult.error;
    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 400 });
    }
    const result = (searchResult.data ?? {}) as Record<string, unknown>;
    let rows = Array.isArray(result.rows)
      ? (result.rows as Array<Record<string, unknown>>)
      : [];
    if (
      requestedLeadId &&
      !rows.some(
        (row) =>
          String(row.id) === requestedLeadId ||
          asText(row.lead_code) === requestedLeadId,
      )
    ) {
      let requestedQuery = access.supabase
        .from("wpi_price_collection_leads")
        .select("*")
        .eq("organization_id", access.organizationId);
      requestedQuery = /^[0-9a-f-]{36}$/i.test(requestedLeadId)
        ? requestedQuery.eq("id", requestedLeadId)
        : requestedQuery.eq("lead_code", requestedLeadId);
      const requested = await requestedQuery.maybeSingle();
      if (requested.data)
        rows = [requested.data as Record<string, unknown>, ...rows].slice(
          0,
          pageSize,
        );
    }
    const pagination = (result.pagination ?? {}) as Record<string, unknown>;
    const summary = (result.summary ?? {}) as Record<string, unknown>;
    const issueCountPayload = (issueCountResult.data ?? {}) as Record<string, unknown>;
    const issueSummary = (issueCountPayload.issueSummary ?? {}) as Record<string, unknown>;
    const response: PriceCollectionLeadPoolResponse = {
      mode: "supabase",
      role: access.role,
      permissions: {
        canWrite: writableRoles.has(access.role),
        canReview: reviewRoles.has(access.role),
      },
      leads: rows.map((row) => mapLead(row)),
      reviewers: (
        (reviewerResult.data ?? []) as Array<Record<string, unknown>>
      ).map((row) => mapReviewer(row)),
      availableSourceTypes: Array.from(
        new Set(
          (sourceResult.data ?? [])
            .map((row) => asText(row.source_type))
            .filter(Boolean),
        ),
      ).sort(),
      availableRegions: Array.from(
        new Set(
          (regionResult.data ?? [])
            .map((row) => asText(row.region))
            .filter(Boolean),
        ),
      ).sort(),
      pagination: {
        page: asNumber(pagination.page, page),
        pageSize: asNumber(pagination.pageSize, pageSize),
        total: asNumber(pagination.total),
        pageCount: asNumber(pagination.pageCount, 1),
      },
      summary: {
        total: asNumber(summary.total),
        pending: asNumber(summary.pending),
        ready: asNumber(summary.ready),
        transferred: asNumber(summary.transferred),
        rejected: asNumber(summary.rejected),
        highRisk: asNumber(summary.highRisk),
        unassigned: asNumber(summary.unassigned),
        overdue: asNumber(summary.overdue),
        averageConfidence: asNumber(summary.averageConfidence),
        averageMatch: asNumber(summary.averageMatch),
        valid: asNumber(summary.valid),
        needsReview: asNumber(summary.needsReview),
        invalid: asNumber(summary.invalid),
      },
      issueSummary: {
        missingEvidence: asNumber(issueSummary.missingEvidence),
        missingFx: asNumber(issueSummary.missingFx),
        duplicate: asNumber(issueSummary.duplicate),
        staleSource: asNumber(issueSummary.staleSource),
        invalidFields: asNumber(issueSummary.invalidFields),
        criticalRisk: asNumber(issueSummary.criticalRisk),
      },
      sourceDistribution: Array.isArray(result.sourceDistribution)
        ? (result.sourceDistribution as Array<Record<string, unknown>>).map(
            (item) => ({
              label: asText(item.label),
              count: asNumber(item.count),
            }),
          )
        : [],
      statusDistribution: Array.isArray(result.statusDistribution)
        ? (result.statusDistribution as Array<Record<string, unknown>>).map(
            (item) => ({
              label: asText(item.label),
              count: asNumber(item.count),
            }),
          )
        : [],
    };
    return NextResponse.json(response);
  }

  const [taskResult, leadResult, sourceResult, runResult, sourceRunResult, evidenceResult] = await Promise.all([
    access.supabase
      .from("wpi_price_collection_tasks")
      .select("*")
      .eq("organization_id", access.organizationId)
      .order("archived_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(100),
    access.supabase
      .from("wpi_price_collection_leads")
      .select("*")
      .eq("organization_id", access.organizationId)
      .order("created_at", { ascending: false })
      .limit(200),
    access.supabase
      .from("wpi_price_collection_sources")
      .select("*")
      .eq("organization_id", access.organizationId)
      .order("quality_score", { ascending: false }),
    access.supabase
      .from("wpi_price_collection_runs")
      .select("*")
      .eq("organization_id", access.organizationId)
      .eq("run_kind", "parent")
      .order("created_at", { ascending: false })
      .limit(20),
    access.supabase
      .from("wpi_price_collection_source_runs")
      .select("*")
      .eq("organization_id", access.organizationId)
      .order("created_at", { ascending: false })
      .limit(200),
    access.supabase
      .from("wpi_price_collection_evidence")
      .select("task_id")
      .eq("organization_id", access.organizationId)
      .limit(5000),
  ]);

  const error =
    taskResult.error ??
    leadResult.error ??
    sourceResult.error ??
    runResult.error ??
    sourceRunResult.error ??
    evidenceResult.error;
  if (error) {
    return NextResponse.json(
      { error: `价格采集业务表尚不可用：${error.message}` },
      { status: 503 },
    );
  }

  const evidenceCounts = (evidenceResult.data ?? []).reduce<Record<string, number>>(
    (counts, row) => {
      const taskId = asText(row.task_id);
      if (taskId) counts[taskId] = (counts[taskId] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const response: PriceCollectionBootstrap = {
    mode: "supabase",
    role: access.role,
    permissions: {
      canWrite: writableRoles.has(access.role),
      canReview: reviewRoles.has(access.role),
    },
    tasks: (taskResult.data ?? []).map((row) => mapTask(row)),
    leads: (leadResult.data ?? []).map((row) => mapLead(row)),
    sources: (sourceResult.data ?? []).map((row) => mapSource(row)),
    runs: (runResult.data ?? []).map((row) =>
      mapRun({ ...row, evidence_count: evidenceCounts[String(row.task_id)] ?? 0 }),
    ),
    sourceRuns: (sourceRunResult.data ?? []).map((row) => mapSourceRun(row)),
  };

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
  if (!writableRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有价格采集写入权限" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const action = asText(body.action);

  if (action === "create_task") {
    const keyword = asText(body.keyword);
    if (!keyword) {
      return NextResponse.json(
        { error: "采集关键词不能为空" },
        { status: 400 },
      );
    }
    const collectionMode = ["web", "api", "manual"].includes(
      asText(body.collectionMode),
    )
      ? asText(body.collectionMode)
      : "web";
    const sourceIds = Array.isArray(body.sourceIds)
      ? body.sourceIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    if (
      (collectionMode === "web" || collectionMode === "api") &&
      sourceIds.length === 0
    ) {
      return NextResponse.json(
        { error: "请选择至少一个已登记的白名单采集来源" },
        { status: 400 },
      );
    }
    let registeredSources: Array<{
      id: string;
      name: string;
      source_kind: string;
      is_active: boolean;
      last_checked_at: string | null;
      last_error: string | null;
      base_url: string;
    }> = [];
    if (sourceIds.length) {
      const uniqueSourceIds = Array.from(new Set(sourceIds));
      const sourceResult = await access.supabase
        .from("wpi_price_collection_sources")
        .select("id, name, source_kind, is_active, last_checked_at, last_error, base_url")
        .eq("organization_id", access.organizationId)
        .in("id", uniqueSourceIds);
      if (sourceResult.error) {
        return NextResponse.json(
          { error: sourceResult.error.message },
          { status: 400 },
        );
      }
      registeredSources = sourceResult.data ?? [];
      if (registeredSources.length !== uniqueSourceIds.length) {
        return NextResponse.json(
          { error: "部分数据源未登记或不属于当前组织" },
          { status: 400 },
        );
      }
      const unavailableSources = registeredSources.filter(
        (source) => !source.is_active || !source.last_checked_at || source.last_error,
      );
      if (unavailableSources.length) {
        return NextResponse.json(
          {
            error: `以下数据源尚未验证或已停用：${unavailableSources.map((source) => source.name).join("、")}`,
            unavailableSourceIds: unavailableSources.map((source) => source.id),
          },
          { status: 400 },
        );
      }
      if (
        collectionMode === "api" &&
        registeredSources.some((source) => source.source_kind !== "api")
      ) {
        return NextResponse.json(
          { error: "API 采集任务只能使用已验证的 API 来源" },
          { status: 400 },
        );
      }
    }
    const taskCode = `COL-${Date.now().toString().slice(-10)}`;
    const requestedFrequency = asText(body.frequency) || "仅本次";
    const isRecurring = !["manual", "once", "手动", "仅一次", "仅本次"].includes(
      requestedFrequency,
    );
    const schedule = scheduleSettings(requestedFrequency, isRecurring);
    const inputConfig =
      body.config && typeof body.config === "object"
        ? (body.config as Record<string, unknown>)
        : {};
    const { data: task, error: insertError } = await access.supabase
      .from("wpi_price_collection_tasks")
      .insert({
        organization_id: access.organizationId,
        task_code: taskCode,
        target_type: body.targetType === "material" ? "material" : "equipment",
        keyword,
        specification: asText(body.specification) || null,
        region: asText(body.region) || null,
        currency: asText(body.currency) || "CNY",
        source_type: asText(body.sourceType) || "all",
        frequency: schedule.frequency,
        provider:
          collectionMode === "api"
            ? "wpi-price-collector-api"
            : "wpi-price-collector-web",
        collection_mode: collectionMode,
        schedule_enabled: schedule.scheduleEnabled,
        next_run_at: schedule.nextRunAt,
        config: {
          ...inputConfig,
          sourceIds,
          requiresHumanReview: true,
          aiFinalDecision: false,
        },
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select("*")
      .single();
    if (insertError || !task) {
      return NextResponse.json(
        { error: insertError?.message || "任务创建失败" },
        { status: 400 },
      );
    }
    if (
      body.deferExecution === true &&
      body.targetType === "material" &&
      collectionMode === "web"
    ) {
      const seedRows = await Promise.all(
        registeredSources.map(async (source) => ({
          organization_id: access.organizationId,
          task_id: task.id,
          source_id: source.id,
          resource_url: source.base_url,
          url_hash: await sha256(source.base_url),
          parent_url: null,
          resource_type: "seed",
          depth: 0,
          status: "queued",
          metadata: {
            durableQueue: true,
            requiresHumanReview: true,
          },
          created_by: access.userId,
          updated_by: access.userId,
        })),
      );
      const queued = await access.supabase
        .from("wpi_equipment_collection_discoveries")
        .upsert(seedRows, { onConflict: "organization_id,task_id,source_id,url_hash" });
      if (queued.error) {
        await access.supabase
          .from("wpi_price_collection_tasks")
          .delete()
          .eq("id", task.id)
          .eq("organization_id", access.organizationId);
        return NextResponse.json(
          { error: `任务入口队列创建失败：${queued.error.message}` },
          { status: 400 },
        );
      }
    }
    if (collectionMode === "manual") {
      const started = await access.supabase.rpc(
        "wpi_transition_price_collection_task",
        {
          target_task_id: task.id,
          requested_action: "start",
        },
      );
      if (started.error)
        return NextResponse.json(
          { error: started.error.message },
          { status: 400 },
        );
      return NextResponse.json({
        task: mapTask(started.data as Record<string, unknown>),
        run: null,
        execution: { requiresManualEntry: true },
      });
    }
    if (body.deferExecution === true) {
      return NextResponse.json({
        task: mapTask(task as Record<string, unknown>),
        run: null,
        execution: { queued: true },
      });
    }
    const invoked = await access.supabase.functions.invoke(
      "wpi-price-collector",
      {
        body: { taskId: task.id, triggerType: "manual" },
      },
    );
    const refreshed = await access.supabase
      .from("wpi_price_collection_tasks")
      .select("*")
      .eq("id", task.id)
      .single();
    const latestRun = await access.supabase
      .from("wpi_price_collection_runs")
      .select("*")
      .eq("task_id", task.id)
      .eq("run_kind", "parent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (invoked.error || invoked.data?.error) {
      return NextResponse.json(
        {
          task: mapTask((refreshed.data ?? task) as Record<string, unknown>),
          run: latestRun.data
            ? mapRun(latestRun.data as Record<string, unknown>)
            : null,
          error: invoked.error?.message || String(invoked.data?.error),
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      task: mapTask((refreshed.data ?? task) as Record<string, unknown>),
      run: latestRun.data
        ? mapRun(latestRun.data as Record<string, unknown>)
        : null,
      execution: invoked.data?.data ?? null,
    });
  }

  if (action === "ingest_result") {
    const taskId = asText(body.taskId);
    const result =
      body.result && typeof body.result === "object"
        ? (body.result as Record<string, unknown>)
        : null;
    if (!taskId || !result || !asText(result.name)) {
      return NextResponse.json(
        { error: "采集任务和候选结果不能为空" },
        { status: 400 },
      );
    }
    const { data: task } = await access.supabase
      .from("wpi_price_collection_tasks")
      .select("id, status")
      .eq("id", taskId)
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (!task || task.status !== "running") {
      return NextResponse.json(
        { error: "采集任务不处于运行状态" },
        { status: 409 },
      );
    }
    const leadCode = `LS${Date.now().toString().slice(-12)}`;
    const { data: lead, error: leadError } = await access.supabase
      .from("wpi_price_collection_leads")
      .insert({
        organization_id: access.organizationId,
        task_id: taskId,
        lead_code: leadCode,
        target_type:
          result.targetType === "material" ? "material" : "equipment",
        name: asText(result.name),
        specification: asText(result.specification) || null,
        source_type: asText(result.sourceType) || "manual_candidate",
        source_url: asText(result.sourceUrl) || null,
        source_checked_at: new Date().toISOString(),
        evidence_code:
          asText(result.evidenceCode) || `EV-COL-${leadCode.slice(-6)}`,
        region: asText(result.region) || null,
        quote_date: asText(result.quoteDate) || new Date().toISOString().slice(0, 10),
        price: asNumber(result.price),
        currency: asText(result.currency) || "CNY",
        normalized_price: asNumber(result.normalizedPrice ?? result.price),
        original_unit: asText(result.originalUnit) || null,
        supplier_name: asText(result.supplierName) || null,
        match_target: asText(result.matchTarget) || null,
        ai_match_score: asNumber(result.aiMatchScore),
        confidence: asNumber(result.confidence),
        risk_level: ["low", "medium", "high", "critical"].includes(
          asText(result.riskLevel),
        )
          ? asText(result.riskLevel)
          : "medium",
        duplicate_status:
          result.duplicateStatus === "suspected_duplicate"
            ? "suspected_duplicate"
            : "unique",
        status: "pending_review",
        metadata: {
          ingestionMode: "operator_manual_entry",
          aiFinalDecision: false,
        },
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select("*")
      .single();
    if (leadError || !lead) {
      return NextResponse.json(
        { error: leadError?.message || "候选结果写入失败" },
        { status: 400 },
      );
    }
    const { error: finishError } = await access.supabase.rpc(
      "wpi_transition_price_collection_task",
      {
        target_task_id: taskId,
        requested_action: "complete",
        next_success_count: 1,
      },
    );
    if (finishError) {
      return NextResponse.json({ error: finishError.message }, { status: 400 });
    }
    return NextResponse.json({ lead: mapLead(lead), status: "needs_review" });
  }

  return NextResponse.json({ error: "不支持的价格采集操作" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
  const body = (await request.json()) as Record<string, unknown>;
  const entity = asText(body.entity);
  const action = asText(body.action);

  if (entity === "schedule_policy" && action === "apply") {
    if (!writableRoles.has(access.role)) {
      return NextResponse.json({ error: "当前角色没有周期策略维护权限" }, { status: 403 });
    }
    const policyId = asText(body.id);
    const frequency = asText(body.frequency);
    if (!policyId || !["每小时", "每天", "每周", "每月"].includes(frequency)) {
      return NextResponse.json({ error: "周期策略参数无效" }, { status: 400 });
    }
    const result = await access.supabase.rpc("wpi_apply_price_collection_schedule_policy", {
      target_policy_id: policyId,
      policy_frequency: frequency,
      policy_active: body.isActive !== false,
    });
    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error?.message || "周期策略应用失败" }, { status: 400 });
    }
    return NextResponse.json({ policy: mapSchedulePolicy(result.data as Record<string, unknown>) });
  }

  if (entity === "task") {
    if (!writableRoles.has(access.role)) {
      return NextResponse.json(
        { error: "当前角色没有采集任务操作权限" },
        { status: 403 },
      );
    }
    const taskId = asText(body.id);
    if (action === "bulk_disable_schedule" || action === "bulk_archive") {
      const ids = Array.isArray(body.ids)
        ? Array.from(new Set(body.ids.map(asText).filter(Boolean))).slice(0, 100)
        : [];
      if (!ids.length) {
        return NextResponse.json({ error: action === "bulk_archive" ? "请选择要归档的任务" : "请选择要关闭周期的任务" }, { status: 400 });
      }
      if (action === "bulk_archive") {
        const candidates = await access.supabase
          .from("wpi_price_collection_tasks")
          .select("id,status")
          .eq("organization_id", access.organizationId)
          .in("id", ids)
          .is("archived_at", null);
        if (candidates.error) {
          return NextResponse.json({ error: candidates.error.message }, { status: 400 });
        }
        const activeCount = (candidates.data ?? []).filter((item) => ["running", "queued"].includes(asText(item.status))).length;
        if (activeCount) {
          return NextResponse.json({ error: `所选任务中有 ${activeCount} 个正在运行或排队，请先停止` }, { status: 409 });
        }
      }
      const updated = await access.supabase
        .from("wpi_price_collection_tasks")
        .update({
          frequency: "仅本次",
          schedule_enabled: false,
          schedule_expression: null,
          next_run_at: null,
          ...(action === "bulk_archive" ? {
            archived_at: new Date().toISOString(),
            archived_by: access.userId,
          } : {}),
          updated_by: access.userId,
        })
        .eq("organization_id", access.organizationId)
        .in("id", ids)
        .is("archived_at", null)
        .select("*");
      if (updated.error) {
        return NextResponse.json({ error: updated.error.message }, { status: 400 });
      }
      return NextResponse.json({
        tasks: (updated.data ?? []).map((row) => mapTask(row as Record<string, unknown>)),
        updatedCount: updated.data?.length ?? 0,
      });
    }
    if (taskId && (action === "archive" || action === "restore")) {
      const current = await access.supabase
        .from("wpi_price_collection_tasks")
        .select("id,status,archived_at")
        .eq("id", taskId)
        .eq("organization_id", access.organizationId)
        .maybeSingle();
      if (current.error || !current.data) {
        return NextResponse.json({ error: current.error?.message || "采集任务不存在" }, { status: 404 });
      }
      if (action === "archive" && ["running", "queued"].includes(asText(current.data.status))) {
        return NextResponse.json({ error: "运行中或排队中的任务不能归档，请先停止任务" }, { status: 409 });
      }
      const updated = await access.supabase
        .from("wpi_price_collection_tasks")
        .update(action === "archive" ? {
          archived_at: new Date().toISOString(),
          archived_by: access.userId,
          frequency: "仅本次",
          schedule_enabled: false,
          schedule_expression: null,
          next_run_at: null,
          updated_by: access.userId,
        } : {
          archived_at: null,
          archived_by: null,
          updated_by: access.userId,
        })
        .eq("id", taskId)
        .eq("organization_id", access.organizationId)
        .select("*")
        .maybeSingle();
      if (updated.error || !updated.data) {
        return NextResponse.json({ error: updated.error?.message || "任务归档状态更新失败" }, { status: 400 });
      }
      return NextResponse.json({ task: mapTask(updated.data as Record<string, unknown>) });
    }
    if (taskId && action === "update_schedule") {
      const current = await access.supabase
        .from("wpi_price_collection_tasks")
        .select("id,collection_mode,archived_at")
        .eq("id", taskId)
        .eq("organization_id", access.organizationId)
        .maybeSingle();
      if (current.error || !current.data) {
        return NextResponse.json(
          { error: current.error?.message || "采集任务不存在" },
          { status: 404 },
        );
      }
      if (current.data.archived_at) {
        return NextResponse.json({ error: "归档任务不能修改周期，请先恢复任务" }, { status: 409 });
      }
      const enabled = body.scheduleEnabled === true;
      if (enabled && !["web", "api"].includes(asText(current.data.collection_mode))) {
        return NextResponse.json(
          { error: "只有网页或 API 采集任务可以启用周期调度" },
          { status: 400 },
        );
      }
      const schedule = scheduleSettings(body.frequency, enabled);
      const updated = await access.supabase
        .from("wpi_price_collection_tasks")
        .update({
          frequency: schedule.frequency,
          schedule_enabled: schedule.scheduleEnabled,
          schedule_expression: schedule.scheduleExpression,
          next_run_at: schedule.nextRunAt,
          updated_by: access.userId,
        })
        .eq("id", taskId)
        .eq("organization_id", access.organizationId)
        .select("*")
        .maybeSingle();
      if (updated.error || !updated.data) {
        return NextResponse.json(
          { error: updated.error?.message || "周期调度更新失败" },
          { status: 400 },
        );
      }
      return NextResponse.json({ task: mapTask(updated.data as Record<string, unknown>) });
    }
    const allowed = new Set([
      "start",
      "retry",
      "continue_batch",
      "incremental",
      "retry_failed",
      "pause",
      "resume",
      "stop",
      "progress",
      "fail",
    ]);
    if (!taskId || !allowed.has(action)) {
      return NextResponse.json(
        { error: "无效的采集任务操作" },
        { status: 400 },
      );
    }
    if (
      action === "start" ||
      action === "retry" ||
      action === "continue_batch" ||
      action === "incremental" ||
      action === "retry_failed"
    ) {
      const current = await access.supabase
        .from("wpi_price_collection_tasks")
        .select("id,archived_at")
        .eq("id", taskId)
        .eq("organization_id", access.organizationId)
        .maybeSingle();
      if (current.error || !current.data) {
        return NextResponse.json({ error: current.error?.message || "采集任务不存在" }, { status: 404 });
      }
      if (current.data.archived_at) {
        return NextResponse.json({ error: "归档任务不能执行，请先恢复任务" }, { status: 409 });
      }
      const operation =
        action === "incremental"
          ? "incremental"
          : action === "retry_failed"
            ? "retry_failed"
            : action === "continue_batch" || action === "retry"
              ? "continue_batch"
              : "start";
      const invoked = await access.supabase.functions.invoke(
        "wpi-price-collector",
        {
          body: {
            taskId,
            triggerType: action === "start" ? "manual" : "retry",
            operation,
            discoveryIds: Array.isArray(body.ids)
              ? body.ids.filter((id): id is string => typeof id === "string")
              : [],
          },
        },
      );
      const refreshed = await access.supabase
        .from("wpi_price_collection_tasks")
        .select("*")
        .eq("id", taskId)
        .eq("organization_id", access.organizationId)
        .maybeSingle();
      if (invoked.error || invoked.data?.error || !refreshed.data) {
        return NextResponse.json(
          {
            error:
              invoked.error?.message ||
              String(invoked.data?.error || "任务重新执行失败"),
          },
          { status: 502 },
        );
      }
      return NextResponse.json({
        task: mapTask(refreshed.data as Record<string, unknown>),
        execution: invoked.data?.data ?? null,
      });
    }
    const { data, error } = await access.supabase.rpc(
      "wpi_transition_price_collection_task",
      {
        target_task_id: taskId,
        requested_action: action,
        next_progress: body.progress == null ? null : asNumber(body.progress),
        next_success_count:
          body.successCount == null ? null : asNumber(body.successCount),
        next_failed_count:
          body.failedCount == null ? null : asNumber(body.failedCount),
        next_current_source: asText(body.currentSource) || null,
        next_error: asText(body.error) || null,
      },
    );
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({
      task: mapTask(data as Record<string, unknown>),
    });
  }

  if (entity === "lead") {
    if (!reviewRoles.has(access.role)) {
      return NextResponse.json(
        { error: "当前角色没有价格线索审核权限" },
        { status: 403 },
      );
    }
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : [asText(body.id)].filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ error: "请选择价格线索" }, { status: 400 });
    }
    if (action === "approve_translation" || action === "reject_translation") {
      if (ids.length !== 1) {
        return NextResponse.json({ error: "译名审核一次只能处理一条线索" }, { status: 400 });
      }
      const existing = await access.supabase
        .from("wpi_price_collection_leads")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("id", ids[0])
        .maybeSingle();
      if (existing.error || !existing.data) {
        return NextResponse.json({ error: existing.error?.message || "价格线索不存在" }, { status: 404 });
      }
      const approved = action === "approve_translation";
      const translatedName = asText(body.translatedName) || asText(existing.data.translated_name);
      const translatedSpecification = asText(body.translatedSpecification) || asText(existing.data.translated_specification);
      if (approved && !translatedName) {
        return NextResponse.json({ error: "请先填写中文名称" }, { status: 400 });
      }
      const update = await access.supabase
        .from("wpi_price_collection_leads")
        .update({
          ...(approved ? {
            name: translatedName,
            specification: translatedSpecification || existing.data.specification,
            translated_name: translatedName,
            translated_specification: translatedSpecification || null,
            translation_status: "completed",
          } : { translation_status: "needs_review" }),
          translation_review_status: approved ? "approved" : "rejected",
          translation_review_note: asText(body.note) || null,
          translation_reviewed_by: access.userId,
          translation_reviewed_at: new Date().toISOString(),
          updated_by: access.userId,
        })
        .eq("id", ids[0])
        .select("*")
        .single();
      if (update.error) return NextResponse.json({ error: update.error.message }, { status: 400 });
      return NextResponse.json({ lead: mapLead(update.data as Record<string, unknown>) });
    }
    if (action === "retry_translation") {
      const update = await access.supabase
        .from("wpi_price_collection_leads")
        .update({
          translation_status: "queued",
          translation_review_status: "pending_review",
          translation_review_note: null,
          updated_by: access.userId,
        })
        .in("id", ids)
        .select("id,task_id");
      if (update.error) return NextResponse.json({ error: update.error.message }, { status: 400 });
      const taskId = asText(update.data?.[0]?.task_id);
      const invoked = await access.supabase.functions.invoke("wpi-ai-gateway", {
        body: {
          action: "translate_price_leads",
          organizationId: access.organizationId,
          taskId: taskId || undefined,
          leadIds: ids,
        },
      });
      if (invoked.error || invoked.data?.error) {
        return NextResponse.json({ error: invoked.error?.message || String(invoked.data?.error) }, { status: 502 });
      }
      return NextResponse.json({ data: invoked.data?.data ?? null });
    }
    if (action === "assign") {
      const reviewerId = asText(body.reviewerId);
      if (!reviewerId) {
        return NextResponse.json(
          { error: "请选择审核责任人" },
          { status: 400 },
        );
      }
      const { data, error } = await access.supabase.rpc(
        "wpi_assign_price_collection_leads",
        {
          target_lead_ids: ids,
          target_reviewer_id: reviewerId,
          assignment_notes: asText(body.assignmentNote) || null,
          due_at: asText(body.reviewDueAt) || null,
        },
      );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({
        leads: ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
          mapLead(row),
        ),
      });
    }
    if (action === "capture_snapshot") {
      if (ids.length !== 1) {
        return NextResponse.json(
          { error: "一次只能为一条线索保存证据快照" },
          { status: 400 },
        );
      }
      const { data, error } = await access.supabase.rpc(
        "wpi_capture_price_collection_snapshot",
        { target_lead_id: ids[0] },
      );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({
        evidence: mapEvidence(data as Record<string, unknown>),
      });
    }
    if (action === "update") {
      if (ids.length !== 1) {
        return NextResponse.json(
          { error: "资料补全一次只能处理一条线索" },
          { status: 400 },
        );
      }
      const patch =
        body.patch &&
        typeof body.patch === "object" &&
        !Array.isArray(body.patch)
          ? (body.patch as Record<string, unknown>)
          : null;
      if (!patch) {
        return NextResponse.json(
          { error: "请提交需要补全的线索资料" },
          { status: 400 },
        );
      }
      const name = asText(patch.name);
      if (!name) {
        return NextResponse.json(
          { error: "线索名称不能为空" },
          { status: 400 },
        );
      }
      const { data, error } = await access.supabase
        .from("wpi_price_collection_leads")
        .update({
          name,
          specification: asText(patch.specification) || null,
          supplier_name: asText(patch.supplierName) || null,
          source_url: asText(patch.sourceUrl) || null,
          region: asText(patch.region) || null,
          original_unit: asText(patch.originalUnit) || null,
          review_notes: asText(patch.reviewNotes) || null,
          updated_by: access.userId,
        })
        .eq("id", ids[0])
        .eq("organization_id", access.organizationId)
        .select("*")
        .maybeSingle();
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
      if (!data)
        return NextResponse.json(
          { error: "价格线索不存在或无权修改" },
          { status: 404 },
        );
      return NextResponse.json({
        lead: mapLead(data as Record<string, unknown>),
      });
    }
    if (action === "resolve_duplicate") {
      const { data, error } = await access.supabase
        .from("wpi_price_collection_leads")
        .update({
          duplicate_status: "unique",
          duplicate_of_lead_id: null,
          duplicate_score: 0,
          review_notes: asText(body.notes) || "人工核对来源、规格、时间与价格条件后，确认不是重复价格。",
          updated_by: access.userId,
        })
        .in("id", ids)
        .eq("organization_id", access.organizationId)
        .eq("duplicate_status", "suspected_duplicate")
        .select("*");
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({
        leads: ((data ?? []) as Array<Record<string, unknown>>).map((row) => mapLead(row)),
      });
    }
    if (action === "refresh_admission") {
      if (ids.length > 10) {
        return NextResponse.json(
          { error: "真实来源核验每次最多处理 10 条线索" },
          { status: 400 },
        );
      }
      const existing = await access.supabase
        .from("wpi_price_collection_leads")
        .select("id,source_id,source_url,metadata")
        .in("id", ids)
        .eq("organization_id", access.organizationId);
      if (existing.error)
        return NextResponse.json({ error: existing.error.message }, { status: 400 });
      const refreshed: PriceCollectionLeadRecord[] = [];
      const failed: Array<{ id: string; error: string }> = [];
      for (const lead of existing.data ?? []) {
        try {
          const verification = await verifyAdmissionSource(access, lead as AdmissionSourceLead);
          const update = await access.supabase
            .from("wpi_price_collection_leads")
            .update({
              source_checked_at: verification.checkedAt,
              metadata: {
                ...((lead.metadata ?? {}) as Record<string, unknown>),
                admissionValidation: verification.result,
              },
              updated_by: access.userId,
            })
            .eq("id", lead.id)
            .eq("organization_id", access.organizationId)
            .select("*")
            .single();
          if (update.error) throw new Error(update.error.message);
          refreshed.push(mapLead(update.data as Record<string, unknown>));
        } catch (error) {
          const message = error instanceof Error ? error.message : "来源核验失败";
          failed.push({ id: String(lead.id), error: message });
          await access.supabase
            .from("wpi_price_collection_leads")
            .update({
              metadata: {
                ...((lead.metadata ?? {}) as Record<string, unknown>),
                admissionValidation: {
                  status: "failed",
                  checkedAt: new Date().toISOString(),
                  sourceId: lead.source_id,
                  error: message,
                },
              },
              updated_by: access.userId,
            })
            .eq("id", lead.id)
            .eq("organization_id", access.organizationId);
        }
      }
      const missingIds = ids.filter((id) =>
        !(existing.data ?? []).some((lead) => lead.id === id),
      );
      failed.push(...missingIds.map((id) => ({
        id,
        error: "价格线索不存在或无权访问",
      })));
      const payload = {
        leads: refreshed,
        failed,
        summary: {
          requested: ids.length,
          refreshed: refreshed.length,
          failed: failed.length,
        },
      };
      if (!refreshed.length) {
        return NextResponse.json(
          { ...payload, error: failed[0]?.error || "来源核验失败" },
          { status: 422 },
        );
      }
      return NextResponse.json(payload, { status: failed.length ? 207 : 200 });
    }
    if (action === "transfer") {
      const { data, error } = await access.supabase.rpc(
        "wpi_transfer_price_collection_leads",
        { target_lead_ids: ids },
      );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({
        leads: ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
          mapLead(row),
        ),
      });
    }
    if (!new Set(["confirm", "reject"]).has(action)) {
      return NextResponse.json(
        { error: "无效的人工审核动作" },
        { status: 400 },
      );
    }
    const updated: PriceCollectionLeadRecord[] = [];
    for (const id of ids) {
      const { data, error } = await access.supabase.rpc(
        "wpi_review_price_collection_lead",
        {
          target_lead_id: id,
          decision: action,
          notes: asText(body.notes) || null,
        },
      );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
      updated.push(mapLead(data as Record<string, unknown>));
    }
    return NextResponse.json({ leads: updated });
  }

  return NextResponse.json({ error: "不支持的价格采集操作" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
  if (!writableRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有删除采集任务的权限" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity")?.trim() ?? "task";

  if (entity === "lead") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ids = Array.isArray(body.ids)
      ? Array.from(new Set(body.ids.map(asText).filter(Boolean))).slice(0, 100)
      : [];
    if (!ids.length) {
      return NextResponse.json({ error: "请选择要删除的采集结果" }, { status: 400 });
    }

    const existing = await access.supabase
      .from("wpi_price_collection_leads")
      .select("id, lead_code, status")
      .eq("organization_id", access.organizationId)
      .in("id", ids);
    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }
    if ((existing.data ?? []).length !== ids.length) {
      return NextResponse.json({ error: "部分采集结果不存在或不属于当前组织" }, { status: 404 });
    }
    const transferred = (existing.data ?? []).filter((item) => item.status === "transferred");
    if (transferred.length) {
      return NextResponse.json(
        { error: `有 ${transferred.length} 条结果已转入线索池，不能在采集中心删除` },
        { status: 409 },
      );
    }

    const deleted = await access.supabase
      .from("wpi_price_collection_leads")
      .delete()
      .eq("organization_id", access.organizationId)
      .in("id", ids)
      .select("id, lead_code");
    if (deleted.error) {
      return NextResponse.json({ error: deleted.error.message }, { status: 500 });
    }
    if ((deleted.data ?? []).length !== ids.length) {
      return NextResponse.json({ error: "部分采集结果没有删除权限" }, { status: 403 });
    }
    return NextResponse.json({
      deleted: true,
      deletedCount: deleted.data?.length ?? 0,
      ids: (deleted.data ?? []).map((item) => item.id),
    });
  }

  if (entity !== "task") {
    return NextResponse.json({ error: "不支持的删除对象" }, { status: 400 });
  }

  const taskId = url.searchParams.get("id")?.trim() ?? "";
  if (!taskId) {
    return NextResponse.json({ error: "缺少采集任务 ID" }, { status: 400 });
  }

  const taskResult = await access.supabase
    .from("wpi_price_collection_tasks")
    .select("id, task_code, status, success_count")
    .eq("organization_id", access.organizationId)
    .eq("id", taskId)
    .maybeSingle();
  if (taskResult.error) {
    return NextResponse.json({ error: taskResult.error.message }, { status: 500 });
  }
  if (!taskResult.data) {
    return NextResponse.json({ error: "采集任务不存在" }, { status: 404 });
  }

  const deletableStatuses = new Set(["queued", "paused", "failed", "stopped"]);
  if (!deletableStatuses.has(taskResult.data.status)) {
    return NextResponse.json(
      { error: "运行中或已完成任务不能删除，请先停止并归档任务", archiveRequired: true },
      { status: 409 },
    );
  }

  const [leadResult, catalogResult] = await Promise.all([
    access.supabase
      .from("wpi_price_collection_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("task_id", taskId),
    access.supabase
      .from("wpi_equipment_catalog")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("collection_task_id", taskId),
  ]);
  if (leadResult.error || catalogResult.error) {
    return NextResponse.json(
      { error: leadResult.error?.message || catalogResult.error?.message || "任务成果校验失败" },
      { status: 500 },
    );
  }

  const resultCount = (leadResult.count ?? 0) + (catalogResult.count ?? 0);
  if (resultCount > 0 || Number(taskResult.data.success_count ?? 0) > 0) {
    return NextResponse.json(
      { error: `任务已有 ${resultCount || taskResult.data.success_count} 条业务成果，只能归档，不能删除`, archiveRequired: true },
      { status: 409 },
    );
  }

  const deleteResult = await access.supabase
    .from("wpi_price_collection_tasks")
    .delete()
    .eq("organization_id", access.organizationId)
    .eq("id", taskId)
    .select("id")
    .maybeSingle();
  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
  }
  if (!deleteResult.data) {
    return NextResponse.json({ error: "任务删除失败或没有删除权限" }, { status: 403 });
  }

  return NextResponse.json({ deleted: true, id: taskId, taskCode: taskResult.data.task_code });
}
