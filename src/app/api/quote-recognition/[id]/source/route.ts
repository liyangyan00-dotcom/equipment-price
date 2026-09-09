import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { recordQuoteEvent } from "@/lib/quote-recognition/audit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await context.params;
  const mode = request.nextUrl.searchParams.get("mode") === "download" ? "download" : "preview";
  const documentResult = await access.supabase
    .from("wpi_quote_documents")
    .select("id,document_code,file_name,storage_bucket,storage_path")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();

  if (documentResult.error) {
    return NextResponse.json({ error: documentResult.error.message }, { status: 500 });
  }
  if (!documentResult.data) {
    return NextResponse.json({ error: "报价源文件不存在" }, { status: 404 });
  }

  const signed = await access.supabase.storage
    .from(documentResult.data.storage_bucket)
    .createSignedUrl(
      documentResult.data.storage_path,
      120,
      mode === "download" ? { download: documentResult.data.file_name } : undefined,
    );
  if (signed.error) {
    return NextResponse.json({ error: signed.error.message }, { status: 400 });
  }

  const audit = await recordQuoteEvent(access.supabase, {
    documentId: id,
    action: mode === "download" ? "quote.source_downloaded" : "quote.source_previewed",
    note: mode === "download" ? "下载报价源文件" : "查看报价源文件",
    metadata: {
      fileName: documentResult.data.file_name,
      documentCode: documentResult.data.document_code,
      expiresInSeconds: 120,
    },
  });
  if (audit.error) {
    return NextResponse.json({ error: audit.error.message }, { status: 403 });
  }

  return NextResponse.json({
    data: {
      url: signed.data.signedUrl,
      fileName: documentResult.data.file_name,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      mode,
    },
    source: "supabase",
  });
}
