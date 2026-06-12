# 04 Round 4：首页与登录页提示词

## 目标

完成 `/login` 和 `/dashboard` 两个入口页面。

## 给 Codex 的提示词

```text
请执行 Round 4：首页与登录页。

必须阅读：
- docs/22_PAGE_ROUTE_AND_ASSET_MAPPING.md
- visual-references/ui-images/27_login_page.png
- visual-references/ui-images/01_dashboard_ai_price_intelligence.png
- mock-data-spec/01_DASHBOARD_MOCK_DATA.md
- acceptance-checklists/02_PAGE_ACCEPTANCE_MATRIX_28P.md
- assets/backgrounds/README.md

任务：
1. 实现 /login；
2. 登录页使用 assets/backgrounds/login_water_plant_ai_bg.png；
3. 登录页使用 logo_water_price_system.svg；
4. 实现 /dashboard；
5. 首页包含统计卡、AI洞察、趋势图、待处理任务、风险预警；
6. 使用 mock dashboard 数据；
7. 图表用 Recharts 或等效代码实现；
8. 不接真实登录；
9. 不接真实 API。

输出：
- 页面文件；
- 使用的 mock 数据；
- 使用的图片/SVG资产；
- 自查验收结果。
```

## 验收标准

1. 登录页视觉高级；
2. 首页接近参考图；
3. 数据不是空的；
4. AI洞察不是摆设；
5. 图表不是图片。

## V4.7 补充：Round 4.1 Dashboard 首页补强

Round 4 首页 MVP 完成后，如首页信息密度低于参考图，不要立即进入 Round 5。

请先执行：

```text
dashboard-enhancement/06_ROUND_4_1_CODEX_PROMPT.md
```

自查：

```text
dashboard-enhancement/07_ROUND_4_1_SELF_CHECK_PROMPT.md
```
