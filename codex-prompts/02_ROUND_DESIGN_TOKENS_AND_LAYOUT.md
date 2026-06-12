# 02 Round 2：设计系统与布局提示词（V4.6视觉增强版）

## 目标

建立全局视觉设计系统和基础布局。本轮是后续所有页面视觉一致性的基础。

## 给 Codex 的提示词

```text
请执行 Round 2：设计系统与基础布局。

本轮只做设计系统、视觉 token、AppLayout、AppSidebar、AppTopbar、PageHeader。

不要开发业务页面。
不要做 28 页页面。
不要接数据库。
不要接 AI API。
不要做真实登录。
不要做真实文件上传。
不要使用 UI参考图作为整页背景。
不要把 Image2 图片用于表格、按钮、卡片、状态标签。

必须阅读：
- visual-design-spec/00_VISUAL_STYLE_OVERVIEW.md
- visual-design-spec/01_COLOR_TOKENS.md
- visual-design-spec/02_TYPOGRAPHY_TOKENS.md
- visual-design-spec/03_SPACING_RADIUS_SHADOW_TOKENS.md
- visual-design-spec/09_SIDEBAR_TOPBAR_SPEC.md
- visual-design-spec/13_TAILWIND_TOKEN_MAPPING.md
- visual-design-spec/14_CODEX_VISUAL_IMPLEMENTATION_CHECKLIST.md
- visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md
- ui-restore/00_PIXEL_RESTORE_OVERVIEW.md
- ui-restore/01_LAYOUT_RESTORE_RULES.md
- ui-restore/02_COMPONENT_RESTORE_RULES.md
- visual-references/component-redline/00_COMPONENT_SIZE_TOKENS.md
- asset-rules/00_ASSET_USAGE_DECISION_TREE.md
- assets/svg-icons/README.md

任务：
1. 按 visual-design-spec 配置 Tailwind 颜色 token；
2. 按 visual-design-spec 配置圆角、阴影、字体层级；
3. 建立全局 CSS 变量或 token 文件；
4. 实现 AppLayout；
5. 实现 AppSidebar；
6. 实现 AppTopbar；
7. 实现 PageHeader；
8. 实现 SidebarNavItem；
9. 建立 src/config/navigation.ts；
10. Logo 使用 assets/svg-icons/logo_water_price_system.svg；
11. 侧边栏底部可使用 assets/backgrounds/sidebar_water_plant_thumb.png 作为装饰；
12. 导航图标优先使用 lucide-react，必要时使用 assets/svg-icons/；
13. 内容区使用浅灰蓝背景；
14. 页面卡片容器预设使用白色、圆角、浅边框、轻阴影；
15. 保证后续页面能复用这套布局。

建议建立或完善：
- src/components/layout/AppLayout.tsx
- src/components/layout/AppSidebar.tsx
- src/components/layout/AppTopbar.tsx
- src/components/layout/PageHeader.tsx
- src/components/layout/SidebarNavItem.tsx
- src/config/navigation.ts
- src/styles/tokens.css
- src/lib/utils.ts
- tailwind.config.ts

导航菜单先配置：
/dashboard
/equipment-prices
/material-prices
/suppliers
/ai-quote-recognition
/pending-quotes
/ai-price-collection
/price-leads
/inquiries
/project-pricing
/attachments
/analytics
/ai-workbench
/ai-report-center
/settings

完成后输出：
1. 本轮完成内容；
2. 修改或新增文件清单；
3. Tailwind token 清单；
4. Layout 组件如何使用；
5. Sidebar 菜单配置；
6. 使用的 Logo / 图标 / 图片资产；
7. 对照 visual-design-spec/14 的自查结果；
8. 是否违反 Image2 / SVG / 代码边界；
9. 是否可以进入 Round 3。
```

## 验收标准

1. 全局 token 完成；
2. 深蓝侧边栏完成；
3. 顶部栏完成；
4. 页面内容区背景完成；
5. Logo正常；
6. 无业务页面；
7. 无整页切图；
8. visual-design-spec/14 中 Round 2 必查项通过。
