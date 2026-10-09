const fs = require('node:fs/promises');
const path = require('node:path');
const Candidate = require('../models/candidate.model');
const Source = require('../models/auditSourceDocument.model');
const { uploadsDir } = require('../middleware/privateUpload.middleware');
const { getPermissionScope } = require('../middleware/auth.middleware');
const { getDataScope } = require('../middleware/dataScope.middleware');
const mongoose = require('mongoose');
const safeFilename = name => typeof name === 'string' && name.length <= 255 && name !== '.' && name !== '..' && !name.startsWith('.') && !/[\\/\x00-\x1f\x7f]/.test(name);
const missing = res => res.status(404).json({ message: 'Fayl tapılmadı.' });
async function sendPrivateFile(req, res, filename, displayName) {
  if (!safeFilename(filename)) return missing(res);
  try {
    const root = await fs.realpath(uploadsDir);
    const requested = path.join(root, filename);
    if (!(await fs.lstat(requested)).isFile()) return missing(res);
    const actual = await fs.realpath(requested);
    if (path.dirname(actual) !== root || !(await fs.stat(actual)).isFile()) return missing(res);
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
