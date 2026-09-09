const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run the actual route and cache; substitute only authentication and DB transport.
function harness({ authenticated = true, fail = false, count = 25, supplierCount = 0 } = {}) {
  const calls = []; let authCalls = 0;
  const supabase = { from(table) {
    const operations = []; let head = false; let bounds = [0, 9];
    const query = { then(resolve, reject) {
      calls.push({ table, operations });
      const total = table === 'wpi_suppliers' ? supplierCount : count;
      const data = head ? null : table === 'wpi_suppliers' ? Array.from({ length: supplierCount }, (_, i) => ({ id: `supplier-${i}` })) : Array.from({ length: Math.max(0, Math.min(bounds[1] + 1, total) - bounds[0]) }, (_, i) => ({ id: `row-${bounds[0] + i}`, quoteDate: '2026-01-01' }));
      return Promise.resolve({ data, count: fail ? null : total, error: fail ? { message: 'test failure' } : null }).then(resolve, reject);
    } };
    for (const method of ['select', 'eq', 'in', 'gte', 'ilike', 'limit', 'or', 'order', 'range', 'abortSignal']) query[method] = (...args) => {
      operations.push([method, ...args]);
      if (method === 'select') head = Boolean(args[1]?.head);
      if (method === 'range') bounds = args;
      return query;
    };
    return query;
  } };
  const modules = new Map();
  function load(file) {
    file = path.resolve(file); if (modules.has(file)) return modules.get(file).exports;
    const loaded = { exports: {} }; modules.set(file, loaded);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'module', 'exports', code)(name => {
      if (name === '@/lib/auth/apiAccess') return { getApiAccess: async () => { authCalls++; return authenticated ? { ok: true, supabase, organizationId: 'org-a', userId: 'actor', role: 'viewer' } : { ok: false, status: 401, error: 'Unauthorized' }; } };
      if (name.startsWith('@/')) return load(path.resolve('src', name.slice(2)) + '.ts');
      return require(name);
    }, loaded, loaded.exports);
    return loaded.exports;
  }
  const route = load('src/app/api/material-prices/review-queue/route.ts');
  return { calls, authCalls: () => authCalls, send: query => route.GET(new Request(`http://localhost/api/material-prices/review-queue?${query || ''}`)) };
}

test('anonymous requests and malformed bounds fail before DB access', async () => {
  const anonymous = harness({ authenticated: false });
  assert.equal((await anonymous.send()).status, 401); assert.equal(anonymous.calls.length, 0);
  for (const query of ['page=0', 'page=-1', 'pageSize=1000', 'risk=unknown', 'queue=bad', `keyword=${'a'.repeat(161)}`]) {
    const h = harness(); assert.equal((await h.send(query)).status, 400); assert.equal(h.calls.length, 0);
  }
});

test('paged read crops fields, scopes organization, orders deterministically and requests only one page', async () => {
  const h = harness(); const response = await h.send('page=2&pageSize=10&queue=highRisk');
  const payload = await response.json(); assert.equal(payload.data.length, 10);
  assert.deepEqual(payload.pagination, { page: 2, pageSize: 10, total: 25, pageCount: 3 });
  assert.equal(h.calls.length, 1); const ops = h.calls[0].operations;
  assert.ok(ops.some(op => op[0] === 'eq' && op[1] === 'organization_id' && op[2] === 'org-a'));
  assert.deepEqual(ops.find(op => op[0] === 'range'), ['range', 10, 19]);
  assert.deepEqual(ops.find(op => op[0] === 'in'), ['in', 'risk_level', ['high', 'critical']]);
  assert.deepEqual(ops.filter(op => op[0] === 'order').map(op => op[1]), ['price_code', 'id']);
  const projection = ops.find(op => op[0] === 'select')[1];
  assert.ok(!projection.includes('*')); assert.ok(!projection.split(',').includes('metadata'));
  assert.equal(payload.data[0].metadata.quoteDate, '2026-01-01');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('out of range page clamps with at most two reads; empty and failure are distinct', async () => {
  const h = harness(); const payload = await (await h.send('page=99')).json();
  assert.equal(payload.pagination.page, 3); assert.equal(payload.data.length, 5); assert.equal(h.calls.length, 2);
  const empty = await (await harness({ count: 0 }).send()).json(); assert.equal(empty.pagination.total, 0);
  assert.equal((await harness({ fail: true }).send()).status, 500);
});

test('summary uses HEAD counts and cache but authenticates each request', async () => {
  const h = harness(); await h.send('view=summary'); await h.send('view=summary');
  assert.equal(h.authCalls(), 2); assert.equal(h.calls.length, 5);
  for (const call of h.calls) {
    assert.equal(call.operations.find(op => op[0] === 'select')[2].head, true);
    assert.ok(call.operations.some(op => op[0] === 'eq' && op[1] === 'organization_id'));
  }
  await h.send('view=summary&refresh=1'); assert.equal(h.calls.length, 10);
  const failing = harness({ fail: true });
  assert.equal((await failing.send('view=summary')).status, 500);
  assert.equal((await failing.send('view=summary')).status, 500); assert.equal(failing.calls.length, 10);
});

test('supplier expansion is scoped and bounded instead of silently truncating search', async () => {
  const h = harness({ supplierCount: 201 }); assert.equal((await h.send('keyword=steel')).status, 400);
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].table, 'wpi_suppliers');
  assert.deepEqual(h.calls[0].operations.find(op => op[0] === 'limit'), ['limit', 201]);
  assert.ok(h.calls[0].operations.some(op => op[0] === 'eq' && op[1] === 'organization_id'));
});
