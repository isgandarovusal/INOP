const fs = require('node:fs/promises'), path = require('node:path'), http = require('node:http');
const { productionHRBuild } = require('./productionBrowser.cjs');
const { withAuditFixture } = require('../../../Backend/tests/helpers/auditFixture.cjs');
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const harness = "import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));";

exports.withProductionHRFixture = async callback => {
  const build = await productionHRBuild(process.env.INOP_BROWSER_BASELINE || 'working', harness);
  return withAuditFixture(async h => {
    let server, browser;
    const wire = [], pageErrors = [], pending = new Set();
    try {
      server = http.createServer(async (req, res) => {
        try {
          const name = new URL(req.url, 'http://127.0.0.1').pathname;
          const target = path.resolve(build.dist, name.startsWith('/assets/') ? decodeURIComponent(name).slice(1) : 'index.html');
          if (!target.startsWith(build.dist + path.sep)) { res.writeHead(400); return res.end(); }
          const body = await fs.readFile(target);
          res.setHeader('Content-Type', target.endsWith('.js') ? 'text/javascript' : target.endsWith('.css') ? 'text/css' : target.endsWith('.webp') ? 'image/webp' : 'text/html');
          res.end(body);
        } catch { res.writeHead(404); res.end(); }
      });
      await new Promise(r => server.listen(0, '127.0.0.1', r));
      browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage({ viewport: { width: 1910, height: 900 } });
      const origin = 'http://127.0.0.1:' + server.address().port;
      let token = '';
      await page.addInitScript(() => {
        window.loadingTrace = [];
        new MutationObserver(() => {
          if (document.querySelector('[data-hr-state=loading]')) window.loadingTrace.push(performance.now());
        }).observe(document, { subtree: true, childList: true, attributes: true });
      });
      page.on('pageerror', e => pageErrors.push(e.message));
      await page.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.hostname !== '127.0.0.1') return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        const actor = Object.keys(h.tokens).find(n => req.headers().authorization === 'Bearer ' + h.tokens[n]) || 'anonymous';
        const record = { actor, method: req.method(), path: url.pathname, query: url.search, start: performance.now() };
        wire.push(record);
        const request = h.request(actor, req.method(), url.pathname.slice(4) + url.search, req.postDataJSON() ?? undefined, { timeoutMs: 20000 });
        pending.add(request);
        try { const r = await request; Object.assign(record, { ms: performance.now() - record.start, status: r.status, bytes: r.buffer.length }); await route.fulfill({ status: r.status, contentType: r.headers['content-type'], body: r.buffer }); }
        finally { pending.delete(request); }
      });
      async function open(actor, route) {
        token = h.tokens[actor] || '';
        await page.goto(origin + '/login');
        await page.evaluate(value => value ? localStorage.setItem('inop_auth_token', value) : localStorage.removeItem('inop_auth_token'), token);
        await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
      }
      await callback({ ...h, page, open, wire, pageErrors, origin, build });
    } finally {
      if (browser) await browser.close();
      await Promise.allSettled(pending);
      if (server) await new Promise(r => server.close(r));
    }
  }, { canonicalHR: true });
};
