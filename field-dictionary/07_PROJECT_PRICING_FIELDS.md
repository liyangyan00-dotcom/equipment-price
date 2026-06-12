# 07 项目套价字段字典

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | pp_001 | 唯一ID |
| 项目名称 | projectName | project_name | string | 是 | 恩吉利水厂M2 | 项目 |
| 国家 | country | country | string | 是 | 刚果金 | 国家 |
| 默认币种 | currency | currency | string | 是 | USD | 统计币种 |
| BOQ文件ID | boqFileId | boq_file_id | string | 否 | att_001 | 上传文件 |
| BOQ项数 | boqItemCount | boq_item_count | number | 是 | 156 | 项数 |
| 精准匹配数 | exactMatchCount | exact_match_count | number | 是 | 82 | 精准匹配 |
| 相似匹配数 | similarMatchCount | similar_match_count | number | 是 | 36 | 相似匹配 |
| 类别匹配数 | categoryMatchCount | category_match_count | number | 是 | 21 | 类别匹配 |
| 无匹配数 | unmatchedCount | unmatched_count | number | 是 | 17 | 无匹配 |
| 设备费用合计 | equipmentCost | equipment_cost | number | 是 | 1850000 | 设备 |
| 地材费用合计 | materialCost | material_cost | number | 是 | 420000 | 地材 |
| 运输费用合计 | transportCost | transport_cost | number | 否 | 280000 | 运输 |
| 人工费用合计 | laborCost | labor_cost | number | 否 | 160000 | 人工 |
| 项目总价 | totalCost | total_cost | number | 是 | 2860000 | 总价 |
| 匹配策略 | matchStrategy | match_strategy | string | 是 | confidence_first | 匹配策略 |
| AI置信度 | aiConfidence | ai_confidence | number | 否 | 0.84 | AI套价置信度 |
| 状态 | status | status | string | 是 | draft | draft/reviewed/exported |
