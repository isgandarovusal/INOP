// Read-only measurements against newly owned synthetic loopback DBs. Never loads .env.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { monitorEventLoopDelay } = require('node:perf_hooks');
const { withAuditFixture } = require('../tests/helpers/auditFixture.cjs');
const { hrSyntheticDataset } = require('../tests/helpers/hrSyntheticDataset.cjs');
const Application = require('../models/application.model'), Candidate = require('../models/candidate.model');
const output = process.argv[2] || `/tmp/inop-hr08d-backend-${Date.now()}.json`;
if (!/^\/tmp\/[a-zA-Z0-9_-]+\.json$/.test(output) || fs.existsSync(output)) throw Error('Use a new owned /tmp JSON report path.');
const report = { node: process.version, hosted: false, scope: 'isolated loopback route + Mongo; no Native hosting limiter/proxy', memory: 'same Node process contains API and measurement client; deltas are not peak or isolated server RSS', samples: [] };
const snapshot = () => { const { rss, heapUsed } = process.memoryUsage(); return { rss, heapUsed }; };
const methods = counters => [...counters].sort(([a], [b]) => a.localeCompare(b)).map(([query, count]) => ({ query, count }));
(async () => {
  for (const count of [0, 5000, 50000]) await withAuditFixture(async h => {
    const dataset = await hrSyntheticDataset(h, count), sample = { count, preparationMs: dataset.preparationMs, endpoints: [], scopes: [], plans: {} }; report.samples.push(sample);
    console.log(`Prepared ${count} owned synthetic records.`);
    async function measure(endpoint, actor = 'admin', bound) {
      global.gc?.(); const before = snapshot(), calls = new Map(), delay = monitorEventLoopDelay({ resolution: 10 }); delay.enable();
      h.mongoose.set('debug', (collection, method) => { const key = collection + '.' + method; calls.set(key, (calls.get(key) || 0) + 1); });
      const started = performance.now(); let r;
      try { r = await h.request(actor, 'GET', endpoint, undefined, { timeoutMs: 60000 }); } finally { h.mongoose.set('debug', false); delay.disable(); }
      const after = snapshot(), entry = { endpoint: endpoint.split('?')[0], actor, status: r.status, elapsedMs: performance.now() - started, bytes: r.buffer.length, serverTiming: r.headers['server-timing'], rssDelta: after.rss - before.rss, heapDelta: after.heapUsed - before.heapUsed, eventLoopMaxMs: delay.max / 1e6, queries: methods(calls) };
      if (r.status !== 200) { entry.code = r.data?.code || null; sample.endpoints.push(entry); throw Error(`Synthetic ${count} ${entry.endpoint} returned ${r.status}`); }
      if (bound === 'page') { assert.ok(r.data.items.length <= 30); assert.equal(r.data.total, count); entry.rows = r.data.items.length; entry.total = r.data.total; }
      else if (bound === 'board') { entry.rows = Object.values(r.data.columns).reduce((n, c) => n + c.items.length, 0); assert.ok(entry.rows <= 80); assert.equal(r.data.total, count); entry.total = r.data.total; }
      else if (Array.isArray(r.data)) { assert.equal(r.data.length, count); entry.rows = r.data.length; }
      sample.endpoints.push(entry); console.log(JSON.stringify({ count, ...entry, queries: entry.queries.reduce((n, q) => n + q.count, 0) })); return r;
    }
    for (const endpoint of ['/applications', '/candidates']) await measure(endpoint);
    for (const endpoint of ['/hr/v2/applications', '/hr/v2/candidates']) await measure(endpoint, 'admin', 'page');
    await measure('/hr/v2/application-board', 'admin', 'board');
    await measure(`/hr/v2/application-board?jobId=${dataset.jobs[0]._id}`, 'admin');
    await measure(`/hr/v2/application-ranking?jobId=${dataset.jobs[0]._id}&pageSize=30`, 'admin');
    await measure('/hr/analytics', 'admin');
    for (const actor of ['admin', 'hr', 'own', 'department', 'assigned']) {
      const grant = await h.models.Role.findOne({ key: (await h.models.User.findById(h.actors[actor]._id)).role }).lean();
      const permission = grant.permissions.find(p => (p.resource === 'application' || p.resource === '*') && (p.action === 'read' || p.action === '*'));
      const scope = require('../middleware/dataScope.middleware').getDataScope({ user: { id: String(h.actors[actor]._id), departmentId: h.actors[actor].departmentId }, permission });
      const expected = await Application.countDocuments(scope || { _id: { $in: [] } });
      const r = await h.request(actor, 'GET', '/hr/v2/application-board'); assert.equal(r.status, 200); assert.equal(r.data.total, expected); assert.ok(Object.values(r.data.columns).every(c => c.items.length <= 10));
      sample.scopes.push({ actor, scope: permission.scope, expected, actual: r.data.total });
    }
    for (const [key, Model, query] of [['applicationsAll', Application, {}], ['applicationsOwn', Application, { createdBy: h.actors.own._id }], ['applicationsJob', Application, { jobId: dataset.jobs[0]._id }], ['candidatesOwn', Candidate, { createdBy: h.actors.own._id }]]) {
      const explanation = await Model.find(query).sort({ createdAt: -1, _id: -1 }).limit(31).lean().explain('executionStats');
      const stats = explanation.executionStats; sample.plans[key] = { winningPlan: explanation.queryPlanner.winningPlan, returned: stats.nReturned, keysExamined: stats.totalKeysExamined, docsExamined: stats.totalDocsExamined, executionMs: stats.executionTimeMillis };
    }
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
  });
  console.log('Completed owned local HR benchmark:', output);
})().catch(error => { fs.writeFileSync(output, JSON.stringify({ ...report, failed: error.message }, null, 2)); console.error(error.message); process.exitCode = 1; });
