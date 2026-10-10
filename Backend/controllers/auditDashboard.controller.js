const Audit = require('../models/audit.model');
const AuditExecution = require('../models/auditExecution.model');
const { getAuditScopeFilter } = require('../middleware/auditScope.middleware');

exports.getAuditDashboard = async (req, res, next) => {
  try {
    const scope = await getAuditScopeFilter(req);
    if (scope === null) return res.status(403).json({ success: false, message: 'Audit access denied' });
    const [totalAudits, executionStats, typeStats] = await Promise.all([
      Audit.countDocuments(scope),
      AuditExecution.aggregate([
        { $lookup: { from: Audit.collection.name, let: { auditId: '$auditId' }, pipeline: [
          { $match: { $and: [scope, { $expr: { $eq: ['$_id', '$$auditId'] } }] } },
          { $project: { _id: 1 } },
        ], as: 'visibleAudit' } },
        { $match: { 'visibleAudit.0': { $exists: true } } },
        { $facet: {
          completed: [{ $match: { status: 'completed' } }, { $count: 'total' }],
          riskStats: [{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }],
          scoreStats: [{ $group: { _id: null, averageScore: { $avg: '$totalScore' } } }],
          trend: [
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, averageScore: { $avg: '$totalScore' } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
        } },
      ]),
      Audit.aggregate([{ $match: scope }, { $group: { _id: '$auditType', count: { $sum: 1 } } }]),
    ]);
    const stats = executionStats[0] || {};
    return res.json({ success: true, data: {
      totalAudits, completedAudits: stats.completed?.[0]?.total || 0,
      averageScore: stats.scoreStats?.[0]?.averageScore || 0,
      riskStats: stats.riskStats || [], typeStats, trend: stats.trend || [],
    } });
  } catch (error) { return next(error); }
};
