const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');

test('Analytics scoped branch catalog resolves while the independent overview aggregate is pending', async () => withAuditFixture(async h => {
  const branch = (await h.request('admin', 'POST', '/hr/branches', { code: 'concurrency-test', name: 'Synthetic branch', brandId: 'kfc', kind: 'restaurant' })).data;
  assert.ok(branch._id);
  assert.equal((await h.request('admin', 'POST', '/jobs', { title: 'Synthetic catalog timing', description: 'Synthetic only', department: 'HR', brandId: 'kfc', branchId: branch._id })).status, 201);
  const aggregateExec = h.mongoose.Aggregate.prototype.exec, queryExec = h.mongoose.Query.prototype.exec;
  let release, catalogReady, started, holding = false;
  const gate = new Promise(resolve => { release = resolve; });
  const captured = new Promise(resolve => { catalogReady = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  h.mongoose.Aggregate.prototype.exec = async function (...args) {
    if (this._model?.modelName === 'Application') { holding = true; started(); await gate; }
    return aggregateExec.apply(this, args);
  };
  h.mongoose.Query.prototype.exec = async function (...args) {
    const data = await queryExec.apply(this, args);
    if (this.model?.modelName === 'RecruitmentBranch' && holding) catalogReady();
    return data;
  };
  let timer, request;
  try {
    request = h.request('admin', 'GET', '/hr/analytics/overview');
    await entered;
    await Promise.race([captured, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Branch catalog waited for the unrelated aggregate')), 2000); })]);
    release(); const response = await request;
    assert.equal(response.status, 200);
    assert.equal(response.data.options.branches.length, 1);
    assert.equal(response.data.options.branches[0].id, String(branch._id));
    assert.equal(response.data.totals.applications, 0);
  } finally {
    clearTimeout(timer); release(); if (request) await request;
    h.mongoose.Aggregate.prototype.exec = aggregateExec; h.mongoose.Query.prototype.exec = queryExec;
  }
}));
