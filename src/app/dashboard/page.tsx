import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardMainGrid } from "@/components/dashboard/DashboardMainGrid";
import { DashboardStatGrid } from "@/components/dashboard/DashboardStatGrid";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  aiInsightCards,
  aiWorkbenchOverview,
  dashboardHero,
  dashboardStats,
  distributionAnalyses,
  latestPriceUpdates,
  pendingReviewTasks,
  priceTrendData,
  quickActions,
  riskAlerts,
  trendSummaries,
} from "@/data/mock/dashboard";

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="-mx-2 -my-1 flex flex-col gap-3">
        <DashboardHero data={dashboardHero} />
        <DashboardStatGrid data={dashboardStats} />
        <DashboardMainGrid
          aiWorkbenchOverview={aiWorkbenchOverview}
          priceTrendData={priceTrendData}
          trendSummaries={trendSummaries}
          latestPriceUpdates={latestPriceUpdates}
          pendingReviewTasks={pendingReviewTasks}
          aiInsightCards={aiInsightCards}
          distributionAnalyses={distributionAnalyses}
          riskAlerts={riskAlerts}
          quickActions={quickActions}
        />
      </div>
    </AppLayout>
  );
}
