import { EquipmentCatalogDetailPage } from "@/components/equipment-catalog/EquipmentCatalogDetailPage";

export default async function EquipmentCatalogDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EquipmentCatalogDetailPage id={id} />;
}
