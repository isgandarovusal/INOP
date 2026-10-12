const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { withBrowserFixture } = require('./helpers/browser.cjs');

test('Transparent INOP vector uses the same lightweight identity on navy and white', async t => {
  const loginSource = await fs.readFile(path.join(__dirname, 'hrUnifiedBrand.test.cjs'), 'utf8');
  const navigationSource = await fs.readFile(path.join(__dirname, 'hrNavigationPerformance.test.cjs'), 'utf8');
  await fs.mkdir('/workspace/inop-hr20-visual', { recursive: true });
  const inspect = async (page, expectedColor) => {
    const logo = page.getByRole('img', { name: 'INOP — Internal Operations Platform', exact: true });
    await logo.waitFor();
    const measured = await logo.evaluate(e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return { tag: e.tagName.toLowerCase(), color: s.color, background: s.backgroundColor,
        ratio: r.width / r.height, bytes: new TextEncoder().encode(e.outerHTML).length };
    });
    assert.equal(measured.tag, 'svg');
    assert.equal(measured.color, expectedColor);
    assert.equal(measured.background, 'rgba(0, 0, 0, 0)');
    assert.ok(Math.abs(measured.ratio - 2.5) < 0.002, 'Browser subpixel rounding preserves the 2.5 aspect ratio');
    assert.equal(await logo.getAttribute('viewBox'), '0 0 320 128');
    assert.ok(measured.bytes < 4096);
    assert.equal(await logo.locator('image,rect,foreignObject,script').count(), 0);
    assert.equal(await logo.getAttribute('src'), null);
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /inop.*\.webp/.test(r.name)).length), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    return logo;
  };
  await withBrowserFixture(loginSource.match(/const loginHarness=`([\s\S]*?)`;/)[1], async h => {
    for (const width of [320, 768, 1440]) await t.test('Navy login ' + width, async () => {
      await h.page.setViewportSize({ width, height: 900 });
      await h.open('admin', '/login');
      await inspect(h.page, 'rgb(228, 234, 243)');
      await h.page.screenshot({ path: '/workspace/inop-hr20-visual/vector-login-' + width + '.png', fullPage: true });
    });
    assert.deepEqual(h.pageErrors, []);
  });
  await withBrowserFixture(navigationSource.match(/const harness=`([\s\S]*?)`;/)[1], async h => {
    await t.test('White desktop sidebar has no bitmap rectangle or overflow', async () => {
      await h.page.setViewportSize({ width: 1440, height: 900 });
      await h.open('admin', '/app/recruitment/jobs');
      await h.page.locator('.admin-table-container').waitFor();
      const logo = await inspect(h.page, 'rgb(37, 59, 97)');
      assert.ok((await logo.boundingBox()).width <= 144.1);
      assert.equal(await h.page.locator('aside').evaluate(e => e.scrollWidth > e.clientWidth), false);
      await h.page.screenshot({ path: '/workspace/inop-hr20-visual/vector-sidebar.png', fullPage: true });
    });
    assert.deepEqual(h.pageErrors, []);
  });
});
