import { Suspense } from "react";
import { PriceLeadsWorkspace } from "@/components/price-leads/PriceLeadsWorkspace";

export default function PriceLeadsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <PriceLeadsWorkspace />
    </Suspense>
  );
}
