import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { scopedReadResponse } from "@/lib/data/scopedResponseCache";

const validActions = new Set(["insert", "update", "delete"]);

async function canReadAudit(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  if (access.role === "admin") return true;

  const override = await access.supabase
    .from("wpi_organization_role_permissions")
    .select("is_enabled")
    .eq("organization_id", access.organizationId)
    .eq("role", access.role)
    .eq("permission", "audit.read")
    .maybeSingle();

  if (override.error) throw override.error;
  if (override.data) return Boolean(override.data.is_enabled);

  const fallback = await access.supabase
    .from("wpi_role_permissions")
    .select("permission")
    .eq("role", access.role)
    .eq("permission", "audit.read")
    .maybeSingle();

  if (fallback.error) throw fallback.error;
  return Boolean(fallback.data);
}

function cleanSearch(value: string | null) {
  return (value ?? "").replace(/[,()%_'"\\]/g, " ").trim().slice(0, 80);
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    if (!(await canReadAudit(access))) {
      return NextResponse.json({ error: "当前角色没有查看审计日志的权限" }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "权限校验失败" }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const recordId = searchParams.get("id");
  if (recordId) {
    if (!/^\d+$/.test(recordId)) return NextResponse.json({ error: "无效的日志编号" }, { status: 400 });
    const result = await access.supabase.from("wpi_audit_logs")
      .select("id,actor_id,action,table_name,record_id,old_data,new_data,request_id,ip_address,user_agent,created_at")
      .eq("organization_id", access.organizationId).eq("id", recordId).maybeSingle();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 503 });
    if (!result.data) return NextResponse.json({ error: "审计记录不存在" }, { status: 404 });
    return NextResponse.json({ data: result.data }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(10, Number(searchParams.get("pageSize")) || 15));
  const action = searchParams.get("action") ?? "all";
  const table = searchParams.get("table") ?? "all";
  const role = searchParams.get("role") ?? "all";
  const keyword = cleanSearch(searchParams.get("q"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = access.supabase
    .from("wpi_audit_logs")
    .select("id, actor_id, action, table_name, record_id, request_id, ip_address, user_agent, created_at", { count: "exact" })
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: false });

  if (validActions.has(action)) query = query.eq("action", action);
  if (table !== "all" && /^wpi_[a-z0-9_]+$/.test(table)) query = query.eq("table_name", table);
  if (["admin", "manager", "reviewer", "editor", "viewer"].includes(role)) {
    query = query.or(`new_data->>role.eq.${role},old_data->>role.eq.${role}`);
  }
  if (keyword) query = query.or(`table_name.ilike.%${keyword}%,action.ilike.%${keyword}%,record_id.ilike.%${keyword}%`);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const rangeFrom = (page - 1) * pageSize;
  const [rowsResult, summaryResult, organizationResult] = await Promise.all([
    query.range(rangeFrom, rangeFrom + pageSize - 1),
    loadAuditSummary(access),
    access.supabase
      .from("wpi_organizations")
      .select("id, code, name")
      .eq("id", access.organizationId)
      .maybeSingle(),
  ]);

  const firstError = rowsResult.error || summaryResult.error || organizationResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const summaryRows = summaryResult.data ?? [];
  const tableCounts = new Map<string, number>();
  for (const row of summaryRows) tableCounts.set(row.table_name, (tableCounts.get(row.table_name) ?? 0) + 1);

  return NextResponse.json({
    organization: organizationResult.data,
    currentRole: access.role,
    rows: rowsResult.data ?? [],
    pagination: {
      page,
      pageSize,
      total: rowsResult.count ?? 0,
      totalPages: Math.max(1, Math.ceil((rowsResult.count ?? 0) / pageSize)),
    },
    summary: {
      total: summaryRows.length,
      inserts: summaryRows.filter((row) => row.action === "insert").length,
      updates: summaryRows.filter((row) => row.action === "update").length,
      deletes: summaryRows.filter((row) => row.action === "delete").length,
      actors: new Set(summaryRows.map((row) => row.actor_id).filter(Boolean)).size,
    },
    tables: [...tableCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([name, count]) => ({ name, count })),
  });
}

async function loadAuditSummary(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  const response = await scopedReadResponse(access, "audit-summary", async () => {
    const result = await access.supabase.from("wpi_audit_logs")
      .select("actor_id,action,table_name,created_at")
      .eq("organization_id", access.organizationId)
      .order("created_at", { ascending: false }).limit(1000);
    return NextResponse.json({ data: result.data, error: result.error }, { status: result.error ? 503 : 200 });
  }, 15_000);
  return response.json() as Promise<{ data: Array<{ actor_id: string | null; action: string; table_name: string; created_at: string }> | null; error: { message: string } | null }>;
}
