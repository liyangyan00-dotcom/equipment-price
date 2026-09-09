import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildGapInquiryPlan, type GapPlanItem, type GapPlanSupplier } from "@/lib/projectPricing/gapInquiryPlan";
import { loadProjectPricing } from "@/lib/projectPricing/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;

  try {
    const [pricing, supplierResult] = await Promise.all([
      loadProjectPricing(access.supabase, access.organizationId, id),
      access.supabase
        .from("wpi_suppliers")
        .select("legacy_id,supplier_code,name,category,business_scope,region,confidence,risk_level,review_status")
        .eq("organization_id", access.organizationId)
        .eq("review_status", "approved")
        .order("confidence", { ascending: false })
        .limit(200),
    ]);
    if (!pricing) return NextResponse.json({ error: "项目套价方案不存在" }, { status: 404 });
    if (supplierResult.error) return NextResponse.json({ error: supplierResult.error.message }, { status: 500 });

    const data = buildGapInquiryPlan(
      pricing.project.project_code,
      pricing.items as GapPlanItem[],
      (supplierResult.data ?? []) as GapPlanSupplier[],
    );
    return NextResponse.json({ data, source: "supabase", organizationId: access.organizationId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "缺口询价方案生成失败" }, { status: 500 });
  }
}
