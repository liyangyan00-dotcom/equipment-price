# 10 AI 模块视觉规范

## 一、AI模块定位

AI 模块用于突出：

- 自动识别；
- 自动采集；
- 智能推荐；
- 风险提示；
- 人工复核。

视觉必须区别于普通业务模块。

## 二、AI色彩

使用：

```text
AI紫：#7C3AED
AI辅助紫：#8B5CF6
AI浅背景：#EDE9FE
AI边框：#DDD6FE
AI光效：rgba(124,58,237,0.16)
```

## 三、AI卡片结构

标准结构：

```text
顶部：AI标签 + 模块标题
中部：AI识别/分析结果
右侧或底部：置信度
底部：风险提示 + 建议动作 + 人工复核按钮
```

## 四、AI置信度

推荐显示方式：

```text
百分比数字 + 进度条
```

颜色规则：

| 置信度 | 颜色 | 处理 |
|---|---|---|
| >= 90% | 蓝/绿 | 可进入人工确认 |
| 75%-89% | 橙 | 需复核 |
| < 75% | 红 | 需补充资料 |

## 五、AI风险提示

风险提示卡：

```text
黄色：缺失字段
橙色：价格条件不清
红色：高风险/不可直接入库
```

## 六、人工复核入口

所有 AI 结果必须有：

```text
确认入库
需补充
退回/作废
查看原始附件
```

## 七、AI功能插图

可使用：

```text
assets/illustrations/ai_assistant_price_intelligence.png
assets/illustrations/ai_quote_recognition.png
assets/illustrations/ai_price_collection.png
assets/illustrations/ai_report_generation.png
```

但只能作为：

- 空白说明；
- 页面顶部装饰；
- 模块插图；
- 引导区域。

不得代替结构化数据表格。

## 八、禁止事项

1. AI结果不能直接 confirmed；
2. AI模块不能没有置信度；
3. AI模块不能没有风险提示；
4. AI模块不能没有人工复核入口；
5. AI插图不能覆盖业务数据区。
