import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type InquiryActionBody = {
  action?: "send_reminder" | "record_export";
  inquiryIds?: string[];
};

function isUuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!["admin", "manager", "editor", "reviewer"].includes(access.role)) {
    return NextResponse.json({ error: "当前角色没有询价任务操作权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as InquiryActionBody | null;
  if (!body?.action || !["send_reminder", "record_export"].includes(body.action)) {
    return NextResponse.json({ error: "不支持的询价操作" }, { status: 400 });
  }
  const identifiers = [...new Set((body.inquiryIds ?? []).filter(Boolean))].slice(0, 100);
  if (!identifiers.length) {
    return NextResponse.json({ error: "请至少选择一个询价任务" }, { status: 400 });
  }

  const uuidIds = identifiers.filter(isUuid);
  const codes = identifiers.filter((item) => !isUuid(item));
  let query = access.supabase
    .from("wpi_inquiries")
    .select("id, inquiry_code, metadata")
    .eq("organization_id", access.organizationId);
  if (uuidIds.length && codes.length) {
    query = query.or(`id.in.(${uuidIds.join(",")}),inquiry_code.in.(${codes.map((code) => `\"${code.replaceAll('"', '')}\"`).join(",")})`);
  } else if (uuidIds.length) {
    query = query.in("id", uuidIds);
  } else {
    query = query.in("inquiry_code", codes);
  }
  const inquiryResult = await query;
  if (inquiryResult.error) return NextResponse.json({ error: inquiryResult.error.message }, { status: 500 });
  if (!inquiryResult.data?.length) return NextResponse.json({ error: "未找到可操作的询价任务" }, { status: 404 });

  const now = new Date().toISOString();
  let affectedSuppliers = 0;
  for (const inquiry of inquiryResult.data) {
    const metadata = inquiry.metadata && typeof inquiry.metadata === "object"
      ? inquiry.metadata as Record<string, unknown>
      : {};
    const actionMetadata = body.action === "send_reminder"
      ? {
          ...metadata,
          lastReminderAt: now,
          reminderCount: Number(metadata.reminderCount ?? 0) + 1,
          reminderStatus: "queued_for_manual_delivery",
        }
      : {
          ...metadata,
          lastListExportAt: now,
          listExportCount: Number(metadata.listExportCount ?? 0) + 1,
        };
    const { error } = await access.supabase
      .from("wpi_inquiries")
      .update({ metadata: actionMetadata, updated_by: access.userId, updated_at: now })
      .eq("organization_id", access.organizationId)
      .eq("id", inquiry.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.action === "send_reminder") {
      const supplierResult = await access.supabase
        .from("wpi_inquiry_suppliers")
        .select("supplier_id, metadata")
        .eq("organization_id", access.organizationId)
        .eq("inquiry_id", inquiry.id)
        .not("response_status", "in", "(responded,quoted,completed)");
      if (supplierResult.error) return NextResponse.json({ error: supplierResult.error.message }, { status: 500 });
      for (const supplier of supplierResult.data ?? []) {
        const supplierMetadata = supplier.metadata && typeof supplier.metadata === "object"
          ? supplier.metadata as Record<string, unknown>
          : {};
        const updateResult = await access.supabase
          .from("wpi_inquiry_suppliers")
          .update({
            metadata: {
              ...supplierMetadata,
              lastReminderAt: now,
              reminderCount: Number(supplierMetadata.reminderCount ?? 0) + 1,
              deliveryStatus: "pending_manual_send",
            },
          })
          .eq("organization_id", access.organizationId)
          .eq("inquiry_id", inquiry.id)
          .eq("supplier_id", supplier.supplier_id);
        if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
        affectedSuppliers += 1;
      }
    }
  }

  return NextResponse.json({
    data: {
      action: body.action,
      inquiryCount: inquiryResult.data.length,
      supplierCount: affectedSuppliers,
      createdAt: now,
      deliveryMode: body.action === "send_reminder" ? "manual_queue" : null,
    },
    source: "supabase",
  });
}
