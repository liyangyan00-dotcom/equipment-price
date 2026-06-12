# 12 Dashboard 组件紧凑变体补丁规范

## 一、目的

通用组件通常偏稳、偏松。如果直接复用，Dashboard 容易不像高密度驾驶舱。

因此允许为 Dashboard 增加 compact/dashboard variant，但不得破坏其他页面。

## 二、建议组件变体

| 组件 | 建议变体 | 用途 |
|---|---|---|
| `StatCard` | `variant="compact"` | 顶部统计卡 |
| `ChartCard` | `variant="dashboard"` | 趋势图 / 分布图 |
| `DataTable` | `density="compact"` | 价格动态 / 待复核 |
| `AiInsightCard` | `variant="compact"` | AI洞察三联卡 |
| `RiskCard` | `variant="list"` | 风险预警列表 |
| `BaseCard` | `padding="compact"` | 小模块 |
| `Badge` | `size="sm"` | Dashboard标签 |
| `Button` | `size="xs"` / `size="sm"` | 行内操作 |
| `ModuleHeader` | `variant="dashboard"` | 模块标题区 |

## 三、StatCard compact

建议：

```tsx
<StatCard
  variant="compact"
  title="设备价格数"
  value="1,248"
  trend="+12 本周"
  icon={Database}
  tone="blue"
/>
```

视觉：

```text
height: 96px - 108px
padding: 14px - 16px
icon: 32px container
```

## 四、ChartCard dashboard

建议：

```tsx
<ChartCard
  variant="dashboard"
  title="价格趋势"
  subtitle="设备 / 地材 / AI线索"
  action={<TimeRangeSelect />}
>
  <PriceTrendChart />
</ChartCard>
```

视觉：

```text
height: 260px - 280px
padding: 16px
header compact
```

## 五、DataTable compact

建议：

```tsx
<DataTable density="compact" />
```

视觉：

```text
row height: 44px - 52px
font-size: 12px - 13px
badge size: sm
```

## 六、AiInsightCard compact

视觉：

```text
height: 132px - 152px
AI紫色点缀
metric prominent
action lightweight
```

## 七、DashboardSectionHeader

建议新增：

```text
src/components/dashboard/DashboardSectionHeader.tsx
```

用途：统一标题 + 图标容器 + 副标题 + 右侧操作。

## 八、不能做的事

1. 不要为了 Dashboard 改坏全局组件；
2. 不要在 page.tsx 里手写重复卡片样式；
3. 不要新增多个风格不一致的局部卡片；
4. 不要把通用组件改成只适配 Dashboard。
