# 03 间距、圆角、阴影 Token 规范

## 一、页面间距

| Token | 数值 | 用途 |
|---|---:|---|
| `page-padding` | 24px | 页面内容区默认内边距 |
| `page-gap` | 20px | 页面区块间距 |
| `section-gap` | 16px | 模块间距 |
| `card-gap` | 16px | 卡片间距 |
| `toolbar-gap` | 12px | 筛选器/按钮间距 |

## 二、卡片内边距

| 类型 | 内边距 |
|---|---:|
| 小卡片 | 16px |
| 标准卡片 | 20px |
| 大卡片 | 24px |
| 图表卡片 | 20px 24px |
| 表格卡片 | 0 或 16px + table |

## 三、圆角

| Token | 数值 | 用途 |
|---|---:|---|
| `radius-xs` | 6px | 小标签 |
| `radius-sm` | 8px | 小按钮 |
| `radius-md` | 10px | 输入框/筛选 |
| `radius-lg` | 12px | 菜单项/小卡片 |
| `radius-card` | 16px | 标准卡片 |
| `radius-card-lg` | 20px | 重点卡片 |
| `radius-pill` | 999px | 状态标签 |

## 四、阴影

| Token | 值 | 用途 |
|---|---|---|
| `shadow-card` | `0 8px 24px rgba(15,23,42,0.06)` | 标准卡片 |
| `shadow-card-hover` | `0 12px 36px rgba(15,23,42,0.10)` | hover |
| `shadow-panel` | `0 16px 48px rgba(15,23,42,0.12)` | 弹窗/浮层 |
| `shadow-ai` | `0 12px 40px rgba(124,58,237,0.16)` | AI模块 |
| `shadow-sidebar` | `8px 0 28px rgba(6,27,58,0.18)` | 侧栏 |

## 五、尺寸规则

| 元素 | 推荐尺寸 |
|---|---|
| Sidebar宽度 | 248px / 256px |
| Topbar高度 | 64px |
| 菜单项高度 | 44px |
| 主按钮高度 | 40px |
| 次按钮高度 | 36px |
| 输入框高度 | 36px / 40px |
| 表格行高 | 52px / 56px |
| 状态标签高度 | 24px |
| 图标容器 | 36px / 40px |
| 统计卡高度 | 108px - 128px |

## 六、布局规则

1. 页面不要挤满，四周保留 24px；
2. 卡片之间使用 16px 或 20px 间距；
3. 表格页筛选区和表格区之间使用 12px - 16px；
4. 图表页卡片尽量等高；
5. AI面板可使用更大的圆角和轻光效；
6. 弹窗和抽屉使用更强阴影。
