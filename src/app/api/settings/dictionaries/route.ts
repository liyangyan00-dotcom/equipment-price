import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { readSettingsPages } from "@/lib/data/readSettingsPages";

const dictionaryTypes = [
  "equipment_category",
  "material_category",
  "unit",
  "currency",
  "business_status",
] as const;

type DictionaryType = (typeof dictionaryTypes)[number];

const typeSet = new Set<string>(dictionaryTypes);
const codePattern = /^[A-Z0-9][A-Z0-9_.-]{0,63}$/;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key) && ["string", "number", "boolean"].includes(typeof item))
    .slice(0, 20);
  return Object.fromEntries(entries);
}

async function canManageSettings(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  if (access.role === "admin") return true;

  const override = await access.supabase
    .from("wpi_organization_role_permissions")
    .select("is_enabled")
    .eq("organization_id", access.organizationId)
    .eq("role", access.role)
    .eq("permission", "settings.manage")
    .maybeSingle();
  if (override.error) throw override.error;
  if (override.data) return Boolean(override.data.is_enabled);

  const fallback = await access.supabase
    .from("wpi_role_permissions")
    .select("permission")
    .eq("role", access.role)
    .eq("permission", "settings.manage")
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return Boolean(fallback.data);
}

function usageKey(type: DictionaryType, value: string) {
  return `${type}:${value.trim().toLowerCase()}`;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const [itemsResult, organizationResult, equipmentResult, materialResult, inquiryResult, auditsResult, manageable] = await Promise.all([
      readSettingsPages((from, to) => access.supabase
        .from("wpi_dictionary_items")
        .select("id, dictionary_type, code, name, description, parent_id, sort_order, is_active, is_system, metadata, created_by, updated_by, created_at, updated_at")
        .eq("organization_id", access.organizationId)
        .order("dictionary_type")
        .order("sort_order")
        .order("name")
        .order("id")
        .range(from, to)),
      access.supabase.from("wpi_organizations").select("id, code, name").eq("id", access.organizationId).maybeSingle(),
      readSettingsPages((from, to) => access.supabase.from("wpi_equipment_prices").select("category, original_currency, review_status").eq("organization_id", access.organizationId).order("id").range(from, to)),
      readSettingsPages((from, to) => access.supabase.from("wpi_material_prices").select("category, unit, currency, review_status").eq("organization_id", access.organizationId).order("id").range(from, to)),
      readSettingsPages((from, to) => access.supabase.from("wpi_inquiries").select("status").eq("organization_id", access.organizationId).order("id").range(from, to)),
      access.supabase
        .from("wpi_audit_logs")
        .select("id, actor_id, action, record_id, old_data, new_data, created_at")
        .eq("organization_id", access.organizationId)
        .eq("table_name", "wpi_dictionary_items")
        .order("created_at", { ascending: false })
        .limit(12),
      canManageSettings(access),
    ]);

    const firstError = itemsResult.error || organizationResult.error || equipmentResult.error || materialResult.error || inquiryResult.error || auditsResult.error;
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

    const usage = new Map<string, number>();
    const addUsage = (type: DictionaryType, value: unknown) => {
      if (typeof value !== "string" || !value.trim()) return;
      const key = usageKey(type, value);
      usage.set(key, (usage.get(key) ?? 0) + 1);
    };

    for (const row of equipmentResult.data ?? []) {
      addUsage("equipment_category", row.category);
      addUsage("currency", row.original_currency);
      addUsage("business_status", row.review_status);
    }
    for (const row of materialResult.data ?? []) {
      addUsage("material_category", row.category);
      addUsage("unit", row.unit);
      addUsage("currency", row.currency);
      addUsage("business_status", row.review_status);
    }
    for (const row of inquiryResult.data ?? []) addUsage("business_status", row.status);

    const items = (itemsResult.data ?? []).map((item) => ({
      ...item,
      usageCount: [...new Set([item.code, item.name].map((value) => usageKey(item.dictionary_type as DictionaryType, value)))]
        .reduce((total, key) => total + (usage.get(key) ?? 0), 0),
    }));

    return NextResponse.json({
      organization: organizationResult.data,
      canManage: manageable,
      currentRole: access.role,
      items,
      audits: auditsResult.error ? [] : auditsResult.data ?? [],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取数据字典失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    if (!(await canManageSettings(access))) return NextResponse.json({ error: "当前角色没有维护数据字典的权限" }, { status: 403 });
    const body = await request.json();
    const dictionaryType = cleanText(body.dictionaryType, 40);
    const code = cleanText(body.code, 64).toUpperCase();
    const name = cleanText(body.name, 100);
    const description = cleanText(body.description, 500);
    const sortOrder = Math.max(0, Math.min(9999, Number(body.sortOrder) || 0));

    if (!typeSet.has(dictionaryType)) return NextResponse.json({ error: "字典类型无效" }, { status: 400 });
    if (!codePattern.test(code)) return NextResponse.json({ error: "编码仅支持大写字母、数字、点、下划线和短横线" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "字典名称不能为空" }, { status: 400 });

    const result = await access.supabase
      .from("wpi_dictionary_items")
      .insert({
        organization_id: access.organizationId,
        dictionary_type: dictionaryType,
        code,
        name,
        description: description || null,
        sort_order: sortOrder,
        is_active: body.isActive !== false,
        is_system: false,
        metadata: cleanMetadata(body.metadata),
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select("id")
      .single();

    if (result.error) {
      const duplicated = result.error.code === "23505";
      return NextResponse.json({ error: duplicated ? "该类型下已存在相同编码" : result.error.message }, { status: duplicated ? 409 : 500 });
    }
    return NextResponse.json({ ok: true, id: result.data.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "新增字典项失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    if (!(await canManageSettings(access))) return NextResponse.json({ error: "当前角色没有维护数据字典的权限" }, { status: 403 });
    const body = await request.json();
    const id = cleanText(body.id, 80);
    if (!id) return NextResponse.json({ error: "缺少字典项 ID" }, { status: 400 });

    const existingResult = await access.supabase
      .from("wpi_dictionary_items")
      .select("is_system")
      .eq("organization_id", access.organizationId)
      .eq("id", id)
      .maybeSingle();
    if (existingResult.error) return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
    if (!existingResult.data) return NextResponse.json({ error: "字典项不存在或无权修改" }, { status: 404 });

    const updates: Record<string, unknown> = { updated_by: access.userId };
    if (body.code !== undefined) {
      const code = cleanText(body.code, 64).toUpperCase();
      if (!codePattern.test(code)) return NextResponse.json({ error: "字典编码格式无效" }, { status: 400 });
      if (!existingResult.data.is_system) updates.code = code;
    }
    if (body.name !== undefined) {
      const name = cleanText(body.name, 100);
      if (!name) return NextResponse.json({ error: "字典名称不能为空" }, { status: 400 });
      updates.name = name;
    }
    if (body.description !== undefined) updates.description = cleanText(body.description, 500) || null;
    if (body.sortOrder !== undefined) updates.sort_order = Math.max(0, Math.min(9999, Number(body.sortOrder) || 0));
    if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);
    if (body.metadata !== undefined) updates.metadata = cleanMetadata(body.metadata);

    const result = await access.supabase
      .from("wpi_dictionary_items")
      .update(updates)
      .eq("organization_id", access.organizationId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (result.error) {
      const duplicated = result.error.code === "23505";
      return NextResponse.json({ error: duplicated ? "该类型下已存在相同编码" : result.error.message }, { status: duplicated ? 409 : 500 });
    }
    if (!result.data) return NextResponse.json({ error: "字典项不存在或无权修改" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新字典项失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    if (!(await canManageSettings(access))) return NextResponse.json({ error: "当前角色没有维护数据字典的权限" }, { status: 403 });
    const id = cleanText(request.nextUrl.searchParams.get("id"), 80);
    if (!id) return NextResponse.json({ error: "缺少字典项 ID" }, { status: 400 });

    const itemResult = await access.supabase
      .from("wpi_dictionary_items")
      .select("is_system")
      .eq("organization_id", access.organizationId)
      .eq("id", id)
      .maybeSingle();
    if (itemResult.error) return NextResponse.json({ error: itemResult.error.message }, { status: 500 });
    if (!itemResult.data) return NextResponse.json({ error: "字典项不存在" }, { status: 404 });
    if (itemResult.data.is_system) return NextResponse.json({ error: "系统字典不能删除，可将其停用" }, { status: 409 });

    const result = await access.supabase
      .from("wpi_dictionary_items")
      .delete()
      .eq("organization_id", access.organizationId)
      .eq("id", id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除字典项失败" }, { status: 500 });
  }
}
