const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model');
const Candidate = require('../models/candidate.model');
const Application = require('../models/application.model');
const { uploadsDir } = require('../middleware/privateUpload.middleware');

test('HR parent resources keep independent read scopes', async t => withAuditFixture(async h => {
  const owner = h.actors.own._id, foreign = h.actors.foreign._id;
  const provenance = { createdBy: foreign, assignedTo: foreign, departmentId: 'dep_B' };
  const job = await Job.create({ title: 'Foreign vacancy', department: 'Operations', description: 'Private long description', ...provenance });
  const candidate = await Candidate.create({ name: 'Foreign candidate', role: 'Cashier', email: 'private@example.invalid', cvUrl: '/uploads/private-test.pdf', ...provenance });
  const app = await Application.create({ jobId: job._id, candidateId: candidate._id, createdBy: owner, assignedTo: owner, departmentId: 'dep_A' });
  async function grants(candidateScope, jobScope, appScope = 'all') {
    const permissions = [
      { resource: 'candidate', action: 'create', scope: 'all' },
      { resource: 'application', action: '*', scope: appScope },
    ];
    if (candidateScope !== 'missing') permissions.push({ resource: 'candidate', action: 'read', scope: candidateScope });
    if (jobScope !== 'missing') permissions.push({ resource: 'recruitment', action: 'read', scope: jobScope });
    await h.models.Role.updateOne({ key: 'test_own' }, { $set: { permissions } });
  }
  for (const appScope of ['all', 'own', 'department', 'assigned']) {
    for (const candidateScope of ['all', 'own', 'department', 'assigned']) {
      for (const jobScope of ['all', 'own', 'department', 'assigned']) {
        await t.test(`${appScope} application / ${candidateScope} candidate / ${jobScope} job`, async () => {
          await grants(candidateScope, jobScope, appScope);
          for (const endpoint of ['/applications', `/applications/${app._id}`]) {
            const r = await h.request('own', 'GET', endpoint);
            assert.equal(r.status, 200);
            const data = Array.isArray(r.data) ? r.data.find(a => a._id === String(app._id)) : r.data;
            assert.ok(data);
            assert.equal(Boolean(data.candidateId), candidateScope === 'all');
            assert.equal(Boolean(data.jobId), jobScope === 'all');
            if (data.candidateId) assert.equal(data.candidateId.cvUrl, undefined);
            if (data.jobId) assert.equal(data.jobId.description, undefined);
          }
        });
      }
    }
  }
  for (const scope of ['none', 'missing']) await t.test(`${scope} parent grant redacts data`, async () => {
    await grants(scope, scope);
    const r = await h.request('own', 'GET', `/applications/${app._id}`);
    assert.equal(r.status, 200); assert.equal(r.data.candidateId, null); assert.equal(r.data.jobId, null);
  });
  await t.test('department grant without user department fails closed for parents', async () => {
    await grants('department', 'department');
    await h.models.User.updateOne({ _id: owner }, { departmentId: '' });
    try {
      const r = await h.request('own', 'GET', `/applications/${app._id}`);
      assert.equal(r.status, 200); assert.equal(r.data.candidateId, null); assert.equal(r.data.jobId, null);
    } finally { await h.models.User.updateOne({ _id: owner }, { departmentId: 'dep_A' }); }
  });
  for (const scope of ['own', 'department', 'assigned']) await t.test(`${scope} parents are visible when their own relationship matches`, async () => {
    const related = { createdBy: owner, assignedTo: owner, departmentId: 'dep_A' };
    const j = await Job.create({ title: 'Related vacancy', department: 'Operations', description: 'Long private text', ...related });
    const c = await Candidate.create({ name: 'Related candidate', role: 'Cashier', ...related });
    const a = await Application.create({ jobId: j._id, candidateId: c._id, ...related });
    await grants(scope, scope, scope);
    const r = await h.request('own', 'GET', `/applications/${a._id}`);
    assert.equal(r.status, 200); assert.equal(r.data.jobId.title, j.title); assert.equal(r.data.candidateId.name, c.name);
    await Job.updateOne({ _id: j._id }, provenance); await Candidate.updateOne({ _id: c._id }, provenance);
    const revoked = await h.request('own', 'GET', `/applications/${a._id}`);
    assert.equal(revoked.data.jobId, null); assert.equal(revoked.data.candidateId, null);
  });
  const foreignParent = await Candidate.create({ name: 'Foreign application candidate', role: 'Cashier', ...provenance });
  const foreignApp = await Application.create({ jobId: job._id, candidateId: foreignParent._id, ...provenance });
  for (const scope of ['own', 'department', 'assigned']) await t.test(`${scope} application scope still denies a foreign application even with all parent grants`, async () => {
    await grants('all', 'all', scope);
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const url = `/applications/${foreignApp._id}` + (method === 'PATCH' ? '/status' : '');
      assert.equal((await h.request('own', method, url, method === 'PATCH' ? { status: 'Screening' } : undefined)).status, 404);
    }
  });
  await t.test('PDF candidate own grant is not overwritten by application all', async () => {
    await grants('own', 'all');
    assert.equal((await h.request('own', 'GET', `/candidate-export/${candidate._id}/pdf`)).status, 404);
  });
  await t.test('PDF candidate all grant is not narrowed by application own', async () => {
    await grants('all', 'own', 'own');
    const r = await h.request('own', 'GET', `/candidate-export/${candidate._id}/pdf`);
    assert.equal(r.status, 200); assert.equal(r.headers['content-type'], 'application/pdf');
  });
  for (const resource of ['candidate', 'job']) await t.test(`create cannot use application all to bypass ${resource} own`, async () => {
    await grants(resource === 'candidate' ? 'own' : 'all', resource === 'job' ? 'own' : 'all');
    const r = await h.request('own', 'POST', '/applications', { jobId: job._id, candidateId: candidate._id });
    assert.equal(r.status, 404);
  });
  await t.test('application create own does not narrow allowed all parents; provenance is server-owned', async () => {
    const another = await Candidate.create({ name: 'Another candidate', role: 'Cashier', ...provenance });
    await grants('all', 'all', 'own');
    const r = await h.request('own', 'POST', '/applications', { jobId: job._id, candidateId: another._id, createdBy: foreign, assignedTo: foreign, departmentId: 'dep_B' });
    assert.equal(r.status, 201); assert.equal(r.data.createdBy, String(owner)); assert.equal(r.data.departmentId, 'dep_A');
    assert.equal(r.data.candidateId.name, another.name); assert.equal(r.data.jobId.title, job.title);
  });
  await t.test('status update response cannot expose parents without read grants', async () => {
    await grants('none', 'none');
    const r = await h.request('own', 'PATCH', `/applications/${app._id}/status`, { status: 'Screening' });
    assert.equal(r.status, 200); assert.equal(r.data.candidateId, null); assert.equal(r.data.jobId, null);
  });
  await t.test('same JWT sees parent grant revocation immediately', async () => {
    await grants('all', 'all');
    assert.ok((await h.request('own', 'GET', `/applications/${app._id}`)).data.candidateId);
    await grants('own', 'own');
    const r = await h.request('own', 'GET', `/applications/${app._id}`);
    assert.equal(r.data.candidateId, null); assert.equal(r.data.jobId, null);
  });
  for (const actor of ['admin', 'hr']) await t.test(`${actor} legal list/detail/create/update/PDF workflow`, async () => {
    const c = await Candidate.create({ name: `Allowed ${actor}`, role: 'Cashier', ...provenance });
    const r = await h.request(actor, 'POST', '/applications', { jobId: job._id, candidateId: c._id });
    assert.equal(r.status, 201); assert.equal(r.data.candidateId.name, c.name);
    assert.equal((await h.request(actor, 'GET', `/applications/${r.data._id}`)).status, 200);
    assert.equal((await h.request(actor, 'PATCH', `/applications/${r.data._id}/status`, { status: 'Shortlisted' })).status, 200);
    assert.equal((await h.request(actor, 'GET', `/candidate-export/${c._id}/pdf`)).status, 200);
    assert.equal((await h.request(actor, 'DELETE', `/applications/${r.data._id}`)).status, 200);
  });
  await t.test('anonymous 401 and missing application permission 403', async () => {
    assert.equal((await h.request('anonymous', 'GET', '/applications')).status, 401);
    assert.equal((await h.request('none', 'GET', '/applications')).status, 403);
  });
  await t.test('CV pipeline cannot read foreign Job through application create all', async () => {
    await grants('all', 'own');
    const doc = new PDFDocument(), chunks = [];
    const ready = new Promise(resolve => { doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); });
    doc.text('Synthetic Applicant\nCashier\nsynthetic@example.invalid'); doc.end();
    const form = new FormData(); form.append('cv', new Blob([await ready], { type: 'application/pdf' }), 'synthetic.pdf');
    form.append('jobId', String(job._id)); form.append('name', 'Synthetic'); form.append('role', 'Cashier');
    const r = await fetch(h.apiBase + '/candidates/from-cv', { method: 'POST', headers: { Authorization: 'Bearer ' + h.tokens.own }, body: form });
    const data = await r.json();
    // Only a file just created by this test may be removed if the vulnerable baseline accepted it.
    if (r.status === 201 && /^\/uploads\/[a-f0-9-]{36}\.pdf$/.test(data.candidate?.cvUrl || data.cvUrl || '')) {
      await fs.unlink(path.join(uploadsDir, path.basename(data.candidate?.cvUrl || data.cvUrl)));
    }
    assert.equal(r.status, 404);
    assert.equal(await Candidate.countDocuments({ name: 'Synthetic' }), 0);
  });
}));
