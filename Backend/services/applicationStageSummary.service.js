const Job = require('../models/job.model');
const Application = require('../models/application.model');
const { resourceFilter, aggregateResourceFilter } = require('./hrResourceScope.service');
const STATUSES = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected'];

// Same cohort as HR analytics: scoped Applications with a readable Job. Archived
// parents remain historical Applications; no person/contact deduplication or
// Candidate-read requirement is applied to aggregate stage counts.
exports.summarize = async req => {
  if (resourceFilter(req, 'recruitment')._id?.$in?.length === 0) return null;
  const jobs = await Job.find(resourceFilter(req, 'recruitment')).select('_id').limit(501).maxTimeMS(5000).lean();
  const stages = [{ $match: aggregateResourceFilter(req, 'application') }];
  if (jobs.length <= 500) stages.push({ $match: { jobId: { $in: jobs.map(job => job._id) } } });
  else stages.push(
    { $lookup: { from: Job.collection.name, localField: 'jobId', foreignField: '_id', as: 'job' } },
    { $unwind: '$job' },
    { $match: Object.fromEntries(Object.entries(aggregateResourceFilter(req, 'recruitment')).map(([key, value]) => ['job.' + key, value])) },
  );
  const rows = await Application.aggregate([...stages, { $group: { _id: '$status', count: { $sum: 1 } } }]).option({ maxTimeMS: 5000 });
  return {
    version: 'application-stages-v1', unit: 'application', includesArchivedParents: true,
    total: rows.reduce((n, row) => n + row.count, 0),
    shortlistedCount: rows.find(row => row._id === 'Shortlisted')?.count || 0,
    statusBreakdown: STATUSES.map(status => ({ status, count: rows.find(row => row._id === status)?.count || 0 })),
    unknownCount: rows.filter(row => !STATUSES.includes(row._id)).reduce((n, row) => n + row.count, 0),
  };
};
