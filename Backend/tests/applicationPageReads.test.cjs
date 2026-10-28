const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model'), Candidate = require('../models/candidate.model'), Application = require('../models/application.model');

test('Empty Application pages preserve authorization/counts without empty parent batches', async t => withAuditFixture(async h => {
  let operations = [];
  h.mongoose.set('debug', (collection, method) => operations.push(`${collection}.${method}`));
  const read = async (actor, suffix = '') => {
    operations = [];
    const response = await h.request(actor, 'GET', '/hr/v2/applications?pageSize=30' + suffix);
    return { response, operations: [...operations] };
  };
  try {
    for (const suffix of ['', '&q=absent', '&brandId=simit-sarayi']) await t.test(`Empty ${suffix || 'initial'} page`, async () => {
      const result = await read('admin', suffix);
      assert.equal(result.response.status, 200);
      assert.deepEqual(result.response.data.items, []);
      assert.equal(result.response.data.total, 0);
      assert.equal(result.response.data.hasMore, false);
      assert.equal(result.response.data.nextCursor, null);
      assert.ok(result.operations.includes('users.findOne'));
      assert.ok(result.operations.includes('roles.findOne'));
      assert.ok(!result.operations.some(op => /^(jobs|candidates|recruitmentbrands|recruitmentbranches)\./.test(op)));
      if (suffix) assert.ok(!result.operations.includes('applications.find'));
    });
    await t.test('Denied permission is not converted into an empty success', async () => {
      assert.equal((await read('none')).response.status, 403);
    });
    const provenance = { createdBy: h.actors.admin._id, departmentId: 'dep_A' };
    const job = await Job.create({ title: 'Synthetic vacancy', description: 'Synthetic duties', department: 'HR', ...provenance });
    const candidate = await Candidate.create({ name: 'Synthetic applicant', role: 'Cashier', ...provenance });
    await Application.create({ jobId: job._id, candidateId: candidate._id, ...provenance });
    await t.test('Nonempty response retains independent display and current scoring parent reads', async () => {
      const result = await read('admin');
      assert.equal(result.response.status, 200);
      assert.equal(result.response.data.total, 1);
      assert.equal(result.response.data.items[0].jobId.title, job.title);
      assert.equal(result.response.data.items[0].candidateId.name, candidate.name);
      for (const model of ['jobs', 'candidates']) assert.equal(result.operations.filter(op => op === model + '.find').length, 2);
    });
    await t.test('Out-of-range empty page preserves the actual total', async () => {
      const result = await read('admin', '&page=2');
      assert.equal(result.response.data.total, 1);
      assert.deepEqual(result.response.data.items, []);
      assert.ok(!result.operations.includes('jobs.find'));
      assert.ok(!result.operations.includes('candidates.find'));
    });
  } finally { h.mongoose.set('debug', false); }
}));
