const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const types = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_r, f, cb) =>
    cb(null, crypto.randomUUID() + path.extname(f.originalname).toLowerCase()),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 50, parts: 60 },
  fileFilter: (_r, f, cb) => {
    const ext = path.extname(f.originalname).toLowerCase();
    cb(
      types[ext] === f.mimetype
        ? null
        : new multer.MulterError("LIMIT_UNEXPECTED_FILE", f.fieldname),
      types[ext] === f.mimetype,
    );
  },
});
async function validateUploads(req, res, next) {
  const files = req.file
    ? [req.file]
    : Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();
  try {
    for (const file of files) {
      const handle = await fs.promises.open(file.path, "r");
      const bytes = Buffer.alloc(12);
      try {
        await handle.read(bytes, 0, 12, 0);
      } finally {
        await handle.close();
      }
      const ext = path
        .extname(file.filename || file.originalname)
        .toLowerCase();
      const valid =
        ext === ".pdf"
          ? bytes.subarray(0, 5).toString() === "%PDF-"
          : ext === ".docx"
            ? bytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))
            : ext === ".png"
              ? bytes
                  .subarray(0, 8)
                  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : [".jpg", ".jpeg"].includes(ext)
                ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
                : ext === ".webp"
                  ? bytes.subarray(0, 4).toString() === "RIFF" &&
                    bytes.subarray(8, 12).toString() === "WEBP"
                  : false;
      if (!valid) {
        const e = new Error("File content does not match its extension.");
        e.statusCode = 400;
        throw e;
      }
    }
    res.on("finish", () => {
      if (res.statusCode >= 400)
        for (const f of files) fs.promises.unlink(f.path).catch(() => {});
    });
    next();
  } catch (e) {
    await Promise.all(
      files.map((f) => fs.promises.unlink(f.path).catch(() => {})),
    );
    next(e);
  }
}
module.exports = { upload, uploadsDir, validateUploads };
