// Interactive React component regression with intercepted synthetic API responses.
// The application layout/authentication is excluded; no business API writes are sent.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

function bundle(kind = 'review') {
  const modules = [];
  const ids = new Map();
  const stubs = {
    'next/link': 'const React=require("react");exports.default=({children,...props})=>React.createElement("a",props,children);exports.__esModule=true;',
    'next/navigation': 'const params=new URLSearchParams();exports.useSearchParams=()=>params;exports.usePathname=()=>"/material-prices";exports.useRouter=()=>({push:url=>{window.testNavigation=url;}});',
    '@/components/layout/AppLayout': 'const React=require("react");exports.AppLayout=({children})=>React.createElement("main",{style:{padding:16}},children);',
  };
  function add(file, supplied) {
    if (ids.has(file)) return ids.get(file);
    const id = modules.length;
    ids.set(file,id); modules.push('');
    let code = supplied ?? fs.readFileSync(file,'utf8');
    if (/\.tsx?$/.test(file)) code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    let ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    // Dependencies can expose ESM JavaScript even when require.resolve finds
    // them. Convert those modules before discovering their require edges.
    if (ts.isExternalModule(ast)) {
      code=ts.transpileModule(code,{compilerOptions:{allowJs:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
      ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    }
    try { new Function('require','module','exports',code); } catch (error) {
      throw new Error(`Invalid browser test module ${file}: ${error.message}`,{cause:error});
    }
    const dependencies={};
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text==='require' && ts.isStringLiteral(node.arguments[0])) {
        const name=node.arguments[0].text;
        if (stubs[name]) dependencies[name]=add(name,stubs[name]);
        else {
          const request=name.startsWith('@/') ? path.resolve('src',name.slice(2)) : name;
          let resolved;
          if (name.startsWith('@/') || name.startsWith('.')) {
            const base=name.startsWith('@/') ? request : path.resolve(path.dirname(file),name);
            resolved=['','.ts','.tsx','.js','/index.ts','/index.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
          }
          resolved ??= require.resolve(request,{paths:[path.dirname(path.resolve(file)),process.cwd()]});
          dependencies[name]=add(resolved);
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(ast);
    modules[id]=`[function(require,module,exports){${code}\n},${JSON.stringify(dependencies)}]`;
    return id;
  }
  const entry=add('test-entry',kind==='review'
    ? `const React=require('react');const {createRoot}=require('react-dom/client');const {MaterialReviewCenter}=require('@/components/material-workflow/MaterialReviewCenter');window.testRoot=createRoot(document.getElementById('root'));window.testRoot.render(React.createElement(MaterialReviewCenter));`
    : kind==='supplier-picker' ? `const React=require('react');const {createRoot}=require('react-dom/client');const {SupplierPicker}=require('@/components/suppliers/SupplierPicker');function Test(){const [value,setValue]=React.useState('11111111-1111-4111-8111-000000000075');return React.createElement(SupplierPicker,{value,onChange:setValue});}window.testRoot=createRoot(document.getElementById('root'));window.testRoot.render(React.createElement(Test));`
    : kind==='material-list' ? `const React=require('react');const {createRoot}=require('react-dom/client');const MaterialPage=require('@/app/material-prices/page').default;window.testRoot=createRoot(document.getElementById('root'));window.testRoot.render(React.createElement(MaterialPage));`
    : `const React=require('react');const {createRoot}=require('react-dom/client');const {MaterialPriceForm}=require('@/components/material-workflow/MaterialPriceForm');window.testRoot=createRoot(document.getElementById('root'));window.testRoot.render(React.createElement(MaterialPriceForm,${JSON.stringify(kind==='create'?{mode:'create'}:{mode:'edit',materialId:'one'})}));`);
  return `(()=>{const process={env:{NODE_ENV:'production'}};const modules=[${modules.join(',')}],cache={};function load(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};const [fn,deps]=modules[id];fn(name=>load(deps[name]),m,m.exports);return m.exports;}load(${entry});})();`;
}

const sample = (id) => ({id,legacy_id:null,price_code:`TEST-${id}`,material_name:`脱敏钢筋-${id}`,specification:'12mm',unit:'根',price:120,currency:'CDF',region:'脱敏地区',supplier_id:'fixture-supplier',category:'钢筋',source_type:'演示样本',valid_until:'2027-01-01',confidence:90,risk_level:'low',review_status:'pending_review',metadata:{quoteDate:'2026-01-01'},updated_at:'2026-09-06T00:00:00Z'});

async function run() {
  const baseUrl=process.env.MATERIAL_BROWSER_BASE_URL || 'http://127.0.0.1:3100';
  const target=new URL(baseUrl);
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(target.hostname),'Component tests require a loopback host');
  const script=bundle();
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===target.origin?route.continue():route.abort('blockedbyclient'));
  let rows=[sample('one'),sample('two')];
  let mode='load-fail',patches=0,reads=0,lastBody;
  let supplierMode='success'; const supplierRequests=[];
  const supplierRows=Array.from({length:120},(_,index)=>({id:`11111111-1111-4111-8111-${String(index).padStart(12,'0')}`,name:`供应商-${String(index).padStart(3,'0')}`,supplier_code:`SUP-${String(index).padStart(3,'0')}`,country_code:'TEST',review_status:'approved'}));
  await page.route('**/api/**',async route=>{
    const request=route.request();
    if(new URL(request.url()).pathname==='/api/suppliers/options') {
      assert.equal(request.method(),'GET');const p=new URL(request.url()).searchParams;supplierRequests.push(p);
      if(supplierMode==='fail')return route.fulfill({status:500,json:{error:'Synthetic failure'}});
      const data=supplierRows.filter(row=>`${row.name} ${row.supplier_code}`.includes(p.get('q')||''));const current=Number(p.get('page')||1);
      return route.fulfill({json:{data:data.slice((current-1)*50,current*50),selected:supplierRows.find(row=>row.id===p.get('selectedId'))||null,pagination:{page:current,pageSize:50,total:data.length,pageCount:Math.max(1,Math.ceil(data.length/50))}}});
    }
    if(new URL(request.url()).pathname==='/api/price-collection'&&request.method()==='GET') return route.fulfill({json:{summary:{pending:0,ready:0}}});
    assert.ok(new URL(request.url()).pathname.startsWith('/api/material-prices'),'Unexpected business request');
    if(request.method()==='GET') {
      const url=new URL(request.url());
      if(url.searchParams.get('view')==='summary') return route.fulfill({json:{counts:{awaiting:rows.filter(row=>['draft','pending_review'].includes(row.review_status)).length,highRisk:rows.filter(row=>['high','critical'].includes(row.risk_level)).length,needsInfo:rows.filter(row=>row.metadata?.needsInformation).length,highConfidence:rows.filter(row=>row.confidence>=90).length,approved:rows.filter(row=>row.review_status==='approved').length},generatedAt:new Date().toISOString()}});
      reads++;
      const requestedId=new URL(request.url()).pathname.split('/')[3];
      if(requestedId==='review-queue'&&!['load-fail','malformed-load'].includes(mode)) {
        const p=url.searchParams;
        const data=rows.filter(row=> {
          if(p.get('keyword')&&!JSON.stringify(row).includes(p.get('keyword'))) return false;
          for(const [filter,field] of [['status','review_status'],['risk','risk_level'],['category','category'],['source','source_type']]) if(p.get(filter)&&p.get(filter)!=='all'&&p.get(filter)!==row[field]) return false;
          const queue=p.get('queue');
          return queue==='awaiting'?['draft','pending_review'].includes(row.review_status):queue==='highRisk'?['high','critical'].includes(row.risk_level):queue==='needsInfo'?Boolean(row.metadata?.needsInformation):queue==='highConfidence'?row.confidence>=90:queue==='approved'?row.review_status==='approved':true;
        });
        const size=Number(p.get('pageSize')||10),pageCount=Math.max(1,Math.ceil(data.length/size)),current=Math.min(Number(p.get('page')||1),pageCount);
        return route.fulfill({json:{data:data.slice((current-1)*size,current*size),pagination:{page:current,pageSize:size,total:data.length,pageCount}}});
      }
      await route.fulfill({status:mode==='load-fail'?401:200,json:mode==='load-fail'?{error:'Unauthorized'}:mode==='malformed-load'?{data:null}:{data:requestedId?rows.find(row=>row.id===requestedId):rows}});
      return;
    }
    assert.equal(request.method(),'PATCH'); patches++;
    assert.ok(request.postDataJSON().expectedUpdatedAt,'Review sends the version actually read');
    lastBody=request.postDataJSON();
    const id=decodeURIComponent(new URL(request.url()).pathname.split('/').at(-1));
    if(mode==='write-fail'||(mode==='partial'&&id==='two')) return route.fulfill({status:500,json:{error:'测试：写入失败'}});
    if(mode==='wrong-id') return route.fulfill({json:{data:{...sample('other'),review_status:'approved'}}});
    if(mode==='wrong-status') return route.fulfill({json:{data:sample(id)}});
    if(mode==='delay') await new Promise(resolve=>setTimeout(resolve,400));
    const decision=request.postDataJSON().decision;
    const next={...rows.find(row=>row.id===id),review_status:decision==='approve'?'approved':decision==='reject'?'rejected':request.postDataJSON().action==='draft'?'draft':'pending_review'};
    rows=rows.map(row=>row.id===id?next:row);
    await route.fulfill({json:{data:next}});
  });
  try {
    await page.goto(`${baseUrl}/login`,{waitUntil:'domcontentloaded'});
    const styles=await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.outerHTML).join(''));
    assert.ok(styles);
    await page.route('**/__test_material_review',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head>${styles}</head><body class="bg-page"><div id="root"></div></body></html>`}));
    await page.goto(`${baseUrl}/__test_material_review`);
    await page.evaluate(()=>{window.testToasts=[];window.addEventListener('water-price:mock-toast',e=>window.testToasts.push(e.detail));});
    await page.addScriptTag({content:script});
    await page.getByRole('alert').filter({hasText:'登录已失效'}).waitFor();
    assert.equal(await page.locator('tbody tr').count(),0);
    assert.equal(await page.getByRole('button',{name:'导出本页',exact:true}).isDisabled(),true);
    mode='malformed-load'; await page.getByRole('button',{name:'刷新数据'}).click();
    await page.getByRole('alert').filter({hasText:'审核队列响应异常'}).waitFor();
    assert.equal(await page.locator('tbody tr').count(),0);
    mode='success'; await page.getByRole('button',{name:'刷新数据'}).click();
    await page.locator('tbody tr').nth(1).waitFor();
    assert.equal(reads,3,'Rerender must not refetch the whole list');
    async function approve() {
      await page.getByPlaceholder('填写核验结论；退回或驳回时必须说明原因').fill('合成样本核验意见：日期、来源、价格已对照。');
      await page.getByRole('button',{name:'审核通过',exact:true}).click();
      await page.getByRole('dialog').getByRole('button',{name:'确认通过',exact:true}).click();
    }
    mode='write-fail'; await approve();
    await page.getByRole('alert').filter({hasText:'写入失败'}).waitFor();
    assert.match(await page.locator('tbody tr').first().innerText(),/待审核/);
    mode='wrong-status'; await approve();
    await page.getByRole('dialog').waitFor({state:'hidden'});
    assert.match(await page.locator('tbody tr').first().innerText(),/待审核/);
    assert.doesNotMatch(await page.locator('tbody tr').first().innerText(),/已通过/);
    mode='wrong-id'; await approve();
    await page.getByRole('alert').filter({hasText:'审核响应未确认'}).waitFor();
    assert.match(await page.locator('tbody tr').first().innerText(),/待审核/);
    mode='delay'; const before=patches;
    await page.getByPlaceholder('填写核验结论；退回或驳回时必须说明原因').fill('合成样本人工核验确认。');
    await page.getByRole('button',{name:'审核通过',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'确认通过',exact:true}).evaluate(button=>{button.click();button.click();});
    await page.getByRole('dialog').waitFor({state:'hidden'});
    assert.equal(patches-before,1,'Double confirmation sends one mutation');
    assert.match(await page.locator('tbody tr').first().innerText(),/已通过/);
    assert.equal(await page.getByRole('button',{name:'审核通过',exact:true}).isDisabled(),true);
    rows=[sample('one'),{...sample('two'),source_type:'=TEST("formula")'}]; mode='partial';
    await page.getByRole('button',{name:'刷新数据'}).click();
    await page.locator('tbody tr').nth(1).waitFor();
    for(const box of await page.locator('tbody input[type="checkbox"]').all()) await box.check();
    await page.getByRole('button',{name:'批量通过低风险'}).click();
    await page.getByRole('alert').filter({hasText:'1 条成功，1 条未确认成功'}).waitFor();
    assert.equal(await page.locator('tbody input[type="checkbox"]').nth(0).isChecked(),false);
    assert.equal(await page.locator('tbody input[type="checkbox"]').nth(1).isChecked(),true);
    assert.match(await page.locator('tbody tr').nth(1).innerText(),/待审核/);
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'导出本页',exact:true}).click();
    const download=await downloadPromise;
    const csv=fs.readFileSync(await download.path(),'utf8');
    assert.match(csv,/TEST-one/); assert.match(csv,/TEST-two/); assert.match(csv,/CDF/); assert.match(csv,/待审核/);
    assert.ok(csv.includes("'=TEST"),'Spreadsheet formula-shaped source is escaped as text');
    const notes=await page.evaluate(()=>window.testToasts);
    assert.equal(notes.filter(n=>n.title==='审核通过').length,1);
    assert.equal(errors.length,0,errors.join('\n'));
    fs.mkdirSync('artifacts/material-review',{recursive:true});
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${width}`);
      await page.screenshot({path:`artifacts/material-review/partial-${width}.png`,fullPage:true});
    }
    rows=[{...sample('one'),confidence:null},{...sample('two'),confidence:0}];mode='success';
    await page.getByRole('button',{name:'刷新数据'}).click();
    await page.locator('tbody tr').first().getByText('未评估',{exact:true}).waitFor();
    assert.equal(await page.locator('tbody tr').nth(1).getByText('0%',{exact:true}).count(),1,'Known zero is not an unknown measurement');
    assert.equal(await page.getByRole('columnheader',{name:'AI置信度'}).count(),0);
    await page.getByPlaceholder('材料、编号、地区、供应商').fill('NO-MATCH');
    await page.getByRole('button',{name:'查询',exact:true}).click();
    assert.equal(await page.locator('tbody tr').count(),0);
    assert.equal(await page.getByRole('button',{name:'审核通过',exact:true}).count(),0,'No hidden record may remain actionable');
    rows=Array.from({length:25},(_,index)=>({...sample(`page-${String(index).padStart(2,'0')}`),risk_level:index===24?'critical':'low'}));
    await page.getByRole('button',{name:'重置',exact:true}).click();
    await page.getByText('共 25 条，每页 10 条，当前第 1 / 3 页',{exact:true}).waitFor();
    assert.equal(await page.locator('tbody tr').count(),10);
    const allDownloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'导出全部筛选结果',exact:true}).click();
    const allDownload=await allDownloadPromise;
    const allCsv=fs.readFileSync(await allDownload.path(),'utf8');
    assert.match(allDownload.suggestedFilename(),/全部筛选-25条/);
    assert.match(allCsv,/TEST-page-00/); assert.match(allCsv,/TEST-page-24/);
    assert.equal(allCsv.trim().split('\r\n').length,26,'Full export must not stop at the visible 10 rows');
    await page.locator('tbody input[type="checkbox"]').first().check();
    await page.getByRole('button',{name:'下一页',exact:true}).click();
    await page.getByText('共 25 条，每页 10 条，当前第 2 / 3 页',{exact:true}).waitFor();
    assert.match(await page.locator('tbody tr').first().innerText(),/page-10/);
    assert.equal(await page.locator('tbody input:checked').count(),0,'Selections must not leak between pages');
    await page.getByRole('button',{name:'下一页',exact:true}).click();
    await page.getByText('共 25 条，每页 10 条，当前第 3 / 3 页',{exact:true}).waitFor();
    assert.equal(await page.locator('tbody tr').count(),5);
    assert.equal(await page.getByRole('button',{name:'下一页',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:/高风险价格/}).click();
    await page.getByText('共 1 条，每页 10 条，当前第 1 / 1 页',{exact:true}).waitFor();
    assert.match(await page.locator('tbody tr').first().innerText(),/page-24/,'High risk queue must include critical');
    await page.evaluate(()=>window.testRoot.unmount());
    rows=[sample('one'),sample('two')];
    const formScript=bundle('form');
    const mountForm=async(content=formScript)=>{
      await page.goto(`${baseUrl}/__test_material_review`);
      await page.evaluate(()=>{window.testToasts=[];window.addEventListener('water-price:mock-toast',e=>window.testToasts.push(e.detail));});
      await page.addScriptTag({content});
    };
    mode='load-fail'; await mountForm();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button',{name:'保存草稿'}).count(),0,'Load failure must not expose a writable mock form');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'artifacts/material-review/edit-load-error-390.png',fullPage:true});
    mode='write-fail'; await mountForm();
    await page.getByRole('button',{name:'保存草稿'}).first().waitFor();
    await page.getByRole('button',{name:'保存草稿'}).first().click();
    await page.waitForFunction(()=>window.testToasts.some(item=>item.title==='保存失败'));
    assert.equal(await page.evaluate(()=>window.testNavigation),undefined);
    assert.equal(lastBody.expectedUpdatedAt,rows[0].updated_at);
    mode='delay'; const formPatches=patches;
    await page.getByRole('button',{name:'保存草稿'}).first().evaluate(button=>{button.click();button.click();});
    await page.waitForFunction(()=>window.testNavigation==='/material-prices/one');
    assert.equal(patches-formPatches,1);
    assert.equal(lastBody.action,'draft');
    rows=[{...sample('one'),unit:'PIECE BARRE DE 12',currency:'XAF',category:'custom category',source_type:'official_bulletin',confidence:null,metadata:{}}];
    mode='success'; await mountForm();
    await page.getByRole('button',{name:'保存草稿'}).first().waitFor();
    assert.equal(await page.getByLabel('计量单位').inputValue(),'PIECE BARRE DE 12');
    assert.equal(await page.getByLabel('币种').inputValue(),'XAF');
    assert.equal(await page.getByLabel('来源类型').inputValue(),'official_bulletin');
    assert.equal(await page.getByLabel('报价日期').inputValue(),'');
    assert.equal(await page.getByLabel('运输条件').inputValue(),'');
    await page.getByText('未评估',{exact:true}).waitFor();
    const beforeChecks={reads,patches};
    await page.getByRole('button',{name:'检查资料',exact:true}).click();
    await page.getByRole('status').filter({hasText:'资料检查：待补齐'}).waitFor();
    assert.deepEqual({reads,patches},beforeChecks,'Local checks make no API call');
    assert.equal(await page.getByRole('button',{name:'AI 预审',exact:true}).count(),0);
    assert.equal(await page.getByText('暂无模型预审结论',{exact:true}).count(),1);
    const aiLink=page.getByRole('link',{name:'AI 补充采集'});
    const aiUrl=new URL(await aiLink.getAttribute('href'),'http://localhost');
    assert.equal(aiUrl.pathname,'/ai-price-collection');assert.equal(aiUrl.searchParams.get('target'),'material');
    assert.equal(aiUrl.searchParams.get('keyword'),rows[0].material_name);
    assert.equal(await aiLink.getAttribute('target'),'_blank','Supplementary collection must not discard the unsaved form');
    await page.getByRole('button',{name:'保存草稿'}).first().click();
    await page.waitForFunction(()=>window.testNavigation==='/material-prices/one');
    assert.equal(lastBody.confidence,null);assert.equal(lastBody.usdPrice,null);
    assert.equal(lastBody.aiSuggestion,'');assert.equal(lastBody.quoteDate,'');assert.equal(lastBody.transportCondition,'');
    const readsBeforeCreate=reads;await mountForm(bundle('create'));
    await page.getByRole('button',{name:'检查资料'}).waitFor();
    for(const label of ['材料类别','计量单位','币种','地区','报价日期','有效期','来源类型','折算美元价','运输条件']) {
      assert.equal(await page.getByLabel(label,{exact:false}).inputValue(),'',`No fabricated default for ${label}`);
    }
    assert.equal(reads,readsBeforeCreate);
    await page.getByText('未评估',{exact:true}).waitFor();
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Form overflow ${width}`);
      await page.screenshot({path:`artifacts/material-review/create-truth-${width}.png`,fullPage:true});
    }
    rows=[{...sample('unknown'),confidence:null},{...sample('zero'),confidence:0},{...sample('scored'),confidence:93}];
    mode='success'; await mountForm(bundle('material-list'));
    await page.locator('tbody tr').filter({hasText:'TEST-unknown'}).getByText('未评估',{exact:true}).waitFor({timeout:10000}).catch(async error=>{throw new Error(`${error.message}\n${errors.join('\n')}\n${(await page.locator('body').innerText()).slice(0,2000)}`);});
    assert.equal(await page.locator('tbody tr').filter({hasText:'TEST-zero'}).getByText('未评估',{exact:true}).count(),0);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`List overflow ${width}`);
      await page.screenshot({path:`artifacts/material-review/list-truth-${width}.png`,fullPage:true});
    }
    await mountForm(bundle('supplier-picker'));
    await page.getByText('共 120 条 · 第 1 / 3 页',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('关联供应商').inputValue(),supplierRows[75].id,'Off-page selected supplier remains selected');
    assert.equal(await page.getByLabel('关联供应商').locator('option').count(),52,'50 results + off-page selection + empty option');
    await page.getByRole('button',{name:'下一页供应商'}).click();
    await page.getByText('共 120 条 · 第 2 / 3 页',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('关联供应商').locator('option').count(),51,'Selected row must not be duplicated');
    const beforeSearch=supplierRequests.length;
    await page.getByLabel('供应商检索').fill('SUP-');
    await page.getByLabel('供应商检索').fill('SUP-119');
    await page.getByText('共 1 条 · 第 1 / 1 页',{exact:true}).waitFor();
    assert.equal(supplierRequests.length-beforeSearch,1,'Rapid search updates coalesce');
    await page.getByLabel('关联供应商').selectOption(supplierRows[119].id);
    await page.getByText('共 1 条 · 第 1 / 1 页',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('关联供应商').inputValue(),supplierRows[119].id);
    supplierMode='fail';await page.getByLabel('供应商检索').fill('unavailable');
    await page.getByRole('alert').filter({hasText:'供应商读取失败'}).waitFor();
    assert.equal(await page.getByLabel('关联供应商').isDisabled(),true);
    supplierMode='success';await page.getByRole('button',{name:'重试供应商查询'}).click();
    await page.getByText('共 0 条 · 第 1 / 1 页',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('关联供应商').inputValue(),supplierRows[119].id,'Failed or empty searches do not erase selection');
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:`artifacts/material-review/supplier-picker-${width}.png`,fullPage:true});
    }
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS: interactive material review/create/edit/list and paged supplier picker, failed reads/writes, response validation, versions, duplicate mutations, partial batch, CSV, unknown vs zero, debounce and retained selection, 1440/390 screenshots. Synthetic APIs only; live auth/database NOT tested.');
  } finally {await browser.close();}
}

module.exports={run};
if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
