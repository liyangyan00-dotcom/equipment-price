# 10 系统设置 Mock 数据

## 汇率设置

```ts
export const currencyRates = [
  { currency: 'USD', rateToUsd: 1, updatedAt: '2026-06-10', isDefault: true },
  { currency: 'CNY', rateToUsd: 0.139, updatedAt: '2026-06-10', isDefault: false },
  { currency: 'EUR', rateToUsd: 1.08, updatedAt: '2026-06-10', isDefault: false },
  { currency: 'CDF', rateToUsd: 0.00036, updatedAt: '2026-06-10', isDefault: false }
]
```

## 可信度规则

```ts
export const confidenceRules = [
  { level: 'A', name: '高', sourceTypes: ['formal_quote', 'official_email'], allowForTender: true, color: 'blue' },
  { level: 'B', name: '较高', sourceTypes: ['email_quote', 'whatsapp_confirmed', 'purchase_history'], allowForTender: true, color: 'green' },
  { level: 'C', name: '一般', sourceTypes: ['website', 'platform'], allowForTender: false, color: 'yellow' },
  { level: 'D', name: '较低', sourceTypes: ['ai_search_lead'], allowForTender: false, color: 'orange' },
  { level: 'E', name: '低', sourceTypes: ['expired', 'unknown'], allowForTender: false, color: 'red' }
]
```

## 用户角色

```ts
export const userRoles = [
  { role: 'admin', name: '系统管理员' },
  { role: 'commercial_manager', name: '商务经理' },
  { role: 'procurement', name: '采购人员' },
  { role: 'engineer', name: '机电工程师' },
  { role: 'cost_engineer', name: '成本测算人员' },
  { role: 'viewer', name: '领导只读用户' }
]
```
