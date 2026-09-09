# Page Route Inventory

## Route Inventory

| # | Page | Route | Positioning | Complete | Accessible | Interactive | Mock Data | Remaining Work |
|---:|---|---|---|---|---|---|---|---|
| 1 | Dashboard | `/dashboard` | AI price intelligence command center | Yes | Yes | Yes | Yes | Real APIs later |
| 2 | Equipment Price Library | `/equipment-prices` | Equipment price search, filtering, risk, AI recommendation | Yes | Yes | Yes | Yes | Real CRUD later |
| 3 | Equipment Price Detail | `/equipment-prices/[id]` | Single equipment price file, supplier, evidence, AI analysis | Yes | Yes | Yes | Yes | Real detail API later |
| 4 | Equipment AI Recommendation | `/equipment-prices/ai-recommendation` | AI recommended price and inquiry entry | Yes | Yes | Yes | Yes | Real AI later |
| 5 | Material Price Library | `/material-prices` | Material price management and AI collection entry | Yes | Yes | Yes | Yes | Real CRUD later |
| 6 | Material Price Detail | `/material-prices/[id]` | Single material price detail and AI analysis | Yes | Yes | Yes | Yes | Not in original required list, retained as completed page |
| 7 | Material Price Management | `/material-prices/manage` | Material batch management and governance | Yes | Yes | Yes | Yes | Real batch operations later |
| 8 | Supplier Library | `/suppliers` | Supplier intelligence and AI assessment | Yes | Yes | Yes | Yes | Real supplier API later |
| 9 | Supplier Detail | `/suppliers/[id]` | Single supplier profile, contacts, risk, project matching | Yes | Yes | Yes | Yes | Real supplier profile later |
| 10 | Supplier Management | `/suppliers/manage` | Supplier data maintenance, AI completion, deduplication | Yes | Yes | Yes | Yes | Real governance API later |
| 11 | AI Quote Recognition | `/ai-quote-recognition` | Quote file recognition and extracted line items | Yes | Yes | Yes | Yes | Real upload/OCR later |
| 12 | Pending Quotes | `/pending-quotes` | Manual review pool before price storage | Yes | Yes | Yes | Yes | Real approval later |
| 13 | AI Price Collection | `/ai-price-collection` | Collection task configuration and collection result list | Yes | Yes | Yes | Yes | Real crawler/API later |
| 14 | Price Leads | `/price-leads` | Lead evaluation, risk, storage, inquiry action | Yes | Yes | Yes | Yes | Real storage later |
| 15 | Inquiry Management | `/inquiries` | Inquiry task management and comparison entry | Yes | Yes | Yes | Yes | Real inquiry CRUD later |
| 16 | Create Inquiry | `/inquiries/create` | Create inquiry task and AI inquiry letter draft | Yes | Yes | Yes | Yes | Real send later |
| 17 | Comparison Detail | `/comparisons/[id]` | AI comparison and recommendation decision | Yes | Yes | Yes | Yes | Real comparison data later |
| 18 | Project Pricing | `/project-pricing` | BOQ matching, pricing center, report entry | Yes | Yes | Yes | Yes | Real pricing engine later |
| 19 | BOQ Parse Detail | `/project-pricing/boq-parse` | AI parsed BOQ result, matching, risks, actions | Yes | Yes | Yes | Yes | Real parser later |
| 20 | AI Inquiry Letter | `/ai-inquiry-letter` | AI inquiry letter generation and supplier mapping | Yes | Yes | Yes | Yes | Real generation/send later |
| 21 | AI Workbench | `/ai-workbench` | AI task center and task routing | Yes | Yes | Yes | Yes | Real task queue later |
| 22 | AI Report Center | `/ai-report-center` | AI report generation preflight and task list | Yes | Yes | Yes | Yes | Real report generation later |
| 23 | Attachments | `/attachments` | Evidence archive and AI evidence chain | Yes | Yes | Yes | Yes | Real storage later |
| 24 | Report Preview | `/reports/[id]` | Report preview and mock export | Yes | Yes | Yes | Yes | Real Word/PDF later |
| 25 | Analytics | `/analytics` | Price, supplier, AI, risk analytics | Yes | Yes | Yes | Yes | Real BI data later |
| 26 | Settings | `/settings` | System configuration | Yes | Yes | Yes | Yes | Real persistence later |
| 27 | AI Settings | `/settings/ai` | AI thresholds, review rules, model config | Yes | Yes | Yes | Yes | Real AI config API later |

## Route Probe Result

Local route probe result on `http://127.0.0.1:3100`: all required routes returned HTTP 200.
