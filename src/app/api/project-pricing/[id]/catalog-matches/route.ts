import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { scoreCatalogCandidate, normalizeCatalogText } from "@/lib/equipmentCatalog/matching";
import { loadBoqCatalogMatching } from "@/lib/equipmentCatalog/matchingServer";
import { projectPricingWriteRoles } from "@/lib/projectPricing/server";
import type { EquipmentCatalogRecord } from "@/types/equipmentCatalog";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  try {
    const data = await loadBoqCatalogMatching(
      access.supabase,
      access.organizationId,
      id,
      projectPricingWriteRoles.has(access.role),
    );
    if (!data) return NextResponse.json({ error: "项目套价方案不存在" }, { status: 404 });
    return NextResponse.json({ data, source: "supabase" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "设备资料匹配加载失败" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!projectPricingWriteRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有生成设备资料候选的权限" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { itemId?: string };

  const project = await access.supabase
    .from("wpi_projects")
    .select("id")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (project.error) return NextResponse.json({ error: project.error.message }, { status: 400 });
  if (!project.data) return NextResponse.json({ error: "项目套价方案不存在" }, { status: 404 });

  let itemQuery = access.supabase
    .from("wpi_project_pricing_items")
    .select("id, item_name, specification, category, equipment_catalog_id")
    .eq("organization_id", access.organizationId)
    .eq("project_id", id)
    .eq("category", "equipment");
  if (body.itemId) itemQuery = itemQuery.eq("id", body.itemId);
  const itemResult = await itemQuery;
  if (itemResult.error) return NextResponse.json({ error: itemResult.error.message }, { status: 400 });

  const catalogResult = await access.supabase
    .from("wpi_equipment_catalog")
    .select("*")
    .eq("organization_id", access.organizationId)
    .in("review_status", ["approved", "pending_review"])
    .neq("review_status", "archived")
    .limit(500);
  if (catalogResult.error) return NextResponse.json({ error: catalogResult.error.message }, { status: 400 });
  const catalogs = (catalogResult.data ?? []) as unknown as EquipmentCatalogRecord[];

  for (const item of itemResult.data ?? []) {
    if (item.equipment_catalog_id) continue;
    const existing = await access.supabase
      .from("wpi_project_pricing_catalog_matches")
      .delete()
      .eq("organization_id", access.organizationId)
      .eq("project_item_id", item.id)
      .neq("decision", "accepted");
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 400 });

    const ranked = catalogs
      .map((catalog) => ({ catalog, score: scoreCatalogCandidate(item, catalog) }))
      .sort((left, right) => right.score.overallScore - left.score.overallScore)
      .slice(0, 3);
    if (ranked.length) {
      const inserted = await access.supabase.from("wpi_project_pricing_catalog_matches").insert(
        ranked.map(({ catalog, score }, index) => ({
          organization_id: access.organizationId,
          project_id: id,
          project_item_id: item.id,
          equipment_catalog_id: catalog.id,
          candidate_rank: index + 1,
          name_score: score.nameScore,
          model_score: score.modelScore,
          parameter_score: score.parameterScore,
          overall_score: score.overallScore,
          confidence: score.confidence,
          match_reason: score.matchReason,
          parameter_differences: score.differences,
          decision: "suggested",
          created_by: access.userId,
          updated_by: access.userId,
        })),
      );
      if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });
    }

    const updated = await access.supabase
      .from("wpi_project_pricing_items")
      .update({
        normalized_item_name: normalizeCatalogText(item.item_name).replaceAll(" ", ""),
        normalized_specification: normalizeCatalogText(item.specification).replaceAll(" ", ""),
        requirement_parameters: {
          rawSpecification: item.specification,
          extractedBy: "catalog-matching-p1",
          extractedAt: new Date().toISOString(),
        },
        catalog_match_status: ranked.length ? "needs_review" : "unmatched",
        updated_by: access.userId,
      })
      .eq("organization_id", access.organizationId)
      .eq("project_id", id)
      .eq("id", item.id);
    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });
  }

  const data = await loadBoqCatalogMatching(access.supabase, access.organizationId, id, true);
  return NextResponse.json({ data, source: "supabase" });
}
