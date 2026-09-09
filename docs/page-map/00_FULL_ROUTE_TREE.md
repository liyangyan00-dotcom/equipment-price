# 全系统路由树

## 1. 统计口径

本文件以当前代码中的 `src/app/**/page.tsx` 为唯一统计依据。

- 页面路由模板总数：50。
- 业务页面：48。
- 登录页：1，`/login`。
- 根路由跳转页：1，`/`，仅重定向到 `/dashboard`。
- 侧边栏一级入口：16。
- 二级业务中心页：14。
- 三级详情、创建、管理、结果页：17。
- 动态路由模板（例如 `[id]`）按 1 个页面计。
- `src/app/api/**/route.ts` 与 `src/app/auth/**/route.ts` 是 Route Handler，不计入页面数量。

## 2. 系统入口

```text
/                                           根路由，重定向到 /dashboard
/login                                      登录页
```

## 3. 一级导航路由（16）

```text
/dashboard                                  首页总览

/equipment-prices                           设备价格库
/material-prices                            地材价格库
/suppliers                                  供应商库

/ai-quote-recognition                       AI 报价识别
/pending-quotes                             待审核报价池
/ai-price-collection                        AI 价格采集中心
└─ /ai-price-collection/tasks/[id]          采集任务详情、日志与失败重试
/price-leads                                价格线索池
/ai-inquiry-letter                          AI 询价函生成

/inquiries                                  询价管理
/project-pricing                            项目套价中心
/attachments                                附件证据库

/analytics                                  统计分析
/ai-workbench                               AI 工作台
/ai-report-center                           AI 报告中心
/settings                                   系统设置
├─ /settings/ai                             AI 规则与模型配置
│  └─ /settings/ai/audit-logs              AI 运行、风险与人工复核审计
├─ /settings/users                          用户、角色与账号状态管理
├─ /settings/roles                          组织级角色权限矩阵
│  └─ /settings/roles/[role]                角色成员、有效权限与业务影响详情
├─ /settings/logs                           系统操作与权限变更审计
├─ /settings/dictionaries                    数据字典治理
└─ /settings/integrations                    外部集成、Vault 凭据与连接治理
```

## 4. 价格库路由树

```text
/equipment-prices                           设备价格库
├─ /equipment-prices/[id]                   设备价格详情
│  └─ /equipment-prices/[id]/edit            设备价格编辑
├─ /equipment-prices/create                 新增设备价格
├─ /equipment-prices/import                 设备价格导入中心
│  └─ /equipment-prices/import/[id]          导入批次详情
├─ /equipment-prices/reviews                设备价格审核中心
└─ /equipment-prices/ai-recommendation      设备价格 AI 推荐

/material-prices                            地材价格库
├─ /material-prices/[id]                    地材价格详情
│  └─ /material-prices/[id]/edit             地材价格编辑
├─ /material-prices/create                  新增地材价格
├─ /material-prices/import                  地材价格导入中心
├─ /material-prices/reviews                 地材价格审核中心
└─ /material-prices/manage                  地材价格管理
```

说明：

- 设备价格库已形成列表、详情、新增、编辑、导入、批次、审核和 AI 推荐完整层级。
- 地材价格库已形成列表、详情、新增、编辑、导入、审核和管理完整层级。

## 5. 供应商路由树

```text
/suppliers                                  供应商情报库
├─ /suppliers/[id]                          供应商详情
└─ /suppliers/manage                        供应商资料维护
```

`/suppliers` 与 `/suppliers/manage` 不重复：

- `/suppliers` 负责供应商检索、AI 评估、风险和询价入口。
- `/suppliers/manage` 负责资料补全、去重、批量治理和人工审核。

新增、编辑供应商继续使用 Drawer / Modal，不新增独立路由。

## 6. 询价、比价与项目套价

```text
/inquiries                                  询价管理
├─ /inquiries/create                        创建询价任务
└─ /inquiries/[id]                          询价任务详情

/comparisons/[id]                           比价详情 / AI 比价分析

/project-pricing                            项目套价中心
├─ /project-pricing/[id]                    项目套价方案详情
└─ /project-pricing/boq-parse               BOQ 解析结果详情
```

`/project-pricing` 与 `/project-pricing/boq-parse` 不重复：

- 前者负责项目套价任务、自动套价与成本测算。
- 后者负责 BOQ 解析、行项目修正、价格匹配和缺口处理。

## 7. AI 工作流

```text
/ai-quote-recognition                       AI 报价识别中心
/pending-quotes                             待审核报价池
/ai-price-collection                        AI 价格采集中心
/price-leads                                价格线索池
/ai-inquiry-letter                          AI 询价函生成
/ai-workbench                               AI 工作台
/ai-report-center                           AI 报告生成中心
```

价格线索详情、待审核报价详情和 AI 推荐理由继续使用右侧 Panel / Drawer。

## 8. 报告、附件、统计与设置

```text
/attachments                                附件证据库
└─ /attachments/[id]                        单份附件证据详情与审计链
/reports                                    报告库、归档与版本治理
/reports/[id]                               报告预览与导出
/analytics                                  统计分析
/settings                                   系统设置
├─ /settings/ai                             AI 设置
│  └─ /settings/ai/audit-logs              AI 运行审计日志
├─ /settings/users                          用户管理
├─ /settings/roles                          角色权限管理
│  └─ /settings/roles/[role]                角色详情与影响分析
├─ /settings/logs                           系统审计日志
├─ /settings/dictionaries                    数据字典治理
└─ /settings/integrations                    外部集成管理
```

`/ai-report-center`、`/reports` 与 `/reports/[id]` 不重复：

- `/ai-report-center` 负责配置并生成报告任务。
- `/reports` 负责历史报告归档、筛选、版本与证据治理。
- `/reports/[id]` 负责单份报告预览、证据引用与导出。

## 9. 后续独立路由

当前已经批准的 P0 / P1 独立路由均已补齐。新的独立页面必须重新经过页面总账评审，不因局部操作自动扩展路由。

## 10. 当前结论

- 当前 50 个页面模板均已纳入总账。
- 当前没有需要删除的重复页面。
- 当前核心演示链路已有页面承载。
- 设置后台 P0 / P1 页面已经补齐，下一阶段优先收口真实业务数据与权限，不继续无序扩展路由。
