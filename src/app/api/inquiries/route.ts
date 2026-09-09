import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type CreateInquiryBody = {
  subject?: string;
  deadline?: string;
  letterContent?: string;
  equipmentIds?: string[];
  materialIds?: string[];
  supplierIds?: string[];
  supplierAssignments?: Array<{
    supplierId: string;
    itemIds: string[];
  }>;
  projectPricingId?: string;
  projectPricingItemIds?: string[];
  items?: Array<{
    id: string;
    sourceId?: string;
    category: string;
    name: string;
    specification?: string;
    quantity?: number;
    unit?: string;
    targetPrice?: number;
    currency?: string;
    riskLevel?: string;
  }>;
  metadata?: Record<string, unknown>;
};

type EmailIntegrationRow = {
  provider: string | null;
  status: string;
  credential_state: string;
  config: Record<string, unknown> | null;
  last_validated_at: string | null;
  last_error: string | null;
};

function cleanConfigText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getEmailGatewayState(
  row: EmailIntegrationRow | null,
  readError?: string,
) {
  const issues: string[] = [];
  const config = row?.config ?? {};
  const senderAddress = cleanConfigText(config.senderAddress);
  const replyToAddress = cleanConfigText(config.replyToAddress);
  const publicAppUrl = cleanConfigText(config.publicAppUrl);
  const webhookUrl = cleanConfigText(config.webhookUrl);

  if (readError) issues.push(`邮件集成读取失败：${readError}`);
  if (!row) issues.push("未找到询价邮件集成");
  if (row && row.provider?.toLowerCase() !== "resend")
    issues.push("邮件服务商尚未配置为 Resend");
  if (row && row.credential_state !== "configured")
    issues.push("未配置 Resend API Key 与 Webhook 签名密钥");
  if (!senderAddress || senderAddress.endsWith("@example.com"))
    issues.push("未配置已验证的发件邮箱");
  if (!replyToAddress) issues.push("未配置供应商回复邮箱");
  if (!publicAppUrl.startsWith("https://"))
    issues.push("系统公开地址必须使用 HTTPS");
  if (!webhookUrl.startsWith("https://"))
    issues.push("未配置 Resend 事件回调地址");
  if (row && row.status !== "active") issues.push("邮件集成尚未验证启用");

  return {
    ready: issues.length === 0,
    provider: row?.provider ?? "Resend",
    status: row?.status ?? "missing",
    issues,
    webhookUrl: webhookUrl || null,
    lastValidatedAt: row?.last_validated_at ?? null,
    lastError: row?.last_error ?? null,
  };
}

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(params.get("pageSize")) || 10),
  );
  const keyword = params.get("keyword")?.trim() ?? "";
  const status = params.get("status")?.trim() ?? "all";
  const risk = params.get("risk")?.trim() ?? "all";
  const supplier = params.get("supplier")?.trim() ?? "all";
  const startDate = params.get("startDate")?.trim() ?? "";
  const endDate = params.get("endDate")?.trim() ?? "";
  const requestedObjectType = params.get("objectType")?.trim() ?? "all";
  const objectType = requestedObjectType === "equipment" || requestedObjectType === "material"
    ? requestedObjectType
    : "all";
  const overdueOnly = params.get("overdue") === "true";
  const highSpreadOnly = params.get("highSpreadOnly") === "true";
  const respondedOnly = params.get("respondedOnly") === "true";
  const aiPlan = params.get("aiPlan")?.trim() ?? "all";
  const sort = params.get("sort")?.trim() ?? "updated_desc";

  let objectScopedInquiryIds: string[] | null = null;
  if (objectType !== "all") {
    const scopedItems = await access.supabase
      .from("wpi_inquiry_items")
      .select("inquiry_id")
      .eq("organization_id", access.organizationId)
      .eq("item_type", objectType);
    if (scopedItems.error)
      return NextResponse.json({ error: scopedItems.error.message }, { status: 500 });
    objectScopedInquiryIds = [...new Set((scopedItems.data ?? []).map((row) => row.inquiry_id))];
  }
  const scopeIds = objectScopedInquiryIds?.length
    ? objectScopedInquiryIds
    : ["00000000-0000-0000-0000-000000000000"];

  let taskSummaryQuery = access.supabase
      .from("wpi_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId);
  let draftSummaryQuery = access.supabase
      .from("wpi_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("status", "draft");
  let reviewSummaryQuery = access.supabase
      .from("wpi_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .eq("status", "pending_review");
  let riskSummaryQuery = access.supabase
      .from("wpi_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .in("risk_level", ["high", "critical"]);
  let aiSummaryQuery = access.supabase
      .from("wpi_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", access.organizationId)
      .not("ai_confidence", "is", null);
  let supplierLinksQuery = access.supabase
      .from("wpi_inquiry_suppliers")
      .select("supplier_id,response_status")
      .eq("organization_id", access.organizationId);
  let supplierOptionsQuery = access.supabase
      .from("wpi_inquiry_suppliers")
      .select("wpi_suppliers(name)")
      .eq("organization_id", access.organizationId);
  if (objectScopedInquiryIds !== null) {
    taskSummaryQuery = taskSummaryQuery.in("id", scopeIds);
    draftSummaryQuery = draftSummaryQuery.in("id", scopeIds);
    reviewSummaryQuery = reviewSummaryQuery.in("id", scopeIds);
    riskSummaryQuery = riskSummaryQuery.in("id", scopeIds);
    aiSummaryQuery = aiSummaryQuery.in("id", scopeIds);
    supplierLinksQuery = supplierLinksQuery.in("inquiry_id", scopeIds);
    supplierOptionsQuery = supplierOptionsQuery.in("inquiry_id", scopeIds);
  }
  if (startDate) {
    const startAt = `${startDate}T00:00:00.000Z`;
    taskSummaryQuery = taskSummaryQuery.gte("created_at", startAt);
    draftSummaryQuery = draftSummaryQuery.gte("created_at", startAt);
    reviewSummaryQuery = reviewSummaryQuery.gte("created_at", startAt);
    riskSummaryQuery = riskSummaryQuery.gte("created_at", startAt);
    aiSummaryQuery = aiSummaryQuery.gte("created_at", startAt);
    supplierLinksQuery = supplierLinksQuery.gte("sent_at", startAt);
    supplierOptionsQuery = supplierOptionsQuery.gte("sent_at", startAt);
  }
  if (endDate) {
    const endAt = `${endDate}T23:59:59.999Z`;
    taskSummaryQuery = taskSummaryQuery.lte("created_at", endAt);
    draftSummaryQuery = draftSummaryQuery.lte("created_at", endAt);
    reviewSummaryQuery = reviewSummaryQuery.lte("created_at", endAt);
    riskSummaryQuery = riskSummaryQuery.lte("created_at", endAt);
    aiSummaryQuery = aiSummaryQuery.lte("created_at", endAt);
    supplierLinksQuery = supplierLinksQuery.lte("sent_at", endAt);
    supplierOptionsQuery = supplierOptionsQuery.lte("sent_at", endAt);
  }

  const summaryQueries = await Promise.all([
    taskSummaryQuery,
    draftSummaryQuery,
    reviewSummaryQuery,
    riskSummaryQuery,
    aiSummaryQuery,
    supplierLinksQuery,
    supplierOptionsQuery,
    access.supabase
      .from("wpi_integrations")
      .select(
        "provider,status,credential_state,config,last_validated_at,last_error",
      )
      .eq("organization_id", access.organizationId)
      .eq("integration_code", "SMTP_OUTBOUND")
      .maybeSingle(),
  ]);
  const summaryError = summaryQueries
    .slice(0, 7)
    .find((result) => result.error)?.error;
  if (summaryError)
    return NextResponse.json({ error: summaryError.message }, { status: 500 });
  const supplierLinks = summaryQueries[5].data ?? [];
  const emailIntegrationResult = summaryQueries[7];
  const emailGateway = getEmailGatewayState(
    emailIntegrationResult.data as EmailIntegrationRow | null,
    emailIntegrationResult.error?.message,
  );
  const supplierOptions = [
    ...new Set(
      (summaryQueries[6].data ?? [])
        .map((row) => {
          const supplier = Array.isArray(row.wpi_suppliers)
            ? row.wpi_suppliers[0]
            : row.wpi_suppliers;
          return supplier?.name;
        })
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort((left, right) => left.localeCompare(right, "zh-CN"));
  const responded = supplierLinks.filter((row) =>
    ["responded", "quoted", "completed"].includes(row.response_status),
  ).length;
  const summary = {
    tasks: summaryQueries[0].count ?? 0,
    drafts: summaryQueries[1].count ?? 0,
    review: summaryQueries[2].count ?? 0,
    highRisk: summaryQueries[3].count ?? 0,
    aiReady: summaryQueries[4].count ?? 0,
    responses: responded,
    responseRate: supplierLinks.length
      ? Math.round((responded / supplierLinks.length) * 100)
      : 0,
  };

  let constrainedInquiryIds: string[] | null = objectScopedInquiryIds;
  let keywordRelatedIds: string[] = [];
  const safeKeyword = keyword.replace(/[,()%"]/g, "");
  if (safeKeyword) {
    const [itemMatches, supplierMatches] = await Promise.all([
      access.supabase
        .from("wpi_inquiry_items")
        .select("inquiry_id")
        .eq("organization_id", access.organizationId)
        .or(
          `item_name.ilike.%${safeKeyword}%,specification.ilike.%${safeKeyword}%`,
        ),
      access.supabase
        .from("wpi_suppliers")
        .select("id")
        .eq("organization_id", access.organizationId)
        .ilike("name", `%${safeKeyword}%`),
    ]);
    const keywordError = itemMatches.error ?? supplierMatches.error;
    if (keywordError)
      return NextResponse.json(
        { error: keywordError.message },
        { status: 500 },
      );
    const matchedSupplierIds = (supplierMatches.data ?? []).map(
      (row) => row.id,
    );
    const supplierInquiryMatches = matchedSupplierIds.length
      ? await access.supabase
          .from("wpi_inquiry_suppliers")
          .select("inquiry_id")
          .eq("organization_id", access.organizationId)
          .in("supplier_id", matchedSupplierIds)
      : { data: [], error: null };
    if (supplierInquiryMatches.error)
      return NextResponse.json(
        { error: supplierInquiryMatches.error.message },
        { status: 500 },
      );
    keywordRelatedIds = [
      ...new Set([
        ...(itemMatches.data ?? []).map((row) => row.inquiry_id),
        ...(supplierInquiryMatches.data ?? []).map((row) => row.inquiry_id),
      ]),
    ];
  }
  if (supplier !== "all") {
    const supplierRows = await access.supabase
      .from("wpi_suppliers")
      .select("id")
      .eq("organization_id", access.organizationId)
      .eq("name", supplier);
    if (supplierRows.error)
      return NextResponse.json(
        { error: supplierRows.error.message },
        { status: 500 },
      );
    const supplierIds = (supplierRows.data ?? []).map((row) => row.id);
    const links = supplierIds.length
      ? await access.supabase
          .from("wpi_inquiry_suppliers")
          .select("inquiry_id")
          .eq("organization_id", access.organizationId)
          .in("supplier_id", supplierIds)
      : { data: [], error: null };
    if (links.error)
      return NextResponse.json({ error: links.error.message }, { status: 500 });
    const supplierInquiryIds = [
      ...new Set((links.data ?? []).map((row) => row.inquiry_id)),
    ];
    constrainedInquiryIds = constrainedInquiryIds === null
      ? supplierInquiryIds
      : constrainedInquiryIds.filter((id) => supplierInquiryIds.includes(id));
  }

  if (highSpreadOnly) {
    const quoteRows = await access.supabase
      .from("wpi_inquiry_suppliers")
      .select("inquiry_id, quoted_amount")
      .eq("organization_id", access.organizationId)
      .not("quoted_amount", "is", null);
    if (quoteRows.error)
      return NextResponse.json(
        { error: quoteRows.error.message },
        { status: 500 },
      );
    const quoteGroups = new Map<string, number[]>();
    for (const row of quoteRows.data ?? []) {
      const values = quoteGroups.get(row.inquiry_id) ?? [];
      values.push(Number(row.quoted_amount));
      quoteGroups.set(row.inquiry_id, values);
    }
    const spreadIds = [...quoteGroups.entries()]
      .filter(([, values]) => {
        if (values.length < 2) return false;
        const low = Math.min(...values);
        return low > 0 && ((Math.max(...values) - low) / low) * 100 >= 30;
      })
      .map(([id]) => id);
    constrainedInquiryIds =
      constrainedInquiryIds === null
        ? spreadIds
        : constrainedInquiryIds.filter((id) => spreadIds.includes(id));
  }

  if (respondedOnly) {
    const responseRows = await access.supabase
      .from("wpi_inquiry_suppliers")
      .select("inquiry_id")
      .eq("organization_id", access.organizationId)
      .in("response_status", ["responded", "quoted", "completed"]);
    if (responseRows.error)
      return NextResponse.json(
        { error: responseRows.error.message },
        { status: 500 },
      );
    const responseIds = [
      ...new Set((responseRows.data ?? []).map((row) => row.inquiry_id)),
    ];
    constrainedInquiryIds =
      constrainedInquiryIds === null
        ? responseIds
        : constrainedInquiryIds.filter((id) => responseIds.includes(id));
  }

  if (constrainedInquiryIds?.length === 0) {
    return NextResponse.json({
      data: [],
      summary,
      pagination: { page, pageSize, total: 0, pageCount: 1 },
      permissions: {
        canWrite: ["admin", "manager", "editor", "reviewer"].includes(
          access.role,
        ),
        canReview: ["admin", "manager", "reviewer"].includes(access.role),
      },
      filterOptions: { suppliers: supplierOptions },
      emailGateway,
      source: "supabase",
    });
  }

  let query = access.supabase
    .from("wpi_inquiries")
    .select(
      "*, wpi_inquiry_items(*), wpi_inquiry_suppliers(supplier_id, response_status, quoted_amount, currency, responded_at, risk_level, ai_recommendation, metadata, delivery_status, sent_at, delivered_at, opened_at, replied_at, last_reminded_at, send_attempts, last_error, wpi_suppliers(id, legacy_id, name))",
      { count: "exact" },
    )
    .eq("organization_id", access.organizationId);

  if (safeKeyword) {
    const relatedClause = keywordRelatedIds.length
      ? `,id.in.(${keywordRelatedIds.join(",")})`
      : "";
    query = query.or(
      `inquiry_code.ilike.%${safeKeyword}%,subject.ilike.%${safeKeyword}%${relatedClause}`,
    );
  }
  if (status !== "all") query = query.eq("status", status);
  if (risk === "high_or_critical")
    query = query.in("risk_level", ["high", "critical"]);
  else if (risk !== "all") query = query.eq("risk_level", risk);
  if (aiPlan !== "all") query = query.contains("metadata", { aiPlan });
  if (startDate) query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
  if (overdueOnly) query = query.in("status", ["draft", "pending_review"]).lt("deadline", new Date().toISOString());
  if (constrainedInquiryIds) query = query.in("id", constrainedInquiryIds);

  const sortConfig =
    {
      updated_desc: { column: "updated_at", ascending: false },
      created_desc: { column: "created_at", ascending: false },
      deadline_asc: { column: "deadline", ascending: true },
      risk_desc: { column: "risk_level", ascending: false },
    }[sort] ?? { column: "updated_at", ascending: false };

  const { data, error, count } = await query
    .order(sortConfig.column, {
      ascending: sortConfig.ascending,
      nullsFirst: false,
    })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
    summary,
    permissions: {
      canWrite: ["admin", "manager", "editor", "reviewer"].includes(
        access.role,
      ),
      canReview: ["admin", "manager", "reviewer"].includes(access.role),
    },
    filterOptions: { suppliers: supplierOptions },
    emailGateway,
    source: "supabase",
  });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );

  const body = (await request.json()) as CreateInquiryBody;
  if (!body.subject?.trim()) {
    return NextResponse.json(
      { error: "Inquiry subject is required" },
      { status: 400 },
    );
  }
  const supplierAssignments = new Map(
    (body.supplierAssignments ?? []).map((assignment) => [
      assignment.supplierId,
      [...new Set(assignment.itemIds.filter(Boolean))],
    ]),
  );
  const invalidAssignment = (body.supplierAssignments ?? []).find(
    (assignment) => !(body.supplierIds ?? []).includes(assignment.supplierId) || assignment.itemIds.length === 0,
  );
  if (invalidAssignment) {
    return NextResponse.json(
      { error: "供应商询价范围无效，请确保每家供应商至少分配一个询价对象" },
      { status: 400 },
    );
  }
  if (body.deadline) {
    const deadline = new Date(body.deadline);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "询价截止时间必须是有效的未来时间" },
        { status: 400 },
      );
    }
  }
  if (body.supplierAssignments?.length && body.items?.length) {
    const assignedItemIds = new Set(body.supplierAssignments.flatMap((assignment) => assignment.itemIds));
    const uncoveredItem = body.items.find((item) => !assignedItemIds.has(item.id));
    if (uncoveredItem) {
      return NextResponse.json(
        { error: `询价对象“${uncoveredItem.name}”尚未分配供应商` },
        { status: 400 },
      );
    }
  }
  const pricingItemIds = [...new Set((body.projectPricingItemIds ?? []).filter((id) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)))];
  if (body.projectPricingId && pricingItemIds.length) {
    const pricingItems = await access.supabase
      .from("wpi_project_pricing_items")
      .select("id,boq_code,metadata")
      .eq("organization_id", access.organizationId)
      .eq("project_id", body.projectPricingId)
      .in("id", pricingItemIds);
    if (pricingItems.error) {
      return NextResponse.json({ error: `询价防重检查失败：${pricingItems.error.message}` }, { status: 500 });
    }
    const inquiryIds = [...new Set((pricingItems.data ?? []).map((item) => {
      const metadata = (item.metadata as Record<string, unknown> | null) ?? {};
      return typeof metadata.inquiryId === "string" ? metadata.inquiryId : "";
    }).filter(Boolean))];
    if (inquiryIds.length) {
      const activeInquiries = await access.supabase
        .from("wpi_inquiries")
        .select("id,inquiry_code,status")
        .eq("organization_id", access.organizationId)
        .in("id", inquiryIds)
        .not("status", "in", "(rejected,archived)");
      if (activeInquiries.error) {
        return NextResponse.json({ error: `询价防重检查失败：${activeInquiries.error.message}` }, { status: 500 });
      }
      const activeIds = new Set((activeInquiries.data ?? []).map((inquiry) => inquiry.id));
      const conflicts = (pricingItems.data ?? []).filter((item) => {
        const metadata = (item.metadata as Record<string, unknown> | null) ?? {};
        return typeof metadata.inquiryId === "string" && activeIds.has(metadata.inquiryId);
      });
      if (conflicts.length) {
        return NextResponse.json({
          error: `${conflicts.length} 条 BOQ 已关联有效询价任务，请返回缺口工作区查看原任务`,
          code: "PROJECT_PRICING_INQUIRY_EXISTS",
          conflictingItems: conflicts.map((item) => ({ id: item.id, boqCode: item.boq_code })),
          inquiries: activeInquiries.data ?? [],
        }, { status: 409 });
      }
    }
  }
  const providedSupplierMapping = Array.isArray(body.metadata?.supplierMapping)
    ? body.metadata.supplierMapping
    : null;
  const normalizedSupplierMapping = providedSupplierMapping ?? (body.items ?? []).map((item) => ({
    code: item.sourceId ?? item.id,
    itemId: item.id,
    supplierIds: body.supplierAssignments?.length
      ? body.supplierAssignments
          .filter((assignment) => assignment.itemIds.includes(item.id))
          .map((assignment) => assignment.supplierId)
      : body.supplierIds ?? [],
    language: "中 / 英",
    status: item.specification?.trim() ? "complete" : "missing",
    mappingReason: "创建询价任务时配置",
  }));
  const normalizedSupplierAssignments = Object.fromEntries(supplierAssignments);

  const now = new Date();
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replaceAll("-", "");
  const code = `INQ-${localDate}-${String(now.getTime()).slice(-4)}`;
  const { data: inquiry, error: inquiryError } = await access.supabase
    .from("wpi_inquiries")
    .insert({
      organization_id: access.organizationId,
      legacy_id: code,
      inquiry_code: code,
      subject: body.subject.trim(),
      status: "draft",
      deadline: body.deadline || null,
      letter_content: body.letterContent || null,
      ai_confidence: body.letterContent ? 82 : null,
      risk_level: "medium",
      metadata: {
        ...(body.metadata ?? {}),
        supplierMapping: normalizedSupplierMapping,
        supplierItemAssignments: normalizedSupplierAssignments,
        createdFromFrontend: true,
        reviewRequired: true,
      },
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select("id, legacy_id, inquiry_code")
    .single();

  if (inquiryError) {
    return NextResponse.json({ error: inquiryError.message }, { status: 500 });
  }

  const equipmentIds = body.equipmentIds ?? [];
  const materialIds = body.materialIds ?? [];
  const supplierIds = body.supplierIds ?? [];
  const [equipmentResult, materialResult, supplierResult] = await Promise.all([
    equipmentIds.length
      ? access.supabase
          .from("wpi_equipment_prices")
          .select("id, legacy_id, equipment_name, model, usd_price, metadata")
          .eq("organization_id", access.organizationId)
          .in("legacy_id", equipmentIds)
      : Promise.resolve({ data: [], error: null }),
    materialIds.length
      ? access.supabase
          .from("wpi_material_prices")
          .select(
            "id, legacy_id, material_name, specification, unit, price, metadata",
          )
          .eq("organization_id", access.organizationId)
          .in("legacy_id", materialIds)
      : Promise.resolve({ data: [], error: null }),
    supplierIds.length
      ? access.supabase
          .from("wpi_suppliers")
          .select("id, legacy_id, review_status")
          .eq("organization_id", access.organizationId)
          .in("legacy_id", supplierIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const lookupError =
    equipmentResult.error ?? materialResult.error ?? supplierResult.error;
  if (lookupError) {
    await access.supabase.from("wpi_inquiries").delete().eq("id", inquiry.id);
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const resolvedSourceIds = new Set([
    ...(equipmentResult.data ?? []).map((item) => item.legacy_id),
    ...(materialResult.data ?? []).map((item) => item.legacy_id),
  ]);
  const itemRows = [
    ...(equipmentResult.data ?? []).map((item) => ({
      organization_id: access.organizationId,
      inquiry_id: inquiry.id,
      legacy_id: `${code}:${item.legacy_id}`,
      item_type: "equipment",
      source_id: item.id,
      item_name: item.equipment_name,
      specification: item.model,
      quantity: 1,
      unit: String(
        (item.metadata as Record<string, unknown> | null)?.unit ?? "台",
      ),
      target_price: item.usd_price,
      metadata: { sourceLegacyId: item.legacy_id },
    })),
    ...(materialResult.data ?? []).map((item) => ({
      organization_id: access.organizationId,
      inquiry_id: inquiry.id,
      legacy_id: `${code}:${item.legacy_id}`,
      item_type: "material",
      source_id: item.id,
      item_name: item.material_name,
      specification: item.specification,
      quantity: 1,
      unit: item.unit,
      target_price: item.price,
      metadata: { sourceLegacyId: item.legacy_id },
    })),
    ...(body.items ?? [])
      .filter((item) => !resolvedSourceIds.has(item.sourceId ?? item.id))
      .map((item) => ({
        organization_id: access.organizationId,
        inquiry_id: inquiry.id,
        legacy_id: `${code}:${item.id}`,
        item_type: item.category.includes("地材") ? "material" : "equipment",
        source_id: null,
        item_name: item.name,
        specification: item.specification || null,
        quantity: item.quantity || 1,
        unit: item.unit || null,
        target_price: item.targetPrice || null,
        metadata: {
          ...item,
          unresolvedSource: true,
          reviewRequired: true,
        },
      })),
  ];

  if (itemRows.length > 0) {
    const { error } = await access.supabase
      .from("wpi_inquiry_items")
      .insert(itemRows);
    if (error) {
      await access.supabase.from("wpi_inquiries").delete().eq("id", inquiry.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const supplierRows = (supplierResult.data ?? []).map((supplier) => ({
    organization_id: access.organizationId,
    inquiry_id: inquiry.id,
    supplier_id: supplier.id,
    response_status: "draft",
    quoted_amount: null,
    currency: null,
    responded_at: null,
    risk_level: supplier.review_status === "approved" ? "low" : "medium",
    ai_recommendation:
      supplier.review_status === "approved"
        ? "供应商已通过准入，可由人工确认后发送。"
        : "供应商仍待人工复核，询价任务仅保存为草稿。",
    metadata: {
      sourceLegacyId: supplier.legacy_id,
      admissionStatus: supplier.review_status,
      assignedItemIds: supplierAssignments.get(supplier.legacy_id) ?? [],
      assignmentMode: supplierAssignments.has(supplier.legacy_id) ? "explicit" : "all_items_legacy",
    },
  }));

  if (supplierRows.length > 0) {
    const { error } = await access.supabase
      .from("wpi_inquiry_suppliers")
      .insert(supplierRows);
    if (error) {
      await access.supabase.from("wpi_inquiries").delete().eq("id", inquiry.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  let projectPricingLinked = false;
  if (body.projectPricingId) {
    const currentProject = await access.supabase
      .from("wpi_projects")
      .select("id, metadata")
      .eq("organization_id", access.organizationId)
      .eq("id", body.projectPricingId)
      .maybeSingle();
    if (currentProject.error || !currentProject.data) {
      return NextResponse.json({ error: `询价已创建，但未找到对应套价方案：${currentProject.error?.message ?? body.projectPricingId}` }, { status: 500 });
    }
    const projectUpdate = await access.supabase
      .from("wpi_projects")
      .update({
        source_inquiry_id: inquiry.id,
        updated_by: access.userId,
        metadata: {
          ...((currentProject.data.metadata as Record<string, unknown> | null) ?? {}),
          latestInquiryId: inquiry.id,
          latestInquiryCode: inquiry.inquiry_code,
        },
      })
      .eq("organization_id", access.organizationId)
      .eq("id", body.projectPricingId)
      .select("id")
      .maybeSingle();
    if (projectUpdate.error) {
      return NextResponse.json({ error: `询价已创建，但套价方案关联失败：${projectUpdate.error.message}` }, { status: 500 });
    }
    projectPricingLinked = Boolean(projectUpdate.data);

    if (pricingItemIds.length) {
      const pricingItems = await access.supabase
        .from("wpi_project_pricing_items")
        .select("id, metadata")
        .eq("organization_id", access.organizationId)
        .eq("project_id", body.projectPricingId)
        .in("id", pricingItemIds);
      if (pricingItems.error) {
        return NextResponse.json({ error: `询价已创建，但套价行读取失败：${pricingItems.error.message}` }, { status: 500 });
      }
      for (const item of pricingItems.data ?? []) {
        const update = await access.supabase
          .from("wpi_project_pricing_items")
          .update({
            metadata: {
              ...((item.metadata as Record<string, unknown> | null) ?? {}),
              inquiryId: inquiry.id,
              inquiryCode: inquiry.inquiry_code,
              inquiryCreatedAt: new Date().toISOString(),
            },
            updated_by: access.userId,
          })
          .eq("organization_id", access.organizationId)
          .eq("project_id", body.projectPricingId)
          .eq("id", item.id);
        if (update.error) {
          return NextResponse.json({ error: `询价已创建，但套价行关联失败：${update.error.message}` }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json(
    {
      data: {
        ...inquiry,
        itemCount: itemRows.length,
        supplierCount: supplierRows.length,
        status: "draft",
        projectPricingLinked,
      },
    },
    { status: 201 },
  );
}
