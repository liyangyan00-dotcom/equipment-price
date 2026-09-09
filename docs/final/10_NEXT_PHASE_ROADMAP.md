# Next Phase Roadmap

## Phase 1: Real Backend Foundation

1. Implement authentication and session handling.
2. Add organization, department, and project models.
3. Build equipment price CRUD APIs.
4. Build material price CRUD APIs.
5. Build supplier CRUD and supplier contact APIs.
6. Build inquiry task CRUD and status APIs.
7. Implement attachment upload and storage.
8. Add audit logs.
9. Add role-based permission control.
10. Replace mock workflow state with persisted workflow state.

## Phase 2: Real AI Capabilities

1. Quote sheet OCR and field extraction.
2. PDF/Excel parser pipeline.
3. BOQ parser and line-item normalization.
4. AI price collection source connectors.
5. AI inquiry letter generation.
6. AI comparison scoring and negotiation suggestions.
7. AI report generation.
8. Manual review workflow with accept/edit/reject/regenerate.

## Phase 3: Real Export And Integration

1. Excel import/export.
2. Word report export.
3. PDF report export.
4. Email sending.
5. WhatsApp record archive.
6. Exchange-rate API.
7. Scheduled collection jobs.
8. Backend task queue.
9. Notification center.
10. Deployment monitoring and production logging.

## Recommended Next Round

Round 9 should focus on backend contract design:

- Finalize entity model.
- Finalize API request/response schemas.
- Add API client layer.
- Replace selected mock data with service abstraction.
- Keep UI unchanged while swapping data source boundaries.
