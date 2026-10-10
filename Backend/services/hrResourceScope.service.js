const { getDataScope } = require('../middleware/dataScope.middleware');

// authorize() keeps a legacy req.dataScope for the route's primary resource.
// Parent resources must use their own grant from the server-loaded role instead.
function resourceFilter(req, resource, action = 'read') {
  const permission = req.authRole?.permissions?.find(p =>
    (p.resource === resource || p.resource === '*') &&
    (p.action === action || p.action === '*'));
  const scope = getDataScope({ user: req.user, permission });
  // A query that cannot match, including when the required grant is absent.
  return scope === null ? { _id: { $in: [] } } : scope;
}

const candidateSelect = 'name role status email phone skills experience education languages certificates createdAt updatedAt';
const jobSelect = 'brandId branchId title department location type status requiredSkills preferredSkills experienceYears createdAt updatedAt';

function applicationParents(req) {
  return [
    { path: 'candidateId', match: resourceFilter(req, 'candidate'), select: candidateSelect },
    { path: 'jobId', match: resourceFilter(req, 'recruitment'), select: jobSelect },
  ];
}

module.exports = { resourceFilter, applicationParents };
