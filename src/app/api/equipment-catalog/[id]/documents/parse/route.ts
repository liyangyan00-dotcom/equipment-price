import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const writeRoles = new Set(["admin", "manager", "editor", "reviewer"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有设备文档解析权限" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { sourceId?: string; sourceUrl?: string };

  const catalog = await access.supabase.from("wpi_equipment_catalog")
    .select("id,equipment_name,brand,model,datasheet_url")
    .eq("organization_id", access.organizationId).eq("id", id).maybeSingle();
  if (catalog.error) return NextResponse.json({ error: catalog.error.message }, { status: 500 });
  if (!catalog.data) return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });

  const sourceId = String(body.sourceId ?? "").trim() || null;
  let sourceUrl = String(body.sourceUrl ?? "").trim();
  let sourceType = "";
  if (sourceId) {
    const source = await access.supabase.from("wpi_equipment_catalog_sources")
      .select("id,source_url,source_type")
      .eq("organization_id", access.organizationId).eq("equipment_catalog_id", id).eq("id", sourceId).maybeSingle();
    if (source.error) return NextResponse.json({ error: source.error.message }, { status: 500 });
    if (!source.data) return NextResponse.json({ error: "文档来源不存在" }, { status: 404 });
    sourceUrl = source.data.source_url || sourceUrl;
    sourceType = String(source.data.source_type ?? "").toLowerCase();
  }
  sourceUrl ||= catalog.data.datasheet_url || "";
  if (!/^https:\/\//i.test(sourceUrl) || (sourceType !== "pdf" && !/\.pdf(?:$|[?#])/i.test(sourceUrl))) {
    return NextResponse.json({ error: "请选择可公开访问的 HTTPS PDF 技术文档" }, { status: 400 });
  }
  const fileName = decodeURIComponent(new URL(sourceUrl).pathname.split("/").pop() || `${catalog.data.model || catalog.data.equipment_name}.pdf`).slice(0, 300);
  const existingJob = await access.supabase.from("wpi_equipment_catalog_document_jobs")
    .select("id,status,parameter_count")
    .eq("organization_id", access.organizationId)
    .eq("equipment_catalog_id", id)
    .eq("document_url", sourceUrl)
    .in("status", ["queued", "running", "needs_review", "completed", "failed"])
    .order("created_at", { ascending: false })
    .limit(1).maybeSingle();
  if (existingJob.error) return NextResponse.json({ error: existingJob.error.message }, { status: 500 });
  let jobId = existingJob.data?.id ?? "";
  if (existingJob.data?.status === "failed") {
    const reset = await access.supabase.from("wpi_equipment_catalog_document_jobs").update({
      status: "queued", progress: 0, error_message: null, started_at: null, completed_at: null,
    }).eq("id", jobId);
    if (reset.error) return NextResponse.json({ error: reset.error.message }, { status: 500 });
  } else if (!jobId) {
    const inserted = await access.supabase.from("wpi_equipment_catalog_document_jobs").insert({
      organization_id: access.organizationId,
      equipment_catalog_id: id,
      source_id: sourceId,
      document_url: sourceUrl,
      file_name: fileName,
      mime_type: "application/pdf",
      status: "queued",
      progress: 0,
      requested_by: access.userId,
      metadata: { autoQueued: true, requiresHumanReview: true, equipmentName: catalog.data.equipment_name, brand: catalog.data.brand, model: catalog.data.model },
    }).select("id").single();
    if (inserted.error || !inserted.data) return NextResponse.json({ error: inserted.error?.message || "无法创建解析任务" }, { status: 500 });
    jobId = inserted.data.id;
  }

  if (existingJob.data?.status === "needs_review" || existingJob.data?.status === "completed") {
    const candidates = await access.supabase.from("wpi_equipment_catalog_parameter_candidates")
      .select("id,review_decision").eq("job_id", jobId);
    if (candidates.error) return NextResponse.json({ error: candidates.error.message }, { status: 500 });
    const pendingCount = (candidates.data ?? []).filter((item) => item.review_decision === "pending").length;
    return NextResponse.json({ data: { jobId, status: existingJob.data.status, parameterCount: candidates.data?.length ?? existingJob.data.parameter_count ?? 0, pendingCount }, source: "supabase", reused: true });
  }

  const invoked = await access.supabase.functions.invoke("wpi-equipment-document-worker", {
    body: { organizationId: access.organizationId, jobId, limit: 1 },
  });
  if (invoked.error) return NextResponse.json({ error: invoked.error.message }, { status: 400 });
  if (invoked.data?.error) return NextResponse.json({ error: String(invoked.data.error) }, { status: 400 });
  const result = invoked.data?.data?.results?.[0];
  if (!result) return NextResponse.json({ data: { jobId, status: "running", parameterCount: 0, pendingCount: 0 }, source: "supabase" });
  if (result.status === "failed") return NextResponse.json({ error: result.error || "PDF设备资料解析失败" }, { status: 400 });
  return NextResponse.json({ data: { jobId, status: result.status, parameterCount: result.parameterCount ?? 0, pendingCount: result.pendingCount ?? 0 }, source: "supabase" });
}
