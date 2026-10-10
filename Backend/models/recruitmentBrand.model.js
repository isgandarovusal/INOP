const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: { type: String, match: /^[a-z0-9][a-z0-9-]{0,59}$/ },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.models.RecruitmentBrand || mongoose.model('RecruitmentBrand', schema);
