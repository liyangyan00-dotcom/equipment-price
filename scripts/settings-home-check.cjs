// Isolated component verification. This is not an authenticated integration test.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { chromium } = require('playwright');
const root = process.cwd();
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} }; cache.set(file, loadedModule);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  function localRequire(name) {
    if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name);
      const resolved = ['', '.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      return load(resolved);
    }
    return require(name);
  }
  new Function('require', 'module', 'exports', code)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
(async () => {
  const { SettingsHome, settingsGroups } = load('src/components/settings/SettingsHome.tsx');
  const { accessFailure } = load('src/lib/auth/accessFailure.ts');
  assert.equal(settingsGroups.length, 5);
  const routes = settingsGroups.flatMap(group => group.links.map(link => link.href));
  assert.equal(new Set(routes).size, routes.length);
  routes.forEach(route => assert.ok(fs.existsSync(path.join(root, 'src/app', route, 'page.tsx')), route));
  assert.equal(accessFailure({ message: 'exceed_egress_quota' }).code, 'restricted');
  assert.equal(accessFailure({ message: 'connection failed' }).code, 'unavailable');
  const props = { organization: { name: '验收样本工作组', code: 'TEST-ONLY' }, role: 'admin', error: '', checkedAt: '2026/09/05 12:00:00' };
  const markup = renderToStaticMarkup(React.createElement(SettingsHome, props));
  assert.ok(!/mock|7\.18|1,254|保存设置|密钥已重置/.test(markup));
  const failed = renderToStaticMarkup(React.createElement(SettingsHome, { ...props, organization: null, role: '', error: '工作组读取失败' }));
  assert.ok(failed.includes('role="alert"'));
  assert.ok(!failed.includes('工作组读取成功'));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:3100/login', { waitUntil: 'networkidle' });
    const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.outerHTML).join(''));
    for (const width of [1440, 2386, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      const sidebar = width >= 1024 ? 256 : 0;
      await page.setContent(`<!doctype html><html><head>${styles}</head><body style="margin:0;background:#f4f7fb"><main style="margin-left:${sidebar}px;padding:24px;min-width:0">${markup}</main></body></html>`);
      await page.waitForTimeout(600);
      assert.equal(await page.locator('nav[aria-label="设置分类"] a').count(), 9);
      assert.equal(await page.locator('input,form').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
      await page.screenshot({ path: `tmp/settings-home-${width}.png`, fullPage: true });
    }
    console.log('PASS: routes, failure states, no mock controls; isolated screenshots at 1440/2386/390. Not a live-account save test.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
