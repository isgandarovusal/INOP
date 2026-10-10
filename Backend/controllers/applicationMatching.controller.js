const mongoose = require('mongoose');
const Application = require('../models/application.model');
const { scopedScoreRecords, scoreResponses } = require('../services/applicationScoreState.service');
const { applicationParents } = require('../services/hrResourceScope.service');
const { decorateApplications } = require('../services/recruitmentCatalog.service');
const { fingerprints, calculateApplicationMatch } = require('../services/applicationMatch.service');

exports.recalculate = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid application id.' });
  try {
    const query = { $and: [{ _id: req.params.id }, req.dataScope] };
    const current = await Application.findOne(query).lean();
    if (!current) return res.status(404).json({ message: 'Application not found.' });
    if (req.body.expectedRevision !== undefined && (!Number.isInteger(req.body.expectedRevision) || req.body.expectedRevision < 0)) return res.status(400).json({ message: 'Invalid revision.' });
    if (req.body.expectedRevision !== undefined && req.body.expectedRevision !== (current.__v || 0)) return res.status(409).json({ message: 'Application changed; reload before recalculating.', code: 'REVISION_CONFLICT' });
    const { jobs, candidates } = await scopedScoreRecords(req, [current]);
    const job = jobs.get(String(current.jobId)), candidate = candidates.get(String(current.candidateId));
    if (!job || !candidate) return res.status(403).json({ message: 'Both parent read permissions are required for matching.' });
    const update = {};
    if (req.body.relevantExperienceYears !== undefined) {
      const value = req.body.relevantExperienceYears;
      if (value === null) update.matchingReview = null;
      else {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 80 || typeof req.body.reason !== 'string' || !req.body.reason.trim() || req.body.reason.length > 500) return res.status(400).json({ message: 'Contextual experience needs a valid value and HR evidence/reason.' });
        update.matchingReview = { relevantExperienceYears: value, reason: req.body.reason.trim(), reviewedBy: req.user.id, reviewedAt: new Date(), ...fingerprints(job, candidate) };
      }
    }
    const matching = calculateApplicationMatch(job, candidate, { application: { ...current, ...update } });
    const saved = await Application.findOneAndUpdate({ $and: [query, { __v: current.__v ?? { $exists: false } }] },
      { $set: { ...update, matching, score: matching.score, scoreStatus: matching.scoreStatus }, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true });
    if (!saved) return res.status(409).json({ message: 'Application changed; reload before recalculating.', code: 'REVISION_CONFLICT' });
    const response = await Application.findById(saved._id).populate(applicationParents(req)).lean();
    res.json((await decorateApplications(req, await scoreResponses(req, [response])))[0]);
  } catch (e) { next(e); }
};
