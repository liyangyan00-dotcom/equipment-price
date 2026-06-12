import { AppLayout } from "@/components/layout/AppLayout";
import { SupplierDetailView } from "@/components/suppliers/SupplierDetailView";
import { getSupplierDetail } from "@/data/mock/supplierDetails";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SupplierDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = getSupplierDetail(id);

  return (
    <AppLayout>
      <SupplierDetailView detail={detail} />
    </AppLayout>
  );
}
