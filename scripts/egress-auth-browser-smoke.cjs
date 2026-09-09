const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3100/ai-workbench', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login?**');
    const checks = [];
    for (const url of ['/api/ai/tasks?view=summary', '/api/ai/operations', '/api/topbar', '/api/quote-recognition?view=progress&id=00000000-0000-0000-0000-000000000000', '/api/settings/logs?id=1']) {
      const response = await context.request.get(`http://127.0.0.1:3100${url}`);
      assert.equal(response.status(), 401, url);
      assert.match(response.headers()['cache-control'] || '', /no-store/);
      checks.push({ path: url.split('?')[0], status: response.status() });
    }
    const output = path.resolve('artifacts/egress-p1');
    await fs.mkdir(output, { recursive: true });
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(output, `auth-${viewport.width}.png`) });
    }
    console.log(JSON.stringify({ checks, authenticatedBusinessFlows: 'not tested: no browser session supplied' }));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
