import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { evaluateEquipmentCatalogQuality } from "@/lib/equipmentCatalog/quality";
import type {
  EquipmentCatalogParameter,
  EquipmentCatalogRecord,
} from "@/types/equipmentCatalog";

const decisions = new Set(["approved", "rejected", "pending_review"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!["admin", "manager", "reviewer"].includes(access.role)) {
    return NextResponse.json({ error: "当前角色没有设备资料审核权限" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = (await request.json()) as { decision?: string; notes?: string };
  const decision = decisions.has(body.decision ?? "") ? body.decision! : "pending_review";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";

  const existing = await access.supabase
    .from("wpi_equipment_catalog")
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });

  if (decision === "approved") {
    const [parameters, sources] = await Promise.all([
      access.supabase
        .from("wpi_equipment_catalog_parameters")
        .select("*")
        .eq("equipment_catalog_id", id),
      access.supabase
        .from("wpi_equipment_catalog_sources")
        .select("source_url,review_status")
        .eq("equipment_catalog_id", id),
    ]);
    const relatedError = parameters.error || sources.error;
    if (relatedError)
      return NextResponse.json({ error: relatedError.message }, { status: 500 });
    const evaluation = evaluateEquipmentCatalogQuality(
      existing.data as EquipmentCatalogRecord,
      (parameters.data ?? []) as EquipmentCatalogParameter[],
      sources.data ?? [],
    );
    if (!evaluation.approvalReady) {
      return NextResponse.json(
        {
          error: `资料尚不满足审核通过条件：${evaluation.missingFields
            .slice(0, 5)
            .map((field) => field.label)
            .join("、")}`,
          quality_evaluation: evaluation,
        },
        { status: 422 },
      );
    }
  }

  const result = await access.supabase.rpc("wpi_review_equipment_catalog", {
    p_catalog_id: id,
    p_decision: decision,
    p_notes: notes,
  });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ data: result.data });
}
