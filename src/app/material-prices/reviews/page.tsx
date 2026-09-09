import { Suspense } from "react";
import { MaterialReviewCenter } from "@/components/material-workflow/MaterialReviewCenter";

export default function MaterialPriceReviewPage() {
  return <Suspense fallback={null}><MaterialReviewCenter /></Suspense>;
}
