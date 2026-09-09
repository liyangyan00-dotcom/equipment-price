import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { invalidateScopedRead, scopedReadResponse } from "@/lib/data/scopedResponseCache";
import { literalSearch, materialReviewParams, postgrestLiteral } from "@/lib/data/materialReviewQuery";

const headers = { "Cache-Control": "private, no-store" };
const projection = "id,legacy_id,price_code,material_name,specification,category,unit,price,currency,region,supplier_id,source_type,source_url,valid_until,confidence,risk_level,review_status,updated_at,supplierName:metadata->>supplierName,quoteDate:metadata->>quoteDate,aiSuggestion:metadata->>aiSuggestion,reviewComment:metadata->>reviewComment,needsInformation:metadata->needsInformation,wpi_suppliers(id,legacy_id,name)";

export async function GET(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers });
  const supabase = access.supabase;
  const params = new URL(request.url).searchParams;
  if (params.get("view") === "summary") {
    if (params.get("refresh") === "1") invalidateScopedRead(access, "material-review-summary");
    return scopedReadResponse(access, "material-review-summary", async () => {
      const count = () => access.supabase.from("wpi_material_prices").select("id", { count: "exact", head: true }).eq("organization_id", access.organizationId);
      const awaiting = await count().in("review_status", ["draft", "pending_review"]);
      const highRisk = await count().in("risk_level", ["high", "critical"]);
      const needsInfo = await count().eq("metadata->>needsInformation", "true");
      const highConfidence = await count().gte("confidence", 90);
      const approved = await count().eq("review_status", "approved");
      const results = { awaiting, highRisk, needsInfo, highConfidence, approved };
      if (Object.values(results).some(result => result.error || result.count === null)) return NextResponse.json({ error: "审核统计暂不可用" }, { status: 500, headers });
      return NextResponse.json({ counts: Object.fromEntries(Object.entries(results).map(([key, result]) => [key, result.count])), generatedAt: new Date().toISOString() }, { headers });
    });
  }
  let options: ReturnType<typeof materialReviewParams>;
  try { options = materialReviewParams(params); } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "参数无效" }, { status: 400, headers });
  }
  const { filters, ids, pageSize } = options;
  let supplierIds: string[] = [];
  if (filters.keyword) {
    const suppliers = await access.supabase.from("wpi_suppliers").select("id")
      .eq("organization_id", access.organizationId).ilike("name", literalSearch(filters.keyword)).limit(201).abortSignal(request.signal);
    if (suppliers.error) return NextResponse.json({ error: "供应商筛选读取失败" }, { status: 500, headers });
    if ((suppliers.data?.length ?? 0) > 200) return NextResponse.json({ error: "匹配供应商过多，请使用更具体的搜索词" }, { status: 400, headers });
    supplierIds = (suppliers.data ?? []).map(row => String(row.id));
  }
  function query(page: number) {
    let result = supabase.from("wpi_material_prices").select(projection, { count: "exact" }).eq("organization_id", access.organizationId);
    if (filters.status !== "all") result = result.eq("review_status", filters.status);
    if (filters.risk !== "all") result = result.eq("risk_level", filters.risk);
    if (filters.category && filters.category !== "all") result = result.eq("category", filters.category);
    if (filters.source && filters.source !== "all") result = result.eq("source_type", filters.source);
    if (filters.queue === "awaiting") result = result.in("review_status", ["draft", "pending_review"]);
    if (filters.queue === "highRisk") result = result.in("risk_level", ["high", "critical"]);
    if (filters.queue === "needsInfo") result = result.eq("metadata->>needsInformation", "true");
    if (filters.queue === "highConfidence") result = result.gte("confidence", 90);
    if (filters.queue === "approved") result = result.eq("review_status", "approved");
    if (filters.keyword) {
      const pattern = postgrestLiteral(literalSearch(filters.keyword));
      const clauses = ["price_code", "material_name", "specification", "region", "metadata->>supplierName"].map(column => `${column}.ilike.${pattern}`);
      if (supplierIds.length) clauses.push(`supplier_id.in.(${supplierIds.map(postgrestLiteral).join(",")})`);
      result = result.or(clauses.join(","));
    }
    if (ids.length) {
      const list = ids.map(postgrestLiteral).join(",");
      const uuids = ids.filter(value => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value));
      result = result.or([`legacy_id.in.(${list})`, `price_code.in.(${list})`, ...(uuids.length ? [`id.in.(${uuids.map(postgrestLiteral).join(",")})`] : [])].join(","));
    }
    return result.order("price_code", { ascending: true }).order("id", { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1).abortSignal(request.signal);
  }
  let page = options.page;
  let result = await query(page);
  if (result.error || result.count === null || !Array.isArray(result.data)) return NextResponse.json({ error: "审核队列加载失败" }, { status: 500, headers });
  const lastPage = Math.max(1, Math.ceil(result.count / pageSize));
  if (page > lastPage) { page = lastPage; result = await query(page); }
  if (result.error || result.count === null || !Array.isArray(result.data)) return NextResponse.json({ error: "审核队列加载失败" }, { status: 500, headers });
  const data = result.data.map(({ supplierName, quoteDate, aiSuggestion, reviewComment, needsInformation, ...row }) => ({
    ...row, metadata: { supplierName, quoteDate, aiSuggestion, reviewComment, needsInformation },
  }));
  return NextResponse.json({ data, pagination: { page, pageSize, total: result.count, pageCount: Math.max(1, Math.ceil(result.count / pageSize)) } }, { headers });
}
