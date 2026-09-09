# P0 Collection Polling Fix

Scope: equipment catalog collection page and its price-collection progress API.
No database migrations, data edits, Cron changes, function disabling, commit or push.

## Changes

- Bootstrap on entry or explicit refresh, not every five seconds.
- Poll only known queued/running equipment tasks every 30 seconds.
- Progress API selects eight status/counter fields, validates at most 100 UUIDs,
  and enforces existing API access, organization and equipment filters.
- Synchronize results once when a task finishes, then stop if no activity remains.
- Refresh imports/validation only while their jobs are active.
- Pause in hidden tabs, abort on hide/unmount, and allow only one request cycle.
- Retry transient failures after 60/120/240/300 seconds, then stop after five
  consecutive failures. Explicit refresh resets the retry budget.
- Preserve last successful data on errors and display an error notice.
- Prefer server task state over stale local creation records.

## Verification

- `node --experimental-strip-types --test scripts/collection-polling.test.mjs`: 8 passed.
- `npm run test:contracts`: 60 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed.
- Read-only database projection check: one equipment task, 249 bytes of JSON.
  This is a sample payload measurement, not billed Egress.
- HTTP probe of local port 3100 failed to connect. Browser UI/network verification
  remains pending; no deployment has been performed.

## Boundaries

The initial/final bootstrap still uses existing endpoints. This change removes
their periodic repetition, not all of their overfetching. The main AI collection
page, AI workbench, report center and global navigation polling are unchanged.
Cross-tab scheduled/new tasks are discovered by explicit refresh or reopening
the page; an idle page no longer periodically reloads the organization.
Existing initial mock/fallback presentation remains outside this narrow fix.

Next verification: with a development server running, observe an idle page for
60 seconds, run a test task and verify summary-only requests at 30-second
intervals, hide/show the tab, complete the task, and confirm polling stops after
the final result sync. Do not create production test tasks without authorization.
