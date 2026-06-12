# 03 供应商字段字典

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | sup_001 | 唯一ID |
| 供应商编号 | supplierCode | supplier_code | string | 是 | SUP-CN-001 | 编号 |
| 供应商名称 | supplierName | supplier_name | string | 是 | 上海某泵业有限公司 | 公司名称 |
| 国家 | country | country | string | 是 | 中国 | 国家 |
| 城市 | city | city | string | 否 | 上海 | 城市 |
| 类型 | supplierType | supplier_type | string | 是 | manufacturer | 厂家/代理/贸易商/本地供应商 |
| 主营产品 | mainProducts | main_products | string[] | 是 | [水泵,电机] | 主营范围 |
| 联系人 | contactPerson | contact_person | string | 否 | 张经理 | 联系人 |
| 电话 | phone | phone | string | 否 | +86... | 电话 |
| WhatsApp | whatsapp | whatsapp | string | 否 | +243... | WhatsApp |
| 邮箱 | email | email | string | 否 | sales@example.com | 邮箱 |
| 官网 | website | website | string | 否 | https://... | 官网 |
| 地址 | address | address | string | 否 | 上海市... | 地址 |
| 响应速度 | responseSpeed | response_speed | string | 否 | fast | fast/medium/slow |
| 价格水平 | priceLevel | price_level | string | 否 | medium | low/medium/high |
| 技术能力 | technicalLevel | technical_level | string | 否 | strong | weak/medium/strong |
| 交付风险 | deliveryRisk | delivery_risk | string | 否 | low | low/medium/high |
| 非洲经验 | africaExperience | africa_experience | boolean | 否 | true | 是否有非洲项目经验 |
| 综合评分 | rating | rating | number | 否 | 4.5 | 1-5 |
| 审核状态 | reviewStatus | review_status | string | 是 | active | active/inactive/blacklist |
| 备注 | remarks | remarks | string | 否 | 报价响应快 | 备注 |
