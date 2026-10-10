const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// A fixed, application-owned directory prevents cwd-dependent writes and avoids
// trusting paths supplied in request bodies or old database records.
const uploadsDir = path.resolve(__dirname, "..", "uploads");
const MIME_TYPES = Object.freeze({
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
});

function fileError(message, status = 400) {
  return Object.assign(new Error(message), { status, code: "INVALID_FILE" });
}

function isSafeFilename(name) {
  return typeof name === "string" && name.length > 0 && name.length <= 255 &&
    name !== "." && name !== ".." && !/[\\/\x00-\x1f\x7f]/.test(name) &&
    path.basename(name) === name;
}

async function ensureUploadsDirectory() {
  await fs.promises.mkdir(uploadsDir, { recursive: true, mode: 0o700 });
  if (await fs.promises.realpath(uploadsDir) !== uploadsDir) {
    throw fileError("The upload directory must not be a symbolic link.", 500);
  }
  return uploadsDir;
}

async function openStoredFile(filename) {
  if (!isSafeFilename(filename)) throw fileError("Invalid filename.");
  await ensureUploadsDirectory();
  const handle = await fs.promises.open(path.join(uploadsDir, filename),
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw fileError("Not a regular file.", 404);
    return { handle, stat };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function removeStoredFile(filename) {
  if (!isSafeFilename(filename)) throw fileError("Invalid filename.");
  await ensureUploadsDirectory();
  try {
    // unlink never follows a symlink. This can safely remove a stale link, but
    // cannot delete a target outside the storage directory.
    await fs.promises.unlink(path.join(uploadsDir, filename));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function cleanupUploadedFile(file) {
  if (file?.filename) await removeStoredFile(file.filename);
}

function zipEntries(buffer) {
  // Read the central directory before a document parser gets the archive.
  // Encrypted archives, ZIP64, traversal and expansion bombs are unsupported.
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 &&
        i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) {
      end = i;
      break;
    }
  }
  if (end < 0) throw fileError("Invalid document archive.");
  const count = buffer.readUInt16LE(end + 10);
  const directorySize = buffer.readUInt32LE(end + 12);
  const offset = buffer.readUInt32LE(end + 16);
  if (!count || count > 2000 || buffer.readUInt16LE(end + 4) ||
      buffer.readUInt16LE(end + 6) || buffer.readUInt16LE(end + 8) !== count ||
      offset + directorySize !== end) throw fileError("Unsupported document archive.");
  let cursor = offset;
  let expanded = 0;
  const entries = new Set();
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw fileError("Invalid document archive.");
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const size = buffer.readUInt32LE(cursor + 24);
    const length = buffer.readUInt16LE(cursor + 28);
    const next = cursor + 46 + length + buffer.readUInt16LE(cursor + 30) + buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + length).toString("utf8");
    expanded += size;
    if (next > end || flags & 1 || ![0, 8].includes(method) ||
        localOffset + 30 > offset || buffer.readUInt32LE(localOffset) !== 0x04034b50 ||
        expanded > 50 * 1024 * 1024 || size > Math.max(1024 * 1024, compressed * 500) ||
        !name || name.startsWith("/") || name.includes("\\") || name.includes("\0") ||
        name.split("/").includes("..") || entries.has(name)) {
      throw fileError("Unsafe document archive.");
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const localName = buffer.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString("utf8");
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (localName !== name || dataOffset + compressed > offset ||
        buffer.readUInt16LE(localOffset + 6) !== flags || buffer.readUInt16LE(localOffset + 8) !== method) {
      throw fileError("Invalid document archive entry.");
    }
    const data = buffer.subarray(dataOffset, dataOffset + compressed);
    let decoded;
    try {
      // An attacker can lie about uncompressed sizes in ZIP headers. Enforce
      // the size during decompression before handing the document to a parser.
      decoded = method === 0 ? data : zlib.inflateRawSync(data, { maxOutputLength: Math.max(1, size) });
    } catch { throw fileError("Invalid or oversized document archive entry."); }
    if (decoded.length !== size || zlib.crc32(decoded) !== buffer.readUInt32LE(cursor + 16)) {
      throw fileError("Document archive checksum or size mismatch.");
    }
    entries.add(name);
    cursor = next;
  }
  if (cursor !== end) throw fileError("Invalid document archive directory.");
  return entries;
}

function validateFileContent(buffer, originalname) {
  const extension = path.extname(originalname || "").toLowerCase();
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || !MIME_TYPES[extension]) {
    throw fileError("Empty or unsupported file.");
  }
  if (extension === ".pdf" && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw fileError("The file is not a PDF.");
  }
  if (extension === ".docx" || extension === ".xlsx") {
    const entries = zipEntries(buffer);
    if (!entries.has("[Content_Types].xml") ||
        !entries.has(extension === ".docx" ? "word/document.xml" : "xl/workbook.xml")) {
      throw fileError("The file does not match its document format.");
    }
  }
  if (extension === ".png" && !buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    throw fileError("The file is not a PNG image.");
  }
  if ([".jpg", ".jpeg"].includes(extension) &&
      !(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
    throw fileError("The file is not a JPEG image.");
  }
  if ([".csv", ".txt"].includes(extension)) {
    if (buffer.includes(0)) throw fileError("The file is not plain text.");
    try { new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
    catch { throw fileError("Text files must use UTF-8 encoding."); }
  }
  return MIME_TYPES[extension];
}

module.exports = {
  uploadsDir, MIME_TYPES, fileError, isSafeFilename, ensureUploadsDirectory,
  openStoredFile, removeStoredFile, cleanupUploadedFile, validateFileContent,
};
