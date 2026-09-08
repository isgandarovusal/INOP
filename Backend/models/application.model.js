const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  score: { type: Number, default: 0 },
  status: { type: String, enum: ['Applied', 'Screening', 'Interview', 'Offered', 'Rejected'], default: 'Applied' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);