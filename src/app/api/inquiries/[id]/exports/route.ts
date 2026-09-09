import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor"]);

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function resolveInquiry(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, id: string) {
  const query = () => access.supabase.from("wpi_inquiries").select("id,inquiry_code,subject").eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await query().eq("id", id).maybeSingle();
  return result;
}

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writableRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有询价函导出权限" }, { status: 403 });
  const { id } = await context.params;
  const inquiry = await resolveInquiry(access, id);
  if (inquiry.error) return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data) return NextResponse.json({ error: "请先保存询价函草稿" }, { status: 404 });

  const body = (await request.json()) as { format?: "word" | "pdf"; content?: string; title?: string };
  const format = body.format;
  const content = body.content?.trim() ?? "";
  if (!format || !["word", "pdf"].includes(format) || !content) {
    return NextResponse.json({ error: "导出格式或正文不完整" }, { status: 400 });
  }
  if (content.length > 200_000) return NextResponse.json({ error: "正文过长，无法导出" }, { status: 400 });

  const safeTitle = (body.title?.trim() || inquiry.data.subject || inquiry.data.inquiry_code).slice(0, 100);
  const extension = format === "word" ? "doc" : "html";
  const fileName = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  const path = buildBusinessObjectPath(access.organizationId, `inquiry-exports/${inquiry.data.id}`, fileName);
  const { data: job, error: jobError } = await access.supabase.from("wpi_inquiry_export_jobs").insert({
    organization_id: access.organizationId,
    inquiry_id: inquiry.data.id,
    export_format: format,
    status: "requested",
    file_name: fileName,
    requested_by: access.userId,
  }).select("id").single();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 400 });

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(safeTitle)}</title><style>body{font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.8;padding:36px;color:#172033;white-space:pre-wrap}@media print{body{padding:0}}</style></head><body>${escapeHtml(content)}</body></html>`;
  const upload = await access.supabase.storage.from("report-exports").upload(path, new TextEncoder().encode(html), {
    contentType: format === "word" ? "application/msword;charset=utf-8" : "text/html;charset=utf-8",
    upsert: false,
  });
  if (upload.error) {
    await access.supabase.from("wpi_inquiry_export_jobs").update({ status: "failed", error_message: upload.error.message }).eq("id", job.id);
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const signed = await access.supabase.storage.from("report-exports").createSignedUrl(path, 300, { download: format === "word" ? fileName : false });
  if (signed.error) {
    await access.supabase.from("wpi_inquiry_export_jobs").update({ status: "failed", error_message: signed.error.message }).eq("id", job.id);
    return NextResponse.json({ error: signed.error.message }, { status: 500 });
  }
  await access.supabase.from("wpi_inquiry_export_jobs").update({ status: "completed", bucket_id: "report-exports", object_path: path, completed_at: new Date().toISOString() }).eq("id", job.id);

  return NextResponse.json({ data: { jobId: job.id, format, fileName, url: signed.data.signedUrl, printRequired: format === "pdf" }, source: "supabase" });
}
