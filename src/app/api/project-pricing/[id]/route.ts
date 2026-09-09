import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { loadProjectPricing, projectPricingWriteRoles } from "@/lib/projectPricing/server";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  try {
    const data = await loadProjectPricing(access.supabase, access.organizationId, id);
    if (!data) return NextResponse.json({ error: "项目套价方案不存在" }, { status: 404 });
    return NextResponse.json({ data, source: "supabase" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "项目套价方案加载失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!projectPricingWriteRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有项目套价编辑权限" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_by: access.userId };
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.projectStage === "string") patch.project_stage = body.projectStage;
  if (typeof body.baseCurrency === "string") patch.base_currency = body.baseCurrency;
  if (typeof body.priceTerm === "string") patch.price_term = body.priceTerm;
  if (Number.isFinite(Number(body.exchangeRate))) patch.exchange_rate = Number(body.exchangeRate);
  if (typeof body.validUntil === "string") patch.valid_until = body.validUntil || null;
  const updated = await access.supabase.from("wpi_projects").update(patch)
    .eq("organization_id", access.organizationId).eq("id", id).select().single();
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });
  return NextResponse.json({ data: updated.data, source: "supabase" });
}
