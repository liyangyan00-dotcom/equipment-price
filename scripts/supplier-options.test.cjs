const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const selectedId = '11111111-1111-4111-8111-111111111111';
function harness({ authenticated = true, error = false, selected = null, inPage = false } = {}) {
  const calls = [];
  const supabase = { from(table) {
    assert.equal(table, 'wpi_suppliers');
    const ops = []; const query = {};
    for (const method of ['select', 'eq', 'or', 'order', 'range', 'abortSignal']) query[method] = (...args) => { ops.push([method, ...args]); return query; };
    query.then = (resolve, reject) => { calls.push(ops); return Promise.resolve({ data: inPage ? [{ id: selectedId }] : [], count: 0, error: error ? { message: 'test' } : null }).then(resolve, reject); };
    query.maybeSingle = async () => { calls.push(ops); return { data: selected, error: null }; };
    return query;
  } };
  const cache = new Map();
  function load(file) {
    file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
    const loaded = { exports: {} }; cache.set(file, loaded);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'module', 'exports', code)(name => {
      if (name === '@/lib/auth/apiAccess') return { getApiAccess: async () => authenticated ? { ok: true, supabase, organizationId: 'org-a' } : { ok: false, status: 401, error: 'Unauthorized' } };
      if (name.startsWith('@/')) return load(path.resolve('src', name.slice(2)) + '.ts');
      return require(name);
    }, loaded, loaded.exports);
    return loaded.exports;
  }
  const route = load('src/app/api/suppliers/options/route.ts');
  return { calls, send: query => route.GET(new Request(`http://localhost/api/suppliers/options?${query || ''}`)) };
}

test('supplier options reject anonymous and malformed requests before database access', async () => {
  const h = harness({ authenticated: false }); assert.equal((await h.send()).status, 401); assert.equal(h.calls.length, 0);
  for (const query of ['page=0','page=-1','page=1000000','selectedId=not-a-uuid',`q=${'a'.repeat(121)}`,'q=%00']) {
    const h = harness(); assert.equal((await h.send(query)).status, 400); assert.equal(h.calls.length, 0);
  }
});

test('supplier list is ordered, tenant scoped, limited to 50 and excludes contacts/metadata', async () => {
  const h = harness(); const response = await h.send('page=2'); const ops = h.calls[0];
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(ops.find(op=>op[0]==='select'),['select','id,supplier_code,name,country_code,review_status',{count:'exact'}]);
  assert.deepEqual(ops.find(op=>op[0]==='range'),['range',50,99]);
  assert.ok(ops.some(op=>op[0]==='eq'&&op[1]==='organization_id'&&op[2]==='org-a'));
  assert.deepEqual(ops.filter(op=>op[0]==='order').map(op=>op[1]),['supplier_code','id']);
  assert.ok(ops.some(op=>op[0]==='abortSignal'));
});

test('search text is quoted and wildcard escaped, not concatenated as extra conditions', async () => {
  const value='ACME%,x),name.eq."admin"_'; const h=harness(); await h.send(`q=${encodeURIComponent(value)}`);
  const pattern=JSON.stringify(`%${value.replace(/[\\%_]/g,c=>`\\${c}`)}%`);
  assert.deepEqual(h.calls[0].find(op=>op[0]==='or'),['or',`name.ilike.${pattern},supplier_code.ilike.${pattern}`]);
});

test('off-page selection is looked up by UUID within the same organization', async () => {
  const h=harness({selected:{id:selectedId,name:'Synthetic'}}); const payload=await(await h.send(`selectedId=${selectedId}`)).json();
  assert.equal(payload.selected.id,selectedId); assert.equal(h.calls.length,2);
  const lookup=h.calls[1];assert.ok(lookup.some(op=>op[0]==='eq'&&op[1]==='id'&&op[2]===selectedId));
  assert.ok(lookup.some(op=>op[0]==='eq'&&op[1]==='organization_id'&&op[2]==='org-a'));
  const invisible=harness(); assert.equal((await(await invisible.send(`selectedId=${selectedId}`)).json()).selected,null);
  const inPage=harness({inPage:true});await inPage.send(`selectedId=${selectedId}`);assert.equal(inPage.calls.length,1);
});

test('database failure stops before selection lookup and never appears as an empty success', async () => {
  const h=harness({error:true});assert.equal((await h.send(`selectedId=${selectedId}`)).status,500);assert.equal(h.calls.length,1);
});
