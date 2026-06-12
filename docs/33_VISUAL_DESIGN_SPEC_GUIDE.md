# 33 V4.6 视觉效果规范增强说明

## 一、本次新增内容

本版本新增：

```text
visual-design-spec/
```

该目录用于补齐 28 张页面效果图对应的视觉落地规范。

## 二、为什么要补

原规范包已经包含：

- UI参考图；
- 像素还原规则；
- 资产使用规则；
- 页面验收表。

但对 Codex 来说，仍缺少直接可执行的：

- 颜色 token；
- 字体 token；
- 圆角阴影；
- 卡片样式；
- 表格样式；
- 按钮表单；
- 状态标签；
- 图表视觉；
- Sidebar / Topbar；
- AI模块视觉；
- 空状态视觉；
- Tailwind 映射。

## 三、使用方式

正式执行 Round 2 前，必须让 Codex 读取：

```text
visual-design-spec/
codex-prompts/02_ROUND_DESIGN_TOKENS_AND_LAYOUT.md
```

执行 Round 3 前，必须让 Codex 读取：

```text
visual-design-spec/
codex-prompts/03_ROUND_COMPONENT_LIBRARY.md
```

页面验收时，必须参考：

```text
acceptance-checklists/01_GLOBAL_UI_ACCEPTANCE.md
visual-design-spec/14_CODEX_VISUAL_IMPLEMENTATION_CHECKLIST.md
```

## 四、当前包定位

V4.6 不是开发代码包，而是视觉规范增强包。

它可以直接作为总规范包的升级版，也可以交给 Codex 合并到现有仓库。
