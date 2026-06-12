# 26 交给 Codex 前的数据检查清单

## 一、必须让 Codex 阅读

```text
field-dictionary/00_FIELD_DICTIONARY_OVERVIEW.md
field-dictionary/09_ENUMS_AND_STATUS_CODES.md
field-dictionary/10_PAGE_FIELD_USAGE_MATRIX.md
mock-data-spec/00_MOCK_DATA_OVERVIEW.md
mock-data-spec/11_MOCK_DATA_RELATIONSHIP_RULES.md
mock-data/README.md
```

## 二、开发前检查

| 检查项 | 要求 |
|---|---|
| 字段命名 | 前端 camelCase，数据库 snake_case |
| 价格数据 | 必须有币种、日期、来源、可信度、审核状态 |
| AI数据 | 必须有置信度、缺失字段、风险提示 |
| 供应商数据 | 必须能关联设备或地材价格 |
| 附件数据 | 必须能关联价格或报告 |
| 套价数据 | 必须能追溯到价格库 |
| 状态枚举 | 必须使用统一枚举 |
| mock 数据 | 不代表真实采购价，只用于演示 |

## 三、禁止

- 不要随便新增字段名；
- 不要把中文字段直接作为代码字段；
- 不要让 AI 结果直接变成 confirmed；
- 不要让 A级可信度没有附件；
- 不要让页面表格字段与字段字典不一致。
