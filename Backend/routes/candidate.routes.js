const express = require('express');
const router = express.Router();
const Candidate = require("../models/candidate.model");

// Bütün namizədləri gətir
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yeni namizəd yarat
router.post('/', async (req, res) => {
  try {
    const newCandidate = new Candidate(req.body);
    const saved = await newCandidate.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Status update (Kanban Drag-and-Drop üçün)
router.patch('/:id', async (req, res) => {
  try {
    const updated = await Candidate.findByIdAndUpdate(
      req.params.id, 
      { status: req.body.status }, 
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;