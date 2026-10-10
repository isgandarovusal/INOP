const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const Candidate = require('../../Backend/models/candidate.model');
const Application = require('../../Backend/models/application.model');
const PDFDocument = require('node:module').createRequire(path.resolve(__dirname, '../../Backend/package.json'))('pdfkit');
const { uploadsDir } = require('../../Backend/middleware/privateUpload.middleware');
const harness = `
import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,useNavigate} from 'react-router-dom';
import api from '/src/api/axios.ts';import * as jobs from '/src/Services/jobsService.ts';import * as candidates from '/src/Services/candidatesService.ts';import * as applications from '/src/Services/applicationsService.ts';
api.defaults.baseURL='/api';window.hr={jobs,candidates,applications};
function App(){window.navigateTest=useNavigate();return React.createElement('div',null,'HR contracts');}
createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(App)));
`;
test('HR services preserve IDs, partial updates, new status and CV replacement', async t => withBrowserFixture(harness, async h => {
  await h.open('admin', '/hr-contracts');
  const result = await h.page.evaluate(async () => {
    const { jobs, candidates, applications } = window.hr;
    const job = await jobs.createJob({ position: 'Cashier', department: 'Operations', location: 'Baku', type: 'Part-time', description: 'Synthetic job', requiredSkills: ['Cash handling'], preferredSkills: ['Customer service'], experience: 0, status: 'draft' });
    const candidate = await candidates.createCandidate({ name: 'Synthetic applicant', role: 'Cashier', status: 'new', skills: ['Cash handling'], experience: 0 });
    const app = await applications.createApplication({ jobId: job.id, candidateId: candidate.id });
    const updatedJob = await jobs.updateJob(job.id, { description: 'Only this field changes' });
    const cv = new File(['%PDF-1.4\nSynthetic replacement\n%%EOF'], 'replacement.pdf', { type: 'application/pdf' });
    const replaced = await candidates.updateCandidate(candidate.id, { cvFile: cv, skills: ['Cash handling', 'Food safety'], languages: [], name: 'Reviewed applicant' });
    const listed = await applications.getApplications();
    const detail = await applications.getApplicationById(app.id);
    return { job, candidate, app, updatedJob, replaced, listed, detail };
  });
  try {
    await t.test('vacancy CV service uses canonical pipeline and creates a linked Application', async () => {
      const doc = new PDFDocument(), chunks = [];
      const ready = new Promise(resolve => { doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); });
      doc.text('Synthetic Pipeline Applicant\nCashier\npipeline@example.invalid'); doc.end();
      let linked;
      try {
        linked = await h.page.evaluate(async ({ jobId, bytes }) => window.hr.candidates.createCandidate({
          jobId, name: 'Reviewed pipeline applicant', role: 'Cashier', status: 'new',
          cvFile: new File([new Uint8Array(bytes)], 'pipeline.pdf', { type: 'application/pdf' }),
        }), { jobId: result.job.id, bytes: [...await ready] });
        assert.equal(linked.name, 'Reviewed pipeline applicant'); assert.equal(linked.status, 'new');
        assert.equal(await Application.countDocuments({ candidateId: linked.id, jobId: result.job.id }), 1);
      } finally {
        if (/^\/uploads\/[a-f0-9-]{36}\.pdf$/.test(linked?.cvUrl || '')) await fs.unlink(path.join(uploadsDir, path.basename(linked.cvUrl)));
      }
    });
    await t.test('populated parents have stable normalized id and title/position', () => {
      for (const a of [result.app, result.detail, result.listed.find(a => a.id === result.app.id)]) {
        assert.equal(a.jobId.id, result.job.id); assert.equal(a.jobId.position, 'Cashier');
        assert.equal(a.candidateId.id, result.candidate.id); assert.equal(a.candidateId.status, 'new');
      }
    });
    await t.test('partial Job update preserves fields, zero experience and timestamps', () => {
      const j = result.updatedJob;
      assert.equal(j.department, 'Operations'); assert.equal(j.location, 'Baku'); assert.equal(j.type, 'Part-time');
      assert.equal(j.experience, 0); assert.equal(j.status, 'draft'); assert.deepEqual(j.preferredSkills, ['Customer service']);
      assert.ok(j.createdAt); assert.ok(j.updatedAt);
    });
    await t.test('CV replacement persists with arrays and does not change new status', async () => {
      const c = await Candidate.findById(result.candidate.id);
      assert.equal(c.name, 'Reviewed applicant'); assert.equal(c.status, 'new');
      assert.deepEqual(c.skills.toObject(), ['Cash handling', 'Food safety']); assert.deepEqual(c.languages.toObject(), []);
      assert.match(c.cvUrl, /^\/uploads\/[a-f0-9-]{36}\.pdf$/);
      assert.match(await fs.readFile(path.join(uploadsDir, path.basename(c.cvUrl)), 'utf8'), /Synthetic replacement/);
    });
    await t.test('legacy JSON edit remains compatible and keeps the stored CV', async () => {
      const r = await h.request('admin', 'PUT', `/candidates/${result.candidate.id}`, { phone: '+994501234567' });
      assert.equal(r.status, 200); assert.equal(r.data.cvUrl, result.replaced.cvUrl); assert.equal(r.data.status, 'new');
    });
    await t.test('dashboard summary preserves new instead of mapping it to applied', async () => {
      const r = await h.request('admin', 'GET', '/candidates/dashboard-summary');
      assert.equal(r.status, 200); assert.ok(r.data.statusBreakdown.some(s => s.status === 'new' && s.value === 2));
      assert.equal(r.data.statusBreakdown.some(s => s.status === 'applied'), false);
    });
    await t.test('scope-denied parents stay null in frontend normalization', async () => {
      await h.models.Role.updateOne({ key: 'test_own' }, { $push: { permissions: { resource: 'application', action: 'read', scope: 'all' } } });
      await h.open('own', '/hr-contracts');
      const data = await h.page.evaluate(id => window.hr.applications.getApplicationById(id), result.app.id);
      assert.equal(data.candidateId, null); assert.equal(data.jobId, null);
    });
    await t.test('foreign CV replacement cannot bypass Candidate update scope', async () => {
      await h.models.Role.updateOne({ key: 'test_own' }, { $push: { permissions: { resource: 'candidate', action: 'update', scope: 'own' } } });
      const original = await Candidate.findById(result.candidate.id).lean();
      const denied = await h.page.evaluate(async id => {
        try { await window.hr.candidates.updateCandidate(id, { name: 'Forbidden', cvFile: new File(['%PDF-1.4\nForbidden\n%%EOF'], 'denied.pdf', { type: 'application/pdf' }) }); return 200; }
        catch(e) { return e.response?.status; }
      }, result.candidate.id);
      assert.equal(denied, 404); assert.deepEqual(await Candidate.findById(result.candidate.id).lean(), original);
    });
    assert.deepEqual(h.pageErrors, []);
  } finally {
    // Remove only this test's UUID upload; preserve every pre-existing upload.
    if (/^\/uploads\/[a-f0-9-]{36}\.pdf$/.test(result.replaced.cvUrl)) await fs.unlink(path.join(uploadsDir, path.basename(result.replaced.cvUrl)));
  }
}));
