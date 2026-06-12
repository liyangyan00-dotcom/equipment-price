# 06 Round 6：AI报价识别与价格采集页面提示词

## 目标

完成 AI 报价识别、待审核报价、AI价格采集、价格线索池四个页面。

## 给 Codex 的提示词

```text
请执行 Round 6：AI工作流页面。

必须阅读：
- field-dictionary/04_PENDING_QUOTE_FIELDS.md
- field-dictionary/05_AI_TASK_FIELDS.md
- mock-data-spec/05_AI_PENDING_MOCK_DATA.md
- mock-data-spec/06_PRICE_LEADS_MOCK_DATA.md
- mock-data-spec/11_MOCK_DATA_RELATIONSHIP_RULES.md
- api-spec/05_AI_QUOTE_AND_PENDING_API.md
- api-spec/06_AI_PRICE_COLLECTION_AND_LEADS_API.md
- acceptance-checklists/05_AI_FLOW_ACCEPTANCE.md
- visual-references/ui-images/10_ai_quote_recognition_center.png
- visual-references/ui-images/11_pending_quote_pool.png
- visual-references/ui-images/12_ai_price_collection_center.png
- visual-references/ui-images/13_price_lead_pool.png

任务：
1. 实现 /ai-quote-recognition；
2. 实现 /pending-quotes；
3. 实现 /ai-price-collection；
4. 实现 /price-leads；
5. 报价识别页面展示上传、识别结果、缺失字段、风险提示；
6. 待审核报价页面展示确认、需补充、作废操作；
7. AI价格采集页面展示任务创建和采集结果；
8. 价格线索池支持确认入库和作废 UI；
9. AI结果不能直接变成 confirmed；
10. 仅使用 mock 数据模拟流程。

输出：
- 页面清单；
- AI流程说明；
- 人工复核闭环；
- 验收自查。
```

## 验收标准

1. AI结果有置信度；
2. AI结果有缺失字段；
3. AI结果有风险提示；
4. AI结果必须进入人工复核；
5. 价格线索不能直接入库。
