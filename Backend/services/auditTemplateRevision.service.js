const Template = require('../models/auditTemplate.model');
const Revision = require('../models/auditTemplateRevision.model');
const { transaction, auditError } = require('./auditTransaction.service');
const { canonicalDirection } = require('./auditDirection.service');
const { relationErrors } = require('./auditCatalog.service');
function questions(content) {
  return (content.sections || []).filter(section => section.active !== false).flatMap(section => [
    ...(section.questions || []).filter(item => item.active !== false),
    ...(section.subsections || []).filter(item => item.active !== false).flatMap(item => (item.questions || []).filter(question => question.active !== false)),
  ]);
}
async function publish(id, actorId) {
  return transaction(async session => {
    const template = await Template.findById(id).session(session);
    if (!template) throw auditError(404, 'Template not found.');
    if (template.status !== 'draft' && !(template.status === 'active' && !template.publishedRevisionId)) throw auditError(409, 'Start a new draft before publishing.');
    if (Object.keys(relationErrors(template)).length || template.organizationId !== 'gfc' || !template.brandId || !canonicalDirection(template.auditType)) throw auditError(400, 'Verified canonical template organization/brand/direction is required.');
    const items = questions(template);
    if (!items.length || items.some(item => !item.id || !item.label) || new Set(items.map(item => item.id)).size !== items.length) throw auditError(400, 'Real unique template questions are required before publication.');
    const revision = (template.revisionCounter || 0) + 1;
    const content = Object.fromEntries(['organizationId','brandId','brandName','auditType','name','version','sections','sourceDocumentIds','hrSource','serviceSource','standardSource','hseSource'].map(key => [key, template[key]]));
    const [published] = await Revision.create([{ templateId: template._id, revision, content, publishedBy: actorId, publishedAt: new Date() }], { session });
    const updated = await Template.updateOne({ _id: template._id, __v: template.__v, status: template.status }, { $set: { status: 'active', revisionCounter: revision, publishedRevisionId: published._id, updatedBy: actorId }, $inc: { __v: 1 } }, { session });
    if (!updated.modifiedCount) throw auditError(409, 'Template changed; reload.');
    return published;
  });
}
async function startDraft(id, actorId) {
  return transaction(async session => {
    const template = await Template.findById(id).session(session);
    if (!template || template.status !== 'active') throw auditError(409, 'Only an active template can start a new draft.');
    template.status = 'draft'; template.updatedBy = actorId; await template.save({ session }); return template;
  });
}
async function retire(id, actorId) {
  return transaction(async session => {
    const template = await Template.findById(id).session(session);
    if (!template) throw auditError(404, 'Template not found.');
    if (template.publishedRevisionId) await Revision.updateOne({ _id: template.publishedRevisionId }, { $set: { state: 'retired' } }, { session });
    template.status = 'archived'; template.updatedBy = actorId; await template.save({ session }); return template;
  });
}
async function resolveForAudit(payload, restaurant, direction) {
  delete payload.templateRevisionId; delete payload.templateSnapshot;
  if (!payload.templateId) return;
  const template = await Template.findById(payload.templateId).lean();
  if (!template || template.status !== 'active' || !template.publishedRevisionId) throw auditError(409, 'Publish a reviewed template revision first.');
  const revision = await Revision.findById(template.publishedRevisionId).lean();
  if (!revision || revision.state !== 'published' || revision.content.organizationId !== 'gfc' || revision.content.brandId !== restaurant?.brandId || canonicalDirection(revision.content.auditType) !== direction) throw auditError(403, 'Template does not match audit organization, brand and direction.');
  if(revision.content.hseSource)throw auditError(409,'Use the HSE object creation endpoint.');
  payload.templateRevisionId = revision._id; payload.templateSnapshot = revision.content;
}
module.exports = { publish, startDraft, retire, resolveForAudit, questions };
