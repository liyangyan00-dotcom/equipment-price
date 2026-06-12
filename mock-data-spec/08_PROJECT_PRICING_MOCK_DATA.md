# 08 项目套价 Mock 数据

## 示例数据

```ts
export const projectPricingList = [
  {
    id: 'pp_001',
    projectName: '恩吉利水厂M2剩余工程套价',
    country: '刚果金',
    currency: 'USD',
    boqFileId: 'att_boq_001',
    boqItemCount: 156,
    exactMatchCount: 82,
    similarMatchCount: 36,
    categoryMatchCount: 21,
    unmatchedCount: 17,
    equipmentCost: 1850000,
    materialCost: 420000,
    transportCost: 280000,
    laborCost: 160000,
    totalCost: 2860000,
    matchStrategy: 'confidence_first',
    aiConfidence: 0.84,
    status: 'draft'
  }
]
```

## BOQ解析项示例

```ts
export const boqParsedItems = [
  {
    id: 'boq_001',
    boqCode: 'M2-EQ-001',
    itemName: '反冲洗水泵',
    specification: 'Q=500m³/h,H=45m',
    quantity: 2,
    unit: '台',
    matchedPriceId: 'eqp_001',
    matchedPrice: 12500,
    matchLevel: 'exact',
    aiConfidence: 0.93,
    needInquiry: false
  },
  {
    id: 'boq_002',
    boqCode: 'M2-EQ-002',
    itemName: '排泥阀',
    specification: 'DN300 PN10',
    quantity: 12,
    unit: '台',
    matchedPriceId: null,
    matchedPrice: null,
    matchLevel: 'unmatched',
    aiConfidence: 0.42,
    needInquiry: true
  }
]
```
