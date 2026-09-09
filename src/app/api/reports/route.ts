import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import {
  reportOutline,
  validateReportCompleteness,
} from "@/lib/reports/reportValidation";

const writeRoles = new Set(["admin", "manager", "editor"]);
const reportStatuses = new Set([
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "archived",
]);
const creatableStatuses = new Set(["draft", "pending_review"]);

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function reportCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `REP-${date}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );

  const keyword = clean(request.nextUrl.searchParams.get("keyword"), 120);
  const status = clean(request.nextUrl.searchParams.get("status"), 40);
  const type = clean(request.nextUrl.searchParams.get("type"), 100);
  const project = clean(request.nextUrl.searchParams.get("project"), 200);
  const risk = clean(request.nextUrl.searchParams.get("risk"), 20);
  const dateFrom = clean(request.nextUrl.searchParams.get("dateFrom"), 20);
  const dateTo = clean(request.nextUrl.searchParams.get("dateTo"), 20);
  const summaryView = request.nextUrl.searchParams.get("view") === "summary";
  const page = Math.max(
    1,
    Number(request.nextUrl.searchParams.get("page")) || 1,
  );
  const pageSize = Math.max(
    1,
    Math.min(500, Number(request.nextUrl.searchParams.get("pageSize")) || 500),
  );
  let query = access.supabase
    .from("wpi_reports")
    .select(summaryView ? "id,report_code,title,report_type,status,updated_at,project:content->>project,aiRiskLevel:content->>aiRiskLevel" : "*", { count: "exact" })
    .eq("organization_id", access.organizationId)
    .order("updated_at", { ascending: false });
  if (keyword)
    query = query.or(
      `title.ilike.%${keyword.replaceAll(",", " ")}%,report_code.ilike.%${keyword.replaceAll(",", " ")}%`,
    );
  if (status && reportStatuses.has(status)) query = query.eq("status", status);
  if (type) query = query.eq("report_type", type);
  if (project) query = query.eq("content->>project", project);
  if (risk === "highRisk") {
    query = query.in("content->>aiRiskLevel", ["high", "critical"]);
  } else if (risk) {
    query = query.eq("content->>aiRiskLevel", risk);
  }
  if (dateFrom) query = query.gte("updated_at", `${dateFrom}T00:00:00.000Z`);
  if (dateTo) query = query.lte("updated_at", `${dateTo}T23:59:59.999Z`);
  const from = (page - 1) * pageSize;
  const result = await query.range(from, from + pageSize - 1);
  if (result.error)
    return NextResponse.json({ error: result.error.message }, { status: 500 });

  const rows = result.data ?? [];
  const baseCount = () =>
    access.supabase
      .from("wpi_reports")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId);
  const [
    totalCount,
    draftCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    archivedCount,
    highRiskCount,
    facetsResult,
  ] = await Promise.all([
    baseCount(),
    baseCount().eq("status", "draft"),
    baseCount().eq("status", "pending_review"),
    baseCount().eq("status", "approved"),
    baseCount().eq("status", "rejected"),
    baseCount().eq("status", "archived"),
    baseCount().in("content->>aiRiskLevel", ["high", "critical"]),
    access.supabase
      .from("wpi_reports")
      .select("report_type,project:content->>project")
      .eq("organization_id", access.organizationId)
      .limit(1000),
  ]);
  const facetRows = facetsResult.data ?? [];
  return NextResponse.json({
    data: summaryView ? (rows as unknown as Array<Record<string, unknown>>).map((row) => ({ ...row, content: { project: row.project, aiRiskLevel: row.aiRiskLevel } })) : rows,
    summary: {
      total: totalCount.count ?? 0,
      draft: draftCount.count ?? 0,
      pendingReview: pendingCount.count ?? 0,
      approved: approvedCount.count ?? 0,
      rejected: rejectedCount.count ?? 0,
      archived: archivedCount.count ?? 0,
      highRisk: highRiskCount.count ?? 0,
    },
    pagination: {
      page,
      pageSize,
      total: result.count ?? 0,
      pageCount: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)),
    },
    facets: {
      types: [
        ...new Set(
          facetRows.map((row) => clean(row.report_type, 100)).filter(Boolean),
        ),
      ].sort(),
      projects: [
        ...new Set(
          facetRows
            .map((row) => clean(row.project, 200))
            .filter(Boolean),
        ),
      ].sort(),
    },
    permissions: { canWrite: writeRoles.has(access.role) },
    source: "supabase",
  });
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  if (!writeRoles.has(access.role))
    return NextResponse.json(
      { error: "当前角色没有报告写入权限" },
      { status: 403 },
    );

  const body = object(await request.json().catch(() => ({})));
  const title = clean(body.title);
  const reportType = clean(body.reportType, 100);
  if (!title || !reportType)
    return NextResponse.json(
      { error: "请填写报告名称和报告类型" },
      { status: 400 },
    );
  const requestedStatus = clean(body.status, 40);
  if (requestedStatus && !creatableStatuses.has(requestedStatus)) {
    return NextResponse.json(
      { error: "新报告只能保存为草稿或提交人工审核" },
      { status: 400 },
    );
  }
  const status = requestedStatus || "draft";
  const outline = reportOutline(body.outline);
  const reportContent = {
    ...object(body.content),
    project: clean(body.project, 200),
    config: object(body.config),
    aiConfidence: Math.max(0, Math.min(100, Number(body.aiConfidence) || 0)),
    aiRiskLevel: clean(body.aiRiskLevel, 20) || "medium",
    humanReviewRequired: true,
    generatedAt: new Date().toISOString(),
  };
  if (status === "pending_review") {
    const validation = validateReportCompleteness(outline, reportContent);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: `报告章节不完整：${validation.errors.slice(0, 3).join("；")}`,
          details: validation.errors,
        },
        { status: 422 },
      );
    }
  }
  const sourceId = clean(body.sourceId, 80);
  const inserted = await access.supabase
    .from("wpi_reports")
    .insert({
      organization_id: access.organizationId,
      report_code: reportCode(),
      title,
      report_type: reportType,
      status,
      source_type: clean(body.sourceType, 80) || null,
      source_id: /^[0-9a-f-]{36}$/i.test(sourceId) ? sourceId : null,
      outline,
      content: reportContent,
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select()
    .single();
  if (inserted.error)
    return NextResponse.json(
      { error: inserted.error.message },
      { status: 400 },
    );
  return NextResponse.json(
    { data: inserted.data, source: "supabase" },
    { status: 201 },
  );
}
