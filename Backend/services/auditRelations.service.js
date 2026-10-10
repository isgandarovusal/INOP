const mongoose = require('mongoose');
const { badRequest } = require('./auditPolicy.service');
async function assertRelatedRecord(model, identifier, auditId, label) {
  if (!identifier) return undefined;
  if (!mongoose.Types.ObjectId.isValid(identifier)) throw badRequest(`Invalid ${label} id`);
  const item = await model.findOne({ _id: identifier, auditId }).lean();
  if (!item) throw badRequest(`${label} does not belong to this audit`);
  return item._id;
}
function assertAuditEditable(req) {
  if (['completed', 'cancelled'].includes(req.audit?.status)) throw badRequest('A closed audit cannot be changed', 409);
}
module.exports = { assertRelatedRecord, assertAuditEditable };
