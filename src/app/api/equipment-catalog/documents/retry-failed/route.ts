import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const writeRoles = new Set(["admin", "manager", "editor", "reviewer"]);

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有批量重试权限" }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { limit?: number };
  const limit = Math.max(1, Math.min(50, Math.round(Number(body.limit) || 25)));
  const failed = await access.supabase
    .from("wpi_equipment_catalog_document_jobs")
    .select("id")
    .eq("organization_id", access.organizationId)
    .eq("status", "failed")
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (failed.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  const ids = (failed.data ?? []).map((item) => item.id);
  if (!ids.length) return NextResponse.json({ data: { queued: 0, remaining: 0, worker: null } });

  const queued = await access.supabase
    .from("wpi_equipment_catalog_document_jobs")
    .update({
      status: "queued",
      progress: 0,
      error_message: null,
      started_at: null,
      completed_at: null,
      requested_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);
  if (queued.error) return NextResponse.json({ error: queued.error.message }, { status: 500 });

  const invoked = await access.supabase.functions.invoke("wpi-equipment-document-worker", {
    body: { organizationId: access.organizationId, limit: 2 },
  });
  const remaining = await access.supabase
    .from("wpi_equipment_catalog_document_jobs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organizationId)
    .eq("status", "failed");

  return NextResponse.json({
    data: {
      queued: ids.length,
      remaining: remaining.count ?? 0,
      worker: invoked.error ? { error: invoked.error.message } : invoked.data?.data ?? invoked.data,
    },
  });
}
