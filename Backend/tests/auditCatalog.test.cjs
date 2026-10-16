const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Restaurant = require('../models/restaurant.model');
const { getCatalog } = require('../services/auditCatalog.service');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { previewMapping } = require('../services/auditRestaurantMapping.service');

test('Canonical catalog has one parent and exactly three brands', () => {
  const catalog = getCatalog();
  assert.deepEqual(catalog.organizations, [{ id: 'gfc', name: 'GFC' }]);
  assert.deepEqual(catalog.brands.map(b => b.id), ['kfc', 'pizza-hut', 'simit-sarayi']);
  assert.ok(catalog.brands.every(b => b.organizationId === 'gfc'));
  assert.ok(Object.isFrozen(catalog.brands));
});

test('Restaurant document validation accepts legacy and valid optional relations only', async () => {
  for (const pair of [{}, { organizationId: 'gfc' }, { organizationId: 'gfc', brandId: 'kfc' }, { organizationId: null, brandId: null }]) {
    await new Restaurant({ id: 'synthetic', name: 'Synthetic', ...pair }).validate();
  }
  for (const pair of [{ brandId: 'kfc' }, { organizationId: 'foreign', brandId: 'kfc' }, { organizationId: 'gfc', brandId: 'gfc' }, { organizationId: 'gfc', brandId: '' }]) {
    await assert.rejects(new Restaurant({ id: 'synthetic', name: 'Synthetic', ...pair }).validate(), { name: 'ValidationError' });
  }
  assert.equal(Object.hasOwn(new Restaurant({ id: 'legacy', name: 'Legacy' }).toObject(), 'brandId'), false);
});

test('Offline mapping separates suggestions, conflicts, unknowns and orphan links without mutating inputs', () => {
  const input = { restaurants: [
    { id: 'a', name: 'KFC Local' }, { id: 'b', name: 'Pizza Hut Local' }, { id: 'c', name: 'Simit Sarayı Local' },
    { id: 'd', name: 'GFC Office' }, { id: 'e', name: 'KFC Pizza Hut' },
    { id: 'f', name: 'KFC Wrong', organizationId: 'gfc', brandId: 'pizza-hut' },
    { id: 'g', name: 'Linked', organizationId: 'gfc', brandId: 'kfc' },
    { id: 'h', name: 'Unknown brand', organizationId: 'foreign', brandId: 'other' },
    { id: 'dup', name: 'Repeated' }, { id: 'dup', name: 'Repeated' },
  ], audits: [{ id: 'audit-preserved', restaurantId: 'a' }, { id: 'orphan', restaurantId: 'missing' }] };
  const before = structuredClone(input), report = previewMapping(input);
  assert.deepEqual(input, before);
  assert.equal(report.dryRun, true); assert.equal(report.writes, 0);
  assert.deepEqual(report.reviewRequired.map(r => r.candidateBrandIds[0]), ['kfc', 'pizza-hut', 'simit-sarayi']);
  assert.ok(report.unknown.some(r => r.restaurantId === 'd'));
  assert.ok(report.conflicts.some(r => r.issues.includes('ambiguous-name')));
  assert.ok(report.conflicts.some(r => r.issues.includes('name-link-conflict')));
  assert.ok(report.conflicts.some(r => r.issues.includes('invalid-relation')));
  assert.equal(report.conflicts.filter(r => r.issues.includes('duplicate-id')).length, 2);
  assert.deepEqual(report.orphanAudits, [{ auditId: 'orphan', restaurantId: 'missing' }]);
  assert.throws(() => previewMapping({ restaurants: {} }), TypeError);
});

test('Offline CLI reads a synthetic snapshot and leaves it byte-for-byte unchanged', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'inop-mapping-test-'));
  const input = path.join(directory, 'synthetic.json');
  const bytes = JSON.stringify({ restaurants: [{ id: 'fixture', name: 'KFC Test' }] });
  try {
    fs.writeFileSync(input, bytes);
    const output = execFileSync(process.execPath, [path.join(__dirname, '../scripts/previewAuditRestaurantMapping.cjs'), '--input', input], { encoding: 'utf8' });
    const report = JSON.parse(output);
    assert.equal(report.writes, 0); assert.equal(report.reviewRequired.length, 1);
    assert.equal(fs.readFileSync(input, 'utf8'), bytes);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test('Catalog auth and restaurant relationship writes preserve legacy API and audit references', async t => withAuditFixture(async h => {
  const legacy = await Restaurant.create({ id: 'legacy', name: 'Legacy unchanged' });
  const audit = await h.audit('admin', 'service', { restaurantId: legacy.id });
  const before = await Restaurant.findById(legacy._id).lean();
  for (const scope of ['own', 'department', 'assigned', 'none']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { resource: 'restaurant', action: 'read', scope } } });
  for (const actor of ['anonymous', 'hr', 'own', 'department', 'assigned', 'none']) {
    assert.equal((await h.request(actor, 'GET', '/audit-catalog')).status, actor === 'anonymous' ? 401 : 403);
  }
  await h.models.User.updateOne({ _id: h.actors.peer._id }, { $set: { role: 'manager' } });
  for (const actor of ['admin', 'auditor', 'peer']) {
    const response = await h.request(actor, 'GET', '/audit-catalog');
    assert.equal(response.status, 200); assert.deepEqual(response.data.data, actor==='auditor'?{...getCatalog(),brands:[]}:getCatalog());
    assert.equal((await h.request(actor, 'POST', '/audit-catalog', {})).status, 404);
  }
  await h.audit('auditor','service');
  assert.deepEqual((await h.request('auditor','GET','/audit-catalog')).data.data.brands.map(b=>b.id),['kfc']);
  assert.deepEqual(await Restaurant.findById(legacy._id).lean(), before);
  assert.equal(Object.hasOwn((await h.request('admin', 'GET', '/restaurants/legacy')).data, 'brandId'), false);
  for (const invalid of [{ brandId: 'kfc' }, { organizationId: 'foreign' }, { organizationId: 'gfc', brandId: 'gfc' }]) {
    assert.equal((await h.request('admin', 'POST', '/restaurants', { id: 'invalid', name: 'Invalid', ...invalid })).status, 400);
    assert.equal((await h.request('admin', 'PUT', '/restaurants/legacy', invalid)).status, 400);
    assert.deepEqual(await Restaurant.findById(legacy._id).lean(), before);
  }
  const link = await h.request('admin', 'PUT', '/restaurants/legacy', { organizationId: 'gfc', brandId: 'kfc' });
  assert.equal(link.status, 200); assert.equal(link.data.id, 'legacy'); assert.equal(link.data.brandId, 'kfc');
  assert.equal((await h.request('admin', 'PUT', '/restaurants/legacy', { brandId: 'pizza-hut' })).status, 200);
  assert.equal((await h.request('admin', 'PUT', '/restaurants/legacy', { organizationId: null })).status, 400);
  assert.equal((await h.request('admin', 'PUT', '/restaurants/legacy', { id: 'renamed' })).status, 400);
  assert.equal((await h.request('admin', 'PUT', '/restaurants/legacy', { name: 'Renamed label' })).status, 200);
  assert.equal((await h.request('admin', 'PUT', '/restaurants/legacy', { organizationId: null, brandId: null })).status, 200);
  assert.equal((await h.request('admin', 'POST', '/restaurants', { id: 'valid', name: 'New', organizationId: 'gfc', brandId: 'simit-sarayi' })).status, 201);
  assert.equal((await h.models.Audit.findById(audit._id)).restaurantId, legacy.id);
  await t.test('Query writes cannot bypass cross-field relation validation', async () => {
    await assert.rejects(Restaurant.updateOne({ id: 'valid' }, { $unset: { organizationId: 1 } }), { name: 'ValidationError' });
    await assert.rejects(Restaurant.findOneAndUpdate({ id: 'valid' }, { $set: { brandId: 'kfc' } }), { name: 'ValidationError' });
    await assert.rejects(Restaurant.updateOne({ id: 'valid' }, { $rename: { name: 'brandId' }, $set: { organizationId: 'gfc', brandId: 'kfc' } }), { name: 'ValidationError' });
    await assert.rejects(Restaurant.updateMany({}, { $set: { organizationId: 'wrong', brandId: 'kfc' } }), { name: 'ValidationError' });
  });
  await t.test('A concurrent relationship change returns 409 instead of overwriting it', async () => {
    const original = Restaurant.findOneAndUpdate;
    let changed = false;
    Restaurant.findOneAndUpdate = function (filter, update, options) {
      if (!changed && filter.id === 'valid' && Object.hasOwn(update.$set, 'brandId')) {
        changed = true;
        return Restaurant.updateOne({ id: 'valid' }, { $set: { organizationId: 'gfc', brandId: 'kfc' } })
          .then(() => original.call(this, filter, update, options));
      }
      return original.call(this, filter, update, options);
    };
    try {
      assert.equal((await h.request('admin', 'PUT', '/restaurants/valid', { brandId: 'pizza-hut' })).status, 409);
      assert.equal((await Restaurant.findOne({ id: 'valid' })).brandId, 'kfc');
    } finally { Restaurant.findOneAndUpdate = original; }
  });
  await h.models.Role.updateOne({ key: 'auditor' }, { $pull: { permissions: { resource: 'restaurant' } } });
  assert.equal((await h.request('auditor', 'GET', '/audit-catalog')).status, 403);
}));
