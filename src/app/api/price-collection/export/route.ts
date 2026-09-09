import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

const statusMap: Record<string, string> = {
  "待人工评估": "pending_review",
  "已确认待转线索": "ready",
  "可转线索": "ready",
  "已转线索池": "transferred",
  "已驳回": "rejected",
};

const riskMap: Record<string, string> = {
  "低风险": "low",
  "中风险": "medium",
  "高风险": "high",
};

function csvCell(value: unknown) {
  const raw = value == null ? "" : String(value);
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const format = body.format === "json" ? "json" : "csv";
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const filters = body.filters && typeof body.filters === "object"
    ? body.filters as Record<string, unknown>
    : {};

  let query = access.supabase
    .from("wpi_price_collection_leads")
    .select("lead_code,target_type,name,specification,source_type,source_url,evidence_code,region,quote_date,price,currency,original_unit,supplier_name,ai_match_score,confidence,risk_level,status,source_checked_at,created_at")
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (ids.length) query = query.in("id", ids);
  if (typeof filters.taskId === "string" && filters.taskId) query = query.eq("task_id", filters.taskId);
  if (filters.type === "设备") query = query.eq("target_type", "equipment");
  if (filters.type === "地材") query = query.eq("target_type", "material");
  if (typeof filters.status === "string" && statusMap[filters.status]) query = query.eq("status", statusMap[filters.status]);
  if (typeof filters.risk === "string" && riskMap[filters.risk]) query = query.eq("risk_level", riskMap[filters.risk]);
  if (typeof filters.source === "string" && filters.source && filters.source !== "全部") query = query.eq("source_type", filters.source);
  if (typeof filters.keyword === "string" && filters.keyword.trim()) {
    const keyword = filters.keyword.trim().replaceAll(/[,%()]/g, " ");
    query = query.or(`lead_code.ilike.%${keyword}%,name.ilike.%${keyword}%,specification.ilike.%${keyword}%,supplier_name.ilike.%${keyword}%`);
  }

  const result = await query;
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });

  const rows = result.data ?? [];
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const fileName = `price-collection-${stamp}.${format}`;
  if (format === "json") {
    return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, rows }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Export-Count": String(rows.length),
      },
    });
  }

  const headers = ["线索编号", "类型", "名称", "规格", "来源", "来源网址", "证据编号", "地区", "价格月份", "原始价格", "币种", "系统识别单位", "供应商", "AI匹配度", "可信度", "风险", "审核状态", "来源核验时间", "创建时间"];
  const csvRows = rows.map((row) => [
    row.lead_code,
    row.target_type === "material" ? "地材" : "设备",
    row.name,
    row.specification,
    row.source_type,
    row.source_url,
    row.evidence_code,
    row.region,
    row.quote_date,
    row.price,
    row.currency,
    row.original_unit,
    row.supplier_name,
    row.ai_match_score,
    row.confidence,
    row.risk_level,
    row.status,
    row.source_checked_at,
    row.created_at,
  ]);
  const csv = `\uFEFF${[headers, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "X-Export-Count": String(rows.length),
    },
  });
}
