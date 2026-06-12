# 02 通用页面框架与 Topbar 规则

所有页面统一使用：

```text
AppLayout
AppSidebar
AppTopbar
PageHeader / PageHero
ContentGrid
```

Sidebar：
1. 深蓝背景；
2. 当前菜单高亮工程蓝；
3. 图标统一 lucide-react；
4. 菜单分组清晰；
5. 不为不同页面单独换风格。

Topbar：
| 项 | 约束 |
|---|---|
| 高度 | 52px - 56px |
| 背景 | 白色 / 轻磨砂 |
| 搜索框 | 适中宽度，圆角，浅边框 |
| 右侧状态 | AI模式、通知、组织/角色、用户入口 |
| 底边 | 浅边框 |
| 风格 | 产品系统感，不像浏览器工具条 |

PageHeader 适合普通列表、详情、设置页面。
PageHero 适合 AI工作流、报告生成、重要业务入口页面。
