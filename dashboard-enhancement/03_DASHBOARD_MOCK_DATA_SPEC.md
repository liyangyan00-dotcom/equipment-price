# 03 Dashboard Mock 数据补强规范

## 建议文件

```text
src/data/mock/dashboard.ts
```

## 推荐结构

```ts
export const dashboardMock = {
  summaryStats: [],
  aiWorkbenchOverview: {},
  latestPriceUpdates: [],
  pendingReviewTasks: [],
  aiInsightCards: [],
  priceTrendData: [],
  equipmentCategoryDistribution: [],
  supplierRegionDistribution: [],
  confidenceDistribution: [],
  riskAlerts: [],
  quickActions: []
}
```

## latestPriceUpdates 示例类型

```ts
type LatestPriceUpdate = {
  id: string
  itemType: 'equipment' | 'material' | 'supplier_quote'
  itemName: string
  updatedAtLabel: string
  price: number
  currency: 'USD' | 'CDF' | 'CNY' | 'EUR'
  unit?: string
  source: string
  sourceType: 'ai_quote_recognition' | 'supplier_email' | 'ai_price_collection' | 'manual'
  confidenceLevel: 'A' | 'B' | 'C' | 'D' | 'E'
  aiTagged?: boolean
}
```

## pendingReviewTasks 示例类型

```ts
type PendingReviewTask = {
  id: string
  fileType: 'pdf' | 'excel' | 'image' | 'email'
  fileName: string
  taskType: 'quote_recognition' | 'price_collection' | 'boq_parse' | 'supplier_match'
  aiConfidence: number
  missingFieldCount: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  createdAtLabel: string
  actions: string[]
}
```

## riskAlerts 示例类型

```ts
type DashboardRiskAlert = {
  id: string
  title: string
  riskType: 'expired_price' | 'low_price_outlier' | 'missing_parameters' | 'slow_supplier_response' | 'volatile_price' | 'priority_supplier'
  target: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  suggestedAction: string
  actionLabel: string
}
```

## 数据要求

1. 金额必须有币种；
2. AI数据必须有置信度；
3. 风险数据必须有建议动作；
4. 不使用 lorem ipsum；
5. 不接真实 API。
