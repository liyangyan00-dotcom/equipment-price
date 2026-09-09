import { AppLayout } from "@/components/layout/AppLayout";
import { SupplierDetailView } from "@/components/suppliers/SupplierDetailView";
import {
  buildSupplierDetailFromRecord,
  getSupplierDetail,
} from "@/data/mock/supplierDetails";
import { supplierRecords } from "@/data/mock/suppliers";
import {
  mapSupplierDatabaseRow,
  type SupplierDatabaseRow,
} from "@/lib/data/supplierMapper";
import { getCurrentAccess } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SupplierDetailPage({ params }: PageProps) {
  const { id } = await params;
  const access = await getCurrentAccess();
  const supabase = await createClient();
  let databaseSupplier: SupplierDatabaseRow | null = null;

  if (access) {
    const baseQuery = () =>
      supabase
        .from("wpi_suppliers")
        .select("*, wpi_supplier_contacts(name, phone, whatsapp, email, is_primary)")
        .eq("organization_id", access.organizationId);

    const byLegacyId = await baseQuery().eq("legacy_id", id).maybeSingle();
    databaseSupplier = byLegacyId.data as SupplierDatabaseRow | null;

    if (!databaseSupplier) {
      const byCode = await baseQuery().eq("supplier_code", id).maybeSingle();
      databaseSupplier = byCode.data as SupplierDatabaseRow | null;
    }

    if (!databaseSupplier && /^[0-9a-f-]{36}$/i.test(id)) {
      const byUuid = await baseQuery().eq("id", id).maybeSingle();
      databaseSupplier = byUuid.data as SupplierDatabaseRow | null;
    }
  }

  const fallbackRecord = supplierRecords.find(
    (record) => record.id === id || record.supplierCode === id,
  );
  const detail = databaseSupplier
    ? buildSupplierDetailFromRecord(
        mapSupplierDatabaseRow(databaseSupplier, fallbackRecord),
      )
    : getSupplierDetail(id);

  return (
    <AppLayout>
      <SupplierDetailView detail={detail} />
    </AppLayout>
  );
}
