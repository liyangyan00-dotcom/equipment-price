import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { isProjectBoqObjectPath } from "@/lib/projectPricing/boqStorage";
import { parseBoqWorkbook } from "@/lib/imports/parseBoqWorkbook";
import { loadProjectPricing, projectPricingWriteRoles } from "@/lib/projectPricing/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!projectPricingWriteRoles.has(access.role)) return NextResponse.json({ error: "当前角色没有 BOQ 解析权限" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json() as { bucket?: string; path?: string; fileName?: string; contentType?: string; fileSize?: number };
  if (body.bucket !== "business-documents" || !body.path || !body.fileName) return NextResponse.json({ error: "BOQ 文件信息不完整" }, { status: 400 });
  if (!isProjectBoqObjectPath(body.path, access.organizationId, id)) return NextResponse.json({ error: "文件路径不属于当前项目" }, { status: 403 });

  const downloaded = await access.supabase.storage.from(body.bucket).download(body.path);
  if (downloaded.error) return NextResponse.json({ error: downloaded.error.message }, { status: 400 });
  let parsed;
  try {
    parsed = await parseBoqWorkbook(new Uint8Array(await downloaded.data.arrayBuffer()), body.fileName);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "BOQ 解析失败" }, { status: 400 });
  }

  const attachment = await access.supabase.from("wpi_attachments").insert({
    organization_id: access.organizationId,
    bucket_id: body.bucket,
    object_path: body.path,
    original_name: body.fileName,
    content_type: body.contentType || "application/octet-stream",
    size_bytes: body.fileSize || 0,
    related_type: "project_pricing",
    related_id: id,
    evidence_type: "other",
    metadata: { documentPurpose: "boq_source" },
    uploaded_by: access.userId,
  }).select().single();
  if (attachment.error) return NextResponse.json({ error: attachment.error.message }, { status: 400 });

  const deleted = await access.supabase.from("wpi_project_pricing_items").delete()
    .eq("organization_id", access.organizationId).eq("project_id", id);
  if (deleted.error) return NextResponse.json({ error: deleted.error.message }, { status: 400 });
  const inserted = await access.supabase.from("wpi_project_pricing_items").insert(parsed.map((item) => ({
    organization_id: access.organizationId,
    project_id: id,
    boq_code: item.boqCode,
    line_no: item.lineNo,
    item_name: item.itemName,
    specification: item.specification,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    created_by: access.userId,
    updated_by: access.userId,
    metadata: { sourceFile: body.fileName, sourceAttachmentId: attachment.data.id },
  }))).select();
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });

  const existingProject = await access.supabase.from("wpi_projects").select("metadata")
    .eq("organization_id", access.organizationId).eq("id", id).maybeSingle();
  if (existingProject.error || !existingProject.data) return NextResponse.json({ error: existingProject.error?.message || "项目套价方案不存在" }, { status: 404 });
  const updated = await access.supabase.from("wpi_projects").update({
    boq_attachment_id: attachment.data.id,
    boq_data: parsed,
    pricing_result: { totalItems: parsed.length, matchedItems: 0, gapItems: parsed.length, sourceAttachmentId: attachment.data.id },
    status: "pending_review",
    updated_by: access.userId,
    metadata: {
      ...((existingProject.data.metadata as Record<string, unknown> | null) ?? {}),
      sourceFile: body.fileName,
      parsedAt: new Date().toISOString(),
    },
  }).eq("organization_id", access.organizationId).eq("id", id);
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });

  let aiTask: Record<string, unknown> | null = null;
  let aiQueueError: string | null = null;
  try {
    const invoked = await access.supabase.functions.invoke("wpi-ai-gateway", {
      body: {
        action: "enqueue_task",
        organizationId: access.organizationId,
        workflowKey: "boq_parsing",
        title: `BOQ 解析复核：${body.fileName}`,
        sourceLabel: body.fileName,
        businessObjectType: "project_pricing",
        businessObjectId: id,
        businessHref: `/project-pricing/boq-parse?projectId=${encodeURIComponent(id)}`,
        idempotencyKey: `boq-parsing-${id}-${attachment.data.id}`,
        input: {
          projectId: id,
          sourceAttachmentId: attachment.data.id,
          sourceFile: body.fileName,
          itemCount: parsed.length,
          parsedItems: parsed.slice(0, 200).map((item) => ({
            boqCode: item.boqCode,
            lineNo: item.lineNo,
            itemName: item.itemName,
            specification: item.specification,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
          })),
          instruction: "复核 BOQ 行项目名称、规格、分类、数量与单位，标记缺失和异常字段。不得直接确认套价或写入正式价格库。",
        },
      },
    });
    if (invoked.error) throw invoked.error;
    aiTask = (invoked.data?.data as Record<string, unknown> | undefined) ?? null;
  } catch (error) {
    aiQueueError = error instanceof Error ? error.message : "BOQ AI 复核任务排队失败";
  }

  const latestProject = await access.supabase.from("wpi_projects").select("metadata")
    .eq("organization_id", access.organizationId).eq("id", id).maybeSingle();
  if (!latestProject.error && latestProject.data) {
    await access.supabase.from("wpi_projects").update({
      metadata: {
        ...((latestProject.data.metadata as Record<string, unknown> | null) ?? {}),
        aiBoqTaskId: typeof aiTask?.id === "string" ? aiTask.id : null,
        aiBoqTaskQueued: Boolean(aiTask?.id),
        aiBoqQueueError: aiQueueError,
      },
      updated_by: access.userId,
    }).eq("organization_id", access.organizationId).eq("id", id);
  }
  const data = await loadProjectPricing(access.supabase, access.organizationId, id);
  return NextResponse.json({ data, aiTask, aiQueueError, source: "supabase" });
}
