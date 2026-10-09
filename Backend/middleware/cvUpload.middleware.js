const { privateUpload, uploadsDir } = require('./privateUpload.middleware');
// Keep the existing cvUpload.single('cv') interface and 5 MB PDF/DOCX contract.
const cvUpload = { single: field => privateUpload(field, ['.pdf', '.docx']) };
module.exports = { cvUpload, uploadsDir };
