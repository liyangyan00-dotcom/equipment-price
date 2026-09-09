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

### 附件审核保护补充（2026-09-09）

| 中文字段 | 前端/传输字段 | 数据库字段 | 类型 | 说明 |
|---|---|---|---|---|
| 证据版本 | evidenceVersion（AI input_snapshot） | evidence_version | bigint | 从 1 开始，由数据库在文件信息、业务关联、资料或人工抽取字段变化时递增；客户端不可修改 |

审核状态继续使用现有 `review_state`；人工确认状态使用 `verification_status`，身份和时间使用 `verified_by` / `verified_at`。终态只能由受控人工审核 RPC 生成，API 不接收客户端提交的审核身份。`metadata` 顶层包含 review/verif/confirm/assign 的键保留给审核流程，直接表写入不得新增、修改或删除。

审核和分派要求同组织有效 admin / manager / reviewer，且具备有效 `price.review` 权限；组织权限覆盖可撤销审核能力，给 editor/viewer 增加权限覆盖也不能突破审核角色边界。

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
