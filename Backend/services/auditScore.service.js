const categories = ['food', 'cleanliness', 'staff', 'service'];
const numeric = (field, max) => ({ $let: {
  vars: { n: { $convert: { input: field, to: 'double', onError: null, onNull: null } } },
  in: { $cond: [{ $and: [
    { $in: [{ $type: field }, ['int', 'long', 'double', 'decimal', 'string']] },
    { $gte: ['$$n', 0] }, { $lte: ['$$n', max] },
  ] }, '$$n', null] },
} });
const legacy = { $let: {
  vars: { values: categories.map(key => numeric(`$scores.${key}`, 10)) },
  in: { $cond: [{ $allElementsTrue: { $map: { input: '$$values', as: 'value', in: { $ne: ['$$value', null] } } } }, { $avg: '$$values' }, null] },
} };
const safety = { $ifNull: [numeric('$scorePercentage', 100), { $let: {
  vars: { total: numeric('$totalScore', Number.MAX_VALUE), max: numeric('$maxScore', Number.MAX_VALUE) },
  in: { $cond: [{ $and: [{ $ne: ['$$total', null] }, { $gt: ['$$max', 0] }, { $lte: ['$$total', '$$max'] }] }, { $multiply: [{ $divide: ['$$total', '$$max'] }, 100] }, null] },
} }] };
const type = { $ifNull: ['$auditType', '$type'] };
const typed = { $switch: { branches: [
  { case: { $eq: [type, 'standard'] }, then: numeric('$compliancePercentage', 100) },
  { case: { $eq: [type, 'service'] }, then: numeric('$overallPercentage', 100) },
  { case: { $in: [type, ['safety', 'occupational-safety']] }, then: safety },
], default: null } };

exports.auditScoreExpression = { $let: {
  vars: { typed },
  in: { $cond: [{ $ne: ['$$typed', null] }, { $divide: ['$$typed', 10] }, { $ifNull: [legacy,
    { $cond: [{ $in: [type, ['standard', 'service', 'safety', 'occupational-safety']] }, null, { $divide: [numeric('$overallPercentage', 100), 10] }] },
  ] }] },
} };
exports.categoryScoreExpression = key => numeric(`$scores.${key}`, 10);
exports.categories = categories;
