const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const documents = require('./helpers/cvDocuments.cjs');
const Candidate = require('../models/candidate.model');
const { uploadsDir } = require('../middleware/privateUpload.middleware');
const service = require('../services/cvReview.service');

test('CV concurrent replacement cannot overwrite the newer file or review', async t => {
  let release, entered; const gate = new Promise(r => release = r), started = new Promise(r => entered = r);
  const originalReview = service.reviewForFile;
  service.reviewForFile = async file => { if (file?.originalname === 'slow.pdf') { entered(); await gate; } return originalReview(file); };
  try {
    await withAuditFixture(async h => {
      const c = await Candidate.create({ name: 'Synthetic', role: 'Cashier' });
      let owned;
      async function replace(name, bytes) {
        const form = new FormData(); form.append('cv', new Blob([bytes], { type: name.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), name); form.append('name', name);
        const r = await fetch(h.apiBase + `/candidates/${c._id}`, { method: 'PUT', headers: { Authorization: 'Bearer ' + h.tokens.admin }, body: form });
        return { status: r.status, data: await r.json() };
      }
      try {
        await t.test('late old extraction returns 409 while the newer DOCX remains current', async () => {
          const slow = replace('slow.pdf', await documents.pdf('Name: Slow Applicant'));
          await started;
          const fast = await replace('fast.docx', documents.docx('Name: Current Applicant'));
          assert.equal(fast.status, 200); owned = path.join(uploadsDir, path.basename(fast.data.cvUrl)); release();
          const old = await slow; assert.equal(old.status, 409); assert.equal(old.data.code, 'REVISION_CONFLICT');
          const stored = await Candidate.findById(c._id);
          assert.equal(stored.name, 'fast.docx'); assert.equal(stored.cvUrl, fast.data.cvUrl); assert.equal(stored.cvOriginal.originalName, 'fast.docx'); assert.equal(stored.__v, 1);
        });
        await t.test('explicit stale review revision is 409 without changing any field', async () => {
          const before = await Candidate.findById(c._id).lean();
          const r = await h.request('admin', 'PUT', `/candidates/${c._id}`, { expectedRevision: 0, name: 'Stale edit' });
          assert.equal(r.status, 409); assert.deepEqual(await Candidate.findById(c._id).lean(), before);
        });
        await t.test('legacy missing version accepts first safe update without migration', async () => {
          const legacy = await Candidate.create({ name: 'Legacy', role: 'Cashier' }); await Candidate.collection.updateOne({ _id: legacy._id }, { $unset: { __v: '' } });
          const r = await h.request('admin', 'PUT', `/candidates/${legacy._id}`, { name: 'Updated legacy', expectedRevision: 0 }); assert.equal(r.status, 200); assert.equal(r.data.__v, 1);
        });
      } finally { release(); if (owned) await fs.unlink(owned); }
    });
  } finally { service.reviewForFile = originalReview; release(); }
});
