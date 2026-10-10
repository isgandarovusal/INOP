const { uploadMiddleware, uploadsDir } = require("./uploads.middleware");

// Keep the existing route interface while validating the actual file bytes.
const cvUpload = {
  single(field = "cv") {
    if (field !== "cv") throw new Error("CV uploads use the cv field.");
    return uploadMiddleware({ field, maxSize: 5 * 1024 * 1024, extensions: [".pdf", ".docx"] });
  },
};

module.exports = { cvUpload, uploadsDir };
