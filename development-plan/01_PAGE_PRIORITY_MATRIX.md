# 01 页面优先级矩阵

## 一、页面优先级表

| 编号 | 页面 | 路由 | 优先级 | 开发轮次 | 说明 |
|---:|---|---|---|---|---|
| 27 | 登录页 | `/login` | P0 | Round 4 | 入口页面，使用登录背景图 |
| 01 | 首页 | `/dashboard` | P0 | Round 4 | 系统总览和AI入口 |
| 02 | 设备价格库 | `/equipment-prices` | P0 | Round 5 | 核心业务 |
| 05 | 地材价格库 | `/material-prices` | P0 | Round 5 | 核心业务 |
| 07 | 供应商库 | `/suppliers` | P0 | Round 5 | 核心业务 |
| 10 | AI报价识别 | `/ai-quote-recognition` | P0 | Round 6 | AI闭环入口 |
| 11 | 待审核报价池 | `/pending-quotes` | P0 | Round 6 | AI到人工复核闭环 |
| 12 | AI价格采集 | `/ai-price-collection` | P0 | Round 6 | AI采集入口 |
| 13 | 价格线索池 | `/price-leads` | P0 | Round 6 | 采集结果承接 |
| 18 | 项目套价中心 | `/project-pricing` | P0 | Round 7 | 套价核心 |
| 23 | AI报告中心 | `/ai-report-center` | P0 | Round 8 | 报告生成核心 |
| 03 | 设备详情 | `/equipment-prices/[id]` | P1 | Round 5 | 详情页 |
| 08 | 供应商详情 | `/suppliers/[id]` | P1 | Round 5 | 详情页 |
| 14 | 询价管理 | `/inquiries` | P1 | Round 7 | 询价闭环 |
| 15 | 创建询价 | `/inquiries/create` | P1 | Round 7 | 询价创建 |
| 17 | 比价详情 | `/comparisons/[id]` | P1 | Round 7 | 比价决策 |
| 19 | BOQ解析 | `/project-pricing/boq-parse` | P1 | Round 7 | 套价前置 |
| 20 | 附件证据库 | `/attachments` | P1 | Round 8 | 证据链 |
| 21 | 统计分析 | `/analytics` | P1 | Round 8 | 数据分析 |
| 22 | AI工作台 | `/ai-workbench` | P1 | Round 8 | AI任务管理 |
| 24 | 报告预览 | `/reports/[id]` | P1 | Round 8 | 报告导出 |
| 04 | AI推荐分析 | `/equipment-prices/ai-recommendation` | P2 | Round 6 | 可并入详情 |
| 06 | 地材管理 | `/material-prices/manage` | P2 | Round 9 | 可后置 |
| 09 | 供应商管理 | `/suppliers/manage` | P2 | Round 9 | 可后置 |
| 16 | AI询价函 | `/ai-inquiry-letter` | P2 | Round 9 | 可后置 |
| 25 | AI系统设置 | `/settings/ai` | P2 | Round 9 | 可后置 |
| 26 | 通用设置 | `/settings` | P2 | Round 9 | 可后置 |
| 28 | 组件预览 | `/components-preview` | P2 | Round 10 | 验收辅助 |

## 二、MVP 建议范围

MVP 不建议一次性完成全部 28 页。

MVP 建议范围：

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

这 11 个页面即可支撑第一版演示。
