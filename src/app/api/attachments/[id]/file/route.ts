import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment } from "@/lib/data/attachmentEvidenceRepository";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (found.error) return NextResponse.json({ error: found.error.message }, { status: 500 });
  if (!found.data) return NextResponse.json({ error: "附件证据不存在" }, { status: 404 });

  const mode = new URL(request.url).searchParams.get("mode") === "download" ? "download" : "preview";
  const signed = await access.supabase.storage.from(found.data.bucket_id).createSignedUrl(
    found.data.object_path,
    300,
    mode === "download" ? { download: found.data.original_name } : undefined,
  );
  if (signed.error || !signed.data?.signedUrl) return NextResponse.json({ error: signed.error?.message ?? "无法生成文件访问地址" }, { status: 404 });

  const audit = await access.supabase.rpc("wpi_record_attachment_access_event", {
    target_attachment_id: found.data.id,
    event_action: `evidence.${mode}`,
    event_data: { attachmentCode: found.data.attachment_code, fileName: found.data.original_name, objectPath: found.data.object_path },
  });
  if (audit.error) return NextResponse.json({ error: `文件访问审计失败：${audit.error.message}` }, { status: 500 });
  return NextResponse.json({ url: signed.data.signedUrl, mode, expiresIn: 300 });
}
