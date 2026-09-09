# Round 6A Screenshot Diff

Capture date: 2026-06-14

| Page | Screenshot | Check result | Remaining visual difference |
| --- | --- | --- | --- |
| `/ai-quote-recognition` | `ai-quote-recognition.png` | Upload area, AI recognition result, risk panel, and quote detail table are visible. Console errors: 0. | Current title text omits the reference prefix wording `AI增强 ·`; KPI icon exact beveling and sidebar copy are not pixel-identical. |
| `/pending-quotes` | `pending-quotes.png` | Pending quote title, quote preview panel, review actions, and confirm-to-library action are visible. Console errors: 0. | Table column spacing and right preview panel density are close but not strict pixel matches. |
| `/ai-price-collection` | `ai-price-collection.png` | Collection task form, price lead pool, credibility/source charts, and bottom analysis modules are visible. Console errors: 0. | Donut legend text wrapping and chart micro-spacing may still differ under narrow viewport widths. |
| `/price-leads` | `price-leads.png` | Lead list, detail panel, transfer workflow, and explicit `生成询价任务` entry are visible. Console errors: 0. | Detail panel width and action button placement are close to the reference, not exact redline restoration. |

Notes:

- Screenshots are QA artifacts, not application assets.
- All four pages were captured from `http://127.0.0.1:3100`.
- This table is for visual follow-up only; it does not introduce runtime dependencies.
