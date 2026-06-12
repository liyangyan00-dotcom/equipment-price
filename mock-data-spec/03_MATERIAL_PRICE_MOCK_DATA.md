# 03 刚果金地材价格 Mock 数据

## 示例数据

```ts
export const materialPrices = [
  {
    id: 'mat_001',
    materialCode: 'MAT-CEM-001',
    materialName: '普通硅酸盐水泥',
    materialNameForeign: 'Ciment Portland',
    category: '水泥',
    specification: '42.5R',
    unit: '吨',
    region: 'Kinshasa',
    originalPrice: 420,
    currency: 'USD',
    usdPrice: 420,
    transportIncluded: true,
    transportCondition: '送至Kinshasa项目现场',
    taxIncluded: false,
    quoteDate: '2026-06-02',
    researcher: '现场商务人员',
    sourceType: 'market_research',
    confidenceLevel: 'B',
    reviewStatus: 'confirmed',
    volatilityLevel: 'medium',
    attachmentIds: ['att_010'],
    remarks: '雨季价格可能上浮'
  },
  {
    id: 'mat_002',
    materialCode: 'MAT-STL-001',
    materialName: '螺纹钢',
    materialNameForeign: 'Rebar HRB400',
    category: '钢筋',
    specification: 'HRB400 Φ20mm',
    unit: '吨',
    region: 'Kinshasa',
    originalPrice: 695,
    currency: 'USD',
    usdPrice: 695,
    transportIncluded: false,
    transportCondition: '仓库自提',
    taxIncluded: false,
    quoteDate: '2026-06-05',
    sourceType: 'supplier_quote',
    confidenceLevel: 'B',
    reviewStatus: 'pending',
    volatilityLevel: 'high',
    attachmentIds: ['att_011'],
    remarks: '需确认是否含装车费'
  }
]
```

## 推荐地材类别

```ts
export const materialCategories = [
  '水泥',
  '钢筋',
  '砂',
  '碎石',
  '混凝土',
  '柴油',
  '人工',
  '机械',
  '运输',
  '临建材料'
]
```
