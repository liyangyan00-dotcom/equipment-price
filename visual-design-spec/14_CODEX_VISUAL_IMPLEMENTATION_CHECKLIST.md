# 14 Codex 视觉实现检查清单

## 一、Round 2 必查

| 检查项 | 是否必须 | 通过标准 |
|---|---|---|
| Tailwind颜色token | 必须 | 已按 01_COLOR_TOKENS 配置 |
| 字体层级 | 必须 | 已按 02_TYPOGRAPHY_TOKENS 配置 |
| 圆角阴影 | 必须 | 已按 03_SPACING_RADIUS_SHADOW_TOKENS 配置 |
| Sidebar | 必须 | 深蓝渐变、高亮态、Logo |
| Topbar | 必须 | 64px高度、搜索、用户区 |
| Layout | 必须 | 内容区浅灰蓝背景 |
| 禁止整页切图 | 必须 | 未使用参考图作为背景 |
| 禁止滥用Image2 | 必须 | Image2未用于业务主体 |

## 二、Round 3 必查

| 检查项 | 是否必须 | 通过标准 |
|---|---|---|
| 卡片组件 | 必须 | 符合 04_CARD_STYLE_SPEC |
| 表格组件 | 必须 | 符合 05_TABLE_STYLE_SPEC |
| 按钮表单 | 必须 | 符合 06_BUTTON_FORM_FILTER_SPEC |
| 状态标签 | 必须 | 符合 07_BADGE_STATUS_TAG_SPEC |
| 图表卡片 | 必须 | 符合 08_CHART_VISUAL_SPEC |
| AI组件 | 必须 | 符合 10_AI_MODULE_VISUAL_SPEC |
| 空状态组件 | 必须 | 符合 11_EMPTY_STATE_VISUAL_SPEC |

## 三、页面开发必查

1. 页面是否继承统一 AppLayout；
2. 页面是否使用统一 token；
3. 卡片样式是否统一；
4. 表格样式是否统一；
5. AI模块是否统一；
6. 状态标签是否统一；
7. 图表是否代码实现；
8. 图片是否只用于允许场景；
9. 页面是否对照 28 页视觉模式；
10. 是否通过 acceptance-checklists。
