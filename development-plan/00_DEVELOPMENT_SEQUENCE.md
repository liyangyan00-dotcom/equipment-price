# 00 页面开发顺序总控表

## 一、总体原则

本项目不能让 Codex 一次性开发 28 个页面。

必须按以下顺序推进：

```text
项目初始化 → 设计系统 → 基础布局 → 组件库 → 核心页面 → AI页面 → 套价/报告 → 设置权限 → Mock API → 验收修复
```

## 二、推荐开发阶段

| 阶段 | 目标 | 页面/模块 | 是否进入 MVP |
|---|---|---|---|
| Round 1 | 项目初始化 | Next.js、Tailwind、shadcn/ui、目录结构 | 是 |
| Round 2 | 设计系统与布局 | tokens、Sidebar、Topbar、Layout | 是 |
| Round 3 | 通用组件库 | 卡片、表格、标签、筛选、弹窗、图表 | 是 |
| Round 4 | 登录页与首页 | `/login`、`/dashboard` | 是 |
| Round 5 | 价格库核心页 | 设备价格、地材价格、供应商 | 是 |
| Round 6 | AI报价与采集页 | AI报价识别、待审核报价、价格采集、线索池 | 是 |
| Round 7 | 询价、比价、套价 | 询价任务、比价详情、BOQ解析、项目套价 | 是 |
| Round 8 | 附件、报告、统计 | 附件库、AI报告、报告预览、统计分析 | 是 |
| Round 9 | 设置与权限 | AI设置、用户权限、系统配置 | 可后置 |
| Round 10 | Mock API与验收修复 | mock数据绑定、验收表检查、UI修复 | 是 |

## 三、页面优先级

### P0 必须优先完成

```text
/login
/dashboard
/equipment-prices
/material-prices
/suppliers
/ai-quote-recognition
/pending-quotes
/ai-price-collection
/price-leads
/project-pricing
/ai-report-center
```

### P1 第二批完成

```text
/equipment-prices/[id]
/suppliers/[id]
/inquiries
/inquiries/create
/comparisons/[id]
/project-pricing/boq-parse
/attachments
/analytics
/ai-workbench
/reports/[id]
```

### P2 可以后置

```text
/material-prices/manage
/suppliers/manage
/ai-inquiry-letter
/settings/ai
/settings
/components-preview
```

## 四、关键控制点

1. 每一轮只做本轮目标；
2. 每一轮完成后运行检查；
3. 不允许跳过设计系统直接写页面；
4. 不允许跳过字段字典随意写数据；
5. 不允许用图片代替表格和图表；
6. 不允许 AI 结果直接入库，必须经过待审核流程；
7. 不允许把 28 页 UI 参考图整页切图使用。
