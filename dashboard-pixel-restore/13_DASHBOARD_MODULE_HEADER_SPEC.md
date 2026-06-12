# 13 Dashboard 模块标题与图标系统细化规范

## 一、统一标题结构

推荐组件：

```tsx
<DashboardSectionHeader
  icon={TrendingUp}
  title="价格趋势"
  subtitle="设备、地材与AI线索变化"
  tone="blue"
  action={<Button size="xs">近30天</Button>}
/>
```

## 二、标题区结构

```text
Container
├── Left
│   ├── IconBox
│   └── TextGroup
│       ├── Title
│       └── Subtitle
└── RightAction
```

## 三、IconBox 规范

| tone | 背景 | 图标色 | 用途 |
|---|---|---|---|
| blue | `#E8F2FF` | `#0B5CAD` | 普通数据 |
| cyan | `#E6FAFC` | `#00A6B8` | 供应商/区域 |
| purple | `#F5F3FF` | `#7C3AED` | AI |
| orange | `#FEF3C7` | `#F59E0B` | 预警 |
| red | `#FEE2E2` | `#DC2626` | 高风险 |
| green | `#DCFCE7` | `#16A34A` | 已确认/成功 |

尺寸：

```text
32px 或 36px
border-radius: 10px 或 12px
icon: 16px - 18px
```

## 四、模块图标映射

| 模块 | lucide-react 图标 | tone |
|---|---|---|
| 顶部概览 | `LayoutDashboard` | blue |
| 设备价格数 | `Database` | blue |
| 地材价格数 | `Boxes` | cyan |
| 供应商数量 | `Building2` | cyan |
| AI待复核 | `Bot` | purple |
| 今日价格线索 | `Radar` / `Activity` | purple |
| 高风险价格 | `AlertTriangle` | orange |
| 价格趋势 | `TrendingUp` | blue |
| AI工作台 | `Sparkles` / `Bot` | purple |
| 最新价格动态 | `Activity` | blue |
| 待复核任务 | `ClipboardCheck` | orange |
| AI洞察 | `BrainCircuit` | purple |
| 设备分类分布 | `PieChart` | blue |
| 供应商区域分布 | `MapPin` | cyan |
| 可信度分布 | `BarChart3` | purple |
| 风险预警 | `AlertTriangle` | orange/red |
| 快捷操作 | `Zap` | blue/purple |

## 五、右侧操作区

可用内容：

```text
查看全部
近7天 / 近30天
AI标签
高风险数量
刷新
```

样式：

```text
font-size: 12px - 13px
height: 28px - 32px
button variant: ghost / outline
```

## 六、禁止事项

1. 不要裸露放图标；
2. 不要每个模块图标大小不同；
3. 不要标题区没有副标题；
4. 不要右侧操作按钮过大；
5. 不要使用 PNG 图标。
