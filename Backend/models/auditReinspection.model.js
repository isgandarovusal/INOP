const mongoose = require('mongoose');
const schema = new mongoose.Schema({ _id: String, kind: { type: String, enum: ['gate', 'link'], required: true }, parentAuditId: { type: mongoose.Schema.Types.ObjectId, required: true }, childAuditId: mongoose.Schema.Types.ObjectId, actorId: String, commandHash: String, revision: { type: Number, default: 0 }, date: String }, { timestamps: true });
schema.index({ parentAuditId: 1, kind: 1, createdAt: -1 });
schema.index({ childAuditId: 1, kind: 1, createdAt: -1 });
module.exports = mongoose.model('AuditReinspection', schema);
