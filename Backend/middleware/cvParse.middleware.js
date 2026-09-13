const multer = require("multer");
const path = require("path");

const allowedExtensions = new Set([".pdf", ".docx"]);

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const storage = multer.memoryStorage();

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

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

const cvParseUpload = upload.single("cv");

const handleCvParseUpload = (req, res, next) => {
  cvParseUpload(req, res, (error) => {
    if (!error) {
      return next();
    }

    console.error("CV upload error:", {
      name: error.name,
      code: error.code,
      message: error.message,
      field: error.field,
    });

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "CV faylının həcmi maksimum 5 MB ola bilər.",
        });
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          message:
            "CV faylı düzgün deyil. Yalnız PDF və DOCX formatları qəbul olunur.",
          code: error.code,
          field: error.field || "cv",
        });
      }

      return res.status(400).json({
        message: "CV faylı qəbul edilərkən xəta baş verdi.",
        code: error.code,
      });
    }

    return res.status(400).json({
      message:
        error.message ||
        "CV faylı qəbul edilərkən xəta baş verdi.",
    });
  });
};

module.exports = {
  cvParseUpload: handleCvParseUpload,
};
