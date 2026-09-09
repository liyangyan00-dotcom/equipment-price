import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CreateVersionBody = {
  source?: "ai" | "manual" | "restored";
  language?: string;
  content?: string;
  config?: Record<string, unknown>;
  changeSummary?: string;
  aiConfidence?: number | null;
};

async function resolveInquiry(
  access: Awaited<ReturnType<typeof getApiAccess>> & { ok: true },
  id: string,
) {
  const query = () =>
    access.supabase
      .from("wpi_inquiries")
      .select("id, legacy_id, inquiry_code")
      .eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) {
    result = await query().eq("id", id).maybeSingle();
  }
  return result;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const inquiry = await resolveInquiry(access, id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });

  const { data, error } = await access.supabase
    .from("wpi_inquiry_letter_versions")
    .select("id, version_number, source, language, content, config, change_summary, ai_confidence, created_at, created_by")
    .eq("organization_id", access.organizationId)
    .eq("inquiry_id", inquiry.data.id)
    .order("version_number", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, source: "supabase" });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const body = (await request.json()) as CreateVersionBody;
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Letter content is required" }, { status: 400 });
  }
  const inquiry = await resolveInquiry(access, id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });

  const { data: latest, error: latestError } = await access.supabase
    .from("wpi_inquiry_letter_versions")
    .select("version_number")
    .eq("organization_id", access.organizationId)
    .eq("inquiry_id", inquiry.data.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) return NextResponse.json({ error: latestError.message }, { status: 500 });

  const { data, error } = await access.supabase
    .from("wpi_inquiry_letter_versions")
    .insert({
      organization_id: access.organizationId,
      inquiry_id: inquiry.data.id,
      version_number: (latest?.version_number ?? 0) + 1,
      source: body.source ?? "manual",
      language: body.language ?? "zh-CN",
      content: body.content.trim(),
      config: body.config ?? {},
      change_summary: body.changeSummary?.trim() || null,
      ai_confidence: body.aiConfidence ?? null,
      created_by: access.userId,
    })
    .select("id, version_number, source, language, content, config, change_summary, ai_confidence, created_at, created_by")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
