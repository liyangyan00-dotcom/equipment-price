import type {
  AiInsightCardData,
  AiWorkbenchOverview,
  BusinessFlowOverview,
  DashboardRiskAlert,
  DistributionAnalysis,
  LatestPriceUpdate,
  PendingReviewTask,
  PriceTrendPoint,
  TrendSummary,
} from "@/data/mock/dashboard";
import { DashboardInsightCards } from "./DashboardInsightCards";
import { AiWorkbenchPanel } from "./AiWorkbenchPanel";
import { BusinessFlowPanel } from "./BusinessFlowPanel";
import { DistributionAnalysisGrid } from "./DistributionAnalysisGrid";
import { LatestPriceFeed } from "./LatestPriceFeed";
import { PendingReviewTasks } from "./PendingReviewTasks";
import { PriceTrendIntelligence } from "./PriceTrendIntelligence";
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
  businessFlow?: BusinessFlowOverview;
  rangeDays: 7 | 30 | 90;
  trendRefreshing?: boolean;
  onRangeChange: (range: 7 | 30 | 90) => void;
  onTrendRefresh: () => void;
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
  businessFlow,
  rangeDays,
  trendRefreshing = false,
  onRangeChange,
  onTrendRefresh,
}: DashboardMainGridProps) {
  return (
    <>
      {businessFlow ? <BusinessFlowPanel data={businessFlow} /> : null}

      <section id="pending-review" className="scroll-mt-16 grid items-start gap-3 xl:grid-cols-[1.25fr_0.75fr]">
        <PendingReviewTasks data={pendingReviewTasks} />
        <div id="risk-review" className="scroll-mt-16">
          <RiskDecisionPanel data={riskAlerts} hideAiSuggestions />
        </div>
      </section>

      <section id="latest-updates" className="scroll-mt-16 grid gap-3 xl:grid-cols-2">
        <LatestPriceFeed data={latestPriceUpdates} />
        <AiWorkbenchPanel data={aiWorkbenchOverview} />
      </section>

      <section className="grid items-start gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <PriceTrendIntelligence data={priceTrendData} summaries={trendSummaries} rangeDays={rangeDays} refreshing={trendRefreshing} onRangeChange={onRangeChange} onRefresh={onTrendRefresh} compact />
        <DashboardInsightCards data={aiInsightCards} />
      </section>

      <DistributionAnalysisGrid data={distributionAnalyses} />
    </>
  );
}
