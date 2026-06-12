# 08 Round 8：设置、权限、统计与附件页面提示词

## 目标

完成系统设置、AI设置、附件证据库、统计分析、AI工作台。

## 给 Codex 的提示词

```text
请执行 Round 8：设置、权限、统计与附件页面。

必须阅读：
- mock-data-spec/09_ATTACHMENT_REPORT_MOCK_DATA.md
- mock-data-spec/10_SETTINGS_MOCK_DATA.md
- api-spec/09_ATTACHMENT_AND_REPORT_API.md
- api-spec/10_ANALYTICS_AND_SETTINGS_API.md
- field-dictionary/08_ATTACHMENT_REPORT_FIELDS.md
- field-dictionary/09_ENUMS_AND_STATUS_CODES.md
- visual-references/ui-images/20_attachment_evidence_ai_archive.png
- visual-references/ui-images/21_analytics_dashboard.png
- visual-references/ui-images/22_ai_workbench_task_center.png
- visual-references/ui-images/25_system_settings_ai.png
- visual-references/ui-images/26_system_settings_general.png

任务：
1. 实现 /attachments；
2. 实现 /analytics；
3. 实现 /ai-workbench；
4. 实现 /settings/ai；
5. 实现 /settings；
6. 附件页面必须体现证据链关联；
7. 统计图表用代码实现；
8. AI工作台显示任务状态、置信度、风险；
9. 设置页面显示汇率、分类、可信度规则、用户角色；
10. 不接真实权限和数据库。

输出：
- 页面清单；
- 图表组件使用说明；
- 设置项说明；
- 验收自查。
```

## 验收标准

1. 附件能关联业务对象；
2. 图表不是图片；
3. AI任务状态清晰；
4. 设置项结构清楚；
5. 权限页面不做复杂真实权限。
