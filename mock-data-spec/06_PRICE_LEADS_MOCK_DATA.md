# 06 AI价格线索 Mock 数据

## 示例数据

```ts
export const priceLeads = [
  {
    id: 'lead_001',
    leadCode: 'LEAD-2026-001',
    leadType: 'equipment',
    itemName: '潜水排污泵',
    specification: 'Q=200m³/h, H=20m',
    price: 6200,
    currency: 'USD',
    region: 'China',
    sourceName: '厂家官网',
    sourceUrl: '',
    sourceType: 'manufacturer_website',
    collectedBy: 'ai',
    aiMatchScore: 0.86,
    confidenceSuggestion: 'C',
    riskNotes: ['公开网页价格，需供应商确认'],
    status: 'pending'
  },
  {
    id: 'lead_002',
    leadCode: 'LEAD-2026-002',
    leadType: 'material',
    itemName: '柴油',
    specification: '0#',
    price: 1.28,
    currency: 'USD',
    region: 'Kinshasa',
    sourceName: '本地市场调研',
    sourceType: 'market_research',
    collectedBy: 'manual_ai_assisted',
    aiMatchScore: 0.91,
    confidenceSuggestion: 'B',
    riskNotes: ['价格波动较大'],
    status: 'pending'
  }
]
```
