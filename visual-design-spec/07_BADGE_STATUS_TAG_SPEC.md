# 07 状态标签与徽章规范

## 一、基础样式

```css
height: 24px;
border-radius: 999px;
padding: 0 8px;
font-size: 12px;
font-weight: 500;
display: inline-flex;
align-items: center;
gap: 4px;
```

## 二、审核状态 reviewStatus

| 状态 | 中文 | 背景 | 文字 |
|---|---|---|---|
| `pending` | 待审核 | `#FEF3C7` | `#B45309` |
| `need_info` | 需补充 | `#FEF3C7` | `#92400E` |
| `confirmed` | 已确认 | `#DCFCE7` | `#166534` |
| `rejected` | 已退回 | `#FEE2E2` | `#B91C1C` |
| `voided` | 已作废 | `#F1F5F9` | `#64748B` |

## 三、可信度 confidenceLevel

| 等级 | 中文 | 背景 | 文字 |
|---|---|---|---|
| A | 高 | `#DBEAFE` | `#1D4ED8` |
| B | 较高 | `#DCFCE7` | `#166534` |
| C | 一般 | `#FEF3C7` | `#B45309` |
| D | 较低 | `#FFEDD5` | `#C2410C` |
| E | 低 | `#FEE2E2` | `#B91C1C` |

## 四、风险等级 riskLevel

| 等级 | 中文 | 背景 | 文字 |
|---|---|---|---|
| low | 低 | `#DCFCE7` | `#166534` |
| medium | 中 | `#FEF3C7` | `#B45309` |
| high | 高 | `#FFEDD5` | `#C2410C` |
| critical | 严重 | `#FEE2E2` | `#B91C1C` |

## 五、AI标签

AI标签统一使用：

```text
背景：#EDE9FE
文字：#7C3AED
边框：#DDD6FE
图标：Sparkles / Bot / BrainCircuit
```

适用：

- AI生成；
- AI建议；
- AI识别；
- AI分析；
- AI置信度。

## 六、禁止事项

1. 不要用大块纯色标签；
2. 不要所有状态都用蓝色；
3. 不要状态文字无背景；
4. 不要风险和成功颜色混淆；
5. 不要 AI 标签使用普通灰色。
