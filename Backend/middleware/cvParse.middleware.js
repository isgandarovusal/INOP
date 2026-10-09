const { privateUpload } = require('./privateUpload.middleware');
module.exports = { cvParseUpload: privateUpload('cv', ['.pdf', '.docx'], false) };
