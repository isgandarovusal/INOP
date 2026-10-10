const test = require('node:test'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), fs = require('node:fs/promises'), path = require('node:path');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const documents = require('./helpers/cvDocuments.cjs');
const Candidate = require('../models/candidate.model'), Job = require('../models/job.model');
const { uploadsDir } = require('../middleware/privateUpload.middleware');

test('CV extraction/review preserves unknowns, source metadata and server authorization', async t => withAuditFixture(async h => {
  const owned = [];
  async function upload(actor, endpoint, bytes, filename, fields, method = 'POST') {
    const form = new FormData(); form.append('cv', new Blob([bytes], { type: filename.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), filename);
    for (const [key, value] of Object.entries(fields || {})) form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    const r = await fetch(h.apiBase + endpoint, { method, headers: h.tokens[actor] ? { Authorization: 'Bearer ' + h.tokens[actor] } : {}, body: form });
    const data = await r.json(); const candidate = data.candidate || data;
    if (r.status < 400 && /^\/uploads\/[a-f0-9-]{36}\.(pdf|docx)$/.test(candidate.cvUrl || '')) owned.push(path.join(uploadsDir, path.basename(candidate.cvUrl)));
    return { status: r.status, data };
  }
  try {
    for (const [language, text, name] of [
      ['az', 'Ad soyad: Əli Məmmədov\nTelefon: +994 (50) 123-45-67\nVəzifə: Kassir\nBacarıqlar\nHACCP, qida təhlükəsizliyi', 'Əli Məmmədov'],
      ['en', 'Name: Jane Smith\nPhone: +994-50-123-45-67\nPosition: Cashier\nSkills\nFood safety, HACCP', 'Jane Smith'],
      ['ru', 'ФИО: Иван Петров\nТелефон: 0(50)1234567\nДолжность: Кассир\nНавыки\nПищевая безопасность, HACCP', 'Иван Петров'],
    ]) await t.test(`${language} real DOCX extraction to DTO preserves phone and unknown years`, async () => {
      const r = await upload('admin', '/candidates/parse-cv', documents.docx(text), 'synthetic.docx');
      assert.equal(r.status, 200); assert.equal(r.data.name, name); assert.equal(r.data.phone, '+994501234567');
      assert.equal(r.data.experience, null); assert.equal(r.data.extraction.provider, 'rule-based');
      assert.ok(r.data.skills.includes('Food safety')); assert.ok(r.data.extraction.fields.phone.evidence.length);
    });
    await t.test('partial extraction is explicit in parse response and persisted HR review', async () => {
      const bytes = documents.docx('A'.repeat(150000));
      const parsed = await upload('admin', '/candidates/parse-cv', bytes, 'bounded.docx');
      assert.equal(parsed.status, 200); assert.equal(parsed.data.rawText.length, 100000);
      assert.ok(parsed.data.extraction.warnings.includes('text_limit'));
      const saved = await upload('admin', '/candidates', bytes, 'bounded.docx', { name: 'Manual review required', role: 'Cashier' });
      assert.equal(saved.status, 201); assert.ok(saved.data.cvReview.warnings.includes('text_limit'));
      assert.equal(saved.data.cvReview.reviewStatus, 'pending');
      const original = await h.request('admin', 'GET', `/candidates/${saved.data._id}/cv`);
      assert.equal(original.status, 200); assert.deepEqual(original.buffer, bytes);
    });
    await t.test('busy document queue returns safe retryable 503 before accepting another upload', async () => {
      const { pool } = require('../services/documentWorkerPool.service'); const signal = new AbortController();
      const bytes = documents.docx('A'.repeat(150000));
      const pending = Array.from({ length: 9 }, () => pool.run('extract', bytes, 'bounded.docx', { signal: signal.signal }));
      const settled = Promise.allSettled(pending);
      try {
        const result = await upload('admin', '/candidates/parse-cv', bytes, 'bounded.docx');
        assert.equal(result.status, 503); assert.equal(result.data.code, 'DOCUMENT_BUSY');
        assert.equal(result.data.success, false); assert.ok(!JSON.stringify(result.data).includes('A'.repeat(50)));
      } finally { signal.abort(); await settled; }
    });
    let candidate;
    const bytes = await documents.pdf('Name: Synthetic Applicant\nPhone: +994 (50) 123-45-67\nSkills\nFood safety');
    await t.test('server persists original metadata/evidence; client cannot forge provenance/confidence', async () => {
      const r = await upload('admin', '/candidates', bytes, 'original.pdf', { name: 'Reviewed name', role: 'Cashier', phone: '+994 (50) 123-45-67', cvReview: { version: 'forged', reviewStatus: 'confirmed' }, createdBy: String(h.actors.foreign._id) });
      assert.equal(r.status, 201); candidate = r.data;
      assert.equal(candidate.experience, null); assert.equal(candidate.phone, '+994501234567'); assert.equal(candidate.phoneRaw, '+994 (50) 123-45-67');
      assert.equal(candidate.cvOriginal.originalName, 'original.pdf'); assert.equal(candidate.cvOriginal.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
      assert.equal(candidate.cvReview.version, 'rules-2'); assert.equal(candidate.cvReview.reviewStatus, 'pending'); assert.equal(candidate.createdBy, String(h.actors.admin._id));
      assert.ok(candidate.cvReview.fields.phone.evidence.length);
    });
    await t.test('HR can correct all fields, history and confirm review without forging extraction', async () => {
      const history = [{ raw: 'Source evidence', organization: 'Reviewed employer', title: 'Cashier', start: { year: 2020, month: null }, end: { year: 2024, month: null }, ongoing: false }];
      const r = await h.request('admin', 'PUT', `/candidates/${candidate._id}`, { name: 'Edited name', phone: '0(50)1234567', experience: 0, education: 'Reviewed education', languages: ['Azerbaijani'], certificates: ['HACCP'], employmentHistory: history, educationHistory: [], reviewStatus: 'confirmed', cvReview: { version: 'forged' } });
      assert.equal(r.status, 200); assert.equal(r.data.experience, 0); assert.equal(r.data.phone, '+994501234567'); assert.deepEqual(r.data.employmentHistory, history);
      assert.equal(r.data.cvReview.reviewStatus, 'confirmed'); assert.equal(r.data.cvReview.version, 'rules-2'); assert.equal(r.data.cvReview.reviewedBy, String(h.actors.admin._id));
    });
    await t.test('unknown experience remains null; real zero and legacy zero stay readable', async () => {
      const r = await h.request('admin', 'PUT', `/candidates/${candidate._id}`, { experience: null }); assert.equal(r.status, 200); assert.equal(r.data.experience, null);
      const legacy = await Candidate.create({ name: 'Legacy', role: 'Cashier', experience: 0 });
      assert.equal((await h.request('admin', 'GET', `/candidates/${legacy._id}`)).data.experience, 0);
    });
    await t.test('list projection excludes extraction evidence/history while detail remains authorized', async () => {
      const r = await h.request('admin', 'GET', '/candidates');
      const row = r.data.find(c => c._id === candidate._id); assert.equal(row.cvReview.fields, undefined); assert.equal(row.employmentHistory, undefined);
      assert.equal((await h.request('own', 'GET', `/candidates/${candidate._id}`)).status, 403);
    });
    await t.test('CV replacement resets review and refreshes server hash; existing old file is preserved', async () => {
      const replacement = documents.docx('Name: Replacement Applicant\nPhone: +994501234567');
      const oldPath = path.join(uploadsDir, path.basename(candidate.cvUrl));
      const r = await upload('admin', `/candidates/${candidate._id}`, replacement, 'replacement.docx', { name: 'New review', phone: '+994501234567' }, 'PUT');
      assert.equal(r.status, 200); assert.notEqual(r.data.cvUrl, candidate.cvUrl); assert.equal(r.data.cvReview.reviewStatus, 'pending');
      assert.equal(r.data.cvOriginal.sha256, crypto.createHash('sha256').update(replacement).digest('hex')); await fs.access(oldPath);
    });
    await t.test('image-only PDF explicitly requires OCR; original is retained with unsupported status', async () => {
      const scan = await documents.pdf('');
      const parsed = await upload('admin', '/candidates/parse-cv', scan, 'scan.pdf'); assert.equal(parsed.status, 422); assert.equal(parsed.data.code, 'OCR_REQUIRED');
      const r = await upload('admin', '/candidates', scan, 'scan.pdf', { name: 'Manual scan review', role: 'Cashier' });
      assert.equal(r.status, 201); assert.equal(r.data.cvReview.processingStatus, 'unsupported_ocr'); assert.equal(r.data.experience, null);
      const file = await h.request('admin', 'GET', `/candidates/${r.data._id}/cv`); assert.equal(file.status, 200); assert.deepEqual(file.buffer, scan);
    });
    await t.test('CV pipeline preserves cleared optional fields and manually reviewed history', async () => {
      const job = await Job.create({ title: 'Cashier', description: 'Synthetic', department: 'Operations' });
      const history = [{ raw: '', organization: 'Reviewed', title: null, start: { year: 2021, month: null }, end: null, ongoing: true }];
      const r = await upload('admin', '/candidates/from-cv', documents.docx('Name: Parsed Person\nEmail: old@example.invalid\nExperience: 5 years'), 'pipeline.docx', { name: 'Reviewed person', role: 'Cashier', jobId: String(job._id), email: '', experience: '', employmentHistory: history });
      assert.equal(r.status, 201); assert.equal(r.data.candidate.email, ''); assert.equal(r.data.candidate.experience, null); assert.deepEqual(r.data.candidate.employmentHistory, history);
    });
    for (const body of [{ reviewStatus: 'approved-by-ai' }, { employmentHistory: [{ raw: 'x', start: { year: 2020, month: 14 } }] }, { educationHistory: [{ start: { year: 2025 }, end: { year: 2020 } }] }]) await t.test('invalid review/history is 400 and cannot mutate the record', async () => {
      const before = await Candidate.findById(candidate._id).lean(); assert.equal((await h.request('admin', 'PUT', `/candidates/${candidate._id}`, body)).status, 400); assert.deepEqual(await Candidate.findById(candidate._id).lean(), before);
    });
    for (const actor of ['anonymous', 'none', 'hr']) await t.test(`${actor} review permission boundary`, async () => {
      assert.equal((await h.request(actor, 'PUT', `/candidates/${candidate._id}`, { name: 'Permitted review' })).status, actor === 'anonymous' ? 401 : actor === 'none' ? 403 : 200);
    });
  } finally { for (const filename of new Set(owned)) await fs.unlink(filename).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}));
