"use client";

import { useParams } from "next/navigation";
import { EquipmentPriceCreateForm } from "@/components/equipment-create/EquipmentPriceCreateForm";

export default function EquipmentPriceEditPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return <EquipmentPriceCreateForm mode="edit" equipmentId={id ?? ""} />;
}
