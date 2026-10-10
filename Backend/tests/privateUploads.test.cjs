const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto'), os = require('node:os');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const { uploadsDir } = require('../middleware/privateUpload.middleware');
const Candidate = require('../models/candidate.model'), Source = require('../models/auditSourceDocument.model');

// Generate real ZIP fixtures with Node only, so the Alpine runtime test needs no Python.
function officeZip(xml) {
  const zlib = require('node:zlib'), chunks = [], central = []; let offset = 0;
  for (const [name, text] of [['[Content_Types].xml', '<Types/>'], ['word/document.xml', xml]]) {
    const filename = Buffer.from(name), raw = Buffer.from(text), compressed = zlib.deflateRawSync(raw), crc = zlib.crc32(raw);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(filename.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(8, 10); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(compressed.length, 20); entry.writeUInt32LE(raw.length, 24); entry.writeUInt16LE(filename.length, 28); entry.writeUInt32LE(offset, 42);
    chunks.push(local, filename, compressed); central.push(entry, filename); offset += local.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(2, 8); end.writeUInt16LE(2, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}

test('Private uploads require owning-record scope and validate bounded multipart content', async t => withAuditFixture(async h => {
  const owned = [], scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'inop-upload-test-'));
  await fs.mkdir(uploadsDir, { recursive: true });
  const pdf = Buffer.from('%PDF-1.4\nSynthetic private file\n%%EOF');
  async function makeFile(bytes = pdf, ext = '.pdf') {
    const name = 'test-' + crypto.randomUUID() + ext, filename = path.join(uploadsDir, name);
    await fs.writeFile(filename, bytes, { flag: 'wx' }); owned.push(filename); return name;
  }
  const raw = async (actor, url, init = {}) => fetch(url, { ...init, headers: { ...(h.tokens[actor] ? { Authorization: 'Bearer ' + h.tokens[actor] } : {}), ...init.headers }, signal: AbortSignal.timeout(10000) });
  async function upload(actor, endpoint, field, name, type, bytes, extra = {}) {
    const form = new FormData(); form.append(field, new Blob([bytes], { type }), name);
    for (const [key, value] of Object.entries(extra)) form.append(key, value);
    const r = await raw(actor, h.apiBase + endpoint, { method: 'POST', body: form }); const data = await r.json();
    if (r.status === 201) { const name = data.fileName || data.cvUrl?.split('/').pop(); if (name) owned.push(path.join(uploadsDir, name)); }
    return { status: r.status, data };
  }
  try {
    for (const scope of ['own', 'department', 'assigned', 'none']) await h.models.Role.updateOne({ key: 'test_' + scope }, { $push: { permissions: { $each: [
      { resource: 'candidate', action: '*', scope }, { resource: 'audit.source_document', action: '*', scope },
    ] } } });
    const name = await makeFile();
    const cv = await Candidate.create({ name: 'Synthetic candidate', role: 'Synthetic', cvUrl: '/uploads/' + name, createdBy: h.actors.own._id, assignedTo: h.actors.assigned._id, departmentId: 'dep_A' });
    const sourceName = await makeFile();
    const source = await Source.create({ id: 'source-' + crypto.randomUUID(), originalName: 'private.pdf', fileName: sourceName, uploadedBy: String(h.actors.foreign._id) });
    for (const actor of ['admin', 'own', 'department', 'assigned', 'hr']) await t.test(`${actor}: candidate API and legacy URL preserve allowed scope`, async () => {
      for (const url of [h.apiBase + `/candidates/${cv._id}/cv`, h.apiBase.replace('/api', '') + '/uploads/' + name]) {
        const r = await raw(actor, url); assert.equal(r.status, 200); assert.deepEqual(Buffer.from(await r.arrayBuffer()), pdf);
        assert.match(r.headers.get('cache-control'), /no-store/); assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); assert.match(r.headers.get('content-disposition'), /^attachment/);
      }
    });
    for (const actor of ['peer', 'foreign', 'none', 'anonymous']) await t.test(`${actor}: foreign CV cannot be read by API or legacy path`, async () => {
      for (const url of [h.apiBase + `/candidates/${cv._id}/cv`, h.apiBase.replace('/api', '') + '/uploads/' + name]) {
        const r = await raw(actor, url); assert.equal(r.status, actor === 'anonymous' ? 401 : actor === 'none' ? 403 : 404);
        assert.equal((await r.text()).includes('Synthetic private file'), false);
      }
    });
    await t.test('revoked candidate assignment closes access with the same JWT', async () => {
      await Candidate.updateOne({ _id: cv._id }, { assignedTo: h.actors.foreign._id });
      assert.equal((await raw('assigned', h.apiBase + `/candidates/${cv._id}/cv`)).status, 404);
    });
    for (const actor of ['own', 'department', 'assigned', 'none', 'hr', 'anonymous']) await t.test(`${actor}: source file download fails closed`, async () => {
      for (const url of [h.apiBase + `/audit-source-documents/${source._id}/file`, h.apiBase.replace('/api', '') + '/uploads/' + sourceName]) assert.equal((await raw(actor, url)).status, actor === 'anonymous' ? 401 : 403);
    });
    await t.test('all source grants support canonical/legacy IDs, range/HEAD and canonical delete', async () => {
      for (const id of [source.id, String(source._id)]) assert.equal((await raw('admin', h.apiBase + `/audit-source-documents/${id}/file`)).status, 200);
      const partial = await raw('admin', h.apiBase + `/audit-source-documents/${source._id}/file`, { headers: { Range: 'bytes=0-4' } });
      assert.equal(partial.status, 206); assert.equal(await partial.text(), '%PDF-');
      assert.equal((await raw('admin', h.apiBase + `/candidates/${cv._id}/cv`, { method: 'HEAD' })).status, 200);
      assert.equal((await h.request('admin', 'DELETE', `/audit-source-documents/${source._id}`)).status, 200);
      assert.equal((await raw('admin', h.apiBase.replace('/api', '') + '/uploads/' + sourceName)).status, 404);
    });
    await t.test('orphan, traversal, forged filePath and symlink escape remain closed', async () => {
      const orphan = await makeFile();
      assert.equal((await raw('admin', h.apiBase.replace('/api', '') + '/uploads/' + orphan)).status, 404);
      for (const bad of ['..%2Fserver.js', '..%5Cserver.js', '%00file', '.env']) assert.equal((await raw('admin', h.apiBase.replace('/api', '') + '/uploads/' + bad)).status, 404);
      const outside = path.join(scratch, 'outside.pdf'); await fs.writeFile(outside, pdf);
      const link = path.join(uploadsDir, 'test-' + crypto.randomUUID() + '.pdf'); await fs.symlink(outside, link); owned.push(link);
      for (const fileName of [path.basename(link), '../outside.pdf']) {
        const doc = await Source.create({ originalName: 'unsafe.pdf', fileName, filePath: outside });
        assert.equal((await raw('admin', h.apiBase + `/audit-source-documents/${doc._id}/file`)).status, 404);
      }
    });
    await t.test('legacy active content is downloaded as octet-stream with CSP and no sniffing', async () => {
      const fileName = await makeFile(Buffer.from('<html>synthetic</html>'), '.pdf');
      const doc = await Source.create({ originalName: 'unsafe\r\nInjected: value.html', fileName, mimeType: 'text/html' });
      const r = await raw('admin', h.apiBase + `/audit-source-documents/${doc._id}/file`);
      assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/octet-stream'); assert.match(r.headers.get('content-security-policy'), /sandbox/); assert.equal(r.headers.get('injected'), null);
    });
    await t.test('valid CV/source upload uses unpredictable filenames and server provenance', async () => {
      const r = await upload('admin', '/candidates', 'cv', 'Synthetic CV.pdf', 'application/pdf', pdf, { name: 'Synthetic', role: 'Synthetic' }); assert.equal(r.status, 201);
      assert.match(r.data.cvUrl, /^\/uploads\/[a-f0-9-]{36}\.pdf$/);
      const d = await upload('admin', '/audit-source-documents', 'file', 'Synthetic source.pdf', 'application/pdf', pdf, { uploadedBy: 'forged', auditType: 'standard' }); assert.equal(d.status, 201); assert.equal(d.data.uploadedBy, String(h.actors.admin._id));
      assert.equal((await raw('admin', h.apiBase + `/audit-source-documents/${d.data.id}/file`)).status, 200);
    });
    await t.test('DOCX content is a bounded real ZIP; valid upload/parse survives and expansion bombs fail', async () => {
      const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const bytes = officeZip('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic Applicant</w:t></w:r></w:p></w:body></w:document>');
      assert.equal((await upload('admin', '/candidates', 'cv', 'valid.docx', mime, bytes, { name: 'Synthetic', role: 'Synthetic' })).status, 201);
      assert.equal((await upload('admin', '/candidates/parse-cv', 'cv', 'valid.docx', mime, bytes)).status, 200);
      assert.equal((await upload('admin', '/candidates/parse-cv', 'cv', 'bomb.docx', mime, officeZip('x'.repeat(21 * 1024 * 1024)))).status, 400);
    });
    for (const [label, name, mime, bytes] of [
      ['active HTML', 'unsafe.html', 'text/html', '<html>unsafe</html>'], ['MIME mismatch', 'unsafe.pdf', 'text/html', pdf],
      ['spoofed PDF', 'unsafe.pdf', 'application/pdf', '<html>unsafe</html>'], ['spoofed DOCX', 'unsafe.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'PKfake'],
      ['double extension', 'unsafe.pdf.js', 'application/pdf', pdf], ['control name', 'unsafe\u0001.pdf', 'application/pdf', pdf],
      ['hidden name', '.unsafe.pdf', 'application/pdf', pdf], ['oversize', 'large.pdf', 'application/pdf', Buffer.concat([pdf, Buffer.alloc(5 * 1024 * 1024)])],
    ]) await t.test(`${label}: CV and source reject before storage`, async () => {
      const before = (await fs.readdir(uploadsDir)).sort();
      for (const [endpoint, field] of [['/candidates', 'cv'], ['/audit-source-documents', 'file']]) assert.equal((await upload('admin', endpoint, field, name, mime, bytes, { name: 'Synthetic', role: 'Synthetic' })).status, label === 'oversize' ? 413 : 400);
      assert.deepEqual((await fs.readdir(uploadsDir)).sort(), before);
    });
    await t.test('parse-only CV rejects forged content; source permission is checked before multipart', async () => {
      assert.equal((await upload('admin', '/candidates/parse-cv', 'cv', 'spoof.pdf', 'application/pdf', 'HTML')).status, 400);
      assert.equal((await upload('assigned', '/audit-source-documents', 'file', 'unsafe.html', 'text/html', 'HTML')).status, 403);
      assert.equal((await upload('anonymous', '/audit-source-documents', 'file', 'private.pdf', 'application/pdf', pdf)).status, 401);
    });
    await t.test('missing/invalid record and revoked role preserve 404/400/403', async () => {
      assert.equal((await raw('admin', h.apiBase + '/candidates/invalid/cv')).status, 400);
      assert.equal((await raw('admin', h.apiBase + `/audit-source-documents/${new h.mongoose.Types.ObjectId()}/file`)).status, 404);
      await h.models.Role.updateOne({ key: 'test_own' }, { $set: { 'permissions.$[entry].scope': 'none' } }, { arrayFilters: [{ 'entry.resource': 'candidate' }] });
      assert.equal((await raw('own', h.apiBase + `/candidates/${cv._id}/cv`)).status, 403);
    });
  } finally { for (const file of owned) await fs.unlink(file).catch(() => {}); await fs.rm(scratch, { recursive: true }); }
}));
