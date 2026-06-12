# 21 按 28 页 UI 参考图还原前端页面

## 任务目标

根据 `visual-references/ui-images/` 中的 28 页 UI 参考图，还原完整 Web 前端页面。

## 开发规则

1. 不允许整页切图；
2. 所有布局必须用前端组件实现；
3. 表格必须是真实 HTML 表格或组件表格；
4. 图表必须用 Recharts 或等效图表组件实现；
5. 状态标签、按钮、筛选区、卡片必须组件化；
6. 所有页面保持首页视觉风格；
7. 页面中文展示；
8. mock 数据必须贴近水厂机电设备、地材、供应商、AI识别、询价、套价业务。

## 使用顺序

先做：

1. `01_dashboard_ai_price_intelligence.png`
2. `02_equipment_price_library_ai.png`
3. `05_material_price_library_ai.png`
4. `07_supplier_library_ai.png`
5. `10_ai_quote_recognition_center.png`

再做：

6. `11_pending_quote_pool.png`
7. `14_inquiry_comparison_management_ai.png`
8. `18_project_pricing_center_ai.png`
9. `20_attachment_evidence_ai_archive.png`
10. `21_analytics_dashboard.png`

最后补齐详情页、AI闭环页、设置页、登录页和弹窗组件。

## 验收

完成后必须对照 `docs/15_UI_REFERENCE_IMAGE_PACKAGE.md` 的验收标准逐项检查。
