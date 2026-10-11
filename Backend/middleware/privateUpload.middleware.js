const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const uploadsDir = path.join(__dirname, '..', 'uploads');
const { MAX_BYTES, types, validContent } = require('../services/uploadContent.service');
const { pool } = require('../services/documentWorkerPool.service');
function invalid(field = 'file') { return new multer.MulterError('LIMIT_UNEXPECTED_FILE', field); }
function privateUpload(field, extensions, persist = true) {
  const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 30, parts: 40, fieldSize: 64 * 1024 },
    fileFilter: (_req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const safeName = !/[\\/\x00-\x1f\x7f]/.test(file.originalname) && file.originalname.length <= 255 && !file.originalname.startsWith('.');
      cb(safeName && extensions.includes(extension) && file.mimetype.toLowerCase() === types[extension] ? null : invalid(field), true);
    },
  }).single(field);
  return (req, res, next) => parser(req, res, async error => {
    if (error) {
      if (/Malformed part header|Unexpected end of form|Unexpected end of file/.test(error.message || '')) { error.status = 400; error.code = 'INVALID_MULTIPART'; }
      return next(error);
    }
    if (!req.file) return next();
    try {
      const extension = path.extname(req.file.originalname).toLowerCase();
      if (!req.file.buffer.length || !await pool.run('validate', req.file.buffer, extension)) return next(invalid(field));
      if (persist) {
        await fs.mkdir(uploadsDir, { recursive: true });
        req.file.filename = crypto.randomUUID() + extension;
        req.file.path = path.join(uploadsDir, req.file.filename);
        await fs.writeFile(req.file.path, req.file.buffer, { flag: 'wx', mode: 0o600 });
        const ownedPath = req.file.path;
        // Only server code may set this after starting an uncertain DB write.
        // Request-body fields never control the lifetime of an uploaded original.
        res.once('finish', () => { if (res.statusCode >= 400 && !req.file.preserveOnError) void fs.unlink(ownedPath).catch(() => {}); });
      }
      next();
    } catch (failure) { next(failure); }
  });
}
module.exports = { privateUpload, uploadsDir, validContent, MAX_BYTES, types };
