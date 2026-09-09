import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { evaluateEquipmentCatalogQuality } from "@/lib/equipmentCatalog/quality";
import type { EquipmentCatalogParameter, EquipmentCatalogRecord } from "@/types/equipmentCatalog";

const reviewRoles = new Set(["admin", "manager", "reviewer"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; candidateId: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!reviewRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有参数差异审核权限" }, { status: 403 });
  }

  const { id, candidateId } = await context.params;
  const body = await request.json().catch(() => ({})) as {
    decision?: "accepted" | "rejected";
    note?: string;
  };
  if (body.decision !== "accepted" && body.decision !== "rejected") {
    return NextResponse.json({ error: "请选择接受或拒绝" }, { status: 400 });
  }

  const candidateResult = await access.supabase
    .from("wpi_equipment_catalog_parameter_candidates")
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("equipment_catalog_id", id)
    .eq("id", candidateId)
    .maybeSingle();
  if (candidateResult.error) return NextResponse.json({ error: candidateResult.error.message }, { status: 500 });
  if (!candidateResult.data) return NextResponse.json({ error: "参数候选不存在" }, { status: 404 });
  if (candidateResult.data.review_decision !== "pending") {
    return NextResponse.json({ error: "该参数候选已经完成审核" }, { status: 409 });
  }

  const result = await access.supabase.rpc("wpi_review_equipment_catalog_parameter_candidate", {
    p_catalog_id: id,
    p_candidate_id: candidateId,
    p_decision: body.decision,
    p_note: String(body.note ?? "").trim().slice(0, 2000),
  });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  const [catalog, parameters, sources] = await Promise.all([
    access.supabase.from("wpi_equipment_catalog").select("*")
      .eq("organization_id", access.organizationId).eq("id", id).single(),
    access.supabase.from("wpi_equipment_catalog_parameters").select("*")
      .eq("organization_id", access.organizationId).eq("equipment_catalog_id", id),
    access.supabase.from("wpi_equipment_catalog_sources").select("source_url,review_status")
      .eq("organization_id", access.organizationId).eq("equipment_catalog_id", id),
  ]);
  const followupError = catalog.error || parameters.error || sources.error;
  if (followupError) return NextResponse.json({ error: followupError.message }, { status: 500 });
  const evaluation = evaluateEquipmentCatalogQuality(
    catalog.data as EquipmentCatalogRecord,
    (parameters.data ?? []) as EquipmentCatalogParameter[],
    sources.data ?? [],
  );
  const completenessUpdate = await access.supabase.from("wpi_equipment_catalog").update({
    parameter_completeness: evaluation.score,
    review_status: "pending_review",
    updated_by: access.userId,
    updated_at: new Date().toISOString(),
  }).eq("organization_id", access.organizationId).eq("id", id);
  if (completenessUpdate.error) return NextResponse.json({ error: completenessUpdate.error.message }, { status: 500 });
  return NextResponse.json({ data: { review: result.data, quality_evaluation: evaluation }, source: "supabase" });
}
