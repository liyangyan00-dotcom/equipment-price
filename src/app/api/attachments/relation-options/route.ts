import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

function cleanKeyword(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const keyword = cleanKeyword(request.nextUrl.searchParams.get("q") ?? "");
  const type = request.nextUrl.searchParams.get("type") ?? "all";
  const pattern = `%${keyword}%`;

  const [equipment, materials, inquiries, projects, reports] = await Promise.all([
    type === "all" || type === "equipment_price" ? access.supabase.from("wpi_equipment_prices")
      .select("id,price_code,equipment_name,brand,model").eq("organization_id", access.organizationId)
      .or(`price_code.ilike.${pattern},equipment_name.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern}`).limit(8) : Promise.resolve({ data: [], error: null }),
    type === "all" || type === "material_price" ? access.supabase.from("wpi_material_prices")
      .select("id,price_code,material_name,specification,region").eq("organization_id", access.organizationId)
      .or(`price_code.ilike.${pattern},material_name.ilike.${pattern},specification.ilike.${pattern},region.ilike.${pattern}`).limit(8) : Promise.resolve({ data: [], error: null }),
    type === "all" || type === "inquiry" ? access.supabase.from("wpi_inquiries")
      .select("id,inquiry_code,subject,status").eq("organization_id", access.organizationId)
      .or(`inquiry_code.ilike.${pattern},subject.ilike.${pattern}`).limit(8) : Promise.resolve({ data: [], error: null }),
    type === "all" || type === "project" ? access.supabase.from("wpi_projects")
      .select("id,project_code,name,status").eq("organization_id", access.organizationId)
      .or(`project_code.ilike.${pattern},name.ilike.${pattern}`).limit(8) : Promise.resolve({ data: [], error: null }),
    type === "all" || type === "report" ? access.supabase.from("wpi_reports")
      .select("id,report_code,title,report_type").eq("organization_id", access.organizationId)
      .or(`report_code.ilike.${pattern},title.ilike.${pattern}`).limit(8) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = equipment.error || materials.error || inquiries.error || projects.error || reports.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: [
    ...(equipment.data ?? []).map((item) => ({ id: item.id, type: "equipment_price", label: item.equipment_name, code: item.price_code, detail: [item.brand, item.model].filter(Boolean).join(" · ") })),
    ...(materials.data ?? []).map((item) => ({ id: item.id, type: "material_price", label: item.material_name, code: item.price_code, detail: [item.specification, item.region].filter(Boolean).join(" · ") })),
    ...(inquiries.data ?? []).map((item) => ({ id: item.id, type: "inquiry", label: item.subject, code: item.inquiry_code, detail: item.status })),
    ...(projects.data ?? []).map((item) => ({ id: item.id, type: "project", label: item.name, code: item.project_code, detail: item.status })),
    ...(reports.data ?? []).map((item) => ({ id: item.id, type: "report", label: item.title, code: item.report_code, detail: item.report_type })),
  ].slice(0, 24), source: "supabase" });
}
