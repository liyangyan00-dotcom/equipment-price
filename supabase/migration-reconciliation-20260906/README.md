# Migration reconciliation snapshot

2026-09-06: reconciled against the read-only migration history of project
`tkyvafheqyshbjqnzbgq`. No remote SQL was executed except SELECT queries.

- Active migrations: 172 files, all names/versions and normalized SQL hashes match cloud history.
- Preserved originals: 52 local files moved into `local-originals/` without content edits.
- Original differences: 35 same-name version mismatches; 22 same-name content mismatches (overlapping sets), plus one local combined P0 file.
- Added canonical files: 54; the remaining 118 active files were unchanged.
- Three cloud-only names restored, including separate run-hierarchy and formal-admission P0 changes and the operations refinement.
- Two duplicate-version files match their cloud SQL exactly after normalization; cloud versions were restored instead of assigning new migration versions.

This directory is an archive, NOT an executable migration directory. Do not replay it or `migrations-legacy-local/`.
Local-only differences are preserved for review, not silently promoted into future migrations. Content differences may include formatting, comments or substantive SQL; equivalence of the original drafts has not been certified.
The active directory records deployed history, not proof that all migrations can replay successfully against an empty database or that no manual schema drift exists.

Run `node scripts/check-migration-history.cjs` to verify file names, version uniqueness, active SQL and archived originals against `manifest.json`.
MD5 is used solely for deterministic integrity comparison, not security. The normalization is documented in the manifest.
For new migrations, review and update the snapshot explicitly. The check intentionally fails for extra or altered files; it does not query cloud history itself.

Workflow contract tests now reference canonical migration paths; their assertions were not weakened.
Git exclusions were extended for old Next output, logs, temporary verification exports, and known accidental shell output files. No local artifact was deleted.

No `db push`, migration repair, reset, Git commit or Git push was performed.
