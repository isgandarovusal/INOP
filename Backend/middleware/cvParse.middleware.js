const { uploadMiddleware } = require("./uploads.middleware");

module.exports = {
  cvParseUpload: uploadMiddleware({
    field: "cv", maxSize: 5 * 1024 * 1024,
    // The bounded parser worker validates signatures and ZIP contents before
    // extraction; decompression should not run on the request event loop.
    extensions: [".pdf", ".docx"], memory: true, deferContentValidation: true,
  }),
};
