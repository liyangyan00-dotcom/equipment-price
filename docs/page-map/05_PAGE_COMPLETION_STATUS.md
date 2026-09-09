# 页面完成状态

## 1. 总体状态

| 指标 | 数量 |
|---|---:|
| 页面路由模板 | 50 |
| 业务页面 | 48 |
| 登录页 | 1 |
| 根跳转页 | 1 |
| 已存在页面 | 50 |
| 可构建页面模板 | 50 |
| 一级页面 | 16 |
| 二级页面 | 15 |
| 三级页面 | 17 |
| P0 待补页面 | 0 |
| P1 后续页面 | 0 |
| 不建议独立路由功能 | 9 |

说明：

- “已存在”表示代码中已有独立 `page.tsx`。
- “前端完成”表示具备页面结构、视觉、Mock 或真实数据入口和基础交互，不代表真实业务化全部完成。
- “业务化中”表示已经接入部分 Supabase、Storage、RBAC、审计或真实 API，但仍需继续收口。

## 2. 当前 50 页状态

| 分组 | 页面 | 状态 | 后续重点 |
|---|---|---|---|
| 系统入口 | `/` | 已完成 | 保持重定向 |
| 认证 | `/login` | 业务化中 | 账号策略、找回密码、登录审计 |
| 首页 | `/dashboard` | 前端完成 | 只做轻量精修 |
| 设备价格 | `/equipment-prices` | 业务化中 | 真实查询、分页、状态一致性 |
| 设备价格 | `/equipment-prices/[id]` | 业务化中 | 证据、审核和动态 ID 数据 |
| 设备价格 | `/equipment-prices/[id]/edit` | 业务化中 | 保存、校验和并发控制 |
| 设备价格 | `/equipment-prices/create` | 业务化中 | 新增、草稿和提交审核 |
| 设备价格 | `/equipment-prices/import` | 业务化中 | Excel、Storage 和导入任务 |
| 设备价格 | `/equipment-prices/import/[id]` | 业务化中 | 批次错误与重试 |
| 设备价格 | `/equipment-prices/reviews` | 业务化中 | 审核、证据、权限和审计 |
| 设备价格 | `/equipment-prices/ai-recommendation` | 前端完成 | AI 服务接入与人工采用 |
| 地材价格 | `/material-prices` | 业务化中 | 真实查询、分页与状态一致性 |
| 地材价格 | `/material-prices/[id]` | 业务化中 | 真实详情与证据 |
| 地材价格 | `/material-prices/[id]/edit` | 业务化中 | 动态回填、保存与送审 |
| 地材价格 | `/material-prices/create` | 业务化中 | 草稿、新增与提交审核 |
| 地材价格 | `/material-prices/import` | 业务化中 | Excel 解析、校验和导入审核队列 |
| 地材价格 | `/material-prices/reviews` | 业务化中 | 单条、批量审核与人工意见 |
| 地材价格 | `/material-prices/manage` | 业务化中 | 批量治理和审核入口 |
| 供应商 | `/suppliers` | 业务化中 | 真实筛选、分类和准入 |
| 供应商 | `/suppliers/[id]` | 业务化中 | 动态主体、尽调和档案 |
| 供应商 | `/suppliers/manage` | 业务化中 | 冲突、重复和审核队列 |
| AI 工作流 | `/ai-quote-recognition` | 前端完成 | 真实识别器和上传任务 |
| AI 工作流 | `/pending-quotes` | 前端完成 | 真实审核与入库事务 |
| AI 工作流 | `/ai-price-collection` | 业务化中 | 采集执行器、日志和任务详情 |
| AI 工作流 | `/ai-price-collection/tasks/[id]` | 业务化中 | 真实任务、关联线索、审计与失败重试 |
| AI 工作流 | `/price-leads` | 前端完成 | 真实线索评估、入库与询价 |
| AI 工作流 | `/ai-inquiry-letter` | 前端完成 | 真实模型、版本和发送审批 |
| AI 工作流 | `/ai-workbench` | 前端完成 | 统一任务队列与状态 |
| 报告 | `/ai-report-center` | 前端完成 | 真实报告任务和存储 |
| 询价比价 | `/inquiries` | 业务化中 | 真实任务、响应和状态 |
| 询价比价 | `/inquiries/[id]` | 业务化中 | 动态询价档案和提醒 |
| 询价比价 | `/inquiries/create` | 业务化中 | 创建事务与供应商关联 |
| 询价比价 | `/comparisons/[id]` | 前端完成 | 真实报价比较和决策 |
| 项目套价 | `/project-pricing` | 前端完成 | 项目、BOQ 和套价版本 |
| 项目套价 | `/project-pricing/[id]` | 前端完成 | 动态方案和版本 |
| 项目套价 | `/project-pricing/boq-parse` | 前端完成 | 真实解析任务与修正 |
| 附件证据 | `/attachments` | 前端完成 | Storage、证据引用和权限 |
| 附件证据 | `/attachments/[id]` | 前端完成 | 真实文件预览、签名 URL、审核持久化和审计 |
| 报告 | `/reports/[id]` | 前端完成 | 真实预览、版本和导出 |
| 报告 | `/reports` | 前端完成 | 真实归档查询、版本、证据权限和导出队列 |
| 统计 | `/analytics` | 前端完成 | 真实聚合查询和钻取 |
| 设置 | `/settings` | 业务化中 | 配置持久化、用户和审计入口 |
| 设置 | `/settings/ai` | 真实持久化完成 | 组织级模型、阈值、风险规则、人工复核、提示词与任务配置已写入 Supabase；Provider 密钥由集成页和 Vault 管理 |
| 设置 | `/settings/users` | 业务化中 | 真实组织成员、邀请、角色、启停和审计摘要 |
| 设置 | `/settings/roles` | 业务化中 | 组织级权限覆盖、RLS、默认继承和变更审计 |
| 设置 | `/settings/roles/[role]` | 业务化中 | 角色成员、有效权限与影响分析 |
| 设置 | `/settings/logs` | 业务化中 | 真实组织审计、筛选、分页和字段差异 |
| 设置 | `/settings/dictionaries` | 业务化中 | 真实组织字典、RLS、使用影响、启停排序和审计 |
| 设置 | `/settings/integrations` | 业务化中 | 真实集成配置、Vault 凭据、RLS、配置验证与审计 |
| 设置 | `/settings/ai/audit-logs` | 业务化中 | 已接真实 AI 运行与 RLS；后续扩展成本、令牌和质量评估指标 |

## 3. P0 待补状态

当前 P0 路由已经全部补齐。

## 4. 当前结论

- 当前 50 页可以支撑完整前端演示，并已补齐地材价格库、采集任务详情、用户、角色、系统与 AI 审计、报告归档、附件详情、数据字典治理和外部集成管理层级。
- 设备价格层级最完整，可作为 Round 9D 的复用基准。
- 下一阶段优先推进现有页面的真实数据、权限和 AI 服务接入，不新增无明确对象的页面。
- 项目套价详情中的附件入口已由 `/attachments/[id]` 承接，既有死链风险已关闭。
- Round 9D 已完成地材四页建设与入口联动。
