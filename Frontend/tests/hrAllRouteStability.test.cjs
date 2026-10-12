const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs/promises'), path = require('node:path');
const { withProductionHRFixture } = require('./helpers/productionHRFixture.cjs');
test('Real production auth + every HR list/board stays stable while idle and after focus', async t => withProductionHRFixture(async h => {
  const measurements = [];
  const expected = Number(process.env.INOP_EXPECT_LIST_FOCUS || 0);
  const dir = process.env.INOP_HR_SCREENSHOTS;
  if (!dir || !path.isAbsolute(dir)) throw Error('Explicit owned screenshot output required');
  await fs.mkdir(dir, { recursive: true });
  for (const [route, selector] of [
    ['jobs', '.admin-table-container'], ['candidates', '.hr-candidates-page'],
    ['applications', '.admin-table-container'], ['applications?view=board', '.hr-application-board'],
    ['analytics', '[data-hr-kpi=applications] strong'],
  ]) await t.test(route, async () => {
    const first=h.wire.length;await h.open('admin', '/app/recruitment/' + route);
    await h.page.locator(selector).first().waitFor();
    await h.page.waitForLoadState('networkidle');
    const readyMs=await h.page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()});const initial=h.wire.slice(first);const start = h.wire.length;
    await h.page.evaluate(() => { window.loadingTrace = []; });
    await h.page.waitForTimeout(1000);
    assert.equal(h.wire.length, start, 'No idle polling or render loop');
    for (let i = 0; i < 3; i++) {
      await h.page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('online')); });
      await h.page.waitForTimeout(400); await h.page.waitForLoadState('networkidle');
    }
    const extra = h.wire.slice(start), dataReads = extra.filter(r => r.path !== '/api/auth/me');
    measurements.push({ route, readyMs, initial, dataReads: dataReads.length, sessionReads: extra.filter(r => r.path === '/api/auth/me').length, loadingMutations: await h.page.evaluate(() => window.loadingTrace.length), requests: extra });
    await h.page.screenshot({ path: path.join(dir, route.replace('?view=', '-') + '.png'), fullPage: true });
    assert.equal(dataReads.length, route === 'analytics' ? 0 : expected, JSON.stringify(measurements.at(-1)));
    assert.equal(extra.filter(r => r.path === '/api/auth/me').length, 3);
    if (!expected) assert.equal(await h.page.evaluate(() => window.loadingTrace.length), 0);
  });
  await fs.writeFile(path.join(dir, 'requests.json'), JSON.stringify(measurements, null, 2));
  if (!expected) await t.test('Held manual page refresh retains content; current server department loss clears it', async () => {
    await h.open('admin', '/app/recruitment/jobs');
    await h.page.locator('.admin-table-container').waitFor();
    await h.page.waitForLoadState('networkidle');
    let release, entered;
    const gate = new Promise(r => release = r), started = new Promise(r => entered = r);
    const pattern = '**/api/hr/v2/jobs?*';
    await h.page.route(pattern, async route => { entered(); await gate; await route.fallback(); });
    try {
      await h.page.getByRole('button', { name: 'Yenilə', exact: true }).click();
      await started;
      assert.equal(await h.page.locator('.admin-table-container').isVisible(), true);
      assert.equal(await h.page.locator('[data-hr-state=loading]').count(), 0);
      assert.equal(await h.page.getByRole('button', { name: 'Yenilə', exact: true }).getAttribute('aria-busy'), 'true');
      release(); await h.page.waitForLoadState('networkidle');
    } finally { release(); await h.page.unroute(pattern); }
    await h.models.User.updateOne({ _id: h.actors.admin._id }, { role: 'test_none', departmentId: 'dep_audit' });
    await h.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await h.page.locator('[data-hr-state=forbidden]').first().waitFor();
    assert.equal(await h.page.locator('.admin-table-container').count(), 0);
  });
  assert.deepEqual(h.pageErrors, []);
}));
