# 30 最终交给 Codex 的总提示词

## 使用说明

当你准备正式把项目交给 Codex 开发时，复制下面这段提示词给 Codex。

---

```text
你现在接手“水厂项目机电设备与地材价格信息库 / AI驱动价格情报与套价决策系统”的开发任务。

请严格按规范包执行，不要自由发挥。

一、先阅读这些文件

1. AGENTS.md
2. README.md
3. docs/31_FINAL_PACKAGE_OVERVIEW.md
4. docs/29_FULL_PACKAGE_AUDIT_REPORT.md
5. development-plan/00_DEVELOPMENT_SEQUENCE.md
6. development-plan/01_PAGE_PRIORITY_MATRIX.md
7. development-plan/02_MVP_SCOPE_LOCK.md
8. codex-prompts/00_CODEX_HANDOFF_MASTER_PROMPT.md
9. codex-prompts/11_DO_NOT_DO_LIST.md
10. visual-references/09_UI_REFERENCE_IMAGE_INDEX_28P.md
11. visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md
12. asset-rules/00_ASSET_USAGE_DECISION_TREE.md
13. field-dictionary/00_FIELD_DICTIONARY_OVERVIEW.md
14. field-dictionary/10_PAGE_FIELD_USAGE_MATRIX.md
15. mock-data-spec/00_MOCK_DATA_OVERVIEW.md
16. mock-data-spec/11_MOCK_DATA_RELATIONSHIP_RULES.md
17. api-spec/00_API_SPEC_OVERVIEW.md
18. acceptance-checklists/00_ACCEPTANCE_OVERVIEW.md

二、当前不要一次性开发完整系统

请先输出：
1. 你对项目的理解；
2. 你确认采用的技术栈；
3. 你理解的开发轮次；
4. 你认为第一轮应该做什么；
5. 你不会做的事项；
6. 你发现的风险点。

三、强制边界

1. 28页 UI 参考图只能用于视觉参考，不能整页切图；
2. Image2 资产只用于背景、插图、装饰；
3. 表格、图表、按钮、卡片、状态标签必须用代码实现；
4. SVG/lucide-react 用于图标；
5. 字段命名必须遵守 field-dictionary；
6. mock 数据必须遵守 mock-data-spec；
7. AI 结果必须进入人工复核流程，不能直接入库；
8. 当前先做 mock 前端，不接真实数据库和真实 AI API；
9. 每轮开发完成后必须对照 acceptance-checklists 自查。

四、开发顺序

按以下轮次执行：

1. Round 1：项目初始化；
2. Round 2：设计系统与布局；
3. Round 3：基础组件库；
4. Round 4：首页与登录页；
5. Round 5：价格库核心页面；
6. Round 6：AI报价识别与价格采集页面；
7. Round 7：询价、比价、套价与报告页面；
8. Round 8：设置、权限、统计与附件页面；
9. Round 9：Mock API 与数据绑定；
10. Round 10：最终验收与修复。

五、现在请先执行

请先只执行 codex-prompts/00_CODEX_HANDOFF_MASTER_PROMPT.md 的要求，不要写代码。
```

---

## 说明

这段提示词适合首次交给 Codex 时使用。  
等 Codex 输出理解和计划后，再逐轮复制 `codex-prompts/01_ROUND_*.md`。

## V4.6 视觉规范增强补充

正式执行 Round 2 前，Codex 必须额外阅读：

```text
visual-design-spec/00_VISUAL_STYLE_OVERVIEW.md
visual-design-spec/01_COLOR_TOKENS.md
visual-design-spec/02_TYPOGRAPHY_TOKENS.md
visual-design-spec/03_SPACING_RADIUS_SHADOW_TOKENS.md
visual-design-spec/09_SIDEBAR_TOPBAR_SPEC.md
visual-design-spec/13_TAILWIND_TOKEN_MAPPING.md
visual-design-spec/14_CODEX_VISUAL_IMPLEMENTATION_CHECKLIST.md
```

正式执行 Round 3 前，Codex 必须额外阅读：

```text
visual-design-spec/04_CARD_STYLE_SPEC.md
visual-design-spec/05_TABLE_STYLE_SPEC.md
visual-design-spec/06_BUTTON_FORM_FILTER_SPEC.md
visual-design-spec/07_BADGE_STATUS_TAG_SPEC.md
visual-design-spec/08_CHART_VISUAL_SPEC.md
visual-design-spec/10_AI_MODULE_VISUAL_SPEC.md
visual-design-spec/11_EMPTY_STATE_VISUAL_SPEC.md
```

视觉强制要求：

1. 颜色必须使用 visual-design-spec 的 token；
2. 字体层级必须使用 visual-design-spec；
3. 卡片、表格、按钮、状态标签必须按 visual-design-spec 实现；
4. 图表必须用代码实现；
5. AI模块必须显示置信度、风险提示、人工复核入口；
6. 不得自行创造新的视觉风格。
