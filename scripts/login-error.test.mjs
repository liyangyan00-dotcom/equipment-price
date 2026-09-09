import test from 'node:test';
import assert from 'node:assert/strict';
import { loginError } from '../src/lib/auth/loginError.ts';

test('egress restriction is not presented as a password error', () => {
  const result = loginError(new Error('Service for this project is restricted due to the following violations: exceed_egress_quota.'));
  assert.equal(result.restricted, true);
  assert.match(result.message, /流量额度已超限/);
  assert.match(result.message, /可能产生费用/);
});
test('handles other restrictions and plain error objects', () => {
  assert.equal(loginError({ message: 'Service for this project is restricted: other_quota' }).restricted, true);
});
test('credential errors and unknown errors remain distinct', () => {
  assert.equal(loginError(new Error('Invalid login credentials')).restricted, false);
  assert.match(loginError(new Error('Invalid login credentials')).message, /邮箱或密码/);
  assert.equal(loginError(null).restricted, false);
  assert.match(loginError(null).message, /认证失败/);
});
