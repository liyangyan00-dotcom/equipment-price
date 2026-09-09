import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { normalizeCatalogText } from "@/lib/equipmentCatalog/matching";
import { loadBoqCatalogMatching } from "@/lib/equipmentCatalog/matchingServer";
import { projectPricingWriteRoles } from "@/lib/projectPricing/server";

type MatchActionBody = {
  action?: "accept" | "reject" | "create_catalog";
  matchId?: string;
  notes?: string;
};

function createCatalogCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `EQC-${date}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!projectPricingWriteRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有人工确认设备资料的权限" }, { status: 403 });
  }
  const { id, itemId } = await context.params;
  const body = await request.json().catch(() => ({})) as MatchActionBody;
  const itemResult = await access.supabase
    .from("wpi_project_pricing_items")
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("project_id", id)
    .eq("id", itemId)
    .maybeSingle();
  if (itemResult.error) return NextResponse.json({ error: itemResult.error.message }, { status: 400 });
  if (!itemResult.data) return NextResponse.json({ error: "BOQ 行不存在" }, { status: 404 });

  if (body.action === "accept") {
    if (!body.matchId) return NextResponse.json({ error: "请选择要确认的设备资料候选" }, { status: 400 });
    const confirmed = await access.supabase.rpc("wpi_confirm_project_catalog_match", {
      p_project_item_id: itemId,
      p_match_id: body.matchId,
      p_notes: body.notes?.trim() || "人工确认 BOQ 与设备资料关系",
    });
    if (confirmed.error) return NextResponse.json({ error: confirmed.error.message }, { status: 400 });
  } else if (body.action === "reject") {
    if (!body.matchId) return NextResponse.json({ error: "请选择要排除的设备资料候选" }, { status: 400 });
    const rejected = await access.supabase
      .from("wpi_project_pricing_catalog_matches")
      .update({
        decision: "rejected",
        reviewer_id: access.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: body.notes?.trim() || "人工排除候选",
        updated_by: access.userId,
      })
      .eq("organization_id", access.organizationId)
      .eq("project_item_id", itemId)
      .eq("id", body.matchId);
    if (rejected.error) return NextResponse.json({ error: rejected.error.message }, { status: 400 });
  } else if (body.action === "create_catalog") {
    const normalizedName = normalizeCatalogText(itemResult.data.item_name).replaceAll(" ", "");
    const created = await access.supabase
      .from("wpi_equipment_catalog")
      .insert({
        organization_id: access.organizationId,
        catalog_code: createCatalogCode(),
        equipment_name: itemResult.data.item_name,
        normalized_name: normalizedName,
        equipment_category: "BOQ 待归类设备",
        equipment_type: itemResult.data.item_name,
        specification: itemResult.data.specification || "",
        source_type: "boq_manual_create",
        parameter_completeness: itemResult.data.specification ? 45 : 20,
        ai_extracted: true,
        ai_confidence: 60,
        review_status: "pending_review",
        risk_level: "medium",
        metadata: {
          sourceProjectId: id,
          sourceProjectItemId: itemId,
          sourceBoqCode: itemResult.data.boq_code,
          humanCreated: true,
        },
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select()
      .single();
    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 400 });

    const linked = await access.supabase
      .from("wpi_project_pricing_items")
      .update({
        equipment_catalog_id: created.data.id,
        normalized_item_name: normalizedName,
        normalized_specification: normalizeCatalogText(itemResult.data.specification || "").replaceAll(" ", ""),
        catalog_match_status: "needs_review",
        metadata: {
          ...(itemResult.data.metadata ?? {}),
          catalogMatch: {
            catalogId: created.data.id,
            createdFromBoq: true,
            humanConfirmed: false,
          },
        },
        updated_by: access.userId,
      })
      .eq("organization_id", access.organizationId)
      .eq("project_id", id)
      .eq("id", itemId);
    if (linked.error) return NextResponse.json({ error: linked.error.message }, { status: 400 });
  } else {
    return NextResponse.json({ error: "不支持的匹配操作" }, { status: 400 });
  }

  const data = await loadBoqCatalogMatching(access.supabase, access.organizationId, id, true);
  return NextResponse.json({ data, source: "supabase" });
}
