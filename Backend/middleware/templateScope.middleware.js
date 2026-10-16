// Legacy createdBy/uploadedBy values came from request JSON, so they are not
// trusted ownership. Neither model has a department or assignment relation.
const globalOnly = resource => async (req, res, next) => {
  if (req.permission?.scope !== 'all') {
    return res.status(403).json({ message: `${resource} access requires an explicit all scope.` });
  }
  req.auditCatalogFilter={organizationId:{$in:['gfc','',null]}};
  if(req.body?.organizationId && req.body.organizationId!=='gfc')return res.status(400).json({message:'Unknown audit organization.'});
  if(req.params.id){
    const Model=resource==='Template'?require('../models/auditTemplate.model'):require('../models/auditSourceDocument.model');
    if(resource==='Template'&&!require('mongoose').Types.ObjectId.isValid(req.params.id)){if(req.auditorProfile)return res.status(403).json({message:'Audit resource denied.'});return next();}
    const idQuery=resource==='Template'?{_id:req.params.id}:require('../controllers/privateFiles.controller').sourceQuery(req.params.id);
    const record=await Model.findOne(idQuery).select('organizationId').lean();
    if(record&&record.organizationId!=null&&!['gfc',''].includes(record.organizationId))return res.status(403).json({message:'Audit organization denied.'});
  }
  if (req.auditorProfile) {
    const profile = req.auditorProfile;
    const brands = await require('../services/auditAudience.service').visibleBrands(req);
    const Model = resource === 'Template' ? require('../models/auditTemplate.model') : require('../models/auditSourceDocument.model');
    const allowed = record => require('../services/auditDirection.service').canonicalDirection(record.auditType) === profile.direction && record.organizationId === profile.organizationId && brands.includes(record.brandId);
    let stored;
    if (req.params.id) {
      const query=resource==='Template'?{_id:req.params.id}:require('../controllers/privateFiles.controller').sourceQuery(req.params.id);
      if(resource==='Template'&&!require('mongoose').Types.ObjectId.isValid(req.params.id))return res.status(403).json({message:'Audit resource denied.'});
      const record = await Model.findOne(query).lean();
      stored = record;
      if (!record || !allowed(record)) return res.status(403).json({ message: 'Audit resource direction denied.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE' && !allowed({ ...stored, ...req.body })) return res.status(403).json({ message: 'Audit resource direction denied.' });
    req.auditCatalogFilter = { organizationId: profile.organizationId, auditType: { $in: require('../services/auditDirection.service').aliasesFor(profile.direction) }, brandId: { $in: brands } };
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
    if(req.auditorProfile&&!(await require('../services/auditAudience.service').visibleBrands(req)).includes(template?.brandId))return res.status(403).json({message:'Template brand denied.'});
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Template authorization failed.' });
  }
};
