# 04 卡片样式规范

## 一、基础卡片

```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 16px;
box-shadow: 0 8px 24px rgba(15,23,42,0.06);
padding: 20px;
```

## 二、卡片类型

| 类型 | 用途 | 特征 |
|---|---|---|
| `StatCard` | 首页统计 | 大数字 + 小图标 + 趋势 |
| `DataCard` | 普通数据模块 | 标题 + 内容 |
| `TableCard` | 表格容器 | 卡片包裹筛选/表格 |
| `ChartCard` | 图表容器 | 标题 + 图例 + 图表 |
| `AiCard` | AI洞察 | 蓝紫点缀 + 置信度 |
| `RiskCard` | 风险提示 | 橙/红色左边框 |
| `UploadCard` | 上传区域 | 虚线边框 + 图标 |
| `ReportCard` | 报告卡 | 封面缩略图 + 标题 |

## 三、统计卡

统计卡结构：

```text
左上：指标名称
中部：大数字
右上：图标容器
底部：趋势或说明
```

视觉规则：

```text
高度：108px - 128px
圆角：18px
图标容器：40px
数字：28px / 700
趋势文字：12px
```

## 四、AI卡片

AI卡片可使用：

```css
background: linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 100%);
border: 1px solid #DDD6FE;
box-shadow: 0 12px 40px rgba(124,58,237,0.12);
```

必须包含至少一个：

- AI标签；
- 置信度；
- 建议动作；
- 人工复核入口；
- 风险提示。

## 五、风险卡片

风险卡片规则：

```text
低风险：绿色点缀
中风险：橙色点缀
高风险：红色点缀
严重风险：红色背景浅色块 + 明显图标
```

## 六、禁止事项

1. 不要使用默认无边框白块；
2. 不要每张卡片阴影不同；
3. 不要所有卡片都用渐变；
4. 不要把业务内容做成图片；
5. 不要卡片间距不统一。
