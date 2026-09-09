import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const writableRoles = new Set(["admin", "manager", "editor"]);

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error } = await access.supabase
    .from("wpi_inquiry_letter_templates")
    .select("id,template_code,name,language,config,content,is_active,created_at,updated_at")
    .eq("organization_id", access.organizationId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], source: "supabase" });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有模板维护权限" }, { status: 403 });
  }

  const body = (await request.json()) as {
    name?: string;
    language?: string;
    config?: Record<string, unknown>;
    content?: string;
  };
  const name = body.name?.trim().slice(0, 120) ?? "";
  const content = body.content?.trim() ?? "";
  if (!name || !content) {
    return NextResponse.json({ error: "模板名称和正文不能为空" }, { status: 400 });
  }
  if (content.length > 200_000) {
    return NextResponse.json({ error: "模板正文不能超过 200,000 个字符" }, { status: 400 });
  }

  const templateCode = `ITPL-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await access.supabase
    .from("wpi_inquiry_letter_templates")
    .insert({
      organization_id: access.organizationId,
      template_code: templateCode,
      name,
      language: body.language?.trim() || "zh-CN",
      config: body.config ?? {},
      content,
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select("id,template_code,name,language,config,content,is_active,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, source: "supabase" }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有模板维护权限" }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少模板 ID" }, { status: 400 });

  const { error } = await access.supabase
    .from("wpi_inquiry_letter_templates")
    .update({ is_active: false, updated_by: access.userId })
    .eq("organization_id", access.organizationId)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
