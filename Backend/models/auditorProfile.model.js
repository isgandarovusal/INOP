const mongoose = require('mongoose');
const { directions } = require('../services/auditDirection.service');
// User identity is the Mongo _id: uniqueness does not depend on autoIndex.
const schema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organizationId: { type: String, enum: ['gfc'], required: true, immutable: true },
  direction: { type: String, enum: directions, required: true },
  directions: { type: [{type:String,enum:directions}], default: undefined },
  active: { type: Boolean, default: true },
  version: { type: Number, default: 0 },
  history: [{ _id: false, from: String, to: String, actorId: String, reason: String, changedAt: Date }],
}, { timestamps: true });
module.exports = mongoose.models.AuditorProfile || mongoose.model('AuditorProfile', schema);
