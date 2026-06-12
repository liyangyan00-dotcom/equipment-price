# 31 最终规范包总览

## 一、项目名称

```text
水厂项目机电设备与地材价格信息库
AI驱动价格情报与套价决策系统
```

## 二、项目目标

为水厂工程项目建立一套可用于：

- 设备价格管理；
- 刚果金地材价格管理；
- 供应商管理；
- AI报价识别；
- AI价格采集；
- 价格线索管理；
- 询价与比价；
- 项目套价；
- 附件证据链；
- AI报告生成；
- 统计分析；

的前端系统规范包。

## 三、当前包状态

```text
V4.5 - Codex分轮开发提示词与最终交接版
```

当前已经完成：

1. UI参考图；
2. Image2图片资产；
3. SVG图标资产；
4. UI还原规则；
5. 资产使用规则；
6. 字段字典；
7. Mock数据规范；
8. 示例Mock JSON；
9. API草案；
10. 页面验收表；
11. 全面检查报告；
12. 页面开发顺序；
13. Codex分轮开发提示词；
14. 最终交接总提示词。

## 四、关键目录说明

```text
visual-references/        UI参考图和视觉还原资料
assets/                   图片、插图、SVG图标
asset-rules/              Image2 / SVG / 代码使用边界
ui-restore/               UI像素级还原规则
field-dictionary/         字段字典
mock-data-spec/           Mock数据规范
mock-data/                示例Mock JSON
api-spec/                 API草案
acceptance-checklists/    页面验收表
development-plan/         页面开发顺序与MVP范围
codex-prompts/            Codex分轮开发提示词
docs/                     总说明与状态文档
```

## 五、给 Codex 的核心阅读顺序

```text
1. AGENTS.md
2. docs/31_FINAL_PACKAGE_OVERVIEW.md
3. docs/30_FINAL_CODEX_HANDOFF_PROMPT.md
4. development-plan/00_DEVELOPMENT_SEQUENCE.md
5. codex-prompts/00_CODEX_HANDOFF_MASTER_PROMPT.md
6. codex-prompts/11_DO_NOT_DO_LIST.md
7. visual-references/10_PIXEL_RESTORE_AND_ASSET_RULES.md
8. field-dictionary/00_FIELD_DICTIONARY_OVERVIEW.md
9. mock-data-spec/00_MOCK_DATA_OVERVIEW.md
10. acceptance-checklists/00_ACCEPTANCE_OVERVIEW.md
```

## 六、当前最推荐的执行方式

不要一次性要求 Codex 开发完整系统。

推荐这样做：

```text
第一步：让 Codex 阅读总交接提示词并输出计划。
第二步：执行 Round 1 项目初始化。
第三步：执行 Round 2 设计系统与布局。
第四步：执行 Round 3 组件库。
第五步：按页面优先级推进。
第六步：使用验收表逐页修复。
```

## 七、MVP 范围

第一版 MVP 只做：

```text
/login
/dashboard
/equipment-prices
/material-prices
/suppliers
/ai-quote-recognition
/pending-quotes
/ai-price-collection
/price-leads
/project-pricing
/ai-report-center
```

## 八、必须遵守的边界

1. UI参考图不能整页切图；
2. Image2只用于背景、插图、装饰；
3. 表格、图表、按钮、状态标签必须代码实现；
4. SVG/lucide-react用于图标；
5. 字段必须遵守字段字典；
6. AI结果必须人工复核；
7. 当前先 mock，不直接接真实数据库；
8. 每轮完成必须验收。

## V4.6 视觉规范增强

新增：

```text
visual-design-spec/
```

该目录现在是 Round 2 和 Round 3 的必读目录。

用途：

- 约束颜色；
- 约束字体；
- 约束圆角阴影；
- 约束卡片；
- 约束表格；
- 约束按钮；
- 约束状态标签；
- 约束图表；
- 约束 Sidebar / Topbar；
- 约束 AI 模块；
- 约束空状态；
- 约束 Tailwind token 映射。

后续 Codex 开发时，视觉实现优先级为：

```text
28页参考图 → visual-design-spec → ui-restore → acceptance-checklists
```
