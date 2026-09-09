import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const base = new URL('../supabase/migrations/', import.meta.url);
const read = file => readFileSync(new URL(file, base), 'utf8');
const guard = read('20260906132338_guard_material_price_review_permissions.sql');
const core = '20260726154815_wpi_isolated_core_auth_rbac_audit_storage.sql';
const quotes = '20260821111410_quote_recognition_pending_review_p0.sql';
const provenance = '20260901172436_preserve_collection_price_provenance.sql';
const normalization = '20260901193104_fix_formal_price_admission_p0.sql';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function sqlPart(file, prefix, end = ';') {
  const sql = read(file); const start = sql.indexOf(prefix); assert.ok(start >= 0, prefix);
  const last = sql.indexOf(end, start); assert.ok(last > start, prefix);
  return sql.slice(start, last + end.length);
}
const fn = (file, name) => sqlPart(file, `create or replace function ${name}(`, '$$;');

// Actual table/permission/trigger/RPC SQL runs in PostgreSQL/WASM. Supporting
// source tables are minimal fixtures, not a clone of the full production schema.
test('material review guard, RLS and human source transfers in PostgreSQL', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth; create schema private; create role authenticated; create role anon;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      create type public.wpi_app_role as enum ('admin','manager','editor','reviewer','viewer');
      create type public.wpi_app_permission as enum ('price.read','price.write','price.review');
      create type public.wpi_review_status as enum ('draft','pending_review','approved','rejected','archived');
      create type public.wpi_risk_level as enum ('low','medium','high','critical');
      create table auth.users (id uuid primary key);
      create table public.wpi_organizations (id uuid primary key);
      create table public.wpi_suppliers (id uuid primary key);
      create table public.wpi_equipment_prices (id uuid primary key);
      create table public.wpi_ai_execution_tasks (id uuid primary key);
      create table public.wpi_organization_members (organization_id uuid,user_id uuid,role public.wpi_app_role,is_active boolean);
      create table public.wpi_role_permissions (role public.wpi_app_role,permission public.wpi_app_permission);
      create table public.wpi_organization_role_permissions (organization_id uuid,role public.wpi_app_role,permission public.wpi_app_permission,is_enabled boolean);
      insert into auth.users values ${[10,11,12,13,14,20].map(n=>`('${id(n)}')`).join(',')};
      insert into public.wpi_organizations values ('${id(1)}'),('${id(2)}');
      insert into public.wpi_organization_members values
        ('${id(1)}','${id(10)}','admin',true), ('${id(1)}','${id(11)}','editor',true),
        ('${id(1)}','${id(12)}','reviewer',true), ('${id(1)}','${id(13)}','viewer',true),
        ('${id(1)}','${id(14)}','reviewer',false), ('${id(2)}','${id(20)}','admin',true);
      insert into public.wpi_role_permissions values
        ('editor','price.read'),('editor','price.write'),('reviewer','price.read'),('reviewer','price.review'),('viewer','price.read');
      grant usage on schema public,private,auth to authenticated;
    `);
    await db.exec(fn('20260820170917_add_organization_role_permission_overrides.sql','private.wpi_has_permission'));
    await db.exec(fn('20260813110600_enforce_equipment_review_rbac_audit_p1.sql','private.wpi_has_any_role'));
    await db.exec(sqlPart(core,'create table public.wpi_material_prices('));
    await db.exec(`alter table public.wpi_material_prices add column metadata jsonb not null default '{}', add column legacy_id text;
      alter table public.wpi_material_prices enable row level security;
      grant select,insert,update,delete on public.wpi_material_prices to authenticated;
      create table public.wpi_price_collection_leads (
        id uuid primary key,organization_id uuid,task_id uuid,lead_code text,target_type text,name text,specification text,match_target text,
        status text,review_notes text,reviewed_by uuid,reviewed_at timestamptz,
        source_checked_at timestamptz,quote_date date,created_at timestamptz default now(),currency text,price numeric,
        normalized_price_cny numeric,run_id uuid,source_id uuid,quote_document_id uuid,evidence_code text,supplier_name text,
        source_type text,price_period_granularity text,exchange_rate numeric,fx_status text,fx_rate_date date,fx_source text,
        source_url text,confidence numeric,risk_level public.wpi_risk_level,original_unit text,region text,transferred_at timestamptz,updated_by uuid
      );
      create table public.wpi_price_collection_evidence (id uuid primary key,lead_id uuid,evidence_code text,fetched_at timestamptz);
      create table public.wpi_currency_rates (organization_id uuid,base_currency text,quote_currency text,rate numeric,effective_at timestamptz);
      insert into public.wpi_material_prices (id,organization_id,price_code,material_name,unit,price,currency,created_by,review_status,metadata)
        values ('${id(100)}','${id(1)}','TEST-DRAFT','Steel','piece',100,'CDF','${id(11)}','draft','{"evidenceIds":["fixture"]}'),
          ('${id(101)}','${id(1)}','TEST-APPROVED','Steel','piece',100,'CDF','${id(11)}','approved','{"reviewDecision":"approve","reviewComment":"Original review","reviewedBy":"${id(12)}","reviewedAt":"2026-01-01T00:00:00Z","needsInformation":false,"evidenceIds":["fixture"]}');
    `);
    for (const name of ['wpi_material_read','wpi_material_insert','wpi_material_update','wpi_material_delete']) {
      await db.exec(sqlPart(core,`create policy ${name} `));
    }
    await db.exec(sqlPart(quotes,'create table public.wpi_quote_documents ('));
    await db.exec(sqlPart(quotes,'create table public.wpi_quote_items ('));
    await db.exec(fn(provenance,'private.wpi_transfer_price_collection_leads_impl'));
    await db.exec(fn(quotes,'private.wpi_import_quote_item_impl'));
    await db.exec(fn(normalization,'private.wpi_normalize_collected_price_admission'));
    await db.exec(sqlPart(normalization,'create trigger wpi_normalize_collected_material_price'));
    await db.exec(`
      insert into public.wpi_price_collection_leads (id,organization_id,lead_code,target_type,name,specification,status,review_notes,reviewed_by,reviewed_at,currency,price,original_unit,region,risk_level,quote_date)
        values ('${id(200)}','${id(1)}','TEST-LEAD','material','Steel','12mm 按根','ready','Checked source','${id(12)}',now(),'CDF',100,'PIECE BARRE DE 12','Fixture','medium','2026-01-01');
      insert into public.wpi_price_collection_evidence values ('${id(201)}','${id(200)}','TEST-EVIDENCE',now());
      insert into public.wpi_quote_documents (id,organization_id,file_name,storage_path,status,created_by)
        values ('${id(300)}','${id(1)}','fixture.pdf','fixture/only','needs_review','${id(11)}');
      insert into public.wpi_quote_items (id,organization_id,document_id,line_number,item_type,item_name,unit,unit_price,currency)
        values ('${id(301)}','${id(1)}','${id(300)}',1,'material','Steel','piece',100,'CDF');
    `);

    async function actor(n) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n==null?'':id(n)]);
      await db.exec('set role authenticated');
    }
    async function failure(query, pattern) {
      await db.exec('savepoint expected_failure');
      try { await assert.rejects(query,pattern); }
      finally { await db.exec('rollback to savepoint expected_failure; release savepoint expected_failure'); }
    }
    async function scenario(name, run) {
      await t.test(name,async()=>{
        await db.exec('begin');
        try { await run(); } finally { await db.exec('rollback'); await db.exec('reset role'); }
      });
    }
    const update = (set, n=100) => db.query(`update public.wpi_material_prices set ${set} where id=$1 returning *`,[id(n)]);
    const approve = () => update(`review_status='approved',metadata=metadata||'{"reviewComment":"Human checked","reviewedBy":"forged","reviewedAt":"1900-01-01"}'::jsonb`);
    const transfer = () => db.query('select * from private.wpi_transfer_price_collection_leads_impl($1::uuid[])',[[id(200)]]);
    const importQuote = () => db.query('select private.wpi_import_quote_item_impl($1,$2::jsonb,$3) as result',[id(301),JSON.stringify({unitPrice:123,unit:'bar'}),'Checked corrected quote']);

    await scenario('historical RLS allows editor approval and blocks legitimate review-only actors',async()=>{
      await actor(11);assert.equal((await approve()).rows[0].review_status,'approved');
      await actor(12);assert.equal((await update("review_status='rejected'")).rows.length,0);
    });
    await db.exec(guard);await db.exec(guard);
    await scenario('editor approval and direct approved inserts are blocked',async()=>{
      await actor(11);await failure(approve,/Price review permission/);
      await failure(()=>db.query(`insert into public.wpi_material_prices (organization_id,price_code,material_name,unit,price,currency,created_by,review_status,metadata)
        values ($1,'FORGED','Steel','piece',100,'CDF',$2,'approved','{"reviewComment":"forged"}')`,[id(1),id(11)]),/authorized reviewer/);
    });
    await scenario('review-only actor can approve; database stamps the real actor and time',async()=>{
      await actor(12);const row=(await approve()).rows[0];
      assert.equal(row.review_status,'approved');assert.equal(row.metadata.reviewedBy,id(12));
      assert.ok(Date.parse(row.metadata.reviewedAt)>Date.parse('2026-01-01'));assert.equal(row.updated_by,id(12));
      assert.deepEqual(row.metadata.evidenceIds,['fixture']);assert.equal(Number(row.price),100);
    });
    await scenario('review permission does not grant business/evidence editing',async()=>{
      await actor(12);
      for(const set of ["price=999",`metadata=metadata||'{"evidenceIds":["forged"]}'`,"region='forged'"]) {
        await failure(()=>update(set),/Review-only actors cannot edit/);
      }
    });
    await scenario('viewer, inactive member, other organization and null actor cannot approve',async()=>{
      for(const n of [13,14,20,null]) {await actor(n);assert.equal((await approve()).rows.length,0);}
      await db.exec('reset role');
      await failure(()=>update("price=123"),/Authentication required/);
    });
    await scenario('permission overrides cannot turn viewer into an editor or reviewer',async()=>{
      await db.exec(`insert into public.wpi_organization_role_permissions values ('${id(1)}','viewer','price.review',true),('${id(1)}','viewer','price.write',true)`);
      await actor(13);await failure(approve,/Insufficient material price/);
      await failure(()=>update('price=999'),/Insufficient material price/);
      assert.equal((await db.query('delete from public.wpi_material_prices where id=$1 returning id',[id(100)])).rows.length,0);
    });
    await scenario('revoked reviewer permission remains effective',async()=>{
      await db.exec(`insert into public.wpi_organization_role_permissions values ('${id(1)}','reviewer','price.review',false)`);
      await actor(12);assert.equal((await approve()).rows.length,0);
      await failure(transfer,/Price review permission/);
    });
    await scenario('review decisions require comments and stamp canonical decision fields',async()=>{
      await actor(12);await failure(()=>update("review_status='approved'"),/human review comment/);
      let row=(await update(`review_status='pending_review',metadata=metadata||'{"reviewDecision":"need_info","reviewComment":"Supply original file"}'`)).rows[0];
      assert.equal(row.metadata.needsInformation,true);assert.equal(row.metadata.reviewedBy,id(12));
      row=(await update(`review_status='rejected',metadata=metadata||'{"reviewComment":"Source not accepted"}'`)).rows[0];
      assert.equal(row.metadata.reviewDecision,'reject');assert.equal(row.metadata.needsInformation,false);
    });
    await scenario('editing finalized price requires draft/pending and clears approval without losing evidence',async()=>{
      await actor(11);await failure(()=>update('price=123',101),/Finalized prices must return/);
      const row=(await update("price=123,review_status='draft'",101)).rows[0];
      assert.equal(row.review_status,'draft');assert.equal(row.metadata.reviewedBy,null);assert.equal(row.metadata.reviewDecision,null);
      assert.deepEqual(row.metadata.evidenceIds,['fixture']);
    });
    await scenario('same-operation edit and approval is rejected even for admin',async()=>{
      await actor(10);await failure(()=>update(`price=123,review_status='approved',metadata=metadata||'{"reviewComment":"Approve"}'`),/separate operations/);
    });
    await scenario('editors cannot forge review metadata or change immutable identity',async()=>{
      await actor(11);
      await failure(()=>update(`metadata=metadata||'{"reviewedBy":"forged"}'`),/forge review metadata/);
      await actor(10);
      for(const set of [`organization_id='${id(2)}'`,`created_by='${id(12)}'`,"price_code='NEW-ID'"]) {
        await failure(()=>update(set),/immutable|permissions/);
      }
    });
    await scenario('archiving requires review permission and archived price cannot be edited',async()=>{
      await actor(12);const row=(await update(`review_status='archived',metadata=metadata||'{"reviewComment":"Retain history"}'`,101)).rows[0];
      assert.equal(row.metadata.reviewDecision,'archive');
      await actor(10);await failure(()=>update("review_status='draft'",101),/Archived material prices/);
    });
    await scenario('actual collection transfer remains atomic and idempotent with unit normalization',async()=>{
      await actor(12);assert.equal((await transfer()).rows[0].status,'transferred');
      assert.equal((await transfer()).rows[0].status,'transferred');
      const rows=(await db.query("select * from public.wpi_material_prices where source_type='ai_price_collection'")).rows;
      assert.equal(rows.length,1);const row=rows[0];
      assert.equal(row.unit,'根');assert.equal(row.currency,'CDF');assert.equal(Number(row.price),100);
      assert.equal(row.valid_until,null);assert.equal(row.supplier_id,null);
      assert.equal(row.metadata.originalUnit,'PIECE BARRE DE 12');assert.equal(row.metadata.reviewedBy,id(12));
      assert.deepEqual(row.metadata.evidenceIds,[id(201)]);assert.equal(row.metadata.reviewDecision,'approve');
      await actor(13);await failure(transfer,/Price review permission/);
    });
    await scenario('unreviewed lead is denied and both source and target remain unchanged',async()=>{
      await db.exec(`update public.wpi_price_collection_leads set reviewed_by=null where id='${id(200)}'`);
      await actor(12);await failure(transfer,/confirmed same-organization/);
      assert.equal((await db.query("select count(*)::int as n from public.wpi_material_prices where source_type='ai_price_collection'")).rows[0].n,0);
      await db.exec('reset role');assert.equal((await db.query('select status from public.wpi_price_collection_leads')).rows[0].status,'ready');
    });
    await scenario('actual quote import allows human corrections and remains idempotent',async()=>{
      await actor(12);let result=(await importQuote()).rows[0].result;assert.equal(result.reused,false);
      const row=(await db.query('select * from public.wpi_material_prices where id=$1',[result.materialPriceId])).rows[0];
      assert.equal(Number(row.price),123);assert.equal(row.unit,'bar');assert.equal(row.review_status,'approved');
      assert.equal(row.metadata.quoteItemId,id(301));assert.equal(row.metadata.reviewedBy,id(12));
      result=(await importQuote()).rows[0].result;assert.equal(result.reused,true);
      await actor(13);await failure(importQuote,/Price review permission/);
    });
    await scenario('quote from a mismatched organization or voided document cannot create an approved price',async()=>{
      await db.exec(`update public.wpi_quote_documents set organization_id='${id(2)}'`);
      await actor(12);await failure(importQuote,/same-organization quote source/);
      await db.exec('reset role');await db.exec(`update public.wpi_quote_documents set organization_id='${id(1)}',status='voided'`);
      await actor(12);await failure(importQuote,/same-organization quote source/);
    });
    await scenario('trigger remains invoker and sorts after existing normalizer',async()=>{
      const row=(await db.query("select prosecdef,proconfig from pg_proc where oid='private.wpi_guard_material_price_review()'::regprocedure")).rows[0];
      assert.equal(row.prosecdef,false);assert.ok(row.proconfig.some(item=>item.startsWith('search_path=')));
      const names=(await db.query("select tgname from pg_trigger where tgrelid='public.wpi_material_prices'::regclass and not tgisinternal order by tgname")).rows.map(row=>row.tgname);
      assert.equal(names.at(-1),'wpi_zz_guard_material_review');
    });
    await scenario('draft creation and approved insertion audit cannot be forged',async()=>{
      const insert=(status,metadata,creator=11)=>db.query(`insert into public.wpi_material_prices
        (organization_id,price_code,material_name,unit,price,currency,created_by,review_status,metadata)
        values ($1,'INSERT-TEST','Steel','piece',100,'CDF',$2,$3,$4::jsonb) returning *`,[id(1),id(creator),status,JSON.stringify(metadata)]);
      await actor(11);
      await failure(()=>insert('draft',{reviewedBy:id(12)}),/explicit human review/);
      await failure(()=>insert('draft',{},12),/creator must be/);
      const row=(await insert('draft',{})).rows[0];assert.equal(row.review_status,'draft');assert.equal(row.updated_by,id(11));
      await actor(10);await update("price=100",100);
      await failure(()=>insert('approved',{},10),/human review comment/);
    });
  } finally { await db.close(); }
});
