const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedExtensions = new Set([".pdf", ".docx"]);

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const originalBaseName = path.basename(file.originalname, extension);

    const safeBaseName =
      originalBaseName
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "cv";

    const uniqueName = `${safeBaseName}-${crypto.randomUUID()}${extension}`;

    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = String(file.mimetype || "").toLowerCase();

  const extensionAllowed = allowedExtensions.has(extension);
  const mimeAllowed = allowedMimeTypes.has(mimeType);

  if (!extensionAllowed || !mimeAllowed) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "cv"
      )
    );
  }

  cb(null, true);
};

const cvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

module.exports = {
  cvUpload,
  uploadsDir,
};
