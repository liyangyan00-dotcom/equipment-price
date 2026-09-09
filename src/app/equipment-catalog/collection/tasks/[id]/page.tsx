import { EquipmentCatalogCollectionTaskDetail } from "@/components/equipment-catalog/EquipmentCatalogCollectionTaskDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EquipmentCatalogCollectionTaskDetail taskId={id} />;
}
