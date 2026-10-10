const crypto = require("node:crypto");
const path = require("node:path");
const multer = require("multer");
const Candidate = require("../models/candidate.model");
const AuditSourceDocument = require("../models/auditSourceDocument.model");
const { getUserPermissionScope } = require("./authorization.middleware");
const { scopeFilter } = require("../services/auditLibrary.service");
const {
  uploadsDir, MIME_TYPES, isSafeFilename, ensureUploadsDirectory,
  openStoredFile, removeStoredFile, cleanupUploadedFile, validateFileContent,
} = require("../services/fileStorage.service");

function uploadMiddleware({ field, maxSize, extensions, memory = false, deferContentValidation = false }) {
  if (deferContentValidation && (!memory || field !== "cv" || extensions.some(extension => ![".pdf", ".docx"].includes(extension)))) {
    throw new Error("Content validation may only be deferred for in-memory CV parsing.");
  }
  const storage = memory ? multer.memoryStorage() : multer.diskStorage({
    destination: (_req, _file, cb) => ensureUploadsDirectory().then(directory => cb(null, directory), cb),
    filename: (req, file, cb) => {
      const filename = `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
      req.uploadFilenames = [...(req.uploadFilenames || []), filename];
      cb(null, filename);
    },
  });
  const receive = multer({
    storage,
    limits: { fileSize: maxSize, files: 1, fields: 20, fieldSize: 64 * 1024, parts: 21 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!isSafeFilename(file.originalname) || !extensions.includes(ext) || MIME_TYPES[ext] !== file.mimetype.toLowerCase()) {
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", field));
      }
      return cb(null, true);
    },
  }).single(field);

  return (req, res, next) => {
    if (!memory) req.once("aborted", () => {
      for (const filename of req.uploadFilenames || []) {
        removeStoredFile(filename).catch(cleanupError => console.error("Aborted upload cleanup failed:", cleanupError));
      }
    });
    receive(req, res, async error => {
      try {
        if (error) throw error;
        if (req.file) {
          if (!deferContentValidation) {
            let content = req.file.buffer;
            if (!memory) {
              const { handle } = await openStoredFile(req.file.filename);
              try { content = await handle.readFile(); }
              finally { await handle.close(); }
            }
            req.file.mimetype = validateFileContent(content, req.file.originalname);
          }
          if (!memory) {
            const file = req.file;
            res.once("finish", () => {
              if (res.statusCode >= 400) cleanupUploadedFile(file).catch(cleanupError => console.error("Upload cleanup failed:", cleanupError));
            });
          }
        }
        return next();
      } catch (uploadError) {
        if (!memory) {
          try { await cleanupUploadedFile(req.file); }
          catch (cleanupError) { console.error("Upload cleanup failed:", cleanupError?.name || "Error"); }
        }
        req.file = undefined;
        return next(uploadError);
      }
    });
  };
}

const auditDocumentUpload = {
  single(field = "file") {
    if (field !== "file") throw new Error("Audit uploads use the file field.");
    return uploadMiddleware({ field, maxSize: 10 * 1024 * 1024, extensions: Object.keys(MIME_TYPES) });
  },
};

function candidateScope(req, scope) {
  if (scope === "all") return {};
  if (scope === "department") return req.user.departmentId ? { departmentId: req.user.departmentId } : null;
  if (scope === "assigned") return { assignedTo: req.user.id };
  if (scope === "own") return { createdBy: req.user.id };
  return null;
}

async function canReadStoredFile(req, filename) {
  const [candidatePermission, sourcePermission] = await Promise.all([
    getUserPermissionScope(req.user.role, "candidate", "read"),
    getUserPermissionScope(req.user.role, "audit.source_document", "read"),
  ]);
  const candidateFilter = candidateScope(req, candidatePermission);
  const sourceFilter = sourcePermission ? scopeFilter(req, "audit.source_document", sourcePermission) : null;
  const checks = [];
  if (candidateFilter !== null) {
    checks.push(Candidate.exists({ $and: [candidateFilter, { cvUrl: `/uploads/${filename}` }] }));
  }
  if (sourceFilter !== null) {
    checks.push(AuditSourceDocument.exists({ $and: [sourceFilter, { fileName: filename }] }));
  }
  if ((await Promise.all(checks)).some(Boolean)) return true;

  // Audit attachments use the same directory but have their own assignment
  // rules. Never allow a permission on unrelated source documents to read them.
  const auditPermission = await getUserPermissionScope(req.user.role, "audit", "read");
  if (!auditPermission) return false;
  const Audit = require("../models/audit.model");
  const { userHasAuditAccess } = require("./auditScope.middleware");
  const audit = await Audit.findOne({ $or: [
    { "attachments.fileName": filename }, { "photos.fileName": filename },
    { "attachments.blobUrl": `/uploads/${filename}` }, { "photos.blobUrl": `/uploads/${filename}` },
  ] }).select("_id id").lean();
  return !!audit && userHasAuditAccess({ ...req, permission: { resource: "audit", action: "read", scope: auditPermission } }, String(audit._id));
}

async function getUploadedFile(req, res, next) {
  let handle;
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const filename = req.params.filename;
    if (!isSafeFilename(filename)) return res.status(400).json({ message: "Invalid filename." });
    if (!await canReadStoredFile(req, filename)) return res.status(404).json({ message: "File not found." });
    const stored = await openStoredFile(filename);
    handle = stored.handle;
    const extension = path.extname(filename).toLowerCase();
    res.set({
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Content-Length": String(stored.stat.size),
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]|["\\]/g, "_")}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    });
    const stream = handle.createReadStream();
    stream.once("error", next);
    res.once("close", () => stream.destroy());
    stream.pipe(res);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    if (["ENOENT", "ELOOP"].includes(error.code) || error.status === 404) {
      return res.status(404).json({ message: "File not found." });
    }
    return next(error);
  }
}

module.exports = { uploadMiddleware, auditDocumentUpload, getUploadedFile, canReadStoredFile, uploadsDir };
