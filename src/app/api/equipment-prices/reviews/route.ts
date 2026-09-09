import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import type {
  EquipmentReviewEvidenceState,
  EquipmentReviewPrice,
} from "@/types/equipmentReview";

type JsonRecord = Record<string, unknown>;

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value) || 0;
}

function importPrice(task: JsonRecord): EquipmentReviewPrice | null {
  const row = objectValue(task.wpi_equipment_import_rows);
  if (!row.id) return null;
  const normalized = objectValue(row.normalized_data);
  const batch = objectValue(row.wpi_equipment_import_batches);
  const currency = stringValue(normalized.original_currency, "CNY").toUpperCase();
  const originalPrice = numberValue(normalized.original_price);

  return {
    id: String(row.id),
    legacy_id: null,
    price_code: `${stringValue(batch.batch_code, "IMP-EQP")}-R${numberValue(row.row_number)}`,
    equipment_name: stringValue(normalized.equipment_name, "待补全设备名称"),
    brand: stringValue(normalized.brand) || null,
    model: stringValue(normalized.model) || null,
    category: stringValue(normalized.category) || null,
    original_price: originalPrice,
    original_currency: currency,
    usd_price: currency === "USD" ? originalPrice : null,
    price_term: stringValue(normalized.price_term) || null,
    source_type: "Excel导入",
    source_url:
      batch.storage_bucket && batch.storage_path
        ? `storage://${batch.storage_bucket}/${batch.storage_path}`
        : null,
    valid_until: null,
    confidence: numberValue(row.confidence),
    risk_level: (task.risk_level ?? "low") as EquipmentReviewPrice["risk_level"],
    review_status:
      task.status === "approved"
        ? "approved"
        : task.status === "rejected"
          ? "rejected"
          : "pending_review",
    technical_parameters: {
      specification: stringValue(normalized.model),
      importBatchId: stringValue(batch.id),
      importBatchCode: stringValue(batch.batch_code),
      importRowNumber: numberValue(row.row_number),
      quoteDate: stringValue(normalized.quote_date),
    },
    wpi_suppliers: stringValue(normalized.supplier_name)
      ? {
          id: `import-supplier-${row.id}`,
          legacy_id: null,
          name: stringValue(normalized.supplier_name),
        }
      : null,
  };
}

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await access.supabase
    .from("wpi_equipment_price_reviews")
    .select(
      `
        *,
        wpi_equipment_prices (
          id,
          legacy_id,
          price_code,
          equipment_name,
          brand,
          model,
          category,
          original_price,
          original_currency,
          usd_price,
          price_term,
          source_type,
          source_url,
          valid_until,
          confidence,
          risk_level,
          review_status,
          technical_parameters,
          deleted_at,
          wpi_suppliers (id, legacy_id, name)
        ),
        wpi_equipment_import_rows (
          id,
          row_number,
          normalized_data,
          confidence,
          validation_status,
          equipment_price_id,
          wpi_equipment_import_batches (
            id,
            batch_code,
            storage_bucket,
            storage_path
          )
        )
      `
    )
    .eq("organization_id", access.organizationId)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const priceIds = (data ?? [])
    .map((task) => task.equipment_price_id)
    .filter((value): value is string => typeof value === "string");
  const attachmentsResult = priceIds.length
    ? await access.supabase
        .from("wpi_attachments")
        .select(
          "id,related_id,original_name,evidence_type,content_type,size_bytes,verification_status,document_date,valid_until"
        )
        .eq("organization_id", access.organizationId)
        .eq("related_type", "equipment_price")
        .eq("status", "active")
        .in("related_id", priceIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (attachmentsResult.error) {
    return NextResponse.json(
      { error: attachmentsResult.error.message },
      { status: 500 }
    );
  }
  const evidenceByPrice = new Map<string, typeof attachmentsResult.data>();
  for (const attachment of attachmentsResult.data ?? []) {
    const relatedId = String(attachment.related_id);
    evidenceByPrice.set(relatedId, [
      ...(evidenceByPrice.get(relatedId) ?? []),
      attachment,
    ]);
  }

  const normalizedData = (data ?? [])
    .map((rawTask) => {
      const task = rawTask as unknown as JsonRecord;
      const rawPrice = objectValue(task.wpi_equipment_prices);
      if (task.source_kind === "price" && rawPrice.deleted_at != null) return null;
      const price = task.source_kind === "import"
        ? importPrice(task)
        : (rawPrice as unknown as EquipmentReviewPrice);
      if (!price?.id) return null;

      const rawChecks = objectValue(task.evidence_checks);
      const storedStates = objectValue(rawChecks._states) as Record<
        string,
        EquipmentReviewEvidenceState
      >;
      const keys = [
        "price_source",
        "supplier",
        "technical_parameters",
        "validity",
      ];
      const importRow = objectValue(task.wpi_equipment_import_rows);
      const importBatch = objectValue(importRow.wpi_equipment_import_batches);

      return {
        ...task,
        equipment_price_id:
          typeof task.equipment_price_id === "string"
            ? task.equipment_price_id
            : null,
        import_row_id:
          typeof task.import_row_id === "string" ? task.import_row_id : null,
        import_batch_id: stringValue(importBatch.id) || null,
        import_batch_code: stringValue(importBatch.batch_code) || null,
        import_row_number: importRow.row_number
          ? numberValue(importRow.row_number)
          : null,
        wpi_equipment_prices: price,
        evidence_checks: Object.fromEntries(
          keys.map((key) => [key, rawChecks[key] === true])
        ),
        evidence_states: Object.fromEntries(
          keys.map((key) => [
            key,
            storedStates[key] ??
              (rawChecks[key] === true ? "verified" : "missing"),
          ])
        ),
        evidence_files: (evidenceByPrice.get(String(price.id)) ?? []).map(
          (item) => ({
            id: String(item.id),
            name: String(item.original_name),
            evidence_type: String(item.evidence_type ?? "quote_evidence"),
            content_type: item.content_type ?? null,
            size_bytes: numberValue(item.size_bytes),
            verification_status: (item.verification_status ?? "pending") as
              | "pending"
              | "verified"
              | "rejected",
            document_date: item.document_date ?? null,
            valid_until: item.valid_until ?? null,
          })
        ),
      };
    })
    .filter(Boolean);

  const canReview = ["admin", "manager", "reviewer"].includes(access.role);
  const canBatchReview = ["admin", "manager"].includes(access.role);
  const canReadFullAudit = ["admin", "manager"].includes(access.role);

  return NextResponse.json({
    data: normalizedData,
    source: "supabase",
    role: access.role,
    currentUserId: access.userId,
    canReview,
    permissions: {
      role: access.role,
      canReview,
      canBatchReview,
      canReadTaskAudit: true,
      canReadFullAudit,
      canExportReviewList: canBatchReview,
      canManageEvidence: ["admin", "manager", "editor"].includes(access.role),
      canRunAiReview: canReview,
    },
  });
}
