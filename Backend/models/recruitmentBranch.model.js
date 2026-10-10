const mongoose = require('mongoose');
// HR locations are separate from audit Restaurants. No legacy restaurant scope
// is widened or inferred from a selected brand.
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  brandId: { type: String, default: null },
  kind: { type: String, enum: ['restaurant', 'office', 'warehouse', 'remote'], required: true },
  location: { type: String, default: '', maxlength: 200 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  departmentId: { type: String, default: '', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });
module.exports = mongoose.models.RecruitmentBranch || mongoose.model('RecruitmentBranch', schema);
