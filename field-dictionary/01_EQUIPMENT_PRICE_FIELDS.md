# 01 机电设备价格字段字典

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | eqp_001 | 唯一ID |
| 设备编号 | equipmentCode | equipment_code | string | 是 | EQP-PUMP-001 | 系统自动或人工编号 |
| 设备名称 | equipmentName | equipment_name | string | 是 | 卧式离心泵 | 中文设备名称 |
| 英文名称 | equipmentNameEn | equipment_name_en | string | 否 | Horizontal Centrifugal Pump | 英文名称 |
| 设备类别 | category | category | string | 是 | 水泵设备 | 用于筛选和统计 |
| 子类别 | subCategory | sub_category | string | 否 | 离心泵 | 细分类 |
| 规格型号 | specification | specification | string | 是 | Q=500m³/h, H=45m | 规格参数 |
| 技术参数 | technicalParams | technical_params | object | 否 | {flow:500, head:45} | 结构化参数 |
| 单位 | unit | unit | string | 是 | 台 | 计量单位 |
| 品牌 | brand | brand | string | 否 | Grundfos | 品牌 |
| 供应商ID | supplierId | supplier_id | string | 否 | sup_001 | 关联供应商 |
| 供应商名称 | supplierName | supplier_name | string | 是 | 上海某泵业有限公司 | 显示用 |
| 原始价格 | originalPrice | original_price | number | 是 | 12500 | 原报价 |
| 币种 | currency | currency | string | 是 | USD | USD/CNY/EUR/CDF |
| 折算美元价 | usdPrice | usd_price | number | 是 | 12500 | 系统统一统计价 |
| 价格条件 | priceCondition | price_condition | string | 是 | CIF Matadi | EXW/FOB/CIF/DDP/SITE |
| 是否含税 | taxIncluded | tax_included | boolean | 否 | false | 不明确时为 null |
| 是否含运费 | freightIncluded | freight_included | boolean | 否 | true | 是否含运输 |
| 是否含安装调试 | installationIncluded | installation_included | boolean | 否 | false | 是否含安装调试 |
| 质保期 | warrantyPeriod | warranty_period | string | 否 | 12个月 | 供应商承诺 |
| 交货期 | deliveryTime | delivery_time | string | 否 | 45天 | 供应商承诺 |
| 报价日期 | quoteDate | quote_date | date | 是 | 2026-06-10 | 报价日期 |
| 有效期 | validUntil | valid_until | date | 否 | 2026-07-10 | 过期后预警 |
| 价格来源 | sourceType | source_type | string | 是 | formal_quote | 正式报价/邮件/AI识别等 |
| 可信度等级 | confidenceLevel | confidence_level | string | 是 | A | A/B/C/D/E |
| 审核状态 | reviewStatus | review_status | string | 是 | confirmed | pending/confirmed/rejected/voided |
| 风险等级 | riskLevel | risk_level | string | 否 | low | low/medium/high/critical |
| 附件ID | attachmentIds | attachment_ids | string[] | 否 | [att_001] | 价格依据 |
| AI置信度 | aiConfidence | ai_confidence | number | 否 | 0.92 | AI识别来源时需要 |
| 备注 | remarks | remarks | string | 否 | 需确认电压 | 备注 |
