# 02 机电设备价格 Mock 数据

## 示例数据

```ts
export const equipmentPrices = [
  {
    id: 'eqp_001',
    equipmentCode: 'EQP-PUMP-001',
    equipmentName: '卧式离心泵',
    equipmentNameEn: 'Horizontal Centrifugal Pump',
    category: '水泵设备',
    subCategory: '离心泵',
    specification: 'Q=500m³/h, H=45m, 75kW',
    unit: '台',
    brand: 'Shanghai Pump',
    supplierId: 'sup_001',
    supplierName: '上海某泵业有限公司',
    originalPrice: 12500,
    currency: 'USD',
    usdPrice: 12500,
    priceCondition: 'CIF Matadi',
    taxIncluded: false,
    freightIncluded: true,
    installationIncluded: false,
    warrantyPeriod: '12个月',
    deliveryTime: '45天',
    quoteDate: '2026-05-20',
    validUntil: '2026-07-20',
    sourceType: 'formal_quote',
    confidenceLevel: 'A',
    reviewStatus: 'confirmed',
    riskLevel: 'low',
    aiConfidence: 0.94,
    attachmentIds: ['att_001'],
    remarks: '适用于滤池反冲洗系统'
  },
  {
    id: 'eqp_002',
    equipmentCode: 'EQP-VALVE-001',
    equipmentName: '电动蝶阀',
    equipmentNameEn: 'Electric Butterfly Valve',
    category: '阀门设备',
    specification: 'DN600 PN10',
    unit: '台',
    supplierId: 'sup_002',
    supplierName: '天津伯特阀门有限公司',
    originalPrice: 4800,
    currency: 'USD',
    usdPrice: 4800,
    priceCondition: 'FOB Tianjin',
    taxIncluded: true,
    freightIncluded: false,
    installationIncluded: false,
    warrantyPeriod: '18个月',
    deliveryTime: '35天',
    quoteDate: '2026-05-16',
    sourceType: 'email_quote',
    confidenceLevel: 'B',
    reviewStatus: 'pending',
    riskLevel: 'medium',
    aiConfidence: 0.87,
    attachmentIds: ['att_002'],
    remarks: '需确认执行器品牌'
  }
]
```

## 推荐设备类别

```ts
export const equipmentCategories = [
  '水泵设备',
  '阀门设备',
  '电气设备',
  '自控仪表',
  '加药消毒设备',
  '滤池设备',
  '排泥设备',
  '起重设备',
  '管道附件',
  '实验室设备'
]
```
