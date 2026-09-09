import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };
const writableRoles = new Set(["admin", "manager", "editor"]);

async function resolveCatalog(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  id: string,
) {
  return access.supabase
    .from("wpi_equipment_catalog")
    .select("id,catalog_code,equipment_name")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
}

async function serializeImages(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  rows: Array<Record<string, unknown>>,
) {
  return Promise.all(
    rows.map(async (row) => {
      const signed = await access.supabase.storage
        .from(String(row.bucket_id))
        .createSignedUrl(String(row.object_path), 600);
      return {
        id: String(row.id),
        name: String(row.original_name),
        contentType: String(row.content_type ?? ""),
        size: Number(row.size_bytes ?? 0),
        verificationStatus: String(row.verification_status ?? "pending"),
        sourceUrl:
          row.metadata && typeof row.metadata === "object"
            ? String((row.metadata as Record<string, unknown>).sourceUrl ?? "")
            : "",
        createdAt: String(row.created_at ?? ""),
        url: signed.data?.signedUrl ?? "",
      };
    }),
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
  const { id } = await context.params;
  const catalog = await resolveCatalog(access, id);
  if (catalog.error) {
    return NextResponse.json({ error: catalog.error.message }, { status: 500 });
  }
  if (!catalog.data) {
    return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });
  }

  const images = await access.supabase
    .from("wpi_attachments")
    .select(
      "id,bucket_id,object_path,original_name,content_type,size_bytes,verification_status,metadata,created_at",
    )
    .eq("organization_id", access.organizationId)
    .eq("related_type", "equipment_catalog")
    .eq("related_id", id)
    .eq("status", "active")
    .like("content_type", "image/%")
    .order("created_at", { ascending: false });
  if (images.error) {
    return NextResponse.json({ error: images.error.message }, { status: 500 });
  }
  return NextResponse.json({
    data: await serializeImages(access, images.data ?? []),
    source: "supabase",
  });
}

export async function POST(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
  if (!writableRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有设备图片登记权限" },
      { status: 403 },
    );
  }
  const { id } = await context.params;
  const catalog = await resolveCatalog(access, id);
  if (catalog.error) {
    return NextResponse.json({ error: catalog.error.message }, { status: 500 });
  }
  if (!catalog.data) {
    return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });
  }

  const body = (await request.json()) as {
    bucket?: string;
    path?: string;
    name?: string;
    contentType?: string;
    size?: number;
    sourceUrl?: string;
  };
  const expectedPrefix = `${access.organizationId}/equipment-catalog-images-${id}/`;
  if (
    body.bucket !== "business-documents" ||
    !body.path?.startsWith(expectedPrefix) ||
    !body.name?.trim() ||
    !body.contentType?.startsWith("image/")
  ) {
    return NextResponse.json(
      { error: "设备图片存储信息不完整或路径不匹配" },
      { status: 400 },
    );
  }

  const storageCheck = await access.supabase.storage
    .from("business-documents")
    .createSignedUrl(body.path, 60);
  if (storageCheck.error) {
    return NextResponse.json(
      { error: "Storage 中未找到待登记图片" },
      { status: 400 },
    );
  }

  const inserted = await access.supabase
    .from("wpi_attachments")
    .insert({
      organization_id: access.organizationId,
      bucket_id: "business-documents",
      object_path: body.path,
      original_name: body.name.trim(),
      content_type: body.contentType,
      size_bytes: Math.max(0, Math.round(Number(body.size) || 0)),
      related_type: "equipment_catalog",
      related_id: id,
      evidence_type: "other",
      status: "active",
      verification_status: "pending",
      metadata: {
        purpose: "equipment_primary_image",
        sourceUrl: body.sourceUrl?.trim() || null,
        catalogCode: catalog.data.catalog_code,
        source: "equipment-catalog-detail",
      },
      uploaded_by: access.userId,
    })
    .select(
      "id,bucket_id,object_path,original_name,content_type,size_bytes,verification_status,metadata,created_at",
    )
    .single();
  if (inserted.error) {
    return NextResponse.json(
      { error: inserted.error.message },
      { status: 400 },
    );
  }
  const [image] = await serializeImages(access, [inserted.data]);
  return NextResponse.json(
    { data: image, source: "supabase" },
    { status: 201 },
  );
}
