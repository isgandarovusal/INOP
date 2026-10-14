const mongoose = require('mongoose');
const { directions } = require('../services/auditDirection.service');
const { brandIds } = require('../services/auditCatalog.service');
// Never accept this trusted provenance from arbitrary legacy Audit JSON.
const schema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Audit' },
  organizationId: { type: String, enum: ['gfc'], required: true, immutable: true },
  brandId: { type: String, enum: brandIds, required: true, immutable: true },
  direction: { type: String, enum: directions, required: true, immutable: true },
  restaurantId: { type: String, required: true, immutable: true },
  templateRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditTemplateRevision', immutable: true },
  actorId: { type: String, required: true, immutable: true },
}, { timestamps: true });
module.exports = mongoose.models.AuditContext || mongoose.model('AuditContext', schema);
