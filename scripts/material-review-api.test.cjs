const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const id='11111111-1111-4111-8111-111111111111';
const version='2026-09-06T00:00:00.123456+00:00';
const fixture=()=>({id,organization_id:'org-a',legacy_id:null,price_code:'TEST-ONLY',material_name:'Steel',specification:'12mm',unit:'piece',price:100,currency:'CDF',region:'A',supplier_id:null,source_type:'authorized sample',valid_until:'2027-01-01',confidence:90,risk_level:'low',review_status:'pending_review',metadata:{quoteDate:'2026-01-01',supplierName:'Synthetic supplier',evidenceIds:['test-evidence'],usdPrice:0.04},updated_at:version});

// Execute the actual route and helpers. Only authentication/database transport is substituted.
function harness({role='admin',record=fixture(),authenticated=true,race,writeError}={}) {
  const state={record:structuredClone(record),reads:0,writes:0,filters:[],patch:null};
  const supabase={from(table){
    assert.equal(table,'wpi_material_prices');
    const conditions=[];let patch;let insertion;
    const query={
      select(projection){state.projection=projection;return query;},eq(key,value){conditions.push([key,value]);return query;},
      order(){return query;},abortSignal(signal){state.signal=signal;return query;},overrideTypes(){return query;},
      then(resolve,reject){
        state.reads++;state.filters=conditions;
        const current=state.record;
        const projected=current?{...current}:null;
        if(projected) {
          delete projected.metadata;
          for(const alias of state.projection.split(',')) {
            const match=/^list_(\w+):metadata->\w+$/.exec(alias);
            if(match) projected[`list_${match[1]}`]=current.metadata?.[match[1]]??null;
          }
        }
        return Promise.resolve({data:projected?[projected]:[],error:null}).then(resolve,reject);
      },
      update(value){patch=value;return query;},
      insert(value){insertion=value;return query;},
      async single(){
        assert.ok(insertion);state.writes++;state.patch=structuredClone(insertion);
        if(writeError) return {data:null,error:{message:writeError}};
        state.record={id,updated_at:version,...insertion};
        return {data:structuredClone(state.record),error:null};
      },
      async maybeSingle(){
        if(patch) {
          state.writes++;state.filters=conditions;state.patch=structuredClone(patch);
          if(race) race(state);
          if(writeError) return {data:null,error:{message:writeError}};
        } else state.reads++;
        const current=state.record;
        if(!current||!conditions.every(([key,value])=>current[key]===value)) return {data:null,error:null};
        if(patch) state.record={...current,...patch,updated_at:'2026-09-06T00:00:01.000001+00:00'};
        return {data:structuredClone(state.record),error:null};
      },
    };
    return query;
  }};
  const access=authenticated?{ok:true,supabase,role,organizationId:'org-a',userId:'actor'}:{ok:false,status:401,error:'Unauthorized'};
  const cache=new Map();
  function load(file) {
    file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
    const loaded={exports:{}};cache.set(file,loaded);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    function localRequire(name) {
      if(name==='@/lib/auth/apiAccess') return {getApiAccess:async()=>access};
      if(name.startsWith('@/')) return load(path.resolve('src',name.slice(2))+'.ts');
      return require(name);
    }
    new Function('require','module','exports',code)(localRequire,loaded,loaded.exports);
    return loaded.exports;
  }
  const route=load('src/app/api/material-prices/[id]/route.ts');
  const createRoute=load('src/app/api/material-prices/route.ts');
  return {state,list:()=>createRoute.GET(new Request('http://localhost/api/material-prices')),async send(body={decision:'approve',comment:'Human checked the source',expectedUpdatedAt:version},raw=false){
    return route.PATCH(new Request('http://localhost/api/material-prices/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:raw?body:JSON.stringify(body)}),{params:Promise.resolve({id})});
  },async create(body,raw=false){
    return createRoute.POST(new Request('http://localhost/api/material-prices',{method:'POST',headers:{'Content-Type':'application/json'},body:raw?body:JSON.stringify(body)}));
  }};

}

test('material list GET uses scoped cropped projection without exposing full metadata',async()=>{
  const record=fixture();record.metadata.rawPdfText='PRIVATE EVIDENCE';record.metadata.taxIncluded=false;
  const h=harness({record});const response=await h.list();const payload=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.ok(!h.state.projection.includes('*'));assert.ok(h.state.filters.some(([key,value])=>key==='organization_id'&&value==='org-a'));
  assert.ok(h.state.signal);assert.equal(payload.data[0].metadata.taxIncluded,false);
  assert.equal(payload.data[0].metadata.rawPdfText,undefined);assert.equal(payload.data[0].metadata.quoteDate,'2026-01-01');
  const anonymous=harness({authenticated:false});assert.equal((await anonymous.list()).status,401);assert.equal(anonymous.state.reads,0);
});

test('anonymous and unauthorized roles fail before reading or writing a price',async()=>{
  for(const [config,body,status]of [
    [{authenticated:false},{decision:'approve'},401],
    [{role:'viewer'},{decision:'approve'},403],
    [{role:'editor'},{decision:'approve'},403],
    [{role:'reviewer'},{price:100},403],
  ]) {const h=harness(config);assert.equal((await h.send(body)).status,status);assert.equal(h.state.reads,0);assert.equal(h.state.writes,0);}
});

test('malformed payloads and unrecognized decisions/actions cannot change state',async()=>{
  for(const body of [null,[],{decision:null},{decision:'auto_approve'},{decision:''},{action:'approve'}]) {
    const h=harness();assert.equal((await h.send(body)).status,400,JSON.stringify(body));assert.equal(h.state.writes,0);
  }
  const h=harness();assert.equal((await h.send('{bad',true)).status,400);
});

test('all updates require an opaque, exact version; microseconds are not rounded away',async()=>{
  for(const v of [undefined,'',42,'invalid']) {
    const h=harness();assert.equal((await h.send({price:120,expectedUpdatedAt:v})).status,428);assert.equal(h.state.writes,0);
  }
  const h=harness();const response=await h.send({price:120,expectedUpdatedAt:'2026-09-06T00:00:00.123455+00:00'});
  assert.equal(response.status,409);assert.equal(h.state.writes,0);
});

test('organization scoping protects reads and compare-and-set writes',async()=>{
  const other=harness({record:{...fixture(),organization_id:'org-b'}});
  assert.equal((await other.send()).status,404);assert.equal(other.state.writes,0);
  const h=harness();assert.equal((await h.send()).status,200);
  for(const condition of [['organization_id','org-a'],['id',id],['updated_at',version],['review_status','pending_review']]) {
    assert.ok(h.state.filters.some(item=>JSON.stringify(item)===JSON.stringify(condition)),JSON.stringify(condition));
  }
});

test('review requires valid state, manual comment, dates and business fields',async()=>{
  for(const status of ['approved','rejected','archived']) {
    const h=harness({record:{...fixture(),review_status:status}});assert.equal((await h.send()).status,409);assert.equal(h.state.writes,0);
  }
  for(const decision of ['approve','need_info','reject']) {
    const h=harness();assert.equal((await h.send({decision,comment:' ',expectedUpdatedAt:version})).status,400);
  }
  for(const patch of [{specification:''},{unit:''},{currency:''},{region:''},{source_type:''},{price:0},{valid_until:'2026-02-30'},{metadata:{quoteDate:'2026-01-01'}},{metadata:{quoteDate:'2026-02-30',supplierName:'A'}},{metadata:{quoteDate:'9999-01-01',supplierName:'A'}},{valid_until:'2025-12-31'}]) {
    const h=harness({record:{...fixture(),...patch}});assert.equal((await h.send()).status,400,JSON.stringify(patch));assert.equal(h.state.writes,0);
  }
});

test('legal decisions persist human identity and preserve evidence, never auto-edit submitted price fields',async()=>{
  for(const [decision,status]of [['approve','approved'],['reject','rejected'],['need_info','pending_review']]) {
    const h=harness();const r=await h.send({decision,comment:'Human evidence check',price:999999,expectedUpdatedAt:version});
    assert.equal(r.status,200);const {data}=await r.json();assert.equal(data.review_status,status);
    assert.equal(data.price,100);assert.equal(data.metadata.reviewedBy,'actor');
    assert.equal(data.metadata.reviewComment,'Human evidence check');assert.deepEqual(data.metadata.evidenceIds,['test-evidence']);
    assert.equal(data.metadata.needsInformation,decision==='need_info');
  }
});

test('editing approved material revokes its current approval and preserves evidence',async()=>{
  for(const [action,status]of [['draft','draft'],['submit_review','pending_review']]) {
    const h=harness({role:'editor',record:{...fixture(),review_status:'approved',metadata:{...fixture().metadata,reviewDecision:'approve',reviewedBy:'old-reviewer'}}});
    assert.equal((await h.send({price:120,action,expectedUpdatedAt:version})).status,200);
    assert.equal(h.state.record.review_status,status);assert.equal(h.state.record.price,120);
    assert.equal(h.state.record.metadata.reviewDecision,null);assert.equal(h.state.record.metadata.reviewedBy,null);
    assert.deepEqual(h.state.record.metadata.evidenceIds,['test-evidence']);
  }
  const h=harness({record:{...fixture(),review_status:'archived'}});
  assert.equal((await h.send({price:120,expectedUpdatedAt:version})).status,409);
});

test('change between read and write returns conflict instead of overwriting it',async()=>{
  const h=harness({race:state=>{state.record.price=900;state.record.updated_at='2026-09-06T00:00:00.123457+00:00';}});
  assert.equal((await h.send()).status,409);assert.equal(h.state.record.price,900);assert.equal(h.state.record.review_status,'pending_review');
  const statusRace=harness({race:state=>{state.record.review_status='rejected';}});
  assert.equal((await statusRace.send()).status,409);assert.equal(statusRace.state.record.review_status,'rejected');
});

test('database failure does not fabricate a successful result',async()=>{
  const h=harness({writeError:'Permission denied'});const before=structuredClone(h.state.record);
  assert.equal((await h.send()).status,400);assert.deepEqual(h.state.record,before);
});

test('POST keeps unknown measurements and quote conditions unknown instead of supplying sample defaults',async()=>{
  const base={materialName:'Steel',unit:'piece',price:100,currency:'CDF'};
  for(const value of [undefined,null,'', ' ',false,{},[], 'invalid',-1]) {
    const h=harness();const r=await h.create({...base,confidence:value,usdPrice:value});
    assert.equal(r.status,201);assert.equal(h.state.patch.confidence,null);
    assert.equal(h.state.patch.metadata.usdPrice,null);assert.equal(h.state.patch.metadata.quoteDate,null);
    assert.equal(h.state.patch.metadata.transportCondition,'');assert.equal(h.state.patch.region,null);
    assert.equal(h.state.patch.metadata.aiSuggestion,'');assert.equal(h.state.patch.review_status,'draft');
  }
  for(const value of [0,0.01,90]) {
    const h=harness();assert.equal((await h.create({...base,confidence:value,usdPrice:value})).status,201);
    assert.equal(h.state.patch.confidence,value);assert.equal(h.state.patch.metadata.usdPrice,value);
  }
});

test('POST rejects malformed requests, missing currency and unauthorized actors without writing',async()=>{
  for(const body of [null,[],{materialName:'Steel',unit:'piece',price:100}]) {
    const h=harness();assert.equal((await h.create(body)).status,400);assert.equal(h.state.writes,0);
  }
  const h=harness();assert.equal((await h.create('{bad',true)).status,400);
  for(const role of ['viewer','reviewer']) {
    const h=harness({role});assert.equal((await h.create({})).status,403);assert.equal(h.state.writes,0);
  }
});

test('PATCH preserves known values when omitted and clears only explicitly unknown optional measurements',async()=>{
  const h=harness();assert.equal((await h.send({price:120,expectedUpdatedAt:version})).status,200);
  assert.equal(h.state.patch.confidence,90);assert.equal(h.state.patch.metadata.usdPrice,0.04);
  for(const value of [null,'',false,[],{}]) {
    const h=harness();assert.equal((await h.send({confidence:value,usdPrice:value,expectedUpdatedAt:version})).status,200);
    assert.equal(h.state.patch.confidence,null);assert.equal(h.state.patch.metadata.usdPrice,null);
  }
  const unknown=harness({record:{...fixture(),confidence:null,metadata:{}}});
  assert.equal((await unknown.send({price:120,expectedUpdatedAt:version})).status,200);
  assert.equal(unknown.state.patch.confidence,null);assert.equal(unknown.state.patch.metadata.usdPrice,null);
});
