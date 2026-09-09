import { EquipmentImportBatchDetailView } from "@/components/equipment-import/EquipmentImportBatchDetailView";

export default async function EquipmentImportBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EquipmentImportBatchDetailView batchId={id} />;
}
