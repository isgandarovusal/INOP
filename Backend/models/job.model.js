const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String, default: 'Remote' },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], default: 'Full-time' },
  description: { type: String, required: true },
  requiredSkills: [{ type: String }],
  preferredSkills: [{ type: String }],
  experienceYears: { type: Number, default: 0 },
  status: { type: String, enum: ['Open', 'Closed', 'Draft'], default: 'Open' }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);