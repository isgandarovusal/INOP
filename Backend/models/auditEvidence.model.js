const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  auditId: { type: mongoose.Schema.Types.ObjectId, ref: 'Audit', required: true },
  storageKey: { type: String, required: true, immutable: true },
  name: { type: String, required: true, immutable: true },
  size: { type: Number, required: true, immutable: true },
  mimeType: { type: String, required: true, immutable: true },
  uploadedBy: { type: String, required: true, immutable: true },
}, { timestamps: true });
module.exports = mongoose.models.AuditEvidence || mongoose.model('AuditEvidence', schema);
