# 00 Codex 总交接提示词

## 使用方式

把以下内容复制给 Codex，作为第一次总交接。

```text
你现在接手一个“水厂项目机电设备与地材价格信息库 / AI价格情报与套价决策系统”的前端开发任务。

请先不要写代码，先完整阅读以下文件，并输出你的理解、风险点、执行计划：

1. AGENTS.md
2. README.md
3. docs/31_FINAL_PACKAGE_OVERVIEW.md
4. docs/30_FINAL_CODEX_HANDOFF_PROMPT.md
5. development-plan/00_DEVELOPMENT_SEQUENCE.md
6. development-plan/01_PAGE_PRIORITY_MATRIX.md
7. development-plan/02_MVP_SCOPE_LOCK.md
8. visual-references/09_UI_REFERENCE_IMAGE_INDEX_28P.md
9. visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md
10. field-dictionary/00_FIELD_DICTIONARY_OVERVIEW.md
11. field-dictionary/10_PAGE_FIELD_USAGE_MATRIX.md
12. mock-data-spec/00_MOCK_DATA_OVERVIEW.md
13. api-spec/00_API_SPEC_OVERVIEW.md
14. acceptance-checklists/00_ACCEPTANCE_OVERVIEW.md

当前任务不是一次性开发完整系统，而是先确认：
- 你是否理解项目目标；
- 你是否理解 Image2 / SVG / 代码边界；
- 你是否理解 28 页 UI 参考图不能整页切图；
- 你是否理解 MVP 范围；
- 你准备按哪个轮次开发。

请先输出：
1. 项目理解；
2. 技术栈确认；
3. 目录结构建议；
4. 分轮开发计划；
5. 本轮只做什么；
6. 暂不做什么；
7. 需要我确认的问题。

在我确认前，不要开始写代码。
```
