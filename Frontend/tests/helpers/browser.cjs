const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const frontend = path.resolve(__dirname, '../..');
const backendRequire = createRequire(path.resolve(frontend, '../Backend/package.json'));
const { withAuditFixture } = backendRequire('./tests/helpers/auditFixture.cjs');

exports.withBrowserFixture = async (source, callback) => withAuditFixture(async h => {
  const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const { createServer } = await import(path.join(frontend, 'node_modules/vite/dist/node/index.js'));
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inop-browser-cache-'));
  let vite, browser;
  try {
    vite = await createServer({ root: frontend, configLoader: 'runner', cacheDir, logLevel: 'error', define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
      server: { host: '127.0.0.1', port: 0, strictPort: true },
      plugins: [{ name: 'isolated-browser-test', enforce: 'pre', resolveId(id) { if (id === '/__inop_test.js') return '\0inop-test.js'; }, load(id) {
        if (id === '\0inop-test.js') return source;
        const baseline = process.env.INOP_BROWSER_BASELINE;
        if (baseline && /^[a-f0-9]{40}$/.test(baseline) && id.startsWith(frontend + '/src/')) {
          const result = spawnSync('git', ['show', `${baseline}:Frontend/${path.relative(frontend, id)}`], { cwd: frontend, encoding: 'utf8' });
          if (result.status === 0) return result.stdout;
        }
      } }],
    });
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage(); const pageErrors = [], failures = [], wire = [];
    page.setDefaultTimeout(process.env.INOP_BROWSER_BASELINE ? 3000 : 10000);
    page.on('requestfailed', request => failures.push(request.url() + ': ' + request.failure()?.errorText));
    page.on('console', msg => { if (msg.type() === 'error') failures.push(msg.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    let initial = { user: null, token: '' };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
      if (url.pathname.startsWith('/api/')) {
        const actor = Object.keys(h.tokens).find(name => route.request().headers().authorization === `Bearer ${h.tokens[name]}`) || 'anonymous';
        wire.push({ actor, method: route.request().method(), path: url.pathname });
        const contentType = route.request().headers()['content-type'] || '';
        if (contentType.startsWith('multipart/form-data')) {
          const response = await fetch(h.apiBase + url.pathname.slice(4) + url.search, {
            method: route.request().method(), headers: { 'Content-Type': contentType, ...(h.tokens[actor] ? { Authorization: 'Bearer ' + h.tokens[actor] } : {}) },
            body: route.request().postDataBuffer(), signal: AbortSignal.timeout(10000),
          });
          return route.fulfill({ status: response.status, contentType: response.headers.get('content-type'), body: Buffer.from(await response.arrayBuffer()) });
        }
        const body = route.request().postDataJSON();
        const result = await h.request(actor, route.request().method(), url.pathname.slice(4) + url.search, body === null ? undefined : body);
        return route.fulfill({ status: result.status, contentType: result.headers['content-type'], body: result.buffer });
      }
      if (route.request().isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: await vite.transformIndexHtml(url.pathname, `<html><body><div id="root"></div><script>const fixture=${JSON.stringify(initial).replaceAll('<', '\\u003c')};window.testUser=fixture.user;localStorage.setItem('inop_auth_token',fixture.token);</script><script type="module" src="/__inop_test.js"></script></body></html>`) });
      return route.continue();
    });
    const profile = async actor => {
      const user = await h.models.User.findById(h.actors[actor]._id).lean();
      const role = await h.models.Role.findOne({ key: user.role }).lean();
      return { id: String(user._id), name: user.name, email: user.email, role: user.role, departmentId: user.departmentId, isActive: true, permissions: role.permissions };
    };
    async function open(actor, route) {
      initial = { user: await profile(actor), token: h.tokens[actor] };
      await page.goto(origin + route);
      try { await page.waitForFunction(() => typeof window.navigateTest === 'function', null, { timeout: 10000 }); }
      catch (error) { throw Error(error.message + '\n' + JSON.stringify({ pageErrors, failures })); }
    }
    await callback({ ...h, page, pageErrors, wire, origin, profile, open });
  } finally {
    if (browser) await browser.close();
    if (vite) await vite.close();
    // Vite's unique scratch directory stays in /tmp; existing caches are preserved.
  }
});
