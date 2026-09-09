import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",")
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500);
  let query = access.supabase.from("wpi_attachments")
    .select("id,attachment_code,original_name,evidence_type,related_type,related_id,status,review_state,ai_status,ai_confidence,ai_risk_level,assigned_reviewer_id,review_due_at,governance_flags,document_date,created_at")
    .eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(5000);
  if (ids.length) query = query.in("id", ids);
  const result = await query;
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  const header = ["证据编号", "文件名称", "证据类型", "关联类型", "关联对象ID", "审核状态", "AI状态", "AI置信度", "AI风险", "负责人ID", "审核截止", "治理标记", "文件日期", "上传时间"];
  const rows = (result.data ?? []).map((row) => [row.attachment_code, row.original_name, row.evidence_type, row.related_type, row.related_id, row.review_state, row.ai_status, row.ai_confidence, row.ai_risk_level, row.assigned_reviewer_id, row.review_due_at, row.governance_flags?.join("|"), row.document_date, row.created_at]);
  const body = `\uFEFF${[header, ...rows].map((row) => row.map(csv).join(",")).join("\r\n")}`;
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="attachments-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
