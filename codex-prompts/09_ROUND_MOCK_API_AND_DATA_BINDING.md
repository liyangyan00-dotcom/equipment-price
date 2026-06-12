# 09 Round 9：Mock API 与数据绑定提示词

## 目标

把页面从直接读取 mock 数据，逐步改成通过 mock API 获取数据。

## 给 Codex 的提示词

```text
请执行 Round 9：Mock API 与数据绑定。

必须阅读：
- api-spec/00_API_SPEC_OVERVIEW.md
- api-spec/11_API_IMPLEMENTATION_NOTES.md
- mock-data/README.md
- mock-data-spec/11_MOCK_DATA_RELATIONSHIP_RULES.md
- field-dictionary/09_ENUMS_AND_STATUS_CODES.md

任务：
1. 使用 Next.js Route Handlers 建立 /api/* mock 接口；
2. 接口结构遵守 api-spec；
3. 返回字段遵守 field-dictionary；
4. 页面改为从 /api/* 获取数据；
5. 保留 mock-data 作为数据源；
6. 增加 loading / error / empty 状态；
7. 不接真实 Supabase；
8. 不接真实 AI API。

输出：
- 新增 API route 文件清单；
- 页面数据绑定方式；
- 统一请求封装；
- 错误和空状态处理。
```

## 验收标准

1. API返回结构统一；
2. 页面能处理 loading/error/empty；
3. mock API 与字段字典一致；
4. 价格、供应商、附件、AI任务关系不乱。
