import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const reviewResult = await access.supabase
    .from("wpi_equipment_price_reviews")
    .select("equipment_price_id")
    .eq("id", id)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (reviewResult.error) {
    return NextResponse.json({ error: reviewResult.error.message }, { status: 500 });
  }
  if (!reviewResult.data) {
    return NextResponse.json({ error: "审核任务不存在" }, { status: 404 });
  }

  const { data, error } = await access.supabase.rpc(
    "wpi_get_equipment_review_audit",
    { target_review_id: id }
  );

  if (error) {
    const status = /not found/i.test(error.message) ? 404 : 403;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (reviewResult.data.equipment_price_id) {
    const auditResult = await access.supabase.rpc(
      "wpi_record_equipment_access_event",
      {
        target_price_id: reviewResult.data.equipment_price_id,
        event_action: "audit.view",
        event_data: { reviewId: id },
      }
    );
    if (auditResult.error) {
      return NextResponse.json(
        { error: `审计访问留痕失败：${auditResult.error.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ data, source: "supabase" });
}
