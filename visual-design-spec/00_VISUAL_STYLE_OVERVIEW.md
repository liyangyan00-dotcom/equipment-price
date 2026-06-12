# 00 视觉风格总览

## 一、定位

本目录用于把 28 张页面效果图中的视觉语言提炼为可执行的前端设计规范。

本系统不是普通后台管理系统，而是：

> 水厂工程商务数据管理 + AI价格情报 + 项目套价决策 的高级专业后台系统。

视觉关键词：

```text
工程蓝
深蓝侧栏
浅灰蓝背景
白色圆角卡片
蓝紫AI模块
高密度数据表格
轻阴影
数据仪表盘
风险预警
商务专业感
```

## 二、整体视觉结构

所有页面应遵循：

```text
深蓝侧边栏 + 顶部操作栏 + 浅灰蓝内容背景 + 白色卡片区块
```

不得出现：

- 大面积纯白无层次页面；
- 默认浏览器表格；
- 默认 shadcn 原始风格不加定制；
- 过度卡通化插图；
- 使用整页图片代替页面结构；
- 每个页面自定义一套颜色。

## 三、核心视觉来源

Codex 后续必须同时参考：

```text
visual-references/ui-images/
visual-references/09_UI_REFERENCE_IMAGE_INDEX_28P.md
visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md
ui-restore/
visual-design-spec/
acceptance-checklists/
```

其中：

- `visual-references/ui-images/` 是效果图；
- `ui-restore/` 是还原规则；
- `visual-design-spec/` 是颜色、字体、卡片、表格等落地规范；
- `acceptance-checklists/` 是验收标准。

## 四、必须坚持的视觉边界

1. 参考图只能用于对照，不能整页切图；
2. Image2 资产只用于背景、插图、装饰；
3. 表格、图表、按钮、卡片、状态标签必须用代码实现；
4. SVG / lucide-react 只用于图标；
5. 所有页面共享统一视觉 token；
6. AI 模块必须统一为蓝紫科技风；
7. 风险、预警、可信度必须有统一颜色体系。

## 五、页面视觉优先级

优先还原：

1. 布局结构；
2. 颜色体系；
3. 卡片样式；
4. 表格密度；
5. 状态标签；
6. AI 模块视觉；
7. 图表风格；
8. 插图和装饰。
