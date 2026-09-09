import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const id = (await context.params).id;
  const query = () => access.supabase.from("wpi_inquiries").select("id").eq("organization_id", access.organizationId);
  let inquiry = await query().eq("legacy_id", id).maybeSingle();
  if (!inquiry.data) inquiry = await query().eq("inquiry_code", id).maybeSingle();
  if (!inquiry.data && /^[0-9a-f-]{36}$/i.test(id)) inquiry = await query().eq("id", id).maybeSingle();
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });
  const result = await access.supabase
    .from("wpi_inquiry_events")
    .select("*, wpi_suppliers(legacy_id,name)")
    .eq("organization_id", access.organizationId)
    .eq("inquiry_id", inquiry.data.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ data: result.data ?? [], source: "supabase" });
}
