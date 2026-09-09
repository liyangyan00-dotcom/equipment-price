import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; jobId: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id, jobId } = await context.params;
  const job = await access.supabase.from("wpi_equipment_catalog_document_jobs")
    .select("document_url,file_name")
    .eq("organization_id", access.organizationId)
    .eq("equipment_catalog_id", id)
    .eq("id", jobId)
    .maybeSingle();
  if (job.error) return NextResponse.json({ error: job.error.message }, { status: 500 });
  if (!job.data) return NextResponse.json({ error: "PDF 文档不存在" }, { status: 404 });
  if (!job.data.document_url.startsWith("storage://")) {
    return NextResponse.redirect(job.data.document_url);
  }
  const location = job.data.document_url.slice("storage://".length);
  const separator = location.indexOf("/");
  if (separator <= 0) return NextResponse.json({ error: "PDF 存储位置无效" }, { status: 500 });
  const signed = await access.supabase.storage
    .from(location.slice(0, separator))
    .createSignedUrl(location.slice(separator + 1), 300, { download: false });
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: signed.error?.message || "无法读取 PDF" }, { status: 500 });
  }
  return NextResponse.redirect(signed.data.signedUrl);
}
