const mongoose = require('mongoose');
const auditLibraryLockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  token: { type: String, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: false });
// Expired rows are atomically reclaimed, rather than deleted by a TTL worker.
module.exports = mongoose.models.AuditLibraryLock || mongoose.model('AuditLibraryLock', auditLibraryLockSchema);
