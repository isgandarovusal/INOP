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
async function archiveProof(candidate, blob) {
  if (!candidate.privateCvArchive) return; // Existing object references remain compatible.
  const receipt = candidate.privateCvArchive.toObject?.() || candidate.privateCvArchive;
  const changed = () => Object.assign(new Error('Source identity changed.'), { code: 'STORAGE_IDENTITY_MISMATCH', status: 409 });
  if (!mongoose.isObjectIdOrHexString(receipt.manifestId)) throw changed();
  const manifest = await require('../models/hrCvOriginalManifest.model').findOne({
    _id: receipt.manifestId, candidateId: candidate._id, state: 'verified', evidenceMode: 'provider',
    sourceHash: blob.sha256, 'scan.sha256': blob.sha256, verifiedAt: { $type: 'date' },
  }).select('+blob').maxTimeMS(1000).lean();
  if (!manifest || JSON.stringify(manifest.blob) !== JSON.stringify(blob)) throw changed();
}
async function intakeProof(candidate,blob){
 if(!candidate.privateCvIntake)return;
 const source=await require('../models/hrCvIntake.model').findOne({_id:candidate.privateCvIntake,state:'ready','approval.candidateId':candidate._id,'original.sha256':blob.sha256,'scan.sha256':blob.sha256}).select('+blob').maxTimeMS(1000).lean();
 if(!source||JSON.stringify(source.blob)!==JSON.stringify(blob))throw Object.assign(new Error('Source identity changed.'),{code:'STORAGE_IDENTITY_MISMATCH',status:409});
}
async function readCandidateOriginal(candidate, options = {}) {
  if (candidate.privateCvBlob) {
    const store = require('../services/hrPrivateObjectStorage.service');
    const blob = store.reference(candidate.privateCvBlob.toObject?.() || candidate.privateCvBlob);
    if ((candidate.cvOriginal?.sha256 && candidate.cvOriginal.sha256 !== blob.sha256) || (candidate.cvOriginal?.size !== undefined && candidate.cvOriginal.size !== blob.size)) throw Object.assign(new Error('Source identity changed.'), { code: 'STORAGE_IDENTITY_MISMATCH', status: 409 });
    // Presence of a blob forbids filesystem fallback, even when unavailable.
    await archiveProof(candidate, blob);
    await intakeProof(candidate, blob);
    const bytes = await store.fromEnvironment().get(blob, options);
    await archiveProof(candidate, blob);
    await intakeProof(candidate, blob);
    return bytes;
  }
  if (!candidate.cvUrl?.startsWith('/uploads/')) return null;
  return readBoundedPrivateFile(candidate.cvUrl.slice('/uploads/'.length));
}
const candidateIdentity = row => JSON.stringify([String(row._id),row.cvUrl,row.privateCvBlob,row.privateCvArchive,row.privateCvIntake,row.__v || 0,row.updatedAt]);
const readAuthority = (req,scope) => JSON.stringify([req.user.id,req.user.role,req.user.departmentId,scope]);
async function currentCandidate(req, res, candidate, initialAuthority) {
  const fresh = async () => {
    await verifyToken(req,res,()=>{}); if (res.headersSent || res.destroyed) return null;
    if (!require('../services/hrDepartmentAccess.service').isHRMember(req.user)) { res.status(403).json({code:'HR_DEPARTMENT_REQUIRED',message:'HR department access is required.'});return null; }
    const scope = await getPermissionScope(req.user.role,'candidate','read');
    const filter = getDataScope({user:req.user,permission:{scope}});
    if (filter === null) { res.status(403).json({message:'Fayla giriş icazəsi yoxdur.'});return null; }
    return {filter,authority:readAuthority(req,scope)};
  };
  const context = await fresh();if (!context) return false;
  const current = await Candidate.findOne({_id:candidate._id,...context.filter}).select('+privateCvBlob +privateCvArchive +privateCvIntake').lean();
  if (!current) { missing(res);return false; }
  if (candidateIdentity(current) !== candidateIdentity(candidate)) { res.status(409).json({message:'CV changed. Reload the Candidate.',code:'CV_CHANGED'});return false; }
  const final = await fresh();if (!final) return false;
  if (final.authority !== context.authority || (initialAuthority && initialAuthority !== final.authority)) { res.status(403).json({message:'File authorization changed. Reload the current profile.',code:'FILE_AUTHORIZATION_CHANGED'});return false; }
  return true;
}
function sendCandidateBytes(req,res,bytes,candidate) {
  res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'Accept-Ranges':'bytes'});
  res.attachment(path.basename(candidate.cvUrl || 'CV').replace(/[\x00-\x1f\x7f]/g,''));
  res.type(bytes.subarray(0,5).toString() === '%PDF-' ? 'application/pdf' : 'application/octet-stream');
  const range = req.headers.range;
  // A conditional/multi-range can safely be ignored; single byte ranges preserve previews.
  if (range && !req.headers['if-range']) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      const start = match[1] ? Number(match[1]) : Math.max(0,bytes.length-Number(match[2]));
      const end = match[1] ? (match[2] ? Math.min(Number(match[2]),bytes.length-1) : bytes.length-1) : bytes.length-1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start> end || start>=bytes.length || (!match[1] && Number(match[2])===0)) return res.status(416).set('Content-Range',`bytes */${bytes.length}`).end();
      return res.status(206).set('Content-Range',`bytes ${start}-${end}/${bytes.length}`).send(bytes.subarray(start,end+1));
    }
  }
  return res.send(bytes);
}
async function sendCandidateFile(req,res,candidate,scope) {
  const initialAuthority=readAuthority(req,scope),controller=new AbortController(),close=()=>{if(!res.writableEnded)controller.abort();};res.once('close',close);
  try {
    const bytes=await readCandidateOriginal(candidate,{signal:controller.signal});
    if(controller.signal.aborted || res.destroyed)return;
    if(!bytes)return missing(res);
    if(!await currentCandidate(req,res,candidate,initialAuthority))return;
    return sendCandidateBytes(req,res,bytes,candidate);
  } catch(error) {
    if(controller.signal.aborted || res.destroyed || res.headersSent)return;
    if(['ENOENT','ENOTDIR','EACCES','ELOOP','STORAGE_NOT_FOUND'].includes(error.code))return missing(res);
    if(error.code==='STORAGE_IDENTITY_MISMATCH')return res.status(409).json({message:'CV changed. Reload the Candidate.',code:'CV_CHANGED'});
    if(error.code==='DOCUMENT_LIMIT')return res.status(413).json({message:'Private source exceeds the supported size.',code:'FILE_TOO_LARGE'});
    if(error.code?.startsWith('STORAGE_'))return res.status(503).json({message:'Private source is temporarily unavailable.',code:'PRIVATE_STORAGE_UNAVAILABLE'});
    return res.status(500).json({message:'Faylı açmaq mümkün olmadı.'});
  } finally {res.off('close',close);}
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
// Internal server helper only; callers must first authorize the owning record.
exports.readBoundedPrivateFile = readBoundedPrivateFile;
exports.readCandidateOriginal = readCandidateOriginal;
exports.candidate = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Namizəd ID-si düzgün deyil.' });
  const candidate = await Candidate.findOne({ _id: req.params.id, ...req.dataScope }).select('+privateCvBlob +privateCvArchive +privateCvIntake').lean();
  if (!candidate || !candidate.cvUrl?.startsWith('/uploads/')) return missing(res);
  return sendCandidateFile(req,res,candidate,req.permission.scope);
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
  if (!source && !require('../services/hrDepartmentAccess.service').isHRMember(req.user)) return res.status(403).json({code:'HR_DEPARTMENT_REQUIRED',message:'HR department access is required.'});
  const scope = await getPermissionScope(req.user.role, resource, 'read');
  if (!scope || scope === 'none' || (source && scope !== 'all')) return res.status(403).json({ message: 'Fayla giriş icazəsi yoxdur.' });
  if (source) return sendPrivateFile(req, res, filename, source.originalName);
  const filter = getDataScope({ user: req.user, permission: { scope } });
  if (filter === null) return res.status(403).json({ message: 'Fayla giriş icazəsi yoxdur.' });
  const candidate = await Candidate.findOne({ cvUrl: '/uploads/' + filename, ...filter }).select('+privateCvBlob +privateCvArchive +privateCvIntake').lean();
  return candidate ? sendCandidateFile(req,res,candidate,scope) : missing(res);
};

exports.candidatePreview = async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Namizəd ID-si düzgün deyil.' });
  const controller = new AbortController();
  const disconnected = () => { if (!res.writableEnded) controller.abort(); };
  res.once('close', disconnected);
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, ...req.dataScope }).select('+privateCvBlob +privateCvArchive +privateCvIntake').lean();
    if (!candidate || !candidate.cvUrl?.startsWith('/uploads/')) return missing(res);
    const { expectedHash, expectedRevision } = req.query;
    if ((expectedHash !== undefined && (typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/.test(expectedHash))) ||
        (expectedRevision !== undefined && (typeof expectedRevision !== 'string' || !/^\d{1,9}$/.test(expectedRevision)))) return res.status(400).json({ message: 'Preview identity is invalid.', code: 'INVALID_PREVIEW_IDENTITY' });
    const changed = () => res.status(409).json({ message: 'CV changed. Reload the Candidate.', code: 'CV_CHANGED' });
    if (expectedRevision !== undefined && Number(expectedRevision) !== (candidate.__v || 0)) return changed();
    const filename = candidate.cvUrl.slice('/uploads/'.length);
    const initialAuthority = readAuthority(req,req.permission.scope);
    const bytes = await readCandidateOriginal(candidate,{signal:controller.signal});
    if (!bytes) return missing(res);
    const sha256 = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
    if (expectedHash && sha256 !== expectedHash) return changed();
    const { text, warnings } = await require('../services/cvParser.service').extractCvResultFromBuffer(bytes, filename, { signal: controller.signal });
    if (controller.signal.aborted || res.destroyed) return;
    // Storage and extraction may take seconds: recheck current ownership/authority.
    if (!await currentCandidate(req,res,candidate,initialAuthority)) return;
    if (!text) return res.status(422).json({ message: 'OCR is required for this document.', code: 'OCR_REQUIRED', processingStatus: 'unsupported_ocr' });
    return res.json({ rawText: text, warnings, sha256 });
  } catch (error) {
    if (controller.signal.aborted || res.destroyed) return;
    if (['ENOENT', 'ENOTDIR', 'EACCES', 'ELOOP', 'STORAGE_NOT_FOUND'].includes(error?.code)) return missing(res);
    if (error?.code === 'STORAGE_IDENTITY_MISMATCH') return res.status(409).json({message:'CV changed. Reload the Candidate.',code:'CV_CHANGED'});
    if (error?.code?.startsWith('STORAGE_')) return res.status(503).json({message:'Private source is temporarily unavailable.',code:'PRIVATE_STORAGE_UNAVAILABLE'});
    if (['DOCUMENT_BUSY', 'DOCUMENT_TIMEOUT'].includes(error?.code)) return res.status(503).json({ message: 'Preview processing is busy. Retry later.', code: error.code });
    if (error?.code?.startsWith('DOCUMENT_')) return res.status(422).json({ message: 'CV preview could not be extracted.', code: 'EXTRACTION_FAILED' });
    return res.status(500).json({ message: 'Faylı açmaq mümkün olmadı.', code: 'FILE_READ_FAILED' });
  } finally { res.off('close', disconnected); }
};
