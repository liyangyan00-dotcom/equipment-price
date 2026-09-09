import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";

const writeRoles = new Set(["admin", "manager", "editor", "reviewer"]);
const bucket = "business-documents";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!writeRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有设备文档上传权限" }, { status: 403 });
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择 PDF 文件" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "仅支持 PDF 技术文档" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF 文件必须小于 50MB" }, { status: 400 });
  }
  const signature = new TextDecoder().decode(new Uint8Array(await file.slice(0, 5).arrayBuffer()));
  if (signature !== "%PDF-") {
    return NextResponse.json({ error: "文件内容不是有效 PDF" }, { status: 400 });
  }

  const catalog = await access.supabase.from("wpi_equipment_catalog")
    .select("id,equipment_name,brand,model")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (catalog.error) return NextResponse.json({ error: catalog.error.message }, { status: 500 });
  if (!catalog.data) return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });

  const path = buildBusinessObjectPath(access.organizationId, `equipment-catalog/${id}`, file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploaded = await access.supabase.storage.from(bucket).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploaded.error) return NextResponse.json({ error: uploaded.error.message }, { status: 500 });

  const storageUrl = `storage://${bucket}/${path}`;
  let sourceId = "";
  let jobId = "";
  try {
    const source = await access.supabase.from("wpi_equipment_catalog_sources").insert({
      organization_id: access.organizationId,
      equipment_catalog_id: id,
      source_type: "pdf",
      source_title: file.name.slice(0, 300),
      source_url: null,
      language: "zh-CN",
      confidence: 100,
      review_status: "pending_review",
      metadata: {
        storageBucket: bucket,
        storagePath: path,
        uploadedFromAuthenticatedPortal: true,
        originalPortal: "Hach China",
      },
      created_by: access.userId,
      updated_by: access.userId,
    }).select("id").single();
    if (source.error || !source.data) throw new Error(source.error?.message || "无法登记 PDF 来源");
    sourceId = source.data.id;

    const job = await access.supabase.from("wpi_equipment_catalog_document_jobs").insert({
      organization_id: access.organizationId,
      equipment_catalog_id: id,
      source_id: sourceId,
      document_url: storageUrl,
      file_name: file.name.slice(0, 300),
      mime_type: "application/pdf",
      status: "queued",
      progress: 0,
      requested_by: access.userId,
      metadata: {
        storageBucket: bucket,
        storagePath: path,
        uploadedFromAuthenticatedPortal: true,
        requiresHumanReview: true,
        equipmentName: catalog.data.equipment_name,
        brand: catalog.data.brand,
        model: catalog.data.model,
      },
    }).select("id").single();
    if (job.error || !job.data) throw new Error(job.error?.message || "无法创建 PDF 解析任务");
    jobId = job.data.id;

    const fileRoute = `/api/equipment-catalog/${encodeURIComponent(id)}/documents/${encodeURIComponent(jobId)}/file`;
    const sourceUpdated = await access.supabase.from("wpi_equipment_catalog_sources")
      .update({ source_url: fileRoute, updated_by: access.userId })
      .eq("id", sourceId);
    if (sourceUpdated.error) throw sourceUpdated.error;

    const invoked = await access.supabase.functions.invoke("wpi-equipment-document-worker", {
      body: { organizationId: access.organizationId, jobId, limit: 1 },
    });
    if (invoked.error) throw invoked.error;
    if (invoked.data?.error) throw new Error(String(invoked.data.error));
    const result = invoked.data?.data?.results?.[0];
    if (result?.status === "failed") throw new Error(result.error || "PDF 设备资料解析失败");

    return NextResponse.json({
      data: {
        jobId,
        sourceId,
        status: result?.status || "running",
        parameterCount: result?.parameterCount ?? 0,
        pendingCount: result?.pendingCount ?? 0,
      },
      source: "supabase-storage",
    });
  } catch (error) {
    if (jobId) {
      await access.supabase.from("wpi_equipment_catalog_document_jobs").update({
        status: "failed",
        progress: 100,
        error_message: error instanceof Error ? error.message : "PDF 上传解析失败",
      }).eq("id", jobId);
    } else {
      if (sourceId) await access.supabase.from("wpi_equipment_catalog_sources").delete().eq("id", sourceId);
      await access.supabase.storage.from(bucket).remove([path]);
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "PDF 上传解析失败" }, { status: 400 });
  }
}
