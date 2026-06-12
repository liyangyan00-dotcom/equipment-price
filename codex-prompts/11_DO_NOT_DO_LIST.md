# 11 Codex 禁止事项清单

## 一、禁止一次性开发完整系统

不要让 Codex 一次性执行：

```text
请帮我开发完整系统
```

必须按轮次开发。

## 二、禁止整页切图

以下做法禁止：

```text
把 visual-references/ui-images/*.png 当作页面背景图
```

UI参考图只能用于视觉对照。

## 三、禁止 Image2 用于业务主体

Image2 不得用于：

- 表格；
- 按钮；
- 状态标签；
- 图表；
- 表单；
- 卡片主体；
- 页面文字。

## 四、禁止 AI 结果直接入库

AI识别、AI采集、AI套价建议，必须先进入：

```text
pending / needs_review / needs_info
```

然后由人工确认。

## 五、禁止字段随意命名

必须遵守：

```text
field-dictionary/
```

## 六、禁止跳过 Mock 阶段直接接真实后端

开发顺序必须是：

```text
静态 mock → mock API → Supabase → AI API
```

## 七、禁止忽略验收表

每轮开发完成后必须对照：

```text
acceptance-checklists/
```
