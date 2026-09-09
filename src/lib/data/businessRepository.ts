import type { SupabaseClient } from "@supabase/supabase-js";

type ListOptions = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

function pageRange(page = 1, pageSize = 15) {
  const normalizedPage = Math.max(1, page);
  const normalizedSize = Math.min(100, Math.max(1, pageSize));
  const from = (normalizedPage - 1) * normalizedSize;
  return { from, to: from + normalizedSize - 1 };
}

export async function listSuppliers(supabase: SupabaseClient, options: ListOptions) {
  const { from, to } = pageRange(options.page, options.pageSize);
  let query = supabase
    .from("wpi_suppliers")
    .select("*", { count: "exact" })
    .eq("organization_id", options.organizationId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (options.search?.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const result = await query;
  if (result.error) throw result.error;
  return result;
}

export async function listEquipmentPrices(
  supabase: SupabaseClient,
  options: ListOptions
) {
  const { from, to } = pageRange(options.page, options.pageSize);
  let query = supabase
    .from("wpi_equipment_prices")
    .select("*, wpi_suppliers(id, supplier_code, name)", { count: "exact" })
    .eq("organization_id", options.organizationId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (options.search?.trim()) {
    query = query.ilike("equipment_name", `%${options.search.trim()}%`);
  }

  const result = await query;
  if (result.error) throw result.error;
  return result;
}

export async function listAuditLogs(
  supabase: SupabaseClient,
  organizationId: string,
  page = 1,
  pageSize = 30
) {
  const { from, to } = pageRange(page, pageSize);
  const result = await supabase
    .from("wpi_audit_logs")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (result.error) throw result.error;
  return result;
}
