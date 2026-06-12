# 09 Sidebar 与 Topbar 视觉规范

## 一、Sidebar

### 尺寸

```text
宽度：248px / 256px
Logo区域高度：64px
菜单项高度：44px
菜单项圆角：12px
菜单间距：4px - 6px
左右内边距：14px - 16px
```

### 背景

```css
background: linear-gradient(180deg, #061B3A 0%, #0B2454 100%);
box-shadow: 8px 0 28px rgba(6,27,58,0.18);
```

### 菜单默认态

```text
图标：18px / #93A4C7
文字：14px / 500 / #C7D2FE
背景：透明
```

### 菜单 Hover

```text
背景：rgba(255,255,255,0.08)
文字：#FFFFFF
图标：#FFFFFF
```

### 菜单选中态

```text
背景：rgba(11,92,173,0.95)
文字：#FFFFFF
图标：#FFFFFF
左侧可加 3px 青蓝光条
```

## 二、Logo区域

使用：

```text
assets/svg-icons/logo_water_price_system.svg
```

Logo旁边文字：

```text
主标题：水厂价格中枢 / 价格信息库
副标题：AI Price Intelligence
```

## 三、侧栏底部装饰

可使用：

```text
assets/backgrounds/sidebar_water_plant_thumb.png
```

要求：

```text
只作为底部装饰卡片
不得覆盖菜单
不得承载业务数据
透明度和圆角需统一
```

## 四、Topbar

### 尺寸

```text
高度：64px
背景：rgba(255,255,255,0.86)
backdrop-filter: blur(12px)
底部边框：1px solid #E2E8F0
```

### 内容

左侧：

```text
当前页面标题 / 面包屑
```

中部或右侧：

```text
搜索框
AI状态
通知
用户信息
```

### 搜索框

```text
宽度：280px - 320px
高度：36px
圆角：10px
图标：Search
背景：#F8FAFC
```

## 五、禁止事项

1. Sidebar 不要纯黑；
2. Sidebar 菜单不要无高亮；
3. Topbar 不要过高；
4. 不要把页面标题放得太散；
5. 不要让底部装饰图干扰菜单。
