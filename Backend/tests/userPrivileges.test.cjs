const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const path = require('node:path');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Never load application .env or seed scripts. Only this newly created,
// loopback database may be written or dropped by the test.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.SMTP_HOST = '';
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Audit = require('../models/audit.model');
const Activity = require('../models/activityLog.model');
const RevokedToken = require('../models/revokedToken.model');
const database = `inop_privileges_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
const adminGrant = [{ resource: '*', action: '*', scope: 'all' }];

test('User and role privilege authorization (isolated local MongoDB)', async (t) => {
  let server, base, ownedDatabase = false;
  const actors = {};
  const tokens = {};
  const password = crypto.randomBytes(16).toString('hex');
  async function request(actor, method, endpoint, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (tokens[actor]) headers.Authorization = `Bearer ${tokens[actor]}`;
    const response = await fetch(base + endpoint, {
      method, headers, signal: AbortSignal.timeout(10000),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  async function userSnapshot(id) {
    return User.findById(id).select('+password').lean();
  }
  async function protectedUpdate(actor, target, body, expected = 403) {
    const before = await userSnapshot(actors[target]._id);
    const activities = await Activity.countDocuments();
    try {
      const response = await request(actor, 'PUT', `/users/${before._id}`, body);
      assert.equal(response.status, expected);
      assert.deepEqual(await userSnapshot(before._id), before, 'Denied update must not persist any user field');
      assert.equal(await Activity.countDocuments(), activities, 'Denied update must not emit an activity');
      assert.ok(response.body.message && response.body.success === false);
    } finally {
      await User.collection.replaceOne({ _id: before._id }, before);
    }
  }
  async function roleSnapshot(key) { return Role.findOne({ key }).lean(); }
  async function protectedRoleWrite(actor, method, suffix, body, expected = 403) {
    const before = await roleSnapshot(actors[actor].role);
    const roleCount = await Role.countDocuments();
    const activities = await Activity.countDocuments();
    try {
      const response = await request(actor, method, '/roles' + suffix(before), body);
      assert.equal(response.status, expected);
      assert.equal(await Role.countDocuments(), roleCount);
      assert.deepEqual(await roleSnapshot(before.key), before, 'Denied permission/key write must not persist');
      assert.equal(await Activity.countDocuments(), activities);
    } finally {
      await Role.collection.replaceOne({ _id: before._id }, before);
      await Role.deleteMany({ key: 'unauthorized-created-role' });
    }
  }

  try {
    await mongoose.connect(`mongodb://127.0.0.1:27017/${database}`);
    assert.equal(mongoose.connection.host, '127.0.0.1');
    assert.equal(mongoose.connection.name, database);
    const databases = await mongoose.connection.db.admin().listDatabases();
    assert.ok(!databases.databases.some(item => item.name === database));
    ownedDatabase = true;
    const source = fs.readFileSync(path.join(__dirname, '../scripts/seedRoles.js'), 'utf8');
    const definitions = vm.runInNewContext(
      source.slice(source.indexOf('const permission ='), source.indexOf('async function seedRoles()')) + '\nroles;',
      {}, { timeout: 1000 }
    );
    await Role.insertMany(JSON.parse(JSON.stringify(definitions)));
    const userPermissions = [{ resource: 'user', action: '*', scope: 'all' }];
    const custom = [
      { key: 'department_editor', permissions: [{ resource: 'user', action: '*', scope: 'department' }] },
      { key: 'user_editor', permissions: userPermissions },
      { key: 'delegated_manager', permissions: [...userPermissions, { resource: 'role', action: '*', scope: 'all' }] },
      ...['own', 'department', 'assigned', 'none'].map(scope => ({ key: `role_${scope}`, permissions: [...userPermissions, { resource: 'role', action: '*', scope }] })),
      { key: 'ordered_permissions', permissions: [...userPermissions, { resource: 'role', action: 'update', scope: 'own' }, { resource: '*', action: '*', scope: 'all' }] },
    ];
    await Role.insertMany(custom.map(role => ({ name: role.key, ...role })));
    await User.createIndexes(); await Role.createIndexes(); await Audit.createIndexes();
    const hash = await bcrypt.hash(password, 4);
    for (const [name, role, departmentId] of [
      ['admin', 'admin', 'dep_A'], ['hr', 'hr_manager', 'dep_A'], ['hr_peer', 'hr_manager', 'dep_A'],
      ['employee', 'employee', 'dep_A'], ['employee_peer', 'employee', 'dep_A'],
      ['foreign', 'employee', 'dep_B'], ['assistant', 'assistant_hr', 'dep_A'],
      ['department', 'department_editor', 'dep_A'], ['editor', 'user_editor', 'dep_A'],
      ['editor_empty', 'user_editor', ''],
      ['delegated', 'delegated_manager', 'dep_A'], ['inactive', 'admin', 'dep_A'],
      ...['own', 'department', 'assigned', 'none'].map(scope => [`role_${scope}`, `role_${scope}`, 'dep_A']),
      ['ordered', 'ordered_permissions', 'dep_A'],
    ]) {
      actors[name] = await User.create({ name, email: `${name}@example.invalid`, role, departmentId, password: hash, isActive: name !== 'inactive' });
      const login = await requestLoginSetup(actors[name]);
      tokens[name] = login;
    }
    async function requestLoginSetup(user) {
      return jwt.sign({ id: String(user._id), role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }
    await Audit.create({ id: 'foreign-audit', auditType: 'standard', auditorId: String(actors.foreign._id), restaurantId: 'test-only', date: '2026-10-09' });
    const app = express(); app.use(express.json());
    const errors = require('../middleware/error.middleware');
    app.use(errors.standardizeErrorResponses);
    app.use('/api', require('../routes/route'));
    app.use(errors.notFoundHandler); app.use(errors.globalErrorHandler);
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;

    await t.test('HR self-promotion is rejected and existing JWT cannot read global audits', async () => {
      assert.equal((await request('hr', 'GET', '/audits')).status, 403);
      const before = await userSnapshot(actors.hr._id);
      const activities = await Activity.countDocuments();
      try {
        const response = await request('hr', 'PUT', `/users/${before._id}`, { role: 'admin', name: 'must-not-persist' });
        const after = await userSnapshot(before._id);
        const audits = await request('hr', 'GET', '/audits');
        t.diagnostic(JSON.stringify({ updateStatus: response.status, persistedRole: after.role, sameJwtAuditStatus: audits.status, returnedAudits: Array.isArray(audits.body) ? audits.body.length : 0 }));
        assert.equal(response.status, 403); assert.deepEqual(after, before);
        assert.equal(audits.status, 403); assert.equal(await Activity.countDocuments(), activities);
      } finally { await User.collection.replaceOne({ _id: before._id }, before); }
    });
    for (const [actor, target] of [['hr', 'hr_peer'], ['hr', 'employee'], ['department', 'department'], ['department', 'employee'], ['editor', 'editor'], ['editor', 'foreign']]) {
      for (const role of ['admin', 'audit_manager']) await t.test(`${actor} cannot assign ${role} to ${target}`, () => protectedUpdate(actor, target, { role }));
    }
    for (const actor of ['hr', 'department', 'editor', 'role_own', 'role_department', 'role_assigned', 'role_none', 'ordered']) {
      await t.test(`${actor} cannot create an admin account`, async () => {
        const email = 'blocked-create@example.invalid';
        try {
          const before = await User.countDocuments();
          const activities = await Activity.countDocuments();
          const response = await request(actor, 'POST', '/users', { name: 'Blocked', email, password, role: 'admin', departmentId: 'dep_A' });
          assert.equal(response.status, 403); assert.equal(await User.countDocuments(), before);
          assert.equal(await Activity.countDocuments(), activities);
        } finally { await User.deleteOne({ email }); }
      });
    }
    for (const scope of ['own', 'department', 'assigned', 'none']) {
      const actor = `role_${scope}`;
      await t.test(`${scope} role grant cannot assign a user role`, () => protectedUpdate(actor, actor, { role: 'admin' }));
      await t.test(`${scope} role grant cannot rewrite its permissions`, () => protectedRoleWrite(actor, 'PUT', role => `/${role._id}`, { permissions: adminGrant }));
      await t.test(`${scope} role grant cannot rename its role to an authority`, () => protectedRoleWrite(actor, 'PUT', role => `/${role._id}`, { key: 'unauthorized-role-key' }));
      await t.test(`${scope} role grant cannot create wildcard authority`, () => protectedRoleWrite(actor, 'POST', () => '', { name: 'Blocked', key: 'unauthorized-created-role', permissions: adminGrant }));
      await t.test(`${scope} role grant cannot alter global role status`, () => protectedRoleWrite(actor, 'PATCH', role => `/${role._id}/status`, { isActive: true }));
      await t.test(`${scope} role grant cannot delete a role`, () => protectedRoleWrite(actor, 'DELETE', role => `/${role._id}`));
    }
    await t.test('First matching scoped permission remains restrictive despite a later wildcard', () => protectedUpdate('ordered', 'ordered', { role: 'admin' }));
    for (const actor of ['hr', 'department', 'editor']) {
      await t.test(`${actor} cannot move itself to another department`, () => protectedUpdate(actor, actor, { departmentId: 'dep_B' }));
      await t.test(`${actor} cannot alter manager identity`, () => protectedUpdate(actor, actor, { managerId: String(actors.admin._id) }));
      await t.test(`${actor} cannot take over an admin account by password`, () => protectedUpdate(actor, 'admin', { password: 'test-only-new-password' }));
      await t.test(`${actor} cannot take over an admin account by email`, () => protectedUpdate(actor, 'admin', { email: 'takeover@example.invalid' }));
    }
    await t.test('HR department scope cannot edit a foreign-department account', () => protectedUpdate('hr', 'foreign', { name: 'blocked' }, 404));
    await t.test('Malformed privilege fields cannot bypass empty-department/manager checks', async () => {
      for (const departmentId of [0, 42, false, null, {}, ['dep_B']]) await protectedUpdate('editor_empty', 'editor_empty', { departmentId });
      for (const managerId of [0, false, {}, []]) await protectedUpdate('editor_empty', 'editor_empty', { managerId });
      for (const role of [null, 0, {}, ['admin']]) await protectedUpdate('editor_empty', 'editor_empty', { role });
    });
    for (const actor of ['employee', 'assistant', 'inactive']) await t.test(`${actor} cannot mutate a role through user update`, () => protectedUpdate(actor, actor, { role: 'admin' }));
    for (const actor of ['employee', 'assistant', 'hr', 'department']) await t.test(`${actor} cannot rewrite role definitions`, () => protectedRoleWrite(actor, 'PUT', role => `/${role._id}`, { permissions: adminGrant }));
    for (const actor of ['hr', 'department', 'editor']) await t.test(`${actor} may edit its profile with unchanged role/department`, async () => {
      const before = await userSnapshot(actors[actor]._id);
      try {
        const response = await request(actor, 'PUT', `/users/${before._id}`, { role: before.role.toUpperCase(), departmentId: before.departmentId, managerId: null, name: 'Legitimate profile', password: 'test-only-self-password' });
        assert.equal(response.status, 200); assert.equal(response.body.user.role, before.role);
        assert.equal(response.body.user.name, 'Legitimate profile');
        assert.ok(await bcrypt.compare('test-only-self-password', (await userSnapshot(before._id)).password));
      } finally { await User.collection.replaceOne({ _id: before._id }, before); }
    });
    await t.test('HR may update a same-department employee ordinary profile', async () => {
      const before = await userSnapshot(actors.employee._id);
      try {
        const response = await request('hr', 'PUT', `/users/${before._id}`, { name: 'HR profile edit', position: 'Member', role: before.role, departmentId: before.departmentId });
        assert.equal(response.status, 200); assert.equal(response.body.user.role, 'employee');
      } finally { await User.collection.replaceOne({ _id: before._id }, before); }
    });
    await t.test('User payload permissions and authority flags do not become server privileges', async () => {
      const before = await userSnapshot(actors.hr._id);
      try {
        const response = await request('hr', 'PUT', `/users/${before._id}`, { permissions: adminGrant, isAdmin: true, isSystemRole: true, isActive: false, _id: String(actors.admin._id), createdBy: String(actors.admin._id), authRole: { permissions: adminGrant } });
        assert.equal(response.status, 200);
        assert.deepEqual(response.body.user.permissions, (await roleSnapshot('hr_manager')).permissions);
        assert.equal(response.body.user.role, 'hr_manager');
        assert.equal(response.body.user.isActive, true);
        assert.equal((await request('hr', 'GET', '/audits')).status, 403);
        const after = await userSnapshot(before._id);
        for (const field of ['permissions', 'isAdmin', 'isSystemRole', 'authRole', 'createdBy']) assert.equal(after[field], undefined);
      } finally { await User.collection.replaceOne({ _id: before._id }, before); }
    });
    for (const actor of ['admin', 'delegated']) await t.test(`${actor} may create users and assign existing roles`, async () => {
      const email = `${actor}-authorized-create@example.invalid`;
      try {
        const response = await request(actor, 'POST', '/users', { name: 'Authorized', email, password, role: 'employee', departmentId: 'dep_A', permissions: adminGrant, isActive: false, isAdmin: true });
        assert.equal(response.status, 201); assert.equal(response.body.user.role, 'employee');
        assert.deepEqual(response.body.user.permissions, (await roleSnapshot('employee')).permissions);
        assert.equal(response.body.user.isActive, true);
      } finally { await User.deleteOne({ email }); }
    });
    for (const actor of ['admin', 'delegated']) await t.test(`${actor} may perform privileged user updates`, async () => {
      const before = await userSnapshot(actors.employee._id);
      try {
        const response = await request(actor, 'PUT', `/users/${before._id}`, { role: 'audit_manager', departmentId: 'dep_B', managerId: String(actors.admin._id), email: 'authorized-change@example.invalid', password: 'test-only-admin-password' });
        assert.equal(response.status, 200); assert.equal(response.body.user.role, 'audit_manager');
        assert.equal(response.body.user.departmentId, 'dep_B');
        assert.equal((await request('employee', 'GET', '/audits')).status, 200);
      } finally { await User.collection.replaceOne({ _id: before._id }, before); }
    });
    await t.test('Admin demotion invalidates old JWT authority immediately', async () => {
      const before = await userSnapshot(actors.delegated._id);
      try {
        assert.equal((await request('delegated', 'GET', '/roles')).status, 200);
        assert.equal((await request('admin', 'PUT', `/users/${before._id}`, { role: 'employee' })).status, 200);
        assert.equal((await request('delegated', 'GET', '/roles')).status, 403);
        assert.equal((await request('delegated', 'PUT', `/users/${before._id}`, { role: 'admin' })).status, 403);
        const me = await request('delegated', 'GET', '/auth/me');
        assert.equal(me.status, 200); assert.equal(me.body.user.role, 'employee');
        assert.deepEqual(me.body.user.permissions, (await roleSnapshot('employee')).permissions);
      } finally { await User.collection.replaceOne({ _id: before._id }, before); }
    });
    await t.test('Editing role permissions revokes old JWT authority immediately', async () => {
      const before = await roleSnapshot('delegated_manager');
      try {
        assert.equal((await request('admin', 'PUT', `/roles/${before._id}`, { permissions: [{ resource: 'user', action: 'read', scope: 'all' }] })).status, 200);
        assert.equal((await request('delegated', 'PUT', `/users/${actors.employee._id}`, { role: 'admin' })).status, 403);
        assert.equal((await request('delegated', 'PUT', `/roles/${before._id}`, { permissions: adminGrant })).status, 403);
      } finally { await Role.collection.replaceOne({ _id: before._id }, before); }
    });
    await t.test('Admin role lifecycle and existing validation/status contract stay intact', async () => {
      let role;
      try {
        const create = await request('admin', 'POST', '/roles', { name: 'Lifecycle', key: 'lifecycle', permissions: [{ resource: 'dashboard', action: 'read', scope: 'own' }], isSystemRole: true });
        assert.equal(create.status, 201); role = create.body.role;
        assert.equal(role.isSystemRole, false);
        assert.equal((await request('admin', 'PUT', `/roles/${role.id}`, { permissions: adminGrant, name: 'Edited' })).status, 200);
        assert.equal((await request('admin', 'PATCH', `/roles/${role.id}/status`, { isActive: false })).status, 200);
        assert.equal((await request('admin', 'PATCH', `/roles/${role.id}/status`, { isActive: true })).status, 200);
        assert.equal((await request('admin', 'PUT', `/roles/${role.id}`, { permissions: 'invalid' })).status, 400);
        assert.equal((await request('admin', 'POST', '/roles', { name: 'Duplicate', key: 'lifecycle' })).status, 409);
        assert.equal((await request('admin', 'DELETE', `/roles/${role.id}`)).status, 200);
        assert.equal((await request('admin', 'GET', `/roles/${role.id}`)).status, 404);
      } finally { if (role) await Role.deleteOne({ _id: role.id }); }
    });
    await t.test('Admin same-role profile and self-demotion preserve DB authority', async () => {
      const before = await userSnapshot(actors.admin._id);
      try {
        assert.equal((await request('admin', 'PUT', `/users/${before._id}`, { role: 'admin', position: 'Administrator' })).status, 200);
        assert.equal((await request('admin', 'PUT', `/users/${before._id}`, { role: 'employee' })).status, 200);
        assert.equal((await request('admin', 'GET', '/audits')).status, 403);
      } finally { await User.collection.replaceOne({ _id: before._id }, before); }
    });
    await t.test('Invalid admin user payloads retain 400/404/409 behavior', async () => {
      assert.equal((await request('admin', 'PUT', '/users/not-an-id', { role: 'employee' })).status, 400);
      assert.equal((await request('admin', 'PUT', `/users/${new mongoose.Types.ObjectId()}`, { role: 'employee' })).status, 404);
      assert.equal((await request('admin', 'PUT', `/users/${actors.employee._id}`, { role: 'nonexistent' })).status, 400);
      assert.equal((await request('admin', 'POST', '/users', { name: 'Duplicate', email: actors.admin.email, password, role: 'employee' })).status, 409);
    });
    await t.test('Unauthorized endpoints return 401 without a token or with a bad token', async () => {
      for (const actor of ['anonymous', 'invalid']) {
        if (actor === 'invalid') tokens[actor] = 'invalid-token';
        for (const [method, endpoint, body] of [
          ['PUT', `/users/${actors.hr._id}`, { role: 'admin' }],
          ['POST', '/users', { role: 'admin' }],
          ['PUT', `/roles/${(await roleSnapshot('hr_manager'))._id}`, { permissions: adminGrant }],
        ]) assert.equal((await request(actor, method, endpoint, body)).status, 401);
      }
    });
    await t.test('Signed JWT role/permissions claims cannot override the DB role', async () => {
      tokens.spoofed = jwt.sign({ id: String(actors.hr._id), role: 'admin', permissions: adminGrant, departmentId: 'dep_B' }, process.env.JWT_SECRET);
      const response = await request('spoofed', 'PUT', `/users/${actors.hr._id}`, { role: 'admin' });
      assert.equal(response.status, 403); assert.equal((await userSnapshot(actors.hr._id)).role, 'hr_manager');
      assert.equal((await request('spoofed', 'GET', '/audits')).status, 403);
    });
    await t.test('Inactive role and revoked token cannot perform privileged operations', async () => {
      const before = await roleSnapshot('delegated_manager');
      try {
        await Role.updateOne({ _id: before._id }, { isActive: false });
        assert.equal((await request('delegated', 'PUT', `/users/${actors.employee._id}`, { role: 'admin' })).status, 403);
      } finally { await Role.collection.replaceOne({ _id: before._id }, before); }
      await RevokedToken.create({ tokenHash: crypto.createHash('sha256').update(tokens.delegated).digest('hex'), userId: actors.delegated._id, expiresAt: new Date(Date.now() + 60000) });
      assert.equal((await request('delegated', 'PUT', `/users/${actors.employee._id}`, { role: 'admin' })).status, 401);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (ownedDatabase) {
      assert.match(database, /^inop_privileges_\d+_[a-f0-9]{12}$/);
      assert.equal(mongoose.connection.host, '127.0.0.1');
      assert.equal(mongoose.connection.name, database);
      await mongoose.connection.db.dropDatabase();
      console.log('Removed only the owned temporary privilege-test database.');
    }
    await mongoose.disconnect();
  }
});
