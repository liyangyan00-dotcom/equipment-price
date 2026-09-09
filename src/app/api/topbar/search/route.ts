import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type { GlobalSearchResult } from "@/types/topbar";

export const dynamic = "force-dynamic";

function cleanKeyword(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const keyword = cleanKeyword(request.nextUrl.searchParams.get("q") ?? "");
  if (keyword.length < 2) return NextResponse.json({ results: [] });
  const pattern = `%${keyword}%`;

  const [equipment, materials, suppliers, inquiries, projects, reports, aiTasks] = await Promise.all([
    access.supabase
      .from("wpi_equipment_prices")
      .select("id, price_code, equipment_name, brand, model")
      .eq("organization_id", access.organizationId)
      .or(`price_code.ilike.${pattern},equipment_name.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern}`)
      .limit(4),
    access.supabase
      .from("wpi_material_prices")
      .select("id, price_code, material_name, specification, region")
      .eq("organization_id", access.organizationId)
      .or(`price_code.ilike.${pattern},material_name.ilike.${pattern},specification.ilike.${pattern},region.ilike.${pattern}`)
      .limit(4),
    access.supabase
      .from("wpi_suppliers")
      .select("id, supplier_code, name, category, region")
      .eq("organization_id", access.organizationId)
      .or(`supplier_code.ilike.${pattern},name.ilike.${pattern},legal_name.ilike.${pattern},category.ilike.${pattern}`)
      .limit(4),
    access.supabase
      .from("wpi_inquiries")
      .select("id, inquiry_code, subject, status")
      .eq("organization_id", access.organizationId)
      .or(`inquiry_code.ilike.${pattern},subject.ilike.${pattern}`)
      .limit(4),
    access.supabase
      .from("wpi_projects")
      .select("id, project_code, name, status")
      .eq("organization_id", access.organizationId)
      .or(`project_code.ilike.${pattern},name.ilike.${pattern}`)
      .limit(4),
    access.supabase
      .from("wpi_reports")
      .select("id, report_code, title, report_type")
      .eq("organization_id", access.organizationId)
      .or(`report_code.ilike.${pattern},title.ilike.${pattern},report_type.ilike.${pattern}`)
      .limit(4),
    access.supabase
      .from("wpi_price_collection_tasks")
      .select("id, task_code, keyword, target_type, status")
      .eq("organization_id", access.organizationId)
      .or(`task_code.ilike.${pattern},keyword.ilike.${pattern},specification.ilike.${pattern}`)
      .limit(4),
  ]);

  const queryResults = [equipment, materials, suppliers, inquiries, projects, reports, aiTasks];
  const firstError = queryResults.find((result) => result.error)?.error;
  if (queryResults.every((result) => result.error)) {
    return NextResponse.json({ error: firstError?.message || "当前账户无可搜索的数据范围" }, { status: 500 });
  }

  const results: GlobalSearchResult[] = [
    ...(equipment.data ?? []).map((item) => ({
      id: item.id,
      type: "equipment" as const,
      title: item.equipment_name,
      subtitle: [item.price_code, item.brand, item.model].filter(Boolean).join(" · "),
      href: `/equipment-prices/${encodeURIComponent(item.price_code)}`,
    })),
    ...(materials.data ?? []).map((item) => ({
      id: item.id,
      type: "material" as const,
      title: item.material_name,
      subtitle: [item.price_code, item.specification, item.region].filter(Boolean).join(" · "),
      href: `/material-prices/${encodeURIComponent(item.price_code)}`,
    })),
    ...(suppliers.data ?? []).map((item) => ({
      id: item.id,
      type: "supplier" as const,
      title: item.name,
      subtitle: [item.supplier_code, item.category, item.region].filter(Boolean).join(" · "),
      href: `/suppliers/${encodeURIComponent(item.supplier_code)}`,
    })),
    ...(inquiries.data ?? []).map((item) => ({
      id: item.id,
      type: "inquiry" as const,
      title: item.subject,
      subtitle: `${item.inquiry_code} · ${item.status}`,
      href: `/inquiries/${encodeURIComponent(item.inquiry_code)}`,
    })),
    ...(projects.data ?? []).map((item) => ({
      id: item.id,
      type: "project" as const,
      title: item.name,
      subtitle: `${item.project_code} · ${item.status}`,
      href: `/project-pricing/${encodeURIComponent(item.project_code)}`,
    })),
    ...(reports.data ?? []).map((item) => ({
      id: item.id,
      type: "report" as const,
      title: item.title,
      subtitle: `${item.report_code} · ${item.report_type}`,
      href: `/reports/${encodeURIComponent(item.report_code)}`,
    })),
    ...(aiTasks.data ?? []).map((item) => ({
      id: item.id,
      type: "ai_task" as const,
      title: item.keyword,
      subtitle: `${item.task_code} · ${item.target_type} · ${item.status}`,
      href: `/ai-price-collection/tasks/${encodeURIComponent(item.id)}`,
    })),
  ];

  return NextResponse.json({ results: results.slice(0, 20) });
}
