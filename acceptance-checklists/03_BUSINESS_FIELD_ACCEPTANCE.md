# 03 业务字段验收表

## 一、价格类页面

| 验收项 | 等级 | 说明 |
|---|---|---|
| 价格有币种 | P0 | currency 必须存在 |
| 价格有美元折算 | P0 | usdPrice 必须存在 |
| 价格有报价日期 | P0 | quoteDate 必须存在 |
| 价格有来源 | P0 | sourceType 必须存在 |
| 价格有可信度 | P0 | confidenceLevel 必须存在 |
| 价格有审核状态 | P0 | reviewStatus 必须存在 |
| 已确认价格有关联附件 | P0 | attachmentIds 不应为空 |
| 高风险价格有风险说明 | P0 | riskNotes 或 riskLevel |

## 二、AI类页面

| 验收项 | 等级 | 说明 |
|---|---|---|
| AI结果有置信度 | P0 | aiConfidence/confidence |
| AI结果有状态 | P0 | status / aiStatus |
| AI结果有缺失字段 | P0 | missingFields |
| AI结果有风险提示 | P0 | riskNotes |
| AI结果可人工复核 | P0 | 有复核按钮或状态 |
| AI结果不能直接正式入库 | P0 | 必须经过 pending/review |

## 三、供应商页面

| 验收项 | 等级 | 说明 |
|---|---|---|
| 有国家 | P0 | country |
| 有类型 | P0 | supplierType |
| 有主营产品 | P0 | mainProducts |
| 有联系人或联系方式 | P1 | contactPerson/email/whatsapp |
| 有评分 | P1 | rating |
| 有交付风险 | P1 | deliveryRisk |
