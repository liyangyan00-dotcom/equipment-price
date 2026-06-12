# 06 AI 工作流型页面规范

适用页面：
```text
/ai-quote-recognition
/ai-price-collection
/project-pricing/boq-parse
/ai-inquiry-letter
/ai-report-center
```

页面结构：
```text
PageHero / PageHeader
WorkflowSteps
InputPanel
AiProcessingPanel
StructuredResultPanel
ManualReviewPanel
EvidencePanel
ActionFooter
```

AI页面重点是：

```text
输入 → AI处理 → 结构化结果 → 风险识别 → 人工复核 → 入库/导出
```

必须体现：
1. AI置信度；
2. 缺失字段；
3. 风险提示；
4. 人工确认；
5. 证据附件。
