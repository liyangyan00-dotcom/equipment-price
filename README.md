

## V3.2 AI 增强升级说明

本版本将系统从“价格信息库 + AI报价识别”升级为：

> AI 驱动的水厂工程价格情报与套价决策系统

AI 不再只负责识别报价单，而是参与以下完整流程：

1. 设备清单智能解析；
2. 报价单智能识别；
3. 刚果金地材调研记录整理；
4. 供应商智能匹配；
5. 价格线索智能采集；
6. 报价条件自动校验；
7. 多供应商比价分析；
8. BOQ 智能套价匹配；
9. 价格风险预警；
10. 成本测算报告自动生成；
11. 询价函自动生成；
12. 审计证据链自动整理。

重要原则：

AI 可以提高效率和判断质量，但不能绕过人工审核。  
所有 AI 识别、AI 推荐、AI 套价结果都必须标记为“AI建议”，并进入人工确认流程。

## V3.4 UI 100%还原升级说明

本版本新增“UI像素级还原与资产使用规范”，目标是让 Codex 尽可能按 28 页参考图还原页面，同时明确哪些内容可以用 Image2，哪些不能用 Image2，哪些应使用 SVG 或前端代码。

核心结论：

- 28 页主体 UI 必须用前端代码实现；
- Image2 只用于背景、插图、装饰图；
- SVG 用于图标、Logo、简单状态符号；
- 图表必须用图表组件实现；
- 表格、筛选、按钮、弹窗、文字、价格数据必须用代码实现。

## V3.5 第一阶段资产归档更新

本版本已开始执行第一阶段 Image2 资产生成，并已将首张图片归档到规范包中：

```text
assets/backgrounds/login_water_plant_ai_bg.png
```

同时新增第一阶段图片资产清单文件：

```text
docs/16_PHASE1_IMAGE_ASSET_CHECKLIST.md
```

用于按清单逐项生成和归档背景图、空状态插图、AI功能插图和报告封面图。

## V3.6 第一阶段第二张资产归档更新

本版本继续执行第一阶段 Image2 资产生成，并新增归档：

```text
assets/backgrounds/sidebar_water_plant_thumb.png
```

目前已完成归档的第一阶段背景类资产：

```text
assets/backgrounds/login_water_plant_ai_bg.png
assets/backgrounds/sidebar_water_plant_thumb.png
```

## V3.7 第一阶段第三张资产归档更新

本版本继续执行第一阶段 Image2 资产生成，并新增归档：

```text
assets/backgrounds/report_cover_water_plant.png
```

目前已完成归档的第一阶段背景类资产：

```text
assets/backgrounds/login_water_plant_ai_bg.png
assets/backgrounds/sidebar_water_plant_thumb.png
assets/backgrounds/report_cover_water_plant.png
```

## V3.8 第一阶段空状态插图归档更新

本版本继续执行第一阶段 Image2 资产生成，并新增归档 5 张空状态插图：

```text
assets/illustrations/empty_equipment_prices.png
assets/illustrations/empty_material_prices.png
assets/illustrations/empty_suppliers.png
assets/illustrations/empty_pending_quotes.png
assets/illustrations/empty_attachments.png
```

目前第一阶段已完成：

- 3 张背景图
- 5 张空状态插图

## V3.9 第一阶段 AI 功能插图归档更新

本版本继续执行第一阶段 Image2 资产生成，并新增归档 4 张 AI 功能插图：

```text
assets/illustrations/ai_assistant_price_intelligence.png
assets/illustrations/ai_quote_recognition.png
assets/illustrations/ai_price_collection.png
assets/illustrations/ai_report_generation.png
```

至此，第一阶段 12 张 Image2 资产已全部生成并归档完成：

- 3 张背景图
- 5 张空状态插图
- 4 张 AI 功能插图

## V4.0 第二阶段 SVG / Logo / 图标资产更新

本版本完成第二阶段图标资产整理，新增：

```text
assets/svg-icons/
```

已生成：

- 1 个系统 Logo；
- 15 个导航图标；
- 12 个操作图标；
- 6 个状态图标。

共 34 个 SVG 资产。

新增文档：

```text
docs/18_PHASE2_SVG_ICON_ASSET_CHECKLIST.md
assets/svg-icons/README.md
assets/svg-icons/icon_manifest.json
```

至此：

- 第一阶段 Image2 图片资产已完成；
- 第二阶段 SVG 图标资产已完成；
- 下一步可进入第三阶段：Codex 搭建组件库。

## V4.1 当前阶段说明

本版本将项目状态调整为：

> 规范与资产准备完成，Codex 开发暂缓。

当前不进入组件库搭建，也不要求 Codex 立即开发代码。

当前重点是：

- 保留第一阶段 Image2 资产；
- 保留第二阶段 SVG 图标资产；
- 补齐资产使用规则；
- 补齐页面路由与资产对应关系；
- 补齐后续 Codex 开发前置要求。

新增文档：

```text
docs/21_CURRENT_STAGE_SPEC_COMPLETION_GUIDE.md
docs/22_PAGE_ROUTE_AND_ASSET_MAPPING.md
docs/23_PROJECT_SPEC_STATUS.md
```

## V4.2 Mock 数据清单与字段字典更新

本版本新增：

```text
field-dictionary/
mock-data-spec/
mock-data/
```

用于后续 Codex 开发前约束：

- 字段命名；
- 页面表格字段；
- mock 数据结构；
- AI 输出字段；
- 状态枚举；
- 数据之间的关联关系。

当前仍不进入代码开发。

## V4.3 API 草案与页面验收表更新

本版本新增：

```text
api-spec/
acceptance-checklists/
```

用于后续开发前明确：

- API 模块划分；
- 统一请求响应结构；
- 各业务接口草案；
- 页面验收标准；
- UI还原验收；
- 业务字段验收；
- 资产使用验收；
- AI流程验收。

当前仍不进入代码开发。

## V4.4 全面检查报告

本版本新增：

```text
docs/29_FULL_PACKAGE_AUDIT_REPORT.md
```

该报告对当前规范包进行完整检查，结论为：

- UI参考图完整；
- Image2资产完整；
- SVG图标完整；
- 字段字典完整；
- Mock数据规范完整；
- API草案完整；
- 页面验收表完整；
- 当前主要缺口是：Codex分轮开发提示词、页面开发顺序、最终交接总提示词。

## V4.5 Codex 分轮开发提示词与最终交接更新

本版本新增：

```text
codex-prompts/
development-plan/
docs/30_FINAL_CODEX_HANDOFF_PROMPT.md
docs/31_FINAL_PACKAGE_OVERVIEW.md
docs/32_CODEX_ROUND_EXECUTION_INDEX.md
```

至此，规范包已经具备：

- 资产；
- UI参考；
- 字段；
- Mock；
- API；
- 验收；
- 开发顺序；
- 分轮提示词；
- 最终交接提示词。

可以正式作为 Codex 开发前置包使用。

## V4.6 视觉效果规范增强版

本版本新增：

```text
visual-design-spec/
```

用于把 28 张页面效果图的视觉风格转化为可执行规范，包括：

- 颜色 token；
- 字体 token；
- 间距、圆角、阴影；
- 卡片样式；
- 表格样式；
- 按钮、表单、筛选器；
- 状态标签；
- 图表视觉；
- Sidebar / Topbar；
- AI模块；
- 空状态；
- 28页视觉模式总结；
- Tailwind token 映射；
- Codex视觉实现检查清单。

同时更新：

```text
codex-prompts/02_ROUND_DESIGN_TOKENS_AND_LAYOUT.md
codex-prompts/03_ROUND_COMPONENT_LIBRARY.md
acceptance-checklists/01_GLOBAL_UI_ACCEPTANCE.md
docs/30_FINAL_CODEX_HANDOFF_PROMPT.md
docs/31_FINAL_PACKAGE_OVERVIEW.md
```

## V4.7 Round 4.1 Dashboard 首页补强规范包

新增：

```text
dashboard-enhancement/
```

用途：把 `/dashboard` 首页从普通 MVP 仪表盘补强为高密度运营驾驶舱。

本轮只允许增强 `/dashboard`，不得开发其他业务页面，不得进入 Round 5。

## V4.8 Dashboard 参考图像素复刻修正规范包

新增：

```text
dashboard-pixel-restore/
```

用途：把 `/dashboard` 首页从“功能基本齐全”升级为“更接近参考图的高密度运营驾驶舱”。

本轮关键策略：
- 不单独生成图片；
- 图标体系优先使用 `lucide-react`；
- 必要时后续再补 SVG 图标包；
- 先完成布局复刻、视觉调优、截图对比修正。

## V4.9 Dashboard 像素复刻细化补丁包

本版本继续增强 `dashboard-pixel-restore/`，用于解决 Dashboard 高度还原参考图时的最后细节问题：

- 模块内部结构；
- Dashboard 组件 compact/dashboard 变体；
- 模块标题 + 图标容器系统；
- 代码实现约束；
- 截图差异闭环；
- 不得进入 Round 5 的硬性阻断条件。

合并后建议执行：

```text
dashboard-pixel-restore/17_ROUND_4_3_FINE_TUNING_CODEX_PROMPT.md
```

## V5.0 首页最终约束与全页面风格一致性规范

新增：

```text
dashboard-final-constraints/
page-style-consistency/
```

核心原则：

```text
首页是视觉基准，不是所有页面的布局模板。
其他页面继承首页风格，但按页面类型采用不同结构。
```

后续页面必须继承首页的工程蓝、AI紫、风险橙红、浅灰蓝背景、白色圆角卡片、lucide-react 图标、IconBox 模块标题、compact 表格、AI/风险/可信度 Badge、截图对比流程。
