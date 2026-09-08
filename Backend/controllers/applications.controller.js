const Application = require('../models/application.model');

exports.getApplications = async (req, res) => {
  try {
    const apps = await Application.find();
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createApplication = async (req, res) => {
  try {
    const app = new Application(req.body);
    const saved = await app.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteApplication = async (req, res) => {
  try {
    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: 'Müraciət silindi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};