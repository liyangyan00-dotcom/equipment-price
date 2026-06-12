# 10 AI 任务状态标准

## 状态

| 状态 | 说明 |
|---|---|
| created | 已创建 |
| running | 运行中 |
| completed | 已完成 |
| needs_review | 待人工复核 |
| needs_info | 需补充资料 |
| confirmed | 已确认 |
| rejected | 已退回 |
| voided | 已作废 |

## 任务类型

- quote_recognition；
- equipment_parse；
- material_parse；
- supplier_match；
- price_collection；
- comparison_analysis；
- project_pricing；
- risk_detection；
- report_generation；
- evidence_linking。

## 结果字段

```json
{
  "task_id": "",
  "task_type": "",
  "status": "",
  "confidence": 0,
  "summary": "",
  "result": {},
  "missing_fields": [],
  "risk_notes": [],
  "suggested_actions": [],
  "need_human_review": true
}
```
