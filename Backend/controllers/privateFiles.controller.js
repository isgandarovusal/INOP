const fs = require('node:fs/promises');
const path = require('node:path');
const Candidate = require('../models/candidate.model');
const Source = require('../models/auditSourceDocument.model');
const { uploadsDir } = require('../middleware/privateUpload.middleware');
const { verifyToken, getPermissionScope } = require('../middleware/auth.middleware');
const { getDataScope } = require('../middleware/dataScope.middleware');
const mongoose = require('mongoose');
const safeFilename = name => typeof name === 'string' && name.length <= 255 && name !== '.' && name !== '..' && !name.startsWith('.') && !/[\\/\x00-\x1f\x7f]/.test(name);
const missing = res => res.status(404).json({ message: 'Fayl tapılmadı.' });
async function privateFilePath(filename) {
  if (!safeFilename(filename)) return null;
  const root = await fs.realpath(uploadsDir), requested = path.join(root, filename);
  if (!(await fs.lstat(requested)).isFile()) return null;
  const actual = await fs.realpath(requested);
  return path.dirname(actual) === root && (await fs.stat(actual)).isFile() ? actual : null;
}
async function readBoundedPrivateFile(filename) {
  const actual = await privateFilePath(filename);
  if (!actual) return null;
  const handle = await fs.open(actual, require('node:fs').constants.O_RDONLY | require('node:fs').constants.O_NOFOLLOW);
  const max = require('../services/documentWorkerPool.service').MAX_BYTES;
  try {
    if (!(await handle.stat()).isFile()) return null;
    const chunks = []; let length = 0;
    while (length <= max) {
      const buffer = Buffer.alloc(Math.min(65536, max + 1 - length));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) return Buffer.concat(chunks, length);
      length += bytesRead; chunks.push(buffer.subarray(0, bytesRead));
    }
    throw Object.assign(new Error('Document input limit exceeded.'), { code: 'DOCUMENT_LIMIT' });
  } finally { await handle.close(); }
}
async function sendPrivateFile(req, res, filename, displayName) {
  if (!safeFilename(filename)) return missing(res);
  try {
    const actual = await privateFilePath(filename);
    if (!actual) return missing(res);
    const handle = await fs.open(actual, 'r'); let pdf;
    try { const bytes = Buffer.alloc(5); await handle.read(bytes, 0, 5, 0); pdf = bytes.toString() === '%PDF-'; } finally { await handle.close(); }
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" });
    res.attachment(path.basename(String(displayName || filename)).replace(/[\x00-\x1f\x7f]/g, ''));
    res.type(pdf ? 'application/pdf' : 'application/octet-stream');
    return res.sendFile(actual, { cacheControl: false, dotfiles: 'deny' }, error => {
      if (error && !res.headersSent) missing(res);
    });
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) return missing(res);
    return res.status(500).json({ message: 'Faylı açmaq mümkün olmadı.' });
  }
}
function sourceQuery(id) { return mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id }; }
exports.sourceQuery = sourceQuery;
exports.candidate = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Namizəd ID-si düzgün deyil.' });
  const candidate = await Candidate.findOne({ _id: req.params.id, ...req.dataScope }).lean();
  if (!candidate || !candidate.cvUrl?.startsWith('/uploads/')) return missing(res);
  return sendPrivateFile(req, res, candidate.cvUrl.slice('/uploads/'.length), path.basename(candidate.cvUrl));
};
exports.source = async (req, res) => {
  const source = await Source.findOne(sourceQuery(req.params.id)).lean();
  if (!source) return missing(res);
  return sendPrivateFile(req, res, source.fileName, source.originalName);
};
exports.legacy = async (req, res) => {
  const filename = req.params.filename;
  if (!safeFilename(filename)) return missing(res);
  // Existing /uploads paths remain usable with Bearer auth; orphan files stay closed.
  const source = await Source.findOne({ fileName: filename }).lean();
  const resource = source ? 'audit.source_document' : 'candidate';
  const scope = await getPermissionScope(req.user.role, resource, 'read');
  if (!scope || scope === 'none' || (source && scope !== 'all')) return res.status(403).json({ message: 'Fayla giriş icazəsi yoxdur.' });
  if (source) return sendPrivateFile(req, res, filename, source.originalName);
  const filter = getDataScope({ user: req.user, permission: { scope } });
  if (filter === null) return res.status(403).json({ message: 'Fayla giriş icazəsi yoxdur.' });
  const candidate = await Candidate.findOne({ cvUrl: '/uploads/' + filename, ...filter }).lean();
  return candidate ? sendPrivateFile(req, res, filename, filename) : missing(res);
};

exports.candidatePreview = async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Namizəd ID-si düzgün deyil.' });
  const controller = new AbortController();
  const disconnected = () => { if (!res.writableEnded) controller.abort(); };
  res.once('close', disconnected);
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, ...req.dataScope }).lean();
    if (!candidate || !candidate.cvUrl?.startsWith('/uploads/')) return missing(res);
    const { expectedHash, expectedRevision } = req.query;
    if ((expectedHash !== undefined && (typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/.test(expectedHash))) ||
        (expectedRevision !== undefined && (typeof expectedRevision !== 'string' || !/^\d{1,9}$/.test(expectedRevision)))) return res.status(400).json({ message: 'Preview identity is invalid.', code: 'INVALID_PREVIEW_IDENTITY' });
    const changed = () => res.status(409).json({ message: 'CV changed. Reload the Candidate.', code: 'CV_CHANGED' });
    if (expectedRevision !== undefined && Number(expectedRevision) !== (candidate.__v || 0)) return changed();
    const filename = candidate.cvUrl.slice('/uploads/'.length);
    const bytes = await readBoundedPrivateFile(filename);
    if (!bytes) return missing(res);
    const sha256 = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
    if (expectedHash && sha256 !== expectedHash) return changed();
    const { text, warnings } = await require('../services/cvParser.service').extractCvResultFromBuffer(bytes, filename, { signal: controller.signal });
    if (controller.signal.aborted || res.destroyed) return;
    // Extraction can take seconds: recheck the current JWT, actor and independent read scope.
    await verifyToken(req, res, () => {});
    if (res.headersSent) return;
    const scope = await getPermissionScope(req.user.role, 'candidate', 'read');
    const filter = getDataScope({ user: req.user, permission: { scope } });
    if (filter === null) return res.status(403).json({ message: 'Fayla giriş icazəsi yoxdur.' });
    const current = await Candidate.findOne({ _id: req.params.id, ...filter }).lean();
    if (!current) return missing(res);
    if (current.cvUrl !== candidate.cvUrl || (current.__v || 0) !== (candidate.__v || 0)) return changed();
    if (!text) return res.status(422).json({ message: 'OCR is required for this document.', code: 'OCR_REQUIRED', processingStatus: 'unsupported_ocr' });
    return res.json({ rawText: text, warnings, sha256 });
  } catch (error) {
    if (controller.signal.aborted || res.destroyed) return;
    if (['ENOENT', 'ENOTDIR', 'EACCES', 'ELOOP'].includes(error?.code)) return missing(res);
    if (['DOCUMENT_BUSY', 'DOCUMENT_TIMEOUT'].includes(error?.code)) return res.status(503).json({ message: 'Preview processing is busy. Retry later.', code: error.code });
    if (error?.code?.startsWith('DOCUMENT_')) return res.status(422).json({ message: 'CV preview could not be extracted.', code: 'EXTRACTION_FAILED' });
    return res.status(500).json({ message: 'Faylı açmaq mümkün olmadı.', code: 'FILE_READ_FAILED' });
  } finally { res.off('close', disconnected); }
};
