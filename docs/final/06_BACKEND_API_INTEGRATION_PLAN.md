# Backend And API Integration Plan

## Phase 1: Backend Foundation

1. User login and session management.
2. Organization and project model.
3. Equipment price CRUD.
4. Material price CRUD.
5. Supplier CRUD.
6. Inquiry task CRUD.
7. Comparison and decision persistence.
8. Attachment upload and storage.
9. Audit log persistence.
10. Role-based access control.

## Recommended API Domains

| Domain | Suggested APIs |
|---|---|
| Auth | login, logout, refresh, current user |
| Organization | organizations, teams, roles |
| Project | project list, project detail, project pricing |
| Equipment prices | list, detail, create, update, review, risk |
| Material prices | list, detail, create, update, collect, review |
| Suppliers | list, detail, governance, contacts, risk |
| Inquiry | create, update, send, compare, status |
| Comparison | quote matrix, AI suggestion, decision |
| BOQ | upload, parse result, correction, pricing |
| Attachment | upload, link, evidence chain, archive |
| Report | generate task, preview, export |
| Settings | system settings, AI settings, audit logs |

## Integration Notes

- Preserve current route structure.
- Keep existing mock field names as frontend contract references where possible.
- Convert local mock workflow state into server-side workflow state.
- Make all AI outputs enter manual review or confirmation before business effect.
- Keep confidence, risk, source, date, and reviewer fields mandatory for price data.
