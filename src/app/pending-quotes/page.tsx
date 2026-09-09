import { Suspense } from "react";
import { PendingQuoteReviewWorkbench } from "@/components/quote-recognition/PendingQuoteReviewWorkbench";

export default function PendingQuotesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <PendingQuoteReviewWorkbench />
    </Suspense>
  );
}
