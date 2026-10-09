const mongoose = require('mongoose');
const Execution = require('../models/auditExecution.model');
const { requireAuditAccess } = require('./auditScope.middleware');

exports.requireExecutionAccess = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid execution id.' });
    }
    const execution = await Execution.findById(req.params.id).select('_id auditId').lean();
    if (!execution) return res.status(404).json({ success: false, message: 'Execution not found.' });
    // Resolve the actual child parent; never trust a URL alias or body auditId.
    req.auditScopeId = String(execution.auditId);
    req.executionId = String(execution._id);
    return requireAuditAccess(req, res, next);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Execution authorization failed.' });
  }
};
