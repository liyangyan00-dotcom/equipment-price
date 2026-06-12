# 02 28页页面验收矩阵

| 编号 | 页面 | UI参考图 | 核心验收点 |
|---:|---|---|---|
| 01 | 首页 / AI增强价格雷达 | `01_dashboard_ai_price_intelligence.png` | 统计卡、AI工作台、趋势图、快捷入口完整 |
| 02 | 机电设备价格库 | `02_equipment_price_library_ai.png` | 设备表格字段、筛选、AI推荐、状态标签完整 |
| 03 | 设备价格详情 | `03_equipment_price_detail_ai.png` | 基本信息、报价、供应商、附件、历史版本完整 |
| 04 | 设备价格AI推荐分析 | `04_equipment_price_ai_recommendation.png` | AI推荐、相似价格、风险提示完整 |
| 05 | 地材价格库 | `05_material_price_library_ai.png` | 地材表格、地区、运输、趋势完整 |
| 06 | 地材管理辅助页 | `06_material_price_management.png` | 新增/编辑表单、调研记录完整 |
| 07 | 供应商库 | `07_supplier_library_ai.png` | 供应商字段、评分、风险、筛选完整 |
| 08 | 供应商详情 | `08_supplier_detail_ai_assessment.png` | 档案、联系人、历史报价、评分雷达完整 |
| 09 | 供应商管理辅助页 | `09_supplier_management_detail.png` | 新增供应商、资质、分类完整 |
| 10 | AI报价识别中心 | `10_ai_quote_recognition_center.png` | 上传、识别结果、风险、保存待审核完整 |
| 11 | 待审核报价池 | `11_pending_quote_pool.png` | 待审列表、右侧预览、确认/需补充/作废完整 |
| 12 | AI价格采集中心 | `12_ai_price_collection_center.png` | 采集任务、线索池、可信度、人工确认完整 |
| 13 | 价格线索池 | `13_price_lead_pool.png` | 线索表、状态、转入库/作废完整 |
| 14 | 询价与比价管理 | `14_inquiry_comparison_management_ai.png` | 询价任务、回收进度、生成比价完整 |
| 15 | 创建询价任务 | `15_procurement_inquiry_management.png` | 设备选择、供应商选择、截止日期完整 |
| 16 | AI询价函生成 | `16_ai_inquiry_letter_generation.png` | 询价函内容、AI生成、人工编辑完整 |
| 17 | 比价表详情 | `17_comparison_detail_ai_analysis.png` | 横向比价、推荐供应商、风险提示完整 |
| 18 | 项目套价中心 | `18_project_pricing_center_ai.png` | BOQ匹配、成本汇总、匹配等级完整 |
| 19 | BOQ上传与AI解析 | `19_boq_upload_ai_parse.png` | 上传、解析结果、缺失提醒完整 |
| 20 | 价格依据与附件库 | `20_attachment_evidence_ai_archive.png` | 文件列表、证据链、关联对象完整 |
| 21 | 统计分析 | `21_analytics_dashboard.png` | 趋势、分布、风险、导出完整 |
| 22 | AI工作台 | `22_ai_workbench_task_center.png` | AI任务流、待复核、建议事项完整 |
| 23 | AI报告生成中心 | `23_ai_report_generation_center.png` | 模板、生成配置、预览、报告列表完整 |
| 24 | 报告预览与导出 | `24_report_preview_export.png` | 报告封面、目录、正文、导出完整 |
| 25 | AI系统设置 | `25_system_settings_ai.png` | AI参数、置信度规则、审核规则完整 |
| 26 | 用户与权限设置 | `26_system_settings_general.png` | 用户、角色、权限矩阵完整 |
| 27 | 登录页 | `27_login_page.png` | 背景图、Logo、登录表单完整 |
| 28 | 空状态与弹窗组件 | `28_modal_empty_states_components.png` | 空状态、上传、新增、确认、风险弹窗完整 |

## V4.7 补充：首页高密度驾驶舱验收

首页 `/dashboard` 需额外满足：

1. 顶部 6 张统计卡高度压缩；
2. 新增 AI 工作台总览；
3. 新增 最新价格动态；
4. 待复核任务字段增强；
5. 新增 AI价格情报洞察三联卡；
6. 趋势图仍用代码实现；
7. 至少新增 2 个分布图模块；
8. 风险预警为列表式；
9. 底部快捷入口为横向操作栏；
10. 整体信息密度接近参考图 `01_dashboard_ai_price_intelligence.png`。

## V4.8 补充：Dashboard 像素复刻验收

首页 `/dashboard` 除原有验收外，还需满足：

1. 布局顺序符合 `dashboard-pixel-restore/01_DASHBOARD_REDLINE_LAYOUT.md`；
2. 视觉层级符合 `dashboard-pixel-restore/04_DASHBOARD_VISUAL_TUNING_SPEC.md`；
3. 图标与标题系统符合 `dashboard-pixel-restore/05_DASHBOARD_ICON_AND_TITLE_SYSTEM.md`；
4. 图标优先使用 `lucide-react`；
5. 未额外生成首页图片资产；
6. 已完成截图对比修正。

## V4.9 补充：Dashboard 精修最终验收

`/dashboard` 进入 Round 5 前必须额外满足：

1. 模块内部结构符合 `dashboard-pixel-restore/11`；
2. 组件紧凑变体符合 `dashboard-pixel-restore/12`；
3. 标题图标系统符合 `dashboard-pixel-restore/13`；
4. 代码组织符合 `dashboard-pixel-restore/14`；
5. 已完成截图差异闭环 `dashboard-pixel-restore/15`；
6. 不存在阻断条件 `dashboard-pixel-restore/16`。

## V5.0 补充：全页面风格一致性验收

所有页面新增验收项：
1. 是否继承首页最终风格；
2. 是否没有照搬首页驾驶舱布局；
3. 是否使用统一 AppLayout / Sidebar / Topbar；
4. 是否使用 IconBox + 标题 + 副标题模块标题；
5. 是否优先使用 lucide-react；
6. AI模块是否使用紫色体系；
7. 风险模块是否使用橙红体系；
8. 表格页面是否采用 compact 密度；
9. 是否完成对应参考图截图对比；
10. 是否 build 通过。
