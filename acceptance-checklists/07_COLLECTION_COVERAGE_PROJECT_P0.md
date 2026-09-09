# Collection Coverage and Project Link P0

## Scope

- Entry: collection task detail, Results and Configuration tabs.
- Plan is stored in `wpi_price_collection_tasks.config.coveragePlan`.
- The plan describes expected coverage, not collector execution filters.
- Project selection uses existing organization-scoped `wpi_projects` records.
- Project association does not confirm a price, assign a BOQ price or calculate savings.
- Existing task audit and RLS policies apply. No schema migration is required.

## Data Contract

- `projectId`: existing project UUID, or empty for no association.
- `from`, `to`: inclusive quote months (`YYYY-MM`), 1 to 36 months.
- `targets`: 1 to 100 unique `{ name, specification, region }` combinations.
- Matching normalizes Unicode, whitespace and letter case only. It does not infer semantic equivalence or convert units.
- Coverage is organization-wide for the task target type, not the current result page or the selected execution batch.
- Unknown quote dates never use collection/creation dates as substitutes.
- Empty cells mean unresolved coverage gaps, not proof of unpublished source data.
- Pending, ready, transferred, incomplete and rejected counts are separate.
- Ready/transferred coverage requires valid fields and an evidence reference.
- Requests exceeding the bounded scan return an error, not a partial coverage percentage.
- Saving uses `updated_at` compare-and-swap and preserves other task configuration.

## Verification

- [x] Pure logic: missing months and unknown dates.
- [x] Pure logic: duplicate IDs and review barriers.
- [x] Pure logic: distinct specifications and regions.
- [x] Pure logic: more than one page of samples.
- [x] Pure logic: invalid/duplicate/oversized plans.
- [x] Database read-only check: projects/leads exist; task RLS and audit trigger exist.
- [ ] Authenticated browser: save a user-selected project and expected combinations; reload and verify persistence.
- [ ] Authenticated browser: another editor changes task; stale save returns 409.
- [ ] Authenticated browser: exact lead evidence navigation.
- [ ] Desktop/mobile screenshots: no page overflow; table scroll remains contained.

## Deferred

- Targeted recollection from individual gap cells.
- Evidence-backed gap classification (unpublished/parse failure/uncollected).
- Automatic BOQ coverage target import and project-side reverse collection navigation.
- AI gold-sample evaluation and measured business outcomes.

Run: `node --experimental-strip-types --test scripts/collection-coverage.test.mjs`.
