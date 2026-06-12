# 04 供应商 Mock 数据

## 示例数据

```ts
export const suppliers = [
  {
    id: 'sup_001',
    supplierCode: 'SUP-CN-001',
    supplierName: '上海某泵业有限公司',
    country: '中国',
    city: '上海',
    supplierType: 'manufacturer',
    mainProducts: ['水泵', '电机', '控制柜'],
    contactPerson: '张经理',
    phone: '+86 13800000000',
    whatsapp: '+86 13800000000',
    email: 'sales@example.com',
    website: 'https://example.com',
    address: '上海市浦东新区',
    responseSpeed: 'fast',
    priceLevel: 'medium',
    technicalLevel: 'strong',
    deliveryRisk: 'low',
    africaExperience: true,
    rating: 4.5,
    reviewStatus: 'active',
    remarks: '水泵报价响应较快'
  },
  {
    id: 'sup_002',
    supplierCode: 'SUP-CN-002',
    supplierName: '天津伯特阀门有限公司',
    country: '中国',
    city: '天津',
    supplierType: 'manufacturer',
    mainProducts: ['阀门', '电动执行器'],
    contactPerson: '李经理',
    phone: '+86 13900000000',
    whatsapp: '+86 13900000000',
    email: 'valve@example.com',
    responseSpeed: 'fast',
    priceLevel: 'low',
    technicalLevel: 'strong',
    deliveryRisk: 'medium',
    africaExperience: true,
    rating: 4.3,
    reviewStatus: 'active',
    remarks: '需确认执行器品牌'
  },
  {
    id: 'sup_003',
    supplierCode: 'SUP-DRC-001',
    supplierName: 'Kinshasa Cement SA',
    country: '刚果金',
    city: 'Kinshasa',
    supplierType: 'local_supplier',
    mainProducts: ['水泥', '砂石', '运输'],
    contactPerson: 'M. Kabasele',
    whatsapp: '+243 000000000',
    email: 'contact@example.cd',
    responseSpeed: 'medium',
    priceLevel: 'medium',
    technicalLevel: 'medium',
    deliveryRisk: 'medium',
    africaExperience: true,
    rating: 4.0,
    reviewStatus: 'active',
    remarks: '本地地材供应商'
  }
]
```
