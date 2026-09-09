# 页面层级定义

## 1. 统计原则

页面层级按业务导航关系定义，不单纯按 URL 斜杠数量定义。

- 独立 `page.tsx` 才计为页面。
- 动态路由模板按 1 个页面计。
- API Route Handler 不计为页面。
- Drawer、Modal、Panel、Tab、Step 不计为独立页面。
- `/` 与 `/login` 属于技术入口和认证入口，不纳入一级至三级业务页面数量。

## 2. 一级页面（16）

定义：侧边栏或全局导航直接可进入的模块入口。

| 页面 | 路由 |
|---|---|
| 首页总览 | `/dashboard` |
| 设备价格库 | `/equipment-prices` |
| 地材价格库 | `/material-prices` |
| 供应商库 | `/suppliers` |
| AI 报价识别 | `/ai-quote-recognition` |
| 待审核报价池 | `/pending-quotes` |
| AI 价格采集 | `/ai-price-collection` |
| 价格线索池 | `/price-leads` |
| AI 询价函生成 | `/ai-inquiry-letter` |
| 询价管理 | `/inquiries` |
| 项目套价 | `/project-pricing` |
| 附件证据库 | `/attachments` |
| 统计分析 | `/analytics` |
| AI 工作台 | `/ai-workbench` |
| AI 报告中心 | `/ai-report-center` |
| 系统设置 | `/settings` |

## 3. 二级页面（15）

定义：一级模块下的专用业务中心、治理中心或配置中心。

| 页面 | 路由 | 上级模块 |
|---|---|---|
| 设备价格 AI 推荐 | `/equipment-prices/ai-recommendation` | 设备价格库 |
| 设备价格导入中心 | `/equipment-prices/import` | 设备价格库 |
| 设备价格审核中心 | `/equipment-prices/reviews` | 设备价格库 |
| 地材价格导入中心 | `/material-prices/import` | 地材价格库 |
| 地材价格审核中心 | `/material-prices/reviews` | 地材价格库 |
| 地材价格管理 | `/material-prices/manage` | 地材价格库 |
| 供应商资料维护 | `/suppliers/manage` | 供应商库 |
| AI 设置 | `/settings/ai` | 系统设置 |
| AI 审计日志 | `/settings/ai/audit-logs` | AI 设置 |
| 用户管理 | `/settings/users` | 系统设置 |
| 角色权限管理 | `/settings/roles` | 系统设置 |
| 系统审计日志 | `/settings/logs` | 系统设置 |
| 数据字典治理 | `/settings/dictionaries` | 系统设置 |
| 外部集成管理 | `/settings/integrations` | 系统设置 |
| 报告库 | `/reports` | AI 报告中心 |

## 4. 三级页面（17）

定义：单对象详情、创建、编辑、批次结果、预览或方案详情页面。

| 页面 | 路由 | 页面性质 |
|---|---|---|
| 设备价格详情 | `/equipment-prices/[id]` | 详情 |
| 设备价格编辑 | `/equipment-prices/[id]/edit` | 编辑 |
| 新增设备价格 | `/equipment-prices/create` | 创建 |
| 设备导入批次详情 | `/equipment-prices/import/[id]` | 批次详情 |
| 地材价格详情 | `/material-prices/[id]` | 详情 |
| 地材价格编辑 | `/material-prices/[id]/edit` | 编辑 |
| 新增地材价格 | `/material-prices/create` | 创建 |
| 供应商详情 | `/suppliers/[id]` | 详情 |
| 创建询价 | `/inquiries/create` | 创建 / Step |
| 询价任务详情 | `/inquiries/[id]` | 详情 |
| 比价详情 | `/comparisons/[id]` | 详情 / 决策 |
| 项目套价方案详情 | `/project-pricing/[id]` | 方案详情 |
| BOQ 解析结果详情 | `/project-pricing/boq-parse` | 结果详情 |
| 报告预览 | `/reports/[id]` | 预览 |
| 附件证据详情 | `/attachments/[id]` | 详情 / 证据审计 |
| 价格采集任务详情 | `/ai-price-collection/tasks/[id]` | 任务详情 / 日志 / 重试 |
| 角色详情 | `/settings/roles/[role]` | 成员、有效权限与影响详情 |

## 5. 特殊入口（2）

| 页面 | 路由 | 说明 |
|---|---|---|
| 根路由跳转 | `/` | 重定向至 `/dashboard` |
| 登录页 | `/login` | Supabase Auth 登录入口 |

## 6. 四级功能

定义：依赖当前页面上下文的局部动作或子详情。

优先形态：

```text
Drawer
Modal
Step
Tab
PreviewPanel
ActionPanel
ConfirmDialog
UploadDialog
ExportDialog
Toast
```

明确不建议做成独立路由：

1. 新增、编辑供应商；
2. 价格线索详情；
3. 待审核报价详情；
4. AI 推荐理由；
5. 字段补全；
6. 附件快速预览；
7. 导出设置；
8. 驳回、作废、审核备注；
9. 单行 BOQ 修正。

## 7. 数量校验

```text
一级页面 16
+ 二级页面 15
+ 三级页面 17
+ 特殊入口 2
= 页面路由模板 50
```
