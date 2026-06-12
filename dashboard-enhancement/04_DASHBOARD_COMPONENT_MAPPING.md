# 04 Dashboard 组件复用映射

## 必须复用 Round 2

| 组件 | 用途 |
|---|---|
| AppLayout | 页面外壳 |
| AppSidebar | 侧边栏 |
| AppTopbar | 顶部栏 |
| PageHeader | 页面标题 |

## 必须复用 Round 3

| 组件 | Dashboard用途 |
|---|---|
| StatCard | 顶部统计 |
| BaseCard / DataCard | 普通卡片 |
| ChartCard | 趋势图/分布图 |
| AiInsightCard | AI工作台/洞察三联卡 |
| RiskCard | 风险模块 |
| DataTable | 价格动态/待复核任务 |
| StatusBadge | 状态 |
| ConfidenceBadge | 可信度 |
| RiskBadge | 风险等级 |
| AiBadge | AI来源 |
| AiConfidenceBar | 置信度/成功率 |

## 允许新增 Dashboard 局部组件

```text
src/components/dashboard/AiWorkbenchOverview.tsx
src/components/dashboard/LatestPriceUpdates.tsx
src/components/dashboard/PendingReviewPanel.tsx
src/components/dashboard/DashboardInsightCards.tsx
src/components/dashboard/DashboardRiskList.tsx
src/components/dashboard/QuickActionBar.tsx
src/components/dashboard/DistributionMiniCharts.tsx
```

要求：

1. 只能服务 `/dashboard`；
2. 必须复用基础组件；
3. 不重复造 Badge / Table；
4. 不引入真实 API。

## 图表要求

推荐：

| 模块 | 图表 |
|---|---|
| 价格趋势 | LineChart |
| 设备分类分布 | PieChart / BarChart |
| 供应商区域分布 | PieChart |
| 价格可信度分布 | BarChart |

必须使用 Recharts 或代码实现。
