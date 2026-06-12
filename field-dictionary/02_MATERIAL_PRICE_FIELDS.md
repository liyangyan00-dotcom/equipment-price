# 02 刚果金地材价格字段字典

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | mat_001 | 唯一ID |
| 材料编号 | materialCode | material_code | string | 是 | MAT-CEM-001 | 材料编号 |
| 材料名称 | materialName | material_name | string | 是 | 普通硅酸盐水泥 | 中文名称 |
| 英文/法文名称 | materialNameForeign | material_name_foreign | string | 否 | Ciment Portland | 可用于当地采购 |
| 材料类别 | category | category | string | 是 | 水泥 | 水泥/钢筋/砂石/柴油/人工等 |
| 规格 | specification | specification | string | 是 | 42.5R | 规格 |
| 单位 | unit | unit | string | 是 | 吨 | 计量单位 |
| 地区 | region | region | string | 是 | Kinshasa | Kinshasa/Matadi/Lubumbashi等 |
| 原始价格 | originalPrice | original_price | number | 是 | 420 | 原报价 |
| 币种 | currency | currency | string | 是 | USD | USD/CDF/CNY/EUR |
| 折算美元价 | usdPrice | usd_price | number | 是 | 420 | 统一美元价 |
| 是否含运输 | transportIncluded | transport_included | boolean | 否 | true | 是否含运输 |
| 运输条件 | transportCondition | transport_condition | string | 否 | 送至现场 | 自提/送货/港口 |
| 是否含税 | taxIncluded | tax_included | boolean | 否 | false | 是否含税 |
| 报价日期 | quoteDate | quote_date | date | 是 | 2026-06-10 | 报价时间 |
| 调研人 | researcher | researcher | string | 否 | 张三 | 市场调研人 |
| 来源类型 | sourceType | source_type | string | 是 | market_research | 市场调研/供应商报价/历史采购 |
| 可信度等级 | confidenceLevel | confidence_level | string | 是 | B | A/B/C/D/E |
| 审核状态 | reviewStatus | review_status | string | 是 | pending | 审核状态 |
| 波动等级 | volatilityLevel | volatility_level | string | 否 | high | 材料价格波动程度 |
| 附件ID | attachmentIds | attachment_ids | string[] | 否 | [att_002] | 依据文件 |
| 备注 | remarks | remarks | string | 否 | 雨季价格偏高 | 备注 |
