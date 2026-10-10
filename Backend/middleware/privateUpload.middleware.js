const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const uploadsDir = path.join(__dirname, '..', 'uploads');
const MAX_BYTES = 5 * 1024 * 1024;
const types = {
  '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.doc': 'application/msword', '.xls': 'application/vnd.ms-excel',
  '.txt': 'text/plain', '.csv': 'text/csv', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
};
function invalid(field = 'file') { return new multer.MulterError('LIMIT_UNEXPECTED_FILE', field); }
function validOfficeZip(bytes, required) {
  // Bound actual decompression before an Office parser can consume attacker ZIP data.
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0 || bytes.length < 22 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) return false;
  const count = bytes.readUInt16LE(end + 10), offset = bytes.readUInt32LE(end + 16);
  if (!count || count > 512 || offset + bytes.readUInt32LE(end + 12) !== end) return false;
  let cursor = offset, total = 0; const names = new Set();
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) return false;
    const flags = bytes.readUInt16LE(cursor + 8), method = bytes.readUInt16LE(cursor + 10);
    const compressed = bytes.readUInt32LE(cursor + 20), size = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28), extra = bytes.readUInt16LE(cursor + 30), comment = bytes.readUInt16LE(cursor + 32);
    const local = bytes.readUInt32LE(cursor + 42), next = cursor + 46 + nameLength + extra + comment;
    if (next > end || flags & 1 || ![0, 8].includes(method) || (total += size) > 20 * 1024 * 1024) return false;
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    if (name.startsWith('/') || /[\\\x00]/.test(name) || name.split('/').includes('..') || names.has(name)) return false;
    names.add(name);
    if (local + 30 > offset || bytes.readUInt32LE(local) !== 0x04034b50) return false;
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    if (start + compressed > offset) return false;
    const input = bytes.subarray(start, start + compressed);
    try {
      const output = method === 8 ? zlib.inflateRawSync(input, { maxOutputLength: Math.max(1, Math.min(size + 1, 20 * 1024 * 1024)) }) : input;
      if (output.length !== size) return false;
    } catch { return false; }
    cursor = next;
  }
  return cursor === end && names.has('[Content_Types].xml') && names.has(required);
}
function validContent(bytes, extension) {
  if (extension === '.pdf') return bytes.subarray(0, 5).equals(Buffer.from('%PDF-'));
  if (extension === '.docx' || extension === '.xlsx') return validOfficeZip(bytes, extension === '.docx' ? 'word/document.xml' : 'xl/workbook.xml');
  if (extension === '.doc' || extension === '.xls') return bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'));
  if (extension === '.png') return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (extension === '.jpg' || extension === '.jpeg') return bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  if (extension === '.gif') return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
  if (extension === '.webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (extension === '.txt' || extension === '.csv') {
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return !bytes.includes(0); } catch { return false; }
  }
  return false;
}
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
      if (!validContent(req.file.buffer, extension)) return next(invalid(field));
      if (persist) {
        await fs.mkdir(uploadsDir, { recursive: true });
        req.file.filename = crypto.randomUUID() + extension;
        req.file.path = path.join(uploadsDir, req.file.filename);
        await fs.writeFile(req.file.path, req.file.buffer, { flag: 'wx', mode: 0o600 });
        const ownedPath = req.file.path;
        res.once('finish', () => { if (res.statusCode >= 400) void fs.unlink(ownedPath).catch(() => {}); });
      }
      next();
    } catch (failure) { next(failure); }
  });
}
module.exports = { privateUpload, uploadsDir, validContent, MAX_BYTES, types };
