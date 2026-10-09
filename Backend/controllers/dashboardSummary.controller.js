const Job = require('../models/job.model');
const Candidate = require('../models/candidate.model');
const Application = require('../models/application.model');
const Audit = require('../models/audit.model');
const Restaurant = require('../models/restaurant.model');
const { getAuditScopeFilter } = require('../middleware/auditScope.middleware');
const { getPermissionScope } = require('../middleware/auth.middleware');
const { auditScoreExpression, categoryScoreExpression, categories } = require('../services/auditScore.service');

const wrap = operation => async (req, res) => {
  try {
    if (req.dataScope == null || !req.user?.id) return res.status(403).json({ message: 'Dashboard scope icazəsi yoxdur.' });
    return res.json(await operation(req));
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return res.status(500).json({ message: 'Dashboard summary yüklənmədi.' });
  }
};
// Aggregation does not perform Mongoose query casting. Reuse the list query's
// ObjectId casting so own/assigned references cannot silently miss their rows.
const filter = (model, req) => model.find(req.dataScope).cast(model);
exports.jobs = wrap(async req => ({ total: await Job.countDocuments(filter(Job, req)) }));
exports.applications = wrap(async req => ({ total: await Application.countDocuments(filter(Application, req)) }));
exports.candidates = wrap(async req => {
  const [data] = await Candidate.aggregate([
    { $match: filter(Candidate, req) },
    { $facet: {
      total: [{ $count: 'value' }],
      statuses: [
        { $addFields: { normalizedStatus: { $toLower: { $convert: { input: '$status', to: 'string', onError: '', onNull: '' } } } } },
        { $project: { status: { $cond: [{ $in: ['$normalizedStatus', ['screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected']] }, '$normalizedStatus', 'applied'] } } },
        { $group: { _id: '$status', value: { $sum: 1 } } }, { $sort: { _id: 1 } },
      ],
      recent: [
        { $sort: { createdAt: -1, _id: -1 } }, { $limit: 5 },
        { $project: { name: 1, createdAt: 1, skills: { $cond: [{ $isArray: '$skills' }, { $slice: ['$skills', 3] }, []] } } },
      ],
    } },
  ]);
  return { total: data.total[0]?.value || 0, shortlistedCount: data.statuses.find(item => item._id === 'shortlisted')?.value || 0,
    statusBreakdown: data.statuses.map(item => ({ status: item._id, value: item.value })),
    recentCandidates: data.recent.map(item => ({ id: String(item._id), name: item.name, skills: item.skills, createdAt: item.createdAt })),
  };
});

exports.audits = wrap(async req => {
  const scope = await getAuditScopeFilter(req);
  if (scope === null) throw Error('Missing audit scope');
  const categoryFacets = Object.fromEntries(categories.map(key => [key, [{ $group: { _id: null, score: { $avg: categoryScoreExpression(key) } } }]]));
  const [data] = await Audit.aggregate([
    { $match: scope },
    // Discard large checklists, files and findings before summary stages.
    { $project: { restaurantId: 1, date: 1, auditType: 1, type: 1, scores: 1, overallPercentage: 1, compliancePercentage: 1, scorePercentage: 1, totalScore: 1, maxScore: 1 } },
    { $addFields: { normalizedScore: auditScoreExpression } },
    { $facet: {
      summary: [{ $group: { _id: null, total: { $sum: 1 }, score: { $avg: '$normalizedScore' }, restaurants: { $addToSet: '$restaurantId' },
        critical: { $sum: { $cond: [{ $and: [{ $ne: ['$normalizedScore', null] }, { $lt: ['$normalizedScore', 7] }] }, 1, 0] } },
      } }],
      restaurants: [{ $group: { _id: '$restaurantId', score: { $avg: '$normalizedScore' } } }, { $sort: { score: -1, _id: 1 } }, { $limit: 5 }],
      months: [
        { $addFields: { monthDate: { $dateFromString: { dateString: '$date', onError: null, onNull: null } } } },
        { $match: { monthDate: { $ne: null } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$monthDate' } }, score: { $avg: '$normalizedScore' } } },
        { $sort: { _id: -1 } }, { $limit: 12 }, { $sort: { _id: 1 } },
      ],
      ...categoryFacets,
    } },
  ]);
  const summary = data.summary[0] || {};
  // Restaurant has no trusted own/department provenance. Only its explicit
  // all read grant can expose names; audit.read alone is not authority.
  const restaurantScope = await getPermissionScope(req.user.role, 'restaurant', 'read');
  const names = restaurantScope === 'all' ? await Restaurant.find({ id: { $in: data.restaurants.map(item => item._id) } }).select('id name').lean() : [];
  const nameMap = new Map(names.map(item => [item.id, item.name]));
  const round = value => value === null || value === undefined ? null : Math.round(value * 10) / 10;
  return {
    overallScore: round(summary.score), totalAudits: summary.total || 0, restaurantsAudited: summary.restaurants?.length || 0, criticalCount: summary.critical || 0,
    restaurantComparison: data.restaurants.map(item => ({ restaurantId: item._id, name: nameMap.get(item._id) || 'Unknown', score: round(item.score) })),
    categoryAnalysis: categories.flatMap(key => data[key][0]?.score == null ? [] : [{ category: key[0].toUpperCase() + key.slice(1), score: round(data[key][0].score) }]).sort((a, b) => b.score - a.score),
    historicalTrend: data.months.map(item => ({ label: item._id, score: round(item.score) })),
  };
});
