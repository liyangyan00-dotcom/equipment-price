# 22 页面路由与资产对应关系表

## 一、用途

本文件用于后续 Codex 开发时，明确每个页面对应：

- 页面路由；
- UI 参考图；
- 可使用的 Image2 资产；
- 可使用的 SVG 图标；
- 必须代码实现的主体内容。

## 二、页面映射表

| 编号 | 页面 | 建议路由 | UI参考图 | 可用图片资产 | 图标建议 |
|---:|---|---|---|---|---|
| 01 | 首页 / AI增强价格雷达 | `/dashboard` | `01_dashboard_ai_price_intelligence.png` | `sidebar_water_plant_thumb.png`、AI插图可选 | `icon_nav_dashboard.svg` |
| 02 | 机电设备价格库 | `/equipment-prices` | `02_equipment_price_library_ai.png` | 空状态：`empty_equipment_prices.png` | `icon_nav_equipment.svg` |
| 03 | 设备价格详情 | `/equipment-prices/[id]` | `03_equipment_price_detail_ai.png` | 无 | `icon_nav_equipment.svg` |
| 04 | 设备价格AI推荐分析 | `/equipment-prices/ai-recommendation` | `04_equipment_price_ai_recommendation.png` | `ai_assistant_price_intelligence.png` | `icon_status_ai.svg` |
| 05 | 刚果金地材价格库 | `/material-prices` | `05_material_price_library_ai.png` | 空状态：`empty_material_prices.png` | `icon_nav_material.svg` |
| 06 | 地材管理辅助页 | `/material-prices/manage` | `06_material_price_management.png` | `empty_material_prices.png` | `icon_action_edit.svg` |
| 07 | 供应商库 | `/suppliers` | `07_supplier_library_ai.png` | 空状态：`empty_suppliers.png` | `icon_nav_supplier.svg` |
| 08 | 供应商详情 | `/suppliers/[id]` | `08_supplier_detail_ai_assessment.png` | 无 | `icon_nav_supplier.svg` |
| 09 | 供应商管理辅助页 | `/suppliers/manage` | `09_supplier_management_detail.png` | `empty_suppliers.png` | `icon_action_add.svg` |
| 10 | AI报价识别中心 | `/ai-quote-recognition` | `10_ai_quote_recognition_center.png` | `ai_quote_recognition.png` | `icon_nav_ai_quote.svg` |
| 11 | 待审核报价池 | `/pending-quotes` | `11_pending_quote_pool.png` | `empty_pending_quotes.png` | `icon_nav_pending_quote.svg` |
| 12 | AI价格采集中心 | `/ai-price-collection` | `12_ai_price_collection_center.png` | `ai_price_collection.png` | `icon_nav_ai_collection.svg` |
| 13 | 价格线索池 | `/price-leads` | `13_price_lead_pool.png` | 无 | `icon_nav_price_leads.svg` |
| 14 | 询价与比价管理 | `/inquiries` | `14_inquiry_comparison_management_ai.png` | 无 | `icon_nav_inquiry.svg` |
| 15 | 创建询价任务 | `/inquiries/create` | `15_procurement_inquiry_management.png` | 无 | `icon_action_add.svg` |
| 16 | AI询价函生成 | `/ai-inquiry-letter` | `16_ai_inquiry_letter_generation.png` | `ai_quote_recognition.png` 可选 | `icon_status_ai.svg` |
| 17 | 比价表详情 | `/comparisons/[id]` | `17_comparison_detail_ai_analysis.png` | 无 | `icon_nav_inquiry.svg` |
| 18 | 项目套价中心 | `/project-pricing` | `18_project_pricing_center_ai.png` | 无 | `icon_nav_project_pricing.svg` |
| 19 | BOQ上传与AI解析 | `/project-pricing/boq-parse` | `19_boq_upload_ai_parse.png` | `ai_assistant_price_intelligence.png` 可选 | `icon_action_upload.svg` |
| 20 | 价格依据与附件库 | `/attachments` | `20_attachment_evidence_ai_archive.png` | `empty_attachments.png` | `icon_nav_attachment.svg` |
| 21 | 统计分析 | `/analytics` | `21_analytics_dashboard.png` | 无 | `icon_nav_analytics.svg` |
| 22 | AI工作台 | `/ai-workbench` | `22_ai_workbench_task_center.png` | `ai_assistant_price_intelligence.png` | `icon_nav_ai_workbench.svg` |
| 23 | AI报告生成中心 | `/ai-report-center` | `23_ai_report_generation_center.png` | `ai_report_generation.png`、`report_cover_water_plant.png` | `icon_nav_ai_report.svg` |
| 24 | 报告预览与导出 | `/reports/[id]` | `24_report_preview_export.png` | `report_cover_water_plant.png` | `icon_nav_ai_report.svg` |
| 25 | AI系统设置 | `/settings/ai` | `25_system_settings_ai.png` | 无 | `icon_nav_settings.svg` |
| 26 | 用户与权限 / 通用设置 | `/settings` | `26_system_settings_general.png` | 无 | `icon_nav_settings.svg` |
| 27 | 登录页 | `/login` | `27_login_page.png` | `login_water_plant_ai_bg.png` | `logo_water_price_system.svg` |
| 28 | 空状态与弹窗组件 | `/components-preview` | `28_modal_empty_states_components.png` | 5张空状态插图 | 状态/操作图标 |

## 三、强制要求

1. UI参考图只作为视觉参考；
2. Image2 资产只用于背景、插图、装饰；
3. SVG 只用于图标和 Logo；
4. 页面主体必须用代码实现；
5. 表格、图表、按钮、状态标签、筛选器必须可交互。
