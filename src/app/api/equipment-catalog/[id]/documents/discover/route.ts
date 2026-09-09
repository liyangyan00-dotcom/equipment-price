import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import {
  discoverOfficialPdfs,
  fetchOfficialPageForDocuments,
  isAllowedOfficialUrl,
  matchOfficialPdfsToCatalog,
  verifyOfficialPdf,
} from "@/lib/equipmentCatalog/pdfDiscovery";

const writeRoles = new Set(["admin", "manager", "editor", "reviewer"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有文档发现权限" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { forceRefresh?: boolean };
  const forceRefresh = Boolean(body.forceRefresh);

  const [catalog, sources] = await Promise.all([
    access.supabase
      .from("wpi_equipment_catalog")
      .select("id,brand,manufacturer,equipment_name,model,product_series,language,datasheet_url,catalog_url,source_url")
      .eq("organization_id", access.organizationId)
      .eq("id", id)
      .maybeSingle(),
    access.supabase
      .from("wpi_equipment_catalog_sources")
      .select("id,source_type,source_title,source_url")
      .eq("organization_id", access.organizationId)
      .eq("equipment_catalog_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (catalog.error || sources.error) return NextResponse.json({ error: catalog.error?.message || sources.error?.message }, { status: 500 });
  if (!catalog.data) return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });
  const catalogData = catalog.data;

  const existingPdf = (sources.data ?? []).find((source) =>
    source.source_type === "pdf" || /\.pdf(?:$|[?#])/i.test(source.source_url || ""),
  );
  if (existingPdf?.source_url && !forceRefresh) {
    return NextResponse.json({
      data: { source: { id: existingPdf.id, url: existingPdf.source_url, title: existingPdf.source_title }, discovered: 0, reused: true },
      source: "supabase",
    });
  }

  const pageCandidates = Array.from(new Set([
    catalogData.source_url,
    catalogData.catalog_url,
    ...(sources.data ?? []).filter((source) => source.source_type !== "pdf").map((source) => source.source_url),
  ].filter((value): value is string => typeof value === "string" && /^https:\/\//i.test(value))));
  if (!pageCandidates.length) return NextResponse.json({ error: "当前设备没有已核验的官网产品页，无法自动追踪 PDF" }, { status: 422 });

  const discovered = new Map<string, { item: ReturnType<typeof discoverOfficialPdfs>[number]; pageUrl: URL }>();
  const errors: string[] = [];
  for (const candidate of pageCandidates.slice(0, 5)) {
    try {
      const page = await fetchOfficialPageForDocuments(candidate);
      discoverOfficialPdfs(page.body, page.url, catalogData.brand || "")
        .filter((item) => isAllowedOfficialUrl(item.url, page.url))
        .forEach((item) => discovered.set(item.url, { item, pageUrl: page.url }));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "官网文档发现失败");
    }
  }
  const matchedUrls = new Set(matchOfficialPdfsToCatalog(
    Array.from(discovered.values()).map(({ item }) => item),
    {
      brand: catalogData.brand,
      equipmentName: catalogData.equipment_name,
      model: catalogData.model,
      productSeries: catalogData.product_series,
    },
  ).map((item) => item.url));
  const candidates = Array.from(discovered.values()).filter(({ item }) => matchedUrls.has(item.url)).slice(0, 30);
  const verified: ReturnType<typeof discoverOfficialPdfs> = [];
  for (let index = 0; index < candidates.length; index += 3) {
    const batch = candidates.slice(index, index + 3);
    const results = await Promise.all(batch.map(async ({ item, pageUrl }) => ({
      item,
      valid: await verifyOfficialPdf(item.url, pageUrl),
    })));
    results.filter((result) => result.valid).forEach((result) => verified.push(result.item));
  }
  const pdfs = verified;
  if (!pdfs.length) {
    return NextResponse.json({
      error: discovered.size
        ? "已发现官网 PDF，但尚未匹配到当前型号；已保留为页面级证据，需人工确认型号关系"
        : "官网产品页暂未发现可验证的 PDF，可使用人工补录作为兜底",
      details: errors,
    }, { status: 404 });
  }

  const existingByUrl = new Map(
    (sources.data ?? [])
      .filter((source) => source.source_url)
      .map((source) => [source.source_url, source]),
  );
  const missingPdfs = pdfs.filter((pdf) => !existingByUrl.has(pdf.url));
  const rows = missingPdfs.map((pdf) => ({
    organization_id: access.organizationId,
    equipment_catalog_id: id,
    source_type: "pdf",
    source_title: pdf.title.slice(0, 300),
    source_url: pdf.url,
    language: pdf.language || catalogData.language || "zh-CN",
    checked_at: new Date().toISOString(),
    confidence: 92,
    review_status: "pending_review",
    metadata: {
      ...pdf.metadata,
      autoDiscovered: true,
      contentVerified: true,
      requiresHumanReview: true,
      equipmentName: catalogData.equipment_name,
      model: catalogData.model,
    },
    created_by: access.userId,
    updated_by: access.userId,
  }));
  let insertedRows: Array<{ id: string; source_type: string; source_title: string; source_url: string }> = [];
  if (rows.length) {
    const inserted = await access.supabase
      .from("wpi_equipment_catalog_sources")
      .insert(rows)
      .select("id,source_type,source_title,source_url");
    if (inserted.error || !inserted.data?.length) {
      return NextResponse.json({ error: inserted.error?.message || "PDF 来源登记失败" }, { status: 500 });
    }
    insertedRows = inserted.data;
    insertedRows.forEach((source) => existingByUrl.set(source.source_url, source));
  }
  const primaryPdf = pdfs[0];
  const primary = existingByUrl.get(primaryPdf.url);
  if (!primary) return NextResponse.json({ error: "PDF 来源归档结果无法定位" }, { status: 500 });
  const updated = await access.supabase
    .from("wpi_equipment_catalog")
    .update({
      datasheet_url: primary.source_url,
      review_status: "pending_review",
      updated_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", access.organizationId)
    .eq("id", id);
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });

  const existingJob = await access.supabase.from("wpi_equipment_catalog_document_jobs")
    .select("id,status")
    .eq("organization_id", access.organizationId)
    .eq("equipment_catalog_id", id)
    .eq("document_url", primary.source_url)
    .limit(1).maybeSingle();
  if (existingJob.error) return NextResponse.json({ error: existingJob.error.message }, { status: 500 });
  let jobId = existingJob.data?.id ?? null;
  if (jobId && existingJob.data?.status === "failed") {
    const reset = await access.supabase.from("wpi_equipment_catalog_document_jobs").update({
      status: "queued",
      progress: 0,
      error_code: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      requested_by: access.userId,
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);
    if (reset.error) return NextResponse.json({ error: reset.error.message }, { status: 500 });
  } else if (!jobId) {
    const fileName = decodeURIComponent(new URL(primary.source_url).pathname.split("/").pop() || `${catalogData.model || catalogData.equipment_name}.pdf`).slice(0, 300);
    const queued = await access.supabase.from("wpi_equipment_catalog_document_jobs").insert({
      organization_id: access.organizationId,
      equipment_catalog_id: id,
      source_id: primary.id,
      document_url: primary.source_url,
      file_name: fileName,
      mime_type: "application/pdf",
      status: "queued",
      progress: 0,
      requested_by: access.userId,
      metadata: { autoQueued: true, autoDiscovered: true, requiresHumanReview: true },
    }).select("id").single();
    if (queued.error || !queued.data) return NextResponse.json({ error: queued.error?.message || "文档解析任务创建失败" }, { status: 500 });
    jobId = queued.data.id;
  }

  return NextResponse.json({
    data: {
      source: { id: primary.id, url: primary.source_url, title: primary.source_title },
      discovered: insertedRows.length,
      matched: pdfs.length,
      reused: insertedRows.length === 0,
      incremental: forceRefresh,
      jobId,
    },
    source: "supabase",
  });
}
