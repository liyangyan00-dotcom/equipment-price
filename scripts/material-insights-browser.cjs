// Isolated component rendering with synthetic fixtures; not a live-account acceptance.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = { exports: {} };
  cache.set(file, loaded);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  function localRequire(name) {
    if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(process.cwd(),'src',name.slice(2)) : path.resolve(path.dirname(file), name);
      const resolved = ['', '.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      assert.ok(resolved, name);
      return load(resolved);
    }
    return require(name);
  }
  new Function('require','module','exports',code)(localRequire,loaded,loaded.exports);
  return loaded.exports;
}
(async () => {
  const { MaterialPriceInsights, MaterialCollectionSuggestions } = load('src/components/material-workflow/MaterialPriceInsights.tsx');
  const sample = { id:'fixture',materialName:'测试钢筋',specification:'12mm',unit:'根',currency:'CDF',region:'测试地区',source:'测试月报',supplierName:'测试供应商',transportCondition:'自提',taxIncluded:false,originalPrice:100,quoteDate:'2026-01-01',reviewStatus:'confirmed',riskLevel:'low' };
  const records=[sample,{...sample,id:'fixture2',quoteDate:'2026-02-01',originalPrice:110},{...sample,id:'fixture3',materialName:'测试长名称'.repeat(12),quoteDate:'',riskLevel:'high'}, {...sample,id:'close-date',quoteDate:'2026-01-02',originalPrice:105}, {...sample,id:'future',quoteDate:'9999-01-01',originalPrice:99999}];
  const browser = await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:3100/login',{waitUntil:'domcontentloaded'});
    const styles=await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(node=>node.outerHTML).join(''));
    assert.ok(styles, 'App stylesheet must load');
    fs.mkdirSync('artifacts/material-insights',{recursive:true});
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      const markup=renderToStaticMarkup(React.createElement(React.Fragment,null,
        React.createElement(MaterialPriceInsights,{records,activeRecord:sample}),
        React.createElement('div',{className:'mt-3 max-w-sm'},React.createElement(MaterialCollectionSuggestions,{records}))));
      await page.setContent(`<!doctype html><html><head>${styles}</head><body class="bg-page"><main style="padding:24px">${markup}</main></body></html>`);
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${width}`);
      assert.ok((await page.textContent('body')).includes('+10.0%'));
      assert.equal(await page.locator('svg[role="img"] polyline').count(),1);
      const points=(await page.locator('svg[role="img"] polyline').getAttribute('points')).split(' ').map(point=>point.split(',').map(Number));
      assert.equal(points.length,3,'Future quote must not be plotted');
      assert.ok(points.flat().every(Number.isFinite));
      assert.ok(Math.abs(points[1][0] - (20+260/31))<0.001,'X axis must use elapsed days, not record index');
      assert.equal(points[0][0],20);
      assert.equal(points[2][0],280);
      assert.match(await page.textContent('body'),/未来报价日期待复核/);
      for (const href of await page.locator('a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')))) assert.ok(href.startsWith('/'),href);
      await page.screenshot({path:`artifacts/material-insights/filled-${width}.png`,fullPage:true});
      const empty=renderToStaticMarkup(React.createElement(MaterialPriceInsights,{records:[]}));
      await page.setContent(`<!doctype html><html><head>${styles}</head><body><main style="padding:24px">${empty}</main></body></html>`);
      assert.equal(await page.locator('svg[role="img"]').count(),0);
      assert.match(await page.textContent('body'),/暂不判断涨跌/);
      await page.screenshot({path:`artifacts/material-insights/empty-${width}.png`,fullPage:true});
    }
    console.log('PASS: isolated filled/empty, 1440/390, no page overflow; live-account flow NOT tested.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
