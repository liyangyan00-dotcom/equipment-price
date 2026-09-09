# Round 6B Screenshot Diff Record

Generated at local dev URL `http://127.0.0.1:3100`.

| Page | Screenshot | Reference target | Current result | Remaining difference |
| --- | --- | --- | --- | --- |
| `/ai-inquiry-letter` | `ai-inquiry-letter.png` | `visual-references/ui-images/16_ai_inquiry_letter_generation.png` | Includes source selection, supplier selection, AI draft, missing fields, risk checks, preview/manual confirmation, and summary. | Uses current global sidebar/topbar and compact card density instead of exact legacy dark topbar crop. |
| `/project-pricing/boq-parse` | `boq-parse.png` | `visual-references/ui-images/19_project_pricing_ai.png` | Includes BOQ upload, project metadata, AI parsing donut, cost summary, parsed table, unmatched-item suggestions, risk warning, report preview, and action bar. | Upload and project metadata are split into separate visual areas for maintainability; not a pixel-perfect copy. |
| `/ai-workbench` | `ai-workbench.png` | `visual-references/ui-images/22_ai_workbench_center.png` | Includes AI task KPIs, task tabs, AI hub summary, task queue, task detail, timeline, missing fields, risks, and workflow shortcuts. | Current implementation emphasizes workflow governance over decorative center-console effects. |
| `/ai-report-center` | `ai-report-center.png` | `visual-references/ui-images/23_ai_report_center.png` | Includes report type selection, data sources, AI outline draft, AI suggestions, report task table, and report generation boundary notice. | Report preview is still a mock draft panel; no real Word/PDF export by design. |

Browser QA:

- All four pages loaded successfully.
- Page titles were visible.
- No browser console errors were captured during the pass.
