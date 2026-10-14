const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  templateId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true, ref: 'AuditTemplate' },
  revision: { type: Number, required: true, immutable: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
  publishedBy: { type: String, required: true, immutable: true },
  publishedAt: { type: Date, required: true, immutable: true },
  state: { type: String, enum: ['published', 'retired'], default: 'published' },
}, { timestamps: false });
schema.index({ templateId: 1, revision: 1 }, { unique: true }); // migration preparation only
schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
  const update = this.getUpdate();
  if (!update || Object.keys(update).length !== 1 || !update.$set || Object.keys(update.$set).length !== 1 || update.$set.state !== 'retired') throw new Error('Published revision content is immutable.');
});
schema.pre('save', function () {
  if (!this.isNew && this.isModified('state') && this.state !== 'retired') throw new Error('Retired revisions cannot be republished.');
  if (!this.isNew && this.modifiedPaths().some(path => path !== 'state')) throw new Error('Published revision content is immutable.');
});
schema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete', 'replaceOne', 'findOneAndReplace'], function () { throw new Error('Published revisions cannot be deleted/replaced.'); });
module.exports = mongoose.models.AuditTemplateRevision || mongoose.model('AuditTemplateRevision', schema);
