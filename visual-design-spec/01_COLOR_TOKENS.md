# 01 颜色 Token 规范

## 一、基础颜色

| Token | Hex | 用途 |
|---|---|---|
| `--color-bg-page` | `#F3F7FB` | 页面主背景 |
| `--color-bg-page-soft` | `#F6F9FC` | 页面浅背景 |
| `--color-bg-card` | `#FFFFFF` | 卡片背景 |
| `--color-bg-muted` | `#F8FAFC` | 表头/浅色区块 |
| `--color-border` | `#D8E3F0` | 常规边框 |
| `--color-border-soft` | `#E2E8F0` | 浅边框 |
| `--color-border-strong` | `#CBD5E1` | 强边框 |

## 二、品牌色

| Token | Hex | 用途 |
|---|---|---|
| `--color-primary` | `#0B5CAD` | 工程蓝主色 |
| `--color-primary-hover` | `#084A94` | 主色 hover |
| `--color-primary-soft` | `#E8F2FF` | 主色浅背景 |
| `--color-primary-deep` | `#061B3A` | 深蓝侧栏 |
| `--color-primary-navy` | `#0B2454` | 侧栏渐变 |
| `--color-cyan` | `#00A6B8` | 青蓝高亮 |
| `--color-cyan-soft` | `#E6FAFC` | 青蓝浅背景 |
| `--color-gold` | `#D6A84F` | 工程金色点缀 |

## 三、AI 色系

| Token | Hex | 用途 |
|---|---|---|
| `--color-ai-purple` | `#7C3AED` | AI主紫 |
| `--color-ai-purple-2` | `#8B5CF6` | AI渐变辅助 |
| `--color-ai-soft` | `#EDE9FE` | AI浅背景 |
| `--color-ai-border` | `#DDD6FE` | AI边框 |
| `--color-ai-glow` | `rgba(124,58,237,0.16)` | AI光效 |

## 四、状态色

| Token | Hex | 用途 |
|---|---|---|
| `--color-success` | `#16A34A` | 成功/已确认 |
| `--color-success-soft` | `#DCFCE7` | 成功浅背景 |
| `--color-warning` | `#F59E0B` | 待审核/预警 |
| `--color-warning-soft` | `#FEF3C7` | 预警浅背景 |
| `--color-danger` | `#DC2626` | 风险/退回 |
| `--color-danger-soft` | `#FEE2E2` | 风险浅背景 |
| `--color-muted` | `#64748B` | 次要状态 |
| `--color-muted-soft` | `#F1F5F9` | 灰色浅背景 |

## 五、文字色

| Token | Hex | 用途 |
|---|---|---|
| `--color-text-main` | `#1E293B` | 主标题/正文 |
| `--color-text-secondary` | `#475569` | 二级正文 |
| `--color-text-muted` | `#64748B` | 辅助文字 |
| `--color-text-placeholder` | `#94A3B8` | 占位文字 |
| `--color-text-inverse` | `#FFFFFF` | 深色背景反白 |

## 六、侧边栏色

| Token | Hex | 用途 |
|---|---|---|
| `--sidebar-bg-from` | `#061B3A` | 侧栏渐变起点 |
| `--sidebar-bg-to` | `#0B2454` | 侧栏渐变终点 |
| `--sidebar-item-text` | `#C7D2FE` | 菜单默认文字 |
| `--sidebar-item-muted` | `#93A4C7` | 菜单辅助文字 |
| `--sidebar-item-active-bg` | `rgba(11,92,173,0.95)` | 选中背景 |
| `--sidebar-item-hover-bg` | `rgba(255,255,255,0.08)` | hover背景 |

## 七、图表色板

```ts
export const chartColors = {
  blue: '#0B5CAD',
  cyan: '#00A6B8',
  purple: '#7C3AED',
  green: '#16A34A',
  orange: '#F59E0B',
  red: '#DC2626',
  slate: '#64748B'
}
```

## 八、使用规则

1. 主按钮必须使用工程蓝；
2. AI按钮和AI卡片使用蓝紫渐变；
3. 风险和错误使用红色；
4. 待审核、预警使用橙色；
5. 页面背景统一浅灰蓝；
6. 卡片背景统一白色；
7. 禁止每个页面自创颜色。
