const mongoose = require('mongoose');
const { directions } = require('../services/auditDirection.service');
const { brandIds } = require('../services/auditCatalog.service');
// Never accept this trusted provenance from arbitrary legacy Audit JSON.
const schema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Audit' },
  organizationId: { type: String, enum: ['gfc'], required: true, immutable: true },
  brandId: { type: String, enum: brandIds, required: function(){return !this.objectType||this.objectType==='restaurant';}, immutable: true },
  direction: { type: String, enum: directions, required: true, immutable: true },
  objectType:{type:String,immutable:true},objectId:{type:String,immutable:true},
  restaurantId: { type: String, required: function(){return !this.objectType||this.objectType==='restaurant';}, immutable: true },
  templateRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditTemplateRevision', immutable: true },
  actorId: { type: String, required: true, immutable: true },
}, { timestamps: true });
module.exports = mongoose.models.AuditContext || mongoose.model('AuditContext', schema);
