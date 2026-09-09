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
const pending = fs.existsSync(pendingPath) ? JSON.parse(fs.readFileSync(pendingPath, 'utf8')).migrations : [];
assert.ok(Array.isArray(pending), 'Pending migrations must be explicit');
for (const row of pending) {
  assert.match(row.file, /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.equal(row.status, 'pending');
  assert.ok(!expected.includes(row.file), `Historical migration cannot be listed as pending: ${row.file}`);
  assert.equal(hash(path.join(active, row.file)), row.hash, `Pending SQL modified: ${row.file}`);
}
assert.deepEqual(files, [...expected, ...pending.map(row => row.file)].sort(), 'Migration files differ from cloud snapshot and reviewed pending list');
assert.equal(new Set(files.map(file => file.split('_')[0])).size, files.length, 'Duplicate migration versions');
for (const row of manifest.remote) {
  const file = `${row.version}_${row.name}.sql`;
  assert.equal(hash(path.join(active, file)), row.hash, `Historical SQL modified: ${file}`);
}
for (const row of manifest.archived) {
  assert.equal(hash(path.join(archive, 'local-originals', row.file)), row.hash, `Archived original changed: ${row.file}`);
}
console.log(`PASS: ${expected.length} cloud-history migrations, ${pending.length} pending (NOT applied), ${manifest.archived.length} preserved local originals; snapshot ${manifest.capturedAt}. No SQL executed.`);
