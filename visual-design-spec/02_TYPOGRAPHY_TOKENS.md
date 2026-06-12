# 02 字体 Token 规范

## 一、字体族

推荐：

```css
font-family: Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
```

如果是中文环境，优先保证：

```text
微软雅黑 / PingFang SC / Noto Sans SC
```

## 二、字号层级

| Token | 字号 | 行高 | 字重 | 用途 |
|---|---:|---:|---:|---|
| `text-page-title` | 24px | 32px | 600 | 页面主标题 |
| `text-page-subtitle` | 14px | 22px | 400 | 页面副标题 |
| `text-section-title` | 18px | 26px | 600 | 大模块标题 |
| `text-card-title` | 15px | 22px | 600 | 卡片标题 |
| `text-body` | 14px | 22px | 400 | 常规正文 |
| `text-body-medium` | 14px | 22px | 500 | 强调正文 |
| `text-table` | 13px | 20px | 400 | 表格内容 |
| `text-table-header` | 12px | 18px | 600 | 表格表头 |
| `text-caption` | 12px | 18px | 400 | 辅助说明 |
| `text-metric-lg` | 28px | 36px | 700 | 大指标数字 |
| `text-metric-md` | 22px | 30px | 700 | 中指标数字 |
| `text-metric-sm` | 18px | 26px | 700 | 小指标数字 |

## 三、页面标题规则

页面标题区域：

```text
标题：24px / 600 / #1E293B
副标题：14px / 400 / #64748B
标题与副标题间距：4px
标题区与内容区间距：20px - 24px
```

## 四、卡片标题规则

卡片标题：

```text
15px - 16px
font-weight: 600
color: #1E293B
```

卡片说明：

```text
12px - 13px
color: #64748B
```

## 五、表格文字规则

表头：

```text
12px / 600 / #475569
letter-spacing: 0.01em
```

表体：

```text
13px / 400 / #334155
```

金额 / 数字：

```text
13px - 14px
font-weight: 600
tabular-nums
右对齐
```

## 六、AI模块文字规则

AI标题：

```text
15px / 600 / #1E293B
```

AI说明：

```text
13px / 400 / #64748B
```

AI置信度：

```text
12px / 600 / #7C3AED
```

## 七、禁止事项

1. 不要大面积使用 16px 以上正文；
2. 不要所有标题都加粗到 700；
3. 不要表格字号过大；
4. 不要使用浏览器默认字体层级；
5. 不要混用太多字体。
