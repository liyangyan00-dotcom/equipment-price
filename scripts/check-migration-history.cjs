// Offline verification against the read-only cloud snapshot, not a DB deployment.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const archive = path.join(root, 'supabase/migration-reconciliation-20260906');
const manifest = JSON.parse(fs.readFileSync(path.join(archive, 'manifest.json'), 'utf8'));
const active = path.join(root, 'supabase/migrations');
const hash = file => crypto.createHash('md5').update(fs.readFileSync(file, 'utf8').replace(/\r/g, '').replace(/^[ \n\t;]+|[ \n\t;]+$/g, '')).digest('hex');
const files = fs.readdirSync(active).filter(file => file.endsWith('.sql')).sort();
const expected = manifest.remote.map(row => `${row.version}_${row.name}.sql`).sort();
const pendingPath = path.join(root, 'supabase/pending-migrations.json');
const ledger = fs.existsSync(pendingPath) ? JSON.parse(fs.readFileSync(pendingPath, 'utf8')) : { migrations: [] };
const pending = ledger.migrations;
const applied = ledger.appliedMigrations ?? [];
assert.ok(Array.isArray(applied), 'Applied migrations must be explicit');
for (const row of applied) {
  assert.equal(row.status, 'applied');
  assert.match(row.remoteVersion, /^\d{14}$/);
  assert.ok(row.projectId, 'Applied migration must identify the cloud project');
}
assert.equal(new Set(applied.map(row => `${row.projectId}:${row.remoteVersion}`)).size, applied.length, 'Duplicate applied cloud versions');
assert.ok(Array.isArray(pending), 'Pending migrations must be explicit');
for (const row of [...pending, ...applied]) {
  assert.match(row.file, /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.equal(row.status, pending.includes(row) ? 'pending' : 'applied');
  assert.ok(!expected.includes(row.file), `Historical migration cannot be listed as pending: ${row.file}`);
  assert.equal(hash(path.join(active, row.file)), row.hash, `Pending SQL modified: ${row.file}`);
}
assert.deepEqual(files, [...expected, ...[...pending, ...applied].map(row => row.file)].sort(), 'Migration files differ from cloud snapshot and reviewed deployment ledger');
assert.equal(new Set(files.map(file => file.split('_')[0])).size, files.length, 'Duplicate migration versions');
for (const row of manifest.remote) {
  const file = `${row.version}_${row.name}.sql`;
  assert.equal(hash(path.join(active, file)), row.hash, `Historical SQL modified: ${file}`);
}
for (const row of manifest.archived) {
  assert.equal(hash(path.join(archive, 'local-originals', row.file)), row.hash, `Archived original changed: ${row.file}`);
}
console.log(`PASS: ${expected.length} cloud-history migrations, ${pending.length} pending (NOT applied), ${applied.length} applied with recorded cloud-version mappings, ${manifest.archived.length} preserved local originals; snapshot ${manifest.capturedAt}. No SQL executed.`);
