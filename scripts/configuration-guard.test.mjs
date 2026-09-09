import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { configurationGuard } from '../src/lib/auth/configurationGuard.ts';

test('unconfigured production APIs fail closed without disclosing configuration', async () => {
  const response = configurationGuard({ configured: false, production: true, api: true });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.equal(body.code, 'SERVICE_NOT_CONFIGURED');
  assert.doesNotMatch(JSON.stringify(body), /key|secret|supabase\.co|NEXT_PUBLIC/i);
});

test('unconfigured production pages do not render the mock application', async () => {
  const response = configurationGuard({ configured: false, production: true, api: false });
  assert.equal(response.status, 503);
  assert.match(response.headers.get('content-type'), /text\/plain/);
  assert.equal(response.headers.get('retry-after'), '300');
  assert.match(await response.text(), /配置/);
});

test('configured deployments still enter normal authentication; local mock development remains available', () => {
  for (const production of [true, false]) {
    assert.equal(configurationGuard({ configured: true, production, api: true }), null);
  }
  assert.equal(configurationGuard({ configured: false, production: false, api: false }), null);
});

test('middleware checks the deployment guard before the development passthrough', () => {
  const source = readFileSync(new URL('../src/lib/supabase/proxy.ts', import.meta.url), 'utf8');
  assert.ok(source.indexOf('if (unavailable) return unavailable') < source.indexOf('if (!isSupabaseConfigured())'));
  assert.match(source, /production: process\.env\.NODE_ENV === "production"/);
  assert.match(source, /await supabase\.auth\.getClaims\(\)/);
});
