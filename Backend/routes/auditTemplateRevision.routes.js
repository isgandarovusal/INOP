const router = require('express').Router();
const mongoose = require('mongoose');
const { authorize } = require('../middleware/authorization.middleware');
const { requireGlobalTemplateAccess } = require('../middleware/templateScope.middleware');
const Revision = require('../models/auditTemplateRevision.model');
const service = require('../services/auditTemplateRevision.service');
const validId = (req,res,next) => mongoose.Types.ObjectId.isValid(req.params.id) ? next() : res.status(400).json({message:'Invalid template id.'});
router.get('/:id/revisions', ...authorize('audit.template','read'), validId, requireGlobalTemplateAccess, async(req,res)=>res.json({success:true,data:await Revision.find({templateId:req.params.id}).sort({revision:-1}).lean()}));
for (const [action, handler] of [['publish', service.publish], ['draft', service.startDraft], ['retire', service.retire]]) router.post('/:id/'+action, ...authorize('audit.template','update'), validId, requireGlobalTemplateAccess, async(req,res)=>{
  if (!['admin','audit_manager'].includes(req.user.role)) return res.status(403).json({message:'Template lifecycle requires audit management.'});
  try { res.json({success:true,data:await handler(req.params.id,req.user.id)}); }
  catch(error) {res.status(error.status || 500).json({message:error.status ? error.message : 'Template lifecycle failed.'});}
});
module.exports = router;
