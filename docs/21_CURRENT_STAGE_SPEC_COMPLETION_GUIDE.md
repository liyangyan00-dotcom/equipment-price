# 21 当前阶段规范补齐说明

## 一、当前阶段定位

当前阶段不是开发阶段，而是：

> UI 参考图 + Image2 图片资产 + SVG 图标资产 + 100%还原规则 + Codex开发前置规范准备阶段。

## 二、当前阶段已经完成的内容

### 1. 28 页 UI 参考图

位置：

```text
visual-references/ui-images/
```

用途：

- 作为后续页面还原视觉基准；
- 不允许整页切图；
- 只能作为 Codex / 前端开发的视觉对照。

### 2. Image2 图片资产

位置：

```text
assets/backgrounds/
assets/illustrations/
```

已完成：

- 登录页背景图；
- 侧边栏水厂底图；
- 报告封面背景图；
- 5 张空状态插图；
- 4 张 AI 功能插图。

### 3. SVG 图标资产

位置：

```text
assets/svg-icons/
```

已完成：

- 系统 Logo；
- 导航图标；
- 操作图标；
- 状态图标。

### 4. 使用边界规范

位置：

```text
asset-rules/
```

用于明确：

- 哪些可以用 Image2；
- 哪些必须用前端代码；
- 哪些使用 SVG / lucide-react；
- 每个页面的资产使用矩阵。

### 5. UI 100%还原规范

位置：

```text
ui-restore/
visual-references/component-redline/
```

用于约束：

- 布局尺寸；
- 颜色 token；
- 字体 token；
- 卡片、表格、图表、按钮规则；
- 页面还原优先级。

## 三、当前阶段不做的内容

当前阶段暂不做：

- Next.js 项目初始化；
- React 组件开发；
- shadcn/ui 安装；
- Recharts 图表开发；
- Supabase 数据库接入；
- AI API 接入；
- 真实前端页面编码。

这些内容后续统一交给 Codex 执行。

## 四、当前阶段验收标准

当前阶段只验收：

1. 文档目录是否完整；
2. 图片资产是否归档；
3. SVG 图标是否归档；
4. 命名是否统一；
5. 使用边界是否明确；
6. Codex 后续阅读入口是否清晰。

## 五、下一步建议

在交给 Codex 前，可以继续补：

1. 页面字段核对表；
2. mock 数据清单；
3. 28 页页面路由表；
4. 页面与资产对应关系表；
5. Codex 分轮开发提示词。
