import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { recordQuoteEvent } from "@/lib/quote-recognition/audit";

const writeRoles = new Set(["admin", "manager", "editor"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有报价文件维护权限" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as null | { action?: "upload_failed"; error?: string };
  if (body?.action !== "upload_failed") return NextResponse.json({ error: "不支持的报价文件操作" }, { status: 400 });
  const message = body.error?.trim().slice(0, 1000) || "文件上传失败";
  const result = await access.supabase.from("wpi_quote_documents").update({
    status: "failed",
    error_message: message,
    updated_by: access.userId,
  }).eq("organization_id", access.organizationId).eq("id", id).eq("status", "uploaded").select("*").maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  await recordQuoteEvent(access.supabase, {
    documentId: id,
    action: "quote.upload_failed",
    note: "报价源文件上传失败",
    metadata: { error: message },
  });
  return NextResponse.json({ data: result.data, source: "supabase" });
}
