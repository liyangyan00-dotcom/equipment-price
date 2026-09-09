import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { verifyCollectionSource } from "@/lib/priceCollection/sourceValidator";
import type { CollectionSourceValidationJobRecord } from "@/types/priceCollection";

const manageableRoles = new Set(["admin", "manager"]);
export const maxDuration = 300;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function mapJob(row: Record<string, unknown>): CollectionSourceValidationJobRecord {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    status: (text(row.status) || "queued") as CollectionSourceValidationJobRecord["status"],
    attempt: Number(row.attempt ?? 0),
    errorMessage: text(row.error_message),
    result: row.result && typeof row.result === "object" ? row.result as Record<string, unknown> : {},
    createdAt: text(row.created_at),
    startedAt: text(row.started_at),
    finishedAt: text(row.finished_at),
  };
}

async function canManage(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  if (manageableRoles.has(access.role)) return true;
  const override = await access.supabase.from("wpi_organization_role_permissions").select("is_enabled")
    .eq("organization_id", access.organizationId).eq("role", access.role).eq("permission", "settings.manage").maybeSingle();
  if (override.error) throw override.error;
  return Boolean(override.data?.is_enabled);
}

async function processQueuedJobs(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>, batchSize = 5) {
  const queued = await access.supabase.from("wpi_collection_source_validation_jobs").select("*")
    .eq("organization_id", access.organizationId).eq("status", "queued")
    .order("created_at", { ascending: true }).limit(batchSize);
  if (queued.error || !queued.data?.length) return;
  for (const job of queued.data) {
    const claimed = await access.supabase.from("wpi_collection_source_validation_jobs").update({
      status: "running",
      attempt: Number(job.attempt ?? 0) + 1,
      started_at: new Date().toISOString(),
      error_message: null,
    }).eq("organization_id", access.organizationId).eq("id", job.id).eq("status", "queued").select("*").maybeSingle();
    if (claimed.error || !claimed.data) continue;
    const source = await access.supabase.from("wpi_price_collection_sources").select("*")
      .eq("organization_id", access.organizationId).eq("id", job.source_id).maybeSingle();
    if (source.error || !source.data) {
      await access.supabase.from("wpi_collection_source_validation_jobs").update({ status: "failed", error_message: "数据源不存在", finished_at: new Date().toISOString() }).eq("id", job.id);
      continue;
    }
    try {
      const verification = await verifyCollectionSource(source.data.base_url, source.data.allowed_hosts ?? []);
      const now = new Date().toISOString();
      await access.supabase.from("wpi_price_collection_sources").update({ is_active: true, last_checked_at: now, last_error: null, updated_by: access.userId }).eq("organization_id", access.organizationId).eq("id", source.data.id);
      await access.supabase.from("wpi_collection_source_validation_jobs").update({ status: "completed", result: verification, finished_at: now }).eq("organization_id", access.organizationId).eq("id", job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "来源验证失败";
      const now = new Date().toISOString();
      await access.supabase.from("wpi_price_collection_sources").update({ is_active: false, last_checked_at: now, last_error: message, updated_by: access.userId }).eq("organization_id", access.organizationId).eq("id", source.data.id);
      await access.supabase.from("wpi_collection_source_validation_jobs").update({ status: "failed", error_message: message, finished_at: now }).eq("organization_id", access.organizationId).eq("id", job.id);
    }
  }
}

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  after(() => processQueuedJobs(access));
  const result = await access.supabase.from("wpi_collection_source_validation_jobs").select("*")
    .eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ jobs: (result.data ?? []).map((row) => mapJob(row)), canManage: await canManage(access) });
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!(await canManage(access))) return NextResponse.json({ error: "当前角色没有验证数据源的权限" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const sourceIds = Array.isArray(body.sourceIds) ? Array.from(new Set(body.sourceIds.map(String))).slice(0, 100) : [];
  if (!sourceIds.length) return NextResponse.json({ error: "请选择至少一个数据源" }, { status: 400 });
  const sourceResult = await access.supabase.from("wpi_price_collection_sources").select("id")
    .eq("organization_id", access.organizationId).in("id", sourceIds);
  if (sourceResult.error) return NextResponse.json({ error: sourceResult.error.message }, { status: 500 });
  const validIds = (sourceResult.data ?? []).map((row) => String(row.id));
  const openJobs = await access.supabase.from("wpi_collection_source_validation_jobs").select("source_id")
    .eq("organization_id", access.organizationId).in("source_id", validIds).in("status", ["queued", "running"]);
  if (openJobs.error) return NextResponse.json({ error: openJobs.error.message }, { status: 500 });
  const openIds = new Set((openJobs.data ?? []).map((row) => String(row.source_id)));
  const inserts = validIds.filter((id) => !openIds.has(id)).map((sourceId) => ({
    organization_id: access.organizationId,
    source_id: sourceId,
    status: "queued",
    requested_by: access.userId,
  }));
  const inserted = inserts.length
    ? await access.supabase.from("wpi_collection_source_validation_jobs").insert(inserts).select("*")
    : { data: [], error: null };
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  after(() => processQueuedJobs(access));
  return NextResponse.json({ queued: inserts.length, skipped: validIds.length - inserts.length, jobs: (inserted.data ?? []).map((row) => mapJob(row)) }, { status: 202 });
}
