# 07 询价与比价 Mock 数据

## 询价任务示例

```ts
export const inquiryTasks = [
  {
    id: 'inq_001',
    inquiryCode: 'INQ-2026-001',
    title: 'M2滤池水泵与阀门询价',
    projectName: '刚果金恩吉利水厂项目',
    itemCount: 12,
    supplierIds: ['sup_001', 'sup_002'],
    invitedSupplierCount: 4,
    receivedQuoteCount: 3,
    deadline: '2026-06-20',
    status: 'quote_collecting',
    owner: '李洋',
    createdAt: '2026-06-10'
  }
]
```

## 比价表示例

```ts
export const comparisonTables = [
  {
    id: 'cmp_001',
    comparisonCode: 'CMP-2026-001',
    inquiryId: 'inq_001',
    projectName: '刚果金恩吉利水厂项目',
    suppliers: [
      { supplierId: 'sup_001', supplierName: '上海某泵业有限公司', totalPrice: 58000 },
      { supplierId: 'sup_002', supplierName: '天津伯特阀门有限公司', totalPrice: 61200 }
    ],
    comparisonData: [
      {
        itemName: '卧式离心泵',
        specification: 'Q=500m³/h,H=45m',
        quantity: 2,
        supplierPrices: [
          { supplierId: 'sup_001', unitPrice: 12500 },
          { supplierId: 'sup_002', unitPrice: 13200 }
        ],
        recommendedSupplierId: 'sup_001',
        technicalDeviation: '无重大偏差',
        riskNotes: []
      }
    ],
    recommendation: '建议优先采用上海某泵业，价格和交货期较优。',
    riskNotes: ['需进一步确认是否含现场调试'],
    status: 'draft'
  }
]
```
