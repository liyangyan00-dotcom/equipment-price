const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

// Execute real route handlers and permission helper; replace only session,
// database transport and unrelated detail presentation/AI execution.
function harness({ role='reviewer', authenticated=true, eligible=true, permissionError=false,
  rpcError=null, missing=[], readError=false, editRace=false, roster=[{user_id:id(12),role:'reviewer'},{user_id:id(15),role:'manager'}] }={}) {
  const state={reads:[],writes:[],permissionReads:0};
  const userId = role==='reviewer'?id(12):role==='manager'?id(15):role==='admin'?id(10):id(11);
  if(role==='admin') roster=[...roster,{user_id:id(10),role:'admin'}];
  if(!eligible) roster=roster.filter(row=>row.user_id!==userId);
  const supabase={
    async rpc(name,args) {
      if(name==='wpi_attachment_reviewers') {
        state.permissionReads++; assert.equal(args.target_organization_id,id(1));
        return permissionError?{data:null,error:{message:'transport unavailable'}}:{data:roster,error:null};
      }
      assert.ok(['wpi_submit_attachment_review','wpi_assign_attachments'].includes(name));
      state.writes.push({name,args});
      return rpcError?{data:null,error:{message:rpcError}}:{data:name==='wpi_assign_attachments'?args.target_attachment_ids.length:{reviewState:args.review_decision},error:null};
    },
    from(table) {
      const filters=[];
      const query = {then(resolve,reject) {
        const data=table==='wpi_profiles'?roster.map(row=>({id:row.user_id,display_name:row.role})):[];
        return Promise.resolve({data,error:null,count:0}).then(resolve,reject);
      }};
      for(const method of ['select','eq','neq','order','or','range','in','lt','not','is','contains'])query[method]=()=>query;
      query.eq=(key,value)=>{filters.push([key,value]);return query;};
      query.update=patch=>{state.writes.push({table,patch,filters});return query;};
      query.maybeSingle=async()=>({data:editRace?null:{id:id(100)},error:null});
      return query;
    },
  };
  const access=authenticated?{ok:true,supabase,userId,organizationId:id(1),role}:{ok:false,status:401,error:'Unauthorized'};
  const cache=new Map();
  function load(file) {
    file=path.resolve(file); if(cache.has(file))return cache.get(file).exports;
    const loaded={exports:{}}; cache.set(file,loaded);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    function localRequire(name) {
      if(name==='@/lib/auth/apiAccess')return {getApiAccess:async()=>access};
      if(name==='@/lib/data/attachmentEvidenceRepository')return {
        findAttachment:async(received,attachment)=>{
          assert.equal(received.organizationId,id(1)); state.reads.push(attachment);
          return {data:missing.includes(attachment)?null:{id:attachment,organization_id:id(1),metadata:{},updated_at:'2026-09-09T00:00:00.123456Z'},error:readError?{message:'read failed'}:null};
        },readAttachmentDetail:async(_access,row)=>row,
      };
      if(name==='@/lib/data/attachmentAiReview')return {runAttachmentAiReview:async()=>{throw Error('AI must not be called by review/assignment');}};
      if(name.startsWith('@/'))return load(path.join('src',name.slice(2))+'.ts');
      return require(name);
    }
    new Function('require','module','exports',code)(localRequire,loaded,loaded.exports);
    return loaded.exports;
  }
  const review=load('src/app/api/attachments/[id]/review/route.ts');
  const actions=load('src/app/api/attachments/actions/route.ts');
  const list=load('src/app/api/attachments/route.ts');
  const edit=load('src/app/api/attachments/[id]/route.ts');
  const request=(body,raw)=>new Request('http://localhost/api/attachments',{method:'POST',headers:{'Content-Type':'application/json'},body:raw?body:JSON.stringify(body)});
  return {state,review:(body={decision:'confirmed',notes:'Human checked the evidence'},raw=false)=>review.POST(request(body,raw),{params:Promise.resolve({id:id(100)})}),
    assign:(body={action:'assign',ids:[id(100)],reviewerId:id(12)},raw=false)=>actions.POST(request(body,raw)),
    list:()=>list.GET(new NextRequest('http://localhost/api/attachments')),
    edit:body=>edit.PATCH(request(body,false),{params:Promise.resolve({id:id(100)})})};
}

test('attachment API refuses anonymous/editor/viewer/revoked reviewers before lookup or mutation',async()=>{
  for(const config of [{authenticated:false},{role:'editor'},{role:'viewer'},{eligible:false}]) {
    for(const decision of ['confirmed','need_info','rejected']) {
      const h=harness(config);const response=await h.review({decision,notes:'Manual review note'});
      assert.equal(response.status,config.authenticated===false?401:403);
      assert.equal(h.state.reads.length,0);assert.equal(h.state.writes.length,0);
    }
    const h=harness(config);assert.equal((await h.assign()).status,config.authenticated===false?401:403);
    assert.equal(h.state.writes.length,0);
  }
});
test('permission transport failures fail closed for review, assignment and list',async()=>{
  for(const action of ['review','assign','list']) {
    const h=harness({permissionError:true});assert.equal((await h[action]()).status,503);assert.equal(h.state.writes.length,0);
  }
});
test('review rejects malformed JSON, invalid fields and client-supplied identity without writes',async()=>{
  for(const body of [null,[],{}, {decision:null,notes:'valid note'}, {decision:'auto_confirm',notes:'valid note'},
    {decision:'confirmed',notes:42},{decision:'confirmed',notes:'tiny'},
    {decision:'confirmed',notes:'x'.repeat(1001)},
    {decision:'confirmed',notes:'valid note',verified_by:id(10)},
    {decision:'confirmed',notes:'valid note',metadata:{last_review_decision:'confirmed'}}]) {
    const h=harness();assert.equal((await h.review(body)).status,400,JSON.stringify(body));assert.equal(h.state.writes.length,0);
  }
  const h=harness();assert.equal((await h.review('{bad',true)).status,400);assert.equal(h.state.writes.length,0);
});
test('legitimate review roles call guarded RPC with only decision, notes and resolved attachment id',async()=>{
  for(const role of ['reviewer','manager','admin'])for(const decision of ['confirmed','need_info','rejected']) {
    const h=harness({role});const response=await h.review({decision,notes:'  Human checked the evidence  '});
    assert.equal(response.status,200);assert.deepEqual(h.state.writes,[{name:'wpi_submit_attachment_review',args:{
      target_attachment_id:id(100),review_decision:decision,review_notes:'Human checked the evidence'}}]);
    assert.equal((await response.json()).review.reviewState,decision);
  }
});
test('database denial after API permission check is returned as 403 and does not refresh detail',async()=>{
  const h=harness({rpcError:'ATTACHMENT_REVIEW_PERMISSION_DENIED'});const response=await h.review();
  assert.equal(response.status,403);assert.equal((await response.json()).code,'ATTACHMENT_REVIEW_PERMISSION_DENIED');
  assert.equal(h.state.reads.length,1);
  for(const error of ['ATTACHMENT_AI_REVIEW_REQUIRED','ATTACHMENT_OPEN_ISSUES:1','ATTACHMENT_SOURCE_EVIDENCE_REQUIRED','ATTACHMENT_REVIEW_STATE_CONFLICT']) {
    const denied=harness({rpcError:error});assert.equal((await denied.review()).status,409);assert.equal(denied.state.reads.length,1);
  }
});
test('assignment validates recipient, all ids and organization before invoking RPC',async()=>{
  for(const reviewerId of [id(11),id(13),id(14),id(20)]) {
    const h=harness();assert.equal((await h.assign({action:'assign',ids:[id(100)],reviewerId})).status,409);assert.equal(h.state.writes.length,0);
  }
  for(const ids of [null,'bad',[],[id(100),'invalid'],[42],Array(51).fill(id(100))]) {
    const h=harness();assert.equal((await h.assign({action:'assign',ids,reviewerId:id(12)})).status,400);assert.equal(h.state.writes.length,0);
  }
  for(const body of [null,[],{action:'assign',ids:[id(100)],reviewerId:42}]) {
    const h=harness();assert.equal((await h.assign(body)).status,400);assert.equal(h.state.writes.length,0);
  }
  const h=harness({missing:[id(200)]});assert.equal((await h.assign({action:'assign',ids:[id(100),id(200)],reviewerId:id(12)})).status,404);
  assert.equal(h.state.writes.length,0);
  const failed=harness({readError:true});assert.equal((await failed.assign()).status,500);assert.equal(failed.state.writes.length,0);
  const race=harness({rpcError:'ATTACHMENT_ASSIGN_PERMISSION_DENIED'});assert.equal((await race.assign()).status,403);
  const valid=harness();assert.equal((await valid.assign({action:'assign',ids:[id(100),id(100)],reviewerId:id(15)})).status,200);
  assert.deepEqual(valid.state.writes[0].args,{target_attachment_ids:[id(100)],target_reviewer_id:id(15)});
});
test('reviewer picker and action permissions reflect database effective roster',async()=>{
  for(const config of [{role:'editor'},{eligible:false},{role:'reviewer'},{role:'manager'}]) {
    const h=harness(config);const response=await h.list();assert.equal(response.status,200);const body=await response.json();
    const allowed=config.role!=='editor'&&config.eligible!==false;
    assert.equal(body.permissions.canReview,allowed);assert.equal(body.permissions.canAssign,allowed);
    assert.ok(body.reviewers.every(row=>['reviewer','manager'].includes(row.role)));
    if(config.eligible===false)assert.ok(!body.reviewers.some(row=>row.id===id(12)));
  }
});
test('manual field correction preserves optimistic concurrency and does not accept review identity',async()=>{
  const body={extractedFields:[{label:'price',value:'42',confidence:80}]};
  const h=harness({role:'editor'});assert.equal((await h.edit(body)).status,200);
  const write=h.state.writes[0];assert.equal(write.patch.verification_status,'pending');assert.equal(write.patch.verified_by,null);
  assert.equal(write.patch.metadata.manually_corrected_by,id(11));
  assert.deepEqual(write.filters,[['organization_id',id(1)],['id',id(100)],['updated_at','2026-09-09T00:00:00.123456Z']]);
  const race=harness({role:'editor',editRace:true});assert.equal((await race.edit(body)).status,409);
  assert.equal(race.state.reads.length,1);
  const invalid=harness({role:'editor'});assert.equal((await invalid.edit(null)).status,400);assert.equal(invalid.state.writes.length,0);
});
