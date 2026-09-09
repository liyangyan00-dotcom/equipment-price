import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = name => readFileSync(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8');
const core = read('20260726154815_wpi_isolated_core_auth_rbac_audit_storage.sql');
const governance = read('20260902111946_attachment_review_queue_governance.sql');
const migration = read('20260909101242_guard_attachment_review_authorization.sql');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function part(sql, prefix, end = ';') {
  const start = sql.indexOf(prefix); const last = sql.indexOf(end, start);
  assert.ok(start >= 0 && last > start, prefix);
  return sql.slice(start, last + end.length);
}
const fn = (sql, name) => part(sql, 'create or replace function ' + name + '(', '$$;');

// Actual attachment table DDL, RLS, audit and evidence triggers, historical
// queue/RPC definitions and the ENTIRE pending migration execute in PostgreSQL.
// Only Auth and unrelated business tables are minimal synthetic fixtures.
test('attachment review authorization and field protection in PostgreSQL', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth; create schema private;
      create role authenticated; create role anon; create role service_role bypassrls;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      create type public.wpi_app_role as enum ('admin','manager','editor','reviewer','viewer');
      create type public.wpi_app_permission as enum ('file.read','file.write','file.delete','price.review');
      create type public.wpi_risk_level as enum ('low','medium','high','critical');
      create table auth.users(id uuid primary key);
      create table public.wpi_organizations(id uuid primary key);
      create table public.wpi_organization_members(organization_id uuid,user_id uuid,role public.wpi_app_role,is_active boolean);
      create table public.wpi_role_permissions(role public.wpi_app_role,permission public.wpi_app_permission);
      create table public.wpi_organization_role_permissions(organization_id uuid,role public.wpi_app_role,permission public.wpi_app_permission,is_enabled boolean);
      create table public.wpi_equipment_price_reviews(organization_id uuid,equipment_price_id uuid,status text);
      create table public.wpi_equipment_prices(id uuid primary key, organization_id uuid, equipment_name text,price_code text);
      create table public.wpi_material_prices(id uuid primary key, organization_id uuid, material_name text,price_code text);
      create table public.wpi_inquiries(id uuid primary key, organization_id uuid, subject text,inquiry_code text);
      create table public.wpi_projects(id uuid primary key, organization_id uuid, name text,project_code text);
      create table public.wpi_reports(id uuid primary key, organization_id uuid, title text,report_code text);
      grant usage on schema public,private,auth to authenticated,anon;
      grant select on public.wpi_organization_members,public.wpi_equipment_price_reviews to authenticated;
      insert into public.wpi_organizations values ('${id(1)}'),('${id(2)}');
      insert into auth.users values ${[10,11,12,13,14,15,20].map(n => `('${id(n)}')`).join(',')};
      insert into public.wpi_organization_members values
        ('${id(1)}','${id(10)}','admin',true),('${id(1)}','${id(11)}','editor',true),
        ('${id(1)}','${id(12)}','reviewer',true),('${id(1)}','${id(13)}','viewer',true),
        ('${id(1)}','${id(14)}','reviewer',false),('${id(1)}','${id(15)}','manager',true),
        ('${id(2)}','${id(20)}','admin',true);
      insert into public.wpi_role_permissions values ('editor','file.read'),('editor','file.write'),
        ('viewer','file.read'),('reviewer','file.read'),('reviewer','price.review'),
        ('manager','file.read'),('manager','file.write'),('manager','price.review');
      insert into public.wpi_material_prices values ('${id(50)}','${id(1)}','Synthetic material','TEST'),('${id(51)}','${id(2)}','Foreign material','TEST-FOREIGN');
    `);
    await db.exec(fn(core, 'private.wpi_is_org_member'));
    await db.exec(fn(read('20260820170917_add_organization_role_permission_overrides.sql'), 'private.wpi_has_permission'));
    await db.exec(fn(core, 'private.wpi_set_updated_at'));
    await db.exec(part(core, 'create table public.wpi_audit_logs('));
    await db.exec(fn(core, 'private.wpi_audit_row_change'));
    await db.exec(part(core, 'create table public.wpi_attachments('));
    await db.exec(read('20260813094946_harden_equipment_evidence_chain_p1.sql'));
    await db.exec(read('20260820201005_attachment_evidence_detail_backend.sql'));
    await db.exec(governance.slice(0, governance.indexOf('create or replace function private.wpi_refresh_attachment_governance')));
    await db.exec(`alter table public.wpi_attachments enable row level security;
      grant select,insert,update,delete on public.wpi_attachments to authenticated;
      create trigger wpi_attachments_audit after insert or update or delete on public.wpi_attachments
        for each row execute function private.wpi_audit_row_change();`);
    for (const name of ['wpi_attachments_read','wpi_attachments_write','wpi_attachments_delete']) {
      await db.exec(part(core, `create policy ${name} `));
    }
    await db.exec(migration);
    await db.exec(`grant usage on schema public,private,auth to service_role;
      grant select,insert,update on public.wpi_attachments to service_role;
      grant select on public.wpi_equipment_price_reviews to service_role;`);
    async function actor(n, role = 'authenticated') {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [n ? id(n) : '']);
      await db.exec('set role ' + role);
    }
    async function owner(sql, args = []) { await db.exec('reset role'); return db.query(sql, args); }
    let next = 100;
    async function seed(extra = {}) {
      const n = next++;
      await owner(`insert into public.wpi_attachments(id,organization_id,bucket_id,object_path,original_name,
        checksum,uploaded_by,related_type,related_id) values ($1,$2,'business-documents',$3,'synthetic.pdf',$3,$4,'material_price',$5)`,
      [id(n), extra.org ?? id(1), `fixture-${n}`, id(11), id(50)]);
      for (const [column, value] of Object.entries(extra).filter(([key]) => key !== 'org')) {
        assert.match(column, /^[a-z_]+$/);
        await owner(`update public.wpi_attachments set ${column}=$1 where id=$2`, [value, id(n)]);
      }
      const version = (await owner('select evidence_version from public.wpi_attachments where id=$1', [id(n)])).rows[0].evidence_version;
      await owner(`insert into public.wpi_attachment_ai_runs(organization_id,attachment_id,status,input_snapshot,requested_by,risk_level)
        values ($1,$2,'needs_review',$3,$4,'low')`, [extra.org ?? id(1), id(n), JSON.stringify({ evidenceVersion: Number(version) }), id(11)]);
      return id(n);
    }
    const review = (attachment, decision = 'confirmed', notes = 'Human checked original evidence') => db.query(
      'select public.wpi_submit_attachment_review($1,$2,$3) result', [attachment, decision, notes]);
    const assign = (attachments, user) => db.query('select public.wpi_assign_attachments($1::uuid[],$2) affected', [attachments, id(user)]);
    const snapshot = async attachment => (await owner(`select to_jsonb(a) record,
      (select count(*) from public.wpi_attachment_reviews where attachment_id=a.id) reviews,
      (select count(*) from public.wpi_audit_logs where record_id=a.id::text) audits
      from public.wpi_attachments a where id=$1`, [attachment])).rows[0];
    async function rejectsUnchanged(attachment, user, action, pattern) {
      const before = await snapshot(attachment); await actor(user);
      await assert.rejects(action, pattern); assert.deepEqual(await snapshot(attachment), before);
    }

    await t.test('anonymous, editor, viewer, inactive and foreign members cannot submit any review decision', async () => {
      const attachment = await seed();
      for (const user of [null,11,13,14,20]) for (const decision of ['confirmed','need_info','rejected']) {
        await rejectsUnchanged(attachment,user,() => review(attachment,decision), /AUTHENTICATION_REQUIRED|PERMISSION_DENIED/);
      }
      await actor(null,'anon'); await assert.rejects(() => review(attachment), /permission denied/);
    });
    await t.test('trusted service ingestion can still create pending evidence without an interactive session', async () => {
      await actor(null,'service_role');
      const result = await db.query(`insert into public.wpi_attachments(organization_id,bucket_id,object_path,original_name,uploaded_by)
        values ($1,'business-documents','service-fixture','service-fixture.pdf',$2) returning review_state,verification_status,evidence_version`,[id(1),id(11)]);
      assert.equal(result.rows[0].review_state,'pending_ai');assert.equal(result.rows[0].verification_status,'pending');
      assert.equal(Number(result.rows[0].evidence_version),1);
    });
    await t.test('every direct INSERT/UPDATE forgery is denied, even for an authenticated business admin', async () => {
      const attachment = await seed();
      const forgeries = [
        {review_state:'confirmed'}, {review_state:'rejected'}, {review_state:'need_info'},
        {verification_status:'verified'}, {verified_by:id(12)}, {verified_at:'2026-09-01T00:00:00Z'},
        {metadata:{last_review_decision:'confirmed'}}, {metadata:{reviewedBy:id(12)}},
        {metadata:{verifiedAt:'2026-09-01'}}, {assigned_reviewer_id:id(13)}, {assigned_by:id(12)},
        {assigned_at:'2026-09-01T00:00:00Z'}, {evidence_version:99},
        {duplicate_of_attachment_id:attachment},
      ];
      for (const user of [11,10]) for (const patch of forgeries) {
        const [column,value] = Object.entries(patch)[0];
        const encoded = typeof value === 'object' ? JSON.stringify(value) : value;
        await rejectsUnchanged(attachment,user,() => db.query(`update public.wpi_attachments set ${column}=$1 where id=$2`,[encoded,attachment]), /PROTECTED/);
        await actor(user);
        await assert.rejects(() => db.query(`insert into public.wpi_attachments(organization_id,bucket_id,object_path,original_name,uploaded_by,${column})
          values ($1,'business-documents',$2,'forged.pdf',$3,$4)`, [id(1),crypto.randomUUID(),id(user),encoded]), /PROTECTED/);
      }
      for (const [column,value] of [['organization_id',id(2)],['id',id(999)],['uploaded_by',id(12)],['created_at','2020-01-01'],['attachment_code','FORGED']]) {
        await rejectsUnchanged(attachment,11,() => db.query(`update public.wpi_attachments set ${column}=$1 where id=$2`,[value,attachment]), /IMMUTABLE/);
      }
      await actor(11); await db.exec("select set_config('wpi.attachment_review_rpc','true',false)");
      await assert.rejects(() => db.query("update public.wpi_attachments set review_state='confirmed' where id=$1",[attachment]), /PROTECTED/);
      await assert.rejects(() => db.query("insert into public.wpi_attachment_reviews(organization_id,attachment_id,reviewer_id,decision) values ($1,$2,$3,'confirmed')",[id(1),attachment,id(12)]),/permission denied/);
    });
    await t.test('valid reviewer, manager and admin confirm with bound identity and transactional review/audit history', async () => {
      for (const user of [12,15,10]) {
        const attachment = await seed(); await actor(user);
        const result = (await review(attachment)).rows[0].result;
        assert.equal(result.reviewState,'confirmed');
        const after = await snapshot(attachment);
        assert.equal(after.record.verification_status,'verified'); assert.equal(after.record.verified_by,id(user));
        assert.ok(after.record.verified_at); assert.equal(Number(after.reviews),1);
        const history = (await owner('select * from public.wpi_attachment_reviews where attachment_id=$1',[attachment])).rows[0];
        assert.equal(history.reviewer_id,id(user)); assert.equal(history.id,result.reviewId);
        await rejectsUnchanged(attachment,user,() => review(attachment), /STATE_CONFLICT/);
      }
    });
    await t.test('need-info and rejection use the same review permission and server-bound history', async () => {
      for (const decision of ['need_info','rejected']) {
        const attachment = await seed(); await actor(12);
        assert.equal((await review(attachment,decision)).rows[0].result.reviewState,decision);
        const after = await snapshot(attachment);
        assert.equal(after.record.verified_by,null); assert.equal(Number(after.reviews),1);
        const history = (await owner('select reviewer_id,decision from public.wpi_attachment_reviews where attachment_id=$1',[attachment])).rows[0];
        assert.deepEqual(history,{reviewer_id:id(12),decision});
      }
      const attachment = await seed();
      for (const [decision,notes] of [[null,'valid note'],['confirmed',null],['confirmed','tiny']]) {
        await rejectsUnchanged(attachment,12,() => review(attachment,decision,notes), /DECISION_UNSUPPORTED|NOTES_REQUIRED/);
      }
    });
    await t.test('approval admission rejects missing source, association, current AI, duplicates and open issues', async () => {
      for (const [extra, pattern] of [
        [{related_id:null},/RELATION_REQUIRED/], [{related_id:id(51)},/RELATION_TARGET_NOT_FOUND/],
        [{checksum:null},/SOURCE_EVIDENCE_REQUIRED/], [{status:'archived'},/STATE_CONFLICT/],
        [{metadata:JSON.stringify({migrated_from:'legacy-mock'})},/SOURCE_EVIDENCE_REQUIRED/],
      ]) { const attachment = await seed(extra); await rejectsUnchanged(attachment,12,() => review(attachment),pattern); }
      const attachment = await seed();
      await owner('delete from public.wpi_attachment_ai_runs where attachment_id=$1',[attachment]);
      await rejectsUnchanged(attachment,12,() => review(attachment), /AI_REVIEW_REQUIRED/);
      const issueAttachment = await seed();
      await owner("insert into public.wpi_attachment_issues(organization_id,attachment_id,label,created_by) values ($1,$2,'Synthetic unresolved issue',$3)",[id(1),issueAttachment,id(11)]);
      await rejectsUnchanged(issueAttachment,12,() => review(issueAttachment), /OPEN_ISSUES/);
      const duplicate = await seed({duplicate_of_attachment_id:attachment});
      await rejectsUnchanged(duplicate,12,() => review(duplicate), /DUPLICATE_UNRESOLVED/);
      const high = await seed(); await owner("update public.wpi_attachment_ai_runs set risk_level='high' where attachment_id=$1",[high]);
      await rejectsUnchanged(high,12,() => review(high,'confirmed','short note'), /HIGH_RISK/);
      await actor(12); assert.equal((await review(high)).rows[0].result.reviewState,'confirmed');
    });
    await t.test('content, relation and manual corrections invalidate confirmations and stale AI; ordinary draft edits remain usable', async () => {
      for (const patch of ["checksum='new-checksum'","object_path='new-path'","related_id=null",
        "metadata=metadata || '{\"ai_result\":{\"extracted_fields\":[{\"label\":\"price\",\"value\":\"42\"}]}}'::jsonb"]) {
        const attachment = await seed(); await actor(12); await review(attachment);
        const before = await snapshot(attachment); await actor(11);
        await db.query(`update public.wpi_attachments set ${patch} where id=$1`,[attachment]);
        const after = await snapshot(attachment);
        assert.equal(after.record.review_state,'pending_ai'); assert.equal(after.record.verification_status,'pending');
        assert.equal(after.record.verified_by,null); assert.equal(after.record.verified_at,null);
        assert.equal(after.record.metadata.last_review_decision,undefined);
        assert.equal(Number(after.record.evidence_version),Number(before.record.evidence_version)+1);
        assert.equal(Number(after.reviews),1);
        await rejectsUnchanged(attachment,12,() => review(attachment), /AI_REVIEW_REQUIRED|RELATION_REQUIRED/);
      }
      const draft = await seed(); await actor(11);
      await db.query("update public.wpi_attachments set description='Additional source details' where id=$1",[draft]);
      assert.equal((await snapshot(draft)).record.description,'Additional source details');
      // The legitimate AI helper's update shape remains supported, while the
      // next confirmation must reference the new evidence revision.
      const corrected = await seed(); await actor(12); await review(corrected);
      await actor(11);
      await db.query(`update public.wpi_attachments set metadata=metadata || '{"ai_result":{"extracted_fields":[]},"manually_corrected_by":"${id(11)}"}',
        verification_status='pending',verified_by=null,verified_at=null where id=$1`,[corrected]);
      const version = (await snapshot(corrected)).record.evidence_version;
      await actor(11);
      await db.query(`insert into public.wpi_attachment_ai_runs(organization_id,attachment_id,status,input_snapshot,requested_by,risk_level)
        values ($1,$2,'needs_review',$3,$4,'low')`,[id(1),corrected,JSON.stringify({evidenceVersion:Number(version)}),id(11)]);
      await db.query(`update public.wpi_attachments set ai_status='needs_review',ai_confidence=88,ai_risk_level='low',
        ai_analyzed_at=now(),review_state='pending_review',verification_status='pending',verified_by=null,verified_at=null
        where id=$1 and evidence_version=$2`,[corrected,version]);
      await actor(12); assert.equal((await review(corrected)).rows[0].result.reviewState,'confirmed');
    });
    await t.test('multirow field forgery rolls back legal rows from the same statement', async () => {
      const first = await seed(); const second = await seed();
      const beforeFirst = await snapshot(first); const beforeSecond = await snapshot(second);
      await actor(11);
      await assert.rejects(() => db.query(`update public.wpi_attachments set description='batch update',
        verified_by=case when id=$1 then $2::uuid else verified_by end where id=any($3::uuid[])`,[second,id(12),[first,second]]),/PROTECTED/);
      assert.deepEqual(await snapshot(first),beforeFirst);assert.deepEqual(await snapshot(second),beforeSecond);
      await actor(11);
      await assert.rejects(() => db.query(`insert into public.wpi_attachments(organization_id,bucket_id,object_path,original_name,uploaded_by,review_state)
        values ($1,'business-documents','batch-good','good.pdf',$2,'pending_ai'),
        ($1,'business-documents','batch-forged','bad.pdf',$2,'confirmed')`,[id(1),id(11)]),/PROTECTED/);
      assert.equal((await owner("select count(*) total from public.wpi_attachments where object_path like 'batch-%'")).rows[0].total,0);
    });
    await t.test('assignment filters effective reviewer capability and rejects mixed batches without partial writes', async () => {
      const attachment = await seed(); const other = await seed({org:id(2)});
      for (const user of [11,13,14,20]) await rejectsUnchanged(attachment,12,() => assign([attachment],user), /NOT_ELIGIBLE/);
      for (const user of [11,13,14,20]) await rejectsUnchanged(attachment,user,() => assign([attachment],12), /PERMISSION_DENIED/);
      await rejectsUnchanged(attachment,12,() => assign([attachment,other],12), /SCOPE_OR_STATE/);
      await rejectsUnchanged(attachment,12,() => assign([attachment,id(999)],12), /SCOPE_OR_STATE/);
      await actor(12); assert.equal((await assign([attachment,attachment],12)).rows[0].affected,1);
      assert.equal((await snapshot(attachment)).record.assigned_by,id(12));
      await owner("insert into public.wpi_organization_role_permissions values ($1,'reviewer','price.review',false)",[id(1)]);
      await rejectsUnchanged(attachment,12,() => review(attachment), /PERMISSION_DENIED/);
      await rejectsUnchanged(attachment,10,() => assign([attachment],12), /NOT_ELIGIBLE/);
      await actor(10); assert.equal((await assign([attachment],15)).rows[0].affected,1);
      const roster = (await db.query('select * from public.wpi_attachment_reviewers($1)',[id(1)])).rows;
      assert.deepEqual(roster.map(row=>row.user_id).sort(),[id(10),id(15)]);
      await owner("insert into public.wpi_organization_role_permissions values ($1,'editor','price.review',true)",[id(1)]);
      await rejectsUnchanged(attachment,11,() => review(attachment), /PERMISSION_DENIED/);
      await owner('delete from public.wpi_organization_role_permissions');
    });
    await t.test('a failing business trigger rolls back both review record and attachment mutation', async () => {
      const attachment = await seed({related_type:'equipment_price',related_id:id(60)});
      await owner('insert into public.wpi_equipment_prices values ($1,$2,\'Synthetic equipment\',\'TEST-EQ\')',[id(60),id(1)]);
      await owner("insert into public.wpi_equipment_price_reviews values ($1,$2,'pending')",[id(1),id(60)]);
      await rejectsUnchanged(attachment,12,() => review(attachment), /frozen/);
      await rejectsUnchanged(attachment,11,() => db.query("update public.wpi_attachments set related_type='material_price',related_id=$1 where id=$2",[id(50),attachment]), /frozen/);
    });
  } finally { await db.close(); }
});
