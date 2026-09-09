import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";

type RouteContext = { params: Promise<{ id: string }> };

const writableRoles = new Set(["admin", "manager", "editor"]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const maxFileSize = 8 * 1024 * 1024;

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
      { error: "当前角色没有设备图片上传权限" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const catalog = await access.supabase
    .from("wpi_equipment_catalog")
    .select("id")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (catalog.error) {
    return NextResponse.json({ error: catalog.error.message }, { status: 500 });
  }
  if (!catalog.data) {
    return NextResponse.json({ error: "设备资料不存在" }, { status: 404 });
  }

  const body = (await request.json()) as {
    fileName?: string;
    fileSize?: number;
    contentType?: string;
  };
  const fileName = body.fileName?.trim() ?? "";
  const fileSize = Math.round(Number(body.fileSize) || 0);
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!fileName || !allowedExtensions.has(extension)) {
    return NextResponse.json(
      { error: "仅支持 JPG、JPEG、PNG、WEBP 产品图片" },
      { status: 400 },
    );
  }
  if (fileSize <= 0 || fileSize > maxFileSize) {
    return NextResponse.json(
      { error: "单张图片必须小于 8 MB" },
      { status: 400 },
    );
  }

  const path = buildBusinessObjectPath(
    access.organizationId,
    `equipment-catalog-images-${id}`,
    fileName,
  );
  return NextResponse.json({
    upload: {
      bucket: "business-documents",
      path,
      contentType: body.contentType || "application/octet-stream",
    },
  });
}
