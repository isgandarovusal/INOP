// Legacy createdBy/uploadedBy values came from request JSON, so they are not
// trusted ownership. Neither model has a department or assignment relation.
const globalOnly = resource => async (req, res, next) => {
  if (req.permission?.scope !== 'all') {
    return res.status(403).json({ message: `${resource} access requires an explicit all scope.` });
  }
  if (req.auditorProfile) {
    const profile = req.auditorProfile;
    const Model = resource === 'Template' ? require('../models/auditTemplate.model') : require('../models/auditSourceDocument.model');
    const allowed = record => require('../services/auditDirection.service').canonicalDirection(record.auditType) === profile.direction && record.organizationId === profile.organizationId && require('../services/auditCatalog.service').brandIds.includes(record.brandId);
    let stored;
    if (req.params.id) {
      if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) return res.status(403).json({ message: 'Audit resource denied.' });
      const record = await Model.findById(req.params.id).lean();
      stored = record;
      if (!record || !allowed(record)) return res.status(403).json({ message: 'Audit resource direction denied.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE' && !allowed({ ...stored, ...req.body })) return res.status(403).json({ message: 'Audit resource direction denied.' });
    req.auditCatalogFilter = { organizationId: profile.organizationId, auditType: { $in: require('../services/auditDirection.service').aliasesFor(profile.direction) }, brandId: { $in: require('../services/auditCatalog.service').brandIds } };
  }
  return next();
};

exports.requireGlobalTemplateAccess = globalOnly('Template');
exports.requireGlobalSourceDocumentAccess = globalOnly('Source document');

exports.requireExecutionTemplateAccess = async (req, res, next) => {
  try {
    const id = req.body?.checklistId;
    if (id == null) return next(); // Existing executions may have no template.
    const { getPermissionScope } = require('./auth.middleware');
    if (await getPermissionScope(req.user.role, 'audit.template', 'read') !== 'all') {
      return res.status(403).json({ message: 'Template read access denied.' });
    }
    const mongoose = require('mongoose');
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid checklist id.' });
    }
    const Template = require('../models/auditTemplate.model');
    const template = await Template.findById(id).lean();
    if (req.auditorProfile && (!template || template.organizationId !== req.auditorProfile.organizationId || require('../services/auditDirection.service').canonicalDirection(template.auditType) !== req.auditorProfile.direction)) return res.status(403).json({ message: 'Template direction denied.' });
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Template authorization failed.' });
  }
};
