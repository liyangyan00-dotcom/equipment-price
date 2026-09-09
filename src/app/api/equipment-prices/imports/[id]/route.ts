import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  EquipmentImportBatchDetail,
  EquipmentImportMapping,
  EquipmentImportRow,
  EquipmentImportValidationStatus,
} from "@/types/equipmentImport";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const writeRoles = new Set(["admin", "manager", "editor"]);
const editableValidationStatuses = new Set<EquipmentImportValidationStatus>([
  "valid",
  "warning",
  "error",
  "duplicate",
  "ignored",
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function readString(
  value: Record<string, unknown>,
  key: string,
  fallback = ""
) {
  return typeof value[key] === "string" ? (value[key] as string) : fallback;
}

function readNumber(value: Record<string, unknown>, key: string) {
  const item = value[key];
  return typeof item === "number" ? item : Number(item) || 0;
}

function mapRow(
  row: Record<string, unknown>,
  review?: Record<string, unknown>
): EquipmentImportRow {
  const normalized =
    row.normalized_data &&
    typeof row.normalized_data === "object" &&
    !Array.isArray(row.normalized_data)
      ? (row.normalized_data as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    rowNumber: Number(row.row_number),
    equipmentName: readString(normalized, "equipment_name"),
    model: readString(normalized, "model"),
    brand: readString(normalized, "brand"),
    category: readString(normalized, "category"),
    originalPrice: readNumber(normalized, "original_price"),
    currency: readString(normalized, "original_currency", "USD"),
    supplier: readString(normalized, "supplier_name"),
    quoteDate: readString(normalized, "quote_date"),
    status: row.validation_status as EquipmentImportValidationStatus,
    confidence: Number(row.confidence) || 0,
    issues: Array.isArray(row.issues)
      ? row.issues.filter((item): item is string => typeof item === "string")
      : [],
    selected: Boolean(row.is_selected),
    reviewTaskId: review?.id ? String(review.id) : null,
    reviewStatus: review?.status
      ? (String(review.status) as EquipmentImportRow["reviewStatus"])
      : null,
    equipmentPriceId:
      typeof row.equipment_price_id === "string"
        ? row.equipment_price_id
        : null,
    reviewedAt:
      typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    reviewComment:
      typeof row.review_comment === "string" ? row.review_comment : null,
  };
}

function mapMapping(row: Record<string, unknown>): EquipmentImportMapping {
  return {
    id: String(row.id),
    sourceField: String(row.source_field),
    systemField: typeof row.system_field === "string" ? row.system_field : "",
    sampleValue: typeof row.sample_value === "string" ? row.sample_value : "",
    confidence: Number(row.confidence) || 0,
    status: row.mapping_status as EquipmentImportMapping["status"],
    required: Boolean(row.is_required),
    userModified: Boolean(row.user_modified),
  };
}

async function resolveBatch(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  id: string
) {
  let query = access.supabase
    .from("wpi_equipment_import_batches")
    .select("*")
    .eq("organization_id", access.organizationId);
  query = isUuid(id) ? query.eq("id", id) : query.eq("batch_code", id);
  return query.maybeSingle();
}

async function refreshBatchCounts(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  batchId: string
) {
  const { data: rows, error } = await access.supabase
    .from("wpi_equipment_import_rows")
    .select("validation_status,is_selected")
    .eq("batch_id", batchId)
    .eq("organization_id", access.organizationId);
  if (error) throw error;

  const counts = (rows ?? []).reduce(
    (result, row) => {
      const status = row.validation_status as EquipmentImportValidationStatus;
      result[status] += 1;
      if (row.is_selected) result.selected += 1;
      return result;
    },
    {
      valid: 0,
      warning: 0,
      error: 0,
      duplicate: 0,
      ignored: 0,
      submitted: 0,
      imported: 0,
      selected: 0,
    }
  );

  const { data: batch, error: batchError } = await access.supabase
    .from("wpi_equipment_import_batches")
    .update({
      total_rows: rows?.length ?? 0,
      valid_rows: counts.valid,
      warning_rows: counts.warning,
      error_rows: counts.error,
      duplicate_rows: counts.duplicate,
      needs_review_rows:
        counts.warning + counts.error + counts.duplicate,
      selected_rows: counts.selected,
    })
    .eq("id", batchId)
    .eq("organization_id", access.organizationId)
    .select()
    .single();
  if (batchError) throw batchError;
  return batch;
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const { data: batch, error: batchError } = await resolveBatch(access, id);
  if (batchError) {
    return NextResponse.json(
      { error: "暂时无法读取导入批次，请稍后重试" },
      { status: 500 }
    );
  }
  if (!batch) {
    return NextResponse.json(
      { error: "该导入批次不存在，可能已被删除或当前账号无权访问" },
      { status: 404 }
    );
  }

  const [rowsResult, mappingsResult, profileResult] = await Promise.all([
    access.supabase
      .from("wpi_equipment_import_rows")
      .select("*")
      .eq("batch_id", batch.id)
      .eq("organization_id", access.organizationId)
      .order("row_number", { ascending: true }),
    access.supabase
      .from("wpi_import_field_mappings")
      .select("*")
      .eq("batch_id", batch.id)
      .eq("organization_id", access.organizationId)
      .order("created_at", { ascending: true }),
    access.supabase
      .from("wpi_profiles")
      .select("display_name")
      .eq("id", batch.created_by)
      .maybeSingle(),
  ]);

  if (rowsResult.error || mappingsResult.error) {
    return NextResponse.json(
      { error: rowsResult.error?.message || mappingsResult.error?.message },
      { status: 500 }
    );
  }

  const rowIds = (rowsResult.data ?? []).map((row) => row.id);
  const { data: rowReviews, error: rowReviewsError } = rowIds.length
    ? await access.supabase
        .from("wpi_equipment_price_reviews")
        .select("id,import_row_id,status")
        .eq("organization_id", access.organizationId)
        .eq("source_kind", "import")
        .in("import_row_id", rowIds)
    : { data: [], error: null };
  if (rowReviewsError) {
    return NextResponse.json({ error: rowReviewsError.message }, { status: 500 });
  }
  const reviewsByRow = new Map(
    (rowReviews ?? []).map((review) => [review.import_row_id, review])
  );

  let downloadUrl: string | null = null;
  if (batch.storage_bucket && batch.storage_path) {
    const signed = await access.supabase.storage
      .from(batch.storage_bucket)
      .createSignedUrl(batch.storage_path, 15 * 60);
    downloadUrl = signed.data?.signedUrl ?? null;
  }

  return NextResponse.json({
    data: {
      batch: {
        ...batch,
        created_by_name: profileResult.data?.display_name ?? null,
      },
      rows: (rowsResult.data ?? []).map((row) =>
        mapRow(
          row as Record<string, unknown>,
          reviewsByRow.get(row.id) as Record<string, unknown> | undefined
        )
      ),
      mappings: (mappingsResult.data ?? []).map((row) =>
        mapMapping(row as Record<string, unknown>)
      ),
      downloadUrl,
      canWrite: writeRoles.has(access.role),
    },
    source: "supabase",
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!writeRoles.has(access.role)) {
    return NextResponse.json(
      { error: "当前角色没有设备价格导入权限" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    action?:
      | "submit_review"
      | "cancel"
      | "reopen"
      | "save_draft"
      | "update_row"
      | "ignore_rows"
      | "set_row_selection";
    row?: Partial<EquipmentImportRow> & { id: string };
    rowIds?: string[];
    selected?: boolean;
  };

  const { data: existingBatch, error: existingBatchError } = await resolveBatch(
    access,
    id
  );
  if (existingBatchError) {
    return NextResponse.json(
      { error: "暂时无法读取导入批次，请稍后重试" },
      { status: 500 }
    );
  }
  if (!existingBatch) {
    return NextResponse.json(
      { error: "该导入批次不存在，可能已被删除或当前账号无权访问" },
      { status: 404 }
    );
  }

  if (body.action === "update_row" && body.row?.id) {
    const requestedStatus = body.row.status ?? "valid";
    if (!editableValidationStatuses.has(requestedStatus)) {
      return NextResponse.json(
        { error: "已提交和已入库状态只能由审核流程更新" },
        { status: 400 }
      );
    }
    const { data: storedRow, error: rowError } = await access.supabase
      .from("wpi_equipment_import_rows")
      .select("normalized_data,raw_data,validation_status,equipment_price_id")
      .eq("id", body.row.id)
      .eq("batch_id", existingBatch.id)
      .eq("organization_id", access.organizationId)
      .single();
    if (rowError || !storedRow) {
      return NextResponse.json(
        { error: rowError?.message || "导入记录不存在" },
        { status: 404 }
      );
    }
    if (storedRow.equipment_price_id || storedRow.validation_status === "imported") {
      return NextResponse.json(
        { error: "该记录已进入正式价格库，请前往价格档案发起修订" },
        { status: 409 }
      );
    }
    if (
      storedRow.validation_status === "submitted" ||
      !["draft", "uploaded", "mapping", "validating", "needs_review"].includes(
        String(existingBatch.status)
      )
    ) {
      return NextResponse.json(
        { error: "当前记录正在审核或批次已锁定，不能直接修改" },
        { status: 409 }
      );
    }
    const normalized =
      storedRow.normalized_data &&
      typeof storedRow.normalized_data === "object" &&
      !Array.isArray(storedRow.normalized_data)
        ? storedRow.normalized_data
        : {};
    const raw =
      storedRow.raw_data &&
      typeof storedRow.raw_data === "object" &&
      !Array.isArray(storedRow.raw_data)
        ? storedRow.raw_data
        : {};
    const patch = {
      normalized_data: {
        ...normalized,
        equipment_name: body.row.equipmentName ?? "",
        model: body.row.model ?? "",
        brand: body.row.brand ?? "",
        category: body.row.category ?? "",
        original_price: Number(body.row.originalPrice) || 0,
        original_currency: body.row.currency ?? "USD",
        supplier_name: body.row.supplier ?? "",
        quote_date: body.row.quoteDate ?? "",
      },
      raw_data: {
        ...raw,
        设备名称: body.row.equipmentName ?? "",
        规格型号: body.row.model ?? "",
        品牌: body.row.brand ?? "",
        设备类别: body.row.category ?? "",
        原始价格: Number(body.row.originalPrice) || 0,
        币种: body.row.currency ?? "USD",
        供应商: body.row.supplier ?? "",
        报价日期: body.row.quoteDate ?? "",
      },
      validation_status: requestedStatus,
      confidence: Math.min(100, Math.max(0, body.row.confidence ?? 90)),
      issues: body.row.issues ?? [],
      is_selected: body.row.selected ?? true,
    };
    const { data, error } = await access.supabase
      .from("wpi_equipment_import_rows")
      .update(patch)
      .eq("id", body.row.id)
      .eq("batch_id", existingBatch.id)
      .eq("organization_id", access.organizationId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const batch = await refreshBatchCounts(access, existingBatch.id);
    return NextResponse.json({
      data: {
        row: mapRow(data as Record<string, unknown>),
        batch,
      },
      source: "supabase",
    });
  }

  if (
    (body.action === "ignore_rows" ||
      body.action === "set_row_selection") &&
    Array.isArray(body.rowIds) &&
    body.rowIds.length > 0
  ) {
    if (
      !["draft", "uploaded", "mapping", "validating", "needs_review"].includes(
        String(existingBatch.status)
      )
    ) {
      return NextResponse.json(
        { error: "当前批次状态不允许修改记录选择" },
        { status: 409 }
      );
    }
    const { data: editableRows, error: editableRowsError } =
      await access.supabase
        .from("wpi_equipment_import_rows")
        .select("id,validation_status,equipment_price_id")
        .in("id", body.rowIds)
        .eq("batch_id", existingBatch.id)
        .eq("organization_id", access.organizationId);
    if (editableRowsError) {
      return NextResponse.json(
        { error: editableRowsError.message },
        { status: 400 }
      );
    }
    const editableRowIds = (editableRows ?? [])
      .filter(
        (row) =>
          !row.equipment_price_id &&
          !["submitted", "imported"].includes(String(row.validation_status))
      )
      .map((row) => row.id);
    if (editableRowIds.length === 0) {
      return NextResponse.json(
        { error: "所选记录均已提交审核或完成入库" },
        { status: 409 }
      );
    }
    const update =
      body.action === "ignore_rows"
        ? { validation_status: "ignored", is_selected: false }
        : { is_selected: Boolean(body.selected) };
    const { error } = await access.supabase
      .from("wpi_equipment_import_rows")
      .update(update)
      .in("id", editableRowIds)
      .eq("batch_id", existingBatch.id)
      .eq("organization_id", access.organizationId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const batch = await refreshBatchCounts(access, existingBatch.id);
    return NextResponse.json({ data: { batch }, source: "supabase" });
  }

  if (body.action === "submit_review") {
    const { data: result, error } = await access.supabase.rpc(
      "wpi_submit_equipment_import_batch",
      { target_batch_id: existingBatch.id }
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const response = result as {
      ok?: boolean;
      message?: string;
      submittedCount?: number;
      batch?: EquipmentImportBatchDetail["batch"];
    };
    if (!response.ok) {
      return NextResponse.json(
        { error: response.message || "提交审核失败" },
        { status: 409 }
      );
    }
    return NextResponse.json({ data: response, source: "supabase" });
  }

  const patch =
    body.action === "cancel"
        ? ["draft", "uploaded", "mapping", "validating"].includes(
            String(existingBatch.status)
          )
          ? { status: "cancelled" }
          : null
        : body.action === "reopen"
          ? existingBatch.status === "cancelled"
            ? { status: "draft", current_step: 2, submitted_at: null }
            : null
          : body.action === "save_draft"
            ? ["draft", "uploaded", "mapping", "validating"].includes(
                String(existingBatch.status)
              )
              ? {
                status: "draft",
                current_step: Math.min(
                  4,
                  Math.max(1, Number(existingBatch.current_step) || 1)
                ),
                }
              : null
          : null;

  if (!patch) {
    return NextResponse.json({ error: "无效的导入批次动作" }, { status: 400 });
  }

  const { data, error } = await access.supabase
    .from("wpi_equipment_import_batches")
    .update(patch)
    .eq("id", existingBatch.id)
    .eq("organization_id", access.organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data, source: "supabase" });
}
