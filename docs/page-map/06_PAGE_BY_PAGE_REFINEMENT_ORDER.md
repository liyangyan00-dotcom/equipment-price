# 逐页精修与新增顺序

## 1. 执行原则

1. 先稳定现有主业务链路，再新增 P0 页面。
2. 设备价格完整层级作为地材价格页面的结构和交互基准。
3. 真实业务化优先于继续增加装饰性页面。
4. Drawer / Modal / Panel 功能不进入独立页面排期。

## 2. 第一批：现有主业务闭环（P0）

| 顺序 | 页面 | 路由 | 影响演示 | 影响闭环 | 建议 |
|---:|---|---|---|---|---|
| 1 | 首页总览 | `/dashboard` | 是 | 是 | 保持视觉基准 |
| 2 | 设备价格库 | `/equipment-prices` | 是 | 是 | 稳定真实查询与操作 |
| 3 | 设备价格详情 | `/equipment-prices/[id]` | 是 | 是 | 动态数据与证据 |
| 4 | 设备价格编辑 | `/equipment-prices/[id]/edit` | 是 | 是 | 保存和审核回退 |
| 5 | 新增设备价格 | `/equipment-prices/create` | 是 | 是 | 新增和提交审核 |
| 6 | 设备价格导入中心 | `/equipment-prices/import` | 是 | 是 | Excel 与 Storage |
| 7 | 导入批次详情 | `/equipment-prices/import/[id]` | 是 | 是 | 错误与重试 |
| 8 | 设备价格审核中心 | `/equipment-prices/reviews` | 是 | 是 | 人工审核闭环 |
| 9 | 设备价格 AI 推荐 | `/equipment-prices/ai-recommendation` | 是 | 是 | 推荐到询价 |
| 10 | 询价管理 | `/inquiries` | 是 | 是 | 任务与比价入口 |
| 11 | 询价任务详情 | `/inquiries/[id]` | 是 | 是 | 单任务档案 |
| 12 | 创建询价 | `/inquiries/create` | 是 | 是 | 创建事务 |
| 13 | 比价详情 | `/comparisons/[id]` | 是 | 是 | 决策与套价 |
| 14 | 项目套价中心 | `/project-pricing` | 是 | 是 | 套价主流程 |
| 15 | 项目套价方案详情 | `/project-pricing/[id]` | 是 | 是 | 方案版本 |
| 16 | BOQ 解析详情 | `/project-pricing/boq-parse` | 是 | 是 | 解析与缺口 |

## 3. 第二批：价格库与供应商（P0/P1）

| 顺序 | 页面 | 路由 | 优先级 | 建议 |
|---:|---|---|---|---|
| 17 | 地材价格库 | `/material-prices` | P0 | 作为 Round 9D 主入口 |
| 18 | 地材价格详情 | `/material-prices/[id]` | P0 | 补真实详情与证据 |
| 19 | 地材价格管理 | `/material-prices/manage` | P0 | 与新增四页联动 |
| 20 | 新增地材价格 | `/material-prices/create` | P0 | 已完成草稿与送审入口 |
| 21 | 编辑地材价格 | `/material-prices/[id]/edit` | P0 | 已完成动态回填与保存 |
| 22 | 地材价格导入中心 | `/material-prices/import` | P0 | 已完成 Excel 校验与送审 |
| 23 | 地材价格审核中心 | `/material-prices/reviews` | P0 | 已完成人工审核闭环 |
| 24 | 供应商库 | `/suppliers` | P1 | 稳定分类、筛选和准入 |
| 25 | 供应商详情 | `/suppliers/[id]` | P1 | 主体、尽调和证据 |
| 26 | 供应商资料维护 | `/suppliers/manage` | P1 | 冲突、重复和审核 |

## 4. 第三批：AI 工作流（P0/P1）

| 顺序 | 页面 | 路由 | 优先级 | 建议 |
|---:|---|---|---|---|
| 27 | AI 报价识别 | `/ai-quote-recognition` | P0 | 上传、识别和审核任务 |
| 28 | 待审核报价池 | `/pending-quotes` | P0 | 人工确认和入库 |
| 29 | AI 价格采集 | `/ai-price-collection` | P0 | 连接任务详情和执行器 |
| 41 | 价格采集任务详情 | `/ai-price-collection/tasks/[id]` | P0 | 已完成配置、日志、线索和重试闭环 |
| 30 | 价格线索池 | `/price-leads` | P0 | 评估、入库和询价 |
| 31 | AI 询价函生成 | `/ai-inquiry-letter` | P1 | 草稿、版本和审批 |
| 32 | AI 工作台 | `/ai-workbench` | P1 | 统一任务状态 |
| 33 | AI 报告中心 | `/ai-report-center` | P1 | 报告任务闭环 |

## 5. 第四批：报告、附件、统计和设置（P1/P2）

| 顺序 | 页面 | 路由 | 优先级 | 建议 |
|---:|---|---|---|---|
| 34 | 附件证据库 | `/attachments` | P1 | Storage 与证据权限 |
| 35 | 报告预览 | `/reports/[id]` | P1 | 真实版本和导出 |
| 36 | 统计分析 | `/analytics` | P2 | 真实聚合和钻取 |
| 37 | 系统设置 | `/settings` | P0 | 承接用户、角色和审计 |
| 38 | AI 设置 | `/settings/ai` | 已锁定 | 真实组织级持久化、RBAC、RLS 与审计已完成；下一阶段接 AI 执行网关和运行指标 |
| 39 | 登录页 | `/login` | P1 | 密码策略和登录审计 |
| 40 | 根路由跳转 | `/` | P2 | 只做回归检查 |

## 6. 第五批：设置后台 P0 页面

| 建议顺序 | 页面 | 路由 | 影响闭环 |
|---:|---|---|---|
| 42 | 用户管理 | `/settings/users` | 是（已完成真实组织成员、邀请、角色与启停） |
| 43 | 角色权限管理 | `/settings/roles` | 是（已完成组织级权限覆盖、RLS 与审计） |
| 44 | 角色详情 | `/settings/roles/[role]` | 是（已完成成员、权限与影响详情） |
| 45 | 审计日志 | `/settings/logs` | 是（已完成真实筛选、分页和差异详情） |

## 7. 第六批：P1 页面

| 建议顺序 | 页面 | 路由 |
|---:|---|---|
| 46 | 报告库 | `/reports`（已完成归档筛选、版本、证据与导出联动） |
| 47 | 附件证据详情 | `/attachments/[id]`（已完成预览、AI抽取、关联链和审计时间线） |
| 48 | 数据字典 | `/settings/dictionaries`（已完成组织字典、使用影响、RLS 与真实审计） |
| 49 | 外部集成 | `/settings/integrations`（已完成 Vault 凭据、配置验证、RLS 与审计） |
| 50 | AI 审计日志 | `/settings/ai/audit-logs`（已完成真实运行汇总、模型版本、风险、人工复核和业务对象追溯） |

## 8. Round 9D 建议边界

Round 9D 已补齐地材价格完整层级：

1. 新增地材价格；
2. 编辑地材价格；
3. 地材价格导入中心；
4. 地材价格审核中心；
5. 与现有 `/material-prices`、`/[id]`、`/manage` 建立入口和状态联动。

采集任务详情和设置后台页面应拆分到后续独立轮次。
