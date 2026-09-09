# Settings Safety Follow-up

Date: 2026-09-05

## Implemented

- Reuse the existing settings routes and mutation APIs. No parallel configuration center.
- Dictionary reference totals read all pages with deterministic ordering. Code/name aliases count once when normalized values match.
- Dictionary audit read failures surface as errors rather than an empty successful audit list.
- Dictionary and integration editor close actions confirm unsaved changes and block dismissal during save.
- Dictionary, integration, role and AI settings protect ordinary link navigation and browser refresh/close when dirty.
- AI save has a scope/impact confirmation. Explicit discard also confirms.

## Verification

- `node --test scripts/settings-safety.test.cjs`: 7 passing tests.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed.
- No real organization configuration, credentials or permissions were changed for testing.

## Remaining Acceptance

- Authenticated save/reload/audit verification for each settings subpage, including denied permissions and failure responses.
- Browser back/forward and programmatic router navigation are not covered by the link guard. Do not claim universal navigation protection.
- Member profile and invitation editors are not covered by this change.
- Actual exchange-rate management and provider quota monitoring remain pending. Unknown usage must not be represented as healthy or zero.
- Paged reads avoid API row limits but are not a database snapshot under concurrent writes. Large-volume statistics should eventually use an authorized aggregate query.
