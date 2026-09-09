import { Suspense } from "react";
import { InquiryManagementCenter } from "@/components/inquiries/InquiryManagementCenter";

export default function InquiriesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <InquiryManagementCenter />
    </Suspense>
  );
}
