# 10 Round 10：最终验收与修复提示词

## 目标

根据验收表做全面自查和修复。

## 给 Codex 的提示词

```text
请执行 Round 10：最终验收与修复。

必须阅读：
- acceptance-checklists/00_ACCEPTANCE_OVERVIEW.md
- acceptance-checklists/01_GLOBAL_UI_ACCEPTANCE.md
- acceptance-checklists/02_PAGE_ACCEPTANCE_MATRIX_28P.md
- acceptance-checklists/03_BUSINESS_FIELD_ACCEPTANCE.md
- acceptance-checklists/04_ASSET_USAGE_ACCEPTANCE.md
- acceptance-checklists/05_AI_FLOW_ACCEPTANCE.md
- field-dictionary/10_PAGE_FIELD_USAGE_MATRIX.md
- visual-references/09_UI_REFERENCE_IMAGE_INDEX_28P.md
- visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md

任务：
1. 对所有已开发页面逐项验收；
2. 输出通过项；
3. 输出未通过项；
4. 修复 P0 问题；
5. 尽量修复 P1 问题；
6. P2 问题列入后续；
7. 检查是否存在整页切图；
8. 检查是否存在 Image2 用错位置；
9. 检查字段是否与字段字典一致；
10. 检查 AI流程是否必须人工复核。

输出：
- 页面验收报告；
- 已修复问题清单；
- 遗留问题清单；
- 后续建议。
```

## 验收标准

1. 所有 P0 项通过；
2. 主要 P1 项通过；
3. 不存在严重资产误用；
4. 不存在字段乱命名；
5. 不存在 AI结果直接入库。
