const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.SETTINGS_TEST_URL || 'http://127.0.0.1:3100';
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.goto(`${base}/login`);
    await page.getByPlaceholder('邮箱', { exact: true }).fill(process.env.SETTINGS_TEST_EMAIL);
    await page.getByPlaceholder('密码（至少 8 位）', { exact: true }).fill(process.env.SETTINGS_TEST_PASSWORD);
    await page.getByRole('button', { name: '安全登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    for (const path of ['/settings/users', '/settings/roles', '/settings/roles/editor']) {
      await page.goto(base + path);
      await page.getByRole('heading', { name: '当前账号无管理权限', exact: true }).waitFor();
      assert.equal(await page.getByText('组织成员', { exact: true }).count(), 0);
      assert.equal(await page.getByText('系统角色', { exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: '邀请成员' }).count(), 0);
      assert.equal(await page.getByRole('button', { name: '重新加载' }).count(), 0);
      assert.equal(await page.getByRole('link', { name: '返回首页', exact: true }).count(), 1);
      console.log(`PASS editor denied: ${path}`);
    }
    for (const endpoint of ['users', 'roles']) {
      const response = await page.request.get(`${base}/api/settings/${endpoint}`);
      assert.equal(response.status(), 403);
    }
    await page.goto(`${base}/settings`);
    assert.equal(await page.locator('a[href="/settings/users"],a[href="/settings/roles"]').count(), 0);
    assert.equal(await page.getByRole('link', { name: '基础数据字典', exact: false }).count(), 1);
    console.log('PASS editor settings navigation and backend 403');
    if (process.env.SETTINGS_TEST_PRODUCTION) return;
    for (const endpoint of ['users', 'roles']) {
      const pattern = `**/api/settings/${endpoint}`;
      let status = 503;
      const roles = ['admin','manager','reviewer','editor','viewer'].map(role => ({ role, memberCount: 0, defaultPermissions: [], permissions: [], customized: false, overrideCount: 0 }));
      const success = endpoint === 'users' ? { data: [], organization: { name: '测试工作组' }, currentRole: 'admin', currentUserId: 'test', roles: roles.map(r => r.role) } : { organization: { name: '测试工作组' }, currentRole: 'admin', roles, permissions: [], protectedPermissions: [], audits: [] };
      await page.route(pattern, route => route.fulfill({ status, json: status === 200 ? success : { error: '测试服务暂不可用' } }));
      await page.goto(`${base}/settings/${endpoint}`);
      await page.getByRole('heading', { name: '暂时无法读取管理数据' }).waitFor();
      assert.equal(await page.getByRole('heading', { name: '当前账号无管理权限' }).count(), 0);
      assert.equal(await page.getByText(endpoint === 'users' ? '组织成员' : '系统角色', { exact: true }).count(), 0);
      status = 200;
      await page.getByRole('button', { name: '重新加载' }).click();
      await page.getByText(endpoint === 'users' ? '组织成员' : '系统角色', { exact: true }).waitFor();
      if (endpoint === 'users') assert.equal(await page.getByRole('button', { name: '邀请成员' }).count(), 1);
      status = 403;
      await page.getByRole('button', { name: endpoint === 'users' ? '刷新成员' : '刷新权限', exact: true }).click();
      await page.getByRole('heading', { name: '当前账号无管理权限' }).waitFor();
      assert.equal(await page.getByText(endpoint === 'users' ? '组织成员' : '系统角色', { exact: true }).count(), 0);
      await page.unroute(pattern);
      console.log(`PASS retry, admin rendering, revoked access: ${endpoint}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/settings/users`);
    await page.getByRole('heading', { name: '当前账号无管理权限' }).waitFor();
    assert.equal(await page.locator('main').evaluate(e => e.scrollWidth > e.clientWidth), false);
    await page.screenshot({ path: 'tmp/settings-access-mobile.png', fullPage: true });
    console.log('PASS mobile settings content (global topbar overflow is outside this check)');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
