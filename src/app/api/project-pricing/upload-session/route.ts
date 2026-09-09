import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";
import { createProjectCode, projectPricingWriteRoles } from "@/lib/projectPricing/server";

const allowed = new Set(["xlsx", "csv"]);
const bucket = "business-documents";

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!projectPricingWriteRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有 BOQ 上传权限" }, { status: 403 });
  const body = await request.json() as { projectId?: string; projectName?: string; projectStage?: string; country?: string; targetRegion?: string; baseCurrency?: string; priceTerm?: string; exchangeRate?: number; exchangeRateDate?: string; validUntil?: string; includeTax?: boolean; includeFreight?: boolean; fileName?: string; fileSize?: number; contentType?: string };
  const fileName = body.fileName?.trim() ?? "";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!fileName || !allowed.has(extension)) return NextResponse.json({ error: "请选择 .xlsx 或 .csv BOQ 文件" }, { status: 400 });
  if (!body.fileSize || body.fileSize > 50 * 1024 * 1024) return NextResponse.json({ error: "BOQ 文件必须小于 50 MB" }, { status: 400 });

  let projectId = body.projectId;
  if (!projectId) {
    if (!body.projectName?.trim() || !body.targetRegion?.trim()) return NextResponse.json({ error: "项目名称和目标地区为必填项" }, { status: 400 });
    const exchangeRate = Number(body.exchangeRate);
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return NextResponse.json({ error: "请输入有效汇率" }, { status: 400 });
    const created = await access.supabase.from("wpi_projects").insert({
      organization_id: access.organizationId,
      project_code: createProjectCode(),
      name: body.projectName?.trim() || fileName.replace(/\.(xlsx|csv)$/i, ""),
      project_stage: body.projectStage || "budgeting",
      base_currency: body.baseCurrency?.trim().toUpperCase() || "USD",
      price_term: body.priceTerm || "CIF",
      exchange_rate: exchangeRate,
      valid_until: body.validUntil || null,
      status: "draft",
      created_by: access.userId,
      updated_by: access.userId,
      metadata: {
        source: "boq_upload",
        country: body.country?.trim() || "刚果金",
        targetRegion: body.targetRegion.trim(),
        exchangeRateDate: body.exchangeRateDate || null,
        includeTax: body.includeTax === true,
        includeFreight: body.includeFreight === true,
      },
    }).select().single();
    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 400 });
    projectId = created.data.id;
  } else {
    const owned = await access.supabase.from("wpi_projects").select("id")
      .eq("organization_id", access.organizationId).eq("id", projectId).maybeSingle();
    if (owned.error || !owned.data) return NextResponse.json({ error: "项目套价方案不存在" }, { status: 404 });
  }

  const path = buildBusinessObjectPath(access.organizationId, `project-pricing/${projectId}`, `boq.${extension}`);
  return NextResponse.json({
    data: { projectId },
    upload: { bucket, path, contentType: body.contentType || (extension === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") },
  });
}
