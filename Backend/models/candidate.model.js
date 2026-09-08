const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  education: { type: String },
  experienceYears: { type: Number, default: 0 },
  skills: [{ type: String }],
  languages: [{ type: String }],
  cvUrl: { type: String },
  status: { type: String, enum: ['New', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'], default: 'New' }
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);