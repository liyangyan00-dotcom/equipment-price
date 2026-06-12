# 00 Mock 数据总说明

## 一、用途

Mock 数据用于后续 Codex 还原 28 页 UI 时使用，避免页面数据空泛、字段不统一、业务不真实。

## 二、Mock 数据原则

1. 数据必须贴近水厂工程项目；
2. 设备、材料、供应商、AI任务、询价、比价、套价之间应有逻辑关联；
3. 价格必须有币种、日期、来源、可信度、审核状态；
4. AI数据必须有置信度、缺失字段、风险提示、人工复核状态；
5. 不使用真实敏感商业报价；
6. 数值用于演示，不代表真实采购价格；
7. 地区优先使用刚果金相关地点：Kinshasa、Matadi、Lubumbashi。

## 三、Mock 数据目录建议

后续前端中建议放置：

```text
src/data/mock/
├── dashboard.mock.ts
├── equipment-prices.mock.ts
├── material-prices.mock.ts
├── suppliers.mock.ts
├── pending-quotes.mock.ts
├── ai-tasks.mock.ts
├── price-leads.mock.ts
├── inquiries.mock.ts
├── comparisons.mock.ts
├── project-pricing.mock.ts
├── attachments.mock.ts
├── reports.mock.ts
└── settings.mock.ts
```

## 四、Mock 数据规模建议

| 数据对象 | 建议数量 |
|---|---:|
| equipmentPrices | 30-50 条 |
| materialPrices | 20-40 条 |
| suppliers | 20-30 家 |
| pendingQuotes | 10-20 条 |
| aiTasks | 20-40 条 |
| priceLeads | 30-60 条 |
| inquiryTasks | 10-20 个 |
| comparisonTables | 5-10 个 |
| projectPricing | 3-5 个 |
| attachments | 30-60 个 |
| reports | 10-20 份 |
