# AI Integration Plan

## Phase 2: Real AI Capabilities

1. Quote sheet recognition.
2. PDF and Excel parsing.
3. BOQ parsing and line-item normalization.
4. AI price collection.
5. AI inquiry letter generation.
6. AI comparison analysis.
7. AI report generation.
8. Manual review and audit workflow.

## AI Principles

- AI output must include confidence.
- AI output must include risk warnings.
- AI output must be editable by humans.
- AI output must enter review or confirmation before final business use.
- AI must assist commercial judgment, not replace final judgment.

## Suggested AI Task Types

| Task | Input | Output | Required Review |
|---|---|---|---|
| Quote recognition | PDF/Excel/image quote file | extracted supplier, price, line items, risks | Yes |
| Price collection | source, category, region, keywords | candidate price leads | Yes |
| Inquiry letter | selected items and suppliers | bilingual inquiry draft | Yes |
| BOQ parse | BOQ document | normalized BOQ rows and match result | Yes |
| Comparison analysis | supplier quotes | recommended plan, risks, negotiation points | Yes |
| Report generation | project data and evidence | report outline and draft | Yes |

## AI Integration Milestones

1. Replace mock AI action hooks with task creation APIs.
2. Add task status polling or websocket updates.
3. Store AI raw output and normalized output separately.
4. Add reviewer actions: accept, edit, reject, regenerate.
5. Persist confidence, risk, prompt version, model version, and evidence.
6. Add audit trail for all AI-assisted decisions.
