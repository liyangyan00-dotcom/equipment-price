

## V3.2 AI 增强开发原则

本项目现在采用“AI 增强型业务架构”。

Codex 开发时必须体现：

1. 每个核心业务页面都应有 AI 辅助入口；
2. AI 结果必须有置信度；
3. AI 结果必须有风险提示；
4. AI 结果必须可人工修改；
5. AI 结果必须进入待审核或人工确认流程；
6. AI 不得直接替代最终商务判断；
7. 页面中要明显体现 AI 的价值，但不能让页面显得花哨。

新增 AI 页面和功能入口：

- AI 工作台；
- AI 价格采集中心；
- AI 套价助手；
- AI 比价分析助手；
- AI 风险预警中心；
- AI 报告生成中心。

## V3.4 UI还原与资产使用强制规则

1. 开发前必须读取 `visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md`。
2. 不能把 UI 参考图整页作为前端背景或图片使用。
3. 28 页主体界面必须用 React 组件实现。
4. Image2 仅可用于背景、空状态插图、AI装饰图、报告封面图。
5. 菜单图标、操作图标、状态图标优先使用 SVG 或 lucide-react。
6. 图表必须使用 Recharts/ECharts/SVG组件实现。
7. 表格、表单、筛选器、弹窗、按钮、状态标签必须用代码实现。
8. 必须建立统一 tokens：颜色、间距、圆角、阴影、字体。
9. 每页完成后对照对应参考图自查。

## V4.1 当前阶段执行边界

当前阶段不执行代码开发。

不得主动：

- 初始化 Next.js；
- 安装 shadcn/ui；
- 搭建 React 组件库；
- 创建业务页面；
- 接入数据库；
- 接入 AI API。

当前只允许：

- 补齐规范；
- 整理目录；
- 归档图片和 SVG；
- 明确 Image2 / SVG / 代码边界；
- 准备后续 Codex 开发说明。

## V4.2 字段与 Mock 数据强制规则

后续 Codex 开发前，必须先读取：

```text
field-dictionary/
mock-data-spec/
mock-data/
```

强制要求：

1. 页面字段必须遵守字段字典；
2. mock 数据必须遵守 mock-data-spec；
3. AI输出字段不得随意命名；
4. 状态枚举必须使用 `field-dictionary/09_ENUMS_AND_STATUS_CODES.md`；
5. 页面表格字段必须参考 `field-dictionary/10_PAGE_FIELD_USAGE_MATRIX.md`；
6. 不得使用无来源、无日期、无可信度的价格数据。

## V4.3 API 与验收规则

后续 Codex 开发或验收前，必须读取：

```text
api-spec/
acceptance-checklists/
```

强制要求：

1. API 字段必须与 `field-dictionary/` 一致；
2. 页面验收必须对照 `acceptance-checklists/`；
3. AI相关页面必须通过 AI流程验收；
4. 资产使用必须通过 Image2/SVG/代码边界验收；
5. 当前阶段不实现真实 API，只保留草案。

## V4.5 Codex 分轮执行强制规则

正式交给 Codex 时，必须按以下顺序：

1. 先执行 `codex-prompts/00_CODEX_HANDOFF_MASTER_PROMPT.md`；
2. 确认计划后，再执行 Round 1；
3. 每轮只执行一个 `codex-prompts/xx_ROUND_*.md`；
4. 每轮完成后必须对照 `acceptance-checklists/` 自查；
5. 不允许一次性开发完整系统；
6. 不允许跳过设计系统和组件库直接写页面；
7. 不允许跳过 mock 阶段直接接真实数据库或 AI API。

## V4.6 视觉规范强制规则

Codex 执行 Round 2 和 Round 3 前，必须阅读：

```text
visual-design-spec/
```

强制要求：

1. 颜色必须遵守 `visual-design-spec/01_COLOR_TOKENS.md`；
2. 字体必须遵守 `visual-design-spec/02_TYPOGRAPHY_TOKENS.md`；
3. 间距、圆角、阴影必须遵守 `visual-design-spec/03_SPACING_RADIUS_SHADOW_TOKENS.md`；
4. 卡片必须遵守 `visual-design-spec/04_CARD_STYLE_SPEC.md`；
5. 表格必须遵守 `visual-design-spec/05_TABLE_STYLE_SPEC.md`；
6. 按钮、表单、筛选器必须遵守 `visual-design-spec/06_BUTTON_FORM_FILTER_SPEC.md`；
7. 状态标签必须遵守 `visual-design-spec/07_BADGE_STATUS_TAG_SPEC.md`；
8. 图表必须遵守 `visual-design-spec/08_CHART_VISUAL_SPEC.md`；
9. Sidebar / Topbar 必须遵守 `visual-design-spec/09_SIDEBAR_TOPBAR_SPEC.md`；
10. AI模块必须遵守 `visual-design-spec/10_AI_MODULE_VISUAL_SPEC.md`；
11. 空状态必须遵守 `visual-design-spec/11_EMPTY_STATE_VISUAL_SPEC.md`；
12. 不得自行创造新的视觉风格。

## V4.7 Dashboard 首页补强强制规则

执行 Round 4.1 时必须读取：

```text
dashboard-enhancement/
```

强制要求：

1. 只增强 `/dashboard`；
2. 不开发其他业务页面；
3. 不进入 Round 5；
4. 不接真实数据库或真实 AI API；
5. 图表必须代码实现；
6. 必须通过 `dashboard-enhancement/05_DASHBOARD_ACCEPTANCE_CHECKLIST.md`。

## V4.8 Dashboard 像素复刻强制规则

执行 Round 4.2 时必须读取：

```text
dashboard-pixel-restore/
```

强制要求：
1. 只修改 `/dashboard`；
2. 不开发其他业务页面；
3. 不进入 Round 5；
4. 不新增生图资产；
5. 图标体系优先使用 `lucide-react`；
6. 必须先完成红线布局复刻，再做视觉调优；
7. 必须完成截图对比检查。

## V4.9 Dashboard 精修强制规则

执行 Round 4.3 时必须读取：

```text
dashboard-pixel-restore/11_DASHBOARD_MODULE_INTERNAL_STRUCTURE_SPEC.md
dashboard-pixel-restore/12_DASHBOARD_COMPONENT_PATCH_SPEC.md
dashboard-pixel-restore/13_DASHBOARD_MODULE_HEADER_SPEC.md
dashboard-pixel-restore/14_DASHBOARD_IMPLEMENTATION_GUARDRAILS.md
dashboard-pixel-restore/15_DASHBOARD_SCREENSHOT_DIFF_WORKFLOW.md
dashboard-pixel-restore/16_DASHBOARD_NO_ROUND5_BLOCKERS.md
```

强制要求：

1. 没有截图对比，不得进入 Round 5；
2. 存在 blocker，不得进入 Round 5；
3. 不得新增生图资产；
4. 图标继续优先使用 lucide-react；
5. 代码不得全部堆在 page.tsx。

## V5.0 全页面风格一致性强制规则

后续开发所有页面前，必须读取：

```text
dashboard-final-constraints/
page-style-consistency/
```

强制规则：
1. 首页是视觉基准，不是布局模板；
2. 其他页面必须继承首页风格；
3. 其他页面不得照搬首页驾驶舱 Row 结构；
4. 页面必须按类型选择规范；
5. 所有页面优先使用 lucide-react；
6. 所有页面模块标题使用 IconBox；
7. 所有 AI 页面使用 AI紫与人工复核机制；
8. 所有风险模块使用橙红；
9. 所有重点页面必须截图对比参考图。
