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

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有批量补抓权限" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { cursor?: string; batchSize?: number };
  const batchSize = Math.max(1, Math.min(10, Math.round(Number(body.batchSize) || 6)));

  let query = access.supabase.from("wpi_equipment_catalog")
    .select("id,equipment_name,brand,model,product_series,language,source_url,catalog_url,collection_task_id,collection_run_id")
    .eq("organization_id", access.organizationId)
    .is("datasheet_url", null)
    .order("id", { ascending: true })
    .limit(batchSize);
  if (body.cursor) query = query.gt("id", body.cursor);
  const catalogs = await query;
  if (catalogs.error) return NextResponse.json({ error: catalogs.error.message }, { status: 500 });

  let discoveredCatalogs = 0;
  let queuedJobs = 0;
  let skippedCatalogs = 0;
  const errors: Array<{ id: string; name: string; reason: string }> = [];
  for (const catalog of catalogs.data ?? []) {
    const pageCandidates = Array.from(new Set([catalog.source_url, catalog.catalog_url]
      .filter((value): value is string => typeof value === "string" && /^https:\/\//i.test(value))));
    if (!pageCandidates.length) {
      skippedCatalogs += 1;
      errors.push({ id: catalog.id, name: catalog.equipment_name, reason: "未登记官网产品页" });
      continue;
    }
    try {
      const discovered = new Map<string, ReturnType<typeof discoverOfficialPdfs>[number]>();
      const pageUrls = new Map<string, URL>();
      for (const pageCandidate of pageCandidates.slice(0, 2)) {
        const page = await fetchOfficialPageForDocuments(pageCandidate);
        discoverOfficialPdfs(page.body, page.url, catalog.brand || "")
          .filter((item) => isAllowedOfficialUrl(item.url, page.url))
          .forEach((item) => {
            discovered.set(item.url, item);
            pageUrls.set(item.url, page.url);
          });
      }
      const verified: ReturnType<typeof discoverOfficialPdfs> = [];
      const candidates = matchOfficialPdfsToCatalog(Array.from(discovered.values()), {
        brand: catalog.brand,
        equipmentName: catalog.equipment_name,
        model: catalog.model,
        productSeries: catalog.product_series,
      }).slice(0, 20);
      for (let index = 0; index < candidates.length; index += 3) {
        const batch = candidates.slice(index, index + 3);
        const results = await Promise.all(batch.map(async (item) => ({
          item,
          valid: await verifyOfficialPdf(item.url, pageUrls.get(item.url)!),
        })));
        results.filter((result) => result.valid).forEach((result) => verified.push(result.item));
      }
      if (!verified.length) {
        skippedCatalogs += 1;
        errors.push({
          id: catalog.id,
          name: catalog.equipment_name,
          reason: discovered.size ? "官网PDF尚未匹配当前型号" : "官网未发现可验证PDF",
        });
        continue;
      }

      const existingSources = await access.supabase.from("wpi_equipment_catalog_sources")
        .select("id,source_url")
        .eq("organization_id", access.organizationId)
        .eq("equipment_catalog_id", catalog.id)
        .in("source_url", verified.map((item) => item.url));
      if (existingSources.error) throw existingSources.error;
      const existingByUrl = new Map((existingSources.data ?? []).map((item) => [item.source_url, item.id]));
      const missingRows = verified.filter((item) => !existingByUrl.has(item.url)).slice(0, 10).map((pdf) => ({
        organization_id: access.organizationId,
        equipment_catalog_id: catalog.id,
        source_type: "pdf",
        source_title: pdf.title.slice(0, 300),
        source_url: pdf.url,
        language: pdf.language || catalog.language || "zh-CN",
        checked_at: new Date().toISOString(),
        confidence: 92,
        review_status: "pending_review",
        collection_task_id: catalog.collection_task_id,
        collection_run_id: catalog.collection_run_id,
        metadata: {
          ...pdf.metadata,
          autoDiscovered: true,
          backfilled: true,
          contentVerified: true,
          requiresHumanReview: true,
        },
        created_by: access.userId,
        updated_by: access.userId,
      }));
      if (missingRows.length) {
        const inserted = await access.supabase.from("wpi_equipment_catalog_sources")
          .insert(missingRows).select("id,source_url");
        if (inserted.error) throw inserted.error;
        (inserted.data ?? []).forEach((item) => existingByUrl.set(item.source_url, item.id));
      }
      const primary = verified[0];
      const sourceId = existingByUrl.get(primary.url) ?? null;
      const catalogUpdate = await access.supabase.from("wpi_equipment_catalog").update({
        datasheet_url: primary.url,
        review_status: "pending_review",
        updated_by: access.userId,
        updated_at: new Date().toISOString(),
      }).eq("organization_id", access.organizationId).eq("id", catalog.id);
      if (catalogUpdate.error) throw catalogUpdate.error;
      discoveredCatalogs += 1;

      const existingJob = await access.supabase.from("wpi_equipment_catalog_document_jobs")
        .select("id")
        .eq("organization_id", access.organizationId)
        .eq("equipment_catalog_id", catalog.id)
        .eq("document_url", primary.url)
        .in("status", ["queued", "running", "needs_review", "completed"])
        .limit(1).maybeSingle();
      if (existingJob.error) throw existingJob.error;
      if (!existingJob.data) {
        const fileName = decodeURIComponent(new URL(primary.url).pathname.split("/").pop() || `${catalog.model || catalog.equipment_name}.pdf`).slice(0, 300);
        const job = await access.supabase.from("wpi_equipment_catalog_document_jobs").insert({
          organization_id: access.organizationId,
          equipment_catalog_id: catalog.id,
          source_id: sourceId,
          document_url: primary.url,
          file_name: fileName,
          mime_type: "application/pdf",
          status: "queued",
          progress: 0,
          requested_by: access.userId,
          metadata: {
            autoQueued: true,
            backfilled: true,
            collectionTaskId: catalog.collection_task_id,
            collectionRunId: catalog.collection_run_id,
            requiresHumanReview: true,
          },
        });
        if (job.error) throw job.error;
        queuedJobs += 1;
      }
    } catch (error) {
      skippedCatalogs += 1;
      errors.push({
        id: catalog.id,
        name: catalog.equipment_name,
        reason: error instanceof Error ? error.message : "补抓失败",
      });
    }
  }

  let worker: unknown = null;
  if (queuedJobs > 0) {
    const invoked = await access.supabase.functions.invoke("wpi-equipment-document-worker", {
      body: { organizationId: access.organizationId, limit: 2 },
    });
    worker = invoked.error ? { error: invoked.error.message } : invoked.data?.data ?? invoked.data;
  }
  const rows = catalogs.data ?? [];
  const nextCursor = rows.at(-1)?.id ?? null;
  const remaining = await access.supabase.from("wpi_equipment_catalog")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organizationId)
    .is("datasheet_url", null);
  return NextResponse.json({
    data: {
      scanned: rows.length,
      discoveredCatalogs,
      queuedJobs,
      skippedCatalogs,
      nextCursor,
      remaining: remaining.count ?? 0,
      hasMore: rows.length === batchSize,
      errors,
      worker,
    },
    source: "supabase",
  });
}
