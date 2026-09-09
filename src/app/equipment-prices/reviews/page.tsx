import { Suspense } from "react";
import { EquipmentReviewCenter } from "@/components/equipment-reviews/EquipmentReviewCenter";

export default function EquipmentPriceReviewPage() {
  return (
    <Suspense fallback={null}>
      <EquipmentReviewCenter />
    </Suspense>
  );
}
