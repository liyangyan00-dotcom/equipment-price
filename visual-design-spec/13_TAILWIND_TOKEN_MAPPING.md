# 13 Tailwind Token 映射建议

## 一、颜色映射

建议在 `tailwind.config.ts` 中扩展：

```ts
colors: {
  page: '#F3F7FB',
  card: '#FFFFFF',
  primary: {
    DEFAULT: '#0B5CAD',
    hover: '#084A94',
    soft: '#E8F2FF',
    deep: '#061B3A',
    navy: '#0B2454'
  },
  cyan: {
    DEFAULT: '#00A6B8',
    soft: '#E6FAFC'
  },
  ai: {
    DEFAULT: '#7C3AED',
    secondary: '#8B5CF6',
    soft: '#EDE9FE',
    border: '#DDD6FE'
  },
  success: {
    DEFAULT: '#16A34A',
    soft: '#DCFCE7'
  },
  warning: {
    DEFAULT: '#F59E0B',
    soft: '#FEF3C7'
  },
  danger: {
    DEFAULT: '#DC2626',
    soft: '#FEE2E2'
  },
  borderSoft: '#E2E8F0',
  textMain: '#1E293B',
  textMuted: '#64748B'
}
```

## 二、圆角映射

```ts
borderRadius: {
  sm: '8px',
  md: '10px',
  lg: '12px',
  card: '16px',
  'card-lg': '20px',
  pill: '999px'
}
```

## 三、阴影映射

```ts
boxShadow: {
  card: '0 8px 24px rgba(15,23,42,0.06)',
  'card-hover': '0 12px 36px rgba(15,23,42,0.10)',
  panel: '0 16px 48px rgba(15,23,42,0.12)',
  ai: '0 12px 40px rgba(124,58,237,0.16)',
  sidebar: '8px 0 28px rgba(6,27,58,0.18)'
}
```

## 四、组件 class 建议

### 页面

```text
bg-page text-textMain
```

### 卡片

```text
bg-card border border-borderSoft rounded-card shadow-card
```

### Sidebar

```text
bg-gradient-to-b from-primary-deep to-primary-navy shadow-sidebar
```

### AI按钮

```text
bg-gradient-to-r from-primary to-ai text-white shadow-ai
```

### 状态标签

```text
rounded-pill px-2 h-6 text-xs font-medium
```

## 五、建议建立工具函数

```ts
getStatusBadgeClass(status)
getConfidenceBadgeClass(level)
getRiskBadgeClass(riskLevel)
getAiConfidenceColor(score)
formatCurrency(value, currency)
formatPercent(value)
```

## 六、强制要求

1. Token 定义优先于页面内写死颜色；
2. 状态颜色通过工具函数统一；
3. 图表颜色使用 chartColors；
4. 组件不要随意写魔法值；
5. 后续所有页面必须复用同一套 token。
