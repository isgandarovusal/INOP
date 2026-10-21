// EXPERIMENT ONLY: this policy is not imported by the application. All numeric
// budgets below are synthetic test inputs, not approved deployment defaults.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');

test('isolated NAT candidate: verified principals share a bounded network budget without sharing their own quotas', async () => withAuditFixture(async h => {
  const app = express(); app.use(express.json());
  const limiter = (limit, keyGenerator) => rateLimit({ windowMs: 60000, limit, ...(keyGenerator ? { keyGenerator } : {}) });
  // Coarse network protection still precedes expensive authentication.
  app.use(limiter(200));
  app.post('/login', limiter(20), limiter(5, req => crypto.createHash('sha256').update(String(req.body.email || '').trim().toLowerCase()).digest('hex')), (_req, res) => res.sendStatus(401));
  app.use(require('../middleware/auth.middleware').verifyToken);
  app.use(limiter(8, req => req.user.id));
  // Existing server-loaded department identity, not an invented tenant claim.
  app.use(limiter(40, req => req.user.departmentId || 'unassigned'));
  app.get('/read', (_req, res) => res.json({ ok: true }));
  app.get('/heavy', limiter(2, req => req.user.id), (_req, res) => res.json({ ok: true }));
  const server = http.createServer(app); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const read = (token, endpoint = '/read', headers = {}) => fetch(base + endpoint, { headers: { Authorization: `Bearer ${token}`, ...headers }, signal: AbortSignal.timeout(5000) });
  try {
    const users = await h.models.User.insertMany(Array.from({ length: 30 }, (_, i) => ({ name: `NAT synthetic ${i}`, email: `nat-${i}@example.invalid`, password: h.actors.own.password, role: 'employee', departmentId: `nat-department-${i % 4}` })));
    const tokens = users.map(user => jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' }));
    let accepted = 0;
    for (const token of tokens) for (let i = 0; i < 4; i++) { assert.equal((await read(token)).status, 200); accepted++; }
    assert.equal(accepted, 120, '30 real DB principals complete four reads each on one loopback IP');
    for (let i = 0; i < 4; i++) assert.equal((await read(tokens[0], '/read', { 'X-User-ID': String(i), 'X-Tenant-ID': String(i) })).status, 200);
    assert.equal((await read(tokens[0], '/read', { 'X-User-ID': 'spoofed' })).status, 429);
    assert.equal((await read(tokens[1])).status, 200, 'One exhausted principal does not exhaust another principal');
    for (let i = 0; i < 4; i++) assert.equal((await read(tokens[4])).status, 200);
    assert.equal((await read(tokens[8])).status, 429, 'The server-loaded department quota bounds aggregate work across principals');
    assert.equal((await read(tokens[9])).status, 200, 'A different department retains its budget');
    assert.equal((await read(tokens[2], '/heavy')).status, 200);
    assert.equal((await read(tokens[2], '/heavy')).status, 200);
    assert.equal((await read(tokens[2], '/heavy')).status, 429);
    assert.equal((await read('invalid')).status, 401);
    for (let i = 0; i < 5; i++) assert.equal((await fetch(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: i % 2 ? ' TEST@example.invalid ' : 'test@example.invalid' }) })).status, 401);
    assert.equal((await fetch(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.invalid' }) })).status, 429);
    assert.equal((await fetch(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'another@example.invalid' }) })).status, 401);
    let blocked = false;
    for (let i = 0; i < 80; i++) if ((await read('invalid')).status === 429) { blocked = true; break; }
    assert.ok(blocked, 'Network budget remains finite even for invalid authentication');
    console.log(JSON.stringify({ experiment: 'NAT, not installed in production', principals: 30, departments: 4, acceptedInitialReads: accepted, perPrincipalCapEnforced: true, heavyCapEnforced: true, departmentCapEnforced: true, accountCapEnforced: true, networkCapEnforced: true }));
  } finally { await new Promise(r => server.close(r)); }
}, { canonicalHR: true }));
