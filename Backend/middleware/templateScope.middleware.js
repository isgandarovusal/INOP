// Legacy createdBy/uploadedBy values came from request JSON, so they are not
// trusted ownership. Neither model has a department or assignment relation.
const globalOnly = resource => (req, res, next) => {
  if (req.permission?.scope !== 'all') {
    return res.status(403).json({ message: `${resource} access requires an explicit all scope.` });
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
    if (!(await Template.exists({ _id: id }))) {
      return res.status(404).json({ message: 'Template not found.' });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Template authorization failed.' });
  }
};
