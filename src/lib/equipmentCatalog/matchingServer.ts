import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BoqCatalogCandidate,
  BoqCatalogMatchItem,
  BoqCatalogMatchingPayload,
} from "@/types/boqCatalogMatching";

export async function loadBoqCatalogMatching(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string,
  canWrite: boolean,
): Promise<BoqCatalogMatchingPayload | null> {
  const projectResult = await supabase
    .from("wpi_projects")
    .select("id, project_code, name, status")
    .eq("organization_id", organizationId)
    .eq("id", projectId)
    .maybeSingle();
  if (projectResult.error) throw projectResult.error;
  if (!projectResult.data) return null;

  const itemResult = await supabase
    .from("wpi_project_pricing_items")
    .select("id, boq_code, line_no, item_name, specification, category, quantity, unit, normalized_item_name, normalized_specification, requirement_parameters, equipment_catalog_id, catalog_match_status")
    .eq("organization_id", organizationId)
    .eq("project_id", projectId)
    .eq("category", "equipment")
    .order("line_no", { ascending: true });
  if (itemResult.error) throw itemResult.error;

  const itemIds = (itemResult.data ?? []).map((item) => item.id as string);
  let candidates: BoqCatalogCandidate[] = [];
  if (itemIds.length) {
    const matchResult = await supabase
      .from("wpi_project_pricing_catalog_matches")
      .select("*, catalog:wpi_equipment_catalog(*)")
      .eq("organization_id", organizationId)
      .in("project_item_id", itemIds)
      .order("candidate_rank", { ascending: true });
    if (matchResult.error) throw matchResult.error;
    candidates = (matchResult.data ?? []) as unknown as BoqCatalogCandidate[];
  }

  const items = (itemResult.data ?? []).map((item) => ({
    ...item,
    candidates: candidates.filter((candidate) => candidate.project_item_id === item.id),
  })) as unknown as BoqCatalogMatchItem[];
  const confirmedStatuses = new Set(["exact", "compatible", "partial"]);

  return {
    project: projectResult.data as BoqCatalogMatchingPayload["project"],
    items,
    summary: {
      equipmentItems: items.length,
      candidatesReady: items.filter((item) => item.candidates.length > 0).length,
      confirmed: items.filter((item) => confirmedStatuses.has(item.catalog_match_status) && item.equipment_catalog_id).length,
      needsReview: items.filter((item) => item.candidates.length > 0 && !item.equipment_catalog_id).length,
      unmatched: items.filter((item) => item.candidates.length === 0 && !item.equipment_catalog_id).length,
    },
    permissions: { canWrite },
  };
}
