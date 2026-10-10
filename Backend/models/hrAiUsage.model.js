const mongoose = require('mongoose');
// Aggregate counters only: no prompt, CV, token, email, name or provider body.
const schema = new mongoose.Schema({
  _id: String, reservedMicros: { type: Number, default: 0 }, requests: { type: Number, default: 0 },
  successes: { type: Number, default: 0 }, failures: { type: Number, default: 0 },
  inputTokens: { type: Number, default: 0 }, outputTokens: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { versionKey: false, bufferCommands: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('HrAiUsage', schema);
