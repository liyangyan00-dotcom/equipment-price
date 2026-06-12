# 00 组件尺寸与还原 Tokens

## 一、布局尺寸

```ts
export const layoutTokens = {
  sidebarWidth: 260,
  topbarHeight: 56,
  pagePadding: 24,
  cardRadius: 12,
  cardGap: 16,
  tableRowHeight: 48,
  filterHeight: 44,
  buttonHeight: 40
}
```

## 二、颜色 Tokens

```ts
export const colorTokens = {
  navBg: '#071827',
  topbarBg: '#061629',
  pageBg: '#F5F8FC',
  cardBg: '#FFFFFF',
  border: '#DDE7F3',
  primary: '#0B5CAD',
  primaryLight: '#1677FF',
  cyan: '#00A6B8',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  aiPurple: '#8B5CF6',
  textPrimary: '#0F2A4A',
  textSecondary: '#64748B'
}
```

## 三、字体 Tokens

```ts
export const fontTokens = {
  pageTitle: '24px / 32px / 700',
  sectionTitle: '18px / 26px / 600',
  cardTitle: '14px / 22px / 600',
  metricValue: '32px / 40px / 700',
  tableHeader: '13px / 20px / 600',
  tableCell: '13px / 20px / 400'
}
```

## 四、还原建议

Codex 应先把这些 token 写入 `src/styles/tokens.ts` 或 Tailwind config，再逐页还原。
