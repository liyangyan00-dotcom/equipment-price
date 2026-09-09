import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildBusinessObjectPath } from "@/lib/storage/businessFiles";

const writableRoles = new Set(["admin", "manager", "editor"]);
const allowedExtensions = new Set([
  "pdf",
  "xlsx",
  "docx",
  "jpg",
  "jpeg",
  "png",
]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const BUCKET = "business-documents";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(request: Request) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!writableRoles.has(access.role)) {
    return NextResponse.json({ error: "当前角色没有附件上传权限" }, { status: 403 });
  }

  const body = (await request.json()) as {
    fileName?: string;
    fileSize?: number;
    contentType?: string;
    equipmentPriceId?: string;
  };
  const fileName = body.fileName?.trim() ?? "";
  const fileSize = Math.round(Number(body.fileSize) || 0);
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (!fileName || !allowedExtensions.has(extension)) {
    return NextResponse.json(
      { error: "仅支持 PDF、XLSX、DOCX、JPG、JPEG、PNG 文件" },
      { status: 400 }
    );
  }
  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "单个附件必须小于 20 MB" }, { status: 400 });
  }

  const requestedPriceId = body.equipmentPriceId?.trim() || "draft";
  let priceId = "draft";
  if (requestedPriceId !== "draft") {
    const query = () =>
      access.supabase
        .from("wpi_equipment_prices")
        .select("id")
        .eq("organization_id", access.organizationId)
        .is("deleted_at", null);
    let priceResult = isUuid(requestedPriceId)
      ? await query().eq("id", requestedPriceId).maybeSingle()
      : await query().eq("legacy_id", requestedPriceId).maybeSingle();
    if (!priceResult.data && !priceResult.error) {
      priceResult = await query().eq("price_code", requestedPriceId).maybeSingle();
    }
    if (priceResult.error) {
      return NextResponse.json({ error: priceResult.error.message }, { status: 500 });
    }
    if (!priceResult.data) {
      return NextResponse.json({ error: "设备价格记录不存在" }, { status: 404 });
    }

    const { data: review, error: reviewError } = await access.supabase
      .from("wpi_equipment_price_reviews")
      .select("status")
      .eq("organization_id", access.organizationId)
      .eq("equipment_price_id", priceResult.data.id)
      .maybeSingle();
    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }
    if (review && ["pending", "in_review"].includes(review.status)) {
      return NextResponse.json(
        { error: "该价格正在审核中，证据链已冻结；如需补充请先退回补正" },
        { status: 409 }
      );
    }
    if (review && ["approved", "rejected", "archived"].includes(review.status)) {
      return NextResponse.json(
        { error: "该价格已终审，请创建新版本后补充证据" },
        { status: 409 }
      );
    }
    priceId = priceResult.data.id;
  }
  const path = buildBusinessObjectPath(
    access.organizationId,
    `equipment-price-evidence/${priceId}`,
    fileName
  );

  return NextResponse.json({
    upload: {
      bucket: BUCKET,
      path,
      contentType: body.contentType || "application/octet-stream",
    },
    organizationId: access.organizationId,
  });
}
