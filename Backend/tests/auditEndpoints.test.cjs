const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Snapshot = require('../models/auditDepartmentSnapshot.model');

test('Audit lists, aggregates and child endpoints enforce their own permission scope', async t => withAuditFixture(async h => {
  const records = [], assignments = [];
  for (const owner of ['own', 'peer', 'assigned', 'foreign']) for (const auditType of ['standard', 'service', 'occupational-safety']) {
    const value = { own: 10, peer: 20, assigned: 30, foreign: 90 }[owner];
    const audit = await h.audit(owner, auditType, {
      overallPercentage: value, compliancePercentage: value, foundCritical: value, foundMajor: value, foundMinor: value,
      passed: owner !== 'foreign', scorePercentage: value, totalScore: value, maxScore: 100,
      checks: [{ answer: owner === 'foreign' ? 'no' : 'yes', score: value, status: 'passed' }],
      serviceTimeObservations: [{ seconds: value }],
    }); records.push({ owner, audit });
    await Snapshot.create({ auditId: audit._id, auditorId: audit.auditorId, departmentId: h.actors[owner].departmentId });
    await h.models.Execution.create({ auditId: audit._id, riskLevel: owner === 'foreign' ? 'critical' : 'low', status: 'completed', totalScore: value });
    await h.models.Finding.create({ auditId: audit._id, title: `finding-${owner}`, status: 'closed' });
    if (owner === 'foreign') assignments.push(await h.assign('assigned', audit));
  }
  const legacy = await h.audit('foreign', 'safety', { departmentId: 'dep_A' }); records.push({ owner: 'legacy', audit: legacy });
  const selected = actor => records.filter(r => actor === 'admin' || (actor === 'own' && r.owner === 'own') || (actor === 'department' && ['own', 'peer', 'assigned'].includes(r.owner)) || (actor === 'assigned' && ['assigned', 'foreign'].includes(r.owner)));
  for (const actor of ['admin', 'own', 'department', 'assigned']) {
    const allowed = selected(actor);
    for (const [endpoint, auditType] of [['/audit-module/standard', 'standard'], ['/audit-module/service', 'service'], ['/occupational-safety-audits', 'occupational-safety']]) await t.test(`${actor}: ${endpoint} list and count are scoped`, async () => {
      const response = await h.request(actor, 'GET', endpoint + '?status=completed&from=2026-01-01&to=2026-12-31'); assert.equal(response.status, 200);
      const expected = allowed.filter(r => r.audit.auditType === auditType).map(r => r.audit.id).sort();
      assert.deepEqual(response.data.data.map(a => a.id).sort(), expected);
      if (response.data.count !== undefined) assert.equal(response.data.count, expected.length);
    });
    await t.test(`${actor}: summary/type/trend aggregates reveal only scoped counts`, async () => {
      const summary = await h.request(actor, 'GET', '/audit-analytics/summary'); assert.equal(summary.status, 200); assert.equal(summary.data.data.total, allowed.length);
      assert.equal(summary.data.data.statusSummary.reduce((n, x) => n + x.value, 0), allowed.length);
      for (const [endpoint, key] of [['type', 'typeSummary'], ['trend', 'trend']]) {
        const response = await h.request(actor, 'GET', `/audit-analytics/${endpoint}`); assert.equal(response.status, 200);
        assert.equal(response.data.data[key].reduce((n, x) => n + x.value, 0), allowed.length);
      }
    });
    for (const [endpoint, auditType, metric] of [['service', 'service', 'averageOverallPercentage'], ['standard', 'standard', 'averageCompliancePercentage'], ['safety', 'occupational-safety', 'averageScorePercentage']]) await t.test(`${actor}: ${endpoint} facets are scoped before averages/distributions`, async () => {
      const expected = allowed.filter(r => r.audit.auditType === auditType), response = await h.request(actor, 'GET', `/audit-analytics/${endpoint}`);
      assert.equal(response.status, 200); assert.equal(response.data.data.total, expected.length);
      const average = Math.round(expected.reduce((n, r) => n + r.audit.overallPercentage, 0) / expected.length * 100) / 100;
      assert.equal(response.data.data[metric], average);
      if (endpoint === 'service') { assert.equal(response.data.data.averageServiceTimeSeconds, average); assert.equal(response.data.data.answerDistribution.reduce((n, x) => n + x.value, 0), expected.length); }
      if (endpoint === 'standard') assert.equal(response.data.data.findings.critical, expected.reduce((n, r) => n + r.audit.foundCritical, 0));
      if (endpoint === 'safety') assert.equal(response.data.data.totalChecks, expected.length);
    });
    await t.test(`${actor}: dashboard Audit and Execution aggregates share the permitted parents`, async () => {
      const response = await h.request(actor, 'GET', '/audit-dashboard'); assert.equal(response.status, 200);
      assert.equal(response.data.data.totalAudits, allowed.length);
      const executions = allowed.filter(r => r.owner !== 'legacy').length;
      assert.equal(response.data.data.completedAudits, executions);
      assert.equal(response.data.data.riskStats.reduce((n, x) => n + x.count, 0), executions);
      assert.equal(response.data.data.typeStats.reduce((n, x) => n + x.count, 0), allowed.length);
      assert.equal(response.data.data.trend.reduce((n, x) => n + x.count, 0), executions);
    });
  }
  await t.test('Nonempty generic analytics supports Mongo date formats and preserves trend response shape', async () => {
    const response = await h.request('own', 'GET', '/audits/analytics'); assert.equal(response.status, 200);
    assert.equal(response.data.totalAudits, 3);
    assert.ok(response.data.historicalTrend.length); assert.match(response.data.historicalTrend[0].label, /^[a-z]{3} 2026$/i);
    assert.equal(typeof response.data.historicalTrend[0].score, 'number');
  });
  for (const actor of ['none', 'department_missing', 'anonymous']) for (const endpoint of ['/audit-module/standard', '/audit-module/service', '/occupational-safety-audits', '/audit-analytics/summary', '/audit-analytics/type', '/audit-analytics/trend', '/audit-analytics/service', '/audit-analytics/standard', '/audit-analytics/safety', '/audit-dashboard']) await t.test(`${actor}: ${endpoint} is denied`, async () => {
    assert.equal((await h.request(actor, 'GET', endpoint)).status, actor === 'anonymous' ? 401 : 403);
  });
  const readEndpoints = audit => [
    `/audit-report/${audit._id}`, `/audit-findings/${audit._id}`, `/occupational-safety-details/${audit._id}/details`,
    `/audit-assignments/${audit._id}`, `/audit-closure/${audit._id}`, `/audit-timeline/${audit._id}`,
    `/audit-activity/${audit._id}`, `/audit-activity/${audit._id}/timeline`,
    `/audit-export/${audit._id}/csv`, `/audit-export/${audit._id}/excel`, `/audit-export/${audit._id}/pdf`,
  ];
  for (const actor of ['admin', 'own', 'department', 'assigned']) for (const owner of ['own', 'peer', 'assigned', 'foreign', 'legacy']) {
    const record = records.find(r => r.owner === owner), audit = record.audit, permitted = selected(actor).includes(record);
    for (const endpoint of readEndpoints(audit)) await t.test(`${actor}: ${owner} ${endpoint.split('/')[1]} read scope`, async () => {
      const response = await h.request(actor, 'GET', endpoint); assert.equal(response.status, permitted ? 200 : 403);
      if (permitted && endpoint.endsWith('/csv')) assert.ok(response.data.includes(String(audit._id)));
      if (permitted && endpoint.endsWith('/excel')) {
        const XLSX = require('xlsx'), workbook = XLSX.read(response.buffer, { type: 'buffer' });
        const cells = workbook.SheetNames.map(name => XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join('\n');
        assert.ok(cells.includes(String(audit._id)));
      }
      if (permitted && endpoint.endsWith('/pdf')) { assert.match(response.headers['content-type'], /pdf/); assert.equal(response.buffer.subarray(0, 4).toString(), '%PDF'); }
    });
    for (const [method, endpoint, body, success] of [
      ['PATCH', `/audit-workflow/${audit._id}/status`, { status: 'completed' }, 200],
      ['POST', `/audit-score/${audit._id}/calculate`, {}, 200],
      ['PATCH', `/occupational-safety-details/${audit._id}/details`, { correctiveAction: 'authorized-test' }, 200],
      ['POST', '/audit-findings', { auditId: String(audit._id), title: 'created-test' }, 201],
      ['POST', '/audit-activity', { auditId: String(audit._id), action: 'tested', resource: 'audit' }, 201],
      ['POST', '/audit-assignments', { auditId: String(audit._id), auditor: String(h.actors[actor]._id) }, 201],
      ['POST', '/audit-notification', { auditId: String(audit._id), userId: String(h.actors[actor]._id), type: 'completed', title: 'test', message: 'local' }, 201],
    ]) await t.test(`${actor}: ${owner} ${endpoint.split('/')[1]} mutation scope`, async () => {
      // Clean valid findings before each new attempt; all denial paths must have no side effects.
      const before = await h.models.Audit.findById(audit._id).lean();
      const counts = await Promise.all([h.models.Finding.countDocuments(), h.models.Assignment.countDocuments(), h.models.Activity.countDocuments(), h.models.Notification.countDocuments()]);
      const response = await h.request(actor, method, endpoint, body); assert.equal(response.status, permitted ? success : 403);
      if (!permitted) {
        assert.deepEqual(await h.models.Audit.findById(audit._id).lean(), before);
        assert.deepEqual(await Promise.all([h.models.Finding.countDocuments(), h.models.Assignment.countDocuments(), h.models.Activity.countDocuments(), h.models.Notification.countDocuments()]), counts);
      } else {
        if (endpoint === '/audit-findings') await h.models.Finding.deleteOne({ _id: response.data.data._id });
        if (endpoint === '/audit-assignments') await h.models.Assignment.deleteOne({ _id: response.data.data._id });
      }
    });
    await t.test(`${actor}: ${owner} closure mutation scope`, async () => {
      const response = await h.request(actor, 'POST', '/audit-closure', { auditId: String(audit._id), comment: 'local' });
      assert.equal(response.status, permitted ? 201 : 403);
    });
  }
  await t.test('Parent public id is normalized before ObjectId child queries and writes', async () => {
    const audit = records.find(r => r.owner === 'own').audit;
    for (const endpoint of [`/audit-assignments/${audit.id}`, `/audit-closure/${audit.id}`, `/audit-timeline/${audit.id}`, `/audit-export/${audit.id}/csv`, `/audit-activity/${audit.id}`]) assert.equal((await h.request('own', 'GET', endpoint)).status, 200);
    const created = await h.request('own', 'POST', '/audit-assignments', { auditId: audit.id, auditor: String(h.actors.own._id) });
    assert.equal(created.status, 201); assert.equal(created.data.data.auditId, String(audit._id));
  });
  for (const actor of ['none', 'department_missing', 'anonymous']) await t.test(`${actor}: child routes fail closed`, async () => {
    const audit = records[0].audit;
    for (const endpoint of readEndpoints(audit)) assert.equal((await h.request(actor, 'GET', endpoint)).status, actor === 'anonymous' ? 401 : 403);
    assert.equal((await h.request(actor, 'POST', '/audit-findings', { auditId: String(audit._id), title: 'denied' })).status, actor === 'anonymous' ? 401 : 403);
  });
  await t.test('Finding and closure execution links cannot cross parent audits', async () => {
    const own = records.find(r => r.owner === 'own').audit, foreign = records.find(r => r.owner === 'foreign').audit;
    const foreignExecution = await h.models.Execution.findOne({ auditId: foreign._id });
    const ownExecution = await h.models.Execution.findOne({ auditId: own._id });
    for (const endpoint of ['/audit-findings', '/audit-closure']) {
      assert.equal((await h.request('own', 'POST', endpoint, { auditId: String(own._id), executionId: String(foreignExecution._id), title: 'cross-parent' })).status, 400);
      assert.equal((await h.request('own', 'POST', endpoint, { auditId: String(own._id), executionId: 'invalid', title: 'invalid' })).status, 400);
    }
    const response = await h.request('own', 'POST', '/audit-findings', { auditId: String(own._id), executionId: String(ownExecution._id), title: 'valid link' });
    assert.equal(response.status, 201); assert.equal(response.data.data.executionId, String(ownExecution._id));
  });
  await t.test('Public-id alias cannot authorize a foreign Mongo parent', async () => {
    const foreign = records.find(r => r.owner === 'foreign').audit;
    await h.audit('own', 'standard', { id: String(foreign._id) });
    for (const endpoint of readEndpoints(foreign)) assert.equal((await h.request('own', 'GET', endpoint)).status, 403);
    assert.equal((await h.request('own', 'POST', '/audit-activity', { auditId: String(foreign._id), action: 'forged', resource: 'audit' })).status, 403);
  });
  await t.test('Revoked assignment hides notifications and denies child reads/writes with old JWT', async () => {
    const audit = records.find(r => r.owner === 'foreign').audit;
    const notification = await h.models.Notification.create({ auditId: audit._id, userId: h.actors.assigned._id, type: 'completed', title: 'revocation test', message: 'local' });
    assert.equal((await h.request('assigned', 'GET', '/audit-notification')).data.data.some(n => n._id === String(notification._id)), true);
    await h.models.Assignment.deleteMany({ _id: { $in: assignments.map(a => a._id) } });
    for (const endpoint of readEndpoints(audit)) assert.equal((await h.request('assigned', 'GET', endpoint)).status, 403);
    assert.equal((await h.request('assigned', 'GET', '/audit-notification')).data.data.some(n => n._id === String(notification._id)), false);
    assert.equal((await h.request('assigned', 'PATCH', `/audit-notification/${notification._id}/read`)).status, 404);
    assert.equal((await h.models.Notification.findById(notification._id)).read, false);
    assert.equal((await h.request('assigned', 'GET', '/audit-analytics/summary')).data.data.total, 3);
    assert.equal((await h.request('assigned', 'GET', '/audit-module/standard')).data.data.length, 1);
  });
  await t.test('Real auditor retains explicitly granted all analytics/report and assigned Standard lists', async () => {
    const audit = records.find(r => r.owner === 'foreign').audit;
    assert.equal((await h.request('auditor', 'GET', '/audit-module/standard')).data.data.length, 0);
    assert.equal((await h.request('auditor', 'GET', '/audit-analytics/summary')).data.data.total, await h.models.Audit.countDocuments());
    assert.equal((await h.request('auditor', 'GET', `/audit-report/${audit._id}`)).status, 200);
    assert.equal((await h.request('auditor', 'GET', `/audit-export/${audit._id}/csv`)).status, 403);
    assert.equal((await h.request('hr', 'GET', '/audits')).status, 403);
    assert.equal((await h.request('hr', 'GET', '/audit-dashboard')).status, 200);
  });
  await t.test('Permitted user with no audits receives empty analytics, never HTTP 500', async () => {
    const user = await h.models.User.create({ name: 'empty', role: 'test_own', departmentId: 'dep_A', email: 'empty@example.invalid', password: h.actors.own.password });
    h.tokens.empty = require('jsonwebtoken').sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const response = await h.request('empty', 'GET', '/audits/analytics'); assert.equal(response.status, 200);
    assert.equal(response.data.totalAudits, 0); assert.equal(response.data.overallScore, 0); assert.deepEqual(response.data.historicalTrend, []);
    assert.equal((await h.request('empty', 'GET', '/audit-analytics/summary')).data.data.total, 0);
    assert.equal((await h.request('empty', 'GET', '/audit-dashboard')).data.data.totalAudits, 0);
    for (const endpoint of ['service', 'standard', 'safety']) assert.equal((await h.request('empty', 'GET', `/audit-analytics/${endpoint}`)).data.data.total, 0);
  });
}));
