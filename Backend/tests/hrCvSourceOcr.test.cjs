const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { withAuditFixture } = require('./helpers/auditFixture.cjs'), { scanned } = require('./helpers/scannedCv.cjs');
const Source = require('../models/hrCvIntake.model'), Candidate = require('../models/candidate.model');
const { createIntake } = require('../services/hrCvIntake.service'), { createOcrEngine } = require('../services/hrCvOcrEngine.service');
const { directory } = require('../scripts/prepareOcrTestModels.cjs');
test('Scanned private Source uses real local OCR, preserves original and requires explicit scoped HR confirmation', async t => withAuditFixture(async h => {
  await Source.createIndexes(); const bytes = await scanned('Name: Synthetic OCR Applicant\nPhone: +994 50 123 45 67\nSkills\nFood safety\nHACCP\nExperience\n0 years'), objects = new Map();
  const options = { enabled: true, evidenceMode: 'test', store: { put: async (ref, b) => objects.set(ref.key, Buffer.from(b)), get: async ref => { if (!objects.has(ref.key)) throw Object.assign(Error('Synthetic missing'), {code:'STORAGE_NOT_FOUND'}); return Buffer.from(objects.get(ref.key)); } }, scanner: { scan: async (_, c) => ({ verdict: 'clean', sha256: c.sha256, engine: 'synthetic-only', version: '1' }) } };
  const req = { headers: { authorization: 'Bearer ' + h.tokens.admin } }, file = { buffer: bytes, originalname: 'scan.pdf', mimetype: 'application/pdf' };
  await t.test('default OCR-off is honestly blocked, private scan bytes remain readable; no Candidate created', async () => {
    const queue = createIntake(options), item = await queue.enqueue(req, file, crypto.randomUUID()); await queue.runOnce(1); const source = await queue.get(req, item.id);
    assert.equal(source.state, 'blocked'); assert.equal(source.code, 'OCR_REQUIRED'); assert.equal(source.result, undefined); assert.equal(await Candidate.countDocuments(), 0); assert.deepEqual((await queue.original(req, item.id)).bytes, bytes);
  });
  await t.test('real configured local Tesseract produces pending evidence, not automatic facts/score/hiring', async () => {
    const engine = createOcrEngine({ enabled: true, languages: ['eng'], dataDirectory: directory });
    const queue = createIntake({ ...options, ocrEngine: engine }), item = await queue.enqueue(req, file, crypto.randomUUID()); await queue.runOnce(1); const source = await queue.get(req, item.id);
    assert.equal(source.state, 'ready'); assert.equal(source.result.parserVersion, 'ocr-rules-1'); assert.equal(source.result.review.provider, 'tesseract-rules'); assert.equal(source.result.review.reviewStatus, 'pending'); assert.equal(source.result.parsed.phone, '+994501234567'); assert.ok(source.result.parsed.skills.includes('HACCP')); assert.equal(await Candidate.countDocuments(), 0);
    assert.ok(Object.values(source.result.review.fields).every(v => v.confidence === null)); assert.deepEqual((await queue.original(req, item.id)).bytes, bytes);
    const input = { confirmed: true, expectedHash: source.original.sha256, expectedUpdatedAt: new Date(source.updatedAt).toISOString(), profile: { name: 'HR reviewed scan', role: 'Cashier', phone: source.result.parsed.phone, skills: source.result.parsed.skills, experience: 0 } };
    await assert.rejects(queue.approve(req, item.id, { ...input, confirmed: false }), { status: 400 });
    const approval = await queue.approve(req, item.id, input), candidate = await Candidate.findById(approval.candidateId);
    assert.equal(candidate.cvReview.version, 'ocr-rules-1'); assert.equal(candidate.cvReview.reviewStatus, 'confirmed'); assert.equal(candidate.status, 'new'); assert.equal(candidate.phone, '+994501234567');
  });
  await t.test('default multilingual OCR maps literal RU HACCP homographs through the actual Source pipeline with HR-only review', async () => {
    const bytes = await scanned('Имя: Синтетический Кандидат\nТелефон: +994 50 123 45 67\nНавыки\nПищевая безопасность\nHACCP');
    const engine = createOcrEngine({enabled:true,dataDirectory:directory});
    const queue = createIntake({...options,ocrEngine:engine});
    const item = await queue.enqueue(req,{buffer:bytes,originalname:'synthetic-ru.pdf',mimetype:'application/pdf'},crypto.randomUUID());
    await queue.runOnce(1);const source=await queue.get(req,item.id);
    assert.equal(source.state,'ready');assert.ok(source.result.parsed.skills.includes('HACCP'));assert.ok(source.result.parsed.skills.includes('Food safety'));
    assert.equal(source.result.requiresApproval,true);assert.equal(source.result.review.reviewStatus,'pending');
    assert.ok(Object.values(source.result.review.fields).every(field=>field.confidence===null));
    assert.ok(source.result.review.fields.skills.evidence.some(value=>/HACCP|НАССР|ХАССП/.test(value)));
    assert.deepEqual((await queue.original(req,item.id)).bytes,bytes);
  });
  await t.test('malformed OCR output and quarantine never become ready facts', async () => {
    const queue = createIntake({ ...options, ocrEngine: { extract: async () => ({ text: 'fabricated', pages: 1, engine: { provider: 'mock' } }) } });
    const item = await queue.enqueue(req, file, crypto.randomUUID()); await queue.runOnce(1); const source = await queue.get(req, item.id);
    assert.notEqual(source.state, 'ready'); assert.equal(source.result, undefined);
    let called = false; const denied = createIntake({ ...options, scanner: { scan: async () => ({ verdict: 'infected' }) }, ocrEngine: { extract: async () => { called = true; } } });
    const infected = await denied.enqueue(req, file, crypto.randomUUID()); await denied.runOnce(1); assert.equal((await denied.get(req, infected.id)).state, 'quarantined'); assert.equal(called, false);
  });
  await t.test('role revocation while OCR waits discards late evidence and preserves original with no person writes', async () => {
    await h.models.Role.updateOne({ key: 'test_own' }, { permissions: [{resource:'candidate',action:'*',scope:'own'}] });
    let enter, release; const entered = new Promise(r => enter = r), gate = new Promise(r => release = r);
    const queue = createIntake({ ...options, ocrEngine: { extract: async () => { enter(); await gate; return { text: 'Name: Synthetic late result', pages: 1, engine: {provider:'tesseract',version:'5.5.0',languages:['eng']} }; } } });
    const own = { headers: {authorization:'Bearer '+h.tokens.own} }, item = await queue.enqueue(own, file, crypto.randomUUID()), count = await Candidate.countDocuments();
    const work = queue.runOnce(1); await entered; await h.models.Role.updateOne({key:'test_own'},{permissions:[]}); release(); await work;
    const source = await queue.get(req, item.id); assert.equal(source.state,'cancelled'); assert.equal(source.result,undefined); assert.equal(await Candidate.countDocuments(),count); assert.ok(objects.size>=1);
  });
}));
