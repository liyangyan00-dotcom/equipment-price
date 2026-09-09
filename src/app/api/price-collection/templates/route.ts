import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const result = await access.supabase
    .from("wpi_user_preferences")
    .select("price_collection_templates")
    .eq("organization_id", access.organizationId)
    .eq("user_id", access.userId)
    .maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ templates: Array.isArray(result.data?.price_collection_templates) ? result.data.price_collection_templates : [] });
}

export async function PUT(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => ({})) as { templates?: unknown[] };
  const templates = Array.isArray(body.templates) ? body.templates.slice(0, 20) : [];
  const result = await access.supabase.from("wpi_user_preferences").upsert({
    organization_id: access.organizationId,
    user_id: access.userId,
    ai_mode: "human_review",
    notifications_enabled: true,
    price_collection_templates: templates,
  }, { onConflict: "organization_id,user_id" });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ templates });
}
