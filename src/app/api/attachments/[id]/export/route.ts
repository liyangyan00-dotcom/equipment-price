import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { findAttachment, readAttachmentDetail } from "@/lib/data/attachmentEvidenceRepository";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const found = await findAttachment(access, decodeURIComponent(id));
  if (!found.data) return NextResponse.json({ error: found.error?.message ?? "附件证据不存在" }, { status: found.error ? 500 : 404 });
  const detail = await readAttachmentDetail(access, found.data);
  const audit = await access.supabase.rpc("wpi_record_attachment_access_event", {
    target_attachment_id: found.data.id,
    event_action: "evidence.export",
    event_data: { attachmentCode: detail.id, format: "json-manifest" },
  });
  if (audit.error) return NextResponse.json({ error: `导出审计失败：${audit.error.message}` }, { status: 500 });
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), attachment: detail }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${detail.id}-evidence-manifest.json"`,
    },
  });
}
