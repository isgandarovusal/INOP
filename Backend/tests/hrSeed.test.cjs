const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const jwt = require('jsonwebtoken');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');

test('HR seed creates canonical roles and never repairs existing accounts implicitly', async t => {
  await withAuditFixture(async h => {
    const source = fs.readFileSync(path.join(__dirname, '../scripts/seedUsers.js'), 'utf8');
    // Fixture credentials stay in memory; neither values nor seed output are logged.
    const inputs = vm.runInNewContext(source.slice(source.indexOf('const users ='), source.indexOf('async function seedUsers()')) + '\nusers;', {}, { timeout: 1000 });
    const hr = inputs.find(user => user.position === 'HR Manager');
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'inop-hr-seed-'));
    const run = () => execFile(process.execPath, [path.join(__dirname, '../scripts/seedUsers.js')], {
      cwd, env: { ...process.env, MONGO_URI: `mongodb://127.0.0.1:27017/${h.mongoose.connection.name}`, CS: '', SMTP_HOST: '' }, timeout: 30000,
    });
    try {
      await t.test('new seed uses an existing active canonical HR role', async () => {
        assert.equal(hr.role, 'hr_manager');
        assert.ok(await h.models.Role.exists({ key: hr.role, isActive: true }));
        await run();
        assert.equal((await h.models.User.findOne({ email: hr.email })).role, 'hr_manager');
      });
      await t.test('login and server role lookup grant HR recruitment without privilege authority', async () => {
        const login = await h.request('anonymous', 'POST', '/auth/login', { email: hr.email, password: hr.password });
        assert.equal(login.status, 200);
        const user = await h.models.User.findOne({ email: hr.email });
        const token = jwt.sign({ id: String(user._id), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const get = async endpoint => {
          const res = await fetch(h.apiBase + endpoint, { headers: { Authorization: `Bearer ${token}` } });
          return { status: res.status, data: await res.json() };
        };
        assert.equal((await get('/candidates')).status, 200);
        assert.equal((await get('/roles')).status, 403);
        const me = await get('/auth/me');
        assert.equal(me.status, 200);
        assert.equal(me.data.role || me.data.user?.role, 'hr_manager');
      });
      await t.test('second seed preserves all accounts and credentials; legacy hr is not bulk migrated', async () => {
        const hrUser = await h.models.User.findOne({ email: hr.email });
        await h.models.User.updateOne({ _id: hrUser._id }, { $set: { role: 'hr', name: 'Locally edited HR' } });
        const before = await h.models.User.find().select('+password').sort({ _id: 1 }).lean();
        await run();
        const after = await h.models.User.find().select('+password').sort({ _id: 1 }).lean();
        assert.deepEqual(after, before);
      });
    } finally {
      // This newly created directory contains no application or database data.
      fs.rmdirSync(cwd);
    }
  });
});
