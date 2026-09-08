const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['applied', 'interview', 'offer', 'rejected'], 
    default: 'applied' 
  },
  skills: [{ type: String }],
  experience: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);