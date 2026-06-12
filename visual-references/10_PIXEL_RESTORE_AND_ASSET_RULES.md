# 10 UI 100%还原与资产使用总规范

## 一、新增规范文件

请重点阅读：

```text
ui-restore/00_PIXEL_RESTORE_OVERVIEW.md
ui-restore/01_LAYOUT_RESTORE_RULES.md
ui-restore/02_COMPONENT_RESTORE_RULES.md
asset-rules/00_ASSET_USAGE_DECISION_TREE.md
asset-rules/01_CAN_USE_IMAGE2.md
asset-rules/02_CANNOT_USE_IMAGE2_USE_CODE.md
asset-rules/03_USE_SVG_OR_ICON_COMPONENTS.md
asset-rules/04_PAGE_BY_PAGE_ASSET_MATRIX.md
asset-rules/05_IMAGE2_PROMPT_LIBRARY.md
asset-rules/06_SVG_ICON_NAMING.md
visual-references/component-redline/00_COMPONENT_SIZE_TOKENS.md
```

## 二、简明结论

### 可以用 Image2

- 登录页背景；
- 侧边栏底部水厂图；
- 空状态插图；
- AI助手插图；
- 报告封面图；
- 水厂工程概念图。

### 不能用 Image2

- 页面主体；
- 表格；
- 图表；
- 文字；
- 数字；
- 按钮；
- 筛选器；
- 表单；
- 弹窗；
- 状态标签；
- 进度条；
- 业务数据区。

### 应该用 SVG / icon component

- 菜单图标；
- 操作图标；
- 状态图标；
- Logo；
- 简单功能图标。

### 必须用代码

- 28 页所有主体 UI；
- 业务表格；
- 图表；
- AI任务流；
- 比价表；
- BOQ解析表；
- 报告预览正文；
- 权限矩阵；
- 所有可交互组件。
