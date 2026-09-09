import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { evaluateEquipmentCatalogQuality } from "@/lib/equipmentCatalog/quality";
import type {
  EquipmentCatalogParameter,
  EquipmentCatalogRecord,
} from "@/types/equipmentCatalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  const { id } = await context.params;

  const catalogResult = await access.supabase
    .from("wpi_equipment_catalog")
    .select(
      "*, source_supplier:wpi_suppliers!wpi_equipment_catalog_source_supplier_id_fkey(id,name)",
    )
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (catalogResult.error)
    return NextResponse.json(
      { error: catalogResult.error.message },
      { status: 500 },
    );
  if (!catalogResult.data)
    return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });

  let duplicateQuery = access.supabase
    .from("wpi_equipment_catalog")
    .select("id,catalog_code,equipment_name,brand,model,review_status")
    .eq("organization_id", access.organizationId)
    .neq("id", id)
    .limit(8);
  if (catalogResult.data.model)
    duplicateQuery = duplicateQuery.ilike("model", catalogResult.data.model);
  else if (catalogResult.data.normalized_name)
    duplicateQuery = duplicateQuery.ilike(
      "normalized_name",
      catalogResult.data.normalized_name,
    );
  else duplicateQuery = duplicateQuery.eq("catalog_code", "__no_duplicate_key__");

  const [parameters, suppliers, sources, prices, reviews, images, duplicates, documentJobs, parameterCandidates, unmatchedPdfDiscoveries] =
    await Promise.all([
      access.supabase
        .from("wpi_equipment_catalog_parameters")
        .select("*")
        .eq("equipment_catalog_id", id)
        .order("is_key", { ascending: false })
        .order("parameter_name"),
      access.supabase
        .from("wpi_supplier_equipment_catalog")
        .select("*, supplier:wpi_suppliers(id,supplier_code,name)")
        .eq("equipment_catalog_id", id)
        .order("confidence", { ascending: false }),
      access.supabase
        .from("wpi_equipment_catalog_sources")
        .select("*")
        .eq("equipment_catalog_id", id)
        .order("created_at", { ascending: false }),
      access.supabase
        .from("wpi_equipment_prices")
        .select(
          "id,price_code,original_price,original_currency,usd_price,price_term,confidence,risk_level,review_status,updated_at,supplier:wpi_suppliers(id,name)",
        )
        .eq("organization_id", access.organizationId)
        .eq("equipment_catalog_id", id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(20),
      access.supabase
        .from("wpi_equipment_catalog_reviews")
        .select("*")
        .eq("equipment_catalog_id", id)
        .order("reviewed_at", { ascending: false })
        .limit(20),
      access.supabase
        .from("wpi_attachments")
        .select(
          "id,bucket_id,object_path,original_name,content_type,size_bytes,verification_status,metadata,created_at",
        )
        .eq("organization_id", access.organizationId)
        .eq("related_type", "equipment_catalog")
        .eq("related_id", id)
        .eq("status", "active")
        .like("content_type", "image/%")
        .order("created_at", { ascending: false }),
      duplicateQuery,
      access.supabase
        .from("wpi_equipment_catalog_document_jobs")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("equipment_catalog_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      access.supabase
        .from("wpi_equipment_catalog_parameter_candidates")
        .select("*")
        .eq("organization_id", access.organizationId)
        .eq("equipment_catalog_id", id)
        .order("created_at", { ascending: false })
        .limit(300),
      access.supabase
        .from("wpi_equipment_collection_discoveries")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", access.organizationId)
        .eq("task_id", catalogResult.data.collection_task_id || "00000000-0000-0000-0000-000000000000")
        .eq("resource_type", "pdf"),
    ]);
  const error =
    parameters.error ||
    suppliers.error ||
    sources.error ||
    prices.error ||
    reviews.error ||
    images.error ||
    duplicates.error ||
    documentJobs.error ||
    parameterCandidates.error ||
    unmatchedPdfDiscoveries.error;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const serializedImages = await Promise.all(
    (images.data ?? []).map(async (image) => {
      const signed = await access.supabase.storage
        .from(image.bucket_id)
        .createSignedUrl(image.object_path, 600);
      return {
        id: image.id,
        name: image.original_name,
        contentType: image.content_type ?? "",
        size: Number(image.size_bytes ?? 0),
        verificationStatus: image.verification_status ?? "pending",
        sourceUrl:
          image.metadata && typeof image.metadata === "object"
            ? String(
                (image.metadata as Record<string, unknown>).sourceUrl ?? "",
              )
            : "",
        createdAt: image.created_at,
        url: signed.data?.signedUrl ?? "",
      };
    }),
  );

  const qualityEvaluation = evaluateEquipmentCatalogQuality(
    catalogResult.data as EquipmentCatalogRecord,
    (parameters.data ?? []) as EquipmentCatalogParameter[],
    sources.data ?? [],
  );
  if (Math.round(Number(catalogResult.data.parameter_completeness ?? 0)) !== qualityEvaluation.score) {
    const synchronized = await access.supabase.from("wpi_equipment_catalog").update({
      parameter_completeness: qualityEvaluation.score,
      updated_at: new Date().toISOString(),
    }).eq("organization_id", access.organizationId).eq("id", id);
    if (synchronized.error) return NextResponse.json({ error: synchronized.error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      ...catalogResult.data,
      parameter_completeness: qualityEvaluation.score,
      quality_evaluation: qualityEvaluation,
      images: serializedImages,
      parameters: parameters.data ?? [],
      document_jobs: documentJobs.data ?? [],
      parameter_candidates: parameterCandidates.data ?? [],
      unmatched_pdf_discoveries: unmatchedPdfDiscoveries.count ?? 0,
      suppliers: suppliers.data ?? [],
      sources: sources.data ?? [],
      prices: prices.data ?? [],
      reviews: reviews.data ?? [],
      duplicate_candidates: duplicates.data ?? [],
    },
    source: "supabase",
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status });
  if (!["admin", "manager", "reviewer", "editor"].includes(access.role))
    return NextResponse.json({ error: "当前角色没有设备资料修正权限" }, { status: 403 });

  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: "catalog_field" | "parameter";
    field?: string;
    label?: string;
    value?: string;
    unit?: string;
    sourceUrl?: string;
    parameterGroup?: string;
  };
  const value = String(body.value ?? "").trim().slice(0, 2000);
  if (!value) return NextResponse.json({ error: "请填写修正值" }, { status: 400 });

  const existing = await access.supabase
    .from("wpi_equipment_catalog")
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });

  const catalogFields = new Set([
    "equipment_name",
    "equipment_category",
    "equipment_type",
    "brand",
    "manufacturer",
    "product_series",
    "model",
    "specification",
    "application",
    "technical_standard",
    "country_code",
    "language",
    "source_url",
    "catalog_url",
    "datasheet_url",
  ]);

  if (body.action === "catalog_field") {
    if (!catalogFields.has(String(body.field ?? "")))
      return NextResponse.json({ error: "不支持修正该主数据字段" }, { status: 400 });
    if (
      ["source_url", "catalog_url", "datasheet_url"].includes(String(body.field)) &&
      !/^https?:\/\//i.test(value)
    )
      return NextResponse.json({ error: "来源地址必须是完整的 http 或 https 链接" }, { status: 400 });
    const update = await access.supabase
      .from("wpi_equipment_catalog")
      .update({
        [String(body.field)]: value,
        review_status: "pending_review",
        updated_by: access.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", access.organizationId)
      .eq("id", id);
    if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
  } else if (body.action === "parameter") {
    const parameterCode = String(body.field ?? "manual_parameter")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .slice(0, 80);
    const upsert = await access.supabase
      .from("wpi_equipment_catalog_parameters")
      .upsert(
        {
          organization_id: access.organizationId,
          equipment_catalog_id: id,
          parameter_code: parameterCode || "manual_parameter",
          parameter_name: String(body.label ?? body.field ?? "人工补充参数").slice(0, 180),
          raw_value: value,
          normalized_value: value,
          data_type: "text",
          unit: String(body.unit ?? "").trim().slice(0, 40),
          is_key: true,
          source_evidence: {
            sourceUrl: String(body.sourceUrl ?? "").trim(),
            manualCorrection: true,
            parameterGroup: body.parameterGroup ?? "other",
          },
          confidence: 100,
          review_status: "pending_review",
          created_by: access.userId,
          updated_by: access.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "equipment_catalog_id,parameter_code" },
      );
    if (upsert.error) return NextResponse.json({ error: upsert.error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "不支持的修正动作" }, { status: 400 });
  }

  const [catalog, parameters, sources] = await Promise.all([
    access.supabase.from("wpi_equipment_catalog").select("*").eq("id", id).single(),
    access.supabase.from("wpi_equipment_catalog_parameters").select("*").eq("equipment_catalog_id", id),
    access.supabase.from("wpi_equipment_catalog_sources").select("source_url,review_status").eq("equipment_catalog_id", id),
  ]);
  const followupError = catalog.error || parameters.error || sources.error;
  if (followupError) return NextResponse.json({ error: followupError.message }, { status: 500 });
  const evaluation = evaluateEquipmentCatalogQuality(
    catalog.data as EquipmentCatalogRecord,
    (parameters.data ?? []) as EquipmentCatalogParameter[],
    sources.data ?? [],
  );
  await access.supabase
    .from("wpi_equipment_catalog")
    .update({ parameter_completeness: evaluation.score, updated_by: access.userId })
    .eq("organization_id", access.organizationId)
    .eq("id", id);

  return NextResponse.json({ data: { quality_evaluation: evaluation } });
}
