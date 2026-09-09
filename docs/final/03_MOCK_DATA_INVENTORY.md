# Mock Data Inventory

## Mock Data Files

| File | Data Type | Serving Pages | Key Fields | Linked |
|---|---|---|---|---|
| `src/data/mock/dashboard.ts` | Dashboard intelligence data | `/dashboard` | stats, trends, AI insights, risks | Yes |
| `src/data/mock/equipmentPrices.ts` | Equipment price records | `/equipment-prices` | id, price, supplier, confidence, risk | Yes |
| `src/data/mock/equipmentPriceDetails.ts` | Equipment detail records | `/equipment-prices/[id]` | id, technical params, history, evidence | Yes |
| `src/data/mock/aiRecommendations.ts` | AI recommendation data | `/equipment-prices/ai-recommendation` | recommended price, reasons, similar prices, suppliers | Yes |
| `src/data/mock/materialPrices.ts` | Material price records | `/material-prices`, `/material-prices/[id]` | id, material, region, trend, confidence | Yes |
| `src/data/mock/materialPriceManagement.ts` | Material management data | `/material-prices/manage` | editable records, suggestions, review items | Yes |
| `src/data/mock/suppliers.ts` | Supplier records | `/suppliers` | id, region, category, score, risk | Yes |
| `src/data/mock/supplierDetails.ts` | Supplier detail records | `/suppliers/[id]` | profile, contacts, quote history, AI score | Yes |
| `src/data/mock/supplierManagement.ts` | Supplier governance records | `/suppliers/manage` | completeness, duplicate risk, missing fields | Yes |
| `src/data/mock/inquiries.ts` | Inquiry task records | `/inquiries` | inquiry id, suppliers, status, AI suggestion | Yes |
| `src/data/mock/inquiryCreate.ts` | Inquiry creation candidates | `/inquiries/create` | items, suppliers, draft, overview | Yes |
| `src/data/mock/comparisons.ts` | Comparison data | `/comparisons/[id]` | supplier quotes, rank, negotiation, risks | Yes |
| `src/data/mock/projectPricing.ts` | Project pricing data | `/project-pricing` | BOQ rows, fee summary, unmatched reasons | Yes |
| `src/data/mock/boqParse.ts` | BOQ parse data | `/project-pricing/boq-parse` | parsed rows, distribution, cost summary | Yes |
| `src/data/mock/aiQuoteRecognition.ts` | Quote recognition data | `/ai-quote-recognition` | quote files, results, risk items, quality | Yes |
| `src/data/mock/pendingQuotes.ts` | Pending quote pool | `/pending-quotes` | quote id, missing fields, risk, review status | Yes |
| `src/data/mock/aiPriceCollection.ts` | Collection data | `/ai-price-collection` | collection tasks, sources, progress, leads | Yes |
| `src/data/mock/priceLeads.ts` | Price leads | `/price-leads` | lead id, type, match, reliability, status | Yes |
| `src/data/mock/aiInquiryLetters.ts` | AI inquiry letters | `/ai-inquiry-letter` | letter items, suppliers, draft, risks | Yes |
| `src/data/mock/aiWorkbench.ts` | AI workbench tasks | `/ai-workbench` | task id, type, status, confidence, risk | Yes |
| `src/data/mock/aiReports.ts` | AI report tasks | `/ai-report-center` | report types, sources, outline, tasks | Yes |
| `src/data/mock/reports.ts` | Report preview data | `/reports/[id]` | report detail, outline, citations, exports | Yes |
| `src/data/mock/attachments.ts` | Evidence archive | `/attachments` | file id, related object, evidence chain, tags | Yes |
| `src/data/mock/analytics.ts` | Analytics data | `/analytics` | trends, distribution, insights, risk analysis | Yes |
| `src/data/mock/settings.ts` | System settings | `/settings` | currency, regions, categories, permissions | Yes |
| `src/data/mock/aiSettings.ts` | AI settings | `/settings/ai` | thresholds, rules, models, prompts, audit logs | Yes |

## Mock Data Quality Notes

- Mock ids follow business prefixes such as `EQP`, `MAT`, `SUP`, `INQ`, `CMP`, `REP`, `AI`, and `PL`.
- Risk, confidence, and status fields are reused through shared badge components where possible.
- Pages pass data using route params, query params, and local mock workflow state.
- The current mock state is frontend-only and resets according to browser/session behavior.
