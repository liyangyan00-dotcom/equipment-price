# 01 全局 UI 还原验收表（V4.6视觉增强版）

## 一、全局视觉验收

| 编号 | 验收项 | 等级 | 通过标准 |
|---:|---|---|---|
| 1 | 页面结构 | P0 | Sidebar + Topbar + Content 与参考图一致 |
| 2 | 颜色系统 | P0 | 符合 `visual-design-spec/01_COLOR_TOKENS.md` |
| 3 | 字体层级 | P0 | 符合 `visual-design-spec/02_TYPOGRAPHY_TOKENS.md` |
| 4 | 间距圆角阴影 | P0 | 符合 `visual-design-spec/03_SPACING_RADIUS_SHADOW_TOKENS.md` |
| 5 | 卡片风格 | P0 | 符合 `visual-design-spec/04_CARD_STYLE_SPEC.md` |
| 6 | 表格风格 | P0 | 符合 `visual-design-spec/05_TABLE_STYLE_SPEC.md` |
| 7 | 按钮与表单 | P0 | 符合 `visual-design-spec/06_BUTTON_FORM_FILTER_SPEC.md` |
| 8 | 状态标签 | P0 | 符合 `visual-design-spec/07_BADGE_STATUS_TAG_SPEC.md` |
| 9 | 图表风格 | P0 | 符合 `visual-design-spec/08_CHART_VISUAL_SPEC.md` |
| 10 | Sidebar / Topbar | P0 | 符合 `visual-design-spec/09_SIDEBAR_TOPBAR_SPEC.md` |
| 11 | AI模块 | P0 | 符合 `visual-design-spec/10_AI_MODULE_VISUAL_SPEC.md` |
| 12 | 空状态 | P1 | 符合 `visual-design-spec/11_EMPTY_STATE_VISUAL_SPEC.md` |
| 13 | 28页视觉模式 | P0 | 对照 `visual-design-spec/12_PAGE_PATTERN_SUMMARY_28P.md` |
| 14 | Tailwind token | P0 | 对照 `visual-design-spec/13_TAILWIND_TOKEN_MAPPING.md` |
| 15 | 图片使用 | P0 | Image2 只用于背景、插图、装饰 |
| 16 | SVG使用 | P1 | 使用 SVG 或 lucide-react，线性简洁 |
| 17 | 业务主体 | P0 | 表格、图表、按钮、标签必须代码实现 |
| 18 | 响应式 | P2 | 大屏优先，小屏不崩溃 |

## 二、P0失败判定

出现以下任一情况，页面不合格：

1. 使用 UI 参考图整页切图；
2. 使用图片代替业务表格；
3. 使用图片代替图表；
4. 字段不符合字段字典；
5. 状态颜色混乱；
6. AI结果无置信度；
7. AI结果无人工复核入口；
8. 页面没有继承统一 Sidebar / Topbar；
9. 视觉颜色明显偏离 28 张参考图；
10. 使用默认 shadcn 原始样式未做系统化定制。
