const mongoose = require('mongoose');

// Separate server-owned provenance: legacy Audit JSON is intentionally strict:false
// and may already contain arbitrary client-supplied department fields.
const schema = new mongoose.Schema({
  auditId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, immutable: true },
  auditorId: { type: String, required: true, immutable: true },
  departmentId: { type: String, default: null, index: true, immutable: true },
  capturedAt: { type: Date, default: Date.now, immutable: true },
});

module.exports = mongoose.models.AuditDepartmentSnapshot || mongoose.model('AuditDepartmentSnapshot', schema);
