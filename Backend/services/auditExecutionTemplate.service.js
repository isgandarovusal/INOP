const AuditTemplate = require('../models/auditTemplate.model');
const { readScope } = require('./auditLibrary.service');
const { badRequest } = require('./auditPolicy.service');
async function executionTemplate(req, execution) {
  if (execution.checklistSnapshot) return execution.checklistSnapshot;
  const filter = await readScope(req, 'audit.template');
  const template = execution.checklistId ? await AuditTemplate.findOne({ $and: [{ _id: execution.checklistId }, filter] })
    .select('sections name version').lean() : null;
  if (!template) throw badRequest('Execution checklist is unavailable or inaccessible', 403);
  return { sections: template.sections, name: template.name, version: template.version };
}
module.exports = { executionTemplate };
