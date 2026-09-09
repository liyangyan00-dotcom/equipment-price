# 四级功能组件清单

## 1. 设计原则

四级功能依赖当前页面、当前选中对象或短流程上下文，优先使用 Drawer、Modal、Panel、Tab、Step 和 Dialog，不默认新增独立路由。

独立页面与四级功能必须分开统计：

- `/equipment-prices/create`、`/[id]/edit`、`/import`、`/reviews` 已是独立页面，不再列为 Drawer 占位。
- `/inquiries/create` 虽然使用 Step，但它本身是独立三级页面。
- `/material-prices/create`、`/[id]/edit`、`/import`、`/reviews` 已是独立页面，不再列为 Drawer 占位。
- `/ai-price-collection/tasks/[id]` 是需要刷新、追踪和重试的独立长任务页面，不以 Drawer 替代。
- 本文件中的局部 Step / Panel 不增加当前 50 页数量。

## 2. 通用交互组件

| 组件 | 文件 | 用途 |
|---|---|---|
| ConfirmDialog | `src/components/common/ConfirmDialog.tsx` | 删除、驳回、确认、审核、重置 |
| EditDrawer | `src/components/common/EditDrawer.tsx` | 局部编辑和字段补全 |
| DetailDrawer | `src/components/common/DetailDrawer.tsx` | AI 理由、证据、局部详情 |
| MockUploadDialog | `src/components/common/MockUploadDialog.tsx` | 尚未接真实存储页面的上传模拟 |
| MockExportDialog | `src/components/common/MockExportDialog.tsx` | 导出参数与任务模拟 |
| AiActionDialog | `src/components/common/AiActionDialog.tsx` | AI loading、完成和待复核状态 |
| ActionMenu | `src/components/common/ActionMenu.tsx` | 更多操作菜单 |
| LoadingButton | `src/components/common/LoadingButton.tsx` | 异步按钮状态 |
| ToastViewport | `src/components/common/Toast.tsx` | 全局反馈 |
| RouteContextBanner | `src/components/common/RouteContextBanner.tsx` | 跨页面业务上下文 |
| SelectionSummaryBar | `src/components/common/SelectionSummaryBar.tsx` | 批量选择摘要 |

## 3. 明确不建议独立路由的功能

| 序号 | 功能 | 建议形态 | 当前或建议承载 |
|---:|---|---|---|
| 1 | 新增、编辑供应商 | Drawer / Modal | `/suppliers`、`/suppliers/[id]` |
| 2 | 价格线索详情 | RightPanel / DetailDrawer | `/price-leads` |
| 3 | 待审核报价详情 | RightPanel | `/pending-quotes` |
| 4 | AI 推荐理由 | DetailDrawer / Panel | AI 推荐模块 |
| 5 | 字段补全 | EditDrawer | 报价、供应商、BOQ 等表格 |
| 6 | 附件快速预览 | PreviewPanel | `/attachments` 及详情页 |
| 7 | 导出设置 | MockExportDialog / ExportDialog | 报告、表格、附件页面 |
| 8 | 驳回、作废、审核备注 | ConfirmDialog / Modal | 审核工作流 |
| 9 | 单行 BOQ 修正 | EditDrawer | `/project-pricing/boq-parse` |

## 4. 其他四级交互总账

| 序号 | 功能 | 形态 | 所属页面 |
|---:|---|---|---|
| 10 | 上传报价 | UploadDialog | 设备价格库、AI 报价识别 |
| 11 | 删除或作废价格 | ConfirmDialog | 设备、地材价格页 |
| 12 | 查看证据链 | DetailDrawer / PreviewPanel | 价格详情、附件证据库 |
| 13 | 重复供应商合并 | ConfirmDialog + Drawer | 供应商资料维护 |
| 14 | AI 补全供应商资料 | AiActionDialog | 供应商资料维护 |
| 15 | 询价发送预览 | PreviewPanel | 创建询价、AI 询价函 |
| 16 | 比价方案选择 | ActionPanel | 比价详情 |
| 17 | 项目价格缺口处理 | Tab / Drawer | 项目套价、BOQ 解析 |
| 18 | AI 自动套价 | AiActionDialog | 项目套价中心 |
| 19 | 人工确认线索 | ConfirmDialog | AI 价格采集、价格线索池 |
| 20 | 转入价格线索池 | ConfirmDialog | AI 价格采集 |
| 21 | 报告版本记录 | Tab / Drawer | 报告预览 |
| 22 | 设置规则编辑 | EditDrawer / InlinePanel | 系统设置、AI 设置 |
| 23 | 系统配置重置 | ConfirmDialog | 系统设置 |
| 24 | 通知与任务快速详情 | Popover / Panel | Topbar、AI 工作台 |
| 25 | 角色权限保存确认 | ConfirmDialog | 角色权限管理 |
| 26 | 角色权限恢复默认 | ConfirmDialog | 角色权限管理 |
| 27 | 未保存权限切换确认 | ConfirmDialog | 角色权限管理 |
| 28 | 审计字段差异详情 | DetailDrawer | 系统审计日志 |

## 5. 收敛规则

1. 主动作“查看、进入、创建、管理”必须优先跳转明确路由，不落入通用兜底侧栏。
2. 行级编辑统一使用 EditDrawer，除非已经存在独立编辑页。
3. 删除、作废、确认、入库统一使用 ConfirmDialog。
4. AI 动作统一提供 loading、完成、待人工复核和失败状态。
5. 上传、导出按当前页面真实能力选择真实对话框或 mock 对话框，不混淆业务状态。
6. 四级功能总数当前记录为 28，不计入 50 个页面路由模板。
