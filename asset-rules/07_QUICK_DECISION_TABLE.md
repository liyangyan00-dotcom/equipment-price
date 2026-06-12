# 07 快速判断表

| 元素 | 用 Image2? | 用 SVG? | 用前端代码? | 推荐 |
|---|---:|---:|---:|---|
| 整个页面 | 否 | 否 | 是 | React/Tailwind |
| 左侧导航 | 否 | 图标可SVG | 是 | 代码 + SVG图标 |
| 顶部栏 | 否 | 图标可SVG | 是 | 代码 |
| 统计卡 | 否 | 图标可SVG | 是 | 代码 |
| 表格 | 否 | 否 | 是 | DataTable |
| 图表 | 否 | 可SVG | 是 | Recharts |
| 按钮 | 否 | 图标可SVG | 是 | shadcn Button |
| 弹窗 | 否 | 图标可SVG | 是 | Dialog |
| 表单 | 否 | 否 | 是 | Form |
| 状态标签 | 否 | 可SVG | 是 | Badge |
| 菜单图标 | 否 | 是 | 可组件化 | lucide-react |
| Logo | 否 | 是 | 可组件化 | SVG |
| 登录背景 | 是 | 否 | 否 | Image2 |
| 侧栏水厂底图 | 是 | 否 | 否 | Image2 |
| 空状态插图 | 可 | 可 | 容器代码 | Image2/SVG + 代码 |
| AI装饰图 | 可 | 可 | 容器代码 | Image2/SVG + 代码 |
| 报告封面背景 | 可 | 否 | 报告文字代码 | Image2背景 + 代码文字 |

## 第二阶段执行结果

SVG / Logo / 图标资产已经生成完成。

当前建议：

- 简单通用图标：优先 lucide-react；
- 项目 Logo：使用 `assets/svg-icons/logo_water_price_system.svg`；
- 自定义 AI / 状态 / 导航图标：可使用 `assets/svg-icons/` 中的 SVG；
- 不要用 Image2 重新生成这些图标。
