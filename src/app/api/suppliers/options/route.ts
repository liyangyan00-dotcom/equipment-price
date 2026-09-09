import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { literalSearch, postgrestLiteral } from "@/lib/data/postgrestSearch";

const projection = "id,supplier_code,name,country_code,review_status";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers });
  const params = new URL(request.url).searchParams;
  const keyword = (params.get("q") || "").trim();
  const selectedId = params.get("selectedId") || "";
  const pageText = params.get("page") || "1";
  if (!/^[1-9]\d{0,5}$/.test(pageText) || keyword.length > 120 || /[\u0000-\u001f]/.test(keyword)
    || (selectedId && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(selectedId))) {
    return NextResponse.json({ error: "供应商查询参数无效" }, { status: 400, headers });
  }
  const page = Number(pageText), pageSize = 50;
  let query = access.supabase.from("wpi_suppliers").select(projection, { count: "exact" }).eq("organization_id", access.organizationId);
  if (keyword) {
    const pattern = postgrestLiteral(literalSearch(keyword));
    query = query.or(`name.ilike.${pattern},supplier_code.ilike.${pattern}`);
  }
  const result = await query.order("supplier_code", { ascending: true }).order("id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1).abortSignal(request.signal);
  if (result.error || result.count === null || !Array.isArray(result.data)) return NextResponse.json({ error: "供应商选项读取失败" }, { status: 500, headers });
  let selected = result.data.find(row => row.id === selectedId) ?? null;
  if (selectedId && !selected) {
    const lookup = await access.supabase.from("wpi_suppliers").select(projection)
      .eq("organization_id", access.organizationId).eq("id", selectedId).abortSignal(request.signal).maybeSingle();
    if (lookup.error) return NextResponse.json({ error: "已选供应商读取失败" }, { status: 500, headers });
    selected = lookup.data;
  }
  return NextResponse.json({ data: result.data, selected, pagination: { page, pageSize, total: result.count, pageCount: Math.max(1, Math.ceil(result.count / pageSize)) } }, { headers });
}
