import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoverage, validateCoveragePlan } from '../src/lib/priceCollection/coverage.ts';

const target = { name: 'Steel', specification: '10 mm', region: 'Kinshasa' };
const plan = { projectId: '', from: '2026-01', to: '2026-03', targets: [target] };
const lead = (id, overrides = {}) => ({ ...target, id, quote_date: '2026-02-01', status: 'pending_review', price_validity_status: 'valid', evidence_code: 'EV-1', ...overrides });

test('missing months remain gaps; created/collected date cannot fill quote month', () => {
  const result = buildCoverage(plan, [lead('1'), lead('2', { quote_date: null, created_at: '2026-01-01' })]);
  assert.deepEqual(result.cells.map(c => c.collected), [0, 1, 0]);
  assert.equal(result.unknownDate, 1);
  assert.equal(result.reviewed, 0);
});
test('distinct region/specification/month combinations never merge', () => {
  const result = buildCoverage(plan, [lead('1', { specification: '12 mm' }), lead('2', { region: 'Goma' }), lead('3', { quote_date: '2025-12-01' })]);
  assert.equal(result.collected, 0);
});
test('deduplicates identities; preserves review and transfer barriers', () => {
  const result = buildCoverage(plan, [lead('1'), lead('1'), lead('2', { status: 'ready' }), lead('3', { status: 'transferred' }), lead('4', { status: 'rejected' }), lead('5', { status: 'ready', evidence_code: null }), lead('6', { price_validity_status: 'invalid' })]);
  assert.deepEqual([result.cells[1].collected, result.cells[1].pending, result.cells[1].ready, result.cells[1].transferred, result.cells[1].rejected, result.cells[1].incomplete], [6, 1, 1, 1, 1, 2]);
  assert.equal(result.reviewed, 1);
});
test('all rows beyond first 500 contribute to the statistic', () => {
  const result = buildCoverage(plan, Array.from({ length: 1201 }, (_, i) => lead(String(i))));
  assert.equal(result.cells[1].collected, 1201);
});
test('rejects invalid, reversed, excessive and duplicate plans', () => {
  for (const patch of [{ from: '2026-13' }, { from: '2026-04' }, { to: '2030-01' }, { projectId: 'fake' }, { targets: [] }, { targets: [target, { ...target, name: ' STEEL ' }] }]) {
    assert.throws(() => validateCoveragePlan({ ...plan, ...patch }));
  }
});
test('invalid calendar dates are unknown, month count spans year boundary', () => {
  const result = buildCoverage({ ...plan, from: '2025-12', to: '2026-02' }, [lead('1', { quote_date: '2026-02-30' })]);
  assert.deepEqual(result.cells.map(c => c.month), ['2025-12', '2026-01', '2026-02']);
  assert.equal(result.unknownDate, 1);
});
