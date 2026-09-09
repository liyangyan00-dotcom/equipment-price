import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

function normalized(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[（）()\[\]{}\s_\-/\\.,:;]+/g, "")
    .trim();
}

function brandMatches(value: unknown, brand: string) {
  const source = normalized(value);
  const target = normalized(brand);
  return Boolean(target) && (source === target || source.includes(target));
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status });
  if (!['admin', 'manager', 'reviewer', 'editor'].includes(access.role))
    return NextResponse.json({ error: "当前角色没有重新匹配权限" }, { status: 403 });

  const { id } = await context.params;
  const catalog = await access.supabase
    .from("wpi_equipment_catalog")
    .select("id,equipment_name,brand,manufacturer,model,source_url,metadata")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (catalog.error)
    return NextResponse.json({ error: catalog.error.message }, { status: 500 });
  if (!catalog.data)
    return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });

  const brand = String(catalog.data.brand || catalog.data.manufacturer || "").trim();
  const model = normalized(catalog.data.model);
  const [suppliers, prices] = await Promise.all([
    access.supabase
      .from("wpi_suppliers")
      .select("id,name,legal_name,review_status,confidence,website")
      .eq("organization_id", access.organizationId)
      .is("deleted_at", null)
      .limit(500),
    brand
      ? access.supabase
          .from("wpi_equipment_prices")
          .select("id,price_code,equipment_name,brand,model,supplier_id,equipment_catalog_id,review_status")
          .eq("organization_id", access.organizationId)
          .ilike("brand", brand)
          .is("deleted_at", null)
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const lookupError = suppliers.error || prices.error;
  if (lookupError)
    return NextResponse.json({ error: lookupError.message }, { status: 500 });

  const supplierCandidates = (suppliers.data ?? []).filter((supplier) =>
    brandMatches(supplier.name, brand) || brandMatches(supplier.legal_name, brand),
  );
  const exactPrices = (prices.data ?? []).filter((price) =>
    model && normalized(price.model) === model,
  );
  const compatiblePrices = (prices.data ?? []).filter((price) =>
    !exactPrices.some((exact) => exact.id === price.id),
  );

  let linkedSupplierId: string | null = null;
  if (supplierCandidates.length === 1) {
    const supplier = supplierCandidates[0];
    const relation = await access.supabase
      .from("wpi_supplier_equipment_catalog")
      .upsert(
        {
          organization_id: access.organizationId,
          supplier_id: supplier.id,
          equipment_catalog_id: id,
          supply_type: "manufacturer",
          authorized_status: "unverified",
          evidence_url: catalog.data.source_url || supplier.website || null,
          confidence: Math.min(96, Math.max(70, Number(supplier.confidence || 0))),
          review_status: "pending_review",
          metadata: {
            matchMethod: "unique_brand_legal_entity",
            matchedBrand: brand,
            requiresHumanReview: true,
          },
          created_by: access.userId,
          updated_by: access.userId,
        },
        { onConflict: "organization_id,supplier_id,equipment_catalog_id" },
      );
    if (relation.error)
      return NextResponse.json({ error: relation.error.message }, { status: 500 });
    linkedSupplierId = supplier.id;
  }

  const unlinkedExactIds = exactPrices
    .filter((price) => !price.equipment_catalog_id || price.equipment_catalog_id === id)
    .map((price) => price.id);
  if (unlinkedExactIds.length) {
    const priceUpdate = await access.supabase
      .from("wpi_equipment_prices")
      .update({
        equipment_catalog_id: id,
        updated_by: access.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", access.organizationId)
      .in("id", unlinkedExactIds);
    if (priceUpdate.error)
      return NextResponse.json({ error: priceUpdate.error.message }, { status: 500 });
  }

  const previousMetadata =
    catalog.data.metadata && typeof catalog.data.metadata === "object"
      ? catalog.data.metadata
      : {};
  const catalogUpdate = await access.supabase
    .from("wpi_equipment_catalog")
    .update({
      source_supplier_id: linkedSupplierId || undefined,
      metadata: {
        ...previousMetadata,
        reconciliation: {
          matchedAt: new Date().toISOString(),
          matchedBy: access.userId,
          supplierCandidateIds: supplierCandidates.map((supplier) => supplier.id),
          exactPriceIds: exactPrices.map((price) => price.id),
          compatiblePriceCandidateIds: compatiblePrices.map((price) => price.id),
          requiresHumanReview: supplierCandidates.length !== 1 || compatiblePrices.length > 0,
        },
      },
      updated_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", access.organizationId)
    .eq("id", id);
  if (catalogUpdate.error)
    return NextResponse.json({ error: catalogUpdate.error.message }, { status: 500 });

  return NextResponse.json({
    data: {
      supplierCandidates: supplierCandidates.length,
      supplierLinked: Boolean(linkedSupplierId),
      exactPricesLinked: unlinkedExactIds.length,
      compatiblePriceCandidates: compatiblePrices.length,
      requiresHumanReview: supplierCandidates.length !== 1 || compatiblePrices.length > 0,
    },
  });
}
