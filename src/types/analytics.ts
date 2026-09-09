export type AnalyticsKpi = {
  label: string;
  value: string;
  unit: string;
  trend: string;
  description: string;
};

export type AnalyticsTrendPoint = {
  label: string;
  equipment: number | null;
  material: number | null;
  equipmentSamples: number;
  materialSamples: number;
};

export type AnalyticsPriceTrendPoint = AnalyticsTrendPoint;

export type AnalyticsDistributionDatum = {
  name: string;
  value: number;
  color: string;
};

export type AnalyticsPayload = {
  objectType: "all" | "equipment" | "material";
  kpis: AnalyticsKpi[];
  priceTrendSeries: AnalyticsTrendPoint[];
  trendSummary: {
    equipment: string;
    material: string;
    inquiry: string;
  };
  supplierPerformance: Array<{
    name: string;
    response: number;
    quotes: number;
    sent: number;
  }>;
  supplierResponseSummary: {
    sent: number;
    replied: number;
    validQuotes: number;
    responseRate: number;
    validQuoteRate: number;
    supplierCount: number;
    noResponseSupplierCount: number;
  };
  aiEfficiency: Array<{
    key: string;
    label: string;
    value: number;
    total: number;
    completed: number;
    failed: number;
    needsReview: number;
  }>;
  riskDistribution: AnalyticsDistributionDatum[];
  formalRiskSummary: {
    equipment: { total: number; high: number };
    material: { total: number; high: number };
  };
  leadRiskSummary: {
    total: number;
    low: number;
    medium: number;
    high: number;
  };
  confidenceDistribution: AnalyticsDistributionDatum[];
  priceGapAnalysis: Array<{ label: string; value: number; percent: string }>;
  insights: Array<{
    id: string;
    priority: "P0" | "P1" | "P2";
    status: "待处理" | "需关注" | "正常";
    text: string;
    action: string;
    route: string;
    ownerRole: string;
    deadline: string;
    impact: string;
    actionItem: null | {
      id: string;
      code: string;
      status: "open" | "in_progress" | "resolved";
      assignedToMe: boolean;
      dueDate: string;
      overdue: boolean;
    };
  }>;
  analysisConfidence: number;
  rangeDays: 7 | 30 | 90;
  generatedAt: string;
  source: "supabase";
  truncated: boolean;
  permissions: {
    canManageActions: boolean;
  };
  decisionReadiness: {
    status: "ready" | "warning" | "blocked";
    label: string;
    reasons: string[];
  };
  dataBasis: {
    periodStart: string;
    periodEnd: string;
    inventoryAsOf: string;
    priceDateRule: string;
    activityDateRule: string;
    normalizedCurrency: "USD";
    periodFormalPriceCount: number;
    priceSampleCount: number;
    comparableBasketCount: number;
    missingPriceDateCount: number;
  };
  operations: {
    status: "healthy" | "warning" | "critical" | "unknown";
    monitoringEnabled: boolean;
    intervalMinutes: number;
    scopeLabel: string;
    lastCheckedAt: string | null;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    message: string;
    activeIncident: null | {
      scopeLabel: string;
      title: string;
      message: string;
      occurrenceCount: number;
      firstDetectedAt: string;
    };
    checks: Array<{
      key: string;
      label: string;
      status: "passed" | "warning" | "failed";
      detail: string;
    }>;
  };
};
