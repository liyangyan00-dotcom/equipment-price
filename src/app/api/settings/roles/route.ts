import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const roles = ["admin", "manager", "reviewer", "editor", "viewer"] as const;
const permissions = [
  "supplier.read", "supplier.write", "supplier.review",
  "price.read", "price.write", "price.review",
  "inquiry.read", "inquiry.write", "inquiry.approve",
  "project.read", "project.write",
  "report.read", "report.write",
  "file.read", "file.write", "file.delete",
  "audit.read", "settings.manage", "user.manage",
] as const;

type AppRole = (typeof roles)[number];
type AppPermission = (typeof permissions)[number];

const protectedPermissions = new Set<AppPermission>(["settings.manage", "user.manage"]);

function isRole(value: unknown): value is AppRole {
  return typeof value === "string" && roles.includes(value as AppRole);
}

function isPermission(value: unknown): value is AppPermission {
  return typeof value === "string" && permissions.includes(value as AppPermission);
}

async function requireAdmin() {
  const access = await getApiAccess();
  if (!access.ok) return access;
  if (access.role !== "admin") {
    return { ok: false as const, status: 403, error: "仅系统管理员可配置角色权限" };
  }
  return access;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [defaultsResult, overridesResult, membersResult, auditsResult, organizationResult] = await Promise.all([
    access.supabase.from("wpi_role_permissions").select("role, permission"),
    access.supabase
      .from("wpi_organization_role_permissions")
      .select("role, permission, is_enabled, updated_at, updated_by")
      .eq("organization_id", access.organizationId),
    access.supabase
      .from("wpi_organization_members")
      .select("role, is_active")
      .eq("organization_id", access.organizationId),
    access.supabase
      .from("wpi_audit_logs")
      .select("id, action, record_id, old_data, new_data, created_at, actor_id")
      .eq("organization_id", access.organizationId)
      .eq("table_name", "wpi_organization_role_permissions")
      .order("created_at", { ascending: false })
      .limit(20),
    access.supabase
      .from("wpi_organizations")
      .select("id, code, name")
      .eq("id", access.organizationId)
      .maybeSingle(),
  ]);

  const firstError = defaultsResult.error || overridesResult.error || membersResult.error || auditsResult.error || organizationResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const defaults = new Map<AppRole, Set<AppPermission>>(roles.map((role) => [role, new Set<AppPermission>()]));
  for (const row of defaultsResult.data ?? []) {
    if (isRole(row.role) && isPermission(row.permission)) defaults.get(row.role)?.add(row.permission);
  }

  const overrideMap = new Map<AppRole, Map<AppPermission, boolean>>();
  for (const row of overridesResult.data ?? []) {
    if (!isRole(row.role) || !isPermission(row.permission)) continue;
    if (!overrideMap.has(row.role)) overrideMap.set(row.role, new Map());
    overrideMap.get(row.role)?.set(row.permission, Boolean(row.is_enabled));
  }

  const memberCounts = new Map<AppRole, number>(roles.map((role) => [role, 0]));
  for (const member of membersResult.data ?? []) {
    if (member.is_active && isRole(member.role)) memberCounts.set(member.role, (memberCounts.get(member.role) ?? 0) + 1);
  }

  const matrix = roles.map((role) => {
    const roleOverrides = overrideMap.get(role);
    const effective = permissions.filter((permission) => {
      if (role === "admin") return true;
      return roleOverrides?.has(permission)
        ? roleOverrides.get(permission)
        : defaults.get(role)?.has(permission);
    });
    return {
      role,
      memberCount: memberCounts.get(role) ?? 0,
      defaultPermissions: [...(defaults.get(role) ?? [])],
      permissions: effective,
      customized: Boolean(roleOverrides?.size),
      overrideCount: roleOverrides?.size ?? 0,
    };
  });

  return NextResponse.json({
    organization: organizationResult.data,
    currentRole: access.role,
    roles: matrix,
    permissions,
    protectedPermissions: [...protectedPermissions],
    audits: auditsResult.data ?? [],
  });
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = (await request.json().catch(() => ({}))) as { role?: unknown; permissions?: unknown };
  if (!isRole(input.role) || input.role === "admin") {
    return NextResponse.json({ error: "系统管理员权限不可修改" }, { status: 400 });
  }
  if (!Array.isArray(input.permissions) || !input.permissions.every(isPermission)) {
    return NextResponse.json({ error: "权限列表无效" }, { status: 400 });
  }
  if (input.permissions.some((permission) => protectedPermissions.has(permission))) {
    return NextResponse.json({ error: "系统设置与用户管理权限仅限系统管理员" }, { status: 400 });
  }

  const enabled = new Set<AppPermission>(input.permissions);
  const rows = permissions
    .filter((permission) => !protectedPermissions.has(permission))
    .map((permission) => ({
      organization_id: access.organizationId,
      role: input.role as Exclude<AppRole, "admin">,
      permission,
      is_enabled: enabled.has(permission),
      updated_by: access.userId,
    }));

  const { error } = await access.supabase
    .from("wpi_organization_role_permissions")
    .upsert(rows, { onConflict: "organization_id,role,permission" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, role: input.role, permissions: [...enabled] });
}

export async function DELETE(request: NextRequest) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = (await request.json().catch(() => ({}))) as { role?: unknown };
  if (!isRole(input.role) || input.role === "admin") {
    return NextResponse.json({ error: "系统管理员权限不可重置" }, { status: 400 });
  }

  const { error } = await access.supabase
    .from("wpi_organization_role_permissions")
    .delete()
    .eq("organization_id", access.organizationId)
    .eq("role", input.role);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, role: input.role });
}
