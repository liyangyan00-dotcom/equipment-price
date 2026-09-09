import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { createProjectCode, listProjectPricingProjects, loadProjectPricing, projectPricingWriteRoles } from "@/lib/projectPricing/server";

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (request.nextUrl.searchParams.get("view") === "names") {
    const result = await access.supabase.from("wpi_projects").select("id,name")
      .eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(50);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 503 });
    return NextResponse.json({ projects: result.data ?? [], source: "supabase" });
  }
  try {
    const [data, projects] = await Promise.all([
      loadProjectPricing(access.supabase, access.organizationId, request.nextUrl.searchParams.get("id") || undefined),
      listProjectPricingProjects(access.supabase, access.organizationId),
    ]);
    return NextResponse.json({ data, projects, source: "supabase", permissions: { canWrite: projectPricingWriteRoles.has(access.role) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "项目套价数据加载失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!projectPricingWriteRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有项目套价写入权限" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "新建项目套价方案";
  const baseCurrency = typeof body.baseCurrency === "string" ? body.baseCurrency.trim().toUpperCase() : "USD";
  const exchangeRate = Number(body.exchangeRate);
  if (!new Set(["USD", "CNY", "CDF", "EUR"]).has(baseCurrency)) return NextResponse.json({ error: "基准币种不受支持" }, { status: 400 });
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return NextResponse.json({ error: "请输入有效汇率" }, { status: 400 });
  const inserted = await access.supabase.from("wpi_projects").insert({
    organization_id: access.organizationId,
    project_code: createProjectCode(),
    name,
    project_stage: typeof body.projectStage === "string" ? body.projectStage : "budgeting",
    base_currency: baseCurrency,
    price_term: typeof body.priceTerm === "string" ? body.priceTerm : "CIF",
    exchange_rate: exchangeRate,
    valid_until: typeof body.validUntil === "string" && body.validUntil ? body.validUntil : null,
    status: "draft",
    source_inquiry_id: typeof body.sourceInquiryId === "string" ? body.sourceInquiryId : null,
    metadata: {
      country: typeof body.country === "string" ? body.country.trim() : "刚果金",
      targetRegion: typeof body.targetRegion === "string" ? body.targetRegion.trim() : "Kinshasa",
      exchangeRateDate: typeof body.exchangeRateDate === "string" ? body.exchangeRateDate : null,
      includeTax: body.includeTax === true,
      includeFreight: body.includeFreight === true,
      source: "project_pricing_create",
    },
    created_by: access.userId,
    updated_by: access.userId,
  }).select().single();
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });
  return NextResponse.json({ data: inserted.data, source: "supabase" }, { status: 201 });
}
