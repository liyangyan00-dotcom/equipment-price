# 18 第二阶段 SVG / Logo / 图标资产清单

## 一、目标

第二阶段用于补齐系统中不适合用 Image2 的图标类资产，包括：

- 系统 Logo；
- 左侧导航图标；
- 操作图标；
- 状态图标；
- AI 相关图标。

这些资产统一放入：

```text
assets/svg-icons/
```

## 二、生成原则

1. 图标必须使用 SVG 或 lucide-react，不使用 Image2。
2. 图标不承载业务数据。
3. 图标应保持线性、简洁、蓝色工程风。
4. 状态图标可使用对应状态色。
5. SVG 应可以被 React 组件直接引用。
6. 后续前端开发时，可优先使用 lucide-react；本目录 SVG 作为自定义补充资产。

## 三、已生成图标清单

### 1. 系统 Logo

| 文件名 | 用途 | 状态 |
|---|---|---|
| `logo_water_price_system.svg` | 系统 Logo | 已生成 |

### 2. 导航图标

| 文件名 | 对应页面 | 状态 |
|---|---|---|
| `icon_nav_dashboard.svg` | 首页 | 已生成 |
| `icon_nav_equipment.svg` | 设备价格库 | 已生成 |
| `icon_nav_material.svg` | 地材价格库 | 已生成 |
| `icon_nav_supplier.svg` | 供应商库 | 已生成 |
| `icon_nav_ai_quote.svg` | AI报价识别 | 已生成 |
| `icon_nav_pending_quote.svg` | 待审核报价 | 已生成 |
| `icon_nav_ai_collection.svg` | AI价格采集 | 已生成 |
| `icon_nav_price_leads.svg` | 价格线索池 | 已生成 |
| `icon_nav_inquiry.svg` | 询价比价 | 已生成 |
| `icon_nav_project_pricing.svg` | 项目套价 | 已生成 |
| `icon_nav_attachment.svg` | 附件证据 | 已生成 |
| `icon_nav_analytics.svg` | 统计分析 | 已生成 |
| `icon_nav_ai_workbench.svg` | AI工作台 | 已生成 |
| `icon_nav_ai_report.svg` | AI报告中心 | 已生成 |
| `icon_nav_settings.svg` | 系统设置 | 已生成 |

### 3. 操作图标

| 文件名 | 用途 | 状态 |
|---|---|---|
| `icon_action_add.svg` | 新增 | 已生成 |
| `icon_action_edit.svg` | 编辑 | 已生成 |
| `icon_action_view.svg` | 查看 | 已生成 |
| `icon_action_delete.svg` | 删除 | 已生成 |
| `icon_action_upload.svg` | 上传 | 已生成 |
| `icon_action_download.svg` | 下载 | 已生成 |
| `icon_action_export.svg` | 导出 | 已生成 |
| `icon_action_filter.svg` | 筛选 | 已生成 |
| `icon_action_search.svg` | 搜索 | 已生成 |
| `icon_action_refresh.svg` | 刷新 | 已生成 |
| `icon_action_confirm.svg` | 确认 | 已生成 |
| `icon_action_ai_review.svg` | AI复核 | 已生成 |

### 4. 状态图标

| 文件名 | 用途 | 状态 |
|---|---|---|
| `icon_status_confirmed.svg` | 已确认 | 已生成 |
| `icon_status_pending.svg` | 待审核 | 已生成 |
| `icon_status_warning.svg` | 预警 | 已生成 |
| `icon_status_risk.svg` | 高风险 | 已生成 |
| `icon_status_voided.svg` | 已作废 | 已生成 |
| `icon_status_ai.svg` | AI生成/AI建议 | 已生成 |

## 四、下一步

进入第三阶段：

> Codex 搭建前端组件库。

优先组件：

- AppSidebar；
- AppTopbar；
- StatCard；
- StatusBadge；
- DataTable；
- AiInsightCard；
- ChartCard；
- Dialog；
- UploadPanel。
