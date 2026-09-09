import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { AppLayout } from "@/components/layout/AppLayout";

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardClient />
    </AppLayout>
  );
}
