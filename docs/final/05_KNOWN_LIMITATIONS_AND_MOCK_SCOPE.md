# Known Limitations And Mock Scope

## Frontend MVP Statement

当前版本用于前端演示、业务流程验证、UI确认和后续接口对接准备。

The current system is a frontend MVP. It is not connected to real backend services, databases, storage, or AI services.

## Mock Scope

The following capabilities are mock-only:

1. Database and persistence.
2. User login.
3. Permission control.
4. File upload.
5. Attachment storage.
6. AI quote recognition.
7. AI price collection.
8. AI inquiry letter generation.
9. AI BOQ parsing.
10. AI report generation.
11. Word/PDF/Excel export.
12. Email sending.
13. WhatsApp sending.
14. Audit logs.
15. Backend task queue.

## Non-Blocking Limitations

- Mock data may reset with browser/session state.
- AI output is deterministic mock content.
- Upload/export dialogs do not write files.
- Report preview does not generate real Word/PDF.
- Authentication and authorization are visual/mocked only.
- Some chart drill-downs provide toast/context feedback rather than real filtered BI datasets.

## Delivery Boundary

This version is suitable for:

- Product demo.
- Business workflow validation.
- UI review.
- Stakeholder sign-off.
- API contract planning.
- Backend and AI integration preparation.

This version is not suitable for:

- Production data entry.
- Legal/commercial final decisions.
- Real AI-based price recognition.
- Real procurement communication.
- Real document archive compliance.
