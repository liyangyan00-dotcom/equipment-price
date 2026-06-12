# 05 AI任务字段字典

| 中文字段 | 前端字段 | 数据库字段 | 类型 | 是否必填 | 示例 | 说明 |
|---|---|---|---|---|---|---|
| ID | id | id | string | 是 | ai_001 | 唯一ID |
| AI任务编号 | taskCode | task_code | string | 是 | AI-20260610-001 | 任务编号 |
| 任务类型 | taskType | task_type | string | 是 | quote_recognition | 任务类型 |
| 来源类型 | sourceType | source_type | string | 否 | file | file/page/manual/api |
| 来源ID | sourceId | source_id | string | 否 | att_001 | 来源对象 |
| 输入内容 | inputPayload | input_payload | object | 否 | {} | AI输入 |
| 输出内容 | outputPayload | output_payload | object | 否 | {} | AI输出 |
| 置信度 | confidence | confidence | number | 是 | 0.92 | 0-1 |
| 风险等级 | riskLevel | risk_level | string | 否 | low | low/medium/high/critical |
| 缺失字段 | missingFields | missing_fields | string[] | 否 | [warrantyPeriod] | 缺失字段 |
| 建议动作 | suggestedActions | suggested_actions | string[] | 否 | [补充质保期] | AI建议 |
| 任务状态 | status | status | string | 是 | needs_review | created/running/completed/needs_review/confirmed |
| 指定复核人 | assignedReviewer | assigned_reviewer | string | 否 | 李洋 | 复核人 |
| 实际复核人 | reviewedBy | reviewed_by | string | 否 | 李洋 | 实际复核 |
| 复核时间 | reviewedAt | reviewed_at | datetime | 否 | 2026-06-10 | 复核时间 |
| 复核意见 | reviewNotes | review_notes | string | 否 | 可入库 | 审核意见 |
