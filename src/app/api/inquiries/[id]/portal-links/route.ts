import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor", "reviewer"]);

async function resolveInquiry(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  id: string,
) {
  const query = () =>
    access.supabase
      .from("wpi_inquiries")
      .select("id,inquiry_code")
      .eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id))
    result = await query().eq("id", id).maybeSingle();
  return result;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role))
    return NextResponse.json({ error: "当前角色没有生成供应商填报链接的权限" }, { status: 403 });

  const inquiry = await resolveInquiry(access, (await context.params).id);
  if (inquiry.error)
    return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data)
    return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    supplierId?: string;
    expiresInDays?: number;
  };
  if (!body.supplierId)
    return NextResponse.json({ error: "请选择供应商" }, { status: 400 });

  const [integration, supplierLink] = await Promise.all([
    access.supabase
      .from("wpi_integrations")
      .select("status,credential_state,config")
      .eq("organization_id", access.organizationId)
      .eq("integration_code", "SMTP_OUTBOUND")
      .maybeSingle(),
    access.supabase
      .from("wpi_inquiry_suppliers")
      .select("supplier_id,wpi_suppliers(name,review_status)")
      .eq("organization_id", access.organizationId)
      .eq("inquiry_id", inquiry.data.id)
      .eq("supplier_id", body.supplierId)
      .maybeSingle(),
  ]);
  const readError = integration.error ?? supplierLink.error;
  if (readError)
    return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!supplierLink.data)
    return NextResponse.json({ error: "供应商未关联到当前询价任务" }, { status: 404 });

  const supplier = Array.isArray(supplierLink.data.wpi_suppliers)
    ? supplierLink.data.wpi_suppliers[0]
    : supplierLink.data.wpi_suppliers;
  if (supplier?.review_status !== "approved") {
    return NextResponse.json(
      { error: `供应商“${supplier?.name ?? body.supplierId}”尚未通过准入复核` },
      { status: 409 },
    );
  }
  const config = integration.data?.config as Record<string, unknown> | null;
  const publicAppUrl = typeof config?.publicAppUrl === "string"
    ? config.publicAppUrl.trim().replace(/\/$/, "")
    : "";
  if (!publicAppUrl.startsWith("https://")) {
    return NextResponse.json(
      {
        error: "供应商报价门户尚未就绪",
        code: "SUPPLIER_PORTAL_NOT_READY",
        issues: ["请先在邮件集成中配置可公网访问的 HTTPS 系统地址"],
        remediationHref: "/settings/integrations?type=email",
      },
      { status: 503 },
    );
  }

  const result = await access.supabase.functions.invoke("wpi-supplier-quote-portal", {
    body: {
      action: "create",
      inquiryId: inquiry.data.id,
      supplierId: body.supplierId,
      expiresInDays: body.expiresInDays ?? 14,
    },
  });
  if (result.error) {
    let detail = result.error.message;
    const contextResponse = (result.error as { context?: unknown }).context;
    if (contextResponse instanceof Response) {
      const payload = (await contextResponse.clone().json().catch(() => null)) as
        | { error?: string }
        | null;
      detail = payload?.error || detail;
    }
    return NextResponse.json({ error: detail }, { status: 409 });
  }
  const data = result.data?.data as { path?: string; expiresAt?: string } | undefined;
  return NextResponse.json(
    {
      data: {
        ...data,
        url: data?.path ? new URL(data.path, `${publicAppUrl}/`).toString() : null,
      },
      source: "supabase-edge",
    },
    { status: 201 },
  );
}
