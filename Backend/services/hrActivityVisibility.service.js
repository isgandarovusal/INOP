const access = require('./hrDepartmentAccess.service');
const { aggregateResourceFilter } = require('./hrResourceScope.service');
const parents = [
  ['candidate', 'candidate', require('../models/candidate.model')],
  ['job', 'recruitment', require('../models/job.model')],
  ['application', 'application', require('../models/application.model')],
];
function stages(req) {
  if (req.user.role === 'admin') return [];
  const types = parents.map(([type]) => type);
  if (!access.isHRMember(req.user)) return [{ $match: { entityType: { $nin: types } } }];
  return [
    ...parents.map(([type, resource, model]) => ({ $lookup: {
      from: model.collection.name,
      let: { id: { $convert: { input: '$entityId', to: 'objectId', onError: null, onNull: null } }, type: '$entityType' },
      pipeline: [
        { $match: { $and: [aggregateResourceFilter(req, resource), { $expr: { $and: [{ $eq: ['$_id', '$$id'] }, { $eq: ['$$type', type] }] } }] } },
        { $limit: 1 }, { $project: { _id: 1 } },
      ], as: `hr_${type}`,
    } })),
    { $match: { $expr: { $or: [{ $not: [{ $in: ['$entityType', types] }] }, ...parents.map(([type]) => ({ $and: [{ $eq: ['$entityType', type] }, { $gt: [{ $size: `$hr_${type}` }, 0] }] }))] } } },
    { $unset: parents.map(([type]) => `hr_${type}`) },
  ];
}
module.exports = { stages };
