# 07 Round 7：询价、比价、套价与报告页面提示词

## 目标

完成询价、比价、项目套价、BOQ解析、AI报告中心与报告预览。

## 给 Codex 的提示词

```text
请执行 Round 7：询价、比价、套价与报告页面。

必须阅读：
- field-dictionary/06_INQUIRY_COMPARISON_FIELDS.md
- field-dictionary/07_PROJECT_PRICING_FIELDS.md
- field-dictionary/08_ATTACHMENT_REPORT_FIELDS.md
- mock-data-spec/07_INQUIRY_COMPARISON_MOCK_DATA.md
- mock-data-spec/08_PROJECT_PRICING_MOCK_DATA.md
- mock-data-spec/09_ATTACHMENT_REPORT_MOCK_DATA.md
- api-spec/07_INQUIRY_AND_COMPARISON_API.md
- api-spec/08_PROJECT_PRICING_API.md
- api-spec/09_ATTACHMENT_AND_REPORT_API.md
- visual-references/ui-images/14_inquiry_comparison_management_ai.png
- visual-references/ui-images/17_comparison_detail_ai_analysis.png
- visual-references/ui-images/18_project_pricing_center_ai.png
- visual-references/ui-images/19_boq_upload_ai_parse.png
- visual-references/ui-images/23_ai_report_generation_center.png
- visual-references/ui-images/24_report_preview_export.png

任务：
1. 实现 /inquiries；
2. 实现 /inquiries/create；
3. 实现 /comparisons/[id]；
4. 实现 /project-pricing；
5. 实现 /project-pricing/boq-parse；
6. 实现 /ai-report-center；
7. 实现 /reports/[id]；
8. BOQ匹配必须显示精准/相似/类别/无匹配；
9. 比价页面必须显示推荐理由和风险；
10. 报告中心使用 report_cover_water_plant.png 作为封面背景；
11. 不做真实导出，只做 UI 和 mock。

输出：
- 页面清单；
- BOQ匹配逻辑说明；
- 报告生成模拟流程；
- 验收自查。
```

## 验收标准

1. 套价逻辑清楚；
2. 比价表可读；
3. 风险提示明显；
4. 报告页面有封面、摘要、风险、依据；
5. 不把报告整页做成图片。
