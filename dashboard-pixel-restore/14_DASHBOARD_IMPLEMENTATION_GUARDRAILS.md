# 14 Dashboard 代码实现约束

## 一、目的

避免 Codex 把所有逻辑堆在 `/dashboard/page.tsx`，导致代码混乱、样式难维护。

## 二、推荐文件结构

```text
src/app/dashboard/page.tsx

src/components/dashboard/
├── DashboardStatGrid.tsx
├── DashboardMainGrid.tsx
├── DashboardSectionHeader.tsx
├── AiWorkbenchOverview.tsx
├── LatestPriceUpdates.tsx
├── PendingReviewPanel.tsx
├── DashboardInsightCards.tsx
├── DistributionMiniCharts.tsx
├── DashboardRiskList.tsx
└── QuickActionBar.tsx

src/data/mock/dashboard.ts
src/lib/dashboardChartConfig.ts
```

## 三、page.tsx 职责

`page.tsx` 只负责：

1. 引入 mock 数据；
2. 组合 Dashboard 组件；
3. 保持页面级 grid；
4. 不写大量业务行组件；
5. 不写大量重复样式。

## 四、Dashboard 局部组件职责

| 文件 | 职责 |
|---|---|
| `DashboardStatGrid.tsx` | 顶部统计卡组 |
| `DashboardMainGrid.tsx` | 主区布局容器 |
| `DashboardSectionHeader.tsx` | 统一标题区 |
| `AiWorkbenchOverview.tsx` | AI工作台 |
| `LatestPriceUpdates.tsx` | 最新价格动态 |
| `PendingReviewPanel.tsx` | 待复核任务 |
| `DashboardInsightCards.tsx` | AI洞察三联卡 |
| `DistributionMiniCharts.tsx` | 分布图 |
| `DashboardRiskList.tsx` | 风险列表 |
| `QuickActionBar.tsx` | 快捷操作栏 |

## 五、样式实现约束

1. 优先使用 Tailwind token；
2. 不在多个地方写重复颜色；
3. 状态颜色走 `statusStyles`；
4. 金额、百分比、日期走 `formatters`；
5. 图表颜色走 `chartColors` 或 `dashboardChartConfig`；
6. 图标使用 lucide-react；
7. 不新增生图资产。

## 六、图表实现约束

图表必须组件化：

```text
PriceTrendChart
EquipmentCategoryChart
SupplierRegionChart
ConfidenceDistributionChart
```

不得把所有 chart 配置写在一个超长组件里。

## 七、禁止事项

1. page.tsx 超过 300 行；
2. 同一类 row/card 重复写三遍以上；
3. 使用 hard-coded 随机颜色；
4. 使用图片实现图表；
5. 直接复制参考图为背景。
