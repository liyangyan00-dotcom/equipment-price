# 06 Round 4.1 Dashboard 首页补强 Codex 提示词

```text
请执行一个小轮次：Round 4.1 Dashboard 首页补强。

本轮只允许增强 `/dashboard` 首页。

严格遵守：
1. 只修改 `/dashboard` 首页相关代码；
2. 不开发新的业务页面；
3. 不进入 Round 5；
4. 不接真实数据库；
5. 不接真实 AI API；
6. 不做真实文件上传；
7. 不使用 UI参考图作为整页背景；
8. 不把 Image2 图片用于表格、图表、按钮、卡片、状态标签；
9. 复用 Round 2 的 AppLayout / AppSidebar / AppTopbar / PageHeader；
10. 复用 Round 3 的 StatCard、ChartCard、AiInsightCard、RiskCard、DataTable、StatusBadge、ConfidenceBadge、RiskBadge、AiBadge；
11. 遵守 visual-design-spec/；
12. 目标是提高首页信息密度，使其更接近“高密度运营驾驶舱”。

必须阅读：
1. dashboard-enhancement/00_DASHBOARD_ENHANCEMENT_OVERVIEW.md
2. dashboard-enhancement/01_DASHBOARD_MODULE_DENSITY_SPEC.md
3. dashboard-enhancement/02_DASHBOARD_LAYOUT_GRID_SPEC.md
4. dashboard-enhancement/03_DASHBOARD_MOCK_DATA_SPEC.md
5. dashboard-enhancement/04_DASHBOARD_COMPONENT_MAPPING.md
6. dashboard-enhancement/05_DASHBOARD_ACCEPTANCE_CHECKLIST.md
7. visual-references/ui-images/01_dashboard_ai_price_intelligence.png
8. visual-design-spec/12_PAGE_PATTERN_SUMMARY_28P.md
9. visual-design-spec/14_CODEX_VISUAL_IMPLEMENTATION_CHECKLIST.md
10. mock-data-spec/01_DASHBOARD_MOCK_DATA.md
11. acceptance-checklists/02_PAGE_ACCEPTANCE_MATRIX_28P.md

本轮目标：
1. 压缩顶部 6 张统计卡高度；
2. 新增 AI 工作台总览；
3. 新增 最新价格动态；
4. 优化待复核任务列表；
5. 新增 AI价格情报洞察三联卡；
6. 调整趋势图布局，保持 Recharts/代码实现；
7. 新增 2-3 个分布图模块；
8. 风险预警改成列表式；
9. 底部快捷入口改成横向操作栏；
10. 如 mock 不足，仅补充 Dashboard 专用 mock 数据。

建议新增或扩展：
src/data/mock/dashboard.ts

建议局部组件：
src/components/dashboard/AiWorkbenchOverview.tsx
src/components/dashboard/LatestPriceUpdates.tsx
src/components/dashboard/PendingReviewPanel.tsx
src/components/dashboard/DashboardInsightCards.tsx
src/components/dashboard/DashboardRiskList.tsx
src/components/dashboard/QuickActionBar.tsx
src/components/dashboard/DistributionMiniCharts.tsx

完成后输出：
1. 本轮修改了哪些文件；
2. Dashboard 新增了哪些模块；
3. 哪些模块复用了 Round 3 组件；
4. 新增了哪些 mock 数据；
5. 图表是否全部用 Recharts / 代码实现；
6. 是否仍然只修改 `/dashboard`；
7. 是否没有越界开发其他业务页；
8. 是否没有错误使用 Image2；
9. 是否对照参考图做了视觉补强；
10. 是否可以进入 Round 5。
```
