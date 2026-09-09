import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const actionKeys = new Set([
  "risk-review",
  "data-completeness",
  "supplier-response",
  "ai-failures",
]);
const objectTypes = new Set(["all", "equipment", "material"]);
const priorities = new Set(["P0", "P1", "P2"]);
const statuses = new Set(["open", "in_progress", "resolved"]);
const managementRoles = new Set(["admin", "manager"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!managementRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有创建统计整改任务的权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const actionKey = clean(body?.actionKey, 80);
  const objectType = clean(body?.objectType, 20);
  const priority = clean(body?.priority, 2);
  const title = clean(body?.title, 300);
  const ownerRole = clean(body?.ownerRole, 80);
  const impact = clean(body?.impact, 1000);
  const remediationHref = clean(body?.remediationHref, 500);
  const dueDate = clean(body?.dueDate, 10);
  if (
    !actionKeys.has(actionKey) ||
    !objectTypes.has(objectType) ||
    !priorities.has(priority) ||
    !title ||
    !ownerRole ||
    !/^\/[^\s]*$/.test(remediationHref) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
  ) {
    return NextResponse.json({ error: "整改任务字段不完整或格式不正确" }, { status: 400 });
  }

  const existing = await access.supabase
    .from("wpi_analytics_action_items")
    .select("id,status")
    .eq("organization_id", access.organizationId)
    .eq("action_key", actionKey)
    .eq("object_type", objectType)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (existing.data && existing.data.status !== "resolved") {
    return NextResponse.json({ error: "该问题已存在未完成的整改任务" }, { status: 409 });
  }

  const values = {
    organization_id: access.organizationId,
    action_key: actionKey,
    object_type: objectType,
    title,
    priority,
    status: "open",
    owner_role: ownerRole,
    assigned_to: null,
    due_date: dueDate,
    impact,
    remediation_href: remediationHref,
    source_snapshot:
      body?.sourceSnapshot && typeof body.sourceSnapshot === "object"
        ? body.sourceSnapshot
        : {},
    created_by: access.userId,
    resolved_by: null,
    resolved_at: null,
  };
  const result = existing.data
    ? await access.supabase
        .from("wpi_analytics_action_items")
        .update(values)
        .eq("id", existing.data.id)
        .select("id,action_code,status,due_date")
        .single()
    : await access.supabase
        .from("wpi_analytics_action_items")
        .insert(values)
        .select("id,action_code,status,due_date")
        .single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ data: result.data }, { status: existing.data ? 200 : 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!managementRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有推进统计整改任务的权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = clean(body?.id, 36);
  const status = clean(body?.status, 20);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !statuses.has(status)) {
    return NextResponse.json({ error: "整改任务或目标状态无效" }, { status: 400 });
  }
  const updates = status === "resolved"
    ? { status, assigned_to: access.userId, resolved_by: access.userId, resolved_at: new Date().toISOString() }
    : { status, assigned_to: status === "in_progress" ? access.userId : null, resolved_by: null, resolved_at: null };
  const result = await access.supabase
    .from("wpi_analytics_action_items")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", access.organizationId)
    .select("id,action_code,status,due_date")
    .single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ data: result.data });
}
