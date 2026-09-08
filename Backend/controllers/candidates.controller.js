const Candidate = require('../models/candidate.model');

exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Namizəd tapılmadı' });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const cvUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const candidate = new Candidate({ ...req.body, cvUrl });
    const saved = await candidate.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Namizəd silindi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};