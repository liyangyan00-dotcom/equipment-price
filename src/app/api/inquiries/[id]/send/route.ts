import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };

type InquirySupplierRow = {
  supplier_id: string;
  response_status: string | null;
  metadata: Record<string, unknown> | null;
  wpi_suppliers:
    | {
        id: string;
        legacy_id: string | null;
        name: string;
        review_status: string | null;
        wpi_supplier_contacts: Array<{
          email: string | null;
          is_primary: boolean | null;
        }> | null;
      }
    | Array<{
        id: string;
        legacy_id: string | null;
        name: string;
        review_status: string | null;
        wpi_supplier_contacts: Array<{
          email: string | null;
          is_primary: boolean | null;
        }> | null;
      }>
    | null;
};

type InquirySendRecord = {
  id: string;
  status: string;
  deadline: string | null;
  letter_content: string | null;
  metadata: Record<string, unknown> | null;
  wpi_inquiry_suppliers: InquirySupplierRow[] | null;
};

function supplierRecord(row: InquirySupplierRow) {
  return Array.isArray(row.wpi_suppliers) ? row.wpi_suppliers[0] : row.wpi_suppliers;
}

function hasValidEmail(value: unknown) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function emailGatewayIssues(row: { provider?: string | null; status?: string; credential_state?: string; config?: Record<string, unknown> | null } | null) {
  const issues: string[] = [];
  const config = row?.config ?? {};
  const value = (key: string) => typeof config[key] === "string" ? String(config[key]).trim() : "";
  if (!row) issues.push("未找到询价邮件集成");
  if (row && row.provider?.toLowerCase() !== "resend") issues.push("邮件服务商必须配置为 Resend");
  if (row && row.credential_state !== "configured") issues.push("未配置 Resend API Key 与 Webhook 签名密钥");
  if (row && row.status !== "active") issues.push("邮件集成尚未通过连接验证");
  if (!value("senderAddress") || value("senderAddress").endsWith("@example.com")) issues.push("未配置已验证的发件邮箱");
  if (!value("replyToAddress")) issues.push("未配置供应商回复邮箱");
  if (!value("publicAppUrl").startsWith("https://")) issues.push("供应商门户公开地址必须使用 HTTPS");
  if (!value("webhookUrl").startsWith("https://")) issues.push("未配置 Resend 事件回调地址");
  return issues;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  if (!["admin", "manager", "reviewer"].includes(access.role)) {
    return NextResponse.json({ error: "当前角色无权发送或催办询价" }, { status: 403 });
  }
  const integration = await access.supabase.from("wpi_integrations")
    .select("provider,status,credential_state,config")
    .eq("organization_id", access.organizationId)
    .eq("integration_type", "email")
    .order("is_system", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (integration.error) return NextResponse.json({ error: integration.error.message }, { status: 500 });
  const gatewayIssues = emailGatewayIssues(integration.data);
  if (gatewayIssues.length) {
    return NextResponse.json({
      error: "询价邮件网关尚未就绪",
      code: "EMAIL_GATEWAY_NOT_READY",
      issues: gatewayIssues,
      remediationHref: "/settings/integrations?type=email",
    }, { status: 503 });
  }
  const runtimeValidation = await access.supabase.functions.invoke("wpi-inquiry-mailer", {
    body: { action: "validate", organizationId: access.organizationId },
  });
  if (runtimeValidation.error) {
    let detail = runtimeValidation.error.message;
    const contextResponse = (runtimeValidation.error as { context?: unknown }).context;
    if (contextResponse instanceof Response) {
      const payload = await contextResponse.clone().json().catch(() => null) as { error?: string; detail?: string } | null;
      detail = payload?.detail || payload?.error || detail;
    }
    return NextResponse.json({
      error: "询价邮件域名或公开门户未通过实时校验",
      code: detail,
      remediationHref: "/settings/integrations?type=email",
    }, { status: 503 });
  }
  const id = (await context.params).id;
  const query = () =>
    access.supabase
      .from("wpi_inquiries")
      .select("id,status,deadline,letter_content,metadata,wpi_inquiry_suppliers(supplier_id,response_status,metadata,wpi_suppliers(id,legacy_id,name,review_status,wpi_supplier_contacts(email,is_primary)))")
      .eq("organization_id", access.organizationId);
  let inquiry = await query().eq("legacy_id", id).maybeSingle();
  if (!inquiry.data)
    inquiry = await query().eq("inquiry_code", id).maybeSingle();
  if (!inquiry.data && /^[0-9a-f-]{36}$/i.test(id))
    inquiry = await query().eq("id", id).maybeSingle();
  if (inquiry.error)
    return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data)
    return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as {
    supplierIds?: string[];
    retry?: boolean;
    mode?: "send" | "reminder";
  };
  const mode = body.mode === "reminder" ? "reminder" : "send";
  const record = inquiry.data as unknown as InquirySendRecord;
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const supplierRows = record.wpi_inquiry_suppliers ?? [];
  const requestedSupplierIds = new Set((body.supplierIds ?? []).filter(Boolean));
  const targetRows = requestedSupplierIds.size
    ? supplierRows.filter((row) => {
        const supplier = supplierRecord(row);
        return requestedSupplierIds.has(row.supplier_id) ||
          requestedSupplierIds.has(supplier?.id ?? "") ||
          requestedSupplierIds.has(supplier?.legacy_id ?? "");
      })
    : supplierRows;
  const issues: string[] = [];

  if (!["pending_review", "approved"].includes(record.status)) {
    issues.push("询价任务尚未进入待复核或已批准状态");
  }
  if (!String(record.letter_content ?? "").trim()) issues.push("询价函正文为空");
  if (metadata.aiApprovalStatus !== "approved" || metadata.aiApprovalInvalidated === true) {
    issues.push("AI 询价函草稿尚未完成人工批准，或批准已失效");
  }
  if (!metadata.sendPreflightPassedAt) issues.push("缺少已通过发送前校验的记录");
  if (mode === "send") {
    const deadline = record.deadline ? new Date(record.deadline) : null;
    if (!deadline || Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      issues.push("报价截止时间无效或已过期");
    }
  }

  const supplierMapping = Array.isArray(metadata.supplierMapping)
    ? (metadata.supplierMapping as Array<Record<string, unknown>>)
    : [];
  if (!supplierMapping.length) {
    issues.push("缺少询价对象与供应商映射");
  } else {
    if (supplierMapping.some((mapping) => !Array.isArray(mapping.supplierIds) || mapping.supplierIds.length === 0)) {
      issues.push("存在未分配供应商的询价对象");
    }
    if (supplierMapping.some((mapping) => mapping.status !== "complete")) {
      issues.push("存在规格参数未补全的询价对象");
    }
  }

  if (!supplierRows.length) issues.push("询价任务未关联供应商");
  if (requestedSupplierIds.size && targetRows.length !== requestedSupplierIds.size) {
    issues.push("请求中包含未关联到当前询价任务的供应商");
  }
  targetRows.forEach((row) => {
    const supplier = supplierRecord(row);
    const supplierName = supplier?.name || supplier?.legacy_id || row.supplier_id;
    if (supplier?.review_status !== "approved") {
      issues.push(`供应商“${supplierName}”尚未通过准入复核`);
    }
    const contacts = supplier?.wpi_supplier_contacts ?? [];
    const primaryContact = contacts.find((contact) => contact.is_primary) ?? contacts[0];
    if (!hasValidEmail(primaryContact?.email)) {
      issues.push(`供应商“${supplierName}”缺少有效主邮箱`);
    }
    const supplierAliases = new Set([row.supplier_id, supplier?.id ?? "", supplier?.legacy_id ?? ""].filter(Boolean));
    const mapped = supplierMapping.some((mapping) =>
      Array.isArray(mapping.supplierIds) && mapping.supplierIds.some((supplierId) => supplierAliases.has(String(supplierId))),
    );
    const assignedItemIds = Array.isArray(row.metadata?.assignedItemIds) ? row.metadata.assignedItemIds : [];
    if (!mapped && assignedItemIds.length === 0) {
      issues.push(`供应商“${supplierName}”尚未分配询价对象`);
    }
  });

  if (issues.length) {
    return NextResponse.json(
      {
        error: mode === "reminder" ? "询价催办前校验未通过" : "询价发送前校验未通过",
        code: "INQUIRY_SEND_PREFLIGHT_FAILED",
        issues: Array.from(new Set(issues)),
      },
      { status: 409 },
    );
  }

  const result = await access.supabase.functions.invoke("wpi-inquiry-mailer", {
    body: {
      inquiryId: inquiry.data.id,
      supplierIds: body.supplierIds ?? [],
      retry: body.retry === true,
      mode,
    },
  });
  if (result.error) {
    let detail = result.error.message;
    const contextResponse = (result.error as { context?: unknown }).context;
    if (contextResponse instanceof Response) {
      const payload = (await contextResponse
        .clone()
        .json()
        .catch(() => null)) as { error?: string; detail?: string } | null;
      detail = payload?.detail || payload?.error || detail;
    }
    return NextResponse.json({ error: detail }, { status: 409 });
  }
  return NextResponse.json({ data: result.data, source: "supabase-edge" });
}
