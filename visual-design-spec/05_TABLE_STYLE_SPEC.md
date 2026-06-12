# 05 表格样式规范

## 一、基础表格

| 项 | 规范 |
|---|---|
| 表头背景 | `#F8FAFC` |
| 表头文字 | 12px / 600 / `#475569` |
| 表格正文 | 13px / 400 / `#334155` |
| 行高 | 52px / 56px |
| 分割线 | `#E2E8F0` |
| hover背景 | `#F1F5F9` |
| 操作列 | 右对齐 |
| 金额列 | 右对齐 + tabular-nums |

## 二、表格页结构

标准表格页：

```text
PageHeader
筛选工具条 FilterBar
TableCard
分页 Pagination
```

## 三、字段显示规则

### 价格字段

```text
原始价格：显示币种 + 金额
折算美元价：显示 USD + 金额
价格条件：使用小标签
可信度：使用 ConfidenceBadge
审核状态：使用 StatusBadge
风险等级：使用 RiskBadge
```

### 供应商字段

```text
供应商名称：主文本
国家/城市：辅助文本
评分：星级或数字
风险：标签显示
```

### AI字段

```text
AI置信度：进度条或百分比
缺失字段：黄色标签
风险提示：橙/红标签
```

## 四、表格密度

28张参考图整体偏“高密度商务后台”，所以：

- 不要使用过大的行高；
- 不要每行卡片化；
- 表头要清晰；
- 操作按钮要紧凑；
- 状态标签要小而清晰。

## 五、空状态

表格无数据时使用：

```text
assets/illustrations/empty_equipment_prices.png
assets/illustrations/empty_material_prices.png
assets/illustrations/empty_suppliers.png
assets/illustrations/empty_pending_quotes.png
assets/illustrations/empty_attachments.png
```

插图尺寸：

```text
160px - 220px
```

## 六、禁止事项

1. 不允许使用图片表格；
2. 不允许整页截图；
3. 不允许默认 HTML 表格样式；
4. 不允许字段名和字段字典不一致；
5. 不允许价格无币种、无日期、无可信度。
