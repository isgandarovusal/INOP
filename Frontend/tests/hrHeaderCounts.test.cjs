const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { withBrowserFixture } = require('./helpers/browser.cjs');

test('HR list headers distinguish unresolved counts, failed reads and verified zero totals', async t => {
  const source = await fs.readFile(path.join(__dirname, 'hrNavigationPerformance.test.cjs'), 'utf8');
  const harness = source.match(/const harness=`([\s\S]*?)`;/)[1];
  await withBrowserFixture(harness, async h => {
    for (const [name, url, endpoint] of [
      ['Jobs', '/app/recruitment/jobs', '/hr/v2/jobs'],
      ['Applications', '/app/recruitment/applications', '/hr/v2/applications'],
      ['Kanban', '/app/recruitment/applications?view=board', '/hr/v2/application-board'],
    ]) await t.test(name + ' held response, true zero, failure and retry', async () => {
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      const pattern = '**/api' + endpoint + '?*';
      let fail = false;
      await h.page.route(pattern, async route => {
        await gate;
        if (fail) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic unavailable response' }) });
        const url = new URL(route.request().url());
        const response = await h.request('admin', 'GET', url.pathname.slice(4) + url.search);
        await route.fulfill({ status: response.status, contentType: 'application/json', body: response.buffer });
      });
      try {
        await h.open('admin', url);
        await h.page.locator('.page-header__title').waitFor();
        await h.page.locator('[data-hr-state=loading]').first().waitFor();
        assert.equal(await h.page.locator('.page-header__subtitle').count(), 0, 'An unresolved total must not be displayed as zero');
        release();
        await h.page.locator('.page-header__subtitle').waitFor();
        assert.equal(await h.page.locator('.page-header__subtitle').innerText(), '0 ümumi · 0 göstərilir');
        fail = true;
        await h.page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await h.page.locator('[data-hr-state=server-error]').waitFor();
        assert.equal(await h.page.locator('.page-header__subtitle').count(), 0, 'A failed read must not imply zero records');
        fail = false;
        await h.page.getByRole('button', { name: 'Yenidən cəhd et', exact: true }).click();
        await h.page.locator('.page-header__subtitle').waitFor();
        assert.equal(await h.page.locator('.page-header__subtitle').innerText(), '0 ümumi · 0 göstərilir');
      } finally {
        release();
        await h.page.unroute(pattern);
      }
    });
    assert.deepEqual(h.pageErrors, []);
  });
});
