import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migrations = new URL('../supabase/migrations/', import.meta.url);
const read = name => readFileSync(new URL(name, migrations), 'utf8');
function functionSql(file, name) {
  const sql = read(file);
  const start = sql.indexOf(`create or replace function ${name}(`);
  assert.ok(start >= 0, name);
  const end = sql.indexOf('$$;', start);
  assert.ok(end > start, name);
  return sql.slice(start, end + 3);
}
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// This executes the actual migration functions in local Postgres/WASM, not the cloud.
// auth.uid is a test session adapter; membership and role checks use repository SQL.
test('terminal AI review authorization in PostgreSQL', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth; create schema private; create role authenticated;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create type public.wpi_app_role as enum ('admin','manager','reviewer','editor','viewer');
      create type public.wpi_app_permission as enum ('price.read','price.review');
      create type public.wpi_risk_level as enum ('low','medium','high','critical');
      create table public.wpi_organization_members (organization_id uuid, user_id uuid, role public.wpi_app_role, is_active boolean);
      create table public.wpi_role_permissions (role public.wpi_app_role, permission public.wpi_app_permission);
      create table public.wpi_organization_role_permissions (organization_id uuid, role public.wpi_app_role, permission public.wpi_app_permission, is_enabled boolean);
      create table public.wpi_equipment_price_reviews (id uuid, status text, ai_judgment text, ai_recommendation text, confidence numeric, risk_level public.wpi_risk_level);
      create table public.wpi_equipment_ai_review_runs (
        id uuid, organization_id uuid, review_id uuid, status text, requested_by uuid,
        input_snapshot jsonb, output_payload jsonb, confidence numeric, risk_level public.wpi_risk_level,
        requires_human_review boolean, error_code text, error_message text, completed_at timestamptz
      );
      grant usage on schema public, auth, private to authenticated;
      insert into public.wpi_role_permissions values ('viewer','price.read'), ('reviewer','price.review'), ('manager','price.review');
      insert into public.wpi_organization_members values
        ('${id(1)}','${id(10)}','reviewer',true),
        ('${id(1)}','${id(11)}','viewer',true),
        ('${id(1)}','${id(12)}','reviewer',true),
        ('${id(1)}','${id(13)}','manager',true),
        ('${id(1)}','${id(14)}','reviewer',false),
        ('${id(2)}','${id(20)}','admin',true);
      insert into public.wpi_equipment_price_reviews values ('${id(4)}','pending',null,null,null,null);
      insert into public.wpi_equipment_ai_review_runs values
        ('${id(3)}','${id(1)}','${id(4)}','completed','${id(10)}','{"private":"fixture-only"}','{"judgment":"original"}',70,'medium',true,null,null,now());
    `);
    await db.exec(functionSql('20260820170917_add_organization_role_permission_overrides.sql', 'private.wpi_has_permission'));
    await db.exec(functionSql('20260813110600_enforce_equipment_review_rbac_audit_p1.sql', 'private.wpi_has_any_role'));
    const original = functionSql('20260813113559_prepare_equipment_review_ai_capability_p1.sql', 'public.wpi_finish_equipment_ai_review');
    await db.exec(original);
    async function actor(user) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user == null ? '' : id(user)]);
      await db.exec('set role authenticated');
    }
    const finish = () => db.query('select (public.wpi_finish_equipment_ai_review($1, $2, $3::jsonb, $4, $5::public.wpi_risk_level)).*',
      [id(3), 'completed', JSON.stringify({ judgment: 'checked', recommendation: 'human review' }), 80, 'low']);

    await t.test('historical SQL reproduces cross-organization terminal disclosure', async () => {
      await actor(20);
      await assert.rejects(() => db.query('select * from public.wpi_equipment_ai_review_runs'), /permission denied/);
      assert.equal((await finish()).rows[0].input_snapshot.private, 'fixture-only');
    });
    await db.exec('reset role');
    await db.exec(read('20260906114755_guard_terminal_ai_review_authorization.sql'));
    // Reapplying the migration must be safe.
    await db.exec(read('20260906114755_guard_terminal_ai_review_authorization.sql'));
    for (const [label, user, error] of [
      ['anonymous', null, /Authentication required/],
      ['same-org viewer', 11, /Insufficient/],
      ['other-org admin', 20, /Insufficient/],
      ['inactive reviewer', 14, /Insufficient/],
      ['non-requesting reviewer', 12, /Only the requester/],
    ]) {
      await t.test(`${label} cannot read terminal runs`, async () => {
        await actor(user);
        await assert.rejects(finish, error);
      });
    }
    await t.test('requester and manager retain idempotency for every terminal status', async () => {
      for (const status of ['completed','needs_review','failed','cancelled']) {
        await db.exec('reset role');
        await db.query('update public.wpi_equipment_ai_review_runs set status=$1', [status]);
        for (const user of [10, 13]) {
          await actor(user);
          const row = (await finish()).rows[0];
          assert.equal(row.status, status);
          assert.deepEqual(row.output_payload, { judgment: 'original' });
          assert.equal(Number(row.confidence), 70);
        }
      }
    });
    await t.test('revoked permission denies even the original requester', async () => {
      await db.exec('reset role');
      await db.exec(`insert into public.wpi_organization_role_permissions values ('${id(1)}','reviewer','price.review',false)`);
      await actor(10);
      await assert.rejects(finish, /Insufficient/);
      await db.exec('reset role');
      await db.exec('delete from public.wpi_organization_role_permissions');
    });
    await t.test('active completion persists AI advice but never approves the price', async () => {
      await db.exec('reset role');
      await db.exec("update public.wpi_equipment_ai_review_runs set status='running'");
      await actor(11);
      await assert.rejects(finish, /Insufficient/);
      await actor(10);
      const row = (await finish()).rows[0];
      assert.equal(row.status, 'completed');
      assert.equal(row.requires_human_review, true);
      await db.exec('reset role');
      const review = (await db.query('select * from public.wpi_equipment_price_reviews')).rows[0];
      assert.equal(review.status, 'pending');
      assert.equal(review.ai_judgment, 'checked');
    });
  } finally { await db.close(); }
});
