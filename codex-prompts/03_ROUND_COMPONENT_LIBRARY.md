# 03 Round 3：基础组件库提示词（V4.6视觉增强版）

## 目标

建立符合 28 张效果图视觉风格的基础组件库。

## 给 Codex 的提示词

```text
请执行 Round 3：基础组件库。

本轮只做可复用组件，不开发完整业务页面。

必须阅读：
- visual-design-spec/04_CARD_STYLE_SPEC.md
- visual-design-spec/05_TABLE_STYLE_SPEC.md
- visual-design-spec/06_BUTTON_FORM_FILTER_SPEC.md
- visual-design-spec/07_BADGE_STATUS_TAG_SPEC.md
- visual-design-spec/08_CHART_VISUAL_SPEC.md
- visual-design-spec/10_AI_MODULE_VISUAL_SPEC.md
- visual-design-spec/11_EMPTY_STATE_VISUAL_SPEC.md
- visual-design-spec/13_TAILWIND_TOKEN_MAPPING.md
- visual-design-spec/14_CODEX_VISUAL_IMPLEMENTATION_CHECKLIST.md
- field-dictionary/00_FIELD_DICTIONARY_OVERVIEW.md
- field-dictionary/09_ENUMS_AND_STATUS_CODES.md
- acceptance-checklists/01_GLOBAL_UI_ACCEPTANCE.md
- acceptance-checklists/03_BUSINESS_FIELD_ACCEPTANCE.md
- asset-rules/03_USE_SVG_OR_ICON_COMPONENTS.md

任务：
1. 实现 StatCard；
2. 实现 DataCard / BaseCard；
3. 实现 ChartCard；
4. 实现 AiInsightCard；
5. 实现 RiskCard；
6. 实现 StatusBadge；
7. 实现 ConfidenceBadge；
8. 实现 RiskBadge；
9. 实现 AiBadge；
10. 实现 FilterBar；
11. 实现 DataTable 基础组件；
12. 实现 EmptyState；
13. 实现 UploadPanel；
14. 实现 ConfirmDialog；
15. 实现 RiskDialog；
16. 实现 AiConfidenceBar；
17. 实现统一状态颜色工具函数；
18. 实现统一金额、百分比、日期格式化函数；
19. 所有状态枚举必须来自 field-dictionary；
20. 图表用 Recharts 或代码实现，不允许图片图表。

完成后输出：
1. 组件清单；
2. 每个组件用途；
3. props 说明；
4. 使用的视觉规范文件；
5. 状态/可信度/风险颜色映射；
6. 对照 visual-design-spec/14 的自查结果；
7. 是否可以进入 Round 4。
```

## 验收标准

1. 卡片符合 visual-design-spec/04；
2. 表格符合 visual-design-spec/05；
3. 按钮/筛选/表单符合 visual-design-spec/06；
4. 状态标签符合 visual-design-spec/07；
5. 图表符合 visual-design-spec/08；
6. AI模块符合 visual-design-spec/10；
7. 空状态符合 visual-design-spec/11；
8. 未开发完整业务页面。
