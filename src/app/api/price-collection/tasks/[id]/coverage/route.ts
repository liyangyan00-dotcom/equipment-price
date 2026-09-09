import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildCoverage, validateCoveragePlan, type CoverageLead } from "@/lib/priceCollection/coverage";

type Context = { params: Promise<{ id: string }> };
const writable = new Set(["admin", "manager", "editor"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: Context) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "任务编号无效" }, { status: 400 });
  try {
    const task = await access.supabase.from("wpi_price_collection_tasks").select("config,updated_at,target_type,archived_at").eq("organization_id", access.organizationId).eq("id", id).maybeSingle();
    if (task.error) throw task.error;
    if (!task.data) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    const projects: { id: string; name: string; project_code: string }[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await access.supabase.from("wpi_projects").select("id,name,project_code").eq("organization_id", access.organizationId).order("id").range(offset, offset + 499);
      if (result.error) throw result.error;
      projects.push(...(result.data || []));
      if ((result.data?.length || 0) < 500) break;
      if (offset >= 9500) throw new Error("项目数量超出查询上限");
    }
    const saved = task.data.config?.coveragePlan;
    const plan = saved ? validateCoveragePlan(saved) : null;
    let coverage = null;
    if (plan) {
      const leads: CoverageLead[] = [];
      // Read beyond the current UI page, including shared leads retained by other tasks.
      for (let offset = 0; ; offset += 500) {
        const result = await access.supabase.from("wpi_price_collection_leads")
          .select("id,name,specification,region,quote_date,status,price_validity_status,evidence_code")
          .eq("organization_id", access.organizationId).eq("target_type", task.data.target_type)
          .order("id").range(offset, offset + 499);
        if (result.error) throw result.error;
        leads.push(...(result.data || []));
        if ((result.data?.length || 0) < 500) break;
        if (offset >= 19500) throw new Error("线索超过 20000 条，覆盖统计暂不可用，请缩小服务端查询范围");
      }
      coverage = buildCoverage(plan, leads);
    }
    return NextResponse.json({ plan, coverage, projects, version: task.data.updated_at, canWrite: writable.has(access.role) && !task.data.archived_at });
  } catch {
    return NextResponse.json({ error: "覆盖数据读取失败或超过安全上限，请重试；未返回不完整统计" }, { status: 503 });
  }
}

export async function PUT(request: Request, context: Context) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writable.has(access.role)) return NextResponse.json({ error: "无修改权限" }, { status: 403 });
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "任务编号无效" }, { status: 400 });
  let plan;
  let version;
  try {
    const body = await request.json();
    plan = validateCoveragePlan(body.plan);
    version = body.version;
    if (typeof version !== "string" || !Number.isFinite(Date.parse(version))) throw new Error("缺少有效版本，请刷新后重试");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "请求无效" }, { status: 400 });
  }
  const task = await access.supabase.from("wpi_price_collection_tasks").select("config,updated_at,archived_at").eq("organization_id", access.organizationId).eq("id", id).maybeSingle();
  if (task.error) return NextResponse.json({ error: "读取任务失败" }, { status: 503 });
  if (!task.data) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (task.data.archived_at || task.data.updated_at !== version) return NextResponse.json({ error: "任务已归档或发生变化，请刷新后重试" }, { status: 409 });
  if (plan.projectId) {
    const project = await access.supabase.from("wpi_projects").select("id").eq("organization_id", access.organizationId).eq("id", plan.projectId).maybeSingle();
    if (project.error) return NextResponse.json({ error: "项目校验失败" }, { status: 503 });
    if (!project.data) return NextResponse.json({ error: "关联项目不存在或无权访问" }, { status: 400 });
  }
  // Preserve collector configuration; the existing task audit trigger records this change.
  const result = await access.supabase.from("wpi_price_collection_tasks")
    .update({ config: { ...task.data.config, coveragePlan: plan } })
    .eq("organization_id", access.organizationId).eq("id", id).eq("updated_at", version).is("archived_at", null).select("id").maybeSingle();
  if (result.error) return NextResponse.json({ error: "保存失败，原配置未被替换" }, { status: 503 });
  if (!result.data) return NextResponse.json({ error: "任务已变化，请刷新后重试" }, { status: 409 });
  return NextResponse.json({ saved: true });
}
