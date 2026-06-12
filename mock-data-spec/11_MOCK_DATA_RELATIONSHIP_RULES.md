# 11 Mock 数据关系规则

## 一、核心关系

后续 Codex 生成 mock 数据时，必须保证以下关系成立：

```text
supplier.id = equipmentPrice.supplierId
supplier.id = materialPrice.supplierId
attachment.id ∈ equipmentPrice.attachmentIds
attachment.id ∈ materialPrice.attachmentIds
pendingQuote.fileName 对应 attachment.fileName
aiTask.sourceId 对应 attachment.id 或 pendingQuote.id
inquiryTask.supplierIds 对应 supplier.id
comparisonTable.inquiryId 对应 inquiryTask.id
projectPricing.boqFileId 对应 attachment.id
report.attachmentIds 对应 attachment.id
```

## 二、状态逻辑

1. `reviewStatus = confirmed` 的价格必须至少有一个附件；
2. `confidenceLevel = A` 的价格必须来源为正式报价或正式邮件；
3. `aiConfidence < 0.75` 的任务必须进入 `needs_review` 或 `needs_info`；
4. `riskLevel = high` 的数据不应直接显示为“已确认可用”；
5. `validUntil < 当前日期` 的价格应标记过期风险。

## 三、价格逻辑

1. 所有价格统一可折算成 USD；
2. 原始币种可为 USD/CNY/EUR/CDF；
3. 地材价格必须有地区；
4. 设备价格必须有规格型号；
5. 套价数据必须能追溯到价格库或询价任务。

## 四、AI逻辑

1. AI识别结果先进入待审核；
2. AI采集价格先进入价格线索池；
3. AI报告生成后为 draft；
4. AI建议不能直接覆盖人工确认数据；
5. 所有AI数据必须显示置信度。
