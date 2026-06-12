# 00 28页 UI 像素级还原总任务

## 任务目标

根据 `visual-references/ui-images/` 中 28 页 UI 参考图，尽可能 100% 还原为前端网页。

## 必读文件

```text
visual-references/09_UI_REFERENCE_IMAGE_INDEX_28P.md
visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md
ui-restore/00_PIXEL_RESTORE_OVERVIEW.md
ui-restore/01_LAYOUT_RESTORE_RULES.md
ui-restore/02_COMPONENT_RESTORE_RULES.md
asset-rules/04_PAGE_BY_PAGE_ASSET_MATRIX.md
visual-references/component-redline/00_COMPONENT_SIZE_TOKENS.md
```

## 重要边界

1. 不允许整页切图；
2. UI参考图只作为视觉参考；
3. 所有主体页面必须用代码实现；
4. Image2 只用于背景、插图、装饰；
5. SVG/Icon 用于菜单和操作图标；
6. 图表用 Recharts/ECharts；
7. 表格用可交互组件；
8. 文字和数据必须可编辑、可复制、可接数据库。

## 开发步骤

1. 建立 token；
2. 建立基础 Layout；
3. 建立通用组件；
4. 按 28 页参考图逐页还原；
5. 截图对比；
6. 修正 spacing、font、color、radius；
7. 统一状态标签；
8. 最终 build 检查。
