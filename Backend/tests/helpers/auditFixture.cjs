const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

exports.withAuditFixture = async (callback) => {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.SMTP_HOST = '';
  const models = {
    User: require('../../models/user.model'), Role: require('../../models/role.model'),
    Audit: require('../../models/audit.model'), Assignment: require('../../models/auditAssignment.model'),
    Approval: require('../../models/auditApproval.model'), Finding: require('../../models/auditFinding.model'),
    Action: require('../../models/auditAction.model'), Notification: require('../../models/auditNotification.model'),
    Execution: require('../../models/auditExecution.model'), Activity: require('../../models/auditActivity.model'),
  };
  const database = `inop_audit_test_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  let owned = false, server;
  try {
    await mongoose.connect(`mongodb://127.0.0.1:27017/${database}`);
    if (mongoose.connection.host !== '127.0.0.1' || mongoose.connection.name !== database) throw Error('Unexpected database');
    const databases = await mongoose.connection.db.admin().listDatabases();
    if (databases.databases.some(d => d.name === database)) throw Error('Refusing an existing database');
    owned = true;
    const source = fs.readFileSync(path.join(__dirname, '../../scripts/seedRoles.js'), 'utf8');
    const roles = vm.runInNewContext(source.slice(source.indexOf('const permission ='), source.indexOf('async function seedRoles()')) + '\nroles;', {}, { timeout: 1000 });
    await models.Role.insertMany(JSON.parse(JSON.stringify(roles)));
    const resources = ['audit', 'audit.approval', 'audit.analytics', 'dashboard', 'audit.report', 'audit.finding', 'audit.export', 'audit.workflow', 'audit.score', 'audit.assignment', 'audit.closure', 'audit.timeline', 'audit.activity', 'audit.notification', 'occupational_safety_audit', 'occupational_safety_details'];
    for (const scope of ['own', 'department', 'assigned', 'none']) await models.Role.create({ name: scope, key: `test_${scope}`, permissions: resources.map(resource => ({ resource, action: '*', scope })) });
    const actors = {}, tokens = {};
    const hash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 4);
    for (const [name, role, departmentId] of [
      ['admin', 'admin', 'dep_A'], ['own', 'test_own', 'dep_A'], ['department', 'test_department', 'dep_A'],
      ['assigned', 'test_assigned', 'dep_A'], ['none', 'test_none', 'dep_A'], ['peer', 'test_own', 'dep_A'],
      ['foreign', 'test_own', 'dep_B'], ['department_missing', 'test_department', ''],
      ['auditor', 'auditor', 'dep_A'], ['hr', 'hr_manager', 'dep_HR'],
    ]) {
      actors[name] = await models.User.create({ name, role, departmentId, email: `${name}@example.invalid`, password: hash });
      tokens[name] = jwt.sign({ id: String(actors[name]._id), role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }
    await models.Audit.createIndexes();
    const app = express(); app.use(express.json());
    app.use((req, res, next) => {
      const started = performance.now(), send = res.send;
      res.send = function (body) {
        if (!res.headersSent) res.setHeader('Server-Timing', `app;dur=${(performance.now() - started).toFixed(2)}`);
        return send.call(this, body);
      };
      next();
    });
    const errors = require('../../middleware/error.middleware'); app.use(errors.standardizeErrorResponses);
    app.use('/api', require('../../routes/route')); app.use(errors.notFoundHandler); app.use(errors.globalErrorHandler);
    server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    await callback({
      models, actors, tokens, mongoose, apiBase: base,
      async request(actor, method, endpoint, body, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (tokens[actor]) headers.Authorization = `Bearer ${tokens[actor]}`;
        const response = await fetch(base + endpoint, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(options.timeoutMs || 10000) });
        const buffer = Buffer.from(await response.arrayBuffer());
        const text = buffer.toString('utf8'); let data; try { data = JSON.parse(text); } catch { data = text; }
        return { status: response.status, data, buffer, headers: Object.fromEntries(response.headers) };
      },
      async audit(owner, auditType = 'standard', extra = {}) {
        return models.Audit.create({ id: crypto.randomUUID(), auditType, type: auditType, restaurantId: `restaurant-${owner}`, auditorId: String(actors[owner]._id), date: '2026-10-09', status: 'completed', scores: { food: 8, service: 8, cleanliness: 8, staff: 8 }, checks: [], results: [], categories: [], findings: [], recommendations: [], ...extra });
      },
      async assign(actor, audit, status = 'accepted') { return models.Assignment.create({ auditId: audit._id, auditor: actors[actor]._id, status }); },
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (owned) {
      if (!/^inop_audit_test_\d+_[a-f0-9]{12}$/.test(database) || mongoose.connection.host !== '127.0.0.1' || mongoose.connection.name !== database) throw Error('Refusing cleanup');
      await mongoose.connection.db.dropDatabase(); console.log('Removed only the owned local audit test database.');
    }
    await mongoose.disconnect();
  }
};
