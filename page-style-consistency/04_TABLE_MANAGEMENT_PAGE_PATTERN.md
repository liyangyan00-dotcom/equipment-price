# 04 Table 数据管理型页面规范

适用页面：
```text
/equipment-prices
/material-prices
/suppliers
/pending-quotes
/price-leads
/inquiries
/attachments
```

页面结构：
```text
PageHeader
StatsSummary 可选
FilterBar
PrimaryDataTable
BatchActionBar 可选
RightDrawer / DetailPreview 可选
Pagination
```

继承首页：
1. 浅灰蓝背景；
2. 白色圆角卡片；
3. 统一模块标题；
4. lucide-react 图标；
5. compact 表格；
6. AI / 风险 / 可信度 Badge。

不要照搬首页：
1. 首页 6 KPI；
2. 大趋势图；
3. AI工作台；
4. 三联洞察卡。

表格密度：
| 项 | 建议 |
|---|---|
| 行高 | 42px - 52px |
| 表头 | 轻灰背景 |
| 字号 | 12px - 13px |
| 操作 | 轻量按钮 |
| 金额 | 右对齐 |
| 状态 | Badge小型化 |
