# 06 询价与比价字段字典

## 询价任务字段

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | inq_001 | 唯一ID |
| 询价编号 | inquiryCode | inquiry_code | string | 是 | INQ-2026-001 | 询价编号 |
| 询价任务名称 | title | title | string | 是 | M2水泵设备询价 | 任务名称 |
| 项目名称 | projectName | project_name | string | 是 | 恩吉利水厂项目 | 项目 |
| 设备项数 | itemCount | item_count | number | 是 | 12 | 设备数量 |
| 邀请供应商 | supplierIds | supplier_ids | string[] | 是 | [sup_001] | 供应商 |
| 已回收报价数 | receivedQuoteCount | received_quote_count | number | 是 | 3 | 回收数 |
| 截止日期 | deadline | deadline | date | 是 | 2026-06-20 | 截止日期 |
| 状态 | status | status | string | 是 | quote_collecting | draft/sent/quote_collecting/completed/closed |
| 负责人 | owner | owner | string | 是 | 李洋 | 负责人 |

## 比价表字段

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | cmp_001 | 唯一ID |
| 比价编号 | comparisonCode | comparison_code | string | 是 | CMP-2026-001 | 编号 |
| 询价ID | inquiryId | inquiry_id | string | 是 | inq_001 | 关联询价 |
| 参与供应商 | suppliers | suppliers | object[] | 是 | [] | 供应商报价 |
| 比价数据 | comparisonData | comparison_data | object[] | 是 | [] | 横向比价 |
| 推荐供应商 | recommendedSupplierId | recommended_supplier_id | string | 否 | sup_001 | 推荐 |
| 推荐理由 | recommendation | recommendation | string | 否 | 价格合理 | AI/人工建议 |
| 风险提示 | riskNotes | risk_notes | string[] | 否 | [] | 风险项 |
| 状态 | status | status | string | 是 | completed | 状态 |
