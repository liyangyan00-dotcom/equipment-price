# Demo Script

> 历史Mock阶段演示脚本，保留用于追溯。不得将这些预置记录作为真实试点成果；当前参赛演示和证据要求见 `COMPETITION_RELEASE_READINESS_2026-09-06.md`。

## 1. Dashboard

- Entry: click `首页总览` in Sidebar.
- Page: `/dashboard`.
- Demo: AI price intelligence overview, KPI, trend, AI workbench, risk and quick actions.
- Scope: mock data and mock interactions.
- Next: open equipment price library.

## 2. Equipment Price Library

- Entry: click `设备价格库`.
- Page: `/equipment-prices`.
- Demo: filters, compact price table, confidence/risk badges, AI recommendation entry.
- Scope: mock records.
- Next: click a row `查看`.

## 3. Equipment Detail

- Entry: table `查看` or detail link.
- Page: `/equipment-prices/EQP-202506-001`.
- Demo: price summary, technical parameters, supplier info, attachments, AI analysis.
- Scope: mock detail.
- Next: click AI recommendation.

## 4. AI Recommended Price

- Entry: equipment page `AI推荐`.
- Page: `/equipment-prices/ai-recommendation`.
- Demo: recommended price, similar prices, missing parameters, recommended suppliers.
- Scope: mock AI.
- Next: click create inquiry.

## 5. Create Inquiry

- Entry: `创建询价任务`.
- Page: `/inquiries/create`.
- Demo: select inquiry items/suppliers, generate AI inquiry letter draft, create task.
- Scope: mock creation.
- Next: go to inquiry management.

## 6. Inquiry Management

- Entry: Sidebar `询价管理` or after creating task.
- Page: `/inquiries`.
- Demo: inquiry status, supplier response, AI comparison assistant.
- Scope: mock tasks.
- Next: click comparison/detail.

## 7. Comparison Detail

- Entry: inquiry row `比价` or `查看`.
- Page: `/comparisons/CMP-202506-001`.
- Demo: AI ranking, supplier quotes, negotiation suggestions, risks, generated files.
- Scope: mock comparison.
- Next: click enter project pricing.

## 8. Project Pricing

- Entry: comparison page action or Sidebar `项目套价`.
- Page: `/project-pricing`.
- Demo: BOQ upload, AI parse summary, cost summary, automatic pricing, report entry.
- Scope: mock pricing.
- Next: open AI quote recognition.

## 9. AI Quote Recognition

- Entry: Sidebar `AI报价识别`.
- Page: `/ai-quote-recognition`.
- Demo: upload mock, AI recognition result, extracted line-item table, risks.
- Scope: mock upload and AI recognition.
- Next: go to pending quotes.

## 10. Pending Quotes

- Entry: Sidebar `待审核报价`.
- Page: `/pending-quotes`.
- Demo: manual review, missing field completion, confirm storage.
- Scope: mock approval.
- Next: open AI price collection.

## 11. AI Price Collection

- Entry: Sidebar `AI价格采集`.
- Page: `/ai-price-collection`.
- Demo: create collection task, source reliability, collection results.
- Scope: mock collection.
- Next: open price leads.

## 12. Price Leads

- Entry: Sidebar `价格线索池`.
- Page: `/price-leads`.
- Demo: lead detail, source summary, risk, storage or inquiry action.
- Scope: mock lead evaluation.
- Next: open AI workbench.

## 13. AI Workbench

- Entry: Sidebar `AI工作台`.
- Page: `/ai-workbench`.
- Demo: AI task list, tabs, task routing, review/risk panels.
- Scope: mock task center.
- Next: open AI report center.

## 14. AI Report Center

- Entry: Sidebar `AI报告中心`.
- Page: `/ai-report-center`.
- Demo: report templates, report generation config, AI preview, generated report list.
- Scope: mock report generation.
- Next: open report preview.

## 15. Report Preview

- Entry: report center `查看报告`.
- Page: `/reports/REP-2025-0008`.
- Demo: report cover, summary, trend, citations, risk, export buttons.
- Scope: mock preview/export.
- Next: open attachments.

## 16. Attachment Evidence

- Entry: Sidebar `附件证据库` or report evidence link.
- Page: `/attachments`.
- Demo: evidence archive list, AI evidence chain detail, auto archive tags.
- Scope: mock evidence archive.
- Next: open analytics.

## 17. Analytics

- Entry: Sidebar `统计分析`.
- Page: `/analytics`.
- Demo: price trend, supplier performance, AI efficiency, risk distribution.
- Scope: mock analytics.
- Next: open settings.

## 18. Settings And AI Settings

- Entry: Sidebar `系统设置`, then AI settings link/tab.
- Pages: `/settings`, `/settings/ai`.
- Demo: save/reset settings, AI thresholds, review rules, model parameters.
- Scope: mock settings.
- End: explain backend/API/AI integration plan.
