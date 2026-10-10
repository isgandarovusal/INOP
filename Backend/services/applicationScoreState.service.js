const Application = require('../models/application.model');
const Candidate = require('../models/candidate.model');
const Job = require('../models/job.model');
const { resourceFilter } = require('./hrResourceScope.service');
const { fingerprints, VERSION } = require('./applicationMatch.service');

const candidateFields = 'role skills experience education certificates reviewedFields employmentHistory cvReview.reviewStatus cvReview.version';
const jobFields = 'title requiredSkills preferredSkills experienceYears requiredEducation requiredCertificates criterionWeights';
async function scopedScoreRecords(req, applications) {
  const ids = field => [...new Set(applications.map(a => a[field]?._id || a[field]).filter(Boolean).map(String))];
  const [jobs, candidates] = await Promise.all([
    Job.find({ $and: [{ _id: { $in: ids('jobId') } }, resourceFilter(req, 'recruitment')] }).select(jobFields).lean(),
    Candidate.find({ $and: [{ _id: { $in: ids('candidateId') } }, resourceFilter(req, 'candidate')] }).select(candidateFields).lean(),
  ]);
  return { jobs: new Map(jobs.map(j => [String(j._id), j])), candidates: new Map(candidates.map(c => [String(c._id), c])) };
}
async function scoreResponses(req, records) {
  const { jobs, candidates } = await scopedScoreRecords(req, records);
  return records.map(a => {
    const job = jobs.get(String(a.jobId?._id || a.jobId)), candidate = candidates.get(String(a.candidateId?._id || a.candidateId));
    if (!job || !candidate) return { ...a, score: null, scoreStatus: 'restricted', matching: null, matchingReview: undefined };
    const matching = a.matching;
    if (!matching || matching.version !== VERSION) return { ...a, score: null, scoreStatus: 'legacy', matching: null };
    if (a.scoreStatus === 'stale') return { ...a, score: null, scoreStatus: 'stale', matching: null };
    const hashes = fingerprints(job, candidate);
    if (hashes.jobHash !== matching.jobHash || hashes.candidateHash !== matching.candidateHash) return { ...a, score: null, scoreStatus: 'stale', matching: null };
    return { ...a, score: matching.score, scoreStatus: matching.scoreStatus, matching };
  });
}
async function invalidateScores(field, id) {
  await Application.updateMany({ [field]: id, matching: { $exists: true } }, { $set: { score: null, scoreStatus: 'stale' } });
}
module.exports = { scoreResponses, scopedScoreRecords, invalidateScores, jobFields, candidateFields };
