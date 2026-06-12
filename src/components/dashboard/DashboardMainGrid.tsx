import type {
  AiInsightCardData,
  AiWorkbenchOverview,
  DashboardRiskAlert,
  DistributionAnalysis,
  LatestPriceUpdate,
  PendingReviewTask,
  PriceTrendPoint,
  QuickAction,
  TrendSummary,
} from "@/data/mock/dashboard";
import { DashboardInsightCards } from "./DashboardInsightCards";
import { AiWorkbenchPanel } from "./AiWorkbenchPanel";
import { DistributionAnalysisGrid } from "./DistributionAnalysisGrid";
import { LatestPriceFeed } from "./LatestPriceFeed";
import { PendingReviewTasks } from "./PendingReviewTasks";
import { PriceTrendIntelligence } from "./PriceTrendIntelligence";
import { QuickActionBar } from "./QuickActionBar";
import { RiskDecisionPanel } from "./RiskDecisionPanel";

type DashboardMainGridProps = {
  aiWorkbenchOverview: AiWorkbenchOverview;
  priceTrendData: PriceTrendPoint[];
  trendSummaries: TrendSummary[];
  latestPriceUpdates: LatestPriceUpdate[];
  pendingReviewTasks: PendingReviewTask[];
  aiInsightCards: AiInsightCardData[];
  distributionAnalyses: DistributionAnalysis[];
  riskAlerts: DashboardRiskAlert[];
  quickActions: QuickAction[];
};

export function DashboardMainGrid({
  aiWorkbenchOverview,
  priceTrendData,
  trendSummaries,
  latestPriceUpdates,
  pendingReviewTasks,
  aiInsightCards,
  distributionAnalyses,
  riskAlerts,
  quickActions,
}: DashboardMainGridProps) {
  return (
    <>
      <section className="grid gap-3 xl:grid-cols-2">
        <AiWorkbenchPanel data={aiWorkbenchOverview} />
        <LatestPriceFeed data={latestPriceUpdates} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.36fr_0.86fr_0.78fr]">
        <PendingReviewTasks data={pendingReviewTasks} />
        <DashboardInsightCards data={aiInsightCards} />
        <PriceTrendIntelligence data={priceTrendData} summaries={trendSummaries} compact />
      </section>

      <section className="grid items-start gap-3 xl:grid-cols-[9fr_3fr]">
        <DistributionAnalysisGrid data={distributionAnalyses} />
        <RiskDecisionPanel data={riskAlerts} hideAiSuggestions />
      </section>

      <QuickActionBar data={quickActions} />
    </>
  );
}
