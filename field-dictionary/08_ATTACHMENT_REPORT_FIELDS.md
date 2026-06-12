# 08 附件证据与报告字段字典

## 附件字段

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | att_001 | 唯一ID |
| 文件名 | fileName | file_name | string | 是 | quote.pdf | 文件名 |
| 文件类型 | fileType | file_type | string | 是 | pdf | pdf/excel/image/word |
| 文件地址 | fileUrl | file_url | string | 是 | /uploads/... | 存储路径 |
| 关联对象类型 | relatedType | related_type | string | 否 | equipment_price | 对象类型 |
| 关联对象ID | relatedId | related_id | string | 否 | eqp_001 | 对象ID |
| 供应商ID | supplierId | supplier_id | string | 否 | sup_001 | 供应商 |
| 来源说明 | sourceDescription | source_description | string | 否 | 供应商正式报价 | 来源 |
| 上传人 | uploadedBy | uploaded_by | string | 是 | admin | 上传人 |
| 上传时间 | uploadedAt | uploaded_at | datetime | 是 | 2026-06-10 | 上传时间 |
| 文件状态 | status | status | string | 是 | active | active/invalid |

## 报告字段

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | rpt_001 | 唯一ID |
| 报告编号 | reportCode | report_code | string | 是 | RPT-2026-001 | 报告编号 |
| 报告名称 | reportName | report_name | string | 是 | 设备价格分析报告 | 名称 |
| 报告类型 | reportType | report_type | string | 是 | equipment_analysis | 类型 |
| 项目名称 | projectName | project_name | string | 否 | 恩吉利水厂 | 项目 |
| 生成方式 | generatedBy | generated_by | string | 是 | ai | ai/manual |
| 报告状态 | status | status | string | 是 | draft | draft/reviewed/exported |
| 报告内容 | content | content | object | 否 | {} | 结构化内容 |
| 附件ID | attachmentIds | attachment_ids | string[] | 否 | [] | 关联附件 |
| 生成时间 | createdAt | created_at | datetime | 是 | 2026-06-10 | 时间 |
