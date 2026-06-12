# 05 AI任务与待审核报价 Mock 数据

## AI任务示例

```ts
export const aiTasks = [
  {
    id: 'ai_001',
    taskCode: 'AI-20260610-001',
    taskType: 'quote_recognition',
    sourceType: 'file',
    sourceId: 'att_001',
    confidence: 0.92,
    riskLevel: 'medium',
    missingFields: ['taxIncluded', 'installationIncluded'],
    suggestedActions: ['补充是否含税', '确认是否含安装调试'],
    status: 'needs_review',
    assignedReviewer: '李洋',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: ''
  },
  {
    id: 'ai_002',
    taskCode: 'AI-20260610-002',
    taskType: 'price_collection',
    sourceType: 'web_search',
    confidence: 0.78,
    riskLevel: 'high',
    missingFields: ['quoteDate', 'priceCondition'],
    suggestedActions: ['联系供应商确认报价有效期', '补充价格条件'],
    status: 'needs_info',
    assignedReviewer: '采购人员'
  }
]
```

## 待审核报价示例

```ts
export const pendingQuotes = [
  {
    id: 'pq_001',
    fileName: '某泵业公司报价单.pdf',
    quoteType: 'equipment',
    supplierName: '上海某泵业有限公司',
    quoteDate: '2026-05-20',
    currency: 'USD',
    priceCondition: 'CIF Matadi',
    extractedItems: [
      { itemName: '卧式离心泵', specification: 'Q=500m³/h,H=45m', unitPrice: 12500, quantity: 2 }
    ],
    aiConfidence: 0.92,
    missingInformation: ['是否含安装调试'],
    riskNotes: ['未明确现场服务范围'],
    riskLevel: 'medium',
    reviewStatus: 'pending',
    uploadedBy: 'admin',
    uploadedAt: '2026-06-10 09:30'
  }
]
```
