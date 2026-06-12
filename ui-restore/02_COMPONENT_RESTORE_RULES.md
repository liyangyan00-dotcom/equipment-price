# 02 组件还原规则

## 一、必须组件化

以下内容必须做成可复用组件：

- AppSidebar；
- AppTopbar；
- PageHeader；
- StatCard；
- AiInsightCard；
- RiskAlertCard；
- DataTable；
- FilterBar；
- StatusBadge；
- ConfidenceBadge；
- ActionButtonGroup；
- ChartCard；
- UploadPanel；
- ConfirmDialog；
- EmptyState。

## 二、状态标签

| 状态 | 颜色 |
|---|---|
| 已确认 | 绿色 |
| 待审核 | 橙色 |
| 需补充 | 蓝色 |
| 高风险 | 红色 |
| AI生成 | 紫色 |
| AI建议 | 紫色 |
| 已入库 | 绿色 |
| 已作废 | 灰色 |

## 三、卡片

卡片必须使用代码实现：

- 背景：白色；
- 边框：浅蓝灰；
- 圆角：12-16px；
- 阴影：轻微；
- 内边距：16-24px；
- 标题：深蓝/深灰；
- 数据数字：大号加粗。

## 四、图表

图表必须使用 Recharts 或等效组件实现，不允许截图代替。

可用图表：

- 折线图；
- 环形图；
- 柱状图；
- 雷达图；
- 进度条；
- 小型 sparkline。

## 五、AI模块

AI模块统一视觉：

- AI标签用紫色；
- AI建议卡使用浅紫/浅蓝背景；
- AI风险使用橙红；
- AI置信度用进度条或百分比；
- AI结果必须有“人工复核”入口。
