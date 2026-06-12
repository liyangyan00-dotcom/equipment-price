# 09 UI 参考图总索引（28页）

## 一、用途

本文件用于告诉 Codex：所有页面都有对应的 UI 参考图。开发页面时，不能只看文字规范，必须同时对照本索引中的图片。

## 二、核心规则

- `01_dashboard_ai_price_intelligence.png` 是首页视觉母版。
- 其他页面必须继承首页风格。
- 图片只作视觉参考，不允许切图。
- 页面必须使用 React / Next.js / Tailwind / shadcn/ui / Recharts 等方式实现为可编辑网页组件。

## 三、页面参考图清单

| 编号 | 页面名称 | 文件路径 |
|---:|---|---|
| 01 | 首页 / AI增强价格雷达 | `visual-references/ui-images/01_dashboard_ai_price_intelligence.png` |
| 02 | 机电设备价格库 | `visual-references/ui-images/02_equipment_price_library_ai.png` |
| 03 | 设备价格详情 | `visual-references/ui-images/03_equipment_price_detail_ai.png` |
| 04 | 设备价格AI推荐分析 / 设备价格辅助页 | `visual-references/ui-images/04_equipment_price_ai_recommendation.png` |
| 05 | 刚果金地材价格库 | `visual-references/ui-images/05_material_price_library_ai.png` |
| 06 | 新增/编辑地材价格 / 地材管理辅助页 | `visual-references/ui-images/06_material_price_management.png` |
| 07 | 供应商库 | `visual-references/ui-images/07_supplier_library_ai.png` |
| 08 | 供应商详情与AI评估 | `visual-references/ui-images/08_supplier_detail_ai_assessment.png` |
| 09 | 新增/编辑供应商 / 供应商管理辅助页 | `visual-references/ui-images/09_supplier_management_detail.png` |
| 10 | AI报价识别中心 | `visual-references/ui-images/10_ai_quote_recognition_center.png` |
| 11 | 待审核报价池 | `visual-references/ui-images/11_pending_quote_pool.png` |
| 12 | AI价格采集中心 | `visual-references/ui-images/12_ai_price_collection_center.png` |
| 13 | 价格线索池 | `visual-references/ui-images/13_price_lead_pool.png` |
| 14 | 询价与比价管理 | `visual-references/ui-images/14_inquiry_comparison_management_ai.png` |
| 15 | 创建询价任务 / 采购询价管理 | `visual-references/ui-images/15_procurement_inquiry_management.png` |
| 16 | AI询价函生成 | `visual-references/ui-images/16_ai_inquiry_letter_generation.png` |
| 17 | 比价表详情 | `visual-references/ui-images/17_comparison_detail_ai_analysis.png` |
| 18 | 项目套价中心 | `visual-references/ui-images/18_project_pricing_center_ai.png` |
| 19 | BOQ上传与AI解析结果 | `visual-references/ui-images/19_boq_upload_ai_parse.png` |
| 20 | 价格依据与附件库 | `visual-references/ui-images/20_attachment_evidence_ai_archive.png` |
| 21 | 统计分析 | `visual-references/ui-images/21_analytics_dashboard.png` |
| 22 | AI工作台 / AI任务中心 | `visual-references/ui-images/22_ai_workbench_task_center.png` |
| 23 | AI报告生成中心 | `visual-references/ui-images/23_ai_report_generation_center.png` |
| 24 | 报告预览与导出 | `visual-references/ui-images/24_report_preview_export.png` |
| 25 | AI系统设置 | `visual-references/ui-images/25_system_settings_ai.png` |
| 26 | 用户与权限 / 通用系统设置 | `visual-references/ui-images/26_system_settings_general.png` |
| 27 | 登录页 | `visual-references/ui-images/27_login_page.png` |
| 28 | 空状态与弹窗组件 / UI组件参考 | `visual-references/ui-images/28_modal_empty_states_components.png` |

## 四、Codex 使用提示词

```text
请先查看 visual-references/ui-images/README.md 和本页面对应的 UI 参考图。
开发时必须保持 01_dashboard_ai_price_intelligence.png 的整体视觉风格：
深蓝侧边栏、顶部工具栏、浅灰白内容区、白色圆角卡片、工程蓝/青蓝主色、AI 紫色辅助、橙红风险色、绿色确认色。

图片只作为视觉参考，不允许整页切图。
请用 Next.js + TypeScript + Tailwind CSS + shadcn/ui + Recharts 还原为可编辑页面。
```
