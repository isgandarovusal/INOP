// Synthetic production-build comparison; no hosting, secrets or real CVs.
const fs = require('node:fs/promises'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { productionHRBuild } = require('../tests/helpers/productionBrowser.cjs');
const { withAuditFixture } = require('../../Backend/tests/helpers/auditFixture.cjs');
const { hrSyntheticDataset } = require('../../Backend/tests/helpers/hrSyntheticDataset.cjs');
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = process.argv[2] || `/tmp/inop-hr-ui-${Date.now()}.json`;
if (!/^\/tmp\/[a-zA-Z0-9_-]+\.json$/.test(output)) throw Error('Use a new owned /tmp JSON report.');
const currentOnly = process.argv[3] === '--current-only';
if (process.argv[3] && !currentOnly) throw Error('Supported option: --current-only.');
const report = { hosted: false, node: process.version, mode: 'production', baseline: '2e44f1321dad611c42677b88b2bade1f5b3fff8b', current: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' }).trim(), scope: 'isolated Applications page + actual local API, same current backend for both frontend versions; no Native hosting limiter or external network', renderMetric: 'navigation to expected DOM and two animation frames; main data response-end to that paint includes normalization, React commit and scheduling, not isolated React render CPU', memoryMetric: 'CDP browser JSHeapUsedSize and DOM counts after ready, not process RSS/peak', samples: [] };
(async () => {
  await fs.writeFile(output, '', { flag: 'wx' });
  const builds = [];
  report.baselineSkipped = currentOnly;
  for (const sha of currentOnly ? [report.current] : [report.baseline, report.current]) builds.push(await productionHRBuild(sha));
  for (const count of [0, 5000, 50000]) await withAuditFixture(async h => {
    await hrSyntheticDataset(h, count);
    const user = await h.models.User.findById(h.actors.admin._id).lean(), role = await h.models.Role.findOne({ key: user.role }).lean();
    const profile = { id: String(user._id), name: user.name, email: user.email, role: user.role, departmentId: user.departmentId, isActive: true, permissions: role.permissions };
    for (const build of builds) for (const view of ['table', 'board']) {
      let browser, server; const inflight = new Set(); const entry = { count, sha: build.sha, view, api: [], errors: [], outcome: 'PENDING' }; report.samples.push(entry);
      const current = build.sha === report.current, expected = current ? Math.min(count, view === 'board' ? 80 : 30) : count;
      try {
        server = http.createServer(async (req, res) => {
          try {
            const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
            const relative = pathname.startsWith('/assets/') ? decodeURIComponent(pathname).slice(1) : 'index.html';
            const target = path.resolve(build.dist, relative);
            if (!target.startsWith(build.dist + path.sep)) { res.writeHead(404); return res.end(); }
            const body = await fs.readFile(target); res.setHeader('Content-Type', target.endsWith('.js') ? 'text/javascript' : target.endsWith('.css') ? 'text/css' : target.endsWith('.html') ? 'text/html' : 'application/octet-stream'); res.end(body);
          } catch { res.writeHead(404); res.end(); }
        });
        await new Promise(r => server.listen(0, '127.0.0.1', r));
        browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        page.on('pageerror', e => entry.errors.push(e.message.slice(0, 160)));
        await page.addInitScript(({ profile, token }) => {
          window.testUser = profile; localStorage.setItem('inop_auth_token', token);
          window.benchmarkLongTasks = [];
          new PerformanceObserver(list => { for (const task of list.getEntries()) window.benchmarkLongTasks.push({ start: task.startTime, duration: task.duration }); }).observe({ type: 'longtask', buffered: true });
        }, { profile, token: h.tokens.admin });
        let mainReceived; const received = new Promise(r => mainReceived = r);
        await page.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (url.hostname !== '127.0.0.1') return route.abort();
          if (!url.pathname.startsWith('/api/')) return route.continue();
          if (route.request().method() !== 'GET' || route.request().headers().authorization !== `Bearer ${h.tokens.admin}`) {
            entry.errors.push('Benchmark requires a read-only authenticated request.'); mainReceived(); return route.abort();
          }
          const started = performance.now(), pending = h.request('admin', 'GET', url.pathname.slice(4) + url.search, undefined, { timeoutMs: 60000 }); inflight.add(pending);
          try {
            const r = await pending;
            entry.api.push({ path: url.pathname, status: r.status, bytes: r.buffer.length, elapsedMs: performance.now() - started });
            await route.fulfill({ status: r.status, contentType: 'application/json', body: r.buffer });
            if (url.pathname === (current ? view === 'board' ? '/api/hr/v2/application-board' : '/api/hr/v2/applications' : '/api/applications')) mainReceived();
          } catch (e) { entry.errors.push('API ' + url.pathname + ': ' + e.name); await route.abort().catch(() => {}); mainReceived(); }
          finally { inflight.delete(pending); }
        });
        const started = performance.now();
        await page.goto(`http://127.0.0.1:${server.address().port}/app/recruitment/applications?view=${view}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await Promise.race([received, new Promise((_, reject) => { const timer = setTimeout(() => reject(Error('Main data timeout')), 30000); timer.unref(); })]);
        await page.waitForFunction(({ view, expected }) => {
          const rows = view === 'board' ? document.querySelectorAll('[data-application-card]') : document.querySelectorAll('tbody tr:has(td.cell-title)');
          return rows.length === expected && (expected > 0 || (view === 'board' ? !!document.querySelector('[data-application-kanban]') : !!document.querySelector('.empty-state') && !document.querySelector('.spin')));
        }, { view, expected }, { timeout: 30000 });
        entry.paint = await page.evaluate(async ({ view, expected }) => {
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const at = performance.now(), main = performance.getEntriesByType('resource').filter(e => /\/api\/(applications|hr\/v2\/(applications|application-board))(\?|$)/.test(e.name)).at(-1);
          return { navigationToPaintMs: at, mainResponseToPaintMs: main ? at - main.responseEnd : null, rows: view === 'board' ? document.querySelectorAll('[data-application-card]').length : document.querySelectorAll('tbody tr:has(td.cell-title)').length, expected };
        }, { view, expected });
        entry.readyElapsedMs = performance.now() - started;
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
        const metrics = await cdp.send('Performance.getMetrics'), dom = await cdp.send('Memory.getDOMCounters');
        entry.memory = { jsHeapUsedBytes: metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value, documents: dom.documents, nodes: dom.nodes, listeners: dom.jsEventListeners };
        entry.longTasks = await page.evaluate(() => window.benchmarkLongTasks); entry.apiCount = entry.api.length; entry.jsonBytes = entry.api.reduce((n,r) => n+r.bytes,0);
        assert.equal(entry.paint.rows, expected); assert.ok(entry.api.every(r => r.status === 200)); assert.deepEqual(entry.errors, []);
        entry.outcome = 'PASS'; console.log(JSON.stringify({ count, current, view, outcome: entry.outcome, paint: entry.paint, apiCount: entry.apiCount, jsonBytes: entry.jsonBytes, memory: entry.memory, maxLongTaskMs: Math.max(0,...entry.longTasks.map(t=>t.duration)) }));
        await Promise.allSettled(inflight);
      } catch (e) { entry.outcome = 'FAILED_OR_TIMEOUT'; entry.failure = e.message.split('\n')[0]; console.log(JSON.stringify({ count, current, view, outcome: entry.outcome, failure: entry.failure })); }
      finally { if (browser) await browser.close(); await Promise.allSettled(inflight); if (server) await new Promise(r => server.close(r)); await fs.writeFile(output, JSON.stringify(report, null, 2)); }
    }
  });
  report.completed = true; // Every owned fixture has awaited server/DB cleanup.
  report.currentPassed = report.samples.filter(s => s.sha === report.current && s.outcome === 'PASS').length;
  const failed = report.samples.some(s => s.sha === report.current && s.outcome !== 'PASS');
  await fs.writeFile(output, JSON.stringify(report, null, 2));
  console.log('Completed production-build measurements and owned fixture cleanup.');
  // A crashed baseline browser can retain tooling IPC handles. This CLI exits
  // only after all browser/request/server/DB cleanup and report writes finish.
  process.exit(failed ? 1 : 0);
})().catch(async e => { report.failed = e.message; console.error(e.message); await fs.writeFile(output, JSON.stringify(report,null,2)); process.exit(1); });
