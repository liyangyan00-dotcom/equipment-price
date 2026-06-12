# 04 待审核报价字段字典

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | pq_001 | 唯一ID |
| 文件名 | fileName | file_name | string | 是 | pump_quote.pdf | 原文件 |
| 报价类型 | quoteType | quote_type | string | 是 | equipment | equipment/material/transport/labor |
| 供应商名称 | supplierName | supplier_name | string | 否 | 上海某泵业 | AI识别 |
| 报价日期 | quoteDate | quote_date | date | 否 | 2026-06-10 | AI识别 |
| 币种 | currency | currency | string | 否 | USD | AI识别 |
| 价格条件 | priceCondition | price_condition | string | 否 | CIF Matadi | AI识别 |
| 识别条目 | extractedItems | extracted_items | object[] | 是 | [] | AI识别出的明细 |
| AI置信度 | aiConfidence | ai_confidence | number | 是 | 0.86 | 0-1 |
| 缺失信息 | missingInformation | missing_information | string[] | 否 | [是否含税] | AI提示 |
| 风险提示 | riskNotes | risk_notes | string[] | 否 | [质保期缺失] | AI提示 |
| 风险等级 | riskLevel | risk_level | string | 否 | medium | 风险等级 |
| 审核状态 | reviewStatus | review_status | string | 是 | pending | pending/confirmed/need_info/voided |
| 上传人 | uploadedBy | uploaded_by | string | 否 | admin | 上传人 |
| 上传时间 | uploadedAt | uploaded_at | datetime | 是 | 2026-06-10 10:00 | 上传时间 |
| 复核人 | reviewedBy | reviewed_by | string | 否 | 李洋 | 人工复核 |
| 复核意见 | reviewNotes | review_notes | string | 否 | 需补税费 | 审核意见 |
