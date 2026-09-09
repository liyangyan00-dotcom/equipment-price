import { EquipmentCatalogReviewQueue } from "@/components/equipment-catalog/EquipmentCatalogReviewQueue";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const taskId = typeof params.taskId === "string" ? params.taskId : "";
  return <EquipmentCatalogReviewQueue taskId={taskId} />;
}
