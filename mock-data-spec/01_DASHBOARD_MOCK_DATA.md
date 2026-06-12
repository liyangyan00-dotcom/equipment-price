# 01 首页 Dashboard Mock 数据

## 数据对象

```ts
DashboardSummary
```

## 字段

```ts
{
  equipmentPriceCount: number;
  materialPriceCount: number;
  supplierCount: number;
  pendingQuoteCount: number;
  aiTaskCount: number;
  highRiskCount: number;
  monthlyNewQuoteCount: number;
  aiRecognitionRate: number;
}
```

## 示例

```ts
export const dashboardSummary = {
  equipmentPriceCount: 12568,
  materialPriceCount: 8942,
  supplierCount: 2346,
  pendingQuoteCount: 68,
  aiTaskCount: 156,
  highRiskCount: 48,
  monthlyNewQuoteCount: 328,
  aiRecognitionRate: 92.6
}
```

## 首页图表数据

### 地材趋势

```ts
export const materialTrendData = [
  { month: '2026-01', cement: 398, steel: 690, diesel: 1.22, sand: 38 },
  { month: '2026-02', cement: 410, steel: 705, diesel: 1.25, sand: 39 },
  { month: '2026-03', cement: 418, steel: 720, diesel: 1.31, sand: 42 }
]
```

### AI洞察

```ts
export const aiInsights = [
  { title: '价格线索发现', value: 128, type: 'info' },
  { title: '价格缺口预警', value: 86, type: 'warning' },
  { title: '建议询价任务', value: 24, type: 'ai' }
]
```
